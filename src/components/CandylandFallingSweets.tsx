import React, { useEffect, useRef } from "react";

// The 16 distinct sweet static image definitions mapping to /public/assets/sweets/
export const SWEET_SPRITES: { id: string; name: string; src: string }[] = [
  {
    // 1. Soft-serve ice cream cone
    id: "soft-serve",
    name: "Soft-serve ice cream cone",
    src: "/assets/sweets/sweet-01.png",
  },
  {
    // 2. Swirl lollipop
    id: "swirl-lollipop",
    name: "Swirl lollipop",
    src: "/assets/sweets/sweet-02.png",
  },
  {
    // 3. Wrapped chocolate bar
    id: "chocolate-bar",
    name: "Wrapped chocolate bar",
    src: "/assets/sweets/sweet-03.png",
  },
  {
    // 4. Candy cane with red bow
    id: "candy-cane-red",
    name: "Candy cane with red bow",
    src: "/assets/sweets/sweet-04.png",
  },
  {
    // 5. Pastel wrapped candy
    id: "pastel-wrapped-candy",
    name: "Pastel wrapped candy",
    src: "/assets/sweets/sweet-05.png",
  },
  {
    // 6. Cotton candy stick
    id: "cotton-candy",
    name: "Cotton candy stick",
    src: "/assets/sweets/sweet-06.png",
  },
  {
    // 7. Ice cream sundae bowl
    id: "sundae-bowl",
    name: "Ice cream sundae bowl",
    src: "/assets/sweets/sweet-07.png",
  },
  {
    // 8. Gumball machine
    id: "gumball-machine",
    name: "Gumball machine",
    src: "/assets/sweets/sweet-08.png",
  },
  {
    // 9. Pink sprinkled donut
    id: "sprinkled-donut",
    name: "Pink sprinkled donut",
    src: "/assets/sweets/sweet-09.png",
  },
  {
    // 10. Strawberry cake slice
    id: "strawberry-cake",
    name: "Strawberry cake slice",
    src: "/assets/sweets/sweet-10.png",
  },
  {
    // 11. Chocolate chip cookie
    id: "chocolate-cookie",
    name: "Chocolate chip cookie",
    src: "/assets/sweets/sweet-11.png",
  },
  {
    // 12. Rainbow popsicle
    id: "rainbow-popsicle",
    name: "Rainbow popsicle",
    src: "/assets/sweets/sweet-12.png",
  },
  {
    // 13. Boba tea cup
    id: "boba-tea",
    name: "Boba tea cup",
    src: "/assets/sweets/sweet-13.png",
  },
  {
    // 14. Sprinkled muffin
    id: "sprinkled-muffin",
    name: "Sprinkled muffin",
    src: "/assets/sweets/sweet-14.png",
  },
  {
    // 15. Ice cream float glass
    id: "ice-cream-float",
    name: "Ice cream float glass",
    src: "/assets/sweets/sweet-15.png",
  },
  {
    // 16. Green striped candy cane
    id: "candy-cane-green",
    name: "Green striped candy cane",
    src: "/assets/sweets/sweet-16.png",
  },
];

// Pre-instantiate and cache all 16 sweet images immediately at module scope
const PRELOADED_SWEET_IMAGES: HTMLImageElement[] = [];
if (typeof window !== "undefined") {
  SWEET_SPRITES.forEach((sprite) => {
    const img = new Image();
    img.src = sprite.src;
    PRELOADED_SWEET_IMAGES.push(img);
  });
}

interface FallingSweet {
  id: number;
  spriteIndex: number;
  x: number;
  y: number;
  vx: number; // Horizontal velocity (px/sec) for realistic momentum and bouncing
  size: number;
  speed: number; // Vertical baseline velocity (px/sec)
  rotation: number; // Degrees (0-360)
  rotationSpeed: number; // Degrees/sec (increased by ~10-20%)
  scale: number; // Scale variance (0.8x to 1.2x)
  swayPhase: number; // Fallback sine wave phase
  swayFrequency: number;
  swayAmplitude: number;
}

