import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import { Track } from "../types";

export type PlayerMode = "audio" | "video";
export type RepeatMode = "off" | "all" | "one";

export interface PlayerContextType {
  // Player mode & playback status
  playerMode: PlayerMode;
  setPlayerMode: (mode: PlayerMode) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTrack: Track | null;
  setCurrentTrack: (track: Track | null) => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  duration: number;
  setDuration: (duration: number) => void;

  // Global Queue state
  queue: Track[];
  setQueue: (tracks: Track[], startIndex?: number) => void;
  originalQueue: Track[];
  shuffledQueue: Track[];
  queueIndex: number;
  setQueueIndex: (index: number) => void;

  // Global Shuffle State (Non-interruptive)
  isShuffled: boolean;
  isShuffle: boolean; // Alias for backward compatibility
  setIsShuffled: (shuffled: boolean | ((prev: boolean) => boolean)) => void;
  toggleShuffle: () => void;

  // Global Repeat State
  repeatMode: RepeatMode;
  setRepeatMode: (mode: RepeatMode | ((prev: RepeatMode) => RepeatMode)) => void;
  toggleRepeat: () => void;
  cycleRepeatMode: () => void;

  // Global Favorite (Like) State
  isFavorite: boolean;
  isLiked: boolean; // Alias for backward compatibility
  likedTrackIds: string[];
  setLikedTrackIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  toggleFavorite: (trackId?: string) => void;

  // Track switching handlers
  loadTrack: (track: Track, newIndex?: number) => void;
  playNextTrack: () => void;
  playPrevTrack: () => void;

  // Hardware & player references
  audioRef: React.RefObject<HTMLAudioElement | null>;
  ytPlayerRef: React.RefObject<any>;
  videoPlayerRef: React.RefObject<any>;
  videoStartTime: number;
  setVideoStartTime: (time: number) => void;

  // Playback control functions
  playMedia: () => Promise<void> | void;
  pauseMedia: () => void;
  toggleMediaPlay: (explicitPlay?: boolean) => void;
  handleSwitchToVideo: () => void;
  handleSwitchToAudio: () => Promise<void>;
  handleNextTrackInVideo: (newTrack: Track) => void;
  handlePrevTrackInVideo: (newTrack: Track) => void;
}

export const PlayerContext = createContext<PlayerContextType | null>(null);

