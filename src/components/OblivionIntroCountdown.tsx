import React, { useMemo, useEffect, useState } from "react";
import { FullAppDesignConfig } from "../utils/appDesignThemes";

interface OblivionIntroCountdownProps {
  currentPlaybackTime: number;
  firstLineTime?: number;
  vocalStartTime?: number;
  designConfig?: FullAppDesignConfig;
  onCountdownComplete?: () => void;
}

export const OblivionIntroCountdown: React.FC<OblivionIntroCountdownProps> = ({
  currentPlaybackTime,
  firstLineTime,
  vocalStartTime,
  designConfig,
  onCountdownComplete,
}) => {
  const targetVocalTime = vocalStartTime || firstLineTime || 0;

  // Wave animation phase state for gentle organic liquid oscillation
  const [waveOffset, setWaveOffset] = useState<number>(0);

  useEffect(() => {
    let animId: number;
    let start = performance.now();

    const animateWave = (now: number) => {
      const elapsed = (now - start) / 1000;
      setWaveOffset(elapsed * 45); // gentle horizontal drifting speed
      animId = requestAnimationFrame(animateWave);
    };

    animId = requestAnimationFrame(animateWave);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Fill percentage calculation strictly: (currentPlaybackTime / targetVocalTime) * 100
  const fillPercent = useMemo(() => {
    if (!targetVocalTime || targetVocalTime <= 0) return 0;
    const pct = (currentPlaybackTime / targetVocalTime) * 100;
    return Math.min(100, Math.max(0, pct));
  }, [currentPlaybackTime, targetVocalTime]);

  // Exit phase detection: smoothly fade out over 500ms when reaching vocalStartTime - 0.5s or 99.5%
  const isExiting = fillPercent >= 99.5 || (targetVocalTime > 0 && currentPlaybackTime >= targetVocalTime - 0.5);

  useEffect(() => {
    if (isExiting && onCountdownComplete) {
      const timer = setTimeout(() => {
        onCountdownComplete();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isExiting, onCountdownComplete]);

  // Liquid level in SVG coordinate space (0 to 180)
  // At 0% fill -> y = 175 (empty)
  // At 100% fill -> y = 5 (full)
  const liquidY = useMemo(() => {
    const totalHeight = 170;
    return 175 - (totalHeight * (fillPercent / 100));
  }, [fillPercent]);

  // Generate continuous sinusoidal wave paths
  const wavePathFront = useMemo(() => {
    const w = 180;
    const amp = fillPercent >= 98 || fillPercent <= 2 ? 1.5 : 4.5;
    const freq = 0.045;
    const phase = (waveOffset % 360) * (Math.PI / 180);

    let path = `M -20 ${liquidY}`;
    for (let x = -20; x <= w + 20; x += 5) {
      const y = liquidY + Math.sin(x * freq + phase) * amp;
      path += ` L ${x} ${y.toFixed(2)}`;
    }
    path += ` L ${w + 20} 200 L -20 200 Z`;
    return path;
  }, [liquidY, waveOffset, fillPercent]);

  const wavePathBack = useMemo(() => {
    const w = 180;
    const amp = fillPercent >= 98 || fillPercent <= 2 ? 1 : 3.5;
    const freq = 0.04;
    const phase = ((waveOffset * 0.75 + 120) % 360) * (Math.PI / 180);

    let path = `M -20 ${liquidY + 1}`;
    for (let x = -20; x <= w + 20; x += 5) {
      const y = liquidY + 1 + Math.sin(x * freq + phase) * amp;
      path += ` L ${x} ${y.toFixed(2)}`;
    }
    path += ` L ${w + 20} 200 L -20 200 Z`;
    return path;
  }, [liquidY, waveOffset, fillPercent]);

  return (
    <div
      id="oblivion-intro-countdown-container"
      className={`flex flex-col items-center justify-center py-2 sm:py-3 select-none transition-all duration-500 ease-out transform shrink-0 ${
        isExiting
          ? "opacity-0 scale-105 pointer-events-none"
          : "opacity-100 scale-100"
      }`}
      style={{
        transitionDuration: "500ms",
      }}
    >
      {/* Visual Vessel 'O' Display scaled down to 40% */}
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
        <svg
          viewBox="0 0 180 180"
          className="w-full h-full drop-shadow-lg overflow-visible"
          style={{
            filter: "drop-shadow(0 0 12px var(--border-active, var(--accent-color, var(--primary, rgba(197, 155, 39, 0.45)))))",
          }}
        >
          <defs>
            {/* Linear gradients bound dynamically to theme accent colors */}
            <linearGradient id="oblivion-liquid-gradient-front" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--accent-secondary, var(--accent-color, #f59e0b))" stopOpacity="0.95" />
              <stop offset="60%" stopColor="var(--accent-color, var(--primary, #c59b27))" stopOpacity="0.9" />
              <stop offset="100%" stopColor="var(--accent-tertiary, var(--accent-color, #c59b27))" stopOpacity="0.8" />
            </linearGradient>

            <linearGradient id="oblivion-liquid-gradient-back" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--accent-secondary, #f59e0b)" stopOpacity="0.45" />
              <stop offset="100%" stopColor="var(--accent-color, #c59b27)" stopOpacity="0.35" />
            </linearGradient>

            <linearGradient id="oblivion-vessel-stroke-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--accent-color, var(--primary, #c59b27))" stopOpacity="0.9" />
              <stop offset="50%" stopColor="var(--accent-secondary, #f59e0b)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="var(--accent-color, var(--primary, #c59b27))" stopOpacity="0.95" />
            </linearGradient>

            {/* Mask shaping the uppercase 'O' letter vessel (outer ring minus inner cutout) */}
            <mask id="oblivion-letter-o-mask">
              <rect x="0" y="0" width="180" height="180" fill="black" />
              {/* Outer shape + Inner cutout with evenodd rule */}
              <path
                d="M 90 14 C 134 14, 166 48, 166 90 C 166 132, 134 166, 90 166 C 46 166, 14 132, 14 90 C 14 48, 46 14, 90 14 Z
                   M 90 40 C 62 40, 42 62, 42 90 C 42 118, 62 140, 90 140 C 118 140, 138 118, 138 90 C 138 62, 118 40, 90 40 Z"
                fill="white"
                fillRule="evenodd"
              />
            </mask>
          </defs>

          {/* Background Transparent Vessel Inner Fill */}
          <path
            d="M 90 14 C 134 14, 166 48, 166 90 C 166 132, 134 166, 90 166 C 46 166, 14 132, 14 90 C 14 48, 46 14, 90 14 Z
               M 90 40 C 62 40, 42 62, 42 90 C 42 118, 62 140, 90 140 C 118 140, 138 118, 138 90 C 138 62, 118 40, 90 40 Z"
            fill="rgba(var(--accent-primary-rgb, 197, 155, 39), 0.08)"
            fillRule="evenodd"
          />

          {/* Masked Liquid Layer filling the 'O' vessel */}
          <g mask="url(#oblivion-letter-o-mask)">
            {/* Back Wave */}
            <path d={wavePathBack} fill="url(#oblivion-liquid-gradient-back)" />
            {/* Front Wave with Dynamic Surface Fluid Motion */}
            <path d={wavePathFront} fill="url(#oblivion-liquid-gradient-front)" />
            
            {/* Fluid surface crest highlight line */}
            <path
              d={wavePathFront.split("L 200 200")[0]}
              fill="none"
              stroke="rgba(255, 255, 255, 0.75)"
              strokeWidth="1.5"
              opacity={fillPercent > 3 && fillPercent < 98 ? 0.8 : 0}
            />
          </g>

          {/* Glowing Outer & Inner Vessel Outlines */}
          {/* Outer Contour */}
          <path
            d="M 90 14 C 134 14, 166 48, 166 90 C 166 132, 134 166, 90 166 C 46 166, 14 132, 14 90 C 14 48, 46 14, 90 14 Z"
            fill="none"
            stroke="url(#oblivion-vessel-stroke-grad)"
            strokeWidth="2.5"
          />
          {/* Inner Contour */}
          <path
            d="M 90 40 C 62 40, 42 62, 42 90 C 42 118, 62 140, 90 140 C 118 140, 138 118, 138 90 C 138 62, 118 40, 90 40 Z"
            fill="none"
            stroke="url(#oblivion-vessel-stroke-grad)"
            strokeWidth="2"
            opacity="0.85"
          />
        </svg>
      </div>
    </div>
  );
};

