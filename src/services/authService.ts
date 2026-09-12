import { User } from "../types";

export const OBLIVION_AUTH_TOKEN_KEY = "OBLIVION_AUTH_TOKEN";
export const OBLIVION_REFRESH_TOKEN_KEY = "OBLIVION_REFRESH_TOKEN";
export const OBLIVION_USER_SESSION_KEY = "OBLIVION_USER_SESSION";
export const OBLIVION_TOKEN_EXPIRES_AT_KEY = "OBLIVION_TOKEN_EXPIRES_AT";

// Fallback legacy keys for migration
const LEGACY_USER_KEY = "oblivion_saved_user";

// Synchronous In-Memory Auth & Interceptor Guard State
let currentInMemoryToken: string | null = null;
let currentInMemoryUser: any | null = null;
let isAuthenticatingGlobal = false;

export function setInMemoryAuth(token: string | null, userObj?: any | null) {
  currentInMemoryToken = token;
  if (userObj !== undefined) {
    currentInMemoryUser = userObj;
  }
}

export function getInMemoryToken(): string | null {
  return currentInMemoryToken || getStoredAuthToken();
}

export function getInMemoryUser(): any | null {
  return currentInMemoryUser || getStoredUserSession();
}

export function setIsAuthenticatingGlobal(val: boolean) {
  isAuthenticatingGlobal = val;
}

export function getIsAuthenticatingGlobal(): boolean {
  return isAuthenticatingGlobal;
}

/**
 * Retrieves the permanent Google OAuth refresh_token from localStorage.
 * NEVER cleared unless the user explicitly signs out in Settings.
 */
export function getStoredRefreshToken(): string | null {
  try {
    const directRefresh = localStorage.getItem(OBLIVION_REFRESH_TOKEN_KEY);
    if (directRefresh && directRefresh.trim().length > 0) {
      return directRefresh.trim();
    }

    // Secondary fallback: check perpetual session user object
    const sessionStr = localStorage.getItem(OBLIVION_USER_SESSION_KEY);
    if (sessionStr) {
      const parsed = JSON.parse(sessionStr);
      const rt = parsed?.refreshToken || parsed?.refresh_token;
      if (rt && typeof rt === "string" && rt.trim().length > 0) {
        const cleanRt = rt.trim();
        localStorage.setItem(OBLIVION_REFRESH_TOKEN_KEY, cleanRt);
        return cleanRt;
      }
    }
  } catch (err) {
    console.warn("[authService] Failed reading refresh token from localStorage:", err);
  }
  return null;
}

/**
 * Permanently saves the Google OAuth refresh_token in browser localStorage.
 */
export function setStoredRefreshToken(refreshToken: string): void {
  if (!refreshToken || typeof refreshToken !== "string") return;
  try {
    const clean = refreshToken.trim();
    if (clean.length > 0) {
      localStorage.setItem(OBLIVION_REFRESH_TOKEN_KEY, clean);
    }
  } catch (err) {
    console.warn("[authService] Failed saving refresh token to localStorage:", err);
  }
}

/**
 * Checks whether the stored access token is missing or expired.
 */
export function isTokenExpired(): boolean {
  const token = getStoredAuthToken();
  if (!token) return true;

  try {
    const expiresAtStr = localStorage.getItem(OBLIVION_TOKEN_EXPIRES_AT_KEY);
    if (expiresAtStr) {
      const expiresAt = Number(expiresAtStr);
      if (!isNaN(expiresAt) && expiresAt > 0) {
        // Expired if current time is within 60 seconds of expiry
        return Date.now() >= expiresAt - 60000;
      }
    }
  } catch {}
  return false;
}

export function setStoredTokenExpiresAt(timestampMs: number): void {
  try {
    localStorage.setItem(OBLIVION_TOKEN_EXPIRES_AT_KEY, String(timestampMs));
  } catch {}
}

/**
 * Retrieves the perpetual OAuth access token from localStorage.
 */
