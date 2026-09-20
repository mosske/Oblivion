import React, { useState, useEffect, useRef } from "react";
import { Sliders, RotateCcw, Volume2, Sparkles, Check, Play, Square } from "lucide-react";
import { FullAppDesignConfig } from "../utils/appDesignThemes";
import { EQ_FREQUENCIES, EQ_PRESETS } from "../utils/equalizerEngine";
import { useEqualizer } from "../context/EqualizerContext";
import { audioPlayer } from "../services/audioPlayer";

interface AudioEqualizerProps {
  designConfig: FullAppDesignConfig;
}

export const AudioEqualizer: React.FC<AudioEqualizerProps> = ({ designConfig }) => {
  const {
    eqState,
    filtersRef,
    audioCtxRef,
    setGain,
    setPreset,
    resetEQ,
    resumeAudioContext,
  } = useEqualizer();

  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const previewNodesRef = useRef<{ oscillators: OscillatorNode[]; gainNode: GainNode } | null>(null);

  // Clean up preview nodes on unmount
  useEffect(() => {
    return () => {
      stopPreviewTone();
    };
  }, []);

  const stopPreviewTone = () => {
    if (previewNodesRef.current) {
      try {
        previewNodesRef.current.oscillators.forEach((osc) => {
          try {
            osc.stop();
            osc.disconnect();
          } catch {}
        });
        previewNodesRef.current.gainNode.disconnect();
      } catch {}
      previewNodesRef.current = null;
    }
    setIsPreviewPlaying(false);
  };

  const togglePreviewTone = () => {
    if (isPreviewPlaying) {
      stopPreviewTone();
      return;
    }

    resumeAudioContext();
    const audioCtx = audioCtxRef.current;
    if (!audioCtx) return;

    try {
      if (audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {});
      }

      // Ensure filters are connected
      const firstFilter = filtersRef.current[0];
      if (!firstFilter) return;

      const masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.08, audioCtx.currentTime);

      // Create a rich harmonic chord (lows, mids, highs) to test all 7 bands
      const frequencies = [80, 240, 500, 1200, 3000, 7500];
      const oscillators: OscillatorNode[] = frequencies.map((freq, i) => {
        const osc = audioCtx.createOscillator();
        osc.type = i % 2 === 0 ? "sawtooth" : "triangle";
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

        const bandGain = audioCtx.createGain();
        bandGain.gain.setValueAtTime(1 / frequencies.length, audioCtx.currentTime);

        osc.connect(bandGain);
        bandGain.connect(masterGain);
        osc.start();
        return osc;
      });

      // Route through the head of the 7-band filter chain so all 7 filters sculpt the tone
      masterGain.connect(firstFilter);

      previewNodesRef.current = {
        oscillators,
        gainNode: masterGain,
      };
      setIsPreviewPlaying(true);
    } catch (err) {
      console.warn("Failed to start preview tone:", err);
    }
  };

  // 3. Live Slider Gain Updates:
  // Dynamically update the gain property of the respective filter node in real-time
  const handleSliderChange = (index: number, valStr: string) => {
    const newGainValue = parseFloat(valStr);
    setGain(index, newGainValue);
  };

  // 3. Ensure changing presets updates all 7 filterNode gains in real time
  const handlePresetSelect = (presetName: string) => {
    setPreset(presetName);
  };

  const handleReset = () => {
    resetEQ();
  };

  const formatFreq = (freq: number): string => {
    if (freq >= 1000) {
      const kVal = freq / 1000;
      return `${Number.isInteger(kVal) ? kVal : kVal.toFixed(1)}k`;
    }
    return `${freq}`;
  };

  const formatGain = (gain: number): string => {
    const rounded = Math.round(gain * 10) / 10;
    if (rounded > 0) return `+${rounded}`;
    return `${rounded}`;
  };

  return (
    <div className={`p-5 sm:p-6 rounded-3xl border ${designConfig.borderSubtle} ${designConfig.cardBg} shadow-md space-y-6 select-none`}>
      {/* Header bar: Title, Preview Audio Button, Preset Dropdown, Reset Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-black/5 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`p-1.5 rounded-xl ${designConfig.accentBg} ${designConfig.accentContrastText} shadow-sm`}
            >
              <Sliders className="w-4 h-4" />
            </span>
            <h3 className={`text-base font-bold ${designConfig.textPrimary} tracking-tight`}>
              7-Band Graphic Equalizer
            </h3>
          </div>
          <p className={`text-xs ${designConfig.textMuted} mt-0.5 font-medium`}>
            Precision Web Audio Biquad peaking filters (-12 dB to +12 dB) across 7 acoustic bands.
          </p>
        </div>

        {/* Audio Test Preview, Preset Selector & Reset Button */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          {/* Real-time sound test button */}
          <button
            type="button"
            onClick={togglePreviewTone}
            title={isPreviewPlaying ? "Stop EQ Sound Test" : "Test EQ with Real-Time Harmonic Sound"}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              isPreviewPlaying
                ? "bg-amber-500 text-black border-amber-400 shadow-md animate-pulse"
                : designConfig.isLight
                ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300"
                : "bg-white/10 hover:bg-white/20 text-white/90 border-white/10"
            }`}
          >
            {isPreviewPlaying ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Tone</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Sound Test</span>
              </>
            )}
          </button>

          {/* Preset Select Dropdown */}
          <div className="relative">
            <select
              value={eqState.preset}
              onChange={(e) => handlePresetSelect(e.target.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                designConfig.isLight
                  ? "bg-white border-zinc-300 text-zinc-900 shadow-sm"
                  : "bg-slate-900/90 border-slate-700 text-white shadow-inner"
              } focus:outline-none cursor-pointer pr-7`}
              style={{
                borderColor: eqState.preset !== "Flat" && eqState.preset !== "Custom" ? "var(--accent-primary)" : undefined,
              }}
            >
              {Object.keys(EQ_PRESETS).map((p) => (
                <option key={p} value={p} className={designConfig.isLight ? "text-zinc-900 bg-white" : "text-white bg-slate-900"}>
                  {p}
                </option>
              ))}
              {eqState.preset === "Custom" && (
                <option value="Custom" className={designConfig.isLight ? "text-zinc-900 bg-white" : "text-white bg-slate-900"}>
                  Custom
                </option>
              )}
            </select>
          </div>

          {/* Reset Button */}
          <button
            type="button"
            onClick={handleReset}
            title="Reset All Frequencies to 0 dB"
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              designConfig.isLight
                ? "bg-zinc-100 hover:bg-zinc-200/90 text-zinc-700 border-zinc-300"
                : "bg-white/10 hover:bg-white/20 text-white/90 border-white/10"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Vertical Slider Array */}
      <div className="grid grid-cols-7 gap-2 sm:gap-4 md:gap-6 pt-2 pb-2">
        {EQ_FREQUENCIES.map((freq, idx) => {
          const gain = eqState.gains[idx] ?? 0;
          const isBoosted = gain > 0.2;
          const isCut = gain < -0.2;

          return (
            <div key={freq} className="flex flex-col items-center">
              {/* Gain readout */}
              <div
                className={`text-[11px] font-mono font-bold px-1 py-0.5 rounded transition-all text-center min-w-[34px] ${
                  isBoosted
                    ? `${designConfig.accentText} font-extrabold`
                    : isCut
                    ? `${designConfig.textSecondary} opacity-75`
                    : designConfig.textMuted
                }`}
              >
                {formatGain(gain)}
                <span className="text-[9px] font-sans ml-0.5 opacity-60">dB</span>
              </div>

              {/* Vertical Slider Track Container */}
              <div className="relative h-44 sm:h-52 w-8 sm:w-10 flex items-center justify-center my-2">
                {/* 0 dB Center Zero Marker Guide */}
                <div className="absolute w-full h-[1px] bg-black/15 dark:bg-white/15 pointer-events-none top-1/2 -translate-y-1/2 z-0" />

                {/* Subdued dB ticks (+6dB, -6dB) */}
                <div className="absolute w-2/3 h-[1px] bg-black/5 dark:bg-white/5 pointer-events-none top-1/4 -translate-y-1/2 z-0" />
                <div className="absolute w-2/3 h-[1px] bg-black/5 dark:bg-white/5 pointer-events-none top-3/4 -translate-y-1/2 z-0" />

                {/* Vertical Range Slider */}
                <input
                  type="range"
                  min={-12}
                  max={12}
                  step={0.5}
                  value={gain}
                  onChange={(e) => handleSliderChange(idx, e.target.value)}
                  style={{
                    accentColor: "var(--accent-primary)",
                  }}
                  className="eq-vertical-slider w-40 sm:w-48 h-2.5 bg-zinc-200/80 dark:bg-slate-700/60 rounded-full appearance-none cursor-pointer transform -rotate-90 origin-center transition-all z-10"
                />
              </div>

              {/* Frequency Label */}
              <div className="text-center mt-1">
                <span className={`text-[11px] sm:text-xs font-bold font-mono ${designConfig.textPrimary} block`}>
                  {formatFreq(freq)}
                </span>
                <span className={`text-[9px] ${designConfig.textMuted} font-semibold uppercase tracking-wider block`}>
                  Hz
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preset Quick Chips Bar */}
      <div className="pt-3 border-t border-black/5 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
        <span className={`text-[11px] font-bold uppercase tracking-wider ${designConfig.textMuted}`}>
          Sound Profile Presets:
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {Object.keys(EQ_PRESETS).map((presetKey) => {
            const isActive = eqState.preset === presetKey;
            return (
              <button
                key={presetKey}
                type="button"
                onClick={() => handlePresetSelect(presetKey)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all border flex items-center gap-1 ${
                  isActive
                    ? `${designConfig.btnPrimary} shadow-sm border-transparent`
                    : `${designConfig.pillBg} ${designConfig.textSecondary} hover:${designConfig.textPrimary} border-transparent`
                }`}
              >
                {isActive && <Check className="w-3 h-3" />}
                <span>{presetKey}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
