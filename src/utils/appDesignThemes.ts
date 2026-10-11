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
  isNebulaGlass?: boolean;
  isDesigner?: boolean;
  isEmeraldWilderness?: boolean;
  isHommeMosaic?: boolean;
  isCyberpunkCity?: boolean;
  isSugarTimeJazz?: boolean;
  isHardRock?: boolean;
  isBespoke?: boolean;
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
    name: "Haute Couture Designer",
    subtitle: "Dynamic Shifting Charcoal, 3D Glossy Frosted Glass & Metallic Gold Gradients",
    badge: "DESIGNER EDITORIAL",
    num: "01",
    themePreset: "designer-ivory",
    playerLayout: "designer-waveform",
    description:
      "A luxury haute-couture editorial aesthetic inspired by aesthetic portfolios with animated shifting charcoal shadows, dynamically morphing trapezoid line wireframes, 5-second ebbing background colors, 3D glossy frosted glass cards, and shimmering metallic gold gradients.",
    features: [
      "Shifting charcoal shadows with 5s ebbing color cycles",
      "Dynamic outline pattern of morphing geometric trapezoid lines",
      "3D glossy dark frosted glass cards with specular top edge highlights",
      "Multi-stop metallic champagne gold gradients & luxury serif typography",
    ],
    swatchColors: ["#0e0d11", "#2a242c", "#dfb86c", "#f7e2ab"],
    multiAccentGradient: "from-[#f7e2ab] via-[#dfb86c] to-[#a07422]",
    isLight: false,
    isDesigner: true,
    themeColorMeta: "#0e0d11",

    bgCanvas: "from-[#1a171d] via-[#121014] to-[#0a090c]",
    cardBg: "bg-gradient-to-b from-[#2e2832]/75 via-[#1d1a20]/80 to-[#121014]/90 backdrop-blur-2xl border border-white/[0.12] border-t-[#f7e2ab]/35 border-b-black/50 shadow-[inset_0_1.5px_1.5px_rgba(255,245,225,0.25),inset_0_-1.5px_2px_rgba(0,0,0,0.4),0_14px_40px_rgba(0,0,0,0.7),0_0_24px_rgba(223,184,108,0.08)]",
    headerBg: "bg-[#141216]/65 backdrop-blur-2xl border-b border-white/[0.10] border-b-black/40",
    sidebarBg: "bg-[#141216]/60 backdrop-blur-2xl border-r border-white/[0.10] border-r-black/40",
    bottomNavBg: "bg-[#141216]/75 backdrop-blur-3xl border-t border-white/[0.14] border-t-[#f7e2ab]/30",
    borderSubtle: "border-white/[0.12] border-t-[#f7e2ab]/30 border-b-black/40",
    borderStrong: "border-amber-400/40 border-t-[#f7e2ab]/60",
    textPrimary: "text-[#fdfcf9]",
    textSecondary: "text-[#e6decb]",
    textMuted: "text-[#b0a694]",
    accentBg: "bg-gradient-to-r from-[#f7e2ab] via-[#dfb86c] to-[#a07422]",
    accentText: "text-[#dfb86c]",
    accentBorder: "border-[#dfb86c]/40",
    accentContrastText: "text-[#120f14]",

    headingPrimary: "text-[#fdfcf9] drop-shadow-sm font-display",
    headingSecondary: "text-[#e6decb]",
    headingMuted: "text-[#b0a694]",
    cardHover: "hover:border-[#dfb86c]/50 hover:shadow-[0_20px_48px_rgba(0,0,0,0.85),inset_0_2px_2px_rgba(255,245,225,0.45),0_0_32px_rgba(223,184,108,0.2)]",
    modalBg: "bg-[#161318]/90 backdrop-blur-3xl border border-white/[0.16] border-t-[#f7e2ab]/45 border-b-black/60 shadow-[0_30px_80px_rgba(0,0,0,0.85),inset_0_2px_2px_rgba(255,245,225,0.4),0_0_36px_rgba(223,184,108,0.18)]",
    pillBg: "bg-gradient-to-b from-[#2e2832]/70 to-[#1a171e]/80 text-[#e6decb] border border-white/[0.12] border-t-[#f7e2ab]/30 shadow-[inset_0_1px_1px_rgba(255,245,225,0.2),0_4px_12px_rgba(0,0,0,0.4)] backdrop-blur-xl",
    pillActive: "bg-gradient-to-r from-[#f7e2ab] via-[#dfb86c] to-[#a07422] text-[#120f14] font-black shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.7),inset_0_-1.5px_2px_rgba(0,0,0,0.4),0_6px_20px_rgba(223,184,108,0.45)] border-t border-white/60 border-b border-black/40",
    inputBg: "bg-[#18151a]/80 text-[#fdfcf9] border border-white/[0.14] border-t-black/40 border-b-white/20 shadow-inner backdrop-blur-xl focus:border-[#dfb86c] focus:ring-1 focus:ring-[#dfb86c]/40",
    glowRing: "shadow-[0_0_30px_rgba(223,184,108,0.35)]",
    waveformGradient: "from-[#f7e2ab] via-[#dfb86c] to-[#a07422]",
    progressGradient: "bg-gradient-to-r from-[#f7e2ab] via-[#dfb86c] to-[#a07422]",
    bannerGradient: "from-[#dfb86c]/25 via-[#a07422]/15 to-transparent",
    mockup: {
      bannerGradient: "from-[#f7e2ab] via-[#dfb86c] to-[#a07422]",
      heroTitle: "Editorial Classical & Jazz",
      heroSubtitle: "Haute Couture Masterpieces",
      chipLabels: ["Aesthetic Portfolio", "3D Glass", "Hi-Res Master", "Haute Couture"],
      dockStyle: "bg-gradient-to-b from-[#2e2832]/85 to-[#161318]/95 border border-white/[0.18] border-t-[#f7e2ab]/40 shadow-2xl",
    },

    accentSecondaryBg: "bg-[#f7e2ab]",
    accentSecondaryText: "text-[#f7e2ab]",
    accentTertiaryBg: "bg-[#a07422]",
    accentTertiaryText: "text-[#a07422]",

    btnPrimary: "bg-gradient-to-r from-[#f7e2ab] via-[#dfb86c] to-[#a07422] hover:brightness-110 text-[#120f14] font-black shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.75),inset_0_-2px_2px_rgba(0,0,0,0.45),0_8px_24px_rgba(223,184,108,0.45),0_4px_12px_rgba(0,0,0,0.5)] border-t border-white/60 border-b border-black/40 active:translate-y-0.5 transition-all",
    btnSecondary: "bg-gradient-to-b from-[#342e38]/75 to-[#1c1920]/85 hover:bg-white/[0.12] text-[#fdfcf9] border border-white/[0.16] border-t-[#f7e2ab]/40 border-b-black/50 backdrop-blur-2xl shadow-[inset_0_1.5px_1px_rgba(255,245,225,0.3),inset_0_-1.5px_2px_rgba(0,0,0,0.4),0_6px_18px_rgba(0,0,0,0.5)] font-bold active:translate-y-0.5 transition-all",
    navActive: "bg-gradient-to-r from-[#f7e2ab] via-[#dfb86c] to-[#a07422] text-[#120f14] font-black shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.7),inset_0_-1.5px_2px_rgba(0,0,0,0.35),0_6px_20px_rgba(223,184,108,0.45)] border-t border-white/50 border-b border-black/35",
    navInactive: "text-[#b0a694] hover:text-[#fdfcf9] hover:bg-white/[0.06] rounded-xl transition-all",
    trackRowHover: "hover:bg-white/[0.05] hover:border-l-2 hover:border-[#dfb86c]",
  },

  "cyberpunk-neon": {
    id: "cyberpunk-neon",
    name: "Cyberpunk Neon Glass",
    subtitle: "Sprawling Neon Metropolis & Atmospheric Night Drizzle",
    badge: "NEON SYNTH",
    num: "02",
    themePreset: "cyberpunk",
    playerLayout: "card-expanded",
    description:
      "A sprawling cyberpunk metropolis at night with towering illuminated skyscrapers, massive glowing holographic billboards in electric cyan and fuchsia magenta, cruising aerial vehicles with thruster wakes, and atmospheric night drizzle.",
    features: [
      "Cinematic cyberpunk city skyline with towering megastructures and glowing neon billboards",
      "Cruising aerial vehicles and spinners with navigation beacons and thruster light wakes",
      "Atmospheric slanted night drizzle across the glowing neon horizon",
      "Luminous Electric Cyan (#00f3ff) and Fuchsia Magenta (#ff007f) ambient volumetric haze",
      "Frosted obsidian player cards with high-contrast glowing accents",
    ],
    swatchColors: ["#0a0d1a", "#00f3ff", "#ff007f", "#7b2cbf"],
    multiAccentGradient: "from-[#00f3ff] via-[#ff007f] to-[#7b2cbf]",
    isLight: false,
    isCyberpunkCity: true,
    themeColorMeta: "#0a0d1a",

    bgCanvas: "from-[#0a0d1a] via-[#12092b] to-[#05030a]",
    cardBg: "bg-[#080c1e]/30 backdrop-blur-2xl",
    headerBg: "bg-[#060814]/35 backdrop-blur-2xl",
    sidebarBg: "bg-[#060814]/40 backdrop-blur-2xl",
    bottomNavBg: "bg-[#060814]/40 backdrop-blur-2xl",
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
    cardHover: "hover:bg-white/[0.12] hover:backdrop-blur-2xl",
    modalBg: "bg-[#080c1e]/55 backdrop-blur-3xl",
    pillBg: "bg-white/[0.08] backdrop-blur-md",
    pillActive: "bg-[#00f3ff] text-[#050814]",
    inputBg: "bg-[#0e132b]/40 backdrop-blur-xl text-white border-[#00f3ff]/30",
    glowRing: "shadow-[0_0_30px_rgba(0,243,255,0.4)]",
    waveformGradient: "from-[#00f3ff] via-[#ff007f] to-[#7b2cbf]",
    progressGradient: "bg-gradient-to-r from-[#00f3ff] via-[#ff007f] to-[#7b2cbf]",
    bannerGradient: "from-[#00f3ff]/25 via-[#ff007f]/20 to-transparent",
    mockup: {
      bannerGradient: "from-[#00f3ff] via-[#ff007f] to-[#7b2cbf]",
      heroTitle: "Cyber Synth & Darksynth",
      heroSubtitle: "Neon Future Overdrive",
      chipLabels: ["Cyberpunk", "Synthwave", "Darksynth", "Glitch"],
      dockStyle: "bg-[#080c1e]/40 backdrop-blur-2xl border-[#00f3ff]/40 shadow-[0_0_30px_rgba(0,243,255,0.25)]",
    },

    accentSecondaryBg: "bg-[#ff007f]",
    accentSecondaryText: "text-[#ff007f]",
    accentTertiaryBg: "bg-[#7b2cbf]",
    accentTertiaryText: "text-[#7b2cbf]",

    btnPrimary: "bg-gradient-to-r from-[#00f3ff]/85 to-[#ff007f]/85 hover:brightness-110 text-[#050814] font-extrabold shadow-lg shadow-[#00f3ff]/25 active:scale-95 backdrop-blur-md",
    btnSecondary: "bg-[#141938]/45 hover:bg-[#1c234e]/65 text-[#00f3ff] border border-[#00f3ff]/35 backdrop-blur-xl font-semibold",
    navActive: "bg-gradient-to-r from-[#00f3ff]/25 to-[#ff007f]/25 text-[#00f3ff] border border-[#00f3ff]/45 shadow-sm font-bold backdrop-blur-md",
    navInactive: "text-slate-400 hover:text-white hover:bg-white/5",
    trackRowHover: "hover:bg-[#00f3ff]/15 hover:backdrop-blur-sm",
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
    name: "Emerald Wilderness",
    subtitle: "5s Animated Slim Bands, Breeze Sway & Warm Fireflies",
    badge: "WILDERNESS GLASS",
    num: "04",
    themePreset: "emerald-synth",
    playerLayout: "minimal-capsule",
    isEmeraldWilderness: true,
    description:
      "A dynamic abstract forest sanctuary featuring continuous slim diagonal emerald and chartreuse bands on a synchronized 5-second slide and breeze sway cycle, atmospheric deep bokeh blur, living canopy light spots, and warm bioluminescent fireflies fluttering across the background.",
    features: [
      "Synchronized 5-second animation cycle across continuous slim emerald & chartreuse bands",
      "Organic breeze sway and subtle zooming in and out on a 5-second rhythmic cycle",
      "Deep atmospheric bokeh blur giving an out-of-focus camera depth of field strictly behind UI",
      "Warm golden bioluminescent fireflies fluttering across the viewport with pulsing glows",
      "Soft dappled canopy light spots illuminating the deep forest backdrop",
      "Isolated background layer ensuring zero interference or glitching with foreground components",
      "Ultra-frosted glass cards, windows, buttons, and modals with high transparency and 3D specular edges",
    ],
    swatchColors: ["#021a12", "#00f5a0", "#00d9f5", "#ffe066"],
    multiAccentGradient: "from-[#00f5a0] via-[#00e5cc] to-[#00d9f5]",
    isLight: false,
    themeColorMeta: "#021a12",

    bgCanvas: "from-[#01140e] via-[#032419] to-[#010d09]",
    cardBg: "bg-gradient-to-b from-white/[0.08] via-emerald-950/30 to-black/45 backdrop-blur-2xl backdrop-saturate-[190%] border border-emerald-500/25 border-t-white/45 border-b-black/60 shadow-[inset_0_1.5px_1.5px_rgba(255,255,255,0.42),inset_0_-1.5px_2px_rgba(0,0,0,0.48),0_16px_40px_rgba(0,10,7,0.7),0_0_20px_rgba(0,245,160,0.14)]",
    headerBg: "bg-gradient-to-b from-[#021f16]/65 via-[#011710]/75 to-[#010e08]/85 backdrop-blur-3xl border-b border-white/[0.18] shadow-[inset_0_-1px_1px_rgba(0,0,0,0.5),0_8px_30px_rgba(0,0,0,0.6)]",
    sidebarBg: "bg-gradient-to-r from-[#011710]/80 via-[#021f16]/70 to-[#01140e]/65 backdrop-blur-3xl border-r border-white/[0.18] shadow-[inset_-1px_0_1px_rgba(0,0,0,0.5),8px_0_30px_rgba(0,0,0,0.6)]",
    bottomNavBg: "bg-gradient-to-t from-[#010e08]/90 via-[#021f16]/80 to-[#02281c]/70 backdrop-blur-3xl border-t border-white/[0.25] border-t-white/40 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.45),0_-12px_36px_rgba(0,0,0,0.7),0_0_24px_rgba(0,245,160,0.22)]",
    borderSubtle: "border-emerald-500/25",
    borderStrong: "border-[#00f5a0]/50",
    textPrimary: "text-[#e6fff5]",
    textSecondary: "text-[#a7f3d0]",
    textMuted: "text-emerald-300/70",
    accentBg: "bg-gradient-to-r from-[#00f5a0] via-[#00e5cc] to-[#00d9f5]",
    accentText: "text-[#00f5a0]",
    accentBorder: "border-[#00f5a0]/50",
    accentContrastText: "text-[#011a12]",

    headingPrimary: "text-[#e6fff5] font-extrabold tracking-tight",
    headingSecondary: "text-[#a7f3d0] font-bold",
    headingMuted: "text-emerald-300/70",
    cardHover: "hover:bg-white/[0.14] hover:border-emerald-400/40 hover:border-t-white/70 hover:shadow-[inset_0_2px_2px_rgba(255,255,255,0.65),inset_0_-2px_3px_rgba(0,0,0,0.55),0_22px_50px_rgba(0,10,7,0.8),0_0_32px_rgba(0,245,160,0.32)] hover:-translate-y-1 transition-all duration-300",
    modalBg: "bg-gradient-to-b from-[#032e21]/80 via-[#021f16]/90 to-[#01140e]/95 backdrop-blur-3xl backdrop-saturate-[200%] border border-[#00f5a0]/30 border-t-white/50 border-b-black/70 shadow-[0_30px_90px_rgba(0,0,0,0.85),inset_0_2px_2px_rgba(255,255,255,0.55),inset_0_-2px_3px_rgba(0,0,0,0.6),0_0_45px_rgba(0,245,160,0.28)]",
    pillBg: "bg-gradient-to-r from-emerald-950/45 to-teal-950/35 backdrop-blur-xl border border-white/[0.18] border-t-white/35 border-b-black/45 text-[#a7f3d0] shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_4px_12px_rgba(0,0,0,0.4)]",
    pillActive: "bg-gradient-to-r from-[#00f5a0] via-[#00e5cc] to-[#00d9f5] text-[#011a12] font-black border-t border-white/60 border-b border-black/40 shadow-[0_0_24px_rgba(0,245,160,0.6),inset_0_1.5px_1px_rgba(255,255,255,0.7)]",
    inputBg: "bg-gradient-to-b from-black/40 to-[#022419]/50 backdrop-blur-xl text-[#e6fff5] border border-emerald-500/25 border-b-white/20 border-t-black/60 focus:border-[#00f5a0] focus:ring-2 focus:ring-[#00f5a0]/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),0_0_16px_rgba(0,245,160,0.15)]",
    glowRing: "shadow-[0_0_32px_rgba(0,245,160,0.55)]",
    waveformGradient: "from-[#00f5a0] via-[#00e5cc] to-[#00d9f5]",
    progressGradient: "bg-gradient-to-r from-[#00f5a0] via-[#00e5cc] to-[#00d9f5]",
    bannerGradient: "from-[#00f5a0]/25 via-[#00d9f5]/15 to-transparent",
    mockup: {
      bannerGradient: "from-[#00f5a0] via-[#00e5cc] to-[#00d9f5]",
      heroTitle: "Emerald Wilderness",
      heroSubtitle: "5s Animated Bands & Fireflies",
      chipLabels: ["5s Rhythm Cycle", "Breeze Sway & Zoom", "Bokeh Blur Depth", "Warm Fireflies"],
      dockStyle: "bg-gradient-to-r from-[#021f16]/80 via-[#011710]/85 to-[#02281c]/80 backdrop-blur-3xl border border-emerald-400/30 border-t-white/45 border-b-black/50 shadow-[inset_0_1.5px_1.5px_rgba(255,255,255,0.45),0_12px_36px_rgba(0,0,0,0.7),0_0_28px_rgba(0,245,160,0.3)] rounded-full",
    },

    accentSecondaryBg: "bg-[#00d9f5]",
    accentSecondaryText: "text-[#00d9f5]",
    accentTertiaryBg: "bg-[#ffe066]",
    accentTertiaryText: "text-[#ffe066]",

    btnPrimary: "bg-gradient-to-r from-[#00f5a0] via-[#00e5cc] to-[#00d9f5] hover:brightness-115 text-[#011a12] font-black tracking-wide shadow-[0_0_24px_rgba(0,245,160,0.6),inset_0_1.5px_1px_rgba(255,255,255,0.7),inset_0_-1.5px_2px_rgba(0,0,0,0.4),0_6px_18px_rgba(0,0,0,0.5)] border-t border-white/60 border-b border-black/40 active:scale-95 transition-all",
    btnSecondary: "bg-gradient-to-b from-white/[0.14] via-emerald-950/40 to-black/50 hover:from-white/[0.22] hover:to-emerald-900/40 text-[#e6fff5] hover:text-white border border-[#00f5a0]/30 border-t-white/45 border-b-black/60 backdrop-blur-xl font-bold shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.35),0_6px_18px_rgba(0,0,0,0.4)] active:scale-95 transition-all",
    navActive: "bg-gradient-to-r from-[#00f5a0]/25 via-[#00d9f5]/15 to-transparent text-[#00f5a0] border border-emerald-400/50 border-t-white/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_16px_rgba(0,245,160,0.35)] font-black rounded-2xl",
    navInactive: "text-emerald-300/70 hover:text-white hover:bg-white/[0.08] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)] rounded-2xl",
    trackRowHover: "hover:bg-white/[0.08] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),inset_0_-1px_1px_rgba(0,0,0,0.3),0_6px_20px_rgba(0,0,0,0.4),0_0_20px_rgba(0,245,160,0.18)]",
  },

  "audiophile-gold": {
    id: "audiophile-gold",
    name: "Studio Homme Mosaïque",
    subtitle: "Dark Midnight Blue, Slate Blue-Grey, Smoked Glass & Mocha Mousse",
    badge: "HOMME ATELIER",
    num: "05",
    themePreset: "rose-gold",
    playerLayout: "split-slider",
    description:
      "A masculine luxury homme aesthetic featuring ebbing geometric mosaic triangles of dark midnight blue, lighter slate-blueish-grey, and mocha mousse, paired with smoky dark glass cards and refined metallic gradients.",
    features: [
      "Dynamic ebbing mosaic triangles with slate-steel seams & moving nodes",
      "Natural masculine textures: Midnight Blue Slate, Mocha Mousse, Light Slate Blue-Grey & Fluting",
      "Smoky midnight glass cards (blur-24px) with specular steel top edge highlights",
      "Multi-stop metallic slate-blue & brushed steel gradient buttons, pills, and badges",
    ],
    swatchColors: ["#080c16", "#8fa7c2", "#4e3a2f", "#cbd5e1"],
    multiAccentGradient: "from-[#b8cadc] via-[#8fa7c2] to-[#4a5f78]",
    isLight: false,
    isHommeMosaic: true,
    themeColorMeta: "#080c16",

    bgCanvas: "from-[#080c16] via-[#0e1422] to-[#05080e]",
    cardBg: "bg-[#0c121e]/65 backdrop-blur-2xl border border-[#8fa7c2]/20 border-t-white/[0.14] shadow-[0_12px_36px_rgba(0,0,0,0.55),inset_0_1px_1px_rgba(255,255,255,0.08)]",
    headerBg: "bg-[#0c121e]/75 backdrop-blur-2xl border-b border-[#8fa7c2]/20 border-t-white/[0.08]",
    sidebarBg: "bg-[#080d19]/80 backdrop-blur-3xl border-r border-[#8fa7c2]/20",
    bottomNavBg: "bg-[#080d19]/85 backdrop-blur-3xl border-t border-[#8fa7c2]/20",
    borderSubtle: "border-[#8fa7c2]/20 border-t-white/[0.12]",
    borderStrong: "border-[#8fa7c2]/45 border-t-white/[0.22]",
    textPrimary: "text-[#f1f5f9]",
    textSecondary: "text-[#cbd5e1]",
    textMuted: "text-[#7e91a6]",
    accentBg: "bg-gradient-to-r from-[#b8cadc] via-[#8fa7c2] to-[#4a5f78]",
    accentText: "text-[#9bb0c6]",
    accentBorder: "border-[#8fa7c2]/45",
    accentContrastText: "text-[#070b14]",

    headingPrimary: "text-[#f8fafc]",
    headingSecondary: "text-[#9bb0c6]",
    headingMuted: "text-[#7e91a6]",
    cardHover: "hover:bg-white/[0.06] hover:border-[#8fa7c2]/40 hover:shadow-[0_16px_44px_rgba(0,0,0,0.6),0_0_20px_rgba(143,167,194,0.18)] transition-all",
    modalBg: "bg-gradient-to-b from-[#111827]/92 via-[#0c121e]/96 to-[#070a12]/98 backdrop-blur-3xl border border-[#8fa7c2]/30 border-t-white/[0.2] shadow-2xl",
    pillBg: "bg-gradient-to-b from-white/[0.08] via-[#141b29]/60 to-[#090d16]/80 backdrop-blur-xl border border-[#8fa7c2]/25 text-[#d0dbe7] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]",
    pillActive: "bg-gradient-to-r from-[#b8cadc] via-[#8fa7c2] to-[#4a5f78] text-[#070b14] font-extrabold shadow-[0_0_18px_rgba(143,167,194,0.45),inset_0_1px_1px_rgba(255,255,255,0.6)] border-t border-white/60",
    inputBg: "bg-[#101724]/70 backdrop-blur-xl text-[#f1f5f9] border-[#8fa7c2]/25 focus:border-[#8fa7c2]/65 shadow-inner",
    glowRing: "shadow-[0_0_30px_rgba(143,167,194,0.35)]",
    waveformGradient: "from-[#c8d8e8] via-[#8fa7c2] to-[#4a5f78]",
    progressGradient: "bg-gradient-to-r from-[#c8d8e8] via-[#8fa7c2] to-[#4a5f78]",
    bannerGradient: "from-[#8fa7c2]/25 via-[#4a5f78]/15 to-transparent",
    mockup: {
      bannerGradient: "from-[#8fa7c2] to-[#35485c]",
      heroTitle: "Studio Homme Mosaïque",
      heroSubtitle: "Dark Midnight Blue, Slate Blue-Grey & Mocha Mousse",
      chipLabels: ["Midnight Slate", "Slate Blue-Grey", "Smoked Glass", "Mocha Mousse"],
      dockStyle: "bg-[#0c121e]/85 border-[#8fa7c2]/35 backdrop-blur-2xl shadow-2xl",
    },

    accentSecondaryBg: "bg-gradient-to-r from-[#cbd5e1] to-[#94a3b8]",
    accentSecondaryText: "text-[#cbd5e1]",
    accentTertiaryBg: "bg-gradient-to-r from-[#523c2e] to-[#36241a]",
    accentTertiaryText: "text-[#cbd5e1]",

    btnPrimary: "bg-gradient-to-r from-[#b8cadc] via-[#8fa7c2] to-[#4a5f78] hover:brightness-115 text-[#070b14] font-extrabold tracking-wide shadow-[0_4px_22px_rgba(143,167,194,0.35),inset_0_1.5px_1px_rgba(255,255,255,0.7),inset_0_-1.5px_2px_rgba(0,0,0,0.4)] border-t border-white/60 border-b border-black/50 active:scale-95 transition-all",
    btnSecondary: "bg-gradient-to-b from-white/[0.12] via-[#1a2333]/70 to-[#0c111c]/85 hover:from-white/[0.2] hover:via-[#222e42]/70 text-[#e2e8f0] border border-[#8fa7c2]/35 border-t-white/30 backdrop-blur-xl font-bold shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.25),0_6px_18px_rgba(0,0,0,0.4)] active:scale-95 transition-all",
    navActive: "bg-gradient-to-r from-[#8fa7c2]/25 via-[#4a5f78]/15 to-transparent text-[#d8e5f2] border border-[#8fa7c2]/45 border-t-white/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_4px_16px_rgba(143,167,194,0.25)] font-black rounded-2xl",
    navInactive: "text-[#7e91a6] hover:text-[#f1f5f9] hover:bg-gradient-to-r hover:from-white/[0.08] hover:to-transparent rounded-2xl transition-all",
    trackRowHover: "hover:bg-white/[0.06] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_6px_20px_rgba(0,0,0,0.4)] transition-all",
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

    accentSecondaryBg: "bg-[#3A3530]",
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

  "nebula-liquid-glass": {
    id: "nebula-liquid-glass",
    name: "Nebula Liquid Glass",
    subtitle: "Animated Saturated Gradient Canvas, Frosted Liquid Glass & Glowing Refraction",
    badge: "LIQUID GLASS",
    num: "09",
    themePreset: "nebula-liquid-glass",
    playerLayout: "floating-dock",
    isNebulaGlass: true,
    description:
      "A radiant cosmic aesthetic featuring an animated multi-color background with floating glowing orbs, fluid aurora gradients, and frosted liquid glass windows with chromatic refraction.",
    features: [
      "Live animated cosmic gradient canvas with shifting glowing orbs & fluid aurora",
      "Translucent frosted liquid glass cards with chromatic refraction & crisp highlights",
      "Vibrant high-chroma neon palette (Hot Magenta #ff007f, Sunset Gold #ff7b00, Cyan #00f0ff)",
      "Floating liquid glass player dock with iridescent animated spectrum indicators",
    ],
    swatchColors: ["#0c071e", "#ff007f", "#ff7b00", "#00f0ff"],
    multiAccentGradient: "from-[#ff007f] via-[#ec4899] via-[#ff7b00] to-[#00f0ff]",
    isLight: false,
    themeColorMeta: "#0c071e",

    bgCanvas: "from-[#0c071e] via-[#150a2e] to-[#070312]",
    cardBg: "bg-white/[0.035] backdrop-blur-3xl backdrop-saturate-[200%] border border-white/[0.18] border-t-white/35 border-b-black/40 shadow-[inset_0_1.5px_1.5px_rgba(255,255,255,0.55),inset_0_-1.5px_2px_rgba(0,0,0,0.35),0_14px_40px_rgba(0,0,0,0.65),0_0_24px_rgba(255,0,127,0.15)]",
    headerBg: "bg-[#0c071e]/35 backdrop-blur-3xl border-b border-white/[0.16] shadow-[inset_0_-1px_1px_rgba(0,0,0,0.4),0_8px_30px_rgba(0,0,0,0.5)]",
    sidebarBg: "bg-[#0c071e]/40 backdrop-blur-3xl border-r border-white/[0.16] shadow-[inset_-1px_0_1px_rgba(0,0,0,0.4),8px_0_30px_rgba(0,0,0,0.5)]",
    bottomNavBg: "bg-[#0c071e]/45 backdrop-blur-3xl border-t border-white/[0.18] border-t-white/30 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.4),0_-12px_36px_0_rgba(0,0,0,0.65),0_0_28px_rgba(255,0,127,0.22)]",
    borderSubtle: "border-white/[0.14]",
    borderStrong: "border-pink-500/50",
    textPrimary: "text-white",
    textSecondary: "text-pink-100/85",
    textMuted: "text-purple-300/70",
    accentBg: "bg-gradient-to-r from-[#ff007f] via-[#ec4899] to-[#ff7b00]",
    accentText: "text-[#ff2a85]",
    accentBorder: "border-[#ff007f]/50",
    accentContrastText: "text-white",

    headingPrimary: "text-white font-extrabold tracking-tight",
    headingSecondary: "text-pink-100 font-bold",
    headingMuted: "text-purple-200/70",
    cardHover: "hover:bg-white/[0.07] hover:border-white/[0.30] hover:border-t-white/60 hover:shadow-[inset_0_2px_2px_rgba(255,255,255,0.7),inset_0_-2px_3px_rgba(0,0,0,0.45),0_20px_48px_rgba(0,0,0,0.75),0_0_32px_rgba(255,0,127,0.28)] hover:-translate-y-1 transition-all duration-300",
    modalBg: "bg-[#0c071e]/65 backdrop-blur-3xl border border-white/[0.22] border-t-white/45 border-b-black/60 shadow-[0_30px_80px_rgba(0,0,0,0.85),inset_0_2px_2px_rgba(255,255,255,0.6),inset_0_-2px_3px_rgba(0,0,0,0.5),0_0_45px_rgba(255,0,127,0.35)]",
    pillBg: "bg-white/[0.035] backdrop-blur-2xl border border-white/[0.18] border-t-white/35 border-b-black/35 text-pink-100 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),inset_0_-1px_1px_rgba(0,0,0,0.3),0_4px_12px_rgba(0,0,0,0.4)]",
    pillActive: "bg-gradient-to-r from-[#ff007f] via-[#d946ef] to-[#00f0ff] text-white font-black shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.65),inset_0_-1.5px_2px_rgba(0,0,0,0.35),0_0_24px_rgba(255,0,127,0.6),0_6px_16px_rgba(0,0,0,0.4)] border-t border-white/50 border-b border-black/40",
    inputBg: "bg-white/[0.03] backdrop-blur-2xl text-white border border-white/[0.18] border-b-white/25 border-t-black/50 focus:border-pink-500 focus:bg-white/[0.07] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),inset_0_-1px_1px_rgba(255,255,255,0.2)]",
    glowRing: "shadow-[0_0_32px_rgba(255,0,127,0.55)]",
    waveformGradient: "from-[#ff007f] via-[#d946ef] to-[#00f0ff]",
    progressGradient: "bg-gradient-to-r from-[#ff007f] via-[#ec4899] via-[#ff7b00] to-[#00f0ff]",
    bannerGradient: "from-[#ff007f]/30 via-[#8b5cf6]/25 to-transparent",
    mockup: {
      bannerGradient: "from-[#ff007f] via-[#ec4899] via-[#ff7b00] to-[#00f0ff]",
      heroTitle: "Nebula Liquid Glass",
      heroSubtitle: "Animated Cosmic Aurora & Frosted Glass",
      chipLabels: ["Liquid Glass", "Animated Aurora", "Vibrant Chro", "Lossless"],
      dockStyle: "bg-white/[0.06] backdrop-blur-3xl border border-white/[0.22] border-t-white/40 border-b-black/40 shadow-[inset_0_1.5px_1.5px_rgba(255,255,255,0.5),inset_0_-1.5px_2px_rgba(0,0,0,0.35),0_12px_36px_rgba(0,0,0,0.65),0_0_28px_rgba(255,0,127,0.3)] rounded-full",
    },

    accentSecondaryBg: "bg-[#ff7b00]",
    accentSecondaryText: "text-[#ff9f1c]",
    accentTertiaryBg: "bg-[#00f0ff]",
    accentTertiaryText: "text-[#38bdf8]",

    btnPrimary: "bg-gradient-to-r from-[#ff007f] via-[#ec4899] to-[#ff7b00] hover:brightness-115 text-white font-black shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.65),inset_0_-2px_2px_rgba(0,0,0,0.35),0_8px_24px_rgba(255,0,127,0.6),0_4px_12px_rgba(0,0,0,0.4)] border-t border-white/50 border-b border-black/35 active:translate-y-0.5 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] transition-all",
    btnSecondary: "bg-white/[0.04] hover:bg-white/[0.12] text-white border border-white/[0.18] border-t-white/35 border-b-black/40 backdrop-blur-2xl shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.45),inset_0_-1.5px_2px_rgba(0,0,0,0.35),0_6px_18px_rgba(0,0,0,0.5)] active:translate-y-0.5 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] font-bold transition-all",
    navActive: "bg-gradient-to-r from-[#ff007f]/25 via-[#ff7b00]/15 to-transparent text-white border border-pink-400/50 border-t-white/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_16px_rgba(255,0,127,0.35)] font-black rounded-2xl",
    navInactive: "text-pink-200/70 hover:text-white hover:bg-white/[0.06] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)] rounded-2xl",
    trackRowHover: "hover:bg-white/[0.06] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),inset_0_-1px_1px_rgba(0,0,0,0.3),0_6px_20px_rgba(0,0,0,0.4),0_0_20px_rgba(255,0,127,0.18)]",
  },

  "hard-rock": {
    id: "hard-rock",
    name: "Hard Rock",
    subtitle: "Cherry-Red Dark Gradient, Purple & Gold Glow & Frosted Glass",
    badge: "HARD ROCK",
    num: "10",
    themePreset: "hard-rock",
    playerLayout: "floating-dock",
    isHardRock: true,
    description:
      "A soulful, high-energy Hard Rock aesthetic featuring cherry-red dark gradients, frosted glass panels, high-contrast off-white typography, and ambient purple and gold depth glow.",
    features: [
      "Cherry-Red dark gradient pill buttons and active control standards",
      "Frosted glass cards & modals with 16px blur and subtle gold borders",
      "Signature purple ambient depth glow behind active navigation and stage elements",
      "WCAG AAA contrast typography (#FFFFFF, #E5E7EB) and cherry-pink accents",
    ],
    swatchColors: ["#120e0b", "#1a1410", "#E024B3", "#800F5E"],
    multiAccentGradient: "from-[#E024B3] via-[#800F5E] to-[#2A0520]",
    isLight: false,
    themeColorMeta: "#120e0b",

    bgCanvas: "from-[#120e0b] via-[#1a1410] to-[#0d0a08]",
    cardBg: "bg-[rgba(20,15,25,0.6)] backdrop-blur-xl border border-[rgba(212,175,55,0.35)] shadow-[0_0_16px_rgba(192,132,252,0.22),inset_0_0_10px_rgba(192,132,252,0.05)]",
    headerBg: "bg-[rgba(20,15,25,0.85)] backdrop-blur-2xl border-b border-white/[0.1]",
    sidebarBg: "bg-[rgba(20,15,25,0.95)] backdrop-blur-2xl border-r border-white/[0.1]",
    bottomNavBg: "bg-[rgba(20,15,25,0.95)] backdrop-blur-2xl border-t border-white/[0.1]",
    borderSubtle: "border-white/[0.1]",
    borderStrong: "border-[rgba(212,175,55,0.35)]",
    textPrimary: "text-[#FFFFFF]",
    textSecondary: "text-[#E5E7EB]",
    textMuted: "text-[#9CA3AF]",
    accentBg: "bg-[#E024B3]",
    accentText: "text-[#E024B3]",
    accentBorder: "border-[rgba(255,105,180,0.4)]",
    accentContrastText: "text-[#FFFFFF]",

    headingPrimary: "text-[#FFFFFF] font-bold tracking-tight",
    headingSecondary: "text-[#E5E7EB] font-semibold",
    headingMuted: "text-[#9CA3AF]",
    cardHover: "hover:bg-[rgba(30,22,35,0.7)] hover:border-[rgba(212,175,55,0.5)] hover:-translate-y-1 transition-all duration-300",
    modalBg: "bg-[rgba(20,15,25,0.95)] backdrop-blur-2xl border border-[rgba(212,175,55,0.35)] shadow-[0_0_25px_rgba(192,132,252,0.3)]",
    pillBg: "bg-white/[0.08] backdrop-blur-xl border border-white/[0.15] text-[#E5E7EB]",
    pillActive: "bg-gradient-to-br from-[#E024B3] via-[#800F5E] to-[#2A0520] text-white font-semibold shadow-[0_0_12px_rgba(224,36,179,0.4),inset_0_1px_1px_rgba(255,255,255,0.3)] border border-pink-400/40",
    inputBg: "bg-white/[0.08] backdrop-blur-xl text-[#FFFFFF] border border-white/[0.15] focus:border-[#E024B3] shadow-inner",
    glowRing: "shadow-[0_0_16px_rgba(192,132,252,0.22)]",
    waveformGradient: "from-[#E024B3] via-[#800F5E] to-[#9333ea]",
    progressGradient: "bg-gradient-to-r from-[#E024B3] via-[#800F5E] to-[#9333ea]",
    bannerGradient: "from-[#E024B3]/20 via-[#9333ea]/15 to-transparent",
    mockup: {
      heroTitle: "Hard Rock",
      heroSubtitle: "Cherry-Red Dark Gradient & Purple Depth Glow",
      chipLabels: ["Hard Rock", "Cherry-Red", "Purple Depth", "Lossless"],
      dockStyle: "bg-[rgba(28,22,17,0.75)] backdrop-blur-2xl border border-[rgba(212,175,55,0.35)] shadow-2xl rounded-full",
      bannerGradient: "from-[#120e0b] via-[#1a1410] to-[#0d0a08]",
    },

    accentSecondaryBg: "bg-[#800F5E]",
    accentSecondaryText: "text-[#FF69B4]",
    accentTertiaryBg: "bg-[#9333ea]",
    accentTertiaryText: "text-[#a855f7]",

    btnPrimary: "bg-gradient-to-br from-[#E024B3] via-[#800F5E] to-[#2A0520] hover:brightness-110 text-white font-semibold shadow-[0_0_12px_rgba(224,36,179,0.4),inset_0_1px_1px_rgba(255,255,255,0.3)] border border-pink-400/40 active:translate-y-0.5 transition-all",
    btnSecondary: "bg-white/[0.08] hover:bg-white/[0.14] text-[#E5E7EB] border border-white/[0.15] font-semibold opacity-100 transition-all",
    navActive: "text-[#FFFFFF] font-semibold relative bg-[radial-gradient(circle,rgba(224,36,179,0.65)_0%,rgba(128,15,94,0.25)_50%,transparent_75%)] rounded-xl",
    navInactive: "text-[#E5E7EB] hover:text-[#FFFFFF] hover:bg-white/[0.05] rounded-xl transition-all",
    trackRowHover: "hover:bg-white/[0.06] transition-all",
  },

  bespoke: {
    id: "bespoke",
    name: "Bespoke",
    subtitle: "Custom 4-Color Palette, Liquid Glass & Refractive Glow",
    badge: "BESPOKE",
    num: "11",
    themePreset: "bespoke",
    playerLayout: "floating-dock",
    isNebulaGlass: true,
    isBespoke: true,
    description:
      "A personalized liquid glass experience with your own 4 custom theme colors. Features an interactive gradient swatch picker, direct hex input, animated cosmic fluid canvas, and frosted glass refraction.",
    features: [
      "Custom 4-color theme palette with live gradient swatch picker & hex input",
      "Animated cosmic gradient canvas with fluid glowing orbs driven by your colors",
      "Translucent frosted liquid glass cards with chromatic refraction & specular rims",
      "Locally persistent custom palette so your bespoke theme is always ready",
    ],
    swatchColors: ["#0a0d1a", "#ff007f", "#8b5cf6", "#00f0ff"],
    multiAccentGradient: "from-[#0a0d1a] to-[#ff007f]",
    isLight: false,
    themeColorMeta: "#0a0d1a",

    bgCanvas: "from-[#0a0d1a] via-[#150a2e] to-[#070312]",
    cardBg: "bg-white/[0.035] backdrop-blur-3xl backdrop-saturate-[200%] border border-white/[0.2] border-t-white/45 border-b-black/40 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.3),0_2px_6px_-1px_rgba(0,0,0,0.15),inset_0_1.5px_1.5px_rgba(255,255,255,0.5),inset_0_-1.5px_2px_rgba(0,0,0,0.3)]",
    headerBg: "bg-[#0a0d1a]/75 backdrop-blur-3xl border-b-2 border-black/35 shadow-[0_6px_18px_-2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1.5px_0_rgba(0,0,0,0.25)]",
    sidebarBg: "bg-[#0a0d1a]/80 backdrop-blur-3xl border-r-2 border-black/35 shadow-[8px_0_24px_-4px_rgba(0,0,0,0.35),inset_-1.5px_0_1px_rgba(0,0,0,0.3),inset_1px_0_0_rgba(255,255,255,0.3)]",
    bottomNavBg: "bg-[#0a0d1a]/80 backdrop-blur-3xl border-t-[1.5px] border-white/40 shadow-[0_-8px_32px_-4px_rgba(0,0,0,0.45),inset_0_1.5px_1px_rgba(255,255,255,0.42),inset_0_-1px_0_rgba(0,0,0,0.25)]",
    borderSubtle: "border-white/[0.14]",
    borderStrong: "border-white/30",
    textPrimary: "text-white",
    textSecondary: "text-pink-100/85",
    textMuted: "text-purple-300/70",
    accentBg: "bg-gradient-to-r from-[var(--bespoke-c1,#0a0d1a)] to-[var(--bespoke-c2,#ff007f)]",
    accentText: "text-[var(--bespoke-c2,#ff007f)]",
    accentBorder: "border-[var(--bespoke-c2,#ff007f)]/50",
    accentContrastText: "text-white",

    headingPrimary: "text-white font-extrabold tracking-tight",
    headingSecondary: "text-pink-100 font-bold",
    headingMuted: "text-purple-200/70",
    cardHover: "hover:bg-white/[0.07] hover:border-white/[0.30] hover:border-t-white/60 hover:-translate-y-1 transition-all duration-300",
    modalBg: "bg-[#0a0d1a]/85 backdrop-blur-3xl border border-white/[0.22] border-t-2 border-t-white/50 border-b-[2.5px] border-b-black/60 border-x border-white/25 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.7),0_8px_24px_-4px_rgba(0,0,0,0.4),inset_0_2px_2px_rgba(255,255,255,0.5),inset_0_-2.5px_3px_rgba(0,0,0,0.35)]",
    pillBg: "bg-white/[0.04] backdrop-blur-2xl border-t border-white/40 border-b-[1.5px] border-b-black/30 border-x border-white/20 text-pink-100 shadow-[0_2px_6px_-1px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_1px_rgba(0,0,0,0.2)]",
    pillActive: "pill-selected bg-gradient-to-r from-[var(--bespoke-c1,#0a0d1a)] to-[var(--bespoke-c2,#ff007f)] text-[var(--text-on-accent,#ffffff)] font-black shadow-[0_4px_12px_-2px_rgba(0,0,0,0.32),inset_0_1.5px_1px_rgba(255,255,255,0.65),inset_0_-2px_1px_rgba(0,0,0,0.32)] border-t-[1.5px] border-white/60 border-b-2 border-black/45 border-x border-white/25 active:translate-y-0.5 transition-all",
    inputBg: "bg-white/[0.03] backdrop-blur-2xl text-white border-t border-black/35 border-b border-white/35 border-x border-white/15 shadow-[inset_0_2.5px_5px_rgba(0,0,0,0.25),0_1px_0_rgba(255,255,255,0.2)]",
    glowRing: "shadow-[0_0_32px_var(--bespoke-c2,#ff007f)]",
    waveformGradient: "from-[var(--bespoke-c1,#0a0d1a)] to-[var(--bespoke-c2,#ff007f)]",
    progressGradient: "bg-gradient-to-r from-[var(--bespoke-c1,#0a0d1a)] to-[var(--bespoke-c2,#ff007f)]",
    bannerGradient: "from-[var(--bespoke-c1,#0a0d1a)]/30 to-[var(--bespoke-c2,#ff007f)]/25",
    mockup: {
      bannerGradient: "from-[var(--bespoke-c1,#0a0d1a)] to-[var(--bespoke-c2,#ff007f)]",
      heroTitle: "Bespoke Liquid Glass",
      heroSubtitle: "Your Custom Palette & Frosted Glass",
      chipLabels: ["Custom Palette", "Liquid Glass", "Color Swatches", "Lossless"],
      dockStyle: "bg-white/[0.06] backdrop-blur-3xl border border-white/[0.22] border-t-white/40 border-b-black/40 shadow-2xl rounded-full",
    },

    accentSecondaryBg: "bg-[var(--bespoke-c3,#8b5cf6)]",
    accentSecondaryText: "text-[var(--bespoke-c3,#8b5cf6)]",
    accentTertiaryBg: "bg-[var(--bespoke-c4,#00f0ff)]",
    accentTertiaryText: "text-[var(--bespoke-c4,#00f0ff)]",

    btnPrimary: "btn-signin button-primary bg-gradient-to-r from-[var(--bespoke-c1,#0a0d1a)] to-[var(--bespoke-c2,#ff007f)] hover:brightness-115 text-[var(--text-on-accent,#ffffff)] font-black shadow-[0_4px_12px_-1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.55),inset_0_-2px_0_rgba(0,0,0,0.3)] border-t border-white/50 border-b-2 border-b-black/40 border-x border-white/20 active:translate-y-0.5 transition-all",
    btnSecondary: "button-secondary bg-white/[0.05] hover:bg-white/[0.12] text-white border-t border-white/45 border-b-2 border-b-black/35 border-x border-white/20 shadow-[0_3px_8px_-1px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.45),inset_0_-1.5px_0_rgba(0,0,0,0.25)] backdrop-blur-2xl font-bold active:translate-y-0.5 transition-all",
    navActive: "bg-gradient-to-r from-[var(--bespoke-c1,#0a0d1a)]/40 to-[var(--bespoke-c2,#ff007f)]/30 text-white border border-white/30 border-t-white/40 font-black rounded-2xl",
    navInactive: "text-white/70 hover:text-white hover:bg-white/[0.06] rounded-2xl",
    trackRowHover: "hover:bg-white/[0.06]",
  },
};

