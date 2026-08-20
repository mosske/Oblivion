import React, { useState } from "react";
import { User } from "../types";
import { X, Sparkles, User as UserIcon, RefreshCw } from "lucide-react";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";
import { OblivionLogo } from "./OblivionLogo";

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

  if (!isOpen) return null;

  const startGooglePopup = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/auth/google/url");
      const data = await res.json();

      let targetUrl = data.url;
      if (!res.ok || !targetUrl) {
        throw new Error(data.error || "Failed to generate Google Sign-In URL.");
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
          `width=${width},height=${height},left=${left},top=${top}`
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

      const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === "OAUTH_SUCCESS") {
          window.removeEventListener("message", handleMessage);
          setLoading(false);
          onSuccess(event.data.user);
          onClose();
        } else if (event.data && event.data.type === "OAUTH_ERROR") {
          window.removeEventListener("message", handleMessage);
          setLoading(false);
          alert("Google Sign-In Error: " + (event.data.error || "Failed to authenticate"));
        }
      };

      window.addEventListener("message", handleMessage);

      // Fallback check in case popup closes or token saves to local store
      const pollTimer = setInterval(() => {
        try {
          const saved = localStorage.getItem("oblivion_saved_user");
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && (parsed.id || parsed.email)) {
              clearInterval(pollTimer);
              window.removeEventListener("message", handleMessage);
              setLoading(false);
              onSuccess(parsed);
              onClose();
            }
          }
          if (popup && popup.closed) {
            clearInterval(pollTimer);
            setTimeout(() => setLoading(false), 500);
          }
        } catch (e) {}
      }, 1000);
    } catch (err: any) {
      console.error("Auth error:", err);
      alert(err.message || "Failed to initiate Google login.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className={`w-full max-w-md ${designConfig.modalBg} border ${designConfig.borderSubtle} rounded-3xl shadow-2xl overflow-hidden ${designConfig.textSecondary}`}>
        <div className={`flex items-center justify-between p-5 border-b ${designConfig.borderSubtle}`}>
          <div className="flex items-center gap-2.5">
            <OblivionLogo size={20} />
            <h3 className={`text-base font-bold ${designConfig.textPrimary}`}>Connect YouTube Music</h3>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 ${designConfig.textMuted} hover:${designConfig.textPrimary} rounded-xl transition-colors`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-center">
          <OblivionLogo size={68} withAura className="mx-auto" />

          <div className="space-y-1.5">
            <h4 className={`text-base font-bold ${designConfig.textPrimary}`}>Sign in with Google</h4>
            <p className={`text-xs ${designConfig.textMuted} leading-relaxed max-w-xs mx-auto`}>
              Connect your account to sync your authentic YouTube Music playlists, favorite artists, and liked tracks.
            </p>
          </div>

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