export const PlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [playerMode, setPlayerMode] = useState<PlayerMode>("audio");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [videoStartTime, setVideoStartTime] = useState<number>(0);

  // Queue state
  const [originalQueue, setOriginalQueue] = useState<Track[]>([]);
  const [shuffledQueue, setShuffledQueue] = useState<Track[]>([]);
  const [queue, setQueueState] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(0);

  // Synchronized controls
  const [isShuffled, setIsShuffledState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("oblivion_saved_player_state");
      if (saved) {
        const parsed = JSON.parse(saved);
        return Boolean(parsed.isShuffle || parsed.isShuffled);
      }
    } catch {}
    return false;
  });

  const [repeatMode, setRepeatModeState] = useState<RepeatMode>(() => {
    try {
      const saved = localStorage.getItem("oblivion_saved_player_state");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.repeatMode) return parsed.repeatMode;
      }
    } catch {}
    return "off";
  });

  const [likedTrackIds, setLikedTrackIdsState] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("oblivion_saved_player_state");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.likedTrackIds)) return parsed.likedTrackIds;
      }
    } catch {}
    return [];
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const videoPlayerRef = useRef<any>(null);

  // Hardware mute guard for audio element in video mode
  useEffect(() => {
    if (playerMode === "video") {
      if (audioRef.current) audioRef.current.muted = true;
    } else {
      if (audioRef.current) audioRef.current.muted = false;
    }
  }, [playerMode]);

  // Derived Favorite state for active current track
  const isFavorite = useMemo(() => {
    if (!currentTrack) return false;
    const tid = currentTrack.id || (currentTrack as any).youtubeVideoId || (currentTrack as any).youtubeId;
    return Boolean(tid && likedTrackIds.includes(tid));
  }, [currentTrack, likedTrackIds]);

  // Toggle Favorite
  const toggleFavorite = useCallback((trackId?: string) => {
    const targetId = trackId || currentTrack?.id || (currentTrack as any)?.youtubeVideoId || (currentTrack as any)?.youtubeId;
    if (!targetId) return;

    setLikedTrackIdsState((prev) => {
      const isAlreadyLiked = prev.includes(targetId);
      const updated = isAlreadyLiked
        ? prev.filter((id) => id !== targetId)
        : [...prev, targetId];

      try {
        const saved = localStorage.getItem("oblivion_saved_player_state");
        const parsed = saved ? JSON.parse(saved) : {};
        localStorage.setItem(
          "oblivion_saved_player_state",
          JSON.stringify({ ...parsed, likedTrackIds: updated })
        );
      } catch {}

      // Dispatch global synchronization event
      window.dispatchEvent(
        new CustomEvent("oblivion:favorite_toggled", {
          detail: { trackId: targetId, isFavorite: !isAlreadyLiked, likedTrackIds: updated },
        })
      );
      return updated;
    });
  }, [currentTrack]);

  // Listen for favorite synchronization from external views
  useEffect(() => {
    const handleFavSync = (e: any) => {
      if (e.detail?.likedTrackIds && Array.isArray(e.detail.likedTrackIds)) {
        setLikedTrackIdsState(e.detail.likedTrackIds);
      }
    };
    window.addEventListener("oblivion:favorite_toggled", handleFavSync);
    return () => window.removeEventListener("oblivion:favorite_toggled", handleFavSync);
  }, []);

  // Set Queue with optional startIndex
  const setQueue = useCallback((newTracks: Track[], startIndex = 0) => {
    if (!newTracks || newTracks.length === 0) return;
    const validIdx = Math.min(Math.max(0, startIndex), newTracks.length - 1);
    setOriginalQueue(newTracks);

    if (isShuffled) {
      const selected = newTracks[validIdx];
      const others = newTracks.filter((_, idx) => idx !== validIdx);
      const shuffledOthers = [...others].sort(() => Math.random() - 0.5);
      const fullShuffled = selected ? [selected, ...shuffledOthers] : shuffledOthers;
      setShuffledQueue(fullShuffled);
      setQueueState(fullShuffled);
      setQueueIndex(0);
      if (selected) {
        setCurrentTrack(selected);
      }
    } else {
      setQueueState(newTracks);
      setQueueIndex(validIdx);
      if (newTracks[validIdx]) {
        setCurrentTrack(newTracks[validIdx]);
      }
    }
  }, [isShuffled]);

  // ================================================================================
  // 3. CORRECT NON-INTERRUPTIVE SHUFFLE LOGIC (ALL THEMES)
  // - Toggling Shuffle ON:
  //   1. Keep currently playing track running uninterrupted at its current seek time.
  //   2. Shuffle remaining/upcoming track queue in memory.
  //   3. Set isShuffled: true state.
  // - Toggling Shuffle OFF:
  //   1. Keep currently playing track running uninterrupted.
  //   2. Restore original linear playlist queue order without interrupting playback.
  // ================================================================================
  const setIsShuffled = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      setIsShuffledState((prevShuffled) => {
        const nextShuffled = typeof value === "function" ? value(prevShuffled) : value;
        if (nextShuffled === prevShuffled) return prevShuffled;

        const currentTrackId =
          currentTrack?.id ||
          (currentTrack as any)?.youtubeVideoId ||
          (currentTrack as any)?.youtubeId;

        const baseQueue =
          originalQueue.length > 0 ? originalQueue : (queue.length > 0 ? queue : (currentTrack ? [currentTrack] : []));

        if (nextShuffled) {
          // Toggling Shuffle ON:
          // Keep currently playing track uninterrupted at its current seek time.
          // Shuffle the remaining/upcoming track queue in memory.
          const others = baseQueue.filter(
            (t) => (t.id || (t as any).youtubeVideoId || (t as any).youtubeId) !== currentTrackId
          );
          const shuffledOthers = [...others].sort(() => Math.random() - 0.5);
          const newShuffledQueue = currentTrack ? [currentTrack, ...shuffledOthers] : shuffledOthers;

          setOriginalQueue(baseQueue);
          setShuffledQueue(newShuffledQueue);
          setQueueState(newShuffledQueue);
          setQueueIndex(0);
        } else {
          // Toggling Shuffle OFF:
          // Restore original linear playlist queue order without interrupting playback.
          const restoredQueue = baseQueue.length > 0 ? baseQueue : queue;
          const currentPosInLinear = restoredQueue.findIndex(
            (t) => (t.id || (t as any).youtubeVideoId || (t as any).youtubeId) === currentTrackId
          );
          setQueueState(restoredQueue);
          setQueueIndex(currentPosInLinear >= 0 ? currentPosInLinear : 0);
        }

        try {
          const saved = localStorage.getItem("oblivion_saved_player_state");
          const parsed = saved ? JSON.parse(saved) : {};
          localStorage.setItem(
            "oblivion_saved_player_state",
            JSON.stringify({ ...parsed, isShuffle: nextShuffled, isShuffled: nextShuffled })
          );
        } catch {}

        // Broadcast global synchronization event asynchronously to break any synchronous cycle
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("oblivion:shuffle_toggled", {
              detail: { isShuffled: nextShuffled, source: "PlayerContext" },
            })
          );
        }, 0);

        return nextShuffled;
      });
    },
    [currentTrack, originalQueue, queue]
  );

  const toggleShuffle = useCallback(() => {
    setIsShuffled((prev) => !prev);
  }, [setIsShuffled]);

  // Listen for external shuffle events to synchronize instantly across docks
  useEffect(() => {
    const handleShuffleSync = (e: any) => {
      if (e.detail?.source === "PlayerContext") return;
      if (typeof e.detail?.isShuffled === "boolean") {
        setIsShuffledState((prev) => (prev !== e.detail.isShuffled ? e.detail.isShuffled : prev));
      }
    };
    window.addEventListener("oblivion:shuffle_toggled", handleShuffleSync);
    return () => window.removeEventListener("oblivion:shuffle_toggled", handleShuffleSync);
  }, []);

  // Repeat Mode handlers
  const cycleRepeatMode = useCallback(() => {
    setRepeatModeState((prev) => {
      const next: RepeatMode = prev === "off" ? "all" : prev === "all" ? "one" : "off";
      try {
        const saved = localStorage.getItem("oblivion_saved_player_state");
        const parsed = saved ? JSON.parse(saved) : {};
        localStorage.setItem(
          "oblivion_saved_player_state",
          JSON.stringify({ ...parsed, repeatMode: next })
        );
      } catch {}

      window.dispatchEvent(
        new CustomEvent("oblivion:repeat_toggled", {
          detail: { repeatMode: next },
        })
      );
      return next;
    });
  }, []);

  const toggleRepeat = cycleRepeatMode;

  // Listen for external repeat sync
  useEffect(() => {
    const handleRepeatSync = (e: any) => {
      if (e.detail?.repeatMode) {
        setRepeatModeState(e.detail.repeatMode);
      }
    };
    window.addEventListener("oblivion:repeat_toggled", handleRepeatSync);
    return () => window.removeEventListener("oblivion:repeat_toggled", handleRepeatSync);
  }, []);

  // ================================================================================
  // NEXT TRACK SELECTION (100% DETERMINISTIC STEPPING)
  // In playNextTrack():
  // Always simply steps to (currentIndex + 1) % queue.length
  // ================================================================================
  const loadTrack = useCallback((track: Track, newIndex?: number) => {
    if (!track) return;
    let idx = newIndex;
    if (idx === undefined) {
      const tid = track.id || (track as any)?.youtubeVideoId || (track as any)?.youtubeId;
      const found = queue.findIndex((t) => (t.id || (t as any)?.youtubeVideoId || (t as any)?.youtubeId) === tid);
      idx = found >= 0 ? found : queueIndex;
    }

    setQueueIndex(idx);
    setCurrentTrack(track);
    setCurrentTime(0);
    setIsPlaying(true);
  }, [queue, queueIndex]);

  const playNextTrack = useCallback(() => {
    if (!queue || queue.length === 0) return;

    if (repeatMode === "off" && queueIndex + 1 >= queue.length) {
      setIsPlaying(false);
      setCurrentTime(0);
      setQueueIndex(0);
      if (queue[0]) setCurrentTrack(queue[0]);
      return;
    }

    const nextIndex = (queueIndex + 1) % queue.length;
    setQueueIndex(nextIndex);
    const nextTrack = queue[nextIndex];
    if (nextTrack) {
      setCurrentTrack(nextTrack);
      setCurrentTime(0);
      setIsPlaying(true);
    }
  }, [queue, queueIndex, repeatMode]);

  const playPrevTrack = useCallback(() => {
    if (!queue || queue.length === 0) return;

    let prevIdx = queueIndex - 1;
    if (prevIdx < 0) {
      prevIdx = repeatMode === "off" ? 0 : queue.length - 1;
    }

    setQueueIndex(prevIdx);
    const prevTrack = queue[prevIdx];
    if (prevTrack) {
      setCurrentTrack(prevTrack);
      setCurrentTime(0);
      setIsPlaying(true);
    }
  }, [queue, queueIndex, repeatMode]);

  // Video switching handlers
  const handleSwitchToVideo = useCallback(() => {
    const currentAudioTime = audioRef.current?.currentTime || currentTime || 0;
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.muted = true;
        audioRef.current.src = "";
      } catch {}
    }

    setPlayerMode("video");
    const startSec = Math.floor(currentAudioTime);
    setVideoStartTime(startSec);
    setCurrentTime(startSec);

    if (videoPlayerRef.current && typeof videoPlayerRef.current.seekTo === "function") {
      try {
        videoPlayerRef.current.seekTo(startSec, true);
        videoPlayerRef.current.playVideo();
      } catch {}
    } else if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === "function") {
      try {
        ytPlayerRef.current.seekTo(startSec, true);
        ytPlayerRef.current.playVideo();
      } catch {}
    }
  }, [currentTime]);

  const handleNextTrackInVideo = useCallback((newTrack: Track) => {
    if (!newTrack) return;
    setCurrentTrack(newTrack);
    setCurrentTime(0);
    setVideoStartTime(0);

    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.muted = true;
      } catch (err) {
        console.warn("[PlayerContext] Error pausing audioRef in Video mode:", err);
      }
    }

    const targetVideoId =
      (newTrack as any).videoId ||
      newTrack.youtubeVideoId ||
      (newTrack as any).youtubeId ||
      newTrack.id;

    if (videoPlayerRef.current && typeof videoPlayerRef.current.loadVideoById === "function") {
      try {
        videoPlayerRef.current.loadVideoById({
          videoId: targetVideoId,
          startSeconds: 0,
        });
        videoPlayerRef.current.playVideo();
      } catch {}
    } else if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === "function") {
      try {
        ytPlayerRef.current.loadVideoById({
          videoId: targetVideoId,
          startSeconds: 0,
        });
        ytPlayerRef.current.playVideo();
      } catch {}
    }
  }, []);

  const handlePrevTrackInVideo = useCallback(
    (newTrack: Track) => {
      handleNextTrackInVideo(newTrack);
    },
    [handleNextTrackInVideo]
  );

  const handleSwitchToAudio = useCallback(async () => {
    let currentVideoTime = 0;
    if (videoPlayerRef.current && typeof videoPlayerRef.current.getCurrentTime === "function") {
      try {
        const t = videoPlayerRef.current.getCurrentTime();
        if (typeof t === "number" && !isNaN(t) && t >= 0) {
          currentVideoTime = t;
        }
      } catch {}
    } else if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === "function") {
      try {
        const t = ytPlayerRef.current.getCurrentTime();
        if (typeof t === "number" && !isNaN(t) && t >= 0) {
          currentVideoTime = t;
        }
      } catch {}
    }
    if (!currentVideoTime) {
      currentVideoTime = currentTime || 0;
    }

    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.stopVideo();
        ytPlayerRef.current.destroy();
      } catch {}
      ytPlayerRef.current = null;
    }
    if (videoPlayerRef.current) {
      try {
        videoPlayerRef.current.stopVideo();
        videoPlayerRef.current.destroy();
      } catch {}
      videoPlayerRef.current = null;
    }

    setPlayerMode("audio");
    setCurrentTime(currentVideoTime);
    setIsPlaying(true);

    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current.currentTime = 0;
      } catch (err) {
        console.error("[PlayerContext] Audio reset error:", err);
      }
    }
  }, [currentTime]);

  const playMedia = useCallback(async () => {
    setIsPlaying(true);
    if (playerMode === "video") {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.muted = true;
          audioRef.current.src = "";
        } catch {}
      }
      if (videoPlayerRef.current && typeof videoPlayerRef.current.playVideo === "function") {
        try {
          videoPlayerRef.current.unMute?.();
          videoPlayerRef.current.playVideo();
        } catch {}
      } else if (ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === "function") {
        try {
          ytPlayerRef.current.unMute?.();
          ytPlayerRef.current.playVideo();
        } catch {}
      }
    } else {
      if (videoPlayerRef.current && typeof videoPlayerRef.current.stopVideo === "function") {
        try {
          videoPlayerRef.current.stopVideo();
        } catch {}
      }
      if (ytPlayerRef.current && typeof ytPlayerRef.current.stopVideo === "function") {
        try {
          ytPlayerRef.current.stopVideo();
        } catch {}
      }
      if (audioRef.current) {
        try {
          audioRef.current.muted = false;
          await audioRef.current.play();
        } catch (err) {
          console.warn("[PlayerContext] Audio play error:", err);
        }
      }
    }
  }, [playerMode]);

  const pauseMedia = useCallback(() => {
    setIsPlaying(false);
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {}
    }
    if (videoPlayerRef.current && typeof videoPlayerRef.current.pauseVideo === "function") {
      try {
        videoPlayerRef.current.pauseVideo();
      } catch {}
    }
    if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === "function") {
      try {
        ytPlayerRef.current.pauseVideo();
      } catch {}
    }
  }, []);

  const toggleMediaPlay = useCallback(
    (explicitPlay?: boolean) => {
      const next = explicitPlay !== undefined ? explicitPlay : !isPlaying;
      if (next) {
        playMedia();
      } else {
        pauseMedia();
      }
    },
    [isPlaying, playMedia, pauseMedia]
  );

  return (
    <PlayerContext.Provider
      value={{
        playerMode,
        setPlayerMode,
        isPlaying,
        setIsPlaying,
        currentTrack,
        setCurrentTrack,
        currentTime,
        setCurrentTime,
        duration,
        setDuration,
        queue,
        setQueue,
        originalQueue,
        shuffledQueue,
        queueIndex,
        setQueueIndex,
        isShuffled,
        isShuffle: isShuffled,
        setIsShuffled,
        toggleShuffle,
        repeatMode,
        setRepeatMode: setRepeatModeState,
        toggleRepeat,
        cycleRepeatMode,
        isFavorite,
        isLiked: isFavorite,
        likedTrackIds,
        setLikedTrackIds: setLikedTrackIdsState,
        toggleFavorite,
        loadTrack,
        playNextTrack,
        playPrevTrack,
        audioRef,
        ytPlayerRef,
        videoPlayerRef,
        videoStartTime,
        setVideoStartTime,
        playMedia,
        pauseMedia,
        toggleMediaPlay,
        handleSwitchToVideo,
        handleSwitchToAudio,
        handleNextTrackInVideo,
        handlePrevTrackInVideo,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  return context;
};

// Aliased hook for seamless drop-in backwards compatibility
export const useAudioPlayer = usePlayer;
export default PlayerContext;
