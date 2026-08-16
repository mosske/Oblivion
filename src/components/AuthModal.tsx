import React, { useState, useEffect } from "react";
import { User } from "../types";
import { X, Sparkles, User as UserIcon, RefreshCw, Key, ExternalLink, Copy, Check } from "lucide-react";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";

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
  const [showConfig, setShowConfig] = useState(false);
  const [clientIdInput, setClientIdInput] = useState("");
  const [clientSecretInput, setClientSecretInput] = useState("");
  const [redirectUri, setRedirectUri] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Fetch current config status
      fetch("/api/auth/google/config")
        .then((res) => res.json())
        .then((data) => {
          if (data.redirectUri) {
            setRedirectUri(data.redirectUri);
          } else {
            setRedirectUri(`${window.location.origin}/api/auth/google/callback`);
          }
          if (data.clientId) setClientIdInput(data.clientId);
          if (!data.configured) {
            setShowConfig(true);
          } else {
            setShowConfig(false);
          }
        })
        .catch(() => {
          setRedirectUri(`${window.location.origin}/api/auth/google/callback`);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyUri = () => {
    if (redirectUri) {
      navigator.clipboard.writeText(redirectUri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveConfig = async () => {
    if (!clientIdInput.trim()) {
      alert("Please enter a valid Google OAuth Client ID.");
      return;
    }
    setSavingConfig(true);
    try {
      const res = await fetch("/api/auth/google/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientIdInput.trim(),
          clientSecret: clientSecretInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.configured) {
        setShowConfig(false);
        startGooglePopup();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save credentials.");
    } finally {
      setSavingConfig(false);
    }
  };

  const startGooglePopup = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/auth/google/url");
      const data = await res.json();

      let targetUrl = data.url;
      if (!res.ok || !data.configured || !targetUrl) {
        if (!clientIdInput.trim()) {
          setShowConfig(true);
          setLoading(false);
          return;
        }
        const currentOrigin = window.location.origin;
        const currentRedirect = `${currentOrigin}/api/auth/google/callback`;
        const scopes = [
          "https://www.googleapis.com/auth/youtube",
          "https://www.googleapis.com/auth/userinfo.profile",
          "https://www.googleapis.com/auth/userinfo.email",
        ].join(" ");

        targetUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
          client_id: clientIdInput.trim(),
          redirect_uri: currentRedirect,
          response_type: "code",
          scope: scopes,
          access_type: "offline",
          prompt: "consent",
        }).toString();
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
      alert("Failed to initiate Google login.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (showConfig) {
      handleSaveConfig();
    } else {
      startGooglePopup();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className={`w-full max-w-md ${designConfig.modalBg} border ${designConfig.borderSubtle} rounded-3xl shadow-2xl overflow-hidden ${designConfig.textSecondary}`}>
        <div className={`flex items-center justify-between p-5 border-b ${designConfig.borderSubtle}`}>
          <div className="flex items-center gap-2">
            <Sparkles className={`w-5 h-5 ${designConfig.accentText}`} />
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
          <div className={`w-14 h-14 ${designConfig.btnPrimary} rounded-2xl mx-auto flex items-center justify-center shadow-lg`}>
            <UserIcon className="w-7 h-7 fill-current" />
          </div>

          <div className="space-y-1.5">
            <h4 className={`text-base font-bold ${designConfig.textPrimary}`}>Sign in with Google</h4>
            <p className={`text-xs ${designConfig.textMuted} leading-relaxed max-w-xs mx-auto`}>
              Connect your account to sync your authentic YouTube Music playlists, favorite artists, and liked tracks.
            </p>
          </div>

          {showConfig && (
            <div className={`text-left ${designConfig.isLight ? "bg-[#f5f2eb]" : "bg-slate-950/80"} p-4 border ${designConfig.borderSubtle} rounded-2xl space-y-3`}>
              <div className={`flex items-center justify-between text-xs font-bold ${designConfig.accentText}`}>
                <span className="flex items-center gap-1.5">
                  <Key className="w-4 h-4" />
                  <span>Google OAuth Client Setup</span>
                </span>
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noreferrer"
                  className={`text-[11px] ${designConfig.textMuted} hover:${designConfig.accentText} flex items-center gap-1 underline`}
                >
                  <span>Google Console</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="space-y-1">
                <label className={`text-[11px] ${designConfig.textPrimary} font-semibold`}>Google Client ID</label>
                <input
                  type="text"
                  placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  className={`w-full px-3 py-2 ${designConfig.inputBg} rounded-xl text-xs focus:outline-none`}
                />
              </div>

              <div className="space-y-1">
                <label className={`text-[11px] ${designConfig.textPrimary} font-semibold`}>Client Secret (Optional)</label>
                <input
                  type="password"
                  placeholder="e.g. GOCSPX-..."
                  value={clientSecretInput}
                  onChange={(e) => setClientSecretInput(e.target.value)}
                  className={`w-full px-3 py-2 ${designConfig.inputBg} rounded-xl text-xs focus:outline-none`}
                />
              </div>

              {redirectUri && (
                <div className="pt-1 text-[10px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${designConfig.textPrimary}`}>Redirect URI for Console:</span>
                    <button
                      type="button"
                      onClick={handleCopyUri}
                      className={`flex items-center gap-1 ${designConfig.accentText} hover:underline font-mono text-[10px]`}
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? "Copied" : "Copy URI"}</span>
                    </button>
                  </div>
                  <div className={`font-mono text-[10px] ${designConfig.inputBg} p-2 rounded-xl border ${designConfig.borderSubtle} ${designConfig.accentText} break-all select-all`}>
                    {redirectUri}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-1 space-y-2">
            <button
              id="auth-modal-google-btn"
              onClick={handleGoogleLogin}
              disabled={loading || savingConfig}
              className={`w-full py-3.5 px-4 ${designConfig.btnPrimary} font-bold text-sm rounded-xl shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50`}
            >
              {loading || savingConfig ? (
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
              <span>{showConfig ? "Save Credentials & Sign In" : "Sign in with Google"}</span>
            </button>

            {!showConfig && (
              <button
                onClick={() => setShowConfig(true)}
                className={`text-[11px] ${designConfig.textMuted} hover:${designConfig.accentText} transition-colors pt-1`}
              >
                Configure OAuth Credentials
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


