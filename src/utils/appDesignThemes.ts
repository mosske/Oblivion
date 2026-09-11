import { FullAppDesignId, ThemePreset, MiniPlayerLayout } from "../types";

export type { FullAppDesignId };

export interface FullAppDesignConfig {
  id: FullAppDesignId;
  name: string;
  subtitle: string;
  badge: string;
  num: string;
  themePreset: ThemePreset;
  playerLayout: MiniPlayerLayout;
  description: string;
  features: string[];
  swatchColors: string[];
  multiAccentGradient?: string;
  isLight?: boolean;
  isCandy?: boolean;
  themeColorMeta?: string;

  // Visual Styling Classes
  bgCanvas: string;
  cardBg: string;
  headerBg: string;
  sidebarBg: string;
  bottomNavBg: string;
  borderSubtle: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  accentContrastText: string;

  // Additional component compatibility styling
  bannerGradient?: string;
  cardHover?: string;
  headingPrimary?: string;
  headingSecondary?: string;
  headingMuted?: string;
  modalBg?: string;
  pillBg?: string;
  pillActive?: string;
  inputBg?: string;
  waveformGradient?: string;
  progressGradient?: string;
  glowRing?: string;
  mockup?: {
    bannerGradient: string;
    heroTitle: string;
    heroSubtitle: string;
    chipLabels: string[];
    dockStyle?: string;
  };

  // Multi-Accent System
  accentSecondaryBg?: string;
  accentSecondaryText?: string;
  accentTertiaryBg?: string;
  accentTertiaryText?: string;

  // Buttons & Controls
  btnPrimary: string;
  btnSecondary: string;
  navActive: string;
  navInactive: string;
  trackRowHover: string;
}

