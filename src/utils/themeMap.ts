import { ThemePreset } from "../types";

export interface ThemeMeta {
  id: ThemePreset;
  name: string;
  description: string;
  category: "Dark" | "Light" | "Vibrant";
  previewGradient: string;
  accentClass: string;
  accentText: string;
  accentBg: string;
  borderAccent: string;
  bgCanvas: string;
  cardBg: string;
  sidebarBg: string;
  playerBg: string;
  textColor: string;
  subtextColor: string;
  swatchColors: string[];
}

export class ThemeRegistry {
  static THEMES: Record<ThemePreset, ThemeMeta> = {
    "oblivion-dark": {
      id: "oblivion-dark",
      name: "Oblivion Dark",
      description: "Default futuristic dark canvas with glowing cyan & indigo accents.",
      category: "Dark",
      previewGradient: "from-slate-950 via-indigo-950 to-cyan-950",
      accentClass: "text-cyan-400",
      accentText: "text-cyan-400",
      accentBg: "bg-cyan-500",
      borderAccent: "border-cyan-500/40",
      bgCanvas: "from-slate-950 via-slate-900 to-slate-950",
      cardBg: "bg-slate-900/60 border-slate-800",
      sidebarBg: "bg-slate-950/80 border-slate-800/60",
      playerBg: "bg-slate-950/90 border-slate-800",
      textColor: "text-slate-100",
      subtextColor: "text-slate-400",
      swatchColors: ["#0f172a", "#1e1b4b", "#06b6d4"]
    },
    "cyberpunk": {
      id: "cyberpunk",
      name: "Cyberpunk Neon",
      description: "Vibrant high-contrast synthwave palette with electric magenta & cyan.",
      category: "Vibrant",
      previewGradient: "from-purple-950 via-fuchsia-950 to-cyan-950",
      accentClass: "text-fuchsia-400",
      accentText: "text-fuchsia-400",
      accentBg: "bg-fuchsia-500",
      borderAccent: "border-fuchsia-500/40",
      bgCanvas: "from-purple-950 via-slate-950 to-fuchsia-950",
      cardBg: "bg-purple-900/30 border-fuchsia-900/40",
      sidebarBg: "bg-purple-950/90 border-fuchsia-900/30",
      playerBg: "bg-purple-950/95 border-fuchsia-800/40",
      textColor: "text-purple-50",
      subtextColor: "text-purple-300",
      swatchColors: ["#2e1065", "#701a75", "#d946ef"]
    },
    "midnight-blue": {
      id: "midnight-blue",
      name: "Midnight Blue",
      description: "Deep sapphire & cobalt tones for refined nighttime listening.",
      category: "Dark",
      previewGradient: "from-blue-950 via-slate-950 to-indigo-950",
      accentClass: "text-blue-400",
      accentText: "text-blue-400",
      accentBg: "bg-blue-500",
      borderAccent: "border-blue-500/40",
      bgCanvas: "from-blue-950 via-slate-950 to-blue-950",
      cardBg: "bg-blue-900/30 border-blue-800/50",
      sidebarBg: "bg-blue-950/90 border-blue-800/40",
      playerBg: "bg-blue-950/95 border-blue-800/60",
      textColor: "text-blue-50",
      subtextColor: "text-blue-300",
      swatchColors: ["#172554", "#1e3a8a", "#3b82f6"]
    },
    "oled-black": {
      id: "oled-black",
      name: "OLED Pitch Black",
      description: "Pure AMOLED black canvas with high-efficiency emerald green accents.",
      category: "Dark",
      previewGradient: "from-black via-zinc-950 to-emerald-950",
      accentClass: "text-emerald-400",
      accentText: "text-emerald-400",
      accentBg: "bg-emerald-500",
      borderAccent: "border-emerald-500/40",
      bgCanvas: "from-black via-zinc-950 to-black",
      cardBg: "bg-zinc-900/40 border-zinc-800",
      sidebarBg: "bg-black/90 border-zinc-800",
      playerBg: "bg-black/95 border-zinc-800",
      textColor: "text-zinc-100",
      subtextColor: "text-zinc-400",
      swatchColors: ["#000000", "#09090b", "#10b981"]
    },
    "emerald-synth": {
      id: "emerald-synth",
      name: "Emerald Forest",
      description: "Deep organic forest dark layout with glowing jade & mint highlights.",
      category: "Vibrant",
      previewGradient: "from-emerald-950 via-teal-950 to-slate-950",
      accentClass: "text-teal-400",
      accentText: "text-teal-400",
      accentBg: "bg-teal-500",
      borderAccent: "border-teal-500/40",
      bgCanvas: "from-emerald-950 via-slate-950 to-teal-950",
      cardBg: "bg-emerald-900/25 border-emerald-800/40",
      sidebarBg: "bg-emerald-950/90 border-emerald-800/30",
      playerBg: "bg-emerald-950/95 border-emerald-800/40",
      textColor: "text-emerald-50",
      subtextColor: "text-emerald-300",
      swatchColors: ["#022c22", "#134e4a", "#2dd4bf"]
    },
    "sunset-horizon": {
      id: "sunset-horizon",
      name: "Sunset Horizon",
      description: "Warm twilight aesthetic with amber, burnt orange, and violet glow.",
      category: "Vibrant",
      previewGradient: "from-amber-950 via-rose-950 to-violet-950",
      accentClass: "text-amber-400",
      accentText: "text-amber-400",
      accentBg: "bg-amber-500",
      borderAccent: "border-amber-500/40",
      bgCanvas: "from-amber-950 via-slate-950 to-rose-950",
      cardBg: "bg-amber-900/20 border-amber-800/30",
      sidebarBg: "bg-amber-950/90 border-amber-800/30",
      playerBg: "bg-amber-950/95 border-amber-800/40",
      textColor: "text-amber-50",
      subtextColor: "text-amber-300",
      swatchColors: ["#451a03", "#881337", "#f59e0b"]
    },
    "rose-gold": {
      id: "rose-gold",
      name: "Rose Gold Luxury",
      description: "Aesthetic deep burgundy canvas paired with warm rose gold champagne.",
      category: "Dark",
      previewGradient: "from-rose-950 via-stone-900 to-amber-950",
      accentClass: "text-rose-300",
      accentText: "text-rose-300",
      accentBg: "bg-rose-400",
      borderAccent: "border-rose-400/40",
      bgCanvas: "from-rose-950 via-stone-950 to-zinc-950",
      cardBg: "bg-rose-900/20 border-rose-800/30",
      sidebarBg: "bg-rose-950/90 border-rose-800/30",
      playerBg: "bg-rose-950/95 border-rose-800/40",
      textColor: "text-stone-100",
      subtextColor: "text-rose-200/70",
      swatchColors: ["#4c0519", "#1c1917", "#fb7185"]
    },
    "minimal-light": {
      id: "minimal-light",
      name: "Minimal Studio Light",
      description: "Crisp slate-100 light canvas for daylight listening with high clarity.",
      category: "Light",
      previewGradient: "from-slate-100 via-slate-200 to-cyan-100",
      accentClass: "text-cyan-600",
      accentText: "text-cyan-600",
      accentBg: "bg-cyan-600",
      borderAccent: "border-cyan-600/40",
      bgCanvas: "from-slate-100 via-slate-50 to-slate-200",
      cardBg: "bg-white/80 border-slate-300 shadow-sm",
      sidebarBg: "bg-slate-200/90 border-slate-300",
      playerBg: "bg-white/95 border-slate-300",
      textColor: "text-slate-900",
      subtextColor: "text-slate-600",
      swatchColors: ["#f1f5f9", "#e2e8f0", "#0891b2"]
    }
  };

  static getTheme(id: ThemePreset): ThemeMeta {
    return this.THEMES[id] || this.THEMES["oblivion-dark"];
  }
}
