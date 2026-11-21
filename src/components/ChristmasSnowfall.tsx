import React, { useEffect, useRef } from "react";

/**
 * Gilded Noël snowfall.
 * Six flake shapes (crystal, 8-point star, plume, soft dot, sparkle, hexagon) in silver, frost and gold tints,
 * in many sizes. Each shape is pre-rendered once to a small offscreen sprite, so every frame is just a handful
 * of drawImage calls. Runs behind the app content (like the Candyland sweets) and pauses when the page is hidden.
 */

type FlakeShape = "crystal" | "star8" | "plume" | "dot" | "sparkle" | "hex";

const SHAPES: FlakeShape[] = ["crystal", "star8", "plume", "dot", "sparkle", "hex"];

// Pure white disappears on the warm ivory canvas, so each flake gets a silver / gold edge and a soft baked-in glow.
const TINTS = [
  { stroke: "#8fa3bd", fill: "#ffffff", glow: "rgba(143,163,189,0.55)" }, // silver-blue
  { stroke: "#b7942a", fill: "#fffaf0", glow: "rgba(212,175,55,0.5)" }, // gold
  { stroke: "#a9b7c9", fill: "#ffffff", glow: "rgba(169,183,201,0.5)" }, // frost
];

const SPRITE_PX = 96;

function makeSprite(shape: FlakeShape, tint: (typeof TINTS)[number]): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = SPRITE_PX;
  c.height = SPRITE_PX;
  const g = c.getContext("2d");
  if (!g) return c;

  const R = SPRITE_PX * 0.42;
  g.translate(SPRITE_PX / 2, SPRITE_PX / 2);
  g.lineCap = "round";
  g.lineJoin = "round";

  // Soft glow halo
  const halo = g.createRadialGradient(0, 0, R * 0.2, 0, 0, R * 1.25);
  halo.addColorStop(0, tint.glow);
  halo.addColorStop(1, "rgba(255,255,255,0)");
  g.globalAlpha = 0.35;
  g.fillStyle = halo;
  g.beginPath();
  g.arc(0, 0, R * 1.25, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 1;

  g.strokeStyle = tint.stroke;
  g.fillStyle = tint.fill;

  const arms = (count: number, draw: () => void) => {
    for (let k = 0; k < count; k++) {
      g.save();
      g.rotate((k * Math.PI * 2) / count);
      draw();
      g.restore();
    }
  };

  switch (shape) {
    case "crystal": {
      g.lineWidth = 3.2;
      arms(6, () => {
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(0, -R);
        for (const b of [0.45, 0.72]) {
          g.moveTo(0, -R * b);
          g.lineTo(R * 0.22, -R * b - R * 0.2);
          g.moveTo(0, -R * b);
          g.lineTo(-R * 0.22, -R * b - R * 0.2);
        }
        g.stroke();
      });
      g.beginPath();
      g.arc(0, 0, R * 0.12, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      break;
    }
    case "star8": {
      g.lineWidth = 2.6;
      g.beginPath();
      for (let i = 0; i < 16; i++) {
        const r = i % 2 === 0 ? R : R * 0.4;
        const a = (i * Math.PI) / 8 - Math.PI / 2;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.closePath();
      g.fill();
      g.stroke();
      break;
    }
    case "plume": {
      g.lineWidth = 2.8;
      arms(6, () => {
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(0, -R * 0.6);
        g.stroke();
        g.beginPath();
        g.moveTo(0, -R * 0.5);
        g.lineTo(R * 0.15, -R * 0.76);
        g.lineTo(0, -R);
        g.lineTo(-R * 0.15, -R * 0.76);
        g.closePath();
        g.fill();
        g.stroke();
      });
      break;
    }
    case "dot": {
      const grad = g.createRadialGradient(0, 0, 0, 0, 0, R * 0.6);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.7, "rgba(255,255,255,0.92)");
      grad.addColorStop(1, tint.glow);
      g.fillStyle = grad;
      g.beginPath();
      g.arc(0, 0, R * 0.6, 0, Math.PI * 2);
      g.fill();
      g.lineWidth = 2;
      g.globalAlpha = 0.7;
      g.stroke();
      g.globalAlpha = 1;
      break;
    }
    case "sparkle": {
      g.lineWidth = 2.4;
      g.beginPath();
      g.moveTo(0, -R);
      g.quadraticCurveTo(R * 0.08, -R * 0.08, R, 0);
      g.quadraticCurveTo(R * 0.08, R * 0.08, 0, R);
      g.quadraticCurveTo(-R * 0.08, R * 0.08, -R, 0);
      g.quadraticCurveTo(-R * 0.08, -R * 0.08, 0, -R);
      g.closePath();
      g.fill();
      g.stroke();
      break;
    }
    case "hex": {
      g.lineWidth = 3;
      const hexPath = (r: number) => {
        g.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3 - Math.PI / 2;
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r;
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.closePath();
      };
      hexPath(R * 0.66);
      g.stroke();
      hexPath(R * 0.3);
      g.fill();
      g.stroke();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 - Math.PI / 2;
        g.beginPath();
        g.arc(Math.cos(a) * R * 0.66, Math.sin(a) * R * 0.66, R * 0.1, 0, Math.PI * 2);
        g.fill();
        g.stroke();
      }
      break;
    }
  }
  return c;
}

