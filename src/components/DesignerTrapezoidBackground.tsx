import React, { useEffect, useRef } from "react";

interface DesignerTrapezoidBackgroundProps {
  isActive: boolean;
}

interface TrapezoidNode {
  // 4 corners of the trapezoid relative to center
  topWidth: number;
  bottomWidth: number;
  height: number;
  skew: number;
  
  // Position
  x: number;
  y: number;
  
  // Velocity / Drift
  vx: number;
  vy: number;
  vRot: number;
  rot: number;
  
  // Morphing targets
  targetTopWidth: number;
  targetBottomWidth: number;
  targetHeight: number;
  targetSkew: number;
  morphSpeed: number;
  
  // Styling
  strokeAlpha: number;
  glowColor: string;
  lineDash?: number[];
  lineWidth: number;
  hasInnerAccent: boolean;
  phase: number;
}

export const DesignerTrapezoidBackground: React.FC<DesignerTrapezoidBackgroundProps> = ({ isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number; tx: number; ty: number }>({
    x: 0,
    y: 0,
    tx: 0,
    ty: 0,
  });

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initTrapezoids();
    };

    window.addEventListener("resize", handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / width - 0.5) * 60;
      const ny = (e.clientY / height - 0.5) * 60;
      mouseRef.current.tx = nx;
      mouseRef.current.ty = ny;
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Color palettes for outline trapezoids
    const goldTones = [
      "rgba(247, 226, 171, ",  // Pale Champagne Gold
      "rgba(223, 184, 108, ",  // Warm Classic Gold
      "rgba(179, 132, 44, ",   // Deep Bronze Gold
      "rgba(255, 235, 195, ",  // High Specular Gold
      "rgba(145, 135, 150, ",  // Smoked Charcoal Platinum
    ];

    let trapezoids: TrapezoidNode[] = [];

    const createTrapezoid = (gridX?: number, gridY?: number): TrapezoidNode => {
      const posX = gridX !== undefined ? gridX : Math.random() * width;
      const posY = gridY !== undefined ? gridY : Math.random() * height;

      const baseSize = Math.min(width, height) * (0.12 + Math.random() * 0.22);
      const topW = baseSize * (0.4 + Math.random() * 0.8);
      const botW = baseSize * (0.6 + Math.random() * 1.1);
      const h = baseSize * (0.4 + Math.random() * 0.9);

      const colorBase = goldTones[Math.floor(Math.random() * goldTones.length)];

      return {
        x: posX,
        y: posY,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.003,
        
        topWidth: topW,
        bottomWidth: botW,
        height: h,
        skew: (Math.random() - 0.5) * (baseSize * 0.5),
        
        targetTopWidth: topW,
        targetBottomWidth: botW,
        targetHeight: h,
        targetSkew: (Math.random() - 0.5) * (baseSize * 0.5),
        morphSpeed: 0.008 + Math.random() * 0.012,
        
        strokeAlpha: 0.18 + Math.random() * 0.32,
        glowColor: colorBase,
        lineWidth: Math.random() > 0.7 ? 1.4 : 0.85,
        lineDash: Math.random() > 0.65 ? [6, 6] : undefined,
        hasInnerAccent: Math.random() > 0.45,
        phase: Math.random() * Math.PI * 2,
      };
    };

    const initTrapezoids = () => {
      trapezoids = [];
      const count = Math.max(14, Math.floor((width * height) / 60000));
      
      // Grid distribution with jitter
      const cols = Math.ceil(Math.sqrt(count * (width / height)));
      const rows = Math.ceil(count / cols);
      const cellW = width / cols;
      const cellH = height / rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (trapezoids.length >= count) break;
          const jX = (c + 0.5 + (Math.random() - 0.5) * 0.7) * cellW;
          const jY = (r + 0.5 + (Math.random() - 0.5) * 0.7) * cellH;
          trapezoids.push(createTrapezoid(jX, jY));
        }
      }
    };

    initTrapezoids();

    let startTime = performance.now();

    const render = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      
      // Smooth mouse follow
      mouseRef.current.x += (mouseRef.current.tx - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.ty - mouseRef.current.y) * 0.05;

      ctx.clearRect(0, 0, width, height);

      // Draw dynamic trapezoids
      for (let i = 0; i < trapezoids.length; i++) {
        const t = trapezoids[i];

        // Move position
        t.x += t.vx;
        t.y += t.vy;
        t.rot += t.vRot;
        t.phase += 0.02;

        // Wrap around screen boundaries with margin
        const pad = 150;
        if (t.x < -pad) t.x = width + pad;
        if (t.x > width + pad) t.x = -pad;
        if (t.y < -pad) t.y = height + pad;
        if (t.y > height + pad) t.y = -pad;

        // Dynamic morphing of trapezoid geometry
        t.topWidth += (t.targetTopWidth - t.topWidth) * t.morphSpeed;
        t.bottomWidth += (t.targetBottomWidth - t.bottomWidth) * t.morphSpeed;
        t.height += (t.targetHeight - t.height) * t.morphSpeed;
        t.skew += (t.targetSkew - t.skew) * t.morphSpeed;

        // Pick new random target shapes every ~4-6 seconds
        if (Math.abs(t.targetTopWidth - t.topWidth) < 2) {
          const base = Math.min(width, height) * (0.12 + Math.random() * 0.22);
          t.targetTopWidth = base * (0.35 + Math.random() * 0.85);
          t.targetBottomWidth = base * (0.55 + Math.random() * 1.15);
          t.targetHeight = base * (0.35 + Math.random() * 0.9);
          t.targetSkew = (Math.random() - 0.5) * (base * 0.6);
        }

        // Parallax offset
        const pX = t.x + mouseRef.current.x * (0.4 + (i % 3) * 0.3);
        const pY = t.y + mouseRef.current.y * (0.4 + (i % 3) * 0.3);

        ctx.save();
        ctx.translate(pX, pY);
        ctx.rotate(t.rot);

        // Calculate the 4 trapezoid vertices
        const halfH = t.height / 2;
        const halfTop = t.topWidth / 2;
        const halfBot = t.bottomWidth / 2;
        const sk = t.skew;

        // Vertices
        const p1 = { x: -halfTop + sk, y: -halfH }; // Top-left
        const p2 = { x: halfTop + sk, y: -halfH };  // Top-right
        const p3 = { x: halfBot, y: halfH };       // Bottom-right
        const p4 = { x: -halfBot, y: halfH };      // Bottom-left

        // Dynamic alpha pulse
        const dynamicAlpha = t.strokeAlpha * (0.75 + 0.25 * Math.sin(t.phase));

        // Draw Trapezoid Outer Line
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();

        ctx.strokeStyle = `${t.glowColor}${dynamicAlpha})`;
        ctx.lineWidth = t.lineWidth;
        if (t.lineDash) {
          ctx.setLineDash(t.lineDash);
        } else {
          ctx.setLineDash([]);
        }

        // Subtle gold glow
        ctx.shadowColor = `${t.glowColor}${dynamicAlpha * 0.8})`;
        ctx.shadowBlur = 8;
        ctx.stroke();

        // Corner node dots (specular gold joints)
        ctx.shadowBlur = 0;
        ctx.fillStyle = `${t.glowColor}${dynamicAlpha * 1.3})`;
        const dotSize = 1.8;
        [p1, p2, p3, p4].forEach((pt) => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, dotSize, 0, Math.PI * 2);
          ctx.fill();
        });

        // Inner nested accent trapezoid or diagonal architectural bisector
        if (t.hasInnerAccent) {
          ctx.beginPath();
          const scale = 0.55;
          ctx.moveTo(p1.x * scale, p1.y * scale);
          ctx.lineTo(p2.x * scale, p2.y * scale);
          ctx.lineTo(p3.x * scale, p3.y * scale);
          ctx.lineTo(p4.x * scale, p4.y * scale);
          ctx.closePath();
          ctx.strokeStyle = `${t.glowColor}${dynamicAlpha * 0.45})`;
          ctx.lineWidth = 0.75;
          ctx.setLineDash([3, 4]);
          ctx.stroke();
        }

        ctx.restore();
      }

      // Draw subtle connective dynamic line mesh between nearby trapezoid centers
      ctx.setLineDash([]);
      for (let i = 0; i < trapezoids.length; i++) {
        for (let j = i + 1; j < trapezoids.length; j++) {
          const dx = trapezoids[i].x - trapezoids[j].x;
          const dy = trapezoids[i].y - trapezoids[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 220;

          if (dist < maxDist) {
            const lineAlpha = (1 - dist / maxDist) * 0.12;
            ctx.beginPath();
            ctx.moveTo(
              trapezoids[i].x + mouseRef.current.x * 0.5,
              trapezoids[i].y + mouseRef.current.y * 0.5
            );
            ctx.lineTo(
              trapezoids[j].x + mouseRef.current.x * 0.5,
              trapezoids[j].y + mouseRef.current.y * 0.5
            );
            ctx.strokeStyle = `rgba(223, 184, 108, ${lineAlpha})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* 
        Layer 1: Behind the lines, the colors shift and ebb in 5-second continuous cycles 
        Cycles through deep charcoal, smoked bronze shadow, espresso gold, and dark obsidian
      */}
      <div className="absolute inset-0 designer-color-ebb-bg transition-colors" />

      {/* Layer 2: Shifting Radial Shadows and Soft Specular Highlights */}
      <div className="absolute inset-0 opacity-80 mix-blend-screen">
        <div className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-[#dfb86c]/12 via-[#a07422]/6 to-transparent blur-[120px] animate-pulse-slow-5s" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-tl from-[#c59b27]/10 via-[#3a2c1a]/20 to-transparent blur-[140px] animate-pulse-slow-5s" style={{ animationDelay: "2.5s" }} />
        <div className="absolute top-[40%] left-[30%] w-[45vw] h-[45vw] rounded-full bg-gradient-to-r from-[#2a242c]/40 via-[#181519]/50 to-transparent blur-[100px] animate-pulse-slow-5s" style={{ animationDelay: "1.25s" }} />
      </div>

      {/* Layer 3: Dynamic Canvas of Shifting Trapezoid Lines & Geometric Architectural Outline Mesh */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block opacity-90"
      />

      {/* Layer 4: Luxury Haute-Couture Vignette & Fine Grain Texture */}
      <div className="absolute inset-0 bg-radial-vignette opacity-70 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.025] pointer-events-none" />
    </div>
  );
};
