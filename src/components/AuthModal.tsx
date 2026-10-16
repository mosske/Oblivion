import React, { useState } from "react";
import { User } from "../types";
import { X, RefreshCw } from "lucide-react";
import {
  FullAppDesignConfig,
  FULL_APP_DESIGNS,
  syncDocumentThemeColor,
  getThemeCanvasColor,
} from "../utils/appDesignThemes";
import { OblivionLogo } from "./OblivionLogo";
import { setInMemoryAuth, setIsAuthenticatingGlobal, getStoredRefreshToken } from "../services/authService";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  designConfig?: FullAppDesignConfig;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  designConfig = FULL_APP_DESIGNS["designer"],
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleModalClose = () => {
    setIsAuthenticatingGlobal(false);
    setLoading(false);
    onClose();
  };

  const startGooglePopup = async () => {
    setLoading(true);
    setIsAuthenticatingGlobal(true);
    setErrorMessage(null);

    // 1. Pre-Sign-In Theme Color Sync:
    // Explicitly update document <meta name="theme-color"> tag and system toolbar bridges to match the active app theme
    const activeThemeColor = syncDocumentThemeColor(designConfig);

    try {
      // Speed up returning logins: pre-select the last-used account and skip the consent
      // screen when a refresh token is already stored in this browser.
      let lastEmail = "";
      try {
        lastEmail = localStorage.getItem("oblivion_last_email") || "";
      } catch {}
      const urlQuery = new URLSearchParams({ theme_color: activeThemeColor });
      if (lastEmail) urlQuery.set("login_hint", lastEmail);
      if (getStoredRefreshToken()) urlQuery.set("has_refresh", "1");
      const res = await fetch(`/api/auth/google/url?${urlQuery.toString()}`);
      const data = await res.json().catch(() => ({}));

      let targetUrl = data.url;
      if (!res.ok || !targetUrl) {
        const errorMsg = typeof data.error === "string" 
          ? data.error 
          : (data.error?.message || "Failed to generate Google Sign-In URL.");
        throw new Error(errorMsg);
      }

      // 2. In-App Browser / Chrome Custom Tab Toolbar Color Bridge:
      // If opened via Chrome Custom Tabs, InAppBrowser, or native overlay bridge, pass the active theme color
      const win = window as any;
      if (win.CustomTabs?.openCustomTab) {
        try {
          win.CustomTabs.openCustomTab(targetUrl, {
            toolbarColor: activeThemeColor,
            secondaryToolbarColor: activeThemeColor,
            navigationBarColor: activeThemeColor,
            showTitle: true,
          });
          return;
        } catch (e) {
          console.debug("CustomTabs bridge error, falling back to window popup:", e);
        }
      } else if (win.cordova?.InAppBrowser?.open) {
        try {
          win.cordova.InAppBrowser.open(
            targetUrl,
            "_blank",
            `toolbarcolor=${activeThemeColor},navigationbuttoncolor=#ffffff,closebuttoncolor=#ffffff,location=yes,toolbar=yes`
          );
          return;
        } catch (e) {
          console.debug("Cordova InAppBrowser error:", e);
        }
      }

      const width = 500;
      const height = 650;
      const left = Math.max(0, Math.floor(window.screenX + (window.innerWidth - width) / 2));
      const top = Math.max(0, Math.floor(window.screenY + (window.innerHeight - height) / 2));

      let popup: Window | null = null;
      try {
        popup = window.open(
          targetUrl,
          "Google OAuth Login",
          `width=${width},height=${height},left=${left},top=${top},status=yes,toolbar=no,menubar=no,location=yes,toolbarColor=${encodeURIComponent(activeThemeColor)}`
        );
      } catch (e) {
        console.warn("Popup error:", e);
      }

      if (!popup) {
        popup = window.open(targetUrl, "_blank");
      }

      if (!popup) {
        window.location.href = targetUrl;
        return;
      }

      let pollTimer: any = null;

      const handleMessage = async (event: MessageEvent) => {
        if (event.data && event.data.type === "OAUTH_SUCCESS") {
          window.removeEventListener("message", handleMessage);
          if (pollTimer) clearInterval(pollTimer);

          const incomingUser = event.data.user;
          try {
            if (incomingUser?.email) localStorage.setItem("oblivion_last_email", incomingUser.email);
          } catch {}
          const fullUser: User = { ...incomingUser, isLoggedIn: true };

          // 1. Immediately persist token & user to in-memory store and localStorage
          if (fullUser.accessToken) {
            setInMemoryAuth(fullUser.accessToken, fullUser);
          }
          try {
            localStorage.setItem("oblivion_saved_user", JSON.stringify(fullUser));
          } catch (e) {
            console.error("Failed to write user to localStorage", e);
          }

          // 2. Synchronously invoke onSuccess to update React state
          await onSuccess(fullUser);

          // 3. Mark authenticating as false and close the modal
          setLoading(false);
          setIsAuthenticatingGlobal(false);
          onClose();
        } else if (event.data && event.data.type === "OAUTH_ERROR") {
          window.removeEventListener("message", handleMessage);
          if (pollTimer) clearInterval(pollTimer);
          setLoading(false);
          setIsAuthenticatingGlobal(false);
          const rawErr = event.data.error;
          const parsedErr = typeof rawErr === "string" 
            ? rawErr 
            : (rawErr?.message || JSON.stringify(rawErr) || "Failed to authenticate");
          setErrorMessage(parsedErr);
        }
      };

      window.addEventListener("message", handleMessage);

      // Fallback check in case popup closes or token saves to local store
      pollTimer = setInterval(async () => {
        try {
          const saved = localStorage.getItem("oblivion_saved_user");
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && (parsed.id || parsed.email)) {
              clearInterval(pollTimer);
              window.removeEventListener("message", handleMessage);
              const fullUser: User = { ...parsed, isLoggedIn: true };
              setInMemoryAuth(fullUser.accessToken || null, fullUser);
              await onSuccess(fullUser);
              setLoading(false);
              setIsAuthenticatingGlobal(false);
              onClose();
            }
          }
          if (popup && popup.closed) {
            clearInterval(pollTimer);
            setTimeout(() => {
              setLoading(false);
              setIsAuthenticatingGlobal(false);
            }, 500);
          }
        } catch (e) {}
      }, 1000);
    } catch (err: any) {
      console.error("Auth error:", err);
      setErrorMessage(err.message || "Failed to initiate Google login.");
      setLoading(false);
      setIsAuthenticatingGlobal(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className={`w-full max-w-md ${designConfig.modalBg} border ${designConfig.borderSubtle} rounded-3xl shadow-2xl overflow-hidden ${designConfig.textSecondary}`}>
        <div className={`flex items-center justify-between p-5 border-b ${designConfig.borderSubtle}`}>
          <div className="flex items-center gap-2.5">
            <OblivionLogo size={22} designId={designConfig.id} />
            <h3 className={`text-base font-bold ${designConfig.textPrimary}`}>Connect YouTube Music</h3>
          </div>
          <button
            onClick={handleModalClose}
            className={`p-1.5 ${designConfig.textMuted} hover:${designConfig.textPrimary} rounded-xl transition-colors`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-center">
          <OblivionLogo size={76} designId={designConfig.id} withAura className="mx-auto" />

          <div className="space-y-1.5">
            <h4 className={`text-base font-bold ${designConfig.textPrimary}`}>Sign in with Google</h4>
            <p className={`text-xs ${designConfig.textMuted} leading-relaxed max-w-xs mx-auto`}>
              Connect your account to sync your authentic YouTube Music playlists, favorite artists, and liked tracks.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-left leading-relaxed">
              {errorMessage}
            </div>
          )}

          <div className="pt-2">
            <button
              id="auth-modal-google-btn"
              onClick={startGooglePopup}
              disabled={loading}
              className={`w-full py-3.5 px-4 ${designConfig.btnPrimary} font-bold text-sm rounded-xl shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50`}
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.31 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"
                  />
                </svg>
              )}
              <span>Sign in with Google</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
