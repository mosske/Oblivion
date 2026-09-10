import { Track } from "../types";
import { sanitizeLyricsQuery, cleanArtistName, extractPrimaryArtist } from "./lyricsSanitizer";

/**
 * Cleans YouTube video titles to extract and display the complete, true song title.
 * Preserves compound titles, subtitles with colons (e.g. "Subway: The Series", "Star Wars: Duel of the Fates", "10:35"),
 * featured artist mentions, chapter numbers, and roman numerals, while removing extraneous video wrappers like
 * (Official Video), (Official Audio), [Lyric Video], [MV], etc.
 */
export function cleanTrackTitle(rawTitle?: string, artistName?: string): string {
  if (!rawTitle) return "Untitled Track";
  let title = String(rawTitle).trim();

  // Strip purely video-hosting wrapper tags
  title = title
    .replace(/\s*[\(\[]\s*(?:official\s*(?:music\s*)?(?:video|audio|lyric\s*video|lyrics\s*video|track|stream|visualizer|clip|videoclip)?|music\s+video|lyric\s*video|visualizer|audio\s*stream|official\s+4k|official\s+hd|4k\s+60fps|8k|1080p|720p|m\/v|mv)\s*[\)\]]/gi, "")
    .replace(/\s*[\(\[]\s*(?:full\s+)?album\s+(?:stream|audio|track)\s*[\)\]]/gi, "")
    .replace(/\s*[\(\[]\s*(?:original\s+)?soundtrack\s*(?:ost)?\s*[\)\]]/gi, "")
    .replace(/\s*[\(\[]\s*ost\s*[\)\]]/gi, "")
    .replace(/\s*[\(\[]\s*(?:color\s+coded(?:\s+lyrics?)?|with\s+lyrics?|free\s+download|premiere)\s*[\)\]]/gi, "")
    .replace(/\(\s*\)|\[\s*\]|\{\s*\}/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  // If title is "Artist - Song Title", only isolate the song title if the left part matches the known artist
  const hyphenMatch = title.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (hyphenMatch) {
    const left = hyphenMatch[1].trim();
    const right = hyphenMatch[2].trim();

    if (artistName) {
      const cleanArt = cleanArtistName(artistName).toLowerCase();
      const primaryArt = extractPrimaryArtist(artistName).toLowerCase();
      const cleanLeft = cleanArtistName(left).toLowerCase();

      if (
        cleanArt &&
        (cleanLeft === cleanArt ||
          cleanLeft === primaryArt ||
          (cleanArt.length >= 3 && cleanLeft.includes(cleanArt)) ||
          (cleanLeft.length >= 3 && cleanArt.includes(cleanLeft)))
      ) {
        title = right;
      }
    }
  }

  // Strip trailing metadata channel tags formatted with bullet/pipe (e.g. "• TopPop", "| VEVO") - NEVER colons!
  title = title.replace(/\s+[•|~]\s*(?:TopPop|Vevo|Colors|BBC|Official|Visualizer|MV).*$/i, "");
  title = title.replace(/^["'«“]|["'»”]$/g, "").trim();

  return title || rawTitle.trim();
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

