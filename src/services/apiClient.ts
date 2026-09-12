import {
  getStoredAuthToken,
  getStoredRefreshToken,
  getStoredUserSession,
  updateStoredAuthToken,
  isTokenExpired,
  getIsAuthenticatingGlobal,
} from "./authService";

let activeRefreshPromise: Promise<string | null> | null = null;

/**
 * Performs a silent, background token refresh with Google OAuth via /api/auth/refresh.
 * Deduplicates multiple concurrent requests into a single in-flight refresh promise.
 */
export async function performSilentRefresh(): Promise<string | null> {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    try {
      const storedRefreshToken = getStoredRefreshToken();
      const session = getStoredUserSession();
      const refreshToken =
        storedRefreshToken ||
        session?.refreshToken ||
        (session as any)?.refresh_token ||
        "";
      const currentAccessToken = getStoredAuthToken() || session?.accessToken || "";

      if (!refreshToken && !currentAccessToken) {
        return null;
      }

      const res = await window.fetch("/api/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(currentAccessToken ? { Authorization: `Bearer ${currentAccessToken}` } : {}),
          ...(refreshToken ? { "X-Refresh-Token": refreshToken } : {}),
        },
        body: JSON.stringify({
          refreshToken: refreshToken || undefined,
          refresh_token: refreshToken || undefined,
          token: currentAccessToken || undefined,
          accessToken: currentAccessToken || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const newAccessToken = data?.accessToken || data?.access_token;
        if (data?.success && newAccessToken) {
          updateStoredAuthToken(newAccessToken, data.user, data.expiresIn || 3600);
          return newAccessToken;
        }
      }
      return null;
    } catch (err) {
      console.warn("[apiClient] Silent token refresh network notice:", err);
      return null;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

/**
 * Intercepted client-side fetch helper.
 * - Checks if access token is missing or expired before executing YouTube Data API requests.
 * - Automatically exchanges OBLIVION_REFRESH_TOKEN via POST /api/auth/refresh to retrieve a fresh access token in the background.
 * - Retains full UI rendering state while this swap occurs seamlessly.
 * - Dynamically injects Authorization: Bearer <token> from perpetual client-side storage.
 * - Intercepts HTTP 401 / 403 responses and silently retries the original request.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  retries = 1
): Promise<Response> {
  let url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const isAuthEndpoint =
    url.includes("/api/auth/refresh") ||
    url.includes("/api/auth/google/url") ||
    url.includes("/api/auth/logout");

  // 1. PROACTIVE BACKGROUND TOKEN RENEWAL
  // Before executing any YouTube Data API or playlist request, check if access token is missing or expired
  let activeToken = getStoredAuthToken();
  const storedRefreshToken = getStoredRefreshToken();

  if (!isAuthEndpoint && storedRefreshToken && (!activeToken || isTokenExpired())) {
    try {
      const refreshedToken = await performSilentRefresh();
      if (refreshedToken) {
        activeToken = refreshedToken;
        // If the URL had an access_token query param, update it with the renewed token
        if (url.includes("access_token=")) {
          url = url.replace(/access_token=[^&]+/, `access_token=${encodeURIComponent(refreshedToken)}`);
          if (typeof input === "string") {
            input = url;
          }
        }
      }
    } catch (e) {
      console.warn("[apiClient] Proactive token renewal notice:", e);
    }
  }

  const headers = new Headers(init?.headers || {});

  if (activeToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${activeToken}`);
    headers.set("X-Access-Token", activeToken);
  }

  if (storedRefreshToken && !headers.has("X-Refresh-Token")) {
    headers.set("X-Refresh-Token", storedRefreshToken);
  }

  const mergedInit: RequestInit = {
    ...init,
    headers,
  };

  try {
    const response = await window.fetch(input, mergedInit);

    // Check if server proactively attached a new access token in headers
    if (response && response.headers) {
      const serverRefreshedToken = response.headers.get("x-new-access-token");
      if (serverRefreshedToken && serverRefreshedToken !== activeToken) {
        updateStoredAuthToken(serverRefreshedToken);
      }
    }

    // Intercept 401 Unauthorized or 403 Forbidden to perform silent token refresh
    if ((response.status === 401 || response.status === 403) && !isAuthEndpoint && retries > 0) {
      if (!getIsAuthenticatingGlobal()) {
        const newToken = await performSilentRefresh();
        if (newToken) {
          const retryHeaders = new Headers(mergedInit.headers || {});
          retryHeaders.set("Authorization", `Bearer ${newToken}`);
          retryHeaders.set("X-Access-Token", newToken);
          return apiFetch(input, { ...mergedInit, headers: retryHeaders }, retries - 1);
        }
      }
    }

    return response;
  } catch (err) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return apiFetch(input, init, retries - 1);
    }
    throw err;
  }
}
