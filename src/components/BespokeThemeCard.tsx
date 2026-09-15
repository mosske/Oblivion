import React, { useState, useEffect, useRef } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ClipboardPaste,
  RotateCcw,
  Palette,
  Sliders,
  Sparkles,
} from "lucide-react";
import {
  FullAppDesignConfig,
  getBespokeColors,
  saveBespokeColors,
  DEFAULT_BESPOKE_COLORS,
  FULL_APP_DESIGNS_LIST,
} from "../utils/appDesignThemes";

export interface BespokeThemeCardProps {
  isSelected: boolean;
  onSelect: () => void;
  designConfig: FullAppDesignConfig;
  onColorsChange?: (colors: [string, string, string, string]) => void;
  className?: string;
}

const COLOR_SLOT_LABELS = [
  { index: 0, title: "Canvas Base", shortTitle: "Color 1", description: "Background void & deep glass tint" },
  { index: 1, title: "Primary Accent", shortTitle: "Color 2", description: "Main buttons, glowing orbs & aura" },
  { index: 2, title: "Secondary Accent", shortTitle: "Color 3", description: "Fluid midtone gradients & secondary glows" },
  { index: 3, title: "Highlight / Neon", shortTitle: "Color 4", description: "Sliders, specular rims & spectrum accents" },
];

const CURATED_SWATCHES = [
  "#0a0d1a", "#0c071e", "#180e29", "#061a14", "#170d06", "#1e0b36",
  "#ff007f", "#ff1493", "#ec4899", "#f43f5e", "#ef4444", "#ff7b00",
  "#f59e0b", "#eab308", "#84cc16", "#10b981", "#06b6d4", "#00f0ff",
  "#38bdf8", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
];

const BESPOKE_PRESETS: { name: string; colors: [string, string, string, string] }[] = [
  {
    name: "Cosmic Magenta & Cyan",
    colors: ["#0a0d1a", "#ff007f", "#8b5cf6", "#00f0ff"],
  },
  {
    name: "Sunset Ember & Gold",
    colors: ["#14080a", "#ff4500", "#ff8c00", "#ffd700"],
  },
  {
    name: "Electric Emerald & Mint",
    colors: ["#04140e", "#10b981", "#06b6d4", "#a7f3d0"],
  },
  {
    name: "Ultra Violet & Orchid",
    colors: ["#0f071d", "#c026d3", "#7c3aed", "#38bdf8"],
  },
  {
    name: "Arctic Blue & Neon Teal",
    colors: ["#05111d", "#0284c7", "#06b6d4", "#67e8f9"],
  },
  {
    name: "Tokyo Cyberpunk",
    colors: ["#080914", "#ff0055", "#7000ff", "#00ffff"],
  },
];

function normalizeHex(input: string): string | null {
  let val = input.trim();
  if (val.startsWith("#")) val = val.substring(1);
  if (val.length === 3) {
    val = val.split("").map((c) => c + c).join("");
  }
  if (/^[0-9a-fA-F]{6}$/.test(val)) {
    return `#${val.toUpperCase()}`;
  }
  return null;
}

