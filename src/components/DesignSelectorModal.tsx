import React from "react";
import { ThemePreset } from "../types";
import { ThemeRegistry } from "../utils/themeMap";
import { X, Palette, Check, Sparkles } from "lucide-react";

interface DesignSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTheme: ThemePreset;
  onSelectTheme: (theme: ThemePreset) => void;
}

export const DesignSelectorModal: React.FC<DesignSelectorModalProps> = ({
  isOpen,
  onClose,
  activeTheme,
  onSelectTheme,
}) => {
  if (!isOpen) return null;

  const activeMeta = ThemeRegistry.getTheme(activeTheme);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Choose Your App Design Theme</span>
                <span className="text-xs font-mono font-normal text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                  8 Presets
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Instantly switch the app layout palette, glow effects, and contrast theme.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Themes Grid */}
        <div className="p-6 overflow-y-auto custom-scrollbar grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
          {Object.values(ThemeRegistry.THEMES).map((t) => {
            const isSelected = activeTheme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  onSelectTheme(t.id);
                }}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all duration-300 relative overflow-hidden group bg-gradient-to-br ${t.previewGradient} ${
                  isSelected
                    ? "border-cyan-400 ring-2 ring-cyan-400/50 shadow-xl shadow-cyan-500/10 scale-[1.01]"
                    : "border-slate-800/80 opacity-80 hover:opacity-100 hover:scale-[1.005]"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shadow-md">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-black/50 text-slate-200 border border-white/10">
                      {t.category}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white mb-1 flex items-center gap-1.5">
                    <span>{t.name}</span>
                  </h4>
                  <p className="text-xs text-slate-300/90 leading-relaxed mb-4">
                    {t.description}
                  </p>
                </div>

                {/* Swatch Colors */}
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    {t.swatchColors.map((color, idx) => (
                      <span
                        key={idx}
                        className="w-5 h-5 rounded-full border border-white/30 shadow-inner"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-lg border ${
                      isSelected
                        ? "bg-cyan-400 text-slate-950 border-cyan-400 font-bold"
                        : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                    }`}
                  >
                    {isSelected ? "Active Design" : "Apply Design"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Theme preferences auto-save locally to your profile.</span>
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
