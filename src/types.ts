export interface Track {
  id: string;
  youtubeVideoId?: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  coverUrl: string;
  audioUrl: string;
  genre?: string;
  playsCount?: number;
  lyricsRaw?: string;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  isYouTubeSynced?: boolean;
  tracksCount: number;
  updatedAt: string;
  tracks: Track[];
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  releaseYear: string;
  tracksCount: number;
  tracks?: Track[];
}

export interface Artist {
  id: string;
  name: string;
  avatarUrl: string;
  subscribers?: string;
  bio?: string;
  topTracks?: Track[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
  isLoggedIn: boolean;
}

export interface LyricLine {
  time: number; // seconds
  text: string;
}

export type ThemePreset = 
  | 'oblivion-dark' 
  | 'cyberpunk' 
  | 'midnight-blue' 
  | 'oled-black' 
  | 'emerald-synth' 
  | 'sunset-horizon' 
  | 'rose-gold' 
  | 'minimal-light';
export type AudioQuality = 'normal' | 'high' | 'lossless';
export type LyricsFontSize = 'sm' | 'md' | 'lg';
export type LyricsAlignment = 'left' | 'center';

export interface UserSettings {
  audioQuality: AudioQuality;
  crossfadeDuration: number; // 0 - 10s
  normalizeVolume: boolean;
  autoPlaySimilar: boolean;
  themePreset: ThemePreset;
  compactMode: boolean;
  lyricsFontSize: LyricsFontSize;
  lyricsAlignment: LyricsAlignment;
  autoDownloadFavorites: boolean;
  maxCacheSizeMB: number;
}

export interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  isPlaying: boolean;
  volume: number; // 0 to 1
  isMuted: boolean;
  currentTime: number;
  duration: number;
  repeatMode: 'off' | 'one' | 'all';
  isShuffle: boolean;
  isFullscreen: boolean;
  showLyrics: boolean;
  showQueue: boolean;
  showSimilar: boolean;
  likedTrackIds: string[];
}
