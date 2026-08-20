import React, { useEffect, useState } from "react";
import { User, UserSettings, AudioQuality } from "../types";
import { FULL_APP_DESIGNS, FullAppDesignConfig } from "../utils/appDesignThemes";
import {
  Settings,
  Sliders,
  HardDrive,
  Sparkles,
  Trash2,
  Check,
  Smartphone,
  Download,
  Layout,
  Info
} from "lucide-react";
import { getCacheSizeMB, clearAllCache } from "../utils/offlineCache";

interface SettingsViewProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  user: User | null;
  onLoginSuccess: (user: User) => void;
  onLogout: () => void;
  designConfig?: FullAppDesignConfig;
  deferredPrompt?: any;
  onInstallPwa?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  designConfig = FULL_APP_DESIGNS["designer"],
  deferredPrompt,
  onInstallPwa,
}) => {
  const [cacheMB, setCacheMB] = useState<number>(0);
  const [cleared, setCleared] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [installSuccessMsg, setInstallSuccessMsg] = useState<string>("");

  useEffect(() => {
    getCacheSizeMB().then(setCacheMB);

    // Check if running in standalone PWA mode
    if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
    }
  }, []);

  const handleClearCache = async () => {
    await clearAllCache();
    setCacheMB(0);
    setCleared(true);
    setTimeout(() => setCleared(false), 3000);
  };

  const handleInstallClick = async () => {
    if (onInstallPwa) {
      onInstallPwa();
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setInstallSuccessMsg("Oblivion Music installed successfully!");
        setIsInstalled(true);
      }
    } else {
      // Guide the user clearly for Android Chrome
      setInstallSuccessMsg("To install on Android Chrome: Tap the top-right menu (⋮) in Chrome, then tap 'Install app' or 'Add to Home screen'.");
      setTimeout(() => setInstallSuccessMsg(""), 8000);
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 space-y-8 pb-40 md:pb-48 max-w-5xl select-none">
      {/* Header */}
      <div>
        <h1 className={`text-2xl sm:text-3xl font-extrabold ${designConfig.headingPrimary} tracking-tight flex items-center gap-2.5`}>
          <Settings className={`w-6 h-6 ${designConfig.accentText}`} />
          <span>Oblivion Settings</span>
        </h1>
        <p className={`text-xs ${designConfig.headingMuted} mt-1 font-medium`}>
          Customize your full app design layout, audio engine quality, and offline storage.
        </p>
      </div>

      {/* PWA ANDROID APP INSTALLATION SECTION */}
      <section className={`p-6 ${designConfig.cardBg} border ${designConfig.borderSubtle} rounded-3xl space-y-4 shadow-md`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`p-3 rounded-2xl ${designConfig.btnSecondary} text-zinc-900 shrink-0 border border-zinc-300/80 shadow-sm`}>
              <Smartphone className="w-6 h-6 text-[#c89b3c]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#c89b3c]/20 text-[#855f10] border border-[#c89b3c]/30 uppercase">
                  PWA Mobile App
                </span>
                {isInstalled && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-700" />
                    Installed
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-zinc-900">
                Install Oblivion Music (Android / Chrome)
              </h3>
              <p className="text-xs text-zinc-700 font-medium leading-relaxed max-w-xl mt-0.5">
                Install as a native standalone app on your Android device over Google Chrome for instant home-screen launching, seamless lock-screen controls, and offline listening.
              </p>
            </div>
          </div>

          <button
            id="install-app-android-btn"
            onClick={handleInstallClick}
            className={`px-5 py-3 rounded-2xl ${designConfig.btnPrimary} text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shrink-0`}
          >
            <Download className="w-4 h-4 text-white" />
            <span>Install App (Android)</span>
          </button>
        </div>

        {installSuccessMsg && (
          <div className="p-3.5 bg-[#ede8dc] border border-[#d8d2c4] rounded-2xl flex items-start gap-2.5 text-zinc-900 text-xs font-semibold animate-fade-in shadow-sm">
            <Info className="w-4 h-4 text-[#c89b3c] shrink-0 mt-0.5" />
            <span className="leading-relaxed">{installSuccessMsg}</span>
          </div>
        )}
      </section>

      {/* 6 FULL APP DESIGNS & THEMES SUITE */}
      <section className={`p-6 ${designConfig.cardBg} border ${designConfig.borderSubtle} rounded-3xl space-y-6 shadow-md`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#c89b3c]/20 text-[#855f10] text-[10px] font-mono font-bold tracking-wider mb-1 border border-[#c89b3c]/30">
              <Sparkles className="w-3 h-3 text-[#c89b3c]" />
              <span>Full-App Archetypes</span>
            </div>
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Layout className="w-4 h-4 text-[#c89b3c]" />
              <span>Full App Layout & Design Archetypes (6 Options)</span>
            </h3>
            <p className="text-xs text-zinc-700 font-medium mt-0.5">
              Select your preferred overall design. This transforms the entire application: background canvas, headers, navigation, cards, typography, and bottom player dock.
            </p>
          </div>
          <span className="text-xs px-3 py-1.5 rounded-full font-mono font-bold bg-[#c89b3c] text-slate-950 self-start sm:self-auto shadow-md">
            Active: {FULL_APP_DESIGNS[settings.fullAppDesign || "designer"]?.name || "Designer"}
          </span>
        </div>

        {/* 6 Full App Design Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(FULL_APP_DESIGNS).map((design) => {
            const isSelected = (settings.fullAppDesign || "designer") === design.id;

            return (
              <button
                key={design.id}
                onClick={() => {
                  onUpdateSettings({
                    fullAppDesign: design.id,
                    themePreset: design.themePreset,
                    miniPlayerLayout: design.playerLayout,
                  });
                }}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all duration-300 relative overflow-hidden group ${
                  isSelected
                    ? `bg-[#f4f1ea] border-[#c89b3c] ring-2 ring-[#c89b3c]/50 shadow-lg scale-[1.01]`
                    : `bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 shadow-sm`
                }`}
              >
                {/* Active Checkmark Badge */}
                {isSelected && (
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-[#c89b3c] text-slate-950 font-black text-[10px] flex items-center gap-1 shadow-md">
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>ACTIVE</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-200/90 text-zinc-900 font-bold border border-zinc-300">
                      {design.badge}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-600 font-semibold">{design.num} / 06</span>
                  </div>

                  <h4 className="text-sm font-bold text-zinc-900 mb-1">{design.name}</h4>
                  <p className="text-xs text-zinc-800 font-medium mb-2 leading-snug">{design.subtitle}</p>

                  <p className="text-[11px] text-zinc-600 line-clamp-2 leading-relaxed mb-3 font-normal">
                    {design.description}
                  </p>

                  {/* Highlights */}
                  <div className="space-y-1 text-[11px] text-zinc-700 mb-3 font-medium">
                    {design.features.slice(0, 2).map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${design.accentBg}`} />
                        <span className="truncate">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Swatches & Selection Status Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-200 mt-auto">
                  <div className="flex items-center gap-1.5">
                    {design.swatchColors.map((color, idx) => (
                      <span
                        key={idx}
                        className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-inner"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? "text-[#855f10] font-mono" : "text-zinc-600 group-hover:text-zinc-900"}`}>
                    {isSelected ? "● Live On App" : "Apply Design →"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Player Engine Controls */}
      <section className={`p-6 ${designConfig.cardBg} border ${designConfig.borderSubtle} rounded-3xl space-y-6 shadow-md`}>
        <div className="flex items-center gap-2 font-bold text-sm text-zinc-900">
          <Sliders className="w-4 h-4 text-[#c89b3c]" />
          <span>Player Audio Engine</span>
        </div>

        {/* Audio Quality */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-zinc-900 mb-2">
              Streaming Audio Quality
            </label>
            <select
              value={settings.audioQuality}
              onChange={(e) => onUpdateSettings({ audioQuality: e.target.value as AudioQuality })}
              className="w-full px-4 py-2.5 bg-white border border-zinc-300 rounded-xl text-sm font-semibold text-zinc-900 focus:outline-none focus:border-[#c89b3c] shadow-sm"
            >
              <option value="normal">Normal (160 kbps AAC)</option>
              <option value="high">High Quality (320 kbps MP3)</option>
              <option value="lossless">Lossless (24-bit / 96kHz FLAC)</option>
            </select>
          </div>

          {/* Crossfade Duration */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold uppercase text-zinc-900">
                Crossfade Tracks
              </label>
              <span className="text-xs font-mono font-bold text-[#855f10]">{settings.crossfadeDuration}s</span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              value={settings.crossfadeDuration}
              onChange={(e) => onUpdateSettings({ crossfadeDuration: Number(e.target.value) })}
              className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#c89b3c]"
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-zinc-200">
          <label className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-200 cursor-pointer shadow-sm">
            <div>
              <span className="text-xs font-bold text-zinc-900 block">Background Play</span>
              <span className="text-[10px] text-zinc-600 font-medium">Play in bg tab / screen locked</span>
            </div>
            <input
              type="checkbox"
              checked={settings.backgroundPlay ?? true}
              onChange={(e) => onUpdateSettings({ backgroundPlay: e.target.checked })}
              className="w-4 h-4 accent-[#c89b3c] cursor-pointer ml-2 shrink-0"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-200 cursor-pointer shadow-sm">
            <div>
              <span className="text-xs font-bold text-zinc-900 block">Volume Normalization</span>
              <span className="text-[10px] text-zinc-600 font-medium">Even volume loudness</span>
            </div>
            <input
              type="checkbox"
              checked={settings.normalizeVolume}
              onChange={(e) => onUpdateSettings({ normalizeVolume: e.target.checked })}
              className="w-4 h-4 accent-[#c89b3c] cursor-pointer ml-2 shrink-0"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-200 cursor-pointer shadow-sm">
            <div>
              <span className="text-xs font-bold text-zinc-900 block">Autoplay Similar Radio</span>
              <span className="text-[10px] text-zinc-600 font-medium">Continuous queue stream</span>
            </div>
            <input
              type="checkbox"
              checked={settings.autoPlaySimilar}
              onChange={(e) => onUpdateSettings({ autoPlaySimilar: e.target.checked })}
              className="w-4 h-4 accent-[#c89b3c] cursor-pointer ml-2 shrink-0"
            />
          </label>
        </div>
      </section>

      {/* Offline Storage Cache Controls */}
      <section className={`p-6 ${designConfig.cardBg} border ${designConfig.borderSubtle} rounded-3xl space-y-6 shadow-md`}>
        <div className="flex items-center gap-2 font-bold text-sm text-zinc-900">
          <HardDrive className="w-4 h-4 text-[#c89b3c]" />
          <span>IndexedDB Offline Caching</span>
        </div>

        <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-200 shadow-sm">
          <div>
            <p className="text-xs font-mono uppercase text-zinc-600 font-bold">Current Storage Used</p>
            <p className="text-xl font-bold font-mono text-zinc-900">{cacheMB} MB</p>
          </div>

          <button
            onClick={handleClearCache}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
            <span>{cleared ? "Cache Cleared!" : "Clear All Cache"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-200 cursor-pointer shadow-sm">
            <span className="text-xs font-bold text-zinc-900">Auto-Download Liked Songs</span>
            <input
              type="checkbox"
              checked={settings.autoDownloadFavorites}
              onChange={(e) => onUpdateSettings({ autoDownloadFavorites: e.target.checked })}
              className="w-4 h-4 accent-[#c89b3c] cursor-pointer"
            />
          </label>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold uppercase text-zinc-900">
                Max Cache Storage Limit
              </label>
              <span className="text-xs font-mono font-bold text-[#855f10]">{settings.maxCacheSizeMB} MB</span>
            </div>
            <input
              type="range"
              min={100}
              max={2000}
              step={100}
              value={settings.maxCacheSizeMB}
              onChange={(e) => onUpdateSettings({ maxCacheSizeMB: Number(e.target.value) })}
              className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#c89b3c]"
            />
          </div>
        </div>
      </section>
    </div>
  );
};
