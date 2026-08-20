import React from "react";

interface OblivionLogoProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  animated?: boolean;
  withRing?: boolean;
  withAura?: boolean;
}

export const OblivionLogo: React.FC<OblivionLogoProps> = ({
  className = "",
  size = "md",
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

  // Unique ID prefix to avoid SVG gradient collisions when multiple logos are rendered
  const id = React.useId().replace(/:/g, "_");

  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${animated ? "group-hover:scale-110 transition-transform duration-300" : ""} ${className}`}
      aria-label="Oblivion Music Crystal Prism Logo"
    >
      <defs>
        {/* Circular Halo Ring Gradient: Rich Pink & Sunset Orange to Cyan & Violet */}
        <linearGradient id={`${id}-ringGrad`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff007f" />    {/* Hot Neon Pink */}
          <stop offset="25%" stopColor="#ff4500" />   {/* Orange Red */}
          <stop offset="48%" stopColor="#ff9a00" />   {/* Radiant Sunset Orange */}
          <stop offset="72%" stopColor="#00d4ff" />   {/* Electric Cyan */}
          <stop offset="100%" stopColor="#c026d3" />  {/* Vibrant Fuchsia / Purple */}
        </linearGradient>

        {/* Outer Glow Aura for depth on dark or light backgrounds */}
        <radialGradient id={`${id}-discAura`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff007f" stopOpacity="0.4" />
          <stop offset="40%" stopColor="#ff5722" stopOpacity="0.25" />
          <stop offset="80%" stopColor="#9333ea" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        {/* Top Apex Left: Luminous Pink & Sunset Orange */}
        <linearGradient id={`${id}-topApexL`} x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#ff80b0" />
          <stop offset="65%" stopColor="#ff007f" />
          <stop offset="100%" stopColor="#ff4500" />
        </linearGradient>

        {/* Top Apex Center highlight */}
        <linearGradient id={`${id}-topApexC`} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#fed7aa" />
          <stop offset="75%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#f43f5e" />
        </linearGradient>

        {/* Top Apex Right: Pale Blue to Indigo */}
        <linearGradient id={`${id}-topApexR`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="45%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>

        {/* Vertical Shaft Left: Rich Neon Pink into Radiant Orange */}
        <linearGradient id={`${id}-shaftL`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff007f" />
          <stop offset="35%" stopColor="#ff2a6d" />
          <stop offset="70%" stopColor="#ff5e00" />
          <stop offset="100%" stopColor="#ff9100" />
        </linearGradient>

        {/* Vertical Shaft Center: Prismatic spectrum shimmer with pink & orange sheen */}
        <linearGradient id={`${id}-shaftC`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff9a8b" />
          <stop offset="30%" stopColor="#ff6a88" />
          <stop offset="60%" stopColor="#ff9900" />
          <stop offset="85%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#00d2ff" />
        </linearGradient>

        {/* Vertical Shaft Right: Cyan to Deep Blue-Purple */}
        <linearGradient id={`${id}-shaftR`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00f0ff" />
          <stop offset="45%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#581c87" />
        </linearGradient>

        {/* Bottom Inverted Apex Left: Radiant Orange-Pink into Crimson */}
        <linearGradient id={`${id}-botApexL`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff5e00" />
          <stop offset="45%" stopColor="#ff007f" />
          <stop offset="100%" stopColor="#9d174d" />
        </linearGradient>

        {/* Bottom Inverted Apex Center: Sunset Magenta-Orange */}
        <linearGradient id={`${id}-botApexC`} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="50%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#701a75" />
        </linearGradient>

        {/* Bottom Inverted Apex Right: Indigo & Purple */}
        <linearGradient id={`${id}-botApexR`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="50%" stopColor="#4338ca" />
          <stop offset="100%" stopColor="#2e1065" />
        </linearGradient>

        {/* Glow Filters */}
        <filter id={`${id}-auraGlow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="22" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Radiant Aura Backdrop */}
      {withAura && (
        <circle cx="256" cy="256" r="236" fill={`url(#${id}-discAura)`} filter={`url(#${id}-auraGlow)`} />
      )}

      {/* ================= 1. SOLID PITCH BLACK INNER BACKGROUND ================= */}
      {/* Fills the entire circular interior behind the crystal with deep black */}
      <circle cx="256" cy="256" r="226" fill="#040207" />

      {/* ================= 2. CIRCULAR SPECTRUM RING ================= */}
      {withRing && (
        <>
          {/* Main Vibrant Pink/Orange/Cyan/Purple Ring */}
          <circle
            cx="256"
            cy="256"
            r="216"
            stroke={`url(#${id}-ringGrad)`}
            strokeWidth="28"
            fill="none"
            strokeLinecap="round"
          />
          {/* Inner Luminous Edge on Ring */}
          <circle cx="256" cy="256" r="216" stroke="#ffffff" strokeWidth="2.5" strokeOpacity="0.4" fill="none" />
        </>
      )}

      {/* ================= 3. VERTICAL DOUBLE-TERMINATED CRYSTAL ================= */}
      {/* Center Crystal Body Facets */}
      {/* Left Vertical Shaft (Pink & Orange) */}
      <polygon points="176,136 256,164 256,348 176,376" fill={`url(#${id}-shaftL)`} />
      {/* Center Prismatic Core (Pink-Orange-Gold-Cyan Shimmer) */}
      <polygon points="218,154 294,154 294,358 218,358" fill={`url(#${id}-shaftC)`} fillOpacity="0.9" />
      {/* Right Vertical Shaft (Cyan & Blue) */}
      <polygon points="256,164 336,136 336,376 256,348" fill={`url(#${id}-shaftR)`} />

      {/* Top Apex Pyramid Facets */}
      <polygon points="256,24 176,136 256,164" fill={`url(#${id}-topApexL)`} />
      <polygon points="256,24 232,108 256,136 280,108" fill={`url(#${id}-topApexC)`} fillOpacity="0.95" />
      <polygon points="256,24 256,164 336,136" fill={`url(#${id}-topApexR)`} />

      {/* Bottom Apex Inverted Pyramid Facets */}
      <polygon points="176,376 256,348 256,488" fill={`url(#${id}-botApexL)`} />
      <polygon points="256,488 232,404 256,376 280,404" fill={`url(#${id}-botApexC)`} fillOpacity="0.92" />
      <polygon points="256,348 336,376 256,488" fill={`url(#${id}-botApexR)`} />

      {/* ================= 4. CRISP LUMINOUS FACET EDGES ================= */}
      {/* Central Vertical Spine Line */}
      <line x1="256" y1="24" x2="256" y2="488" stroke="#ffffff" strokeWidth="4" strokeOpacity="0.95" strokeLinecap="round" />
      
      {/* Top Ridge Lines */}
      <line x1="256" y1="24" x2="176" y2="136" stroke="#ffffff" strokeWidth="3.2" strokeOpacity="0.95" />
      <line x1="256" y1="24" x2="336" y2="136" stroke="#e0f2fe" strokeWidth="3.2" strokeOpacity="0.9" />
      <line x1="176" y1="136" x2="256" y2="164" stroke="#fed7aa" strokeWidth="2.8" strokeOpacity="0.9" />
      <line x1="256" y1="164" x2="336" y2="136" stroke="#e0e7ff" strokeWidth="2.8" strokeOpacity="0.85" />

      {/* Outer Vertical Boundaries */}
      <line x1="176" y1="136" x2="176" y2="376" stroke="#ff9a8b" strokeWidth="2.8" strokeOpacity="0.9" />
      <line x1="336" y1="136" x2="336" y2="376" stroke="#7dd3fc" strokeWidth="2.8" strokeOpacity="0.85" />

      {/* Bottom Ridge Lines */}
      <line x1="176" y1="376" x2="256" y2="348" stroke="#ff758c" strokeWidth="2.8" strokeOpacity="0.9" />
      <line x1="256" y1="348" x2="336" y2="376" stroke="#818cf8" strokeWidth="2.8" strokeOpacity="0.85" />
      <line x1="176" y1="376" x2="256" y2="488" stroke="#f43f5e" strokeWidth="3.2" strokeOpacity="0.9" />
      <line x1="336" y1="376" x2="256" y2="488" stroke="#60a5fa" strokeWidth="3.2" strokeOpacity="0.9" />

      {/* Apex Sparkle Points */}
      <circle cx="256" cy="24" r="6" fill="#ffffff" />
      <circle cx="256" cy="488" r="4.5" fill="#ffffff" />
    </svg>
  );
};
