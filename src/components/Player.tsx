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

  // Sync Audio Element source with offline cache or direct URL
  useEffect(() => {
    let isCancelled = false;
    const prepareAudio = async () => {
      if (!currentTrack || !audioRef.current) return;

      const cached = await isTrackCached(currentTrack.id);
      setIsCachedOffline(cached);

      let srcUrl = currentTrack.audioUrl;
      if (cached) {
        const cachedBlobUrl = await getCachedTrackAudioUrl(currentTrack.id);
        if (cachedBlobUrl && !isCancelled) {
          srcUrl = cachedBlobUrl;
        }
      }

      if (!isCancelled && audioRef.current.src !== srcUrl) {
        audioRef.current.src = srcUrl;
        audioRef.current.volume = isMuted ? 0 : volume;
        if (isPlaying) {
          audioRef.current.play().catch((err) => console.log("Autoplay blocked:", err));
        }
      }
    };

    prepareAudio();
    return () => {
      isCancelled = true;
    };
  }, [currentTrack?.id]);

  // Handle Play/Pause
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch((err) => console.log("Audio play error:", err));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  // Handle Volume Change
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // MediaSession API Integration for background playback & lockscreen controls
  useEffect(() => {
    if ("mediaSession" in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || "Oblivion YouTube Music",
        artwork: [
          { src: currentTrack.coverUrl, sizes: "512x512", type: "image/jpeg" },
        ],
      });

      navigator.mediaSession.setActionHandler("play", () => onTogglePlay());
      navigator.mediaSession.setActionHandler("pause", () => onTogglePlay());
      navigator.mediaSession.setActionHandler("previoustrack", () => onPrevTrack());
      navigator.mediaSession.setActionHandler("nexttrack", () => onNextTrack());
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime !== undefined) onSeek(details.seekTime);
      });
    }
  }, [currentTrack?.id, currentTrack?.title]);

  // Time update event handler
  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setPlayerState((prev) => ({
      ...prev,
      currentTime: audioRef.current?.currentTime || 0,
      duration: audioRef.current?.duration || currentTrack?.duration || 0,
    }));

    if ("mediaSession" in navigator && audioRef.current.duration) {
      try {
        navigator.mediaSession.setPositionState({
          duration: audioRef.current.duration,
          playbackRate: audioRef.current.playbackRate,
          position: audioRef.current.currentTime,
        });
      } catch (err) {
        // ignore timing bounds error
      }
    }
  };

  // Handle track end
  const handleEnded = () => {
    if (repeatMode === "one" && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } else {
      onNextTrack();
    }
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

  if (!currentTrack) return null;

  return (
    <>
      {/* Hidden Native Audio Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
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
                    if (audioRef.current) audioRef.current.currentTime = time;
                    onSeek(time);
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

      {/* Floating Bottom Deck Player Bar */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 h-20 bg-slate-950/90 backdrop-blur-2xl border-t border-slate-800/80 px-4 flex items-center justify-between z-30 select-none shadow-2xl">
        {/* Track Info & Artwork */}
        <div className="flex items-center gap-3 min-w-0 w-1/3">
          <div
            onClick={() => setPlayerState((prev) => ({ ...prev, isFullscreen: true }))}
            className="relative w-12 h-12 rounded-xl overflow-hidden cursor-pointer group shrink-0 border border-slate-800"
          >
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Maximize2 className="w-4 h-4 text-white" />
            </div>
          </div>

          <div className="min-w-0">
            <h4
              onClick={() => setPlayerState((prev) => ({ ...prev, isFullscreen: true }))}
              className="text-sm font-semibold text-white truncate cursor-pointer hover:text-cyan-400 transition-colors"
            >
              {currentTrack.title}
            </h4>
            <p className="text-xs text-slate-400 truncate">{currentTrack.artist}</p>
          </div>

          <button
            onClick={() => onToggleLike(currentTrack.id)}
            className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors hidden sm:block"
          >
            <Heart className={`w-4 h-4 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`} />
          </button>
        </div>

        {/* Center Controls */}
        <div className="flex flex-col items-center justify-center w-1/3 space-y-1">
          <div className="flex items-center gap-3">
            <button
              onClick={onPrevTrack}
              className="p-1.5 text-slate-400 hover:text-white transition-colors"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={onTogglePlay}
              className="p-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-full shadow-md shadow-cyan-400/20 transition-all active:scale-95"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-slate-950" /> : <Play className="w-5 h-5 fill-slate-950 ml-0.5" />}
            </button>

            <button
              onClick={onNextTrack}
              className="p-1.5 text-slate-400 hover:text-white transition-colors"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Mini progress line */}
          <div className="w-full max-w-xs flex items-center gap-2 text-[10px] font-mono text-slate-500">
            <span>
              {Math.floor(currentTime / 60)}:
              {String(Math.floor(currentTime % 60)).padStart(2, "0")}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => {
                const time = Number(e.target.value);
                if (audioRef.current) audioRef.current.currentTime = time;
                onSeek(time);
              }}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
            />
            <span>
              {Math.floor(duration / 60)}:
              {String(Math.floor(duration % 60)).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center justify-end gap-2 w-1/3">
          <button
            onClick={() =>
              setPlayerState((prev) => ({
                ...prev,
                isFullscreen: true,
                showLyrics: true,
                showSimilar: false,
              }))
            }
            className="p-2 text-slate-400 hover:text-cyan-400 transition-colors hidden sm:block"
            title="Lyrics"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          <button
            onClick={() =>
              setPlayerState((prev) => ({
                ...prev,
                isFullscreen: true,
                showSimilar: true,
                showLyrics: false,
              }))
            }
            className="p-2 text-slate-400 hover:text-cyan-400 transition-colors hidden sm:block"
            title="Similar Radio"
          >
            <Radio className="w-4 h-4" />
          </button>

          <button
            onClick={() => setPlayerState((prev) => ({ ...prev, isFullscreen: true }))}
            className="p-2 text-slate-400 hover:text-white transition-colors"
            title="Expand player"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
};
