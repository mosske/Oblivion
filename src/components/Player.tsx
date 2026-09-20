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
import { MarqueeText } from "./MarqueeText";
import { cleanTrackTitle, getPlayableAudioUrl, getHdCoverUrl } from "../utils/formatters";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";
import { equalizerManager } from "../utils/equalizerEngine";
import { useEqualizer } from "../context/EqualizerContext";
import { audioPlayer } from "../services/audioPlayer";
import { calculateWcagText, hexToRgba } from "../theme/colorUtils";
import { getBespokeColors, getBespokeConfig } from "../theme/themeService";

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
  onPlayQueue?: (tracks: Track[], startIndex: number) => void;
  onRegisterRadioQueue?: (tracks: Track[]) => void;
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
        bgCanvas: "bg-[#1a0818]",
        orb1: "bg-pink-400/50",
        orb2: "bg-sky-400/45",
        auroraBeam1: "bg-gradient-to-r from-pink-400/40 via-purple-300/35 to-sky-400/40",
        auroraBeam2: "bg-gradient-to-r from-yellow-300/35 via-pink-400/40 to-cyan-300/35",
        orbitalGlow1: "bg-gradient-to-tr from-pink-400/50 via-purple-400/40 to-sky-400/50",
        orbitalGlow2: "bg-gradient-to-bl from-yellow-300/40 via-pink-400/45 to-purple-500/40",
        driftAuraGlow: "bg-gradient-to-br from-pink-400/20 via-sky-400/15 to-transparent",
        veil: "bg-gradient-to-b from-black/25 via-transparent to-black/75",
        topBar: "bg-gradient-to-b from-[#2a1028]/85 via-[#1d0b1c]/90 to-[#140613]/95 backdrop-blur-3xl border-b border-pink-500/25 text-[#fff0f8] shadow-lg",
        minimizeBtn: "bg-gradient-to-b from-white/[0.14] via-pink-950/40 to-black/50 hover:from-white/[0.22] text-[#fff0f8] border border-pink-400/35 border-t-white/45 backdrop-blur-xl shadow-md",
        nowPlayingDot: "bg-[#ff69b4] shadow-[0_0_10px_#ff69b4]",
        nowPlayingLabel: "text-[#ff69b4] font-black tracking-wider",
        nowPlayingTitle: "text-[#fff0f8]",
        tabActive: "bg-gradient-to-r from-[#ff69b4] via-[#f472b6] to-[#38bdf8] text-[#1e0720] border-t border-white/60 border-b border-black/40 shadow-[0_0_20px_rgba(255,105,180,0.6)] font-black",
        tabInactive: "bg-gradient-to-b from-white/[0.08] to-black/40 hover:from-white/[0.15] text-pink-200 border border-pink-400/25 border-t-white/30 backdrop-blur-xl",
        artGlowRing: "from-[#ff69b4]/60 via-purple-400/45 to-[#38bdf8]/60",
        artBorder: "border-pink-400/40 border-t-white/45 border-b-black/60 shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(255,105,180,0.2)]",
        stageTitle: "text-[#fff0f8] drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] font-extrabold",
        stageArtist: "text-[#ff69b4] font-bold",
        stageTagAccent: "bg-gradient-to-r from-[#ff69b4]/25 to-sky-500/20 border border-pink-400/50 border-t-white/40 text-[#ff69b4]",
        stageTagNeutral: "bg-gradient-to-b from-white/[0.08] to-black/40 border border-white/15 border-t-white/30 text-pink-100",
        bottomDeck: "bg-gradient-to-t from-[#140613]/95 via-[#220d20]/90 to-[#2c102a]/85 backdrop-blur-3xl border-t border-pink-500/30 border-t-white/40 shadow-[0_-12px_36px_rgba(0,0,0,0.7),0_0_24px_rgba(255,105,180,0.25)] ring-1 ring-pink-500/25",
        seekbarTrack: "bg-black/50 border border-pink-500/20 shadow-inner",
        seekbarFill: "bg-gradient-to-r from-[#ff69b4] via-[#c084fc] to-[#38bdf8]",
        seekbarThumb: "bg-[#ff69b4] border-2 border-[#1e0720] shadow-[0_0_16px_rgba(255,105,180,0.9)]",
        seekbarGlow: "shadow-[#ff69b4]/50",
        seekbarAccent: "accent-[#ff69b4]",
        timeText: "text-pink-300/80 font-mono",
        playBtn: "bg-gradient-to-r from-[#ff69b4] via-[#f472b6] to-[#38bdf8] hover:brightness-115 text-[#1e0720] shadow-[0_0_32px_rgba(255,105,180,0.7)] border-t border-white/70 active:scale-95 ring-4 ring-[#ff69b4]/30",
        playIconFill: "fill-[#1e0720]",
        ctrlBtn: "bg-gradient-to-b from-white/[0.12] via-pink-950/40 to-black/50 hover:from-white/[0.2] text-[#fff0f8] border border-pink-400/30 border-t-white/40 shadow-md backdrop-blur-xl",
        activeText: "text-[#ff69b4] drop-shadow-[0_0_10px_rgba(255,105,180,0.5)]",
        mutedText: "text-pink-300/70 hover:text-white",
        volSlider: "bg-black/50 accent-[#ff69b4]",
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
        orb1: "bg-[#3A3530]/20",
        orb2: "bg-[#1F1F1F]/15",
        auroraBeam1: "bg-gradient-to-r from-[#1F1F1F]/20 via-[#3A3530]/15 to-[#524B44]/20",
        auroraBeam2: "bg-gradient-to-r from-[#3A3530]/20 via-[#1F1F1F]/15 to-[#FAF5ED]/30",
        orbitalGlow1: "bg-gradient-to-tr from-[#1F1F1F]/25 via-[#3A3530]/20 to-[#524B44]/25",
        orbitalGlow2: "bg-gradient-to-bl from-[#3A3530]/25 via-[#1F1F1F]/20 to-[#FAF5ED]/30",
        driftAuraGlow: "bg-gradient-to-br from-[#1F1F1F]/10 via-[#3A3530]/8 to-transparent",
        veil: "bg-gradient-to-b from-black/10 via-transparent to-black/30",
        topBar: "bg-[#FAF5ED]/95 border-[#1F1F1F]/12 text-[#1F1F1F] shadow-sm rounded-full",
        minimizeBtn: "bg-[#F2E8D8] hover:bg-[#EFE5D4] text-[#1F1F1F] border-[#1F1F1F]/15 shadow-sm rounded-full",
        nowPlayingDot: "bg-[#1F1F1F]",
        nowPlayingLabel: "text-[#1F1F1F]",
        nowPlayingTitle: "text-[#1F1F1F]",
        tabActive: "bg-[#1F1F1F] text-[#F2E8D8] border-[#1F1F1F] shadow-md font-bold rounded-full",
        tabInactive: "bg-[#F2E8D8] hover:bg-[#EFE5D4] text-[#1F1F1F] border-[#1F1F1F]/15 rounded-full",
        artGlowRing: "from-[#1F1F1F]/30 via-[#3A3530]/20 to-[#1F1F1F]/30",
        artBorder: "border-[#1F1F1F]/15 shadow-[0_25px_60px_rgba(31,31,31,0.25)] rounded-3xl",
        stageTitle: "text-[#1F1F1F] drop-shadow-sm font-bold",
        stageArtist: "text-[#3A3530] font-medium",
        stageTagAccent: "bg-[#1F1F1F]/10 border-[#1F1F1F]/20 text-[#1F1F1F] rounded-full",
        stageTagNeutral: "bg-[#FAF5ED] border-[#1F1F1F]/15 text-[#666055] rounded-full",
        bottomDeck: "bg-[#FAF5ED]/98 border-[#1F1F1F]/15 text-[#1F1F1F] shadow-2xl ring-1 ring-[#1F1F1F]/10 rounded-3xl",
        seekbarTrack: "bg-[#1F1F1F]/18",
        seekbarFill: "bg-gradient-to-r from-[#1F1F1F] via-[#3A3530] to-[#1F1F1F]",
        seekbarThumb: "bg-[#1F1F1F] border-2 border-[#FAF5ED] shadow-[0_0_10px_rgba(31,31,31,0.5)]",
        seekbarGlow: "shadow-[#1F1F1F]/25",
        seekbarAccent: "accent-[#1F1F1F]",
        timeText: "text-[#666055]",
        playBtn: "bg-[#1F1F1F] hover:bg-[#3A3530] text-[#F2E8D8] shadow-[0_0_20px_rgba(31,31,31,0.3)] ring-4 ring-[#1F1F1F]/20 rounded-full",
        playIconFill: "fill-[#F2E8D8]",
        ctrlBtn: "bg-[#F2E8D8] hover:bg-[#EFE5D4] text-[#1F1F1F] border-[#1F1F1F]/15 shadow-sm rounded-full",
        activeText: "text-[#1F1F1F]",
        mutedText: "text-[#666055] hover:text-[#1F1F1F]",
        volSlider: "bg-[#F2E8D8] accent-[#1F1F1F]",
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
    setIsScrubbing(true);
    const newTime = calculateTargetTime(e, containerRef.current, duration);
    setScrubTime(newTime);
    onScrubbingChange?.(true, newTime);
  };

  // Dragging movement and release via global window listeners while scrubbing
  useEffect(() => {
    if (!isScrubbing) return;

    const handleWindowPointerMove = (e: PointerEvent) => {
      if (!isScrubbingRef.current) return;
      const newTime = calculateTargetTime(e, containerRef.current, duration);
      setScrubTime(newTime);
      onScrubbingChange?.(true, newTime);
    };

    const handleWindowPointerUp = (e: PointerEvent) => {
      if (!isScrubbingRef.current) return;
      const finalTime = calculateTargetTime(e, containerRef.current, duration);
      setIsScrubbing(false);
      setScrubTime(null);
      onScrubbingChange?.(false, null);
      if (!isNaN(finalTime) && finalTime >= 0) {
        onSeek(finalTime);
      }
    };

    const handleWindowPointerCancel = () => {
      if (!isScrubbingRef.current) return;
      setIsScrubbing(false);
      setScrubTime(null);
      onScrubbingChange?.(false, null);
    };

    window.addEventListener("pointermove", handleWindowPointerMove, { passive: false });
    window.addEventListener("pointerup", handleWindowPointerUp, { passive: false });
    window.addEventListener("pointercancel", handleWindowPointerCancel, { passive: false });

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerCancel);
    };
  }, [isScrubbing, duration, onSeek, onScrubbingChange]);

  const hasBespokeColors = Boolean(bespokeColors && bespokeColors.length >= 2);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        touchAction: "none",
        ...(hasBespokeColors ? ({ "--accent-primary": bespokeColors![1] } as React.CSSProperties) : {}),
      }}
      className={`progress-waveform-container group relative flex-1 ${isMini ? "h-8" : "h-8 sm:h-9"} flex items-center justify-between gap-[2px] sm:gap-[3px] cursor-pointer select-none touch-none py-1 px-2 rounded-xl ${designConfig.inputBg || "bg-black/30"} border ${designConfig.borderSubtle || "border-white/10"} hover:${designConfig.accentBorder || "border-white/30"} transition-all ${className}`}
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
                ...(hasBespokeColors && isPassed
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
        className={`progress-thumb-knob progress-handle-active ${isScrubbing ? "is-dragging opacity-100 scale-125" : ""} absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full pointer-events-none transition-all duration-75 ${
          isScrubbing || isHovered
            ? "opacity-100 scale-125"
            : "opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100"
        }`}
        style={{
          left: `${progressPercent}%`,
          background: hasBespokeColors
            ? `linear-gradient(135deg, ${bespokeColors![0]}, ${bespokeColors![1]})`
            : "linear-gradient(135deg, var(--accent-secondary, var(--accent-primary)), var(--accent-primary))",
          border: "2px solid #ffffff",
          boxShadow: hasBespokeColors
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
  onPlayQueue,
  onRegisterRadioQueue,
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

  // Equalizer Web Audio context & refs hook
  const {
    attachAudioElement,
    resumeAudioContext,
    audioCtxRef,
    sourceNodeRef,
    filtersRef,
    analyserRef,
    getAnalyser,
  } = useEqualizer();

  const fullPlayerContainerRef = useRef<HTMLDivElement | null>(null);
  const miniPlayerContainerRef = useRef<HTMLDivElement | null>(null);
  const currentBeatRef = useRef<number>(0);
  const rafBeatIdRef = useRef<number | null>(null);

  // Seek synchronization refs to prevent stale time updates and player clock collisions
  const lastSeekTimeRef = useRef<number | null>(null);
  const lastSeekTimestampRef = useRef<number>(0);
  const activeAudioSourceRef = useRef<"audio" | "youtube">("youtube");

  // Attach main <audio> element to Web Audio pipeline on mount
  useEffect(() => {
    if (audioRef.current) {
      attachAudioElement(audioRef.current);
    }
  }, [attachAudioElement]);

  // Video placeholder ref and dynamic screen bounds to prevent any overlap across PC, tablet, and mobile
  const videoPlaceholderRef = useRef<HTMLDivElement | null>(null);
  const [videoRect, setVideoRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

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

  // PC Mouse drag-to-close handlers for mini player
  const handleMiniMouseDown = (e: React.MouseEvent) => {
    // Only primary mouse button
    if (e.button !== 0) return;
    // Don't initiate drag when clicking on interactive controls (buttons, sliders, inputs, scrubber, artwork)
    const target = e.target as HTMLElement | null;
    if (target?.closest("button, input, a, [role='slider'], .waveform-bar, [data-interactive='true']")) {
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

  const isBespoke = Boolean(designConfig.id === "bespoke" || designConfig.isBespoke);

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

  useEffect(() => {
    if (designConfig.swatchColors && designConfig.swatchColors.length >= 4) {
      setBespokeColors([
        designConfig.swatchColors[0],
        designConfig.swatchColors[1],
        designConfig.swatchColors[2],
        designConfig.swatchColors[3],
      ]);
    }
  }, [designConfig.swatchColors]);

  const fpTheme = getFullPlayerThemeStyles(designConfig, isBespoke ? bespokeColors : undefined);

  const isPlayingRef = useRef<boolean>(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

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
    let silentFrameCount = 0;
    const energyHistory: number[] = [];
    const HISTORY_SIZE = 35; // ~0.5s sliding window at 60fps

    const renderBeatFrame = () => {
      if (!isSubscribed) return;

      const analyser = getAnalyser() || audioPlayer.getAnalyser();
      let beatIntensity = 0;
      let hasRealSignal = false;

      if (analyser) {
        try {
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          analyser.getByteFrequencyData(dataArray);

          const sampleRate = audioCtxRef.current?.sampleRate || 44100;
          const binWidth = sampleRate / analyser.fftSize;

          // Band 1: Sub & Bass Kick (30Hz - 160Hz)
          const minBassBin = Math.max(0, Math.floor(30 / binWidth));
          const maxBassBin = Math.min(bufferLength - 1, Math.ceil(160 / binWidth));
          let bassSum = 0;
          let bassCount = 0;
          for (let i = minBassBin; i <= maxBassBin; i++) {
            bassSum += dataArray[i];
            bassCount++;
          }
          const bassVal = bassCount > 0 ? bassSum / bassCount : 0;

          // Band 2: Punch & Snare / Rhythm Guitars (160Hz - 500Hz)
          const minMidBin = maxBassBin + 1;
          const maxMidBin = Math.min(bufferLength - 1, Math.ceil(500 / binWidth));
          let midSum = 0;
          let midCount = 0;
          for (let i = minMidBin; i <= maxMidBin; i++) {
            midSum += dataArray[i];
            midCount++;
          }
          const midVal = midCount > 0 ? midSum / midCount : 0;

          // Weighted combined rhythm energy
          const instantEnergy = bassVal * 0.7 + midVal * 0.3;

          if (instantEnergy > 2) {
            hasRealSignal = true;

            // Maintain rolling average of recent energy
            energyHistory.push(instantEnergy);
            if (energyHistory.length > HISTORY_SIZE) {
              energyHistory.shift();
            }
            const avgEnergy = energyHistory.reduce((a, b) => a + b, 0) / energyHistory.length;

            // Transient detection: Energy flux compared to rolling average
            // In heavy rock/metal, avgEnergy will be high, but kick drum or guitar onsets will still spike above average!
            const variance = Math.max(7, avgEnergy * 0.16);
            const flux = instantEnergy - avgEnergy;

            if (flux > variance) {
              // Hit / Transient detected!
              const hitStrength = Math.min(1, Math.max(0.45, flux / (variance * 2.0)));
              currentBeatRef.current = Math.max(currentBeatRef.current, hitStrength);
            } else {
              // Exponential decay between hits
              currentBeatRef.current = Math.max(0, currentBeatRef.current * 0.84 - 0.015);
            }

            // Also blend a subtle baseline energy so loud sections glow warmly
            const baselineGlow = Math.min(0.22, (instantEnergy / 255) * 0.22);
            beatIntensity = Math.min(1, Math.max(baselineGlow, currentBeatRef.current));
          }
        } catch (err) {
          console.warn("Analyser reading error:", err);
        }
      }

      if (!hasRealSignal) {
        silentFrameCount++;
        // If AnalyserNode is unavailable due to browser restrictions or iframe fallback,
        // drive active musical pulse at standard tempo (128 BPM = ~468ms period)
        if (silentFrameCount > 15) {
          fullPlayerContainerRef.current?.classList.add("beat-fallback-active");
          miniPlayerContainerRef.current?.classList.add("beat-fallback-active");

          const now = performance.now();
          const cycle = (now % 468) / 468;
          // Sharp attack at downbeat, exponential decay
          const pulse = Math.pow(Math.max(0, 1 - cycle * 1.8), 2.2);
          beatIntensity = Math.min(1, pulse * 0.85);
        } else {
          currentBeatRef.current = Math.max(0, currentBeatRef.current * 0.85);
          beatIntensity = currentBeatRef.current;
        }
      } else {
        silentFrameCount = 0;
        fullPlayerContainerRef.current?.classList.remove("beat-fallback-active");
        miniPlayerContainerRef.current?.classList.remove("beat-fallback-active");
      }

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
  }, [isPlaying, isMuted, volume, getAnalyser]);

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
      // Connect and start actual audio stream through HTML5 audio element & Web Audio 7-band Equalizer
      if (audioRef.current) {
        const streamUrl = `/api/youtube/stream/${targetVid}?title=${encodeURIComponent(currentTrack.title || "")}&artist=${encodeURIComponent(currentTrack.artist || "")}`;
        audioRef.current.crossOrigin = "anonymous";
        if (audioRef.current.getAttribute("data-track-vid") !== targetVid) {
          audioRef.current.setAttribute("data-track-vid", targetVid);
          audioRef.current.src = streamUrl;
          audioRef.current.load();
        }
        attachAudioElement(audioRef.current);
        if (isPlayingRef.current && !userManualPauseRef.current) {
          resumeAudioContext();
          audioRef.current.volume = isMuted ? 0 : volume;
          audioRef.current
            .play()
            .then(() => {
              activeAudioSourceRef.current = "audio";
              if (isYtReadyRef.current && ytPlayerRef.current) {
                ytPlayerRef.current.mute?.();
              }
            })
            .catch(() => {
              activeAudioSourceRef.current = "youtube";
              if (isYtReadyRef.current && ytPlayerRef.current) {
                ytPlayerRef.current.unMute?.();
                ytPlayerRef.current.setVolume?.(isMuted ? 0 : volume * 100);
              }
            });
        }
      }

      if (!isYtReadyRef.current || !ytPlayerRef.current) return;
      try {
        if (isPlayingRef.current && !userManualPauseRef.current) {
          ytPlayerRef.current.loadVideoById({
            videoId: targetVid,
            startSeconds: 0,
          });
          // If audio element is already playing, mute YouTube to prevent dual-audio
          if (audioRef.current && !audioRef.current.paused && audioRef.current.currentTime > 0) {
            ytPlayerRef.current.mute?.();
          } else {
            ytPlayerRef.current.unMute?.();
            ytPlayerRef.current.setVolume?.(isMuted ? 0 : volume * 100);
          }
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
              if (audioRef.current && !audioRef.current.paused) {
                event.target.mute?.();
              } else {
                event.target.unMute?.();
                event.target.setVolume?.(isMuted ? 0 : volume * 100);
              }
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
                if (audioRef.current && !audioRef.current.paused) {
                  event.target.mute?.();
                } else {
                  event.target.unMute?.();
                  event.target.setVolume?.(isMuted ? 0 : volume * 100);
                }
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

  // Sync isPlaying state to players and route real audio stream to HTML5 <audio> & 7-band Equalizer
  useEffect(() => {
    const finalVid = currentTrack?.youtubeVideoId || currentTrack?.id;

    if (audioRef.current) {
      if (audioRef.current.crossOrigin !== "anonymous") {
        audioRef.current.crossOrigin = "anonymous";
      }
      attachAudioElement(audioRef.current);

      if (finalVid) {
        const streamUrl = `/api/youtube/stream/${finalVid}?title=${encodeURIComponent(currentTrack?.title || "")}&artist=${encodeURIComponent(currentTrack?.artist || "")}`;
        if (audioRef.current.getAttribute("data-track-vid") !== finalVid) {
          audioRef.current.setAttribute("data-track-vid", finalVid);
          audioRef.current.src = streamUrl;
          audioRef.current.load();
        }
      }

      if (isPlaying) {
        resumeAudioContext();
        audioPlayer.resumeContext();
        audioRef.current.volume = isMuted ? 0 : volume;
        audioRef.current
          .play()
          .then(() => {
            activeAudioSourceRef.current = "audio";
            // Real audio stream is playing through <audio> and the 7-band Web Audio Equalizer!
            // Mute YouTube iframe video to prevent dual-audio echo
            if (isYtReadyRef.current && ytPlayerRef.current) {
              ytPlayerRef.current.mute?.();
              ytPlayerRef.current.playVideo?.();
            }
          })
          .catch((err) => {
            activeAudioSourceRef.current = "youtube";
            console.warn("[Player] <audio> play fallback to YouTube:", err);
            // Fallback: If audio stream couldn't play directly, unmute YouTube iframe so music still plays
            if (isYtReadyRef.current && ytPlayerRef.current) {
              ytPlayerRef.current.unMute?.();
              ytPlayerRef.current.setVolume?.(isMuted ? 0 : volume * 100);
              ytPlayerRef.current.playVideo?.();
            }
          });
      } else if (!isChangingTrackRef.current) {
        audioRef.current.pause();
        if (isYtReadyRef.current && ytPlayerRef.current) {
          try {
            ytPlayerRef.current.pauseVideo?.();
          } catch {}
        }
      }
    } else {
      if (isYtReadyRef.current && ytPlayerRef.current) {
        try {
          if (isPlaying) {
            ytPlayerRef.current.playVideo?.();
          } else if (!isChangingTrackRef.current) {
            ytPlayerRef.current.pauseVideo?.();
          }
        } catch {}
      }
    }
  }, [isPlaying, currentTrack?.id, currentTrack?.youtubeVideoId, attachAudioElement, resumeAudioContext, volume, isMuted]);

  // Sync volume state to players
  useEffect(() => {
    const effectiveVolume = isMuted ? 0 : volume;
    if (audioRef.current) {
      audioRef.current.volume = effectiveVolume;
    }
    if (isYtReadyRef.current && ytPlayerRef.current) {
      try {
        if (typeof ytPlayerRef.current.isMuted === "function" && !ytPlayerRef.current.isMuted()) {
          ytPlayerRef.current.setVolume?.(effectiveVolume * 100);
        }
      } catch {}
    }
  }, [volume, isMuted]);

  // Timer loop for YouTube current timestamp & progress (100ms when lyrics/fullscreen are visible for fluid sync)
  useEffect(() => {
    const pollRate = (showLyrics || isFullscreen) ? 100 : 250;
    const interval = setInterval(() => {
      // Suspend polling updates to UI when user is actively scrubbing
      if (isScrubbingRef.current) return;
      if (isPlaying && isYtReadyRef.current && ytPlayerRef.current) {
        try {
          const curTime = ytPlayerRef.current.getCurrentTime?.();
          const ytDur = ytPlayerRef.current.getDuration?.();
          const validDur = (ytDur && ytDur > 0) ? ytDur : (currentTrack?.duration || 0);

          // If recently sought, ignore YouTube updates until it settles close to seek target
          if (lastSeekTimeRef.current !== null && Date.now() - lastSeekTimestampRef.current < 1200) {
            if (typeof curTime === "number" && Math.abs(curTime - lastSeekTimeRef.current) > 2) {
              return; // Wait for YouTube seekTo to land
            }
          }

          // If <audio> is currently the active audio source AND is playing normally in sync, let <audio> drive time
          if (activeAudioSourceRef.current === "audio" && audioRef.current && !audioRef.current.paused && audioRef.current.currentTime > 0) {
            // Still check duration fallback
            if (validDur > 3 && typeof curTime === "number" && curTime >= validDur - 0.25 && !isChangingTrackRef.current) {
              handleEndedRef.current?.();
            }
            return;
          }

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
    }, pollRate);

    return () => clearInterval(interval);
  }, [isPlaying, showLyrics, isFullscreen, currentTrack?.id, currentTrack?.duration]);

  // User manual play/pause toggle handler
  const handleUserTogglePlay = (explicitPlay?: boolean) => {
    // Wake up / resume AudioContext on user gesture for reliable background playback and Web Audio EQ
    try {
      resumeAudioContext();
      equalizerManager.resume();
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
    // Suspend real-time audio position updates to UI when user is actively scrubbing
    if (isScrubbingRef.current) return;
    if (!audioRef.current) return;

    // If YouTube is active audio source, ignore HTML5 audio time updates
    if (activeAudioSourceRef.current === "youtube") return;

    const src = audioRef.current.src || "";
    // NEVER overwrite currentTime/duration if audio element is playing the silent keepalive WAV or data URL!
    if (!src || src.startsWith("data:audio/wav") || src.startsWith("blob:") || (cachedSilentUrl && src === cachedSilentUrl)) {
      return;
    }
    const audCur = audioRef.current.currentTime;
    const audDur = audioRef.current.duration;

    // Ignore stale updates during seek cooldown window
    if (lastSeekTimeRef.current !== null && Date.now() - lastSeekTimestampRef.current < 1200) {
      if (Math.abs(audCur - lastSeekTimeRef.current) > 2) {
        return; // Ignore stale pre-seek timeupdate
      }
    }

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
    // Ignore accidental ended event right after a seek
    if (lastSeekTimeRef.current !== null && Date.now() - lastSeekTimestampRef.current < 1500) {
      return;
    }
    handleEndedRef.current?.();
  };

  // Custom seek forward/back
  const handleSeekInternal = (time: number) => {
    if (isNaN(time) || time < 0) return;
    resumeAudioContext();

    // Set seek cooldown and record intended target time
    lastSeekTimeRef.current = time;
    lastSeekTimestampRef.current = Date.now();

    // Immediately update player state optimistically
    setPlayerState((prev) => ({ ...prev, currentTime: time }));

    // Seek YouTube player directly
    if (isYtReadyRef.current && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.seekTo?.(time, true);
      } catch {}
    }

    // Seek HTML5 audio element
    if (audioRef.current) {
      try {
        audioRef.current.currentTime = time;
      } catch {}
    }

    // Seek verification check:
    // If audio element failed to seek to the requested timestamp (e.g. snapped to 0:00),
    // immediately unmute YouTube and set YouTube as active source so user hears the music from `time`, NOT 0:00!
    setTimeout(() => {
      if (lastSeekTimeRef.current !== null && Math.abs(time - lastSeekTimeRef.current) < 0.1) {
        if (audioRef.current) {
          const audCur = audioRef.current.currentTime;
          // If sought forward (> 3s) but audio element is stuck near start (< 2s)
          if (time > 3 && audCur < 2) {
            console.warn("[Player] <audio> seek didn't advance, switching audio source to YouTube");
            activeAudioSourceRef.current = "youtube";
            try {
              audioRef.current.pause();
            } catch {}
            if (isYtReadyRef.current && ytPlayerRef.current) {
              try {
                ytPlayerRef.current.unMute?.();
                ytPlayerRef.current.setVolume?.(isMuted ? 0 : volume * 100);
                ytPlayerRef.current.seekTo?.(time, true);
                ytPlayerRef.current.playVideo?.();
              } catch {}
            }
          }
        }
      }
    }, 400);

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
          setVideoRect((prev) => {
            if (
              prev &&
              Math.abs(prev.top - rect.top) < 1 &&
              Math.abs(prev.left - rect.left) < 1 &&
              Math.abs(prev.width - rect.width) < 1 &&
              Math.abs(prev.height - rect.height) < 1
            ) {
              return prev;
            }
            return {
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            };
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
        {/* Ambient Depth Shadow & Dynamic Glow for Video */}
        {isVideoModeActive && (
          <>
            {/* Dynamic themed colored backlight glow */}
            <div className={`absolute -inset-2 sm:-inset-3 rounded-2xl sm:rounded-3xl bg-gradient-to-tr ${fpTheme.artGlowRing} blur-xl opacity-60 pointer-events-none`} />
            {/* Contained 3D atmospheric floor drop shadow */}
            <div className="absolute -inset-0.5 rounded-2xl sm:rounded-3xl shadow-[0_12px_28px_rgba(0,0,0,0.7),0_2px_8px_rgba(0,0,0,0.5)] pointer-events-none" />
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
        crossOrigin="anonymous"
        playsInline
        autoPlay
        onPlay={() => {
          resumeAudioContext();
        }}
        onPlaying={() => {
          resumeAudioContext();
        }}
        onSeeking={() => {
          resumeAudioContext();
        }}
        onSeeked={() => {
          resumeAudioContext();
        }}
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
          style={{
            transform: dragOffsetY > 0 ? `translate3d(0, ${dragOffsetY}px, 0)` : undefined,
            opacity: dragOffsetY > 0 ? Math.max(0.65, 1 - dragOffsetY / 500) : 1,
            transition: isDraggingDown ? "none" : "transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.25s ease",
            ...(isBespoke
              ? {
                  background: `radial-gradient(circle at 10% 10%, ${bespokeColors[0]} 0%, ${bespokeColors[2]} 40%, #050508 80%)`,
                }
              : {}),
          }}
          id="player-fullscreen-dock"
          data-theme={designConfig.id}
          className={`full-player-overlay fixed inset-0 z-[100] w-full h-[100dvh] max-h-[100dvh] ${fpTheme.bgCanvas} flex flex-col justify-between overflow-hidden select-none animate-fade-in`}
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
                className="absolute inset-0 opacity-40 mix-blend-screen filter blur-[90px] animate-nebula-aurora pointer-events-none transition-all duration-700"
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
            className={`relative z-20 shrink-0 flex flex-col px-3.5 pt-2 pb-2.5 sm:px-6 sm:py-3.5 border-b backdrop-blur-2xl ${fpTheme.topBar}`}
            style={isBespoke ? {
              background: `linear-gradient(180deg, ${hexToRgba(bespokeColors[0], 0.4)} 0%, rgba(10, 10, 16, 0.75) 100%)`,
              borderBottomColor: hexToRgba(bespokeColors[2], 0.3),
            } : undefined}
          >
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
                    ? (isBespoke ? "shadow-md" : "bg-white text-black shadow-md")
                    : "text-white/70 hover:text-white"
                }`}
                style={isBespoke && (playerState.mediaMode || "song") === "song" ? {
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
                    ? (isBespoke ? "shadow-md" : "bg-white text-black shadow-md")
                    : "text-white/70 hover:text-white"
                }`}
                style={isBespoke && playerState.mediaMode === "video" ? {
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
                onClick={() =>
                  setPlayerState((prev) => ({ ...prev, showLyrics: !prev.showLyrics, showSimilar: false }))
                }
                className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 sm:gap-1.5 border transition-all ${
                  showLyrics ? fpTheme.tabActive : fpTheme.tabInactive
                }`}
                style={isBespoke && showLyrics ? {
                  background: `linear-gradient(135deg, ${bespokeColors[0]}, ${bespokeColors[1]})`,
                  color: calculateWcagText(bespokeColors[1]),
                  borderColor: "transparent",
                  boxShadow: `0 0 16px ${hexToRgba(bespokeColors[1], 0.6)}`,
                } : undefined}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Lyrics</span>
              </button>

              <button
                onClick={() => {
                  setPlayerState((prev) => {
                    const nextShowSimilar = !prev.showSimilar;
                    if (nextShowSimilar && currentTrack) {
                      // Lock the seed track to the track that initiated the radio
                      setRadioSeedTrack(currentTrack);
                    }
                    return { ...prev, showSimilar: nextShowSimilar, showLyrics: false };
                  });
                }}
                className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 sm:gap-1.5 border transition-all ${
                  showSimilar ? fpTheme.tabActive : fpTheme.tabInactive
                }`}
                style={isBespoke && showSimilar ? {
                  background: `linear-gradient(135deg, ${bespokeColors[0]}, ${bespokeColors[1]})`,
                  color: calculateWcagText(bespokeColors[1]),
                  borderColor: "transparent",
                  boxShadow: `0 0 16px ${hexToRgba(bespokeColors[1], 0.6)}`,
                } : undefined}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Radio</span>
              </button>
            </div>
          </div>
        </div>

          {/* Main Fullscreen Center Body */}
          <div className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center px-3 py-1 sm:px-6 sm:py-3 overflow-hidden">
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
              <div className="w-full max-w-md h-full flex flex-col items-center justify-center py-1 sm:py-2">
                {/* Radio Pop-Up Window */}
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
            ) : playerState.mediaMode === "video" ? (
              /* Music Video Mode on Center Stage */
              <div className="flex flex-col items-center justify-center max-w-2xl w-full animate-fade-in my-auto py-0.5">
                {/* 16:9 Video Placeholder - exact bounding frame synchronized with YouTube wrapper with dynamic ambient glow */}
                <div
                  ref={videoPlaceholderRef}
                  className={`w-[min(88vw,480px)] aspect-video max-h-[26vh] sm:max-h-[34vh] md:max-h-[40vh] rounded-2xl sm:rounded-3xl shrink-0 pointer-events-none artwork-glow-dynamic border-2 ${fpTheme.artBorder}`}
                  style={isBespoke ? {
                    boxShadow: `0 0 35px ${bespokeColors[0]}, 0 0 70px ${bespokeColors[1]}`,
                  } : undefined}
                />

                {/* Song Title, Artist, & Master Video Tags - lowered with clean gap below the video screen and clear of shadows */}
                <div className="relative z-30 text-center space-y-0.5 sm:space-y-1.5 max-w-[min(90vw,480px)] w-full px-2 mt-2.5 sm:mt-4 pt-0.5">
                  <MarqueeText
                    as="h2"
                    text={cleanTrackTitle(currentTrack.title, currentTrack.artist)}
                    className={`text-sm sm:text-xl md:text-2xl font-semibold tracking-normal ${fpTheme.stageTitle} text-center leading-tight`}
                    containerClassName="w-full mx-auto text-center"
                    speed={30}
                  />
                  <MarqueeText
                    as="p"
                    text={currentTrack.artist || "Unknown Artist"}
                    className={`text-xs sm:text-sm font-normal tracking-wide ${fpTheme.stageArtist} text-center`}
                    containerClassName="w-full mx-auto text-center"
                    style={isBespoke ? { color: bespokeColors[1] } : undefined}
                    speed={26}
                  />
                  <div className="flex items-center justify-center gap-1.5 pt-0.5">
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] sm:text-[11px] font-mono flex items-center gap-1 ${fpTheme.stageTagNeutral}`}>
                      <Video className="w-3 h-3 text-red-500" />
                      <span>Official Music Video</span>
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full border text-[10px] sm:text-[11px] font-mono ${fpTheme.stageTagAccent}`}
                      style={isBespoke ? {
                        borderColor: hexToRgba(bespokeColors[1], 0.5),
                        color: bespokeColors[1],
                        backgroundColor: hexToRgba(bespokeColors[0], 0.2),
                      } : undefined}
                    >
                      HD 1080p
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Audio / Song Mode: Central HD Album Artwork & Dynamic Stage */
              <div className="flex flex-col items-center justify-center max-w-md w-full animate-fade-in my-auto py-0.5">
                {/* HD Cover Art with Dynamic Pulsing Color-Shifting Ambient Glow Aura */}
                <div className="relative group flex items-center justify-center">
                  {/* Dynamic themed colored backlight aura */}
                  <div
                    className={`absolute -inset-2.5 sm:-inset-4 rounded-[2.5rem] artwork-glow-dynamic opacity-75 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`}
                    style={isBespoke ? {
                      background: `linear-gradient(135deg, ${hexToRgba(bespokeColors[0], 0.6)}, ${hexToRgba(bespokeColors[1], 0.6)})`,
                      filter: "blur(24px)",
                      boxShadow: `0 0 45px ${bespokeColors[0]}, 0 0 90px ${bespokeColors[1]}`,
                    } : undefined}
                  />

                  {/* Contained 3D atmospheric floor drop shadow */}
                  <div className="absolute -inset-0.5 rounded-3xl shadow-[0_12px_28px_rgba(0,0,0,0.7),0_2px_8px_rgba(0,0,0,0.5)] pointer-events-none" />

                  <div className={`relative w-[min(48vw,200px)] h-[min(48vw,200px)] xs:w-[min(54vw,220px)] xs:h-[min(54vw,220px)] sm:w-64 sm:h-64 md:w-72 md:h-72 max-h-[26vh] sm:max-h-[32vh] aspect-square rounded-3xl overflow-hidden border-2 ${fpTheme.artBorder} artwork-glow-dynamic shadow-[0_16px_36px_rgba(0,0,0,0.7)]`}>
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

                {/* Song Title, Artist, & Master Quality Tag - lowered with clean gap below album artwork and clear of shadows */}
                <div className="relative z-30 text-center space-y-0.5 sm:space-y-1.5 max-w-[min(90vw,480px)] w-full px-2 mt-2.5 sm:mt-4 pt-0.5">
                  <MarqueeText
                    as="h2"
                    text={cleanTrackTitle(currentTrack.title, currentTrack.artist)}
                    className={`text-sm sm:text-xl md:text-2xl font-bold tracking-tight ${fpTheme.stageTitle} text-center leading-tight`}
                    containerClassName="w-full mx-auto text-center"
                    speed={30}
                  />
                  <MarqueeText
                    as="p"
                    text={currentTrack.artist || "Unknown Artist"}
                    className={`text-xs sm:text-sm font-semibold ${fpTheme.stageArtist} text-center`}
                    containerClassName="w-full mx-auto text-center"
                    style={isBespoke ? { color: bespokeColors[1] } : undefined}
                    speed={26}
                  />
                  <div className="flex items-center justify-center gap-1.5 pt-0.5">
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] sm:text-[11px] font-mono ${fpTheme.stageTagNeutral}`}>
                      {currentTrack.album || "Oblivion HD"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full border text-[10px] sm:text-[11px] font-mono ${fpTheme.stageTagAccent}`}
                      style={isBespoke ? {
                        borderColor: hexToRgba(bespokeColors[1], 0.5),
                        color: bespokeColors[1],
                        backgroundColor: hexToRgba(bespokeColors[0], 0.2),
                      } : undefined}
                    >
                      Lossless Audio
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fullscreen Player Controls Bar - Unified Designer Deck matching Mini Player */}
          <div
            className={`relative z-20 shrink-0 p-2.5 sm:p-4 pb-4 sm:pb-6 border-t backdrop-blur-2xl space-y-2 sm:space-y-3 max-w-3xl mx-auto w-full rounded-t-3xl ${fpTheme.bottomDeck}`}
            style={isBespoke ? {
              background: `linear-gradient(180deg, ${hexToRgba(bespokeColors[0], 0.45)} 0%, rgba(10, 10, 16, 0.9) 100%)`,
              borderTopColor: hexToRgba(bespokeColors[2], 0.35),
            } : undefined}
          >
            {/* Top Row Controls: Like, Add, Prev, Play/Pause, Next, Shuffle, Repeat, Volume */}
            <div className="flex items-center justify-between gap-1.5 sm:gap-2">
              {/* Left Group: Like, Add to Playlist */}
              <div className="flex-1 flex items-center justify-start gap-1 sm:gap-1.5">
                <button
                  onClick={() => onToggleLike(currentTrack.id)}
                  className={`p-2 sm:p-2.5 rounded-xl border transition-all active:scale-95 ${
                    isLiked
                      ? "bg-rose-500/20 text-rose-500 border-rose-500/30"
                      : fpTheme.ctrlBtn
                  }`}
                  style={isLiked && isBespoke ? {
                    backgroundColor: hexToRgba(bespokeColors[1], 0.2),
                    borderColor: hexToRgba(bespokeColors[1], 0.4),
                    color: bespokeColors[1],
                  } : undefined}
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

              {/* Center Group: Previous (Back), Play/Pause in Center, Next (Forward) */}
              <div className="flex items-center justify-center gap-2 sm:gap-4 shrink-0">
                <button
                  onClick={onPrevTrack}
                  className={`p-2 sm:p-2.5 rounded-xl border transition-all active:scale-95 ${fpTheme.ctrlBtn}`}
                  title="Previous Song"
                >
                  <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                <button
                  onClick={() => handleUserTogglePlay()}
                  className={`w-11 h-11 sm:w-13 sm:h-13 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg ${fpTheme.playBtn}`}
                  style={isBespoke ? {
                    background: `linear-gradient(135deg, ${bespokeColors[0]}, ${bespokeColors[1]})`,
                    color: calculateWcagText(bespokeColors[1]),
                    boxShadow: `0 0 26px ${hexToRgba(bespokeColors[1], 0.6)}`,
                  } : undefined}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause className={`w-5 h-5 sm:w-6 sm:h-6 ${fpTheme.playIconFill}`} />
                  ) : (
                    <Play className={`w-5 h-5 sm:w-6 sm:h-6 ${fpTheme.playIconFill} ml-0.5`} />
                  )}
                </button>

                <button
                  onClick={onNextTrack}
                  className={`p-2 sm:p-2.5 rounded-xl border transition-all active:scale-95 ${fpTheme.ctrlBtn}`}
                  title="Next Song"
                >
                  <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* Right Group: Remaining controls sitting after Forward/Next (Shuffle, Repeat, Volume) */}
              <div className="flex-1 flex items-center justify-end gap-1.5 sm:gap-2">
                <button
                  onClick={() =>
                    setPlayerState((prev) => ({ ...prev, isShuffle: !prev.isShuffle }))
                  }
                  className={`p-1.5 sm:p-2 rounded-xl transition-all active:scale-95 ${
                    isShuffle ? fpTheme.activeText : fpTheme.mutedText
                  }`}
                  style={isShuffle && isBespoke ? { color: bespokeColors[1] } : undefined}
                  title={isShuffle ? "Shuffle is ON" : "Shuffle is OFF"}
                >
                  <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                <button
                  onClick={cycleRepeatMode}
                  className={`p-1.5 sm:p-2 rounded-xl transition-all active:scale-95 ${
                    repeatMode !== "off" ? fpTheme.activeText : fpTheme.mutedText
                  }`}
                  style={repeatMode !== "off" && isBespoke ? { color: bespokeColors[1] } : undefined}
                  title={`Repeat: ${repeatMode}`}
                >
                  {repeatMode === "one" ? <Repeat1 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>

                {/* Volume Slider on sm+ screens */}
                <div className="hidden sm:flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      setPlayerState((prev) => ({ ...prev, isMuted: !prev.isMuted }))
                    }
                    className={`p-1.5 transition-colors ${fpTheme.mutedText}`}
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
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
                    style={isBespoke ? { accentColor: bespokeColors[1] } : undefined}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Row: Waveform Scrubber & Timestamps matching Mini Player */}
            <div className="flex items-center gap-3 pt-0.5">
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

              <div className={`player-time-display text-[11px] sm:text-xs font-mono font-medium ${designConfig.textMuted || fpTheme.timeText || "text-slate-400"} shrink-0 whitespace-nowrap`}>
                <span>{Math.floor((isScrubbing && scrubTime !== null ? scrubTime : currentTime) / 60)}:{String(Math.floor((isScrubbing && scrubTime !== null ? scrubTime : currentTime) % 60)).padStart(2, "0")}</span>
                <span className="mx-1">/</span>
                <span>{Math.floor(((duration && duration > 0) ? duration : (currentTrack?.duration || 0)) / 60)}:{String(Math.floor(((duration && duration > 0) ? duration : (currentTrack?.duration || 0)) % 60)).padStart(2, "0")}</span>
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
              ...(isBespoke
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
            className={`fixed bottom-16 md:bottom-4 left-1/2 w-[calc(100%-24px)] md:w-[680px] max-w-2xl ${designConfig.cardBg} ${isBespoke ? "" : "backdrop-blur-2xl"} border ${designConfig.borderSubtle} rounded-2xl p-3 px-4 flex flex-col gap-2.5 z-40 select-none shadow-2xl ring-1 ${designConfig.accentBorder}`}
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
                className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 border ${designConfig.borderSubtle} shadow-sm bg-slate-800 flex items-center justify-center cursor-pointer group`}
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
                    className={`text-xs sm:text-sm font-bold ${designConfig.textPrimary} group-hover:${designConfig.accentText} transition-colors text-center`}
                    containerClassName="w-full max-w-[200px] xs:max-w-[250px] sm:max-w-[320px] mx-auto text-center"
                    speed={28}
                  />
                  <MarqueeText
                    text={`${currentTrack.artist} • HD Studio`}
                    className={`text-[10px] sm:text-[11px] ${designConfig.textMuted} text-center`}
                    containerClassName="w-full max-w-[180px] xs:max-w-[220px] sm:max-w-[280px] mx-auto text-center"
                    speed={24}
                  />
                </div>

                {/* Center Playback Controls: Back Navigation Button, Play/Pause in Center, Forward/Next Navigation Button */}
                <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 shrink-0">
                  <button
                    onClick={onPrevTrack}
                    className={`p-1.5 sm:p-2 rounded-xl transition-all active:scale-95 ${designConfig.textMuted} hover:${designConfig.textPrimary}`}
                    title="Previous"
                  >
                    <SkipBack className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </button>

                  <button
                    onClick={() => handleUserTogglePlay()}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full ${isBespoke ? "" : designConfig.btnPrimary} text-white flex items-center justify-center shadow-md transition-transform active:scale-95 shrink-0`}
                    style={
                      isBespoke
                        ? {
                            background: "var(--bespoke-mini-player-play-bg, #0f172a)",
                            color: "var(--bespoke-mini-player-play-icon, #ffffff)",
                          }
                        : undefined
                    }
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 sm:w-4.5 sm:h-4.5" style={isBespoke ? { fill: "var(--bespoke-mini-player-play-icon, #ffffff)", stroke: "var(--bespoke-mini-player-play-icon, #ffffff)" } : { fill: "white" }} />
                    ) : (
                      <Play className="w-4 h-4 sm:w-4.5 sm:h-4.5 ml-0.5" style={isBespoke ? { fill: "var(--bespoke-mini-player-play-icon, #ffffff)", stroke: "var(--bespoke-mini-player-play-icon, #ffffff)" } : { fill: "white" }} />
                    )}
                  </button>

                  <button
                    onClick={onNextTrack}
                    className={`p-1.5 sm:p-2 rounded-xl transition-all active:scale-95 ${designConfig.textMuted} hover:${designConfig.textPrimary}`}
                    title="Next"
                  >
                    <SkipForward className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </button>
                </div>
              </div>

              {/* Right: Remaining buttons sitting after Forward/Next button (Shuffle, Repeat, Like, Add, Expand) */}
              <div className="flex items-center justify-end gap-0.5 sm:gap-1 shrink-0">
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
                  onClick={cycleRepeatMode}
                  className={`p-1.5 transition-colors ${
                    repeatMode !== "off" ? designConfig.accentText : `${designConfig.textMuted} hover:${designConfig.textPrimary}`
                  }`}
                  title={`Repeat: ${repeatMode}`}
                >
                  {repeatMode === "one" ? <Repeat1 className="w-3.5 h-3.5" /> : <Repeat className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={() => onToggleLike(currentTrack.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                  title="Favorite"
                >
                  <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`} />
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
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                <button
                  onClick={() => setPlayerState((prev) => ({ ...prev, isFullscreen: true }))}
                  className={`p-1.5 ${designConfig.textMuted} hover:${designConfig.textPrimary} transition-colors`}
                  title="Full View"
                >
                  <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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

              <div className={`player-time-display text-[11px] font-mono font-medium ${designConfig.textMuted} shrink-0 whitespace-nowrap`}>
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
    </>
  );
};
