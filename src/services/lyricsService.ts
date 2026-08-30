import { cleanTrackTitle } from "../utils/formatters";
import { LyricLine } from "../types";

export interface LyricsResult {
  syncedLyrics?: string;
  plainLyrics?: string;
  isSynced: boolean;
  source: "lrclib" | "server" | "none";
  trackName?: string;
  artistName?: string;
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
    .map((text, idx) => ({
      time: -1, // untimed
      text,
    }));
}

/**
 * Fetches real-time synchronized lyrics using LRCLIB REST API (https://lrclib.net)
 * with robust fallbacks:
 * 1. Direct GET https://lrclib.net/api/get with exact parameters
 * 2. Search GET https://lrclib.net/api/search?q=
 * 3. Server-side proxy fallback
 */
export async function fetchLyricsFromLRCLIB(
  rawTitle: string,
  rawArtist: string,
  durationInSeconds?: number
): Promise<LyricsResult> {
  const cleanTitle = cleanTrackTitle(rawTitle, rawArtist);
  const cleanArtist = (rawArtist || "").replace(/\s*-\s*Topic$/i, "").trim();
  const dur = durationInSeconds && durationInSeconds > 10 ? Math.round(durationInSeconds) : undefined;

  // 1. Direct GET endpoint
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
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.syncedLyrics) {
          return {
            syncedLyrics: data.syncedLyrics,
            plainLyrics: data.plainLyrics,
            isSynced: true,
            source: "lrclib",
            trackName: data.trackName,
            artistName: data.artistName,
          };
        }
        if (data.plainLyrics) {
          return {
            plainLyrics: data.plainLyrics,
            isSynced: false,
            source: "lrclib",
            trackName: data.trackName,
            artistName: data.artistName,
          };
        }
      }
    } catch (_err) {
      // Proceed to search fallback
    }
  }

  // 2. Search endpoint fallback (querying with artist + clean title, or raw query)
  const searchQueries = [
    cleanArtist ? `${cleanArtist} ${cleanTitle}` : cleanTitle,
    rawTitle,
  ].filter(Boolean);

  for (const q of searchQueries) {
    try {
      const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(q)}`;
      const res = await fetch(searchUrl, {
        headers: { "Lrclib-Client": "OblivionMusicApp v1.0 (https://ai.studio/build)" },
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          // Find first result with syncedLyrics
          const withSynced = list.find((item) => item.syncedLyrics && item.syncedLyrics.trim().length > 0);
          if (withSynced) {
            return {
              syncedLyrics: withSynced.syncedLyrics,
              plainLyrics: withSynced.plainLyrics,
              isSynced: true,
              source: "lrclib",
              trackName: withSynced.trackName,
              artistName: withSynced.artistName,
            };
          }
          // Or first result with plainLyrics
          const withPlain = list.find((item) => item.plainLyrics && item.plainLyrics.trim().length > 0);
          if (withPlain) {
            return {
              plainLyrics: withPlain.plainLyrics,
              isSynced: false,
              source: "lrclib",
              trackName: withPlain.trackName,
              artistName: withPlain.artistName,
            };
          }
        }
      }
    } catch (_err) {
      // Proceed to next fallback
    }
  }

  // 3. Fallback to Server Proxy /api/youtube/lyrics
  try {
    const serverUrl = `/api/youtube/lyrics?title=${encodeURIComponent(cleanTitle)}&artist=${encodeURIComponent(cleanArtist)}&duration=${dur || 0}`;
    const serverRes = await fetch(serverUrl, { signal: AbortSignal.timeout(6000) });
    if (serverRes.ok) {
      const data = await serverRes.json();
      if (data.syncedLyrics) {
        return {
          syncedLyrics: data.syncedLyrics,
          plainLyrics: data.plainLyrics,
          isSynced: true,
          source: "server",
        };
      }
      if (data.lyricsRaw) {
        return {
          syncedLyrics: data.lyricsRaw,
          isSynced: true,
          source: "server",
        };
      }
      if (data.plainLyrics) {
        return {
          plainLyrics: data.plainLyrics,
          isSynced: false,
          source: "server",
        };
      }
    }
  } catch (_sErr) {}

  return {
    isSynced: false,
    source: "none",
  };
}
