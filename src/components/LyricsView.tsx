import React, { useEffect, useRef, useState, useCallback } from "react";
import { LyricLine, Track, UserSettings } from "../types";
import { Music2, ArrowDown, Mic2, FileText, CheckCircle2 } from "lucide-react";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";
import { fetchLyricsFromLRCLIB, parseLRC, parsePlainLyrics } from "../services/lyricsService";
import { cleanTrackTitle } from "../utils/formatters";
import { MarqueeText } from "./MarqueeText";

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
  const [isSynced, setIsSynced] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [isUserScrolled, setIsUserScrolled] = useState<boolean>(false);
  const [lastTrackId, setLastTrackId] = useState<string>("");

  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isAutoScrollingRef = useRef<boolean>(false);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cleanTitle = cleanTrackTitle(track.title, track.artist);

  // Fetch lyrics whenever track changes
  useEffect(() => {
    let isCancelled = false;

    const loadTrackLyrics = async () => {
      setLoading(true);
      setIsUserScrolled(false);
      setLastTrackId(track.id);

      try {
        // If track already has preloaded raw lyrics
        if (track.lyricsRaw) {
          const parsed = parseLRC(track.lyricsRaw);
          if (!isCancelled) {
            if (parsed.length > 0) {
              setLyrics(parsed);
              setIsSynced(true);
            } else {
              setLyrics(parsePlainLyrics(track.lyricsRaw));
              setIsSynced(false);
            }
            setLoading(false);
          }
          return;
        }

        // Fetch from LRCLIB with fallback
        const result = await fetchLyricsFromLRCLIB(track.title, track.artist, track.duration);

        if (!isCancelled) {
          if (result.syncedLyrics) {
            const parsed = parseLRC(result.syncedLyrics);
            if (parsed.length > 0) {
              setLyrics(parsed);
              setIsSynced(true);
            } else if (result.plainLyrics) {
              setLyrics(parsePlainLyrics(result.plainLyrics));
              setIsSynced(false);
            } else {
              setLyrics([]);
              setIsSynced(false);
            }
          } else if (result.plainLyrics) {
            setLyrics(parsePlainLyrics(result.plainLyrics));
            setIsSynced(false);
          } else {
            setLyrics([]);
            setIsSynced(false);
          }
        }
      } catch (err) {
        console.error("Lyrics loading error:", err);
        if (!isCancelled) {
          setLyrics([]);
          setIsSynced(false);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadTrackLyrics();

    return () => {
      isCancelled = true;
    };
  }, [track.id, track.title, track.artist, track.duration, track.lyricsRaw]);

  // Find active line index based on current playback time
  const activeIndex = React.useMemo(() => {
    if (!isSynced || lyrics.length === 0) return -1;
    
    // Find last line where line.time <= currentTime
    let active = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].time - 0.25) {
        active = i;
      } else {
        break;
      }
    }
    return active >= 0 ? active : 0;
  }, [lyrics, currentTime, isSynced]);

  // Scroll active line into center
  const scrollToActiveLine = useCallback((smooth = true) => {
    if (activeLineRef.current && containerRef.current) {
      isAutoScrollingRef.current = true;
      activeLineRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "center",
      });

      // Clear flag after smooth scroll completes
      if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
      userScrollTimeoutRef.current = setTimeout(() => {
        isAutoScrollingRef.current = false;
      }, 400);
    }
  }, []);

  // Automatic scrolling when line changes and user hasn't scrolled away
  useEffect(() => {
    if (isSynced && activeIndex >= 0 && !isUserScrolled && !loading) {
      scrollToActiveLine(true);
    }
  }, [activeIndex, isSynced, isUserScrolled, loading, scrollToActiveLine]);

  // Handle user manual scroll detection
  const handleScroll = () => {
    if (isAutoScrollingRef.current) return;
    if (!isUserScrolled) {
      setIsUserScrolled(true);
    }
  };

  const handleUserWheelOrTouch = () => {
    if (!isUserScrolled) {
      setIsUserScrolled(true);
    }
  };

  // Re-enable autoscroll on button click
  const handleResumeAutoscroll = () => {
    setIsUserScrolled(false);
    scrollToActiveLine(true);
  };

  // Font size configuration
  const fontSizeClass =
    settings.lyricsFontSize === "sm"
      ? "text-base sm:text-lg md:text-xl"
      : settings.lyricsFontSize === "lg"
      ? "text-2xl sm:text-3xl md:text-4xl font-black"
      : "text-lg sm:text-2xl md:text-3xl font-extrabold";

  const alignClass = settings.lyricsAlignment === "center" ? "text-center" : "text-left";

  return (
    <div
      className={`flex flex-col h-full w-full ${designConfig.cardBg} rounded-3xl border ${designConfig.borderSubtle} p-4 sm:p-6 backdrop-blur-2xl relative overflow-hidden select-none shadow-2xl transition-all`}
    >
      {/* Top Header: Clean metadata without 'Synchronized AI Lyrics' */}
      <div
        className={`flex items-center justify-between pb-3.5 border-b ${designConfig.borderSubtle} mb-2 shrink-0 gap-3`}
      >
        {/* Left: Track Information with Marquee */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={`p-1.5 rounded-xl ${designConfig.pillBg} shrink-0`}>
            <Mic2 className={`w-4 h-4 ${designConfig.accentText}`} />
          </div>
          <div className="min-w-0 flex-1">
            <MarqueeText
              text={cleanTitle}
              className={`text-xs sm:text-sm font-bold ${designConfig.textPrimary}`}
              containerClassName="w-full max-w-[240px] sm:max-w-xs"
              speed={28}
            />
            <p className={`text-[11px] ${designConfig.textMuted} truncate`}>
              {track.artist}
            </p>
          </div>
        </div>

        {/* Right: Sync Status Badge */}
        <div className="shrink-0 flex items-center gap-1.5">
          {isSynced ? (
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 border ${designConfig.accentBorder} ${designConfig.pillBg} ${designConfig.accentText} shadow-sm`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Real-time Synced</span>
            </span>
          ) : (
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 border ${designConfig.borderSubtle} ${designConfig.pillBg} ${designConfig.textMuted}`}
            >
              <FileText className="w-3 h-3" />
              <span>Plain Lyrics</span>
            </span>
          )}
        </div>
      </div>

      {/* Lyrics Scrollable Body */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        onWheel={handleUserWheelOrTouch}
        onTouchMove={handleUserWheelOrTouch}
        className="flex-1 overflow-y-auto custom-scrollbar space-y-7 sm:space-y-8 py-14 px-2 sm:px-6 relative scroll-smooth"
      >
        {loading ? (
          <div className={`flex flex-col items-center justify-center h-full ${designConfig.textMuted} space-y-3`}>
            <div className="relative">
              <div
                className={`w-10 h-10 rounded-full border-2 border-t-transparent animate-spin ${designConfig.accentBorder}`}
              />
              <Mic2 className={`w-4 h-4 absolute inset-0 m-auto ${designConfig.accentText}`} />
            </div>
            <p className={`text-sm font-medium ${designConfig.textSecondary}`}>Fetching real-time lyrics...</p>
            <p className="text-xs opacity-75">Querying LRCLIB database</p>
          </div>
        ) : lyrics.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-full ${designConfig.textMuted} space-y-3 py-12`}>
            <div className={`p-4 rounded-2xl ${designConfig.pillBg} border ${designConfig.borderSubtle}`}>
              <Music2 className={`w-8 h-8 ${designConfig.accentText} opacity-80`} />
            </div>
            <p className={`text-base font-semibold ${designConfig.textPrimary}`}>No lyrics available for this track</p>
            <p className="text-xs text-center max-w-xs opacity-80">
              This might be an instrumental track or the synchronized lyrics are not yet cataloged.
            </p>
          </div>
        ) : (
          lyrics.map((line, idx) => {
            const isActive = isSynced && idx === activeIndex;
            const isPast = isSynced && idx < activeIndex;

            return (
              <div
                key={`${idx}-${line.time}`}
                ref={isActive ? activeLineRef : null}
                onClick={() => {
                  if (line.time >= 0) {
                    onSeek(line.time);
                    setIsUserScrolled(false);
                  }
                }}
                className={`transition-all duration-300 transform origin-left leading-relaxed ${alignClass} ${fontSizeClass} ${
                  line.time >= 0 ? "cursor-pointer active:scale-[0.98]" : ""
                } ${
                  isActive
                    ? `${designConfig.accentText} font-black scale-[1.03] sm:scale-105 drop-shadow-md tracking-tight opacity-100`
                    : isPast
                    ? `${designConfig.textMuted} opacity-40 hover:opacity-80 hover:${designConfig.textPrimary}`
                    : `${designConfig.textSecondary} opacity-60 hover:opacity-100 hover:${designConfig.textPrimary}`
                }`}
              >
                {line.text}
              </div>
            );
          })
        )}
      </div>

      {/* Floating "Resume Autoscroll" Pill Button */}
      {isUserScrolled && isSynced && lyrics.length > 0 && (
        <div className="absolute bottom-5 inset-x-0 flex justify-center z-20 pointer-events-none animate-fade-in">
          <button
            onClick={handleResumeAutoscroll}
            className={`pointer-events-auto px-4 py-2 rounded-full text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xl border transition-all transform hover:scale-105 active:scale-95 ${designConfig.btnPrimary}`}
          >
            <ArrowDown className="w-4 h-4 animate-bounce" />
            <span>Resume Autoscroll</span>
          </button>
        </div>
      )}
    </div>
  );
};
