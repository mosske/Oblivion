import React, { useRef, useState, useEffect, useCallback } from "react";
import { Player } from "./Player";
import { useAudioPlayer } from "../context/AudioPlayerContext";
import { Track } from "../types";
import { getPlayableAudioUrl } from "../utils/formatters";

export type FullPlayerProps = React.ComponentProps<typeof Player> & {
  playerMode?: "audio" | "video";
  onModeChange?: (mode: "audio" | "video") => void;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
  ytPlayerRef?: React.RefObject<any>;
};

/**
 * FullPlayer component enforcing the Critical Media Architecture Rule:
 * Only ONE media instance (HTML5 Audio OR YouTube Video) is allowed in active/playing state.
 */
export const FullPlayer: React.FC<FullPlayerProps> = (props) => {
  const context = useAudioPlayer();
  const internalAudioRef = useRef<HTMLAudioElement | null>(null);
  const internalYtPlayerRef = useRef<any>(null);

  const audioRef = props.audioRef || context?.audioRef || internalAudioRef;
  const ytPlayerRef = props.ytPlayerRef || context?.ytPlayerRef || internalYtPlayerRef;

  const [playerMode, setPlayerMode] = useState<"audio" | "video">(
    props.playerState?.mediaMode === "video" ? "video" : "audio"
  );

  // Sync mode with parent playerState if provided
  useEffect(() => {
    if (props.playerState?.mediaMode) {
      setPlayerMode(props.playerState.mediaMode === "video" ? "video" : "audio");
    }
  }, [props.playerState?.mediaMode]);

  // ================================================================================
  // TASK 4: HARDWARE-LEVEL MUTING SANITY GUARD
  // ================================================================================
  useEffect(() => {
    if (playerMode === "video") {
      if (audioRef.current) audioRef.current.muted = true;
    } else {
      if (audioRef.current) audioRef.current.muted = false;
    }
  }, [playerMode, audioRef]);

  // ================================================================================
  // TASK 1: FIXED SWITCH FROM AUDIO TO VIDEO
  // ================================================================================
  const handleSwitchToVideo = useCallback(() => {
    // 1. Capture the EXACT current timestamp
    let currentAudioTime = 0;
    if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === "function") {
      try {
        const ytTime = ytPlayerRef.current.getCurrentTime();
        if (typeof ytTime === "number" && !isNaN(ytTime) && ytTime > 0) {
          currentAudioTime = ytTime;
        }
      } catch {}
    }
    if (!currentAudioTime && audioRef.current && typeof audioRef.current.currentTime === "number" && !isNaN(audioRef.current.currentTime) && audioRef.current.currentTime > 0) {
      currentAudioTime = audioRef.current.currentTime;
    }
    if (!currentAudioTime) {
      currentAudioTime = props.playerState?.currentTime || 0;
    }

    // 2. IMMEDIATELY pause and clear the HTML5 Audio element:
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.muted = true;
        audioRef.current.src = "";
      } catch {}
    }
    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.pauseVideo?.();
        ytPlayerRef.current.stopVideo?.();
        ytPlayerRef.current.mute?.();
      } catch {}
    }

    // 3. Set playerMode = 'video'
    setPlayerMode("video");
    props.onModeChange?.("video");
    if (props.setPlayerState) {
      props.setPlayerState((prev) => ({
        ...prev,
        mediaMode: "video",
        currentTime: currentAudioTime,
        isPlaying: true,
        isFullscreen: true,
      }));
    }
  }, [audioRef, ytPlayerRef, props]);

  // ================================================================================
  // TASK 3: ATOMIC CLEANUP ON SWITCH FROM VIDEO TO AUDIO
  // ================================================================================
  const handleSwitchToAudio = useCallback(async () => {
    // 1. Capture the EXACT playback timestamp from YouTube Player:
    const currentVideoTime = props.playerState?.currentTime || 0;

    // 2. Set playerMode = 'audio'
    setPlayerMode("audio");
    props.onModeChange?.("audio");
    if (props.setPlayerState) {
      props.setPlayerState((prev) => ({
        ...prev,
        mediaMode: "song",
        currentTime: currentVideoTime,
        isPlaying: true,
        isFullscreen: true,
      }));
    }
  }, [props]);

  // ================================================================================
  // TASK 2: SYNCHRONIZE GLOBAL CURRENT TRACK IN VIDEO MODE
  // ================================================================================
  const handleNextTrack = useCallback(() => {
    if (playerMode === "video") {
      const queue = props.playerState?.queue || [];
      const queueIndex = props.playerState?.queueIndex ?? 0;
      const nextIndex = queue.length > 0 ? (queueIndex + 1) % queue.length : 0;
      const newTrack: Track | undefined = queue[nextIndex];

      if (newTrack) {
        // 1. Update global state currentTrack to the NEW track
        if (props.setPlayerState) {
          props.setPlayerState((prev) => ({
            ...prev,
            currentTrack: newTrack,
            queueIndex: nextIndex,
            currentTime: 0,
            isPlaying: true,
          }));
        }

        // 2. Keep HTML5 Audio strictly paused and silent
        if (audioRef.current) {
          try {
            audioRef.current.pause();
            audioRef.current.muted = true;
          } catch {}
        }

        // 3. Load the new video ID in the YouTube iframe (ytPlayer.loadVideoById(newTrack.videoId))
        const newVideoId =
          (newTrack as any).videoId ||
          newTrack.youtubeVideoId ||
          (newTrack as any).youtubeId ||
          newTrack.id;

        if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === "function") {
          try {
            ytPlayerRef.current.loadVideoById(newVideoId);
          } catch {}
        }
      }
    }

    props.onNextTrack?.();
  }, [playerMode, props, audioRef, ytPlayerRef]);

  const handlePrevTrack = useCallback(() => {
    if (playerMode === "video") {
      const queue = props.playerState?.queue || [];
      const queueIndex = props.playerState?.queueIndex ?? 0;
      const prevIndex = queue.length > 0 ? (queueIndex - 1 + queue.length) % queue.length : 0;
      const newTrack: Track | undefined = queue[prevIndex];

      if (newTrack) {
        if (props.setPlayerState) {
          props.setPlayerState((prev) => ({
            ...prev,
            currentTrack: newTrack,
            queueIndex: prevIndex,
            currentTime: 0,
            isPlaying: true,
          }));
        }

        if (audioRef.current) {
          try {
            audioRef.current.pause();
            audioRef.current.muted = true;
          } catch {}
        }

        const newVideoId =
          (newTrack as any).videoId ||
          newTrack.youtubeVideoId ||
          (newTrack as any).youtubeId ||
          newTrack.id;

        if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === "function") {
          try {
            ytPlayerRef.current.loadVideoById(newVideoId);
          } catch {}
        }
      }
    }

    props.onPrevTrack?.();
  }, [playerMode, props, audioRef, ytPlayerRef]);

  return (
    <Player
      {...props}
      onNextTrack={handleNextTrack}
      onPrevTrack={handlePrevTrack}
    />
  );
};

export default FullPlayer;