interface CandylandFallingSweetsProps {
  isActive: boolean;
}

export const CandylandFallingSweets: React.FC<CandylandFallingSweetsProps> = ({ isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);

  // Physics state refs
  const sweetsPoolRef = useRef<FallingSweet[]>([]);
  const tiltAngleRef = useRef<number>(0); // Current low-pass filtered roll (gamma degrees)
  const targetTiltAngleRef = useRef<number>(0); // Raw target tilt from deviceorientation
  const lastTimeRef = useRef<number>(0);

  // Theme activation & lifecycle management
  useEffect(() => {
    if (!isActive) {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = window.innerWidth || document.documentElement.clientWidth || 800;
    let height = window.innerHeight || document.documentElement.clientHeight || 600;

    const syncCanvasSize = () => {
      if (!canvas || !ctx) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth || document.documentElement.clientWidth || 800;
      height = window.innerHeight || document.documentElement.clientHeight || 600;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    syncCanvasSize();
    window.addEventListener("resize", syncCanvasSize);

    // Device orientation handler for phone roll tilt with reduced sensitivity
    const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.gamma !== undefined) {
        // Clamp gamma angle to [-45, 45] range and scale down sensitivity by ~50%
        const clampedGamma = Math.max(-45, Math.min(45, e.gamma));
        targetTiltAngleRef.current = clampedGamma * 0.5;
      }
    };

    let orientationListenerAttached = false;
    if (typeof window !== "undefined" && "DeviceOrientationEvent" in window) {
      try {
        window.addEventListener("deviceorientation", handleDeviceOrientation, true);
        orientationListenerAttached = true;
      } catch {}
    }

    // Helper to spawn a new sweet with randomized properties & scale variance (0.8x to 1.2x)
    const createSweet = (
      id: number,
      startY?: number,
      randomX?: number
    ): FallingSweet => {
      const spriteIdx = Math.floor(Math.random() * SWEET_SPRITES.length);
      const scale = 0.8 + Math.random() * 0.4; // 0.8x to 1.2x scale variance
      const baseSize = 58; // Base pixel size for crisp visibility
      const size = baseSize * scale;
      const radius = size / 2;
      const fallDuration = 9 + Math.random() * 7; // 9s to 16s duration to traverse screen
      const speed = height / fallDuration; // px/sec

      // Increased angular rotation speed (~10-20% faster and dynamic)
      const spinDirection = Math.random() < 0.5 ? -1 : 1;
      const rotationSpeed = spinDirection * (30 + Math.random() * 36); // 30 to 66 deg/sec

      // Spawn with spread-out distance above top boundary or staggered vertically on screen
      const spawnY = startY !== undefined ? startY : -size - Math.random() * 220 - 40;
      const spawnX =
        randomX !== undefined
          ? Math.max(radius + 10, Math.min(width - radius - 10, randomX))
          : radius + 10 + Math.random() * Math.max(20, width - size - 20);

      return {
        id,
        spriteIndex: spriteIdx,
        x: spawnX,
        y: spawnY,
        vx: (Math.random() - 0.5) * 20,
        size,
        speed,
        rotation: Math.random() * 360,
        rotationSpeed,
        scale,
        swayPhase: Math.random() * Math.PI * 2,
        swayFrequency: 0.6 + Math.random() * 0.6,
        swayAmplitude: 14 + Math.random() * 18,
      };
    };

    // Strict Screen Density Guard: Strictly between 5 and 7 sweets at any given time (ACTIVE_POPULATION = 6)
    const ACTIVE_POPULATION = 6;
    const initialPool: FallingSweet[] = [];
    for (let i = 0; i < ACTIVE_POPULATION; i++) {
      // Stagger vertical positions on initial load across the entire viewport height so sweets fall immediately
      const initialY = (height / ACTIVE_POPULATION) * i + (Math.random() * 60 - 30);
      initialPool.push(createSweet(i, initialY));
    }
    sweetsPoolRef.current = initialPool;
    lastTimeRef.current = performance.now();

    // Physics Animation Loop
    const renderLoop = (time: number) => {
      if (!ctx || !canvas) return;

      const deltaMs = Math.min(100, time - (lastTimeRef.current || time));
      const deltaSec = deltaMs / 1000;
      lastTimeRef.current = time;

      // Low-pass filter / smooth linear interpolation (lerp) on orientation input to prevent sudden twitching
      const lerpFactor = 0.045;
      tiltAngleRef.current += (targetTiltAngleRef.current - tiltAngleRef.current) * lerpFactor;

      // Controlled lateral drift velocity from device tilt
      const targetDriftSpeed = Math.sin((tiltAngleRef.current * Math.PI) / 180) * 80; // px/sec

      // Clear previous canvas frame
      ctx.clearRect(0, 0, width, height);

      const pool = sweetsPoolRef.current;
      for (let i = 0; i < pool.length; i++) {
        const sweet = pool[i];
        const radius = sweet.size / 2;

        // 1. Vertical motion
        sweet.y += sweet.speed * deltaSec;

        // 2. Horizontal trajectory with gentle gyro drift and sway
        const sway = Math.sin(time * 0.001 * sweet.swayFrequency + sweet.swayPhase) * sweet.swayAmplitude;
        sweet.vx += (targetDriftSpeed - sweet.vx) * 0.06;
        sweet.x += (sweet.vx + sway) * deltaSec;

        // 3. Side-Wall Bounce Collision Physics (Elastic reflection on left & right borders)
        const restitution = 0.75; // Elastic bounce coefficient
        if (sweet.x - radius <= 0) {
          sweet.x = radius;
          sweet.vx = Math.abs(sweet.vx) * restitution + 18; // Bounce toward center
          sweet.rotationSpeed = -sweet.rotationSpeed * 0.85 + (Math.random() * 20 - 10);
        } else if (sweet.x + radius >= width) {
          sweet.x = width - radius;
          sweet.vx = -Math.abs(sweet.vx) * restitution - 18; // Bounce toward center
          sweet.rotationSpeed = -sweet.rotationSpeed * 0.85 + (Math.random() * 20 - 10);
        }

        // 4. Angular Rotation
        sweet.rotation = (sweet.rotation + sweet.rotationSpeed * deltaSec) % 360;

        // 5. Bottom Exit Only: Sweets ONLY despawn when passing below bottom viewport boundary
        if (sweet.y > height + sweet.size + 20) {
          // Instantly recycle & re-enter above top boundary with spread-out distance & new graphic
          const newSpawnX = radius + 10 + Math.random() * Math.max(20, width - sweet.size - 20);
          const spreadY = -sweet.size - Math.random() * 200 - 30;
          pool[i] = createSweet(sweet.id, spreadY, newSpawnX);
          continue;
        }

        // 6. Draw Sweet Sprite with soft shadow
        const img = PRELOADED_SWEET_IMAGES[sweet.spriteIndex];
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.save();
          ctx.translate(sweet.x, sweet.y);
          ctx.rotate((sweet.rotation * Math.PI) / 180);

          // Subtle candy drop shadow
          ctx.shadowColor = "rgba(107, 45, 95, 0.15)";
          ctx.shadowBlur = 8;
          ctx.shadowOffsetY = 4;

          const renderSize = sweet.size;
          ctx.drawImage(img, -renderSize / 2, -renderSize / 2, renderSize, renderSize);

          ctx.restore();
        }
      }

      animationFrameId.current = requestAnimationFrame(renderLoop);
    };

    animationFrameId.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      window.removeEventListener("resize", syncCanvasSize);
      if (orientationListenerAttached) {
        window.removeEventListener("deviceorientation", handleDeviceOrientation, true);
      }
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <canvas
      id="candyland-physics-canvas"
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[1] overflow-hidden select-none"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 1,
      }}
    />
  );
};
