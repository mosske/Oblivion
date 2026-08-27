import { MiniPlayerLayout, ThemePreset } from "../types";

export type FullAppDesignId = 
  | "designer"           // 1. Designer (Off-White Studio Canvas, Shadows, Gold Accents & Emerald Backdrop)
  | "cyberpunk-neon"     // 2. Cyberpunk Neon Glass (Futuristic Obsidian & Electric Cyan/Magenta)
  | "ytmusic-red"        // 3. YouTube Music Red (Authentic Edge-to-Edge Studio Dark)
  | "dynamic-emerald"    // 4. Dynamic Island Emerald (Ultra-Minimalist Monolith & Jade Pulse)
  | "audiophile-gold"    // 5. Studio Audiophile Gold (Warm Carbon, Vinyl Gold & VU Meter)
  | "twilight-vaporwave"; // 6. Twilight Vaporwave (Sunset Violet, Rose Glass & Ambient Aura)

export interface FullAppDesignConfig {
  id: FullAppDesignId;
  num: string;
  name: string;
  subtitle: string;
  badge: string;
  description: string;
  isLight: boolean;
  accentColor: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  glowRing: string;
  progressGradient: string;
  waveformGradient: string;
  waveformGlow: string;
  bgCanvas: string;
  bgAtmosphere: string;
  headerBg: string;
  sidebarBg: string;
  cardBg: string;
  cardHover: string;
  pillBg: string;
  pillActive: string;
  bottomNavBg: string;
  headingPrimary: string;
  headingSecondary: string;
  headingMuted: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  borderSubtle: string;
  inputBg: string;
  btnPrimary: string;
  btnSecondary: string;
  navActive: string;
  navInactive: string;
  modalBg: string;
  bannerGradient: string;
  playerLayout: MiniPlayerLayout;
  themePreset: ThemePreset;
  swatchColors: string[];
  features: string[];
  mockup: {
    heroTitle: string;
    heroSubtitle: string;
    chipLabels: string[];
    bannerGradient: string;
    dockStyle: string;
  };
}

