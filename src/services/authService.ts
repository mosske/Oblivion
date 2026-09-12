import { User } from "../types";

export const OBLIVION_AUTH_TOKEN_KEY = "OBLIVION_AUTH_TOKEN";
export const OBLIVION_USER_SESSION_KEY = "OBLIVION_USER_SESSION";

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
 * Stores OAuth tokens and user profiles strictly under OBLIVION_AUTH_TOKEN and OBLIVION_USER_SESSION.
 * DO NOT automatically expire or wipe these keys.
 */
export function setStoredAuth(token?: string | null, user?: User | null): void {
  try {
    if (token && typeof token === "string" && token.trim().length > 0) {
      const cleanToken = token.trim();
      localStorage.setItem(OBLIVION_AUTH_TOKEN_KEY, cleanToken);
      (window as any).__OBLIVION_ACCESS_TOKEN = cleanToken;
    }

    if (user && typeof user === "object") {
      const sessionUser: User = {
        ...user,
        isLoggedIn: true,
        accessToken: token || user.accessToken || getStoredAuthToken() || undefined,
      };
      localStorage.setItem(OBLIVION_USER_SESSION_KEY, JSON.stringify(sessionUser));
      // Maintain legacy key for cross-module compatibility
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
 * Updates only the OAuth access token without modifying other user profile fields.
 */
export function updateStoredAuthToken(newToken: string): void {
  if (!newToken) return;
  try {
    const clean = newToken.trim();
    localStorage.setItem(OBLIVION_AUTH_TOKEN_KEY, clean);
    (window as any).__OBLIVION_ACCESS_TOKEN = clean;

    const currentSession = getStoredUserSession();
    if (currentSession) {
      currentSession.accessToken = clean;
      localStorage.setItem(OBLIVION_USER_SESSION_KEY, JSON.stringify(currentSession));
      localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(currentSession));
    }
  } catch (err) {
    console.warn("[authService] Failed updating stored auth token:", err);
  }
}

/**
 * Clears authentication ONLY when user manually clicks "Sign Out".
 */
export function clearStoredAuth(): void {
  try {
    localStorage.removeItem(OBLIVION_AUTH_TOKEN_KEY);
    localStorage.removeItem(OBLIVION_USER_SESSION_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
    (window as any).__OBLIVION_ACCESS_TOKEN = null;
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
