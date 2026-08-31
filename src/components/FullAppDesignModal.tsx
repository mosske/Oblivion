import React from "react";
import { FullAppDesignId, FULL_APP_DESIGNS, FULL_APP_DESIGNS_LIST } from "../utils/appDesignThemes";
import {
  X,
  Palette,
  Check,
  Sparkles,
  Layout,
  Radio,
  Sliders,
  Disc3,
  Play,
  Flame,
  Music,
  ExternalLink,
  ShieldCheck
} from "lucide-react";

interface FullAppDesignModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDesignId: FullAppDesignId;
  onSelectDesign: (designId: FullAppDesignId) => void;
}

export const FullAppDesignModal: React.FC<FullAppDesignModalProps> = ({
  isOpen,
  onClose,
  activeDesignId,
  onSelectDesign,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-fade-in select-none">
      <div className="w-full max-w-5xl bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800/90 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-lg shadow-cyan-500/20">
              <Layout className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-white">
                  6 Full App Layouts & Designs
                </h3>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Full Suite
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Switching designs transforms the entire app: background, header, navigation, content cards, colors, and docked player.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Designs List / Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FULL_APP_DESIGNS_LIST.map((design) => {
              const isSelected = activeDesignId === design.id;

              return (
                <div
                  key={design.id}
                  onClick={() => onSelectDesign(design.id)}
                  className={`rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer relative group ${
                    isSelected
                      ? `bg-slate-900 border-cyan-400 ring-2 ring-cyan-400/50 shadow-2xl scale-[1.01]`
                      : `bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90`
                  }`}
                >
                  {/* Selection Badge */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full bg-cyan-400 text-slate-950 font-bold text-[10px] flex items-center gap-1 shadow-lg">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>ACTIVE ON APP</span>
                    </div>
                  )}

                  {/* Visual Layout Mockup Box */}
                  <div className={`p-4 border-b border-slate-800/80 bg-gradient-to-b ${design.bgCanvas} relative overflow-hidden`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/60 text-slate-200 border border-white/10">
                        {design.badge}
                      </span>
                      <span className="text-xs font-mono text-slate-400">{design.num} / 06</span>
                    </div>

                    {/* Miniature UI Screen Wireframe */}
                    <div className="rounded-xl border border-white/10 bg-black/40 p-2.5 space-y-2 shadow-inner">
                      {/* Mini Header */}
                      <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-3 h-3 rounded-full ${design.accentBg}`} />
                          <div className="h-2 w-12 rounded bg-white/30" />
                        </div>
                        <div className="flex gap-1">
                          <div className="h-2 w-4 rounded bg-white/20" />
                          <div className="h-2 w-4 rounded bg-white/20" />
                        </div>
                      </div>

                      {/* Mini Hero Banner */}
                      <div className={`p-2 rounded-lg bg-gradient-to-r ${(design as any).mockup?.bannerGradient || design.multiAccentGradient || "from-white/10 to-white/5"} border border-white/10 text-left`}>
                        <div className="text-[10px] font-bold text-white truncate">{(design as any).mockup?.heroTitle || design.name}</div>
                        <div className="text-[8px] text-slate-300 truncate">{(design as any).mockup?.heroSubtitle || design.subtitle}</div>
                        <div className="flex gap-1 mt-1.5">
                          {((design as any).mockup?.chipLabels || design.features).slice(0, 2).map((chip: string, i: number) => (
                            <span key={i} className="text-[7px] px-1 py-0.2 rounded bg-black/40 text-white border border-white/10">
                              {chip}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Mini Music Cards Grid */}
                      <div className="grid grid-cols-3 gap-1 pt-0.5">
                        {[1, 2, 3].map((_, i) => (
                          <div key={i} className={`p-1 rounded-md ${design.cardBg} border border-white/5 space-y-1`}>
                            <div className="h-5 rounded bg-white/10 flex items-center justify-center">
                              <Play className="w-2.5 h-2.5 text-white/60" />
                            </div>
                            <div className="h-1 w-full rounded bg-white/20" />
                          </div>
                        ))}
                      </div>

                      {/* Mini Docked Player */}
                      <div className={`p-1.5 rounded-lg border flex items-center justify-between ${
                        design.playerLayout === "ytmusic-classic"
                          ? "bg-[#212121] border-red-500/40"
                          : design.playerLayout === "minimal-capsule"
                          ? "bg-black border-emerald-500/40"
                          : design.playerLayout === "card-expanded"
                          ? "bg-[#221c17] border-amber-500/40"
                          : design.playerLayout === "split-slider"
                          ? "bg-purple-950 border-purple-500/40"
                          : "bg-slate-900/90 border-cyan-400"
                      }`}>
                        <div className="flex items-center gap-1">
                          <div className={`w-3.5 h-3.5 rounded ${design.accentBg}`} />
                          <div className="h-1.5 w-8 rounded bg-white/40" />
                        </div>
                        <div className="flex items-center gap-1">
                          <div className={`w-2.5 h-2.5 rounded-full ${design.accentBg}`} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Content & Features */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5 mb-1">
                        <span>{design.name}</span>
                      </h4>
                      <p className="text-xs text-slate-300 leading-snug line-clamp-2 mb-2.5">
                        {design.description}
                      </p>

                      {/* Feature Bullets */}
                      <ul className="space-y-1 text-[11px] text-slate-400">
                        {design.features.slice(0, 2).map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className={`w-1 h-1 rounded-full mt-1.5 shrink-0 ${design.accentBg}`} />
                            <span className="truncate">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Bottom Action / Swatches */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      {/* Swatch dots */}
                      <div className="flex items-center gap-1">
                        {design.swatchColors.map((color, idx) => (
                          <span
                            key={idx}
                            className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-inner"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDesign(design.id);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isSelected
                            ? "bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/30"
                            : "bg-slate-800 hover:bg-slate-700 text-white"
                        }`}
                      >
                        {isSelected ? "Applied" : "Apply Design →"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>App design choices persist automatically in your local preferences.</span>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Done Previewing
          </button>
        </div>
      </div>
    </div>
  );
};
