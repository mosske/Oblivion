export interface Track {
  id: string;
  youtubeId?: string;
  youtubeVideoId?: string;
  playlistItemId?: string;
  title: string;
  artist: string;
  uploader?: string;
  album: string;
  duration: number; // in seconds
  coverUrl: string;
  thumbnail?: string; // Track cover/thumbnail alias
  audioUrl: string;
  genre?: string;
  playsCount?: number;
  lyricsRaw?: string;
  isVideo?: boolean;
  channelTitle?: string;
  mediaType?: "song" | "video";
  publishedText?: string;
  publishedAt?: string;
  durationText?: string;
  isUnavailable?: boolean;
  isInvalid?: boolean;
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

export interface PlaylistSnippet {
  title?: string;
  description?: string;
  thumbnails?: YouTubeThumbnails;
  publishedAt?: string;
  channelId?: string;
  channelTitle?: string;
}

export interface Playlist {
  id: string;
  playlistId?: string;
  title: string;
  description: string;
  coverUrl: string;
  thumbnail?: string; // Official thumbnail alias
  customCoverUrl?: string;
  customArtwork?: string; // Custom artwork mapping alias
  isCustomCover?: boolean;
  isYouTubeSynced?: boolean;
  itemCount?: number;
  trackCount?: number;
  tracksCount: number;
  contentDetails?: {
    itemCount?: number;
  };
  updatedAt?: string;
  tracks: Track[];
  artist?: string;
  isAlbum?: boolean;
  thumbnails?: YouTubeThumbnails;
  snippet?: PlaylistSnippet;
  privacy?: "PUBLIC" | "UNLISTED" | "PRIVATE" | string;
  privacyStatus?: string;
  type?: "playlist" | "album" | string;
  isUserCreated?: boolean;
  isEditable?: boolean;
  badge?: string;
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
  refreshToken?: string;
  refresh_token?: string;
}

export interface LyricLine {
  time: number; // seconds
  text: string;
  subText?: string; // Optional secondary line for interleaved dual-line display (romanized)
}

export type LyricsMode = 'original' | 'romanized';

export type ThemePreset = 
  | 'designer-ivory'
  | 'oblivion-dark' 
  | 'cyberpunk' 
  | 'midnight-blue' 
  | 'oled-black' 
  | 'emerald-synth' 
  | 'sunset-horizon' 
  | 'rose-gold' 
  | 'candyland-pastel'
  | 'minimal-light'
  | 'neue-editorial'
  | 'obsidian-depth'
  | 'nebula-liquid-glass'
  | 'sugar-time-jazz'
  | 'bespoke';
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
  | 'cyberpunk-neon'     // 2. Cyberpunk Neon Glass (Futuristic Obsidian & Electric Cyan/Magenta Multi-Accent)
  | 'candyland'          // 3. Candyland Pastel (Vibrant Light Mode, Sugar-Glass, Bubblegum Pink & Sweet Berry Text)
  | 'ytmusic-red'        // Legacy alias for Candyland
  | 'dynamic-emerald'    // 4. Emerald Wilderness (Living Nature Scenes, Frosted Wilderness Glass & Warm Fireflies)
  | 'audiophile-gold'    // 5. Studio Homme Mosaïque (Dark Midnight Blue, Slate Blue-Grey, Smoked Glass & Mocha Mousse)
  | 'twilight-vaporwave' // 6. Twilight Vaporwave (Sunset Violet, Rose Glass & Sunset Magenta Multi-Accent)
  | 'neue-editorial'    // 7. Neue Editorial (Swiss High-Contrast, Pale Beige & Charcoal Pills)
  | 'obsidian-depth'    // 8. Obsidian Depth (Matte Slate, Soft 3D Extrusion & Neon Cyan)
  | 'nebula-liquid-glass' // 9. Nebula Liquid Glass (Deep Cosmic Void, Translucent Liquid Glass & Violet/Cyan Glow)
  | 'sugar-time-jazz'    // 10. Sugar Time Jazz (Warm Tan to Dark Chocolate, Purple Back-Glow & Frosted Glass)
  | 'bespoke';           // 11. Bespoke (Customizable Liquid Glass Canvas with 4 User-Selected Theme Colors)

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
  lyricsDualLine?: boolean;
  lyricsDefaultMode?: LyricsMode;
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