export const FULL_APP_DESIGNS_BASE: Record<string, FullAppDesignConfig> = {
  designer: {
    id: "designer",
    name: "Studio Ivory & Gold",
    subtitle: "Warm Frosted Alabaster, Gold Accents & Emerald Backdrop",
    badge: "DESIGNER DEFAULT",
    num: "01",
    themePreset: "designer-ivory",
    playerLayout: "designer-waveform",
    description:
      "A bespoke editorial aesthetic featuring warm frosted alabaster cards, deep obsidian-onyx typography, brushed gold accents, and an atmospheric deep emerald canvas.",
    features: [
      "Frosted Alabaster glass cards & high-contrast onyx text",
      "Brushed Gold accents with strict WCAG contrast pairing",
      "Floating dock with responsive dual-side action buttons",
      "Dual-line Romanized lyrics with synced indicator tags",
    ],
    swatchColors: ["#051911", "#f8f6f0", "#c59b27", "#f59e0b"],
    multiAccentGradient: "from-[#c59b27] to-[#f59e0b]",
    isLight: true,
    themeColorMeta: "#051911",

    bgCanvas: "from-[#051911] via-[#082017] to-[#0a261b]",
    cardBg: "bg-[#f8f6f0]/95 backdrop-blur-xl",
    headerBg: "bg-[#f8f6f0]/90 backdrop-blur-xl",
    sidebarBg: "bg-[#f8f6f0]/95 backdrop-blur-2xl",
    bottomNavBg: "bg-[#f8f6f0]/95 backdrop-blur-2xl",
    borderSubtle: "border-[#e6e2d8]",
    borderStrong: "border-[#d8d2c4]",
    textPrimary: "text-[#1a201c]",
    textSecondary: "text-[#666258]",
    textMuted: "text-[#8a857b]",
    accentBg: "bg-[#c59b27]",
    accentText: "text-[#c59b27]",
    accentBorder: "border-[#c59b27]/40",
    accentContrastText: "text-[#1a201c]",

    headingPrimary: "text-[#f8f6f0]",
    headingSecondary: "text-[#d8d2c4]",
    headingMuted: "text-[#a39c8e]",
    cardHover: "hover:bg-[#ede8dc]/80",
    modalBg: "bg-[#f8f6f0]",
    pillBg: "bg-[#ebe7dc] text-[#1a201c] border border-[#d8d2c4] shadow-xs",
    pillActive: "bg-[#c59b27] text-[#1a201c] font-bold shadow-md",
    inputBg: "bg-[#ebe7dc] text-[#1a201c] border-[#d8d2c4]",
    glowRing: "shadow-[0_0_25px_rgba(197,155,39,0.35)]",
    waveformGradient: "from-[#c59b27] to-[#f59e0b]",
    progressGradient: "bg-gradient-to-r from-[#c59b27] to-[#f59e0b]",
    bannerGradient: "from-[#c59b27]/20 via-[#f59e0b]/10 to-transparent",
    mockup: {
      bannerGradient: "from-[#c59b27] to-[#f59e0b]",
      heroTitle: "Editorial Classical & Jazz",
      heroSubtitle: "Curated Masterpieces",
      chipLabels: ["Alabaster Studio", "Pure Master", "Hi-Res FLAC", "Editorial"],
      dockStyle: "bg-[#f8f6f0]/95 border-[#e6e2d8] shadow-2xl",
    },

    accentSecondaryBg: "bg-[#f59e0b]",
    accentSecondaryText: "text-[#f59e0b]",
    accentTertiaryBg: "bg-[#e5b85c]",
    accentTertiaryText: "text-[#e5b85c]",

    btnPrimary: "bg-[#c59b27] hover:bg-[#b0881e] text-[#1a201c] font-bold shadow-md active:scale-95",
    btnSecondary: "bg-[#ebe7dc] hover:bg-[#dfd9cb] text-[#1a201c] font-semibold border border-[#d8d2c4]",
    navActive: "bg-[#1a201c] text-[#f8f6f0] shadow-md font-bold",
    navInactive: "text-[#666258] hover:text-[#1a201c] hover:bg-[#ede8dc]",
    trackRowHover: "hover:bg-[#ede8dc]/80",
  },

  "cyberpunk-neon": {
    id: "cyberpunk-neon",
    name: "Cyberpunk Neon Glass",
    subtitle: "Electric Cyan, Fuchsia Magenta & Electric Purple",
    badge: "NEON SYNTH",
    num: "02",
    themePreset: "cyberpunk",
    playerLayout: "card-expanded",
    description:
      "High-tech futuristic dark obsidian mesh paired with neon cyan, radiant fuchsia magenta, and electric purple multi-accent gradients behind translucent frosted glass.",
    features: [
      "Multi-accent: Electric Cyan (#00f3ff) + Fuchsia Magenta (#ff007f)",
      "Electric Purple (#7b2cbf) tertiary highlights & glow",
      "Frosted Obsidian tinted-glass cards (blur-16px)",
      "High-contrast dark obsidian active button text (#050814)",
    ],
    swatchColors: ["#0a0d1a", "#00f3ff", "#ff007f", "#7b2cbf"],
    multiAccentGradient: "from-[#00f3ff] via-[#ff007f] to-[#7b2cbf]",
    isLight: false,
    themeColorMeta: "#0a0d1a",

    bgCanvas: "from-[#0a0d1a] via-[#12092b] to-[#05030a]",
    cardBg: "bg-[#0a0d1a]/75 backdrop-blur-xl",
    headerBg: "bg-[#0a0d1a]/85 backdrop-blur-xl",
    sidebarBg: "bg-[#0a0d1a]/90 backdrop-blur-2xl",
    bottomNavBg: "bg-[#0a0d1a]/90 backdrop-blur-2xl",
    borderSubtle: "border-[#00f3ff]/25",
    borderStrong: "border-[#00f3ff]/40",
    textPrimary: "text-white",
    textSecondary: "text-slate-300",
    textMuted: "text-slate-400",
    accentBg: "bg-[#00f3ff]",
    accentText: "text-[#00f3ff]",
    accentBorder: "border-[#00f3ff]/40",
    accentContrastText: "text-[#050814]",

    headingPrimary: "text-white",
    headingSecondary: "text-slate-300",
    headingMuted: "text-slate-400",
    cardHover: "hover:bg-white/10",
    modalBg: "bg-[#0a0d1a]",
    pillBg: "bg-white/10",
    pillActive: "bg-[#00f3ff] text-[#050814]",
    inputBg: "bg-[#12092b]/80 text-white border-[#00f3ff]/30",
    glowRing: "shadow-[0_0_30px_rgba(0,243,255,0.4)]",
    waveformGradient: "from-[#00f3ff] via-[#ff007f] to-[#7b2cbf]",
    progressGradient: "bg-gradient-to-r from-[#00f3ff] via-[#ff007f] to-[#7b2cbf]",
    bannerGradient: "from-[#00f3ff]/25 via-[#ff007f]/20 to-transparent",
    mockup: {
      bannerGradient: "from-[#00f3ff] via-[#ff007f] to-[#7b2cbf]",
      heroTitle: "Cyber Synth & Darksynth",
      heroSubtitle: "Neon Future Overdrive",
      chipLabels: ["Cyberpunk", "Synthwave", "Darksynth", "Glitch"],
      dockStyle: "bg-[#0a0d1a]/90 border-[#00f3ff]/40 shadow-[0_0_30px_rgba(0,243,255,0.3)]",
    },

    accentSecondaryBg: "bg-[#ff007f]",
    accentSecondaryText: "text-[#ff007f]",
    accentTertiaryBg: "bg-[#7b2cbf]",
    accentTertiaryText: "text-[#7b2cbf]",

    btnPrimary: "bg-gradient-to-r from-[#00f3ff] to-[#ff007f] hover:brightness-110 text-[#050814] font-extrabold shadow-lg shadow-[#00f3ff]/20 active:scale-95",
    btnSecondary: "bg-[#16122e]/80 hover:bg-[#1f1940] text-[#00f3ff] border border-[#00f3ff]/30 font-semibold",
    navActive: "bg-gradient-to-r from-[#00f3ff]/20 to-[#ff007f]/20 text-[#00f3ff] border border-[#00f3ff]/40 shadow-sm font-bold",
    navInactive: "text-slate-400 hover:text-white hover:bg-white/5",
    trackRowHover: "hover:bg-[#00f3ff]/10",
  },

  candyland: {
    id: "candyland",
    name: "Candyland Pastel",
    subtitle: "Frosted Sugar-Glass, Bubblegum Pink & Sweet Berry Text",
    badge: "PASTEL CANDY",
    num: "03",
    themePreset: "candyland-pastel",
    playerLayout: "floating-dock",
    description:
      "High-energy light mode aesthetic with dynamic multi-stop pastel mesh gradients, frosted white sugar-glass, sharp dark ocean blue & deep berry plum typography, subtle candy cane stripes, and playful candy icons.",
    features: [
      "Dynamic candy cane striped pastel mesh canvas (#ffd1dc / #ffe4e1 / #e0bbff / #d4f0f0)",
      "Translucent frosted white sugar-glass cards with blur-16px",
      "High-contrast Dark Ocean Blue (#1e4a7a) & Deep Berry Plum (#3b1235) text for crisp WCAG AA legibility",
      "Candy emojis & icons (ð­ Original, ð¬ Romanized, ð§ Dual-Line, ð© Autoscroll)",
    ],
    swatchColors: ["#ffd1dc", "#ff70a6", "#a3c4f3", "#ffd166"],
    multiAccentGradient: "from-[#ff70a6] via-[#a3c4f3] to-[#ffd166]",
    isLight: true,
    isCandy: true,
    themeColorMeta: "#ffd1dc",

    bgCanvas: "candyland-canvas-bg",
    cardBg: "bg-white/75 backdrop-blur-xl",
    headerBg: "bg-white/80 backdrop-blur-xl",
    sidebarBg: "bg-white/85 backdrop-blur-2xl",
    bottomNavBg: "bg-white/90 backdrop-blur-2xl",
    borderSubtle: "border-white/80",
    borderStrong: "border-white/95",
    textPrimary: "text-[#3b1235]",
    textSecondary: "text-[#6b2d5f]",
    textMuted: "text-[#8d4780]",
    accentBg: "bg-[#ff70a6]",
    accentText: "text-[#ff70a6]",
    accentBorder: "border-[#ff70a6]/40",
    accentContrastText: "text-white",

    headingPrimary: "text-[#1e4a7a]",
    headingSecondary: "text-[#3b1235]",
    headingMuted: "text-[#5e356d]",
    cardHover: "hover:bg-white/90",
    modalBg: "bg-white/95 backdrop-blur-2xl",
    pillBg: "bg-white/60 backdrop-blur-md",
    pillActive: "bg-[#ff70a6] text-white font-bold",
    inputBg: "bg-white/90 text-[#3b1235] border-pink-200",
    waveformGradient: "from-[#ff70a6] via-[#a3c4f3] to-[#ffd166]",
    progressGradient: "bg-gradient-to-r from-[#ff70a6] via-[#a3c4f3] to-[#ffd166]",
    glowRing: "shadow-[0_0_25px_rgba(255,112,166,0.35)]",
    bannerGradient: "from-[#ff70a6]/25 via-[#a3c4f3]/20 to-[#ffd166]/20",
    mockup: {
      bannerGradient: "from-[#ff70a6] via-[#a3c4f3] to-[#ffd166]",
      heroTitle: "Candyland Sweet Sessions",
      heroSubtitle: "Frosted Sugar-Glass & Candy Pop",
      chipLabels: ["ð­ Pop Hits", "ð¬ Lo-Fi Sugar", "ð§ Chillout", "ð© Electro Sweets"],
      dockStyle: "bg-white/80 border-white/90 shadow-xl",
    },

    accentSecondaryBg: "bg-[#a3c4f3]",
    accentSecondaryText: "text-[#4a6fa5]",
    accentTertiaryBg: "bg-[#ffd166]",
    accentTertiaryText: "text-[#b08800]",

    btnPrimary: "bg-gradient-to-r from-[#ff70a6] to-[#ff9ebb] hover:brightness-105 text-white font-extrabold shadow-md shadow-[#ff70a6]/30 active:scale-95",
    btnSecondary: "bg-white/80 hover:bg-white text-[#3b1235] border border-pink-200/80 font-semibold shadow-xs",
    navActive: "bg-[#ff70a6] text-white shadow-md font-bold",
    navInactive: "text-[#6b2d5f] hover:text-[#3b1235] hover:bg-white/50",
    trackRowHover: "hover:bg-white/60",
  },

  "dynamic-emerald": {
    id: "dynamic-emerald",
    name: "Dynamic Island Emerald",
    subtitle: "Luminous Mint, Electric Teal & Deep Sea Aqua",
    badge: "MONOLITH JADE",
    num: "04",
    themePreset: "emerald-synth",
    playerLayout: "minimal-capsule",
    description:
      "Sleek architectural deep forest canvas with luminous mint and electric teal multi-accents, deep sea aqua depth, and frosted deep emerald glass.",
    features: [
      "Multi-accent: Luminous Mint (#00f5a0) + Electric Teal (#00d9f5)",
      "Deep Sea Aqua (#05668d) tertiary depth & ambient reflections",
      "Frosted Deep Emerald tinted-glass (blur-16px)",
      "High-contrast dark obsidian active button text (#021a12)",
    ],
    swatchColors: ["#021a12", "#00f5a0", "#00d9f5", "#05668d"],
    multiAccentGradient: "from-[#00f5a0] to-[#00d9f5]",
    isLight: false,
    themeColorMeta: "#021a12",

    bgCanvas: "from-[#021a12] via-[#072419] to-[#010e08]",
    cardBg: "bg-[#021a12]/75 backdrop-blur-xl",
    headerBg: "bg-[#021a12]/80 backdrop-blur-xl",
    sidebarBg: "bg-[#021a12]/90 backdrop-blur-2xl",
    bottomNavBg: "bg-[#021a12]/90 backdrop-blur-2xl",
    borderSubtle: "border-[#00f5a0]/25",
    borderStrong: "border-[#00f5a0]/40",
    textPrimary: "text-[#d0fbe9]",
    textSecondary: "text-[#6ee7b7]",
    textMuted: "text-emerald-400/70",
    accentBg: "bg-[#00f5a0]",
    accentText: "text-[#00f5a0]",
    accentBorder: "border-[#00f5a0]/40",
    accentContrastText: "text-[#021a12]",

    headingPrimary: "text-[#d0fbe9]",
    headingSecondary: "text-[#a7f3d0]",
    headingMuted: "text-emerald-400/70",
    cardHover: "hover:bg-emerald-950/60",
    modalBg: "bg-[#021a12]",
    pillBg: "bg-emerald-950/40",
    pillActive: "bg-[#00f5a0] text-[#021a12]",
    inputBg: "bg-[#042f20]/80 text-[#d0fbe9] border-[#00f5a0]/30",
    glowRing: "shadow-[0_0_25px_rgba(0,245,160,0.35)]",
    waveformGradient: "from-[#00f5a0] to-[#00d9f5]",
    progressGradient: "bg-gradient-to-r from-[#00f5a0] to-[#00d9f5]",
    bannerGradient: "from-[#00f5a0]/20 via-[#00d9f5]/15 to-transparent",
    mockup: {
      bannerGradient: "from-[#00f5a0] to-[#00d9f5]",
      heroTitle: "Organic Lo-Fi & Chillwave",
      heroSubtitle: "Luminous Emerald Resonance",
      chipLabels: ["Emerald Waves", "Deep Ambient", "Bioluminescence", "Teal Night"],
      dockStyle: "bg-[#021a12]/90 border-[#00f5a0]/40 shadow-xl",
    },

    accentSecondaryBg: "bg-[#00d9f5]",
    accentSecondaryText: "text-[#00d9f5]",
    accentTertiaryBg: "bg-[#05668d]",
    accentTertiaryText: "text-[#05668d]",

    btnPrimary: "bg-gradient-to-r from-[#00f5a0] to-[#00d9f5] hover:brightness-110 text-[#021a12] font-extrabold shadow-lg shadow-[#00f5a0]/20 active:scale-95",
    btnSecondary: "bg-[#042f20]/80 hover:bg-[#07402c] text-[#00f5a0] border border-[#00f5a0]/30 font-semibold",
    navActive: "bg-gradient-to-r from-[#00f5a0]/20 to-[#00d9f5]/20 text-[#00f5a0] border border-[#00f5a0]/40 font-bold",
    navInactive: "text-emerald-300/70 hover:text-[#d0fbe9] hover:bg-emerald-950/40",
    trackRowHover: "hover:bg-[#00f5a0]/10",
  },

  "audiophile-gold": {
    id: "audiophile-gold",
    name: "Studio Audiophile Gold",
    subtitle: "Solar Gold, Warm Copper & Antique Brass",
    badge: "CARBON ANALOG",
    num: "05",
    themePreset: "rose-gold",
    playerLayout: "split-slider",
    description:
      "Vintage high-end analog audio deck aesthetic featuring warm carbon vinyl glass, solar gold with warm copper multi-accents, and antique brass tertiary trims.",
    features: [
      "Multi-accent: Solar Gold (#f59e0b) + Antique Brass (#d4af37)",
      "Warm Copper (#e65c00) tertiary trims and VU indicators",
      "Frosted Warm Carbon Vinyl glass cards (blur-16px)",
      "High-contrast dark walnut active button text (#170d06)",
    ],
    swatchColors: ["#170d06", "#f59e0b", "#d4af37", "#e65c00"],
    multiAccentGradient: "from-[#f59e0b] to-[#d4af37]",
    isLight: false,
    themeColorMeta: "#170d06",

    bgCanvas: "from-[#170d06] via-[#261408] to-[#100804]",
    cardBg: "bg-[#261408]/75 backdrop-blur-xl",
    headerBg: "bg-[#261408]/80 backdrop-blur-xl",
    sidebarBg: "bg-[#261408]/90 backdrop-blur-2xl",
    bottomNavBg: "bg-[#261408]/90 backdrop-blur-2xl",
    borderSubtle: "border-[#f59e0b]/30",
    borderStrong: "border-[#f59e0b]/50",
    textPrimary: "text-[#fef3c7]",
    textSecondary: "text-[#fbbf24]",
    textMuted: "text-amber-400/60",
    accentBg: "bg-[#f59e0b]",
    accentText: "text-[#f59e0b]",
    accentBorder: "border-[#f59e0b]/40",
    accentContrastText: "text-[#170d06]",

    headingPrimary: "text-[#fef3c7]",
    headingSecondary: "text-[#fbbf24]",
    headingMuted: "text-amber-400/60",
    cardHover: "hover:bg-amber-950/60",
    modalBg: "bg-[#170d06]",
    pillBg: "bg-amber-950/40",
    pillActive: "bg-[#f59e0b] text-[#170d06]",
    inputBg: "bg-[#381e0b]/80 text-[#fef3c7] border-[#f59e0b]/30",
    glowRing: "shadow-[0_0_25px_rgba(245,158,11,0.35)]",
    waveformGradient: "from-[#f59e0b] to-[#d4af37]",
    progressGradient: "bg-gradient-to-r from-[#f59e0b] to-[#d4af37]",
    bannerGradient: "from-[#f59e0b]/20 via-[#d4af37]/15 to-transparent",
    mockup: {
      bannerGradient: "from-[#f59e0b] to-[#d4af37]",
      heroTitle: "Analog Master Tape & Vinyl",
      heroSubtitle: "Solar Gold & Warm Copper Acoustics",
      chipLabels: ["Vacuum Tube", "DSD Master", "Direct Cut", "24-bit 192k"],
      dockStyle: "bg-[#261408]/90 border-[#f59e0b]/40 shadow-2xl",
    },

    accentSecondaryBg: "bg-[#d4af37]",
    accentSecondaryText: "text-[#d4af37]",
    accentTertiaryBg: "bg-[#e65c00]",
    accentTertiaryText: "text-[#e65c00]",

    btnPrimary: "bg-gradient-to-r from-[#f59e0b] to-[#d4af37] hover:brightness-110 text-[#170d06] font-extrabold shadow-lg shadow-[#f59e0b]/20 active:scale-95",
    btnSecondary: "bg-[#381e0b]/80 hover:bg-[#4a2810] text-[#f59e0b] border border-[#f59e0b]/30 font-semibold",
    navActive: "bg-gradient-to-r from-[#f59e0b]/20 to-[#d4af37]/20 text-[#f59e0b] border border-[#f59e0b]/40 font-bold",
    navInactive: "text-amber-300/70 hover:text-[#fef3c7] hover:bg-amber-950/40",
    trackRowHover: "hover:bg-[#f59e0b]/10",
  },

  "twilight-vaporwave": {
    id: "twilight-vaporwave",
    name: "Twilight Vaporwave",
    subtitle: "Sunset Magenta, Neon Coral & Twilight Violet",
    badge: "VAPOR RETRO",
    num: "06",
    themePreset: "sunset-horizon",
    playerLayout: "floating-dock",
    description:
      "Nostalgic sunset horizon aesthetic featuring sunset magenta, neon coral, and twilight violet multi-accent gradients behind translucent frosted rose glass.",
    features: [
      "Multi-accent: Sunset Magenta (#ff2a8d) + Twilight Violet (#8a2be2)",
      "Neon Coral (#ff758c) tertiary highlights & ambient reflections",
      "Frosted Twilight Rose tinted-glass cards (blur-16px)",
      "High-contrast crisp white active button text (#ffffff)",
    ],
    swatchColors: ["#1e0b36", "#ff2a8d", "#8a2be2", "#ff758c"],
    multiAccentGradient: "from-[#ff2a8d] to-[#8a2be2]",
    isLight: false,
    themeColorMeta: "#1e0b36",

    bgCanvas: "from-[#1e0b36] via-[#4a1235] to-[#180826]",
    cardBg: "bg-[#1e0b36]/65 backdrop-blur-xl",
    headerBg: "bg-[#1e0b36]/80 backdrop-blur-xl",
    sidebarBg: "bg-[#1e0b36]/90 backdrop-blur-2xl",
    bottomNavBg: "bg-[#1e0b36]/90 backdrop-blur-2xl",
    borderSubtle: "border-[#ff2a8d]/30",
    borderStrong: "border-[#ff2a8d]/50",
    textPrimary: "text-[#fdf4ff]",
    textSecondary: "text-[#f0abfc]",
    textMuted: "text-fuchsia-300/60",
    accentBg: "bg-[#ff2a8d]",
    accentText: "text-[#ff2a8d]",
    accentBorder: "border-[#ff2a8d]/40",
    accentContrastText: "text-white",

    headingPrimary: "text-[#fdf4ff]",
    headingSecondary: "text-[#f0abfc]",
    headingMuted: "text-fuchsia-300/60",
    cardHover: "hover:bg-fuchsia-950/60",
    modalBg: "bg-[#1e0b36]",
    pillBg: "bg-purple-950/40",
    pillActive: "bg-[#ff2a8d] text-white",
    inputBg: "bg-[#33114a]/80 text-[#fdf4ff] border-[#ff2a8d]/30",
    glowRing: "shadow-[0_0_25px_rgba(255,42,141,0.35)]",
    waveformGradient: "from-[#ff2a8d] to-[#8a2be2]",
    progressGradient: "bg-gradient-to-r from-[#ff2a8d] to-[#8a2be2]",
    bannerGradient: "from-[#ff2a8d]/25 via-[#8a2be2]/20 to-transparent",
    mockup: {
      bannerGradient: "from-[#ff2a8d] to-[#8a2be2]",
      heroTitle: "Sunset FM 1984 & Chill",
      heroSubtitle: "Neon Horizon & Synth Chords",
      chipLabels: ["Vaporwave", "Future Funk", "Retrowave", "Dream Pop"],
      dockStyle: "bg-[#1e0b36]/90 border-[#ff2a8d]/40 shadow-[0_0_25px_rgba(255,42,141,0.3)]",
    },

    accentSecondaryBg: "bg-[#8a2be2]",
    accentSecondaryText: "text-[#8a2be2]",
    accentTertiaryBg: "bg-[#ff758c]",
    accentTertiaryText: "text-[#ff758c]",

    btnPrimary: "bg-gradient-to-r from-[#ff2a8d] to-[#8a2be2] hover:brightness-110 text-white font-extrabold shadow-lg shadow-[#ff2a8d]/25 active:scale-95",
    btnSecondary: "bg-[#33114a]/80 hover:bg-[#431761] text-[#ff2a8d] border border-[#ff2a8d]/30 font-semibold",
    navActive: "bg-gradient-to-r from-[#ff2a8d]/20 to-[#8a2be2]/20 text-[#ff2a8d] border border-[#ff2a8d]/40 font-bold",
    navInactive: "text-fuchsia-300/70 hover:text-[#fdf4ff] hover:bg-fuchsia-950/40",
    trackRowHover: "hover:bg-[#ff2a8d]/10",
  },

  "neue-editorial": {
    id: "neue-editorial",
    name: "Neue Editorial",
    subtitle: "Swiss High-Contrast, Pale Beige & Charcoal Pills",
    badge: "SWISS EDITORIAL",
    num: "07",
    themePreset: "neue-editorial",
    playerLayout: "designer-waveform",
    description:
      "A high-contrast Swiss editorial layout featuring a warm pale beige canvas (#F2E8D8), soft off-white floating cards (#FAF5ED), deep charcoal pill-shaped controls (#1F1F1F), and clean Neue Haas typography.",
    features: [
      "Warm Pale Beige canvas & soft off-white floating cards",
      "Deep Charcoal (#1F1F1F) pill action buttons & controls",
      "Swiss Neue Haas Grotesk editorial typography hierarchy",
      "High-contrast moving charcoal-to-black scrubber gradient",
    ],
    swatchColors: ["#F2E8D8", "#FAF5ED", "#1F1F1F", "#666055"],
    multiAccentGradient: "from-[#1F1F1F] via-[#3A3530] to-[#1F1F1F]",
    isLight: true,
    themeColorMeta: "#F2E8D8",

    bgCanvas: "from-[#F2E8D8] via-[#EFE5D4] to-[#FAF5ED]",
    cardBg: "bg-[#FAF5ED]/95 backdrop-blur-xl",
    headerBg: "bg-[#F2E8D8]/95 backdrop-blur-xl",
    sidebarBg: "bg-[#FAF5ED]/95 backdrop-blur-2xl",
    bottomNavBg: "bg-[#FAF5ED]/95 backdrop-blur-2xl",
    borderSubtle: "border-[#1F1F1F]/12",
    borderStrong: "border-[#1F1F1F]/20",
    textPrimary: "text-[#1F1F1F]",
    textSecondary: "text-[#666055]",
    textMuted: "text-[#8A8478]",
    accentBg: "bg-[#1F1F1F]",
    accentText: "text-[#1F1F1F]",
    accentBorder: "border-[#1F1F1F]/40",
    accentContrastText: "text-[#F2E8D8]",

    headingPrimary: "text-[#1F1F1F]",
    headingSecondary: "text-[#3A3530]",
    headingMuted: "text-[#666055]",
    cardHover: "hover:bg-[#F5EDE1]",
    modalBg: "bg-[#FAF5ED]",
    pillBg: "bg-[#1F1F1F]/8",
    pillActive: "bg-[#1F1F1F] text-[#F2E8D8]",
    inputBg: "bg-[#FAF5ED] text-[#1F1F1F] border-[#1F1F1F]/15",
    glowRing: "shadow-[0_0_25px_rgba(31,31,31,0.15)]",
    waveformGradient: "from-[#1F1F1F] to-[#3A3530]",
    progressGradient: "bg-gradient-to-r from-[#1F1F1F] via-[#3A3530] to-[#1F1F1F]",
    bannerGradient: "from-[#1F1F1F]/15 via-[#3A3530]/10 to-transparent",
    mockup: {
      bannerGradient: "from-[#1F1F1F] to-[#3A3530]",
      heroTitle: "Swiss Editorial & Minimal",
      heroSubtitle: "High-Contrast Acoustics",
      chipLabels: ["Neue Haas", "Charcoal Pill", "Warm Mist", "Lossless"],
      dockStyle: "bg-[#FAF5ED] border-[#1F1F1F]/15 shadow-2xl rounded-full",
    },

      nebula_liquid_glass: {
    id: "nebula-liquid-glass",
    name: "Nebula Liquid Glass",
    subtitle: "Animated Nebular Gradient & Frosted Glass",
    badge: "LIQUID GLASS",
    num: "09",
    themePreset: "nebula-liquid-glass",
    playerLayout: "default",
    description: "Vibrant shifting nebular gradient background with frosted glass UI elements.",
    features: ["Animated Gradient BG", "Frosted Glass UI", "Vibrant Accents"],
    swatchColors: ["#4c1d95", "#db2777", "#06b6d4"],
    bgCanvas: "bg-gradient-to-br from-indigo-900 via-purple-800 to-cyan-900 animate-gradient-shift",
    cardBg: "bg-white/10 backdrop-blur-xl border-white/20 shadow-lg",
    headerBg: "bg-white/10 backdrop-blur-xl",
    sidebarBg: "bg-white/5 backdrop-blur-2xl",
    bottomNavBg: "bg-white/10 backdrop-blur-2xl",
    borderSubtle: "border-white/10",
    borderStrong: "border-white/20",
    textPrimary: "text-white",
    textSecondary: "text-white/70",
    textMuted: "text-white/50",
    accentBg: "bg-white/20",
    accentText: "text-white",
    accentBorder: "border-white/30",
    accentContrastText: "text-white",
    btnPrimary: "bg-white/20 hover:bg-white/30 text-white font-bold backdrop-blur-sm",
    btnSecondary: "bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm",
    navActive: "bg-white/20 text-white font-bold",
    navInactive: "text-white/60 hover:text-white hover:bg-white/10",
    trackRowHover: "hover:bg-white/10"
  },accentSecondaryBg: "bg-[#3A3530]",
    accentSecondaryText: "text-[#3A3530]",
    accentTertiaryBg: "bg-[#524B44]",
    accentTertiaryText: "text-[#524B44]",

    btnPrimary: "bg-[#1F1F1F] hover:bg-[#3A3530] text-[#F2E8D8] font-bold rounded-full shadow-md active:scale-95",
    btnSecondary: "bg-[#FAF5ED] hover:bg-[#F2E8D8] text-[#1F1F1F] font-semibold border border-[#1F1F1F]/15 rounded-full",
    navActive: "bg-[#1F1F1F] text-[#F2E8D8] shadow-md font-bold rounded-full",
    navInactive: "text-[#666055] hover:text-[#1F1F1F] hover:bg-[#F2E8D8] rounded-full",
    trackRowHover: "hover:bg-[#FAF5ED]/90",
  },

  "obsidian-depth": {
    id: "obsidian-depth",
    name: "Obsidian Depth",
    subtitle: "Matte Slate, Realistic 3D & Radiant Lighter-Blue Gradient",
    badge: "3D NEUMORPHIC",
    num: "08",
    themePreset: "obsidian-depth",
    playerLayout: "floating-dock",
    description:
      "A tactile, realistic 3D Neumorphic music experience featuring dual-directional light sculpting, matte slate (#2a2e38) surfaces, and glowing lighter-blue gradients.",
    features: [
      "True 3D card extrusion with top-left specular highlights and deep drop shadows",
      "Matte dark slate (#2a2e38) canvas with molded polymer 3D elevated surfaces",
      "Radiant lighter-blue gradient (#a5f3fc to #38bdf8 to #0284c7) for buttons, badges, & progress",
      "Recessed 3D input fields, tactile squircle controls, & floating player dock",
    ],
    swatchColors: ["#2a2e38", "#2e3441", "#a5f3fc", "#38bdf8"],
    multiAccentGradient: "from-[#a5f3fc] via-[#38bdf8] to-[#0284c7]",
    isLight: false,
    themeColorMeta: "#2a2e38",

    bgCanvas: "from-[#2a2e38] via-[#242831] to-[#1c2027]",
    cardBg: "bg-gradient-to-br from-[#323846] to-[#262b34] shadow-[8px_8px_18px_rgba(16,18,24,0.75),-7px_-7px_16px_rgba(255,255,255,0.07),inset_0_1px_1px_rgba(255,255,255,0.08)] border border-white/[0.04]",
    headerBg: "bg-[#2a2e38]/95 backdrop-blur-xl border-b border-white/[0.04]",
    sidebarBg: "bg-[#2a2e38]/95 backdrop-blur-2xl border-r border-white/[0.04]",
    bottomNavBg: "bg-gradient-to-b from-[#303643] to-[#252932] shadow-[10px_10px_24px_rgba(12,14,20,0.85),-8px_-8px_20px_rgba(255,255,255,0.07)] border-t border-white/[0.05]",
    borderSubtle: "border-white/[0.05]",
    borderStrong: "border-sky-400/40",
    textPrimary: "text-slate-100",
    textSecondary: "text-slate-300",
    textMuted: "text-slate-400",
    accentBg: "bg-gradient-to-r from-[#a5f3fc] via-[#38bdf8] to-[#0284c7]",
    accentText: "text-[#38bdf8]",
    accentBorder: "border-[#38bdf8]/50",
    accentContrastText: "text-[#0f172a]",

    headingPrimary: "text-slate-100 font-bold",
    headingSecondary: "text-slate-300",
    headingMuted: "text-slate-400",
    cardHover: "hover:shadow-[11px_11px_24px_rgba(14,16,22,0.85),-9px_-9px_20px_rgba(255,255,255,0.09),inset_0_1px_1px_rgba(255,255,255,0.1)] hover:-translate-y-0.5 transition-all duration-300",
    modalBg: "bg-[#2a2e38]",
    pillBg: "bg-[#242831] shadow-[inset_4px_4px_9px_rgba(13,15,21,0.85),inset_-3px_-3px_7px_rgba(255,255,255,0.06)] border border-black/20 text-slate-300",
    pillActive: "bg-gradient-to-r from-[#a5f3fc] via-[#38bdf8] to-[#0284c7] text-[#0f172a] font-black shadow-[4px_4px_12px_rgba(12,14,20,0.7),0_0_16px_rgba(56,189,248,0.4)] border border-white/20",
    inputBg: "bg-[#242831] text-slate-100 shadow-[inset_4px_4px_9px_rgba(13,15,21,0.85),inset_-3px_-3px_7px_rgba(255,255,255,0.06)] border border-black/25 focus:border-sky-400/50",
    glowRing: "shadow-[0_0_25px_rgba(56,189,248,0.4)]",
    waveformGradient: "from-[#a5f3fc] via-[#38bdf8] to-[#0284c7]",
    progressGradient: "bg-gradient-to-r from-[#a5f3fc] via-[#38bdf8] to-[#0284c7]",
    bannerGradient: "from-[#38bdf8]/20 via-slate-800/40 to-transparent",
    mockup: {
      bannerGradient: "from-[#a5f3fc] via-[#38bdf8] to-[#0284c7]",
      heroTitle: "3D Neumorphic Audio",
      heroSubtitle: "True Depth & Light-Sculpted Surfaces",
      chipLabels: ["Matte Slate", "3D Extrusion", "Lighter Blue Gradient", "Lossless"],
      dockStyle: "bg-gradient-to-r from-[#303643] to-[#252932] shadow-[10px_10px_24px_rgba(12,14,20,0.85),-8px_-8px_20px_rgba(255,255,255,0.07)] border border-white/[0.06] rounded-full",
    },

    accentSecondaryBg: "bg-[#a5f3fc]",
    accentSecondaryText: "text-[#a5f3fc]",
    accentTertiaryBg: "bg-[#0284c7]",
    accentTertiaryText: "text-[#0284c7]",

    btnPrimary: "bg-gradient-to-r from-[#a5f3fc] via-[#38bdf8] to-[#0284c7] hover:brightness-105 text-[#0f172a] font-black shadow-[6px_6px_16px_rgba(12,14,20,0.75),-4px_-4px_10px_rgba(255,255,255,0.12),0_0_22px_rgba(56,189,248,0.35)] border border-white/20 active:scale-95 transition-all",
    btnSecondary: "bg-gradient-to-br from-[#333946] to-[#262a33] text-[#38bdf8] hover:text-white font-bold border border-white/[0.05] shadow-[6px_6px_14px_rgba(15,17,23,0.7),-5px_-5px_12px_rgba(255,255,255,0.07)] active:shadow-[inset_4px_4px_8px_rgba(13,15,20,0.85),inset_-3px_-3px_7px_rgba(255,255,255,0.05)] transition-all",
    navActive: "bg-gradient-to-r from-[#38bdf8]/20 via-[#a5f3fc]/15 to-transparent text-[#38bdf8] border border-[#38bdf8]/40 shadow-[inset_2px_2px_5px_rgba(13,15,21,0.6),0_0_12px_rgba(56,189,248,0.2)] font-bold rounded-2xl",
    navInactive: "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] rounded-2xl",
    trackRowHover: "hover:bg-gradient-to-r hover:from-[#323846] hover:to-[#262b34] hover:shadow-[4px_4px_10px_rgba(14,16,22,0.5),-3px_-3px_8px_rgba(255,255,255,0.04)]",
  },
};

