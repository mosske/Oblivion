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

export const FULL_APP_DESIGNS: Record<string, FullAppDesignConfig> = {
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
    swatchColors: ["#051911", "#f8f6f0", "#c59b27", "#e5b85c"],
    multiAccentGradient: "from-[#c59b27] to-[#e5b85c]",
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
    pillBg: "bg-black/5",
    pillActive: "bg-[#c59b27] text-[#1a201c]",
    inputBg: "bg-[#ebe7dc] text-[#1a201c] border-[#d8d2c4]",
    glowRing: "shadow-[0_0_25px_rgba(197,155,39,0.35)]",
    waveformGradient: "from-[#c59b27] to-[#e5b85c]",
    progressGradient: "bg-gradient-to-r from-[#c59b27] to-[#e5b85c]",
    bannerGradient: "from-[#c59b27]/20 via-[#e5b85c]/10 to-transparent",
    mockup: {
      bannerGradient: "from-[#c59b27] to-[#e5b85c]",
      heroTitle: "Editorial Classical & Jazz",
      heroSubtitle: "Curated Masterpieces",
      chipLabels: ["Alabaster Studio", "Pure Master", "Hi-Res FLAC", "Editorial"],
      dockStyle: "bg-[#f8f6f0]/95 border-[#e6e2d8] shadow-2xl",
    },

    accentSecondaryBg: "bg-[#e5b85c]",
    accentSecondaryText: "text-[#e5b85c]",
    accentTertiaryBg: "bg-[#fef08a]",
    accentTertiaryText: "text-[#fef08a]",

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
      "Candy emojis & icons (🍭 Original, 🍬 Romanized, 🧁 Dual-Line, 🍩 Autoscroll)",
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
      chipLabels: ["🍭 Pop Hits", "🍬 Lo-Fi Sugar", "🧁 Chillout", "🍩 Electro Sweets"],
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
      "Multi-accent: Solar Gold (#f59e0b) + Warm Copper (#e65c00)",
      "Antique Brass (#d4af37) tertiary trims and VU indicators",
      "Frosted Warm Carbon Vinyl glass cards (blur-16px)",
      "High-contrast dark walnut active button text (#170d06)",
    ],
    swatchColors: ["#170d06", "#f59e0b", "#e65c00", "#d4af37"],
    multiAccentGradient: "from-[#f59e0b] via-[#e65c00] to-[#d4af37]",
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
    waveformGradient: "from-[#f59e0b] via-[#e65c00] to-[#d4af37]",
    progressGradient: "bg-gradient-to-r from-[#f59e0b] via-[#e65c00] to-[#d4af37]",
    bannerGradient: "from-[#f59e0b]/20 via-[#e65c00]/15 to-transparent",
    mockup: {
      bannerGradient: "from-[#f59e0b] via-[#e65c00] to-[#d4af37]",
      heroTitle: "Analog Master Tape & Vinyl",
      heroSubtitle: "Solar Gold & Warm Copper Acoustics",
      chipLabels: ["Vacuum Tube", "DSD Master", "Direct Cut", "24-bit 192k"],
      dockStyle: "bg-[#261408]/90 border-[#f59e0b]/40 shadow-2xl",
    },

    accentSecondaryBg: "bg-[#e65c00]",
    accentSecondaryText: "text-[#e65c00]",
    accentTertiaryBg: "bg-[#d4af37]",
    accentTertiaryText: "text-[#d4af37]",

    btnPrimary: "bg-gradient-to-r from-[#f59e0b] to-[#e65c00] hover:brightness-110 text-[#170d06] font-extrabold shadow-lg shadow-[#f59e0b]/20 active:scale-95",
    btnSecondary: "bg-[#381e0b]/80 hover:bg-[#4a2810] text-[#f59e0b] border border-[#f59e0b]/30 font-semibold",
    navActive: "bg-gradient-to-r from-[#f59e0b]/20 to-[#e65c00]/20 text-[#f59e0b] border border-[#f59e0b]/40 font-bold",
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
      "Multi-accent: Sunset Magenta (#ff2a8d) + Neon Coral (#ff758c)",
      "Twilight Violet (#8a2be2) tertiary depth & ambient reflections",
      "Frosted Twilight Rose tinted-glass cards (blur-16px)",
      "High-contrast crisp white active button text (#ffffff)",
    ],
    swatchColors: ["#1e0b36", "#ff2a8d", "#ff758c", "#8a2be2"],
    multiAccentGradient: "from-[#ff2a8d] via-[#ff758c] to-[#8a2be2]",
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
    waveformGradient: "from-[#ff2a8d] via-[#ff758c] to-[#8a2be2]",
    progressGradient: "bg-gradient-to-r from-[#ff2a8d] via-[#ff758c] to-[#8a2be2]",
    bannerGradient: "from-[#ff2a8d]/25 via-[#ff758c]/20 to-transparent",
    mockup: {
      bannerGradient: "from-[#ff2a8d] via-[#ff758c] to-[#8a2be2]",
      heroTitle: "Sunset FM 1984 & Chill",
      heroSubtitle: "Neon Horizon & Synth Chords",
      chipLabels: ["Vaporwave", "Future Funk", "Retrowave", "Dream Pop"],
      dockStyle: "bg-[#1e0b36]/90 border-[#ff2a8d]/40 shadow-[0_0_25px_rgba(255,42,141,0.3)]",
    },

    accentSecondaryBg: "bg-[#ff758c]",
    accentSecondaryText: "text-[#ff758c]",
    accentTertiaryBg: "bg-[#8a2be2]",
    accentTertiaryText: "text-[#8a2be2]",

    btnPrimary: "bg-gradient-to-r from-[#ff2a8d] to-[#ff758c] hover:brightness-110 text-white font-extrabold shadow-lg shadow-[#ff2a8d]/25 active:scale-95",
    btnSecondary: "bg-[#33114a]/80 hover:bg-[#431761] text-[#ff758c] border border-[#ff2a8d]/30 font-semibold",
    navActive: "bg-gradient-to-r from-[#ff2a8d]/20 to-[#ff758c]/20 text-[#ff2a8d] border border-[#ff2a8d]/40 font-bold",
    navInactive: "text-fuchsia-300/70 hover:text-[#fdf4ff] hover:bg-fuchsia-950/40",
    trackRowHover: "hover:bg-[#ff2a8d]/10",
  },
};

// Also keep a backward-compatible alias for 'ytmusic-red' resolving to candyland
(FULL_APP_DESIGNS as any)["ytmusic-red"] = FULL_APP_DESIGNS.candyland;