import {
  getBespokeConfig,
  saveBespokeConfig,
  applyBespokeCssVariables as applyBespokeCssVariablesFromService,
  DEFAULT_BESPOKE_COLORS as DEFAULT_THEME_BESPOKE_COLORS,
} from "../theme/themeService";

export const DEFAULT_BESPOKE_COLORS: [string, string, string, string] = DEFAULT_THEME_BESPOKE_COLORS;

export function getBespokeColors(): [string, string, string, string] {
  return getBespokeConfig().colors;
}

export function saveBespokeColors(colors: [string, string, string, string] | string[]): [string, string, string, string] {
  const result = saveBespokeConfig({
    colors: [
      colors[0] || DEFAULT_BESPOKE_COLORS[0],
      colors[1] || DEFAULT_BESPOKE_COLORS[1],
      colors[2] || DEFAULT_BESPOKE_COLORS[2],
      colors[3] || DEFAULT_BESPOKE_COLORS[3],
    ],
  });
  return result.colors;
}

export function applyBespokeCssVariables(colors: string[]): void {
  applyBespokeCssVariablesFromService(colors);
}

export function createBespokeConfig(customColors?: string[]): FullAppDesignConfig {
  const colors = customColors && customColors.length >= 4 ? customColors : getBespokeColors();
  const [c1, c2, c3, c4] = colors;

  return {
    ...FULL_APP_DESIGNS_BASE.bespoke,
    swatchColors: [c1, c2, c3, c4],
    themeColorMeta: c1,
    multiAccentGradient: `from-[${c1}] to-[${c2}]`,
    bgCanvas: `from-[${c1}] via-[${c2}] to-[${c3}]`,
    accentBg: `bg-gradient-to-r from-[var(--bespoke-c1,${c1})] to-[var(--bespoke-c2,${c2})]`,
    pillActive: `pill-selected bg-gradient-to-r from-[var(--bespoke-c1,${c1})] to-[var(--bespoke-c2,${c2})] text-[var(--text-on-accent,#ffffff)] font-black shadow-[0_4px_12px_-2px_rgba(0,0,0,0.32),inset_0_1.5px_1px_rgba(255,255,255,0.65),inset_0_-2px_1px_rgba(0,0,0,0.32)] border-t-[1.5px] border-white/60 border-b-2 border-black/45 border-x border-white/25 active:translate-y-0.5 transition-all`,
    btnPrimary: `btn-signin button-primary bg-gradient-to-r from-[var(--bespoke-c1,${c1})] to-[var(--bespoke-c2,${c2})] hover:brightness-115 text-[var(--text-on-accent,#ffffff)] font-black shadow-[0_4px_12px_-1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.55),inset_0_-2px_0_rgba(0,0,0,0.3)] border-t border-white/50 border-b-2 border-b-black/40 border-x border-white/20 active:translate-y-0.5 transition-all`,
  };
}

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
 * Theme 09 (Nebula Liquid Glass): #0d0b1a
 * Theme 10 (Sugar Time Jazz): #120e0b
 * Theme 11 (Bespoke): #0a0d1a
 */