/**
 * Theme Canvas Top/Header Background Hex Colors Reference
 * Theme 01 (Designer): #051911
 * Theme 02 (Cyberpunk Neon Glass): #0a0d1a
 * Theme 03 (Candyland): #ffd1dc
 * Theme 04 (Dynamic Island Emerald / Aurora Jade): #021a12
 * Theme 05 (Studio Audiophile Gold / Golden Brass): #170d06
 * Theme 06 (Twilight Vaporwave): #1e0b36
 * Theme 07 (Neue Editorial): #F2E8D8
 * Theme 08 (Obsidian Depth): #2a2e38
 */
export const THEME_CANVAS_COLORS: Record<string, string> = {
  designer: "#051911",
  "cyberpunk-neon": "#0a0d1a",
  candyland: "#ffd1dc",
  "ytmusic-red": "#ffd1dc",
  "dynamic-emerald": "#021a12",
  "audiophile-gold": "#170d06",
  "twilight-vaporwave": "#1e0b36",
  "neue-editorial": "#F2E8D8",
  "nebula-liquid-glass": "#4c1d95",
  "obsidian-depth": "#2a2e38",
};

/**
 * Array of the 8 canonical Full App Designs (guaranteed unique IDs for React key rendering)
 */
export const FULL_APP_DESIGNS_LIST: FullAppDesignConfig[] = Object.values(FULL_APP_DESIGNS_BASE);

