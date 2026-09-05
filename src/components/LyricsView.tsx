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
  RotateCcw,
} from "lucide-react";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";
import {
  fetchLyricsMultiSource,
  parseLRC,
  parsePlainLyrics,
  createDualLyricLines,
  LyricsSourceType,
} from "../services/lyricsService";
import { romanizeLyricLines } from "../utils/romanization";
import { cleanTrackTitle } from "../utils/formatters";
import { sanitizeLyricsQuery } from "../utils/lyricsSanitizer";
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
  const [lyricsSource, setLyricsSource] = useState<LyricsSourceType>("none");
  const [lyricsProviderName, setLyricsProviderName] = useState<string | undefined>(undefined);
  const [lrcDuration, setLrcDuration] = useState<number | undefined>(undefined);
  const [offset, setOffset] = useState<number>(0);
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

  const sanitized = useMemo(() => sanitizeLyricsQuery(track.title, track.artist), [track.title, track.artist]);
  const cleanTitle = sanitized.cleanTitle || cleanTrackTitle(track.title, track.artist);
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
              setLyricsProviderName("LRCLIB Synced");
            } else {
              setOriginalLines(parsePlainLyrics(raw));
              setIsSynced(false);
              setLyricsSource("lrclib");
              setLyricsProviderName("LRCLIB Plain");
            }
            setLrcDuration(undefined);
            setLoading(false);
          }
          return;
        }

        // 2. Query Multi-Source Lyrics Fallback Chain:
        //    Step 1: Native YouTube InnerTube Synced Captions & Lyrics
        //    Step 2: LRCLIB Synced LRC / Plain Text
        //    Step 3: Tertiary Public Lyrics (Lyrics.ovh / Genius)
        const result = await fetchLyricsMultiSource(track.title, track.artist, track.duration, videoId);

        if (!isCancelled) {
          setLyricsSource(result.source);
          setLyricsProviderName(result.provider);
          setLrcDuration(result.lrcDuration);
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
  }, [track.id, track.title, track.artist, track.duration, track.lyricsRaw, videoId]);

  // Per-Track LocalStorage Persistence & Auto-Offset Duration Delta Calculation
  useEffect(() => {
    const key = videoId || track.id;
    if (!key) return;

    const storageKey = `oblivion_lyric_offset_${key}`;
    const saved = localStorage.getItem(storageKey);

    if (saved !== null && saved !== "") {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed)) {
        setOffset(parsed);
        return;
      }
    }

    // Auto-Offset Calculation (Video intro delta detection: videoDuration > lrcDuration)
    const videoDuration = track.duration || 0;
    if (lrcDuration && lrcDuration > 0 && videoDuration > lrcDuration) {
      const autoOffset = Math.round((videoDuration - lrcDuration) * 10) / 10;
      setOffset(autoOffset);
    } else {
      setOffset(0);
    }
  }, [videoId, track.id, track.duration, lrcDuration]);

  // Manual Timing Offset Adjustment Handlers
  const handleAdjustOffset = (delta: number) => {
    const key = videoId || track.id;
    const newOffset = Math.round((offset + delta) * 10) / 10;
    setOffset(newOffset);
    if (key) {
      localStorage.setItem(`oblivion_lyric_offset_${key}`, newOffset.toString());
    }
  };

  const handleResetOffset = () => {
    const key = videoId || track.id;
    setOffset(0);
    if (key) {
      localStorage.setItem(`oblivion_lyric_offset_${key}`, "0");
    }
  };

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

  // Find active line index based on current playback time and calibration offset (only when synced)
  const activeIndex = useMemo(() => {
    if (!isSynced || displayedLyrics.length === 0) return -1;
    
    // Real-Time Sync Adjustment using effectiveTime
    const effectiveTime = currentTime - offset;

    let active = -1;
    for (let i = 0; i < displayedLyrics.length; i++) {
      if (effectiveTime >= displayedLyrics[i].time - 0.25) {
        active = i;
      } else {
        break;
      }
    }
    return active >= 0 ? active : 0;
  }, [displayedLyrics, currentTime, offset, isSynced]);

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

  const pillBgClass = (designConfig as any).pillBg || (designConfig.isLight ? "bg-black/5" : "bg-white/10");
  const isCandy = Boolean(designConfig.isCandy);

  // Provider Badge Label
  const badgeLabel = useMemo(() => {
    if (isSynced) {
      if (isCandy) return "🍫 Synced LRC";
      if (lyricsSource === "lrclib") return "Synced (LRCLIB)";
      return lyricsProviderName || "Synced";
    }
    if (isCandy) return "🍦 Plain Text";
    if (lyricsSource === "youtube_music") {
      return "Plain Text (YouTube Music)";
    }
    if (lyricsSource === "lrclib") {
      return "Plain Text (LRCLIB)";
    }
    if (lyricsSource === "genius") {
      return "Plain Text (Genius)";
    }
    if (lyricsSource === "lyrics_ovh") {
      return "Plain Text (Lyrics.ovh)";
    }
    return lyricsProviderName || "Plain Text";
  }, [isSynced, lyricsSource, lyricsProviderName, isCandy]);

  return (
    <div
      className={`flex flex-col h-full w-full ${designConfig.cardBg} rounded-3xl border ${designConfig.borderSubtle} p-4 sm:p-6 backdrop-blur-2xl relative overflow-hidden select-none shadow-2xl transition-all`}
    >
      {/* Top Header: Track Metadata + Provider Badge + Synced Romanization Controls + Calibration Bar */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b ${designConfig.borderSubtle} mb-2 shrink-0 gap-3`}
      >
        {/* Left: Track Information with Marquee */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={`p-1.5 rounded-xl ${pillBgClass} shrink-0`}>
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

        {/* Center & Right: Romanization Controls & Timing Calibration (Synced only) + UI Badge */}
        <div className="flex items-center flex-wrap gap-2 justify-between sm:justify-end">
          {/* Controls available strictly when lyrics are synced */}
          {isSynced && (
            <>
              {/* Segmented Pill: Original vs Romanized */}
              <div className={`p-0.5 rounded-2xl flex items-center gap-1 border ${designConfig.borderSubtle} ${pillBgClass}`}>
                <button
                  id="lyrics-mode-original-btn"
                  onClick={() => setMode("original")}
                  aria-selected={mode === "original"}
                  className={`lyrics-mode-pill px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    mode === "original" ? "active" : ""
                  }`}
                  title="Display original lyrics"
                >
                  <span>{isCandy ? "🍭 Original" : "Original"}</span>
                </button>

                <button
                  id="lyrics-mode-romanized-btn"
                  onClick={() => setMode("romanized")}
                  aria-selected={mode === "romanized"}
                  className={`lyrics-mode-pill px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    mode === "romanized" ? "active" : ""
                  }`}
                  title="Display instant phonetic Romanized (Romaji / Pinyin / Revised Korean) lyrics"
                >
                  {!isCandy && <Sparkles className="w-3.5 h-3.5" />}
                  <span>{isCandy ? "🍬 Romanized" : "Romanized"}</span>
                </button>
              </div>

              {/* Dual-Line Interleaved Toggle (Available when in Romanized mode) */}
              {mode === "romanized" && (
                <button
                  id="lyrics-toggle-dualline-btn"
                  onClick={() => setIsDualLine(!isDualLine)}
                  aria-pressed={isDualLine}
                  className={`lyrics-mode-pill px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isDualLine ? "active" : ""
                  }`}
                  title={isDualLine ? "Disable interleaved dual-line display" : "Enable interleaved dual-line display"}
                >
                  {!isCandy && <Layers className="w-3.5 h-3.5" />}
                  <span>{isCandy ? "🧁 Dual-Line" : "Dual-Line"}</span>
                </button>
              )}

              {/* Manual Lyric Timing Calibration Control Bar */}
              <div
                id="lyrics-timing-calibration-bar"
                className={`lyrics-timing-bar flex items-center p-0.5 rounded-2xl border ${designConfig.borderSubtle} ${pillBgClass} gap-1 shadow-sm`}
                title="Lyric Timing Calibration (Sync Offset)"
              >
                {/* [-0.5s] Button (Delays lyrics / shifts them back) */}
                <button
                  id="lyrics-offset-minus-btn"
                  onClick={() => handleAdjustOffset(-0.5)}
                  className="lyrics-timing-btn px-2 py-1 rounded-xl text-[11px] font-bold transition-all active:scale-95 cursor-pointer hover:opacity-90"
                  title="Delay lyrics by 0.5s (Shift back)"
                  aria-label="Delay lyrics by 0.5s"
                >
                  -0.5s
                </button>

                {/* Dynamic Text Badge */}
                <div
                  id="lyrics-offset-badge"
                  className={`lyrics-timing-badge px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold tracking-tight whitespace-nowrap transition-all ${
                    offset !== 0 ? "active-offset" : ""
                  }`}
                  title={
                    offset !== 0
                      ? `Active timing calibration offset: ${offset >= 0 ? "+" : ""}${offset.toFixed(1)}s`
                      : "Timing calibrated at default (0.0s)"
                  }
                >
                  Sync: {offset >= 0 ? "+" : ""}{offset.toFixed(1)}s
                </div>

                {/* [+0.5s] Button (Advances lyrics / shifts them forward) */}
                <button
                  id="lyrics-offset-plus-btn"
                  onClick={() => handleAdjustOffset(0.5)}
                  className="lyrics-timing-btn px-2 py-1 rounded-xl text-[11px] font-bold transition-all active:scale-95 cursor-pointer hover:opacity-90"
                  title="Advance lyrics by 0.5s (Shift forward)"
                  aria-label="Advance lyrics by 0.5s"
                >
                  +0.5s
                </button>

                {/* [Reset] Icon Button */}
                <button
                  id="lyrics-offset-reset-btn"
                  onClick={handleResetOffset}
                  className={`lyrics-timing-btn p-1 rounded-xl text-[11px] transition-all active:scale-90 cursor-pointer ${
                    offset !== 0 ? "opacity-100" : "opacity-40 hover:opacity-80"
                  }`}
                  title="Reset timing calibration to 0.0s"
                  aria-label="Reset timing offset to 0.0s"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </>
          )}

          {/* Provider & Sync Status Badge */}
          {displayedLyrics.length > 0 && !loading && (
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
                    const targetTime = Math.max(0, line.time + offset);
                    onSeek(targetTime);
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
            {isCandy ? <span>🍩</span> : <ArrowDown className="w-4 h-4 animate-bounce" />}
            <span>Resume Autoscroll</span>
          </button>
        </div>
      )}
    </div>
  );
};
