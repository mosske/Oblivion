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
  Sparkles,
  ArrowUpDown,
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
  onReorderTracks?: (newTracks: Track[]) => void;
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
  // Lift & Drag state for reordering
  const [liftedIndex, setLiftedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [pointerY, setPointerY] = useState<number>(0);
  const [dragHandleOffsetY, setDragHandleOffsetY] = useState<number>(25);
  const [liftedItemWidth, setLiftedItemWidth] = useState<number>(0);
  const [liftedItemLeft, setLiftedItemLeft] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const activePointerIdRef = useRef<number | null>(null);
  const autoScrollRafRef = useRef<number | null>(null);
  const scrollSpeedRef = useRef<number>(0);

  // Keep tracks in ref for stable event handlers
  const tracksRef = useRef<Track[]>(tracks);
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  const onReorderTracksRef = useRef(onReorderTracks);
  useEffect(() => {
    onReorderTracksRef.current = onReorderTracks;
  }, [onReorderTracks]);

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

  // Calculate target drop index based on current pointer Y and row element bounds
  const updateDropTarget = useCallback((currentY: number) => {
    if (liftedIndex === null) return;

    let closestIdx = liftedIndex;
    let minDistance = Infinity;

    rowRefs.current.forEach((el, idx) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const middleY = rect.top + rect.height / 2;
      const distance = Math.abs(currentY - middleY);

      if (distance < minDistance) {
        minDistance = distance;
        closestIdx = idx;
      }
    });

    if (closestIdx >= 0 && closestIdx < tracksRef.current.length) {
      setDropTargetIndex(closestIdx);
    }
  }, [liftedIndex]);

  // Auto-scroll loop when hovering near viewport edges while dragging
  const startAutoScrollLoop = useCallback(() => {
    if (autoScrollRafRef.current) return;

    const loop = () => {
      if (scrollSpeedRef.current !== 0) {
        window.scrollBy({ top: scrollSpeedRef.current, behavior: "auto" });
      }
      autoScrollRafRef.current = requestAnimationFrame(loop);
    };

    autoScrollRafRef.current = requestAnimationFrame(loop);
  }, []);

  const stopAutoScrollLoop = useCallback(() => {
    if (autoScrollRafRef.current) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
    scrollSpeedRef.current = 0;
  }, []);

  // Pointer Down on Drag Handle (Initiates Lift & Drag)
  const handlePointerDown = (e: React.PointerEvent, index: number) => {
    if (!canReorder) return;
    if (e.button !== 0) return; // Primary button only

    // Stop propagation so parent scroll or swipe handlers don't take over
    e.stopPropagation();

    const rowEl = rowRefs.current.get(index);
    const rect = rowEl?.getBoundingClientRect();

    activePointerIdRef.current = e.pointerId;
    setLiftedIndex(index);
    setDropTargetIndex(index);
    setPointerY(e.clientY);
    setDragHandleOffsetY(rect ? e.clientY - rect.top : 25);
    setLiftedItemWidth(rect ? rect.width : 400);
    setLiftedItemLeft(rect ? rect.left : 16);
    setIsDragging(true);

    // Haptic feedback for touch devices
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(25);
      } catch {}
    }

    startAutoScrollLoop();
  };

  // Global Pointer Listeners while dragging
  useEffect(() => {
    if (!isDragging || liftedIndex === null) return;

    const handlePointerMove = (e: PointerEvent) => {
      // Only process the active pointer
      if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) {
        return;
      }

      setPointerY(e.clientY);
      updateDropTarget(e.clientY);

      // Edge proximity auto-scrolling
      const viewHeight = window.innerHeight;
      const topEdgeZone = 110;
      const bottomEdgeZone = 130; // Extra room for mobile bottom navigation/player

      if (e.clientY < topEdgeZone) {
        const intensity = Math.min(1, (topEdgeZone - e.clientY) / topEdgeZone);
        scrollSpeedRef.current = -Math.round(4 + intensity * 16);
      } else if (e.clientY > viewHeight - bottomEdgeZone) {
        const intensity = Math.min(1, (e.clientY - (viewHeight - bottomEdgeZone)) / bottomEdgeZone);
        scrollSpeedRef.current = Math.round(4 + intensity * 16);
      } else {
        scrollSpeedRef.current = 0;
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) {
        return;
      }

      // Execute drop reorder
      if (
        dropTargetIndex !== null &&
        liftedIndex !== null &&
        dropTargetIndex !== liftedIndex &&
        dropTargetIndex >= 0 &&
        dropTargetIndex < tracksRef.current.length
      ) {
        const currentList = [...tracksRef.current];
        const [movedTrack] = currentList.splice(liftedIndex, 1);
        currentList.splice(dropTargetIndex, 0, movedTrack);

        if (onReorderTracksRef.current) {
          onReorderTracksRef.current(currentList);
        }

        if (typeof navigator !== "undefined" && navigator.vibrate) {
          try {
            navigator.vibrate(18);
          } catch {}
        }
      }

      // Cleanup
      activePointerIdRef.current = null;
      setIsDragging(false);
      setLiftedIndex(null);
      setDropTargetIndex(null);
      stopAutoScrollLoop();
    };

    const handleScrollOrWheel = () => {
      // Recalculate drop target index as user scrolls using mouse wheel or 2nd finger
      updateDropTarget(pointerY);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    window.addEventListener("pointercancel", handlePointerUp, { passive: true });
    window.addEventListener("scroll", handleScrollOrWheel, { passive: true });
    window.addEventListener("wheel", handleScrollOrWheel, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("scroll", handleScrollOrWheel);
      window.removeEventListener("wheel", handleScrollOrWheel);
      stopAutoScrollLoop();
    };
  }, [isDragging, liftedIndex, dropTargetIndex, pointerY, updateDropTarget, startAutoScrollLoop, stopAutoScrollLoop]);

  // Quick arrow shift handlers for touch & click
  const handleMoveUp = (index: number) => {
    if (!canReorder || index <= 0) return;
    const newTracks = [...tracks];
    const temp = newTracks[index];
    newTracks[index] = newTracks[index - 1];
    newTracks[index - 1] = temp;
    if (onReorderTracks) {
      onReorderTracks(newTracks);
    }
  };

  const handleMoveDown = (index: number) => {
    if (!canReorder || index >= tracks.length - 1) return;
    const newTracks = [...tracks];
    const temp = newTracks[index];
    newTracks[index] = newTracks[index + 1];
    newTracks[index + 1] = temp;
    if (onReorderTracks) {
      onReorderTracks(newTracks);
    }
  };

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

  const liftedTrack = liftedIndex !== null ? tracks[liftedIndex] : null;

  return (
    <div ref={containerRef} className="space-y-1.5 w-full relative select-none">
      {/* Lifted Song Floating Overlay */}
      {isDragging && liftedTrack && (
        <div
          style={{
            position: "fixed",
            left: `${liftedItemLeft}px`,
            width: `${liftedItemWidth}px`,
            top: `${pointerY - dragHandleOffsetY}px`,
            zIndex: 99999,
            pointerEvents: "none",
          }}
          className={`flex items-center justify-between p-3 rounded-2xl ${designConfig.cardBg} ring-2 ${designConfig.accentBorder} shadow-[0_22px_45px_rgba(0,0,0,0.65)] backdrop-blur-md opacity-95 scale-[1.03] transition-transform duration-75`}
        >
          {/* Left info */}
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            <div className="w-6 text-center shrink-0">
              <span className={`text-xs font-mono font-bold ${designConfig.accentText}`}>
                {(dropTargetIndex !== null ? dropTargetIndex : liftedIndex) + 1}
              </span>
            </div>
            <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-md border border-amber-500/40 bg-slate-900">
              <img
                src={
                  liftedTrack.coverUrl ||
                  (liftedTrack.youtubeVideoId || liftedTrack.id
                    ? `https://i.ytimg.com/vi/${liftedTrack.youtubeVideoId || liftedTrack.id}/hqdefault.jpg`
                    : "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80")
                }
                alt={liftedTrack.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold ${designConfig.accentText} truncate`}>
                {cleanTrackTitle(liftedTrack.title)}
              </p>
              <p className={`text-xs ${designConfig.textMuted} truncate`}>
                {liftedTrack.artist || "Unknown Artist"}
              </p>
            </div>
          </div>

          {/* Right Handle */}
          <div className="flex items-center gap-2 shrink-0">
            <div className={`flex items-center gap-1 px-3 py-1.5 ${designConfig.accentBg} text-white rounded-xl shadow-md`}>
              <GripVertical className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Moving</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Track List */}
      {filteredTracks.map((track, idx) => {
        const trId = track.id || track.youtubeVideoId || `track_${idx}`;
        const isCurrent =
          currentTrackId &&
          (track.id === currentTrackId ||
            track.youtubeVideoId === currentTrackId ||
            (track as any).playlistItemId === currentTrackId);

        const isLifted = isDragging && liftedIndex === idx;
        const isTarget = isDragging && dropTargetIndex === idx && liftedIndex !== idx;

        return (
          <div
            key={`${trId}_${idx}`}
            ref={(el) => {
              if (el) rowRefs.current.set(idx, el);
              else rowRefs.current.delete(idx);
            }}
            className={`group relative flex items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all select-none border ${
              isLifted
                ? `opacity-25 scale-[0.98] border-2 border-dashed ${designConfig.accentBorder} bg-black/20`
                : isTarget
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

            {/* Right Controls: Duration, Move Arrows, Lift Handle, Add/Remove */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <span className={`text-[11px] sm:text-xs font-mono ${designConfig.textMuted}`}>
                {track.duration && track.duration > 0
                  ? `${Math.floor(track.duration / 60)}:${String(Math.floor(track.duration % 60)).padStart(2, "0")}`
                  : "--:--"}
              </span>

              {/* Reorder Mode Controls (Arrows + Touch/Pointer Drag Handle) */}
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

                  {/* Drag & Lift Handle */}
                  <div
                    onPointerDown={(e) => handlePointerDown(e, idx)}
                    style={{ touchAction: "none" }}
                    className={`flex items-center gap-1 px-3 py-1.5 ${
                      isLifted
                        ? `${designConfig.accentBg} text-white`
                        : `${designConfig.pillBg} border ${designConfig.accentBorder} ${designConfig.accentText}`
                    } rounded-xl cursor-grab active:cursor-grabbing hover:opacity-90 transition-all shadow-sm select-none`}
                    title="Hold and drag to lift & reposition song"
                    role="button"
                    tabIndex={0}
                    aria-label={`Hold to drag and reorder song ${idx + 1}`}
                  >
                    <GripVertical className="w-4 h-4 shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">
                      {isLifted ? "Lifted" : "Hold"}
                    </span>
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
              {!isAlbum && onRemoveTrack && !isReorderMode && (
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
