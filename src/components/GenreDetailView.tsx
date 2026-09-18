import React, { useState, useEffect, useMemo } from "react";
import { Track } from "../types";
import {
  X,
  Play,
  Shuffle,
  Music,
  Radio,
  Disc3,
  Sparkles,
  Search,
  Clock,
  Loader2,
  RefreshCw,
  Flame,
  Layers,
} from "lucide-react";
import { cleanTrackTitle } from "../utils/formatters";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";
import { MarqueeText } from "./MarqueeText";
import { fetchGenreTracks, GenreItem } from "../services/genreService";
import { useContextualScrollRecovery } from "../utils/scrollRecovery";

interface GenreDetailViewProps {
  genre: GenreItem;
  onClose: () => void;
  onPlayTrack: (track: Track) => void;
  onPlayQueue: (tracks: Track[], startIndex?: number) => void;
  onAddToQueue?: (track: Track) => void;
  currentTrackId?: string;
  activeTrack?: Track | null;
  isPlaying?: boolean;
  designConfig?: FullAppDesignConfig;
}

export const GenreDetailView: React.FC<GenreDetailViewProps> = ({
  genre,
  onClose,
  onPlayTrack,
  onPlayQueue,
  onAddToQueue,
  currentTrackId,
  activeTrack,
  isPlaying = false,
  designConfig = FULL_APP_DESIGNS["designer"],
}) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Swipe-down gesture state for mobile touch exit
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartTime, setTouchStartTime] = useState<number>(0);
  const [dragOffsetY, setDragOffsetY] = useState<number>(0);
  const [isDraggingDown, setIsDraggingDown] = useState<boolean>(false);

  const isBespoke = Boolean(
    designConfig.id === "bespoke" ||
    designConfig.isBespoke ||
    (typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "bespoke")
  );

  // Deactivate background canvas and mark media view active to prevent screen flashing
  useEffect(() => {
    document.body.classList.add("oblivion-media-view-active");
    return () => {
      document.body.classList.remove("oblivion-media-view-active");
    };
  }, []);

  const loadTracks = async () => {
    try {
      const results = await fetchGenreTracks(genre.query || genre.title);
      setTracks(results);
    } catch (err) {
      console.error("Genre tracks load failed:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadTracks();
  }, [genre.id, genre.query]);

  const genreCollectionId = genre.id || genre.query || genre.title;
  const { captureScrollPosition } = useContextualScrollRecovery({
    collectionId: genreCollectionId,
    tracks,
    activeTrack,
    currentTrackId,
    isLoading: loading,
  });

  const handleClose = () => {
    captureScrollPosition();
    onClose();
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadTracks();
  };

  const filteredTracks = useMemo(() => {
    if (!searchTerm.trim()) return tracks;
    const term = searchTerm.toLowerCase();
    return tracks.filter(
      (t) =>
        t.title?.toLowerCase().includes(term) ||
        t.artist?.toLowerCase().includes(term) ||
        t.album?.toLowerCase().includes(term)
    );
  }, [tracks, searchTerm]);

  const totalDurationSec = useMemo(() => {
    return tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  }, [tracks]);

  const formatTotalTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs} hr ${remMins} min`;
  };

  const formatDuration = (sec?: number) => {
    if (!sec || sec <= 0) return "--:--";
    const mins = Math.floor(sec / 60);
    const remainder = Math.floor(sec % 60);
    return `${mins}:${String(remainder).padStart(2, "0")}`;
  };

  // Mobile swipe down gesture
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const currentScrollY = typeof window !== "undefined" ? window.scrollY : 0;
    if (currentScrollY > 10) return;
    const touch = e.touches[0];
    setTouchStartY(touch.clientY);
    setTouchStartX(touch.clientX);
    setTouchStartTime(Date.now());
    setIsDraggingDown(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY === null || touchStartX === null) return;
    const currentScrollY = typeof window !== "undefined" ? window.scrollY : 0;
    if (currentScrollY > 10 && !isDraggingDown) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStartY;
    const deltaX = touch.clientX - touchStartX;

    if (deltaY > 6 && deltaY > Math.abs(deltaX) * 1.1) {
      const target = e.target as HTMLElement | null;
      const scrollContainer = target?.closest(".overflow-y-auto, .custom-scrollbar") as HTMLElement | null;
      if (scrollContainer && scrollContainer.scrollTop > 5) {
        return;
      }
      setIsDraggingDown(true);
      const dampedOffset = deltaY < 180 ? deltaY : 180 + (deltaY - 180) * 0.45;
      setDragOffsetY(dampedOffset);
    } else if (deltaY <= 0 && isDraggingDown) {
      setDragOffsetY(0);
      setIsDraggingDown(false);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY === null) return;
    const touch = e.changedTouches[0];
    const deltaY = touch.clientY - touchStartY;
    const deltaX = touchStartX !== null ? touch.clientX - touchStartX : 0;
    const duration = Math.max(1, Date.now() - touchStartTime);
    const velocityY = deltaY / duration;

    if ((deltaY > 75 || (deltaY > 35 && velocityY > 0.35)) && deltaY > Math.abs(deltaX)) {
      handleClose();
    }
    setTouchStartY(null);
    setTouchStartX(null);
    setDragOffsetY(0);
    setIsDraggingDown(false);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => {
        setTouchStartY(null);
        setTouchStartX(null);
        setDragOffsetY(0);
        setIsDraggingDown(false);
      }}
      style={{
        transform: dragOffsetY > 0 ? `translate3d(0, ${dragOffsetY}px, 0)` : undefined,
        willChange: dragOffsetY > 0 ? "transform" : undefined,
        opacity: isBespoke ? 1 : (dragOffsetY > 0 ? Math.max(0.65, 1 - dragOffsetY / 500) : 1),
        transition: isDraggingDown ? "none" : "transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.25s ease",
        background: isBespoke
          ? "var(--bespoke-c1, #0a0d1a)"
          : "var(--bg-surface-elevated, var(--bg-primary, rgba(18, 16, 22, 0.95)))",
        backgroundImage: isBespoke
          ? "linear-gradient(180deg, var(--bespoke-c1, #0a0d1a) 0%, #0d0a1c 35%, #06040d 100%)"
          : undefined,
        color: "var(--text-primary, #ffffff)",
        borderColor: isBespoke ? "rgba(255, 255, 255, 0.15)" : "var(--border-subtle, rgba(255, 255, 255, 0.1))",
        backdropFilter: isBespoke ? "none" : "blur(24px)",
        WebkitBackdropFilter: isBespoke ? "none" : "blur(24px)",
      }}
      className={`genre-detail-view genre-view ${isBespoke ? "theme-bespoke-solid-view" : ""} flex-1 flex flex-col select-none pb-64 sm:pb-72 md:pb-52 min-h-screen border-t sm:border-t-0`}
    >
      {/* Sticky Action Toolbar */}
      <div
        className={`sticky top-14 sm:top-16 z-30 flex flex-col shrink-0 px-4 sm:px-6 md:px-8 py-2.5 sm:py-3.5 ${
          isBespoke
            ? "bg-[var(--bespoke-c1,#0a0d1a)] border-b border-white/15 shadow-md"
            : `backdrop-blur-2xl ${designConfig.headerBg || "bg-[#141216]/85"} border-b ${designConfig.borderSubtle} shadow-sm`
        } transition-all`}
        style={{
          borderBottomColor: isBespoke ? "rgba(255, 255, 255, 0.15)" : "var(--border-subtle, rgba(255, 255, 255, 0.1))",
          ...(isBespoke ? { backgroundColor: "var(--bespoke-c1, #0a0d1a)", backdropFilter: "none", WebkitBackdropFilter: "none" } : {}),
        }}
      >
        <div className="max-w-6xl mx-auto w-full flex flex-col">
          {/* Mobile pull indicator */}
          <div className="w-8 h-1 rounded-full bg-zinc-400/40 mx-auto mb-1.5 sm:hidden" />

          <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3.5 w-full">
            <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-[200px] sm:min-w-[280px]">
              {/* Close Button (✕) */}
              <button
                id="genre-modal-close-btn"
                onClick={handleClose}
                aria-label="Close genre view"
                className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${designConfig.btnSecondary} ${designConfig.textPrimary} text-sm font-semibold transition-all hover:scale-105 active:scale-95 shadow-sm shrink-0 border ${designConfig.borderSubtle}`}
                style={{
                  color: "var(--text-primary, #ffffff)",
                  borderColor: isBespoke ? "rgba(255, 255, 255, 0.15)" : "var(--border-subtle, rgba(255, 255, 255, 0.1))",
                  ...(isBespoke ? { backgroundColor: "#151128" } : {}),
                }}
                title="Close and return (or swipe down)"
              >
                <X className="w-5 h-5" />
              </button>

              {/* In-Header Search Field */}
              <div className="flex-1 max-w-xl relative min-w-0">
                <Search
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 ${designConfig.textMuted} pointer-events-none`}
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={`Search in ${genre.title}...`}
                  className={`w-full pl-8 sm:pl-10 ${
                    searchTerm ? "pr-8 sm:pr-9" : "pr-3 sm:pr-4"
                  } py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium ${
                    isBespoke ? "bg-[#0c0918] border-white/15 text-white" : `${designConfig.inputBg} border ${designConfig.borderSubtle} ${designConfig.textPrimary}`
                  } placeholder:text-slate-400 focus:outline-none shadow-sm transition-all`}
                  style={{
                    borderColor: isBespoke ? "rgba(255, 255, 255, 0.15)" : "var(--border-subtle, rgba(255, 255, 255, 0.1))",
                    color: "var(--text-primary, #ffffff)",
                    ...(isBespoke ? { backgroundColor: "#0c0918", backdropFilter: "none", WebkitBackdropFilter: "none" } : {}),
                  }}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full ${designConfig.textMuted} hover:${designConfig.textPrimary} hover:bg-black/10 transition-colors`}
                    title="Clear search filter"
                    aria-label="Clear search filter"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Refresh Button */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing || loading}
                className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm ${designConfig.btnSecondary} ${designConfig.textPrimary} border ${designConfig.borderSubtle}`}
                style={isBespoke ? { backgroundColor: "#151128", borderColor: "rgba(255, 255, 255, 0.15)" } : undefined}
                title="Refresh tracks"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || loading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto w-full">
        {/* Genre Hero Card */}
        <div
          className={`relative overflow-hidden rounded-3xl ${
            isBespoke
              ? "bg-[#110e20] border border-white/20 shadow-2xl"
              : `${designConfig.cardBg} border ${designConfig.accentBorder} shadow-2xl`
          } p-6 sm:p-8 transition-all`}
          style={{
            borderColor: isBespoke ? "rgba(255, 255, 255, 0.2)" : "var(--accent-border, rgba(223, 184, 108, 0.45))",
            ...(isBespoke ? { backgroundColor: "#110e20", backdropFilter: "none", WebkitBackdropFilter: "none" } : {}),
          }}
        >
          {!isBespoke && (
            <div className="absolute top-0 right-0 w-96 h-96 opacity-25 pointer-events-none bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[var(--accent-primary,#dfb86c)] via-transparent to-transparent blur-3xl"></div>
          )}

          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6 sm:gap-8">
            {/* Genre Visual Cover Tile */}
            <div
              className={`w-44 h-44 sm:w-52 sm:h-52 rounded-2xl bg-gradient-to-br ${
                genre.color || "from-amber-600 to-indigo-900"
              } shadow-2xl border-2 flex flex-col items-center justify-center p-4 text-center shrink-0 relative overflow-hidden group`}
              style={{
                borderColor: "var(--accent-border, rgba(223, 184, 108, 0.45))",
              }}
            >
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
              <Radio className="w-16 h-16 text-white/90 drop-shadow-md relative z-10 transform group-hover:scale-110 transition-transform" />
              <span className="text-sm font-black text-white drop-shadow-md mt-2 relative z-10 uppercase tracking-wider">
                {genre.title}
              </span>
            </div>

            {/* Genre Information */}
            <div className="flex-1 text-center md:text-left space-y-3 min-w-0">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm`}
                  style={{
                    background: "var(--card-border, rgba(255, 255, 255, 0.1))",
                    color: "var(--text-primary, #ffffff)",
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--accent-primary, #dfb86c)" }} />
                  <span>Curated Soundscape</span>
                </span>
              </div>

              <h1
                className={`text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight`}
                style={{ color: "var(--text-primary, #ffffff)" }}
              >
                {genre.title}
              </h1>

              <p
                className={`text-xs sm:text-sm font-medium line-clamp-2 max-w-2xl`}
                style={{ color: "var(--text-muted, #94a3b8)" }}
              >
                {genre.description ||
                  `Dedicated soundscape station for ${genre.title}. Continuously streaming the top tracks, trending hits, and essentials.`}
              </p>

              {/* Stats Bar */}
              <div
                className={`flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4 text-xs font-mono font-semibold pt-1`}
                style={{ color: "var(--text-muted, #94a3b8)" }}
              >
                <div className="flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5" />
                  <span>{tracks.length} songs</span>
                </div>
                {totalDurationSec > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatTotalTime(totalDurationSec)}</span>
                  </div>
                )}
              </div>

              {/* Hero Action Buttons */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-3">
                <button
                  id="genre-play-all-btn"
                  onClick={() => tracks.length > 0 && onPlayQueue(tracks, 0)}
                  disabled={tracks.length === 0}
                  className={`px-6 sm:px-8 py-3.5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2.5 shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50`}
                  style={{
                    background: "var(--accent-gradient, var(--accent-primary, #dfb86c))",
                    color: "var(--text-on-accent, #120f14)",
                  }}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play All</span>
                </button>

                <button
                  id="genre-shuffle-btn"
                  onClick={() => {
                    if (tracks.length > 0) {
                      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
                      onPlayQueue(shuffled, 0);
                    }
                  }}
                  disabled={tracks.length <= 1}
                  className={`px-5 sm:px-6 py-3.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md hover:scale-105 active:scale-95 transition-all border ${designConfig.btnSecondary} disabled:opacity-50`}
                  style={{
                    color: "var(--text-primary, #ffffff)",
                    borderColor: "var(--border-subtle, rgba(255, 255, 255, 0.1))",
                  }}
                >
                  <Shuffle className="w-4 h-4" />
                  <span>Shuffle</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tracks Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base sm:text-lg font-bold tracking-tight" style={{ color: "var(--text-primary, #ffffff)" }}>
              Soundscape Tracks
            </h2>
            <span className="text-xs font-mono" style={{ color: "var(--text-muted, #94a3b8)" }}>
              {filteredTracks.length} {filteredTracks.length === 1 ? "track" : "tracks"}
            </span>
          </div>

          {loading ? (
            <div
              className={`p-16 text-center rounded-3xl ${
                isBespoke
                  ? "bg-[#110e20] border border-white/15"
                  : `${designConfig.cardBg} border ${designConfig.borderSubtle}`
              } space-y-3`}
              style={{
                borderColor: isBespoke ? "rgba(255, 255, 255, 0.15)" : "var(--border-subtle, rgba(255, 255, 255, 0.1))",
                ...(isBespoke ? { backgroundColor: "#110e20", backdropFilter: "none", WebkitBackdropFilter: "none" } : {}),
              }}
            >
              <Loader2 className="w-7 h-7 mx-auto animate-spin" style={{ color: "var(--accent-primary, #dfb86c)" }} />
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary, #ffffff)" }}>
                Loading {genre.title} soundscape...
              </p>
            </div>
          ) : filteredTracks.length === 0 ? (
            <div
              className={`p-16 text-center rounded-3xl ${
                isBespoke
                  ? "bg-[#110e20] border border-white/15"
                  : `${designConfig.cardBg} border ${designConfig.borderSubtle}`
              } space-y-2`}
              style={{
                borderColor: isBespoke ? "rgba(255, 255, 255, 0.15)" : "var(--border-subtle, rgba(255, 255, 255, 0.1))",
                ...(isBespoke ? { backgroundColor: "#110e20", backdropFilter: "none", WebkitBackdropFilter: "none" } : {}),
              }}
            >
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary, #ffffff)" }}>
                No tracks found matching "{searchTerm}"
              </p>
              <button
                onClick={() => setSearchTerm("")}
                className="text-xs underline font-bold"
                style={{ color: "var(--accent-primary, #dfb86c)" }}
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredTracks.map((track, idx) => {
                const trId = track.id || track.youtubeVideoId;
                const isCurrent = currentTrackId === trId;

                return (
                  <div
                    key={trId || idx}
                    id={`track-row-${track.id}`}
                    data-track-id={track.id}
                    data-youtube-id={track.youtubeVideoId}
                    onClick={() => onPlayQueue(filteredTracks, idx)}
                    className={`group flex items-center justify-between p-2.5 sm:p-3 rounded-2xl cursor-pointer transition-all ${
                      isBespoke
                        ? isCurrent
                          ? "bg-[#1a1433] ring-1.5 border-[var(--bespoke-c2,#ff007f)] shadow-md"
                          : "bg-[#110e20] hover:bg-[#18132d] border border-white/10 hover:border-white/20"
                        : isCurrent
                        ? `${designConfig.cardBg} shadow-md`
                        : `${designConfig.cardBg} ${designConfig.cardHover}`
                    } ${!isBespoke ? "border border-transparent" : ""}`}
                    style={{
                      borderColor: isCurrent
                        ? (isBespoke ? "var(--bespoke-c2, #ff007f)" : "var(--accent-primary, #dfb86c)")
                        : (isBespoke ? "rgba(255, 255, 255, 0.1)" : "transparent"),
                      ...(isBespoke ? { backdropFilter: "none", WebkitBackdropFilter: "none" } : {}),
                    }}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      {/* Index / Play Indicator */}
                      <div className="w-6 sm:w-8 text-center shrink-0 flex items-center justify-center">
                        {isCurrent && isPlaying ? (
                          <div className="flex items-end justify-center gap-0.5 h-3.5 w-3.5">
                            <span
                              className="w-1 h-3 rounded-full animate-bounce"
                              style={{ background: "var(--accent-primary, #dfb86c)" }}
                            />
                            <span
                              className="w-1 h-2 rounded-full animate-bounce [animation-delay:0.2s]"
                              style={{ background: "var(--accent-primary, #dfb86c)" }}
                            />
                            <span
                              className="w-1 h-3.5 rounded-full animate-bounce [animation-delay:0.4s]"
                              style={{ background: "var(--accent-primary, #dfb86c)" }}
                            />
                          </div>
                        ) : (
                          <span
                            className="text-xs font-mono group-hover:hidden"
                            style={{ color: "var(--text-muted, #94a3b8)" }}
                          >
                            {idx + 1}
                          </span>
                        )}
                        <Play className="w-3.5 h-3.5 fill-current hidden group-hover:block" />
                      </div>

                      {/* Thumbnail */}
                      <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 shadow-sm bg-black/20">
                        <img
                          src={track.coverUrl}
                          alt={track.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const vId = track.youtubeVideoId || track.id;
                            if (vId) {
                              e.currentTarget.src = `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`;
                            } else {
                              e.currentTarget.src =
                                "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80";
                            }
                          }}
                        />
                      </div>

                      {/* Title & Artist */}
                      <div className="flex-1 min-w-0 pr-2">
                        <MarqueeText
                          text={cleanTrackTitle(track.title, track.artist)}
                          className={`text-xs sm:text-sm font-semibold transition-colors`}
                          containerClassName="w-full"
                          speed={28}
                        />
                        <MarqueeText
                          text={track.artist || "Unknown Artist"}
                          className={`text-[11px]`}
                          containerClassName="w-full mt-0.5"
                          speed={24}
                        />
                      </div>
                    </div>

                    {/* Right side: Duration */}
                    <span
                      className="text-xs font-mono font-medium shrink-0 ml-3"
                      style={{ color: "var(--text-muted, #94a3b8)" }}
                    >
                      {formatDuration(track.duration)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
