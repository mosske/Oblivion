import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { Playlist, Track, Album } from "../types";
import {
  X,
  Play,
  Pause,
  Shuffle,
  Repeat,
  Repeat1,
  Save,
  ArrowUpDown,
  Trash2,
  Edit,
  Plus,
  Sparkles,
  Music2,
  Clock,
  GripVertical,
  CheckCircle2,
  Layers,
  Share2,
  Loader2,
  RefreshCw,
  Image as ImageIcon,
  ChevronUp,
  ChevronDown,
  Check,
  Globe,
  Lock,
  Link2,
  Search
} from "lucide-react";
import { cleanTrackTitle } from "../utils/formatters";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";
import { PlaylistCustomCoverModal } from "./PlaylistCustomCoverModal";
import { PlaylistTrackList } from "./PlaylistTrackList";
import { PlaylistCoverArt } from "./PlaylistCoverArt";
import { DeletePlaylistModal } from "./DeletePlaylistModal";
import { MarqueeText } from "./MarqueeText";
import { getInMemoryToken } from "../App";
import { getCachedPlaylistTracksFromDB, savePlaylistTracksToDBCache } from "../utils/playlistDb";
import { getStoredAuthToken } from "../services/authService";
import { getCachedPlaylistTracks, setCachedPlaylistTracks } from "../services/playlistService";
import {
  getPlaylistCustomArtwork,
  isAuthenticCustomArtworkUrl,
  isVideoThumbnailUrl,
} from "../utils/customCoversStorage";

interface PlaylistDetailViewProps {
  item: Playlist | Album;
  isAlbum?: boolean;
  onBack: () => void;
  onBackToLibrary?: () => void;
  onDeletePlaylist?: (playlistId: string) => void;
  onPlayTrack: (track: Track) => void;
  onPlayQueue: (tracks: Track[], startIndex: number) => void;
  onEditPlaylist?: (playlist: Playlist) => void;
  onUpdateCover?: (coverUrl: string, isCustom: boolean) => void;
  onReorderTracks?: (newTracks: Track[]) => void;
  onRemoveTrack?: (trackId: string, track?: Track) => void;
  onAddToQueue?: (track: Track) => void;
  onAddTrackToPlaylist?: (track: Track, playlistId: string) => void;
  onOpenAddToPlaylistModal?: (track: Track) => void;
  currentTrackId?: string;
  isPlaying?: boolean;
  playlists?: Playlist[];
  designConfig?: FullAppDesignConfig;
  repeatMode?: "off" | "one" | "all";
  onToggleRepeat?: () => void;
  isShuffle?: boolean;
  onToggleShuffle?: () => void;
}

