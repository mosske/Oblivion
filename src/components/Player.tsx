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
  onOpenAddToPlaylistModal?: (track: Track) => void;
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

function getFullPlayerThemeStyles(design: FullAppDesignConfig) {
  switch (design.id) {
    case "designer":
      return {
        bgCanvas: "bg-gradient-to-b from-[#081e17] via-[#0d2820] to-[#040f0b]",
        orb1: "bg-[#c89b3c]/25",
        orb2: "bg-emerald-600/20",
        veil: "bg-gradient-to-b from-[#081e17]/90 via-[#081e17]/50 to-[#040f0b]/95",
        topBar: "bg-[#fbfaf7]/95 border-[#e6e2d8] text-[#181816] shadow-sm",
        minimizeBtn: "bg-[#ede8dc] hover:bg-[#e2ddd1] text-[#181816] border-[#d8d2c4] shadow-sm",
        nowPlayingDot: "bg-[#c89b3c]",
        nowPlayingLabel: "text-[#c89b3c]",
        nowPlayingTitle: "text-[#181816]",
        tabActive: "bg-[#c89b3c] text-white border-[#c89b3c] shadow-md font-bold",
        tabInactive: "bg-[#ede8dc] hover:bg-[#e2ddd1] text-[#181816] border-[#d8d2c4]",
        artGlowRing: "from-[#c89b3c]/40 via-emerald-600/30 to-[#c89b3c]/40",
        artBorder: "border-[#e6e2d8]/60 shadow-[0_25px_60px_rgba(0,0,0,0.6)]",
        stageTitle: "text-white drop-shadow-md",
        stageArtist: "text-[#c89b3c]",
        stageTagAccent: "bg-[#c89b3c]/20 border-[#c89b3c]/40 text-[#c89b3c]",
        stageTagNeutral: "bg-white/10 border-white/20 text-white",
        bottomDeck: "bg-[#fbfaf7]/98 border-[#e6e2d8] text-[#181816] shadow-2xl ring-1 ring-[#c89b3c]/20",
        seekbarTrack: "bg-[#e2ddd1]",
        seekbarAccent: "accent-[#c89b3c]",
        timeText: "text-[#6b675e]",
        playBtn: "bg-[#c89b3c] hover:bg-[#d8a846] text-white shadow-[0_0_25px_rgba(200,155,60,0.45)] ring-4 ring-[#c89b3c]/25",
        playIconFill: "fill-white",
        ctrlBtn: "bg-[#ede8dc] hover:bg-[#e2ddd1] text-[#181816] border-[#d8d2c4] shadow-sm",
        activeText: "text-[#c89b3c]",
        mutedText: "text-[#8c887e] hover:text-[#181816]",
        volSlider: "bg-[#e2ddd1] accent-[#c89b3c]",
      };
    case "cyberpunk-neon":
      return {
        bgCanvas: "bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950",
        orb1: "bg-cyan-500/30",
        orb2: "bg-fuchsia-600/25",
        veil: "bg-gradient-to-b from-slate-950/90 via-slate-950/50 to-slate-950/95",
        topBar: "bg-slate-950/90 border-slate-800/80 text-white shadow-sm",
        minimizeBtn: "bg-slate-900/90 hover:bg-slate-800 text-cyan-300 border-slate-700/80 shadow-sm",
        nowPlayingDot: "bg-cyan-400",
        nowPlayingLabel: "text-cyan-400",
        nowPlayingTitle: "text-white",
        tabActive: "bg-cyan-400 text-slate-950 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)] font-bold",
        tabInactive: "bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700",
        artGlowRing: "from-cyan-500/40 via-fuchsia-500/30 to-cyan-500/40",
        artBorder: "border-cyan-500/40 shadow-[0_25px_60px_rgba(0,0,0,0.9)]",
        stageTitle: "text-white drop-shadow-md",
        stageArtist: "text-cyan-400",
        stageTagAccent: "bg-cyan-500/20 border-cyan-500/40 text-cyan-300",
        stageTagNeutral: "bg-slate-800/80 border-slate-700 text-slate-300",
        bottomDeck: "bg-slate-950/95 border-slate-800/90 text-slate-100 shadow-2xl ring-1 ring-cyan-500/20",
        seekbarTrack: "bg-slate-800",
        seekbarAccent: "accent-cyan-400",
        timeText: "text-slate-400",
        playBtn: "bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-[0_0_30px_rgba(6,182,212,0.5)] ring-4 ring-cyan-500/30",
        playIconFill: "fill-slate-950",
        ctrlBtn: "bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700/80 shadow-md",
        activeText: "text-cyan-400",
        mutedText: "text-slate-500 hover:text-slate-200",
        volSlider: "bg-slate-800 accent-cyan-400",
      };
    case "ytmusic-red":
      return {
        bgCanvas: "bg-gradient-to-b from-[#0f0f0f] via-[#141414] to-[#0f0f0f]",
        orb1: "bg-red-600/30",
        orb2: "bg-rose-950/40",
        veil: "bg-gradient-to-b from-[#0f0f0f]/90 via-[#0f0f0f]/50 to-[#0f0f0f]/95",
        topBar: "bg-[#0f0f0f]/95 border-neutral-800 text-white shadow-sm",
        minimizeBtn: "bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-700/80 shadow-sm",
        nowPlayingDot: "bg-red-600",
        nowPlayingLabel: "text-red-500",
        nowPlayingTitle: "text-white",
        tabActive: "bg-red-600 text-white border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.4)] font-bold",
        tabInactive: "bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-700",
        artGlowRing: "from-red-600/40 via-rose-900/30 to-amber-600/20",
        artBorder: "border-neutral-700/80 shadow-[0_25px_60px_rgba(0,0,0,0.9)]",
        stageTitle: "text-white drop-shadow-md",
        stageArtist: "text-red-500",
        stageTagAccent: "bg-red-600/20 border-red-500/40 text-red-400",
        stageTagNeutral: "bg-neutral-800 border-neutral-700 text-neutral-300",
        bottomDeck: "bg-[#141414]/95 border-neutral-800 text-neutral-100 shadow-2xl ring-1 ring-red-600/20",
        seekbarTrack: "bg-neutral-800",
        seekbarAccent: "accent-red-600",
        timeText: "text-neutral-400",
        playBtn: "bg-red-600 hover:bg-red-500 text-white shadow-[0_0_30px_rgba(220,38,38,0.5)] ring-4 ring-red-600/30",
        playIconFill: "fill-white",
        ctrlBtn: "bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-700/80 shadow-md",
        activeText: "text-red-500",
        mutedText: "text-neutral-500 hover:text-neutral-200",
        volSlider: "bg-neutral-800 accent-red-600",
      };
    case "dynamic-emerald":
      return {
        bgCanvas: "bg-gradient-to-b from-black via-zinc-950 to-black",
        orb1: "bg-emerald-500/30",
        orb2: "bg-teal-600/20",
        veil: "bg-gradient-to-b from-black/90 via-black/50 to-black/95",
        topBar: "bg-black/95 border-zinc-800/80 text-white shadow-sm",
        minimizeBtn: "bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-800 shadow-sm",
        nowPlayingDot: "bg-emerald-500",
        nowPlayingLabel: "text-emerald-400",
        nowPlayingTitle: "text-zinc-100",
        tabActive: "bg-emerald-500 text-slate-950 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)] font-bold",
        tabInactive: "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800",
        artGlowRing: "from-emerald-500/40 via-teal-500/30 to-emerald-500/40",
        artBorder: "border-zinc-800 shadow-[0_25px_60px_rgba(0,0,0,0.9)]",
        stageTitle: "text-white drop-shadow-md",
        stageArtist: "text-emerald-400",
        stageTagAccent: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
        stageTagNeutral: "bg-zinc-900 border-zinc-800 text-zinc-300",
        bottomDeck: "bg-zinc-950/95 border-zinc-800 text-zinc-100 shadow-2xl ring-1 ring-emerald-500/20",
        seekbarTrack: "bg-zinc-800",
        seekbarAccent: "accent-emerald-500",
        timeText: "text-zinc-400",
        playBtn: "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.5)] ring-4 ring-emerald-500/30",
        playIconFill: "fill-slate-950",
        ctrlBtn: "bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-800 shadow-md",
        activeText: "text-emerald-400",
        mutedText: "text-zinc-500 hover:text-zinc-200",
        volSlider: "bg-zinc-800 accent-emerald-500",
      };
    case "audiophile-gold":
      return {
        bgCanvas: "bg-gradient-to-b from-[#14100c] via-[#1c1612] to-[#14100c]",
        orb1: "bg-amber-500/30",
        orb2: "bg-yellow-600/20",
        veil: "bg-gradient-to-b from-[#14100c]/90 via-[#14100c]/50 to-[#14100c]/95",
        topBar: "bg-[#14100c]/95 border-amber-900/40 text-amber-50 shadow-sm",
        minimizeBtn: "bg-[#221c17] hover:bg-[#2c241e] text-amber-100 border-amber-900/50 shadow-sm",
        nowPlayingDot: "bg-amber-500",
        nowPlayingLabel: "text-amber-400",
        nowPlayingTitle: "text-amber-100",
        tabActive: "bg-amber-500 text-stone-950 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)] font-bold",
        tabInactive: "bg-[#221c17] hover:bg-[#2c241e] text-amber-200 border-amber-900/50",
        artGlowRing: "from-amber-500/40 via-yellow-600/30 to-amber-500/40",
        artBorder: "border-amber-900/50 shadow-[0_25px_60px_rgba(0,0,0,0.9)]",
        stageTitle: "text-amber-50 drop-shadow-md",
        stageArtist: "text-amber-400",
        stageTagAccent: "bg-amber-500/20 border-amber-500/40 text-amber-300",
        stageTagNeutral: "bg-[#221c17] border-amber-900/50 text-amber-200",
        bottomDeck: "bg-[#18130e]/95 border-amber-900/50 text-amber-50 shadow-2xl ring-1 ring-amber-500/20",
        seekbarTrack: "bg-stone-800",
        seekbarAccent: "accent-amber-500",
        timeText: "text-amber-300/60",
        playBtn: "bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-[0_0_30px_rgba(245,158,11,0.5)] ring-4 ring-amber-500/30",
        playIconFill: "fill-stone-950",
        ctrlBtn: "bg-[#221c17] hover:bg-[#2c241e] text-amber-100 border-amber-900/50 shadow-md",
        activeText: "text-amber-400",
        mutedText: "text-amber-400/60 hover:text-amber-100",
        volSlider: "bg-stone-800 accent-amber-500",
      };
    case "twilight-vaporwave":
    default:
      return {
        bgCanvas: "bg-gradient-to-b from-[#1e1035] via-[#160a29] to-[#0d051a]",
        orb1: "bg-purple-600/30",
        orb2: "bg-pink-600/25",
        veil: "bg-gradient-to-b from-[#1e1035]/90 via-[#1e1035]/50 to-[#0d051a]/95",
        topBar: "bg-[#160a29]/95 border-purple-800/40 text-purple-50 shadow-sm",
        minimizeBtn: "bg-purple-950/80 hover:bg-purple-900 text-purple-200 border-purple-800/50 shadow-sm",
        nowPlayingDot: "bg-purple-500",
        nowPlayingLabel: "text-purple-300",
        nowPlayingTitle: "text-purple-100",
        tabActive: "bg-purple-600 text-white border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] font-bold",
        tabInactive: "bg-purple-950/80 hover:bg-purple-900 text-purple-200 border-purple-800/50",
        artGlowRing: "from-purple-500/40 via-pink-500/30 to-purple-500/40",
        artBorder: "border-purple-800/50 shadow-[0_25px_60px_rgba(0,0,0,0.9)]",
        stageTitle: "text-purple-50 drop-shadow-md",
        stageArtist: "text-purple-300",
        stageTagAccent: "bg-purple-600/20 border-purple-500/40 text-purple-300",
        stageTagNeutral: "bg-purple-950/80 border-purple-800 text-purple-200",
        bottomDeck: "bg-[#180b2a]/95 border-purple-800/50 text-purple-50 shadow-2xl ring-1 ring-purple-500/20",
        seekbarTrack: "bg-purple-950/80",
        seekbarAccent: "accent-purple-500",
        timeText: "text-purple-300/60",
        playBtn: "bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_30px_rgba(168,85,247,0.5)] ring-4 ring-purple-500/30",
        playIconFill: "fill-white",
        ctrlBtn: "bg-purple-950/80 hover:bg-purple-900 text-purple-100 border-purple-800/50 shadow-md",
        activeText: "text-purple-300",
        mutedText: "text-purple-400/60 hover:text-purple-100",
        volSlider: "bg-purple-950/80 accent-purple-500",
      };
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
  onOpenAddToPlaylistModal,
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

  const fpTheme = getFullPlayerThemeStyles(designConfig);

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
        <div className={`fixed inset-0 z-[100] w-screen h-screen min-h-screen ${fpTheme.bgCanvas} flex flex-col justify-between overflow-hidden select-none animate-fade-in`}>
          {/* Animated Dynamic Ambient Background based on the HD Cover Art & Theme Orbs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
            {/* Layer 1: Ambient Pulsing Blurred Artwork */}
            <img
              src={getHdCoverUrl(currentTrack.coverUrl)}
              alt=""
              className="w-full h-full object-cover blur-[100px] opacity-40 scale-135 animate-ambient-pulse"
              onError={(e) => {
                // Fallback to standard cover if HD upscaled URL encounters 404
                if (currentTrack.coverUrl && e.currentTarget.src !== currentTrack.coverUrl) {
                  e.currentTarget.src = currentTrack.coverUrl;
                }
              }}
            />
            {/* Layer 2: Moving Ambient Color Orbs matching active theme */}
            <div className={`absolute -top-32 left-1/4 w-[550px] h-[550px] rounded-full ${fpTheme.orb1} blur-[130px] animate-ambient-orb`} />
            <div className={`absolute -bottom-32 right-1/4 w-[500px] h-[500px] rounded-full ${fpTheme.orb2} blur-[140px] animate-ambient-orb`} />
            {/* Layer 3: Theme-Specific Gradient Veil */}
            <div className={`absolute inset-0 ${fpTheme.veil}`} />
          </div>

          {/* Top Bar Navigation */}
          <div className={`relative z-20 flex items-center justify-between p-4 sm:p-6 border-b backdrop-blur-2xl ${fpTheme.topBar}`}>
            {/* Left: Minimize Button */}
            <button
              onClick={() => setPlayerState((prev) => ({ ...prev, isFullscreen: false }))}
              className={`p-2.5 rounded-2xl border backdrop-blur-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 ${fpTheme.minimizeBtn}`}
              title="Minimize Full Player"
            >
              <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-xs font-semibold hidden sm:inline">Minimize</span>
            </button>

            {/* Center: Now Playing Info Badge */}
            <div className="text-center px-4 max-w-md truncate">
              <div className="flex items-center justify-center gap-2 mb-0.5">
                <span className={`w-2 h-2 rounded-full ${fpTheme.nowPlayingDot} animate-pulse`}></span>
                <span className={`text-[10px] sm:text-xs font-mono font-bold tracking-widest uppercase ${fpTheme.nowPlayingLabel}`}>
                  NOW PLAYING IN OBLIVION
                </span>
              </div>
              <p className={`text-xs sm:text-sm font-semibold truncate ${fpTheme.nowPlayingTitle}`}>
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
                  showLyrics ? fpTheme.tabActive : fpTheme.tabInactive
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
                  showSimilar ? fpTheme.tabActive : fpTheme.tabInactive
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
                  designConfig={designConfig}
                />
              </div>
            ) : showSimilar ? (
              <div className="w-full max-w-md h-full flex items-center justify-center">
                <SimilarTracksDrawer
                  currentTrack={currentTrack}
                  onPlayTrack={onPlayTrack}
                  onAddToQueue={onAddToQueue}
                  onClose={() => setPlayerState((prev) => ({ ...prev, showSimilar: false }))}
                  designConfig={designConfig}
                />
              </div>
            ) : (
              /* Central HD Album Artwork & Dynamic Stage */
              <div className="flex flex-col items-center justify-center space-y-6 sm:space-y-7 max-w-md w-full animate-fade-in my-auto">
                {/* HD Cover Art with Ambient Shadow and Glowing Ring */}
                <div className="relative group">
                  {/* Subtle dynamic glow ring around the album artwork */}
                  <div className={`absolute -inset-2 rounded-3xl bg-gradient-to-tr ${fpTheme.artGlowRing} blur-xl opacity-75 group-hover:opacity-100 transition duration-500 pointer-events-none`} />

                  <div className={`relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-3xl overflow-hidden border-2 ${fpTheme.artBorder}`}>
                    <img
                      src={getHdCoverUrl(currentTrack.coverUrl)}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
                      onError={(e) => {
                        if (currentTrack.coverUrl && e.currentTarget.src !== currentTrack.coverUrl) {
                          e.currentTarget.src = currentTrack.coverUrl;
                        } else {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=95";
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  </div>
                </div>

                {/* Song Title, Artist, & Master Quality Tag */}
                <div className="text-center space-y-2 max-w-xs sm:max-w-md w-full px-2">
                  <h2 className={`text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate ${fpTheme.stageTitle}`}>
                    {cleanTrackTitle(currentTrack.title, currentTrack.artist)}
                  </h2>
                  <p className={`text-sm sm:text-base font-semibold truncate ${fpTheme.stageArtist}`}>
                    {currentTrack.artist}
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-mono ${fpTheme.stageTagNeutral}`}>
                      {currentTrack.album || "Oblivion HD"}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-mono ${fpTheme.stageTagAccent}`}>
                      Lossless Audio
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fullscreen Player Controls Bar */}
          <div className={`relative z-20 p-5 sm:p-6 border-t backdrop-blur-2xl space-y-4 max-w-3xl mx-auto w-full rounded-t-3xl ${fpTheme.bottomDeck}`}>
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
                  className={`w-full h-2 rounded-lg appearance-none cursor-pointer focus:outline-none ${fpTheme.seekbarTrack} ${fpTheme.seekbarAccent}`}
                />
              </div>

              <div className={`flex items-center justify-between text-xs font-mono ${fpTheme.timeText}`}>
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
                      : fpTheme.ctrlBtn
                  }`}
                  title="Like track"
                >
                  <Heart className={`w-5 h-5 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`} />
                </button>

                {/* Add to Playlist Button */}
                <button
                  id="player-fullscreen-add-playlist-btn"
                  onClick={() => {
                    if (onOpenAddToPlaylistModal && currentTrack) {
                      onOpenAddToPlaylistModal(currentTrack);
                    } else {
                      setShowAddToPlaylistModal(true);
                    }
                  }}
                  className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-semibold active:scale-95 ${fpTheme.ctrlBtn}`}
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
                      : fpTheme.ctrlBtn
                  }`}
                  title={isCachedOffline ? "Saved Locally" : isCaching ? `Downloading (${cacheProgress}%)` : "Download Song"}
                >
                  {isCachedOffline ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <DownloadCloud className={`w-5 h-5 ${isCaching ? `animate-bounce ${fpTheme.activeText}` : ""}`} />
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
                    isShuffle ? fpTheme.activeText : fpTheme.mutedText
                  }`}
                  title={isShuffle ? "Shuffle is ON" : "Shuffle is OFF"}
                >
                  <Shuffle className="w-5 h-5" />
                </button>

                <button
                  onClick={onPrevTrack}
                  className={`p-3 rounded-2xl border transition-all active:scale-95 ${fpTheme.ctrlBtn}`}
                  title="Previous Song"
                >
                  <SkipBack className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                <button
                  onClick={() => handleUserTogglePlay()}
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all active:scale-95 ${fpTheme.playBtn}`}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause className={`w-6 h-6 sm:w-7 sm:h-7 ${fpTheme.playIconFill}`} />
                  ) : (
                    <Play className={`w-6 h-6 sm:w-7 sm:h-7 ${fpTheme.playIconFill} ml-0.5`} />
                  )}
                </button>

                <button
                  onClick={onNextTrack}
                  className={`p-3 rounded-2xl border transition-all active:scale-95 ${fpTheme.ctrlBtn}`}
                  title="Next Song"
                >
                  <SkipForward className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                <button
                  onClick={cycleRepeatMode}
                  className={`p-2 rounded-lg transition-colors ${
                    repeatMode !== "off" ? fpTheme.activeText : fpTheme.mutedText
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
                  className={`p-2 transition-colors ${fpTheme.mutedText}`}
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
                  className={`w-20 h-1.5 rounded-lg appearance-none cursor-pointer focus:outline-none ${fpTheme.volSlider}`}
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

        // Layout 0: Designer Studio Floating Dock with Waveform
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
                    id="player-mini-add-playlist-btn"
                    onClick={() => {
                      if (onOpenAddToPlaylistModal && currentTrack) {
                        onOpenAddToPlaylistModal(currentTrack);
                      } else {
                        setShowAddToPlaylistModal(true);
                      }
                    }}
                    className={`p-1.5 ${designConfig.textMuted} hover:${designConfig.textPrimary} hover:text-[#c89b3c] transition-colors`}
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
                      <DownloadCloud className={`w-4 h-4 ${isCaching ? `animate-bounce ${designConfig.accentText}` : ""}`} />
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

              {/* Bottom Row: Waveform Scrubber & Timestamps */}
              <div className="flex items-center gap-3 pt-0.5">
                <div 
                  className={`flex-1 h-8 flex items-center justify-between gap-[2px] sm:gap-[3px] cursor-pointer relative py-1 px-1 rounded-xl ${designConfig.inputBg} border ${designConfig.borderSubtle} hover:${designConfig.accentBorder} transition-colors`}
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
                              ? designConfig.accentBg
                              : `${designConfig.borderSubtle} dark:bg-slate-700 hover:opacity-80`
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
                id="player-bottom-add-playlist-btn"
                onClick={() => {
                  if (onOpenAddToPlaylistModal && currentTrack) {
                    onOpenAddToPlaylistModal(currentTrack);
                  } else {
                    setShowAddToPlaylistModal(true);
                  }
                }}
                className={`p-1.5 ${designConfig.textMuted} hover:${designConfig.textPrimary} hover:text-[#c89b3c] transition-colors`}
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
                  <DownloadCloud className={`w-4 h-4 ${isCaching ? `animate-bounce ${designConfig.accentText}` : ""}`} />
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
