import React, { useEffect, useRef } from "react";

interface HommeMosaicBackgroundProps {
  isActive: boolean;
}

// Vertex node in the shared geometric tessellation mesh
interface MeshVertex {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  // Harmonic drift frequencies and amplitudes
  speedX1: number;
  speedY1: number;
  speedX2: number;
  speedY2: number;
  phaseX1: number;
  phaseY1: number;
  phaseX2: number;
  phaseY2: number;
  ampX: number;
  ampY: number;
}

type TextureType =
  | "slate-steel"         // Lighter slate-blueish-grey metallic sheen with brushed specular lines
  | "midnight-slate"      // Dark midnight blue close to black with subtle crystalline micro-flecks
  | "mocha-mousse"        // Warm mocha mousse with walnut grain
  | "smoked-marble"       // Smoked ecru slate marble with charcoal-slate veins
  | "burnished-titanium"  // Burnished blueish titanium gunmetal with radial specular reflection
  | "acoustic-fluting"    // Architectural lighter slate-blue pinstripes over dark midnight navy
  | "noir-leather";       // Deep midnight pebble grain leather

interface MosaicTriangle {
  v0: number; // vertex index 0
  v1: number; // vertex index 1
  v2: number; // vertex index 2
  texture: TextureType;
  gradientAngle: number;
  accentVariant: number;
  pinstripeAngle: number;
  pinstripeSpacing: number;
}

