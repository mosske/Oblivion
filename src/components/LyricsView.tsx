import React, { useEffect, useRef, useState } from "react";
import { LyricLine, Track, UserSettings } from "../types";
import { Sparkles, RefreshCw, Music2 } from "lucide-react";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";

interface LyricsViewProps {
  track: Track;
  currentTime: number;
  onSeek: (time: number) => void;
  settings: UserSettings;
  designConfig?: FullAppDesignConfig;
}

export const LyricsView: React.FC<LyricsViewProps> = ({
  track,
  currentTime,
  onSeek,
  settings,
  designConfig = FULL_APP_DESIGNS["designer"],
}) => {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Fetch or parse lyrics
  useEffect(() => {
    let isMounted = true;
    const loadLyrics = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/youtube/lyrics?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(
            track.artist
          )}&duration=${track.duration}`
        );
        const data = await res.json().catch(() => ({}));
        if (isMounted && data?.lyricsRaw) {
          const parsed = parseLRC(data.lyricsRaw);
          setLyrics(parsed);
        }
      } catch (err) {
        console.error("Lyrics fetch error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (track.lyricsRaw) {
      setLyrics(parseLRC(track.lyricsRaw));
      setLoading(false);
    } else {
      loadLyrics();
    }

    return () => {
      isMounted = false;
    };
  }, [track.id, track.title, track.artist]);

  // Parse LRC formatted string [mm:ss.xx] Text
  function parseLRC(lrcText: string): LyricLine[] {
    const lines = lrcText.split("\n");
    const parsed: LyricLine[] = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

    for (const line of lines) {
      const match = timeRegex.exec(line);
      if (match) {
        const minutes = parseInt(match[1]);
        const seconds = parseInt(match[2]);
        const ms = parseInt(match[3]);
        const totalSeconds = minutes * 60 + seconds + ms / (match[3].length === 3 ? 1000 : 100);
        const text = line.replace(timeRegex, "").trim();
        if (text) {
          parsed.push({ time: totalSeconds, text });
        }
      } else if (line.trim() && !line.startsWith("[")) {
        // Fallback for untimed plain lyrics lines
        parsed.push({ time: parsed.length * 8, text: line.trim() });
      }
    }

    return parsed.sort((a, b) => a.time - b.time);
  }

  // Find current active line index
  const activeIndex = lyrics.reduce((acc, line, idx) => {
    if (currentTime >= line.time - 0.5) {
      return idx;
    }
    return acc;
  }, 0);

  // Auto scroll to active line
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeIndex]);

  // Font size mapping
  const fontSizeClass =
    settings.lyricsFontSize === "sm"
      ? "text-base md:text-lg"
      : settings.lyricsFontSize === "lg"
      ? "text-2xl md:text-3xl font-extrabold"
      : "text-xl md:text-2xl font-bold";

  const alignClass = settings.lyricsAlignment === "center" ? "text-center" : "text-left";

  return (
    <div className={`flex flex-col h-full w-full ${designConfig.cardBg} rounded-3xl border ${designConfig.borderSubtle} p-6 backdrop-blur-xl relative overflow-hidden select-none shadow-xl`}>
      {/* Header */}
      <div className={`flex items-center justify-between pb-4 border-b ${designConfig.borderSubtle} mb-4 shrink-0`}>
        <div className={`flex items-center gap-2 ${designConfig.accentText} font-semibold text-sm`}>
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span>Synchronized AI Lyrics</span>
        </div>
        <div className={`text-xs ${designConfig.textMuted} flex items-center gap-2 font-mono`}>
          <span className={`font-semibold ${designConfig.textPrimary}`}>{track.title}</span>
          <span>•</span>
          <span>{track.artist}</span>
        </div>
      </div>

      {/* Lyrics scrollable container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto custom-scrollbar space-y-6 py-12 px-4"
      >
        {loading ? (
          <div className={`flex flex-col items-center justify-center h-full ${designConfig.textMuted} space-y-3`}>
            <RefreshCw className={`w-8 h-8 animate-spin ${designConfig.accentText}`} />
            <p className="text-sm font-mono">Syncing lyrics timing with track...</p>
          </div>
        ) : lyrics.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-full ${designConfig.textMuted} space-y-2`}>
            <Music2 className="w-12 h-12" />
            <p className="text-sm">Instrumental track or lyrics unavailable.</p>
          </div>
        ) : (
          lyrics.map((line, idx) => {
            const isActive = idx === activeIndex;
            const isPast = idx < activeIndex;

            return (
              <div
                key={idx}
                ref={isActive ? activeLineRef : null}
                onClick={() => onSeek(line.time)}
                className={`cursor-pointer transition-all duration-300 transform origin-left ${alignClass} ${fontSizeClass} ${
                  isActive
                    ? `${designConfig.accentText} scale-105 font-extrabold drop-shadow-sm`
                    : isPast
                    ? `${designConfig.textMuted} hover:${designConfig.textPrimary}`
                    : `${designConfig.textSecondary} opacity-60 hover:opacity-100 hover:${designConfig.textPrimary}`
                }`}
              >
                {line.text}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
