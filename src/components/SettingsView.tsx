import React, { useEffect, useState } from "react";
import { User, UserSettings, ThemePreset, AudioQuality, LyricsFontSize, LyricsAlignment } from "../types";
import { ThemeRegistry } from "../utils/themeMap";
import {
  Settings,
  Sliders,
  Palette,
  HardDrive,
  Sparkles,
  Volume2,
  Radio,
  Type,
  Trash2,
  Check,
  ShieldCheck,
  Layers,
  User as UserIcon,
  LogOut,
  RefreshCw,
  CheckCircle2,
  Lock
} from "lucide-react";
import { getCacheSizeMB, clearAllCache } from "../utils/offlineCache";

interface SettingsViewProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  user: User | null;
  onLoginSuccess: (user: User) => void;
  onLogout: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  user,
  onLoginSuccess,
  onLogout,
}) => {
  const [cacheMB, setCacheMB] = useState<number>(0);
  const [cleared, setCleared] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Google OAuth Config state
  const [clientId, setClientId] = useState<string>("");
  const [clientSecret, setClientSecret] = useState<string>("");
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [redirectUri, setRedirectUri] = useState<string>("");
  const [showConfigPanel, setShowConfigPanel] = useState<boolean>(false);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);

  useEffect(() => {
    getCacheSizeMB().then(setCacheMB);

      const envClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || "";
      const envClientSecret = (import.meta.env.VITE_GOOGLE_CLIENT_SECRET as string) || "";
      if (envClientId) {
        setClientId(envClientId);
        setIsConfigured(true);
      }
      if (envClientSecret) {
        setClientSecret(envClientSecret);
      }

      fetch("/api/auth/google/config")
        .then((res) => {
          if (!res.ok) throw new Error("HTTP " + res.status);
          const ct = res.headers.get("content-type");
          if (!ct || !ct.includes("application/json")) throw new Error("Not JSON");
          return res.json();
        })
        .then((data) => {
          const activeId = data.clientId || envClientId || localStorage.getItem("oblivion_google_client_id") || "";
          if (activeId) {
            setClientId(activeId);
            localStorage.setItem("oblivion_google_client_id", activeId);
            setIsConfigured(true);
          }
          if (data.redirectUri) setRedirectUri(data.redirectUri);
        })
        .catch((err) => {
          console.warn("Config fetch notice (checking environment & local storage fallback):", err);
          const activeId = envClientId || localStorage.getItem("oblivion_google_client_id") || "";
          if (activeId) {
            setClientId(activeId);
            setIsConfigured(true);
          }
        });
  }, []);

  const handleSaveOauthConfig = async () => {
    if (!clientId.trim()) {
      alert("Please enter a valid Google OAuth Client ID.");
      return;
    }
    setSavingConfig(true);
    localStorage.setItem("oblivion_google_client_id", clientId.trim());
    if (clientSecret.trim()) {
      localStorage.setItem("oblivion_google_client_secret", clientSecret.trim());
    }

    try {
      const res = await fetch("/api/auth/google/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
        }),
      });
      if (res.ok) {
        const ct = res.headers.get("content-type");
        if (ct && ct.includes("application/json")) {
          const data = await res.json();
          if (data.configured) {
            setIsConfigured(true);
            setShowConfigPanel(false);
            alert("Google OAuth configuration saved successfully!");
            setSavingConfig(false);
            return;
          }
        }
      }
    } catch (err) {
      console.warn("Backend save notice:", err);
    }
    setIsConfigured(true);
    setShowConfigPanel(false);
    alert("Google OAuth configuration saved locally!");
    setSavingConfig(false);
  };

  const handleClearCache = async () => {
    await clearAllCache();
    setCacheMB(0);
    setCleared(true);
    setTimeout(() => setCleared(false), 3000);
  };

  const handleGoogleLogin = async () => {
    setAuthLoading(true);

    try {
      let authUrl = "";

      // 1. Try to fetch auth URL from backend API
      try {
        const res = await fetch("/api/auth/google/url");
        if (res.ok) {
          const ct = res.headers.get("content-type");
          if (ct && ct.includes("application/json")) {
            const data = await res.json();
            if (data.configured && data.url) {
              authUrl = data.url;
            }
          }
        }
      } catch (err) {
        console.warn("Backend auth URL endpoint notice, falling back to client-side OAuth URL generation:", err);
      }

      // 2. Client-side fallback if backend API is unreachable or not configured on server
      if (!authUrl) {
        const activeClientId = clientId.trim() || (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || localStorage.getItem("oblivion_google_client_id") || "";
        if (!activeClientId) {
          setShowConfigPanel(true);
          alert("Google OAuth Client ID is required. Please ensure GOOGLE_CLIENT_ID or VITE_GOOGLE_CLIENT_ID is configured in Secrets.");
          setAuthLoading(false);
          return;
        }

        const currentOrigin = window.location.origin;
        const currentRedirectUri = `${currentOrigin}/api/auth/google/callback`;
        const scopes = [
          "https://www.googleapis.com/auth/youtube",
          "https://www.googleapis.com/auth/userinfo.profile",
          "https://www.googleapis.com/auth/userinfo.email",
        ].join(" ");

        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
          client_id: activeClientId,
          redirect_uri: currentRedirectUri,
          response_type: "code",
          scope: scopes,
          access_type: "offline",
          prompt: "consent",
        }).toString();
      }

      const width = 500;
      const height = 650;
      const left = window.screenX + (window.innerWidth - width) / 2;
      const top = window.screenY + (window.innerHeight - height) / 2;

      const popup = window.open(
        authUrl,
        "Google OAuth Login",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        alert("Please allow popups for this site to complete Google sign in.");
        setAuthLoading(false);
        return;
      }

      const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === "OAUTH_SUCCESS") {
          window.removeEventListener("message", handleMessage);
          setAuthLoading(false);
          onLoginSuccess(event.data.user);
        } else if (event.data && event.data.type === "OAUTH_ERROR") {
          window.removeEventListener("message", handleMessage);
          setAuthLoading(false);
          const rawErr = event.data.error ? String(event.data.error) : "Failed to authenticate";
          if (rawErr.toLowerCase().includes("secret") || rawErr.toLowerCase().includes("invalid_client")) {
            setShowConfigPanel(true);
            alert("Google OAuth Credential Error:\n\n" + rawErr + "\n\nPlease verify your Google OAuth Client Secret in Google Cloud Console and save it in the settings panel below.");
          } else {
            alert("Google Sign-In Notice: " + rawErr);
          }
        }
      };

      window.addEventListener("message", handleMessage);
    } catch (err) {
      console.error(err);
      alert("Failed to initiate Google sign in.");
      setAuthLoading(false);
    }
  };


  const currentThemeMeta = ThemeRegistry.getTheme(settings.themePreset);

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar pb-28 max-w-5xl select-none">
      <div>
        <h1 className="text-2xl font-bold font-mono flex items-center gap-2">
          <Settings className={`w-6 h-6 ${currentThemeMeta.accentClass}`} />
          <span>Oblivion Settings & Account</span>
        </h1>
        <p className={`text-xs ${currentThemeMeta.subtextColor}`}>
          Manage your connected Google Account, select custom UI design themes, configure audio quality, and manage caching.
        </p>
      </div>

      {/* TOP SECTION: Google Account Integration */}
      <section className={`p-6 ${currentThemeMeta.cardBg} border rounded-3xl space-y-5 shadow-xl relative overflow-hidden`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm">
            <UserIcon className={`w-4 h-4 ${currentThemeMeta.accentClass}`} />
            <span>Google & YouTube Account Connection</span>
          </div>
          {user?.isLoggedIn ? (
            <span className="text-xs px-2.5 py-1 rounded-full font-mono font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Connected</span>
            </span>
          ) : (
            <span className="text-xs px-2.5 py-1 rounded-full font-mono font-medium bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Not Connected</span>
            </span>
          )}
        </div>

        {user?.isLoggedIn ? (
          /* Connected User Profile Card */
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-cyan-400/50 shadow-md"
                />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-slate-950 flex items-center justify-center">
                  <Check className="w-3 h-3 text-slate-950 stroke-[3]" />
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{user.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    YouTube Synced
                  </span>
                </h3>
                <p className="text-xs text-slate-400">{user.email}</p>
                <p className="text-[11px] text-emerald-400/90 font-mono mt-0.5">
                  Playlists & library real-time Google sync active
                </p>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="w-full sm:w-auto px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold text-xs rounded-xl border border-red-500/30 flex items-center justify-center gap-2 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          /* Sign In Card */
          <div className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">Sync YouTube Music Playlists & Likes</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect your Google Account to automatically sync your YouTube Music collection, personal playlists, and liked songs in real time across sessions.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
              <button
                id="settings-google-login-btn"
                onClick={handleGoogleLogin}
                disabled={authLoading}
                className="w-full sm:w-auto py-3 px-6 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2.5 transition-all active:scale-95 disabled:opacity-50"
              >
                {authLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-900" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
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

              <button
                onClick={() => setShowConfigPanel(!showConfigPanel)}
                className="w-full sm:w-auto py-3 px-4 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>{showConfigPanel ? "Hide OAuth Settings" : "Configure Google Credentials"}</span>
              </button>
            </div>

            {/* Google Credentials Configuration Panel */}
            {showConfigPanel && (
              <div className="mt-3 p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-cyan-400">
                  <span>Google OAuth Client Configuration</span>
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-slate-400 hover:text-cyan-300 underline"
                  >
                    Open Google Cloud Console ↗
                  </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Google OAuth Client ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Client Secret (Optional)</label>
                    <input
                      type="password"
                      placeholder="e.g. GOCSPX-..."
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="text-[10px] text-slate-400">
                    Callback URL: <code className="text-cyan-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 select-all">{redirectUri || "https://.../api/auth/google/callback"}</code>
                  </div>

                  <button
                    onClick={handleSaveOauthConfig}
                    disabled={savingConfig}
                    className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs rounded-lg transition-all"
                  >
                    {savingConfig ? "Saving..." : "Save Credentials"}
                  </button>
                </div>
              </div>
            )}

            {/* OAuth Provider Instructions */}
            <div className="mt-4 p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2 font-mono text-cyan-400 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Google OAuth Provider Setup Guidelines</span>
              </div>
              <p className="text-[11px] text-slate-400">
                When creating OAuth 2.0 Web Client credentials in Google Cloud Console, add these exact redirect URLs:
              </p>
              <div className="space-y-1 font-mono text-[11px] bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-cyan-300 select-all">
                <div>• Vercel Production Callback: <code>https://oblivion-rho.vercel.app/api/auth/google/callback</code></div>
                <div>• Development Callback: <code>https://ais-dev-blr47rrsu4chpkttmgwnlk-270966030907.asia-southeast1.run.app/api/auth/google/callback</code></div>
                <div>• Shared Callback: <code>https://ais-pre-blr47rrsu4chpkttmgwnlk-270966030907.asia-southeast1.run.app/api/auth/google/callback</code></div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* GUI & Theme Customization (Prominently Featured First) */}
      <section className={`p-6 ${currentThemeMeta.cardBg} border rounded-3xl space-y-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Palette className={`w-4 h-4 ${currentThemeMeta.accentClass}`} />
            <span>Select App Design & Aesthetic Preset</span>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-mono font-medium border ${currentThemeMeta.borderAccent}`}>
            Active: {currentThemeMeta.name}
          </span>
        </div>

        {/* Theme Presets Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.values(ThemeRegistry.THEMES).map((t) => {
            const isSelected = settings.themePreset === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onUpdateSettings({ themePreset: t.id })}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all duration-300 relative overflow-hidden group bg-gradient-to-br ${t.previewGradient} ${
                  isSelected
                    ? "border-cyan-400 ring-2 ring-cyan-400/40 shadow-xl scale-[1.02]"
                    : "border-slate-800/80 opacity-80 hover:opacity-100 hover:scale-[1.01]"
                }`}
              >
                {/* Active Checkmark Badge */}
                {isSelected && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shadow-md">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/40 text-slate-200 border border-white/10">
                      {t.category}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">{t.name}</h4>
                  <p className="text-[11px] text-slate-300/80 line-clamp-2 leading-relaxed mb-4">
                    {t.description}
                  </p>
                </div>

                {/* Color Swatches Bar */}
                <div className="flex items-center gap-1.5 pt-3 border-t border-white/10">
                  {t.swatchColors.map((color, idx) => (
                    <span
                      key={idx}
                      className="w-4 h-4 rounded-full border border-white/20 shadow-inner"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <span className="ml-auto text-[10px] font-semibold text-slate-200 uppercase">
                    {isSelected ? "Selected" : "Select"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Lyrics Preferences */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800/60">
          <div>
            <label className="block text-xs font-semibold uppercase mb-2">
              Lyrics Font Size
            </label>
            <div className="flex items-center gap-2">
              {(["sm", "md", "lg"] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => onUpdateSettings({ lyricsFontSize: size })}
                  className={`flex-1 py-2 text-xs font-bold uppercase rounded-xl transition-all ${
                    settings.lyricsFontSize === size
                      ? `${currentThemeMeta.accentBg} text-slate-950`
                      : "bg-slate-950/60 text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase mb-2">
              Lyrics Alignment
            </label>
            <div className="flex items-center gap-2">
              {(["left", "center"] as const).map((align) => (
                <button
                  key={align}
                  onClick={() => onUpdateSettings({ lyricsAlignment: align })}
                  className={`flex-1 py-2 text-xs font-bold uppercase rounded-xl transition-all ${
                    settings.lyricsAlignment === align
                      ? `${currentThemeMeta.accentBg} text-slate-950`
                      : "bg-slate-950/60 text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Player Engine Controls */}
      <section className={`p-6 ${currentThemeMeta.cardBg} border rounded-3xl space-y-6`}>
        <div className="flex items-center gap-2 font-bold text-sm">
          <Sliders className={`w-4 h-4 ${currentThemeMeta.accentClass}`} />
          <span>Player Audio Engine</span>
        </div>

        {/* Audio Quality */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase mb-2">
              Streaming Audio Quality
            </label>
            <select
              value={settings.audioQuality}
              onChange={(e) => onUpdateSettings({ audioQuality: e.target.value as AudioQuality })}
              className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-cyan-500"
            >
              <option value="normal">Normal (160 kbps AAC)</option>
              <option value="high">High Quality (320 kbps MP3)</option>
              <option value="lossless">Lossless (24-bit / 96kHz FLAC)</option>
            </select>
          </div>

          {/* Crossfade Duration */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold uppercase">
                Crossfade Tracks
              </label>
              <span className={`text-xs font-mono ${currentThemeMeta.accentClass}`}>{settings.crossfadeDuration}s</span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              value={settings.crossfadeDuration}
              onChange={(e) => onUpdateSettings({ crossfadeDuration: Number(e.target.value) })}
              className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/60">
          <label className="flex items-center justify-between p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 cursor-pointer">
            <span className="text-xs font-semibold">Volume Normalization</span>
            <input
              type="checkbox"
              checked={settings.normalizeVolume}
              onChange={(e) => onUpdateSettings({ normalizeVolume: e.target.checked })}
              className="w-4 h-4 accent-cyan-400 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 cursor-pointer">
            <span className="text-xs font-semibold">Autoplay Similar Radio</span>
            <input
              type="checkbox"
              checked={settings.autoPlaySimilar}
              onChange={(e) => onUpdateSettings({ autoPlaySimilar: e.target.checked })}
              className="w-4 h-4 accent-cyan-400 cursor-pointer"
            />
          </label>
        </div>
      </section>

      {/* Offline Storage Cache Controls */}
      <section className={`p-6 ${currentThemeMeta.cardBg} border rounded-3xl space-y-6`}>
        <div className="flex items-center gap-2 font-bold text-sm">
          <HardDrive className={`w-4 h-4 ${currentThemeMeta.accentClass}`} />
          <span>IndexedDB Offline Caching</span>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
          <div>
            <p className="text-xs font-mono uppercase text-slate-400">Current Storage Used</p>
            <p className="text-xl font-bold font-mono">{cacheMB} MB</p>
          </div>

          <button
            onClick={handleClearCache}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold text-xs rounded-xl border border-red-500/40 flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>{cleared ? "Cache Cleared!" : "Clear All Cache"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex items-center justify-between p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 cursor-pointer">
            <span className="text-xs font-semibold">Auto-Download Liked Songs</span>
            <input
              type="checkbox"
              checked={settings.autoDownloadFavorites}
              onChange={(e) => onUpdateSettings({ autoDownloadFavorites: e.target.checked })}
              className="w-4 h-4 accent-cyan-400 cursor-pointer"
            />
          </label>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold uppercase">
                Max Cache Storage Limit
              </label>
              <span className={`text-xs font-mono ${currentThemeMeta.accentClass}`}>{settings.maxCacheSizeMB} MB</span>
            </div>
            <input
              type="range"
              min={100}
              max={2000}
              step={100}
              value={settings.maxCacheSizeMB}
              onChange={(e) => onUpdateSettings({ maxCacheSizeMB: Number(e.target.value) })}
              className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </div>
      </section>
    </div>
  );
};
