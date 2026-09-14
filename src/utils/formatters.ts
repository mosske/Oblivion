import { Track } from "../types";
import {
  sanitizeLyricsQuery,
  cleanArtistName,
  extractPrimaryArtist,
  cleanTrackTitle as sanitizeCleanTrackTitle,
  fixMojibakeAndEntities,
} from "./lyricsSanitizer";

export { fixMojibakeAndEntities, cleanArtistName, extractPrimaryArtist };

/**
 * Cleans YouTube video titles to extract and display the complete, true song title.
 * Automatically decodes HTML entities (like &#39; &#x27;) and fixes Windows-1252 / Mojibake artifacts (like can't, don't).
 * Preserves compound titles, subtitles with colons (e.g. "Subway: The Series", "Star Wars: Duel of the Fates", "10:35"),
 * featured artist mentions, chapter numbers, and roman numerals, while removing extraneous video wrappers like
 * (Official Video), (Official Audio), [Lyric Video], [MV], etc.
 */
export function cleanTrackTitle(rawTitle?: string, artistName?: string): string {
  if (!rawTitle) return "Untitled Track";
  return sanitizeCleanTrackTitle(rawTitle, artistName);
}

/**
 * Returns high-definition cover art from YouTube Music or album covers
 */
export function getHdCoverUrl(url?: string): string {
  if (!url) return "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=95";
  // YouTube Music image dimension upscaling
  if (url.includes("googleusercontent.com") || url.includes("ggpht.com")) {
    return url.replace(/=w\d+-h\d+[^"]*/, "=w1200-h1200-l90-rj").replace(/=s\d+[^"]*/, "=s1200");
  }
  // YouTube video thumbnail max resolution with hqdefault fallback
  if (url.includes("ytimg.com/vi/")) {
    return url.replace(/\/(default|mqdefault|sddefault)\.jpg/, "/hqdefault.jpg");
  }
  return url;
}

/**
 * Parses raw video title and uploader/channel info into disambiguated { title, artist, uploader }.
 * Strictly separates the true performing artist from the YouTube channel/uploader.
 */
export function parseTrackMetadata(
  rawTitle: string,
  rawUploaderOrArtist?: string
): { title: string; artist: string; uploader?: string } {
  const uploader = rawUploaderOrArtist?.trim();
  if (!rawTitle) {
    return {
      title: "Untitled Track",
      artist: cleanArtistName(uploader) || "Unknown Artist",
      uploader,
    };
  }

  const sanitized = sanitizeLyricsQuery(rawTitle, rawUploaderOrArtist);
  return {
    title: sanitized.cleanTitle,
    artist: sanitized.cleanArtist,
    uploader,
  };
}

export function getPlayableAudioUrl(track: Track | null | undefined): string {
  if (!track) return "";
  if (track.audioUrl && (track.audioUrl.startsWith("http") || track.audioUrl.startsWith("blob:") || track.audioUrl.startsWith("/api/"))) {
    return track.audioUrl;
  }
  const videoId = track.youtubeVideoId || track.id;
  if (videoId) {
    return `/api/youtube/stream/${videoId}`;
  }
  return "";
}

