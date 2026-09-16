import React, { useState, useEffect } from "react";
import {
  Check,
  RotateCcw,
  SunMoon,
  Copy,
  ClipboardPaste,
  X,
} from "lucide-react";
import {
  FullAppDesignConfig,
  FULL_APP_DESIGNS_LIST,
} from "../utils/appDesignThemes";
import {
  getBespokeConfig,
  saveBespokeConfig,
  DEFAULT_BESPOKE_COLORS,
} from "../theme/themeService";
import {
  calculateWcagText,
  normalizeHex,
  hexToHsl,
  hslToHex,
} from "../theme/colorUtils";

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

export const BespokeThemeCard: React.FC<BespokeThemeCardProps> = ({
  isSelected,
  onSelect,
  designConfig,
  onColorsChange,
  className = "",
}) => {
  const initialConfig = getBespokeConfig();
  const [colors, setColors] = useState<[string, string, string, string]>(() => initialConfig.colors);
  const [contrastMode, setContrastMode] = useState<"auto" | "manual">(() => initialConfig.mode || "auto");
  const [manualTextOnAccent, setManualTextOnAccent] = useState<string>(() => initialConfig.textOnAccent || "#FFFFFF");
  const [manualTextOffAccent, setManualTextOffAccent] = useState<string>(() => initialConfig.textOffAccent || "#FFFFFF");
  const [manualTextPrimary, setManualTextPrimary] = useState<string>(() => initialConfig.textPrimary || "#FFFFFF");

  const [activeSlot, setActiveSlot] = useState<number>(1); // Default to Color 2 (Primary Accent)
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [inputHex, setInputHex] = useState<string>("");

  // 2D Swatch Hue & Sat/Light
  const [hue, setHue] = useState<number>(330);
  const [sat, setSat] = useState<number>(100);
  const [light, setLight] = useState<number>(50);

  // Keep state in sync with localStorage and external events
  useEffect(() => {
    const current = getBespokeConfig();
    setColors(current.colors);
    setContrastMode(current.mode);
    if (current.textOnAccent) setManualTextOnAccent(current.textOnAccent);
    if (current.textOffAccent) setManualTextOffAccent(current.textOffAccent);
    if (current.textPrimary) setManualTextPrimary(current.textPrimary);

    const handleUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail) && e.detail.length >= 4) {
        setColors([e.detail[0], e.detail[1], e.detail[2], e.detail[3]]);
      } else if (e.detail && typeof e.detail === "object") {
        const d = e.detail;
        if (Array.isArray(d.colors) && d.colors.length >= 4) {
          setColors([d.colors[0], d.colors[1], d.colors[2], d.colors[3]]);
        }
        if (d.mode) setContrastMode(d.mode);
        if (d.textOnAccent) setManualTextOnAccent(d.textOnAccent);
        if (d.textOffAccent) setManualTextOffAccent(d.textOffAccent);
        if (d.textPrimary) setManualTextPrimary(d.textPrimary);
      }
    };

    window.addEventListener("oblivion_bespoke_colors_updated", handleUpdate);
    window.addEventListener("oblivion_bespoke_config_updated", handleUpdate);
    return () => {
      window.removeEventListener("oblivion_bespoke_colors_updated", handleUpdate);
      window.removeEventListener("oblivion_bespoke_config_updated", handleUpdate);
    };
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

  const handleOpenSwatchStudio = (slotIndex: number) => {
    setActiveSlot(slotIndex);
    setIsExpanded(true);
  };

  const applyColor = (hex: string) => {
    const valid = normalizeHex(hex);
    if (!valid) return;

    const updated: [string, string, string, string] = [...colors];
    updated[activeSlot] = valid;

    setColors(updated);
    setInputHex(valid);
    saveBespokeConfig({
      colors: updated,
      mode: contrastMode,
      textOnAccent: manualTextOnAccent,
      textOffAccent: manualTextOffAccent,
      textPrimary: manualTextPrimary,
    });
    onColorsChange?.(updated);
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
    }
  };

  const handleResetDefaults = () => {
    setColors([...DEFAULT_BESPOKE_COLORS]);
    saveBespokeConfig({
      colors: [...DEFAULT_BESPOKE_COLORS],
      mode: "auto",
      textOnAccent: "#FFFFFF",
      textOffAccent: "#FFFFFF",
      textPrimary: "#FFFFFF",
    });
    setContrastMode("auto");
    setManualTextOnAccent("#FFFFFF");
    setManualTextOffAccent("#FFFFFF");
    setManualTextPrimary("#FFFFFF");
    onColorsChange?.([...DEFAULT_BESPOKE_COLORS]);

    const hsl = hexToHsl(DEFAULT_BESPOKE_COLORS[activeSlot]);
    setHue(hsl.h);
    setSat(hsl.s);
    setLight(hsl.l);
    setInputHex(DEFAULT_BESPOKE_COLORS[activeSlot]);
  };

  const handleApplyPreset = (presetColors: [string, string, string, string]) => {
    setColors(presetColors);
    saveBespokeConfig({
      colors: presetColors,
      mode: contrastMode,
      textOnAccent: manualTextOnAccent,
      textOffAccent: manualTextOffAccent,
      textPrimary: manualTextPrimary,
    });
    onColorsChange?.(presetColors);
    setInputHex(presetColors[activeSlot]);
    const hsl = hexToHsl(presetColors[activeSlot]);
    setHue(hsl.h);
    setSat(hsl.s);
    setLight(hsl.l);
  };

  // Contrast Mode & Custom Text Color Handlers
  const handleSetContrastMode = (newMode: "auto" | "manual") => {
    setContrastMode(newMode);
    saveBespokeConfig({
      colors,
      mode: newMode,
      textOnAccent: manualTextOnAccent,
      textOffAccent: manualTextOffAccent,
      textPrimary: manualTextPrimary,
    });
  };

  const handleManualTextColorChange = (
    key: "textOnAccent" | "textOffAccent" | "textPrimary",
    rawVal: string
  ) => {
    let clean = rawVal.trim();
    if (clean && !clean.startsWith("#")) clean = `#${clean}`;
    const norm = normalizeHex(clean);

    if (key === "textOnAccent") {
      setManualTextOnAccent(clean.toUpperCase());
      if (norm) {
        saveBespokeConfig({
          colors,
          mode: "manual",
          textOnAccent: norm,
          textOffAccent: manualTextOffAccent,
          textPrimary: manualTextPrimary,
        });
      }
    } else if (key === "textOffAccent") {
      setManualTextOffAccent(clean.toUpperCase());
      if (norm) {
        saveBespokeConfig({
          colors,
          mode: "manual",
          textOnAccent: manualTextOnAccent,
          textOffAccent: norm,
          textPrimary: manualTextPrimary,
        });
      }
    } else if (key === "textPrimary") {
      setManualTextPrimary(clean.toUpperCase());
      if (norm) {
        saveBespokeConfig({
          colors,
          mode: "manual",
          textOnAccent: manualTextOnAccent,
          textOffAccent: manualTextOffAccent,
          textPrimary: norm,
        });
      }
    }
  };

  // Automatic WCAG Luminance Calculations
  const autoTextOnAccent = calculateWcagText(colors[0]); // derived from Color 1
  const autoTextOffAccent = calculateWcagText(colors[2]); // derived from Color 3
  const autoTextPrimary = calculateWcagText(colors[3]); // derived from Color 4

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
              border: "2px solid var(--accent-primary, #ff007f)",
              boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 0 0 1px var(--accent-primary, #ff007f)",
            }
          : undefined
      }
    >
      {/* Active Checkmark Badge */}
      {isSelected && (
        <div
          className="absolute top-3 right-3 px-2 py-0.5 rounded-full font-black text-[10px] flex items-center gap-1 shadow-md z-10"
          style={{
            background: "linear-gradient(135deg, var(--accent-secondary, #8b5cf6), var(--accent-primary, #ff007f))",
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

        {/* ─── 4-Color Palette Customizer ─── */}
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
          Tap any swatch pill to open the studio and fine-tune that color:
        </p>

        {/* 2x2 Responsive Swatch Grid & Direct Studio Trigger */}
        <div
          className="swatch-picker-container palette-swatches grid grid-cols-2 gap-2 w-full mb-3"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "8px",
            width: "100%",
            boxSizing: "border-box",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {COLOR_SLOT_LABELS.map((slot) => {
            const isCurrent = activeSlot === slot.index && isExpanded;
            const slotColor = colors[slot.index];

            return (
              <button
                key={slot.index}
                type="button"
                onClick={() => handleOpenSwatchStudio(slot.index)}
                className={`swatch-item group relative flex items-center justify-between px-3 py-2 rounded-xl border transition-all duration-200 cursor-pointer min-w-0 text-left ${
                  isCurrent
                    ? "bg-white border-pink-500 ring-2 ring-pink-500/40 text-zinc-900 shadow-sm"
                    : "bg-zinc-100/90 border-zinc-200 hover:bg-zinc-200/70 text-zinc-700 hover:border-zinc-300"
                }`}
                style={{ flex: "1 1 calc(50% - 8px)", minWidth: 0 }}
                title={`Click to edit ${slot.title}: ${slotColor}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-4 h-4 rounded-full border border-black/15 shadow-sm shrink-0 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: slotColor }}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-bold truncate leading-tight">
                      {slot.shortTitle}
                    </span>
                    <span className="text-[9px] text-zinc-500 truncate leading-tight">
                      {slot.title}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-1.5">
                  <span className="text-[10px] font-mono font-bold text-zinc-600 uppercase bg-black/5 px-1.5 py-0.5 rounded">
                    {slotColor}
                  </span>
                  {isCurrent && (
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Dynamic 4-Color Gradient Preview Bar */}
        <div
          className="h-3.5 rounded-xl w-full border border-zinc-300/80 shadow-inner mb-3 overflow-hidden relative"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="w-full h-full"
            style={{
              background: `linear-gradient(90deg, ${colors[0]} 0%, ${colors[1]} 33%, ${colors[2]} 66%, ${colors[3]} 100%)`,
            }}
          />
        </div>

        {/* Expandable Swatch Studio & Presets */}
        {isExpanded && (
          <div
            className="p-3 rounded-xl bg-zinc-900 text-white space-y-3 mb-3 border border-zinc-800 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Slot Title, Hex Input & Native Picker */}
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white/30"
                  style={{ backgroundColor: colors[activeSlot] }}
                />
                <div>
                  <span className="text-xs font-bold text-white block leading-tight">
                    Editing {COLOR_SLOT_LABELS[activeSlot].shortTitle}
                  </span>
                  <span className="text-[10px] text-zinc-400 block leading-tight">
                    {COLOR_SLOT_LABELS[activeSlot].title} — {COLOR_SLOT_LABELS[activeSlot].description}
                  </span>
                </div>
              </div>

              {/* Hex input & native color picker */}
              <div className="flex items-center gap-1 bg-zinc-800 p-1 rounded-lg border border-zinc-700">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={inputHex}
                    onChange={handleInputChange}
                    maxLength={7}
                    className="w-18 px-1.5 py-0.5 text-[11px] font-mono font-bold uppercase bg-zinc-900 border border-zinc-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-pink-500"
                    placeholder="#HEX"
                    title="Type 6-digit hex color"
                  />
                  <input
                    type="color"
                    value={colors[activeSlot]}
                    onChange={(e) => applyColor(e.target.value)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    title="Open native color picker"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                  title="Copy current hex"
                >
                  <Copy className="w-3 h-3" />
                </button>

                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                  title="Paste hex from clipboard"
                >
                  <ClipboardPaste className="w-3 h-3" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors ml-1"
                  title="Close Studio"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Hue Slider */}
            <div>
              <div className="flex justify-between text-[10px] font-mono text-zinc-400 mb-1">
                <span>HUE ({hue}°)</span>
                <span>COLOR {activeSlot + 1}</span>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                value={hue}
                onChange={(e) => {
                  const newHue = parseInt(e.target.value, 10);
                  setHue(newHue);
                  const newHex = hslToHex(newHue, sat, light);
                  applyColor(newHex);
                }}
                className="w-full h-2 rounded-lg cursor-pointer appearance-none bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-cyan-500 via-blue-500 via-purple-500 to-red-500"
              />
            </div>

            {/* Saturation / Lightness Sliders */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex justify-between text-[10px] font-mono text-zinc-400 mb-1">
                  <span>SAT ({sat}%)</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={sat}
                  onChange={(e) => {
                    const newSat = parseInt(e.target.value, 10);
                    setSat(newSat);
                    const newHex = hslToHex(hue, newSat, light);
                    applyColor(newHex);
                  }}
                  className="w-full h-1.5 rounded-lg cursor-pointer bg-zinc-700"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-mono text-zinc-400 mb-1">
                  <span>LIGHT ({light}%)</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={90}
                  value={light}
                  onChange={(e) => {
                    const newLight = parseInt(e.target.value, 10);
                    setLight(newLight);
                    const newHex = hslToHex(hue, sat, newLight);
                    applyColor(newHex);
                  }}
                  className="w-full h-1.5 rounded-lg cursor-pointer bg-zinc-700"
                />
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

        {/* ─── Text Contrast Mode & System ─── */}
        <div className="mt-3 pt-3 border-t border-zinc-200" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <div>
              <span className="text-[11px] font-bold text-zinc-900 flex items-center gap-1.5">
                <SunMoon className="w-3.5 h-3.5 text-pink-500" />
                <span>Text Contrast Mode</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
                  {contrastMode === "auto" ? "WCAG 2.1 Auto" : "Manual Override"}
                </span>
              </span>
              <p className="text-[10px] text-zinc-500 font-normal">
                {contrastMode === "auto"
                  ? "Automatic luminance calculation maintains legibility against custom palette"
                  : "Explicit custom color control for button & content text"}
              </p>
            </div>

            {/* Mode Switch: [ Auto (WCAG) | Manual ] */}
            <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200 shrink-0">
              <button
                type="button"
                onClick={() => handleSetContrastMode("auto")}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                  contrastMode === "auto"
                    ? "bg-white text-zinc-900 shadow-sm border border-zinc-200/80"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Auto (WCAG)
              </button>
              <button
                type="button"
                onClick={() => handleSetContrastMode("manual")}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                  contrastMode === "manual"
                    ? "bg-white text-zinc-900 shadow-sm border border-zinc-200/80"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Manual
              </button>
            </div>
          </div>

          {/* IF Mode === 'auto': Read-only indicator swatches */}
          {contrastMode === "auto" ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
              {/* 1. Active Button Text */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 border border-zinc-200 shadow-sm">
                <div>
                  <span className="block text-[10px] font-semibold text-zinc-700">Active Button Text</span>
                  <span className="block text-[9px] text-zinc-400 font-mono">Auto from Color 1</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-5 h-5 rounded-md border border-black/10 shadow-inner flex items-center justify-center text-[9px] font-bold"
                    style={{
                      backgroundColor: autoTextOnAccent,
                      color: autoTextOnAccent.toLowerCase() === "#ffffff" ? "#000000" : "#ffffff",
                    }}
                  >
                    Aa
                  </span>
                  <span className="text-[10px] font-mono font-bold text-zinc-700">{autoTextOnAccent}</span>
                </div>
              </div>

              {/* 2. Inactive Button Text */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 border border-zinc-200 shadow-sm">
                <div>
                  <span className="block text-[10px] font-semibold text-zinc-700">Inactive Button Text</span>
                  <span className="block text-[9px] text-zinc-400 font-mono">Auto from Color 3</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-5 h-5 rounded-md border border-black/10 shadow-inner flex items-center justify-center text-[9px] font-bold"
                    style={{
                      backgroundColor: autoTextOffAccent,
                      color: autoTextOffAccent.toLowerCase() === "#ffffff" ? "#000000" : "#ffffff",
                    }}
                  >
                    Aa
                  </span>
                  <span className="text-[10px] font-mono font-bold text-zinc-700">{autoTextOffAccent}</span>
                </div>
              </div>

              {/* 3. General Body/Title Text */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 border border-zinc-200 shadow-sm">
                <div>
                  <span className="block text-[10px] font-semibold text-zinc-700">General Body/Title</span>
                  <span className="block text-[9px] text-zinc-400 font-mono">Auto from Color 4</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-5 h-5 rounded-md border border-black/10 shadow-inner flex items-center justify-center text-[9px] font-bold"
                    style={{
                      backgroundColor: autoTextPrimary,
                      color: autoTextPrimary.toLowerCase() === "#ffffff" ? "#000000" : "#ffffff",
                    }}
                  >
                    Aa
                  </span>
                  <span className="text-[10px] font-mono font-bold text-zinc-700">{autoTextPrimary}</span>
                </div>
              </div>
            </div>
          ) : (
            /* IF Mode === 'manual': Render 3 explicit text color picker swatches */
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
              {/* 1. Active Button Text (bespokeTextOnAccent) */}
              <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-200 flex flex-col gap-1.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <label htmlFor="manual-text-on-accent" className="text-[10px] font-semibold text-zinc-700">Active Button Text</label>
                  <span className="text-[8px] font-mono text-zinc-400">on-accent</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    id="manual-text-on-accent"
                    type="color"
                    value={manualTextOnAccent}
                    onChange={(e) => handleManualTextColorChange("textOnAccent", e.target.value)}
                    className="w-6 h-6 rounded border border-zinc-300 cursor-pointer p-0 bg-transparent shrink-0"
                    title="Pick Active Button Text Color"
                  />
                  <input
                    type="text"
                    value={manualTextOnAccent}
                    onChange={(e) => handleManualTextColorChange("textOnAccent", e.target.value)}
                    maxLength={7}
                    className="w-full px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase bg-white border border-zinc-300 rounded text-zinc-800 focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                </div>
              </div>

              {/* 2. Inactive Button Text (bespokeTextOffAccent) */}
              <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-200 flex flex-col gap-1.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <label htmlFor="manual-text-off-accent" className="text-[10px] font-semibold text-zinc-700">Inactive Button Text</label>
                  <span className="text-[8px] font-mono text-zinc-400">off-accent</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    id="manual-text-off-accent"
                    type="color"
                    value={manualTextOffAccent}
                    onChange={(e) => handleManualTextColorChange("textOffAccent", e.target.value)}
                    className="w-6 h-6 rounded border border-zinc-300 cursor-pointer p-0 bg-transparent shrink-0"
                    title="Pick Inactive Button Text Color"
                  />
                  <input
                    type="text"
                    value={manualTextOffAccent}
                    onChange={(e) => handleManualTextColorChange("textOffAccent", e.target.value)}
                    maxLength={7}
                    className="w-full px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase bg-white border border-zinc-300 rounded text-zinc-800 focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                </div>
              </div>

              {/* 3. General Body/Title Text (bespokeTextPrimary) */}
              <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-200 flex flex-col gap-1.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <label htmlFor="manual-text-primary" className="text-[10px] font-semibold text-zinc-700">General Body/Title</label>
                  <span className="text-[8px] font-mono text-zinc-400">primary</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    id="manual-text-primary"
                    type="color"
                    value={manualTextPrimary}
                    onChange={(e) => handleManualTextColorChange("textPrimary", e.target.value)}
                    className="w-6 h-6 rounded border border-zinc-300 cursor-pointer p-0 bg-transparent shrink-0"
                    title="Pick General Body/Title Text Color"
                  />
                  <input
                    type="text"
                    value={manualTextPrimary}
                    onChange={(e) => handleManualTextColorChange("textPrimary", e.target.value)}
                    maxLength={7}
                    className="w-full px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase bg-white border border-zinc-300 rounded text-zinc-800 focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selection Status Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-200 mt-3">
        <span className="text-[11px] text-zinc-500 font-medium">
          {isSelected ? "Active full app archetype" : "Tap to activate theme"}
        </span>

        <span
          className={`text-[10px] font-bold uppercase tracking-wider ${
            isSelected ? "font-mono font-black" : "text-zinc-600 group-hover:text-zinc-900"
          }`}
          style={isSelected ? { color: "var(--accent-primary, #ff007f)" } : undefined}
        >
          {isSelected ? "● Live On App" : "Apply Design →"}
        </span>
      </div>
    </div>
  );
};
