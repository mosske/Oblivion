import React, { useState, useEffect, useRef } from "react";
import { Check, Copy, ClipboardPaste, RotateCcw, Sparkles, X, Palette, Sliders } from "lucide-react";
import { getBespokeColors, saveBespokeColors, DEFAULT_BESPOKE_COLORS } from "../utils/appDesignThemes";
import { hexToHwb, hwbToHex } from "../theme/colorUtils";

interface BespokeColorPickerProps {
  /** Optional custom trigger render or default inline 4-color dots with code badge */
  className?: string;
  /** Whether to show a compact row suitable for card footers */
  compact?: boolean;
  /** Callback fired whenever colors are updated */
  onColorsChange?: (colors: [string, string, string, string]) => void;
}

const COLOR_SLOT_LABELS = [
  { index: 0, title: "Canvas Base", description: "Background void & deep glass tint" },
  { index: 1, title: "Primary Accent", description: "Main buttons, glowing orbs & aura" },
  { index: 2, title: "Secondary Accent", description: "Fluid midtone gradients & secondary glows" },
  { index: 3, title: "Highlight / Neon Rim", description: "Sliders, specular rims & spectrum accents" },
];

// 24 Curated vibrant glass & neon gradient color swatches
const CURATED_SWATCHES = [
  "#0a0d1a", "#0c071e", "#180e29", "#061a14", "#170d06", "#1e0b36",
  "#ff007f", "#ff1493", "#ec4899", "#f43f5e", "#ef4444", "#ff7b00",
  "#f59e0b", "#eab308", "#84cc16", "#10b981", "#06b6d4", "#00f0ff",
  "#38bdf8", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
];

// Curated full 4-color theme presets
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

// Helper: Normalize hex string (#abc -> #aabbcc, etc.)
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

// Convert HSL to Hex
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

// Convert Hex to HSL
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

