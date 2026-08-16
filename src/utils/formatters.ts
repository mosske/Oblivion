import { Track } from "../types";

/**
 * Cleans YouTube video titles to extract the clean track title.
 * Examples:
 * - "Sergio Mendes & Brasil '77 - Mas Que Nada" -> "Mas Que Nada"
 * - "The Beatles - Hey Jude (Official Audio)" -> "Hey Jude"
 */
export function cleanTrackTitle(rawTitle: string, artistName?: string): string {
  if (!rawTitle) return "Untitled Track";
  let title = rawTitle.trim();

  // Strip common YouTube suffix badges
  title = title
    .replace(/\s*[\(\[]\s*(official\s*(music\s*)?(video|audio|lyric\s*video|hd|4k|stream)?|hd|4k|remastered|lyric\s*video|audio|visualizer)\s*[\)\]]/gi, "")
    .trim();

  // If artist is provided, check if title starts with artist name followed by delimiter
  if (artistName && artistName.trim()) {
    const cleanArtist = artistName.trim();
    if (title.toLowerCase().startsWith(cleanArtist.toLowerCase())) {
      const rest = title.slice(cleanArtist.length).trim();
      const match = rest.match(/^[-\s:|~–—]+(.+)$/);
      if (match && match[1] && match[1].trim()) {
        return match[1].trim();
      }
    }
  }

  // General "Artist Name - Song Title" check
  const parts = title.split(/\s+[-–—:|~]\s+/);
  if (parts.length >= 2) {
    const leftPart = parts[0].trim();
    const rightPart = parts.slice(1).join(" - ").trim();

    // If left side matches artist/channel name
    if (artistName && (
      leftPart.toLowerCase().includes(artistName.toLowerCase()) ||
      artistName.toLowerCase().includes(leftPart.toLowerCase())
    )) {
      if (rightPart) return rightPart;
    }

    // If 2 parts and rightPart is non-empty
    if (parts.length === 2 && rightPart) {
      return rightPart;
    }
  }

  return title || rawTitle;
}

/**
 * Returns the track audio URL or stream endpoint without mock data.
 */
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

