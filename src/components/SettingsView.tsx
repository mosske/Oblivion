import React, { useEffect, useState } from "react";
import { User, UserSettings, AudioQuality, PlayerBackgroundAnimation } from "../types";
import { FULL_APP_DESIGNS, FullAppDesignConfig } from "../utils/appDesignThemes";
import {
  Settings,
  Sliders,
  Sparkles,
  Check,
  Smartphone,
  Layout,
  Info,
  Waves,
  Film,
  Activity,
  CircleOff,
  Eye,
  RotateCcw,
  Timer
} from "lucide-react";
import { OblivionLogo } from "./OblivionLogo";

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
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [installSuccessMsg, setInstallSuccessMsg] = useState<string>("");

  useEffect(() => {
    // Check if running in standalone PWA mode
    if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
    }
  }, []);

  const handleInstallClick = async () => {
    if (onInstallPwa) {
      onInstallPwa();
      return;
    }
    const promptEvent = deferredPrompt || (window as any).__deferredPrompt;
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choiceResult = await promptEvent.userChoice;
        if (choiceResult && choiceResult.outcome === "accepted") {
          setInstallSuccessMsg("🎉 Oblivion Music installed successfully!");
          setIsInstalled(true);
        }
      } catch (err) {
        console.error("Install prompt error:", err);
      }
      return;
    }

    if (isInstalled) {
      setInstallSuccessMsg("Oblivion Music is already installed on this device!");
    } else {
      const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        setInstallSuccessMsg("To install on Apple Safari: Tap the Share button (⎋), then select 'Add to Home Screen'.");
      } else {
        setInstallSuccessMsg("To install on Chrome: Tap the top-right menu (⋮), then tap 'Install app' or 'Add to Home screen'.");
      }
    }
    setTimeout(() => setInstallSuccessMsg(""), 7000);
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
          Customize your full app design layout, audio engine quality, and playback settings.
        </p>
      </div>

      {/* PWA ANDROID APP INSTALLATION SECTION */}
      <section className={`p-6 ${designConfig.cardBg} border ${designConfig.borderSubtle} rounded-3xl space-y-4 shadow-md`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <OblivionLogo size={46} withAura className="shrink-0" />
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
                Install Oblivion Music App
              </h3>
              <p className="text-xs text-zinc-700 font-medium leading-relaxed max-w-xl mt-0.5">
                Install as a standalone progressive web app (PWA) on your Android, Apple Safari, or desktop browser for instant home-screen launching and background playback.
              </p>
            </div>
          </div>

          <button
            id="install-app-android-btn"
            onClick={handleInstallClick}
            className={`px-5 py-3 rounded-2xl ${designConfig.btnPrimary} text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shrink-0`}
          >
            <Smartphone className="w-4 h-4 text-white" />
            <span>Install App</span>
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

      {/* FULL PLAYER ANIMATED BACKGROUND VISUALIZER SECTION */}
      <section className={`p-6 ${designConfig.cardBg} border ${designConfig.borderSubtle} rounded-3xl space-y-5 shadow-md`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#c89b3c]/20 text-[#855f10] text-[10px] font-mono font-bold tracking-wider mb-1 border border-[#c89b3c]/30">
              <Eye className="w-3 h-3 text-[#c89b3c]" />
              <span>Immersive Player Canvas</span>
            </div>
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Film className="w-4 h-4 text-[#c89b3c]" />
              <span>Full Player Background Animation & Speed</span>
            </h3>
            <p className="text-xs text-zinc-700 font-medium mt-0.5">
              Select an ambient background animation style and adjust its cycle timing duration directly within each option.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <button
              id="reset-animation-timings-btn"
              onClick={() =>
                onUpdateSettings({
                  animationDriftSpeed: 12,
                  animationAuroraSpeed: 8,
                  animationOrbitalSpeed: 12,
                })
              }
              className="px-3 py-1.5 rounded-xl bg-white border border-[#d8d2c4] hover:border-[#c89b3c] hover:bg-[#f4f1ea] text-zinc-800 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0"
              title="Reset all animation durations to default (12s, 8s, 12s)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#c89b3c]" />
              <span>Reset Defaults (12s, 8s, 12s)</span>
            </button>
            <span className="text-xs px-3 py-1.5 rounded-full font-mono font-bold bg-[#c89b3c] text-slate-950 shadow-md">
              Active: {
                settings.playerBackgroundAnimation === "off"
                  ? "Off (Static)"
                  : settings.playerBackgroundAnimation === "aurora-pulse"
                  ? "Aurora Pulse"
                  : settings.playerBackgroundAnimation === "orbital-flow"
                  ? "Orbital Flow"
                  : "Ambient Zoom & Drift"
              }
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* 1. Ambient Zoom & Drift */}
          <div
            onClick={() => onUpdateSettings({ playerBackgroundAnimation: "ambient-drift" })}
            className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all duration-300 relative overflow-hidden group cursor-pointer ${
              (settings.playerBackgroundAnimation || "ambient-drift") === "ambient-drift"
                ? "bg-[#f4f1ea] border-[#c89b3c] ring-2 ring-[#c89b3c]/50 shadow-md"
                : "bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
            }`}
          >
            {(settings.playerBackgroundAnimation || "ambient-drift") === "ambient-drift" && (
              <div className="absolute top-3 right-3 px-1.5 py-0.5 rounded-full bg-[#c89b3c] text-slate-950 font-black text-[9px] flex items-center gap-1 shadow">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
                <span>ACTIVE</span>
              </div>
            )}
            <div>
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-2.5 text-amber-700">
                <Waves className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-zinc-900 mb-1">1. Ambient Zoom & Drift</h4>
              <p className="text-[11px] text-zinc-600 leading-relaxed font-medium mb-3">
                Cinematic Ken Burns panning & slow breathing zoom that gently floats across the screen.
              </p>
            </div>

            {/* Embedded Timing Control */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-900">
                  <Timer className="w-3.5 h-3.5 text-amber-700" />
                  <span>Cycle Duration</span>
                </div>
                <span className="text-[11px] font-mono font-extrabold px-2 py-0.5 rounded bg-white text-amber-800 border border-amber-300 shadow-sm">
                  {settings.animationDriftSpeed ?? 12}s
                </span>
              </div>
              <input
                id="ambient-drift-speed-slider"
                type="range"
                min="4"
                max="40"
                step="1"
                value={settings.animationDriftSpeed ?? 12}
                onChange={(e) => {
                  onUpdateSettings({
                    animationDriftSpeed: Number(e.target.value),
                    playerBackgroundAnimation: "ambient-drift",
                  });
                }}
                className="w-full h-1.5 bg-amber-200/80 rounded-lg appearance-none cursor-pointer accent-[#c89b3c]"
              />
              <div className="flex justify-between text-[9px] text-amber-800/80 font-mono font-medium">
                <span>Fast (4s)</span>
                <span className="font-bold text-amber-900">Default: 12s</span>
                <span>Slow (40s)</span>
              </div>
            </div>
          </div>

          {/* 2. Aurora Pulse */}
          <div
            onClick={() => onUpdateSettings({ playerBackgroundAnimation: "aurora-pulse" })}
            className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all duration-300 relative overflow-hidden group cursor-pointer ${
              settings.playerBackgroundAnimation === "aurora-pulse"
                ? "bg-[#f4f1ea] border-[#c89b3c] ring-2 ring-[#c89b3c]/50 shadow-md"
                : "bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
            }`}
          >
            {settings.playerBackgroundAnimation === "aurora-pulse" && (
              <div className="absolute top-3 right-3 px-1.5 py-0.5 rounded-full bg-[#c89b3c] text-slate-950 font-black text-[9px] flex items-center gap-1 shadow">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
                <span>ACTIVE</span>
              </div>
            )}
            <div>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-2.5 text-emerald-700">
                <Activity className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-zinc-900 mb-1">2. Aurora Pulse</h4>
              <p className="text-[11px] text-zinc-600 leading-relaxed font-medium mb-3">
                Fluid chromatic aurora rhythm that breathes and pulsates color saturation with the audio.
              </p>
            </div>

            {/* Embedded Timing Control */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-900">
                  <Timer className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Cycle Duration</span>
                </div>
                <span className="text-[11px] font-mono font-extrabold px-2 py-0.5 rounded bg-white text-emerald-800 border border-emerald-300 shadow-sm">
                  {settings.animationAuroraSpeed ?? 8}s
                </span>
              </div>
              <input
                id="aurora-pulse-speed-slider"
                type="range"
                min="3"
                max="30"
                step="1"
                value={settings.animationAuroraSpeed ?? 8}
                onChange={(e) => {
                  onUpdateSettings({
                    animationAuroraSpeed: Number(e.target.value),
                    playerBackgroundAnimation: "aurora-pulse",
                  });
                }}
                className="w-full h-1.5 bg-emerald-200/80 rounded-lg appearance-none cursor-pointer accent-[#c89b3c]"
              />
              <div className="flex justify-between text-[9px] text-emerald-800/80 font-mono font-medium">
                <span>Fast (3s)</span>
                <span className="font-bold text-emerald-900">Default: 8s</span>
                <span>Slow (30s)</span>
              </div>
            </div>
          </div>

          {/* 3. Orbital Flow */}
          <div
            onClick={() => onUpdateSettings({ playerBackgroundAnimation: "orbital-flow" })}
            className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all duration-300 relative overflow-hidden group cursor-pointer ${
              settings.playerBackgroundAnimation === "orbital-flow"
                ? "bg-[#f4f1ea] border-[#c89b3c] ring-2 ring-[#c89b3c]/50 shadow-md"
                : "bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
            }`}
          >
            {settings.playerBackgroundAnimation === "orbital-flow" && (
              <div className="absolute top-3 right-3 px-1.5 py-0.5 rounded-full bg-[#c89b3c] text-slate-950 font-black text-[9px] flex items-center gap-1 shadow">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
                <span>ACTIVE</span>
              </div>
            )}
            <div>
              <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center mb-2.5 text-violet-700">
                <Sparkles className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-zinc-900 mb-1">3. Orbital Flow</h4>
              <p className="text-[11px] text-zinc-600 leading-relaxed font-medium mb-3">
                Cosmic 360° swirl rotating dual blurred artwork aura rings across the background.
              </p>
            </div>

            {/* Embedded Timing Control */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-2 p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[11px] font-bold text-violet-900">
                  <Timer className="w-3.5 h-3.5 text-violet-700" />
                  <span>Cycle Duration</span>
                </div>
                <span className="text-[11px] font-mono font-extrabold px-2 py-0.5 rounded bg-white text-violet-800 border border-violet-300 shadow-sm">
                  {settings.animationOrbitalSpeed ?? 12}s
                </span>
              </div>
              <input
                id="orbital-flow-speed-slider"
                type="range"
                min="4"
                max="40"
                step="1"
                value={settings.animationOrbitalSpeed ?? 12}
                onChange={(e) => {
                  onUpdateSettings({
                    animationOrbitalSpeed: Number(e.target.value),
                    playerBackgroundAnimation: "orbital-flow",
                  });
                }}
                className="w-full h-1.5 bg-violet-200/80 rounded-lg appearance-none cursor-pointer accent-[#c89b3c]"
              />
              <div className="flex justify-between text-[9px] text-violet-800/80 font-mono font-medium">
                <span>Fast (4s)</span>
                <span className="font-bold text-violet-900">Default: 12s</span>
                <span>Slow (40s)</span>
              </div>
            </div>
          </div>

          {/* 4. Off (Static) */}
          <div
            onClick={() => onUpdateSettings({ playerBackgroundAnimation: "off" })}
            className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all duration-300 relative overflow-hidden group cursor-pointer ${
              settings.playerBackgroundAnimation === "off"
                ? "bg-[#f4f1ea] border-[#c89b3c] ring-2 ring-[#c89b3c]/50 shadow-md"
                : "bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
            }`}
          >
            {settings.playerBackgroundAnimation === "off" && (
              <div className="absolute top-3 right-3 px-1.5 py-0.5 rounded-full bg-[#c89b3c] text-slate-950 font-black text-[9px] flex items-center gap-1 shadow">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
                <span>ACTIVE</span>
              </div>
            )}
            <div>
              <div className="w-8 h-8 rounded-xl bg-zinc-500/15 border border-zinc-500/30 flex items-center justify-center mb-2.5 text-zinc-700">
                <CircleOff className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-zinc-900 mb-1">4. Off (Static Minimal)</h4>
              <p className="text-[11px] text-zinc-600 leading-relaxed font-medium mb-3">
                Classic static dimmed studio background with zero animation for minimal CPU & battery usage.
              </p>
            </div>

            {/* Embedded Info Box */}
            <div className="mt-2 p-3 bg-zinc-100 border border-zinc-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-zinc-800">
                <span>Static Visuals</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-200 text-zinc-700 font-bold">
                  Zero Motion
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 leading-tight">
                No active animation loops running. Maximizes performance & power saving.
              </p>
            </div>
          </div>
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
    </div>
  );
};
