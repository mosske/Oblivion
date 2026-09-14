import React, { useEffect, useRef } from "react";

interface EmeraldWildernessBackgroundProps {
  isActive: boolean;
  isFullPlayer?: boolean;
}

interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  waveFreq: number;
  waveAmp: number;
  radius: number;
  glowRadius: number;
  baseOpacity: number;
  pulseSpeed: number;
  pulsePhase: number;
  r: number;
  g: number;
  b: number;
}

export const EmeraldWildernessBackground: React.FC<EmeraldWildernessBackgroundProps> = ({
  isActive,
  isFullPlayer = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Bioluminescent fireflies particle animation
  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animFrameId: number;
    let width = 0;
    let height = 0;

    const colorPalettes = [
      { r: 255, g: 224, b: 102 }, // warm bright yellow (#ffe066)
      { r: 250, g: 204, b: 21 },  // radiant gold (#facc15)
      { r: 254, g: 240, b: 138 }, // light sunshine yellow (#fef08a)
      { r: 217, g: 249, b: 157 }, // chartreuse light (#d9f99d)
      { r: 253, g: 224, b: 71 },  // glowing amber (#fde047)
    ];

    const fireflyCount = typeof window !== "undefined" && window.innerWidth < 768 ? 32 : 54;
    const fireflies: Firefly[] = [];

    const handleResize = () => {
      if (!canvas) return;
      const newW = window.innerWidth;
      const newH = window.innerHeight;
      if (width > 0 && Math.abs(width - newW) < 2 && Math.abs(height - newH) < 2) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(newW, 320);
      height = Math.max(newH, 320);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    handleResize();

    // Initialize fireflies across the canvas
    for (let i = 0; i < fireflyCount; i++) {
      const col = colorPalettes[i % colorPalettes.length];
      fireflies.push({
        x: Math.random() * (width || window.innerWidth || 800),
        y: Math.random() * (height || window.innerHeight || 600),
        vx: 0.35 + Math.random() * 0.85, // drift from left to right
        vy: (Math.random() - 0.5) * 0.4,  // gentle vertical drift
        waveFreq: 0.015 + Math.random() * 0.025,
        waveAmp: 0.9 + Math.random() * 1.8,
        radius: 2.2 + Math.random() * 2.2,
        glowRadius: 16 + Math.random() * 18,
        baseOpacity: 0.55 + Math.random() * 0.45,
        pulseSpeed: 0.04 + Math.random() * 0.05,
        pulsePhase: Math.random() * Math.PI * 2,
        r: col.r,
        g: col.g,
        b: col.b,
      });
    }

    let time = 0;

    const render = () => {
      time += 1;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < fireflies.length; i++) {
        const f = fireflies[i];

        // Horizontal drift + gentle sinusoidal hover
        f.x += f.vx;
        f.y += f.vy + Math.sin(time * f.waveFreq + f.pulsePhase) * (f.waveAmp * 0.4);

        // Screen wrap-around: seamlessly reappear on the left
        if (f.x > width + 30) {
          f.x = -25;
          f.y = Math.random() * height;
        }
        if (f.y < -30) {
          f.y = height + 20;
        } else if (f.y > height + 30) {
          f.y = -20;
        }

        // Bioluminescent pulsing glow
        const pulse = Math.sin(time * f.pulseSpeed + f.pulsePhase);
        const currentOpacity = Math.max(0.25, Math.min(1.0, f.baseOpacity + pulse * 0.38));

        // Outer soft glow halo
        ctx.save();
        const grad = ctx.createRadialGradient(
          f.x, f.y, 0,
          f.x, f.y, f.glowRadius
        );
        grad.addColorStop(0, `rgba(${f.r}, ${f.g}, ${f.b}, ${Math.min(1, currentOpacity * 0.98)})`);
        grad.addColorStop(0.35, `rgba(${f.r}, ${f.g}, ${f.b}, ${currentOpacity * 0.48})`);
        grad.addColorStop(1, `rgba(${f.r}, ${f.g}, ${f.b}, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Intense warm white-gold center spark
        ctx.fillStyle = `rgba(255, 255, 240, ${Math.min(1, currentOpacity * 0.99)})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animFrameId = requestAnimationFrame(render);
    };

    render();

    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`emerald-wilderness-bg pointer-events-none overflow-hidden select-none ${
        isFullPlayer ? "full-player-bg absolute inset-0 z-0" : "fixed inset-0 z-0"
      }`}
      style={{
        background: isFullPlayer ? "transparent" : "#011209",
      }}
    >
      {/* Base Layer: Deep Forest Ambient Foundation */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#01140c] via-[#022316] to-[#010a06]" />

      {/* Main Animated Slim Diagonal Bands Layer
          - 5-second synchronized cycle across all sliding bands and breeze sway
          - Pure continuous slim bands extending far beyond viewports
          - Heavy Bokeh Blur (24px to 38px) creating a luscious camera depth-of-field
          - Hardware accelerated via translate3d and will-change: transform
      */}
      <div className="absolute -inset-[40%] w-[180%] h-[180%] flex items-center justify-center animate-band-sway-overall pointer-events-none filter blur-[24px] sm:blur-[32px] md:blur-[38px] will-change-transform">
        <div className="relative w-full h-full flex items-stretch justify-center gap-1.5 sm:gap-2">
          {/* Band 1: Deep Viridian Shadow (Slim ~56px) */}
          <div
            className="relative w-11 sm:w-15 h-[340%] -top-[120%] flex-shrink-0 animate-band-slide-2"
            style={{
              background:
                "linear-gradient(180deg, #010e07 0%, #032b1d 38%, #06402b 72%, #01120a 100%)",
              animationDelay: "-0.3s",
            }}
          />

          {/* Band 2: Deep Emerald Slat (Slim ~48px) */}
          <div
            className="relative w-10 sm:w-13 h-[340%] -top-[120%] flex-shrink-0 animate-band-slide-1"
            style={{
              background:
                "linear-gradient(180deg, #032b1d 0%, #064e32 42%, #08613e 75%, #021a11 100%)",
              animationDelay: "-0.6s",
            }}
          />

          {/* Band 3: Vibrant Forest Emerald Slat (Slim ~44px) */}
          <div
            className="relative w-9 sm:w-12 h-[340%] -top-[120%] flex-shrink-0 animate-band-slide-3"
            style={{
              background:
                "linear-gradient(180deg, #0d7047 0%, #059669 35%, #047857 70%, #022c1b 100%)",
              animationDelay: "-0.9s",
            }}
          />

          {/* Band 4: Dark Pine Panel (Slim ~62px) */}
          <div
            className="relative w-13 sm:w-17 h-[340%] -top-[120%] flex-shrink-0 animate-band-slide-4"
            style={{
              background:
                "linear-gradient(180deg, #022316 0%, #03422a 40%, #065436 75%, #01140c 100%)",
              animationDelay: "-1.2s",
            }}
          />

          {/* Band 5: Luminous Mint-Emerald Ribbon (Slim ~50px) */}
          <div
            className="relative w-10 sm:w-14 h-[340%] -top-[120%] flex-shrink-0 animate-band-slide-5"
            style={{
              background:
                "linear-gradient(180deg, #6ee7b7 0%, #34d399 26%, #059669 62%, #044e33 100%)",
              animationDelay: "-1.5s",
            }}
          />

          {/* Band 6: Vibrant Lime-Chartreuse Canopy Slat (Slim ~54px) */}
          <div
            className="relative w-11 sm:w-15 h-[340%] -top-[120%] flex-shrink-0 animate-band-slide-6"
            style={{
              background:
                "linear-gradient(180deg, #bef264 0%, #84cc16 32%, #4d7c0f 68%, #14532d 100%)",
              animationDelay: "-1.8s",
            }}
          />

          {/* Band 7: Sun-Soaked Golden Amber Band (Slim ~48px) */}
          <div
            className="relative w-10 sm:w-13 h-[340%] -top-[120%] flex-shrink-0 animate-band-slide-7"
            style={{
              background:
                "linear-gradient(180deg, #fef08a 0%, #eab308 24%, #84cc16 58%, #15803d 100%)",
              animationDelay: "-2.1s",
            }}
          />

          {/* Band 8: Bright Spring Lime Ribbon (Slim ~42px) */}
          <div
            className="relative w-9 sm:w-12 h-[340%] -top-[120%] flex-shrink-0 animate-band-slide-8"
            style={{
              background:
                "linear-gradient(180deg, #d9f99d 0%, #a3e635 32%, #22c55e 70%, #065f46 100%)",
              animationDelay: "-2.4s",
            }}
          />

          {/* Band 9: Deep Hunter Green Backdrop Slat (Slim ~66px) */}
          <div
            className="relative w-14 sm:w-18 h-[340%] -top-[120%] flex-shrink-0 animate-band-slide-2"
            style={{
              background:
                "linear-gradient(180deg, #021a10 0%, #043825 50%, #064e32 80%, #011109 100%)",
              animationDelay: "-2.7s",
            }}
          />

          {/* Band 10: Jade Teal Slat (Slim ~46px) */}
          <div
            className="relative w-10 sm:w-13 h-[340%] -top-[120%] flex-shrink-0 animate-band-slide-3"
            style={{
              background:
                "linear-gradient(180deg, #064e3b 0%, #0d9488 35%, #0f766e 70%, #022c22 100%)",
              animationDelay: "-3.0s",
            }}
          />

          {/* Band 11: Mint Blade Ribbon (Slim ~44px) */}
          <div
            className="relative w-9 sm:w-12 h-[340%] -top-[120%] flex-shrink-0 animate-band-slide-1"
            style={{
              background:
                "linear-gradient(180deg, #a7f3d0 0%, #10b981 30%, #059669 65%, #022c1b 100%)",
              animationDelay: "-3.3s",
            }}
          />

          {/* Band 12: Chartreuse High-Contrast Strip (Slim ~40px) */}
          <div
            className="relative w-8 sm:w-11 h-[340%] -top-[120%] flex-shrink-0 animate-band-slide-4"
            style={{
              background:
                "linear-gradient(180deg, #ecfccb 0%, #84cc16 35%, #3f6212 70%, #14532d 100%)",
              animationDelay: "-3.6s",
            }}
          />

          {/* Band 13: Viridian Deep Panel (Slim ~58px) */}
          <div
            className="relative w-12 sm:w-16 h-[340%] -top-[120%] flex-shrink-0 animate-band-slide-5"
            style={{
              background:
                "linear-gradient(180deg, #01140b 0%, #043825 45%, #064e32 75%, #011109 100%)",
              animationDelay: "-3.9s",
            }}
          />

          {/* Band 14: Golden Amber Ribbon (Slim ~46px) */}
          <div
            className="relative w-10 sm:w-13 h-[340%] -top-[120%] flex-shrink-0 animate-band-slide-6"
            style={{
              background:
                "linear-gradient(180deg, #fef9c3 0%, #facc15 28%, #ca8a04 65%, #422006 100%)",
              animationDelay: "-4.2s",
            }}
          />

          {/* Band 15: Forest Emerald Slat (Slim ~52px) */}
          <div
            className="relative w-11 sm:w-14 h-[340%] -top-[120%] flex-shrink-0 animate-band-slide-7"
            style={{
              background:
                "linear-gradient(180deg, #022c1b 0%, #059669 45%, #047857 75%, #01140c 100%)",
              animationDelay: "-4.5s",
            }}
          />

          {/* Band 16: Pale Mint Light Ribbon (Slim ~38px) */}
          <div
            className="relative w-8 sm:w-11 h-[340%] -top-[120%] flex-shrink-0 animate-band-slide-8"
            style={{
              background:
                "linear-gradient(180deg, #ecfdf5 0%, #6ee7b7 30%, #10b981 70%, #044e33 100%)",
              animationDelay: "-4.8s",
            }}
          />

          {/* Band 17: Deep Pine Shadow Strip (Slim ~60px) */}
          <div
            className="relative w-13 sm:w-17 h-[340%] -top-[120%] flex-shrink-0 animate-band-slide-2"
            style={{
              background:
                "linear-gradient(180deg, #010f08 0%, #022316 45%, #033622 75%, #010a05 100%)",
              animationDelay: "-1.0s",
            }}
          />

          {/* Band 18: Vivid Lime Slat (Slim ~46px) */}
          <div
            className="relative w-10 sm:w-13 h-[340%] -top-[120%] flex-shrink-0 animate-band-slide-1"
            style={{
              background:
                "linear-gradient(180deg, #a3e635 0%, #65a30d 40%, #365314 75%, #14532d 100%)",
              animationDelay: "-2.2s",
            }}
          />

          {/* Band 19: Deep Emerald Tail Layer (Slim ~54px) */}
          <div
            className="relative w-11 sm:w-15 h-[340%] -top-[120%] flex-shrink-0 animate-band-slide-4"
            style={{
              background:
                "linear-gradient(180deg, #01140b 0%, #032b1d 40%, #06402b 75%, #01120a 100%)",
              animationDelay: "-3.4s",
            }}
          />
        </div>
      </div>

      {/* Layer 3: Soft Dappled Canopy Light Spots */}
      <div className="absolute top-[20%] left-[28%] w-80 sm:w-96 h-80 sm:h-96 rounded-full bg-[radial-gradient(circle,rgba(254,240,138,0.35)_0%,rgba(234,179,8,0.15)_40%,transparent_70%)] filter blur-[40px] animate-canopy-spot-1 pointer-events-none" />
      <div className="absolute top-[42%] left-[44%] w-96 sm:w-[460px] h-96 sm:h-[460px] rounded-full bg-[radial-gradient(circle,rgba(0,245,160,0.3)_0%,rgba(52,211,153,0.15)_45%,transparent_75%)] filter blur-[48px] animate-canopy-spot-2 pointer-events-none" />
      <div className="absolute top-[12%] right-[18%] w-72 sm:w-80 h-72 sm:h-80 rounded-full bg-[radial-gradient(circle,rgba(190,242,100,0.35)_0%,rgba(132,204,22,0.15)_45%,transparent_70%)] filter blur-[36px] animate-canopy-spot-3 pointer-events-none" />
      <div className="absolute -top-12 -right-12 w-[480px] sm:w-[680px] h-[480px] sm:h-[680px] rounded-full bg-[radial-gradient(circle,rgba(254,240,138,0.35)_0%,rgba(163,230,53,0.18)_35%,transparent_75%)] filter blur-[60px] pointer-events-none" />

      {/* Layer 4: Soft Edge Vignette Frame for Foreground UI Contrast */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(1, 14, 9, 0.45) 75%, rgba(1, 10, 6, 0.88) 100%)",
        }}
      />

      {/* Layer 5: Warm Bioluminescent Fireflies Canvas
          Fluttering warm golden-yellow fireflies with bioluminescent pulses,
          positioned in the background layer with pointer-events-none.
      */}
      <canvas
        ref={canvasRef}
        className={`animated-theme-bg ${isFullPlayer ? "full-player-canvas" : ""} absolute inset-0 w-full h-full pointer-events-none z-10`}
        style={{
          contain: "strict",
          willChange: "transform",
        }}
      />
    </div>
  );
};
