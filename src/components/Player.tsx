import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  Video,
  AlertTriangle
} from "lucide-react";
import { LyricsView } from "./LyricsView";
import { SimilarTracksDrawer } from "./SimilarTracksDrawer";
import { MarqueeText } from "./MarqueeText";
import { ShareIcon } from "./ShareIcon";
import { shareTrack } from "../utils/shareTrack";
import { OblivionLogo as Logo } from "./OblivionLogo";
import { cleanTrackTitle, getPlayableAudioUrl, getHdCoverUrl, extractCleanYoutubeId } from "../utils/formatters";
import { cleanVideoId, purgeTrackFromStorage, purgeTrackGlobally } from "../services/playlistService";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";
import { calculateWcagText, hexToRgba } from "../theme/colorUtils";
import { getBespokeColors, getBespokeConfig } from "../theme/themeService";
import { usePlayer } from "../context/PlayerContext";

export interface PlayerProps {
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
  onSelectTrack?: (track: Track) => void;
  onPlayQueue?: (tracks: Track[], startIndex: number) => void;
  onRegisterRadioQueue?: (tracks: Track[]) => void;
  onAddToQueue: (track: Track) => void;
  settings: UserSettings;
  playlists?: Playlist[];
  onAddTrackToPlaylist?: (track: Track, playlistId: string) => void;
  onOpenAddToPlaylistModal?: (track: Track) => void;
  onRemoveTrack?: (trackId: string, track?: Track) => void;
  designConfig?: FullAppDesignConfig;
  onToggleShuffle?: () => void;
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

function getFullPlayerThemeStyles(design: FullAppDesignConfig, bespokeColors?: string[]) {
  if (design.id === "bespoke" || design.isBespoke) {
    const colors = bespokeColors && bespokeColors.length >= 4
      ? bespokeColors
      : (design.swatchColors && design.swatchColors.length >= 4 ? design.swatchColors : getBespokeColors());
    const [c1, c2, c3, c4] = colors;
    const textOnC2 = calculateWcagText(c2);

    return {
      bgCanvas: "bg-transparent",
      orb1: "blur-[120px]",
      orb2: "blur-[130px]",
      auroraBeam1: "blur-[100px]",
      auroraBeam2: "blur-[110px]",
      orbitalGlow1: "blur-[105px]",
      orbitalGlow2: "blur-[115px]",
      driftAuraGlow: "blur-[90px]",
      veil: "bg-gradient-to-b from-black/45 via-black/15 to-black/85",
      topBar: "bg-white/[0.04] backdrop-blur-3xl border border-white/[0.18] border-t-white/35 border-b-black/40 text-white shadow-[inset_0_1.5px_1.5px_rgba(255,255,255,0.45),inset_0_-1.5px_2px_rgba(0,0,0,0.35),0_12px_36px_rgba(0,0,0,0.6)] rounded-2xl",
      minimizeBtn: "bg-white/[0.05] hover:bg-white/[0.14] text-white border border-white/[0.18] border-t-white/35 border-b-black/40 backdrop-blur-2xl shadow-md active:translate-y-0.5 rounded-xl transition-all",
      nowPlayingDot: `bg-[var(--bespoke-c2,${c2})] shadow-[0_0_12px_var(--bespoke-c2,${c2})]`,
      nowPlayingLabel: `text-[var(--bespoke-c2,${c2})] font-bold tracking-wider`,
      nowPlayingTitle: "text-white drop-shadow-sm font-sans",
      tabActive: `bg-gradient-to-r from-[var(--bespoke-c1,${c1})] to-[var(--bespoke-c2,${c2})] text-white shadow-[0_0_20px_var(--bespoke-c2,${c2})]/60 border-t border-white/50 border-b border-black/35 font-black rounded-xl`,
      tabInactive: "bg-white/[0.04] hover:bg-white/[0.10] text-white/80 border border-white/[0.16] border-t-white/30 border-b-black/30 backdrop-blur-2xl rounded-xl",
      artGlowRing: `from-[var(--bespoke-c1,${c1})]/60 to-[var(--bespoke-c2,${c2})]/60`,
      artBorder: "border border-white/[0.22] border-t-white/45 border-b-black/50 shadow-[0_24px_60px_rgba(0,0,0,0.8)] rounded-3xl",
      stageTitle: "text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] font-black",
      stageArtist: `text-[var(--bespoke-c2,${c2})] font-bold drop-shadow-sm`,
      stageTagAccent: "border border-white/30 text-white font-bold shadow-sm",
      stageTagNeutral: "bg-white/[0.04] border border-white/[0.16] border-t-white/30 border-b-black/30 text-white/90 backdrop-blur-2xl",
      bottomDeck: "bg-white/[0.04] backdrop-blur-3xl border border-white/[0.18] border-t-white/35 border-b-black/40 text-white shadow-[inset_0_1.5px_1.5px_rgba(255,255,255,0.5),inset_0_-1.5px_2px_rgba(0,0,0,0.35),0_16px_48px_rgba(0,0,0,0.7)] rounded-3xl",
      seekbarTrack: "bg-white/[0.08] border border-white/[0.12] border-t-black/40 border-b-white/20 shadow-inner backdrop-blur-md",
      seekbarFill: `bg-gradient-to-r from-[var(--bespoke-c1,${c1})] to-[var(--bespoke-c2,${c2})] shadow-[0_0_18px_var(--bespoke-c2,${c2})]/70`,
      seekbarThumb: `bg-white border-2 border-[var(--bespoke-c2,${c2})] shadow-[0_0_18px_var(--bespoke-c2,${c2})]`,
      seekbarGlow: `shadow-[var(--bespoke-c2,${c2})]/50`,
      seekbarAccent: `accent-[var(--bespoke-c2,${c2})]`,
      timeText: "text-white/80 font-mono",
      playBtn: `full-player-play-btn bg-gradient-to-r from-[var(--bespoke-c1,${c1})] to-[var(--bespoke-c2,${c2})] hover:brightness-115 text-white shadow-[0_0_32px_var(--bespoke-c2,${c2})]/60 border-t border-white/60 border-b border-black/35 active:translate-y-0.5 rounded-2xl transition-all`,
      playIconFill: "fill-white",
      ctrlBtn: "bg-white/[0.05] hover:bg-white/[0.14] hover:text-white text-white/90 border border-white/[0.18] border-t-white/35 border-b-black/40 backdrop-blur-2xl shadow-md active:translate-y-0.5 rounded-2xl transition-all",
      activeText: `text-[var(--bespoke-c2,${c2})] drop-shadow-[0_0_10px_var(--bespoke-c2,${c2})]/60`,
      mutedText: "text-white/70 hover:text-white",
      volSlider: `bg-white/[0.08] accent-[var(--bespoke-c2,${c2})]`,
    };
  }

  switch (design.id) {
    case "designer":
      return {
        bgCanvas: "bg-[#0e0d11]",
        orb1: "bg-[#dfb86c]/35",
        orb2: "bg-[#a07422]/30",
        auroraBeam1: "bg-gradient-to-r from-[#f7e2ab]/30 via-[#dfb86c]/25 to-[#a07422]/30",
        auroraBeam2: "bg-gradient-to-r from-[#dfb86c]/25 via-[#2a242c]/40 to-[#f7e2ab]/30",
        orbitalGlow1: "bg-gradient-to-tr from-[#f7e2ab]/45 via-[#dfb86c]/35 to-[#a07422]/40",
        orbitalGlow2: "bg-gradient-to-bl from-[#a07422]/40 via-[#2e2832]/50 to-[#dfb86c]/35",
        driftAuraGlow: "bg-gradient-to-br from-[#dfb86c]/15 via-[#2a242c]/20 to-transparent",
        veil: "bg-gradient-to-b from-black/40 via-black/15 to-black/85",
        topBar: "bg-gradient-to-b from-[#2e2832]/85 to-[#161318]/90 border-white/[0.14] border-t-[#f7e2ab]/35 text-[#fdfcf9] shadow-lg backdrop-blur-2xl",
        minimizeBtn: "bg-gradient-to-b from-[#3a323f]/80 to-[#1e1a22]/90 hover:brightness-110 text-[#fdfcf9] border-white/[0.16] border-t-[#f7e2ab]/40 shadow-md backdrop-blur-xl",
        nowPlayingDot: "bg-gradient-to-r from-[#f7e2ab] to-[#dfb86c]",
        nowPlayingLabel: "text-[#dfb86c] font-bold tracking-widest",
        nowPlayingTitle: "text-[#fdfcf9] font-display",
        tabActive: "bg-gradient-to-r from-[#f7e2ab] via-[#dfb86c] to-[#a07422] text-[#120f14] border-t border-white/60 border-b border-black/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_4px_16px_rgba(223,184,108,0.45)] font-black",
        tabInactive: "bg-gradient-to-b from-[#2a242c]/70 to-[#161318]/80 hover:bg-white/[0.10] text-[#e6decb] border-white/[0.12] border-t-[#f7e2ab]/25 backdrop-blur-xl",
        artGlowRing: "from-[#f7e2ab]/40 via-[#dfb86c]/30 to-[#a07422]/40",
        artBorder: "border-white/[0.18] border-t-[#f7e2ab]/50 shadow-[0_25px_60px_rgba(0,0,0,0.85),0_0_30px_rgba(223,184,108,0.15)]",
        stageTitle: "text-[#fdfcf9] drop-shadow-md font-display",
        stageArtist: "text-[#dfb86c]",
        stageTagAccent: "bg-gradient-to-r from-[#f7e2ab]/15 to-[#dfb86c]/20 border-[#dfb86c]/40 text-[#f7e2ab]",
        stageTagNeutral: "bg-white/[0.08] border-white/[0.15] text-[#e6decb]",
        bottomDeck: "bg-gradient-to-b from-[#2a242c]/90 via-[#1a171d]/95 to-[#121014]/98 border-white/[0.16] border-t-[#f7e2ab]/35 text-[#fdfcf9] shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1.5px_1px_rgba(255,245,225,0.25)] ring-1 ring-[#dfb86c]/20 backdrop-blur-3xl",
        seekbarTrack: "bg-[#2a242c]/90 border border-white/[0.08]",
        seekbarFill: "bg-gradient-to-r from-[#f7e2ab] via-[#dfb86c] to-[#a07422]",
        seekbarThumb: "bg-gradient-to-r from-[#f7e2ab] to-[#dfb86c] border-2 border-white shadow-[0_0_16px_rgba(223,184,108,0.85)]",
        seekbarGlow: "shadow-[#dfb86c]/50",
        seekbarAccent: "accent-[#dfb86c]",
        timeText: "text-[#b0a694]",
        playBtn: "bg-gradient-to-r from-[#f7e2ab] via-[#dfb86c] to-[#a07422] hover:brightness-110 text-[#120f14] shadow-[inset_0_1.5px_1.5px_rgba(255,255,255,0.8),inset_0_-2px_2px_rgba(0,0,0,0.4),0_8px_26px_rgba(223,184,108,0.6)] ring-4 ring-[#dfb86c]/30 border-t border-white/70 border-b border-black/40 active:translate-y-0.5",
        playIconFill: "fill-[#120f14]",
        ctrlBtn: "bg-gradient-to-b from-[#342e38]/80 to-[#1c1920]/90 hover:bg-white/[0.12] text-[#fdfcf9] border-white/[0.14] border-t-[#f7e2ab]/35 shadow-md active:translate-y-0.5 backdrop-blur-xl",
        activeText: "text-[#dfb86c]",
        mutedText: "text-[#b0a694] hover:text-[#fdfcf9]",
        volSlider: "bg-[#2a242c] accent-[#dfb86c]",
      };
    case "cyberpunk-neon":
      return {
        bgCanvas: "bg-[#0a0d1a]",
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
        nowPlayingDot: "bg-[#00f3ff]",
        nowPlayingLabel: "text-[#00f3ff]",
        nowPlayingTitle: "text-white",
        tabActive: "bg-[#00f3ff] text-[#050814] border-[#00f3ff] shadow-[0_0_15px_rgba(0,243,255,0.4)] font-bold",
        tabInactive: "bg-slate-900/35 hover:bg-slate-800/50 backdrop-blur-md text-slate-300 border-slate-700/60",
        artGlowRing: "from-cyan-500/50 via-fuchsia-500/40 to-cyan-500/50",
        artBorder: "border-cyan-500/40 shadow-[0_25px_60px_rgba(0,0,0,0.9)]",
        stageTitle: "text-white drop-shadow-md",
        stageArtist: "text-[#00f3ff]",
        stageTagAccent: "bg-[#00f3ff]/15 border-[#00f3ff]/35 text-[#00f3ff] backdrop-blur-md",
        stageTagNeutral: "bg-slate-800/35 border-slate-700/60 text-slate-300 backdrop-blur-md",
        bottomDeck: "bg-slate-950/40 backdrop-blur-2xl border-slate-800/60 text-slate-100 shadow-2xl ring-1 ring-[#00f3ff]/20",
        seekbarTrack: "bg-slate-800/50 backdrop-blur-sm",
        seekbarFill: "bg-gradient-to-r from-[#00f3ff] via-[#d946ef] to-[#ec4899]",
        seekbarThumb: "bg-[#00f3ff] border-2 border-white shadow-[0_0_15px_rgba(0,243,255,0.8)]",
        seekbarGlow: "shadow-cyan-500/50",
        seekbarAccent: "accent-[#00f3ff]",
        timeText: "text-slate-400",
        playBtn: "bg-[#00f3ff] hover:bg-[#38f6ff] text-[#050814] shadow-[0_0_30px_rgba(0,243,255,0.5)] ring-4 ring-[#00f3ff]/30",
        playIconFill: "fill-[#050814]",
        ctrlBtn: "bg-slate-900/40 hover:bg-slate-800/60 backdrop-blur-md text-slate-200 border-slate-700/60 shadow-md",
        activeText: "text-[#00f3ff]",
        mutedText: "text-slate-500 hover:text-slate-200",
        volSlider: "bg-slate-800/50 accent-[#00f3ff]",
      };
    case "ytmusic-red":
      return {
        bgCanvas: "bg-[#1c0409]",
        orb1: "bg-red-500/60",
        orb2: "bg-rose-600/45",
        auroraBeam1: "bg-gradient-to-r from-red-600/50 via-rose-500/45 to-amber-500/40",
        auroraBeam2: "bg-gradient-to-r from-rose-600/45 via-red-500/50 to-red-900/45",
        orbitalGlow1: "bg-gradient-to-tr from-red-600/70 via-rose-600/55 to-amber-600/45",
        orbitalGlow2: "bg-gradient-to-bl from-rose-500/55 via-red-700/65 to-red-950/50",
        driftAuraGlow: "bg-gradient-to-br from-red-600/25 via-rose-600/20 to-transparent",
        veil: "bg-gradient-to-b from-black/35 via-black/10 to-black/80",
        topBar: "bg-[#140608]/95 border-red-950/60 text-white shadow-sm",
        minimizeBtn: "bg-red-950/60 hover:bg-red-900/70 text-red-200 border-red-900/50 shadow-sm",
        nowPlayingDot: "bg-[#ff1e42]",
        nowPlayingLabel: "text-[#ff1e42]",
        nowPlayingTitle: "text-white",
        tabActive: "bg-[#ff1e42] text-white border-[#ff1e42] shadow-[0_0_15px_rgba(255,30,66,0.4)] font-bold",
        tabInactive: "bg-red-950/60 hover:bg-red-900/70 text-red-200 border-red-900/40",
        artGlowRing: "from-red-600/50 via-rose-900/40 to-amber-600/30",
        artBorder: "border-red-900/60 shadow-[0_25px_60px_rgba(0,0,0,0.9)]",
        stageTitle: "text-white drop-shadow-md",
        stageArtist: "text-[#ff1e42]",
        stageTagAccent: "bg-[#ff1e42]/20 border-[#ff1e42]/40 text-red-300",
        stageTagNeutral: "bg-neutral-800/80 border-neutral-700 text-neutral-300",
        bottomDeck: "bg-[#140608]/95 border-red-950/60 text-neutral-100 shadow-2xl ring-1 ring-[#ff1e42]/20",
        seekbarTrack: "bg-red-950/70",
        seekbarFill: "bg-gradient-to-r from-[#ff1e42] via-rose-500 to-amber-500",
        seekbarThumb: "bg-white border-2 border-[#ff1e42] shadow-[0_0_14px_rgba(255,30,66,0.7)]",
        seekbarGlow: "shadow-red-600/40",
        seekbarAccent: "accent-[#ff1e42]",
        timeText: "text-red-300/70",
        playBtn: "bg-[#ff1e42] hover:bg-[#ff3859] text-white shadow-[0_0_30px_rgba(255,30,66,0.5)] ring-4 ring-[#ff1e42]/30",
        playIconFill: "fill-white",
        ctrlBtn: "bg-red-950/60 hover:bg-red-900/70 text-red-200 border-red-900/50 shadow-md",
        activeText: "text-[#ff1e42]",
        mutedText: "text-red-400/60 hover:text-white",
        volSlider: "bg-red-950/80 accent-[#ff1e42]",
      };
    case "candyland":
      return {
        bgCanvas: "bg-gradient-to-b from-[#fff5f8] via-[#fff0f5] to-[#ffeef4] text-[#2D2D2D]",
        orb1: "bg-pink-300/40",
        orb2: "bg-sky-200/35",
        auroraBeam1: "bg-gradient-to-r from-pink-300/30 via-purple-200/25 to-sky-300/30",
        auroraBeam2: "bg-gradient-to-r from-yellow-200/25 via-pink-300/30 to-cyan-200/25",
        orbitalGlow1: "bg-gradient-to-tr from-pink-300/40 via-purple-300/30 to-sky-300/40",
        orbitalGlow2: "bg-gradient-to-bl from-yellow-200/30 via-pink-300/35 to-purple-300/30",
        driftAuraGlow: "bg-gradient-to-br from-pink-300/15 via-sky-300/10 to-transparent",
        veil: "bg-transparent",
        topBar: "full-player-header bg-white/85 backdrop-blur-md border-b border-pink-200 text-[#2D2D2D] shadow-sm",
        minimizeBtn: "bg-[#FFF0F5] hover:bg-[#FFE4E1] text-[#FF1493] border border-[#FFB6C1] shadow-sm",
        nowPlayingDot: "bg-[#FF69B4] shadow-[0_0_10px_#FF69B4]",
        nowPlayingLabel: "text-[#FF1493] font-black tracking-wider",
        nowPlayingTitle: "text-[#2D2D2D]",
        tabActive: "full-player-nav-btn active bg-[#FF69B4] text-white border-pink-400 shadow-[0_4px_12px_rgba(255,105,180,0.4)] font-bold",
        tabInactive: "full-player-nav-btn bg-[#FFF0F5] text-[#FF1493] border-[#FFB6C1]",
        artGlowRing: "from-pink-300/40 via-purple-200/30 to-sky-200/40",
        artBorder: "border-pink-300 shadow-[0_16px_36px_rgba(255,182,193,0.4)]",
        stageTitle: "text-[#2D2D2D] drop-shadow-sm font-extrabold",
        stageArtist: "text-[#FF1493] font-bold",
        stageTagAccent: "bg-pink-100 border border-pink-300 text-[#FF1493]",
        stageTagNeutral: "bg-white border border-pink-200 text-[#2D2D2D]",
        bottomDeck: "full-player-controls-container full-player-bottom-dock bg-white/95 border-t border-pink-200 text-[#2D2D2D] shadow-[0_-4px_20px_rgba(255,182,193,0.3)]",
        seekbarTrack: "bg-pink-100 border border-pink-200",
        seekbarFill: "bg-gradient-to-r from-[#FF69B4] to-[#FF1493]",
        seekbarThumb: "bg-[#FF1493] border-2 border-white shadow-[0_0_12px_rgba(255,20,147,0.6)]",
        seekbarGlow: "shadow-pink-300/50",
        seekbarAccent: "accent-[#FF1493]",
        timeText: "text-[#FF1493] font-mono",
        playBtn: "full-player-play-btn bg-gradient-to-r from-[#FF69B4] to-[#FF1493] hover:brightness-105 text-white shadow-[0_4px_15px_rgba(255,20,147,0.4)] active:scale-95",
        playIconFill: "fill-white text-white",
        ctrlBtn: "bg-[#FFF0F5] hover:bg-[#FFE4E1] text-[#8A2BE2] border border-[#FFB6C1] shadow-sm",
        activeText: "text-[#8A2BE2] drop-shadow-[0_0_8px_rgba(138,43,226,0.5)]",
        mutedText: "text-[#8A2BE2]/80 hover:text-[#8A2BE2]",
        volSlider: "bg-pink-100 accent-[#8A2BE2]",
      };
    case "dynamic-emerald":
      return {
        bgCanvas: "bg-[#01140c]",
        orb1: "bg-emerald-400/40",
        orb2: "bg-teal-400/35",
        auroraBeam1: "bg-gradient-to-r from-[#00f5a0]/40 via-teal-300/35 to-emerald-500/35",
        auroraBeam2: "bg-gradient-to-r from-teal-400/35 via-[#00f5a0]/40 to-cyan-400/30",
        orbitalGlow1: "bg-gradient-to-tr from-[#00f5a0]/50 via-teal-400/40 to-emerald-600/50",
        orbitalGlow2: "bg-gradient-to-bl from-teal-300/40 via-emerald-500/45 to-teal-600/40",
        driftAuraGlow: "bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-transparent",
        veil: "bg-gradient-to-b from-[#01140c]/70 via-black/25 to-[#01140c]/85",
        topBar: "bg-[#021f16]/95 backdrop-blur-2xl border-b border-emerald-500/25 text-[#e6fff5] shadow-lg",
        minimizeBtn: "bg-[#02281c]/80 hover:bg-[#033626] text-[#e6fff5] border border-[#00f5a0]/30 backdrop-blur-xl shadow-sm",
        nowPlayingDot: "bg-[#00f5a0] shadow-[0_0_10px_#00f5a0]",
        nowPlayingLabel: "text-[#00f5a0] font-black tracking-wider",
        nowPlayingTitle: "text-[#e6fff5]",
        tabActive: "bg-gradient-to-r from-[#00f5a0] via-[#00e5cc] to-[#00d9f5] text-[#011a12] border-t border-white/60 border-b border-black/40 shadow-[0_0_20px_rgba(0,245,160,0.6)] font-black",
        tabInactive: "bg-[#02281c]/80 hover:bg-[#033626] text-emerald-200 border border-[#00f5a0]/25 backdrop-blur-xl",
        artGlowRing: "from-[#00f5a0]/60 via-teal-400/45 to-[#00d9f5]/60",
        artBorder: "border-emerald-500/35 border-t-white/45 border-b-black/60 shadow-[0_25px_60px_rgba(0,0,0,0.9)]",
        stageTitle: "text-[#e6fff5] drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] font-extrabold",
        stageArtist: "text-[#00f5a0] font-bold",
        stageTagAccent: "bg-gradient-to-r from-[#00f5a0]/25 to-teal-500/20 border border-[#00f5a0]/50 border-t-white/40 text-[#00f5a0] shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]",
        stageTagNeutral: "bg-[#02281c]/70 border border-white/15 border-t-white/30 text-emerald-200 shadow-inner",
        bottomDeck: "bg-[#021f16]/95 backdrop-blur-3xl border-t border-emerald-500/30 shadow-2xl ring-1 ring-[#00f5a0]/20",
        seekbarTrack: "bg-black/50 border border-white/10 shadow-inner",
        seekbarFill: "bg-gradient-to-r from-[#00f5a0] via-[#00e5cc] to-[#00d9f5]",
        seekbarThumb: "bg-[#00f5a0] border-2 border-[#011a12] shadow-[0_0_16px_rgba(0,245,160,0.85)]",
        seekbarGlow: "shadow-[#00f5a0]/50",
        seekbarAccent: "accent-[#00f5a0]",
        timeText: "text-emerald-300/80 font-mono",
        playBtn: "bg-gradient-to-r from-[#00f5a0] via-[#00e5cc] to-[#00d9f5] hover:brightness-115 text-[#011a12] shadow-[0_0_32px_rgba(0,245,160,0.7)] border-t border-white/70 active:scale-95 ring-4 ring-[#00f5a0]/30",
        playIconFill: "fill-[#011a12]",
        ctrlBtn: "bg-[#02281c]/80 hover:bg-[#033626] text-[#e6fff5] border border-[#00f5a0]/30 border-t-white/40 shadow-md backdrop-blur-xl",
        activeText: "text-[#00f5a0] drop-shadow-[0_0_10px_rgba(0,245,160,0.5)]",
        mutedText: "text-emerald-300/70 hover:text-white",
        volSlider: "bg-black/50 accent-[#00f5a0]",
      };
    case "audiophile-gold":
      return {
        bgCanvas: "bg-[#080c16]",
        orb1: "bg-[#8fa7c2]/35",
        orb2: "bg-[#4a5f78]/30",
        auroraBeam1: "bg-gradient-to-r from-[#8fa7c2]/35 via-[#b8cadc]/30 to-[#4a5f78]/30",
        auroraBeam2: "bg-gradient-to-r from-[#b8cadc]/30 via-[#8fa7c2]/35 to-[#1c293a]/40",
        orbitalGlow1: "bg-gradient-to-tr from-[#b8cadc]/45 via-[#8fa7c2]/40 to-[#4a5f78]/45",
        orbitalGlow2: "bg-gradient-to-bl from-[#b8cadc]/40 via-[#8fa7c2]/40 to-[#36495d]/40",
        driftAuraGlow: "bg-gradient-to-br from-[#8fa7c2]/20 via-[#4a5f78]/15 to-transparent",
        veil: "bg-gradient-to-b from-black/40 via-black/15 to-black/85",
        topBar: "bg-gradient-to-b from-[#141d2c]/80 to-[#0c121e]/85 backdrop-blur-2xl border-b border-[#8fa7c2]/25 text-[#f1f5f9] shadow-lg",
        minimizeBtn: "bg-gradient-to-b from-white/[0.1] to-[#162030]/80 hover:from-white/[0.18] text-[#f1f5f9] border border-[#8fa7c2]/35 border-t-white/30 backdrop-blur-xl shadow-md",
        nowPlayingDot: "bg-gradient-to-r from-[#b8cadc] to-[#8fa7c2]",
        nowPlayingLabel: "text-[#9bb0c6]",
        nowPlayingTitle: "text-[#f1f5f9]",
        tabActive: "bg-gradient-to-r from-[#b8cadc] via-[#8fa7c2] to-[#4a5f78] text-[#070b14] font-extrabold shadow-[0_0_18px_rgba(143,167,194,0.45),inset_0_1px_1px_rgba(255,255,255,0.6)] border-t border-white/60",
        tabInactive: "bg-gradient-to-b from-white/[0.08] to-[#101724]/80 hover:from-white/[0.14] text-[#cbd5e1] border border-[#8fa7c2]/25 backdrop-blur-xl",
        artGlowRing: "from-[#b8cadc]/50 via-[#8fa7c2]/40 to-[#4a5f78]/50",
        artBorder: "border-[#8fa7c2]/35 border-t-white/25 shadow-[0_25px_60px_rgba(0,0,0,0.95)]",
        stageTitle: "text-[#f8fafc] drop-shadow-md",
        stageArtist: "text-[#9bb0c6]",
        stageTagAccent: "bg-gradient-to-r from-[#8fa7c2]/25 to-[#4a5f78]/15 border border-[#8fa7c2]/40 text-[#d8e5f2] shadow-sm",
        stageTagNeutral: "bg-gradient-to-b from-white/[0.06] to-[#0e1522]/80 border border-[#8fa7c2]/20 text-[#cbd5e1]",
        bottomDeck: "bg-gradient-to-b from-[#121927]/85 via-[#0b101c]/92 to-[#060910]/95 backdrop-blur-3xl border-t border-[#8fa7c2]/30 border-t-white/20 text-[#f1f5f9] shadow-2xl ring-1 ring-[#8fa7c2]/20",
        seekbarTrack: "bg-[#141c2a]/80 border border-[#8fa7c2]/15",
        seekbarFill: "bg-gradient-to-r from-[#b8cadc] via-[#8fa7c2] to-[#4a5f78]",
        seekbarThumb: "bg-gradient-to-b from-[#e8f1fa] to-[#8fa7c2] border-2 border-[#070b14] shadow-[0_0_16px_rgba(143,167,194,0.85)]",
        seekbarGlow: "shadow-[#8fa7c2]/50",
        seekbarAccent: "accent-[#8fa7c2]",
        timeText: "text-[#cbd5e1]/70 font-mono",
        playBtn: "bg-gradient-to-r from-[#b8cadc] via-[#8fa7c2] to-[#4a5f78] hover:brightness-115 text-[#070b14] shadow-[0_0_36px_rgba(143,167,194,0.65),inset_0_1.5px_1px_rgba(255,255,255,0.7)] border-t border-white/70 active:scale-95 ring-4 ring-[#8fa7c2]/30",
        playIconFill: "fill-[#070b14]",
        ctrlBtn: "bg-gradient-to-b from-white/[0.1] to-[#141b28]/85 hover:from-white/[0.18] text-[#f1f5f9] border border-[#8fa7c2]/30 border-t-white/30 backdrop-blur-xl shadow-md",
        activeText: "text-[#9bb0c6] drop-shadow-[0_0_10px_rgba(143,167,194,0.5)]",
        mutedText: "text-[#cbd5e1]/60 hover:text-white",
        volSlider: "bg-[#141c2a] accent-[#8fa7c2]",
      };
    case "twilight-vaporwave":
    default:
      return {
        bgCanvas: "bg-[#1e0b36]",
        orb1: "bg-purple-400/60",
        orb2: "bg-pink-400/50",
        auroraBeam1: "bg-gradient-to-r from-purple-500/50 via-fuchsia-400/45 to-pink-500/45",
        auroraBeam2: "bg-gradient-to-r from-pink-500/45 via-purple-600/50 to-indigo-500/45",
        orbitalGlow1: "bg-gradient-to-tr from-purple-500/65 via-fuchsia-500/55 to-pink-500/65",
        orbitalGlow2: "bg-gradient-to-bl from-pink-400/55 via-purple-600/55 to-violet-400/50",
        driftAuraGlow: "bg-gradient-to-br from-purple-500/25 via-pink-500/20 to-transparent",
        veil: "bg-gradient-to-b from-black/35 via-black/10 to-black/80",
        topBar: "bg-[#280e46]/95 border-purple-800/50 text-purple-50 shadow-sm",
        minimizeBtn: "bg-[#331359] hover:bg-[#40196f] text-purple-200 border-purple-700/50 shadow-sm",
        nowPlayingDot: "bg-[#ff2a8d]",
        nowPlayingLabel: "text-[#ff2a8d]",
        nowPlayingTitle: "text-purple-100",
        tabActive: "bg-[#ff2a8d] text-white border-[#ff2a8d] shadow-[0_0_15px_rgba(255,42,141,0.4)] font-bold",
        tabInactive: "bg-[#331359] hover:bg-[#40196f] text-purple-200 border-purple-700/40",
        artGlowRing: "from-purple-500/50 via-pink-500/40 to-[#ff2a8d]/50",
        artBorder: "border-purple-800/50 shadow-[0_25px_60px_rgba(0,0,0,0.9)]",
        stageTitle: "text-purple-50 drop-shadow-md",
        stageArtist: "text-[#ff2a8d]",
        stageTagAccent: "bg-[#ff2a8d]/20 border-[#ff2a8d]/40 text-pink-300",
        stageTagNeutral: "bg-[#331359] border-purple-700 text-purple-200",
        bottomDeck: "bg-[#280e46]/95 border-purple-800/50 text-purple-50 shadow-2xl ring-1 ring-[#ff2a8d]/20",
        seekbarTrack: "bg-[#331359] border border-purple-800/40",
        seekbarFill: "bg-gradient-to-r from-[#ff2a8d] via-fuchsia-500 to-indigo-400",
        seekbarThumb: "bg-white border-2 border-[#ff2a8d] shadow-[0_0_15px_rgba(255,42,141,0.8)]",
        seekbarGlow: "shadow-pink-500/50",
        seekbarAccent: "accent-[#ff2a8d]",
        timeText: "text-purple-300/70",
        playBtn: "bg-[#ff2a8d] hover:bg-[#ff4d9f] text-white shadow-[0_0_30px_rgba(255,42,141,0.5)] ring-4 ring-[#ff2a8d]/30",
        playIconFill: "fill-white",
        ctrlBtn: "bg-[#331359] hover:bg-[#40196f] text-purple-100 border-purple-700/50 shadow-md",
        activeText: "text-[#ff2a8d]",
        mutedText: "text-purple-400/60 hover:text-purple-100",
        volSlider: "bg-[#331359] accent-[#ff2a8d]",
      };
    case "neue-editorial":
      return {
        bgCanvas: "bg-[#F2E8D8]",
        orb1: "bg-[#d4af37]/20",
        orb2: "bg-[#b8860b]/15",
        auroraBeam1: "bg-gradient-to-r from-[#d4af37]/20 via-[#f3e5ab]/25 to-[#e6c667]/20",
        auroraBeam2: "bg-gradient-to-r from-[#e6c667]/20 via-[#d4af37]/15 to-[#FAF5ED]/30",
        orbitalGlow1: "bg-gradient-to-tr from-[#d4af37]/25 via-[#e6c667]/20 to-[#b8860b]/25",
        orbitalGlow2: "bg-gradient-to-bl from-[#b8860b]/25 via-[#d4af37]/20 to-[#FAF5ED]/30",
        driftAuraGlow: "bg-gradient-to-br from-[#d4af37]/10 via-[#e6c667]/8 to-transparent",
        veil: "bg-gradient-to-b from-black/5 via-transparent to-black/15",
        topBar: "bg-[#FAF5ED]/95 border-[#d4af37]/25 text-[#1F1F1F] shadow-sm",
        minimizeBtn: "player-control-btn bg-[#F2E8D8] hover:bg-[#EFE5D4] text-[#8b6508] border-[#d4af37]/30 shadow-sm rounded-full",
        nowPlayingDot: "bg-[#d4af37] shadow-[0_0_10px_rgba(212,175,55,0.6)]",
        nowPlayingLabel: "text-[#b8860b] font-bold tracking-widest",
        nowPlayingTitle: "text-[#1F1F1F]",
        tabActive: "bg-gradient-to-r from-[#b8860b] via-[#d4af37] to-[#e6c667] text-white border-t border-white/60 border-b border-[#b8860b]/40 shadow-[0_4px_14px_rgba(212,175,55,0.45)] font-bold rounded-full",
        tabInactive: "bg-[#F2E8D8] hover:bg-[#EFE5D4] text-[#8b6508] border-[#d4af37]/25 rounded-full",
        artGlowRing: "from-[#d4af37]/35 via-[#f3e5ab]/25 to-[#e6c667]/35",
        artBorder: "border-[#d4af37]/30 shadow-[0_25px_60px_rgba(184,134,11,0.2)] rounded-3xl",
        stageTitle: "text-[#1F1F1F] drop-shadow-sm font-bold",
        stageArtist: "text-[#b8860b] font-semibold",
        stageTagAccent: "bg-[#d4af37]/15 border-[#d4af37]/35 text-[#8b6508] rounded-full",
        stageTagNeutral: "bg-[#FAF5ED] border-[#d4af37]/20 text-[#8b6508] rounded-full",
        bottomDeck: "full-player-bottom-bar bg-[#FDFBF7]/95 border-[#d4af37]/30 text-[#1F1F1F] shadow-[0_10px_30px_rgba(184,134,11,0.12)] rounded-3xl",
        seekbarTrack: "progress-bar-track-unplayed bg-[#b8860b]/18",
        seekbarFill: "progress-bar-fill-active bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#e6c667]",
        seekbarThumb: "progress-thumb-knob bg-white border-2 border-[#d4af37] shadow-[0_0_10px_rgba(212,175,55,0.7),0_0_18px_rgba(230,198,103,0.4)]",
        seekbarGlow: "shadow-[#d4af37]/40",
        seekbarAccent: "accent-[#d4af37]",
        timeText: "player-time-display text-[#8b6508]",
        playBtn: "player-play-btn full-player-play-btn bg-gradient-to-r from-[#b8860b] via-[#d4af37] to-[#e6c667] text-white shadow-[0_4px_14px_rgba(212,175,55,0.45),0_0_20px_rgba(230,198,103,0.25)] rounded-full",
        playIconFill: "fill-white text-white",
        ctrlBtn: "player-control-btn bg-[#FDFBF7] hover:bg-[#FAF5ED] text-[#8b6508] hover:text-[#b8860b] border-[#d4af37]/25 shadow-sm rounded-full",
        activeText: "text-[#b8860b] drop-shadow-[0_0_6px_rgba(212,175,55,0.5)]",
        mutedText: "text-[#8b6508] hover:text-[#b8860b]",
        volSlider: "bg-[#FAF5ED] accent-[#d4af37]",
      };
    case "obsidian-depth":
      return {
        bgCanvas: "bg-[#2a2e38]",
        orb1: "bg-sky-400/40",
        orb2: "bg-cyan-300/30",
        auroraBeam1: "bg-gradient-to-r from-[#a5f3fc]/35 via-[#38bdf8]/40 to-[#0284c7]/40",
        auroraBeam2: "bg-gradient-to-r from-[#0284c7]/35 via-[#38bdf8]/40 to-[#a5f3fc]/35",
        orbitalGlow1: "bg-gradient-to-tr from-[#a5f3fc]/45 via-[#38bdf8]/40 to-[#0284c7]/45",
        orbitalGlow2: "bg-gradient-to-bl from-[#0284c7]/40 via-[#38bdf8]/40 to-[#a5f3fc]/45",
        driftAuraGlow: "bg-gradient-to-br from-[#38bdf8]/20 via-[#a5f3fc]/15 to-transparent",
        veil: "bg-gradient-to-b from-black/40 via-black/15 to-black/80",
        topBar: "bg-gradient-to-r from-[#303643] to-[#252932] border-white/[0.05] text-slate-100 shadow-[6px_6px_16px_rgba(12,14,20,0.7),-5px_-5px_12px_rgba(255,255,255,0.06)] rounded-2xl",
        minimizeBtn: "bg-gradient-to-br from-[#333946] to-[#262a33] hover:text-white text-sky-300 border-white/[0.05] shadow-[4px_4px_10px_rgba(12,14,20,0.7),-3px_-3px_8px_rgba(255,255,255,0.06)] active:shadow-[inset_3px_3px_6px_rgba(12,14,20,0.85),inset_-2px_-2px_5px_rgba(255,255,255,0.05)] rounded-xl",
        nowPlayingDot: "bg-[#38bdf8]",
        nowPlayingLabel: "text-[#38bdf8]",
        nowPlayingTitle: "text-slate-100",
        tabActive: "bg-gradient-to-r from-[#a5f3fc] via-[#38bdf8] to-[#0284c7] text-[#0f172a] border-transparent shadow-[4px_4px_12px_rgba(12,14,20,0.7),0_0_16px_rgba(56,189,248,0.4)] font-black rounded-xl",
        tabInactive: "bg-[#242831] hover:bg-[#20242c] text-slate-300 border-black/25 shadow-[inset_3px_3px_6px_rgba(13,15,21,0.85),inset_-2px_-2px_5px_rgba(255,255,255,0.06)] rounded-xl",
        artGlowRing: "from-[#a5f3fc]/50 via-[#38bdf8]/40 to-[#0284c7]/50",
        artBorder: "border-white/[0.08] shadow-[12px_12px_28px_rgba(12,14,20,0.85),-10px_-10px_24px_rgba(255,255,255,0.07)] rounded-3xl",
        stageTitle: "text-slate-100 drop-shadow-md font-bold",
        stageArtist: "text-[#38bdf8] font-semibold",
        stageTagAccent: "bg-[#38bdf8]/20 border-[#38bdf8]/40 text-[#a5f3fc]",
        stageTagNeutral: "bg-[#242831] border-black/20 text-slate-300 shadow-[inset_3px_3px_6px_rgba(13,15,21,0.8)]",
        bottomDeck: "bg-gradient-to-b from-[#303643] to-[#252932] border-white/[0.05] text-slate-100 shadow-[10px_10px_26px_rgba(12,14,20,0.85),-8px_-8px_20px_rgba(255,255,255,0.07)] rounded-3xl",
        seekbarTrack: "bg-[#20242d] shadow-[inset_3px_3px_6px_rgba(10,12,17,0.85),inset_-2px_-2px_4px_rgba(255,255,255,0.05)]",
        seekbarFill: "bg-gradient-to-r from-[#a5f3fc] via-[#38bdf8] to-[#0284c7] shadow-[0_0_12px_rgba(56,189,248,0.6)]",
        seekbarThumb: "bg-gradient-to-br from-[#a5f3fc] to-[#38bdf8] border-2 border-[#20242d] shadow-[4px_4px_10px_rgba(10,12,18,0.8),0_0_14px_rgba(56,189,248,0.8)]",
        seekbarGlow: "shadow-sky-500/40",
        seekbarAccent: "accent-[#38bdf8]",
        timeText: "text-slate-400",
        playBtn: "bg-gradient-to-r from-[#a5f3fc] via-[#38bdf8] to-[#0284c7] hover:brightness-105 text-[#0f172a] shadow-[6px_6px_16px_rgba(12,14,20,0.75),-4px_-4px_10px_rgba(255,255,255,0.12),0_0_24px_rgba(56,189,248,0.4)] border border-white/20 active:scale-95 transition-all rounded-2xl",
        playIconFill: "fill-[#0f172a]",
        ctrlBtn: "bg-gradient-to-br from-[#333946] to-[#262a33] hover:text-[#38bdf8] text-slate-200 border-white/[0.05] shadow-[5px_5px_12px_rgba(12,14,20,0.75),-4px_-4px_10px_rgba(255,255,255,0.06)] active:shadow-[inset_3px_3px_6px_rgba(12,14,20,0.85),inset_-2px_-2px_5px_rgba(255,255,255,0.05)] rounded-2xl",
        activeText: "text-[#38bdf8]",
        mutedText: "text-slate-400 hover:text-white",
        volSlider: "bg-[#20242d] accent-[#38bdf8] shadow-[inset_2px_2px_4px_rgba(10,12,17,0.8)]",
      };
    case "nebula-liquid-glass":
      return {
        bgCanvas: "bg-[#0c071e]",
        orb1: "bg-[#ff007f]/50",
        orb2: "bg-[#00f0ff]/45",
        auroraBeam1: "bg-gradient-to-r from-[#ff007f]/50 via-[#ff7b00]/45 to-[#00f0ff]/50",
        auroraBeam2: "bg-gradient-to-r from-[#00f0ff]/45 via-[#d946ef]/50 to-[#ff007f]/50",
        orbitalGlow1: "bg-gradient-to-tr from-[#ff007f]/60 via-[#ff7b00]/50 to-[#00f0ff]/60",
        orbitalGlow2: "bg-gradient-to-bl from-[#00f0ff]/50 via-[#8b5cf6]/55 to-[#ff007f]/60",
        driftAuraGlow: "bg-gradient-to-br from-[#ff007f]/35 via-[#ff7b00]/30 to-transparent",
        veil: "bg-gradient-to-b from-[#0c071e]/50 via-[#0c071e]/10 to-[#0c071e]/80",
        topBar: "bg-white/[0.035] backdrop-blur-3xl border border-white/[0.18] border-t-white/35 border-b-black/40 text-white shadow-[inset_0_1.5px_1.5px_rgba(255,255,255,0.5),inset_0_-1.5px_2px_rgba(0,0,0,0.35),0_12px_36px_rgba(0,0,0,0.6),0_0_28px_rgba(255,0,127,0.2)] rounded-2xl",
        minimizeBtn: "bg-white/[0.04] hover:bg-white/[0.12] hover:text-white text-pink-100 border border-white/[0.18] border-t-white/35 border-b-black/40 backdrop-blur-2xl shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.45),inset_0_-1.5px_2px_rgba(0,0,0,0.35),0_4px_14px_rgba(0,0,0,0.5)] active:translate-y-0.5 rounded-xl transition-all",
        nowPlayingDot: "bg-[#ff007f] shadow-[0_0_10px_#ff007f]",
        nowPlayingLabel: "text-[#ff2a85]",
        nowPlayingTitle: "text-white drop-shadow-sm",
        tabActive: "bg-gradient-to-r from-[#ff007f] via-[#d946ef] to-[#ff7b00] text-white shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.65),inset_0_-1.5px_2px_rgba(0,0,0,0.35),0_0_22px_rgba(255,0,127,0.55),0_4px_12px_rgba(0,0,0,0.4)] border-t border-white/50 border-b border-black/35 font-black rounded-xl",
        tabInactive: "bg-white/[0.035] hover:bg-white/[0.09] text-pink-200 border border-white/[0.16] border-t-white/30 border-b-black/30 backdrop-blur-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_4px_12px_rgba(0,0,0,0.4)] rounded-xl",
        artGlowRing: "from-[#ff007f]/60 via-[#ff7b00]/50 to-[#00f0ff]/60",
        artBorder: "border border-white/[0.22] border-t-white/45 border-b-black/50 shadow-[0_24px_60px_rgba(0,0,0,0.8),inset_0_2px_2px_rgba(255,255,255,0.6),inset_0_-2px_3px_rgba(0,0,0,0.5),0_0_36px_rgba(255,0,127,0.35)] rounded-3xl",
        stageTitle: "text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] font-black",
        stageArtist: "text-[#ff2a85] font-bold drop-shadow-sm",
        stageTagAccent: "bg-[#ff007f]/20 border border-pink-400/50 border-t-white/35 text-pink-100 font-bold shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_14px_rgba(0,0,0,0.4),0_0_12px_rgba(255,0,127,0.3)]",
        stageTagNeutral: "bg-white/[0.04] border border-white/[0.16] border-t-white/30 border-b-black/30 text-pink-100 backdrop-blur-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_4px_12px_rgba(0,0,0,0.4)]",
        bottomDeck: "bg-white/[0.035] backdrop-blur-3xl border border-white/[0.18] border-t-white/35 border-b-black/40 text-white shadow-[inset_0_1.5px_1.5px_rgba(255,255,255,0.5),inset_0_-1.5px_2px_rgba(0,0,0,0.35),0_16px_48px_rgba(0,0,0,0.7),0_0_32px_rgba(255,0,127,0.22)] rounded-3xl",
        seekbarTrack: "bg-white/[0.06] border border-white/[0.12] border-t-black/40 border-b-white/20 shadow-inner backdrop-blur-md",
        seekbarFill: "bg-gradient-to-r from-[#ff007f] via-[#ec4899] via-[#ff7b00] to-[#00f0ff] shadow-[0_0_18px_rgba(255,0,127,0.7),inset_0_1px_1px_rgba(255,255,255,0.5)]",
        seekbarThumb: "bg-white border-2 border-[#ff007f] shadow-[0_0_18px_rgba(255,0,127,0.9),0_2px_6px_rgba(0,0,0,0.5)]",
        seekbarGlow: "shadow-pink-500/50",
        seekbarAccent: "accent-[#ff007f]",
        timeText: "text-pink-200/80 font-mono",
        playBtn: "bg-gradient-to-r from-[#ff007f] via-[#ec4899] to-[#ff7b00] hover:brightness-115 text-white shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.65),inset_0_-2px_2px_rgba(0,0,0,0.35),0_8px_26px_rgba(255,0,127,0.65),0_4px_12px_rgba(0,0,0,0.4)] border-t border-white/50 border-b border-black/35 active:translate-y-0.5 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] transition-all rounded-2xl",
        playIconFill: "fill-white",
        ctrlBtn: "bg-white/[0.04] hover:bg-white/[0.12] hover:text-white text-pink-100 border border-white/[0.18] border-t-white/35 border-b-black/40 backdrop-blur-2xl shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.45),inset_0_-1.5px_2px_rgba(0,0,0,0.35),0_6px_18px_rgba(0,0,0,0.5)] active:translate-y-0.5 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] rounded-2xl transition-all",
        activeText: "text-[#ff2a85]",
        mutedText: "text-pink-300/70 hover:text-white",
        volSlider: "bg-white/[0.06] accent-[#ff007f]",
      };
    case "hard-rock":
    case "sugar-time-jazz":
      return {
        bgCanvas: "bg-[var(--bg-main,#120e16)]",
        orb1: "bg-[#E024B3]/35",
        orb2: "bg-[#800F5E]/30",
        auroraBeam1: "bg-gradient-to-r from-[#E024B3]/40 via-[#800F5E]/25 to-[#9333ea]/35",
        auroraBeam2: "bg-gradient-to-r from-[#800F5E]/35 via-[#16121a]/50 to-[#E024B3]/40",
        orbitalGlow1: "bg-gradient-to-tr from-[#E024B3]/50 via-[#800F5E]/30 to-[#9333ea]/45",
        orbitalGlow2: "bg-gradient-to-bl from-[#800F5E]/40 via-[#16121a]/60 to-[#E024B3]/45",
        driftAuraGlow: "bg-gradient-to-br from-[#E024B3]/20 via-[#800F5E]/15 to-transparent",
        veil: "bg-gradient-to-b from-[#120e16]/65 via-[#16121a]/25 to-[#0d0a08]/90",
        topBar: "bg-[rgba(22,18,26,0.85)] backdrop-blur-3xl border border-[rgba(212,175,55,0.35)] text-white shadow-[0_12px_36px_rgba(0,0,0,0.6),0_0_16px_rgba(192,132,252,0.22)] rounded-2xl",
        minimizeBtn: "bg-transparent hover:bg-white/[0.08] text-[#E5E7EB] border-none shadow-none rounded-xl transition-all",
        nowPlayingDot: "bg-[#E024B3] shadow-[0_0_12px_#E024B3]",
        nowPlayingLabel: "text-[#E024B3] font-bold tracking-widest drop-shadow-[0_0_8px_rgba(224,36,179,0.5)]",
        nowPlayingTitle: "text-white drop-shadow-sm font-sans font-semibold",
        tabActive: "bg-gradient-to-br from-[#E024B3] via-[#800F5E] to-[#2A0520] text-white shadow-[0_0_12px_rgba(224,36,179,0.4),inset_0_1px_1px_rgba(255,255,255,0.3)] font-semibold border border-[rgba(255,105,180,0.4)] rounded-full",
        tabInactive: "bg-white/[0.08] hover:bg-white/[0.14] text-[#E5E7EB] border border-white/[0.15] backdrop-blur-2xl rounded-full",
        artGlowRing: "from-[#E024B3]/60 via-[#800F5E]/40 to-[#9333ea]/60",
        artBorder: "border border-[rgba(212,175,55,0.35)] shadow-[0_24px_60px_rgba(0,0,0,0.8),0_0_16px_rgba(192,132,252,0.22)] rounded-3xl",
        stageTitle: "text-white drop-shadow-[0_0_14px_rgba(224,36,179,0.6)] font-semibold text-xl",
        stageArtist: "text-[#E5E7EB] font-medium drop-shadow-[0_0_8px_rgba(128,15,94,0.4)]",
        stageTagAccent: "bg-[#E024B3]/25 border border-[rgba(255,105,180,0.4)] text-white font-bold shadow-[0_0_12px_rgba(224,36,179,0.35)]",
        stageTagNeutral: "bg-white/[0.04] border border-[rgba(212,175,55,0.18)] text-[#E5E7EB] backdrop-blur-2xl",
        bottomDeck: "bg-[rgba(26,20,32,0.95)] backdrop-blur-3xl border border-[rgba(212,175,55,0.35)] text-white shadow-[0_16px_48px_rgba(0,0,0,0.8),0_0_16px_rgba(192,132,252,0.22)] rounded-3xl",
        seekbarTrack: "bg-white/[0.08] border border-[rgba(212,175,55,0.18)] shadow-inner backdrop-blur-md",
        seekbarFill: "bg-gradient-to-r from-[#E024B3] via-[#800F5E] to-[#9333ea] shadow-[0_0_18px_rgba(224,36,179,0.7)]",
        seekbarThumb: "bg-white border-2 border-[#E024B3] shadow-[0_0_18px_rgba(224,36,179,0.85)]",
        seekbarGlow: "shadow-pink-500/50",
        seekbarAccent: "accent-[#E024B3]",
        timeText: "text-[#E5E7EB] font-mono font-semibold",
        playBtn: "full-player-play-btn play-pause-btn bg-gradient-to-br from-[#E024B3] via-[#800F5E] to-[#2A0520] hover:brightness-110 text-white shadow-[0_0_12px_rgba(224,36,179,0.4),inset_0_1px_1px_rgba(255,255,255,0.3)] border border-[rgba(255,105,180,0.4)] rounded-full transition-all active:scale-95",
        playIconFill: "fill-white",
        ctrlBtn: "control-btn bg-white/[0.08] hover:bg-white/[0.14] text-[#E5E7EB] border border-white/[0.15] shadow-none rounded-xl transition-all",
        activeText: "text-[#FF69B4] drop-shadow-[0_0_10px_rgba(224,36,179,0.7)]",
        mutedText: "text-[#E5E7EB] hover:text-white",
        volSlider: "bg-white/[0.08] accent-[#E024B3]",
      };
  }
}

const WAVEFORM_BARS = [
  18, 28, 42, 65, 80, 50, 35, 75, 95, 85, 45, 60, 90, 100, 70, 40,
  85, 92, 60, 30, 45, 78, 95, 88, 55, 38, 70, 92, 80, 45, 60, 85,
  75, 50, 35, 65, 80, 60, 40, 25, 18, 12
];

const calculateTargetTime = (
  event: React.PointerEvent | PointerEvent | React.MouseEvent | MouseEvent | React.TouchEvent | TouchEvent,
  container: HTMLDivElement | null,
  duration: number
): number => {
  if (!container || !duration || isNaN(duration) || duration <= 0) return 0;

  const rect = container.getBoundingClientRect();
  if (rect.width <= 0) return 0;

  let clientX: number;
  if ("touches" in event && event.touches && event.touches.length > 0) {
    clientX = event.touches[0].clientX;
  } else if ("changedTouches" in event && event.changedTouches && event.changedTouches.length > 0) {
    clientX = event.changedTouches[0].clientX;
  } else if ("clientX" in event) {
    clientX = (event as PointerEvent | MouseEvent).clientX;
  } else {
    return 0;
  }

  // Clamp click coordinates within bounds (0 to 1)
  const offsetX = Math.max(0, Math.min(clientX - rect.left, rect.width));
  const percentage = offsetX / rect.width;

  return percentage * duration;
};

interface WaveformScrubberProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onSeek: (newTime: number) => void;
  designConfig: FullAppDesignConfig;
  bespokeColors?: [string, string, string, string] | string[];
  className?: string;
  isMini?: boolean;
  onScrubbingChange?: (isScrubbing: boolean, scrubTime: number | null) => void;
}

