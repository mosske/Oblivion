import React, { useEffect, useState } from "react";
import { getBespokeConfig } from "../theme/themeService";
import { hexToRgba } from "../theme/colorUtils";

export interface BespokeCanvasProps {
  isActive: boolean;
  customColors?: [string, string, string, string] | string[];
  className?: string;
}

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

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

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

  // Gentle interactive mouse parallax for glowing orb uniforms
  useEffect(() => {
    if (!isActive) return;

    let frame = 0;
    let nextX = 0;
    let nextY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      nextX = (e.clientX / innerWidth - 0.5) * 50;
      nextY = (e.clientY / innerHeight - 0.5) * 50;
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setMousePos((prev) =>
          Math.abs(prev.x - nextX) < 0.5 && Math.abs(prev.y - nextY) < 0.5 ? prev : { x: nextX, y: nextY }
        );
      });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [isActive]);

  if (!isActive) return null;

  const [c1, c2, c3, c4] = colors;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden select-none ${className}`}
      style={{
        isolation: "isolate",
        background: `radial-gradient(circle at 10% 10%, ${c1} 0%, ${c3} 40%, #050508 80%)`,
      }}
    >
      {/* 4-Color Full Gradient Overlay */}
      <div
        className="absolute inset-0 opacity-40 mix-blend-screen filter blur-[90px] animate-bespoke-aurora"
        style={{
          background: `linear-gradient(135deg, ${hexToRgba(c1, 0.45)} 0%, ${hexToRgba(c2, 0.4)} 35%, ${hexToRgba(c3, 0.35)} 70%, ${hexToRgba(c4, 0.35)} 100%)`,
        }}
      />

      {/* Glowing Orb Uniform 1: Primary Accent c1 / c2 (Top-Left) */}
      <div
        className="absolute w-[600px] h-[600px] sm:w-[750px] sm:h-[750px] -top-28 -left-24 rounded-full opacity-70 mix-blend-screen blur-[120px] will-change-transform transition-all duration-500"
        style={{
          background: `radial-gradient(circle, ${hexToRgba(c2, 0.85)} 0%, ${hexToRgba(c1, 0.6)} 45%, transparent 75%)`,
          transform: `translate3d(${mousePos.x * 0.8}px, ${mousePos.y * 0.8}px, 0)`,
          transition: "transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      />

      {/* Glowing Orb Uniform 2: Secondary Accent c2 / c3 (Top-Right) */}
      <div
        className="absolute w-[520px] h-[520px] sm:w-[680px] sm:h-[680px] top-1/4 -right-20 rounded-full opacity-65 mix-blend-screen blur-[115px] will-change-transform transition-all duration-500"
        style={{
          background: `radial-gradient(circle, ${hexToRgba(c3, 0.8)} 0%, ${hexToRgba(c2, 0.5)} 40%, transparent 75%)`,
          transform: `translate3d(${-mousePos.x * 0.6}px, ${-mousePos.y * 0.6}px, 0)`,
          transition: "transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      />

      {/* Glowing Orb Uniform 3: Midtone Accent c3 (Bottom-Left) */}
      <div
        className="absolute w-[550px] h-[550px] sm:w-[700px] sm:h-[700px] -bottom-36 left-1/5 rounded-full opacity-60 mix-blend-screen blur-[130px] will-change-transform transition-all duration-500"
        style={{
          background: `radial-gradient(circle, ${hexToRgba(c3, 0.85)} 0%, ${hexToRgba(c1, 0.55)} 45%, transparent 75%)`,
          transform: `translate3d(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px, 0)`,
          transition: "transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      />

      {/* Glowing Orb Uniform 4: Highlight / Specular Rim c4 (Bottom-Right) */}
      <div
        className="absolute w-[480px] h-[480px] sm:w-[620px] sm:h-[620px] bottom-8 -right-12 rounded-full opacity-55 mix-blend-screen blur-[105px] will-change-transform transition-all duration-500"
        style={{
          background: `radial-gradient(circle, ${hexToRgba(c4, 0.8)} 0%, ${hexToRgba(c2, 0.45)} 45%, transparent 75%)`,
          transform: `translate3d(${-mousePos.x * 0.7}px, ${mousePos.y * 0.7}px, 0)`,
          transition: "transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      />
    </div>
  );
};
