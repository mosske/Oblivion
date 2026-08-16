import React from "react";
import { MiniPlayerLayout } from "../types";
import { 
  Sliders, 
  Check, 
  Sparkles, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Heart, 
  Radio, 
  Flame, 
  Activity, 
  Maximize2,
  ListMusic,
  Volume2
} from "lucide-react";

interface MiniPlayerLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeLayout: MiniPlayerLayout;
  onSelectLayout: (layout: MiniPlayerLayout) => void;
}

interface LayoutOption {
  id: MiniPlayerLayout;
  name: string;
  badge: string;
  tagline: string;
  description: string;
  preview: React.ReactNode;
}

export const MiniPlayerLayoutModal: React.FC<MiniPlayerLayoutModalProps> = ({
  isOpen,
  onClose,
  activeLayout,
  onSelectLayout,
}) => {
  if (!isOpen) return null;

  const mockTrack = {
    title: "Starfall Serenade",
    artist: "CYBERWAVE",
    cover: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=150&auto=format&fit=crop&q=80",
    currentTime: "1:42",
    totalTime: "3:30",
    progress: 48,
  };

  const layouts: LayoutOption[] = [
    {
      id: "floating-dock",
      name: "1. Floating Glass Pill (Modern Cyberpunk)",
      badge: "Default • Popular",
      tagline: "Floating frosted glass deck with glowing cyan accent & quick expand",
      description: "Elevated above bottom navigation with smooth rounded corners, blurred backdrop, scrubber track, and quick lyrics/radio shortcuts.",
      preview: (
        <div className="w-full bg-slate-950/90 border border-cyan-500/30 rounded-2xl p-2.5 shadow-lg shadow-cyan-500/10 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-cyan-500/30">
              <img src={mockTrack.cover} alt="art" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Maximize2 className="w-3.5 h-3.5 text-white/80" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{mockTrack.title}</p>
              <p className="text-[10px] text-cyan-300/80 truncate">{mockTrack.artist}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            <button className="p-1 text-slate-400 hover:text-white">
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button className="w-7 h-7 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shadow-sm">
              <Play className="w-3.5 h-3.5 fill-slate-950 ml-0.5" />
            </button>
            <button className="p-1 text-slate-400 hover:text-white">
              <SkipForward className="w-3.5 h-3.5" />
            </button>
            <button className="p-1 text-rose-400">
              <Heart className="w-3.5 h-3.5 fill-rose-400" />
            </button>
          </div>
        </div>
      ),
    },
    {
      id: "ytmusic-classic",
      name: "2. YouTube Music Classic (Edge-to-Edge)",
      badge: "Official YT Music Style",
      tagline: "Full-width bar with top micro scrubber, cast button, and thumbs up",
      description: "Direct homage to YouTube Music mobile app: pinned above bottom bar, horizontal scrub line on top, large tap target to open now playing.",
      preview: (
        <div className="w-full bg-[#212121] border-t border-white/10 rounded-lg overflow-hidden shadow-md">
          {/* Top micro scrubber line */}
          <div className="w-full h-1 bg-white/20">
            <div className="h-full bg-red-600 w-[48%]" />
          </div>
          <div className="p-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <img src={mockTrack.cover} alt="art" className="w-9 h-9 rounded object-cover shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-white truncate">{mockTrack.title}</p>
                <p className="text-[10px] text-zinc-400 truncate">{mockTrack.artist} • Oblivion</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 text-white">
              <Heart className="w-4 h-4 text-zinc-300" />
              <Play className="w-5 h-5 fill-white" />
              <SkipForward className="w-4 h-4 text-zinc-300" />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "minimal-capsule",
      name: "3. Dynamic Island Capsule (Ultra Compact)",
      badge: "Minimalist • High Screen Space",
      tagline: "Compact centered pill with animated mini soundwave & swipe gesture",
      description: "Floats centered with minimal footprint. Leaves maximum screen space for browsing search results and library lists.",
      preview: (
        <div className="w-full flex justify-center">
          <div className="max-w-xs w-full bg-black/95 border border-white/15 rounded-full px-3 py-1.5 shadow-2xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <img src={mockTrack.cover} alt="art" className="w-7 h-7 rounded-full object-cover shrink-0 animate-spin-slow ring-1 ring-cyan-400" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-white truncate">{mockTrack.title}</p>
                <p className="text-[9px] text-slate-400 truncate">{mockTrack.artist}</p>
              </div>
            </div>
            
            {/* Animated equalizer waves */}
            <div className="flex items-center gap-0.5 px-1 shrink-0">
              <span className="w-0.5 h-3 bg-cyan-400 rounded-full animate-pulse" />
              <span className="w-0.5 h-4.5 bg-cyan-400 rounded-full animate-pulse delay-75" />
              <span className="w-0.5 h-2.5 bg-cyan-400 rounded-full animate-pulse delay-150" />
            </div>

            <button className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center shrink-0">
              <Play className="w-3 h-3 fill-black ml-0.5" />
            </button>
          </div>
        </div>
      ),
    },
    {
      id: "card-expanded",
      name: "4. Cyberpunk Hologram Card (Rich Controls)",
      badge: "Feature-Rich • Audiophile",
      tagline: "Expanded widget with waveform, volume thumb, and audio format badge",
      description: "Shows live audio bit-depth badge (FLAC 24-bit/96kHz), lyrics preview toggle, queue count, and interactive frequency visualizer.",
      preview: (
        <div className="w-full bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-indigo-500/30 rounded-2xl p-3 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <img src={mockTrack.cover} alt="art" className="w-10 h-10 rounded-xl object-cover ring-1 ring-indigo-400/40 shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono px-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">HI-RES</span>
                  <p className="text-xs font-bold text-white truncate">{mockTrack.title}</p>
                </div>
                <p className="text-[10px] text-indigo-200/70 truncate">{mockTrack.artist}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button className="p-1 rounded-lg bg-white/5 text-slate-300 hover:text-white">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              </button>
              <button className="w-7 h-7 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white flex items-center justify-center">
                <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
              </button>
            </div>
          </div>
          
          {/* Mini Waveform & scrubber */}
          <div className="space-y-1">
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden flex items-center">
              <div className="h-full bg-gradient-to-r from-cyan-400 to-indigo-400 w-[48%]" />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-slate-400">
              <span>{mockTrack.currentTime}</span>
              <span className="text-indigo-400">Queue: 14 tracks</span>
              <span>{mockTrack.totalTime}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "split-slider",
      name: "5. Split-Slider Gesture Deck (DJ / Scrubber)",
      badge: "Touch-Optimized • Quick Scrub",
      tagline: "Dedicated touch scrub bar with large thumb, volume dial, and next track peek",
      description: "Engineered for one-handed mobile control. Features extra-wide scrub zone, skip 10s buttons, and instant swipe to next queue item.",
      preview: (
        <div className="w-full bg-slate-900 border border-slate-700/80 rounded-2xl p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <img src={mockTrack.cover} alt="art" className="w-9 h-9 rounded-lg object-cover shrink-0 border border-slate-700" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{mockTrack.title}</p>
                <p className="text-[10px] text-slate-400 truncate">{mockTrack.artist}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button className="px-2 py-1 bg-slate-800 rounded text-[10px] text-slate-300 font-mono">-10s</button>
              <button className="w-7 h-7 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center font-bold">
                <Play className="w-3.5 h-3.5 fill-slate-950 ml-0.5" />
              </button>
              <button className="px-2 py-1 bg-slate-800 rounded text-[10px] text-slate-300 font-mono">+10s</button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-emerald-400">{mockTrack.currentTime}</span>
            <div className="flex-1 relative h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 w-[48%]" />
            </div>
            <span className="text-[9px] font-mono text-slate-400">{mockTrack.totalTime}</span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Choose Mini-Player Layout</span>
                <span className="text-xs font-mono font-normal text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                  5 Layouts
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Select your preferred bottom mini-player deck for mobile and desktop browsing.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Done
          </button>
        </div>

        {/* Layout Cards */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
          {layouts.map((layout) => {
            const isSelected = activeLayout === layout.id;
            return (
              <div
                key={layout.id}
                onClick={() => onSelectLayout(layout.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 relative overflow-hidden ${
                  isSelected
                    ? "bg-slate-950/90 border-cyan-400 ring-2 ring-cyan-400/40 shadow-xl shadow-cyan-500/10"
                    : "bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/70"
                }`}
              >
                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shadow-md">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                )}

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Info Column */}
                  <div className="max-w-lg space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{layout.name}</span>
                      <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        {layout.badge}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-300">{layout.tagline}</p>
                    <p className="text-xs text-slate-400 leading-relaxed">{layout.description}</p>
                  </div>

                  {/* Interactive Visual Preview Box */}
                  <div className="w-full lg:w-96 bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
                    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Live Mini-Player Preview</span>
                      {isSelected ? (
                        <span className="text-cyan-400 font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Active Layout
                        </span>
                      ) : (
                        <span className="text-slate-400">Click to apply</span>
                      )}
                    </div>
                    {layout.preview}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>You can switch layouts anytime from the top bar or Settings tab.</span>
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold rounded-xl transition-colors shadow-md shadow-cyan-400/20"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