/**
 * Safely lookup a FullAppDesignConfig by ID with backward compatibility for legacy aliases
 */
export function getFullAppDesign(id?: string | null): FullAppDesignConfig {
  if (!id) return FULL_APP_DESIGNS_BASE.designer;
  if (id === "ytmusic-red") return FULL_APP_DESIGNS_BASE.candyland;
  return FULL_APP_DESIGNS_BASE[id] || FULL_APP_DESIGNS_BASE.designer;
}

/**
 * Returns the exact top canvas background hex color for a given theme ID or config
 */
export function getThemeCanvasColor(themeOrId?: string | FullAppDesignConfig | null): string {
  if (!themeOrId) return THEME_CANVAS_COLORS.designer;
  if (typeof themeOrId === "object" && themeOrId?.themeColorMeta) {
    return themeOrId.themeColorMeta;
  }
  const id = typeof themeOrId === "string" ? themeOrId : themeOrId?.id;
  return (id && THEME_CANVAS_COLORS[id]) || THEME_CANVAS_COLORS.designer;
}

/**
 * Explicitly updates the document <meta name="theme-color"> tag, Web App Manifest,
 * multi-vendor mobile status bars (Safari, Chrome, Brave, Edge, Firefox), and passes
 * the theme color to in-app browser / Chrome Custom Tabs bridges prior to navigation/popup.
 */
