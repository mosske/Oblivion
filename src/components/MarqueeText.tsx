import React, { useState, useRef, useEffect } from "react";

interface MarqueeTextProps {
  text: string;
  className?: string;
  containerClassName?: string;
  speed?: number; // pixels per second (default ~30)
  title?: string;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  as?: "div" | "span" | "h1" | "h2" | "h3" | "h4" | "p";
  pauseOnHover?: boolean;
}

export const MarqueeText: React.FC<MarqueeTextProps> = ({
  text,
  className = "",
  containerClassName = "",
  speed = 32,
  title,
  onClick,
  as: Component = "div",
  pauseOnHover = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(10);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const textWidth = textRef.current.scrollWidth;
        const overflowing = textWidth > containerWidth + 2;
        setIsOverflowing(overflowing);

        if (overflowing) {
          // Calculate duration based on textWidth + spacing for comfortable reading speed
          const effectiveWidth = textWidth + 36; // text + gap
          const calculatedDuration = Math.max(5, effectiveWidth / speed);
          setDuration(calculatedDuration);
        }
      }
    };

    checkOverflow();
    const rafId = requestAnimationFrame(checkOverflow);
    const timeoutId = setTimeout(checkOverflow, 150);

    // Resize observer to recheck when container size changes
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      observer = new ResizeObserver(() => {
        checkOverflow();
      });
      observer.observe(containerRef.current);
    }

    // Window resize fallback
    window.addEventListener("resize", checkOverflow);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
      if (observer) observer.disconnect();
      window.removeEventListener("resize", checkOverflow);
    };
  }, [text, speed]);

  const cleanTitle = title || text;

  return (
    <Component
      ref={containerRef as any}
      title={cleanTitle}
      onClick={onClick}
      className={`overflow-hidden relative select-none ${containerClassName}`}
    >
      {isOverflowing ? (
        <div
          className={`animate-marquee-continuous ${pauseOnHover ? "hover:[animation-play-state:paused]" : ""}`}
          style={{ "--marquee-duration": `${duration}s` } as React.CSSProperties}
        >
          <span ref={textRef} className={`shrink-0 pr-8 inline-block whitespace-nowrap ${className}`}>
            {text}
          </span>
          <span className={`shrink-0 pr-8 inline-block whitespace-nowrap ${className}`} aria-hidden="true">
            {text}
          </span>
        </div>
      ) : (
        <span ref={textRef} className={`block truncate ${className}`}>
          {text}
        </span>
      )}
    </Component>
  );
};
