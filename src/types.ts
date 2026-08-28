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

export interface YouTubeThumbnailItem {
  url: string;
  width?: number;
  height?: number;
}

export interface YouTubeThumbnails {
  maxres?: YouTubeThumbnailItem;
  standard?: YouTubeThumbnailItem;
  high?: YouTubeThumbnailItem;
  medium?: YouTubeThumbnailItem;
  default?: YouTubeThumbnailItem;
}

export interface Playlist {
  id: string;
  playlistId?: string;
  title: string;
  description: string;
  coverUrl: string;
  customCoverUrl?: string;
  isCustomCover?: boolean;
  isYouTubeSynced?: boolean;
  tracksCount: number;
  updatedAt?: string;
  tracks: Track[];
  artist?: string;
  isAlbum?: boolean;
  thumbnails?: YouTubeThumbnails;
  privacy?: "PUBLIC" | "UNLISTED" | "PRIVATE" | string;
  privacyStatus?: string;
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
  accessToken?: string;
}

export interface LyricLine {
  time: number; // seconds
  text: string;
}

export type ThemePreset = 
  | 'designer-ivory'
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

export type PlayerBackgroundAnimation = 
  | 'ambient-drift'  // 1. Ambient Zoom & Drift (Cinematic slow Ken Burns zoom, pan & floating aura)
  | 'aurora-pulse'   // 2. Aurora Pulse (Breathing fluid gradient chromatic pulsation)
  | 'orbital-flow'   // 3. Orbital Flow (Rotating dynamic glowing orbital color rings & blurred canvas wave)
  | 'off';           // 4. Off (Static clean backdrop without motion)

export type MiniPlayerLayout = 
  | 'designer-waveform'  // Option 6: Designer Floating Ivory Dock with Golden Waveform
  | 'floating-dock'      // Option 1: Floating Glass Pill Deck (Default modern floating capsule)
  | 'ytmusic-classic'    // Option 2: YouTube Music Standard Edge-to-Edge with top progress bar
  | 'minimal-capsule'    // Option 3: Minimal Ultra-Compact Dynamic Island Capsule
  | 'card-expanded'      // Option 4: Cyberpunk Holographic Card with waveform & quick actions
  | 'split-slider';      // Option 5: Gestural Wave & Scrub Split Controller

export type FullAppDesignId = 
  | 'designer'           // 1. Designer (Off-White Studio Canvas, Shadows, Gold Accents & Emerald Backdrop)
  | 'cyberpunk-neon'     // 2. Cyberpunk Neon Glass (Futuristic Obsidian & Electric Cyan)
  | 'ytmusic-red'        // 3. YouTube Music Red (Authentic Edge-to-Edge Studio Dark)
  | 'dynamic-emerald'    // 4. Dynamic Island Emerald (Ultra-Minimalist Monolith & Jade Pulse)
  | 'audiophile-gold'    // 5. Studio Audiophile Gold (Warm Carbon, Vinyl Gold & VU Meter)
  | 'twilight-vaporwave'; // 6. Twilight Vaporwave (Sunset Violet, Rose Glass & Ambient Aura)

export interface UserSettings {
  audioQuality: AudioQuality;
  crossfadeDuration: number; // 0 - 10s
  normalizeVolume: boolean;
  autoPlaySimilar: boolean;
  backgroundPlay: boolean;
  themePreset: ThemePreset;
  miniPlayerLayout: MiniPlayerLayout;
  fullAppDesign: FullAppDesignId;
  playerBackgroundAnimation: PlayerBackgroundAnimation;
  animationDriftSpeed?: number;   // 1. Ambient Zoom & Drift duration in seconds (default: 6s)
  animationAuroraSpeed?: number;  // 2. Aurora Pulse duration in seconds (default: 6s)
  animationOrbitalSpeed?: number; // 3. Orbital Flow duration in seconds (default: 6s)
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
  mediaMode?: 'song' | 'video'; // Audio (Song) vs Music Video Mode in Full Player
  likedTrackIds: string[];
}

export type NavTab = 'home' | 'explore' | 'library' | 'search' | 'settings';

