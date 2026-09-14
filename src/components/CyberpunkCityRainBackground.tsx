import React, { useEffect, useRef } from "react";
import cyberpunkCityBg from "../assets/images/cyberpunk_city_skyline_1789384451352.jpg";

interface CyberpunkCityRainBackgroundProps {
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Data structures for City Atmosphere & Aerial Vehicles
// ---------------------------------------------------------------------------

interface FlyingVehicle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  beaconColor: string;
  beaconPhase: number;
  trail: { x: number; y: number; alpha: number }[];
}

interface DrizzleStreak {
  x: number;
  y: number;
  length: number;
  speed: number;
  alpha: number;
  width: number;
}

export const CyberpunkCityRainBackground: React.FC<CyberpunkCityRainBackgroundProps> = ({ isActive }) => {
  const cityAtmosphereCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const cityAtmosphereCanvas = cityAtmosphereCanvasRef.current;
    if (!cityAtmosphereCanvas) return;

    const atmoCtx = cityAtmosphereCanvas.getContext("2d", { alpha: true });
    if (!atmoCtx) return;

    let animId: number;
    let width = (cityAtmosphereCanvas.width = window.innerWidth);
    let height = (cityAtmosphereCanvas.height = window.innerHeight);

    // -----------------------------------------------------------------------
    // Atmosphere & City Animation Entities
    // -----------------------------------------------------------------------
    let flyingVehicles: FlyingVehicle[] = [];
    let drizzleStreaks: DrizzleStreak[] = [];

    const initEntities = () => {
      // 1. Flying Vehicles (Spinners & Aerial Drones cruising through city canyons)
      flyingVehicles = [];
      const vehicleCount = Math.max(6, Math.floor(width / 220));
      for (let i = 0; i < vehicleCount; i++) {
        const isGoingRight = Math.random() > 0.45;
        const vx = (isGoingRight ? 1 : -1) * (1.1 + Math.random() * 2.4);
        const vy = (Math.random() - 0.5) * 0.35;
        const depth = Math.random(); // 0 = distant, 1 = closer
        const size = 3 + depth * 3.5;

        flyingVehicles.push({
          x: Math.random() * width,
          y: height * 0.2 + Math.random() * (height * 0.55),
          vx,
          vy,
          size,
          color: Math.random() > 0.5 ? "rgba(0, 243, 255, 0.9)" : "rgba(255, 255, 255, 0.95)",
          beaconColor: Math.random() > 0.4 ? "#ff0055" : "#ffaa00",
          beaconPhase: Math.random() * Math.PI * 2,
          trail: [],
        });
      }

      // 2. Atmospheric Slanted Night Drizzle Streaks across the city skyline
      drizzleStreaks = [];
      const drizzleCount = Math.max(90, Math.floor(width / 12));
      for (let i = 0; i < drizzleCount; i++) {
        drizzleStreaks.push({
          x: Math.random() * (width + 300) - 150,
          y: Math.random() * height,
          length: 20 + Math.random() * 36,
          speed: 16 + Math.random() * 14,
          alpha: 0.14 + Math.random() * 0.24,
          width: 0.75 + Math.random() * 0.75,
        });
      }
    };

    initEntities();

    // -----------------------------------------------------------------------
    // Main Animation Render Loop
    // -----------------------------------------------------------------------
    const render = (now: number) => {
      atmoCtx.clearRect(0, 0, width, height);

      // Flying Vehicles (Spinners & Aerial Drones cruising through city canyons)
      for (let i = 0; i < flyingVehicles.length; i++) {
        const v = flyingVehicles[i];
        v.x += v.vx;
        v.y += v.vy;

        // Record vehicle thruster wake trail
        v.trail.push({ x: v.x, y: v.y, alpha: 1.0 });
        if (v.trail.length > 16) v.trail.shift();

        // Screen wrap
        if (v.vx > 0 && v.x > width + 70) {
          v.x = -60;
          v.y = height * 0.2 + Math.random() * (height * 0.55);
          v.trail = [];
        } else if (v.vx < 0 && v.x < -70) {
          v.x = width + 60;
          v.y = height * 0.2 + Math.random() * (height * 0.55);
          v.trail = [];
        }

        // Draw thruster light wake
        for (let t = 0; t < v.trail.length; t++) {
          const pt = v.trail[t];
          const trailAlpha = (t / v.trail.length) * 0.45;
          atmoCtx.fillStyle = `rgba(0, 243, 255, ${trailAlpha})`;
          atmoCtx.fillRect(pt.x, pt.y, v.size * 0.85, 1.5);
        }

        // Vehicle silhouette body
        atmoCtx.fillStyle = "rgba(6, 10, 24, 0.92)";
        atmoCtx.fillRect(v.x - v.size, v.y - 1.5, v.size * 2, 3);

        // Vehicle headlights / thruster glow
        atmoCtx.fillStyle = v.color;
        atmoCtx.beginPath();
        atmoCtx.arc(v.x + (v.vx > 0 ? v.size : -v.size), v.y, 1.8, 0, Math.PI * 2);
        atmoCtx.fill();

        // Pulsing anti-collision strobe beacon
        const beaconPulse = (Math.sin(now * 0.0055 + v.beaconPhase) + 1) / 2;
        if (beaconPulse > 0.45) {
          atmoCtx.fillStyle = v.beaconColor;
          atmoCtx.beginPath();
          atmoCtx.arc(v.x, v.y - 3.2, 1.7, 0, Math.PI * 2);
          atmoCtx.fill();
        }
      }

      // Distant Slanted Atmospheric Drizzle across the night skyline
      atmoCtx.strokeStyle = "rgba(185, 225, 255, 0.25)";
      atmoCtx.beginPath();
      for (let i = 0; i < drizzleStreaks.length; i++) {
        const d = drizzleStreaks[i];
        d.y += d.speed;
        d.x -= d.speed * 0.22;

        if (d.y > height) {
          d.y = -d.length;
          d.x = Math.random() * (width + 300) - 150;
        }

        atmoCtx.moveTo(d.x, d.y);
        atmoCtx.lineTo(d.x - d.length * 0.22, d.y + d.length);
      }
      atmoCtx.stroke();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    const handleResize = () => {
      if (!cityAtmosphereCanvas) return;
      width = cityAtmosphereCanvas.width = window.innerWidth;
      height = cityAtmosphereCanvas.height = window.innerHeight;
      initEntities();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* 
        Layer 1: High-Detail Cinematic Cyberpunk City Skyline Matte Backdrop
        Towering futuristic megastructures, glowing holographic billboard screens in electric cyan,
        fuchsia magenta, and golden amber, elevated monorails, skybridges, and twilight night sky
      */}
      <div className="absolute -inset-2 overflow-hidden pointer-events-none">
        <img
          src={cyberpunkCityBg}
          alt="Cinematic Cyberpunk City Skyline"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center"
          style={{
            transform: "scale(1.02)",
            filter: "brightness(0.92) contrast(1.1) saturate(1.18)",
            willChange: "transform",
          }}
        />
      </div>

      {/* 
        Layer 2: Dynamic Atmospheric City FX Canvas
        Flying aerial vehicles/spinners with thruster wakes, strobe beacons, and slanted night drizzle
      */}
      <canvas
        ref={cityAtmosphereCanvasRef}
        className="absolute inset-0 w-full h-full block pointer-events-none z-[2]"
      />

      {/* 
        Layer 3: Atmospheric Neon Volumetric Glow & Horizon Radiance
        Luminous electric cyan and fuchsia magenta reflections permeating the lower atmosphere
      */}
      <div
        className="absolute inset-0 pointer-events-none z-[3]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 88%, rgba(255, 0, 127, 0.18) 0%, rgba(0, 243, 255, 0.14) 35%, rgba(123, 44, 191, 0.08) 65%, transparent 100%), linear-gradient(180deg, rgba(6, 8, 20, 0.22) 0%, transparent 40%, rgba(10, 13, 28, 0.3) 80%, rgba(5, 7, 16, 0.75) 100%)",
        }}
      />

      {/* Layer 4: Deep Edge Vignette Frame for Foreground UI Readability */}
      <div className="absolute inset-0 bg-radial-vignette opacity-50 pointer-events-none z-[4]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#060814]/30 via-transparent to-[#04050e]/60 pointer-events-none z-[4]" />
    </div>
  );
};