function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let clean = hex.replace("#", "");
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  const r = (parseInt(clean.substring(0, 2), 16) || 0) / 255;
  const g = (parseInt(clean.substring(2, 4), 16) || 0) / 255;
  const b = (parseInt(clean.substring(4, 6), 16) || 0) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export const BespokeThemeCard: React.FC<BespokeThemeCardProps> = ({
  isSelected,
  onSelect,
  designConfig,
  onColorsChange,
  className = "",
}) => {
  const [colors, setColors] = useState<[string, string, string, string]>(() => getBespokeColors());
  const [activeSlot, setActiveSlot] = useState<number>(1); // Default to Color 2 (Primary Accent)
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [inputHex, setInputHex] = useState<string>("");
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [saveIndicator, setSaveIndicator] = useState<boolean>(false);

  // 2D Swatch Hue & Sat/Light
  const [hue, setHue] = useState<number>(330);
  const [sat, setSat] = useState<number>(100);
  const [light, setLight] = useState<number>(50);

  // Keep colors in sync with localStorage and external events
  useEffect(() => {
    const current = getBespokeColors();
    setColors(current);

    const handleUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail) && e.detail.length >= 4) {
        setColors([e.detail[0], e.detail[1], e.detail[2], e.detail[3]]);
      }
    };
    window.addEventListener("oblivion_bespoke_colors_updated", handleUpdate);
    return () => window.removeEventListener("oblivion_bespoke_colors_updated", handleUpdate);
  }, []);

  // Update input text and HSL values when slot or colors change
  useEffect(() => {
    const currentColor = colors[activeSlot] || "#FF007F";
    setInputHex(currentColor.toUpperCase());
    const hsl = hexToHsl(currentColor);
    setHue(hsl.h);
    setSat(hsl.s);
    setLight(hsl.l);
  }, [activeSlot, colors]);

  const applyColor = (hex: string) => {
    const valid = normalizeHex(hex);
    if (!valid) return;

    const updated: [string, string, string, string] = [...colors];
    updated[activeSlot] = valid;

    setColors(updated);
    setInputHex(valid);
    saveBespokeColors(updated);
    onColorsChange?.(updated);

    setSaveIndicator(true);
    setTimeout(() => setSaveIndicator(false), 1200);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    if (raw && !raw.startsWith("#")) raw = `#${raw}`;
    setInputHex(raw.toUpperCase());

    const valid = normalizeHex(raw);
    if (valid) {
      applyColor(valid);
      const hsl = hexToHsl(valid);
      setHue(hsl.h);
      setSat(hsl.s);
      setLight(hsl.l);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        const valid = normalizeHex(text);
        if (valid) {
          applyColor(valid);
          const hsl = hexToHsl(valid);
          setHue(hsl.h);
          setSat(hsl.s);
          setLight(hsl.l);
        }
      }
    } catch (err) {
      console.debug("Clipboard paste error:", err);
    }
  };

  const handleCopy = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(colors[activeSlot]);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1500);
    }
  };

  const handleResetDefaults = () => {
    setColors([...DEFAULT_BESPOKE_COLORS]);
    saveBespokeColors([...DEFAULT_BESPOKE_COLORS]);
    onColorsChange?.([...DEFAULT_BESPOKE_COLORS]);
    const hsl = hexToHsl(DEFAULT_BESPOKE_COLORS[activeSlot]);
    setHue(hsl.h);
    setSat(hsl.s);
    setLight(hsl.l);
    setInputHex(DEFAULT_BESPOKE_COLORS[activeSlot]);
  };

  const handleApplyPreset = (presetColors: [string, string, string, string]) => {
    setColors(presetColors);
    saveBespokeColors(presetColors);
    onColorsChange?.(presetColors);
    setInputHex(presetColors[activeSlot]);
    const hsl = hexToHsl(presetColors[activeSlot]);
    setHue(hsl.h);
    setSat(hsl.s);
    setLight(hsl.l);
  };

  return (
    <div
      role="region"
      aria-label="Bespoke Theme Card"
      onClick={onSelect}
      className={`p-5 rounded-2xl border text-left flex flex-col justify-between transition-all duration-300 relative overflow-hidden group ${
        isSelected
          ? `bg-white/95 shadow-lg scale-[1.01]`
          : `bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 shadow-sm`
      } ${className}`}
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
            color: "var(--accent-contrast-text, #ffffff)",
          }}
        >
          <Check className="w-3 h-3 stroke-[3]" style={{ color: "var(--accent-contrast-text, #ffffff)" }} />
          <span>ACTIVE</span>
        </div>
      )}

      {/* Top Header & Info */}
      <div>
        {/* [ BESPOKE 10 / 10 ] */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-200/90 text-zinc-900 font-bold border border-zinc-300">
            {designConfig.badge || "BESPOKE"}
          </span>
          <span className="text-[10px] font-mono text-zinc-600 font-semibold">
            {designConfig.num || "10"} / {String(FULL_APP_DESIGNS_LIST.length).padStart(2, "0")}
          </span>
        </div>

        {/* Title & Subtitle */}
        <h4 className="text-base font-bold text-zinc-900 mb-1">{designConfig.name}</h4>
        <p className="text-xs text-zinc-800 font-medium mb-2 leading-snug">{designConfig.subtitle}</p>

        {/* Description */}
        <p className="text-[11px] text-zinc-600 leading-relaxed mb-3 font-normal">
          {designConfig.description}
        </p>

        {/* Features / Highlights */}
        <div className="space-y-1 text-[11px] text-zinc-700 mb-4 font-medium">
          {designConfig.features.slice(0, 2).map((feat, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: colors[idx + 1] || "#ff007f" }}
              />
              <span className="truncate">{feat}</span>
            </div>
          ))}
        </div>

        {/* ─── 4-Color Palette Customizer ──────────────────────────── */}
        <div className="relative my-3" onClick={(e) => e.stopPropagation()}>
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-zinc-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-2.5 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
              4-Color Palette Customizer
            </span>
          </div>
        </div>

        {/* Explanatory Caption */}
        <p
          className="text-[11px] text-zinc-600 mb-2 font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          Click any color to adjust gradient swatches, hex codes, or paste custom colors:
        </p>

        {/* Controls: [ Color 1 ] [ Color 2 ] [ Color 3 ] [ Color 4 ]   [ #HEX Code ] */}
        <div
          className="flex items-center justify-between gap-2 flex-wrap mb-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-100 border border-zinc-200 shadow-inner">
            {COLOR_SLOT_LABELS.map((slot) => {
              const isCurrent = activeSlot === slot.index;
              const slotColor = colors[slot.index];

              return (
                <button
                  key={slot.index}
                  type="button"
                  onClick={() => {
                    setActiveSlot(slot.index);
                    setIsExpanded(true);
                  }}
                  className="relative group rounded-full transition-all focus:outline-none w-6 h-6 sm:w-7 sm:h-7"
                  title={`${slot.shortTitle} (${slot.title}): ${slotColor}. Click to customize.`}
                >
                  <span
                    className="block w-full h-full rounded-full border border-black/15 shadow-sm group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: slotColor }}
                  />
                  {isCurrent && (
                    <span className="absolute -inset-0.5 rounded-full ring-2 ring-zinc-900 shadow-sm pointer-events-none" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Hex Code + Expand Toggle Button */}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-xs font-mono font-bold text-zinc-900 shadow-sm transition-all"
            title="Click to expand or collapse 4-color gradient swatch customizer"
          >
            <span
              className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
              style={{ backgroundColor: colors[activeSlot] }}
            />
            <span>{colors[activeSlot]}</span>
            <Sliders className="w-3.5 h-3.5 text-zinc-500 ml-0.5" />
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            )}
          </button>
        </div>

        {/* SEAMLESSLY EMBEDDED EXPANDABLE COLOR CUSTOMIZER */}
        {isExpanded && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="mt-3 p-4 rounded-2xl bg-zinc-900 text-white border border-zinc-800 shadow-xl space-y-3.5 animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Slot Tabs */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm"
                  style={{ backgroundColor: colors[activeSlot] }}
                />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  {COLOR_SLOT_LABELS[activeSlot].title}
                </span>
              </div>
              {saveIndicator && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                  <Check className="w-3.5 h-3.5 stroke-[3]" /> Saved
                </span>
              )}
            </div>

            {/* 4 Tabs */}
            <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10">
              {COLOR_SLOT_LABELS.map((slot) => {
                const isCurrent = activeSlot === slot.index;
                return (
                  <button
                    key={slot.index}
                    type="button"
                    onClick={() => setActiveSlot(slot.index)}
                    className={`flex flex-col items-center py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all ${
                      isCurrent
                        ? "bg-white/20 text-white shadow-sm ring-1 ring-white/50"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-white/30 mb-1"
                      style={{ backgroundColor: colors[slot.index] }}
                    />
                    <span className="truncate w-full text-center">C{slot.index + 1}</span>
                  </button>
                );
              })}
            </div>

            {/* 2D Gradient Swatch */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-white/70 font-medium">
                <span className="flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-pink-400" /> Gradient Swatch
                </span>
                <span className="font-mono text-[10px] text-white/50">Hue {hue}° • Light {light}%</span>
              </div>

              <div
                className="relative w-full h-24 rounded-xl cursor-crosshair border border-white/20 shadow-inner overflow-hidden"
                style={{
                  backgroundColor: `hsl(${hue}, 100%, 50%)`,
                  backgroundImage:
                    "linear-gradient(to right, #fff, transparent), linear-gradient(to top, #000, transparent)",
                }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
                  const newSat = Math.round(x * 100);
                  const newLight = Math.round((1 - y) * 100 * (1 - x * 0.5));
                  setSat(newSat);
                  setLight(newLight);
                  const hex = hslToHex(hue, newSat, newLight);
                  applyColor(hex);
                }}
              >
                <div
                  className="absolute w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_4px_rgba(0,0,0,0.8)] pointer-events-none"
                  style={{
                    left: `${sat}%`,
                    top: `${100 - light}%`,
                    backgroundColor: colors[activeSlot],
                  }}
                />
              </div>

              {/* Rainbow Hue Slider */}
              <input
                type="range"
                min="0"
                max="360"
                value={hue}
                onChange={(e) => {
                  const newHue = parseInt(e.target.value, 10);
                  setHue(newHue);
                  const hex = hslToHex(newHue, sat, light);
                  applyColor(hex);
                }}
                className="w-full h-3 rounded-lg appearance-none cursor-pointer border border-white/20 focus:outline-none"
                style={{
                  background:
                    "linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)",
                }}
                title="Slide to adjust Hue spectrum"
              />
            </div>

            {/* Direct Hex Key-in / Paste / Copy */}
            <div>
              <label className="block text-[11px] font-medium text-white/70 mb-1">
                Direct Color Code (Key in or Paste):
              </label>
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1 flex items-center">
                  <span
                    className="absolute left-2.5 w-3.5 h-3.5 rounded-full border border-white/30 shrink-0"
                    style={{ backgroundColor: colors[activeSlot] }}
                  />
                  <input
                    type="text"
                    value={inputHex}
                    onChange={handleInputChange}
                    placeholder="#FF007F"
                    maxLength={7}
                    className="w-full pl-8 pr-2 py-1.5 rounded-xl bg-black/50 border border-white/20 text-white font-mono font-bold text-xs focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 tracking-wider uppercase transition-colors"
                  />
                </div>

                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white/80 hover:text-white text-xs font-semibold flex items-center gap-1 transition-all active:scale-95"
                  title="Paste hex color from clipboard"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Paste</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white/80 hover:text-white text-xs transition-all active:scale-95"
                  title="Copy active hex code"
                >
                  {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Quick Vibrant Swatches */}
            <div>
              <span className="block text-[10px] font-bold text-white/60 uppercase tracking-wider mb-1.5">
                Quick Vibrant Swatches
              </span>
              <div className="grid grid-cols-8 gap-1.5">
                {CURATED_SWATCHES.map((swatch, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      applyColor(swatch);
                      const hsl = hexToHsl(swatch);
                      setHue(hsl.h);
                      setSat(hsl.s);
                      setLight(hsl.l);
                    }}
                    className={`w-6 h-6 rounded-lg border border-white/20 hover:scale-115 transition-transform shadow-sm ${
                      colors[activeSlot].toUpperCase() === swatch.toUpperCase() ? "ring-2 ring-white scale-110" : ""
                    }`}
                    style={{ backgroundColor: swatch }}
                    title={swatch}
                  />
                ))}
              </div>
            </div>

            {/* Presets & Reset & Collapse */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-[200px] no-scrollbar">
                <span className="text-[9px] text-white/50 shrink-0 mr-0.5">Presets:</span>
                {BESPOKE_PRESETS.slice(0, 3).map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleApplyPreset(p.colors)}
                    className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[9px] text-white/80 truncate shrink-0 transition-colors"
                    title={`Apply: ${p.name}`}
                  >
                    {p.name.split(" ")[0]}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                  title="Reset to default Bespoke palette"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="px-2.5 py-1 rounded-lg bg-pink-600 hover:bg-pink-500 text-[10px] font-bold text-white transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selection Status Footer - NO duplicate color dots or hex badge! */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-200 mt-3">
        <span className="text-[11px] text-zinc-500 font-medium">
          {isSelected ? "Active full app archetype" : "Tap to activate theme"}
        </span>

        <span
          className={`text-[10px] font-bold uppercase tracking-wider ${
            isSelected ? "font-mono font-black" : "text-zinc-600 group-hover:text-zinc-900"
          }`}
          style={isSelected ? { color: "var(--accent-primary)" } : undefined}
        >
          {isSelected ? "● Live On App" : "Apply Design →"}
        </span>
      </div>
    </div>
  );
};
