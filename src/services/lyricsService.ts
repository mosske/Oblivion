import { sanitizeLyricsQuery } from "../utils/lyricsSanitizer";
import { LyricLine } from "../types";

export type LyricsSourceType =
  | "youtube_innertube"
  | "lrclib"
  | "youtube_music"
  | "genius"
  | "lyrics_ovh"
  | "public_lyrics"
  | "server"
  | "none";

export interface LyricsResult {
  syncedLyrics?: string;
  plainLyrics?: string;
  isSynced: boolean;
  source: LyricsSourceType;
  provider?: string;
  trackName?: string;
  artistName?: string;
  lrcDuration?: number;
}

/**
 * Parses timestamped LRC strings (e.g. "[01:23.45] Lyric line") into LyricLine array
 */
export function parseLRC(lrcText: string): LyricLine[] {
  if (!lrcText) return [];
  const lines = lrcText.split("\n");
  const parsed: LyricLine[] = [];
  
  // Regular expression to match [mm:ss.xx] or [mm:ss.xxx] or multiple tags on one line
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Skip metadata tags like [ar: Artist], [ti: Title], [al: Album], [length: ...], etc.
    if (/^\[(ti|ar|al|au|length|by|offset|re|ve):/i.test(trimmed)) {
      continue;
    }

    const matches = Array.from(trimmed.matchAll(timeRegex));
    if (matches.length > 0) {
      const text = trimmed.replace(timeRegex, "").trim();
      if (text) {
        for (const match of matches) {
          const minutes = parseInt(match[1], 10);
          const seconds = parseInt(match[2], 10);
          const msStr = match[3] || "0";
          const msFactor = msStr.length === 1 ? 100 : msStr.length === 2 ? 10 : 1;
          const ms = parseInt(msStr, 10) * msFactor;
          const totalSeconds = minutes * 60 + seconds + ms / 1000;
          parsed.push({ time: totalSeconds, text });
        }
      }
    }
  }

  // Sort chronologically by time
  parsed.sort((a, b) => a.time - b.time);
  return parsed;
}

/**
 * Converts plain multi-line lyrics text into LyricLine array for fallback display
 */
export function parsePlainLyrics(plainText: string): LyricLine[] {
  if (!plainText) return [];
  return plainText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text) => ({
      time: -1, // untimed
      text,
    }));
}

/**
 * Creates interleaved dual-line lyric objects (Original text with subText for romanization)
 */
export function createDualLyricLines(
  originalLines: LyricLine[],
  subLines: LyricLine[]
): LyricLine[] {
  if (!originalLines || originalLines.length === 0) return [];
  if (!subLines || subLines.length === 0) return originalLines;

  return originalLines.map((orig, idx) => {
    // 1. Try finding matching subLine with close timestamp (within 0.75s tolerance)
    if (orig.time >= 0) {
      const exactMatch = subLines.find((s) => Math.abs(s.time - orig.time) <= 0.75);
      if (exactMatch && exactMatch.text) {
        return {
          ...orig,
          subText: exactMatch.text,
        };
      }
    }

    // 2. Fallback to index-based pairing
    if (subLines[idx] && subLines[idx].text) {
      return {
        ...orig,
        subText: subLines[idx].text,
      };
    }

    return orig;
  });
}

/**
 * Multi-Source Lyrics Pipeline with Title Sanitization & Provider Fallback:
 *
 * 1. Metadata Sanitization Pre-Filter:
 *    Strips video noise (e.g. [Official Music Video], [4K], HD, Topic, ft.)
 *    and cleanly separates performing artist from video uploader.
 *
 * 2. Multi-Provider Fallback Chain:
 *    - Provider 1 (Primary): Native YouTube InnerTube Synced Captions & YouTube Music Lyrics API
 *    - Provider 2 (Secondary): LRCLIB Synced .lrc & plain lyrics API (https://lrclib.net/api/get & /search)
 *    - Provider 3 (Tertiary): Public lyrics providers (Lyrics.ovh & Genius API fallback)
 *
 * If a provider returns 404 or empty lyrics, the pipeline automatically advances to the next provider
 * without failing the UI.
 */
