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
      artist: uploader || "Unknown Artist",
      uploader,
    };
  }

  let cleaned = rawTitle.trim();
  // Strip YouTube badges
  cleaned = cleaned
    .replace(/\s*[\(\[]\s*(official\s*(music\s*)?(video|audio|lyric\s*video|hd|4k|stream)?|hd|4k|remastered|lyric\s*video|audio|visualizer)\s*[\)\]]/gi, "")
    .trim();

  // Pattern: "Artist - Title" or "Artist : Title" or "Artist ~ Title"
  const splitMatch = cleaned.match(/^(.+?)\s+[-–—:|~]\s+(.+)$/);
  if (splitMatch) {
    const extractedArtist = splitMatch[1].trim();
    let extractedTitle = splitMatch[2].trim();
    // Clean trailing quotes if any
    extractedTitle = extractedTitle.replace(/^["']|["']$/g, "").trim();

    if (extractedArtist && extractedTitle) {
      return {
        title: extractedTitle,
        artist: extractedArtist,
        uploader,
      };
    }
  }

  // If title did not have a separator, but uploader is known and clean:
  // Strip common channel suffixes like " - Topic", "VEVO", "Official"
  let cleanArtist = uploader || "Unknown Artist";
  if (cleanArtist.endsWith(" - Topic")) {
    cleanArtist = cleanArtist.replace(/ - Topic$/, "").trim();
  } else if (cleanArtist.toLowerCase().endsWith("vevo")) {
    cleanArtist = cleanArtist.replace(/vevo$/i, "").trim();
  }

  return {
    title: cleaned || rawTitle,
    artist: cleanArtist || "Unknown Artist",
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

