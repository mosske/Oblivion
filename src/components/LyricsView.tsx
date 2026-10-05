import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { LyricLine, Track, UserSettings, LyricsMode } from "../types";
import {
  Music2,
  Mic2,
  FileText,
  CheckCircle2,
  Sparkles,
  Layers,
  LocateFixed,
} from "lucide-react";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";
import {
  fetchSyncedLyrics,
  fetchLyricsMultiSource,
  parsePlainLyrics,
  createDualLyricLines,
  parseLRC,
  hasLrcTimestamps,
  autoSyncPlainLyrics,
  formatLRC,
  LyricsSourceType,
} from "../services/lyricsService";
import { romanizeLyricLines } from "../utils/romanization";
import { cleanTrackTitle } from "../utils/formatters";
import { sanitizeLyricsQuery } from "../utils/lyricsSanitizer";
import { MarqueeText } from "./MarqueeText";
import { OblivionIntroCountdown } from "./OblivionIntroCountdown";

/**
 * Client-side LRC Timestamp Parser
 * Extracts timestamped lines with millisecond precision and filters out empty lines
 */
export const parseLrc = parseLRC;

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
  const [lyricsSource, setLyricsSource] = useState<LyricsSourceType>("none");
  const [lyricsProviderName, setLyricsProviderName] = useState<string | undefined>(undefined);
  const [lrcDuration, setLrcDuration] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);

  // User scrolling interaction state with Programmatic Scroll Guard
  const [isUserScrolling, setIsUserScrolling] = useState<boolean>(false);
  const userHasScrolled = isUserScrolling;
  const isUserScrolled = isUserScrolling;
  const setUserHasScrolled = setIsUserScrolling;

  // Pure client-side Romanization & Dual-Line view modes (Active when lyrics are synced)
  const [mode, setMode] = useState<LyricsMode>(
    settings.lyricsDefaultMode === "romanized" ? "romanized" : "original"
  );
  const [isDualLine, setIsDualLine] = useState<boolean>(settings.lyricsDualLine ?? true);

  const lyricRefs = useRef<(HTMLDivElement | null)[]>([]);
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isProgrammaticScroll = useRef<boolean>(false);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userInteractionTimerRef = useRef<NodeJS.Timeout | null>(null);

  const sanitized = useMemo(() => sanitizeLyricsQuery(track?.title || "", track?.artist || ""), [track?.title, track?.artist]);
  const cleanTitle = sanitized.cleanTitle || (track ? cleanTrackTitle(track.title, track.artist) : "");
  const videoId = track ? (track.youtubeVideoId || (track.id && !track.id.startsWith("local_") ? track.id.split("_")[0] : "")) : "";
  const trackKey = track ? (track.youtubeVideoId || (track as any).youtubeId || track.id || "") : "";

  // 1. RESTORE AUTOMATIC SCROLL TRIGGER ON MOUNT & SONG CHANGE:
  // Reset isUserScrolling back to false whenever currentTrack changes so autoscroll engages immediately
  useEffect(() => {
    isProgrammaticScroll.current = false;
    setIsUserScrolling(false);
    lyricRefs.current = [];
    if (userInteractionTimerRef.current) {
      clearTimeout(userInteractionTimerRef.current);
      userInteractionTimerRef.current = null;
    }
  }, [track?.id, trackKey]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (userInteractionTimerRef.current) {
        clearTimeout(userInteractionTimerRef.current);
      }
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }
    };
  }, []);

  // Multi-Provider & Multi-Source Lyrics Pipeline
  useEffect(() => {
    let isCancelled = false;

    if (!track || (!track.title && !track.id)) {
      setOriginalLines([]);
      setIsSynced(false);
      setLyricsSource("none");
      setLyricsProviderName(undefined);
      setLrcDuration(undefined);
      setLoading(false);
      return;
    }

    const loadTrackLyrics = async () => {
      setLoading(true);
      setUserHasScrolled(false);

      try {
        // 1. If track already has preloaded raw LRC / plain lyrics
        if (track.lyricsRaw) {
          const raw = track.lyricsRaw;
          const parsed = parseLrc(raw);
          if (!isCancelled) {
            if (parsed.length > 0) {
              setOriginalLines(parsed);
              setIsSynced(true);
              setLyricsSource("lrclib");
              setLyricsProviderName("Synced (LRCLIB)");
            } else {
              // Convert plain text into musically paced Karaoke timestamps
              const autoSynced = autoSyncPlainLyrics(raw, track.duration);
              if (autoSynced.length > 0) {
                setOriginalLines(autoSynced);
                setIsSynced(true);
                setLyricsSource("auto_karaoke");
                setLyricsProviderName("Synced (Karaoke Machine)");
              } else {
                setOriginalLines(parsePlainLyrics(raw));
                setIsSynced(false);
                setLyricsSource("lrclib");
                setLyricsProviderName("Plain Text");
              }
            }
            setLrcDuration(undefined);
            setLoading(false);
          }
          return;
        }

        // 2. Fast Parallel Multi-Provider Synced Engine (YouLyPlus & LRCLib Exact race with in-memory caching):
        const syncedLines = await fetchSyncedLyrics(track.title, track.artist, track.duration || 0);
        if (!isCancelled && syncedLines && syncedLines.length > 0) {
          setOriginalLines(syncedLines);
          setIsSynced(true);
          setLyricsSource((syncedLines as any).source || "lrclib");
          setLyricsProviderName((syncedLines as any).provider || "Synced Lyrics");
          setLrcDuration(track.duration);
          setLoading(false);
          return;
        }

        // 3. Fallback to Multi-Source Pipeline (YouTube captions, Server Proxy, Auto-Karaoke, Lyrics.ovh)
        const result = await fetchLyricsMultiSource(track.title, track.artist, track.duration, videoId, track.album);

        if (!isCancelled) {
          setLyricsSource(result.source || "none");
          setLyricsProviderName(result.provider);
          setLrcDuration(result.lrcDuration);

          if (result.syncedLyrics) {
            const parsed = parseLrc(result.syncedLyrics);
            if (parsed.length > 0) {
              setOriginalLines(parsed);
              setIsSynced(true);
              setLyricsSource(result.source || "lrclib");
              setLyricsProviderName(result.provider || "Synced (LRCLIB)");
            } else if (result.plainLyrics) {
              const autoSynced = autoSyncPlainLyrics(result.plainLyrics, track.duration || result.lrcDuration);
              setOriginalLines(autoSynced.length > 0 ? autoSynced : parsePlainLyrics(result.plainLyrics));
              setIsSynced(autoSynced.length > 0);
              setLyricsSource(autoSynced.length > 0 ? "auto_karaoke" : (result.source || "youtube_music"));
              setLyricsProviderName(autoSynced.length > 0 ? "Synced (Karaoke Machine)" : (result.provider || "Plain Text"));
            } else {
              setOriginalLines([]);
              setIsSynced(false);
            }
          } else if (result.plainLyrics) {
            const autoSynced = autoSyncPlainLyrics(result.plainLyrics, track.duration || result.lrcDuration);
            setOriginalLines(autoSynced.length > 0 ? autoSynced : parsePlainLyrics(result.plainLyrics));
            setIsSynced(autoSynced.length > 0);
            setLyricsSource(autoSynced.length > 0 ? "auto_karaoke" : (result.source || "youtube_music"));
            setLyricsProviderName(autoSynced.length > 0 ? "Synced (Karaoke Machine)" : (result.provider || "YouTube Music"));
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
          setLyricsProviderName(undefined);
          setLrcDuration(undefined);
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
  }, [trackKey, track?.title, track?.artist, track?.duration, track?.lyricsRaw, track?.album, videoId]);

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

  // Timestamp of the first synchronized vocal lyric line (strictly derived from line 1 of verified .lrc)
  const vocalStartTime = useMemo(() => {
    if (!isSynced || displayedLyrics.length === 0) return 0;
    const firstLine = displayedLyrics[0];
    return firstLine && typeof firstLine.time === "number" && firstLine.time > 0 ? firstLine.time : 0;
  }, [displayedLyrics, isSynced]);

  // Check if instrumental prelude countdown visual should be active (ONLY when vocalStartTime > 3 AND currentTime < vocalStartTime - 0.5)
  const showIntroCountdown = useMemo(() => {
    return isSynced && !loading && vocalStartTime > 3 && currentTime < vocalStartTime - 0.5;
  }, [isSynced, loading, vocalStartTime, currentTime]);

  // Bind current active lyric line highlighting strictly to currentTime from global player state:
  // Finds the LAST line whose timestamp is <= current player time without any artificial offset additions or subtractions
  const activeIndex = useMemo(() => {
    if (!isSynced || displayedLyrics.length === 0) return -1;
    return displayedLyrics.reduce((acc, line, idx) => {
      return typeof line.time === "number" && line.time >= 0 && line.time <= currentTime
        ? idx
        : acc;
    }, -1);
  }, [displayedLyrics, currentTime, isSynced]);

  // Dynamic Active Line Time Range & Countdown 'O' Ring Completion Percentage Calculation:
  //   lineDuration = nextLine.time - currentLine.time
  //   elapsed = currentTime - currentLine.time
  //   progressPercent = Math.min(100, Math.max(0, (elapsed / lineDuration) * 100))
  const activeLineProgress = useMemo(() => {
    if (!isSynced || activeIndex < 0 || activeIndex >= displayedLyrics.length) {
      return 0;
    }

    const currentLine = displayedLyrics[activeIndex];
    const nextLine = displayedLyrics[activeIndex + 1];

    if (!currentLine || typeof currentLine.time !== "number" || currentLine.time < 0) {
      return 0;
    }

    // lineDuration = nextLine.time - currentLine.time
    let lineDuration = 4;
    if (nextLine && typeof nextLine.time === "number" && nextLine.time > currentLine.time) {
      lineDuration = nextLine.time - currentLine.time;
    } else if (track.duration && track.duration > currentLine.time) {
      lineDuration = Math.min(6, Math.max(2, track.duration - currentLine.time));
    }

    if (lineDuration <= 0) lineDuration = 1;

    const elapsed = currentTime - currentLine.time;

    // progressPercent = Math.min(100, Math.max(0, (elapsed / lineDuration) * 100))
    const progressPercent = Math.min(100, Math.max(0, (elapsed / lineDuration) * 100));
    return progressPercent;
  }, [isSynced, activeIndex, displayedLyrics, currentTime, track.duration]);

  // 1. RESTORE AUTOMATIC SCROLL TRIGGER:
  // Hook listening to activeIndex and isUserScrolling
  useEffect(() => {
    if (activeIndex < 0 || isUserScrolling) return;

    const activeElement = lyricRefs.current[activeIndex] || activeLineRef.current;
    if (activeElement) {
      isProgrammaticScroll.current = true;
      activeElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
      userScrollTimeoutRef.current = setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 600);
    }
  }, [activeIndex, isUserScrolling]);

  // 2. RE-ENABLE TIMED AUTO-RESUME AFTER MANUAL INTERACTION:
  // Programmatic scroll guard in onScroll listener:
  const handleContainerScroll = useCallback(() => {
    if (!isSynced) return;
    if (isProgrammaticScroll.current) {
      isProgrammaticScroll.current = false;
      return; // Ignore programmatic autoscroll events completely
    }
    // Only register user scrolling if triggered by touch, wheel, or manual drag
    setIsUserScrolling(true);

    if (userInteractionTimerRef.current) {
      clearTimeout(userInteractionTimerRef.current);
    }
    userInteractionTimerRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 4000);
  }, [isSynced]);

  const handleUserWheelOrTouch = useCallback(() => {
    if (!isSynced) return;
    setIsUserScrolling(true);

    if (userInteractionTimerRef.current) {
      clearTimeout(userInteractionTimerRef.current);
    }
    userInteractionTimerRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 4000);
  }, [isSynced]);

  // 3. SYNC / CENTER BUTTON ACTION:
  // Clicking the static "Sync / Center" header button must immediately execute
  // activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' }) AND set isUserScrolling = false.
  const scrollToActiveLine = useCallback(() => {
    if (userInteractionTimerRef.current) {
      clearTimeout(userInteractionTimerRef.current);
      userInteractionTimerRef.current = null;
    }
    setIsUserScrolling(false);

    const activeElement = (activeIndex >= 0 ? lyricRefs.current[activeIndex] : null) || activeLineRef.current;
    if (activeElement) {
      isProgrammaticScroll.current = true;
      activeElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
      userScrollTimeoutRef.current = setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 600);
    }
  }, [activeIndex]);

  const handleResumeAutoscroll = scrollToActiveLine;

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

  // Alignment configuration
  const alignClass =
    settings.lyricsAlignment === "center"
      ? "text-center"
      : "text-left";

  const isCandy = Boolean(
    (designConfig.id as string) === "candyland" ||
    (designConfig.id as string) === "candyland-pastel" ||
    (designConfig as any).isCandy ||
    designConfig.name === "Candyland Pastel"
  );

  const pillBgClass = designConfig.pillBg || "bg-white/10 backdrop-blur-md";

  // Determine Provider Display Label
  const badgeLabel = useMemo(() => {
    if (lyricsProviderName) return lyricsProviderName;
    switch (lyricsSource) {
      case "lyricsplus":
        return "Synced (LyricsPlus)";
      case "lrclib":
        return "Synced (LRCLIB)";
      case "youtube_music":
        return "Synced (YouTube Music)";
      case "genius":
        return "Synced (Genius)";
      case "lyrics_ovh":
        return "Synced (Lyrics.ovh)";
      case "auto_karaoke":
        return "Synced (Karaoke Machine)";
      default:
        return isSynced ? "Synced Lyrics" : "Plain Text";
    }
  }, [lyricsProviderName, lyricsSource, isSynced]);

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden select-none">
      {/* Top Header / Mode Switcher Toolbar */}
      <div className="flex-none px-3 py-2 sm:px-6 sm:py-3 z-10 flex flex-col gap-2 border-b border-white/5 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 max-w-2xl w-full mx-auto">
          {/* Left: Track Info Summary */}
          <div className="min-w-0 flex-1 flex flex-col pr-2">
            <MarqueeText
              as="h3"
              text={cleanTitle}
              className={`text-sm sm:text-base font-bold truncate ${designConfig.textPrimary}`}
              containerClassName="w-full"
              speed={28}
            />
            <p className={`text-xs truncate ${designConfig.textMuted}`}>
              {track.artist || "Unknown Artist"}
            </p>
          </div>

          {/* Right: Romanization & Dual-Line Controls (Only when Synced) */}
          {isSynced && originalLines.length > 0 && (
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* Romanized vs Original Toggle */}
              <div className={`p-0.5 rounded-full flex items-center border ${designConfig.borderSubtle} ${pillBgClass}`}>
                <button
                  onClick={() => setMode("original")}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                    mode === "original"
                      ? `${designConfig.pillActive} shadow-sm font-bold !text-[#2b1810]`
                      : `${designConfig.textMuted} hover:text-white`
                  }`}
                  style={mode === "original" ? { color: "#2b1810" } : undefined}
                  title="Show lyrics in original language"
                >
                  Original
                </button>
                <button
                  onClick={() => setMode("romanized")}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${
                    mode === "romanized"
                      ? `${designConfig.pillActive} shadow-sm font-bold !text-[#2b1810]`
                      : `${designConfig.textMuted} hover:text-white`
                  }`}
                  style={mode === "romanized" ? { color: "#2b1810" } : undefined}
                  title="Show romanized / phonetic transliteration"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Rom</span>
                </button>
              </div>

              {/* Dual-Line Interleaved Toggle (Visible only when Romanized is active) */}
              {mode === "romanized" && (
                <button
                  onClick={() => setIsDualLine(!isDualLine)}
                  className={`p-1.5 rounded-full border transition-all ${
                    isDualLine
                      ? `${designConfig.accentBorder} ${designConfig.pillActive} shadow-sm`
                      : `${designConfig.borderSubtle} ${pillBgClass} ${designConfig.textMuted} hover:text-white`
                  }`}
                  title={isDualLine ? "Disable dual-line view" : "Enable dual-line view (Original + Romanized)"}
                >
                  <Layers className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Provider & Sync Status Badge & Static Sync / Center Button */}
        {displayedLyrics.length > 0 && !loading && (
          <div className="flex items-center justify-end gap-2 max-w-2xl w-full mx-auto pt-1">
            {isSynced && (
              <button
                type="button"
                onClick={scrollToActiveLine}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  isUserScrolling
                    ? `${designConfig.accentBorder} ${designConfig.pillActive} shadow-sm !text-[#2b1810]`
                    : `${designConfig.borderSubtle} ${pillBgClass} ${designConfig.textMuted} hover:text-white`
                }`}
                style={isUserScrolling ? { color: "#2b1810" } : undefined}
                title="Sync / Center on active lyric line"
              >
                <LocateFixed className="w-3 h-3" />
                <span>Sync / Center</span>
              </button>
            )}

            <div className="shrink-0 flex items-center">
              {isSynced ? (
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1.5 border ${designConfig.accentBorder} ${pillBgClass} ${designConfig.accentText} shadow-sm`}
                >
                  {!isCandy && <CheckCircle2 className="w-3 h-3" />}
                  <span>{badgeLabel}</span>
                </span>
              ) : (
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-medium flex items-center gap-1.5 border ${designConfig.borderSubtle} ${pillBgClass} ${designConfig.textMuted}`}
                >
                  {!isCandy && <FileText className="w-3 h-3" />}
                  <span>{badgeLabel}</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Lyrics Scrollable Body */}
      <div
        ref={containerRef}
        onScroll={handleContainerScroll}
        onWheel={handleUserWheelOrTouch}
        onTouchMove={handleUserWheelOrTouch}
        style={{
          "--active-lyric-color": "var(--accent-color, var(--accent-primary, var(--primary, #dfb86c)))",
          scrollbarColor: "var(--accent-color, var(--accent-primary, var(--primary))) transparent",
          scrollBehavior: "smooth",
        } as React.CSSProperties}
        className={`flex-1 overflow-y-auto custom-scrollbar relative scroll-smooth ${
          isSynced ? "space-y-7 sm:space-y-8 py-14 px-2 sm:px-6" : "space-y-4 sm:space-y-5 py-8 px-3 sm:px-8"
        }`}
      >
        {loading ? (
          <div className={`flex flex-col items-center justify-center h-full ${designConfig.textMuted} space-y-3`}>
            <div className="relative">
              <div
                className="w-10 h-10 rounded-full border-2 border-[var(--accent-color,var(--accent-primary,var(--primary)))] border-t-transparent animate-spin"
              />
              <Mic2 className={`w-4 h-4 absolute inset-0 m-auto ${designConfig.accentText} text-[var(--accent-color,var(--accent-primary,var(--primary)))]`} stroke="currentColor" />
            </div>
            <p className={`text-sm font-medium ${designConfig.textSecondary}`}>Fetching lyrics...</p>
            <p className="text-xs opacity-75">Checking Multi-Provider Database (LyricsPlus, LRCLIB, YouTube Music)</p>
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
          <>
            {/* Fluid Oblivion 'O' Instrumental Countdown Visual for tracks with intro >= 3s */}
            {showIntroCountdown && (
              <OblivionIntroCountdown
                currentPlaybackTime={currentTime}
                vocalStartTime={vocalStartTime}
                firstLineTime={vocalStartTime}
                designConfig={designConfig}
                onCountdownComplete={() => {
                  const activeElement = lyricRefs.current[0] || activeLineRef.current;
                  if (activeElement) {
                    activeElement.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                }}
              />
            )}

            {/* Synced Lyrics rendering with line-by-line highlighting, dynamic countdown 'O' ring, and timestamp seek */}
            {displayedLyrics.map((line, idx) => {
              const isActive = idx === activeIndex;

              return (
                <div
                  key={`${idx}-${line.time}`}
                  ref={(el) => {
                    lyricRefs.current[idx] = el;
                    if (isActive) {
                      activeLineRef.current = el;
                    }
                  }}
                  onClick={() => {
                    if (line.time >= 0) {
                      const targetTime = Math.max(0, line.time);
                      onSeek(targetTime);
                      setIsUserScrolling(false);
                    }
                  }}
                  className={`transform origin-left leading-relaxed ${alignClass} ${
                    line.time >= 0 && !isActive ? "cursor-pointer active:scale-[0.98] hover:opacity-80" : ""
                  } ${
                    isActive
                      ? "scale-[1.02] sm:scale-105 tracking-tight opacity-100 font-black cursor-default select-none"
                      : "opacity-35 font-medium"
                  }`}
                  style={{
                    color: isActive
                      ? "var(--active-lyric-color, var(--accent-color, var(--primary, #dfb86c)))"
                      : undefined,
                    textShadow: isActive
                      ? "0 0 16px var(--active-lyric-color, var(--accent-color, rgba(197, 155, 39, 0.45)))"
                      : undefined,
                    transition: "transform 200ms ease-out, opacity 150ms ease-out",
                  }}
                >
                  {/* Primary Lyric Line with Count-Down 'O' Ring Animation */}
                  <div
                    className={`flex items-center ${
                      alignClass === "text-center" ? "justify-center" : "justify-start"
                    } flex-wrap gap-x-2`}
                  >
                    {/* Dynamic Active Line 'O' Countdown Ring Animation */}
                    {isActive && (
                      <span
                        className="inline-flex items-center justify-center shrink-0 select-none animate-fade-in"
                        title={`Line progress: ${Math.round(activeLineProgress)}%`}
                        aria-label={`Line timing: ${Math.round(activeLineProgress)}%`}
                      >
                        <span className="relative w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center">
                          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
                            <defs>
                              <linearGradient id={`active-ring-grad-${idx}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="var(--accent-secondary, #f59e0b)" />
                                <stop offset="100%" stopColor="var(--accent-color, var(--primary, #c59b27))" />
                              </linearGradient>
                            </defs>
                            {/* Track Circle */}
                            <circle
                              cx="18"
                              cy="18"
                              r="14"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.8"
                              className="opacity-25"
                            />
                            {/* Dynamic Animated 'O' Ring Stroke Filling via strokeDashoffset */}
                            <circle
                              cx="18"
                              cy="18"
                              r="14"
                              fill="none"
                              stroke={`url(#active-ring-grad-${idx})`}
                              strokeWidth="3.2"
                              strokeDasharray="87.96"
                              strokeDashoffset={87.96 - (87.96 * activeLineProgress) / 100}
                              strokeLinecap="round"
                              className="transition-[stroke-dashoffset] duration-100 ease-linear"
                            />
                          </svg>
                          <span
                            className="absolute inset-0 flex items-center justify-center text-[9px] sm:text-[10px] font-black uppercase tracking-tighter"
                            style={{
                              color: "var(--active-lyric-color, var(--accent-color, var(--primary, #c59b27)))",
                            }}
                          >
                            O
                          </span>
                        </span>
                      </span>
                    )}

                    <span className={`${fontSizeClass} ${isActive ? "font-black" : "font-semibold"}`}>
                      {line.text}
                    </span>
                  </div>

                  {/* Sub-Lyric Line (Interleaved Phonetic Romanization) */}
                  {line.subText && (
                    <div
                      className={`${subFontSizeClass} mt-1.5 tracking-wide ${
                        isActive
                          ? "opacity-90 italic font-medium"
                          : "opacity-40 italic font-normal"
                      }`}
                      style={{
                        color: isActive
                          ? "var(--active-lyric-color, var(--accent-color, var(--primary, #dfb86c)))"
                          : undefined,
                        transition: "opacity 150ms ease-out",
                      }}
                    >
                      {line.subText}
                    </div>
                  )}
                </div>
              );
            })}
          </>
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

    </div>
  );
};
