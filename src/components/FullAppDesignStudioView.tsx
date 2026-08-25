import React, { useState } from "react";
import { FullAppDesignId, FULL_APP_DESIGNS } from "../utils/appDesignThemes";
import { PlayerState, Track, MiniPlayerLayout } from "../types";
import {
  Layout,
  Check,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Heart,
  Sliders,
  Sparkles,
  Layers,
  Radio,
  Disc3,
  Flame,
  Volume2,
  Maximize2,
  Tv,
  Smartphone,
  Monitor,
  Zap,
  Info,
  Compass,
  Music,
  CheckCircle2
} from "lucide-react";
import { cleanTrackTitle } from "../utils/formatters";
import { OblivionLogo } from "./OblivionLogo";

interface FullAppDesignStudioViewProps {
  activeDesignId: FullAppDesignId;
  onSelectDesign: (designId: FullAppDesignId) => void;
  playerState: PlayerState;
  onTogglePlay: () => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onSeek: (time: number) => void;
  onToggleLike: (trackId: string) => void;
  onOpenFullscreen: () => void;
}

export const FullAppDesignStudioView: React.FC<FullAppDesignStudioViewProps> = ({
  activeDesignId,
  onSelectDesign,
  playerState,
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
  onSeek,
  onToggleLike,
  onOpenFullscreen,
}) => {
  const [previewTab, setPreviewTab] = useState<"all" | FullAppDesignId>("all");
  const currentTrack = playerState.currentTrack || {
    id: "demo_01",
    title: "Starfall Serenade (Synthwave Mix)",
    artist: "CYBERWAVE",
    album: "Neon Horizons",
    duration: 215,
    coverUrl: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=80",
    audioUrl: "",
    playsCount: 248000
  };

  const isLiked = currentTrack && playerState.likedTrackIds.includes(currentTrack.id);
  const currentTime = playerState.currentTime || 42;
  const duration = playerState.duration || 215;
  const isPlaying = playerState.isPlaying;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 20;

  const currentDesign = FULL_APP_DESIGNS[activeDesignId] || FULL_APP_DESIGNS["designer"];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-8 custom-scrollbar pb-40 select-none">
      {/* Studio Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold tracking-wider">
              <Layout className="w-3.5 h-3.5" />
              <span>Full-App Layouts & Themes Studio (6 Options)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              Transform the Entire App Design
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Experience 6 complete, distinct full-app design archetypes. Switching designs updates the entire visual ecosystem: the canvas atmosphere, header, sidebar navigation, content cards, color palette, and docked bottom player.
            </p>
          </div>

          {/* Quick Active Status Badge */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-700/70 shrink-0 space-y-2 lg:w-72">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Current Active Design
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${currentDesign.accentBg} animate-pulse`} />
              <span className="text-sm font-bold text-white truncate">{currentDesign.name}</span>
            </div>
            <div className="text-xs text-cyan-300 font-mono">
              Dock: {currentDesign.mockup.dockStyle}
            </div>
          </div>
        </div>
      </div>

      {/* 6 Full App Designs Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <span>Choose From 6 Full App Designs</span>
          </h2>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Tap any card to instantly morph the entire app live
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {Object.values(FULL_APP_DESIGNS).map((design) => {
            const isSelected = activeDesignId === design.id;

            return (
              <div
                key={design.id}
                onClick={() => onSelectDesign(design.id)}
                className={`rounded-3xl border transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer relative group ${
                  isSelected
                    ? `bg-slate-900/95 border-cyan-400 ring-4 ring-cyan-500/20 shadow-2xl ${design.glowRing} scale-[1.01]`
                    : `bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90`
                }`}
              >
                {/* Active Indicator Top Right */}
                {isSelected && (
                  <div className="absolute top-4 right-4 z-20 px-3 py-1 rounded-full bg-cyan-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg">
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>ACTIVE THEME</span>
                  </div>
                )}

                {/* Interactive Mockup Visual Window */}
                <div className={`p-4 border-b border-slate-800 bg-gradient-to-b ${design.bgCanvas} relative overflow-hidden`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-black/60 text-white border border-white/10">
                      {design.badge}
                    </span>
                    <span className="text-xs font-mono text-slate-400">Design {design.num} / 05</span>
                  </div>

                  {/* Complete App Wireframe Box */}
                  <div className="rounded-2xl border border-white/10 bg-black/50 p-3 space-y-2.5 shadow-2xl backdrop-blur-md">
                    {/* Simulated Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <div className="flex items-center gap-1.5">
                        <OblivionLogo size={14} designId={design.id} />
                        <div className="h-2.5 w-16 rounded bg-white/40 font-mono text-[8px] flex items-center px-1 text-white">
                          OBLIVION
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-3 px-1.5 rounded bg-white/10 text-[7px] text-white/80 flex items-center">
                          Search
                        </div>
                        <div className="h-3 w-3 rounded-full bg-white/20" />
                      </div>
                    </div>

                    {/* Simulated Hero Banner */}
                    <div className={`p-2.5 rounded-xl bg-gradient-to-r ${design.mockup.bannerGradient} border border-white/10 text-left`}>
                      <div className="text-[11px] font-bold text-white truncate">{design.mockup.heroTitle}</div>
                      <div className="text-[9px] text-slate-300 truncate mt-0.5">{design.mockup.heroSubtitle}</div>
                      <div className="flex gap-1.5 mt-2">
                        {design.mockup.chipLabels.map((chip, i) => (
                          <span key={i} className="text-[8px] px-1.5 py-0.5 rounded-md bg-black/40 text-white border border-white/10">
                            {chip}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Simulated Content Cards */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { title: "Trending Mix", artist: "Top Hits 2026" },
                        { title: "Neon Skyline", artist: "Cyberwave" },
                        { title: "After Hours", artist: "The Weeknd" }
                      ].map((item, i) => (
                        <div key={i} className={`p-1.5 rounded-lg ${design.cardBg} border border-white/5 space-y-1`}>
                          <div className="h-8 rounded-md bg-white/10 flex items-center justify-center relative overflow-hidden">
                            <Play className="w-3.5 h-3.5 text-white/80" />
                          </div>
                          <div className="text-[8px] font-bold text-white truncate">{item.title}</div>
                          <div className="text-[7px] text-slate-400 truncate">{item.artist}</div>
                        </div>
                      ))}
                    </div>

                    {/* Simulated Docked Player */}
                    <div className={`p-2 rounded-xl border flex items-center justify-between shadow-md ${
                      design.playerLayout === "ytmusic-classic"
                        ? "bg-[#212121] border-red-500/40"
                        : design.playerLayout === "minimal-capsule"
                        ? "bg-black border-emerald-500/40"
                        : design.playerLayout === "card-expanded"
                        ? "bg-[#221c17] border-amber-500/40"
                        : design.playerLayout === "split-slider"
                        ? "bg-purple-950 border-purple-500/40"
                        : "bg-slate-900/90 border-cyan-400 shadow-cyan-500/20"
                    }`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-md ${design.accentBg} flex items-center justify-center`}>
                          <Music className="w-2.5 h-2.5 text-white" />
                        </div>
                        <div>
                          <div className="text-[8px] font-bold text-white truncate">Starfall Serenade</div>
                          <div className="text-[7px] text-slate-400 truncate">CYBERWAVE</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-4 h-4 rounded-full ${design.accentBg} flex items-center justify-center shadow`}>
                          <Play className="w-2 h-2 text-white fill-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Details & Features */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>{design.name}</span>
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {design.description}
                    </p>

                    {/* Feature Checklist */}
                    <div className="pt-2 space-y-1.5">
                      {design.features.map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-slate-400">
                          <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${design.accentText}`} />
                          <span className="truncate">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Swatches and Switch Action */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {design.swatchColors.map((color, idx) => (
                        <span
                          key={idx}
                          className="w-4 h-4 rounded-full border border-white/20 shadow-inner"
                          style={{ backgroundColor: color }}
                          title={`Color ${color}`}
                        />
                      ))}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDesign(design.id);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${
                        isSelected
                          ? "bg-cyan-400 text-slate-950 shadow-cyan-400/30"
                          : "bg-slate-800 hover:bg-slate-700 text-white"
                      }`}
                    >
                      {isSelected ? "● Live On App" : "Apply Design →"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Live Interactive Player Transport Sandbox */}
      <section className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-xs font-mono mb-1">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span>Interactive Live Transport Controls</span>
            </div>
            <h3 className="text-lg font-bold text-white">Test Real-Time Playback With Active Design</h3>
            <p className="text-xs text-slate-400">
              Use the transport controls below to test how your chosen design responds to live audio state.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenFullscreen}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Fullscreen Player</span>
            </button>
          </div>
        </div>

        {/* Live Audio Control Strip */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              className="w-12 h-12 rounded-xl object-cover shadow-md border border-slate-700"
            />
            <div>
              <h4 className="text-sm font-bold text-white truncate max-w-xs">{cleanTrackTitle(currentTrack.title)}</h4>
              <p className="text-xs text-slate-400">{currentTrack.artist}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-center sm:self-auto">
            <button
              onClick={onPrevTrack}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Previous"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            <button
              onClick={onTogglePlay}
              className={`p-3 rounded-full ${currentDesign.accentBg} text-white shadow-lg transition-transform active:scale-95`}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
            </button>
            <button
              onClick={onNextTrack}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Next"
            >
              <SkipForward className="w-5 h-5" />
            </button>
            <button
              onClick={() => onToggleLike(currentTrack.id)}
              className={`p-2 rounded-xl transition-colors ${
                isLiked ? "text-rose-500 bg-rose-500/10" : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
              title="Favorite"
            >
              <Heart className={`w-5 h-5 ${isLiked ? "fill-rose-500" : ""}`} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