export const HommeMosaicBackground: React.FC<HommeMosaicBackgroundProps> = ({ isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number; tx: number; ty: number }>({
    x: -1000,
    y: -1000,
    tx: -1000,
    ty: -1000,
  });

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let vertices: MeshVertex[] = [];
    let triangles: MosaicTriangle[] = [];

    // Curated masculine luxury palette distribution:
    // Slate steel (~22%), Midnight slate (~24%), Mocha mousse (~20%),
    // Smoked marble (~12%), Burnished titanium (~10%), Acoustic fluting (~12%)
    const texturePool: TextureType[] = [
      "slate-steel", "slate-steel",
      "midnight-slate", "midnight-slate", "midnight-slate",
      "mocha-mousse", "mocha-mousse",
      "smoked-marble",
      "burnished-titanium",
      "acoustic-fluting",
      "noir-leather"
    ];

    const initMesh = () => {
      vertices = [];
      triangles = [];

      // Grid cell dimensions for tessellated mosaic:
      // Sized to create balanced geometric triangles across both mobile & desktop
      const baseCell = Math.max(120, Math.min(width, height) * 0.18);
      const pad = baseCell * 1.5;

      const xMin = -pad;
      const xMax = width + pad;
      const yMin = -pad;
      const yMax = height + pad;

      const cols = Math.ceil((xMax - xMin) / baseCell) + 1;
      const rows = Math.ceil((yMax - yMin) / baseCell) + 1;
      const cellW = (xMax - xMin) / cols;
      const cellH = (yMax - yMin) / rows;

      // Map 2D grid coordinates (c, r) to vertex index
      const gridIndex = (c: number, r: number) => r * (cols + 1) + c;

      // 1. Create base vertex grid with organic jitter
      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= cols; c++) {
          const jitterX = (Math.random() - 0.5) * cellW * 0.6;
          const jitterY = (Math.random() - 0.5) * cellH * 0.6;
          const bx = xMin + c * cellW + jitterX;
          const by = yMin + r * cellH + jitterY;

          vertices.push({
            baseX: bx,
            baseY: by,
            x: bx,
            y: by,
            speedX1: 0.0004 + Math.random() * 0.0006,
            speedY1: 0.0004 + Math.random() * 0.0006,
            speedX2: 0.00025 + Math.random() * 0.00035,
            speedY2: 0.00025 + Math.random() * 0.00035,
            phaseX1: Math.random() * Math.PI * 2,
            phaseY1: Math.random() * Math.PI * 2,
            phaseX2: Math.random() * Math.PI * 2,
            phaseY2: Math.random() * Math.PI * 2,
            ampX: 18 + Math.random() * 22,
            ampY: 18 + Math.random() * 22,
          });
        }
      }

      // 2. Build tessellated triangles from quads
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const tl = gridIndex(c, r);
          const tr = gridIndex(c + 1, r);
          const bl = gridIndex(c, r + 1);
          const br = gridIndex(c + 1, r + 1);

          // 25% chance of quad center star tessellation (4 smaller triangles)
          const useCenterSubdivision = Math.random() < 0.25;

          if (useCenterSubdivision) {
            const vTL = vertices[tl];
            const vTR = vertices[tr];
            const vBL = vertices[bl];
            const vBR = vertices[br];
            const centerBx = (vTL.baseX + vTR.baseX + vBL.baseX + vBR.baseX) / 4 + (Math.random() - 0.5) * 15;
            const centerBy = (vTL.baseY + vTR.baseY + vBL.baseY + vBR.baseY) / 4 + (Math.random() - 0.5) * 15;

            const centerIdx = vertices.length;
            vertices.push({
              baseX: centerBx,
              baseY: centerBy,
              x: centerBx,
              y: centerBy,
              speedX1: 0.0005 + Math.random() * 0.0006,
              speedY1: 0.0005 + Math.random() * 0.0006,
              speedX2: 0.0003 + Math.random() * 0.0004,
              speedY2: 0.0003 + Math.random() * 0.0004,
              phaseX1: Math.random() * Math.PI * 2,
              phaseY1: Math.random() * Math.PI * 2,
              phaseX2: Math.random() * Math.PI * 2,
              phaseY2: Math.random() * Math.PI * 2,
              ampX: 20 + Math.random() * 25,
              ampY: 20 + Math.random() * 25,
            });

            const subTriangles: [number, number, number][] = [
              [tl, tr, centerIdx],
              [tr, br, centerIdx],
              [br, bl, centerIdx],
              [bl, tl, centerIdx],
            ];

            for (const [i0, i1, i2] of subTriangles) {
              const tex = texturePool[Math.floor(Math.random() * texturePool.length)];
              triangles.push({
                v0: i0,
                v1: i1,
                v2: i2,
                texture: tex,
                gradientAngle: Math.random() * Math.PI * 2,
                accentVariant: Math.random(),
                pinstripeAngle: Math.floor(Math.random() * 4) * (Math.PI / 4),
                pinstripeSpacing: 9 + Math.floor(Math.random() * 6),
              });
            }
          } else {
            // Split quad into 2 triangles along diagonal (alternating pattern)
            const diagonalTLtoBR = (c + r) % 2 === 0;

            const pair: [[number, number, number], [number, number, number]] = diagonalTLtoBR
              ? [[tl, tr, br], [tl, br, bl]]
              : [[tl, tr, bl], [tr, br, bl]];

            for (const [i0, i1, i2] of pair) {
              const tex = texturePool[Math.floor(Math.random() * texturePool.length)];
              triangles.push({
                v0: i0,
                v1: i1,
                v2: i2,
                texture: tex,
                gradientAngle: Math.random() * Math.PI * 2,
                accentVariant: Math.random(),
                pinstripeAngle: Math.floor(Math.random() * 4) * (Math.PI / 4),
                pinstripeSpacing: 10 + Math.floor(Math.random() * 5),
              });
            }
          }
        }
      }
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initMesh();
    };

    window.addEventListener("resize", handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.tx = e.clientX;
      mouseRef.current.ty = e.clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouseRef.current.tx = e.touches[0].clientX;
        mouseRef.current.ty = e.touches[0].clientY;
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current.tx = -1000;
      mouseRef.current.ty = -1000;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave);

    initMesh();

    const startTime = performance.now();

    const render = (now: number) => {
      const elapsed = now - startTime;

      // Smooth mouse spring interpolation
      mouseRef.current.x += (mouseRef.current.tx - mouseRef.current.x) * 0.06;
      mouseRef.current.y += (mouseRef.current.ty - mouseRef.current.y) * 0.06;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // 1. Update vertex coordinates with smooth ebbing waves and mouse deflection
      for (let i = 0; i < vertices.length; i++) {
        const v = vertices[i];
        const t = elapsed;

        // Harmonic sine waves for fluid non-linear stretching
        const dx =
          Math.sin(t * v.speedX1 + v.phaseX1) * v.ampX +
          Math.cos(t * v.speedX2 + v.phaseX2) * (v.ampX * 0.45);
        const dy =
          Math.cos(t * v.speedY1 + v.phaseY1) * v.ampY +
          Math.sin(t * v.speedY2 + v.phaseY2) * (v.ampY * 0.45);

        // Tactile mouse deflection: gentle repulsion within 240px
        let pushX = 0;
        let pushY = 0;
        if (mx > -500) {
          const dist = Math.hypot(v.baseX - mx, v.baseY - my);
          if (dist < 240) {
            const force = (1 - dist / 240) * 32;
            const angle = Math.atan2(v.baseY - my, v.baseX - mx);
            pushX = Math.cos(angle) * force;
            pushY = Math.sin(angle) * force;
          }
        }

        v.x = v.baseX + dx + pushX;
        v.y = v.baseY + dy + pushY;
      }

      // Base dark midnight blue close to black backdrop
      ctx.fillStyle = "#080c16";
      ctx.fillRect(0, 0, width, height);

      // 2. Render each textured, non-flat gradient triangle
      for (let i = 0; i < triangles.length; i++) {
        const tri = triangles[i];
        const p0 = vertices[tri.v0];
        const p1 = vertices[tri.v1];
        const p2 = vertices[tri.v2];

        // Frustum culling check
        const minX = Math.min(p0.x, p1.x, p2.x);
        const maxX = Math.max(p0.x, p1.x, p2.x);
        const minY = Math.min(p0.y, p1.y, p2.y);
        const maxY = Math.max(p0.y, p1.y, p2.y);
        if (maxX < 0 || minX > width || maxY < 0 || minY > height) {
          continue;
        }

        const cx = (p0.x + p1.x + p2.x) / 3;
        const cy = (p0.y + p1.y + p2.y) / 3;
        const radius = Math.max(
          Math.hypot(p0.x - cx, p0.y - cy),
          Math.hypot(p1.x - cx, p1.y - cy),
          Math.hypot(p2.x - cx, p2.y - cy)
        );

        ctx.save();

        // Establish triangle clipping boundary
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.closePath();
        ctx.clip();

        // Directional vector for gradient based on triangle angle
        const gx0 = cx - Math.cos(tri.gradientAngle) * radius;
        const gy0 = cy - Math.sin(tri.gradientAngle) * radius;
        const gx1 = cx + Math.cos(tri.gradientAngle) * radius;
        const gy1 = cy + Math.sin(tri.gradientAngle) * radius;

        // Render masculine textures with rich gradients and detailed tactile surfaces
        switch (tri.texture) {
          case "slate-steel": {
            // Lighter Slate-Blueish-Grey metallic finish (replaces yellow-gold)
            const grad = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
            if (tri.accentVariant > 0.5) {
              grad.addColorStop(0, "#d2dfea");
              grad.addColorStop(0.3, "#a2b7cb");
              grad.addColorStop(0.68, "#647c94");
              grad.addColorStop(1, "#36495c");
            } else {
              grad.addColorStop(0, "#e6eef5");
              grad.addColorStop(0.35, "#8fa7c2");
              grad.addColorStop(0.72, "#587088");
              grad.addColorStop(1, "#2b3b4a");
            }
            ctx.fillStyle = grad;
            ctx.fill();

            // Specular brushed sheen strokes across the metallic facet
            ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(cx - radius * 0.65, cy - radius * 0.4);
            ctx.lineTo(cx + radius * 0.65, cy + radius * 0.4);
            ctx.stroke();

            // Secondary soft sheen stroke
            ctx.strokeStyle = "rgba(215, 235, 255, 0.18)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx - radius * 0.4, cy - radius * 0.6);
            ctx.lineTo(cx + radius * 0.4, cy + radius * 0.6);
            ctx.stroke();
            break;
          }

          case "midnight-slate": {
            // Dark Midnight Blue close to black gradient with crystalline mineral flecks
            const grad = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
            grad.addColorStop(0, "#162032");
            grad.addColorStop(0.42, "#0d1524");
            grad.addColorStop(0.8, "#080c16");
            grad.addColorStop(1, "#04060b");
            ctx.fillStyle = grad;
            ctx.fill();

            // Subtle crystalline mineral stippling in soft ice-blue
            ctx.fillStyle = "rgba(175, 205, 235, 0.08)";
            for (let s = 0; s < 7; s++) {
              const sx = cx + Math.sin(tri.accentVariant * 12 + s) * radius * 0.65;
              const sy = cy + Math.cos(tri.accentVariant * 12 + s) * radius * 0.65;
              ctx.fillRect(sx, sy, 2, 2);
            }
            break;
          }

          case "mocha-mousse": {
            // Warm Mocha Mousse / Walnut Wood Grain
            const grad = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
            grad.addColorStop(0, "#523c2e");
            grad.addColorStop(0.45, "#37261b");
            grad.addColorStop(0.85, "#21150e");
            grad.addColorStop(1, "#110905");
            ctx.fillStyle = grad;
            ctx.fill();

            // Subtle linear wood grain fibers
            ctx.strokeStyle = "rgba(120, 85, 60, 0.38)";
            ctx.lineWidth = 1;
            const grainSteps = 4;
            for (let g = -grainSteps; g <= grainSteps; g++) {
              const offset = (g / grainSteps) * (radius * 0.8);
              ctx.beginPath();
              ctx.moveTo(cx - radius + offset, cy - radius);
              ctx.lineTo(cx + radius + offset, cy + radius);
              ctx.stroke();
            }
            break;
          }

          case "smoked-marble": {
            // Smoked Ecru Slate Marble with charcoal-slate veins
            const grad = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
            grad.addColorStop(0, "#d8e2eb");
            grad.addColorStop(0.38, "#b0bfc9");
            grad.addColorStop(0.75, "#708290");
            grad.addColorStop(1, "#404e5a");
            ctx.fillStyle = grad;
            ctx.fill();

            // Natural meandering marble veining
            ctx.strokeStyle = "rgba(35, 50, 65, 0.3)";
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(cx - radius * 0.8, cy - radius * 0.5);
            ctx.quadraticCurveTo(cx, cy + radius * 0.2, cx + radius * 0.8, cy + radius * 0.7);
            ctx.stroke();
            break;
          }

          case "burnished-titanium": {
            // Burnished Gunmetal Titanium with radial specular reflection
            const grad = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
            grad.addColorStop(0, "#7a91a8");
            grad.addColorStop(0.45, "#4e657c");
            grad.addColorStop(0.85, "#28384a");
            grad.addColorStop(1, "#101720");
            ctx.fillStyle = grad;
            ctx.fill();

            // Specular radial reflection
            const radial = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
            radial.addColorStop(0, "rgba(200, 225, 250, 0.26)");
            radial.addColorStop(1, "transparent");
            ctx.fillStyle = radial;
            ctx.fill();
            break;
          }

          case "acoustic-fluting": {
            // Architectural Lighter Slate-Blue Pinstripes over Midnight Navy
            ctx.fillStyle = "#090e18";
            ctx.fill();

            // Fine parallel pinstripes in lighter slate-blueish-grey
            ctx.strokeStyle = "rgba(164, 188, 215, 0.88)";
            ctx.lineWidth = 1.4;
            const cosA = Math.cos(tri.pinstripeAngle);
            const sinA = Math.sin(tri.pinstripeAngle);
            const perpCos = -sinA;
            const perpSin = cosA;

            const count = Math.ceil(radius / tri.pinstripeSpacing);
            for (let p = -count; p <= count; p++) {
              const ox = cx + perpCos * (p * tri.pinstripeSpacing);
              const oy = cy + perpSin * (p * tri.pinstripeSpacing);
              ctx.beginPath();
              ctx.moveTo(ox - cosA * radius * 1.4, oy - sinA * radius * 1.4);
              ctx.lineTo(ox + cosA * radius * 1.4, oy + sinA * radius * 1.4);
              ctx.stroke();
            }
            break;
          }

          case "noir-leather":
          default: {
            // Deep Midnight Noir Leather
            const grad = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
            grad.addColorStop(0, "#182233");
            grad.addColorStop(0.5, "#0f1622");
            grad.addColorStop(0.85, "#090d15");
            grad.addColorStop(1, "#04060a");
            ctx.fillStyle = grad;
            ctx.fill();

            // Fine leather pebble stippling
            ctx.fillStyle = "rgba(180, 205, 235, 0.05)";
            for (let s = 0; s < 5; s++) {
              const sx = cx + (Math.sin(tri.accentVariant * 8 + s) * radius * 0.5);
              const sy = cy + (Math.cos(tri.accentVariant * 8 + s) * radius * 0.5);
              ctx.fillRect(sx, sy, 2, 2);
            }
            break;
          }
        }

        ctx.restore();
      }

      // 3. Draw Slate-Steel / Brushed Platinum Inlay Seams along all shared triangle boundaries
      ctx.strokeStyle = "rgba(164, 188, 214, 0.72)";
      ctx.lineWidth = 1.6;
      ctx.lineJoin = "round";

      ctx.beginPath();
      for (let i = 0; i < triangles.length; i++) {
        const tri = triangles[i];
        const p0 = vertices[tri.v0];
        const p1 = vertices[tri.v1];
        const p2 = vertices[tri.v2];

        // Frustum culling check
        const minX = Math.min(p0.x, p1.x, p2.x);
        const maxX = Math.max(p0.x, p1.x, p2.x);
        const minY = Math.min(p0.y, p1.y, p2.y);
        const maxY = Math.max(p0.y, p1.y, p2.y);
        if (maxX < 0 || minX > width || maxY < 0 || minY > height) continue;

        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p0.x, p0.y);
      }
      ctx.stroke();

      // 4. Draw tiny glowing platinum/slate joint rivets at mesh intersections for bespoke craftsmanship
      ctx.fillStyle = "rgba(215, 232, 250, 0.95)";
      for (let i = 0; i < vertices.length; i += 2) {
        const v = vertices[i];
        if (v.x < -10 || v.x > width + 10 || v.y < -10 || v.y > height + 10) continue;
        ctx.beginPath();
        ctx.arc(v.x, v.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* Dynamic Textured Mosaic Canvas - softened with a slight optical blur to sit behind the glass */}
      <div className="absolute -inset-3 overflow-hidden pointer-events-none">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block"
          style={{
            filter: "blur(3.5px)",
            transform: "scale(1.025)",
            willChange: "transform, filter",
          }}
        />
      </div>

      {/* Subtle Ambient Slate & Midnight Architectural Glow Pools */}
      <div className="absolute inset-0 pointer-events-none mix-blend-screen opacity-30">
        <div className="absolute -top-[15%] left-[10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-[#8fa7c2]/20 via-[#4a5f78]/12 to-transparent blur-[120px]" />
        <div className="absolute bottom-[5%] right-[10%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-tl from-[#647c96]/18 via-[#1f2e42]/25 to-transparent blur-[140px]" />
      </div>

      {/* Translucent Frosted Glass Sheet Layer - Creates the illusion of the mosaic being behind a tinted architectural glass pane */}
      <div
        className="absolute inset-0 pointer-events-none backdrop-blur-[2.5px]"
        style={{
          background:
            "linear-gradient(145deg, rgba(255, 255, 255, 0.04) 0%, rgba(143, 167, 194, 0.02) 35%, transparent 65%), linear-gradient(180deg, rgba(8, 12, 22, 0.22) 0%, rgba(14, 20, 34, 0.12) 50%, rgba(4, 6, 11, 0.35) 100%)",
        }}
      />

      {/* Subtle Translucent Glass Surface Light Sheen / Specular Glare Reflection */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen"
        style={{
          background:
            "linear-gradient(125deg, transparent 20%, rgba(200, 225, 250, 0.035) 38%, rgba(255, 255, 255, 0.07) 42%, rgba(200, 225, 250, 0.035) 46%, transparent 60%)",
        }}
      />

      {/* Deep Smoky Midnight Vignette Overlay */}
      <div className="absolute inset-0 bg-radial-vignette opacity-50 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#080c16]/30 via-transparent to-[#04060b]/60 pointer-events-none" />
    </div>
  );
};