export const BespokeColorPicker: React.FC<BespokeColorPickerProps> = ({
  className = "",
  compact = true,
  onColorsChange,
}) => {
  const [colors, setColors] = useState<[string, string, string, string]>(() => getBespokeColors());
  const [activeSlot, setActiveSlot] = useState<number>(1); // Default to Primary Accent (most fun to change)
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const [inputHex, setInputHex] = useState<string>("");
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [saveIndicator, setSaveIndicator] = useState<boolean>(false);

  // Hue & Lightness state for the interactive 2D gradient swatch
  const [hue, setHue] = useState<number>(330);
  const [sat, setSat] = useState<number>(100);
  const [light, setLight] = useState<number>(50);
  const [whiteLevel, setWhiteLevel] = useState<number>(0);
  const [blackLevel, setBlackLevel] = useState<number>(0);

  const popoverRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // Synchronize on mount and whenever external events update custom colors
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

  // Update input text and HSL/HWB when activeSlot or color changes
  useEffect(() => {
    const currentColor = colors[activeSlot] || "#FF007F";
    setInputHex(currentColor.toUpperCase());
    const hwb = hexToHwb(currentColor);
    setHue(hwb.h);
    setWhiteLevel(hwb.w);
    setBlackLevel(hwb.b);
    const hsl = hexToHsl(currentColor);
    setSat(hsl.s);
    setLight(hsl.l);
  }, [activeSlot, colors]);

  // Click outside to close popover
  useEffect(() => {
    if (!isPickerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isPickerOpen]);

  // Apply a new color to the currently active slot and save locally
  const applyColor = (hex: string, customHue?: number, customWhite?: number, customBlack?: number) => {
    const valid = normalizeHex(hex);
    if (!valid) return;

    const updated: [string, string, string, string] = [...colors];
    updated[activeSlot] = valid;

    setColors(updated);
    setInputHex(valid);
    if (customHue !== undefined) setHue(customHue);
    if (customWhite !== undefined) setWhiteLevel(customWhite);
    if (customBlack !== undefined) setBlackLevel(customBlack);

    saveBespokeColors(updated);
    onColorsChange?.(updated);

    // Show temporary "Saved" feedback
    setSaveIndicator(true);
    setTimeout(() => setSaveIndicator(false), 1200);
  };

  const handleHueChange = (newHue: number) => {
    setHue(newHue);
    const newHex = hwbToHex(newHue, whiteLevel, blackLevel);
    applyColor(newHex, newHue, whiteLevel, blackLevel);
  };

  const handleWhiteLevelChange = (newWhite: number) => {
    const clamped = Math.max(0, Math.min(100, newWhite));
    setWhiteLevel(clamped);
    const newHex = hwbToHex(hue, clamped, blackLevel);
    applyColor(newHex, hue, clamped, blackLevel);
  };

  const handleBlackLevelChange = (newBlack: number) => {
    const clamped = Math.max(0, Math.min(100, newBlack));
    setBlackLevel(clamped);
    const newHex = hwbToHex(hue, whiteLevel, clamped);
    applyColor(newHex, hue, whiteLevel, clamped);
  };

  const updateFrom2DCanvas = (e: React.PointerEvent<HTMLDivElement> | PointerEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const val = 1 - y;
    const satFrac = x;
    const newWhite = Math.round(val * (1 - satFrac) * 100);
    const newBlack = Math.round((1 - val) * 100);

    setWhiteLevel(newWhite);
    setBlackLevel(newBlack);
    setSat(Math.round(satFrac * 100));
    setLight(Math.round(val * (1 - satFrac / 2) * 100));

    const newHex = hwbToHex(hue, newWhite, newBlack);
    applyColor(newHex, hue, newWhite, newBlack);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
    updateFrom2DCanvas(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    e.preventDefault();
    e.stopPropagation();
    updateFrom2DCanvas(e);
  };

  // Handle typing or pasting hex directly
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    if (raw && !raw.startsWith("#")) raw = `#${raw}`;
    setInputHex(raw.toUpperCase());

    const valid = normalizeHex(raw);
    if (valid) {
      const hwb = hexToHwb(valid);
      applyColor(valid, hwb.h, hwb.w, hwb.b);
      const hsl = hexToHsl(valid);
      setSat(hsl.s);
      setLight(hsl.l);
    }
  };

  // Paste from clipboard
  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        const valid = normalizeHex(text);
        if (valid) {
          const hwb = hexToHwb(valid);
          applyColor(valid, hwb.h, hwb.w, hwb.b);
          const hsl = hexToHsl(valid);
          setSat(hsl.s);
          setLight(hsl.l);
        }
      }
    } catch (err) {
      console.debug("Clipboard read prevented:", err);
    }
  };

  // Copy active color code
  const handleCopy = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(colors[activeSlot]);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1500);
    }
  };

  // Reset to default 4 colors
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

  // Apply a full preset
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
    <div className={`relative ${className}`} ref={popoverRef}>
      {/* 4 Interactive Swatch Dots + Active Color Code Display */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/25 border border-white/10 backdrop-blur-md">
          {colors.map((color, idx) => {
            const isCurrent = activeSlot === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSlot(idx);
                  setIsPickerOpen(true);
                }}
                className={`relative group rounded-full transition-all duration-200 focus:outline-none ${
                  compact ? "w-4 h-4 sm:w-5 sm:h-5" : "w-6 h-6"
                }`}
                title={`Color ${idx + 1} (${COLOR_SLOT_LABELS[idx].title}): ${color}. Click to change.`}
              >
                {/* Color Dot */}
                <span
                  className="block w-full h-full rounded-full border border-white/30 shadow-inner group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                />

                {/* Active Ring Marker */}
                {isCurrent && (
                  <span className="absolute -inset-0.5 rounded-full ring-2 ring-white shadow-[0_0_10px_rgba(255,255,255,0.8)] pointer-events-none" />
                )}
              </button>
            );
          })}
        </div>

        {/* Display the active color code next to the 4 colors */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsPickerOpen((prev) => !prev);
          }}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/40 hover:bg-black/60 border border-white/15 text-[11px] font-mono font-bold text-white shadow-sm transition-all group"
          title="Click to open gradient swatch color picker"
        >
          <span
            className="w-2.5 h-2.5 rounded-full border border-white/40 shrink-0"
            style={{ backgroundColor: colors[activeSlot] }}
          />
          <span>{colors[activeSlot]}</span>
          <Palette className="w-3 h-3 text-pink-400 group-hover:rotate-12 transition-transform ml-0.5" />
        </button>
      </div>

      {/* GRADIENT SWATCH & DIRECT HEX INPUT POPOVER */}
      {isPickerOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 bottom-full left-0 mb-2 w-[310px] sm:w-[350px] p-4 rounded-2xl bg-[#0e1022]/95 border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_30px_rgba(255,0,127,0.25)] backdrop-blur-2xl text-white select-none animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
            <div className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded-full border border-white/40 shadow-sm"
                style={{ backgroundColor: colors[activeSlot] }}
              />
              <span className="text-xs font-bold tracking-wide uppercase text-white/90">
                {COLOR_SLOT_LABELS[activeSlot].title}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {saveIndicator && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                  <Check className="w-3 h-3 stroke-[3]" /> Saved
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 4 Color Slot Tabs (Switch between the 4 colors anytime) */}
          <div className="grid grid-cols-4 gap-1.5 mb-3 p-1 rounded-xl bg-black/40 border border-white/10">
            {COLOR_SLOT_LABELS.map((slot) => {
              const isSelected = activeSlot === slot.index;
              const slotColor = colors[slot.index];
              return (
                <button
                  key={slot.index}
                  type="button"
                  onClick={() => setActiveSlot(slot.index)}
                  className={`flex flex-col items-center py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all ${
                    isSelected
                      ? "bg-white/20 text-white shadow-sm ring-1 ring-white/50"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                  title={slot.description}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-white/30 mb-1"
                    style={{ backgroundColor: slotColor }}
                  />
                  <span className="truncate w-full text-center">C{slot.index + 1}</span>
                </button>
              );
            })}
          </div>

          {/* 1. INTERACTIVE GRADIENT SWATCH (2D Palette Canvas / Area) */}
          <div className="mb-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-medium text-white/70">
              <span className="flex items-center gap-1 font-bold text-pink-400">
                <Palette className="w-3.5 h-3.5" /> Interactive Gradient Swatch
              </span>
              <span className="font-mono text-[10px] text-white/50">
                Hue {hue}° • White {whiteLevel}% • Black {blackLevel}%
              </span>
            </div>

            {/* 2D Interactive Spectrum Field: blends pure Hue with White (left) and Black (bottom) */}
            {(() => {
              const curVal = 1 - Math.max(0, Math.min(100, blackLevel)) / 100;
              const curSatFrac =
                curVal > 0.001
                  ? Math.max(0, Math.min(1, 1 - Math.max(0, Math.min(100, whiteLevel)) / 100 / curVal))
                  : 0;
              const cursorLeft = Math.round(curSatFrac * 100);
              const cursorTop = Math.round((1 - curVal) * 100);

              return (
                <div
                  ref={canvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  className="relative w-full h-24 rounded-xl cursor-crosshair border border-white/20 shadow-inner overflow-hidden select-none touch-none"
                  style={{
                    backgroundColor: `hsl(${hue}, 100%, 50%)`,
                    backgroundImage:
                      "linear-gradient(to top, #000 0%, transparent 100%), linear-gradient(to right, #fff 0%, transparent 100%)",
                  }}
                  title="Drag or tap to adjust White (horizontal) and Black (vertical) levels interactively"
                >
                  {/* Target Pip Cursor */}
                  <div
                    className="absolute w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_4px_rgba(0,0,0,0.8)] pointer-events-none transition-transform"
                    style={{
                      left: `${cursorLeft}%`,
                      top: `${cursorTop}%`,
                      backgroundColor: colors[activeSlot],
                    }}
                  />
                  <div className="absolute top-1 left-2 text-[8px] font-mono text-black/60 font-bold pointer-events-none">
                    WHITE
                  </div>
                  <div className="absolute top-1 right-2 text-[8px] font-mono text-white/80 font-bold pointer-events-none">
                    HUE
                  </div>
                  <div className="absolute bottom-1 left-2 text-[8px] font-mono text-white/50 font-bold pointer-events-none">
                    BLACK
                  </div>
                </div>
              );
            })()}

            {/* Rainbow Hue Gradient Slider Track */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                <span>HUE SPECTRUM ({hue}°)</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                value={hue}
                onChange={(e) => handleHueChange(parseInt(e.target.value, 10))}
                className="w-full h-2.5 rounded-lg appearance-none cursor-pointer border border-white/20 focus:outline-none"
                style={{
                  background:
                    "linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)",
                }}
                title="Slide to adjust Hue spectrum"
              />
            </div>

            {/* Black & White Levels Sliders */}
            <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-black/40 border border-white/10">
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-mono text-white/80">
                  <span>WHITE (TINT)</span>
                  <span className="font-bold">{whiteLevel}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={whiteLevel}
                  onChange={(e) => handleWhiteLevelChange(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 rounded-lg cursor-pointer appearance-none border border-white/20 focus:outline-none"
                  style={{
                    background: `linear-gradient(to right, ${hwbToHex(hue, 0, blackLevel)}, #FFFFFF)`,
                  }}
                  title="Adjust White Level"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-mono text-white/80">
                  <span>BLACK (SHADE)</span>
                  <span className="font-bold">{blackLevel}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={blackLevel}
                  onChange={(e) => handleBlackLevelChange(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 rounded-lg cursor-pointer appearance-none border border-white/20 focus:outline-none"
                  style={{
                    background: `linear-gradient(to right, ${hwbToHex(hue, whiteLevel, 0)}, #000000)`,
                  }}
                  title="Adjust Black Level"
                />
              </div>
            </div>
          </div>

          {/* 2. DIRECT HEX CODE KEY-IN / PASTE INPUT */}
          <div className="mb-3">
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

              {/* Paste Button */}
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white/80 hover:text-white text-xs font-semibold flex items-center gap-1 transition-all active:scale-95"
                title="Paste hex color from clipboard"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span className="text-[10px]">Paste</span>
              </button>

              {/* Copy Button */}
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

          {/* 3. CURATED QUICK-PICK COLOR SWATCHES */}
          <div className="mb-3">
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
                  className={`w-6 h-6 rounded-lg border border-white/20 hover:scale-115 hover:z-10 transition-transform shadow-sm ${
                    colors[activeSlot].toUpperCase() === swatch.toUpperCase()
                      ? "ring-2 ring-white scale-110"
                      : ""
                  }`}
                  style={{ backgroundColor: swatch }}
                  title={swatch}
                />
              ))}
            </div>
          </div>

          {/* 4. CURATED FULL PALETTES & RESET ACTION */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-[210px] no-scrollbar">
              <span className="text-[9px] text-white/50 shrink-0 mr-0.5">Presets:</span>
              {BESPOKE_PRESETS.slice(0, 3).map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplyPreset(p.colors)}
                  className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[9px] text-white/80 truncate shrink-0 transition-colors"
                  title={`Apply full palette: ${p.name}`}
                >
                  {p.name.split(" ")[0]}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              title="Reset all 4 colors to default Bespoke palette"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
