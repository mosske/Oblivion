import React, { useEffect, useState } from "react";

interface NebulaLiquidBackgroundProps {
  isActive: boolean;
}

export const NebulaLiquidBackground: React.FC<NebulaLiquidBackgroundProps> = ({ isActive }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!isActive) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 40;
      const y = (e.clientY / innerHeight - 0.5) * 40;
      setMousePos({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-[#0c071e]"
    >
      {/* Base Cosmic Gradient Foundation */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0c071e] via-[#150a2e] to-[#070312]" />

      {/* Fluid Sweeping Aurora Layer */}
      <div
        className="absolute inset-0 opacity-45 mix-blend-screen animate-nebula-aurora filter blur-[80px]"
        style={{
          background:
            "linear-gradient(125deg, rgba(255, 0, 127, 0.4) 0%, rgba(139, 92, 246, 0.35) 30%, rgba(255, 123, 0, 0.35) 65%, rgba(0, 240, 255, 0.3) 100%)",
        }}
      />

      {/* Floating Glowing Nebula Orb 1: Hot Magenta / Neon Pink (Top-Left to Center) */}
      <div
        className="absolute w-[580px] h-[580px] sm:w-[720px] sm:h-[720px] -top-24 -left-20 rounded-full animate-nebula-orb-1 opacity-70 mix-blend-screen blur-[120px] will-change-transform"
        style={{
          background:
            "radial-gradient(circle, rgba(255, 0, 127, 0.85) 0%, rgba(236, 72, 153, 0.6) 40%, rgba(168, 85, 247, 0.2) 75%, transparent 100%)",
          transform: `translate3d(${mousePos.x * 0.8}px, ${mousePos.y * 0.8}px, 0)`,
          transition: "transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      />

      {/* Floating Glowing Nebula Orb 2: Sunset Gold / Amber Coral (Top-Right to Center) */}
      <div
        className="absolute w-[500px] h-[500px] sm:w-[650px] sm:h-[650px] top-1/4 -right-16 rounded-full animate-nebula-orb-2 opacity-65 mix-blend-screen blur-[110px] will-change-transform"
        style={{
          background:
            "radial-gradient(circle, rgba(255, 123, 0, 0.8) 0%, rgba(251, 146, 60, 0.55) 40%, rgba(255, 0, 127, 0.25) 70%, transparent 100%)",
          transform: `translate3d(${-mousePos.x * 0.6}px, ${-mousePos.y * 0.6}px, 0)`,
          transition: "transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      />

      {/* Floating Glowing Nebula Orb 3: Electric Violet & Ultraviolet (Bottom-Left) */}
      <div
        className="absolute w-[540px] h-[540px] sm:w-[680px] sm:h-[680px] -bottom-32 left-1/4 rounded-full animate-nebula-orb-3 opacity-60 mix-blend-screen blur-[125px] will-change-transform"
        style={{
          background:
            "radial-gradient(circle, rgba(139, 92, 246, 0.8) 0%, rgba(192, 132, 252, 0.55) 45%, rgba(217, 70, 239, 0.3) 75%, transparent 100%)",
          transform: `translate3d(${mousePos.x * 0.5}px, ${-mousePos.y * 0.5}px, 0)`,
          transition: "transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      />

      {/* Floating Glowing Nebula Orb 4: Starlight Electric Cyan (Center to Bottom-Right) */}
      <div
        className="absolute w-[460px] h-[460px] sm:w-[580px] sm:h-[580px] bottom-10 -right-10 rounded-full animate-nebula-orb-4 opacity-50 mix-blend-screen blur-[100px] will-change-transform"
        style={{
          background:
            "radial-gradient(circle, rgba(0, 240, 255, 0.75) 0%, rgba(56, 189, 248, 0.5) 45%, rgba(139, 92, 246, 0.2) 75%, transparent 100%)",
          transform: `translate3d(${-mousePos.x * 0.7}px, ${mousePos.y * 0.7}px, 0)`,
          transition: "transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      />

      {/* Delicate Micro Stardust & Cosmic Glow Overlay */}
      <div
        className="absolute inset-0 opacity-25 mix-blend-overlay"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px), radial-gradient(rgba(255, 0, 127, 0.3) 1px, transparent 1px)",
          backgroundSize: "64px 64px, 96px 96px",
          backgroundPosition: "0 0, 32px 32px",
        }}
      />

      {/* Soft Vignette Border to give crisp depth to edge interfaces */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(6,2,15,0.6)_100%)] pointer-events-none" />
    </div>
  );
};