const WaveformScrubber: React.FC<WaveformScrubberProps> = ({
  currentTime,
  duration,
  isPlaying,
  onSeek,
  designConfig,
  bespokeColors,
  className = "",
  isMini = false,
  onScrubbingChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Sync ref for access inside window event listeners
  const isScrubbingRef = useRef(false);
  isScrubbingRef.current = isScrubbing;

  const effectiveTime = isScrubbing && scrubTime !== null ? scrubTime : currentTime;
  const effectiveDuration = duration > 0 ? duration : 1;
  const progressPercent = Math.max(0, Math.min(100, (effectiveTime / effectiveDuration) * 100));

  // Pointer Down (Direct jump and start scrubbing session)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {}
    setIsScrubbing(true);
    const newTime = calculateTargetTime(e, containerRef.current, duration);
    setScrubTime(newTime);
    onScrubbingChange?.(true, newTime);
    if (!isNaN(newTime) && newTime >= 0) {
      onSeek(newTime);
    }
  };

  // Dragging movement and release via global window listeners while scrubbing
  useEffect(() => {
    if (!isScrubbing) return;

    const handleWindowPointerMove = (e: PointerEvent) => {
      if (!isScrubbingRef.current) return;
      e.stopPropagation();
      e.preventDefault();
      const newTime = calculateTargetTime(e, containerRef.current, duration);
      setScrubTime(newTime);
      onScrubbingChange?.(true, newTime);
    };

    const handleWindowPointerUp = (e: PointerEvent) => {
      if (!isScrubbingRef.current) return;
      e.stopPropagation();
      e.preventDefault();
      const finalTime = calculateTargetTime(e, containerRef.current, duration);
      setIsScrubbing(false);
      setScrubTime(null);
      onScrubbingChange?.(false, null);
      if (!isNaN(finalTime) && finalTime >= 0) {
        onSeek(finalTime);
      }
    };

    const handleWindowPointerCancel = (e?: PointerEvent) => {
      if (!isScrubbingRef.current) return;
      e?.stopPropagation();
      setIsScrubbing(false);
      setScrubTime(null);
      onScrubbingChange?.(false, null);
    };

    window.addEventListener("pointermove", handleWindowPointerMove, { passive: false, capture: true });
    window.addEventListener("pointerup", handleWindowPointerUp, { passive: false, capture: true });
    window.addEventListener("pointercancel", handleWindowPointerCancel, { passive: false, capture: true });

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove, { capture: true });
      window.removeEventListener("pointerup", handleWindowPointerUp, { capture: true });
      window.removeEventListener("pointercancel", handleWindowPointerCancel, { capture: true });
    };
  }, [isScrubbing, duration, onSeek, onScrubbingChange]);

  const hasBespokeColors = Boolean(bespokeColors && bespokeColors.length >= 2);

  const isHardRock = Boolean(
    designConfig.id === "hard-rock" ||
    Boolean(designConfig.isHardRock) ||
    designConfig.themePreset === "hard-rock" ||
    designConfig.id === "sugar-time-jazz" ||
    designConfig.name === "Hard Rock"
  );

  return (
    <div
      ref={containerRef}
      data-scrubber="true"
      onPointerDown={handlePointerDown}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        touchAction: "none",
        ...(hasBespokeColors ? ({ "--accent-primary": bespokeColors![1] } as React.CSSProperties) : {}),
        ...(isHardRock ? { background: "transparent", border: "none", boxShadow: "none" } : {}),
      }}
      className={`progress-waveform-container progress-bar-track-housing group relative flex-1 ${isMini ? "h-8" : "h-8 sm:h-9"} flex items-center justify-between gap-[2px] sm:gap-[3px] cursor-pointer select-none touch-none py-1 px-1 transition-all ${isHardRock ? "" : `${designConfig.inputBg || "bg-black/30"} border ${designConfig.borderSubtle || "border-white/10"} hover:${designConfig.accentBorder || "border-white/30"}`} ${className}`}
      title="Click or drag anywhere on waveform to seek"
    >
      {/* Waveform Bars */}
      {WAVEFORM_BARS.map((heightPct, idx) => {
        const barPosPct = (idx / (WAVEFORM_BARS.length - 1)) * 100;
        const isPassed = barPosPct <= progressPercent;

        return (
          <div
            key={idx}
            className="flex-1 flex items-center justify-center h-full min-w-[2px] pointer-events-none"
          >
            <span
              className={`progress-waveform-bar ${
                isPassed
                  ? "is-played progress-waveform-active progress-gradient-animated shadow-[0_0_8px_var(--accent-primary)]"
                  : "progress-bar-track-unplayed waveform-inactive-bar"
              } w-full rounded-full transition-[height,background-color] duration-150`}
              style={{
                height: `${heightPct}%`,
                ...(isHardRock
                  ? (isPassed
                      ? {
                          background: "linear-gradient(180deg, #f0e2ca 0%, #a855f7 100%)",
                          boxShadow: "0 0 8px rgba(168, 85, 247, 0.7), 0 0 3px rgba(240, 226, 202, 0.5)",
                        }
                      : {
                          background: "rgba(232, 213, 181, 0.22)",
                          boxShadow: "none",
                        })
                  : hasBespokeColors && isPassed
                  ? {
                      background: `linear-gradient(90deg, ${bespokeColors![0]}, ${bespokeColors![1]})`,
                      boxShadow: `0 0 8px ${bespokeColors![1]}`,
                    }
                  : {}),
              }}
            />
          </div>
        );
      })}

      {/* Interactive Scrubber Knob */}
      <div
        data-scrubber-thumb="true"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        className={`progress-thumb-knob progress-handle-active ${isScrubbing ? "is-dragging opacity-100 scale-125" : ""} absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full pointer-events-none transition-all duration-75 ${
          isScrubbing || isHovered
            ? "opacity-100 scale-125"
            : "opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100"
        }`}
        style={{
          left: `${progressPercent}%`,
          background: isHardRock
            ? "linear-gradient(135deg, #f0e2ca, #c59b27)"
            : hasBespokeColors
            ? `linear-gradient(135deg, ${bespokeColors![0]}, ${bespokeColors![1]})`
            : "linear-gradient(135deg, var(--accent-secondary, var(--accent-primary)), var(--accent-primary))",
          border: "2px solid #ffffff",
          boxShadow: isHardRock
            ? "0 0 14px rgba(168, 85, 247, 0.85), 0 2px 6px rgba(0,0,0,0.6)"
            : hasBespokeColors
            ? `0 0 12px ${bespokeColors![1]}, 0 2px 6px rgba(0,0,0,0.5)`
            : "0 0 10px var(--accent-primary), 0 2px 6px rgba(0,0,0,0.5)",
        }}
      />
    </div>
  );
};

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
  onSelectTrack,
  onPlayQueue,
  onRegisterRadioQueue,
  onAddToQueue,
  settings,
  playlists = [],
  onAddTrackToPlaylist,
  onOpenAddToPlaylistModal,
  onRemoveTrack,
  designConfig = FULL_APP_DESIGNS["designer"],
  onToggleShuffle,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  const playerRef = useRef<any>(null);
  const isPlayerReadyRef = useRef<boolean>(false);
  const isChangingTrackRef = useRef<boolean>(false);
  const isChangingTrackTimeoutRef = useRef<any>(null);
  const userManualPauseRef = useRef<boolean>(false);

  // --- Playback hardening: pause-stutter guard, toggle debounce, stuck-start watchdog ---
  // After the user pauses, YouTube can still emit a late PLAYING event (or the 100ms poll can still
  // see state 1) before it reports PAUSED. Until this timestamp passes, those echoes must not resume playback.
  const pauseGuardUntilRef = useRef<number>(0);
  const lastToggleAtRef = useRef<number>(0);
  const initYTRef = useRef<((vid: string) => void) | null>(null);
  const volumeRef = useRef<number>(1);
  const isMutedRef = useRef<boolean>(false);
  const stuckWatchdogRef = useRef<{ videoId: string; lastTime: number; lastProgressAt: number; attempts: number }>({
    videoId: "",
    lastTime: 0,
    lastProgressAt: 0,
    attempts: 0,
  });
  const fullPlayerContainerRef = useRef<HTMLDivElement | null>(null);
  const miniPlayerContainerRef = useRef<HTMLDivElement | null>(null);
  const currentBeatRef = useRef<number>(0);
  const rafBeatIdRef = useRef<number | null>(null);

  // Seek synchronization refs to prevent stale time updates and player clock collisions
  const lastSeekTimeRef = useRef<number | null>(null);
  const lastSeekTimestampRef = useRef<number>(0);
  const isAudioSeekingRef = useRef<boolean>(false);
  const activeAudioSourceRef = useRef<"audio" | "youtube">("youtube");
  const mediaModeRef = useRef<"song" | "video">(playerState.mediaMode === "video" ? "video" : "song");
  mediaModeRef.current = playerState.mediaMode === "video" ? "video" : "song";

  // SECTION 1: HIDDEN SILENT HTML5 AUDIO ANCHOR (Permanent Android MediaSession Fix)
  useEffect(() => {
    // Generate valid PCM silent WAV
    const silentSrc = getSilentAudioUrl() || "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
    const audio = new Audio(silentSrc);
    audio.loop = true;
    audio.setAttribute("playsinline", "true");
    audio.volume = 0.01;
    silentAudioRef.current = audio;

    return () => {
      try {
        audio.pause();
      } catch {}
      silentAudioRef.current = null;
    };
  }, []);

  const startSilentAnchor = useCallback(() => {
    if (mediaModeRef.current === "video") return;
    try {
      if (silentAudioRef.current && silentAudioRef.current.paused) {
        silentAudioRef.current.play().catch(() => {});
      }
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
      }
    } catch {}
  }, []);

  const stopSilentAnchor = useCallback(() => {
    try {
      if (silentAudioRef.current && !silentAudioRef.current.paused) {
        silentAudioRef.current.pause();
      }
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    } catch {}
  }, []);

  // Ensure user interaction unlocks the Web Audio context / YouTube iframe API instance on the first touch event
  useEffect(() => {
    const handleFirstGesture = () => {
      // 1. Unlock Web Audio Context if suspended
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const testCtx = new AudioCtx();
          if (testCtx.state === "suspended") {
            testCtx.resume().catch(() => {});
          }
        }
      } catch {}

      // 2. Unlock silent audio anchor
      startSilentAnchor();

      // 3. Unlock YouTube iframe player instance
      if (playerRef.current) {
        try {
          if (isPlayingRef.current) {
            playerRef.current.playVideo?.();
          }
        } catch {}
      }
    };

    window.addEventListener("pointerdown", handleFirstGesture, { passive: true, once: true });
    window.addEventListener("touchstart", handleFirstGesture, { passive: true, once: true });
    window.addEventListener("click", handleFirstGesture, { passive: true, once: true });
    return () => {
      window.removeEventListener("pointerdown", handleFirstGesture);
      window.removeEventListener("touchstart", handleFirstGesture);
      window.removeEventListener("click", handleFirstGesture);
    };
  }, [startSilentAnchor]);

  // Synchronize HTML5 <audio> element events directly with Android OS Media Session
  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    const handlePlay = () => {
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "playing";
      }
    };

    const handlePause = () => {
      if ("mediaSession" in navigator && userManualPauseRef.current) {
        navigator.mediaSession.playbackState = "paused";
      }
    };

    const handleTimeUpdateForMediaSession = () => {
      const src = audioElement.src || "";
      if (src.startsWith("data:audio/wav") || src.startsWith("blob:") || (cachedSilentUrl && src === cachedSilentUrl)) {
        return;
      }
      if ("mediaSession" in navigator && "setPositionState" in navigator.mediaSession) {
        if (audioElement.duration && !isNaN(audioElement.duration) && audioElement.duration > 0) {
          try {
            navigator.mediaSession.setPositionState({
              duration: audioElement.duration,
              playbackRate: audioElement.playbackRate || 1,
              position: Math.min(Math.max(audioElement.currentTime, 0), audioElement.duration),
            });
          } catch {}
        }
      }
    };

    audioElement.addEventListener("play", handlePlay);
    audioElement.addEventListener("pause", handlePause);
    audioElement.addEventListener("timeupdate", handleTimeUpdateForMediaSession);

    return () => {
      audioElement.removeEventListener("play", handlePlay);
      audioElement.removeEventListener("pause", handlePause);
      audioElement.removeEventListener("timeupdate", handleTimeUpdateForMediaSession);
    };
  }, []);

  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const isScrubbingRef = useRef(false);
  isScrubbingRef.current = isScrubbing;

  const handleScrubbingChange = useCallback((scrubbing: boolean, time: number | null) => {
    setIsScrubbing(scrubbing);
    setScrubTime(time);
    isScrubbingRef.current = scrubbing;
  }, []);

  // Section 4: Dynamic Position State for Android OS Progress Bar
  const updatePositionState = useCallback((targetPosition?: number, targetDuration?: number) => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator) || !("setPositionState" in navigator.mediaSession)) {
      return;
    }
    const curDur = (targetDuration !== undefined && targetDuration > 0)
      ? targetDuration
      : ((durationRef.current && durationRef.current > 0) ? durationRef.current : (playerState.currentTrack?.duration || 0));

    const curPos = (targetPosition !== undefined && targetPosition >= 0)
      ? targetPosition
      : (currentTimeRef.current || 0);

    if (curDur > 0 && !isNaN(curDur) && typeof curPos === "number" && !isNaN(curPos) && curPos >= 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(curDur, 1),
          playbackRate: 1.0,
          position: Math.min(Math.max(curPos, 0), curDur),
        });
      } catch {
        // Safe catch if clamped bounds
      }
    }
  }, [playerState.currentTrack?.duration]);



  // Dedicated radioSeedTrack state that locks to the song that initiated the radio station
  const [radioSeedTrack, setRadioSeedTrack] = useState<Track | null>(null);

  // Swipe-down gesture state for collapsing Full Player back to mini player
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartTime, setTouchStartTime] = useState<number>(0);
  const [dragOffsetY, setDragOffsetY] = useState<number>(0);
  const [isDraggingDown, setIsDraggingDown] = useState<boolean>(false);

  // Swipe-down and mouse drag-down gesture state for closing mini player
  const [miniTouchStartY, setMiniTouchStartY] = useState<number | null>(null);
  const [miniTouchStartX, setMiniTouchStartX] = useState<number | null>(null);
  const [miniTouchStartTime, setMiniTouchStartTime] = useState<number>(0);
  const [miniDragOffsetY, setMiniDragOffsetY] = useState<number>(0);
  const [isMiniDraggingDown, setIsMiniDraggingDown] = useState<boolean>(false);
  const [isMiniClosing, setIsMiniClosing] = useState<boolean>(false);

  // Ref tracking active mouse drag on PC for clean window listener binding
  const isMiniMouseDraggingRef = useRef<boolean>(false);
  const miniMouseStartYRef = useRef<number>(0);
  const miniMouseStartXRef = useRef<number>(0);
  const miniMouseStartTimeRef = useRef<number>(0);

  const handleCloseMiniPlayer = () => {
    setIsMiniClosing(true);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = "";
      }
      if (playerRef.current && playerRef.current.pauseVideo) {
        try {
          playerRef.current.pauseVideo();
          playerRef.current.stopVideo?.();
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
    const target = e.target as HTMLElement | null;
    if (target?.closest("button, input, a, [role='slider'], .progress-waveform-container, .progress-thumb-knob, .progress-waveform-bar, [data-scrubber='true'], [data-scrubber-thumb='true'], [data-interactive='true']")) {
      return;
    }
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

  // PC Mouse drag-to-close handlers for mini player
  const handleMiniMouseDown = (e: React.MouseEvent) => {
    // Only primary mouse button
    if (e.button !== 0) return;
    // Don't initiate drag when clicking on interactive controls (buttons, sliders, inputs, scrubber, artwork)
    const target = e.target as HTMLElement | null;
    if (target?.closest("button, input, a, [role='slider'], .progress-waveform-container, .progress-thumb-knob, .progress-waveform-bar, [data-scrubber='true'], [data-scrubber-thumb='true'], [data-interactive='true']")) {
      return;
    }

    isMiniMouseDraggingRef.current = true;
    miniMouseStartYRef.current = e.clientY;
    miniMouseStartXRef.current = e.clientX;
    miniMouseStartTimeRef.current = Date.now();
    setIsMiniDraggingDown(false);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isMiniMouseDraggingRef.current) return;
      const deltaY = moveEvent.clientY - miniMouseStartYRef.current;
      const deltaX = moveEvent.clientX - miniMouseStartXRef.current;

      if (deltaY > 4 && deltaY > Math.abs(deltaX) * 0.6) {
        setIsMiniDraggingDown(true);
        const dampedOffset = deltaY < 120 ? deltaY : 120 + (deltaY - 120) * 0.4;
        setMiniDragOffsetY(dampedOffset);
      } else if (deltaY <= 0) {
        setMiniDragOffsetY(0);
        setIsMiniDraggingDown(false);
      }
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (!isMiniMouseDraggingRef.current) return;
      isMiniMouseDraggingRef.current = false;

      const deltaY = upEvent.clientY - miniMouseStartYRef.current;
      const deltaX = upEvent.clientX - miniMouseStartXRef.current;
      const duration = Math.max(1, Date.now() - miniMouseStartTimeRef.current);
      const velocityY = deltaY / duration;

      if ((deltaY > 50 || (deltaY > 25 && velocityY > 0.3)) && deltaY > Math.abs(deltaX) * 0.6) {
        handleCloseMiniPlayer();
      } else {
        setMiniDragOffsetY(0);
        setIsMiniDraggingDown(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // Prevent touch drag when touching video card, video wrapper, iframe, or interactive controls
    const target = e.target as HTMLElement | null;
    if (target?.closest(".full-player-video-card, .full-player-video-wrapper, .full-player-video-frame-wrapper, #oblivion-yt-wrapper, iframe, button, input, a, [role='slider'], .progress-waveform-container, .progress-thumb-knob, .progress-waveform-bar, [data-scrubber='true']")) {
      return;
    }
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

  const playerCtx = usePlayer();
  const effectiveShuffle = playerCtx ? playerCtx.isShuffled : isShuffle;
  const effectiveRepeat = playerCtx ? playerCtx.repeatMode : repeatMode;
  const effectiveLiked = playerCtx ? playerCtx.isFavorite : isLiked;

  // Unified activeTab across full player: "audio" | "video" | "lyrics" | "radio"
  const activeTab: "audio" | "video" | "lyrics" | "radio" = showLyrics
    ? "lyrics"
    : showSimilar
    ? "radio"
    : playerState.mediaMode === "video"
    ? "video"
    : "audio";

  const isBespoke = Boolean(designConfig.id === "bespoke" || designConfig.isBespoke);
  const isHardRock = Boolean(
    designConfig.id === "hard-rock" ||
    Boolean(designConfig.isHardRock) ||
    designConfig.themePreset === "hard-rock" ||
    designConfig.id === "sugar-time-jazz" ||
    designConfig.name === "Hard Rock"
  );
  const isCandyland = Boolean(
    (designConfig.id as string) === "candyland" ||
    (designConfig.id as string) === "candyland-pastel" ||
    (designConfig as any).isCandy ||
    (designConfig as any).themePreset === "candyland" ||
    designConfig.name === "Candyland Pastel"
  );

  const [bespokeColors, setBespokeColors] = useState<[string, string, string, string]>(() => {
    if (designConfig.swatchColors && designConfig.swatchColors.length >= 4) {
      return [
        designConfig.swatchColors[0],
        designConfig.swatchColors[1],
        designConfig.swatchColors[2],
        designConfig.swatchColors[3],
      ];
    }
    const cfg = getBespokeConfig();
    return cfg.colors;
  });

  useEffect(() => {
    const handleColorsUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail) && e.detail.length >= 4) {
        setBespokeColors([e.detail[0], e.detail[1], e.detail[2], e.detail[3]]);
      } else if (e.detail && e.detail.colors && Array.isArray(e.detail.colors)) {
        setBespokeColors([e.detail.colors[0], e.detail.colors[1], e.detail.colors[2], e.detail.colors[3]]);
      }
    };

    window.addEventListener("oblivion_bespoke_colors_updated", handleColorsUpdate);
    window.addEventListener("oblivion_bespoke_config_updated", handleColorsUpdate);

    return () => {
      window.removeEventListener("oblivion_bespoke_colors_updated", handleColorsUpdate);
      window.removeEventListener("oblivion_bespoke_config_updated", handleColorsUpdate);
    };
  }, []);

  const swatchColorsKey = designConfig.swatchColors ? designConfig.swatchColors.slice(0, 4).join(",") : "";
  useEffect(() => {
    if (designConfig.swatchColors && designConfig.swatchColors.length >= 4) {
      const [c0, c1, c2, c3] = designConfig.swatchColors;
      setBespokeColors((prev) => {
        if (prev[0] === c0 && prev[1] === c1 && prev[2] === c2 && prev[3] === c3) {
          return prev;
        }
        return [c0, c1, c2, c3];
      });
    }
  }, [swatchColorsKey]);

  const fpTheme = getFullPlayerThemeStyles(designConfig, isBespoke ? bespokeColors : undefined);
  const currentThemeLogo = (designConfig as any)?.logoUrl || "/logo.svg";

  // Full player is a fixed, non-scrolling screen. Lock the page behind it so swipes never scroll
  // the document (which showed a scrollbar thumb on the right edge). Restored on close/unmount.
  useEffect(() => {
    if (!isFullscreen || typeof document === "undefined") return;
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverscroll: body.style.overscrollBehavior,
    };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";
    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      html.style.overscrollBehavior = prev.htmlOverscroll;
      body.style.overscrollBehavior = prev.bodyOverscroll;
    };
  }, [isFullscreen]);

  const isPlayingRef = useRef<boolean>(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const currentTimeRef = useRef<number>(currentTime);
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  const durationRef = useRef<number>(duration);
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  // TASK 1: Determine active track video ID reliably
  const activeVideoId = useMemo(() => {
    if (!currentTrack) return "";
    const cleanId = extractCleanYoutubeId(currentTrack);
    if (cleanId) return cleanId;
    return (currentTrack.id && currentTrack.id.length === 11)
      ? currentTrack.id
      : ((currentTrack as any).videoId || currentTrack.youtubeVideoId || (currentTrack as any).youtubeId || "");
  }, [currentTrack]);

  // TASK 1: Store the active video ID in a React Ref to prevent re-load loops
  const activeVideoIdRef = useRef<string | null>(null);

  // ================================================================================
  // TASK 4: HARDWARE-LEVEL MUTING SANITY GUARD
  // ================================================================================
  useEffect(() => {
    if (playerState.mediaMode === "video") {
      if (audioRef.current) audioRef.current.muted = true;
    } else {
      if (audioRef.current) audioRef.current.muted = false;
    }
  }, [playerState.mediaMode]);

  // ZERO-LATENCY TAB SWITCHING VIA CSS ONLY (Continuous Unified Audio & Video)
  const handleTabSwitch = useCallback(
    (newMode: "audio" | "video" | "lyrics" | "radio", e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (newMode === "audio") {
        setPlayerState((prev) => ({
          ...prev,
          mediaMode: "song",
          showLyrics: false,
          showSimilar: false,
          isFullscreen: true,
        }));
      } else if (newMode === "video") {
        setPlayerState((prev) => ({
          ...prev,
          mediaMode: "video",
          showLyrics: false,
          showSimilar: false,
          isFullscreen: true,
        }));
      } else if (newMode === "lyrics") {
        setPlayerState((prev) => ({
          ...prev,
          showLyrics: !prev.showLyrics,
          showSimilar: false,
          isFullscreen: true,
        }));
      } else if (newMode === "radio") {
        setPlayerState((prev) => {
          const nextShowSimilar = !prev.showSimilar;
          if (nextShowSimilar && currentTrack) {
            setRadioSeedTrack(currentTrack);
          }
          return {
            ...prev,
            showSimilar: nextShowSimilar,
            showLyrics: false,
            isFullscreen: true,
          };
        });
      }
    },
    [currentTrack, setPlayerState]
  );

  const handleMinimizeFullPlayer = useCallback(() => {
    setPlayerState((prev) => ({ ...prev, isFullscreen: false }));
  }, [setPlayerState]);

  // Section 1: Track if playback was paused due to transient system audio focus loss (e.g. WhatsApp chime)
  const interruptedWhilePlayingRef = useRef<boolean>(false);
  const lastMediaSessionPositionRef = useRef<number>(-1);

  // Real-Time Audio Analyzer Beat-Reactive Loop (AudioContext & AnalyserNode)
  useEffect(() => {
    // Automatically freeze animation loops when audio is paused or muted to save CPU/GPU cycles
    if (!isPlaying || isMuted || volume === 0) {
      if (rafBeatIdRef.current) {
        cancelAnimationFrame(rafBeatIdRef.current);
        rafBeatIdRef.current = null;
      }
      currentBeatRef.current = 0;
      const resetContainer = (el: HTMLElement | null) => {
        if (!el) return;
        el.style.setProperty("--beat-glow", "0");
        el.style.setProperty("--beat-scale", "0");
        el.classList.remove("beat-fallback-active");
      };
      resetContainer(fullPlayerContainerRef.current);
      resetContainer(miniPlayerContainerRef.current);
      return;
    }

    let isSubscribed = true;

    const renderBeatFrame = () => {
      if (!isSubscribed) return;

      const now = performance.now();
      const cycle = (now % 468) / 468;
      // Sharp rhythmic attack with smooth exponential decay
      const pulse = Math.pow(Math.max(0, 1 - cycle * 1.8), 2.2);
      const beatIntensity = Math.min(1, pulse * 0.85);

      // Bind beatIntensity as CSS Custom Variable (--beat-scale and --beat-glow)
      const formattedBeat = beatIntensity.toFixed(3);
      if (fullPlayerContainerRef.current) {
        fullPlayerContainerRef.current.style.setProperty("--beat-glow", formattedBeat);
        fullPlayerContainerRef.current.style.setProperty("--beat-scale", formattedBeat);
      }
      if (miniPlayerContainerRef.current) {
        miniPlayerContainerRef.current.style.setProperty("--beat-glow", formattedBeat);
        miniPlayerContainerRef.current.style.setProperty("--beat-scale", formattedBeat);
      }
      document.documentElement.style.setProperty("--beat-glow", formattedBeat);
      document.documentElement.style.setProperty("--beat-scale", formattedBeat);

      rafBeatIdRef.current = requestAnimationFrame(renderBeatFrame);
    };

    rafBeatIdRef.current = requestAnimationFrame(renderBeatFrame);

    return () => {
      isSubscribed = false;
      if (rafBeatIdRef.current) {
        cancelAnimationFrame(rafBeatIdRef.current);
        rafBeatIdRef.current = null;
      }
      const resetContainer = (el: HTMLElement | null) => {
        if (!el) return;
        el.style.setProperty("--beat-glow", "0");
        el.style.setProperty("--beat-scale", "0");
        el.classList.remove("beat-fallback-active");
      };
      resetContainer(fullPlayerContainerRef.current);
      resetContainer(miniPlayerContainerRef.current);
      document.documentElement.style.setProperty("--beat-glow", "0");
      document.documentElement.style.setProperty("--beat-scale", "0");
    };
  }, [isPlaying, isMuted, volume]);

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

  const onRemoveTrackRef = useRef(onRemoveTrack);
  useEffect(() => {
    onRemoveTrackRef.current = onRemoveTrack;
  }, [onRemoveTrack]);

  // Synchronized Next & Previous handlers that guarantee global currentTrack state update regardless of playerMode
  const handleNextTrack = useCallback(() => {
    isChangingTrackRef.current = true;
    userManualPauseRef.current = false;
    interruptedWhilePlayingRef.current = false;
    activeVideoIdRef.current = null; // Clear active video ref so new video loads immediately
    currentTimeRef.current = 0;
    if (isChangingTrackTimeoutRef.current) clearTimeout(isChangingTrackTimeoutRef.current);
    isChangingTrackTimeoutRef.current = setTimeout(() => {
      isChangingTrackRef.current = false;
    }, 2500);

    if (playerCtx?.playNextTrack) {
      playerCtx.playNextTrack();
    }
    if (onNextTrackRef.current) {
      onNextTrackRef.current();
    }
  }, [playerCtx]);

  const handlePrevTrack = useCallback(() => {
    isChangingTrackRef.current = true;
    userManualPauseRef.current = false;
    interruptedWhilePlayingRef.current = false;
    activeVideoIdRef.current = null; // Clear active video ref so new video loads immediately
    currentTimeRef.current = 0;
    if (isChangingTrackTimeoutRef.current) clearTimeout(isChangingTrackTimeoutRef.current);
    isChangingTrackTimeoutRef.current = setTimeout(() => {
      isChangingTrackRef.current = false;
    }, 2500);

    if (playerCtx?.playPrevTrack) {
      playerCtx.playPrevTrack();
    }
    if (onPrevTrackRef.current) {
      onPrevTrackRef.current();
    }
  }, [playerCtx]);

  const handleEndedRef = useRef<() => void>(() => {});

  // Master handler for track end (works for both YouTube and HTML5 audio)
  const handleEnded = useCallback(() => {
    if (isChangingTrackRef.current) return;

    const curRepeat = repeatModeRef.current;
    if (curRepeat === "one") {
      // Repeat current track from start
      if (isPlayerReadyRef.current && playerRef.current) {
        try {
          playerRef.current.seekTo?.(0, true);
          playerRef.current.playVideo?.();
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

    // Advance to next song via PlayerContext shuffle/queue engine
    if (playerCtx?.playNextTrack) {
      playerCtx.playNextTrack();
    }
    handleNextTrack();
  }, [handleNextTrack, setPlayerState, playerCtx]);

  useEffect(() => {
    handleEndedRef.current = handleEnded;
  }, [handleEnded]);

  // Synchronized state and track references for background handlers and callbacks
  const currentTrackRef = useRef<Track | null>(playerState.currentTrack);
  useEffect(() => {
    currentTrackRef.current = playerState.currentTrack;
  }, [playerState.currentTrack]);

  const playerStateRef = useRef<PlayerState>(playerState);
  useEffect(() => {
    playerStateRef.current = playerState;
  }, [playerState]);

  const unplayableAutoSkipCountRef = useRef<number>(0);
  const isRecoveringFromErrorRef = useRef<boolean>(false);
  const [playerToast, setPlayerToast] = useState<string | null>(null);
  const playerToastTimerRef = useRef<any>(null);

  const showPlayerToast = useCallback((msg: string) => {
    setPlayerToast(msg);
    if (playerToastTimerRef.current) clearTimeout(playerToastTimerRef.current);
    playerToastTimerRef.current = setTimeout(() => {
      setPlayerToast(null);
    }, 3500);

    try {
      window.dispatchEvent(new CustomEvent("oblivion_toast", { detail: { message: msg } }));
    } catch {}
  }, []);

  // Dedicated YouTube IFrame onError listener for unplayable / restricted / deleted videos
  const handleYouTubePlayerError = useCallback((event: any) => {
    const rawCode = typeof event === "object" && event !== null && "data" in event ? event.data : event;
    const errorCode = Number(rawCode) || rawCode;
    console.warn(`[Player] YouTube iframe player reported error: code ${errorCode}`, event);

    // Error codes:
    // 100: The video requested was not found (removed, deleted, or private)
    // 101: The owner of the requested video does not allow it to be played in embedded players
    // 150: Same as 101 (embedding restricted/geo-blocked)
    // 2: Invalid parameter
    // 5: HTML5 player error
    const isUnplayable =
      errorCode === 100 ||
      errorCode === 101 ||
      errorCode === 150 ||
      String(errorCode) === "100" ||
      String(errorCode) === "101" ||
      String(errorCode) === "150" ||
      errorCode === 2 ||
      errorCode === 5;

    if (!isUnplayable) return;

    if (isRecoveringFromErrorRef.current) return;
    isRecoveringFromErrorRef.current = true;

    const badTrack = currentTrackRef.current;
    const badVid = cleanVideoId(badTrack?.youtubeVideoId || (badTrack as any)?.youtubeId || badTrack?.id);
    const badTrackId = badTrack?.id;
    const failedTrackId = badVid || badTrackId;

    // 1. Get current playlist state from local storage directly
    const storedPlaylistRaw = localStorage.getItem('oblivion_selected_playlist');
    let currentPlaylistId = "";
    if (storedPlaylistRaw) {
      try {
        const playlist = JSON.parse(storedPlaylistRaw);
        currentPlaylistId = playlist.id || playlist.playlistId || "";
        if (Array.isArray(playlist.tracks)) {
          // Filter out the dead track ID
          const updatedTracks = playlist.tracks.filter((t: any) => t.youtubeId !== failedTrackId && t.id !== failedTrackId && t.youtubeVideoId !== failedTrackId);
          playlist.tracks = updatedTracks;
          playlist.trackCount = updatedTracks.length;
          playlist.tracksCount = updatedTracks.length;
          playlist.itemCount = updatedTracks.length;
          
          // 2. FORCE IMMEDIATE WRITE BACK TO LOCAL STORAGE
          localStorage.setItem('oblivion_selected_playlist', JSON.stringify(playlist));
        }
        
        // Also clear specific track cache keys if used
        if (failedTrackId) {
          localStorage.removeItem(`OBLIVION_TRACKS_CACHE_${failedTrackId}`);
        }
      } catch (e) {
        console.error('Failed to purge dead track from storage', e);
      }
    }

    // REUSE THE EXACT WORKING MANUAL REMOVE BUTTON HANDLER:
    // Directly call the exact same onRemoveTrack(failedTrack.id) callback passed from the playlist context/props
    if (typeof onRemoveTrackRef.current === "function") {
      try {
        onRemoveTrackRef.current(failedTrackId, badTrack);
      } catch (err) {
        console.warn("[Player] onRemoveTrack execution warning:", err);
      }
    }

    // SINGLE SOURCE OF TRUTH HARD PURGE:
    // Synchronously purge the dead track across ALL storage keys, collections, caches, and queues
    purgeTrackGlobally(currentPlaylistId, failedTrackId || "");

    // 3. Show brief toast notification: "Track unavailable on YouTube, skipping..."
    showPlayerToast("Track unavailable on YouTube, skipping...");

    // FIX INDEX POINTER MATH ON TRACK REMOVAL:
    // Remove track N from active queue, keep queueIndex locked at N (track N+1 shifts into position N),
    // and immediately invoke playVideo() on the item now residing at index N without calling nextTrack().
    setPlayerState((prev) => {
      const queue = prev.queue || [];
      const currentIdx = Math.min(prev.queueIndex, Math.max(0, queue.length - 1));

      const filteredQueue = queue.filter((t) => {
        const tVid = cleanVideoId(t.youtubeVideoId || (t as any).youtubeId || t.id);
        const matches =
          (badVid && tVid === badVid) ||
          (badTrackId && (t.id === badTrackId || (t as any).playlistItemId === badTrackId));
        return !matches;
      });

      if (filteredQueue.length === 0) {
        isRecoveringFromErrorRef.current = false;
        return {
          ...prev,
          queue: [],
          isPlaying: false,
        };
      }

      // Keep queueIndex locked at N (or clamped to valid length if N was the last track)
      const newIdx = Math.min(currentIdx, filteredQueue.length - 1);
      const shiftedTrack = filteredQueue[newIdx];

      const shiftedVid = cleanVideoId(shiftedTrack?.youtubeVideoId || (shiftedTrack as any)?.youtubeId || shiftedTrack?.id);
      if (shiftedVid && playerRef.current && isPlayerReadyRef.current) {
        try {
          if (typeof playerRef.current.loadVideoById === "function") {
            playerRef.current.loadVideoById({ videoId: shiftedVid, startSeconds: 0 });
          }
          playerRef.current.playVideo?.();
        } catch (e) {
          console.warn("[Player] Error playing shifted track at index N:", e);
        }
      }

      isRecoveringFromErrorRef.current = false;
      return {
        ...prev,
        queue: filteredQueue,
        queueIndex: newIdx,
        currentTrack: shiftedTrack,
        currentTime: 0,
        isPlaying: true,
      };
    });
  }, [showPlayerToast, setPlayerState]);

  const handleYouTubePlayerErrorRef = useRef(handleYouTubePlayerError);
  useEffect(() => {
    handleYouTubePlayerErrorRef.current = handleYouTubePlayerError;
  }, [handleYouTubePlayerError]);

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

  // Section 2: Enforce unmuted state & max volume on YouTube player to prevent background auto-mute
  const enforceUnmutedState = useCallback(() => {
    const player = playerRef.current;
    if (player && isPlayerReadyRef.current) {
      try {
        if (typeof player.isMuted === "function" && player.isMuted()) {
          player.unMute();
        }
        if (typeof player.setVolume === "function") {
          player.setVolume(100);
        }
      } catch (err) {
        console.warn("[Player] enforceUnmutedState error:", err);
      }
    }
  }, []);

  // Section 1: Automatic Audio Focus Recovery & Ducking (Fix WhatsApp / Message Pause)
  const handleFocusReturn = useCallback(() => {
    if (interruptedWhilePlayingRef.current && playerRef.current) {
      try {
        startSilentAnchor();
        playerRef.current.playVideo?.();
        playerRef.current.unMute?.();
        playerRef.current.setVolume?.(100);
      } catch {}
      interruptedWhilePlayingRef.current = false;
      setPlayerState((prev) => ({ ...prev, isPlaying: true }));
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "playing";
      }
    }
  }, [setPlayerState, startSilentAnchor]);

  // Custom seek forward/back: execute seek directly on active engine (Audio or Video)
  const handleSeekInternal = useCallback((time: number) => {
    if (isNaN(time) || time < 0) return;
    const maxDur = (durationRef.current && durationRef.current > 0) ? durationRef.current : (currentTrack?.duration || 1000);
    const targetTime = Math.max(0, Math.min(time, maxDur));

    setPlayerState((prev) => ({ ...prev, currentTime: targetTime }));

    if (isPlayerReadyRef.current && playerRef.current) {
      try {
        playerRef.current.seekTo?.(targetTime, true);
        if (isPlayingRef.current) {
          playerRef.current.playVideo?.();
        }
      } catch (err) {
        console.warn("[Player] Seek error:", err);
      }
    }

    onSeek(targetTime);
  }, [currentTrack?.duration, onSeek, setPlayerState]);

  // SINGLE UNIFIED ENGINE: Initialize & Track Sync for Single YouTube IFrame Player
  useEffect(() => {
    if (!currentTrack) return;

    const finalVid = extractCleanYoutubeId(currentTrack) || (currentTrack as any)?.videoId || (currentTrack as any)?.youtubeId || (currentTrack.id && currentTrack.id.length === 11 ? currentTrack.id : "");
    if (!finalVid) return;

    // GUARD: If this video is ALREADY loaded into the persistent player, DO NOT reload, pause, or reset currentTime!
    if (activeVideoIdRef.current === finalVid && playerRef.current) {
      return;
    }

    activeVideoIdRef.current = finalVid;
    userManualPauseRef.current = false;
    stuckWatchdogRef.current = { videoId: finalVid, lastTime: 0, lastProgressAt: Date.now(), attempts: 0 };
    setPlayerState((prev) => (prev.currentTime === 0 ? prev : { ...prev, currentTime: 0 }));

    const executePlay = (targetVid: string) => {
      if (!isPlayerReadyRef.current || !playerRef.current) return;
      try {
        if (typeof playerRef.current.unMute === "function" && !isMuted) {
          playerRef.current.unMute();
        }
        if (typeof playerRef.current.setVolume === "function") {
          playerRef.current.setVolume(volume * 100);
        }

        // ZERO-FAIL INSTANT PLAYBACK ENGINE:
        // Call loadVideoById immediately followed by playVideo() in the same execution
        // to bypass mobile browser autoplay suspension and eliminate intermittent paused state
        if (typeof playerRef.current.loadVideoById === "function") {
          playerRef.current.loadVideoById({
            videoId: targetVid,
            startSeconds: 0,
          });
        } else if (typeof playerRef.current.cueVideoById === "function") {
          playerRef.current.cueVideoById({
            videoId: targetVid,
            startSeconds: 0,
          });
        }

        if (!userManualPauseRef.current) {
          try {
            playerRef.current.playVideo?.();
          } catch {}
        }
      } catch (e) {
        console.warn("[Player] Single engine executePlay error:", e);
      }
    };

    const initYT = (vid: string) => {
      try {
        const container = document.getElementById("oblivion-unified-yt-player");
        if (!container) return;

        playerRef.current = new window.YT.Player("oblivion-unified-yt-player", {
          height: "100%",
          width: "100%",
          videoId: vid,
          playerVars: {
            autoplay: !userManualPauseRef.current ? 1 : 0,
            controls: 1,
            disablekb: 0,
            fs: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            origin: window.location.origin,
            enablejsapi: 1,
          },
          events: {
            onReady: (event: any) => {
              isPlayerReadyRef.current = true;
              try {
                if (typeof event.target.unMute === "function" && !isMuted) {
                  event.target.unMute();
                }
                if (typeof event.target.setVolume === "function") {
                  event.target.setVolume(volume * 100);
                }
              } catch {}
              if (!userManualPauseRef.current) {
                try {
                  event.target.playVideo();
                } catch {}
              } else {
                try {
                  event.target.pauseVideo();
                } catch {}
              }
            },
            onStateChange: (event: any) => {
              if (event.data === 1) { // PLAYING
                if (userManualPauseRef.current && Date.now() < pauseGuardUntilRef.current) {
                  // Late PLAYING echo right after the user pressed Pause: keep it paused instead of resuming.
                  try {
                    event.target.pauseVideo();
                  } catch {}
                  return;
                }
                isChangingTrackRef.current = false;
                userManualPauseRef.current = false;
                interruptedWhilePlayingRef.current = false;
                unplayableAutoSkipCountRef.current = 0;
                isRecoveringFromErrorRef.current = false;
                startSilentAnchor();
                try {
                  if (typeof event.target.unMute === "function" && !isMuted) {
                    event.target.unMute();
                  }
                  if (typeof event.target.setVolume === "function") {
                    event.target.setVolume(volume * 100);
                  }
                } catch {}
                const dur = event.target.getDuration?.() || 0;
                const curTime = event.target.getCurrentTime?.() || 0;
                setPlayerState((prev) => ({
                  ...prev,
                  isPlaying: true,
                  currentTime: curTime >= 0 ? curTime : prev.currentTime,
                  duration: dur > 0 ? dur : prev.duration,
                }));
                if ("mediaSession" in navigator) {
                  navigator.mediaSession.playbackState = "playing";
                }
                updatePositionState(curTime, dur);
              } else if (event.data === 2) { // PAUSED
                if (isChangingTrackRef.current) return;
                stopSilentAnchor();
                setPlayerState((prev) => (!prev.isPlaying ? prev : { ...prev, isPlaying: false }));
                if ("mediaSession" in navigator) {
                  navigator.mediaSession.playbackState = "paused";
                }
              } else if (
                event.data === 5 ||
                event.data === -1 ||
                event.data === (window.YT?.PlayerState?.CUED ?? 5) ||
                event.data === (window.YT?.PlayerState?.UNSTARTED ?? -1)
              ) { // CUED (State 5) or UNSTARTED (State -1)
                // When player transitions to CUED or UNSTARTED while isPlaying is active,
                // IMMEDIATELY execute playVideo() to eliminate intermittent paused state
                if (
                  !(userManualPauseRef.current && Date.now() < pauseGuardUntilRef.current) &&
                  (isPlayingRef.current || !userManualPauseRef.current)
                ) {
                  try {
                    event.target.playVideo();
                  } catch {
                    playerRef.current?.playVideo?.();
                  }
                }
              } else if (event.data === 0) { // ENDED
                stopSilentAnchor();
                if (!isChangingTrackRef.current) {
                  handleEndedRef.current?.();
                }
              }
            },
            onError: (err: any) => {
              handleYouTubePlayerErrorRef.current?.(err);
            },
          },
        });
      } catch (e) {
        console.warn("[Player] Single engine init error:", e);
      }
    };

    initYTRef.current = initYT;

    if (!window.YT || !window.YT.Player) {
      window.onYouTubeIframeAPIReady = () => {
        initYT(finalVid);
      };
      return;
    }

    if (!playerRef.current) {
      initYT(finalVid);
    } else {
      executePlay(finalVid);
    }
  }, [currentTrack?.id, currentTrack?.youtubeVideoId, (currentTrack as any)?.youtubeId]);

  // Play/Pause Synchronization on Single Engine
  useEffect(() => {
    if (isPlayerReadyRef.current && playerRef.current) {
      try {
        if (isPlaying) {
          pauseGuardUntilRef.current = 0;
          startSilentAnchor();
          if (!isMuted) {
            playerRef.current.unMute?.();
            playerRef.current.setVolume?.(volume * 100);
          } else {
            playerRef.current.mute?.();
          }
          playerRef.current.playVideo?.();
        } else if (!isChangingTrackRef.current) {
          stopSilentAnchor();
          playerRef.current.pauseVideo?.();
        }
      } catch {}
    } else {
      if (isPlaying) {
        startSilentAnchor();
      } else {
        stopSilentAnchor();
      }
    }
  }, [isPlaying, isMuted, volume, startSilentAnchor, stopSilentAnchor]);

  // Volume Synchronization on Single Engine
  useEffect(() => {
    if (isPlayerReadyRef.current && playerRef.current) {
      try {
        if (isMuted) {
          playerRef.current.mute?.();
        } else {
          playerRef.current.unMute?.();
          playerRef.current.setVolume?.(volume * 100);
        }
      } catch {}
    }
  }, [volume, isMuted]);

  // ZERO-FAIL INSTANT PLAYBACK ENGINE:
  // Register synchronous instant playback hook on window to bypass mobile autoplay restrictions
  useEffect(() => {
    (window as any).__OBLIVION_YT_PLAYER = playerRef.current;
    (window as any).__OBLIVION_PLAY_IMMEDIATE = (videoId: string) => {
      const cleanVid = cleanVideoId(videoId);
      if (!cleanVid) return;
      activeVideoIdRef.current = cleanVid;
      userManualPauseRef.current = false;
      isPlayingRef.current = true;
      stuckWatchdogRef.current = { videoId: cleanVid, lastTime: 0, lastProgressAt: Date.now(), attempts: 0 };
      if (playerRef.current && isPlayerReadyRef.current) {
        try {
          if (typeof playerRef.current.unMute === "function" && !isMuted) {
            playerRef.current.unMute();
          }
          if (typeof playerRef.current.setVolume === "function") {
            playerRef.current.setVolume(volume * 100);
          }
          if (typeof playerRef.current.loadVideoById === "function") {
            playerRef.current.loadVideoById({ videoId: cleanVid, startSeconds: 0 });
          }
          playerRef.current.playVideo?.();
        } catch (err) {
          console.warn("[Player] __OBLIVION_PLAY_IMMEDIATE error:", err);
        }
      }
    };
    return () => {
      delete (window as any).__OBLIVION_PLAY_IMMEDIATE;
    };
  }, [isMuted, volume]);

  // 1. SINGLE GLOBAL PLAYHEAD SYNC EFFECT: Continuous 100ms Polling Loop
  useEffect(() => {
    const pollRate = 100;
    const interval = setInterval(() => {
      if (isScrubbingRef.current) return;
      const player = playerRef.current;
      if (!player || !isPlayerReadyRef.current) return;

      try {
        const state = typeof player.getPlayerState === "function" ? player.getPlayerState() : -1;
        if (userManualPauseRef.current && Date.now() < pauseGuardUntilRef.current) {
          // User just pressed Pause: don't let a stale PLAYING/BUFFERING reading flip the UI back (pause stutter).
          if (state === 1 || state === 3) {
            try {
              player.pauseVideo?.();
            } catch {}
          }
          return;
        }
        if (state === 1 || state === 3 || isPlayingRef.current) {
          if (state === 1) {
            interruptedWhilePlayingRef.current = false;
            if (typeof player.isMuted === "function" && player.isMuted() && !isMuted) {
              player.unMute();
            }
          }

          const curTime = player.getCurrentTime?.();
          const ytDur = player.getDuration?.();
          const validDur = (ytDur && ytDur > 0) ? ytDur : (currentTrack?.duration || 0);

          if (typeof curTime === "number" && !isNaN(curTime) && curTime >= 0) {
            setPlayerState((prev) => {
              if (
                Math.abs(prev.currentTime - curTime) < 0.05 &&
                (validDur > 0 ? Math.abs((prev.duration || 0) - validDur) < 0.5 : true) &&
                prev.isPlaying === (state === 1 || isPlayingRef.current)
              ) {
                return prev;
              }
              return {
                ...prev,
                isPlaying: state === 1 ? true : prev.isPlaying,
                currentTime: curTime,
                duration: validDur > 0 ? validDur : prev.duration,
              };
            });

            if (Math.abs(curTime - lastMediaSessionPositionRef.current) >= 0.8) {
              lastMediaSessionPositionRef.current = curTime;
              updatePositionState(curTime, validDur);
            }
          }
        } else if (state === 2) { // PAUSED
          if (!isChangingTrackRef.current && isPlayingRef.current) {
            setPlayerState((prev) => (prev.isPlaying ? { ...prev, isPlaying: false } : prev));
            stopSilentAnchor();
            if ("mediaSession" in navigator) {
              navigator.mediaSession.playbackState = "paused";
            }
          }
        } else if (state === 0) { // ENDED
          if (!isChangingTrackRef.current) {
            handleEndedRef.current?.();
          }
        }
      } catch {}
    }, pollRate);

    return () => clearInterval(interval);
  }, [currentTrack?.id, currentTrack?.youtubeVideoId, currentTrack?.duration, updatePositionState, stopSilentAnchor, isMuted]);

  // STUCK-START WATCHDOG
  // If playback should be running but the playhead has not advanced for 3s (8s while the player reports
  // buffering), recover: first reload the video in place, then rebuild the YouTube iframe player from scratch
  // (clears a dead or deadlocked iframe, e.g. after very long sessions or background throttling).
  useEffect(() => {
    volumeRef.current = volume;
    isMutedRef.current = isMuted;
  }, [volume, isMuted]);

  useEffect(() => {
    const restoreAfterRebuild = (resumeAt: number) => {
      let tries = 0;
      const timer = setInterval(() => {
        tries += 1;
        const p = playerRef.current;
        if (p && isPlayerReadyRef.current) {
          clearInterval(timer);
          try {
            (window as any).__OBLIVION_YT_PLAYER = p;
            if (resumeAt > 3) p.seekTo?.(resumeAt, true);
            if (isMutedRef.current) {
              p.mute?.();
            } else {
              p.unMute?.();
              p.setVolume?.(volumeRef.current * 100);
            }
            if (isPlayingRef.current && !userManualPauseRef.current) p.playVideo?.();
          } catch {}
        } else if (tries > 40) {
          clearInterval(timer);
        }
      }, 250);
    };

    const tick = () => {
      const wd = stuckWatchdogRef.current;
      const now = Date.now();
      const player = playerRef.current;
      const shouldBePlaying = !!currentTrackRef.current && isPlayingRef.current && !userManualPauseRef.current;

      if (
        !player ||
        !wd.videoId ||
        !shouldBePlaying ||
        isScrubbingRef.current ||
        interruptedWhilePlayingRef.current ||
        isRecoveringFromErrorRef.current
      ) {
        wd.lastProgressAt = now;
        return;
      }

      let state = -1;
      let t = 0;
      try {
        state = typeof player.getPlayerState === "function" ? player.getPlayerState() : -1;
        t = typeof player.getCurrentTime === "function" ? Number(player.getCurrentTime()) : 0;
      } catch {}
      if (!isFinite(t)) t = 0;

      if (state === 0) {
        // Track ended: normal end-of-track handling takes over.
        wd.lastProgressAt = now;
        return;
      }
      if (Math.abs(t - wd.lastTime) > 0.2) {
        wd.lastTime = t;
        wd.lastProgressAt = now;
        wd.attempts = 0;
        return;
      }

      const limit = state === 3 ? 8000 : 3000;
      if (now - wd.lastProgressAt < limit) return;

      // Stalled. Restart the window so each recovery stage gets a fair chance.
      wd.lastProgressAt = now;
      const vid = activeVideoIdRef.current || wd.videoId;

      if (wd.attempts === 0 && typeof player.loadVideoById === "function") {
        wd.attempts = 1;
        console.warn("[Player] Watchdog: playback stalled, reloading video in place");
        try {
          player.loadVideoById({ videoId: vid, startSeconds: Math.floor(wd.lastTime) });
          player.playVideo?.();
        } catch {}
        return;
      }

      if (wd.attempts <= 1) {
        wd.attempts = 2;
        console.warn("[Player] Watchdog: still stalled, rebuilding the YouTube player");
        let host: Element | null = null;
        try {
          host = player.getIframe?.()?.parentElement ?? null;
        } catch {}
        const resumeAt = wd.lastTime;
        try {
          player.destroy?.();
        } catch {}
        playerRef.current = null;
        isPlayerReadyRef.current = false;
        if (!document.getElementById("oblivion-unified-yt-player")) {
          const mount = host || document.querySelector(".full-player-video-card");
          if (mount) {
            const div = document.createElement("div");
            div.id = "oblivion-unified-yt-player";
            div.className = "w-full h-full rounded-2xl overflow-hidden";
            mount.appendChild(div);
          }
        }
        initYTRef.current?.(vid);
        restoreAfterRebuild(resumeAt);
        return;
      }

      if (wd.attempts === 2) {
        wd.attempts = 3;
        console.warn("[Player] Watchdog: recovery attempts exhausted for this track");
      }
    };

    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, []);

  // UNIFIED PLAY/PAUSE CONTROLLERS
  const playMedia = useCallback(async () => {
    userManualPauseRef.current = false;
    pauseGuardUntilRef.current = 0;
    isPlayingRef.current = true;
    interruptedWhilePlayingRef.current = false;
    startSilentAnchor();

    if (isPlayerReadyRef.current && playerRef.current) {
      try {
        if (!isMuted && typeof playerRef.current.unMute === "function") {
          playerRef.current.unMute();
        }
        if (typeof playerRef.current.setVolume === "function") {
          playerRef.current.setVolume(volume * 100);
        }
        playerRef.current.playVideo?.();
      } catch (err) {
        console.warn("[Player] playMedia error:", err);
      }
    }

    setPlayerState((prev) => ({ ...prev, isPlaying: true }));
    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "playing";
    }
  }, [isMuted, setPlayerState, startSilentAnchor, volume]);

  const pauseMedia = useCallback(() => {
    userManualPauseRef.current = true;
    pauseGuardUntilRef.current = Date.now() + 700;
    isPlayingRef.current = false;
    stopSilentAnchor();

    if (playerRef.current && typeof playerRef.current.pauseVideo === "function") {
      try {
        playerRef.current.pauseVideo();
      } catch {}
    }

    setPlayerState((prev) => ({ ...prev, isPlaying: false }));
    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "paused";
    }
  }, [setPlayerState, stopSilentAnchor]);

  const handleUserTogglePlay = useCallback(
    (explicitPlay?: boolean) => {
      // Debounce rapid taps so overlapping play/pause commands never reach the player or the Media Session.
      const nowTs = Date.now();
      if (nowTs - lastToggleAtRef.current < 250) return;
      lastToggleAtRef.current = nowTs;
      const nextPlay = explicitPlay !== undefined ? explicitPlay : !isPlayingRef.current;
      if (nextPlay) {
        playMedia();
      } else {
        pauseMedia();
      }
    },
    [isPlaying, playMedia, pauseMedia]
  );

  // Section 1: PC & Mobile visibility and blur listeners to prevent browser background auto-mute & recover from interruptions
  useEffect(() => {
    const handleVisibility = () => {
      enforceUnmutedState();
      if (!document.hidden && interruptedWhilePlayingRef.current) {
        handleFocusReturn();
      } else if (isPlayingRef.current && !userManualPauseRef.current) {
        try {
          // Keep YouTube stream active & playing
          playerRef.current?.playVideo?.();
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
      window.addEventListener("focus", handleFocusReturn);
      return () => {
        document.removeEventListener("visibilitychange", handleVisibility);
        window.removeEventListener("pagehide", handleVisibility);
        window.removeEventListener("blur", handleVisibility);
        window.removeEventListener("focus", handleFocusReturn);
      };
    }
  }, [settings.backgroundPlay, isPlaying, enforceUnmutedState, handleFocusReturn]);

  // Helper function to resolve absolute URLs for Android OS lockscreen & notification shade artwork
  const formatArtworkUrl = (url?: string, track?: Track | null): string => {
    let target = url;
    if (!target && track) {
      const vid = (track as any).youtubeId || track.youtubeVideoId || track.id;
      if (vid && vid.length === 11) {
        target = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
      }
    }
    if (!target) return "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=512&q=85";
    if (target.startsWith("http://") || target.startsWith("https://")) return target;
    if (typeof window !== "undefined" && window.location?.origin) {
      return `${window.location.origin}${target.startsWith("/") ? "" : "/"}${target}`;
    }
    return target;
  };

  // Section 1: Register Media Session Action Handlers with STALE-PROOF references
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

    // PAUSE COMMAND (Directly routed through pauseMedia sanity guard)
    try {
      navigator.mediaSession.setActionHandler("pause", () => {
        try {
          pauseMedia();
        } catch (err) {
          console.error("MediaSession pause error:", err);
        }
      });
    } catch (err) {
      console.error("Failed to bind mediaSession pause handler:", err);
    }

    // PLAY COMMAND (Directly routed through playMedia sanity guard)
    try {
      navigator.mediaSession.setActionHandler("play", () => {
        try {
          playMedia();
        } catch (err) {
          console.error("MediaSession play error:", err);
        }
      });
    } catch (err) {
      console.error("Failed to bind mediaSession play handler:", err);
    }

    // PREVIOUS TRACK (EXPLICITLY BOUND TO RESTORE OS SHADE BUTTON)
    try {
      navigator.mediaSession.setActionHandler("previoustrack", () => {
        try {
          userManualPauseRef.current = false;
          interruptedWhilePlayingRef.current = false;
          handlePrevTrack();
        } catch (err) {
          console.error("MediaSession prev error:", err);
        }
      });
    } catch (err) {
      console.error("Failed to bind mediaSession previoustrack handler:", err);
    }

    // NEXT TRACK (EXPLICITLY BOUND TO RESTORE OS SHADE BUTTON)
    try {
      navigator.mediaSession.setActionHandler("nexttrack", () => {
        try {
          userManualPauseRef.current = false;
          interruptedWhilePlayingRef.current = false;
          handleNextTrack();
        } catch (err) {
          console.error("MediaSession next error:", err);
        }
      });
    } catch (err) {
      console.error("Failed to bind mediaSession nexttrack handler:", err);
    }

    // SEEKING
    try {
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        try {
          if (details.seekTime !== undefined && !isNaN(details.seekTime)) {
            if (playerRef.current && typeof playerRef.current.seekTo === "function") {
              playerRef.current.seekTo(details.seekTime, true);
            }
            if (audioRef.current) {
              audioRef.current.currentTime = details.seekTime;
            }
            handleSeekInternal(details.seekTime);
            updatePositionState(details.seekTime);
          }
        } catch (err) {
          console.error("MediaSession seek error:", err);
        }
      });
    } catch (err) {
      console.error("Failed to bind mediaSession seekto handler:", err);
    }

    // SEEK BACKWARD
    try {
      navigator.mediaSession.setActionHandler("seekbackward", (details) => {
        try {
          const offset = details.seekOffset || 10;
          const target = Math.max((currentTimeRef.current || 0) - offset, 0);
          handleSeekInternal(target);
          updatePositionState(target);
        } catch (err) {
          console.error("MediaSession seekbackward error:", err);
        }
      });
    } catch (err) {
      console.error("Failed to bind mediaSession seekbackward handler:", err);
    }

    // SEEK FORWARD
    try {
      navigator.mediaSession.setActionHandler("seekforward", (details) => {
        try {
          const offset = details.seekOffset || 10;
          const curDur = (durationRef.current && durationRef.current > 0) ? durationRef.current : (currentTrack?.duration || 1000);
          const target = Math.min((currentTimeRef.current || 0) + offset, curDur);
          handleSeekInternal(target);
          updatePositionState(target);
        } catch (err) {
          console.error("MediaSession seekforward error:", err);
        }
      });
    } catch (err) {
      console.error("Failed to bind mediaSession seekforward handler:", err);
    }

    // STOP
    try {
      navigator.mediaSession.setActionHandler("stop", () => {
        try {
          userManualPauseRef.current = true;
          interruptedWhilePlayingRef.current = false;
          stopSilentAnchor();
          if (playerRef.current && typeof playerRef.current.pauseVideo === "function") {
            playerRef.current.pauseVideo();
          }
          if (audioRef.current) {
            audioRef.current.pause();
          }
          setPlayerState((prev) => ({ ...prev, isPlaying: false }));
          navigator.mediaSession.playbackState = "none";
        } catch (err) {
          console.error("MediaSession stop error:", err);
        }
      });
    } catch (err) {
      console.error("Failed to bind mediaSession stop handler:", err);
    }
  }, [handleSeekInternal, updatePositionState, setPlayerState, startSilentAnchor, stopSilentAnchor]);

  // Section 2: Synchronize Absolute URL MediaMetadata for rich cover art & OS vignette colors
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

    if (currentTrack) {
      const rawCover = (currentTrack as any).coverArtUrl || currentTrack.coverUrl || currentTrack.thumbnail;
      const hdCover = getHdCoverUrl(rawCover) || rawCover;
      const highResArt = formatArtworkUrl(hdCover, currentTrack);

      const title = cleanTrackTitle(currentTrack.title, currentTrack.artist) || currentTrack.title || "Oblivion Track";
      const artist = `${currentTrack.artist || "Oblivion"} • Oblivion`;
      const album = currentTrack.album ? `${currentTrack.album} • Oblivion` : "Oblivion Music";

      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist,
        album,
        artwork: [
          { src: highResArt, sizes: "96x96", type: "image/jpeg" },
          { src: highResArt, sizes: "128x128", type: "image/jpeg" },
          { src: highResArt, sizes: "192x192", type: "image/jpeg" },
          { src: highResArt, sizes: "256x256", type: "image/jpeg" },
          { src: highResArt, sizes: "384x384", type: "image/jpeg" },
          { src: highResArt, sizes: "512x512", type: "image/jpeg" },
        ],
      });
    }
  }, [
    currentTrack?.id,
    currentTrack?.title,
    currentTrack?.artist,
    currentTrack?.coverUrl,
    currentTrack?.album,
    (currentTrack as any)?.coverArtUrl,
    currentTrack?.thumbnail,
    (currentTrack as any)?.youtubeId,
    currentTrack?.youtubeVideoId,
  ]);

  // Section 3: Synchronize Playback State Dynamically
  useEffect(() => {
    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    }
  }, [isPlaying]);

  // Section 4: Continuously sync playback position for Android OS notification shade scrubber
  useEffect(() => {
    updatePositionState(currentTime, duration);
  }, [currentTime, duration, updatePositionState]);

  // Time update event handler for HTML5 audio
  const handleTimeUpdate = () => {
    // If in Video mode, progress is governed by the video player engine
    if (playerState.mediaMode === "video") return;
    // Suspend real-time audio position updates to UI when user is actively scrubbing
    if (isScrubbingRef.current) return;
    if (!audioRef.current) return;

    // If YouTube is active audio source, ignore HTML5 audio time updates
    if (activeAudioSourceRef.current === "youtube") return;

    // If currently scrubbing or seeking, do not let old timeupdates override UI position
    if (isAudioSeekingRef.current) {
      return;
    }

    const src = audioRef.current.src || "";
    // NEVER overwrite currentTime/duration if audio element is playing the silent keepalive WAV or data URL!
    if (!src || src.startsWith("data:audio/wav") || src.startsWith("blob:") || (cachedSilentUrl && src === cachedSilentUrl)) {
      return;
    }
    const audCur = audioRef.current.currentTime;
    const audDur = audioRef.current.duration;

    // Ignore stale updates during seek cooldown window
    if (lastSeekTimeRef.current !== null) {
      if (Math.abs(audCur - lastSeekTimeRef.current) > 2) {
        if (Date.now() - lastSeekTimestampRef.current < 2500) {
          return; // Ignore stale pre-seek timeupdate while audio element buffers target position
        }
      } else {
        // Seek target has successfully landed
        lastSeekTimeRef.current = null;
      }
    }

    if (typeof audCur === "number" && !isNaN(audCur) && audCur >= 0) {
      setPlayerState((prev) => ({
        ...prev,
        currentTime: audCur,
        duration: (audDur && audDur > 0) ? audDur : (currentTrack?.duration || prev.duration),
      }));

      // Update position state for Android OS notification shade scrubber
      if ("mediaSession" in navigator && "setPositionState" in navigator.mediaSession) {
        const validDuration = (audDur && audDur > 0) ? audDur : (currentTrack?.duration || duration || 0);
        if (validDuration > 0 && !isNaN(validDuration)) {
          try {
            navigator.mediaSession.setPositionState({
              duration: Math.max(validDuration, 1),
              playbackRate: audioRef.current?.playbackRate || 1,
              position: Math.min(Math.max(audCur, 0), validDuration),
            });
          } catch {}
        }
      }
    }
  };

  // Handle track end for HTML5 native audio element
  const handleAudioEnded = () => {
    // Ignore ended event from the silent keepalive loop
    const src = audioRef.current?.src || "";
    if (src.startsWith("data:audio/wav") || src.startsWith("blob:") || (cachedSilentUrl && src === cachedSilentUrl)) {
      return;
    }
    // Ignore accidental ended event right after a seek
    if (lastSeekTimeRef.current !== null && Date.now() - lastSeekTimestampRef.current < 2000) {
      return;
    }
    // Strict duration check: ensure playback reached within 0.5s of the actual duration before triggering onEnded
    const cur = audioRef.current?.currentTime || 0;
    const dur = (audioRef.current?.duration && !isNaN(audioRef.current.duration) && audioRef.current.duration > 0)
      ? audioRef.current.duration
      : (duration || currentTrack?.duration || 0);

    if (dur > 2 && cur < dur - 0.5) {
      return;
    }

    handleEndedRef.current?.();
  };

  // Cycle Repeat Mode
  const handleToggleShuffleClick = () => {
    if (onToggleShuffle) {
      onToggleShuffle();
      return;
    }
    setPlayerState((prev) => ({ ...prev, isShuffle: !prev.isShuffle }));
  };

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

  return (
    <>


      {/* Hidden Silent HTML5 Audio Anchor for Android Chrome MediaSession Lock */}
      <audio
        ref={audioRef}
        src={getSilentAudioUrl()}
        loop
        playsInline
        preload="auto"
        className="hidden"
        style={{ display: "none" }}
        onPlay={() => {
          if ("mediaSession" in navigator) {
            navigator.mediaSession.playbackState = "playing";
          }
        }}
        onPause={() => {
          if ("mediaSession" in navigator && userManualPauseRef.current) {
            navigator.mediaSession.playbackState = "paused";
          }
        }}
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
      {/* Full Player View - Permanently mounted in DOM without display:none so YouTube iframe context remains active */}
      <div
        ref={fullPlayerContainerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => {
          setTouchStartY(null);
          setTouchStartX(null);
          setDragOffsetY(0);
          setIsDraggingDown(false);
        }}
        id="player-fullscreen-dock"
        data-theme={designConfig.id}
        className={`full-player-overlay full-player-container fixed inset-0 overscroll-none w-full h-[100dvh] max-h-[100dvh] ${fpTheme.bgCanvas} flex flex-col justify-between overflow-hidden select-none animate-fade-in ${isHardRock ? 'theme-hard-rock' : ''}`}
        style={{
          zIndex: isFullscreen ? 100 : -1,
          opacity: isFullscreen ? (dragOffsetY > 0 ? Math.max(0.65, 1 - dragOffsetY / 500) : 1) : 0,
          pointerEvents: isFullscreen ? "auto" : "none",
          transform: !isFullscreen
            ? "translate3d(0, 110%, 0)"
            : dragOffsetY > 0
            ? `translate3d(0, ${dragOffsetY}px, 0)`
            : "none",
          transition: isDraggingDown
            ? "none"
            : "transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.25s ease",
          ...(isBespoke
            ? {
                background: `radial-gradient(circle at 10% 10%, ${bespokeColors[0]} 0%, ${bespokeColors[2]} 40%, #050508 80%)`,
              }
            : isHardRock
            ? {
                background: "var(--bg-main, linear-gradient(145deg, #120e0b 0%, #1a1410 40%, #0d0a08 100%))",
                color: "var(--text-primary, #FFFFFF)",
              }
            : {}),
        }}
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
                <div
                  className={`absolute inset-0 ${fpTheme.driftAuraGlow} blur-[90px] pointer-events-none`}
                  style={isBespoke ? { background: `radial-gradient(circle at 50% 50%, ${hexToRgba(bespokeColors[1], 0.25)}, transparent 70%)` } : undefined}
                />
                {/* Ambient Drifting Theme Orbs */}
                <div
                  className={`absolute -top-24 left-10 w-[550px] h-[550px] rounded-full ${fpTheme.orb1} blur-[120px] animate-ambient-orb`}
                  style={isBespoke ? { backgroundColor: hexToRgba(bespokeColors[1], 0.55) } : undefined}
                />
                <div
                  className={`absolute -bottom-24 right-10 w-[500px] h-[500px] rounded-full ${fpTheme.orb2} blur-[130px] animate-ambient-orb`}
                  style={isBespoke ? { backgroundColor: hexToRgba(bespokeColors[3], 0.45) } : undefined}
                />
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
                  style={{
                    animationDuration: `${(settings.animationAuroraSpeed || 6) * 1.2}s`,
                    ...(isBespoke ? { background: `linear-gradient(90deg, ${hexToRgba(bespokeColors[1], 0.5)}, ${hexToRgba(bespokeColors[2], 0.45)}, ${hexToRgba(bespokeColors[3], 0.5)})` } : {}),
                  }}
                />
                <div
                  className={`absolute -bottom-16 right-1/4 w-[550px] h-[480px] rounded-full ${fpTheme.auroraBeam2} blur-[110px] animate-aurora-surge`}
                  style={{
                    animationDuration: `${(settings.animationAuroraSpeed || 6) * 1.2}s`,
                    ...(isBespoke ? { background: `linear-gradient(90deg, ${hexToRgba(bespokeColors[3], 0.45)}, ${hexToRgba(bespokeColors[2], 0.5)}, ${hexToRgba(bespokeColors[1], 0.5)})` } : {}),
                  }}
                />
                <div
                  className={`absolute top-1/4 left-1/4 w-[520px] h-[520px] rounded-full ${fpTheme.orb1} blur-[120px] animate-aurora-pulse`}
                  style={{
                    animationDuration: `${settings.animationAuroraSpeed || 6}s`,
                    ...(isBespoke ? { backgroundColor: hexToRgba(bespokeColors[1], 0.5) } : {}),
                  }}
                />
                <div
                  className={`absolute bottom-1/4 right-1/4 w-[480px] h-[480px] rounded-full ${fpTheme.orb2} blur-[130px] animate-aurora-pulse`}
                  style={{
                    animationDuration: `${settings.animationAuroraSpeed || 6}s`,
                    ...(isBespoke ? { backgroundColor: hexToRgba(bespokeColors[3], 0.45) } : {}),
                  }}
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
                  <div
                    className={`absolute -top-24 left-16 w-[520px] h-[520px] rounded-full ${fpTheme.orbitalGlow1} blur-[105px] opacity-85`}
                    style={isBespoke ? { background: `linear-gradient(135deg, ${hexToRgba(bespokeColors[1], 0.6)}, ${hexToRgba(bespokeColors[2], 0.5)}, ${hexToRgba(bespokeColors[3], 0.6)})` } : undefined}
                  />
                  <div
                    className={`absolute -bottom-24 right-16 w-[500px] h-[500px] rounded-full ${fpTheme.orbitalGlow2} blur-[115px] opacity-85`}
                    style={isBespoke ? { background: `linear-gradient(135deg, ${hexToRgba(bespokeColors[3], 0.5)}, ${hexToRgba(bespokeColors[0], 0.55)}, ${hexToRgba(bespokeColors[1], 0.6)})` } : undefined}
                  />
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
                <div
                  className={`absolute -top-20 left-10 w-[400px] h-[400px] rounded-full ${fpTheme.orb1} blur-[140px] opacity-40`}
                  style={isBespoke ? { backgroundColor: hexToRgba(bespokeColors[1], 0.4) } : undefined}
                />
                <div
                  className={`absolute -bottom-20 right-10 w-[380px] h-[380px] rounded-full ${fpTheme.orb2} blur-[140px] opacity-40`}
                  style={isBespoke ? { backgroundColor: hexToRgba(bespokeColors[3], 0.4) } : undefined}
                />
              </div>
            )}

            {/* Bespoke Dynamic Nebula Aurora Layer */}
            {isBespoke && (
              <div
                className="absolute inset-0 opacity-40 animate-bespoke-aurora pointer-events-none"
                style={{
                  background: `linear-gradient(135deg, ${hexToRgba(bespokeColors[0], 0.5)} 0%, ${hexToRgba(bespokeColors[1], 0.45)} 35%, ${hexToRgba(bespokeColors[2], 0.4)} 70%, ${hexToRgba(bespokeColors[3], 0.4)} 100%)`,
                }}
              />
            )}

            {/* Layer 3: High-Legibility Contrast Readability Veil */}
            <div className={`absolute inset-0 ${fpTheme.veil}`} />
          </div>

          {/* Top Bar Navigation with Swipe Handle */}
          <div
            className={`full-player-header relative z-20 shrink-0 flex flex-col px-3.5 pt-2 pb-2.5 sm:px-6 sm:py-3.5 backdrop-blur-2xl ${isHardRock ? "" : `border-b ${fpTheme.topBar}`}`}
            style={isBespoke ? {
              background: `linear-gradient(180deg, ${hexToRgba(bespokeColors[0], 0.4)} 0%, rgba(10, 10, 16, 0.75) 100%)`,
              borderBottomColor: hexToRgba(bespokeColors[2], 0.3),
            } : isHardRock ? {
              backgroundColor: "rgba(22, 18, 26, 0.85)",
              borderBottom: "none",
              boxShadow: "0 12px 28px -4px rgba(168, 85, 247, 0.4)",
            } : undefined}
          >
            {/* Gesture Pull-Down Pill Indicator (Mobile / Touch Friendly) */}
            <div className="flex justify-center pb-1 -mt-0.5 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/40 active:bg-white/70" />
            </div>

            {/* Brand Header */}
            <div className="full-player-top-brand flex items-center justify-center gap-2 mb-1.5 sm:mb-2">
              <Logo size={24} designId={designConfig.id} className="w-6 h-6" withAura animated />
              <span
                className={`font-bold tracking-widest uppercase text-sm ${designConfig.textPrimary || "text-white"}`}
                style={isHardRock ? { color: "#e8d5b5", letterSpacing: "0.22em", textShadow: "0 0 16px rgba(168, 85, 247, 0.45)" } : undefined}
              >
                OBLIVION
              </span>
            </div>

            {isHardRock ? (
              /* Hard Rock Top Tab Bar matching reference image EXACTLY */
              <div className="flex items-center justify-between w-full max-w-xl mx-auto px-1 sm:px-2">
                {/* Chevron Minimize: Clean transparent button without bounding box */}
                <button
                  onClick={handleMinimizeFullPlayer}
                  className="transition-all hover:scale-105 active:scale-95 flex items-center justify-center shrink-0 cursor-pointer p-2"
                  style={{
                    backgroundColor: "transparent",
                    border: "none",
                    boxShadow: "none",
                    outline: "none",
                  }}
                  title="Minimize Full Player (or swipe down)"
                >
                  <ChevronDown
                    size={24}
                    style={{ color: "#e8d5b5", stroke: "#e8d5b5", opacity: 1 }}
                  />
                </button>

                {/* 4 Tabs Capsule: Audio, Video, Lyrics, Radio */}
                <div
                  className="flex items-center backdrop-blur-xl"
                  style={{
                    backgroundColor: "rgba(26, 20, 32, 0.9)",
                    border: "1px solid rgba(232, 213, 181, 0.2)",
                    borderRadius: "9999px",
                    padding: "4px 5px",
                    gap: "3px",
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5), 0 0 15px rgba(168, 85, 247, 0.2)",
                  }}
                >
                  {/* Audio Tab */}
                  <button
                    id="player-toggle-audio-mode"
                    onClick={(e) => handleTabSwitch("audio", e)}
                    className={`transition-all flex items-center gap-1.5 text-xs select-none cursor-pointer ${
                      activeTab === "audio" ? "hard-rock-active-tab active" : "hard-rock-inactive-tab"
                    }`}
                    style={
                      activeTab === "audio"
                        ? {
                            background: "linear-gradient(135deg, #E024B3 0%, #800F5E 50%, #2A0520 100%)",
                            border: "1px solid rgba(255, 105, 180, 0.4)",
                            color: "#FFFFFF",
                            fontWeight: 600,
                            borderRadius: "9999px",
                            padding: "6px 14px",
                            boxShadow: "0 0 8px rgba(224, 36, 179, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.2)",
                            opacity: 1,
                          }
                        : {
                            background: "rgba(255, 255, 255, 0.08)",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            color: "#E5E7EB",
                            opacity: 1,
                            borderRadius: "9999px",
                            padding: "6px 12px",
                          }
                    }
                    title="Switch to Audio Mode"
                  >
                    <Music2
                      size={15}
                      style={
                        activeTab === "audio"
                          ? {
                              color: "#FFFFFF",
                              stroke: "#FFFFFF",
                              fill: "none",
                              opacity: 1,
                            }
                          : {
                              color: "#E5E7EB",
                              fill: "none",
                              stroke: "#E5E7EB",
                              opacity: 1,
                            }
                      }
                    />
                    <span
                      style={
                        activeTab === "audio"
                          ? {
                              color: "#FFFFFF",
                              fontWeight: 600,
                              opacity: 1,
                            }
                          : {
                              color: "#E5E7EB",
                              opacity: 1,
                              fontWeight: 500,
                            }
                      }
                    >
                      Audio
                    </span>
                  </button>

                  {/* Video Tab */}
                  <button
                    id="player-toggle-video-mode"
                    onClick={(e) => handleTabSwitch("video", e)}
                    className={`transition-all flex items-center gap-1.5 text-xs select-none cursor-pointer ${
                      activeTab === "video" ? "hard-rock-active-tab active" : "hard-rock-inactive-tab"
                    }`}
                    style={
                      activeTab === "video"
                        ? {
                            background: "linear-gradient(135deg, #E024B3 0%, #800F5E 50%, #2A0520 100%)",
                            border: "1px solid rgba(255, 105, 180, 0.4)",
                            color: "#FFFFFF",
                            fontWeight: 600,
                            borderRadius: "9999px",
                            padding: "6px 14px",
                            boxShadow: "0 0 8px rgba(224, 36, 179, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.2)",
                            opacity: 1,
                          }
                        : {
                            background: "rgba(255, 255, 255, 0.08)",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            color: "#E5E7EB",
                            opacity: 1,
                            borderRadius: "9999px",
                            padding: "6px 12px",
                          }
                    }
                    title="Switch to Video Mode"
                  >
                    <Video
                      size={15}
                      style={
                        activeTab === "video"
                          ? {
                              color: "#FFFFFF",
                              stroke: "#FFFFFF",
                              fill: "none",
                              opacity: 1,
                            }
                          : {
                              color: "#E5E7EB",
                              fill: "none",
                              stroke: "#E5E7EB",
                              opacity: 1,
                            }
                      }
                    />
                    <span
                      style={
                        activeTab === "video"
                          ? {
                              color: "#FFFFFF",
                              fontWeight: 600,
                              opacity: 1,
                            }
                          : {
                              color: "#E5E7EB",
                              opacity: 1,
                              fontWeight: 500,
                            }
                      }
                    >
                      Video
                    </span>
                  </button>

                  {/* Lyrics Tab */}
                  <button
                    id="player-toggle-lyrics-mode"
                    onClick={(e) => handleTabSwitch("lyrics", e)}
                    className={`transition-all flex items-center gap-1.5 text-xs select-none cursor-pointer ${
                      activeTab === "lyrics" ? "hard-rock-active-tab active" : "hard-rock-inactive-tab"
                    }`}
                    style={
                      activeTab === "lyrics"
                        ? {
                            background: "linear-gradient(135deg, #E024B3 0%, #800F5E 50%, #2A0520 100%)",
                            border: "1px solid rgba(255, 105, 180, 0.4)",
                            color: "#FFFFFF",
                            fontWeight: 600,
                            borderRadius: "9999px",
                            padding: "6px 14px",
                            boxShadow: "0 0 8px rgba(224, 36, 179, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.2)",
                            opacity: 1,
                          }
                        : {
                            background: "rgba(255, 255, 255, 0.08)",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            color: "#E5E7EB",
                            opacity: 1,
                            borderRadius: "9999px",
                            padding: "6px 12px",
                          }
                    }
                    title="Toggle Lyrics"
                  >
                    <Sparkles
                      size={15}
                      style={
                        activeTab === "lyrics"
                          ? {
                              color: "#FFFFFF",
                              stroke: "#FFFFFF",
                              fill: "none",
                              opacity: 1,
                            }
                          : {
                              color: "#E5E7EB",
                              fill: "none",
                              stroke: "#E5E7EB",
                              opacity: 1,
                            }
                      }
                    />
                    <span
                      style={
                        activeTab === "lyrics"
                          ? {
                              color: "#FFFFFF",
                              fontWeight: 600,
                              opacity: 1,
                            }
                          : {
                              color: "#E5E7EB",
                              opacity: 1,
                              fontWeight: 500,
                            }
                      }
                    >
                      Lyrics
                    </span>
                  </button>

                  {/* Radio Tab */}
                  <button
                    id="player-toggle-radio-mode"
                    onClick={(e) => handleTabSwitch("radio", e)}
                    className={`transition-all flex items-center gap-1.5 text-xs select-none cursor-pointer ${
                      activeTab === "radio" ? "hard-rock-active-tab active" : "hard-rock-inactive-tab"
                    }`}
                    style={
                      activeTab === "radio"
                        ? {
                            background: "linear-gradient(135deg, #E024B3 0%, #800F5E 50%, #2A0520 100%)",
                            border: "1px solid rgba(255, 105, 180, 0.4)",
                            color: "#FFFFFF",
                            fontWeight: 600,
                            borderRadius: "9999px",
                            padding: "6px 14px",
                            boxShadow: "0 0 8px rgba(224, 36, 179, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.2)",
                            opacity: 1,
                          }
                        : {
                            background: "rgba(255, 255, 255, 0.08)",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            color: "#E5E7EB",
                            opacity: 1,
                            borderRadius: "9999px",
                            padding: "6px 12px",
                          }
                    }
                    title="Toggle Radio"
                  >
                    <Radio
                      size={15}
                      style={
                        activeTab === "radio"
                          ? {
                              color: "#FFFFFF",
                              stroke: "#FFFFFF",
                              fill: "none",
                              opacity: 1,
                            }
                          : {
                              color: "#E5E7EB",
                              fill: "none",
                              stroke: "#E5E7EB",
                              opacity: 1,
                            }
                      }
                    />
                    <span
                      style={
                        activeTab === "radio"
                          ? {
                              color: "#FFFFFF",
                              fontWeight: "bold",
                              opacity: 1,
                            }
                          : {
                              color: "#E5E7EB",
                              opacity: 1,
                              fontWeight: 500,
                            }
                      }
                    >
                      Radio
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              /* Other Themes Default Top Row */
              <div className="flex items-center justify-between w-full">
                {/* Left: Minimize Button */}
                <button
                  onClick={handleMinimizeFullPlayer}
                  className={`p-2 sm:p-2.5 rounded-2xl border backdrop-blur-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 ${fpTheme.minimizeBtn}`}
                  style={isCandyland ? { color: "#8A2BE2" } : { color: "#e8d5b5" }}
                  title="Minimize Full Player (or swipe down)"
                >
                  <ChevronDown
                    className="w-5 h-5 sm:w-6 sm:h-6"
                    style={isCandyland ? { color: "#8A2BE2", stroke: "#8A2BE2", opacity: 1 } : { color: "#e8d5b5", stroke: "#e8d5b5", opacity: 1 }}
                    size={20}
                  />
                  <span
                    className="text-xs font-semibold hidden sm:inline"
                    style={isCandyland ? { color: "#8A2BE2", opacity: 1 } : { color: "#e8d5b5", opacity: 1 }}
                  >
                    Minimize
                  </span>
                </button>

                {/* Center: YouTube Music Audio / Video Switcher */}
                <div className="flex items-center p-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-lg">
                  <button
                    id="player-toggle-audio-mode"
                    onClick={(e) => handleTabSwitch("audio", e)}
                    className={`full-player-nav-btn px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activeTab === "audio"
                        ? (isBespoke ? "active shadow-md" : "active bg-white text-black shadow-md")
                        : "text-white/70 hover:text-white"
                    }`}
                    style={isBespoke && activeTab === "audio" ? {
                      background: `linear-gradient(135deg, ${bespokeColors[0]}, ${bespokeColors[1]})`,
                      color: calculateWcagText(bespokeColors[1]),
                    } : undefined}
                    title="Switch to Audio Mode"
                  >
                    <Music2 className="w-3.5 h-3.5" />
                    <span>Audio</span>
                  </button>
                  <button
                    id="player-toggle-video-mode"
                    onClick={(e) => handleTabSwitch("video", e)}
                    className={`full-player-nav-btn px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activeTab === "video"
                        ? (isBespoke ? "active shadow-md" : "active bg-white text-black shadow-md")
                        : "text-white/70 hover:text-white"
                    }`}
                    style={isBespoke && activeTab === "video" ? {
                      background: `linear-gradient(135deg, ${bespokeColors[0]}, ${bespokeColors[1]})`,
                      color: calculateWcagText(bespokeColors[1]),
                    } : undefined}
                    title="Switch to Video Mode"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Video</span>
                  </button>
                </div>

                {/* Right: Quick Toggles (Lyrics, Radio) */}
                <div className="flex items-center gap-1.5 sm:gap-3">
                  <button
                    onClick={(e) => handleTabSwitch("lyrics", e)}
                    className={`full-player-nav-btn px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 sm:gap-1.5 border transition-all ${
                      activeTab === "lyrics" ? `active ${fpTheme.tabActive}` : fpTheme.tabInactive
                    }`}
                    style={
                      isBespoke && activeTab === "lyrics"
                        ? {
                            background: `linear-gradient(135deg, ${bespokeColors[0]}, ${bespokeColors[1]})`,
                            color: calculateWcagText(bespokeColors[1]),
                            borderColor: "transparent",
                            boxShadow: `0 0 16px ${hexToRgba(bespokeColors[1], 0.6)}`,
                          }
                        : isCandyland && activeTab !== "lyrics"
                        ? { color: "#8A2BE2" }
                        : (activeTab !== "lyrics" ? { color: "#e8d5b5", stroke: "#e8d5b5" } : undefined)
                    }
                  >
                    <Sparkles
                      className="w-3.5 h-3.5"
                      style={
                        isCandyland && activeTab !== "lyrics"
                          ? { color: "#8A2BE2", stroke: "#8A2BE2", opacity: 1 }
                          : (activeTab !== "lyrics" ? { color: "#e8d5b5", stroke: "#e8d5b5", opacity: 0.85 } : undefined)
                      }
                    />
                    <span
                      style={
                        isCandyland && activeTab !== "lyrics"
                          ? { color: "#8A2BE2", opacity: 1 }
                          : (activeTab !== "lyrics" ? { color: "#e8d5b5", opacity: 0.85 } : undefined)
                      }
                    >
                      Lyrics
                    </span>
                  </button>

                  <button
                    onClick={(e) => handleTabSwitch("radio", e)}
                    className={`full-player-nav-btn px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 sm:gap-1.5 border transition-all ${
                      activeTab === "radio" ? `active ${fpTheme.tabActive}` : fpTheme.tabInactive
                    }`}
                    style={
                      isBespoke && activeTab === "radio"
                        ? {
                            background: `linear-gradient(135deg, ${bespokeColors[0]}, ${bespokeColors[1]})`,
                            color: calculateWcagText(bespokeColors[1]),
                            borderColor: "transparent",
                            boxShadow: `0 0 16px ${hexToRgba(bespokeColors[1], 0.6)}`,
                          }
                        : isCandyland && activeTab !== "radio"
                        ? { color: "#8A2BE2" }
                        : (activeTab !== "radio" ? { color: "#e8d5b5", stroke: "#e8d5b5" } : undefined)
                    }
                  >
                    <Radio
                      className="w-3.5 h-3.5"
                      style={
                        isCandyland && activeTab !== "radio"
                          ? { color: "#8A2BE2", stroke: "#8A2BE2", opacity: 1 }
                          : (activeTab !== "radio" ? { color: "#e8d5b5", stroke: "#e8d5b5", opacity: 0.85 } : undefined)
                      }
                    />
                    <span
                      style={
                        isCandyland && activeTab !== "radio"
                          ? { color: "#8A2BE2", opacity: 1 }
                          : (activeTab !== "radio" ? { color: "#e8d5b5", opacity: 0.85 } : undefined)
                      }
                    >
                      Radio
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Main Fullscreen Center Body */}
          <div className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center px-3 py-1 sm:px-6 sm:py-3 overflow-hidden">
            {/* 1. Lyrics View - Always mounted, toggled via CSS */}
            <div
              className="w-full max-w-2xl h-full flex items-center justify-center"
              style={{ display: activeTab === "lyrics" ? "flex" : "none" }}
            >
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

            {/* 2. Radio Pop-Up Window - Always mounted, toggled via CSS */}
            <div
              className="w-full max-w-md h-full flex flex-col items-center justify-center py-1 sm:py-2"
              style={{ display: activeTab === "radio" ? "flex" : "none" }}
            >
              <div className="w-full flex-1 min-h-0 flex items-center justify-center">
                <SimilarTracksDrawer
                  currentTrack={currentTrack}
                  seedTrack={radioSeedTrack || currentTrack}
                  isPlaying={isPlaying}
                  onPlayTrack={onPlayTrack}
                  onPlayQueue={onPlayQueue}
                  onRegisterRadioQueue={onRegisterRadioQueue}
                  onAddToQueue={onAddToQueue}
                  onClose={() => setPlayerState((prev) => ({ ...prev, showSimilar: false }))}
                  designConfig={designConfig}
                />
              </div>
            </div>

            {/* 3. Music Video Mode on Center Stage - Always mounted in DOM, toggled via off-screen positioning ONLY */}
            <div
              className="full-player-modal-content flex flex-col items-center justify-center max-w-2xl w-full animate-fade-in my-auto py-0.5"
              style={{
                position: activeTab === 'video' ? 'relative' : 'absolute',
                left: activeTab === 'video' ? '0' : '-9999px',
                top: activeTab === 'video' ? '0' : '-9999px',
                width: '100%',
                height: activeTab === 'video' ? 'auto' : '1px',
                opacity: activeTab === 'video' ? 1 : 0.001,
                pointerEvents: activeTab === 'video' ? 'auto' : 'none'
              }}
            >
              <div
                className="full-player-video-card"
                style={
                  isBespoke && bespokeColors[0]
                    ? {
                        borderColor: bespokeColors[0],
                        boxShadow: `0 0 25px ${hexToRgba(bespokeColors[0], 0.35)}`,
                      }
                    : undefined
                }
              >
                <div
                  id="oblivion-unified-yt-player"
                  className="w-full h-full rounded-2xl overflow-hidden"
                />
              </div>

              {/* Song Title & Artist - lowered with clean gap below the video screen and clear of shadows */}
              <div className="relative z-30 text-center space-y-1 max-w-[min(90vw,480px)] w-full px-2 mt-3 sm:mt-4 pt-0.5">
                <MarqueeText
                  as="h2"
                  text={cleanTrackTitle(currentTrack.title, currentTrack.artist)}
                  className={isHardRock ? "text-base sm:text-xl font-bold tracking-wider text-center leading-tight uppercase font-serif" : `text-sm sm:text-xl md:text-2xl font-semibold tracking-normal ${fpTheme.stageTitle} text-center leading-tight`}
                  containerClassName="w-full mx-auto text-center"
                  style={isHardRock ? { color: "#e8d5b5", letterSpacing: "0.05em" } : undefined}
                  speed={30}
                />
                <MarqueeText
                  as="p"
                  text={currentTrack.artist || "Unknown Artist"}
                  className={isHardRock ? "text-xs sm:text-sm font-medium text-center" : `text-xs sm:text-sm font-normal tracking-wide ${fpTheme.stageArtist} text-center`}
                  containerClassName="w-full mx-auto text-center"
                  style={isHardRock ? { color: "#a89379" } : (isBespoke ? { color: bespokeColors[1] } : undefined)}
                  speed={26}
                />
                {(currentTrack.isUnavailable || currentTrack.isInvalid) && (
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400 bg-red-950/70 border border-red-500/40 px-2.5 py-0.5 rounded-full mt-1.5 shadow-sm">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span>Track unavailable on YouTube</span>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Audio / Song Mode: Central HD Album Artwork & Dynamic Stage - Always mounted, toggled via CSS */}
            <div
              className="full-player-modal-content flex flex-col items-center justify-center max-w-md w-full animate-fade-in my-auto py-0.5"
              style={{ display: activeTab === "audio" ? "flex" : "none" }}
            >
              {/* Audio Artwork Card (Slim Line + Soft Ambient Glow) */}
              <div
                className="full-player-artwork-card art-container glass-card relative group"
                style={isHardRock ? {
                  borderRadius: "28px",
                  overflow: "hidden",
                  border: "1px solid rgba(232, 213, 181, 0.18)",
                  boxShadow: "0 0 50px rgba(168, 85, 247, 0.45), 0 20px 40px rgba(0, 0, 0, 0.75)",
                  maxWidth: "min(84vw, 360px)",
                  aspectRatio: "1/1",
                } : isBespoke ? {
                  borderColor: hexToRgba(bespokeColors[0], 0.6),
                  boxShadow: `0 0 30px ${hexToRgba(bespokeColors[0], 0.35)}`,
                } : undefined}
              >
                <img
                  src={getHdCoverUrl(currentTrack.coverUrl)}
                  alt={currentTrack.title}
                  onError={(e) => {
                    if (currentTrack.coverUrl && e.currentTarget.src !== currentTrack.coverUrl) {
                      e.currentTarget.src = currentTrack.coverUrl;
                    } else {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=95";
                    }
                  }}
                />
              </div>

              {/* Song Title & Artist - lowered with clean gap below album artwork and clear of shadows */}
              <div className="relative z-30 text-center space-y-1 max-w-[min(90vw,480px)] w-full px-2 mt-3 sm:mt-4 pt-0.5">
                <MarqueeText
                  as="h2"
                  text={cleanTrackTitle(currentTrack.title, currentTrack.artist)}
                  className={isHardRock ? "text-base sm:text-xl font-bold tracking-wider text-center leading-tight uppercase font-serif" : `text-sm sm:text-xl md:text-2xl font-bold tracking-tight ${fpTheme.stageTitle} text-center leading-tight`}
                  containerClassName="w-full mx-auto text-center"
                  style={isHardRock ? { color: "#e8d5b5", letterSpacing: "0.05em" } : undefined}
                  speed={30}
                />
                <MarqueeText
                  as="p"
                  text={currentTrack.artist || "Unknown Artist"}
                  className={isHardRock ? "text-xs sm:text-sm font-medium text-center" : `text-xs sm:text-sm font-semibold ${fpTheme.stageArtist} text-center`}
                  containerClassName="w-full mx-auto text-center"
                  style={isHardRock ? { color: "#a89379" } : (isBespoke ? { color: bespokeColors[1] } : undefined)}
                  speed={26}
                />
                {(currentTrack.isUnavailable || currentTrack.isInvalid) && (
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400 bg-red-950/70 border border-red-500/40 px-2.5 py-0.5 rounded-full mt-1.5 shadow-sm">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span>Track unavailable on YouTube</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fullscreen Player Controls Bar - Unified Designer Deck matching Mini Player */}
          <div
            className={`full-player-bottom-bar full-player-controls-container full-player-bottom-dock relative z-20 shrink-0 p-3 sm:p-5 pb-5 sm:pb-7 max-w-2xl mx-auto w-full select-none ${isHardRock ? "" : `border-t backdrop-blur-2xl space-y-2 sm:space-y-3 rounded-t-3xl ${fpTheme.bottomDeck}`}`}
            style={isHardRock ? {
              backgroundColor: "rgba(26, 20, 32, 0.95)",
              borderRadius: "24px",
              border: "1px solid rgba(168, 85, 247, 0.35)",
              boxShadow: "0 0 35px rgba(168, 85, 247, 0.35), 0 -12px 35px rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
            } : isBespoke ? {
              background: `linear-gradient(180deg, ${hexToRgba(bespokeColors[0], 0.45)} 0%, rgba(10, 10, 16, 0.9) 100%)`,
              borderTopColor: hexToRgba(bespokeColors[2], 0.35),
            } : designConfig.id === "sugar-time-jazz" ? {
              backgroundColor: "rgba(26, 20, 32, 0.95)",
              borderRadius: "28px",
              border: "1px solid rgba(212, 175, 55, 0.3)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.8), 0 0 35px rgba(168, 85, 247, 0.35)",
              padding: "18px 24px",
            } : undefined}
          >
            {/* Top Row Controls: Like, Add, Prev, Play/Pause, Next, Shuffle, Repeat, Volume */}
            <div className="flex items-center justify-between gap-1 sm:gap-2 px-1">
              {/* Left Group: Add to Playlist */}
              <div className="flex-1 flex items-center justify-start gap-1 sm:gap-2">
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
                  className={`transition-all active:scale-95 flex items-center justify-center cursor-pointer p-2 ${isHardRock ? "" : `player-control-btn rounded-xl border text-xs font-semibold ${fpTheme.ctrlBtn}`}`}
                  style={isHardRock ? {
                    backgroundColor: "transparent",
                    border: "none",
                    boxShadow: "none",
                    outline: "none",
                    padding: "8px",
                    opacity: 1,
                  } : isCandyland ? {
                    color: "#8a2be2",
                  } : { color: "#e8d5b5" }}
                  title="Add to Playlist"
                >
                  <Plus
                    className="control-icon w-5 h-5 sm:w-6 sm:h-6"
                    style={isHardRock ? {
                      color: "#e8d5b5",
                      stroke: "#e8d5b5",
                      fill: "none",
                      opacity: 1,
                    } : isCandyland ? {
                      color: "#8a2be2",
                      stroke: "#8a2be2",
                      fill: "none",
                      opacity: 1,
                    } : { color: "#e8d5b5", stroke: "#e8d5b5", opacity: 0.9 }}
                  />
                </button>

                <button
                  id="player-fullscreen-share-btn"
                  onClick={() => {
                    void shareTrack(currentTrack);
                  }}
                  className={`transition-all active:scale-95 flex items-center justify-center cursor-pointer p-2 ${isHardRock ? "" : `player-control-btn rounded-xl border text-xs font-semibold ${fpTheme.ctrlBtn}`}`}
                  style={isHardRock ? {
                    backgroundColor: "transparent",
                    border: "none",
                    boxShadow: "none",
                    outline: "none",
                    padding: "8px",
                    opacity: 1,
                  } : isCandyland ? {
                    color: "#8a2be2",
                  } : { color: "#e8d5b5" }}
                  title="Share song"
                >
                  <ShareIcon
                    className="control-icon w-5 h-5 sm:w-6 sm:h-6"
                    style={isHardRock ? {
                      color: "#e8d5b5",
                      stroke: "#e8d5b5",
                      fill: "none",
                      opacity: 1,
                    } : isCandyland ? {
                      color: "#8a2be2",
                      stroke: "#8a2be2",
                      fill: "none",
                      opacity: 1,
                    } : { color: "#e8d5b5", stroke: "#e8d5b5", opacity: 0.9 }}
                  />
                </button>
              </div>

              {/* Center Group: Previous (Back), Play/Pause in Center, Next (Forward) */}
              <div className="flex items-center justify-center gap-3 sm:gap-5 shrink-0">
                <button
                  onClick={handlePrevTrack}
                  className={`transition-all active:scale-95 flex items-center justify-center cursor-pointer p-2 ${isHardRock ? "" : `player-control-btn control-btn rounded-xl border ${fpTheme.ctrlBtn}`}`}
                  style={isHardRock ? {
                    backgroundColor: "transparent",
                    border: "none",
                    boxShadow: "none",
                    outline: "none",
                    padding: "8px",
                    opacity: 1,
                  } : isCandyland ? {
                    color: "#8a2be2",
                  } : { color: "#e8d5b5" }}
                  title="Previous Song"
                >
                  <SkipBack
                    className="control-icon w-5 h-5 sm:w-6 sm:h-6"
                    style={isHardRock ? {
                      color: "#e8d5b5",
                      stroke: "#e8d5b5",
                      fill: "none",
                      opacity: 1,
                    } : isCandyland ? {
                      color: "#8a2be2",
                      stroke: "#8a2be2",
                      fill: "none",
                      opacity: 1,
                    } : { color: "#e8d5b5", stroke: "#e8d5b5", opacity: 0.9 }}
                  />
                </button>

                {/* Central Play/Pause Button with perfectly centered radial ambient glow */}
                <div className="relative flex items-center justify-center">
                  <div
                    className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none rounded-full w-20 h-20 ${
                      isCandyland ? "candyland-play-glow" : ""
                    }`}
                    style={
                      isHardRock
                        ? {
                            background:
                              "radial-gradient(circle, rgba(224, 36, 179, 0.75) 0%, rgba(128, 15, 94, 0.25) 55%, transparent 75%)",
                            boxShadow:
                              "0 0 35px rgba(224, 36, 179, 0.8), 0 0 15px rgba(128, 15, 94, 0.6)",
                            filter: "blur(4px)",
                          }
                        : isCandyland
                        ? {
                            background:
                              "radial-gradient(circle, rgba(216, 180, 254, 0.6) 0%, rgba(216, 180, 254, 0.2) 55%, transparent 75%)",
                            boxShadow:
                              "0 0 35px rgba(216, 180, 254, 0.6), 0 0 15px #d8b4fe",
                            filter: "blur(4px)",
                          }
                        : isBespoke
                        ? {
                            background: `radial-gradient(circle, ${hexToRgba(bespokeColors[1], 0.6)} 0%, ${hexToRgba(bespokeColors[1], 0.15)} 55%, transparent 75%)`,
                            boxShadow: `0 0 30px ${hexToRgba(bespokeColors[1], 0.45)}`,
                            filter: "blur(4px)",
                          }
                        : {
                            background:
                              "radial-gradient(circle, var(--accent-glow, rgba(197, 155, 39, 0.5)) 0%, transparent 70%)",
                            filter: "blur(4px)",
                          }
                    }
                  />
                  <button
                    id="player-fullscreen-main-play-btn"
                    onClick={() => handleUserTogglePlay()}
                    className={`player-play-btn full-player-play-btn play-pause-btn relative z-10 flex items-center justify-center active:scale-95 cursor-pointer ${
                      isHardRock
                        ? "transition-transform duration-150"
                        : `transition-all w-11 h-11 sm:w-13 sm:h-13 rounded-full shadow-lg ${fpTheme.playBtn}`
                    }`}
                    style={
                      isHardRock
                        ? {
                            width: "56px",
                            height: "56px",
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #E024B3 0%, #800F5E 50%, #2A0520 100%)",
                            border: "1px solid rgba(255, 105, 180, 0.4)",
                            boxShadow:
                              "0 0 12px rgba(224, 36, 179, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.3)",
                            color: "#FFFFFF",
                          }
                        : isBespoke
                        ? {
                            background: `linear-gradient(135deg, ${bespokeColors[0]}, ${bespokeColors[1]})`,
                            color: calculateWcagText(bespokeColors[1]),
                            boxShadow: `0 0 26px ${hexToRgba(bespokeColors[1], 0.6)}`,
                          }
                        : undefined
                    }
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? (
                      isHardRock ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ opacity: 1 }}>
                          <path d="M6 4h4v16H6z M14 4h4v16h-4z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="1" />
                        </svg>
                      ) : (
                        <Pause
                          size={24}
                          strokeWidth={2.5}
                          className={fpTheme.playIconFill}
                        />
                      )
                    ) : (
                      isHardRock ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ opacity: 1, marginLeft: "2px" }}>
                          <polygon points="5 3 19 12 5 21 5 3" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="1" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <Play
                          size={24}
                          strokeWidth={2.5}
                          className={fpTheme.playIconFill}
                        />
                      )
                    )}
                  </button>
                </div>

                <button
                  onClick={handleNextTrack}
                  className={`transition-all active:scale-95 flex items-center justify-center cursor-pointer p-2 ${isHardRock ? "" : `player-control-btn control-btn rounded-xl border ${fpTheme.ctrlBtn}`}`}
                  style={isHardRock ? {
                    backgroundColor: "transparent",
                    border: "none",
                    boxShadow: "none",
                    outline: "none",
                    padding: "8px",
                    opacity: 1,
                  } : isCandyland ? {
                    color: "#8a2be2",
                  } : { color: "#e8d5b5" }}
                  title="Next Song"
                >
                  <SkipForward
                    className="control-icon w-5 h-5 sm:w-6 sm:h-6"
                    style={isHardRock ? {
                      color: "#e8d5b5",
                      stroke: "#e8d5b5",
                      fill: "none",
                      opacity: 1,
                    } : isCandyland ? {
                      color: "#8a2be2",
                      stroke: "#8a2be2",
                      fill: "none",
                      opacity: 1,
                    } : { color: "#e8d5b5", stroke: "#e8d5b5", opacity: 0.9 }}
                  />
                </button>
              </div>

              {/* Right Group: Repeat, Volume */}
              <div className="flex-1 flex items-center justify-end gap-1 sm:gap-2">
                <button
                  onClick={handleToggleShuffleClick}
                  className={`transition-all active:scale-95 flex items-center justify-center cursor-pointer p-2 ${
                    isHardRock
                      ? (effectiveShuffle ? "full-player-dock-btn-active" : "")
                      : `player-control-btn control-btn rounded-xl ${effectiveShuffle ? fpTheme.activeText : fpTheme.mutedText}`
                  }`}
                  style={
                    isHardRock
                      ? effectiveShuffle
                        ? {
                            background: "linear-gradient(135deg, #E024B3 0%, #800F5E 50%, #2A0520 100%)",
                            border: "1px solid rgba(255, 105, 180, 0.4)",
                            color: "#FFFFFF",
                            fontWeight: 600,
                            borderRadius: "12px",
                            boxShadow: "0 0 8px rgba(224, 36, 179, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.2)",
                            padding: "8px",
                            opacity: 1,
                          }
                        : {
                            background: "rgba(255, 255, 255, 0.08)",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            color: "#E5E7EB",
                            borderRadius: "12px",
                            boxShadow: "none",
                            outline: "none",
                            padding: "8px",
                            opacity: 1,
                          }
                      : isCandyland
                      ? {
                          color: effectiveShuffle ? "#ff1493" : "#8a2be2",
                        }
                      : (effectiveShuffle && isBespoke ? { color: bespokeColors[1] } : (!effectiveShuffle ? { color: "#e8d5b5" } : undefined))
                  }
                  data-shuffle-btn="true"
                  data-shuffle-state={effectiveShuffle ? "on" : "off"}
                  title={`Shuffle: ${effectiveShuffle ? "On" : "Off"}`}
                >
                  <Shuffle
                    className="control-icon w-5 h-5 sm:w-6 sm:h-6"
                    style={
                      isHardRock
                        ? effectiveShuffle
                          ? { color: "#FFFFFF", stroke: "#FFFFFF", fill: "none", opacity: 1 }
                          : { color: "#E5E7EB", stroke: "#E5E7EB", fill: "none", opacity: 1 }
                        : isCandyland
                        ? {
                            color: effectiveShuffle ? "#ff1493" : "#8a2be2",
                            stroke: effectiveShuffle ? "#ff1493" : "#8a2be2",
                            fill: "none",
                            opacity: effectiveShuffle ? 1 : 0.85,
                          }
                        : (!effectiveShuffle ? { color: "#e8d5b5", stroke: "#e8d5b5", opacity: 0.9 } : undefined)
                    }
                  />
                </button>

                <button
                  onClick={() => {
                    if (playerCtx) {
                      playerCtx.cycleRepeatMode();
                    }
                    cycleRepeatMode();
                  }}
                  className={`transition-all active:scale-95 flex items-center justify-center cursor-pointer p-2 ${
                    isHardRock
                      ? (effectiveRepeat !== "off" ? "full-player-dock-btn-active" : "")
                      : `player-control-btn control-btn rounded-xl ${effectiveRepeat !== "off" ? fpTheme.activeText : fpTheme.mutedText}`
                  }`}
                  style={
                    isHardRock
                      ? effectiveRepeat !== "off"
                        ? {
                            background: "linear-gradient(135deg, #E024B3 0%, #800F5E 50%, #2A0520 100%)",
                            border: "1px solid rgba(255, 105, 180, 0.4)",
                            color: "#FFFFFF",
                            fontWeight: 600,
                            borderRadius: "12px",
                            boxShadow: "0 0 8px rgba(224, 36, 179, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.2)",
                            padding: "8px",
                            opacity: 1,
                          }
                        : {
                            background: "rgba(255, 255, 255, 0.08)",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            color: "#E5E7EB",
                            borderRadius: "12px",
                            boxShadow: "none",
                            outline: "none",
                            padding: "8px",
                            opacity: 1,
                          }
                      : isCandyland
                      ? {
                          color: effectiveRepeat !== "off" ? "#ff1493" : "#8a2be2",
                        }
                      : (effectiveRepeat !== "off" && isBespoke ? { color: bespokeColors[1] } : (effectiveRepeat === "off" ? { color: "#e8d5b5" } : undefined))
                  }
                  data-repeat-btn="true"
                  data-repeat-state={effectiveRepeat}
                  title={`Repeat: ${effectiveRepeat}`}
                >
                  {effectiveRepeat === "one" ? (
                    <Repeat1
                      className="control-icon w-5 h-5 sm:w-6 sm:h-6"
                      style={
                        isHardRock
                          ? { color: "#FFFFFF", stroke: "#FFFFFF", fill: "none", opacity: 1 }
                          : isCandyland
                          ? {
                              color: "#8a2be2",
                              stroke: "#8a2be2",
                              fill: "none",
                              opacity: 1,
                            }
                          : { color: "#e8d5b5", stroke: "#e8d5b5", opacity: 0.9 }
                      }
                    />
                  ) : (
                    <Repeat
                      className="control-icon w-5 h-5 sm:w-6 sm:h-6"
                      style={
                        isHardRock
                          ? effectiveRepeat !== "off"
                            ? { color: "#FFFFFF", stroke: "#FFFFFF", fill: "none", opacity: 1 }
                            : { color: "#E5E7EB", stroke: "#E5E7EB", fill: "none", opacity: 1 }
                          : isCandyland
                          ? {
                              color: effectiveRepeat !== "off" ? "#ff1493" : "#8a2be2",
                              stroke: effectiveRepeat !== "off" ? "#ff1493" : "#8a2be2",
                              fill: "none",
                              opacity: effectiveRepeat === "off" ? 0.85 : 1,
                            }
                          : (effectiveRepeat === "off" ? { color: "#e8d5b5", stroke: "#e8d5b5", opacity: 0.9 } : undefined)
                      }
                    />
                  )}
                </button>

                {/* Volume Slider on sm+ screens */}
                <div className="hidden sm:flex items-center gap-1.5 ml-2">
                  <button
                    onClick={() =>
                      setPlayerState((prev) => ({ ...prev, isMuted: !prev.isMuted }))
                    }
                    className={`transition-colors cursor-pointer ${isHardRock ? "p-1.5" : `player-control-btn p-1.5 ${fpTheme.mutedText}`}`}
                    style={isHardRock ? {
                      backgroundColor: "transparent",
                      border: "none",
                      boxShadow: "none",
                      outline: "none",
                      color: "#e8d5b5",
                      opacity: 1,
                    } : undefined}
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="control-icon w-4 h-4 text-rose-400" />
                    ) : (
                      <Volume2 className="control-icon w-4 h-4" style={isHardRock ? { color: "#e8d5b5", stroke: "#e8d5b5" } : isCandyland ? { color: "#8a2be2", stroke: "#8a2be2" } : undefined} />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => onVolumeChange(Number(e.target.value))}
                    className={`w-16 md:w-20 h-1.5 rounded-lg appearance-none cursor-pointer focus:outline-none ${fpTheme.volSlider}`}
                    style={isHardRock ? { accentColor: "#e8d5b5" } : isCandyland ? { accentColor: "#8a2be2" } : (isBespoke ? { accentColor: bespokeColors[1] } : undefined)}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Row: Waveform Scrubber & Timestamps matching Reference Image */}
            <div className="flex items-center gap-3 pt-3">
              <WaveformScrubber
                currentTime={isScrubbing && scrubTime !== null ? scrubTime : currentTime}
                duration={(duration && duration > 0) ? duration : (currentTrack?.duration || 0)}
                isPlaying={isPlaying}
                onSeek={handleSeekInternal}
                onScrubbingChange={handleScrubbingChange}
                designConfig={designConfig}
                bespokeColors={isBespoke ? bespokeColors : undefined}
                isMini={false}
              />

              <div
                className="player-time-display text-[12px] sm:text-xs font-mono font-semibold shrink-0 whitespace-nowrap"
                style={isHardRock ? { color: "#e8d5b5", opacity: 1 } : undefined}
              >
                <span>{Math.floor((isScrubbing && scrubTime !== null ? scrubTime : currentTime) / 60)}:{String(Math.floor((isScrubbing && scrubTime !== null ? scrubTime : currentTime) % 60)).padStart(2, "0")}</span>
                <span className="mx-1">/</span>
                <span>{Math.floor(((duration && duration > 0) ? duration : (currentTrack?.duration || 0)) / 60)}:{String(Math.floor(((duration && duration > 0) ? duration : (currentTrack?.duration || 0)) % 60)).padStart(2, "0")}</span>
              </div>
            </div>
          </div>
        </div>

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
            ref={miniPlayerContainerRef}
            id="app-mini-player-floating-dock"
            onTouchStart={handleMiniTouchStart}
            onTouchMove={handleMiniTouchMove}
            onTouchEnd={handleMiniTouchEnd}
            onMouseDown={handleMiniMouseDown}
            style={{
              transform: isMiniClosing
                ? "translate(-50%, 140px) scale(0.95)"
                : isMiniDraggingDown
                ? `translate(-50%, ${miniDragOffsetY}px)`
                : "translate(-50%, 0px)",
              opacity: isMiniClosing ? 0 : isMiniDraggingDown ? Math.max(0.2, 1 - miniDragOffsetY / 140) : 1,
              transition: isMiniDraggingDown ? "none" : "transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.25s ease-out",
              touchAction: "pan-x",
              cursor: isMiniDraggingDown ? "grabbing" : "default",
              ...(isHardRock
                ? {
                    backgroundColor: "rgba(18, 14, 22, 0.72)",
                    backdropFilter: "blur(20px) saturate(180%)",
                    WebkitBackdropFilter: "blur(20px) saturate(180%)",
                    border: "1px solid rgba(232, 213, 181, 0.15)",
                    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.7), 0 0 25px rgba(168, 85, 247, 0.35)",
                    borderRadius: "20px",
                  }
                : isBespoke
                ? {
                    background: "var(--bespoke-mini-player-bg, linear-gradient(135deg, var(--bespoke-c2), var(--bespoke-c3)))",
                    opacity: 1,
                    backdropFilter: "none",
                    WebkitBackdropFilter: "none",
                    borderColor: "var(--bespoke-mini-player-border, rgba(255, 255, 255, 0.25))",
                  }
                : {}),
            }}
            data-theme={designConfig.id}
            className={`mini-player-container mini-player fixed bottom-16 md:bottom-4 left-1/2 w-[calc(100%-24px)] md:w-[680px] max-w-2xl ${isHardRock ? "" : designConfig.cardBg} ${isBespoke || isHardRock ? "" : "backdrop-blur-2xl"} border ${isHardRock ? "" : designConfig.borderSubtle} rounded-2xl p-3 px-4 flex flex-col gap-2.5 z-40 select-none shadow-2xl ring-1 ${isHardRock ? "ring-purple-500/30" : designConfig.accentBorder}`}
          >
            {/* Top Drag-Down Bar Handle */}
            <div
              className="w-12 h-1 rounded-full bg-white/20 hover:bg-white/40 mx-auto -mt-1 mb-0.5 cursor-grab active:cursor-grabbing transition-colors"
              title="Swipe or drag down to close mini player"
              onClick={handleCloseMiniPlayer}
            />

            {/* Top Row: Left Artwork, Center (Song Title & Details directly above Play/Pause & Back/Next), Right (Controls) */}
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              {/* Left: Track Artwork Thumbnail */}
              <div 
                onClick={() => setPlayerState((prev) => ({ ...prev, isFullscreen: true }))}
                className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 border ${isHardRock ? "border-[rgba(232,213,181,0.25)] shadow-[0_0_12px_rgba(168,85,247,0.35)]" : `${designConfig.borderSubtle} shadow-sm`} bg-slate-800 flex items-center justify-center cursor-pointer group`}
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
                  <Maximize2 className="control-icon w-3.5 h-3.5 text-white" />
                </div>
              </div>

              {/* Center Column: Song Title and Details located JUST ABOVE the Play/Pause button */}
              <div className="flex-1 flex flex-col items-center justify-center min-w-0 max-w-sm sm:max-w-md mx-auto px-1">
                {/* Song Title and Song Details just above the Play/Pause button with Marquee scrolling */}
                <div 
                  onClick={() => setPlayerState((prev) => ({ ...prev, isFullscreen: true }))}
                  className="w-full text-center flex flex-col items-center justify-center mb-1.5 cursor-pointer group max-w-full"
                  title="Click to open Full Player"
                >
                  <MarqueeText
                    text={cleanTrackTitle(currentTrack.title, currentTrack.artist)}
                    className={`text-xs sm:text-sm font-bold ${isHardRock ? "" : designConfig.textPrimary} group-hover:${designConfig.accentText} transition-colors text-center`}
                    containerClassName="w-full max-w-[200px] xs:max-w-[250px] sm:max-w-[320px] mx-auto text-center"
                    style={isHardRock ? { color: "#e8d5b5" } : undefined}
                    speed={28}
                  />
                  <MarqueeText
                    text={`${currentTrack.artist} • HD Studio`}
                    className={`text-[10px] sm:text-[11px] ${isHardRock ? "" : designConfig.textMuted} text-center`}
                    containerClassName="w-full max-w-[180px] xs:max-w-[220px] sm:max-w-[280px] mx-auto text-center"
                    style={isHardRock ? { color: "#a89379" } : undefined}
                    speed={24}
                  />
                  {(currentTrack.isUnavailable || currentTrack.isInvalid) && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-950/70 border border-red-500/40 px-1.5 py-0.5 rounded shadow-sm mt-0.5" title="Track unavailable on YouTube">
                      <AlertTriangle className="w-2.5 h-2.5 text-red-400 shrink-0" />
                      <span>Unavailable</span>
                    </span>
                  )}
                </div>

                {/* Center Playback Controls: Back Navigation Button, Play/Pause in Center, Forward/Next Navigation Button */}
                <div className="mini-player-controls flex items-center justify-center gap-1.5 sm:gap-2.5 shrink-0">
                  <button
                    onClick={handlePrevTrack}
                    className={`player-control-btn action-btn p-1.5 sm:p-2 rounded-xl transition-all active:scale-95 ${isHardRock ? "" : `${designConfig.textMuted} hover:${designConfig.textPrimary}`}`}
                    style={isHardRock ? {
                      backgroundColor: "transparent",
                      border: "none",
                      boxShadow: "none",
                      outline: "none",
                      padding: "6px",
                      opacity: 1,
                    } : undefined}
                    title="Previous"
                  >
                    <SkipBack
                      className="control-icon w-4 h-4 sm:w-4.5 sm:h-4.5"
                      style={isHardRock ? {
                        color: "#e8d5b5",
                        stroke: "#e8d5b5",
                        fill: "none",
                        opacity: 1,
                      } : undefined}
                    />
                  </button>

                  <button
                    onClick={() => handleUserTogglePlay()}
                    className={`player-play-btn mini-player-play-btn w-9 h-9 sm:w-10 sm:h-10 rounded-full ${isHardRock || isBespoke ? "" : designConfig.btnPrimary} flex items-center justify-center shadow-md transition-transform active:scale-95 shrink-0`}
                    style={
                      isHardRock
                        ? {
                            width: "38px",
                            height: "38px",
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #E024B3 0%, #800F5E 50%, #2A0520 100%)",
                            border: "1px solid rgba(255, 105, 180, 0.4)",
                            boxShadow: "0 0 8px rgba(224, 36, 179, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.2)",
                            color: "#FFFFFF",
                          }
                        : isBespoke
                        ? {
                            background: "var(--bespoke-mini-player-play-bg, #0f172a)",
                            color: "var(--bespoke-mini-player-play-icon, #ffffff)",
                          }
                        : undefined
                    }
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? (
                      isHardRock ? (
                        <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" viewBox="0 0 24 24" fill="none" style={{ opacity: 1 }}>
                          <path d="M6 4h4v16H6z M14 4h4v16h-4z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="1" />
                        </svg>
                      ) : (
                        <Pause
                          className="w-4 h-4 sm:w-4.5 sm:h-4.5"
                          strokeWidth={2.5}
                          style={
                            isBespoke
                              ? { fill: "none", stroke: "var(--bespoke-mini-player-play-icon, #ffffff)" }
                              : { fill: "none", stroke: "white" }
                          }
                        />
                      )
                    ) : (
                      isHardRock ? (
                        <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5 ml-0.5" viewBox="0 0 24 24" fill="none" style={{ opacity: 1 }}>
                          <polygon points="5 3 19 12 5 21 5 3" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="1" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <Play
                          className="w-4 h-4 sm:w-4.5 sm:h-4.5 ml-0.5"
                          strokeWidth={2.5}
                          style={
                            isBespoke
                              ? { fill: "none", stroke: "var(--bespoke-mini-player-play-icon, #ffffff)" }
                              : { fill: "none", stroke: "white" }
                          }
                        />
                      )
                    )}
                  </button>

                  <button
                    onClick={handleNextTrack}
                    className={`player-control-btn action-btn p-1.5 sm:p-2 rounded-xl transition-all active:scale-95 ${isHardRock ? "" : `${designConfig.textMuted} hover:${designConfig.textPrimary}`}`}
                    style={isHardRock ? {
                      backgroundColor: "transparent",
                      border: "none",
                      boxShadow: "none",
                      outline: "none",
                      padding: "6px",
                      opacity: 1,
                    } : undefined}
                    title="Next"
                  >
                    <SkipForward
                      className="control-icon w-4 h-4 sm:w-4.5 sm:h-4.5"
                      style={isHardRock ? {
                        color: "#e8d5b5",
                        stroke: "#e8d5b5",
                        fill: "none",
                        opacity: 1,
                      } : undefined}
                    />
                  </button>
                </div>
              </div>

              {/* Right: Remaining buttons sitting after Forward/Next button (Repeat, Add, Expand) */}
              <div className="secondary-controls mini-player-secondary-controls flex items-center justify-end gap-0.5 sm:gap-1 shrink-0">
                <button
                  onClick={handleToggleShuffleClick}
                  className={`player-control-btn action-btn p-1.5 transition-colors ${
                    isHardRock
                      ? (effectiveShuffle ? "dock-btn-active" : "")
                      : (effectiveShuffle ? designConfig.accentText : `${designConfig.textMuted} hover:${designConfig.textPrimary}`)
                  }`}
                  style={
                    isHardRock
                      ? effectiveShuffle
                        ? {
                            background: "linear-gradient(135deg, #E024B3 0%, #800F5E 50%, #2A0520 100%)",
                            borderRadius: "8px",
                            border: "1px solid rgba(255, 105, 180, 0.4)",
                            boxShadow: "0 0 8px rgba(224, 36, 179, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.2)",
                            color: "#FFFFFF",
                            fontWeight: 600,
                            padding: "6px",
                            opacity: 1,
                          }
                        : {
                            background: "rgba(255, 255, 255, 0.08)",
                            borderRadius: "8px",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            boxShadow: "none",
                            color: "#E5E7EB",
                            outline: "none",
                            padding: "6px",
                            opacity: 1,
                          }
                      : undefined
                  }
                  data-shuffle-btn="true"
                  data-shuffle-state={effectiveShuffle ? "on" : "off"}
                  title={`Shuffle: ${effectiveShuffle ? "On" : "Off"}`}
                >
                  <Shuffle
                    className="control-icon w-3.5 h-3.5"
                    style={
                      isHardRock
                        ? effectiveShuffle
                          ? { color: "#FFFFFF", stroke: "#FFFFFF", fill: "none", opacity: 1 }
                          : { color: "#E5E7EB", stroke: "#E5E7EB", fill: "none", opacity: 1 }
                        : undefined
                    }
                  />
                </button>

                <button
                  onClick={() => {
                    if (playerCtx) {
                      playerCtx.cycleRepeatMode();
                    }
                    cycleRepeatMode();
                  }}
                  className={`player-control-btn action-btn p-1.5 transition-colors ${
                    isHardRock
                      ? (effectiveRepeat !== "off" ? "dock-btn-active" : "")
                      : (effectiveRepeat !== "off" ? designConfig.accentText : `${designConfig.textMuted} hover:${designConfig.textPrimary}`)
                  }`}
                  style={
                    isHardRock
                      ? effectiveRepeat !== "off"
                        ? {
                            background: "linear-gradient(135deg, #E024B3 0%, #800F5E 50%, #2A0520 100%)",
                            borderRadius: "8px",
                            border: "1px solid rgba(255, 105, 180, 0.4)",
                            boxShadow: "0 0 8px rgba(224, 36, 179, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.2)",
                            color: "#FFFFFF",
                            fontWeight: 600,
                            padding: "6px",
                            opacity: 1,
                          }
                        : {
                            background: "rgba(255, 255, 255, 0.08)",
                            borderRadius: "8px",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            boxShadow: "none",
                            color: "#E5E7EB",
                            outline: "none",
                            padding: "6px",
                            opacity: 1,
                          }
                      : undefined
                  }
                  data-repeat-btn="true"
                  data-repeat-state={effectiveRepeat}
                  title={`Repeat: ${effectiveRepeat}`}
                >
                  {effectiveRepeat === "one" ? (
                    <Repeat1
                      className="control-icon w-3.5 h-3.5"
                      style={
                        isHardRock
                          ? { color: "#FFFFFF", stroke: "#FFFFFF", fill: "none", opacity: 1 }
                          : undefined
                      }
                    />
                  ) : (
                    <Repeat
                      className="control-icon w-3.5 h-3.5"
                      style={
                        isHardRock
                          ? effectiveRepeat !== "off"
                            ? { color: "#FFFFFF", stroke: "#FFFFFF", fill: "none", opacity: 1 }
                            : { color: "#E5E7EB", stroke: "#E5E7EB", fill: "none", opacity: 1 }
                          : undefined
                      }
                    />
                  )}
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
                  className={`player-control-btn action-btn p-1.5 transition-colors ${isHardRock ? "" : `${designConfig.textMuted} hover:${designConfig.accentText}`}`}
                  style={isHardRock ? {
                    backgroundColor: "transparent",
                    border: "none",
                    boxShadow: "none",
                    outline: "none",
                    padding: "6px",
                    opacity: 1,
                  } : undefined}
                  title="Add to Playlist"
                >
                  <Plus
                    className="control-icon w-3.5 h-3.5 sm:w-4 sm:h-4"
                    style={isHardRock ? {
                      color: "#e8d5b5",
                      stroke: "#e8d5b5",
                      fill: "none",
                      opacity: 1,
                    } : undefined}
                  />
                </button>

                <button
                  id="player-mini-share-btn"
                  onClick={() => {
                    void shareTrack(currentTrack);
                  }}
                  className={`player-control-btn action-btn p-1.5 transition-colors ${isHardRock ? "" : `${designConfig.textMuted} hover:${designConfig.accentText}`}`}
                  style={isHardRock ? {
                    backgroundColor: "transparent",
                    border: "none",
                    boxShadow: "none",
                    outline: "none",
                    padding: "6px",
                    opacity: 1,
                  } : undefined}
                  title="Share song"
                >
                  <ShareIcon
                    className="control-icon w-3.5 h-3.5 sm:w-4 sm:h-4"
                    style={isHardRock ? {
                      color: "#e8d5b5",
                      stroke: "#e8d5b5",
                      fill: "none",
                      opacity: 1,
                    } : undefined}
                  />
                </button>

                <button
                  onClick={() => setPlayerState((prev) => ({ ...prev, isFullscreen: true }))}
                  className={`player-control-btn action-btn p-1.5 transition-colors ${isHardRock ? "" : `${designConfig.textMuted} hover:${designConfig.textPrimary}`}`}
                  style={isHardRock ? {
                    backgroundColor: "transparent",
                    border: "none",
                    boxShadow: "none",
                    outline: "none",
                    padding: "6px",
                    opacity: 1,
                  } : undefined}
                  title="Full View"
                >
                  <Maximize2
                    className="control-icon w-3.5 h-3.5 sm:w-4 sm:h-4"
                    style={isHardRock ? {
                      color: "#e8d5b5",
                      stroke: "#e8d5b5",
                      fill: "none",
                      opacity: 1,
                    } : undefined}
                  />
                </button>
              </div>
            </div>

            {/* Bottom Row: Waveform Scrubber & Timestamps */}
            <div className="flex items-center gap-3 pt-0.5">
              <WaveformScrubber
                currentTime={isScrubbing && scrubTime !== null ? scrubTime : currentTime}
                duration={(duration && duration > 0) ? duration : (currentTrack?.duration || 0)}
                isPlaying={isPlaying}
                onSeek={handleSeekInternal}
                onScrubbingChange={handleScrubbingChange}
                designConfig={designConfig}
                bespokeColors={isBespoke && bespokeColors && bespokeColors.length >= 3 ? [bespokeColors[1], bespokeColors[2]] : (isBespoke ? bespokeColors : undefined)}
                isMini={true}
              />

              <div
                className={`player-time-display text-[11px] font-mono font-medium ${isHardRock ? "" : designConfig.textMuted} shrink-0 whitespace-nowrap`}
                style={isHardRock ? { color: "#e8d5b5", opacity: 1 } : undefined}
              >
                <span>{Math.floor((isScrubbing && scrubTime !== null ? scrubTime : currentTime) / 60)}:{String(Math.floor((isScrubbing && scrubTime !== null ? scrubTime : currentTime) % 60)).padStart(2, "0")}</span>
                <span className="mx-1">/</span>
                <span>{Math.floor(((duration && duration > 0) ? duration : (currentTrack?.duration || 0)) / 60)}:{String(Math.floor(((duration && duration > 0) ? duration : (currentTrack?.duration || 0)) % 60)).padStart(2, "0")}</span>
              </div>
            </div>
          </div>
        );
      })()}
        </>
      )}

      {/* Unplayable Track Auto-Skip Toast Notification */}
      {playerToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[9999] animate-bounce pointer-events-none">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-black/90 border border-red-500/50 shadow-2xl backdrop-blur-xl text-xs font-bold text-red-200">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{playerToast}</span>
          </div>
        </div>
      )}
    </>
  );
};
