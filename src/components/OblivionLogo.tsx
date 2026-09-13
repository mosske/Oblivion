import React from "react";
import { FullAppDesignId } from "../utils/appDesignThemes";

export interface OblivionLogoProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  variant?: "icon" | "full" | "horizontal";
  colorMode?: "theme" | "official" | "accent" | "dynamic";
  designId?: FullAppDesignId | string;
  accentColor?: string;
  animated?: boolean;
  withRing?: boolean;
  withAura?: boolean;
}

interface GradientPalette {
  ringGrad: { c1: string; c2: string; c3: string; c4: string };
  tri1Grad: { c1: string; c2: string; c3: string };
  tri2Grad: { c1: string; c2: string; c3: string };
  highlight: string;
  shadow: string;
  playCore: string;
  playHighlight: string;
  auraColor: string;
  textGold: string;
}

// Color palettes for all app designs and official brand mode
const PALETTES: Record<string, GradientPalette> = {
  // Official Gold / Champagne Identity (from the brand image)
  official: {
    ringGrad: { c1: "#faecc5", c2: "#dfbe7a", c3: "#9a7732", c4: "#ebd292" },
    tri1Grad: { c1: "#dfbe7a", c2: "#c5a059", c3: "#8c6827" },
    tri2Grad: { c1: "#faecc5", c2: "#dfbe7a", c3: "#ab873c" },
    highlight: "#fff5dd",
    shadow: "#52390e",
    playCore: "#FFFFFF",
    playHighlight: "#FFFFFF",
    auraColor: "#c5a059",
    textGold: "#dfbe7a",
  },

  // 1. Designer (Haute Couture Champagne Gold & Shimmering Metallic Highlights)
  designer: {
    ringGrad: { c1: "#fdf2db", c2: "#dfb86c", c3: "#a07422", c4: "#f7e2ab" },
    tri1Grad: { c1: "#f7e2ab", c2: "#dfb86c", c3: "#8c6218" },
    tri2Grad: { c1: "#fff9eb", c2: "#eac97e", c3: "#a07422" },
    highlight: "#ffffff",
    shadow: "#261a08",
    playCore: "#FFFFFF",
    playHighlight: "#fdf2db",
    auraColor: "#dfb86c",
    textGold: "#dfb86c",
  },

  // 2. Cyberpunk Neon (Electric Cyan, Neon Magenta & Hologram Violet)
  "cyberpunk-neon": {
    ringGrad: { c1: "#00f0ff", c2: "#ff007f", c3: "#a855f7", c4: "#00d2ff" },
    tri1Grad: { c1: "#00f0ff", c2: "#06b6d4", c3: "#0284c7" },
    tri2Grad: { c1: "#ff007f", c2: "#ec4899", c3: "#c026d3" },
    highlight: "#ffffff",
    shadow: "#1e1035",
    playCore: "#00f0ff",
    playHighlight: "#ffffff",
    auraColor: "#00f0ff",
    textGold: "#00f0ff",
  },

  // 3. Candyland Pastel (Bubblegum Pink, Cotton Candy Violet & Sweet Lemon)
  candyland: {
    ringGrad: { c1: "#ffd1dc", c2: "#ff70a6", c3: "#a3c4f3", c4: "#ffd166" },
    tri1Grad: { c1: "#ff70a6", c2: "#f72585", c3: "#7209b7" },
    tri2Grad: { c1: "#a3c4f3", c2: "#ffd166", c3: "#ff70a6" },
    highlight: "#ffffff",
    shadow: "#3b1235",
    playCore: "#FFFFFF",
    playHighlight: "#ffd166",
    auraColor: "#ff70a6",
    textGold: "#ff70a6",
  },
  "ytmusic-red": {
    ringGrad: { c1: "#ffd1dc", c2: "#ff70a6", c3: "#a3c4f3", c4: "#ffd166" },
    tri1Grad: { c1: "#ff70a6", c2: "#f72585", c3: "#7209b7" },
    tri2Grad: { c1: "#a3c4f3", c2: "#ffd166", c3: "#ff70a6" },
    highlight: "#ffffff",
    shadow: "#3b1235",
    playCore: "#FFFFFF",
    playHighlight: "#ffd166",
    auraColor: "#ff70a6",
    textGold: "#ff70a6",
  },

  // 4. Emerald Wilderness (Jade, Neon Mint, Electric Teal & Warm Firefly Gold)
  "dynamic-emerald": {
    ringGrad: { c1: "#d0fbe9", c2: "#00f5a0", c3: "#00d9f5", c4: "#ffe066" },
    tri1Grad: { c1: "#00f5a0", c2: "#00d9f5", c3: "#012a1d" },
    tri2Grad: { c1: "#ffffff", c2: "#00f5a0", c3: "#00d9f5" },
    highlight: "#ffffff",
    shadow: "#011a12",
    playCore: "#ffffff",
    playHighlight: "#ffe066",
    auraColor: "#00f5a0",
    textGold: "#00f5a0",
  },

  // 5. Studio Audiophile Deck (Warm Carbon Vinyl Gold & Amber Brass)
  "audiophile-gold": {
    ringGrad: { c1: "#fde68a", c2: "#f59e0b", c3: "#92400e", c4: "#fbbf24" },
    tri1Grad: { c1: "#fcd34d", c2: "#d97706", c3: "#78350f" },
    tri2Grad: { c1: "#fffbeb", c2: "#f59e0b", c3: "#b45309" },
    highlight: "#ffffff",
    shadow: "#451a03",
    playCore: "#FFFFFF",
    playHighlight: "#fef3c7",
    auraColor: "#f59e0b",
    textGold: "#fbbf24",
  },

  // 6. Twilight Vaporwave (Sunset Violet, Rose & Midnight Purple)
  "twilight-vaporwave": {
    ringGrad: { c1: "#f472b6", c2: "#c026d3", c3: "#7e22ce", c4: "#ec4899" },
    tri1Grad: { c1: "#e879f9", c2: "#a855f7", c3: "#581c87" },
    tri2Grad: { c1: "#fdf4ff", c2: "#c026d3", c3: "#7e22ce" },
    highlight: "#ffffff",
    shadow: "#2e1065",
    playCore: "#FFFFFF",
    playHighlight: "#fce7f3",
    auraColor: "#c026d3",
    textGold: "#f472b6",
  },

  // 7. Neue Editorial (Swiss High-Contrast, Charcoal & Pale Beige)
  "neue-editorial": {
    ringGrad: { c1: "#1F1F1F", c2: "#3A3530", c3: "#524B44", c4: "#1F1F1F" },
    tri1Grad: { c1: "#1F1F1F", c2: "#3A3530", c3: "#1F1F1F" },
    tri2Grad: { c1: "#FAF5ED", c2: "#F2E8D8", c3: "#EFE5D4" },
    highlight: "#FAF5ED",
    shadow: "#0A0A0A",
    playCore: "#1F1F1F",
    playHighlight: "#FAF5ED",
    auraColor: "#1F1F1F",
    textGold: "#1F1F1F",
  },

  // 8. Obsidian Depth (Matte Slate, Radiant Light Blue / Cyan Gradient)
  "obsidian-depth": {
    ringGrad: { c1: "#e0f2fe", c2: "#7dd3fc", c3: "#0284c7", c4: "#38bdf8" },
    tri1Grad: { c1: "#38bdf8", c2: "#0284c7", c3: "#0369a1" },
    tri2Grad: { c1: "#e0f2fe", c2: "#7dd3fc", c3: "#38bdf8" },
    highlight: "#ffffff",
    shadow: "#0f172a",
    playCore: "#0f172a",
    playHighlight: "#e0f2fe",
    auraColor: "#38bdf8",
    textGold: "#38bdf8",
  },

  // 9. Nebula Liquid Glass (Hot Magenta, Sunset Gold & Electric Cyan Gradient)
  "nebula-liquid-glass": {
    ringGrad: { c1: "#ffffff", c2: "#ff007f", c3: "#ff7b00", c4: "#00f0ff" },
    tri1Grad: { c1: "#ff007f", c2: "#ec4899", c3: "#ff7b00" },
    tri2Grad: { c1: "#ffffff", c2: "#ff2a85", c3: "#00f0ff" },
    highlight: "#ffffff",
    shadow: "#0c071e",
    playCore: "#0c071e",
    playHighlight: "#ffffff",
    auraColor: "#ff007f",
    textGold: "#ff2a85",
  },
};

