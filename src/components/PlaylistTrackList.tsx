import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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
  onRemoveTrack?: (trackId: string, track?: Track) => void;
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
  const [touchX, setTouchX] = useState<number>(0);
  const [touchY, setTouchY] = useState<number>(0);
  const [cardWidth, setCardWidth] = useState<number>(360);
  const [cardHeight, setCardHeight] = useState<number>(64);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [scrollSpeedState, setScrollSpeedState] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const isDraggingRef = useRef<boolean>(false);
  const liftedIndexRef = useRef<number | null>(null);
  const dropTargetIndexRef = useRef<number | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const pointerYRef = useRef<number>(0);
  const pointerXRef = useRef<number>(0);
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

  // Perform scroll across all potential scrollers in the DOM hierarchy and window
  const performScroll = useCallback((deltaY: number) => {
    if (!deltaY) return;

    // 1. Scroll window directly
    if (typeof window !== "undefined") {
      try {
        window.scrollBy(0, deltaY);
      } catch {}
    }

    // 2. Scroll the primary document / html / body / scrollingElement
    if (typeof document !== "undefined") {
      try {
        if (document.scrollingElement) {
          document.scrollingElement.scrollTop += deltaY;
        }
        if (document.documentElement && document.documentElement !== document.scrollingElement) {
          document.documentElement.scrollTop += deltaY;
        }
        if (document.body && document.body !== document.scrollingElement) {
          document.body.scrollTop += deltaY;
        }
        const mainEl = document.querySelector("main");
        if (mainEl && mainEl.scrollHeight > mainEl.clientHeight) {
          mainEl.scrollTop += deltaY;
        }
      } catch {}
    }

    // 3. Scroll any intermediate overflow container in DOM hierarchy
    if (containerRef.current) {
      let parent: HTMLElement | null = containerRef.current.parentElement;
      while (parent && parent !== document.body && parent !== document.documentElement) {
        if (parent.scrollHeight > parent.clientHeight + 4) {
          parent.scrollTop += deltaY;
        }
        parent = parent.parentElement;
      }
    }
  }, []);

  // Calculate target drop index based on current pointer Y and row element bounds
  const updateDropTarget = useCallback((currentY: number) => {
    if (liftedIndexRef.current === null && !isDraggingRef.current) return;

    let closestIdx = liftedIndexRef.current !== null ? liftedIndexRef.current : 0;
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

    // Extreme boundaries handling
    const firstRowEl = rowRefs.current.get(0);
    if (firstRowEl) {
      const firstRect = firstRowEl.getBoundingClientRect();
      if (currentY <= firstRect.top + firstRect.height / 2) {
        closestIdx = 0;
      }
    }

    const lastIdx = tracksRef.current.length - 1;
    const lastRowEl = rowRefs.current.get(lastIdx);
    if (lastRowEl) {
      const lastRect = lastRowEl.getBoundingClientRect();
      if (currentY >= lastRect.top + lastRect.height / 2) {
        closestIdx = lastIdx;
      }
    }

    if (closestIdx >= 0 && closestIdx < tracksRef.current.length) {
      if (dropTargetIndexRef.current !== closestIdx) {
        dropTargetIndexRef.current = closestIdx;
        setDropTargetIndex(closestIdx);
      }
    }
  }, []);

  // Dynamic auto-scroll speed calculation: the higher up you drag, the faster it scrolls up; the lower down, the faster it scrolls down
  const getAutoScrollSpeed = useCallback((currentY: number): number => {
    if (typeof window === "undefined") return 0;
    const viewHeight = window.innerHeight;

    // Top acceleration zone: when pointer is within top 230px of window or dragged above the screen
    const topZone = 230;
    // Bottom acceleration zone: when pointer is within bottom 230px of window (accounting for player bar)
    const bottomZone = Math.max(topZone + 80, viewHeight - 230);

    if (currentY < topZone) {
      // The higher up the user drags (smaller or negative currentY), the faster the scroll up
      const distanceAbove = Math.max(1, topZone - currentY);
      const intensity = distanceAbove / topZone; // 0 to 1+
      // Smooth power curve: 4px/frame at edge, ramping to 60px/frame (~3,600px/s)
      const speed = -Math.min(60, Math.round(4 + Math.pow(intensity, 1.35) * 54));
      return speed;
    }

    if (currentY > bottomZone) {
      // The lower down the user drags (larger currentY), the faster the scroll down
      const distanceBelow = Math.max(1, currentY - bottomZone);
      const intensity = distanceBelow / (viewHeight - bottomZone || 200); // 0 to 1+
      const speed = Math.min(60, Math.round(4 + Math.pow(intensity, 1.35) * 54));
      return speed;
    }

    return 0;
  }, []);

  // Helper: immutable array reorder
  const reorderList = (list: Track[], startIndex: number, endIndex: number): Track[] => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };

  // Commit the current reorder drop
  const commitDrop = useCallback((fromIndex: number, toIndex: number) => {
    if (
      fromIndex !== toIndex &&
      toIndex >= 0 &&
      toIndex < tracksRef.current.length &&
      fromIndex >= 0 &&
      fromIndex < tracksRef.current.length
    ) {
      const updatedList = reorderList(tracksRef.current, fromIndex, toIndex);

      if (onReorderTracksRef.current) {
        onReorderTracksRef.current(updatedList);
      }

      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(20);
        } catch {}
      }
    }
  }, []);

  // Drag Initiation Handler (Touch or Mouse)
  const handleDragStart = (
    clientX: number,
    clientY: number,
    pointerId: number | null,
    index: number,
    e?: React.SyntheticEvent
  ) => {
    if (!canReorder) return;
    if (e) {
      e.stopPropagation();
    }

    const rowEl = rowRefs.current.get(index);
    const rect = rowEl?.getBoundingClientRect();

    isDraggingRef.current = true;
    liftedIndexRef.current = index;
    dropTargetIndexRef.current = index;
    activePointerIdRef.current = pointerId;
    pointerYRef.current = clientY;
    pointerXRef.current = clientX;
    
    setLiftedIndex(index);
    setDropTargetIndex(index);
    setTouchX(clientX);
    setTouchY(clientY);
    setCardWidth(rect ? rect.width : (containerRef.current?.getBoundingClientRect().width || window.innerWidth - 32));
    setCardHeight(rect ? rect.height : 64);
    setIsDragging(true);

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(25);
      } catch {}
    }
  };

  // Global Pointer, Wheel, Touch & Keyboard Listeners + Continuous Auto-Scroll RAF Loop
  useEffect(() => {
    if (!isDragging) return;

    let rafId: number | null = null;

    // Continuous auto-scroll loop that runs every frame while dragging
    const autoScrollLoop = () => {
      if (!isDraggingRef.current) return;

      const currentY = pointerYRef.current;
      const speed = getAutoScrollSpeed(currentY);
      scrollSpeedRef.current = speed;
      setScrollSpeedState(speed);

      if (speed !== 0) {
        performScroll(speed);
        updateDropTarget(currentY);
      }

      rafId = requestAnimationFrame(autoScrollLoop);
    };

    rafId = requestAnimationFrame(autoScrollLoop);

    const handleMove = (clientX: number, clientY: number, pointerId?: number) => {
      if (!isDraggingRef.current) return;
      if (activePointerIdRef.current !== null && pointerId !== undefined && pointerId !== activePointerIdRef.current) {
        return;
      }
      pointerYRef.current = clientY;
      pointerXRef.current = clientX;
      setTouchX(clientX);
      setTouchY(clientY);
      updateDropTarget(clientY);
    };

    const handlePointerMove = (e: PointerEvent) => {
      handleMove(e.clientX, e.clientY, e.pointerId);
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleEnd = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      
      const fromIdx = liftedIndexRef.current;
      const toIdx = dropTargetIndexRef.current !== null ? dropTargetIndexRef.current : liftedIndexRef.current;
      
      if (fromIdx !== null && toIdx !== null) {
        commitDrop(fromIdx, toIdx);
      }

      activePointerIdRef.current = null;
      liftedIndexRef.current = null;
      dropTargetIndexRef.current = null;
      scrollSpeedRef.current = 0;
      setScrollSpeedState(0);
      setIsDragging(false);
      setLiftedIndex(null);
      setDropTargetIndex(null);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        handleEnd();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      performScroll(e.deltaY);
      updateDropTarget(pointerYRef.current);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        const step = e.key === "PageUp" ? 5 : 1;
        const current = dropTargetIndexRef.current !== null ? dropTargetIndexRef.current : (liftedIndexRef.current || 0);
        const next = Math.max(0, current - step);
        dropTargetIndexRef.current = next;
        setDropTargetIndex(next);
        performScroll(e.key === "PageUp" ? -240 : -65);
      } else if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        const step = e.key === "PageDown" ? 5 : 1;
        const current = dropTargetIndexRef.current !== null ? dropTargetIndexRef.current : (liftedIndexRef.current || 0);
        const next = Math.min(tracksRef.current.length - 1, current + step);
        dropTargetIndexRef.current = next;
        setDropTargetIndex(next);
        performScroll(e.key === "PageDown" ? 240 : 65);
      } else if (e.key === "Escape") {
        e.preventDefault();
        isDraggingRef.current = false;
        activePointerIdRef.current = null;
        liftedIndexRef.current = null;
        dropTargetIndexRef.current = null;
        scrollSpeedRef.current = 0;
        setScrollSpeedState(0);
        setIsDragging(false);
        setLiftedIndex(null);
        setDropTargetIndex(null);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleEnd();
      }
    };

    // Attach with capture phase on window & document so nothing misses the drag movements
    window.addEventListener("pointermove", handlePointerMove, { capture: true, passive: true });
    window.addEventListener("pointerup", handleEnd, { capture: true, passive: true });
    window.addEventListener("pointercancel", handleEnd, { capture: true, passive: true });
    window.addEventListener("mousemove", handleMouseMove, { capture: true, passive: true });
    window.addEventListener("mouseup", handleEnd, { capture: true, passive: true });
    window.addEventListener("touchmove", handleTouchMove, { capture: true, passive: true });
    window.addEventListener("touchend", handleTouchEnd, { capture: true, passive: true });
    window.addEventListener("touchcancel", handleEnd, { capture: true, passive: true });
    window.addEventListener("wheel", handleWheel, { capture: true, passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener("pointermove", handlePointerMove, { capture: true } as any);
      window.removeEventListener("pointerup", handleEnd, { capture: true } as any);
      window.removeEventListener("pointercancel", handleEnd, { capture: true } as any);
      window.removeEventListener("mousemove", handleMouseMove, { capture: true } as any);
      window.removeEventListener("mouseup", handleEnd, { capture: true } as any);
      window.removeEventListener("touchmove", handleTouchMove, { capture: true } as any);
      window.removeEventListener("touchend", handleTouchEnd, { capture: true } as any);
      window.removeEventListener("touchcancel", handleEnd, { capture: true } as any);
      window.removeEventListener("wheel", handleWheel, { capture: true } as any);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDragging, getAutoScrollSpeed, performScroll, updateDropTarget, commitDrop]);

  // Quick arrow shift handlers for touch & click
  const handleMoveUp = (index: number) => {
    if (!canReorder || index <= 0) return;
    const updated = reorderList(tracks, index, index - 1);
    if (onReorderTracks) {
      onReorderTracks(updated);
    }
  };

  const handleMoveDown = (index: number) => {
    if (!canReorder || index >= tracks.length - 1) return;
    const updated = reorderList(tracks, index, index + 1);
    if (onReorderTracks) {
      onReorderTracks(updated);
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
      {/* Semi-Transparent Floating Ghost Card Portal attached to document.body */}
      {typeof document !== "undefined" && isDragging && liftedTrack && createPortal(
        <div
          style={{
            position: "fixed",
            left: `${touchX - cardWidth / 2}px`,
            top: `${touchY - cardHeight / 2}px`,
            width: `${cardWidth}px`,
            opacity: 0.82,
            transform: "scale(1.04)",
            boxShadow: "0 16px 32px rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(8px)",
            border: "1.5px solid var(--accent-color, #00f3ff)",
            pointerEvents: "none",
            zIndex: 9999,
          }}
          className={`flex items-center justify-between p-3 rounded-2xl ${designConfig.cardBg} transition-none shadow-2xl`}
        >
          {/* Left info: Index + Thumbnail + Title + Artist */}
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <div className="w-6 text-center shrink-0">
              <span className={`text-xs font-mono font-extrabold ${designConfig.accentText} bg-black/50 px-1.5 py-0.5 rounded-md`}>
                #{(dropTargetIndex !== null ? dropTargetIndex : liftedIndex) + 1}
              </span>
            </div>
            <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 shadow-lg border border-[var(--accent-color,#00f3ff)]/60 bg-slate-900">
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
              <p className={`text-xs sm:text-sm font-bold ${designConfig.accentText} truncate drop-shadow-sm`}>
                {cleanTrackTitle(liftedTrack.title, liftedTrack.artist)}
              </p>
              <p className={`text-[11px] sm:text-xs ${designConfig.textMuted} truncate`}>
                {liftedTrack.artist || "Unknown Artist"}
              </p>
            </div>
          </div>

          {/* Right Floating Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[11px] sm:text-xs font-mono ${designConfig.textMuted}`}>
              {liftedTrack.duration && liftedTrack.duration > 0
                ? `${Math.floor(liftedTrack.duration / 60)}:${String(Math.floor(liftedTrack.duration % 60)).padStart(2, "0")}`
                : "--:--"}
            </span>
            <div className={`flex items-center gap-1 px-2.5 py-1 ${designConfig.accentBg} text-white rounded-xl shadow-lg ring-1 ring-white/30 animate-pulse`}>
              {scrollSpeedState < -18 ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 animate-bounce stroke-[3]" />
                  <span className="text-[9px] font-black uppercase tracking-wider">
                    Fast Up
                  </span>
                </>
              ) : scrollSpeedState < 0 ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="text-[9px] font-black uppercase tracking-wider">
                    Scrolling Up
                  </span>
                </>
              ) : scrollSpeedState > 18 ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5 animate-bounce stroke-[3]" />
                  <span className="text-[9px] font-black uppercase tracking-wider">
                    Fast Down
                  </span>
                </>
              ) : scrollSpeedState > 0 ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="text-[9px] font-black uppercase tracking-wider">
                    Scrolling Down
                  </span>
                </>
              ) : (
                <>
                  <GripVertical className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-black uppercase tracking-wider">
                    Moving #{(dropTargetIndex !== null ? dropTargetIndex : liftedIndex) + 1}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Main Track List with Stable Persistent React Keys */}
      {filteredTracks.map((track, idx) => {
        const stableTrackKey = track.playlistItemId
          ? `${track.playlistItemId}_${idx}`
          : track.id
          ? `${track.id}_${idx}`
          : `${track.youtubeVideoId || "track"}_${idx}`;
        const trId = track.id || track.youtubeVideoId || stableTrackKey;
        const isCurrent =
          currentTrackId &&
          (track.id === currentTrackId ||
            track.youtubeVideoId === currentTrackId ||
            (track as any).playlistItemId === currentTrackId);

        const isLifted = isDragging && liftedIndex === idx;
        const isTarget = isDragging && dropTargetIndex === idx && liftedIndex !== idx;

        return (
          <div
            key={stableTrackKey}
            id={`track-row-${track.id}`}
            data-track-id={track.id}
            data-youtube-id={track.youtubeVideoId}
            ref={(el) => {
              if (el) rowRefs.current.set(idx, el);
              else rowRefs.current.delete(idx);
            }}
            style={{ touchAction: "pan-y" }}
            className={`group relative flex items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all select-none border ${
              isLifted
                ? `opacity-20 scale-[0.98] border-2 border-dashed ${designConfig.accentBorder} bg-black/40 shadow-inner`
                : isTarget
                ? `ring-2 ring-[var(--accent-color,#00f3ff)] ${designConfig.accentBorder} scale-[1.02] ${designConfig.pillBg} shadow-2xl`
                : isCurrent
                ? `${designConfig.cardBg} ring-1.5 ${designConfig.accentBorder} shadow-md`
                : `${designConfig.cardBg} ${designConfig.cardHover} ${designConfig.borderSubtle}`
            }`}
          >
            {/* Target Insertion Indicator */}
            {isTarget && (
              <div className="absolute -top-1 left-4 right-4 h-1 rounded-full bg-[var(--accent-color,#00f3ff)] shadow-[0_0_8px_var(--accent-color,#00f3ff)] animate-pulse pointer-events-none" />
            )}
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
                  text={cleanTrackTitle(track.title, track.artist)}
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
                    onPointerDown={(e) => handleDragStart(e.clientX, e.clientY, e.pointerId, idx, e)}
                    onTouchStart={(e) => {
                      if (e.touches && e.touches.length > 0) {
                        handleDragStart(e.touches[0].clientX, e.touches[0].clientY, null, idx, e);
                      }
                    }}
                    onMouseDown={(e) => {
                      if (e.button === 0) {
                        handleDragStart(e.clientX, e.clientY, null, idx, e);
                      }
                    }}
                    style={{ touchAction: "none" }}
                    className={`flex items-center gap-1 px-3 py-1.5 ${
                      isLifted
                        ? `${designConfig.accentBg} text-white ring-2 ring-white/40 scale-105`
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
                      onRemoveTrack(trId, track);
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