export function getStoredAuthToken(): string | null {
  try {
    const directToken = localStorage.getItem(OBLIVION_AUTH_TOKEN_KEY);
    if (directToken && directToken.trim().length > 0) {
      return directToken.trim();
    }

    // Check user session
    const sessionStr = localStorage.getItem(OBLIVION_USER_SESSION_KEY);
    if (sessionStr) {
      const parsed = JSON.parse(sessionStr);
      if (parsed?.accessToken && typeof parsed.accessToken === "string") {
        const tok = parsed.accessToken.trim();
        localStorage.setItem(OBLIVION_AUTH_TOKEN_KEY, tok);
        return tok;
      }
    }

    // Legacy fallback migration
    const legacyStr = localStorage.getItem(LEGACY_USER_KEY);
    if (legacyStr) {
      const parsed = JSON.parse(legacyStr);
      if (parsed?.accessToken && typeof parsed.accessToken === "string") {
        const tok = parsed.accessToken.trim();
        localStorage.setItem(OBLIVION_AUTH_TOKEN_KEY, tok);
        localStorage.setItem(OBLIVION_USER_SESSION_KEY, JSON.stringify(parsed));
        return tok;
      }
    }
  } catch (err) {
    console.warn("[authService] Failed reading auth token from localStorage:", err);
  }
  return null;
}

/**
 * Retrieves the perpetual user profile session from localStorage.
 */
export function getStoredUserSession(): User | null {
  try {
    const sessionStr = localStorage.getItem(OBLIVION_USER_SESSION_KEY);
    if (sessionStr) {
      const parsed = JSON.parse(sessionStr);
      if (parsed && typeof parsed === "object" && (parsed.isLoggedIn || parsed.id || parsed.accessToken)) {
        return {
          ...parsed,
          isLoggedIn: true,
          accessToken: parsed.accessToken || getStoredAuthToken() || undefined,
        };
      }
    }

    // Legacy fallback migration
    const legacyStr = localStorage.getItem(LEGACY_USER_KEY);
    if (legacyStr) {
      const parsed = JSON.parse(legacyStr);
      if (parsed && typeof parsed === "object" && (parsed.isLoggedIn || parsed.id || parsed.accessToken)) {
        const fullUser: User = {
          ...parsed,
          isLoggedIn: true,
          accessToken: parsed.accessToken || undefined,
        };
        localStorage.setItem(OBLIVION_USER_SESSION_KEY, JSON.stringify(fullUser));
        if (fullUser.accessToken) {
          localStorage.setItem(OBLIVION_AUTH_TOKEN_KEY, fullUser.accessToken);
        }
        return fullUser;
      }
    }
  } catch (err) {
    console.warn("[authService] Failed reading user session from localStorage:", err);
  }
  return null;
}

/**
 * Perpetual authentication persistence.
 * Stores OAuth tokens (including refresh tokens) and user profiles strictly under OBLIVION_USER_SESSION and OBLIVION_REFRESH_TOKEN.
 * DO NOT automatically expire or wipe these keys.
 */
export function setStoredAuth(
  token?: string | null,
  user?: (User & { refreshToken?: string; refresh_token?: string; expiresIn?: number; expires_in?: number }) | null
): void {
  try {
    const existingSession = getStoredUserSession();
    const cleanToken = token ? token.trim() : existingSession?.accessToken;

    if (cleanToken) {
      localStorage.setItem(OBLIVION_AUTH_TOKEN_KEY, cleanToken);
      (window as any).__OBLIVION_ACCESS_TOKEN = cleanToken;
    }

    if (user && typeof user === "object") {
      const refreshToken =
        user.refreshToken ||
        (user as any).refresh_token ||
        getStoredRefreshToken() ||
        (existingSession as any)?.refreshToken ||
        (existingSession as any)?.refresh_token;

      if (refreshToken) {
        setStoredRefreshToken(refreshToken);
      }

      const expiresInSec = user.expiresIn || user.expires_in || 3600;
      setStoredTokenExpiresAt(Date.now() + expiresInSec * 1000);

      const sessionUser = {
        ...existingSession,
        ...user,
        isLoggedIn: true,
        accessToken: cleanToken || user.accessToken || undefined,
        access_token: cleanToken || user.accessToken || undefined,
        refreshToken: refreshToken || undefined,
        refresh_token: refreshToken || undefined,
      };
      localStorage.setItem(OBLIVION_USER_SESSION_KEY, JSON.stringify(sessionUser));
      localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(sessionUser));
      if (sessionUser.accessToken) {
        localStorage.setItem(OBLIVION_AUTH_TOKEN_KEY, sessionUser.accessToken);
        (window as any).__OBLIVION_ACCESS_TOKEN = sessionUser.accessToken;
      }
    }

    window.dispatchEvent(new CustomEvent("oblivion_auth_changed", { detail: { isLoggedIn: true } }));
  } catch (err) {
    console.warn("[authService] Failed saving perpetual auth state:", err);
  }
}

