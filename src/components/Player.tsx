import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
  Heart,
  Music2,
  Plus,
  Share2,
  Video
} from "lucide-react";
import { LyricsView } from "./LyricsView";
import { SimilarTracksDrawer } from "./SimilarTracksDrawer";
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
        bgCanvas: "bg-[#06120e]",
        orb1: "bg-amber-400/55",
        orb2: "bg-emerald-400/45",
        auroraBeam1: "bg-gradient-to-r from-[#c89b3c]/45 via-amber-300/40 to-emerald-400/40",
        auroraBeam2: "bg-gradient-to-r from-emerald-400/40 via-teal-300/35 to-[#c89b3c]/45",
        orbitalGlow1: "bg-gradient-to-tr from-[#c89b3c]/65 via-amber-400/50 to-emerald-400/55",
        orbitalGlow2: "bg-gradient-to-bl from-emerald-500/55 via-teal-400/45 to-[#c89b3c]/50",
        driftAuraGlow: "bg-gradient-to-br from-amber-500/20 via-emerald-500/15 to-transparent",
        veil: "bg-gradient-to-b from-black/35 via-black/10 to-black/80",
        topBar: "bg-[#fbfaf7]/95 border-[#e6e2d8] text-[#181816] shadow-sm",
        minimizeBtn: "bg-[#ede8dc] hover:bg-[#e2ddd1] text-[#181816] border-[#d8d2c4] shadow-sm",
        nowPlayingDot: "bg-[#c89b3c]",
        nowPlayingLabel: "text-[#c89b3c]",
        nowPlayingTitle: "text-[#181816]",
        tabActive: "bg-[#c89b3c] text-white border-[#c89b3c] shadow-md font-bold",
        tabInactive: "bg-[#ede8dc] hover:bg-[#e2ddd1] text-[#181816] border-[#d8d2c4]",
        artGlowRing: "from-[#c89b3c]/50 via-emerald-500/40 to-[#c89b3c]/50",
        artBorder: "border-[#e6e2d8]/60 shadow-[0_25px_60px_rgba(0,0,0,0.6)]",
        stageTitle: "text-white drop-shadow-md",
        stageArtist: "text-[#c89b3c]",
        stageTagAccent: "bg-[#c89b3c]/20 border-[#c89b3c]/40 text-[#c89b3c]",
        stageTagNeutral: "bg-white/10 border-white/20 text-white",
        bottomDeck: "bg-[#fbfaf7]/98 border-[#e6e2d8] text-[#181816] shadow-2xl ring-1 ring-[#c89b3c]/20",
        seekbarTrack: "bg-[#e2ddd1]",
        seekbarFill: "bg-gradient-to-r from-[#b88928] via-[#e5b85c] to-[#f5d78e]",
        seekbarThumb: "bg-amber-100 border-2 border-[#c89b3c] shadow-[0_0_14px_rgba(200,155,60,0.6)]",
        seekbarGlow: "shadow-[#c89b3c]/40",
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
        bgCanvas: "bg-[#070913]",
        orb1: "bg-cyan-400/60",
        orb2: "bg-fuchsia-500/50",
        auroraBeam1: "bg-gradient-to-r from-cyan-400/50 via-teal-300/45 to-fuchsia-500/45",
        auroraBeam2: "bg-gradient-to-r from-fuchsia-500/45 via-purple-500/40 to-cyan-400/45",
        orbitalGlow1: "bg-gradient-to-tr from-cyan-400/65 via-teal-400/50 to-fuchsia-500/65",
        orbitalGlow2: "bg-gradient-to-bl from-fuchsia-500/60 via-indigo-500/50 to-cyan-400/60",
        driftAuraGlow: "bg-gradient-to-br from-cyan-500/25 via-fuchsia-500/20 to-transparent",
        veil: "bg-gradient-to-b from-black/35 via-black/10 to-black/80",
        topBar: "bg-slate-950/90 border-slate-800/80 text-white shadow-sm",
        minimizeBtn: "bg-slate-900/90 hover:bg-slate-800 text-cyan-300 border-slate-700/80 shadow-sm",
        nowPlayingDot: "bg-cyan-400",
        nowPlayingLabel: "text-cyan-400",
        nowPlayingTitle: "text-white",
        tabActive: "bg-cyan-400 text-slate-950 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)] font-bold",
        tabInactive: "bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700",
        artGlowRing: "from-cyan-500/50 via-fuchsia-500/40 to-cyan-500/50",
        artBorder: "border-cyan-500/40 shadow-[0_25px_60px_rgba(0,0,0,0.9)]",
        stageTitle: "text-white drop-shadow-md",
        stageArtist: "text-cyan-400",
        stageTagAccent: "bg-cyan-500/20 border-cyan-500/40 text-cyan-300",
        stageTagNeutral: "bg-slate-800/80 border-slate-700 text-slate-300",
        bottomDeck: "bg-slate-950/95 border-slate-800/90 text-slate-100 shadow-2xl ring-1 ring-cyan-500/20",
        seekbarTrack: "bg-slate-800/90",
        seekbarFill: "bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-pink-500",
        seekbarThumb: "bg-cyan-300 border-2 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.8)]",
        seekbarGlow: "shadow-cyan-500/50",
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
        bgCanvas: "bg-[#0a0a0a]",
        orb1: "bg-red-500/60",
        orb2: "bg-rose-600/45",
        auroraBeam1: "bg-gradient-to-r from-red-600/50 via-rose-500/45 to-amber-500/40",
        auroraBeam2: "bg-gradient-to-r from-rose-600/45 via-red-500/50 to-red-900/45",
        orbitalGlow1: "bg-gradient-to-tr from-red-600/70 via-rose-600/55 to-amber-600/45",
        orbitalGlow2: "bg-gradient-to-bl from-rose-500/55 via-red-700/65 to-red-950/50",
        driftAuraGlow: "bg-gradient-to-br from-red-600/25 via-rose-600/20 to-transparent",
        veil: "bg-gradient-to-b from-black/35 via-black/10 to-black/80",
        topBar: "bg-[#0f0f0f]/95 border-neutral-800 text-white shadow-sm",
        minimizeBtn: "bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-700/80 shadow-sm",
        nowPlayingDot: "bg-red-600",
        nowPlayingLabel: "text-red-500",
        nowPlayingTitle: "text-white",
        tabActive: "bg-red-600 text-white border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.4)] font-bold",
        tabInactive: "bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-700",
        artGlowRing: "from-red-600/50 via-rose-900/40 to-amber-600/30",
        artBorder: "border-neutral-700/80 shadow-[0_25px_60px_rgba(0,0,0,0.9)]",
        stageTitle: "text-white drop-shadow-md",
        stageArtist: "text-red-500",
        stageTagAccent: "bg-red-600/20 border-red-500/40 text-red-400",
        stageTagNeutral: "bg-neutral-800 border-neutral-700 text-neutral-300",
        bottomDeck: "bg-[#141414]/95 border-neutral-800 text-neutral-100 shadow-2xl ring-1 ring-red-600/20",
        seekbarTrack: "bg-neutral-800",
        seekbarFill: "bg-gradient-to-r from-red-600 via-rose-500 to-amber-500",
        seekbarThumb: "bg-white border-2 border-red-500 shadow-[0_0_14px_rgba(220,38,38,0.7)]",
        seekbarGlow: "shadow-red-600/40",
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
        bgCanvas: "bg-[#040d08]",
        orb1: "bg-emerald-400/60",
        orb2: "bg-teal-400/45",
        auroraBeam1: "bg-gradient-to-r from-emerald-400/50 via-teal-300/45 to-emerald-500/45",
        auroraBeam2: "bg-gradient-to-r from-teal-400/45 via-emerald-400/50 to-cyan-400/40",
        orbitalGlow1: "bg-gradient-to-tr from-emerald-400/65 via-teal-400/55 to-emerald-600/65",
        orbitalGlow2: "bg-gradient-to-bl from-teal-300/50 via-emerald-500/55 to-teal-600/50",
        driftAuraGlow: "bg-gradient-to-br from-emerald-500/25 via-teal-500/20 to-transparent",
        veil: "bg-gradient-to-b from-black/35 via-black/10 to-black/80",
        topBar: "bg-black/95 border-zinc-800/80 text-white shadow-sm",
        minimizeBtn: "bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-800 shadow-sm",
        nowPlayingDot: "bg-emerald-500",
        nowPlayingLabel: "text-emerald-400",
        nowPlayingTitle: "text-zinc-100",
        tabActive: "bg-emerald-500 text-slate-950 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)] font-bold",
        tabInactive: "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800",
        artGlowRing: "from-emerald-500/50 via-teal-500/40 to-emerald-500/50",
        artBorder: "border-zinc-800 shadow-[0_25px_60px_rgba(0,0,0,0.9)]",
        stageTitle: "text-white drop-shadow-md",
        stageArtist: "text-emerald-400",
        stageTagAccent: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
        stageTagNeutral: "bg-zinc-900 border-zinc-800 text-zinc-300",
        bottomDeck: "bg-zinc-950/95 border-zinc-800 text-zinc-100 shadow-2xl ring-1 ring-emerald-500/20",
        seekbarTrack: "bg-zinc-800",
        seekbarFill: "bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-300",
        seekbarThumb: "bg-emerald-200 border-2 border-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.75)]",
        seekbarGlow: "shadow-emerald-500/40",
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
        bgCanvas: "bg-[#0e0a07]",
        orb1: "bg-amber-400/60",
        orb2: "bg-yellow-500/45",
        auroraBeam1: "bg-gradient-to-r from-amber-500/50 via-yellow-400/45 to-amber-600/45",
        auroraBeam2: "bg-gradient-to-r from-yellow-500/45 via-amber-600/50 to-stone-700/40",
        orbitalGlow1: "bg-gradient-to-tr from-amber-400/65 via-yellow-500/55 to-amber-600/65",
        orbitalGlow2: "bg-gradient-to-bl from-yellow-400/55 via-amber-500/55 to-yellow-600/50",
        driftAuraGlow: "bg-gradient-to-br from-amber-500/25 via-yellow-600/20 to-transparent",
        veil: "bg-gradient-to-b from-black/35 via-black/10 to-black/80",
        topBar: "bg-[#14100c]/95 border-amber-900/40 text-amber-50 shadow-sm",
        minimizeBtn: "bg-[#221c17] hover:bg-[#2c241e] text-amber-100 border-amber-900/50 shadow-sm",
        nowPlayingDot: "bg-amber-500",
        nowPlayingLabel: "text-amber-400",
        nowPlayingTitle: "text-amber-100",
        tabActive: "bg-amber-500 text-stone-950 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)] font-bold",
        tabInactive: "bg-[#221c17] hover:bg-[#2c241e] text-amber-200 border-amber-900/50",
        artGlowRing: "from-amber-500/50 via-yellow-600/40 to-amber-500/50",
        artBorder: "border-amber-900/50 shadow-[0_25px_60px_rgba(0,0,0,0.9)]",
        stageTitle: "text-amber-50 drop-shadow-md",
        stageArtist: "text-amber-400",
        stageTagAccent: "bg-amber-500/20 border-amber-500/40 text-amber-300",
        stageTagNeutral: "bg-[#221c17] border-amber-900/50 text-amber-200",
        bottomDeck: "bg-[#18130e]/95 border-amber-900/50 text-amber-50 shadow-2xl ring-1 ring-amber-500/20",
        seekbarTrack: "bg-stone-800",
        seekbarFill: "bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-200",
        seekbarThumb: "bg-amber-200 border-2 border-amber-500 shadow-[0_0_14px_rgba(245,158,11,0.75)]",
        seekbarGlow: "shadow-amber-500/40",
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
        bgCanvas: "bg-[#0e0618]",
        orb1: "bg-purple-400/60",
        orb2: "bg-pink-400/50",
        auroraBeam1: "bg-gradient-to-r from-purple-500/50 via-fuchsia-400/45 to-pink-500/45",
        auroraBeam2: "bg-gradient-to-r from-pink-500/45 via-purple-600/50 to-indigo-500/45",
        orbitalGlow1: "bg-gradient-to-tr from-purple-500/65 via-fuchsia-500/55 to-pink-500/65",
        orbitalGlow2: "bg-gradient-to-bl from-pink-400/55 via-purple-600/55 to-violet-400/50",
        driftAuraGlow: "bg-gradient-to-br from-purple-500/25 via-pink-500/20 to-transparent",
        veil: "bg-gradient-to-b from-black/35 via-black/10 to-black/80",
        topBar: "bg-[#160a29]/95 border-purple-800/40 text-purple-50 shadow-sm",
        minimizeBtn: "bg-purple-950/80 hover:bg-purple-900 text-purple-200 border-purple-800/50 shadow-sm",
        nowPlayingDot: "bg-purple-500",
        nowPlayingLabel: "text-purple-300",
        nowPlayingTitle: "text-purple-100",
        tabActive: "bg-purple-600 text-white border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] font-bold",
        tabInactive: "bg-purple-950/80 hover:bg-purple-900 text-purple-200 border-purple-800/50",
        artGlowRing: "from-purple-500/50 via-pink-500/40 to-purple-500/50",
        artBorder: "border-purple-800/50 shadow-[0_25px_60px_rgba(0,0,0,0.9)]",
        stageTitle: "text-purple-50 drop-shadow-md",
        stageArtist: "text-purple-300",
        stageTagAccent: "bg-purple-600/20 border-purple-500/40 text-purple-300",
        stageTagNeutral: "bg-purple-950/80 border-purple-800 text-purple-200",
        bottomDeck: "bg-[#180b2a]/95 border-purple-800/50 text-purple-50 shadow-2xl ring-1 ring-purple-500/20",
        seekbarTrack: "bg-purple-950/80 border border-purple-800/40",
        seekbarFill: "bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-400",
        seekbarThumb: "bg-pink-200 border-2 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.8)]",
        seekbarGlow: "shadow-purple-500/50",
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

  // Video placeholder ref and dynamic screen bounds to prevent any overlap across PC, tablet, and mobile
  const videoPlaceholderRef = useRef<HTMLDivElement | null>(null);
  const [videoRect, setVideoRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState<number>(0);

  // Swipe-down gesture state for collapsing Full Player back to mini player
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartTime, setTouchStartTime] = useState<number>(0);
  const [dragOffsetY, setDragOffsetY] = useState<number>(0);
  const [isDraggingDown, setIsDraggingDown] = useState<boolean>(false);

  // Swipe-down gesture state for closing mini player
  const [miniTouchStartY, setMiniTouchStartY] = useState<number | null>(null);
  const [miniTouchStartX, setMiniTouchStartX] = useState<number | null>(null);
  const [miniTouchStartTime, setMiniTouchStartTime] = useState<number>(0);
  const [miniDragOffsetY, setMiniDragOffsetY] = useState<number>(0);
  const [isMiniDraggingDown, setIsMiniDraggingDown] = useState<boolean>(false);
  const [isMiniClosing, setIsMiniClosing] = useState<boolean>(false);

  const handleCloseMiniPlayer = () => {
    setIsMiniClosing(true);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = "";
      }
      if (ytPlayerRef.current && ytPlayerRef.current.pauseVideo) {
        try {
          ytPlayerRef.current.pauseVideo();
          ytPlayerRef.current.stopVideo?.();
        } catch {}
      }
      setPlayerState((prev) => ({
        ...prev,
        isPlaying: false,
        currentTrack: null,
        isFullscreen: false,
        currentTime: 0,
      }));
      setIsMiniClosing(false);
      setMiniDragOffsetY(0);
      setIsMiniDraggingDown(false);
    }, 180);
  };

  const handleMiniTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    setMiniTouchStartY(touch.clientY);
    setMiniTouchStartX(touch.clientX);
    setMiniTouchStartTime(Date.now());
    setIsMiniDraggingDown(false);
  };

  const handleMiniTouchMove = (e: React.TouchEvent) => {
    if (miniTouchStartY === null || miniTouchStartX === null) return;
    const touch = e.touches[0];
    const deltaY = touch.clientY - miniTouchStartY;
    const deltaX = touch.clientX - miniTouchStartX;

    // If pulling downwards
    if (deltaY > 5 && deltaY > Math.abs(deltaX) * 0.7) {
      setIsMiniDraggingDown(true);
      const dampedOffset = deltaY < 120 ? deltaY : 120 + (deltaY - 120) * 0.4;
      setMiniDragOffsetY(dampedOffset);
    } else if (deltaY <= 0 && isMiniDraggingDown) {
      setMiniDragOffsetY(0);
      setIsMiniDraggingDown(false);
    }
  };

  const handleMiniTouchEnd = (e: React.TouchEvent) => {
    if (miniTouchStartY === null) return;
    const touch = e.changedTouches[0];
    const deltaY = touch.clientY - miniTouchStartY;
    const deltaX = miniTouchStartX !== null ? touch.clientX - miniTouchStartX : 0;
    const duration = Math.max(1, Date.now() - miniTouchStartTime);
    const velocityY = deltaY / duration;

    // Close mini player if swiped down past 50px or flicked down > 25px
    if ((deltaY > 50 || (deltaY > 25 && velocityY > 0.3)) && deltaY > Math.abs(deltaX) * 0.7) {
      handleCloseMiniPlayer();
    } else {
      setMiniDragOffsetY(0);
      setIsMiniDraggingDown(false);
    }

    setMiniTouchStartY(null);
    setMiniTouchStartX(null);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    setTouchStartY(touch.clientY);
    setTouchStartX(touch.clientX);
    setTouchStartTime(Date.now());
    setIsDraggingDown(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY === null || touchStartX === null) return;
    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStartY;
    const deltaX = touch.clientX - touchStartX;

    // Only activate drag-down if pulling downwards and predominantly vertical
    if (deltaY > 6 && deltaY > Math.abs(deltaX) * 1.1) {
      const target = e.target as HTMLElement | null;
      const scrollContainer = target?.closest(".overflow-y-auto, .custom-scrollbar") as HTMLElement | null;
      if (scrollContainer && scrollContainer.scrollTop > 5) {
        return;
      }

      setIsDraggingDown(true);
      const dampedOffset = deltaY < 180 ? deltaY : 180 + (deltaY - 180) * 0.45;
      setDragOffsetY(dampedOffset);
    } else if (deltaY <= 0 && isDraggingDown) {
      setDragOffsetY(0);
      setIsDraggingDown(false);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY === null) return;
    const touch = e.changedTouches[0];
    const deltaY = touch.clientY - touchStartY;
    const deltaX = touchStartX !== null ? touch.clientX - touchStartX : 0;
    const duration = Math.max(1, Date.now() - touchStartTime);
    const velocityY = deltaY / duration;

    // Minimize if swiped down past 75px or quick flick down > 35px
    if ((deltaY > 75 || (deltaY > 35 && velocityY > 0.35)) && deltaY > Math.abs(deltaX)) {
      setPlayerState((prev) => ({ ...prev, isFullscreen: false }));
    }

    setTouchStartY(null);
    setTouchStartX(null);
    setDragOffsetY(0);
    setIsDraggingDown(false);
  };

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

  const repeatModeRef = useRef<"off" | "one" | "all">(repeatMode);
  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  const onNextTrackRef = useRef(onNextTrack);
  useEffect(() => {
    onNextTrackRef.current = onNextTrack;
  }, [onNextTrack]);

  const onPrevTrackRef = useRef(onPrevTrack);
  useEffect(() => {
    onPrevTrackRef.current = onPrevTrack;
  }, [onPrevTrack]);

  const onTogglePlayRef = useRef(onTogglePlay);
  useEffect(() => {
    onTogglePlayRef.current = onTogglePlay;
  }, [onTogglePlay]);

  const handleEndedRef = useRef<() => void>(() => {});

  // Master handler for track end (works for both YouTube and HTML5 audio)
  const handleEnded = useCallback(() => {
    if (isChangingTrackRef.current) return;

    const curRepeat = repeatModeRef.current;
    if (curRepeat === "one") {
      // Repeat current track from start
      if (isYtReadyRef.current && ytPlayerRef.current) {
        try {
          ytPlayerRef.current.seekTo?.(0, true);
          ytPlayerRef.current.playVideo?.();
        } catch {}
      }
      if (audioRef.current) {
        try {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        } catch {}
      }
      setPlayerState((prev) => ({ ...prev, currentTime: 0, isPlaying: true }));
      return;
    }

    // Advance to next song in the Playlist, Album, or Search results
    isChangingTrackRef.current = true;
    if (isChangingTrackTimeoutRef.current) clearTimeout(isChangingTrackTimeoutRef.current);
    isChangingTrackTimeoutRef.current = setTimeout(() => {
      isChangingTrackRef.current = false;
    }, 2500);

    onNextTrackRef.current();
  }, [setPlayerState]);

  useEffect(() => {
    handleEndedRef.current = handleEnded;
  }, [handleEnded]);

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
            const data = await res.json().catch(() => ({}));
            const first = data?.results?.[0];
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
          height: "100%",
          width: "100%",
          videoId: vid,
          playerVars: {
            autoplay: isPlayingRef.current && !userManualPauseRef.current ? 1 : 0,
            controls: 1,
            disablekb: 0,
            fs: 1,
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
                // If YouTube emits pause during track transitions, ignore
                if (isChangingTrackRef.current) {
                  return;
                }
                const curTime = event.target.getCurrentTime?.() || 0;
                const dur = event.target.getDuration?.() || 0;
                // If video reached near the end and paused, trigger track completion
                if (dur > 0 && curTime >= dur - 1) {
                  handleEndedRef.current?.();
                  return;
                }
                if (!userManualPauseRef.current && isPlayingRef.current) {
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
                handleEndedRef.current?.();
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

    resolveAndPlay();
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
        // Play silent audio loop with valid PCM frames so Chrome registers active audio session for background playback & notification controls
        const silentUrl = getSilentAudioUrl();
        if (audioRef.current.src !== silentUrl) {
          audioRef.current.src = silentUrl;
          audioRef.current.loop = true;
          audioRef.current.volume = 0.001;
        }
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
  }, [volume, isMuted]);

  // Timer loop for YouTube current timestamp & progress
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying && isYtReadyRef.current && ytPlayerRef.current) {
        try {
          const curTime = ytPlayerRef.current.getCurrentTime?.();
          const ytDur = ytPlayerRef.current.getDuration?.();
          const validDur = (ytDur && ytDur > 0) ? ytDur : (currentTrack?.duration || 0);
          if (typeof curTime === "number" && !isNaN(curTime) && curTime >= 0) {
            setPlayerState((prev) => ({
              ...prev,
              currentTime: curTime,
              duration: validDur > 0 ? validDur : prev.duration,
            }));

            // Fallback safety: If track reaches duration and YouTube did not fire state 0
            if (validDur > 3 && curTime >= validDur - 0.25 && !isChangingTrackRef.current) {
              handleEndedRef.current?.();
            }
          }
        } catch {}
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isPlaying, currentTrack?.id, currentTrack?.duration]);

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
  }, [settings.backgroundPlay, isPlaying]);

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
    if (!audioRef.current) return;
    const src = audioRef.current.src || "";
    // NEVER overwrite currentTime/duration if audio element is playing the silent keepalive WAV or data URL!
    if (!src || src.startsWith("data:audio/wav") || src.startsWith("blob:") || (cachedSilentUrl && src === cachedSilentUrl)) {
      return;
    }
    const audCur = audioRef.current.currentTime;
    const audDur = audioRef.current.duration;
    if (typeof audCur === "number" && !isNaN(audCur) && audCur >= 0) {
      setPlayerState((prev) => ({
        ...prev,
        currentTime: audCur,
        duration: (audDur && audDur > 0) ? audDur : (currentTrack?.duration || prev.duration),
      }));
    }
  };

  // Handle track end for HTML5 native audio element
  const handleAudioEnded = () => {
    // Ignore ended event from the silent keepalive loop
    const src = audioRef.current?.src || "";
    if (src.startsWith("data:audio/wav") || src.startsWith("blob:") || (cachedSilentUrl && src === cachedSilentUrl)) {
      return;
    }
    handleEndedRef.current?.();
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

  const isVideoModeActive =
    isFullscreen &&
    playerState.mediaMode === "video" &&
    !showLyrics &&
    !showSimilar &&
    !showAddToPlaylistModal;

  // Real-time synchronization of the video player screen with the stage placeholder on PC, tablet, and mobile
  useLayoutEffect(() => {
    if (!isVideoModeActive) {
      setVideoRect(null);
      return;
    }

    const updateRect = () => {
      if (videoPlaceholderRef.current) {
        const rect = videoPlaceholderRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setVideoRect({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          });
        }
      }
    };

    updateRect();
    const rafId = requestAnimationFrame(updateRect);
    const t1 = setTimeout(updateRect, 60);
    const t2 = setTimeout(updateRect, 250);

    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    let ro: ResizeObserver | null = null;
    if (videoPlaceholderRef.current && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(updateRect);
      ro.observe(videoPlaceholderRef.current);
    }

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
      if (ro) ro.disconnect();
    };
  }, [
    isVideoModeActive,
    isFullscreen,
    playerState.mediaMode,
    showLyrics,
    showSimilar,
    showAddToPlaylistModal,
    currentTrack?.id
  ]);

  return (
    <>
      {/* Background-persistent YouTube IFrame Streaming Engine Wrapper */}
      <div
        id="oblivion-yt-wrapper"
        style={
          isVideoModeActive && videoRect
            ? {
                position: "fixed",
                top: `${videoRect.top}px`,
                left: `${videoRect.left}px`,
                width: `${videoRect.width}px`,
                height: `${videoRect.height}px`,
                zIndex: 105,
              }
            : isVideoModeActive
            ? {
                position: "fixed",
                top: "42%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "min(92vw, 560px)",
                aspectRatio: "16/9",
                maxHeight: "44vh",
                zIndex: 105,
              }
            : {
                position: "fixed",
                bottom: 0,
                right: 0,
                width: "2px",
                height: "2px",
                opacity: 0.001,
                zIndex: -10,
                pointerEvents: "none",
                visibility: "hidden",
              }
        }
        className={`transition-[opacity,border-color] duration-300 ${
          isVideoModeActive
            ? "pointer-events-auto opacity-100 visible"
            : "pointer-events-none opacity-0 invisible"
        }`}
      >
        {/* Prominent 3D Multi-Layer Ambient Depth Shadow & Dynamic Glow for Video */}
        {isVideoModeActive && (
          <>
            {/* Dynamic themed colored backlight glow */}
            <div className={`absolute -inset-3 sm:-inset-4 rounded-[2rem] bg-gradient-to-tr ${fpTheme.artGlowRing} blur-2xl opacity-80 pointer-events-none`} />
            {/* Deep 3D atmospheric floor drop shadow */}
            <div className="absolute -inset-1 rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.95),0_15px_40px_rgba(0,0,0,0.85),0_0_2px_1px_rgba(255,255,255,0.15)] pointer-events-none" />
          </>
        )}

        <div className="relative w-full h-full rounded-2xl sm:rounded-3xl border-2 border-white/25 overflow-hidden bg-black shadow-2xl">
          <div
            id="oblivion-yt-stream-engine"
            className="w-full h-full"
          />
        </div>
      </div>

      {/* Hidden Native Audio Element for Offline Cache & Mobile Background Audio Session */}
      <audio
        ref={audioRef}
        playsInline
        autoPlay
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleAudioEnded}
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
      )}      {/* Fullscreen Player Modal / Expansion - 100% Full-Screen Opaque Immersive Studio */}
      {isFullscreen && (
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={() => {
            setTouchStartY(null);
            setTouchStartX(null);
            setDragOffsetY(0);
            setIsDraggingDown(false);
          }}
          style={{
            transform: dragOffsetY > 0 ? `translate3d(0, ${dragOffsetY}px, 0)` : undefined,
            opacity: dragOffsetY > 0 ? Math.max(0.65, 1 - dragOffsetY / 500) : 1,
            transition: isDraggingDown ? "none" : "transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.25s ease",
          }}
          className={`fixed inset-0 z-[100] w-full h-[100dvh] max-h-[100dvh] ${fpTheme.bgCanvas} flex flex-col justify-between overflow-hidden select-none animate-fade-in`}
        >
          {/* Animated Dynamic Ambient Background based on the HD Cover Art / Video Thumbnail & Active Theme */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
            {settings.playerBackgroundAnimation === "ambient-drift" ? (
              <>
                {/* 1. Ambient Zoom & Drift - Dual Offset Parallax Motion with Theme Color Sets */}
                <div
                  className="absolute -inset-[20%] flex items-center justify-center pointer-events-none animate-bg-drift"
                  style={{ animationDuration: `${settings.animationDriftSpeed || 6}s` }}
                >
                  <img
                    src={getHdCoverUrl(currentTrack.coverUrl)}
                    alt=""
                    className="w-full h-full object-cover blur-[55px] sm:blur-[75px] opacity-75"
                    onError={(e) => {
                      if (currentTrack.coverUrl && e.currentTarget.src !== currentTrack.coverUrl) {
                        e.currentTarget.src = currentTrack.coverUrl;
                      }
                    }}
                  />
                </div>
                <div
                  className="absolute -inset-[20%] flex items-center justify-center pointer-events-none animate-bg-drift-sec"
                  style={{ animationDuration: `${(settings.animationDriftSpeed || 6) * 1.25}s` }}
                >
                  <img
                    src={getHdCoverUrl(currentTrack.coverUrl)}
                    alt=""
                    className="w-full h-full object-cover blur-[85px] opacity-45 mix-blend-screen"
                    onError={(e) => {
                      if (currentTrack.coverUrl && e.currentTarget.src !== currentTrack.coverUrl) {
                        e.currentTarget.src = currentTrack.coverUrl;
                      }
                    }}
                  />
                </div>
                {/* Dynamic App Design Drift Aura Mesh */}
                <div className={`absolute inset-0 ${fpTheme.driftAuraGlow} blur-[90px] pointer-events-none`} />
                {/* Ambient Drifting Theme Orbs */}
                <div className={`absolute -top-24 left-10 w-[550px] h-[550px] rounded-full ${fpTheme.orb1} blur-[120px] animate-ambient-orb`} />
                <div className={`absolute -bottom-24 right-10 w-[500px] h-[500px] rounded-full ${fpTheme.orb2} blur-[130px] animate-ambient-orb`} />
              </>
            ) : settings.playerBackgroundAnimation === "aurora-pulse" ? (
              <>
                {/* 2. Aurora Pulse - Fluid Breathing & Sweeping Luminous Beams matching App Design */}
                <div
                  className="absolute -inset-[15%] flex items-center justify-center pointer-events-none animate-aurora-pulse"
                  style={{ animationDuration: `${settings.animationAuroraSpeed || 6}s` }}
                >
                  <img
                    src={getHdCoverUrl(currentTrack.coverUrl)}
                    alt=""
                    className="w-full h-full object-cover blur-[50px] sm:blur-[70px] opacity-80 saturate-[1.6]"
                    onError={(e) => {
                      if (currentTrack.coverUrl && e.currentTarget.src !== currentTrack.coverUrl) {
                        e.currentTarget.src = currentTrack.coverUrl;
                      }
                    }}
                  />
                </div>
                {/* Sweeping Aurora Light Beams dynamically styled with App Design Color Sets */}
                <div
                  className={`absolute -top-16 left-1/4 w-[600px] h-[500px] rounded-full ${fpTheme.auroraBeam1} blur-[100px] animate-aurora-surge`}
                  style={{ animationDuration: `${(settings.animationAuroraSpeed || 6) * 1.2}s` }}
                />
                <div
                  className={`absolute -bottom-16 right-1/4 w-[550px] h-[480px] rounded-full ${fpTheme.auroraBeam2} blur-[110px] animate-aurora-surge`}
                  style={{ animationDuration: `${(settings.animationAuroraSpeed || 6) * 1.2}s` }}
                />
                <div
                  className={`absolute top-1/4 left-1/4 w-[520px] h-[520px] rounded-full ${fpTheme.orb1} blur-[120px] animate-aurora-pulse`}
                  style={{ animationDuration: `${settings.animationAuroraSpeed || 6}s` }}
                />
                <div
                  className={`absolute bottom-1/4 right-1/4 w-[480px] h-[480px] rounded-full ${fpTheme.orb2} blur-[130px] animate-aurora-pulse`}
                  style={{ animationDuration: `${settings.animationAuroraSpeed || 6}s` }}
                />
              </>
            ) : settings.playerBackgroundAnimation === "orbital-flow" ? (
              <>
                {/* 3. Orbital Flow - Cosmic 360° Rotating Liquid Flow matching App Design */}
                <div
                  className="absolute -inset-[25%] flex items-center justify-center pointer-events-none animate-orbital-flow"
                  style={{ animationDuration: `${settings.animationOrbitalSpeed || 6}s` }}
                >
                  <img
                    src={getHdCoverUrl(currentTrack.coverUrl)}
                    alt=""
                    className="w-full h-full object-cover blur-[60px] sm:blur-[80px] opacity-75"
                    onError={(e) => {
                      if (currentTrack.coverUrl && e.currentTarget.src !== currentTrack.coverUrl) {
                        e.currentTarget.src = currentTrack.coverUrl;
                      }
                    }}
                  />
                </div>
                {/* Counter-rotating Orbital Planetary System with App Design Aura Rings */}
                <div
                  className="absolute inset-0 flex items-center justify-center animate-orbital-counter"
                  style={{ animationDuration: `${(settings.animationOrbitalSpeed || 6) * 1.35}s` }}
                >
                  <div className={`absolute -top-24 left-16 w-[520px] h-[520px] rounded-full ${fpTheme.orbitalGlow1} blur-[105px] opacity-85`} />
                  <div className={`absolute -bottom-24 right-16 w-[500px] h-[500px] rounded-full ${fpTheme.orbitalGlow2} blur-[115px] opacity-85`} />
                </div>
              </>
            ) : (
              /* Static Backdrop when Animation is Switched Off */
              <div className="absolute inset-0">
                <img
                  src={getHdCoverUrl(currentTrack.coverUrl)}
                  alt=""
                  className="w-full h-full object-cover blur-[75px] opacity-35"
                  onError={(e) => {
                    if (currentTrack.coverUrl && e.currentTarget.src !== currentTrack.coverUrl) {
                      e.currentTarget.src = currentTrack.coverUrl;
                    }
                  }}
                />
                <div className={`absolute -top-20 left-10 w-[400px] h-[400px] rounded-full ${fpTheme.orb1} blur-[140px] opacity-40`} />
                <div className={`absolute -bottom-20 right-10 w-[380px] h-[380px] rounded-full ${fpTheme.orb2} blur-[140px] opacity-40`} />
              </div>
            )}

            {/* Layer 3: High-Legibility Contrast Readability Veil */}
            <div className={`absolute inset-0 ${fpTheme.veil}`} />
          </div>

          {/* Top Bar Navigation with Swipe Handle */}
          <div className={`relative z-20 shrink-0 flex flex-col px-3.5 pt-2 pb-2.5 sm:px-6 sm:py-3.5 border-b backdrop-blur-2xl ${fpTheme.topBar}`}>
            {/* Gesture Pull-Down Pill Indicator (Mobile / Touch Friendly) */}
            <div className="flex justify-center pb-1 -mt-0.5 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/40 active:bg-white/70" />
            </div>

            <div className="flex items-center justify-between w-full">
              {/* Left: Minimize Button */}
              <button
                onClick={() => setPlayerState((prev) => ({ ...prev, isFullscreen: false }))}
                className={`p-2 sm:p-2.5 rounded-2xl border backdrop-blur-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 ${fpTheme.minimizeBtn}`}
                title="Minimize Full Player (or swipe down)"
              >
                <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-xs font-semibold hidden sm:inline">Minimize</span>
              </button>

            {/* Center: YouTube Music Audio / Video Switcher */}
            <div className="flex items-center p-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-lg">
              <button
                id="player-toggle-audio-mode"
                onClick={() => setPlayerState((prev) => ({ ...prev, mediaMode: "song" }))}
                className={`px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                  (playerState.mediaMode || "song") === "song"
                    ? "bg-white text-black shadow-md"
                    : "text-white/70 hover:text-white"
                }`}
                title="Switch to Audio Mode"
              >
                <Music2 className="w-3.5 h-3.5" />
                <span>Audio</span>
              </button>
              <button
                id="player-toggle-video-mode"
                onClick={() =>
                  setPlayerState((prev) => ({
                    ...prev,
                    mediaMode: "video",
                    showLyrics: false,
                    showSimilar: false,
                  }))
                }
                className={`px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                  playerState.mediaMode === "video"
                    ? "bg-white text-black shadow-md"
                    : "text-white/70 hover:text-white"
                }`}
                title="Switch to Video Mode"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Video</span>
              </button>
            </div>

            {/* Right: Quick Toggles (Lyrics, Radio) */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              <button
                onClick={() =>
                  setPlayerState((prev) => ({ ...prev, showLyrics: !prev.showLyrics, showSimilar: false }))
                }
                className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 sm:gap-1.5 border transition-all ${
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
                className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 sm:gap-1.5 border transition-all ${
                  showSimilar ? fpTheme.tabActive : fpTheme.tabInactive
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Radio</span>
              </button>
            </div>
          </div>
        </div>

          {/* Main Fullscreen Center Body */}
          <div className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center p-3 sm:p-6 overflow-y-auto sm:overflow-hidden">
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
            ) : playerState.mediaMode === "video" ? (
              /* Music Video Mode on Center Stage */
              <div className="flex flex-col items-center justify-center space-y-3 sm:space-y-4 max-w-2xl w-full animate-fade-in my-auto py-1">
                {/* 16:9 Video Placeholder - exact bounding frame synchronized with YouTube wrapper */}
                <div
                  ref={videoPlaceholderRef}
                  className="w-[min(90vw,520px)] aspect-video max-h-[38vh] sm:max-h-[44vh] rounded-2xl sm:rounded-3xl shrink-0 pointer-events-none"
                />

                {/* Song Title, Artist, & Master Video Tags - always rendered with clean margin below the video screen */}
                <div className="text-center space-y-1 sm:space-y-1.5 max-w-xs sm:max-w-md w-full px-2">
                  <h2 className={`text-base sm:text-2xl md:text-3xl font-semibold tracking-normal truncate ${fpTheme.stageTitle} text-white/95 drop-shadow-sm`}>
                    {cleanTrackTitle(currentTrack.title, currentTrack.artist)}
                  </h2>
                  <p className={`text-xs sm:text-sm md:text-base font-normal tracking-wide truncate ${fpTheme.stageArtist}`}>
                    {currentTrack.artist}
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-0.5">
                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] sm:text-[11px] font-mono flex items-center gap-1 ${fpTheme.stageTagNeutral}`}>
                      <Video className="w-3 h-3 text-red-500" />
                      <span>Official Music Video</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] sm:text-[11px] font-mono ${fpTheme.stageTagAccent}`}>
                      HD 1080p
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Audio / Song Mode: Central HD Album Artwork & Dynamic Stage */
              <div className="flex flex-col items-center justify-center space-y-3 sm:space-y-4 max-w-md w-full animate-fade-in my-auto">
                {/* HD Cover Art with Prominent 3D Ambient Shadow and Glowing Dynamic Aura */}
                <div className="relative group flex items-center justify-center">
                  {/* Dynamic themed colored backlight aura */}
                  <div className={`absolute -inset-3 sm:-inset-4 rounded-[2.5rem] bg-gradient-to-tr ${fpTheme.artGlowRing} blur-2xl opacity-80 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`} />

                  {/* Deep 3D atmospheric floor drop shadow */}
                  <div className="absolute -inset-1 rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.95),0_15px_40px_rgba(0,0,0,0.85),0_0_2px_1px_rgba(255,255,255,0.15)] pointer-events-none" />

                  <div className={`relative w-[min(58vw,230px)] h-[min(58vw,230px)] xs:w-[min(64vw,260px)] xs:h-[min(64vw,260px)] sm:w-72 sm:h-72 md:w-80 md:h-80 max-h-[34vh] aspect-square rounded-3xl overflow-hidden border-2 ${fpTheme.artBorder} shadow-[0_25px_70px_rgba(0,0,0,0.9),0_10px_25px_rgba(0,0,0,0.7)]`}>
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
                <div className="text-center space-y-1 sm:space-y-1.5 max-w-xs sm:max-w-md w-full px-2">
                  <h2 className={`text-base sm:text-2xl md:text-3xl font-bold tracking-tight truncate ${fpTheme.stageTitle}`}>
                    {cleanTrackTitle(currentTrack.title, currentTrack.artist)}
                  </h2>
                  <p className={`text-xs sm:text-sm md:text-base font-semibold truncate ${fpTheme.stageArtist}`}>
                    {currentTrack.artist}
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-0.5">
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] sm:text-[11px] font-mono ${fpTheme.stageTagNeutral}`}>
                      {currentTrack.album || "Oblivion HD"}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] sm:text-[11px] font-mono ${fpTheme.stageTagAccent}`}>
                      Lossless Audio
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fullscreen Player Controls Bar - Responsively anchored with safe bottom padding */}
          <div className={`relative z-20 shrink-0 p-3.5 sm:p-5 pb-5 sm:pb-6 border-t backdrop-blur-2xl space-y-2.5 sm:space-y-4 max-w-3xl mx-auto w-full rounded-t-3xl ${fpTheme.bottomDeck}`}>
            {/* Seekbar Slider - Designer Dual-Track with Scrubber Handle */}
            <div className="space-y-1.5 sm:space-y-2">
              <div className="relative flex items-center group cursor-pointer py-1.5">
                {/* Background Track */}
                <div className={`w-full h-2 group-hover:h-2.5 rounded-full overflow-hidden transition-all relative ${fpTheme.seekbarTrack}`}>
                  {/* Active Progress Fill */}
                  <div
                    className={`absolute top-0 left-0 h-full rounded-full transition-all duration-75 ${fpTheme.seekbarFill} ${isPlaying ? "animate-gradient-shift" : ""}`}
                    style={{
                      width: `${duration > 0 ? ((isSeeking ? seekValue : currentTime) / duration) * 100 : 0}%`,
                    }}
                  />
                </div>

                {/* Scrubber Thumb Handle */}
                <div
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full ${fpTheme.seekbarThumb} shadow-lg transition-transform group-hover:scale-125 pointer-events-none`}
                  style={{
                    left: `${duration > 0 ? Math.min(100, Math.max(0, ((isSeeking ? seekValue : currentTime) / duration) * 100)) : 0}%`,
                  }}
                />

                {/* Interactive Drag & Tap Surface */}
                <input
                  type="range"
                  min={0}
                  max={duration > 0 ? duration : (currentTrack?.duration || 100)}
                  step={0.1}
                  value={isSeeking ? seekValue : currentTime}
                  onMouseDown={() => {
                    setIsSeeking(true);
                    setSeekValue(currentTime);
                  }}
                  onTouchStart={() => {
                    setIsSeeking(true);
                    setSeekValue(currentTime);
                  }}
                  onChange={(e) => {
                    setSeekValue(Number(e.target.value));
                  }}
                  onMouseUp={(e) => {
                    setIsSeeking(false);
                    const t = Number((e.target as HTMLInputElement).value);
                    handleSeekInternal(t);
                  }}
                  onTouchEnd={() => {
                    setIsSeeking(false);
                    handleSeekInternal(seekValue);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
              </div>

              <div className={`flex items-center justify-between text-[11px] sm:text-xs font-mono select-none ${fpTheme.timeText}`}>
                <span>
                  {Math.floor((isSeeking ? seekValue : currentTime) / 60)}:
                  {String(Math.floor((isSeeking ? seekValue : currentTime) % 60)).padStart(2, "0")}
                </span>
                <span>
                  {Math.floor((duration || currentTrack?.duration || 0) / 60)}:
                  {String(Math.floor((duration || currentTrack?.duration || 0) % 60)).padStart(2, "0")}
                </span>
              </div>
            </div>

            {/* Main Buttons Bar: Like, Add to Playlist, Download, Shuffle, Prev, Play/Pause, Next, Repeat, Volume */}
            <div className="flex items-center justify-between gap-1.5 sm:gap-2">
              {/* Left Group: Like, Add to Playlist */}
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => onToggleLike(currentTrack.id)}
                  className={`p-2 sm:p-2.5 rounded-xl border transition-all active:scale-95 ${
                    isLiked
                      ? "bg-rose-500/20 text-rose-500 border-rose-500/30"
                      : fpTheme.ctrlBtn
                  }`}
                  title="Like track"
                >
                  <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`} />
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
                  className={`p-2 sm:p-2.5 rounded-xl border transition-all flex items-center gap-1 sm:gap-1.5 text-xs font-semibold active:scale-95 ${fpTheme.ctrlBtn}`}
                  title="Add to Playlist"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden md:inline">Add</span>
                </button>
              </div>

              {/* Center Group: Shuffle, Previous, Play/Pause, Next, Repeat */}
              <div className="flex items-center gap-1.5 sm:gap-4">
                <button
                  onClick={() =>
                    setPlayerState((prev) => ({ ...prev, isShuffle: !prev.isShuffle }))
                  }
                  className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                    isShuffle ? fpTheme.activeText : fpTheme.mutedText
                  }`}
                  title={isShuffle ? "Shuffle is ON" : "Shuffle is OFF"}
                >
                  <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                <button
                  onClick={onPrevTrack}
                  className={`p-2 sm:p-3 rounded-2xl border transition-all active:scale-95 ${fpTheme.ctrlBtn}`}
                  title="Previous Song"
                >
                  <SkipBack className="w-4 h-4 sm:w-6 sm:h-6" />
                </button>

                <button
                  onClick={() => handleUserTogglePlay()}
                  className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all active:scale-95 ${fpTheme.playBtn}`}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause className={`w-5 h-5 sm:w-7 sm:h-7 ${fpTheme.playIconFill}`} />
                  ) : (
                    <Play className={`w-5 h-5 sm:w-7 sm:h-7 ${fpTheme.playIconFill} ml-0.5`} />
                  )}
                </button>

                <button
                  onClick={onNextTrack}
                  className={`p-2 sm:p-3 rounded-2xl border transition-all active:scale-95 ${fpTheme.ctrlBtn}`}
                  title="Next Song"
                >
                  <SkipForward className="w-4 h-4 sm:w-6 sm:h-6" />
                </button>

                <button
                  onClick={cycleRepeatMode}
                  className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                    repeatMode !== "off" ? fpTheme.activeText : fpTheme.mutedText
                  }`}
                  title={`Repeat: ${repeatMode}`}
                >
                  {repeatMode === "one" ? <Repeat1 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />}
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

      {/* Dynamic Multi-Layout Mini Player Deck - Unified Designer Floating Dock with Waveform across all 6 App Designs */}
      {!isFullscreen && (() => {
        const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
        const waveformBars = [
          18, 28, 42, 65, 80, 50, 35, 75, 95, 85, 45, 60, 90, 100, 70, 40,
          85, 92, 60, 30, 45, 78, 95, 88, 55, 38, 70, 92, 80, 45, 60, 85,
          75, 50, 35, 65, 80, 60, 40, 25, 18, 12
        ];

        return (
          <div
            id="app-mini-player-floating-dock"
            onTouchStart={handleMiniTouchStart}
            onTouchMove={handleMiniTouchMove}
            onTouchEnd={handleMiniTouchEnd}
            style={{
              transform: isMiniClosing
                ? "translate(-50%, 140px) scale(0.95)"
                : isMiniDraggingDown
                ? `translate(-50%, ${miniDragOffsetY}px)`
                : "translate(-50%, 0px)",
              opacity: isMiniClosing ? 0 : isMiniDraggingDown ? Math.max(0.2, 1 - miniDragOffsetY / 140) : 1,
              transition: isMiniDraggingDown ? "none" : "transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.25s ease-out",
              touchAction: "pan-x",
            }}
            className={`fixed bottom-16 md:bottom-4 left-1/2 w-[calc(100%-24px)] md:w-[680px] max-w-2xl ${designConfig.cardBg} backdrop-blur-2xl border ${designConfig.borderSubtle} rounded-2xl p-3 px-4 flex flex-col gap-2.5 z-40 select-none shadow-2xl ring-1 ${designConfig.accentBorder}`}
          >
            {/* Top Drag-Down Bar Handle */}
            <div
              className="w-12 h-1 rounded-full bg-white/20 hover:bg-white/40 mx-auto -mt-1 mb-0.5 cursor-grab active:cursor-grabbing transition-colors"
              title="Swipe or drag down to close mini player"
              onClick={handleCloseMiniPlayer}
            />

            {/* Top Row: Track Artwork, Play/Pause, Metadata & Controls */}
            <div className="flex items-center justify-between gap-3">
              {/* Left Play/Pause and Track Info */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Artwork Thumbnail with quick full player expand */}
                <div
                  onClick={() => setPlayerState((prev) => ({ ...prev, isFullscreen: true }))}
                  className={`relative w-10 h-10 rounded-xl overflow-hidden shrink-0 border ${designConfig.borderSubtle} cursor-pointer group shadow-sm bg-slate-800 flex items-center justify-center`}
                  title="Click to open Full Player"
                >
                  <img
                    src={currentTrack.coverUrl || (currentTrack.youtubeVideoId || currentTrack.id ? `https://i.ytimg.com/vi/${currentTrack.youtubeVideoId || currentTrack.id}/hqdefault.jpg` : "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80")}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    onError={(e) => {
                      const currentSrc = e.currentTarget.src || "";
                      const vId = currentTrack.youtubeVideoId || currentTrack.id;
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
                    <Maximize2 className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>

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

              {/* Right Meta Controls: Like, Add to Playlist, Shuffle, Prev, Next, Repeat, Expand */}
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
                  className={`p-1.5 ${designConfig.textMuted} hover:${designConfig.accentText} transition-colors`}
                  title="Add to Playlist"
                >
                  <Plus className="w-4 h-4" />
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
                className={`flex-1 h-8 flex items-center justify-between gap-[2px] sm:gap-[3px] cursor-pointer relative py-1 px-1.5 rounded-xl ${designConfig.inputBg} border ${designConfig.borderSubtle} hover:${designConfig.accentBorder} transition-colors`}
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
                            ? `${designConfig.waveformGradient || designConfig.progressGradient || designConfig.accentBg} ${isPlaying ? "animate-gradient-flow animate-waveform-shimmer" : ""}`
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
      })()}
        </>
      )}
    </>
  );
};
