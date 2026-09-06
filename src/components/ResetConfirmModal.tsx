import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  RotateCcw,
  Sparkles,
  Layers,
  Film,
  Eye,
  Sliders,
  X,
  Check,
  AlertTriangle,
  Loader2,
  Trash2,
} from "lucide-react";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";

interface ResetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: () => Promise<void> | void;
  designConfig?: FullAppDesignConfig;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmReset,
  designConfig = FULL_APP_DESIGNS["designer"],
}) => {
  const [isResetting, setIsResetting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setIsResetting(true);
      await onConfirmReset();
    } finally {
      setIsResetting(false);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={isResetting ? undefined : onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Dialog Card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className={`relative w-full max-w-lg overflow-hidden rounded-3xl ${
            designConfig.isLight
              ? "bg-[#faf8f5] text-zinc-900 border-[#e4dfd5] shadow-2xl"
              : "bg-[#12161f] text-white border-white/15 shadow-2xl"
          } border p-6 sm:p-8 space-y-6 z-10`}
        >
          {/* Top Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 flex items-center justify-center shadow-inner shrink-0">
                <RotateCcw className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Reset Confirmation
                  </span>
                </div>
                <h3 className={`text-lg sm:text-xl font-extrabold tracking-tight ${designConfig.headingPrimary}`}>
                  Clear Cache & Reset to Defaults
                </h3>
              </div>
            </div>

            {!isResetting && (
              <button
                onClick={onClose}
                className={`p-2 rounded-xl ${
                  designConfig.isLight
                    ? "hover:bg-black/5 text-zinc-500"
                    : "hover:bg-white/10 text-zinc-400"
                } transition-colors`}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Description */}
          <p className={`text-xs sm:text-sm font-medium ${designConfig.textSecondary} leading-relaxed`}>
            Clearing the cache will restore the application back to its complete default status and purge all stored data. Here is what will happen:
          </p>

          {/* Reset Action Details List */}
          <div className="space-y-2.5 text-xs">
            <div
              className={`p-3 rounded-2xl border ${
                designConfig.isLight
                  ? "bg-white border-[#eae5dc]"
                  : "bg-white/5 border-white/10"
              } flex items-start gap-3`}
            >
              <div className={`w-6 h-6 rounded-lg bg-[var(--accent-color,var(--primary))]/20 ${designConfig.accentText} text-[var(--accent-color,var(--primary))] flex items-center justify-center shrink-0 mt-0.5 font-bold`}>
                <Sliders className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className={`font-bold block ${designConfig.textPrimary}`}>Settings Returned to Default</span>
                <span className={`${designConfig.textMuted} text-[11px]`}>
                  Audio quality (High), crossfade (2s), volume normalization, and background playback reset to factory defaults.
                </span>
              </div>
            </div>

            <div
              className={`p-3 rounded-2xl border ${
                designConfig.isLight
                  ? "bg-white border-[#eae5dc]"
                  : "bg-white/5 border-white/10"
              } flex items-start gap-3`}
            >
              <div className={`w-6 h-6 rounded-lg bg-[var(--accent-color,var(--primary))]/20 ${designConfig.accentText} text-[var(--accent-color,var(--primary))] flex items-center justify-center shrink-0 mt-0.5 font-bold`}>
                <Layers className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className={`font-bold block ${designConfig.textPrimary}`}>App Design & Theme Reset</span>
                <span className={`${designConfig.textMuted} text-[11px]`}>
                  Selected theme resets to <strong>1. Designer (Ivory Canvas)</strong> with the floating ivory dock.
                </span>
              </div>
            </div>

            <div
              className={`p-3 rounded-2xl border ${
                designConfig.isLight
                  ? "bg-white border-[#eae5dc]"
                  : "bg-white/5 border-white/10"
              } flex items-start gap-3`}
            >
              <div className={`w-6 h-6 rounded-lg bg-[var(--accent-color,var(--primary))]/20 ${designConfig.accentText} text-[var(--accent-color,var(--primary))] flex items-center justify-center shrink-0 mt-0.5 font-bold`}>
                <Film className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className={`font-bold block ${designConfig.textPrimary}`}>Player Graphic Animation Reset</span>
                <span className={`${designConfig.textMuted} text-[11px]`}>
                  Visualizer resets to <strong>1. Ambient Zoom & Drift</strong> with default 6s cycle timing.
                </span>
              </div>
            </div>

            <div
              className={`p-3 rounded-2xl border ${
                designConfig.isLight
                  ? "bg-white border-[#eae5dc]"
                  : "bg-white/5 border-white/10"
              } flex items-start gap-3`}
            >
              <div className={`w-6 h-6 rounded-lg bg-[var(--accent-color,var(--primary))]/20 ${designConfig.accentText} text-[var(--accent-color,var(--primary))] flex items-center justify-center shrink-0 mt-0.5 font-bold`}>
                <Eye className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className={`font-bold block ${designConfig.textPrimary}`}>Show All Playlists (Unhide All)</span>
                <span className={`${designConfig.textMuted} text-[11px]`}>
                  Hidden playlist filters will be cleared so all playlists appear in your Library view.
                </span>
              </div>
            </div>

            <div
              className={`p-3 rounded-2xl border ${
                designConfig.isLight
                  ? "bg-white border-[#eae5dc]"
                  : "bg-white/5 border-white/10"
              } flex items-start gap-3`}
            >
              <div className="w-6 h-6 rounded-lg bg-red-500/20 text-red-600 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                <Trash2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className={`font-bold block ${designConfig.textPrimary}`}>Complete Cache & Artwork Purge</span>
                <span className={`${designConfig.textMuted} text-[11px]`}>
                  All browser storage, session storage, and server artwork caches will be cleared to re-fetch live custom covers.
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={isResetting}
              onClick={onClose}
              className={`w-full sm:w-auto px-5 py-3 rounded-2xl ${
                designConfig.isLight
                  ? "bg-zinc-200/80 hover:bg-zinc-300/80 text-zinc-800"
                  : "bg-white/10 hover:bg-white/15 text-white"
              } text-xs font-bold transition-all disabled:opacity-50`}
            >
              Cancel
            </button>

            <button
              id="confirm-app-reset-btn"
              type="button"
              disabled={isResetting}
              onClick={handleConfirm}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-extrabold shadow-lg hover:shadow-red-500/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isResetting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Clearing Cache & Resetting...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 text-white" />
                  <span>Clear Cache & Reset to Defaults</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
