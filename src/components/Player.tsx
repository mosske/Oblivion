import React, { useEffect, useRef, useState } from "react";
import { PlayerState, Track, UserSettings, Playlist } from "../types";
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
  Plus,
  CheckCircle2,
  Share2
} from "lucide-react";
import { LyricsView } from "./LyricsView";
import { SimilarTracksDrawer } from "./SimilarTracksDrawer";
import { cacheTrackAudio, isTrackCached, getCachedTrackAudioUrl } from "../utils/offlineCache";
import { cleanTrackTitle, getPlayableAudioUrl } from "../utils/formatters";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";

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
  playlists?: Playlist[];
  onAddTrackToPlaylist?: (track: Track, playlistId: string) => void;
  designConfig?: FullAppDesignConfig;
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
  playlists = [],
  onAddTrackToPlaylist,
  designConfig = FULL_APP_DESIGNS["designer"],
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const isYtReadyRef = useRef<boolean>(false);
  const isChangingTrackRef = useRef<boolean>(false);
  const isChangingTrackTimeoutRef = useRef<any>(null);

  const [isCachedOffline, setIsCachedOffline] = useState(false);
  const [isCaching, setIsCaching] = useState(false);
  const [cacheProgress, setCacheProgress] = useState(0);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);

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
    showSimilar,
  } = playerState;

  // Load YouTube IFrame API script once
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Initialize and update YouTube IFrame Player with rock-solid auto-play
  useEffect(() => {
    if (!currentTrack) return;

    // Mark track change in progress to avoid YouTube's internal buffering pause event from toggling isPlaying
    isChangingTrackRef.current = true;
    if (isChangingTrackTimeoutRef.current) clearTimeout(isChangingTrackTimeoutRef.current);
    isChangingTrackTimeoutRef.current = setTimeout(() => {
      isChangingTrackRef.current = false;
    }, 2500);

    const videoId =
      currentTrack.youtubeVideoId ||
      (currentTrack.id && currentTrack.id.length === 11 ? currentTrack.id : null);

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
              autoplay: 1,
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
                event.target.playVideo();
                setPlayerState((prev) => ({ ...prev, isPlaying: true }));
              },
              onStateChange: (event: any) => {
                // 1 = PLAYING, 2 = PAUSED, 0 = ENDED, 3 = BUFFERING, 5 = CUED
                if (event.data === 1) {
                  isChangingTrackRef.current = false;
                  setPlayerState((prev) => (prev.isPlaying ? prev : { ...prev, isPlaying: true }));
                } else if (event.data === 2) {
                  // If transitioning between tracks, YouTube fires state 2 (paused) internally. Ignore it and force play!
                  if (isChangingTrackRef.current) {
                    try {
                      event.target.playVideo();
                    } catch {}
                    return;
                  }
                  setPlayerState((prev) => (!prev.isPlaying ? prev : { ...prev, isPlaying: false }));
                } else if (event.data === 5 || event.data === -1) {
                  // Cued or Unstarted -> auto play immediately
                  try {
                    event.target.playVideo();
                  } catch {}
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
            ytPlayerRef.current.playVideo();
            setPlayerState((prev) => ({ ...prev, isPlaying: true }));
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
          audioRef.current.play().catch(() => {});
          setPlayerState((prev) => ({ ...prev, isPlaying: true }));
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
        } else if (!isChangingTrackRef.current) {
          ytPlayerRef.current.pauseVideo?.();
        }
      } catch {}
    }
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      } else if (!isChangingTrackRef.current) {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Sync volume state to players
  useEffect(() => {
    const effectiveVolume = isMuted ? 0 : volume;
    if (isYtReadyRef.current && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.setVolume?.(effectiveVolume * 100);
      } catch {}
    }
    if (audioRef.current) {
      audioRef.current.volume = effectiveVolume;
    }
  }, [volume, isMuted]);

  // Timer loop for YouTube current timestamp & progress
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying && isYtReadyRef.current && ytPlayerRef.current && !isCachedOffline) {
        try {
          const curTime = ytPlayerRef.current.getCurrentTime?.() || 0;
          const dur = ytPlayerRef.current.getDuration?.() || currentTrack?.duration || 0;
          if (curTime > 0) {
            setPlayerState((prev) => ({
              ...prev,
              currentTime: curTime,
              duration: dur || prev.duration,
            }));
          }
        } catch {}
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying, isCachedOffline, currentTrack?.duration]);

  // Background play setting
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

  // Cache Track Offline Action with live progress
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

  // Cycle Repeat Mode
  const cycleRepeatMode = () => {
    setPlayerState((prev) => ({
      ...prev,
      repeatMode:
        prev.repeatMode === "off"
          ? "all"
          : prev.repeatMode === "all"
          ? "one"
          : "off",
    }));
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
        onError={() => console.warn("Audio element fallback")}
        preload="auto"
      />

      {/* Add To Playlist Modal */}
      {showAddToPlaylistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className={`w-full max-w-sm ${designConfig.modalBg} border ${designConfig.borderSubtle} rounded-3xl p-5 shadow-2xl space-y-4`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-base font-bold ${designConfig.textPrimary}`}>
                Add to Playlist
              </h3>
              <button
                onClick={() => setShowAddToPlaylistModal(false)}
                className={`p-1.5 ${designConfig.textMuted} hover:${designConfig.textPrimary} rounded-lg`}
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              {playlists.length === 0 ? (
                <p className={`text-xs ${designConfig.textMuted} text-center py-4`}>
                  No playlists created yet. Create one in the Library.
                </p>
              ) : (
                playlists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => {
                      if (onAddTrackToPlaylist) {
                        onAddTrackToPlaylist(currentTrack, pl.id);
                      }
                      setShowAddToPlaylistModal(false);
                    }}
                    className={`w-full text-left p-3 rounded-2xl ${designConfig.cardBg} ${designConfig.cardHover} border ${designConfig.borderSubtle} flex items-center gap-3 transition-colors`}
                  >
                    <img
                      src={pl.coverUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=150&q=80"}
                      alt=""
                      className="w-10 h-10 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold ${designConfig.textPrimary} truncate`}>{pl.title}</p>
                      <p className={`text-[10px] ${designConfig.textMuted}`}>{pl.tracks?.length || pl.tracksCount || 0} tracks</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Player Modal / Expansion - Now Styled with Selected App Theme! */}
      {isFullscreen && (
        <div className={`fixed inset-0 z-40 ${designConfig.bgCanvas} flex flex-col overflow-hidden animate-fade-in ${designConfig.textPrimary}`}>
          {/* Ambient Background Glow */}
          <div className="absolute inset-0 pointer-events-none opacity-20 blur-3xl scale-125">
            <img
              src={currentTrack.coverUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>

          {/* Top Bar */}
          <div className={`relative z-10 flex items-center justify-between p-4 sm:p-6 border-b ${designConfig.borderSubtle} ${designConfig.headerBg} backdrop-blur-xl`}>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#c89b3c] animate-pulse"></span>
              <span className={`text-xs font-mono uppercase tracking-widest ${designConfig.textMuted}`}>
                Now Playing in Oblivion
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() =>
                  setPlayerState((prev) => ({ ...prev, showLyrics: !prev.showLyrics, showSimilar: false }))
                }
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  showLyrics
                    ? `${designConfig.btnPrimary} shadow-lg`
                    : `${designConfig.btnSecondary} ${designConfig.textSecondary}`
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
                    ? `${designConfig.btnPrimary} shadow-lg`
                    : `${designConfig.btnSecondary} ${designConfig.textSecondary}`
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Radio</span>
              </button>

              <button
                onClick={() => setPlayerState((prev) => ({ ...prev, isFullscreen: false }))}
                className={`p-2 ${designConfig.btnSecondary} ${designConfig.textPrimary} rounded-xl transition-colors`}
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
              <div className="flex flex-col items-center justify-center space-y-6 max-w-md w-full animate-fade-in">
                <div className={`relative w-64 h-64 sm:w-80 sm:h-80 rounded-3xl overflow-hidden shadow-2xl border-2 ${designConfig.accentBorder} group`}>
                  <img
                    src={currentTrack.coverUrl}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                </div>

                <div className="text-center space-y-1.5 max-w-xs sm:max-w-md">
                  <h2 className={`text-xl sm:text-2xl font-bold ${designConfig.textPrimary} tracking-tight truncate`}>
                    {cleanTrackTitle(currentTrack.title, currentTrack.artist)}
                  </h2>
                  <p className={`text-sm sm:text-base ${designConfig.accentText} font-semibold truncate`}>
                    {currentTrack.artist}
                  </p>
                  <p className={`text-xs ${designConfig.textMuted} font-mono`}>
                    {currentTrack.album || "YouTube Music Lossless"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Fullscreen Player Controls Bar */}
          <div className={`relative z-10 p-6 ${designConfig.cardBg} backdrop-blur-2xl border-t ${designConfig.borderSubtle} space-y-4 max-w-3xl mx-auto w-full rounded-t-3xl shadow-2xl`}>
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
                  className={`w-full h-2 ${designConfig.isLight ? "bg-[#e5e0d4]" : "bg-slate-800"} rounded-lg appearance-none cursor-pointer accent-[#c89b3c] focus:outline-none`}
                />
              </div>

              <div className={`flex items-center justify-between text-xs font-mono ${designConfig.textMuted}`}>
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

            {/* Main Buttons Bar: Add to Playlist, Download, Repeat, Shuffle, Play/Pause */}
            <div className="flex items-center justify-between gap-2">
              {/* Left Group: Like, Add to Playlist, Download with progress */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleLike(currentTrack.id)}
                  className={`p-2.5 rounded-xl transition-colors ${
                    isLiked
                      ? "bg-rose-500/20 text-rose-500"
                      : `${designConfig.btnSecondary} ${designConfig.textSecondary}`
                  }`}
                  title="Like track"
                >
                  <Heart className={`w-5 h-5 ${isLiked ? "fill-rose-500" : ""}`} />
                </button>

                {/* Add to Playlist Button */}
                <button
                  onClick={() => setShowAddToPlaylistModal(true)}
                  className={`p-2.5 rounded-xl ${designConfig.btnSecondary} ${designConfig.textSecondary} hover:${designConfig.textPrimary} transition-colors flex items-center gap-1.5 text-xs font-semibold`}
                  title="Add to Playlist"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">Add to Playlist</span>
                </button>

                {/* Download Song Button with Progress */}
                <button
                  onClick={handleCacheOffline}
                  disabled={isCaching || isCachedOffline}
                  className={`p-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors ${
                    isCachedOffline
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : `${designConfig.btnSecondary} ${designConfig.textSecondary}`
                  }`}
                  title={isCachedOffline ? "Saved Locally" : isCaching ? `Downloading (${cacheProgress}%)` : "Download Song"}
                >
                  {isCachedOffline ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <DownloadCloud className={`w-5 h-5 ${isCaching ? "animate-bounce text-[#c89b3c]" : ""}`} />
                  )}
                  <span className="hidden sm:inline">
                    {isCachedOffline ? "Downloaded" : isCaching ? `${cacheProgress}%` : "Download"}
                  </span>
                </button>
              </div>

              {/* Center Group: Shuffle, Previous, Play/Pause, Next, Repeat */}
              <div className="flex items-center gap-3 sm:gap-4">
                <button
                  onClick={() =>
                    setPlayerState((prev) => ({ ...prev, isShuffle: !prev.isShuffle }))
                  }
                  className={`p-2 rounded-lg transition-colors ${
                    isShuffle ? designConfig.accentText : `${designConfig.textMuted} hover:${designConfig.textPrimary}`
                  }`}
                  title="Shuffle"
                >
                  <Shuffle className="w-5 h-5" />
                </button>

                <button
                  onClick={onPrevTrack}
                  className={`p-3 ${designConfig.btnSecondary} ${designConfig.textPrimary} rounded-2xl transition-all active:scale-95`}
                  title="Previous Song"
                >
                  <SkipBack className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                <button
                  onClick={onTogglePlay}
                  className={`p-4 ${designConfig.btnPrimary} text-white rounded-2xl shadow-xl transition-all active:scale-95`}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  onClick={onNextTrack}
                  className={`p-3 ${designConfig.btnSecondary} ${designConfig.textPrimary} rounded-2xl transition-all active:scale-95`}
                  title="Next Song"
                >
                  <SkipForward className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                <button
                  onClick={cycleRepeatMode}
                  className={`p-2 rounded-lg transition-colors ${
                    repeatMode !== "off" ? designConfig.accentText : `${designConfig.textMuted} hover:${designConfig.textPrimary}`
                  }`}
                  title={`Repeat: ${repeatMode}`}
                >
                  {repeatMode === "one" ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
                </button>
              </div>

              {/* Right Group: Volume Slider */}
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={() =>
                    setPlayerState((prev) => ({ ...prev, isMuted: !prev.isMuted }))
                  }
                  className={`p-2 ${designConfig.textMuted} hover:${designConfig.textPrimary}`}
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
                  className={`w-20 h-1.5 ${designConfig.isLight ? "bg-[#e5e0d4]" : "bg-slate-800"} rounded-lg appearance-none cursor-pointer accent-[#c89b3c] focus:outline-none`}
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

        // Layout 0: Designer Studio Floating Dock with Golden Waveform
        if (layout === "designer-waveform") {
          const waveformBars = [
            18, 28, 42, 65, 80, 50, 35, 75, 95, 85, 45, 60, 90, 100, 70, 40,
            85, 92, 60, 30, 45, 78, 95, 88, 55, 38, 70, 92, 80, 45, 60, 85,
            75, 50, 35, 65, 80, 60, 40, 25, 18, 12
          ];

          return (
            <div className={`fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] md:w-[680px] max-w-2xl ${designConfig.cardBg} backdrop-blur-2xl border ${designConfig.borderSubtle} rounded-2xl p-3 px-4 flex flex-col gap-2.5 z-40 select-none shadow-2xl ring-1 ${designConfig.accentBorder} transition-all`}>
              {/* Top Row: Track & Primary Controls */}
              <div className="flex items-center justify-between gap-3">
                {/* Left Play/Pause and Track Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    onClick={onTogglePlay}
                    className={`w-10 h-10 rounded-full ${designConfig.btnPrimary} text-white flex items-center justify-center shadow-md transition-transform active:scale-95 shrink-0`}
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
                    <h4 className={`text-xs sm:text-sm font-bold ${designConfig.textPrimary} truncate group-hover:${designConfig.accentText} transition-colors`}>
                      {cleanTrackTitle(currentTrack.title)}
                    </h4>
                    <p className={`text-[11px] ${designConfig.textMuted} truncate`}>
                      {currentTrack.artist} • <span className={`${designConfig.accentText} font-medium font-mono text-[10px]`}>HD Studio</span>
                    </p>
                  </div>
                </div>

                {/* Right Meta Controls: Like, Add to Playlist, Download, Repeat, Prev, Next, Expand */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onToggleLike(currentTrack.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                    title="Favorite"
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`} />
                  </button>

                  {/* Add to Playlist button on Mini Player */}
                  <button
                    onClick={() => setShowAddToPlaylistModal(true)}
                    className={`p-1.5 ${designConfig.textMuted} hover:${designConfig.textPrimary} transition-colors`}
                    title="Add to Playlist"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  {/* Download button on Mini Player */}
                  <button
                    onClick={handleCacheOffline}
                    disabled={isCaching || isCachedOffline}
                    className={`p-1.5 transition-colors ${
                      isCachedOffline ? "text-emerald-500" : `${designConfig.textMuted} hover:${designConfig.textPrimary}`
                    }`}
                    title={isCachedOffline ? "Downloaded" : isCaching ? `Downloading (${cacheProgress}%)` : "Download song locally"}
                  >
                    {isCachedOffline ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <DownloadCloud className={`w-4 h-4 ${isCaching ? "animate-bounce text-[#c89b3c]" : ""}`} />
                    )}
                  </button>

                  <button
                    onClick={() =>
                      setPlayerState((prev) => ({ ...prev, isShuffle: !prev.isShuffle }))
                    }
                    className={`p-1.5 transition-colors ${
                      isShuffle ? designConfig.accentText : `${designConfig.textMuted} hover:${designConfig.textPrimary}`
                    }`}
                    title={isShuffle ? "Shuffle is ON" : "Shuffle is OFF"}
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={onPrevTrack}
                    className={`p-1.5 ${designConfig.textMuted} hover:${designConfig.textPrimary} transition-colors`}
                    title="Previous"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  <button
                    onClick={onNextTrack}
                    className={`p-1.5 ${designConfig.textMuted} hover:${designConfig.textPrimary} transition-colors`}
                    title="Next"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>

                  {/* Repeat button on Mini Player */}
                  <button
                    onClick={cycleRepeatMode}
                    className={`p-1.5 transition-colors ${
                      repeatMode !== "off" ? designConfig.accentText : `${designConfig.textMuted} hover:${designConfig.textPrimary}`
                    }`}
                    title={`Repeat: ${repeatMode}`}
                  >
                    {repeatMode === "one" ? <Repeat1 className="w-3.5 h-3.5" /> : <Repeat className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => setPlayerState((prev) => ({ ...prev, isFullscreen: true }))}
                    className={`p-1.5 ${designConfig.textMuted} hover:${designConfig.textPrimary} transition-colors`}
                    title="Full View"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Bottom Row: Golden Waveform Scrubber & Timestamps */}
              <div className="flex items-center gap-3 pt-0.5">
                <div 
                  className={`flex-1 h-8 flex items-center justify-between gap-[2px] sm:gap-[3px] cursor-pointer relative py-1 px-1 rounded-xl ${designConfig.inputBg} border ${designConfig.borderSubtle} hover:border-[#c89b3c]/50 transition-colors`}
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
                              : "bg-[#d8d2c4] dark:bg-slate-700 hover:bg-[#c89b3c]/60"
                          } ${isPlaying && isPassed ? "animate-pulse" : ""}`}
                          style={{
                            height: `${Math.max(15, isPlaying ? (heightPct * (0.7 + (Math.sin(idx + currentTime * 3) * 0.3))) : heightPct)}%`,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className={`text-[11px] font-mono font-medium ${designConfig.textMuted} shrink-0 whitespace-nowrap`}>
                  <span>{Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, "0")}</span>
                  <span className="mx-1">/</span>
                  <span>{Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, "0")}</span>
                </div>
              </div>
            </div>
          );
        }

        // Layout 1: Floating Dock Pill (Modern Theme Responsive)
        return (
          <div className={`fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] md:w-[600px] max-w-xl ${designConfig.cardBg} backdrop-blur-2xl border ${designConfig.borderSubtle} rounded-2xl p-2.5 px-3.5 flex items-center justify-between z-40 select-none shadow-2xl`}>
            {/* Left Track Info */}
            <div 
              onClick={() => setPlayerState((prev) => ({ ...prev, isFullscreen: true }))}
              className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group pr-2"
            >
              <div className={`relative w-11 h-11 rounded-xl overflow-hidden shrink-0 border ${designConfig.accentBorder}`}>
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
                <h4 className={`text-xs sm:text-sm font-bold ${designConfig.textPrimary} truncate group-hover:${designConfig.accentText} transition-colors`}>
                  {cleanTrackTitle(currentTrack.title)}
                </h4>
                <p className={`text-[11px] ${designConfig.textMuted} truncate`}>{currentTrack.artist}</p>
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => onToggleLike(currentTrack.id)}
                className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                title="Like"
              >
                <Heart className={`w-4 h-4 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`} />
              </button>

              <button
                onClick={() => setShowAddToPlaylistModal(true)}
                className={`p-1.5 ${designConfig.textMuted} hover:${designConfig.textPrimary} transition-colors`}
                title="Add to Playlist"
              >
                <Plus className="w-4 h-4" />
              </button>

              <button
                onClick={handleCacheOffline}
                disabled={isCaching || isCachedOffline}
                className={`p-1.5 transition-colors ${
                  isCachedOffline ? "text-emerald-500" : `${designConfig.textMuted} hover:${designConfig.textPrimary}`
                }`}
                title={isCachedOffline ? "Downloaded" : "Download"}
              >
                {isCachedOffline ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <DownloadCloud className={`w-4 h-4 ${isCaching ? "animate-bounce text-[#c89b3c]" : ""}`} />
                )}
              </button>

              <button
                onClick={() =>
                  setPlayerState((prev) => ({ ...prev, isShuffle: !prev.isShuffle }))
                }
                className={`p-1.5 transition-colors ${
                  isShuffle ? designConfig.accentText : `${designConfig.textMuted} hover:${designConfig.textPrimary}`
                }`}
                title={isShuffle ? "Shuffle is ON" : "Shuffle is OFF"}
              >
                <Shuffle className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onPrevTrack}
                className={`p-1.5 ${designConfig.textMuted} hover:${designConfig.textPrimary} transition-colors`}
                title="Previous"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={onTogglePlay}
                className={`w-9 h-9 rounded-full ${designConfig.btnPrimary} text-white flex items-center justify-center shadow-lg transition-transform active:scale-95`}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
              </button>

              <button
                onClick={onNextTrack}
                className={`p-1.5 ${designConfig.textMuted} hover:${designConfig.textPrimary} transition-colors`}
                title="Next"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <button
                onClick={cycleRepeatMode}
                className={`p-1.5 transition-colors ${
                  repeatMode !== "off" ? designConfig.accentText : `${designConfig.textMuted} hover:${designConfig.textPrimary}`
                }`}
                title={`Repeat: ${repeatMode}`}
              >
                {repeatMode === "one" ? <Repeat1 className="w-3.5 h-3.5" /> : <Repeat className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => setPlayerState((prev) => ({ ...prev, isFullscreen: true }))}
                className={`p-1.5 ${designConfig.textMuted} hover:${designConfig.textPrimary} transition-colors`}
                title="Expand"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })()}
    </>
  );
};
