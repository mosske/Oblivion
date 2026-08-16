import React, { useEffect, useRef, useState } from "react";
import { PlayerState, Track, UserSettings } from "../types";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Repeat1,
  Shuffle,
  Maximize2,
  Minimize2,
  Sparkles,
  ListMusic,
  Radio,
  DownloadCloud,
  Heart,
  Check,
  Music2,
  ListOrdered
} from "lucide-react";
import { LyricsView } from "./LyricsView";
import { SimilarTracksDrawer } from "./SimilarTracksDrawer";
import { cacheTrackAudio, isTrackCached, getCachedTrackAudioUrl } from "../utils/offlineCache";
import { cleanTrackTitle, getPlayableAudioUrl } from "../utils/formatters";

interface PlayerProps {
  playerState: PlayerState;
  setPlayerState: React.Dispatch<React.SetStateAction<PlayerState>>;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleLike: (trackId: string) => void;
  isLiked: boolean;
  onPlayTrack: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  settings: UserSettings;
}

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export const Player: React.FC<PlayerProps> = ({
  playerState,
  setPlayerState,
  onNextTrack,
  onPrevTrack,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onToggleLike,
  isLiked,
  onPlayTrack,
  onAddToQueue,
  settings,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const isYtReadyRef = useRef<boolean>(false);
  const [fullscreenMode, setFullscreenMode] = useState<"art" | "lyrics" | "video" | "similar">("art");

  const [isCachedOffline, setIsCachedOffline] = useState(false);
  const [isCaching, setIsCaching] = useState(false);
  const [cacheProgress, setCacheProgress] = useState(0);

  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    repeatMode,
    isShuffle,
    isFullscreen,
    showLyrics,
    showQueue,
    showSimilar,
    queue,
  } = playerState;

  // Load YouTube IFrame API once
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Initialize and update YouTube IFrame Player
  useEffect(() => {
    if (!currentTrack) return;

    const videoId = currentTrack.youtubeVideoId || (currentTrack.id && currentTrack.id.length === 11 ? currentTrack.id : null);

    const initOrUpdateYT = () => {
      if (!window.YT || !window.YT.Player) {
        window.onYouTubeIframeAPIReady = () => {
          initOrUpdateYT();
        };
        return;
      }

      if (!ytPlayerRef.current) {
        try {
          ytPlayerRef.current = new window.YT.Player("oblivion-yt-stream-engine", {
            height: "200",
            width: "200",
            videoId: videoId || "kJQP7kiw5Fk",
            playerVars: {
              autoplay: isPlaying ? 1 : 0,
              controls: 0,
              disablekb: 1,
              fs: 0,
              modestbranding: 1,
              rel: 0,
              playsinline: 1,
              origin: window.location.origin,
            },
            events: {
              onReady: (event: any) => {
                isYtReadyRef.current = true;
                event.target.setVolume(isMuted ? 0 : volume * 100);
                if (isPlaying) {
                  event.target.playVideo();
                }
              },
              onStateChange: (event: any) => {
                // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
                if (event.data === 1) {
                  setPlayerState((prev) => (prev.isPlaying ? prev : { ...prev, isPlaying: true }));
                } else if (event.data === 2) {
                  setPlayerState((prev) => (!prev.isPlaying ? prev : { ...prev, isPlaying: false }));
                } else if (event.data === 0) {
                  handleEnded();
                }
              },
              onError: (err: any) => {
                console.warn("YouTube stream notice:", err);
              },
            },
          });
        } catch (e) {
          console.warn("YT Player init error:", e);
        }
      } else if (isYtReadyRef.current && videoId) {
        try {
          if (typeof ytPlayerRef.current.loadVideoById === "function") {
            ytPlayerRef.current.loadVideoById({
              videoId,
              startSeconds: 0,
            });
            ytPlayerRef.current.setVolume(isMuted ? 0 : volume * 100);
            if (isPlaying) {
              ytPlayerRef.current.playVideo();
            }
          }
        } catch (e) {
          console.warn("YT loadVideo error:", e);
        }
      }
    };

    const cachedCheck = async () => {
      const cached = await isTrackCached(currentTrack.id);
      setIsCachedOffline(cached);
      if (cached && audioRef.current) {
        const cachedBlob = await getCachedTrackAudioUrl(currentTrack.id);
        if (cachedBlob) {
          audioRef.current.src = cachedBlob;
          if (isPlaying) audioRef.current.play().catch(() => {});
          return;
        }
      }
      initOrUpdateYT();
    };

    cachedCheck();
  }, [currentTrack?.id, currentTrack?.youtubeVideoId]);

  // Sync isPlaying state to players
  useEffect(() => {
    if (isYtReadyRef.current && ytPlayerRef.current) {
      try {
        if (isPlaying) {
          ytPlayerRef.current.playVideo?.();
        } else {
          ytPlayerRef.current.pauseVideo?.();
        }
      } catch {}
    }

    if (audioRef.current && isCachedOffline) {
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, isCachedOffline]);

  // Sync volume
  useEffect(() => {
    if (isYtReadyRef.current && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.setVolume?.(isMuted ? 0 : volume * 100);
      } catch {}
    }
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Progress polling interval for YouTube player
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      if (isYtReadyRef.current && ytPlayerRef.current && !isCachedOffline) {
        try {
          const cur = ytPlayerRef.current.getCurrentTime?.() || 0;
          const dur = ytPlayerRef.current.getDuration?.() || currentTrack?.duration || 0;
          if (dur > 0) {
            setPlayerState((prev) => ({
              ...prev,
              currentTime: cur,
              duration: dur,
            }));
          }
        } catch {}
      }
    }, 300);

    return () => clearInterval(interval);
  }, [isPlaying, isCachedOffline, currentTrack?.id]);

  // Background Playback Visibility Management (pauses when hidden only if Background Play is disabled in settings)
  useEffect(() => {
    if (settings.backgroundPlay === false) {
      const handleVisibilityChange = () => {
        if (document.hidden && isPlaying) {
          onTogglePlay();
        }
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);
      return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }
  }, [settings.backgroundPlay, isPlaying, onTogglePlay]);

  // MediaSession API Integration for background playback & lockscreen controls
  useEffect(() => {
    if ("mediaSession" in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: cleanTrackTitle(currentTrack.title, currentTrack.artist),
        artist: currentTrack.artist,
        album: currentTrack.album || "YouTube Music",
        artwork: [
          { src: currentTrack.coverUrl, sizes: "512x512", type: "image/jpeg" },
        ],
      });

      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

      navigator.mediaSession.setActionHandler("play", () => onTogglePlay());
      navigator.mediaSession.setActionHandler("pause", () => onTogglePlay());
      navigator.mediaSession.setActionHandler("previoustrack", () => onPrevTrack());
      navigator.mediaSession.setActionHandler("nexttrack", () => onNextTrack());
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime !== undefined) onSeek(details.seekTime);
      });
    }
  }, [currentTrack?.id, currentTrack?.title, isPlaying]);

  // Time update event handler for HTML5 audio
  const handleTimeUpdate = () => {
    if (!audioRef.current || !isCachedOffline) return;
    setPlayerState((prev) => ({
      ...prev,
      currentTime: audioRef.current?.currentTime || 0,
      duration: audioRef.current?.duration || currentTrack?.duration || 0,
    }));
  };

  // Handle track end
  const handleEnded = () => {
    if (repeatMode === "one") {
      if (isYtReadyRef.current && ytPlayerRef.current) {
        ytPlayerRef.current.seekTo?.(0, true);
        ytPlayerRef.current.playVideo?.();
      } else if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      onNextTrack();
    }
  };

  // Custom seek forward/back
  const handleSeekInternal = (time: number) => {
    if (isYtReadyRef.current && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.seekTo?.(time, true);
      } catch {}
    }
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
    onSeek(time);
  };

  // Cache Track Offline Action
  const handleCacheOffline = async () => {
    if (!currentTrack || isCaching || isCachedOffline) return;
    setIsCaching(true);
    setCacheProgress(0);

    const success = await cacheTrackAudio(currentTrack, (pct) => setCacheProgress(pct));
    setIsCaching(false);
    if (success) {
      setIsCachedOffline(true);
    }
  };

  // Handle Audio Error Fallback
  const handleAudioError = () => {
    console.warn("Audio element error handled gracefully.");
  };

  if (!currentTrack) return null;

  return (
    <>
      {/* Hidden YouTube IFrame Streaming Engine */}
      <div
        id="oblivion-yt-stream-engine"
        className="fixed -bottom-[999px] -right-[999px] w-1 h-1 pointer-events-none opacity-0 -z-50"
      />

      {/* Hidden Native Audio Element for Offline Cache */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleAudioError}
        preload="auto"
      />

      {/* Fullscreen Player Modal / Expansion */}
      {isFullscreen && (
        <div className="fixed inset-0 z-40 bg-slate-950 flex flex-col overflow-hidden animate-fade-in text-slate-100">
          {/* Ambient Background Glow */}
          <div className="absolute inset-0 pointer-events-none opacity-30 blur-3xl scale-125">
            <img
              src={currentTrack.coverUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>

          {/* Top Bar */}
          <div className="relative z-10 flex items-center justify-between p-6 border-b border-slate-800/40">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
                Now Playing in Oblivion
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  setPlayerState((prev) => ({ ...prev, showLyrics: !prev.showLyrics, showSimilar: false }))
                }
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  showLyrics
                    ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30"
                    : "bg-slate-900/80 hover:bg-slate-800 text-slate-300"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Lyrics</span>
              </button>

              <button
                onClick={() =>
                  setPlayerState((prev) => ({ ...prev, showSimilar: !prev.showSimilar, showLyrics: false }))
                }
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  showSimilar
                    ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30"
                    : "bg-slate-900/80 hover:bg-slate-800 text-slate-300"
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Similar Radio</span>
              </button>

              <button
                onClick={() => setPlayerState((prev) => ({ ...prev, isFullscreen: false }))}
                className="p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 rounded-xl transition-colors"
                title="Minimize player"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Fullscreen Body */}
          <div className="relative z-10 flex-1 flex flex-col md:flex-row items-center justify-center p-6 gap-8 overflow-hidden">
            {/* Lyrics View overlay if active */}
            {showLyrics ? (
              <div className="w-full max-w-2xl h-full flex items-center justify-center">
                <LyricsView
                  track={currentTrack}
                  currentTime={currentTime}
                  onSeek={(t) => {
                    if (audioRef.current) audioRef.current.currentTime = t;
                    onSeek(t);
                  }}
                  settings={settings}
                />
              </div>
            ) : showSimilar ? (
              <div className="w-full max-w-md h-full flex items-center justify-center">
                <SimilarTracksDrawer
                  currentTrack={currentTrack}
                  onPlayTrack={onPlayTrack}
                  onAddToQueue={onAddToQueue}
                  onClose={() => setPlayerState((prev) => ({ ...prev, showSimilar: false }))}
                />
              </div>
            ) : (
              /* Central Album Artwork & Vinyl Effect */
              <div className="flex flex-col items-center justify-center space-y-6 max-w-md w-full">
                <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-3xl overflow-hidden shadow-2xl shadow-indigo-950/80 border border-slate-700/50 group">
                  <img
                    src={currentTrack.coverUrl}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                </div>

                <div className="text-center space-y-1">
                  <h2 className="text-2xl font-bold text-white tracking-wide truncate max-w-xs sm:max-w-md">
                    {currentTrack.title}
                  </h2>
                  <p className="text-base text-cyan-400 font-medium truncate max-w-xs sm:max-w-md">
                    {currentTrack.artist}
                  </p>
                  <p className="text-xs text-slate-500 font-mono">{currentTrack.album}</p>
                </div>
              </div>
            )}
          </div>

          {/* Fullscreen Player Controls Bar */}
          <div className="relative z-10 p-6 bg-slate-950/80 backdrop-blur-2xl border-t border-slate-800/80 space-y-4 max-w-3xl mx-auto w-full">
            {/* Seekbar Slider */}
            <div className="space-y-1">
              <div className="relative flex items-center group cursor-pointer">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => {
                    const time = Number(e.target.value);
                    handleSeekInternal(time);
                  }}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>
                  {Math.floor(currentTime / 60)}:
                  {String(Math.floor(currentTime % 60)).padStart(2, "0")}
                </span>
                <span>
                  {Math.floor(duration / 60)}:
                  {String(Math.floor(duration % 60)).padStart(2, "0")}
                </span>
              </div>
            </div>

            {/* Main Buttons */}
            <div className="flex items-center justify-between">
              {/* Like & Cache */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleLike(currentTrack.id)}
                  className={`p-2.5 rounded-xl transition-colors ${
                    isLiked
                      ? "bg-rose-500/20 text-rose-500"
                      : "bg-slate-900 hover:bg-slate-800 text-slate-400"
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isLiked ? "fill-rose-500" : ""}`} />
                </button>

                <button
                  onClick={handleCacheOffline}
                  disabled={isCaching || isCachedOffline}
                  className={`p-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors ${
                    isCachedOffline
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-slate-900 hover:bg-slate-800 text-slate-300"
                  }`}
                  title={isCachedOffline ? "Available Offline" : "Save Offline"}
                >
                  {isCachedOffline ? (
                    <Check className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <DownloadCloud className={`w-5 h-5 ${isCaching ? "animate-bounce text-cyan-400" : ""}`} />
                  )}
                </button>
              </div>

              {/* Play / Skip / Shuffle / Repeat Controls */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() =>
                    setPlayerState((prev) => ({ ...prev, isShuffle: !prev.isShuffle }))
                  }
                  className={`p-2 rounded-lg transition-colors ${
                    isShuffle ? "text-cyan-400" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Shuffle className="w-5 h-5" />
                </button>

                <button
                  onClick={onPrevTrack}
                  className="p-3 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-2xl transition-all active:scale-95"
                >
                  <SkipBack className="w-6 h-6" />
                </button>

                <button
                  onClick={onTogglePlay}
                  className="p-4 bg-gradient-to-tr from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 rounded-2xl shadow-xl shadow-cyan-500/30 transition-all active:scale-95"
                >
                  {isPlaying ? (
                    <Pause className="w-7 h-7 fill-slate-950" />
                  ) : (
                    <Play className="w-7 h-7 fill-slate-950 ml-0.5" />
                  )}
                </button>

                <button
                  onClick={onNextTrack}
                  className="p-3 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-2xl transition-all active:scale-95"
                >
                  <SkipForward className="w-6 h-6" />
                </button>

                <button
                  onClick={() =>
                    setPlayerState((prev) => ({
                      ...prev,
                      repeatMode:
                        prev.repeatMode === "off"
                          ? "all"
                          : prev.repeatMode === "all"
                          ? "one"
                          : "off",
                    }))
                  }
                  className={`p-2 rounded-lg transition-colors ${
                    repeatMode !== "off" ? "text-cyan-400" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {repeatMode === "one" ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
                </button>
              </div>

              {/* Volume Slider */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setPlayerState((prev) => ({ ...prev, isMuted: !prev.isMuted }))
                  }
                  className="p-2 text-slate-400 hover:text-white"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5 text-red-400" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => onVolumeChange(Number(e.target.value))}
                  className="w-20 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Multi-Layout Mini Player Deck - Hidden when full player modal is expanded */}
      {!isFullscreen && (() => {
        const layout = settings.miniPlayerLayout || "designer-waveform";
        const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

        // Layout 0: Designer Studio Floating Dock with Golden Waveform (Matching Moodboard Sample)
        if (layout === "designer-waveform") {
          // 42 acoustic waveform bars
          const waveformBars = [
            18, 28, 42, 65, 80, 50, 35, 75, 95, 85, 45, 60, 90, 100, 70, 40,
            85, 92, 60, 30, 45, 78, 95, 88, 55, 38, 70, 92, 80, 45, 60, 85,
            75, 50, 35, 65, 80, 60, 40, 25, 18, 12
          ];

          return (
            <div className="fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] md:w-[640px] max-w-2xl bg-[#fdfcf9]/95 backdrop-blur-2xl border border-[#e6e2d8] rounded-2xl p-3 px-4 flex flex-col gap-2.5 z-40 select-none shadow-[0_16px_40px_rgba(0,0,0,0.12)] ring-1 ring-[#c89b3c]/20 transition-all">
              {/* Top Row: Track & Primary Controls */}
              <div className="flex items-center justify-between gap-3">
                {/* Left Play/Pause and Track Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Gold Circular Play Button (Moodboard Style) */}
                  <button
                    onClick={onTogglePlay}
                    className="w-10 h-10 rounded-full bg-[#c89b3c] hover:bg-[#d8a846] text-white flex items-center justify-center shadow-md shadow-[#c89b3c]/25 transition-transform active:scale-95 shrink-0"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 fill-white" />
                    ) : (
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    )}
                  </button>

                  <div 
                    onClick={() => setPlayerState((prev) => ({ ...prev, isFullscreen: true }))}
                    className="min-w-0 flex-1 cursor-pointer group pr-1"
                  >
                    <h4 className="text-xs sm:text-sm font-bold text-[#181816] truncate group-hover:text-[#c89b3c] transition-colors">
                      {cleanTrackTitle(currentTrack.title)}
                    </h4>
                    <p className="text-[11px] text-[#6b675e] truncate">
                      {currentTrack.artist} • <span className="text-[#c89b3c] font-medium font-mono text-[10px]">Studio Master</span>
                    </p>
                  </div>
                </div>

                {/* Right Meta Controls */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onToggleLike(currentTrack.id)}
                    className="p-1.5 text-[#8c887e] hover:text-rose-500 transition-colors"
                    title="Favorite"
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`} />
                  </button>

                  <button
                    onClick={onPrevTrack}
                    className="p-1.5 text-[#8c887e] hover:text-[#181816] transition-colors"
                    title="Previous"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  <button
                    onClick={onNextTrack}
                    className="p-1.5 text-[#8c887e] hover:text-[#181816] transition-colors"
                    title="Next"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() =>
                      setPlayerState((prev) => ({
                        ...prev,
                        repeatMode:
                          prev.repeatMode === "off"
                            ? "all"
                            : prev.repeatMode === "all"
                            ? "one"
                            : "off",
                      }))
                    }
                    className={`p-1.5 transition-colors ${
                      repeatMode !== "off" ? "text-[#c89b3c]" : "text-[#8c887e] hover:text-[#181816]"
                    }`}
                    title="Repeat"
                  >
                    {repeatMode === "one" ? <Repeat1 className="w-3.5 h-3.5" /> : <Repeat className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => setPlayerState((prev) => ({ ...prev, isFullscreen: true }))}
                    className="p-1.5 text-[#8c887e] hover:text-[#181816] transition-colors"
                    title="Full View"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Bottom Row: Golden Waveform Scrubber & Timestamps */}
              <div className="flex items-center gap-3 pt-0.5">
                {/* Interactive Waveform Display */}
                <div 
                  className="flex-1 h-8 flex items-center justify-between gap-[2px] sm:gap-[3px] cursor-pointer relative py-1 px-1 rounded bg-[#f4f1ea] border border-[#e8e4db] hover:border-[#c89b3c]/50 transition-colors"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    const newTime = pos * duration;
                    handleSeekInternal(newTime);
                  }}
                  title="Click anywhere on waveform to seek"
                >
                  {waveformBars.map((heightPct, idx) => {
                    const barPosPct = (idx / (waveformBars.length - 1)) * 100;
                    const isPassed = barPosPct <= progressPercent;
                    
                    return (
                      <div
                        key={idx}
                        className="flex-1 flex items-center justify-center h-full min-w-[2px]"
                      >
                        <span
                          className={`w-full rounded-full transition-all duration-150 ${
                            isPassed
                              ? "bg-[#c89b3c]"
                              : "bg-[#d8d2c4] hover:bg-[#c89b3c]/60"
                          } ${isPlaying && isPassed ? "animate-pulse" : ""}`}
                          style={{
                            height: `${Math.max(15, isPlaying ? (heightPct * (0.7 + (Math.sin(idx + currentTime * 3) * 0.3))) : heightPct)}%`,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Scrubber Time Display (Moodboard Style) */}
                <div className="text-[11px] font-mono font-medium text-[#6b675e] shrink-0 whitespace-nowrap">
                  <span>{Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, "0")}</span>
                  <span className="text-[#a39e93] mx-1">/</span>
                  <span>{Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, "0")}</span>
                </div>
              </div>
            </div>
          );
        }

        // Layout 1: Floating Glass Pill Deck (Modern Cyberpunk)
        if (layout === "floating-dock") {
          return (
            <div className="fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] md:w-[540px] max-w-xl bg-slate-950/90 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl p-2.5 px-3.5 flex items-center justify-between z-40 select-none shadow-2xl shadow-cyan-500/10">
              {/* Left Track Info */}
              <div 
                onClick={() => setPlayerState((prev) => ({ ...prev, isFullscreen: true }))}
                className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group pr-2"
              >
                <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-cyan-500/30">
                  <img
                    src={currentTrack.coverUrl}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Maximize2 className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-cyan-400 transition-colors">
                    {cleanTrackTitle(currentTrack.title)}
                  </h4>
                  <p className="text-[11px] text-cyan-300/80 truncate">{currentTrack.artist}</p>
                </div>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => onToggleLike(currentTrack.id)}
                  className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                  title="Like"
                >
                  <Heart className={`w-4 h-4 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`} />
                </button>

                <button
                  onClick={onPrevTrack}
                  className="p-1.5 text-slate-400 hover:text-white transition-colors"
                  title="Previous"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  onClick={onTogglePlay}
                  className="w-9 h-9 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center justify-center shadow-lg shadow-cyan-400/25 transition-transform active:scale-95"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-slate-950" /> : <Play className="w-4 h-4 fill-slate-950 ml-0.5" />}
                </button>

                <button
                  onClick={onNextTrack}
                  className="p-1.5 text-slate-400 hover:text-white transition-colors"
                  title="Next"
                >
                  <SkipForward className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setPlayerState((prev) => ({ ...prev, isFullscreen: true }))}
                  className="p-2 text-slate-400 hover:text-white transition-colors ml-0.5"
                  title="Expand"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        }

        // Layout 2: YouTube Music Classic (Edge-to-Edge with top progress bar)
        if (layout === "ytmusic-classic") {
          return (
            <div className="fixed bottom-16 md:bottom-0 left-0 right-0 bg-[#212121] border-t border-white/10 z-40 select-none shadow-2xl">
              {/* Top micro scrubber line */}
              <div 
                className="w-full h-1 bg-white/20 cursor-pointer relative"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pos = (e.clientX - rect.left) / rect.width;
                  const newTime = pos * duration;
                  handleSeekInternal(newTime);
                }}
              >
                <div 
                  className="h-full bg-red-600 transition-all duration-100" 
                  style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }} 
                />
              </div>

              <div className="h-16 max-w-6xl mx-auto px-4 flex items-center justify-between">
                {/* Track Info */}
                <div 
                  onClick={() => setPlayerState((prev) => ({ ...prev, isFullscreen: true }))}
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer pr-2"
                >
                  <img
                    src={currentTrack.coverUrl}
                    alt={currentTrack.title}
                    className="w-10 h-10 rounded object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{cleanTrackTitle(currentTrack.title)}</p>
                    <p className="text-xs text-zinc-400 truncate">{currentTrack.artist}</p>
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-3 shrink-0 text-white">
                  <button
                    onClick={() => onToggleLike(currentTrack.id)}
                    className="p-1.5 text-zinc-300 hover:text-white"
                  >
                    <Heart className={`w-5 h-5 ${isLiked ? "fill-red-600 text-red-600" : ""}`} />
                  </button>
                  <button
                    onClick={onTogglePlay}
                    className="p-2 text-white hover:text-zinc-200 transition-transform active:scale-95"
                  >
                    {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white" />}
                  </button>
                  <button
                    onClick={onNextTrack}
                    className="p-1.5 text-zinc-300 hover:text-white"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          );
        }

        // Layout 3: Minimal Dynamic Island Capsule (Ultra Compact)
        if (layout === "minimal-capsule") {
          return (
            <div className="fixed bottom-18 md:bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-md flex justify-center z-40 select-none pointer-events-none">
              <div className="pointer-events-auto max-w-sm w-full bg-black/90 backdrop-blur-2xl border border-white/20 rounded-full p-2 px-3 shadow-2xl flex items-center justify-between gap-2.5">
                <div 
                  onClick={() => setPlayerState((prev) => ({ ...prev, isFullscreen: true }))}
                  className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                >
                  <img
                    src={currentTrack.coverUrl}
                    alt={currentTrack.title}
                    className={`w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-cyan-400 ${isPlaying ? "animate-spin-slow" : ""}`}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{cleanTrackTitle(currentTrack.title)}</p>
                    <p className="text-[10px] text-slate-400 truncate">{currentTrack.artist}</p>
                  </div>
                </div>

                {/* Animated visualizer pulse bars */}
                <div 
                  onClick={() => setPlayerState((prev) => ({ ...prev, isFullscreen: true }))}
                  className="flex items-center gap-0.5 px-2 cursor-pointer shrink-0"
                >
                  <span className={`w-0.5 h-3 bg-cyan-400 rounded-full ${isPlaying ? "animate-pulse" : "h-1"}`} />
                  <span className={`w-0.5 h-4.5 bg-cyan-400 rounded-full ${isPlaying ? "animate-pulse delay-75" : "h-2"}`} />
                  <span className={`w-0.5 h-2.5 bg-cyan-400 rounded-full ${isPlaying ? "animate-pulse delay-150" : "h-1"}`} />
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={onTogglePlay}
                    className="w-7 h-7 rounded-full bg-white text-black hover:bg-slate-200 flex items-center justify-center shadow-md active:scale-95"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5 fill-black" /> : <Play className="w-3.5 h-3.5 fill-black ml-0.5" />}
                  </button>
                  <button
                    onClick={onNextTrack}
                    className="p-1 text-slate-300 hover:text-white"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        }

        // Layout 4: Cyberpunk Hologram Card (Feature-Rich Audiophile)
        if (layout === "card-expanded") {
          return (
            <div className="fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] md:w-[560px] max-w-xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/95 backdrop-blur-2xl border border-indigo-500/40 rounded-2xl p-3 shadow-2xl shadow-indigo-500/10 z-40 select-none space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div 
                  onClick={() => setPlayerState((prev) => ({ ...prev, isFullscreen: true }))}
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                >
                  <img
                    src={currentTrack.coverUrl}
                    alt={currentTrack.title}
                    className="w-11 h-11 rounded-xl object-cover ring-1 ring-indigo-400/50 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-mono px-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {settings.audioQuality.toUpperCase()}
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-white truncate">{cleanTrackTitle(currentTrack.title)}</p>
                    </div>
                    <p className="text-xs text-indigo-200/70 truncate">{currentTrack.artist}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() =>
                      setPlayerState((prev) => ({
                        ...prev,
                        isFullscreen: true,
                        showLyrics: true,
                        showSimilar: false,
                      }))
                    }
                    className="p-2 text-indigo-300 hover:text-white"
                    title="Lyrics"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onPrevTrack}
                    className="p-1.5 text-slate-400 hover:text-white"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onTogglePlay}
                    className="w-8 h-8 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 active:scale-95"
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                  </button>
                  <button
                    onClick={onNextTrack}
                    className="p-1.5 text-slate-400 hover:text-white"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress and Scrub Bar */}
              <div className="space-y-1">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => {
                    const time = Number(e.target.value);
                    handleSeekInternal(time);
                  }}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400 focus:outline-none"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>{Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, "0")}</span>
                  <span className="text-indigo-400">Oblivion Deck</span>
                  <span>{Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, "0")}</span>
                </div>
              </div>
            </div>
          );
        }

        // Layout 5: Split-Slider Gesture Deck (Scrubber / Touch Control)
        return (
          <div className="fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] md:w-[540px] max-w-xl bg-slate-900/95 backdrop-blur-2xl border border-slate-700/90 rounded-2xl p-3 shadow-2xl z-40 select-none space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div 
                onClick={() => setPlayerState((prev) => ({ ...prev, isFullscreen: true }))}
                className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
              >
                <img
                  src={currentTrack.coverUrl}
                  alt={currentTrack.title}
                  className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-700"
                />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-white truncate">{cleanTrackTitle(currentTrack.title)}</p>
                  <p className="text-[11px] text-slate-400 truncate">{currentTrack.artist}</p>
                </div>
              </div>

              {/* Quick Jump Buttons & Play */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    const newTime = Math.max(0, currentTime - 10);
                    handleSeekInternal(newTime);
                  }}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-mono text-slate-300 transition-colors"
                  title="Rewind 10s"
                >
                  -10s
                </button>
                <button
                  onClick={onTogglePlay}
                  className="w-8 h-8 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 flex items-center justify-center font-bold active:scale-95"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-slate-950" /> : <Play className="w-4 h-4 fill-slate-950 ml-0.5" />}
                </button>
                <button
                  onClick={() => {
                    const newTime = Math.min(duration, currentTime + 10);
                    handleSeekInternal(newTime);
                  }}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-mono text-slate-300 transition-colors"
                  title="Forward 10s"
                >
                  +10s
                </button>
              </div>
            </div>

            {/* Split Scrubber */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-emerald-400">
                {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, "0")}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => {
                  const time = Number(e.target.value);
                  handleSeekInternal(time);
                }}
                className="flex-1 h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-emerald-400 focus:outline-none"
              />
              <span className="text-[10px] font-mono text-slate-400">
                {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, "0")}
              </span>
            </div>
          </div>
        );
      })()}
    </>
  );
};