export const OblivionLogo: React.FC<OblivionLogoProps> = ({
  className = "",
  size = "md",
  variant = "icon",
  colorMode = "theme",
  designId = "designer",
  accentColor,
  animated = false,
  withRing = true,
  withAura = false,
}) => {
  let pixelSize = 36;
  if (typeof size === "number") {
    pixelSize = size;
  } else {
    switch (size) {
      case "xs":
        pixelSize = 20;
        break;
      case "sm":
        pixelSize = 28;
        break;
      case "md":
        pixelSize = 36;
        break;
      case "lg":
        pixelSize = 48;
        break;
      case "xl":
        pixelSize = 72;
        break;
    }
  }

  // Resolve palette based on colorMode and designId
  let palette = PALETTES.designer;
  if (colorMode === "official") {
    palette = PALETTES.official;
  } else if (designId && PALETTES[designId]) {
    palette = PALETTES[designId];
  } else if (accentColor) {
    if (accentColor.includes("red")) palette = PALETTES["ytmusic-red"];
    else if (accentColor.includes("cyan")) palette = PALETTES["cyberpunk-neon"];
    else if (accentColor.includes("emerald") || accentColor.includes("green")) palette = PALETTES["dynamic-emerald"];
    else if (accentColor.includes("purple") || accentColor.includes("pink")) palette = PALETTES["twilight-vaporwave"];
    else if (accentColor.includes("amber") || accentColor.includes("yellow")) palette = PALETTES["audiophile-gold"];
    else palette = PALETTES.designer;
  }

  // Unique ID prefix to avoid SVG gradient collisions across multiple logo instances
  const id = React.useId().replace(/:/g, "_");

  const isFullVariant = variant === "full";
  const isHorizontal = variant === "horizontal";

  const viewBox = isFullVariant ? "0 0 512 512" : isHorizontal ? "0 0 760 380" : "0 0 512 512";
  const emblemTranslate = isFullVariant ? "translate(0, 10)" : isHorizontal ? "translate(0, 0)" : "translate(0, 46)";

  return (
    <svg
      width={isHorizontal ? pixelSize * 2.2 : pixelSize}
      height={pixelSize}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${
        animated ? "transition-all duration-300 hover:scale-105 active:scale-95 group-hover:drop-shadow-lg" : ""
      } ${className}`}
      aria-label="Oblivion Music Logo"
    >
      <defs>
        {/* Outer Circular Ring Gradient */}
        <linearGradient id={`${id}-ringGrad`} x1="10%" y1="10%" x2="90%" y2="90%">
          <stop offset="0%" stopColor={palette.ringGrad.c1} />
          <stop offset="30%" stopColor={palette.ringGrad.c2} />
          <stop offset="65%" stopColor={palette.ringGrad.c3} />
          <stop offset="85%" stopColor={palette.ringGrad.c2} />
          <stop offset="100%" stopColor={palette.ringGrad.c4} />
        </linearGradient>

        {/* Triangle Layer 1 Gradient */}
        <linearGradient id={`${id}-tri1Grad`} x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor={palette.tri1Grad.c1} />
          <stop offset="50%" stopColor={palette.tri1Grad.c2} />
          <stop offset="100%" stopColor={palette.tri1Grad.c3} />
        </linearGradient>

        {/* Triangle Layer 2 Gradient (Front Highlight) */}
        <linearGradient id={`${id}-tri2Grad`} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={palette.tri2Grad.c3} />
          <stop offset="35%" stopColor={palette.tri2Grad.c2} />
          <stop offset="70%" stopColor={palette.tri2Grad.c1} />
          <stop offset="100%" stopColor={palette.highlight} />
        </linearGradient>

        {/* Highlights & Luster */}
        <linearGradient id={`${id}-luster`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="50%" stopColor={palette.tri2Grad.c1} stopOpacity="0.6" />
          <stop offset="100%" stopColor={palette.tri2Grad.c2} stopOpacity="0.2" />
        </linearGradient>

        {/* Dynamic Aura Glow */}
        <radialGradient id={`${id}-auraGlow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={palette.auraColor} stopOpacity="0.5" />
          <stop offset="50%" stopColor={palette.auraColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={palette.auraColor} stopOpacity="0" />
        </radialGradient>

        {/* Soft Drop Shadow Filter for 3D Overlaps */}
        <filter id={`${id}-facetShadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="-2" dy="5" stdDeviation="6" floodColor="#000000" floodOpacity="0.5" />
        </filter>

        <filter id={`${id}-playGlow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Ambient Aura Backdrop */}
      {withAura && (
        <circle
          cx={isHorizontal ? "190" : "256"}
          cy={isHorizontal ? "190" : isFullVariant ? "210" : "256"}
          r="210"
          fill={`url(#${id}-auraGlow)`}
        />
      )}

      {/* Main Logo Emblem Group */}
      <g transform={emblemTranslate}>
        {/* 1. Background Circular Golden Ring */}
        {withRing && (
          <g>
            <path
              d="M 256 68 
                 A 142 142 0 1 0 380 280
                 L 336 260
                 A 96 96 0 1 1 256 114
                 Z"
              fill={`url(#${id}-ringGrad)`}
              opacity="0.96"
            />
            {/* Luminous Inner Highlight Arc on Ring */}
            <path
              d="M 256 68 A 142 142 0 0 0 114 210 A 142 142 0 0 0 256 352"
              stroke={`url(#${id}-luster)`}
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              opacity="0.75"
            />
          </g>
        )}

        {/* 2. Rear Triangular Wireframe (Layer 1) */}
        <g filter={`url(#${id}-facetShadow)`}>
          <path
            d="M 170 52 
               L 414 210 
               L 170 368 
               Z
               M 196 98
               L 196 322
               L 364 210
               Z"
            fill={`url(#${id}-tri1Grad)`}
            fillRule="evenodd"
          />

          {/* Facet Bevel lines */}
          <line x1="170" y1="52" x2="196" y2="98" stroke={palette.highlight} strokeWidth="2" opacity="0.85" />
          <line x1="170" y1="368" x2="196" y2="322" stroke={palette.shadow} strokeWidth="2" opacity="0.8" />
          <line x1="414" y1="210" x2="364" y2="210" stroke={palette.highlight} strokeWidth="2" opacity="0.75" />
        </g>

        {/* 3. Front Overlapping Triangular Wireframe (Layer 2) */}
        <g filter={`url(#${id}-facetShadow)`}>
          <path
            d="M 198 52 
               L 444 210 
               L 198 368 
               Z
               M 224 98
               L 224 322
               L 394 210
               Z"
            fill={`url(#${id}-tri2Grad)`}
            fillRule="evenodd"
          />

          {/* High-gloss facet highlights on front triangle */}
          <line
            x1="198"
            y1="52"
            x2="444"
            y2="210"
            stroke={palette.highlight}
            strokeWidth="3"
            opacity="0.95"
            strokeLinecap="round"
          />
          <line x1="198" y1="52" x2="224" y2="98" stroke="#ffffff" strokeWidth="2.8" opacity="0.95" />
          <line x1="198" y1="368" x2="224" y2="322" stroke={palette.shadow} strokeWidth="2.5" opacity="0.8" />
        </g>

        {/* 4. Overlap Depth Shadow on Intersecting Spine */}
        <polygon points="198,52 224,98 224,322 198,368" fill="#000000" opacity="0.32" />

        {/* 5. Center Solid Play Button (Inner Triangle) */}
        <g filter={`url(#${id}-playGlow)`}>
          <polygon points="228,142 334,210 228,278" fill={palette.playCore} />
          <line
            x1="228"
            y1="142"
            x2="334"
            y2="210"
            stroke={palette.playHighlight}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>
      </g>

      {/* Typography for Full/Horizontal Variants */}
      {isFullVariant && (
        <g transform="translate(256, 428)" textAnchor="middle">
          <text
            fontFamily="'Outfit', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontSize="46"
            fontWeight="800"
            letterSpacing="5.5"
            fill="#FFFFFF"
            x="3"
          >
            OBLIVION
          </text>
          <text
            fontFamily="'Outfit', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontSize="22"
            fontWeight="700"
            letterSpacing="12"
            fill={palette.textGold}
            y="42"
            x="6"
          >
            MUSIC
          </text>
        </g>
      )}

      {isHorizontal && (
        <g transform="translate(480, 185)">
          <text
            fontFamily="'Outfit', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontSize="54"
            fontWeight="800"
            letterSpacing="5"
            fill="#FFFFFF"
            y="0"
          >
            OBLIVION
          </text>
          <text
            fontFamily="'Outfit', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontSize="26"
            fontWeight="700"
            letterSpacing="11"
            fill={palette.textGold}
            y="46"
          >
            MUSIC
          </text>
        </g>
      )}
    </svg>
  );
};