export const PlaylistDetailView: React.FC<PlaylistDetailViewProps> = ({
  item,
  isAlbum = false,
  onBack,
  onBackToLibrary,
  onDeletePlaylist,
  onPlayTrack,
  onPlayQueue,
  onEditPlaylist,
  onUpdateCover,
  onReorderTracks,
  onRemoveTrack,
  onAddToQueue,
  onAddTrackToPlaylist,
  onOpenAddToPlaylistModal,
  currentTrackId,
  isPlaying = false,
  playlists = [],
  designConfig = FULL_APP_DESIGNS["designer"],
  repeatMode = "off",
  onToggleRepeat,
  isShuffle = false,
  onToggleShuffle,
}) => {
  if (!item) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
        <p className="text-sm text-slate-400 mb-4">No playlist or album selected.</p>
        <button
          onClick={onBack}
          className={`px-4 py-2 ${designConfig.btnPrimary} text-xs`}
        >
          Return to Library
        </button>
      </div>
    );
  }

  const [tracks, setTracks] = useState<Track[]>(Array.isArray(item.tracks) ? item.tracks.filter(Boolean) : []);
  const [inViewSearch, setInViewSearch] = useState<string>("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);

  const filteredTracks = tracks.filter((track) => {
    if (!inViewSearch.trim()) return true;
    const term = inViewSearch.toLowerCase().trim();
    const titleMatch = (track.title || "").toLowerCase().includes(term);
    const artistMatch = (track.artist || "").toLowerCase().includes(term);
    return titleMatch || artistMatch;
  });

  const [isReorderMode, setIsReorderMode] = useState<boolean>(false);
  const [localTracks, setLocalTracks] = useState<Track[]>([]);
  const [openPlaylistDropdownId, setOpenPlaylistDropdownId] = useState<string | null>(null);
  const [isCustomCoverModalOpen, setIsCustomCoverModalOpen] = useState<boolean>(false);
  const [isLoadingTracks, setIsLoadingTracks] = useState<boolean>(!item.tracks || item.tracks.length === 0);

  // Check if this playlist has custom cover artwork
  const isCustomCover = React.useMemo(() => {
    if (isAlbum) return false;
    const pl = item as Playlist;
    const plId = pl.id || (pl as any).playlistId || "";
    const fromStore = getPlaylistCustomArtwork(plId);
    if (fromStore && isAuthenticCustomArtworkUrl(fromStore)) return true;
    if (pl.customArtwork && isAuthenticCustomArtworkUrl(pl.customArtwork)) return true;
    if (pl.customCoverUrl && isAuthenticCustomArtworkUrl(pl.customCoverUrl)) return true;
    if (pl.isCustomCover && pl.coverUrl && !isVideoThumbnailUrl(pl.coverUrl)) return true;
    return Boolean(pl.isCustomCover || pl.customCoverUrl || pl.customArtwork);
  }, [item, isAlbum]);

  // Always reset scroll position to the very top when opening or switching playlists/albums
  useLayoutEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
    const mainEl = document.querySelector("main");
    if (mainEl) mainEl.scrollTop = 0;
    const rootEl = document.documentElement || document.body;
    if (rootEl) rootEl.scrollTop = 0;
  }, [item?.id]);

  // Immediate local-first cache loading on mount or item change
  useEffect(() => {
    let isCurrent = true;
    const localCached = getCachedPlaylistTracks(item.id);
    if (localCached && localCached.length > 0) {
      setTracks(localCached);
      setIsLoadingTracks(false);
    } else if (item.tracks && item.tracks.length > 0) {
      setTracks(item.tracks.filter(Boolean));
      setIsLoadingTracks(false);
    } else if (item.id) {
      getCachedPlaylistTracksFromDB(item.id).then((cached) => {
        if (isCurrent && cached && cached.length > 0) {
          setTracks(cached);
          setIsLoadingTracks(false);
        }
      });
    }
    return () => {
      isCurrent = false;
    };
  }, [item.id, item.tracks]);

  // Execute silent background track fetch on open
  const executeSilentFetch = async () => {
    // Freeze background polling and auto-refetches while reorder mode is active
    if (isReorderMode) return;

    try {
      let activeToken = getStoredAuthToken() || getInMemoryToken() || "";

      const headers: Record<string, string> = {};
      if (activeToken) {
        headers["Authorization"] = `Bearer ${activeToken}`;
        headers["X-Access-Token"] = activeToken;
      }

      const titleParam = encodeURIComponent(item.title || "");
      const artistParam = encodeURIComponent((item as any).artist || (item as any).description || "");
      const typeParam = isAlbum ? "album" : "playlist";
      let res = await fetch(
        `/api/playlists/${item.id}/items?title=${titleParam}&artist=${artistParam}&type=${typeParam}&refresh=true&_t=${Date.now()}`,
        { headers }
      );
      if (!res.ok) {
        res = await fetch(
          `/api/youtube/playlists/${item.id}/items?title=${titleParam}&artist=${artistParam}&type=${typeParam}&refresh=true&_t=${Date.now()}`,
          { headers }
        );
      }
      const data = await res.json().catch(() => ({ tracks: [] }));
      if (data?.tracks && Array.isArray(data.tracks)) {
        const clean: Track[] = data.tracks
          .filter(Boolean)
          .map((t: any, idx: number) => {
            const vidId = t.youtubeVideoId || t.id;
            const uniqueId = t.playlistItemId || (t.id && !t.id.startsWith("http") && t.id !== vidId ? t.id : `${vidId || "track"}_${idx}`);
            return {
              ...t,
              id: uniqueId,
              playlistItemId: t.playlistItemId || (t.id && !t.id.startsWith("http") && t.id !== vidId ? t.id : undefined),
              youtubeVideoId: vidId || t.id,
            };
          });

        // Set authoritative YouTube tracks directly - preserves all songs and duplicates
        setTracks(clean);
        setCachedPlaylistTracks(item.id, clean);
        savePlaylistTracksToDBCache(item.id, clean);
      }
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.warn("Background tracks fetch warning:", err);
    } finally {
      setIsLoadingTracks(false);
    }
  };

  // Trigger silent track fetch immediately in background whenever this playlist is opened
  useEffect(() => {
    executeSilentFetch();
  }, [item.id]);

  const safeTracks = React.useMemo(() => (Array.isArray(tracks) ? tracks.filter(Boolean) : []), [tracks]);

  // Calculate total duration in minutes safely
  const totalDurationSecs = safeTracks.reduce((acc, t) => acc + (t?.duration || 210), 0);
  const durationMins = isNaN(totalDurationSecs) ? 0 : Math.max(0, Math.floor(totalDurationSecs / 60));

  const [isSyncingOrder, setIsSyncingOrder] = useState<boolean>(false);
  const initialTracksBeforeReorder = useRef<Track[]>([]);

  // Remove track
  const handleRemoveTrackInternal = (trackId: string, trackObj?: Track) => {
    const targetTrack = trackObj || tracks.find((t) => (t.id || t.youtubeVideoId) === trackId || (t as any).playlistItemId === trackId);
    const updated = tracks.filter((t) => {
      if (targetTrack && t === targetTrack) return false;
      const tVid = t.youtubeVideoId || t.id;
      return t.id !== trackId && tVid !== trackId && (t as any).playlistItemId !== trackId;
    });
    setTracks(updated);
    savePlaylistTracksToDBCache(item.id, updated);
    try {
      localStorage.setItem(`OBLIVION_PLAYLIST_CACHE_${item.id}`, JSON.stringify(updated));
      localStorage.setItem(`OBLIVION_PLAYLIST_CACHE_${item.id.replace(/^VL/, "")}`, JSON.stringify(updated));
    } catch {}

    if (isReorderMode) {
      setLocalTracks((prev) =>
        prev.filter((t) => {
          if (targetTrack && t === targetTrack) return false;
          const tVid = t.youtubeVideoId || t.id;
          return t.id !== trackId && tVid !== trackId && (t as any).playlistItemId !== trackId;
        })
      );
    }
    if (!isAlbum && onRemoveTrack) {
      const bestId = (targetTrack as any)?.playlistItemId || targetTrack?.youtubeVideoId || targetTrack?.id || trackId;
      onRemoveTrack(bestId, targetTrack);
    }
  };

  // Toggle Reorder Mode & Save/Sync
  const handleToggleReorderMode = async () => {
    if (isReorderMode) {
      await handleDoneReordering();
    } else {
      const currentList = safeTracks.length > 0 ? [...safeTracks] : [...(item.tracks || [])];
      initialTracksBeforeReorder.current = currentList;
      setLocalTracks(currentList);
      setIsReorderMode(true);
    }
  };

  // Save new layout and immediately push single batch commit to YouTube (optimistic local persistence only)
  const handleDoneReordering = async () => {
    if (isSyncingOrder) return;
    setIsSyncingOrder(true);
    const tracksToSave = localTracks.length > 0 ? localTracks : safeTracks;
    
    // 1. Commit to local UI tracks and write directly to persistent storage
    setTracks(tracksToSave);
    savePlaylistTracksToDBCache(item.id, tracksToSave);
    try {
      localStorage.setItem(`OBLIVION_PLAYLIST_CACHE_${item.id}`, JSON.stringify(tracksToSave));
      localStorage.setItem(`OBLIVION_PLAYLIST_CACHE_${item.id.replace(/^VL/, "")}`, JSON.stringify(tracksToSave));
    } catch {}

    try {
      if (!isAlbum && onReorderTracks) {
        await onReorderTracks(tracksToSave);
      }
    } catch (err) {
      console.error("Failed saving reordered tracks to YouTube:", err);
    } finally {
      setIsSyncingOrder(false);
      setIsReorderMode(false);
      setLocalTracks([]);
    }
  };

  // Discard changes
  const handleCancelReordering = () => {
    if (initialTracksBeforeReorder.current.length > 0) {
      setTracks(initialTracksBeforeReorder.current);
    }
    setLocalTracks([]);
    setIsReorderMode(false);
  };

  // Shuffle play all tracks in this playlist
  const handleShufflePlay = () => {
    if (tracks.length === 0) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    if (!isShuffle && onToggleShuffle) {
      onToggleShuffle();
    }
    onPlayQueue(shuffled, 0);
  };

  // Swipe-down gesture state for exiting Playlist/Album view back to previous screen
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartTime, setTouchStartTime] = useState<number>(0);
  const [dragOffsetY, setDragOffsetY] = useState<number>(0);
  const [isDraggingDown, setIsDraggingDown] = useState<boolean>(false);

  // Prevent following through scroll onto the new screen when gesture completes
  const lockScrollFollowThrough = (durationMs = 400) => {
    const initialScrollY = typeof window !== "undefined" ? window.scrollY : 0;
    const cancelTouchMove = (e: TouchEvent) => {
      if (e.cancelable) {
        e.preventDefault();
      }
    };
    const maintainScroll = () => {
      if (typeof window !== "undefined") {
        window.scrollTo(0, initialScrollY);
      }
    };
    const cancelWheel = (e: WheelEvent) => {
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    window.addEventListener("touchmove", cancelTouchMove, { passive: false });
    window.addEventListener("scroll", maintainScroll, { passive: true });
    window.addEventListener("wheel", cancelWheel, { passive: false });

    setTimeout(() => {
      window.removeEventListener("touchmove", cancelTouchMove);
      window.removeEventListener("scroll", maintainScroll);
      window.removeEventListener("wheel", cancelWheel);
    }, durationMs);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isReorderMode) return;
    if (e.touches.length !== 1) return;
    // Only allow swipe down if we are at the top of the viewport
    const currentScrollY = typeof window !== "undefined" ? window.scrollY : 0;
    if (currentScrollY > 10) return;

    const touch = e.touches[0];
    setTouchStartY(touch.clientY);
    setTouchStartX(touch.clientX);
    setTouchStartTime(Date.now());
    setIsDraggingDown(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isReorderMode) return;
    if (touchStartY === null || touchStartX === null) return;
    const currentScrollY = typeof window !== "undefined" ? window.scrollY : 0;
    if (currentScrollY > 10 && !isDraggingDown) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStartY;
    const deltaX = touch.clientX - touchStartX;

    // Only activate drag-down if pulling downwards and predominantly vertical
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
    if (isReorderMode) return;
    if (touchStartY === null) return;
    const touch = e.changedTouches[0];
    const deltaY = touch.clientY - touchStartY;
    const deltaX = touchStartX !== null ? touch.clientX - touchStartX : 0;
    const duration = Math.max(1, Date.now() - touchStartTime);
    const velocityY = deltaY / duration;

    // Exit view if swiped down past 75px or quick flick down > 35px
    if ((deltaY > 75 || (deltaY > 35 && velocityY > 0.35)) && deltaY > Math.abs(deltaX)) {
      lockScrollFollowThrough(400);
      onBack();
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
        opacity: dragOffsetY > 0 ? Math.max(0.65, 1 - dragOffsetY / 500) : 1,
        transition: isDraggingDown ? "none" : "transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.25s ease",
      }}
      className="flex-1 flex flex-col select-none pb-64 sm:pb-72 md:pb-52 will-change-transform"
    >
      {/* Top Sticky Header with Close (X) / Reorder Controls */}
      <div className={`playlist-action-toolbar flex flex-col shrink-0 transition-all`}>
        {/* Subtle pull handle for mobile gesture indicator (only when not reordering) */}
        {!isReorderMode && (
          <div className="w-8 h-1 rounded-full bg-zinc-400/40 mx-auto mb-1.5 sm:hidden" />
        )}

        {isReorderMode ? (
          /* Reorder Active Sticky Top Bar - Persistent at Top of Screen */
          <div className="flex items-center justify-between gap-2 sm:gap-3 w-full animate-fade-in">
            {/* Left: Cancel Button */}
            <button
              type="button"
              onClick={handleCancelReordering}
              disabled={isSyncingOrder}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold ${designConfig.btnSecondary} ${designConfig.textMuted} hover:${designConfig.textPrimary} border ${designConfig.borderSubtle} transition-all active:scale-95 shadow-sm shrink-0`}
              title="Discard reordering changes"
            >
              Cancel
            </button>

            {/* Center: Live Drag Badge & Tips */}
            <div className="flex items-center gap-2 min-w-0 text-center px-1">
              <div className={`p-1.5 rounded-lg ${designConfig.accentBg} text-white shrink-0 shadow-sm hidden xs:flex`}>
                <GripVertical className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col items-center min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs sm:text-sm font-extrabold ${designConfig.textPrimary} truncate`}>
                    Reorder Songs
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                    Live Drag
                  </span>
                </div>
                <span className={`text-[10px] ${designConfig.textMuted} hidden md:inline truncate`}>
                  Hold handle to lift • 2nd finger or mouse wheel to fast scroll
                </span>
              </div>
            </div>

            {/* Right: Done Reordering Button */}
            <button
              type="button"
              onClick={handleDoneReordering}
              disabled={isSyncingOrder}
              className={`px-3.5 sm:px-5 py-2 rounded-xl ${designConfig.btnPrimary} font-bold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shadow-lg ring-2 ${designConfig.accentBorder} transition-all active:scale-95 shrink-0`}
              title="Save and sync new order with YouTube"
            >
              {isSyncingOrder ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Done Reordering</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* Standard Header Bar with Search Field and Reorder Songs Button */
          <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3.5 w-full">
            <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-[200px] sm:min-w-[280px]">
              <button
                onClick={onBack}
                aria-label="Close view"
                className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${designConfig.btnSecondary} ${designConfig.textPrimary} text-sm font-semibold transition-all hover:scale-105 active:scale-95 shadow-sm shrink-0`}
                title="Close and go back (or swipe down)"
              >
                <X className="w-5 h-5" />
              </button>

              {/* In-Header Search Field */}
              <div className="flex-1 max-w-xl relative min-w-0">
                <Search className={`w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 ${designConfig.textMuted} pointer-events-none`} />
                <input
                  type="text"
                  value={inViewSearch}
                  onChange={(e) => setInViewSearch(e.target.value)}
                  placeholder={isAlbum ? "Search album tracks..." : "Search playlist songs..."}
                  className={`w-full pl-8 sm:pl-10 ${inViewSearch ? "pr-8 sm:pr-9" : "pr-3 sm:pr-4"} py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium ${designConfig.inputBg} border ${designConfig.borderSubtle} ${designConfig.textPrimary} placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[var(--accent-color,var(--primary))] shadow-sm transition-all`}
                />
                {inViewSearch && (
                  <button
                    type="button"
                    onClick={() => setInViewSearch("")}
                    className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full ${designConfig.textMuted} hover:${designConfig.textPrimary} hover:bg-black/10 transition-colors`}
                    title="Clear search filter"
                    aria-label="Clear search filter"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Reorder Songs Button - with explicit text "Reorder Songs", drops below on narrow screens if needed */}
            {!isAlbum && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleReorderMode}
                  disabled={isSyncingOrder}
                  className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all active:scale-95 shadow-sm whitespace-nowrap ${designConfig.btnSecondary} ${designConfig.textPrimary} border ${designConfig.borderSubtle} hover:${designConfig.accentText}`}
                  title="Reorder songs in this playlist"
                >
                  <ArrowUpDown className="w-4 h-4 shrink-0" />
                  <span>Reorder Songs</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto w-full">
        {/* Fresh Hero Card */}
        <div className={`relative overflow-hidden rounded-3xl ${designConfig.cardBg} border ${designConfig.accentBorder} p-6 sm:p-8 shadow-2xl transition-all`}>
          <div className="absolute top-0 right-0 w-96 h-96 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#c89b3c]/40 via-cyan-500/20 to-transparent blur-3xl"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6 sm:gap-8">
            {/* Playlist Cover Art */}
            <div className="relative group shrink-0">
              <PlaylistCoverArt
                playlist={item as Playlist}
                className={`w-44 h-44 sm:w-52 sm:h-52 rounded-2xl object-cover shadow-2xl border-2 ${designConfig.accentBorder} transition-transform duration-300 group-hover:scale-[1.02]`}
              />
            </div>

            {/* Playlist Information */}
            <div className="flex-1 text-center md:text-left space-y-3 min-w-0">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className={`px-3 py-1 rounded-full ${designConfig.pillBg} text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm`}>
                  {isAlbum ? <Layers className="w-3.5 h-3.5" /> : <Sparkles className={`w-3.5 h-3.5 ${designConfig.accentText}`} />}
                  {isAlbum ? "Official Album" : "YouTube Music Playlist"}
                </span>

                {/* Playlist Visibility Badge */}
                {!isAlbum && ((item as Playlist).privacy || (item as Playlist).privacyStatus) && (
                  <span className={`px-3 py-1 rounded-full ${designConfig.pillBg} text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm`}>
                    {((item as Playlist).privacy?.toUpperCase() === "PRIVATE" || (item as Playlist).privacyStatus?.toUpperCase() === "PRIVATE") ? (
                      <>
                        <Lock className="w-3.5 h-3.5 text-red-500" />
                        <span>Private</span>
                      </>
                    ) : ((item as Playlist).privacy?.toUpperCase() === "UNLISTED" || (item as Playlist).privacyStatus?.toUpperCase() === "UNLISTED") ? (
                      <>
                        <Link2 className="w-3.5 h-3.5 text-amber-500" />
                        <span>Unlisted</span>
                      </>
                    ) : (
                      <>
                        <Globe className={`w-3.5 h-3.5 ${designConfig.accentText}`} />
                        <span>Public</span>
                      </>
                    )}
                  </span>
                )}

                {/* Custom Artwork Badge (Shown inside Playlist View per user request) */}
                {!isAlbum && isCustomCover && (
                  <span className={`px-3 py-1 rounded-full ${designConfig.pillBg} text-[11px] font-mono font-bold tracking-wider flex items-center gap-1.5 shadow-sm`}>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Custom Cover</span>
                  </span>
                )}
              </div>

              <h1 className={`text-2xl sm:text-4xl font-extrabold ${designConfig.textPrimary} tracking-tight leading-tight line-clamp-2`}>
                {item.title}
              </h1>

              <p className={`text-sm ${designConfig.textSecondary} line-clamp-2 max-w-2xl font-normal`}>
                {(item as any).description || (isAlbum ? `Album by ${(item as Album).artist} • Released ${(item as Album).releaseYear}` : "Curated YouTube Music track collection.")}
              </p>

              <div className={`flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs ${designConfig.textSecondary} pt-1 font-mono`}>
                <span className={`font-semibold ${designConfig.accentText}`}>{tracks.length} Tracks</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  ~{durationMins} minutes
                </span>
                <span>•</span>
                <span>Lossless HD Audio</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className={`flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl ${designConfig.cardBg} border ${designConfig.borderSubtle} shadow-lg`}>
          {/* Left Action Buttons: Play All, Shuffle, Repeat, Reorder */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onPlayQueue(tracks, 0)}
              className={`px-5 py-2.5 rounded-xl ${designConfig.btnPrimary} font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Play All</span>
            </button>

            <button
              onClick={handleShufflePlay}
              className={`p-2.5 rounded-xl border transition-all ${
                isShuffle
                  ? `${designConfig.accentBorder} ${designConfig.accentBg} text-white shadow-md`
                  : `${designConfig.btnSecondary} ${designConfig.textMuted} hover:${designConfig.textPrimary}`
              }`}
              title={isShuffle ? "Shuffle is ON — Click to reshuffle & play" : "Turn Shuffle ON & Play Random Sequence"}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            {onToggleRepeat && (
              <button
                onClick={onToggleRepeat}
                className={`p-2.5 rounded-xl border transition-all ${
                  repeatMode !== "off"
                    ? `${designConfig.accentBorder} ${designConfig.accentBg} text-white shadow-md`
                    : `${designConfig.btnSecondary} ${designConfig.textMuted} hover:${designConfig.textPrimary}`
                }`}
                title={`Repeat Mode: ${repeatMode}`}
              >
                {repeatMode === "one" ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
              </button>
            )}
          </div>

          {/* Right Action Buttons: Edit details and Delete Playlist */}
          <div className="flex flex-col items-end gap-2">
            {!isAlbum && onEditPlaylist && (
              <button
                onClick={() => onEditPlaylist(item as Playlist)}
                className={`flex items-center gap-1.5 px-3 py-2 ${designConfig.btnSecondary} ${designConfig.textSecondary} hover:${designConfig.textPrimary} rounded-xl border border-transparent transition-colors text-xs font-semibold`}
                title="Edit Playlist Details"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Details</span>
              </button>
            )}
            {!isAlbum && (
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-600/15 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 hover:border-red-600 rounded-xl transition-all text-xs font-semibold shadow-sm active:scale-95"
                title="Delete Playlist"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Playlist</span>
              </button>
            )}
          </div>
        </div>

        {/* Songs List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-3 py-1">
            <h3 className={`text-sm font-bold ${designConfig.headingPrimary} uppercase tracking-wider font-mono`}>
              Tracks ({filteredTracks.length}{inViewSearch.trim() && filteredTracks.length !== tracks.length ? ` of ${tracks.length}` : ""})
            </h3>
            {isReorderMode && (
              <span className={`text-[11px] ${designConfig.accentText} font-medium animate-pulse`}>
                Drag handle or tap arrows to reposition songs, then click "Done Reordering"
              </span>
            )}
          </div>

          {isLoadingTracks ? (
            <div className={`p-16 text-center rounded-2xl ${designConfig.cardBg} border ${designConfig.borderSubtle} space-y-3 animate-fade-in`}>
              <Loader2 className={`w-8 h-8 mx-auto ${designConfig.accentText} text-[var(--accent-color,var(--primary))] animate-spin`} stroke="currentColor" />
              <p className={`text-sm font-semibold ${designConfig.textPrimary}`}>
                {isAlbum ? "Pulling album tracks from YouTube Music..." : "Loading playlist tracks..."}
              </p>
              <p className={`text-xs ${designConfig.textMuted}`}>Fetching lossless audio streams & metadata</p>
            </div>
          ) : tracks.length === 0 ? (
            <div className={`p-12 text-center rounded-2xl ${designConfig.cardBg} border ${designConfig.borderSubtle}`}>
              <Music2 className={`w-12 h-12 mx-auto mb-3 ${designConfig.textMuted}`} />
              <p className={`text-sm font-semibold ${designConfig.textPrimary}`}>This collection has no songs yet.</p>
              <p className={`text-xs ${designConfig.textMuted} mt-1`}>Search for songs or try refreshing.</p>
            </div>
          ) : filteredTracks.length === 0 ? (
            <div className={`p-12 text-center rounded-2xl ${designConfig.cardBg} border ${designConfig.borderSubtle} space-y-2`}>
              <Search className={`w-8 h-8 mx-auto ${designConfig.textMuted}`} />
              <p className={`text-sm font-bold ${designConfig.textPrimary}`}>No matching tracks found</p>
              <p className={`text-xs ${designConfig.textMuted}`}>
                No tracks in this {isAlbum ? "album" : "playlist"} match "{inViewSearch}".
              </p>
              <button
                type="button"
                onClick={() => setInViewSearch("")}
                className={`mt-2 px-3.5 py-1.5 rounded-xl ${designConfig.btnSecondary} ${designConfig.textPrimary} text-xs font-semibold hover:bg-white/10`}
              >
                Clear filter
              </button>
            </div>
          ) : (
            <PlaylistTrackList
              tracks={isReorderMode ? localTracks : safeTracks}
              isAlbum={isAlbum}
              item={item}
              isReorderMode={isReorderMode}
              inViewSearch={inViewSearch}
              currentTrackId={currentTrackId}
              isPlaying={isPlaying}
              playlists={playlists}
              designConfig={designConfig}
              onPlayTrack={onPlayTrack}
              onPlayQueue={onPlayQueue}
              onReorderTracks={(newTracks) => {
                if (isReorderMode) {
                  setLocalTracks(newTracks);
                } else {
                  setTracks(newTracks);
                  if (!isAlbum && onReorderTracks) {
                    onReorderTracks(newTracks);
                  }
                }
              }}
              onRemoveTrack={handleRemoveTrackInternal}
              onOpenAddToPlaylistModal={onOpenAddToPlaylistModal}
              onAddTrackToPlaylist={onAddTrackToPlaylist}
            />
          )}
        </div>
      </div>

      {/* YouTube Custom Cover Action Sheet Modal */}
      {!isAlbum && (
        <PlaylistCustomCoverModal
          isOpen={isCustomCoverModalOpen}
          onClose={() => setIsCustomCoverModalOpen(false)}
          playlist={item as Playlist}
          onUpdateCover={(newCoverUrl, isCustom) => {
            if (onUpdateCover) {
              onUpdateCover(newCoverUrl, isCustom);
            }
          }}
          designConfig={designConfig}
        />
      )}

      {/* Delete Playlist Confirmation Modal */}
      {!isAlbum && isDeleteModalOpen && (
        <DeletePlaylistModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          playlistId={item.id}
          playlistTitle={item.title}
          onSuccessNavigate={() => {
            if (onDeletePlaylist) {
              onDeletePlaylist(item.id);
            }
            if (onBackToLibrary) {
              onBackToLibrary();
            } else {
              onBack();
            }
          }}
          designConfig={designConfig}
        />
      )}
    </div>
  );
};
