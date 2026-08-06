import React, { useState, useEffect } from "react";
import { User } from "../types";
import { X, Sparkles, User as UserIcon, RefreshCw, Key, ExternalLink, Check } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [clientIdInput, setClientIdInput] = useState("");
  const [clientSecretInput, setClientSecretInput] = useState("");
  const [redirectUri, setRedirectUri] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Fetch current config status
      fetch("/api/auth/google/config")
        .then((res) => res.json())
        .then((data) => {
          if (data.redirectUri) setRedirectUri(data.redirectUri);
          if (data.clientId) setClientIdInput(data.clientId);
          if (!data.configured) {
            setShowConfig(true);
          } else {
            setShowConfig(false);
          }
        })
        .catch((err) => console.error("Error fetching google auth config:", err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
        // Automatically trigger Google login after saving
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

      if (!res.ok || !data.configured || !data.url) {
        setShowConfig(true);
        setLoading(false);
        return;
      }

      const width = 500;
      const height = 650;
      const left = window.screenX + (window.innerWidth - width) / 2;
      const top = window.screenY + (window.innerHeight - height) / 2;

      const popup = window.open(
        data.url,
        "Google OAuth Login",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        alert("Please allow popups for this site to complete Google sign in.");
        setLoading(false);
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
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-white">Connect Google Account</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-center">
          <div className="w-14 h-14 bg-gradient-to-tr from-cyan-500 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <UserIcon className="w-7 h-7 text-slate-950" />
          </div>

          <div className="space-y-1">
            <h4 className="text-lg font-bold text-white">Sync YouTube Music</h4>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              Sign in with your Google Account to pick your account and automatically sync YouTube Music playlists and likes.
            </p>
          </div>

          {showConfig ? (
            <div className="text-left bg-slate-950/80 p-4 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-cyan-400">
                <span className="flex items-center gap-1.5">
                  <Key className="w-4 h-4" />
                  <span>Google OAuth Setup Required</span>
                </span>
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 underline"
                >
                  <span>Google Console</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-300 font-semibold">Google Client ID</label>
                <input
                  type="text"
                  placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-300 font-semibold">Client Secret (Optional)</label>
                <input
                  type="password"
                  placeholder="e.g. GOCSPX-..."
                  value={clientSecretInput}
                  onChange={(e) => setClientSecretInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {redirectUri && (
                <div className="pt-1 text-[10px] text-slate-400 space-y-1">
                  <span className="font-semibold text-slate-300">Authorized Redirect URI to set in Google Console:</span>
                  <div className="font-mono text-[10px] bg-slate-900 p-1.5 rounded border border-slate-800 text-cyan-300 break-all select-all">
                    {redirectUri}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <div className="pt-1 space-y-2">
            <button
              id="auth-modal-google-btn"
              onClick={handleGoogleLogin}
              disabled={loading || savingConfig}
              className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-xl shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading || savingConfig ? (
                <RefreshCw className="w-5 h-5 animate-spin text-slate-900" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
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
              <span>{showConfig ? "Save & Proceed to Google Sign In" : "Sign in with Google"}</span>
            </button>

            {!showConfig && (
              <button
                onClick={() => setShowConfig(true)}
                className="text-[11px] text-slate-400 hover:text-cyan-400 transition-colors pt-1"
              >
                Change or Configure OAuth Credentials
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