export function syncDocumentThemeColor(themeOrId?: string | FullAppDesignConfig | null): string {
  const colorHex = getThemeCanvasColor(themeOrId);
  const isLight =
    colorHex.toLowerCase() === "#ffd1dc" ||
    colorHex.toLowerCase() === "#f2e8d8" ||
    (typeof themeOrId === "object" && Boolean(themeOrId?.isLight));

  if (typeof document !== "undefined") {
    // 1. Standard / Brave / Android Chrome Theme Color
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", colorHex);
    } else {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.setAttribute("name", "theme-color");
      metaThemeColor.setAttribute("content", colorHex);
      document.head.appendChild(metaThemeColor);
    }

    // 2. iOS Safari Status Bar Style
    let appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (appleMeta) {
      appleMeta.setAttribute("content", isLight ? "default" : "black-translucent");
    } else {
      appleMeta = document.createElement("meta");
      appleMeta.setAttribute("name", "apple-mobile-web-app-status-bar-style");
      appleMeta.setAttribute("content", isLight ? "default" : "black-translucent");
      document.head.appendChild(appleMeta);
    }

    // 3. Windows / Edge Status Bar Navigation Button Color
    let msNavMeta = document.querySelector('meta[name="msapplication-navbutton-color"]');
    if (msNavMeta) {
      msNavMeta.setAttribute("content", colorHex);
    } else {
      msNavMeta = document.createElement("meta");
      msNavMeta.setAttribute("name", "msapplication-navbutton-color");
      msNavMeta.setAttribute("content", colorHex);
      document.head.appendChild(msNavMeta);
    }

    // 4. Windows / Edge Tile Color
    let msTileMeta = document.querySelector('meta[name="msapplication-TileColor"]');
    if (msTileMeta) {
      msTileMeta.setAttribute("content", colorHex);
    } else {
      msTileMeta = document.createElement("meta");
      msTileMeta.setAttribute("name", "msapplication-TileColor");
      msTileMeta.setAttribute("content", colorHex);
      document.head.appendChild(msTileMeta);
    }

    // 5. Dynamic Web App Manifest Theme Color (Fixes Brave & Chromium CCT fallbacks)
    try {
      const dynamicManifest = {
        id: "/",
        name: "Oblivion Music",
        short_name: "Oblivion",
        description: "Oblivion Music - Google account sync, lossless audio streaming, background playback, and offline music caching.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        display_override: ["standalone", "minimal-ui", "window-controls-overlay"],
        background_color: colorHex,
        theme_color: colorHex,
        orientation: "any",
        prefer_related_applications: false,
        categories: ["music", "entertainment", "audio"],
        icons: [
          { src: "/icon-192.png", type: "image/png", sizes: "192x192", purpose: "any" },
          { src: "/icon-192.png", type: "image/png", sizes: "192x192", purpose: "maskable" },
          { src: "/icon-512.png", type: "image/png", sizes: "512x512", purpose: "any" },
          { src: "/icon-512.png", type: "image/png", sizes: "512x512", purpose: "maskable" },
          { src: "/favicon.svg", type: "image/svg+xml", sizes: "any", purpose: "any" }
        ],
        shortcuts: [
          { name: "Home Dashboard", short_name: "Home", url: "/?tab=home", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
          { name: "Music Library", short_name: "Library", url: "/?tab=library", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
          { name: "Search Music", short_name: "Search", url: "/?tab=search", icons: [{ src: "/icon-192.png", sizes: "192x192" }] }
        ]
      };

      const manifestDataUri = `data:application/manifest+json;charset=utf-8,${encodeURIComponent(JSON.stringify(dynamicManifest))}`;
      let manifestLink = document.querySelector('link[rel="manifest"]');
      if (manifestLink) {
        manifestLink.setAttribute("href", manifestDataUri);
      } else {
        manifestLink = document.createElement("link");
        manifestLink.setAttribute("rel", "manifest");
        manifestLink.setAttribute("href", manifestDataUri);
        document.head.appendChild(manifestLink);
      }
    } catch (e) {
      console.debug("Dynamic manifest update error:", e);
    }
  }

  // If running inside Android WebView, Chrome Custom Tabs wrapper, or Capacitor/Cordova bridge
  if (typeof window !== "undefined") {
    try {
      const win = window as any;
      if (win.Android?.setToolbarColor) {
        win.Android.setToolbarColor(colorHex);
      }
      if (win.CustomTabs?.setToolbarColor) {
        win.CustomTabs.setToolbarColor(colorHex);
      }
      if (win.Capacitor?.Plugins?.StatusBar?.setBackgroundColor) {
        win.Capacitor.Plugins.StatusBar.setBackgroundColor({ color: colorHex });
      }
      if (win.StatusBar?.backgroundColorByHexString) {
        win.StatusBar.backgroundColorByHexString(colorHex);
      }
    } catch (e) {
      console.debug("Custom Tabs / StatusBar bridge invocation skipped:", e);
    }
  }

  return colorHex;
}

/**
 * Proxy object for FULL_APP_DESIGNS preserving record index access while keeping Object.values unique
 */
export const FULL_APP_DESIGNS: Record<string, FullAppDesignConfig> = new Proxy(FULL_APP_DESIGNS_BASE, {
  get(target, prop: string | symbol) {
    if (typeof prop === "string") {
      if (prop === "ytmusic-red") return target.candyland;
      if (prop in target) return target[prop];
    }
    return (target as any)[prop];
  },
  ownKeys(target) {
    return Object.keys(target);
  },
  getOwnPropertyDescriptor(target, prop) {
    return Object.getOwnPropertyDescriptor(target, prop);
  },
});