export const THEME_CANVAS_COLORS: Record<string, string> = {
  designer: "#051911",
  "cyberpunk-neon": "#0a0d1a",
  candyland: "#ffd1dc",
  "ytmusic-red": "#ffd1dc",
  "dynamic-emerald": "#021a12",
  "audiophile-gold": "#080c16",
  "twilight-vaporwave": "#1e0b36",
  "neue-editorial": "#F2E8D8",
  "obsidian-depth": "#2a2e38",
  "nebula-liquid-glass": "#0d0b1a",
  "hard-rock": "#120e0b",
  "sugar-time-jazz": "#120e0b",
  bespoke: "#0a0d1a",
};

/**
 * Array of the 11 canonical Full App Designs (guaranteed unique IDs for React key rendering)
 */
export const FULL_APP_DESIGNS_LIST: FullAppDesignConfig[] = Object.values(FULL_APP_DESIGNS_BASE);

/**
 * Safely lookup a FullAppDesignConfig by ID with backward compatibility for legacy aliases
 */
export function getFullAppDesign(id?: string | null): FullAppDesignConfig {
  if (!id) return FULL_APP_DESIGNS_BASE.designer;
  if (id === "ytmusic-red") return FULL_APP_DESIGNS_BASE.candyland;
  if (id === "hard-rock" || id === "sugar-time-jazz") return FULL_APP_DESIGNS_BASE["hard-rock"];
  if (id === "bespoke") return createBespokeConfig();
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
      if (prop === "bespoke") return createBespokeConfig();
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