interface Flake {
  x: number;
  y: number;
  size: number;
  speed: number;
  sprite: number;
  rot: number;
  rotSpeed: number;
  swayPhase: number;
  swayFreq: number;
  swayAmp: number;
  alpha: number;
}

interface ChristmasSnowfallProps {
  isActive: boolean;
}

export const ChristmasSnowfall: React.FC<ChristmasSnowfallProps> = ({ isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Pre-render every shape x tint once
    const sprites: HTMLCanvasElement[] = [];
    for (const shape of SHAPES) for (const tint of TINTS) sprites.push(makeSprite(shape, tint));

    const reduceMotion =
      typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = window.innerWidth || 800;
    let height = window.innerHeight || 600;
    let flakes: Flake[] = [];
    let raf: number | null = null;
    let last = 0;

    const populationFor = (w: number) => (w < 640 ? 22 : w < 1100 ? 32 : 44);

    const createFlake = (startY?: number): Flake => {
      // Skewed so most flakes are small with a few large ones: 9px - 34px
      const size = 9 + Math.pow(Math.random(), 1.6) * 25;
      const depth = (size - 9) / 25; // 0 = far, 1 = near
      return {
        x: Math.random() * width,
        y: startY !== undefined ? startY : -size - Math.random() * 160,
        size,
        speed: 22 + depth * 40 + Math.random() * 14, // px/s, nearer flakes fall a little faster
        sprite: Math.floor(Math.random() * sprites.length),
        rot: Math.random() * 360,
        rotSpeed: (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 32),
        swayPhase: Math.random() * Math.PI * 2,
        swayFreq: 0.5 + Math.random() * 0.7,
        swayAmp: 10 + Math.random() * 22,
        alpha: 0.55 + depth * 0.4,
      };
    };

    const seed = () => {
      const n = populationFor(width);
      flakes = [];
      for (let i = 0; i < n; i++) flakes.push(createFlake(Math.random() * height));
    };

    const syncSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth || 800;
      height = window.innerHeight || 600;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (flakes.length !== populationFor(width)) seed();
    };

    const drawFrame = () => {
      ctx.clearRect(0, 0, width, height);
      for (const f of flakes) {
        const s = sprites[f.sprite];
        ctx.save();
        ctx.globalAlpha = f.alpha;
        ctx.translate(f.x, f.y);
        ctx.rotate((f.rot * Math.PI) / 180);
        ctx.drawImage(s, -f.size / 2, -f.size / 2, f.size, f.size);
        ctx.restore();
      }
    };

    const loop = (time: number) => {
      const dt = Math.min(0.1, (time - (last || time)) / 1000);
      last = time;
      for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i];
        f.y += f.speed * dt;
        f.x += Math.sin(time * 0.001 * f.swayFreq + f.swayPhase) * f.swayAmp * dt;
        f.rot = (f.rot + f.rotSpeed * dt) % 360;
        if (f.y > height + f.size) flakes[i] = createFlake();
        else if (f.x < -f.size) f.x = width + f.size;
        else if (f.x > width + f.size) f.x = -f.size;
      }
      drawFrame();
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (raf !== null || reduceMotion) return;
      last = 0;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    syncSize();
    seed();
    drawFrame();
    if (!reduceMotion) start();

    window.addEventListener("resize", syncSize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      window.removeEventListener("resize", syncSize);
      document.removeEventListener("visibilitychange", onVisibility);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <canvas
      id="christmas-snow-canvas"
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[1] overflow-hidden select-none"
      style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", pointerEvents: "none", zIndex: 1 }}
      aria-hidden="true"
    />
  );
};