export async function fetchLyricsMultiSource(
  rawTitle: string,
  rawArtist: string,
  durationInSeconds?: number,
  videoId?: string
): Promise<LyricsResult> {
  const sanitized = sanitizeLyricsQuery(rawTitle, rawArtist);
  const cleanTitle = sanitized.cleanTitle;
  const cleanArtist = sanitized.cleanArtist;
  const dur = durationInSeconds && durationInSeconds > 10 ? Math.round(durationInSeconds) : undefined;
  const cleanVid = videoId ? videoId.split("_")[0] : "";

  let lrclibPlainMatch: LyricsResult | null = null;

  // =========================================================================
  // Provider 1 (Primary): Native YouTube InnerTube Synced Captions & Lyrics
  // =========================================================================
  if (cleanVid) {
    try {
      const params = new URLSearchParams({
        videoId: cleanVid,
        title: cleanTitle,
        artist: cleanArtist,
      });
      if (dur) params.append("duration", dur.toString());

      const res = await fetch(`/api/youtube/ytmusic-lyrics?${params.toString()}`, {
        signal: AbortSignal.timeout(4500),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.syncedLyrics && data.isSynced) {
          return {
            syncedLyrics: data.syncedLyrics,
            plainLyrics: data.plainLyrics,
            isSynced: true,
            source: (data.source as LyricsSourceType) || "youtube_innertube",
            provider: "YouTube InnerTube Captions",
            trackName: cleanTitle,
            artistName: cleanArtist,
          };
        }
      }
    } catch (_cErr) {
      // Proceed gracefully to Provider 2
    }
  }

  // =========================================================================
  // Provider 2 (Secondary): LRCLIB API for Synced .lrc Lyrics
  // =========================================================================
  if (cleanTitle && cleanArtist) {
    try {
      const params = new URLSearchParams({
        track_name: cleanTitle,
        artist_name: cleanArtist,
      });
      if (dur) {
        params.append("duration", dur.toString());
      }

      const getUrl = `https://lrclib.net/api/get?${params.toString()}`;
      const res = await fetch(getUrl, {
        headers: { "Lrclib-Client": "OblivionMusicApp v1.0 (https://ai.studio/build)" },
        signal: AbortSignal.timeout(4500),
      });

      if (res.ok) {
        const data = await res.json();
        const lrcDur = typeof data.duration === "number" && data.duration > 0 ? data.duration : undefined;
        if (data.syncedLyrics && data.syncedLyrics.trim().length > 0) {
          return {
            syncedLyrics: data.syncedLyrics,
            plainLyrics: data.plainLyrics,
            isSynced: true,
            source: "lrclib",
            provider: "LRCLIB Synced",
            trackName: data.trackName || cleanTitle,
            artistName: data.artistName || cleanArtist,
            lrcDuration: lrcDur,
          };
        }
        if (data.plainLyrics && data.plainLyrics.trim().length > 0) {
          lrclibPlainMatch = {
            plainLyrics: data.plainLyrics,
            isSynced: false,
            source: "lrclib",
            provider: "LRCLIB Plain",
            trackName: data.trackName || cleanTitle,
            artistName: data.artistName || cleanArtist,
            lrcDuration: lrcDur,
          };
        }
      }
    } catch (_err) {
      // Proceed to search fallback
    }
  }

  // LRCLIB Search Queries Fallback
  const searchQueries = [
    sanitized.searchQuery,
    ...sanitized.secondaryQueries,
  ].filter(Boolean);

  for (const q of searchQueries) {
    try {
      const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(q)}`;
      const res = await fetch(searchUrl, {
        headers: { "Lrclib-Client": "OblivionMusicApp v1.0 (https://ai.studio/build)" },
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          // Priority: Synced lyrics
          const withSynced = list.find((item) => item.syncedLyrics && item.syncedLyrics.trim().length > 0);
          if (withSynced) {
            const searchLrcDur = typeof withSynced.duration === "number" && withSynced.duration > 0 ? withSynced.duration : undefined;
            return {
              syncedLyrics: withSynced.syncedLyrics,
              plainLyrics: withSynced.plainLyrics,
              isSynced: true,
              source: "lrclib",
              provider: "LRCLIB Synced",
              trackName: withSynced.trackName || cleanTitle,
              artistName: withSynced.artistName || cleanArtist,
              lrcDuration: searchLrcDur,
            };
          }
          // Stash plain lyrics from search if not already found
          const withPlain = list.find((item) => item.plainLyrics && item.plainLyrics.trim().length > 0);
          if (withPlain && !lrclibPlainMatch) {
            lrclibPlainMatch = {
              plainLyrics: withPlain.plainLyrics,
              isSynced: false,
              source: "lrclib",
              provider: "LRCLIB Plain",
              trackName: withPlain.trackName || cleanTitle,
              artistName: withPlain.artistName || cleanArtist,
              lrcDuration: typeof withPlain.duration === "number" && withPlain.duration > 0 ? withPlain.duration : undefined,
            };
          }
        }
      }
    } catch (_err) {
      // Proceed to next provider
    }
  }

  // =========================================================================
  // Provider 1b & 3: Server-side Multi-Provider (YouTube Music, Lyrics.ovh, Genius)
  // =========================================================================
  try {
    const params = new URLSearchParams({
      title: cleanTitle,
      artist: cleanArtist,
      duration: (dur || 0).toString(),
      videoId: cleanVid,
    });

    const serverUrl = `/api/youtube/lyrics?${params.toString()}`;
    const serverRes = await fetch(serverUrl, { signal: AbortSignal.timeout(6000) });
    if (serverRes.ok) {
      const data = await serverRes.json();
      const serverLrcDur = typeof data.lrcDuration === "number" ? data.lrcDuration : typeof data.duration === "number" ? data.duration : undefined;

      if (data.syncedLyrics && data.isSynced) {
        return {
          syncedLyrics: data.syncedLyrics,
          plainLyrics: data.plainLyrics,
          isSynced: true,
          source: (data.source as LyricsSourceType) || "youtube_innertube",
          provider: data.provider || "YouTube Captions",
          trackName: cleanTitle,
          artistName: cleanArtist,
          lrcDuration: serverLrcDur,
        };
      }
      if (data.plainLyrics && (data.source === "youtube_music" || data.source === "genius" || data.source === "lyrics_ovh" || !lrclibPlainMatch)) {
        return {
          plainLyrics: data.plainLyrics,
          isSynced: false,
          source: (data.source as LyricsSourceType) || "youtube_music",
          provider: data.provider || "YouTube Music",
          trackName: cleanTitle,
          artistName: cleanArtist,
          lrcDuration: serverLrcDur,
        };
      }
    }
  } catch (_sErr) {}

  // =========================================================================
  // Provider 2 Plain Fallback (if LRCLIB plain text was cached earlier)
  // =========================================================================
  if (lrclibPlainMatch) {
    return lrclibPlainMatch;
  }

  // =========================================================================
  // Provider 3 Direct Client-Side Fallback: Public Lyrics API (Lyrics.ovh)
  // =========================================================================
  if (cleanTitle && cleanArtist) {
    try {
      const ovhRes = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`, {
        signal: AbortSignal.timeout(3500),
      });
      if (ovhRes.ok) {
        const ovhData = await ovhRes.json();
        if (ovhData.lyrics && typeof ovhData.lyrics === "string" && ovhData.lyrics.trim().length > 10) {
          return {
            plainLyrics: ovhData.lyrics.trim(),
            isSynced: false,
            source: "lyrics_ovh",
            provider: "Lyrics.ovh",
            trackName: cleanTitle,
            artistName: cleanArtist,
          };
        }
      }
    } catch (_ovhErr) {}
  }

  // =========================================================================
  // Step 4: No lyrics available across all providers in chain
  // =========================================================================
  return {
    isSynced: false,
    source: "none",
  };
}

/**
 * Backward-compatible alias
 */
export const fetchLyricsFromLRCLIB = fetchLyricsMultiSource;
