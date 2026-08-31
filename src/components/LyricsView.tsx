import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { LyricLine, Track, UserSettings, LyricsMode } from "../types";
import {
  Music2,
  ArrowDown,
  Mic2,
  FileText,
  CheckCircle2,
  Sparkles,
  Layers,
} from "lucide-react";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";
import {
  fetchLyricsMultiSource,
  parseLRC,
  parsePlainLyrics,
  createDualLyricLines,
} from "../services/lyricsService";
import { romanizeLyricLines } from "../utils/romanization";
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
  // Lyrics state
  const [originalLines, setOriginalLines] = useState<LyricLine[]>([]);
  const [isSynced, setIsSynced] = useState<boolean>(true);
  const [lyricsSource, setLyricsSource] = useState<"lrclib" | "youtube_music" | "server" | "none">("none");
  const [loading, setLoading] = useState<boolean>(true);
  const [isUserScrolled, setIsUserScrolled] = useState<boolean>(false);

  // Pure client-side Romanization & Dual-Line view modes (Active when lyrics are synced)
  const [mode, setMode] = useState<LyricsMode>(
    settings.lyricsDefaultMode === "romanized" ? "romanized" : "original"
  );
  const [isDualLine, setIsDualLine] = useState<boolean>(settings.lyricsDualLine ?? true);

  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isAutoScrollingRef = useRef<boolean>(false);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cleanTitle = cleanTrackTitle(track.title, track.artist);
  const videoId = track.youtubeVideoId || (track.id && !track.id.startsWith("local_") ? track.id.split("_")[0] : "");

  // Multi-Source Lyrics Fallback Pipeline
  useEffect(() => {
    let isCancelled = false;

    const loadTrackLyrics = async () => {
      setLoading(true);
      setIsUserScrolled(false);

      try {
        // 1. If track already has preloaded raw LRC / plain lyrics
        if (track.lyricsRaw) {
          const raw = track.lyricsRaw;
          const parsed = parseLRC(raw);
          if (!isCancelled) {
            if (parsed.length > 0) {
              setOriginalLines(parsed);
              setIsSynced(true);
              setLyricsSource("lrclib");
            } else {
              setOriginalLines(parsePlainLyrics(raw));
              setIsSynced(false);
              setLyricsSource("lrclib");
            }
            setLoading(false);
          }
          return;
        }

        // 2. Query Multi-Source Lyrics Fallback Chain:
        //    Step 1: LRCLIB (Synced LRC)
        //    Step 2: YouTube Music Native Lyrics (/next -> /browse musicLyricsRenderer)
        //    Step 3: LRCLIB Plain Text Fallback
        const result = await fetchLyricsMultiSource(track.title, track.artist, track.duration, videoId);

        if (!isCancelled) {
          setLyricsSource(result.source);
          if (result.syncedLyrics && result.isSynced) {
            const parsed = parseLRC(result.syncedLyrics);
            if (parsed.length > 0) {
              setOriginalLines(parsed);
              setIsSynced(true);
            } else if (result.plainLyrics) {
              setOriginalLines(parsePlainLyrics(result.plainLyrics));
              setIsSynced(false);
            } else {
              setOriginalLines([]);
              setIsSynced(false);
            }
          } else if (result.plainLyrics) {
            setOriginalLines(parsePlainLyrics(result.plainLyrics));
            setIsSynced(false);
          } else {
            setOriginalLines([]);
            setIsSynced(false);
          }
        }
      } catch (err) {
        console.error("Lyrics loading error:", err);
        if (!isCancelled) {
          setOriginalLines([]);
          setIsSynced(false);
          setLyricsSource("none");
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
  }, [track.id, track.title, track.artist, track.duration, track.lyricsRaw, videoId]);

  // Instant Client-Side Romanization calculation (< 1ms, 0 latency, 100% offline)
  const romanizedLines = useMemo<LyricLine[]>(() => {
    // Disable romanization for unsynced plain text
    if (!isSynced || originalLines.length === 0) return [];
    return romanizeLyricLines(originalLines);
  }, [originalLines, isSynced]);

  // Compute displayed lines based on current mode and dual-line interleaving
  const displayedLyrics = useMemo<LyricLine[]>(() => {
    if (originalLines.length === 0) return [];

    // Plain unsynced lyrics are always displayed in original text without romanization
    if (!isSynced) {
      return originalLines;
    }

    if (mode === "romanized") {
      if (isDualLine) {
        return createDualLyricLines(originalLines, romanizedLines);
      }
      return romanizedLines;
    }

    return originalLines;
  }, [mode, originalLines, romanizedLines, isDualLine, isSynced]);

  // Find active line index based on current playback time (only when synced)
  const activeIndex = useMemo(() => {
    if (!isSynced || displayedLyrics.length === 0) return -1;
    
    let active = -1;
    for (let i = 0; i < displayedLyrics.length; i++) {
      if (currentTime >= displayedLyrics[i].time - 0.25) {
        active = i;
      } else {
        break;
      }
    }
    return active >= 0 ? active : 0;
  }, [displayedLyrics, currentTime, isSynced]);

  // Scroll active line into center
  const scrollToActiveLine = useCallback((smooth = true) => {
    if (activeLineRef.current && containerRef.current && isSynced) {
      isAutoScrollingRef.current = true;
      activeLineRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "center",
      });

      if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
      userScrollTimeoutRef.current = setTimeout(() => {
        isAutoScrollingRef.current = false;
      }, 400);
    }
  }, [isSynced]);

  // Automatic scrolling when line changes and user hasn't scrolled away (only when synced)
  useEffect(() => {
    if (isSynced && activeIndex >= 0 && !isUserScrolled && !loading) {
      scrollToActiveLine(true);
    }
  }, [activeIndex, isSynced, isUserScrolled, loading, scrollToActiveLine]);

  // Handle user manual scroll detection
  const handleScroll = () => {
    if (!isSynced) return;
    if (isAutoScrollingRef.current) return;
    if (!isUserScrolled) {
      setIsUserScrolled(true);
    }
  };

  const handleUserWheelOrTouch = () => {
    if (!isSynced) return;
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

  const subFontSizeClass =
    settings.lyricsFontSize === "sm"
      ? "text-xs sm:text-sm"
      : settings.lyricsFontSize === "lg"
      ? "text-base sm:text-lg"
      : "text-sm sm:text-base";

  const alignClass = settings.lyricsAlignment === "center" ? "text-center" : "text-left";

  // Provider Badge Label
  const badgeLabel = useMemo(() => {
    if (isSynced) {
      return lyricsSource === "lrclib" ? "Synced (LRCLIB)" : "Synced";
    }
    if (lyricsSource === "youtube_music") {
      return "Plain Text (YouTube Music)";
    }
    if (lyricsSource === "lrclib") {
      return "Plain Text (LRCLIB)";
    }
    return "Plain Text";
  }, [isSynced, lyricsSource]);

  return (
    <div
      className={`flex flex-col h-full w-full ${designConfig.cardBg} rounded-3xl border ${designConfig.borderSubtle} p-4 sm:p-6 backdrop-blur-2xl relative overflow-hidden select-none shadow-2xl transition-all`}
    >
      {/* Top Header: Track Metadata + Provider Badge + Synced Romanization Controls */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b ${designConfig.borderSubtle} mb-2 shrink-0 gap-3`}
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
              containerClassName="w-full max-w-[200px] sm:max-w-xs"
              speed={28}
            />
            <p className={`text-[11px] ${designConfig.textMuted} truncate`}>
              {track.artist}
            </p>
          </div>
        </div>

        {/* Center & Right: Romanization Controls (Synced only) + UI Badge */}
        <div className="flex items-center flex-wrap gap-2 justify-between sm:justify-end">
          {/* Romanization Controls are available strictly when lyrics are synced */}
          {isSynced && (
            <>
              {/* Segmented Pill: Original vs Romanized */}
              <div className={`p-0.5 rounded-2xl flex items-center gap-0.5 border ${designConfig.borderSubtle} ${designConfig.pillBg}`}>
                <button
                  onClick={() => setMode("original")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    mode === "original"
                      ? `${designConfig.accentBg} ${designConfig.accentText} shadow-sm border ${designConfig.accentBorder}`
                      : `${designConfig.textMuted} hover:${designConfig.textPrimary}`
                  }`}
                  title="Display original lyrics"
                >
                  <span>Original</span>
                </button>

                <button
                  onClick={() => setMode("romanized")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    mode === "romanized"
                      ? `${designConfig.accentBg} ${designConfig.accentText} shadow-sm border ${designConfig.accentBorder}`
                      : `${designConfig.textMuted} hover:${designConfig.textPrimary}`
                  }`}
                  title="Display instant phonetic Romanized (Romaji / Pinyin / Revised Korean) lyrics"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Romanized</span>
                </button>
              </div>

              {/* Dual-Line Interleaved Toggle (Available when in Romanized mode) */}
              {mode === "romanized" && (
                <button
                  onClick={() => setIsDualLine(!isDualLine)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                    isDualLine
                      ? `${designConfig.accentBg} ${designConfig.accentText} border ${designConfig.accentBorder} shadow-sm`
                      : `${designConfig.pillBg} ${designConfig.borderSubtle} ${designConfig.textMuted} hover:${designConfig.textPrimary}`
                  }`}
                  title={isDualLine ? "Disable interleaved dual-line display" : "Enable interleaved dual-line display"}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Dual-Line</span>
                </button>
              )}
            </>
          )}

          {/* Provider & Sync Status Badge */}
          {displayedLyrics.length > 0 && !loading && (
            <div className="shrink-0 flex items-center">
              {isSynced ? (
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1.5 border ${designConfig.accentBorder} ${designConfig.pillBg} ${designConfig.accentText} shadow-sm`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{badgeLabel}</span>
                </span>
              ) : (
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-medium flex items-center gap-1.5 border ${designConfig.borderSubtle} ${designConfig.pillBg} ${designConfig.textMuted}`}
                >
                  <FileText className="w-3 h-3" />
                  <span>{badgeLabel}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lyrics Scrollable Body */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        onWheel={handleUserWheelOrTouch}
        onTouchMove={handleUserWheelOrTouch}
        className={`flex-1 overflow-y-auto custom-scrollbar relative scroll-smooth ${
          isSynced ? "space-y-7 sm:space-y-8 py-14 px-2 sm:px-6" : "space-y-4 sm:space-y-5 py-8 px-3 sm:px-8"
        }`}
      >
        {loading ? (
          <div className={`flex flex-col items-center justify-center h-full ${designConfig.textMuted} space-y-3`}>
            <div className="relative">
              <div
                className={`w-10 h-10 rounded-full border-2 border-t-transparent animate-spin ${designConfig.accentBorder}`}
              />
              <Mic2 className={`w-4 h-4 absolute inset-0 m-auto ${designConfig.accentText}`} />
            </div>
            <p className={`text-sm font-medium ${designConfig.textSecondary}`}>Fetching lyrics...</p>
            <p className="text-xs opacity-75">Checking LRCLIB & YouTube Music database</p>
          </div>
        ) : displayedLyrics.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-full ${designConfig.textMuted} space-y-3 py-12`}>
            <div className={`p-4 rounded-2xl ${designConfig.pillBg} border ${designConfig.borderSubtle}`}>
              <Music2 className={`w-8 h-8 ${designConfig.accentText} opacity-80`} />
            </div>
            <p className={`text-base font-semibold ${designConfig.textPrimary}`}>No lyrics available for this track</p>
            <p className="text-xs text-center max-w-xs opacity-80">
              This track might be an instrumental or lyrics are not cataloged yet.
            </p>
          </div>
        ) : isSynced ? (
          // Synced Lyrics rendering with line-by-line highlighting and timestamp seek
          displayedLyrics.map((line, idx) => {
            const isActive = idx === activeIndex;
            const isPast = idx < activeIndex;

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
                className={`transition-all duration-300 transform origin-left leading-relaxed ${alignClass} ${
                  line.time >= 0 ? "cursor-pointer active:scale-[0.98]" : ""
                } ${
                  isActive
                    ? `${designConfig.accentText} scale-[1.02] sm:scale-105 drop-shadow-md tracking-tight opacity-100`
                    : isPast
                    ? `${designConfig.textMuted} opacity-40 hover:opacity-80 hover:${designConfig.textPrimary}`
                    : `${designConfig.textSecondary} opacity-60 hover:opacity-100 hover:${designConfig.textPrimary}`
                }`}
              >
                {/* Primary Lyric Line */}
                <div className={`${fontSizeClass} font-black`}>
                  {line.text}
                </div>

                {/* Sub-Lyric Line (Interleaved Phonetic Romanization) */}
                {line.subText && (
                  <div
                    className={`${subFontSizeClass} mt-1.5 font-normal tracking-wide transition-opacity duration-300 ${
                      isActive
                        ? "opacity-90 italic font-medium"
                        : "opacity-60 italic"
                    }`}
                  >
                    {line.subText}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          // Plain unsynced text rendering: standard smooth manual scrolling, comfortable line spacing, no jump autoscroll
          <div className={`space-y-4 max-w-2xl mx-auto ${alignClass}`}>
            {displayedLyrics.map((line, idx) => (
              <p
                key={idx}
                className={`${fontSizeClass} font-semibold ${designConfig.textPrimary} opacity-90 leading-relaxed`}
              >
                {line.text}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Floating "Resume Autoscroll" Pill Button (Only when Synced lyrics are active) */}
      {isUserScrolled && isSynced && displayedLyrics.length > 0 && (
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
