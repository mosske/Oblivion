import React, { useEffect, useState } from "react";
import { User, UserSettings, PlayerBackgroundAnimation } from "../types";
import { FULL_APP_DESIGNS, FULL_APP_DESIGNS_LIST, FullAppDesignConfig } from "../utils/appDesignThemes";
import {
  Settings,
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
  Timer,
  Mic2,
  AlignLeft,
  AlignCenter
} from "lucide-react";
import { OblivionLogo } from "./OblivionLogo";
import { BespokeThemeCard } from "./BespokeThemeCard";

interface SettingsViewProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  user: User | null;
  onLoginSuccess: (user: User) => void;
  onLogout: () => void;
  designConfig?: FullAppDesignConfig;
  deferredPrompt?: any;
  onInstallPwa?: () => void;
  onOpenResetModal?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  designConfig = FULL_APP_DESIGNS["designer"],
  deferredPrompt,
  onInstallPwa,
  onOpenResetModal,
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

  const isHardRock = Boolean(
    designConfig.id === "sugar-time-jazz" ||
    (designConfig.id as string) === "hard-rock" ||
    designConfig.name === "Hard Rock" ||
    designConfig.name === "Sugar Time Jazz"
  );

  return (
    <div id="settings-page" data-testid="settings-page" className="settings-page settings-container flex-1 p-4 sm:p-6 md:p-8 space-y-8 pb-64 sm:pb-72 md:pb-52 max-w-5xl select-none">
      {/* Header */}
      <header className="settings-header settings-title-container">
        <h1 className={`text-2xl sm:text-3xl font-extrabold ${designConfig.headingPrimary} tracking-tight flex items-center gap-2.5`}>
          <Settings className={`w-6 h-6 ${designConfig.accentText}`} />
          <span>Oblivion Settings</span>
        </h1>
        <p className={`text-xs ${designConfig.headingMuted} mt-1 font-medium`}>
          Customize your full app design layout, audio engine quality, and playback settings.
        </p>
      </header>

      {/* PWA ANDROID APP INSTALLATION SECTION */}
      <section className={`pwa-card install-card section-box p-6 ${designConfig.cardBg} border ${designConfig.borderSubtle} rounded-3xl space-y-4 shadow-md`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <OblivionLogo size={46} designId={designConfig.id} withAura className="shrink-0" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border uppercase"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--accent-primary) 15%, transparent)",
                    borderColor: "color-mix(in srgb, var(--accent-primary) 30%, transparent)",
                    color: "var(--accent-primary)",
                  }}
                >
                  PWA Mobile App
                </span>
                {isInstalled && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                    Installed
                  </span>
                )}
              </div>
              <h3 className={`text-base font-bold ${designConfig.textPrimary}`}>
                Install Oblivion Music App
              </h3>
              <p className={`text-xs ${designConfig.textSecondary} font-medium leading-relaxed max-w-xl mt-0.5`}>
                Install as a standalone progressive web app (PWA) on your Android, Apple Safari, or desktop browser for instant home-screen launching and background playback.
              </p>
            </div>
          </div>

          <button
            id="install-app-android-btn"
            onClick={handleInstallClick}
            className={`px-5 py-3 rounded-2xl ${isHardRock ? "" : designConfig.btnPrimary} font-bold text-xs shadow-lg flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shrink-0`}
            style={
              isHardRock
                ? {
                    background: "linear-gradient(135deg, #F3E0C8 0%, #C084FC 100%)",
                    color: "#1D0E0A",
                    border: "none",
                    boxShadow: "0 2px 10px rgba(192, 132, 252, 0.35)",
                  }
                : undefined
            }
          >
            <Smartphone
              className="w-4 h-4"
              style={isHardRock ? { color: "#1D0E0A", stroke: "#1D0E0A" } : undefined}
            />
            <span style={isHardRock ? { color: "#1D0E0A", fontWeight: 700 } : undefined}>Install App</span>
          </button>
        </div>

        {installSuccessMsg && (
          <div className={`p-3.5 ${designConfig.isLight ? "bg-[#ede8dc] border-[#d8d2c4] text-zinc-900" : "bg-white/10 border-white/20 text-white"} border rounded-2xl flex items-start gap-2.5 text-xs font-semibold animate-fade-in shadow-sm`}>
            <Info className={`w-4 h-4 ${designConfig.accentText} shrink-0 mt-0.5`} />
            <span className="leading-relaxed">{installSuccessMsg}</span>
          </div>
        )}
      </section>

      {/* 9 FULL APP DESIGNS & THEMES SUITE */}
      <section className={`archetypes-wrapper archetype-container section-box p-6 ${designConfig.cardBg} border ${designConfig.borderSubtle} rounded-3xl space-y-6 shadow-md`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-bold tracking-wider mb-1"
              style={{
                backgroundColor: "color-mix(in srgb, var(--accent-primary) 15%, transparent)",
                borderColor: "color-mix(in srgb, var(--accent-primary) 30%, transparent)",
                color: "var(--accent-primary)",
              }}
            >
              <Sparkles className="w-3 h-3" style={{ color: "var(--accent-primary)" }} />
              <span>Full-App Archetypes</span>
            </div>
            <h3 className={`text-base font-bold ${designConfig.textPrimary} flex items-center gap-2`}>
              <Layout className={`w-4 h-4 ${designConfig.accentText}`} />
              <span>Full App Layout & Design Archetypes ({FULL_APP_DESIGNS_LIST.length} Options)</span>
            </h3>
            <p className={`text-xs ${designConfig.textSecondary} font-medium mt-0.5`}>
              Select your preferred overall design. This transforms the entire application: background canvas, headers, navigation, cards, typography, and bottom player dock.
            </p>
          </div>
          <span className={`text-xs px-3 py-1.5 rounded-full font-mono font-bold ${designConfig.accentBg} ${designConfig.accentContrastText} self-start sm:self-auto shadow-md`}>
            Active: {FULL_APP_DESIGNS[settings.fullAppDesign || "designer"]?.name || "Designer"}
          </span>
        </div>

        {/* 11 Full App Design Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FULL_APP_DESIGNS_LIST.map((design) => {
            const isSelected = (settings.fullAppDesign || "designer") === design.id;
            const isBespoke = design.isBespoke || design.id === "bespoke";

            if (isBespoke) {
              return (
                <BespokeThemeCard
                  key={design.id}
                  isSelected={isSelected}
                  designConfig={design}
                  className="col-span-1 md:col-span-2 lg:col-span-3"
                  onSelect={() => {
                    onUpdateSettings({
                      fullAppDesign: "bespoke",
                      themePreset: "bespoke",
                      miniPlayerLayout: "floating-dock",
                    });
                  }}
                  onColorsChange={() => {
                    if (!isSelected) {
                      onUpdateSettings({
                        fullAppDesign: "bespoke",
                        themePreset: "bespoke",
                        miniPlayerLayout: "floating-dock",
                      });
                    }
                  }}
                />
              );
            }

            return (
              <div
                key={design.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  onUpdateSettings({
                    fullAppDesign: design.id,
                    themePreset: design.themePreset,
                    miniPlayerLayout: design.playerLayout,
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onUpdateSettings({
                      fullAppDesign: design.id,
                      themePreset: design.themePreset,
                      miniPlayerLayout: design.playerLayout,
                    });
                  }
                }}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all duration-300 relative overflow-hidden group cursor-pointer ${
                  isSelected
                    ? `bg-white/95 shadow-lg scale-[1.01]`
                    : `bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 shadow-sm`
                }`}
                style={
                  isSelected
                    ? {
                        border: "2px solid var(--accent-primary)",
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 0 0 1px var(--accent-primary)",
                      }
                    : undefined
                }
              >
                {/* Active Checkmark Badge */}
                {isSelected && (
                  <div
                    className="absolute top-3 right-3 px-2 py-0.5 rounded-full font-black text-[10px] flex items-center gap-1 shadow-md z-10"
                    style={{
                      background: "linear-gradient(135deg, var(--accent-secondary, var(--accent-primary)), var(--accent-primary))",
                      color: "var(--accent-contrast-text)",
                    }}
                  >
                    <Check className="w-3 h-3 stroke-[3]" style={{ color: "var(--accent-contrast-text)" }} />
                    <span>ACTIVE</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-200/90 text-zinc-900 font-bold border border-zinc-300">
                      {design.badge}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-600 font-semibold">{design.num} / {String(FULL_APP_DESIGNS_LIST.length).padStart(2, "0")}</span>
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
                <div className="flex items-center justify-between pt-3 border-t border-zinc-200 mt-auto gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    {design.swatchColors.map((color, idx) => (
                      <span
                        key={idx}
                        className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-inner"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? "font-mono font-black" : "text-zinc-600 group-hover:text-zinc-900"}`}
                    style={isSelected ? { color: "var(--accent-primary)" } : undefined}
                  >
                    {isSelected ? "● Live On App" : "Apply Design →"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FULL PLAYER ANIMATED BACKGROUND VISUALIZER SECTION */}
      <section className={`p-6 ${designConfig.cardBg} border ${designConfig.borderSubtle} rounded-3xl space-y-5 shadow-md`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-bold tracking-wider mb-1"
              style={{
                backgroundColor: "color-mix(in srgb, var(--accent-primary) 15%, transparent)",
                borderColor: "color-mix(in srgb, var(--accent-primary) 30%, transparent)",
                color: "var(--accent-primary)",
              }}
            >
              <Eye className="w-3 h-3" style={{ color: "var(--accent-primary)" }} />
              <span>Immersive Player Canvas</span>
            </div>
            <h3 className={`text-base font-bold ${designConfig.textPrimary} flex items-center gap-2`}>
              <Film className={`w-4 h-4 ${designConfig.accentText}`} />
              <span>Full Player Background Animation & Speed</span>
            </h3>
            <p className={`text-xs ${designConfig.textSecondary} font-medium mt-0.5`}>
              Select an ambient background animation style and adjust its cycle timing duration directly within each option.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <button
              id="reset-animation-timings-btn"
              onClick={() =>
                onUpdateSettings({
                  animationDriftSpeed: 6,
                  animationAuroraSpeed: 6,
                  animationOrbitalSpeed: 6,
                })
              }
              className={`px-3 py-1.5 rounded-xl ${designConfig.isLight ? "bg-white border-[#d8d2c4] hover:border-zinc-400 hover:bg-[#f4f1ea] text-zinc-800" : "bg-white/10 border-white/20 hover:border-white/40 hover:bg-white/15 text-white"} text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0`}
              title="Reset all animation durations to default (6s)"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${designConfig.accentText}`} />
              <span>Reset Defaults (6s)</span>
            </button>
            <span className={`text-xs px-3 py-1.5 rounded-full font-mono font-bold ${designConfig.accentBg} ${designConfig.accentContrastText} shadow-md`}>
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
                ? "bg-white/95 shadow-md"
                : "bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
            }`}
            style={
              (settings.playerBackgroundAnimation || "ambient-drift") === "ambient-drift"
                ? {
                    border: "2px solid var(--accent-primary)",
                    boxShadow: "0 6px 18px -3px rgba(0,0,0,0.1), 0 0 0 1px var(--accent-primary)",
                  }
                : undefined
            }
          >
            {(settings.playerBackgroundAnimation || "ambient-drift") === "ambient-drift" && (
              <div
                className="absolute top-3 right-3 px-1.5 py-0.5 rounded-full font-black text-[9px] flex items-center gap-1 shadow"
                style={{
                  backgroundColor: "var(--accent-primary)",
                  color: "var(--accent-contrast-text)",
                }}
              >
                <Check className="w-2.5 h-2.5 stroke-[3]" style={{ color: "var(--accent-contrast-text)" }} />
                <span>ACTIVE</span>
              </div>
            )}
            <div>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center mb-2.5"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--accent-primary) 15%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--accent-primary) 30%, transparent)",
                  color: "var(--accent-primary)",
                }}
              >
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
              className="mt-2 p-3 bg-zinc-100/90 border border-zinc-200 rounded-xl space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-800">
                  <Timer className="w-3.5 h-3.5" style={{ color: "var(--accent-primary)" }} />
                  <span>Cycle Duration</span>
                </div>
                <span
                  className="text-[11px] font-mono font-extrabold px-2 py-0.5 rounded bg-white border shadow-xs"
                  style={{ color: "var(--accent-primary)", borderColor: "var(--border-subtle)" }}
                >
                  {settings.animationDriftSpeed ?? 6}s
                </span>
              </div>
              <input
                id="ambient-drift-speed-slider"
                type="range"
                min="3"
                max="20"
                step="1"
                value={settings.animationDriftSpeed ?? 6}
                onChange={(e) => {
                  onUpdateSettings({
                    animationDriftSpeed: Number(e.target.value),
                    playerBackgroundAnimation: "ambient-drift",
                  });
                }}
                style={{ accentColor: "var(--accent-primary)" }}
                className="w-full h-1.5 bg-zinc-300 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-0"
              />
              <div className="flex justify-between text-[9px] text-zinc-600 font-mono font-medium">
                <span>Fast (3s)</span>
                <span className="font-bold text-zinc-800">Default: 6s</span>
                <span>Slow (20s)</span>
              </div>
            </div>
          </div>

          {/* 2. Aurora Pulse */}
          <div
            onClick={() => onUpdateSettings({ playerBackgroundAnimation: "aurora-pulse" })}
            className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all duration-300 relative overflow-hidden group cursor-pointer ${
              settings.playerBackgroundAnimation === "aurora-pulse"
                ? "bg-white/95 shadow-md"
                : "bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
            }`}
            style={
              settings.playerBackgroundAnimation === "aurora-pulse"
                ? {
                    border: "2px solid var(--accent-primary)",
                    boxShadow: "0 6px 18px -3px rgba(0,0,0,0.1), 0 0 0 1px var(--accent-primary)",
                  }
                : undefined
            }
          >
            {settings.playerBackgroundAnimation === "aurora-pulse" && (
              <div
                className="absolute top-3 right-3 px-1.5 py-0.5 rounded-full font-black text-[9px] flex items-center gap-1 shadow"
                style={{
                  backgroundColor: "var(--accent-primary)",
                  color: "var(--accent-contrast-text)",
                }}
              >
                <Check className="w-2.5 h-2.5 stroke-[3]" style={{ color: "var(--accent-contrast-text)" }} />
                <span>ACTIVE</span>
              </div>
            )}
            <div>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center mb-2.5"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--accent-primary) 15%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--accent-primary) 30%, transparent)",
                  color: "var(--accent-primary)",
                }}
              >
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
              className="mt-2 p-3 bg-zinc-100/90 border border-zinc-200 rounded-xl space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-800">
                  <Timer className="w-3.5 h-3.5" style={{ color: "var(--accent-primary)" }} />
                  <span>Cycle Duration</span>
                </div>
                <span
                  className="text-[11px] font-mono font-extrabold px-2 py-0.5 rounded bg-white border shadow-xs"
                  style={{ color: "var(--accent-primary)", borderColor: "var(--border-subtle)" }}
                >
                  {settings.animationAuroraSpeed ?? 6}s
                </span>
              </div>
              <input
                id="aurora-pulse-speed-slider"
                type="range"
                min="3"
                max="20"
                step="1"
                value={settings.animationAuroraSpeed ?? 6}
                onChange={(e) => {
                  onUpdateSettings({
                    animationAuroraSpeed: Number(e.target.value),
                    playerBackgroundAnimation: "aurora-pulse",
                  });
                }}
                style={{ accentColor: "var(--accent-primary)" }}
                className="w-full h-1.5 bg-zinc-300 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-0"
              />
              <div className="flex justify-between text-[9px] text-zinc-600 font-mono font-medium">
                <span>Fast (3s)</span>
                <span className="font-bold text-zinc-800">Default: 6s</span>
                <span>Slow (20s)</span>
              </div>
            </div>
          </div>

          {/* 3. Orbital Flow */}
          <div
            onClick={() => onUpdateSettings({ playerBackgroundAnimation: "orbital-flow" })}
            className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all duration-300 relative overflow-hidden group cursor-pointer ${
              settings.playerBackgroundAnimation === "orbital-flow"
                ? "bg-white/95 shadow-md"
                : "bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
            }`}
            style={
              settings.playerBackgroundAnimation === "orbital-flow"
                ? {
                    border: "2px solid var(--accent-primary)",
                    boxShadow: "0 6px 18px -3px rgba(0,0,0,0.1), 0 0 0 1px var(--accent-primary)",
                  }
                : undefined
            }
          >
            {settings.playerBackgroundAnimation === "orbital-flow" && (
              <div
                className="absolute top-3 right-3 px-1.5 py-0.5 rounded-full font-black text-[9px] flex items-center gap-1 shadow"
                style={{
                  backgroundColor: "var(--accent-primary)",
                  color: "var(--accent-contrast-text)",
                }}
              >
                <Check className="w-2.5 h-2.5 stroke-[3]" style={{ color: "var(--accent-contrast-text)" }} />
                <span>ACTIVE</span>
              </div>
            )}
            <div>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center mb-2.5"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--accent-primary) 15%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--accent-primary) 30%, transparent)",
                  color: "var(--accent-primary)",
                }}
              >
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
              className="mt-2 p-3 bg-zinc-100/90 border border-zinc-200 rounded-xl space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-800">
                  <Timer className="w-3.5 h-3.5" style={{ color: "var(--accent-primary)" }} />
                  <span>Cycle Duration</span>
                </div>
                <span
                  className="text-[11px] font-mono font-extrabold px-2 py-0.5 rounded bg-white border shadow-xs"
                  style={{ color: "var(--accent-primary)", borderColor: "var(--border-subtle)" }}
                >
                  {settings.animationOrbitalSpeed ?? 6}s
                </span>
              </div>
              <input
                id="orbital-flow-speed-slider"
                type="range"
                min="3"
                max="20"
                step="1"
                value={settings.animationOrbitalSpeed ?? 6}
                onChange={(e) => {
                  onUpdateSettings({
                    animationOrbitalSpeed: Number(e.target.value),
                    playerBackgroundAnimation: "orbital-flow",
                  });
                }}
                style={{ accentColor: "var(--accent-primary)" }}
                className="w-full h-1.5 bg-zinc-300 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-0"
              />
              <div className="flex justify-between text-[9px] text-zinc-600 font-mono font-medium">
                <span>Fast (3s)</span>
                <span className="font-bold text-zinc-800">Default: 6s</span>
                <span>Slow (20s)</span>
              </div>
            </div>
          </div>

          {/* 4. Off (Static) */}
          <div
            onClick={() => onUpdateSettings({ playerBackgroundAnimation: "off" })}
            className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all duration-300 relative overflow-hidden group cursor-pointer ${
              settings.playerBackgroundAnimation === "off"
                ? "bg-white/95 shadow-md"
                : "bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
            }`}
            style={
              settings.playerBackgroundAnimation === "off"
                ? {
                    border: "2px solid var(--accent-primary)",
                    boxShadow: "0 6px 18px -3px rgba(0,0,0,0.1), 0 0 0 1px var(--accent-primary)",
                  }
                : undefined
            }
          >
            {settings.playerBackgroundAnimation === "off" && (
              <div
                className="absolute top-3 right-3 px-1.5 py-0.5 rounded-full font-black text-[9px] flex items-center gap-1 shadow"
                style={{
                  backgroundColor: "var(--accent-primary)",
                  color: "var(--accent-contrast-text)",
                }}
              >
                <Check className="w-2.5 h-2.5 stroke-[3]" style={{ color: "var(--accent-contrast-text)" }} />
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

      {/* SYNCHRONIZED REAL-TIME LYRICS & ROMANIZATION PREFERENCES */}
      <section className={`p-6 ${designConfig.cardBg} border ${designConfig.borderSubtle} rounded-3xl space-y-5 shadow-md`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-bold tracking-wider mb-1"
              style={{
                backgroundColor: "color-mix(in srgb, var(--accent-primary) 15%, transparent)",
                borderColor: "color-mix(in srgb, var(--accent-primary) 30%, transparent)",
                color: "var(--accent-primary)",
              }}
            >
              <Mic2 className="w-3 h-3" style={{ color: "var(--accent-primary)" }} />
              <span>LRCLIB & Instant Romanization</span>
            </div>
            <h3 className={`text-base font-bold ${designConfig.textPrimary} flex items-center gap-2`}>
              <Mic2 className={`w-4 h-4 ${designConfig.accentText}`} />
              <span>Synchronized Lyrics & Romanization</span>
            </h3>
            <p className={`text-xs ${designConfig.textMuted}`}>
              Configure font sizing and text alignment for synchronized lyrics and client-side phonetic romanization.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Lyrics Font Size */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 space-y-3">
            <label className={`block text-xs font-bold uppercase ${designConfig.textPrimary}`}>
              Lyrics Font Size
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["sm", "md", "lg"] as const).map((size) => {
                const isSelected = (settings.lyricsFontSize || "md") === size;
                const label = size === "sm" ? "Compact" : size === "lg" ? "Expanded" : "Standard";
                return (
                  <button
                    key={size}
                    type="button"
                    data-settings-control="lyrics-font-size"
                    data-selected={isSelected ? "true" : "false"}
                    onClick={() => onUpdateSettings({ lyricsFontSize: size })}
                    style={isSelected ? { color: "#0f0d13", opacity: 1, fontWeight: 700 } : undefined}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${isSelected ? "active-lyrics-size-btn " : ""}${
                      isSelected
                        ? `${designConfig.btnPrimary} shadow-sm border-transparent`
                        : `${designConfig.pillBg} ${designConfig.textSecondary} hover:${designConfig.textPrimary}`
                    }`}
                  >
                    <span style={isSelected ? { color: "#0f0d13", opacity: 1, fontWeight: 700 } : undefined}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lyrics Alignment */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 space-y-3">
            <label className={`block text-xs font-bold uppercase ${designConfig.textPrimary}`}>
              Text Alignment
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-settings-control="lyrics-alignment"
                data-selected={(settings.lyricsAlignment || "left") === "left" ? "true" : "false"}
                onClick={() => onUpdateSettings({ lyricsAlignment: "left" })}
                style={(settings.lyricsAlignment || "left") === "left" ? { color: "#0f0d13", opacity: 1, fontWeight: 700 } : undefined}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${(settings.lyricsAlignment || "left") === "left" ? "active-lyrics-alignment-btn " : ""}${
                  (settings.lyricsAlignment || "left") === "left"
                    ? `${designConfig.btnPrimary} shadow-sm border-transparent`
                    : `${designConfig.pillBg} ${designConfig.textSecondary} hover:${designConfig.textPrimary}`
                }`}
              >
                <AlignLeft className="w-3.5 h-3.5" style={(settings.lyricsAlignment || "left") === "left" ? { color: "#0f0d13", fill: "#0f0d13", stroke: "#0f0d13", opacity: 1 } : undefined} />
                <span style={(settings.lyricsAlignment || "left") === "left" ? { color: "#0f0d13", opacity: 1, fontWeight: 700 } : undefined}>Left Aligned</span>
              </button>
              <button
                type="button"
                data-settings-control="lyrics-alignment"
                data-selected={settings.lyricsAlignment === "center" ? "true" : "false"}
                onClick={() => onUpdateSettings({ lyricsAlignment: "center" })}
                style={settings.lyricsAlignment === "center" ? { color: "#0f0d13", opacity: 1, fontWeight: 700 } : undefined}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${settings.lyricsAlignment === "center" ? "active-lyrics-alignment-btn " : ""}${
                  settings.lyricsAlignment === "center"
                    ? `${designConfig.btnPrimary} shadow-sm border-transparent`
                    : `${designConfig.pillBg} ${designConfig.textSecondary} hover:${designConfig.textPrimary}`
                }`}
              >
                <AlignCenter className="w-3.5 h-3.5" style={settings.lyricsAlignment === "center" ? { color: "#0f0d13", fill: "#0f0d13", stroke: "#0f0d13", opacity: 1 } : undefined} />
                <span style={settings.lyricsAlignment === "center" ? { color: "#0f0d13", opacity: 1, fontWeight: 700 } : undefined}>Centered</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Shadowflash Design Badge */}
      <div className="flex flex-col items-center justify-center pt-3 pb-2 space-y-1 select-none">
        <div
          id="shadowflash-design-badge"
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border shadow-sm"
          style={{
            backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
            borderColor: "color-mix(in srgb, var(--accent-primary) 30%, transparent)",
            color: "var(--card-text)",
          }}
        >
          <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--accent-primary)" }} />
          <span className="text-xs font-mono font-bold tracking-wider uppercase">
            Shadowflash Design
          </span>
        </div>
      </div>
    </div>
  );
};
