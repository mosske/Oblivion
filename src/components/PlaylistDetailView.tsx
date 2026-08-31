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
  Link2
} from "lucide-react";
import { cleanTrackTitle } from "../utils/formatters";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";
import { PlaylistCustomCoverModal } from "./PlaylistCustomCoverModal";
import { PlaylistCoverArt } from "./PlaylistCoverArt";
import { MarqueeText } from "./MarqueeText";

interface PlaylistDetailViewProps {
  item: Playlist | Album;
  isAlbum?: boolean;
  onBack: () => void;
  onPlayTrack: (track: Track) => void;
  onPlayQueue: (tracks: Track[], startIndex: number) => void;
  onEditPlaylist?: (playlist: Playlist) => void;
  onUpdateCover?: (coverUrl: string, isCustom: boolean) => void;
  onReorderTracks?: (newTracks: Track[]) => void;
  onRemoveTrack?: (trackId: string) => void;
  onSyncToYouTube?: (tracks: Track[]) => Promise<any>;
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
  isSyncingLive?: boolean;
  onSyncLive?: () => void;
}

export const PlaylistDetailView: React.FC<PlaylistDetailViewProps> = ({
  item,
  isAlbum = false,
  onBack,
  onPlayTrack,
  onPlayQueue,
  onEditPlaylist,
  onUpdateCover,
  onReorderTracks,
  onRemoveTrack,
  onSyncToYouTube,
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
  isSyncingLive = false,
  onSyncLive,
}) => {
  if (!item) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
        <p className="text-sm text-slate-400 mb-4">No playlist or album selected.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-[#c89b3c] hover:bg-[#b58b34] text-slate-950 font-bold rounded-xl text-xs"
        >
          Return to Library
        </button>
      </div>
    );
  }

  const [tracks, setTracks] = useState<Track[]>(Array.isArray(item.tracks) ? item.tracks.filter(Boolean) : []);
  const [isInternalSyncing, setIsInternalSyncing] = useState<boolean>(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);

  const [isReorderMode, setIsReorderMode] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessBanner, setSaveSuccessBanner] = useState<boolean>(false);
  const [openPlaylistDropdownId, setOpenPlaylistDropdownId] = useState<string | null>(null);
  const [isCustomCoverModalOpen, setIsCustomCoverModalOpen] = useState<boolean>(false);
  const [isLoadingTracks, setIsLoadingTracks] = useState<boolean>(!item.tracks || item.tracks.length === 0);

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

  // Sync state if props item changes
  useEffect(() => {
    if (item.tracks && item.tracks.length > 0) {
      setTracks(item.tracks.filter(Boolean));
      setIsLoadingTracks(false);
    }
  }, [item.tracks]);

  // Execute sync check with YouTube Music on open or when triggered
  const executeSyncCheck = async () => {
    if (onSyncLive) {
      onSyncLive();
    }
    setIsInternalSyncing(true);
    try {
      let activeToken = "";
      try {
        const saved = localStorage.getItem("oblivion_saved_user");
        if (saved) {
          const parsed = JSON.parse(saved);
          activeToken = parsed?.accessToken || "";
        }
      } catch {}

      const headers: Record<string, string> = {};
      if (activeToken) {
        headers["Authorization"] = `Bearer ${activeToken}`;
      }

      const titleParam = encodeURIComponent(item.title || "");
      const artistParam = encodeURIComponent((item as any).artist || (item as any).description || "");
      const typeParam = isAlbum ? "album" : "playlist";
      const res = await fetch(
        `/api/youtube/playlists/${item.id}/items?title=${titleParam}&artist=${artistParam}&type=${typeParam}&refresh=true&_t=${Date.now()}`,
        { headers }
      );
      const data = await res.json().catch(() => ({ tracks: [] }));
      if (data?.tracks && Array.isArray(data.tracks)) {
        const clean: Track[] = data.tracks
          .filter(Boolean)
          .map((t: any, idx: number) => {
            const vidId = t.youtubeVideoId || t.id;
            return {
              ...t,
              id: t.id ? String(t.id) : (vidId ? `${vidId}_${idx}` : `track_${idx}`),
              youtubeVideoId: vidId || t.id,
            };
          });

        // Merge with existing in-memory tracks if any are missing from the network response
        const liveVidIds = new Set(clean.map((t) => (t.youtubeVideoId || t.id || "").replace(/^VL/, "")));
        const missingLocalTracks = (item.tracks || []).filter((t) => {
          const vId = (t.youtubeVideoId || t.id || "").replace(/^VL/, "");
          return vId && !liveVidIds.has(vId);
        });

        const merged = missingLocalTracks.length > 0 ? [...clean, ...missingLocalTracks] : clean;
        setTracks(merged);
        if (onReorderTracks) {
          onReorderTracks(merged);
        }
      }
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.warn("Sync with YouTube Music failed:", err);
    } finally {
      setIsInternalSyncing(false);
      setIsLoadingTracks(false);
    }
  };

  // Trigger sync check immediately whenever this playlist is opened
  useEffect(() => {
    executeSyncCheck();
  }, [item.id]);

  const safeTracks = React.useMemo(() => (Array.isArray(tracks) ? tracks.filter(Boolean) : []), [tracks]);

  // Calculate total duration in minutes safely
  const totalDurationSecs = safeTracks.reduce((acc, t) => acc + (t?.duration || 210), 0);
  const durationMins = isNaN(totalDurationSecs) ? 0 : Math.max(0, Math.floor(totalDurationSecs / 60));

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Drag and drop handlers for song reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      handleDragEnd();
      return;
    }
    const newTracks = [...tracks];
    const [movedTrack] = newTracks.splice(draggedIndex, 1);
    newTracks.splice(targetIndex, 0, movedTrack);
    setTracks(newTracks);
    if (!isAlbum && onReorderTracks) {
      onReorderTracks(newTracks);
    }
    handleDragEnd();
  };

  // Quick arrow shift handlers for touch & click
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newTracks = [...tracks];
    const temp = newTracks[index];
    newTracks[index] = newTracks[index - 1];
    newTracks[index - 1] = temp;
    setTracks(newTracks);
    if (!isAlbum && onReorderTracks) {
      onReorderTracks(newTracks);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index >= tracks.length - 1) return;
    const newTracks = [...tracks];
    const temp = newTracks[index];
    newTracks[index] = newTracks[index + 1];
    newTracks[index + 1] = temp;
    setTracks(newTracks);
    if (!isAlbum && onReorderTracks) {
      onReorderTracks(newTracks);
    }
  };

  // Remove track
  const handleRemoveTrackInternal = (trackId: string) => {
    const updated = tracks.filter((t) => (t.id || t.youtubeVideoId) !== trackId);
    setTracks(updated);
    if (!isAlbum && onRemoveTrack) {
      onRemoveTrack(trackId);
    }
  };

  // Save / Commit changes to YouTube Music backend
  const handleSaveToYouTube = async () => {
    if (isAlbum || !onSyncToYouTube) return;
    setIsSaving(true);
    try {
      await onSyncToYouTube(tracks);
      setSaveSuccessBanner(true);
      setTimeout(() => setSaveSuccessBanner(false), 3500);
    } catch (err) {
      console.error("Save to YouTube failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // When Done Reordering is clicked, exit reorder mode and sync new order to YouTube
  const handleToggleReorderMode = async () => {
    if (isReorderMode) {
      setIsReorderMode(false);
      await handleSaveToYouTube();
    } else {
      setIsReorderMode(true);
    }
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
      {/* Top Sticky Header with Close (X) Button */}
      <div className={`sticky top-14 sm:top-16 z-20 flex flex-col px-4 sm:px-6 py-2 sm:py-2.5 ${designConfig.headerBg} backdrop-blur-xl border-b ${designConfig.borderSubtle} shadow-sm shrink-0`}>
        {/* Subtle pull handle for mobile gesture indicator */}
        <div className="w-8 h-1 rounded-full bg-zinc-400/40 mx-auto mb-1.5 sm:hidden" />

        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            aria-label="Close view"
            className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${designConfig.btnSecondary} ${designConfig.textPrimary} text-sm font-semibold transition-all hover:scale-105 active:scale-95 shadow-sm`}
            title="Close and go back (or swipe down)"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            {saveSuccessBanner && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Saved & Synced to YouTube Music!</span>
              </div>
            )}

            {/* Live Sync Check Button */}
            <button
              onClick={executeSyncCheck}
              disabled={isInternalSyncing || isSyncingLive}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${designConfig.btnSecondary} ${designConfig.textPrimary} border ${designConfig.borderSubtle} text-xs font-semibold shadow-sm transition-all hover:scale-105 active:scale-95`}
              title="Sync with YouTube Music to fetch latest songs"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isInternalSyncing || isSyncingLive ? "animate-spin text-[#c89b3c]" : "text-[#c89b3c]"
                }`}
              />
              <span>{isInternalSyncing || isSyncingLive ? "Syncing..." : "Sync with YouTube"}</span>
            </button>

            {!isAlbum && (
              <button
                onClick={handleSaveToYouTube}
                disabled={isSaving}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl ${designConfig.btnPrimary} text-xs font-semibold shadow-md transition-all active:scale-95`}
                title="Save and commit all changes to YouTube Music"
              >
                <Save className={`w-3.5 h-3.5 ${isSaving ? "animate-spin" : ""}`} />
                <span>{isSaving ? "Saving..." : "Save to YouTube"}</span>
              </button>
            )}

            {!isAlbum && (
              <button
                onClick={handleToggleReorderMode}
                disabled={isSaving}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all active:scale-95 shadow-sm ${
                  isReorderMode
                    ? "bg-[#c89b3c] text-white border-[#c89b3c] shadow-lg ring-2 ring-[#c89b3c]/40 font-bold"
                    : `${designConfig.btnSecondary} ${designConfig.textPrimary} border ${designConfig.borderSubtle}`
                }`}
                title={isReorderMode ? "Finish reordering and save to YouTube" : "Reorder songs in this playlist"}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Syncing...</span>
                  </>
                ) : isReorderMode ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Done Reordering</span>
                  </>
                ) : (
                  <>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    <span>Reorder Songs</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
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
                        <Globe className="w-3.5 h-3.5 text-[#c89b3c]" />
                        <span>Public</span>
                      </>
                    )}
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
                <span className="font-semibold text-[#c89b3c]">{tracks.length} Tracks</span>
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
          {/* Left Action Buttons: Play All, Shuffle, Repeat */}
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

          {/* Right Action Buttons: Edit details */}
          <div className="flex flex-wrap items-center gap-2">
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
          </div>
        </div>

        {/* Songs List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-3 py-1">
            <h3 className={`text-sm font-bold ${designConfig.headingPrimary} uppercase tracking-wider font-mono`}>
              Tracks ({tracks.length})
            </h3>
            {isReorderMode && (
              <span className="text-[11px] text-[#c89b3c] font-medium animate-pulse">
                Drag handle or tap arrows to reposition songs, then click "Done Reordering"
              </span>
            )}
          </div>

          {isLoadingTracks ? (
            <div className={`p-16 text-center rounded-2xl ${designConfig.cardBg} border ${designConfig.borderSubtle} space-y-3 animate-fade-in`}>
              <Loader2 className="w-8 h-8 mx-auto text-[#c89b3c] animate-spin" />
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
          ) : (
            <div className="space-y-1.5">
              {tracks.map((track, idx) => {
                const trId = track.id || track.youtubeVideoId;
                const isCurrent = currentTrackId === trId;
                const isBeingDragged = draggedIndex === idx;
                const isDropTarget = dragOverIndex === idx && draggedIndex !== idx;

                return (
                  <div
                    key={`${trId || 'tr'}_${idx}`}
                    draggable={isReorderMode}
                    onDragStart={(e) => isReorderMode && handleDragStart(e, idx)}
                    onDragOver={(e) => isReorderMode && handleDragOver(e, idx)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => isReorderMode && handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`group relative flex items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all ${
                      isReorderMode ? "cursor-grab active:cursor-grabbing border border-[#c89b3c]/30" : ""
                    } ${
                      isBeingDragged
                        ? "opacity-40 scale-[0.98] border-2 border-dashed border-[#c89b3c]"
                        : isDropTarget
                        ? "ring-2 ring-[#c89b3c] scale-[1.01] bg-[#c89b3c]/10 shadow-lg"
                        : isCurrent
                        ? `${designConfig.cardBg} ring-1.5 ${designConfig.accentBorder} shadow-md`
                        : `${designConfig.cardBg} ${designConfig.cardHover}`
                    }`}
                  >
                    {/* Left: Index / Play / Cover / Track Details */}
                    <div
                      onClick={() => {
                        if (!isReorderMode) {
                          onPlayQueue(tracks, idx);
                        }
                      }}
                      className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 cursor-pointer"
                    >
                      {/* Track number or active equalizer */}
                      <div className="w-6 text-center shrink-0">
                        {isCurrent && isPlaying ? (
                          <div className="flex items-end justify-center gap-0.5 h-4">
                            <span className="w-1 bg-[#c89b3c] animate-bounce h-3 rounded-full"></span>
                            <span className="w-1 bg-[#c89b3c] animate-bounce delay-75 h-4 rounded-full"></span>
                            <span className="w-1 bg-[#c89b3c] animate-bounce delay-150 h-2 rounded-full"></span>
                          </div>
                        ) : (
                          <span className={`text-xs font-mono font-medium ${isCurrent ? designConfig.accentText : designConfig.textMuted}`}>
                            {idx + 1}
                          </span>
                        )}
                      </div>

                      {/* Thumbnail Cover */}
                      <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 shadow-sm border border-black/10 bg-slate-800 flex items-center justify-center">
                        <img
                          src={track.coverUrl || (track.youtubeVideoId || track.id ? `https://i.ytimg.com/vi/${track.youtubeVideoId || track.id}/hqdefault.jpg` : "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80")}
                          alt={track.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          onError={(e) => {
                            const currentSrc = e.currentTarget.src || "";
                            const vId = track.youtubeVideoId || track.id;
                            if (vId && (currentSrc.includes("maxresdefault.jpg") || currentSrc.includes("sddefault.jpg"))) {
                              e.currentTarget.src = `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`;
                            } else if (vId && currentSrc.includes("hqdefault.jpg")) {
                              e.currentTarget.src = `https://i.ytimg.com/vi/${vId}/mqdefault.jpg`;
                            } else if (vId && currentSrc.includes("mqdefault.jpg")) {
                              e.currentTarget.src = `https://i.ytimg.com/vi/${vId}/default.jpg`;
                            } else {
                              e.currentTarget.src = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80";
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Play className="w-4 h-4 text-white fill-white" />
                        </div>
                      </div>

                      {/* Title & Artist */}
                      <div className="flex-1 min-w-0">
                        <MarqueeText
                          text={cleanTrackTitle(track.title)}
                          className={`text-xs sm:text-sm font-semibold ${
                            isCurrent ? designConfig.accentText : designConfig.textPrimary
                          } group-hover:${designConfig.accentText} transition-colors`}
                          containerClassName="w-full"
                          speed={30}
                        />
                        <MarqueeText
                          text={track.artist || (isAlbum ? (item as Album).artist : "Unknown Artist")}
                          className={`text-[11px] sm:text-xs ${designConfig.textMuted}`}
                          containerClassName="w-full"
                          speed={26}
                        />
                      </div>
                    </div>

                    {/* Right Controls: Duration, Move Arrows, Drag Handle, Add/Remove */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <span className={`text-[11px] sm:text-xs font-mono ${designConfig.textMuted}`}>
                        {track.duration && track.duration > 0
                          ? `${Math.floor(track.duration / 60)}:${String(Math.floor(track.duration % 60)).padStart(2, "0")}`
                          : "--:--"}
                      </span>

                      {/* Move Up / Down and Drag Handles in Reorder Mode */}
                      {isReorderMode && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveUp(idx);
                            }}
                            disabled={idx === 0}
                            className="p-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none text-zinc-200 transition-colors"
                            title="Move Up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveDown(idx);
                            }}
                            disabled={idx === tracks.length - 1}
                            className="p-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none text-zinc-200 transition-colors"
                            title="Move Down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <div
                            className="flex items-center gap-1 px-2 py-1 bg-[#c89b3c]/20 border border-[#c89b3c]/40 text-[#c89b3c] rounded-lg cursor-grab active:cursor-grabbing hover:bg-[#c89b3c]/30 transition-all shadow-sm select-none"
                            title="Drag to reorder"
                          >
                            <GripVertical className="w-3.5 h-3.5 shrink-0" />
                            <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Drag</span>
                          </div>
                        </div>
                      )}

                      {/* Add to another playlist */}
                      {!isReorderMode && (onOpenAddToPlaylistModal || onAddTrackToPlaylist) && (
                        <button
                          id={`playlist-detail-add-track-btn-${trId}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenAddToPlaylistModal) {
                              onOpenAddToPlaylistModal(track);
                            } else if (onAddTrackToPlaylist && playlists.length > 0) {
                              onAddTrackToPlaylist(track, playlists[0].id);
                            }
                          }}
                          className={`p-1.5 ${designConfig.textMuted} hover:${designConfig.textPrimary} hover:text-[#c89b3c] rounded-lg hover:bg-black/10 transition-colors`}
                          title="Add to another playlist"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}

                      {/* Remove Song from Playlist */}
                      {!isAlbum && onRemoveTrack && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Remove "${track.title}" from this playlist?`)) {
                              handleRemoveTrackInternal(trId);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Remove Song"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
    </div>
  );
};