export const FULL_APP_DESIGNS: Record<FullAppDesignId, FullAppDesignConfig> = {
  "designer": {
    id: "designer",
    num: "01",
    name: "Designer",
    subtitle: "Off-White Studio, Warm Shadows & Gold Accents",
    badge: "Designer Default",
    description: "Atmospheric deep rich emerald and dark forest backdrop holding a pristine off-white & warm ivory studio canvas. Paired with soft multi-layer drop shadows, refined stone borders, warm ochre gold highlights, and an interactive waveform mini-player.",
    isLight: true,
    accentColor: "amber",
    accentBg: "bg-[#c89b3c]",
    accentText: "text-[#c89b3c]",
    accentBorder: "border-[#c89b3c]/50",
    glowRing: "ring-[#c89b3c]/40 shadow-[#c89b3c]/20",
    progressGradient: "bg-gradient-to-r from-[#b88928] via-[#e5b85c] to-[#f5d78e]",
    waveformGradient: "bg-gradient-to-t from-[#b88928] via-[#e5b85c] to-[#fef08a]",
    waveformGlow: "shadow-[0_0_12px_rgba(200,155,60,0.45)]",
    bgCanvas: "from-[#081e17] via-[#0e2c22] to-[#05130f] text-slate-100",
    bgAtmosphere: "bg-[radial-gradient(ellipse_95%_95%_at_50%_-10%,rgba(16,185,129,0.22),rgba(5,150,105,0.12),rgba(6,22,17,0.96))]",
    headerBg: "bg-[#fbfaf7]/95 border-[#e6e2d8] backdrop-blur-xl text-[#181816]",
    sidebarBg: "bg-[#fbfaf7]/98 border-[#e6e2d8] text-[#181816]",
    cardBg: "bg-white/95 border border-[#e6e2d8] hover:border-[#c89b3c]/60 shadow-[0_4px_20px_rgba(0,0,0,0.06)] text-[#181816]",
    cardHover: "hover:bg-white hover:shadow-[0_12px_30px_rgba(0,0,0,0.12)] hover:border-[#c89b3c] hover:scale-[1.01]",
    pillBg: "bg-[#ede8dc] text-[#33302a] hover:text-[#181816] hover:bg-[#e2ddd1] border border-[#d8d2c4] font-semibold",
    pillActive: "bg-[#c89b3c] text-white shadow-md shadow-[#c89b3c]/25 border border-[#c89b3c]",
    bottomNavBg: "bg-[#fbfaf7]/95 border-[#e6e2d8] text-[#181816] backdrop-blur-2xl",
    headingPrimary: "text-white sm:text-slate-100",
    headingSecondary: "text-emerald-100/90",
    headingMuted: "text-emerald-200/80",
    textPrimary: "text-[#181816]",
    textSecondary: "text-[#423f38]",
    textMuted: "text-[#666258]",
    borderSubtle: "border-[#e6e2d8]",
    inputBg: "bg-[#f4f1ea] border border-[#d8d2c4] text-[#181816] placeholder-[#666258] focus:border-[#c89b3c]",
    btnPrimary: "bg-[#c89b3c] hover:bg-[#d8a846] text-white shadow-md shadow-[#c89b3c]/25 font-bold",
    btnSecondary: "bg-[#ede8dc] hover:bg-[#e2ddd1] text-[#181816] border border-[#d8d2c4] font-semibold shadow-sm",
    navActive: "bg-[#ede8dc] text-[#181816] shadow-sm border border-[#d8d2c4] font-bold",
    navInactive: "text-[#57534a] hover:text-[#181816] hover:bg-[#ede8dc] font-medium",
    modalBg: "bg-[#fbfaf7] border border-[#e6e2d8] text-[#181816]",
    bannerGradient: "from-[#13372c] via-[#0d271f] to-[#081914] border-[#c89b3c]/40 text-slate-100",
    playerLayout: "designer-waveform",
    themePreset: "designer-ivory",
    swatchColors: ["#13372c", "#fbfaf7", "#c89b3c", "#736f66"],
    features: [
      "Signature deep rich emerald to dark forest atmospheric container",
      "Pristine off-white & warm ivory cards with soft dimensional shadows",
      "Warm ochre gold action buttons, active rings, and highlight accents",
      "Floating ivory mini-player with interactive golden acoustic waveform"
    ],
    mockup: {
      heroTitle: "Studio Audio Master",
      heroSubtitle: "Curated soundscapes, voice models & lossless acoustics",
      chipLabels: ["✨ Gold Accent", "🌊 Golden Wave", "🏛️ Studio Ivory"],
      bannerGradient: "from-[#174335] via-[#103127] to-[#0a1e18] border-[#c89b3c]/30",
      dockStyle: "Designer Floating Golden Waveform Deck"
    }
  },

  "cyberpunk-neon": {
    id: "cyberpunk-neon",
    num: "02",
    name: "Cyberpunk Neon Glass",
    subtitle: "Futuristic Hologram & Radiant Cyan/Magenta",
    badge: "Futuristic Glass",
    description: "Deep obsidian canvas with neon cyan & fuchsia glow rings, frosted glass cards (backdrop-blur-xl), holographic audio tags, and an elevated floating glass pill mini-player.",
    isLight: false,
    accentColor: "cyan",
    accentBg: "bg-cyan-500",
    accentText: "text-cyan-400",
    accentBorder: "border-cyan-500/40",
    glowRing: "ring-cyan-500/30 shadow-cyan-500/20",
    progressGradient: "bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-pink-500",
    waveformGradient: "bg-gradient-to-t from-cyan-500 via-fuchsia-500 to-pink-400",
    waveformGlow: "shadow-[0_0_15px_rgba(6,182,212,0.6)]",
    bgCanvas: "from-slate-950 via-slate-900 to-slate-950 text-slate-100",
    bgAtmosphere: "bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.15),rgba(255,255,255,0))]",
    headerBg: "bg-slate-950/90 border-slate-800/80 backdrop-blur-xl text-white",
    sidebarBg: "bg-slate-950/90 border-slate-800/70 backdrop-blur-2xl text-slate-200",
    cardBg: "bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/50 shadow-lg text-slate-100",
    cardHover: "hover:bg-slate-900/90 hover:shadow-cyan-500/10 hover:scale-[1.01]",
    pillBg: "bg-slate-800/80 text-cyan-300 border border-cyan-500/30",
    pillActive: "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold",
    bottomNavBg: "bg-slate-950/95 border-slate-800/80 backdrop-blur-2xl text-slate-200",
    headingPrimary: "text-white",
    headingSecondary: "text-cyan-100",
    headingMuted: "text-slate-300",
    textPrimary: "text-white",
    textSecondary: "text-slate-300",
    textMuted: "text-slate-400",
    borderSubtle: "border-slate-800/80",
    inputBg: "bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:border-cyan-500",
    btnPrimary: "bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-400/25 font-bold",
    btnSecondary: "bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold",
    navActive: "bg-slate-800/90 text-white shadow-md border border-slate-700/60 font-semibold",
    navInactive: "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60",
    modalBg: "bg-slate-900 border border-slate-800 text-slate-200",
    bannerGradient: "from-violet-950 via-indigo-900 to-cyan-950 border-cyan-500/30 text-white",
    playerLayout: "floating-dock",
    themePreset: "oblivion-dark",
    swatchColors: ["#030712", "#06b6d4", "#ec4899", "#6366f1"],
    features: [
      "Floating frosted glass dock with neon cyan accents",
      "Obsidian dark mode with ambient radial cyan aura",
      "Cyberpunk pill navigation and futuristic badges",
      "High-contrast text hierarchy for night listening"
    ],
    mockup: {
      heroTitle: "Good evening to Oblivion",
      heroSubtitle: "Real-time YouTube streaming, lyrics & playlist sync",
      chipLabels: ["⚡ Cyberpunk", "🎛️ Neon Glow", "💎 Floating Pill"],
      bannerGradient: "from-violet-950 via-indigo-900 to-cyan-950 border-cyan-500/30",
      dockStyle: "Floating Glass Pill Player"
    }
  },

  "ytmusic-red": {
    id: "ytmusic-red",
    num: "03",
    name: "YouTube Music Studio Red",
    subtitle: "Authentic Clean Edge-to-Edge & Crimson Red",
    badge: "Official YT Music",
    description: "The classic YouTube Music interface: pitch black and dark charcoal (#0f0f0f & #212121), signature YouTube red highlights, edge-to-edge flush bottom dock with top red micro-scrubber, and YouTube-style mood pill filters.",
    isLight: false,
    accentColor: "red",
    accentBg: "bg-red-600",
    accentText: "text-red-500",
    accentBorder: "border-red-500/40",
    glowRing: "ring-red-500/30 shadow-red-600/20",
    progressGradient: "bg-gradient-to-r from-red-600 via-rose-500 to-amber-500",
    waveformGradient: "bg-gradient-to-t from-red-700 via-rose-500 to-amber-400",
    waveformGlow: "shadow-[0_0_14px_rgba(220,38,38,0.55)]",
    bgCanvas: "from-[#0f0f0f] via-[#141414] to-[#0f0f0f] text-neutral-100",
    bgAtmosphere: "bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(220,38,38,0.12),rgba(255,255,255,0))]",
    headerBg: "bg-[#0f0f0f]/95 border-neutral-800 backdrop-blur-xl text-white",
    sidebarBg: "bg-[#0a0a0a] border-neutral-800/80 text-neutral-200",
    cardBg: "bg-[#181818] border border-neutral-800 hover:border-red-500/50 shadow-md text-neutral-100",
    cardHover: "hover:bg-[#202020] hover:shadow-red-500/10 hover:scale-[1.01]",
    pillBg: "bg-[#272727] text-white hover:bg-[#383838] border border-neutral-700",
    pillActive: "bg-red-600 text-white shadow-md shadow-red-600/20 font-bold",
    bottomNavBg: "bg-[#121212] border-neutral-800 text-neutral-200",
    headingPrimary: "text-white",
    headingSecondary: "text-neutral-100",
    headingMuted: "text-neutral-300",
    textPrimary: "text-white",
    textSecondary: "text-neutral-300",
    textMuted: "text-neutral-400",
    borderSubtle: "border-neutral-800",
    inputBg: "bg-neutral-900 border border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:border-red-500",
    btnPrimary: "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/25 font-bold",
    btnSecondary: "bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 font-semibold",
    navActive: "bg-neutral-800 text-white shadow-md border border-neutral-700 font-semibold",
    navInactive: "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900",
    modalBg: "bg-[#141414] border border-neutral-800 text-neutral-200",
    bannerGradient: "from-red-950 via-neutral-900 to-black border-red-500/30 text-white",
    playerLayout: "ytmusic-classic",
    themePreset: "oled-black",
    swatchColors: ["#0f0f0f", "#212121", "#ff0033", "#ffffff"],
    features: [
      "Authentic edge-to-edge flush bottom player (#212121)",
      "Top hairline micro-scrubber in signature YouTube red",
      "YouTube Music category pill chips (Workout, Relax, Focus)",
      "Studio dark grey cards with rounded-xl contours"
    ],
    mockup: {
      heroTitle: "Music for Your Soul",
      heroSubtitle: "Trending charts, live mixes & subscribed artists",
      chipLabels: ["🔴 YT Red", "📱 Edge-to-Edge", "⚡ Micro Scrubber"],
      bannerGradient: "from-red-950 via-neutral-900 to-black border-red-500/30",
      dockStyle: "Edge-to-Edge Flush Dock"
    }
  },

  "dynamic-emerald": {
    id: "dynamic-emerald",
    num: "04",
    name: "Dynamic Island Emerald",
    subtitle: "Ultra-Minimalist Monolith & Jade Equalizer",
    badge: "Ultra Minimal",
    description: "Pure AMOLED midnight canvas (#000000) with luminous emerald & mint accents, maximum negative space, minimal pill-shaped Dynamic Island player dock with live pulsating equalizer waves.",
    isLight: false,
    accentColor: "emerald",
    accentBg: "bg-emerald-500",
    accentText: "text-emerald-400",
    accentBorder: "border-emerald-500/40",
    glowRing: "ring-emerald-500/30 shadow-emerald-500/20",
    progressGradient: "bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-300",
    waveformGradient: "bg-gradient-to-t from-emerald-600 via-teal-400 to-cyan-300",
    waveformGlow: "shadow-[0_0_14px_rgba(16,185,129,0.55)]",
    bgCanvas: "from-black via-zinc-950 to-black text-zinc-100",
    bgAtmosphere: "bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.12),rgba(255,255,255,0))]",
    headerBg: "bg-black/90 border-zinc-800/80 backdrop-blur-xl text-white",
    sidebarBg: "bg-black border-zinc-800/70 text-zinc-200",
    cardBg: "bg-zinc-900/60 border border-zinc-800 hover:border-emerald-500/50 shadow-md text-zinc-100",
    cardHover: "hover:bg-zinc-900 hover:shadow-emerald-500/10 hover:scale-[1.01]",
    pillBg: "bg-zinc-800/80 text-emerald-300 border border-emerald-500/30",
    pillActive: "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold",
    bottomNavBg: "bg-black/95 border-zinc-800/80 backdrop-blur-2xl text-zinc-200",
    headingPrimary: "text-white",
    headingSecondary: "text-emerald-100",
    headingMuted: "text-zinc-300",
    textPrimary: "text-zinc-50",
    textSecondary: "text-zinc-300",
    textMuted: "text-zinc-400",
    borderSubtle: "border-zinc-800/80",
    inputBg: "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500",
    btnPrimary: "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 font-bold",
    btnSecondary: "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-semibold",
    navActive: "bg-zinc-800 text-white shadow-md border border-zinc-700 font-semibold",
    navInactive: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900",
    modalBg: "bg-zinc-950 border border-zinc-800 text-zinc-200",
    bannerGradient: "from-emerald-950 via-zinc-950 to-black border-emerald-500/30 text-white",
    playerLayout: "minimal-capsule",
    themePreset: "emerald-synth",
    swatchColors: ["#000000", "#09090b", "#10b981", "#6ee7b7"],
    features: [
      "Dynamic Island compact pill mini-player dock",
      "Animated green equalizer audio wave visualization",
      "Pure AMOLED black with battery-saving efficiency",
      "Clean monochromatic typography and minimal dividers"
    ],
    mockup: {
      heroTitle: "Pure Sound & Atmosphere",
      heroSubtitle: "Distraction-free high fidelity acoustic streaming",
      chipLabels: ["🟢 Jade Monolith", "🏝️ Dynamic Island", "〰️ Waveform"],
      bannerGradient: "from-emerald-950 via-zinc-950 to-black border-emerald-500/30",
      dockStyle: "Dynamic Island Minimal Capsule"
    }
  },

  "audiophile-gold": {
    id: "audiophile-gold",
    num: "05",
    name: "Studio Audiophile Deck",
    subtitle: "Warm Carbon, Golden Brass & Hi-Res DJ Deck",
    badge: "Audiophile / DJ",
    description: "Rich dark carbon mahogany canvas with warm amber & gold accents, Hi-Res lossless tags, vinyl record disc spinning visualizers, analog studio VU meters, and an expanded holographic DJ deck player.",
    isLight: false,
    accentColor: "amber",
    accentBg: "bg-amber-500",
    accentText: "text-amber-400",
    accentBorder: "border-amber-500/40",
    glowRing: "ring-amber-500/30 shadow-amber-500/20",
    progressGradient: "bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-200",
    waveformGradient: "bg-gradient-to-t from-amber-700 via-amber-400 to-yellow-200",
    waveformGlow: "shadow-[0_0_14px_rgba(245,158,11,0.55)]",
    bgCanvas: "from-[#14100c] via-[#1c1612] to-[#14100c] text-amber-50",
    bgAtmosphere: "bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.12),rgba(255,255,255,0))]",
    headerBg: "bg-[#14100c]/95 border-amber-900/40 backdrop-blur-xl text-amber-50",
    sidebarBg: "bg-[#0f0c09] border-amber-900/30 text-amber-100",
    cardBg: "bg-[#221c17] border border-amber-900/40 hover:border-amber-500/50 shadow-lg text-amber-50",
    cardHover: "hover:bg-[#2c241e] hover:shadow-amber-500/10 hover:scale-[1.01]",
    pillBg: "bg-amber-950/60 text-amber-300 border border-amber-500/40",
    pillActive: "bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20 font-bold",
    bottomNavBg: "bg-[#14100c]/95 border-amber-900/50 backdrop-blur-2xl text-amber-100",
    headingPrimary: "text-amber-50",
    headingSecondary: "text-amber-100",
    headingMuted: "text-amber-200/80",
    textPrimary: "text-amber-50",
    textSecondary: "text-amber-200/80",
    textMuted: "text-amber-300/60",
    borderSubtle: "border-amber-900/40",
    inputBg: "bg-[#1c1612] border border-amber-900/50 text-amber-100 placeholder-amber-400/40 focus:border-amber-500",
    btnPrimary: "bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-lg shadow-amber-500/25 font-bold",
    btnSecondary: "bg-[#221c17] hover:bg-[#2c241e] text-amber-100 border border-amber-900/50 font-semibold",
    navActive: "bg-amber-950/80 text-amber-200 shadow-md border border-amber-700/50 font-semibold",
    navInactive: "text-amber-300/70 hover:text-amber-100 hover:bg-amber-950/40",
    modalBg: "bg-[#18130e] border border-amber-900/50 text-amber-100",
    bannerGradient: "from-amber-950 via-stone-900 to-black border-amber-500/30 text-amber-50",
    playerLayout: "card-expanded",
    themePreset: "sunset-horizon",
    swatchColors: ["#1c1917", "#78350f", "#f59e0b", "#fef3c7"],
    features: [
      "Expanded Holographic Deck with live waveform scrubber",
      "Hi-Res 24-bit Lossless Studio audio badge styling",
      "Warm golden brass accents and vinyl turntable motif",
      "High-density DJ controls with quick queue management"
    ],
    mockup: {
      heroTitle: "Studio Master Audio 24-Bit",
      heroSubtitle: "Lossless bit-perfect decoding & analog warmth",
      chipLabels: ["🟡 Studio Gold", "🎛️ Hologram Deck", "📀 Hi-Res FLAC"],
      bannerGradient: "from-amber-950 via-stone-900 to-black border-amber-500/30",
      dockStyle: "Holographic Expanded Deck"
    }
  },

  "twilight-vaporwave": {
    id: "twilight-vaporwave",
    num: "06",
    name: "Twilight Vaporwave Sunset",
    subtitle: "Dreamy Purple Violet, Sunset Rose & Touch Gestures",
    badge: "Dreamy Sunset",
    description: "Lush sunset violet & midnight magenta gradient canvas, ultra-smooth frosted glassmorphism, soft glowing pill tabs, warm ambient lighting, fluid gesture cards, and a split-slider touch controller player with ±10s jump buttons.",
    isLight: false,
    accentColor: "purple",
    accentBg: "bg-purple-600",
    accentText: "text-purple-300",
    accentBorder: "border-purple-500/40",
    glowRing: "ring-purple-500/30 shadow-purple-500/20",
    progressGradient: "bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-400",
    waveformGradient: "bg-gradient-to-t from-purple-600 via-fuchsia-500 to-pink-400",
    waveformGlow: "shadow-[0_0_15px_rgba(168,85,247,0.55)]",
    bgCanvas: "from-[#1e1035] via-[#160a29] to-[#0d051a] text-purple-100",
    bgAtmosphere: "bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(168,85,247,0.15),rgba(236,72,153,0.08))]",
    headerBg: "bg-[#160a29]/90 border-purple-800/40 backdrop-blur-xl text-purple-50",
    sidebarBg: "bg-[#110620]/90 border-purple-800/30 backdrop-blur-2xl text-purple-200",
    cardBg: "bg-purple-950/40 border border-purple-800/40 hover:border-purple-400/50 shadow-xl text-purple-100",
    cardHover: "hover:bg-purple-900/50 hover:shadow-purple-500/15 hover:scale-[1.01]",
    pillBg: "bg-purple-900/50 text-purple-200 border border-purple-500/30",
    pillActive: "bg-purple-600 text-white shadow-md shadow-purple-600/25 font-bold",
    bottomNavBg: "bg-[#110620]/95 border-purple-900/50 backdrop-blur-2xl text-purple-200",
    headingPrimary: "text-white",
    headingSecondary: "text-purple-100",
    headingMuted: "text-purple-200/80",
    textPrimary: "text-purple-50",
    textSecondary: "text-purple-200/80",
    textMuted: "text-purple-300/60",
    borderSubtle: "border-purple-800/40",
    inputBg: "bg-purple-950/60 border border-purple-800/50 text-purple-100 placeholder-purple-400/40 focus:border-purple-500",
    btnPrimary: "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/25 font-bold",
    btnSecondary: "bg-purple-950/80 hover:bg-purple-900/80 text-purple-200 border border-purple-800 font-semibold",
    navActive: "bg-purple-900/70 text-white shadow-md border border-purple-700/50 font-semibold",
    navInactive: "text-purple-300/70 hover:text-purple-100 hover:bg-purple-950/40",
    modalBg: "bg-[#180b2a] border border-purple-800/50 text-purple-100",
    bannerGradient: "from-fuchsia-950 via-purple-950 to-slate-950 border-purple-500/30 text-purple-50",
    playerLayout: "split-slider",
    themePreset: "cyberpunk",
    swatchColors: ["#1e1035", "#701a75", "#a855f7", "#f43f5e"],
    features: [
      "Split-Slider Gesture player with wide scrub and ±10s jumps",
      "Dreamy violet-rose twilight ambient gradient backdrop",
      "Soft glowing rounded-3xl cards with smooth micro-interactions",
      "Vibrant music discovery cards with ambient gradient auras"
    ],
    mockup: {
      heroTitle: "Sunset Dreams & Chill Beats",
      heroSubtitle: "Immersive spatial acoustics and ambient mood mixes",
      chipLabels: ["🟣 Sunset Purple", "🎛️ Split Gestures", "✨ Rose Glow"],
      bannerGradient: "from-fuchsia-950 via-purple-950 to-slate-950 border-purple-500/30",
      dockStyle: "Split-Slider Gesture Deck"
    }
  }
};

