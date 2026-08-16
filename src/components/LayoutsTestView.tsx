import React from "react";
import { MiniPlayerLayout, Track, PlayerState } from "../types";
import {
  Sliders,
  Check,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Heart,
  Maximize2,
  Sparkles,
  Layers,
  Radio,
  Music,
  ArrowRight,
  Info
} from "lucide-react";
import { cleanTrackTitle } from "../utils/formatters";

interface LayoutsTestViewProps {
  currentLayout: MiniPlayerLayout;
  onSelectLayout: (layout: MiniPlayerLayout) => void;
  playerState: PlayerState;
  onTogglePlay: () => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onSeek: (time: number) => void;
  onToggleLike: (trackId: string) => void;
  onOpenFullscreen: () => void;
}

export const LayoutsTestView: React.FC<LayoutsTestViewProps> = ({
  currentLayout,
  onSelectLayout,
  playerState,
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
  onSeek,
  onToggleLike,
  onOpenFullscreen,
}) => {
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

  const layoutOptions: {
    id: MiniPlayerLayout;
    num: string;
    title: string;
    badge: string;
    desc: string;
    accentColor: string;
    highlights: string[];
  }[] = [
    {
      id: "floating-dock",
      num: "01",
      title: "Floating Glass Pill",
      badge: "Modern Cyberpunk • Default",
      desc: "An elevated floating glass capsule with frosted backdrop blur, glowing cyan neon borders, and spacious margins above the bottom navigation bar.",
      accentColor: "border-cyan-500/50 bg-cyan-500/10 text-cyan-300",
      highlights: [
        "Floating elevated look with 16px border-radius",
        "Glowing cyan neon border and backdrop blur",
        "Compact album cover with hover expander",
        "Smooth transport controls with prominent cyan play ring"
      ]
    },
    {
      id: "ytmusic-classic",
      num: "02",
      title: "YouTube Music Classic",
      badge: "Edge-to-Edge Official",
      desc: "The authentic YouTube Music layout spanning full edge-to-edge width with a hairline red progress micro-scrubber running across the top boundary.",
      accentColor: "border-red-500/50 bg-red-500/10 text-red-400",
      highlights: [
        "Full-width edge-to-edge flush dock (#212121)",
        "Top micro scrubber line in signature YouTube red",
        "High-density ergonomic controls for one-handed use",
        "Matches official YouTube Music Android/iOS app feel"
      ]
    },
    {
      id: "minimal-capsule",
      num: "03",
      title: "Dynamic Island Capsule",
      badge: "Ultra-Minimalist",
      desc: "A compact centered pill that floats above the navigation bar featuring an active animated neon visualizer / audio wave indicator.",
      accentColor: "border-emerald-500/50 bg-emerald-500/10 text-emerald-300",
      highlights: [
        "Ultra-compact pill footprint centered on screen",
        "Animated equalizer wave bars reacting to playback",
        "Rotating circular album art vinyl effect",
        "Maximized screen real estate for album browsing"
      ]
    },
    {
      id: "card-expanded",
      num: "04",
      title: "Cyberpunk Hologram Card",
      badge: "Audiophile Deck",
      desc: "An expanded audio command deck featuring an interactive waveform scrubber, Hi-Res format bitrate badge, and direct lyrics shortcut button.",
      accentColor: "border-purple-500/50 bg-purple-500/10 text-purple-300",
      highlights: [
        "Hi-Res audio format indicator badge (HQ / Lossless)",
        "Full interactive scrub slider with time counters",
        "Direct one-tap lyrics drawer trigger",
        "Rich gradient holographic card styling"
      ]
    },
    {
      id: "split-slider",
      num: "05",
      title: "Split-Slider Gesture Deck",
      badge: "Touch / DJ Scrubber",
      desc: "Designed for one-handed mobile control featuring dedicated ±10 second fast seek buttons and an extra-wide thumb scrub slider.",
      accentColor: "border-amber-500/50 bg-amber-500/10 text-amber-300",
      highlights: [
        "Instant ±10 second quick seek jump buttons",
        "Wide thumb-friendly seek bar with live time counters",
        "Emerald green DJ transport control accents",
        "Optimized for quick scrubbing through mixes & podcasts"
      ]
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-8 custom-scrollbar pb-36 select-none">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/90 to-slate-950 border border-indigo-500/40 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-20 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-400 via-indigo-500 to-transparent" />
        
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
            <Sliders className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Interactive Layout Test Lab</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            5 Mini-Player Design Layouts
          </h1>

          <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
            Test, compare, and switch between all 5 bottom persistent player layouts in real time.
            Click <strong className="text-cyan-300 font-semibold">"Set Active"</strong> on any layout below to immediately apply it to the bottom player dock.
          </p>

          {/* Quick Switch Bar */}
          <div className="pt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-mono mr-1">Quick Select:</span>
            {layoutOptions.map((layout) => {
              const isSelected = currentLayout === layout.id;
              return (
                <button
                  key={`quick_${layout.id}`}
                  onClick={() => onSelectLayout(layout.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/25 scale-105"
                      : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  <span>{layout.num}. {layout.title.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Side-by-Side Live Interactive Layout Previews */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <span>Interactive Live Previews (All 5 Styles)</span>
          </h2>
          <span className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
            Currently Active: <strong className="text-cyan-400">{currentLayout}</strong>
          </span>
        </div>

        <div className="space-y-6">
          {layoutOptions.map((layout) => {
            const isSelected = currentLayout === layout.id;

            return (
              <div
                key={layout.id}
                className={`rounded-3xl border-2 transition-all duration-300 overflow-hidden ${
                  isSelected
                    ? "border-cyan-400 bg-slate-900/90 ring-4 ring-cyan-400/20 shadow-2xl shadow-cyan-500/10"
                    : "border-slate-800/80 bg-slate-950/60 hover:border-slate-700"
                }`}
              >
                {/* Card Header & Details */}
                <div className="p-5 sm:p-6 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-white border border-slate-700">
                        Layout {layout.num}
                      </span>
                      <span className={`text-xs font-mono px-2.5 py-0.5 rounded-full border ${layout.accentColor}`}>
                        {layout.badge}
                      </span>
                      {isSelected && (
                        <span className="text-xs font-bold text-cyan-400 flex items-center gap-1 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/30 animate-pulse">
                          <Check className="w-3 h-3 stroke-[3]" /> Active Bottom Dock
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-white">{layout.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{layout.desc}</p>

                    {/* Highlights List */}
                    <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {layout.highlights.map((h, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                          <span>{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Apply Button */}
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => onSelectLayout(layout.id)}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 shadow-md ${
                        isSelected
                          ? "bg-cyan-400 text-slate-950 shadow-cyan-400/25"
                          : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Currently Active</span>
                        </>
                      ) : (
                        <>
                          <span>Apply Layout {layout.num}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Live Simulated Mini-Player Component Rendering */}
                <div className="p-4 sm:p-6 bg-slate-950/80 flex flex-col items-center justify-center min-h-[110px] relative">
                  <div className="w-full max-w-xl">
                    {/* Render exact visual clone of layout */}
                    {layout.id === "floating-dock" && (
                      <div className="bg-slate-950/90 backdrop-blur-2xl border border-cyan-500/40 rounded-2xl p-2.5 px-3.5 flex items-center justify-between shadow-xl shadow-cyan-500/10">
                        <div className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group pr-2" onClick={onOpenFullscreen}>
                          <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-cyan-500/30">
                            <img src={currentTrack.coverUrl} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                              <Maximize2 className="w-3.5 h-3.5 text-white" />
                            </div>
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-white truncate">{cleanTrackTitle(currentTrack.title)}</h4>
                            <p className="text-[11px] text-cyan-300/80 truncate">{currentTrack.artist}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => onToggleLike(currentTrack.id)} className="p-2 text-slate-400 hover:text-rose-500">
                            <Heart className={`w-4 h-4 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`} />
                          </button>
                          <button onClick={onPrevTrack} className="p-1.5 text-slate-400 hover:text-white">
                            <SkipBack className="w-4 h-4" />
                          </button>
                          <button onClick={onTogglePlay} className="w-9 h-9 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center font-bold active:scale-95 shadow-md">
                            {isPlaying ? <Pause className="w-4 h-4 fill-slate-950" /> : <Play className="w-4 h-4 fill-slate-950 ml-0.5" />}
                          </button>
                          <button onClick={onNextTrack} className="p-1.5 text-slate-400 hover:text-white">
                            <SkipForward className="w-4 h-4" />
                          </button>
                          <button onClick={onOpenFullscreen} className="p-2 text-slate-400 hover:text-white">
                            <Maximize2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {layout.id === "ytmusic-classic" && (
                      <div className="bg-[#212121] border-t border-white/10 rounded-xl overflow-hidden shadow-2xl">
                        <div className="w-full h-1.5 bg-white/20 relative">
                          <div className="h-full bg-red-600" style={{ width: `${progressPercent}%` }} />
                        </div>
                        <div className="h-14 px-4 flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer" onClick={onOpenFullscreen}>
                            <img src={currentTrack.coverUrl} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-medium text-white truncate">{cleanTrackTitle(currentTrack.title)}</p>
                              <p className="text-xs text-zinc-400 truncate">{currentTrack.artist}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 text-white">
                            <button onClick={() => onToggleLike(currentTrack.id)} className="p-1.5 text-zinc-300 hover:text-white">
                              <Heart className={`w-4 h-4 ${isLiked ? "fill-red-600 text-red-600" : ""}`} />
                            </button>
                            <button onClick={onTogglePlay} className="p-2 text-white hover:text-zinc-200">
                              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
                            </button>
                            <button onClick={onNextTrack} className="p-1.5 text-zinc-300 hover:text-white">
                              <SkipForward className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {layout.id === "minimal-capsule" && (
                      <div className="flex justify-center">
                        <div className="max-w-sm w-full bg-black/90 backdrop-blur-2xl border border-white/20 rounded-full p-2 px-3.5 shadow-2xl flex items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer" onClick={onOpenFullscreen}>
                            <img src={currentTrack.coverUrl} alt="" className={`w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-cyan-400 ${isPlaying ? "animate-spin-slow" : ""}`} />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{cleanTrackTitle(currentTrack.title)}</p>
                              <p className="text-[10px] text-slate-400 truncate">{currentTrack.artist}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 px-2">
                            <span className="w-0.5 h-3 bg-cyan-400 rounded-full animate-pulse" />
                            <span className="w-0.5 h-4.5 bg-cyan-400 rounded-full animate-pulse delay-75" />
                            <span className="w-0.5 h-2.5 bg-cyan-400 rounded-full animate-pulse delay-150" />
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={onTogglePlay} className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center active:scale-95 shadow-md">
                              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-black" /> : <Play className="w-3.5 h-3.5 fill-black ml-0.5" />}
                            </button>
                            <button onClick={onNextTrack} className="p-1 text-slate-300 hover:text-white">
                              <SkipForward className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {layout.id === "card-expanded" && (
                      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/95 border border-indigo-500/40 rounded-2xl p-3 shadow-2xl space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer" onClick={onOpenFullscreen}>
                            <img src={currentTrack.coverUrl} alt="" className="w-11 h-11 rounded-xl object-cover ring-1 ring-indigo-400/50 shrink-0" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-mono px-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">HQ AUDIO</span>
                                <p className="text-xs sm:text-sm font-bold text-white truncate">{cleanTrackTitle(currentTrack.title)}</p>
                              </div>
                              <p className="text-xs text-indigo-200/70 truncate">{currentTrack.artist}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={onOpenFullscreen} className="p-2 text-indigo-300 hover:text-white">
                              <Sparkles className="w-4 h-4" />
                            </button>
                            <button onClick={onPrevTrack} className="p-1.5 text-slate-400 hover:text-white">
                              <SkipBack className="w-4 h-4" />
                            </button>
                            <button onClick={onTogglePlay} className="w-8 h-8 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white flex items-center justify-center active:scale-95 shadow-md">
                              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                            </button>
                            <button onClick={onNextTrack} className="p-1.5 text-slate-400 hover:text-white">
                              <SkipForward className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <input
                            type="range"
                            min={0}
                            max={duration}
                            value={currentTime}
                            onChange={(e) => onSeek(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                          />
                          <div className="flex justify-between text-[10px] font-mono text-slate-400">
                            <span>0:42</span>
                            <span className="text-indigo-400">Interactive Wave Scrubber</span>
                            <span>3:35</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {layout.id === "split-slider" && (
                      <div className="bg-slate-900/95 border border-slate-700/90 rounded-2xl p-3 shadow-2xl space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer" onClick={onOpenFullscreen}>
                            <img src={currentTrack.coverUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-700" />
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-semibold text-white truncate">{cleanTrackTitle(currentTrack.title)}</p>
                              <p className="text-[11px] text-slate-400 truncate">{currentTrack.artist}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button onClick={() => onSeek(Math.max(0, currentTime - 10))} className="px-2 py-1 bg-slate-800 rounded text-[10px] font-mono text-slate-300">
                              -10s
                            </button>
                            <button onClick={onTogglePlay} className="w-8 h-8 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center font-bold active:scale-95 shadow-md">
                              {isPlaying ? <Pause className="w-4 h-4 fill-slate-950" /> : <Play className="w-4 h-4 fill-slate-950 ml-0.5" />}
                            </button>
                            <button onClick={() => onSeek(Math.min(duration, currentTime + 10))} className="px-2 py-1 bg-slate-800 rounded text-[10px] font-mono text-slate-300">
                              +10s
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-emerald-400">0:42</span>
                          <input
                            type="range"
                            min={0}
                            max={duration}
                            value={currentTime}
                            onChange={(e) => onSeek(Number(e.target.value))}
                            className="flex-1 h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-emerald-400"
                          />
                          <span className="text-[10px] font-mono text-slate-400">3:35</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