/**
 * Updates the OAuth access token without modifying other user profile fields.
 */
export function updateStoredAuthToken(newToken: string, updatedUser?: any, expiresIn: number = 3600): void {
  if (!newToken) return;
  try {
    const clean = newToken.trim();
    localStorage.setItem(OBLIVION_AUTH_TOKEN_KEY, clean);
    (window as any).__OBLIVION_ACCESS_TOKEN = clean;
    setStoredTokenExpiresAt(Date.now() + expiresIn * 1000);

    const currentSession = getStoredUserSession() || {};
    const refreshToken =
      updatedUser?.refreshToken ||
      updatedUser?.refresh_token ||
      getStoredRefreshToken() ||
      (currentSession as any)?.refreshToken;

    if (refreshToken) {
      setStoredRefreshToken(refreshToken);
    }

    const merged = {
      ...currentSession,
      ...(updatedUser || {}),
      accessToken: clean,
      access_token: clean,
      refreshToken: refreshToken || undefined,
      refresh_token: refreshToken || undefined,
      isLoggedIn: true,
    };
    localStorage.setItem(OBLIVION_USER_SESSION_KEY, JSON.stringify(merged));
    localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(merged));
    setInMemoryAuth(clean, merged);
    window.dispatchEvent(new CustomEvent("oblivion_auth_changed", { detail: { isLoggedIn: true, token: clean } }));
  } catch (err) {
    console.warn("[authService] Failed updating stored auth token:", err);
  }
}

/**
 * Clears authentication ONLY when user manually clicks "Sign Out".
 * Clears OBLIVION_REFRESH_TOKEN, OBLIVION_USER_SESSION, OBLIVION_AUTH_TOKEN, and all OBLIVION_TRACKS_CACHE_* entries.
 */
export function clearStoredAuth(): void {
  try {
    localStorage.removeItem(OBLIVION_REFRESH_TOKEN_KEY);
    localStorage.removeItem(OBLIVION_TOKEN_EXPIRES_AT_KEY);
    localStorage.removeItem(OBLIVION_AUTH_TOKEN_KEY);
    localStorage.removeItem(OBLIVION_USER_SESSION_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
    (window as any).__OBLIVION_ACCESS_TOKEN = null;
    setInMemoryAuth(null, null);

    // Remove all OBLIVION_TRACKS_CACHE_* and playlist tracks caches
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith("OBLIVION_TRACKS_CACHE_") ||
            key.startsWith("OBLIVION_PLAYLIST_CACHE") ||
            key.startsWith("oblivion_tracks_") ||
            key.startsWith("custom_art_"))
        ) {
          keysToRemove.push(key);
        }
      }
      for (const k of keysToRemove) {
        localStorage.removeItem(k);
      }
    } catch {}

    window.dispatchEvent(new CustomEvent("oblivion_auth_changed", { detail: { isLoggedIn: false } }));
  } catch (err) {
    console.warn("[authService] Failed clearing auth state:", err);
  }
}

/**
 * Checks if user is perpetually authenticated locally.
 */
export function isUserPerpetuallyAuthenticated(): boolean {
  const token = getStoredAuthToken();
  const session = getStoredUserSession();
  return Boolean(token || session?.isLoggedIn);
}
