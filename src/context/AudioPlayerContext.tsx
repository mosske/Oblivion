import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { Track } from "../types";
import { getPlayableAudioUrl } from "../utils/formatters";

export type PlayerMode = "audio" | "video";

export interface AudioPlayerContextType {
  playerMode: PlayerMode;
  setPlayerMode: (mode: PlayerMode) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTrack: Track | null;
  setCurrentTrack: (track: Track | null) => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  ytPlayerRef: React.RefObject<any>;
  videoPlayerRef: React.RefObject<any>;
  videoStartTime: number;
  setVideoStartTime: (time: number) => void;
  playMedia: () => Promise<void> | void;
  pauseMedia: () => void;
  toggleMediaPlay: (explicitPlay?: boolean) => void;
  handleSwitchToVideo: () => void;
  handleSwitchToAudio: () => Promise<void>;
  handleNextTrackInVideo: (newTrack: Track) => void;
  handlePrevTrackInVideo: (newTrack: Track) => void;
}

export const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null);

export const AudioPlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [playerMode, setPlayerMode] = useState<PlayerMode>("audio");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [videoStartTime, setVideoStartTime] = useState<number>(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const videoPlayerRef = useRef<any>(null);

  // ================================================================================
  // TASK 4: HARDWARE-LEVEL MUTING SANITY GUARD
  // ================================================================================
  useEffect(() => {
    if (playerMode === "video") {
      if (audioRef.current) audioRef.current.muted = true;
    } else {
      if (audioRef.current) audioRef.current.muted = false;
    }
  }, [playerMode]);

  // ================================================================================
  // TASK 1: FIXED SWITCH FROM AUDIO TO VIDEO
  // ================================================================================
  const handleSwitchToVideo = useCallback(() => {
    // 1. Capture the EXACT current timestamp from HTML5 Audio
    const currentAudioTime = audioRef.current?.currentTime || currentTime || 0;

    // 2. IMMEDIATELY pause and clear the HTML5 Audio element
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.muted = true;
        audioRef.current.src = "";
      } catch {}
    }

    // 3. Set playerMode = 'video'
    setPlayerMode("video");

    // 4 & 5. Pass start: Math.floor(currentAudioTime) into YouTube playerVars
    const startSec = Math.floor(currentAudioTime);
    setVideoStartTime(startSec);
    setCurrentTime(startSec);

    // If active ytPlayer exists, seekTo so video does not restart from 0
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

  // ================================================================================
  // TASK 2: SYNCHRONIZE GLOBAL CURRENT TRACK IN VIDEO MODE
  // ================================================================================
  const handleNextTrackInVideo = useCallback((newTrack: Track) => {
    if (!newTrack) return;
    // 1. Update global state currentTrack to the NEW track
    setCurrentTrack(newTrack);
    setCurrentTime(0);
    setVideoStartTime(0);

    // 2. Keep HTML5 Audio strictly PAUSED and MUTED
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.muted = true;
      } catch (err) {
        console.warn("[AudioPlayerContext] Error pausing audioRef in Video mode:", err);
      }
    }

    // 3. Load the new video ID in the YouTube iframe (ytPlayer.loadVideoById(newTrack.videoId))
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

  // ================================================================================
  // TASK 3: ATOMIC CLEANUP ON SWITCH FROM VIDEO TO AUDIO
  // ================================================================================
  const handleSwitchToAudio = useCallback(async () => {
    // 1. Capture the EXACT playback timestamp from YouTube Player
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

    // 2. IMMEDIATELY destroy/unmount the YouTube Video player
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

    // 3 & 4. Force-unmount video container DOM element and set playerMode = 'audio'
    setPlayerMode("audio");
    setCurrentTime(currentVideoTime);
    setIsPlaying(true);

    // 5 & 6. Set audioRef.current.currentTime = currentVideoTime and call await audioRef.current.play()
    if (audioRef.current) {
      try {
        const trackAudioUrl = getPlayableAudioUrl(currentTrack);

        if (trackAudioUrl && (!audioRef.current.src || !audioRef.current.src.includes(trackAudioUrl))) {
          audioRef.current.src = trackAudioUrl;
        }
        audioRef.current.currentTime = currentVideoTime;
        audioRef.current.muted = false;
        await audioRef.current.play();
      } catch (err) {
        console.error("[AudioPlayerContext] Audio resume error:", err);
      }
    }
  }, [currentTrack, currentTime]);

  // ================================================================================
  // TASK 4: GLOBAL PLAY/PAUSE EVENT BUS SANITY GUARD (Single Active Media Controller)
  // ================================================================================
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
          console.warn("[AudioPlayerContext] Audio play error:", err);
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
    <AudioPlayerContext.Provider
      value={{
        playerMode,
        setPlayerMode,
        isPlaying,
        setIsPlaying,
        currentTrack,
        setCurrentTrack,
        currentTime,
        setCurrentTime,
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
    </AudioPlayerContext.Provider>
  );
};

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  return context;
};

export default AudioPlayerContext;
