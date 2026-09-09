import React, { useState, useRef, useEffect, useCallback } from "react";
import { Track, Playlist, Album } from "../types";
import {
  GripVertical,
  Play,
  Trash2,
  Plus,
  ChevronUp,
  ChevronDown,
  Music2,
  Check,
} from "lucide-react";
import { cleanTrackTitle } from "../utils/formatters";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";
import { MarqueeText } from "./MarqueeText";

export interface PlaylistTrackListProps {
  tracks: Track[];
  isAlbum?: boolean;
  item?: Playlist | Album;
  isReorderMode?: boolean;
  inViewSearch?: string;
  currentTrackId?: string;
  isPlaying?: boolean;
  playlists?: Playlist[];
  designConfig?: FullAppDesignConfig;
  onPlayTrack?: (track: Track) => void;
  onPlayQueue: (tracks: Track[], startIndex: number) => void;
  onReorderTracks?: (newTracks: Track[], targetPosition?: number) => void;
  onRemoveTrack?: (trackId: string) => void;
  onOpenAddToPlaylistModal?: (track: Track) => void;
  onAddTrackToPlaylist?: (track: Track, playlistId: string) => void;
}

export const PlaylistTrackList: React.FC<PlaylistTrackListProps> = ({
  tracks,
  isAlbum = false,
  item,
  isReorderMode = false,
  inViewSearch = "",
  currentTrackId,
  isPlaying = false,
  playlists = [],
  designConfig = FULL_APP_DESIGNS["designer"],
  onPlayTrack,
  onPlayQueue,
  onReorderTracks,
  onRemoveTrack,
  onOpenAddToPlaylistModal,
  onAddTrackToPlaylist,
}) => {
  // HTML5 Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Native Touch Drag state for mobile reordering
  const [touchDragIndex, setTouchDragIndex] = useState<number | null>(null);
  const [touchTargetIndex, setTouchTargetIndex] = useState<number | null>(null);
  const [touchCurrentY, setTouchCurrentY] = useState<number>(0);
  const [touchStartY, setTouchStartY] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Filtered tracks based on in-page search
  const filteredTracks = tracks.filter((track) => {
    if (!inViewSearch.trim()) return true;
    const term = inViewSearch.toLowerCase().trim();
    const titleMatch = (track.title || "").toLowerCase().includes(term);
    const artistMatch = (track.artist || "").toLowerCase().includes(term);
    return titleMatch || artistMatch;
  });

  const isSearchActive = inViewSearch.trim().length > 0;
  const canReorder = isReorderMode && !isAlbum && !isSearchActive && tracks.length > 1;

  // HTML5 Drag Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!canReorder) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!canReorder) return;
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
    if (!canReorder || draggedIndex === null || draggedIndex === targetIndex) {
      handleDragEnd();
      return;
    }
    const newTracks = [...tracks];
    const [movedTrack] = newTracks.splice(draggedIndex, 1);
    newTracks.splice(targetIndex, 0, movedTrack);
    if (onReorderTracks) {
      onReorderTracks(newTracks, targetIndex);
    }
    handleDragEnd();
  };

  // Quick move handlers for accessible step-by-step reordering
  const handleMoveUp = (index: number) => {
    if (!canReorder || index <= 0) return;
    const newTracks = [...tracks];
    const temp = newTracks[index];
    newTracks[index] = newTracks[index - 1];
    newTracks[index - 1] = temp;
    if (onReorderTracks) {
      onReorderTracks(newTracks, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (!canReorder || index >= tracks.length - 1) return;
    const newTracks = [...tracks];
    const temp = newTracks[index];
    newTracks[index] = newTracks[index + 1];
    newTracks[index + 1] = temp;
    if (onReorderTracks) {
      onReorderTracks(newTracks, index + 1);
    }
  };

  // Native Touch Drag Reordering Handlers (touch-action: none on drag handle)
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    if (!canReorder) return;
    // Stop propagation so top-level swipe gestures don't intercept touch reordering
    e.stopPropagation();

    const touch = e.touches[0];
    if (!touch) return;

    setTouchDragIndex(index);
    setTouchTargetIndex(index);
    setTouchStartY(touch.clientY);
    setTouchCurrentY(touch.clientY);

    // Light haptic feedback if supported
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(20);
      } catch {}
    }
  };

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (touchDragIndex === null || !canReorder) return;
      e.preventDefault();
      e.stopPropagation();

      const touch = e.touches[0];
      if (!touch) return;
      setTouchCurrentY(touch.clientY);

      // Find which track row is under the touch point using element bounding boxes
      let closestIndex = touchDragIndex;
      let minDistance = Infinity;

      rowRefs.current.forEach((el, idx) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const middleY = rect.top + rect.height / 2;
        const dist = Math.abs(touch.clientY - middleY);
        if (dist < minDistance) {
          minDistance = dist;
          closestIndex = idx;
        }
      });

      if (closestIndex !== touchTargetIndex && closestIndex >= 0 && closestIndex < tracks.length) {
        setTouchTargetIndex(closestIndex);
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          try {
            navigator.vibrate(8);
          } catch {}
        }
      }
    },
    [touchDragIndex, touchTargetIndex, canReorder, tracks.length]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (touchDragIndex === null) return;
      e.stopPropagation();

      if (
        touchTargetIndex !== null &&
        touchDragIndex !== touchTargetIndex &&
        touchTargetIndex >= 0 &&
        touchTargetIndex < tracks.length
      ) {
        const newTracks = [...tracks];
        const [movedTrack] = newTracks.splice(touchDragIndex, 1);
        newTracks.splice(touchTargetIndex, 0, movedTrack);

        if (onReorderTracks) {
          onReorderTracks(newTracks, touchTargetIndex);
        }

        if (typeof navigator !== "undefined" && navigator.vibrate) {
          try {
            navigator.vibrate(15);
          } catch {}
        }
      }

      setTouchDragIndex(null);
      setTouchTargetIndex(null);
      setTouchStartY(0);
      setTouchCurrentY(0);
    },
    [touchDragIndex, touchTargetIndex, tracks, onReorderTracks]
  );

  // Register window-level non-passive touch listeners during touch drag
  useEffect(() => {
    if (touchDragIndex !== null) {
      const options = { passive: false };
      window.addEventListener("touchmove", handleTouchMove, options);
      window.addEventListener("touchend", handleTouchEnd, options);
      window.addEventListener("touchcancel", handleTouchEnd, options);

      return () => {
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleTouchEnd);
        window.removeEventListener("touchcancel", handleTouchEnd);
      };
    }
  }, [touchDragIndex, handleTouchMove, handleTouchEnd]);

  if (filteredTracks.length === 0) {
    return (
      <div className={`p-10 text-center rounded-3xl ${designConfig.cardBg} border border-dashed ${designConfig.borderSubtle} space-y-3`}>
        <Music2 className={`w-10 h-10 ${designConfig.textMuted} mx-auto opacity-40`} />
        <p className={`text-sm font-semibold ${designConfig.textPrimary}`}>
          {isSearchActive ? "No matching songs found in this playlist" : "This playlist is currently empty"}
        </p>
        <p className={`text-xs ${designConfig.textMuted}`}>
          {isSearchActive ? "Try searching with a different song title or artist" : "Add songs from Search or Explore to get started!"}
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-1.5 w-full relative">
      {filteredTracks.map((track, idx) => {
        const trId = track.id || track.youtubeVideoId || `track_${idx}`;
        const isCurrent =
          currentTrackId &&
          (track.id === currentTrackId ||
            track.youtubeVideoId === currentTrackId ||
            (track as any).playlistItemId === currentTrackId);

        const isHtml5Dragging = draggedIndex === idx;
        const isHtml5DropTarget = dragOverIndex === idx && draggedIndex !== idx;

        const isTouchDragging = touchDragIndex === idx;
        const isTouchDropTarget = touchTargetIndex === idx && touchDragIndex !== idx;

        const isBeingDragged = isHtml5Dragging || isTouchDragging;
        const isDropTarget = isHtml5DropTarget || isTouchDropTarget;

        const touchDeltaY = isTouchDragging ? touchCurrentY - touchStartY : 0;

        return (
          <div
            key={`${trId}_${idx}`}
            ref={(el) => {
              if (el) rowRefs.current.set(idx, el);
              else rowRefs.current.delete(idx);
            }}
            draggable={canReorder}
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
            style={{
              transform: isTouchDragging
                ? `translate3d(0, ${touchDeltaY}px, 0) scale(1.02)`
                : undefined,
              zIndex: isTouchDragging ? 50 : undefined,
            }}
            className={`group relative flex items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all select-none border ${
              canReorder ? "cursor-grab active:cursor-grabbing" : ""
            } ${
              isBeingDragged
                ? `opacity-60 scale-[0.99] border-2 border-dashed ${designConfig.accentBorder} shadow-2xl bg-black/40`
                : isDropTarget
                ? `ring-2 ${designConfig.accentBorder} scale-[1.01] ${designConfig.pillBg} shadow-lg`
                : isCurrent
                ? `${designConfig.cardBg} ring-1.5 ${designConfig.accentBorder} shadow-md`
                : `${designConfig.cardBg} ${designConfig.cardHover} ${designConfig.borderSubtle}`
            }`}
          >
            {/* Left: Index / Play / Cover / Track Details */}
            <div
              onClick={() => {
                if (!isReorderMode) {
                  onPlayQueue(filteredTracks, idx);
                }
              }}
              className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 cursor-pointer"
            >
              {/* Track number or active equalizer */}
              <div className="w-6 text-center shrink-0">
                {isCurrent && isPlaying ? (
                  <div className="flex items-end justify-center gap-0.5 h-4" title="Currently Playing">
                    <span className={`w-1 h-3 rounded-full animate-bounce bg-gradient-to-t ${designConfig.waveformGradient || "from-[#c59b27] to-[#f59e0b]"} shadow-[0_0_6px_var(--accent-primary)]`} />
                    <span className={`w-1 h-4 rounded-full animate-bounce delay-75 bg-gradient-to-t ${designConfig.waveformGradient || "from-[#c59b27] to-[#f59e0b]"} shadow-[0_0_6px_var(--accent-primary)]`} />
                    <span className={`w-1 h-2 rounded-full animate-bounce delay-150 bg-gradient-to-t ${designConfig.waveformGradient || "from-[#c59b27] to-[#f59e0b]"} shadow-[0_0_6px_var(--accent-primary)]`} />
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
                  src={
                    track.coverUrl ||
                    (track.youtubeVideoId || track.id
                      ? `https://i.ytimg.com/vi/${track.youtubeVideoId || track.id}/hqdefault.jpg`
                      : "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80")
                  }
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

              {/* Reorder Mode Controls (Arrows + Touch-Compatible Drag Handle) */}
              {canReorder && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveUp(idx);
                    }}
                    disabled={idx === 0}
                    className="p-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none text-zinc-200 transition-colors"
                    title="Move Up"
                    aria-label="Move Up"
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
                    aria-label="Move Down"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Drag Handle with touch-action: none for native touchscreen drag */}
                  <div
                    onTouchStart={(e) => handleTouchStart(e, idx)}
                    style={{ touchAction: "none" }}
                    className={`flex items-center gap-1 px-2.5 py-1.5 ${designConfig.pillBg} border ${designConfig.accentBorder} ${designConfig.accentText} rounded-xl cursor-grab active:cursor-grabbing hover:opacity-90 transition-all shadow-sm select-none`}
                    title="Drag to reorder"
                    role="button"
                    tabIndex={0}
                    aria-label={`Drag to reorder song ${idx + 1}`}
                  >
                    <GripVertical className="w-4 h-4 shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Drag</span>
                  </div>
                </div>
              )}

              {/* Add to another playlist */}
              {!isReorderMode && (onOpenAddToPlaylistModal || onAddTrackToPlaylist) && (
                <button
                  id={`playlist-track-add-btn-${trId}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenAddToPlaylistModal) {
                      onOpenAddToPlaylistModal(track);
                    } else if (onAddTrackToPlaylist && playlists.length > 0) {
                      onAddTrackToPlaylist(track, playlists[0].id);
                    }
                  }}
                  className={`p-1.5 ${designConfig.textMuted} hover:${designConfig.textPrimary} hover:${designConfig.accentText} rounded-lg hover:bg-black/10 transition-colors`}
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
                      onRemoveTrack(trId);
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
  );
};
