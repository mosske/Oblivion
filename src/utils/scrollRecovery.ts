import { useEffect, useRef, useCallback } from "react";
import { Track } from "../types";

export interface ContextualScrollOptions {
  collectionId: string;
  tracks: Track[];
  activeTrack?: Track | null;
  currentTrackId?: string;
  isLoading?: boolean;
}

/**
 * Contextual Scroll Recovery for Playlist, Genre, and Album views:
 * A. Currently Playing Track Scroll Target (Highest Priority):
 *    Scrolls active track row into view if playing in this collection.
 * B. Saved Last-Known Scroll Position (Second Priority):
 *    Restores container.scrollTop from sessionStorage under OBLIVION_SCROLL_POS_[COLLECTION_ID].
 * C. Default Top Scroll (Fallback):
 *    Resets view scroll directly to top (scrollTop = 0).
 * D. On Unmount Saved Scroll Capture:
 *    Persists current container scrollTop to sessionStorage under OBLIVION_SCROLL_POS_[COLLECTION_ID].
 */
export function useContextualScrollRecovery({
  collectionId,
  tracks,
  activeTrack,
  currentTrackId,
  isLoading = false,
}: ContextualScrollOptions) {
  const hasRestoredRef = useRef<boolean>(false);
  const lastScrollPosRef = useRef<number>(0);

  const getContainer = useCallback((): HTMLElement => {
    const mainEl = document.querySelector("main");
    if (mainEl && (mainEl.scrollHeight > mainEl.clientHeight || mainEl.scrollTop > 0)) {
      return mainEl as HTMLElement;
    }
    return (document.scrollingElement || document.documentElement || document.body) as HTMLElement;
  }, []);

  const getScrollTop = useCallback((): number => {
    const container = getContainer();
    const winY = typeof window !== "undefined" ? window.scrollY : 0;
    const docY = document.documentElement ? document.documentElement.scrollTop : 0;
    const bodyY = document.body ? document.body.scrollTop : 0;
    const containerY = container ? container.scrollTop : 0;
    return Math.max(containerY, winY, docY, bodyY, lastScrollPosRef.current);
  }, [getContainer]);

  const setScrollTop = useCallback((pos: number) => {
    const container = getContainer();
    if (container) {
      container.scrollTop = pos;
    }
    const mainEl = document.querySelector("main");
    if (mainEl && mainEl !== container) {
      mainEl.scrollTop = pos;
    }
    if (typeof window !== "undefined") {
      window.scrollTo({ top: pos, left: 0, behavior: "instant" });
    }
    if (document.documentElement && document.documentElement !== container) {
      document.documentElement.scrollTop = pos;
    }
    if (document.body && document.body !== container) {
      document.body.scrollTop = pos;
    }
  }, [getContainer]);

  // Persist to sessionStorage helper
  const captureScrollPosition = useCallback(() => {
    if (!collectionId) return;
    const pos = getScrollTop();
    try {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(`OBLIVION_SCROLL_POS_${collectionId}`, String(pos));
      }
    } catch {}
  }, [collectionId, getScrollTop]);

  // Reset restored state when collection changes
  useEffect(() => {
    hasRestoredRef.current = false;
    lastScrollPosRef.current = 0;
  }, [collectionId]);

  // Continuous scroll listener to track offset and save on unmount (Requirement D)
  useEffect(() => {
    if (!collectionId) return;

    const onScroll = () => {
      const container = getContainer();
      const winY = typeof window !== "undefined" ? window.scrollY : 0;
      const docY = document.documentElement ? document.documentElement.scrollTop : 0;
      const bodyY = document.body ? document.body.scrollTop : 0;
      const containerY = container ? container.scrollTop : 0;
      const maxPos = Math.max(containerY, winY, docY, bodyY);
      lastScrollPosRef.current = maxPos;
    };

    const mainEl = document.querySelector("main");
    if (mainEl) mainEl.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      if (mainEl) mainEl.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
      // Requirement D: On unmount saved scroll capture
      captureScrollPosition();
    };
  }, [collectionId, getContainer, captureScrollPosition]);

  // Handle dynamic scroll targeting (Requirements A, B, C)
  useEffect(() => {
    if (!collectionId) return;
    if (hasRestoredRef.current) return;

    const effectiveActive =
      activeTrack ||
      (currentTrackId
        ? tracks.find(
            (t) =>
              t.id === currentTrackId ||
              t.youtubeVideoId === currentTrackId ||
              (t as any).playlistItemId === currentTrackId
          )
        : null);

    const isTrackInList = Boolean(
      effectiveActive &&
        tracks.some(
          (t) =>
            t.id === effectiveActive.id ||
            (effectiveActive.youtubeVideoId && t.youtubeVideoId === effectiveActive.youtubeVideoId) ||
            (effectiveActive.id && t.youtubeVideoId === effectiveActive.id) ||
            (effectiveActive.youtubeVideoId && t.id === effectiveActive.youtubeVideoId)
        )
    );

    // If tracks are still loading and we have an active track that might belong here, wait for tracks
    if (isLoading && tracks.length === 0 && effectiveActive) {
      return;
    }

    // A. CURRENTLY PLAYING TRACK SCROLL TARGET (HIGHEST PRIORITY):
    if (isTrackInList && effectiveActive) {
      const tryScrollToActive = () => {
        const activeTrackElement =
          document.getElementById(`track-row-${effectiveActive.id}`) ||
          (effectiveActive.youtubeVideoId
            ? document.getElementById(`track-row-${effectiveActive.youtubeVideoId}`)
            : null);

        if (activeTrackElement) {
          activeTrackElement.scrollIntoView({ block: "center", behavior: "smooth" });
          hasRestoredRef.current = true;
          return true;
        }
        return false;
      };

      if (!tryScrollToActive()) {
        const timer = setTimeout(() => {
          if (!hasRestoredRef.current) {
            tryScrollToActive();
          }
        }, 80);
        return () => clearTimeout(timer);
      }
      return;
    }

    // B. SAVED LAST-KNOWN SCROLL POSITION (SECOND PRIORITY):
    // IF no active song is playing in this playlist/album:
    const container = getContainer();
    const storageKey = `OBLIVION_SCROLL_POS_${collectionId}`;
    const saved = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(storageKey) : null;

    if (saved !== null && !isNaN(Number(saved)) && Number(saved) > 0) {
      const savedScrollPosition = parseFloat(saved);
      container.scrollTop = savedScrollPosition;
      setScrollTop(savedScrollPosition);
      hasRestoredRef.current = true;
    } else {
      // C. DEFAULT TOP SCROLL (FALLBACK):
      // IF no song is playing and no prior scroll position is cached:
      container.scrollTop = 0;
      setScrollTop(0);
      hasRestoredRef.current = true;
    }
  }, [collectionId, tracks, activeTrack, currentTrackId, isLoading, getContainer, setScrollTop]);

  return {
    captureScrollPosition,
  };
}
