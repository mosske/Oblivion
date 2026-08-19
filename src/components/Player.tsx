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
  ChevronDown,
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
import { cleanTrackTitle, getPlayableAudioUrl, getHdCoverUrl } from "../utils/formatters";
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

// Generate valid PCM silent WAV with real headers & samples to keep background media locks active
function writeWavString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function createSilentAudioUrl(): string {
  try {
    const sampleRate = 8000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const numSamples = sampleRate * 2; // 2 seconds
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const dataSize = numSamples * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    writeWavString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeWavString(view, 8, 'WAVE');

    writeWavString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    writeWavString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  } catch {
    return "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
  }
}

let cachedSilentUrl: string | null = null;
function getSilentAudioUrl(): string {
  if (!cachedSilentUrl) {
    cachedSilentUrl = createSilentAudioUrl();
  }
  return cachedSilentUrl;
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
  const userManualPauseRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);


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

  const isPlayingRef = useRef<boolean>(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

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

  // Initialize and update YouTube IFrame Player with rock-solid continuous playback
  useEffect(() => {
    if (!currentTrack) return;

    // Reset manual pause ref and reset currentTime to 0 when a new track is queued or changed
    userManualPauseRef.current = false;
    setPlayerState((prev) => (prev.currentTime === 0 ? prev : { ...prev, currentTime: 0 }));

    // Reset native audio element timestamp
    if (audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
      } catch {}
    }

    // Mark track change in progress to avoid YouTube's internal buffering pause event from toggling isPlaying
    isChangingTrackRef.current = true;
    if (isChangingTrackTimeoutRef.current) clearTimeout(isChangingTrackTimeoutRef.current);
    isChangingTrackTimeoutRef.current = setTimeout(() => {
      isChangingTrackRef.current = false;
    }, 2500);

    const isDirect11CharId = (id?: string) => Boolean(id && id.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(id));

    let videoId =
      isDirect11CharId(currentTrack.youtubeVideoId)
        ? currentTrack.youtubeVideoId!
        : isDirect11CharId(currentTrack.id)
        ? currentTrack.id
        : null;

    const executePlay = (targetVid: string) => {
      if (!isYtReadyRef.current || !ytPlayerRef.current) return;
      try {
        ytPlayerRef.current.unMute?.();
        ytPlayerRef.current.setVolume?.(isMuted ? 0 : volume * 100);
        if (isPlayingRef.current && !userManualPauseRef.current) {
          ytPlayerRef.current.loadVideoById({
            videoId: targetVid,
            startSeconds: 0,
          });
          ytPlayerRef.current.unMute?.();
          ytPlayerRef.current.setVolume?.(isMuted ? 0 : volume * 100);
          ytPlayerRef.current.playVideo?.();
        } else {
          if (typeof ytPlayerRef.current.cueVideoById === "function") {
            ytPlayerRef.current.cueVideoById({
              videoId: targetVid,
              startSeconds: 0,
            });
          } else {
            ytPlayerRef.current.loadVideoById({
              videoId: targetVid,
              startSeconds: 0,
            });
            ytPlayerRef.current.pauseVideo?.();
          }
        }
      } catch (e) {
        console.warn("YT executePlay error:", e);
      }
    };

    const resolveAndPlay = async () => {
      if (!videoId) {
        try {
          const q = `${cleanTrackTitle(currentTrack.title, currentTrack.artist)} ${currentTrack.artist || ""}`.trim();
          const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}&type=track`);
          if (res.ok) {
            const data = await res.json();
            const first = data.results?.[0];
            if (first && isDirect11CharId(first.id || first.youtubeVideoId)) {
              videoId = first.id || first.youtubeVideoId;
              setPlayerState((prev) => ({
                ...prev,
                currentTrack: prev.currentTrack
                  ? { ...prev.currentTrack, youtubeVideoId: videoId!, id: videoId! }
                  : prev.currentTrack,
              }));
            }
          }
        } catch (_err) {}
      }

      const finalVid = videoId || "kJQP7kiw5Fk";

      if (!window.YT || !window.YT.Player) {
        window.onYouTubeIframeAPIReady = () => {
          initYT(finalVid);
        };
        return;
      }

      if (!ytPlayerRef.current) {
        initYT(finalVid);
      } else {
        executePlay(finalVid);
      }
    };

    const initYT = (vid: string) => {
      try {
        const streamContainer = document.getElementById("oblivion-yt-stream-engine");
        if (!streamContainer) return;

        ytPlayerRef.current = new window.YT.Player("oblivion-yt-stream-engine", {
          height: "200",
          width: "200",
          videoId: vid,
          playerVars: {
            autoplay: isPlayingRef.current && !userManualPauseRef.current ? 1 : 0,
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
              event.target.unMute?.();
              event.target.setVolume?.(isMuted ? 0 : volume * 100);
              if (isPlayingRef.current && !userManualPauseRef.current) {
                event.target.playVideo();
              } else {
                try {
                  event.target.pauseVideo();
                } catch {}
              }
            },
            onStateChange: (event: any) => {
              // 1 = PLAYING, 2 = PAUSED, 0 = ENDED, 3 = BUFFERING, 5 = CUED, -1 = UNSTARTED
              if (event.data === 1) {
                isChangingTrackRef.current = false;
                event.target.unMute?.();
                event.target.setVolume?.(isMuted ? 0 : volume * 100);
                const dur = event.target.getDuration?.() || 0;
                setPlayerState((prev) => ({
                  ...prev,
                  isPlaying: true,
                  duration: dur > 0 ? dur : prev.duration,
                }));
              } else if (event.data === 2) {
                // If YouTube emits pause during track transitions or background without manual user pause:
                if (isChangingTrackRef.current || (!userManualPauseRef.current && isPlayingRef.current)) {
                  try {
                    event.target.playVideo();
                  } catch {}
                  return;
                }
                if (userManualPauseRef.current) {
                  setPlayerState((prev) => (!prev.isPlaying ? prev : { ...prev, isPlaying: false }));
                }
              } else if (event.data === 5 || event.data === -1) {
                if (isPlayingRef.current && !userManualPauseRef.current) {
                  try {
                    event.target.unMute?.();
                    event.target.setVolume?.(isMuted ? 0 : volume * 100);
                    event.target.playVideo();
                  } catch {}
                }
              } else if (event.data === 0) {
                handleEnded();
              }
            },
            onError: (err: any) => {
              console.warn("YouTube stream notice:", err);
              // Automatic recovery for video embed restrictions (codes 100, 101, 150)
              if (err.data === 101 || err.data === 150 || err.data === 100) {
                const altQuery = `${cleanTrackTitle(currentTrack.title, currentTrack.artist)} audio official`.trim();
                fetch(`/api/youtube/search?q=${encodeURIComponent(altQuery)}&type=track`)
                  .then((r) => r.json())
                  .then((d) => {
                    const fallbackTrack = d.results?.find((t: any) => (t.id || t.youtubeVideoId) !== vid);
                    if (fallbackTrack && (fallbackTrack.id || fallbackTrack.youtubeVideoId)) {
                      const newId = fallbackTrack.id || fallbackTrack.youtubeVideoId;
                      executePlay(newId);
                    }
                  })
                  .catch(() => {});
              }
            },
          },
        });
      } catch (e) {
        console.warn("YT Player init error:", e);
      }
    };

    const cachedCheck = async () => {
      const cached = await isTrackCached(currentTrack.id);
      setIsCachedOffline(cached);
      if (cached && audioRef.current) {
        const cachedBlob = await getCachedTrackAudioUrl(currentTrack.id);
        if (cachedBlob) {
          audioRef.current.src = cachedBlob;
          audioRef.current.loop = false;
          if (isPlaying && !userManualPauseRef.current) {
            audioRef.current.play().catch(() => {});
          }
          return;
        }
      }
      resolveAndPlay();
    };

    cachedCheck();
  }, [currentTrack?.id, currentTrack?.youtubeVideoId]);

  // Sync isPlaying state to players and maintain background audio keepalive
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
        if (!isCachedOffline) {
          // Play silent audio loop with valid PCM frames so Chrome registers active audio session for background playback & notification controls
          const silentUrl = getSilentAudioUrl();
          if (audioRef.current.src !== silentUrl) {
            audioRef.current.src = silentUrl;
            audioRef.current.loop = true;
            audioRef.current.volume = 0.001;
          }
        }
        audioRef.current.play().catch(() => {});
      } else if (!isChangingTrackRef.current) {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, isCachedOffline]);

  // Sync volume state to players
  useEffect(() => {
    const effectiveVolume = isMuted ? 0 : volume;
    if (isYtReadyRef.current && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.setVolume?.(effectiveVolume * 100);
      } catch {}
    }
    if (audioRef.current && isCachedOffline) {
      audioRef.current.volume = effectiveVolume;
    }
  }, [volume, isMuted, isCachedOffline]);

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

  // User manual play/pause toggle handler
  const handleUserTogglePlay = (explicitPlay?: boolean) => {
    // Wake up / resume AudioContext on user gesture for reliable background playback
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioContextRef.current = new AudioCtx();
        }
      }
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume().catch(() => {});
      }
    } catch {}

    if (explicitPlay !== undefined) {
      userManualPauseRef.current = !explicitPlay;
    } else {
      userManualPauseRef.current = isPlaying;
    }
    onTogglePlay();
  };

  // Background play & minimize listener for mobile Android Chrome
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && isPlaying && !userManualPauseRef.current) {
        try {
          // Keep YouTube stream active
          ytPlayerRef.current?.playVideo?.();
          // Keep audio element active
          if (audioRef.current) {
            audioRef.current.play().catch(() => {});
          }
          // Keep AudioContext active
          if (audioContextRef.current && audioContextRef.current.state === "suspended") {
            audioContextRef.current.resume().catch(() => {});
          }
        } catch {}
      }
    };

    if (settings.backgroundPlay === false) {
      const handleVisibilityChange = () => {
        if (document.hidden && isPlaying) {
          handleUserTogglePlay(false);
        }
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);
      return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    } else {
      document.addEventListener("visibilitychange", handleVisibility);
      window.addEventListener("pagehide", handleVisibility);
      window.addEventListener("blur", handleVisibility);
      return () => {
        document.removeEventListener("visibilitychange", handleVisibility);
        window.removeEventListener("pagehide", handleVisibility);
        window.removeEventListener("blur", handleVisibility);
      };
    }
  }, [settings.backgroundPlay, isPlaying, isCachedOffline]);

  // MediaSession API Integration for background playback & Android pull-down notification controls
  useEffect(() => {
    if ("mediaSession" in navigator && currentTrack) {
      const cover = currentTrack.coverUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=500&q=80";
      
      navigator.mediaSession.metadata = new MediaMetadata({
        title: cleanTrackTitle(currentTrack.title, currentTrack.artist),
        artist: currentTrack.artist || "YouTube Music",
        album: currentTrack.album || "Oblivion Live Stream",
        artwork: [
          { src: cover, sizes: "96x96", type: "image/jpeg" },
          { src: cover, sizes: "128x128", type: "image/jpeg" },
          { src: cover, sizes: "192x192", type: "image/jpeg" },
          { src: cover, sizes: "256x256", type: "image/jpeg" },
          { src: cover, sizes: "384x384", type: "image/jpeg" },
          { src: cover, sizes: "512x512", type: "image/jpeg" },
        ],
      });

      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

      // Register full action handlers so Android pulls down Prev, Next, Play, Pause, Seek controls
      const mediaActions: [MediaSessionAction, MediaSessionActionHandler][] = [
        ["play", () => {
          userManualPauseRef.current = false;
          if (!isPlaying) onTogglePlay();
        }],
        ["pause", () => {
          userManualPauseRef.current = true;
          if (isPlaying) onTogglePlay();
        }],
        ["previoustrack", () => {
          userManualPauseRef.current = false;
          onPrevTrack();
        }],
        ["nexttrack", () => {
          userManualPauseRef.current = false;
          onNextTrack();
        }],
        ["seekto", (details) => {
          if (details.seekTime !== undefined && !isNaN(details.seekTime)) {
            handleSeekInternal(details.seekTime);
          }
        }],
        ["seekbackward", (details) => {
          const offset = details.seekOffset || 10;
          handleSeekInternal(Math.max(0, currentTime - offset));
        }],
        ["seekforward", (details) => {
          const offset = details.seekOffset || 10;
          handleSeekInternal(Math.min(duration || 1000, currentTime + offset));
        }],
        ["stop", () => {
          userManualPauseRef.current = true;
          onTogglePlay();
        }],
      ];

      mediaActions.forEach(([action, handler]) => {
        try {
          navigator.mediaSession.setActionHandler(action, handler);
        } catch {
          // Ignore unsupported action on browser
        }
      });

      // Update position state for Android notification scrubber
      if ("setPositionState" in navigator.mediaSession && duration > 0 && !isNaN(duration) && !isNaN(currentTime)) {
        try {
          navigator.mediaSession.setPositionState({
            duration: Math.max(duration, 1),
            playbackRate: 1,
            position: Math.min(Math.max(currentTime, 0), duration),
          });
        } catch {}
      }
    }
  }, [currentTrack?.id, currentTrack?.title, currentTrack?.artist, isPlaying, duration, currentTime, onPrevTrack, onNextTrack, onTogglePlay]);

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

  return (
    <>
      {/* Background-persistent YouTube IFrame Streaming Engine */}
      <div
        id="oblivion-yt-stream-engine"
        className="fixed bottom-0 right-0 w-4 h-4 pointer-events-none opacity-[0.01] z-0 overflow-hidden"
      />

      {/* Hidden Native Audio Element for Offline Cache & Mobile Background Audio Session */}
      <audio
        ref={audioRef}
        playsInline
        autoPlay
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={() => console.warn("Audio element fallback")}
        preload="auto"
      />

      {!currentTrack ? null : (
        <>
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

      {/* Fullscreen Player Modal / Expansion - 100% Full-Screen Opaque Immersive Studio */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[100] w-screen h-screen min-h-screen bg-[#04060a] text-white flex flex-col justify-between overflow-hidden select-none animate-fade-in">
          {/* Animated Dynamic Ambient Background based on the HD Cover Art */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
            {/* Layer 1: Ambient Pulsing Blurred Artwork */}
            <img
              src={getHdCoverUrl(currentTrack.coverUrl)}
              alt=""
              className="w-full h-full object-cover blur-[100px] opacity-45 scale-135 animate-ambient-pulse"
              onError={(e) => {
                // Fallback to standard cover if HD upscaled URL encounters 404
                if (currentTrack.coverUrl && e.currentTarget.src !== currentTrack.coverUrl) {
                  e.currentTarget.src = currentTrack.coverUrl;
                }
              }}
            />
            {/* Layer 2: Moving Ambient Color Orbs */}
            <div className="absolute -top-32 left-1/4 w-[550px] h-[550px] rounded-full bg-[#c89b3c]/20 blur-[130px] animate-ambient-orb" />
            <div className="absolute -bottom-32 right-1/4 w-[500px] h-[500px] rounded-full bg-cyan-600/15 blur-[140px] animate-ambient-orb" />
            {/* Layer 3: Pure Opaque Gradient Veil to prevent any background visibility */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#04060a]/90 via-[#04060a]/50 to-[#04060a]/95" />
          </div>

          {/* Top Bar Navigation */}
          <div className="relative z-20 flex items-center justify-between p-4 sm:p-6 border-b border-white/10 bg-[#04060a]/40 backdrop-blur-2xl">
            {/* Left: Minimize Button */}
            <button
              onClick={() => setPlayerState((prev) => ({ ...prev, isFullscreen: false }))}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/15 backdrop-blur-xl transition-all hover:scale-105 active:scale-95 shadow-lg flex items-center gap-1.5"
              title="Minimize Full Player"
            >
              <ChevronDown className="w-6 h-6" />
              <span className="text-xs font-semibold hidden sm:inline">Minimize</span>
            </button>

            {/* Center: Now Playing Info Badge */}
            <div className="text-center px-4 max-w-md truncate">
              <div className="flex items-center justify-center gap-2 mb-0.5">
                <span className="w-2 h-2 rounded-full bg-[#c89b3c] animate-pulse"></span>
                <span className="text-[10px] sm:text-xs font-mono font-bold tracking-widest uppercase text-[#c89b3c]">
                  NOW PLAYING IN OBLIVION
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-white/90 truncate">
                {cleanTrackTitle(currentTrack.title, currentTrack.artist)}
              </p>
            </div>

            {/* Right: Quick Toggles (Lyrics, Radio, Minimize) */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() =>
                  setPlayerState((prev) => ({ ...prev, showLyrics: !prev.showLyrics, showSimilar: false }))
                }
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                  showLyrics
                    ? "bg-[#c89b3c] text-slate-950 border-[#c89b3c] shadow-lg font-bold"
                    : "bg-white/10 hover:bg-white/15 text-white/90 border-white/10"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Lyrics</span>
              </button>

              <button
                onClick={() =>
                  setPlayerState((prev) => ({ ...prev, showSimilar: !prev.showSimilar, showLyrics: false }))
                }
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                  showSimilar
                    ? "bg-[#c89b3c] text-slate-950 border-[#c89b3c] shadow-lg font-bold"
                    : "bg-white/10 hover:bg-white/15 text-white/90 border-white/10"
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Radio</span>
              </button>
            </div>
          </div>

          {/* Main Fullscreen Center Body */}
          <div className="relative z-10 flex-1 flex flex-col md:flex-row items-center justify-center p-4 sm:p-6 md:p-8 gap-6 sm:gap-8 overflow-hidden min-h-0">
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
              /* Central HD Album Artwork & Dynamic Stage */
              <div className="flex flex-col items-center justify-center space-y-6 sm:space-y-7 max-w-md w-full animate-fade-in my-auto">
                {/* HD Cover Art with Ambient Shadow and Glowing Ring */}
                <div className="relative group">
                  {/* Subtle dynamic glow ring around the album artwork */}
                  <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-[#c89b3c]/30 to-cyan-500/20 blur-xl opacity-75 group-hover:opacity-100 transition duration-500 pointer-events-none" />

                  <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-3xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.9)] border-2 border-white/20">
                    <img
                      src={getHdCoverUrl(currentTrack.coverUrl)}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
                      onError={(e) => {
                        if (currentTrack.coverUrl && e.currentTarget.src !== currentTrack.coverUrl) {
                          e.currentTarget.src = currentTrack.coverUrl;
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  </div>
                </div>

                {/* Song Title, Artist, & Master Quality Tag */}
                <div className="text-center space-y-2 max-w-xs sm:max-w-md w-full px-2">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight truncate drop-shadow-md">
                    {cleanTrackTitle(currentTrack.title, currentTrack.artist)}
                  </h2>
                  <p className="text-sm sm:text-base text-[#c89b3c] font-semibold truncate">
                    {currentTrack.artist}
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-[11px] font-mono text-white/80">
                      {currentTrack.album || "YouTube Music HD"}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#c89b3c]/20 border border-[#c89b3c]/30 text-[11px] font-mono text-[#c89b3c]">
                      Lossless Audio
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fullscreen Player Controls Bar */}
          <div className="relative z-20 p-5 sm:p-6 border-t border-white/10 bg-[#04060a]/80 backdrop-blur-2xl space-y-4 max-w-3xl mx-auto w-full rounded-t-3xl shadow-2xl">
            {/* Seekbar Slider */}
            <div className="space-y-1.5">
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
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#c89b3c] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-white/60">
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

            {/* Main Buttons Bar: Like, Add to Playlist, Download, Shuffle, Prev, Play/Pause, Next, Repeat, Volume */}
            <div className="flex items-center justify-between gap-2">
              {/* Left Group: Like, Add to Playlist, Download */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => onToggleLike(currentTrack.id)}
                  className={`p-2.5 rounded-xl border transition-all active:scale-95 ${
                    isLiked
                      ? "bg-rose-500/20 text-rose-500 border-rose-500/30"
                      : "bg-white/10 hover:bg-white/15 text-white/80 border-white/10"
                  }`}
                  title="Like track"
                >
                  <Heart className={`w-5 h-5 ${isLiked ? "fill-rose-500" : ""}`} />
                </button>

                {/* Add to Playlist Button */}
                <button
                  onClick={() => setShowAddToPlaylistModal(true)}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 hover:text-white border border-white/10 transition-all flex items-center gap-1.5 text-xs font-semibold active:scale-95"
                  title="Add to Playlist"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden md:inline">Add</span>
                </button>

                {/* Download Song Button with Progress */}
                <button
                  onClick={handleCacheOffline}
                  disabled={isCaching || isCachedOffline}
                  className={`p-2.5 rounded-xl text-xs flex items-center gap-1.5 border transition-all active:scale-95 ${
                    isCachedOffline
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : "bg-white/10 hover:bg-white/15 text-white/80 border-white/10"
                  }`}
                  title={isCachedOffline ? "Saved Locally" : isCaching ? `Downloading (${cacheProgress}%)` : "Download Song"}
                >
                  {isCachedOffline ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <DownloadCloud className={`w-5 h-5 ${isCaching ? "animate-bounce text-[#c89b3c]" : ""}`} />
                  )}
                  <span className="hidden md:inline">
                    {isCachedOffline ? "Saved" : isCaching ? `${cacheProgress}%` : "Download"}
                  </span>
                </button>
              </div>

              {/* Center Group: Shuffle, Previous, Play/Pause, Next, Repeat */}
              <div className="flex items-center gap-2 sm:gap-4">
                <button
                  onClick={() =>
                    setPlayerState((prev) => ({ ...prev, isShuffle: !prev.isShuffle }))
                  }
                  className={`p-2 rounded-lg transition-colors ${
                    isShuffle ? "text-[#c89b3c]" : "text-white/60 hover:text-white"
                  }`}
                  title="Shuffle"
                >
                  <Shuffle className="w-5 h-5" />
                </button>

                <button
                  onClick={onPrevTrack}
                  className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/10 transition-all active:scale-95 shadow-md"
                  title="Previous Song"
                >
                  <SkipBack className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                <button
                  onClick={() => handleUserTogglePlay()}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#c89b3c] hover:bg-[#d8ab4c] text-slate-950 flex items-center justify-center shadow-[0_0_30px_rgba(200,155,60,0.45)] ring-4 ring-[#c89b3c]/20 transition-all active:scale-95"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 sm:w-7 sm:h-7 fill-slate-950" />
                  ) : (
                    <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-slate-950 ml-0.5" />
                  )}
                </button>

                <button
                  onClick={onNextTrack}
                  className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/10 transition-all active:scale-95 shadow-md"
                  title="Next Song"
                >
                  <SkipForward className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                <button
                  onClick={cycleRepeatMode}
                  className={`p-2 rounded-lg transition-colors ${
                    repeatMode !== "off" ? "text-[#c89b3c]" : "text-white/60 hover:text-white"
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
                  className="p-2 text-white/60 hover:text-white transition-colors"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5 text-rose-400" />
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
                  className="w-20 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#c89b3c] focus:outline-none"
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
                    onClick={() => handleUserTogglePlay()}
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
                onClick={() => handleUserTogglePlay()}
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
      )}
    </>
  );
};
