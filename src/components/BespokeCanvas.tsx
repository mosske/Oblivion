import React, { useEffect, useState } from "react";
import { getBespokeConfig } from "../theme/themeService";
import { hexToRgba } from "../theme/colorUtils";

export interface BespokeCanvasProps {
  isActive: boolean;
  customColors?: [string, string, string, string] | string[];
  className?: string;
}

/**
 * Bespoke background.
 *
 * Deliberately a SINGLE, STATIC layer made of stacked CSS gradients:
 *  - no blur() filters, no mix-blend-mode, no will-change, no animation, no mouse parallax.
 * The previous version used five huge blurred / blended / animated layers behind dozens of
 * backdrop-filter cards. On phones that exhausts GPU tile memory, which showed up as flicker
 * while scrolling and rectangular patches (header, cards, nav) failing to paint.
 */
export const BespokeCanvas: React.FC<BespokeCanvasProps> = ({
  isActive,
  customColors,
  className = "",
}) => {
  const [colors, setColors] = useState<[string, string, string, string]>(() => {
    if (customColors && customColors.length >= 4) {
      return [customColors[0], customColors[1], customColors[2], customColors[3]];
    }
    return getBespokeConfig().colors;
  });

  // Update when prop changes
  useEffect(() => {
    if (customColors && customColors.length >= 4) {
      setColors([customColors[0], customColors[1], customColors[2], customColors[3]]);
    }
  }, [customColors]);

  // Real-time synchronization with Bespoke customizer events
  useEffect(() => {
    if (!isActive) return;

    const handleColorsUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail) && e.detail.length >= 4) {
        setColors([e.detail[0], e.detail[1], e.detail[2], e.detail[3]]);
      } else if (e.detail && e.detail.colors && Array.isArray(e.detail.colors)) {
        setColors([e.detail.colors[0], e.detail.colors[1], e.detail.colors[2], e.detail.colors[3]]);
      }
    };

    window.addEventListener("oblivion_bespoke_colors_updated", handleColorsUpdate);
    window.addEventListener("oblivion_bespoke_config_updated", handleColorsUpdate);

    return () => {
      window.removeEventListener("oblivion_bespoke_colors_updated", handleColorsUpdate);
      window.removeEventListener("oblivion_bespoke_config_updated", handleColorsUpdate);
    };
  }, [isActive]);

  if (!isActive) return null;

  const [c1, c2, c3, c4] = colors;

  const background = [
    // soft colour pools (replace the four blurred orbs)
    `radial-gradient(65% 55% at 12% 6%, ${hexToRgba(c2, 0.55)} 0%, transparent 70%)`,
    `radial-gradient(55% 50% at 94% 30%, ${hexToRgba(c3, 0.5)} 0%, transparent 72%)`,
    `radial-gradient(60% 55% at 28% 100%, ${hexToRgba(c3, 0.5)} 0%, transparent 72%)`,
    `radial-gradient(50% 45% at 96% 94%, ${hexToRgba(c4, 0.5)} 0%, transparent 72%)`,
    // 4-colour wash (replaces the aurora layer)
    `linear-gradient(135deg, ${hexToRgba(c1, 0.3)} 0%, ${hexToRgba(c2, 0.22)} 35%, ${hexToRgba(c3, 0.2)} 70%, ${hexToRgba(c4, 0.22)} 100%)`,
    // base
    `radial-gradient(circle at 10% 10%, ${c1} 0%, ${c3} 40%, #050508 80%)`,
  ].join(", ");

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none z-0 select-none ${className}`}
      style={{ background, transform: "translateZ(0)" }}
    />
  );
};
