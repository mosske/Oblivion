import React, { useEffect, useState } from "react";
import { ChristmasLights } from "./ChristmasLights";

/**
 * Gilded Noël garland: two transparent WebP frames of the same garland (frame A has one set of lights lit, frame B the
 * other set). A CSS animation (see styles/christmas.css) swaps them every 1.5s so the lights appear to flash on and off.
 * The garland hangs just under the top bar inside the page flow, so it scrolls away with the content.
 * If the images cannot be loaded (e.g. not deployed yet) the older string of lights is shown instead.
 */
const FRAME_A = "/assets/christmas/garland-a.webp";
const FRAME_B = "/assets/christmas/garland-b.webp";

const loadImage = (src: string) =>
  new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });

interface ChristmasGarlandProps {
  isActive: boolean;
}

export const ChristmasGarland: React.FC<ChristmasGarlandProps> = ({ isActive }) => {
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    if (!isActive) return;
    let cancelled = false;
    // Both frames must be loaded before the animation starts, otherwise the first swaps would flicker.
    Promise.all([loadImage(FRAME_A), loadImage(FRAME_B)])
      .then(() => {
        if (!cancelled) setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [isActive]);

  if (!isActive) return null;
  if (status === "failed") return <ChristmasLights isActive />;

  return (
    <div className="xmas-garland-slot" aria-hidden="true">
      {status === "ready" && (
        <>
          <div className="xmas-garland-frame xmas-garland-a" />
          <div className="xmas-garland-frame xmas-garland-b" />
        </>
      )}
    </div>
  );
};
