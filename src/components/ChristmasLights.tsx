import React, { useEffect, useState } from "react";

/**
 * Gilded Noël Christmas lights: a swagged string of red, gold, white and silver bulbs hung just under the top bar.
 * Bulbs are plain DOM nodes; the twinkle is an opacity animation on a glow layer (compositor only, very cheap).
 * Styles live in styles/christmas.css (.xmas-*).
 */

interface ChristmasLightsProps {
  isActive: boolean;
}

const BULB_COLORS = ["red", "gold", "white", "red", "silver", "gold"];
const WIRE_Y = 2; // where the wire is anchored (px from the top of the strip)
const SAG = 7; // how far each swag dips (px)

const stripWidth = () => {
  if (typeof window === "undefined") return 0;
  // On md+ the sidebar (16rem = 256px) sits to the left; the strip starts after it
  return Math.max(0, window.innerWidth - (window.innerWidth >= 768 ? 256 : 0));
};

export const ChristmasLights: React.FC<ChristmasLightsProps> = ({ isActive }) => {
  const [width, setWidth] = useState<number>(stripWidth);

  useEffect(() => {
    if (!isActive) return;
    const onResize = () => setWidth(stripWidth());
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isActive]);

  if (!isActive || width <= 0) return null;

  const segLen = width < 640 ? 118 : 152; // anchor-to-anchor distance
  const perSeg = 4; // bulbs per swag
  const segments = Math.ceil(width / segLen);

  let path = `M0,${WIRE_Y}`;
  const bulbs: { left: number; top: number; color: string; tw: number }[] = [];
  let n = 0;
  for (let s = 0; s < segments; s++) {
    const x0 = s * segLen;
    const x1 = x0 + segLen;
    path += ` Q${x0 + segLen / 2},${WIRE_Y + SAG * 2} ${x1},${WIRE_Y}`;
    for (let j = 0; j < perSeg; j++) {
      const t = (j + 0.5) / perSeg;
      const x = x0 + segLen * t;
      if (x > width - 6) continue;
      const y = WIRE_Y + 4 * SAG * t * (1 - t);
      bulbs.push({ left: x, top: y + 1, color: BULB_COLORS[n % BULB_COLORS.length], tw: (n % 3) + 1 });
      n++;
    }
  }

  return (
    <div className="xmas-lights" aria-hidden="true">
      <svg width={width} height={34}>
        <path className="xmas-wire" d={path} />
      </svg>
      {bulbs.map((b, i) => (
        <span key={i} className={`xmas-bulb xmas-${b.color} xmas-tw-${b.tw}`} style={{ left: b.left, top: b.top }}>
          <b />
          <i />
        </span>
      ))}
    </div>
  );
};
