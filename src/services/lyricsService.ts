import { cleanTrackTitle } from "../utils/formatters";
import { LyricLine } from "../types";

export interface LyricsResult {
  syncedLyrics?: string;
  plainLyrics?: string;
  isSynced: boolean;
  source: "lrclib" | "youtube_music" | "server" | "none";
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
 * Multi-Source Lyrics Pipeline:
 * Step 1 (LRCLIB): Query LRCLIB API first for synced .lrc lyrics. If found, return synced lyrics.
 * Step 2 (YouTube Music Native Fallback): If LRCLIB returns a 404 or empty response, fetch YouTube Music's native lyrics
 *        via the YouTube Music backend route (calling YouTubei next & browse with lyricsBrowseId).
 * Step 3 (Display Handling): Return native YouTube Music text as unsynced plain lyrics with source "youtube_music".
 * Step 4 (Empty): Return empty result if all providers in the fallback chain return no data.
 */
export async function fetchLyricsMultiSource(
  rawTitle: string,
  rawArtist: string,
  durationInSeconds?: number,
  videoId?: string
): Promise<LyricsResult> {
  const cleanTitle = cleanTrackTitle(rawTitle, rawArtist);
  const cleanArtist = (rawArtist || "").replace(/\s*-\s*Topic$/i, "").trim();
  const dur = durationInSeconds && durationInSeconds > 10 ? Math.round(durationInSeconds) : undefined;
  const cleanVid = videoId ? videoId.split("_")[0] : "";

  let lrclibPlainMatch: LyricsResult | null = null;

  // =========================================================================
  // Step 1: Query LRCLIB API for Synced .lrc Lyrics
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
            trackName: data.trackName,
            artistName: data.artistName,
            lrcDuration: lrcDur,
          };
        }
        if (data.plainLyrics && data.plainLyrics.trim().length > 0) {
          lrclibPlainMatch = {
            plainLyrics: data.plainLyrics,
            isSynced: false,
            source: "lrclib",
            trackName: data.trackName,
            artistName: data.artistName,
            lrcDuration: lrcDur,
          };
        }
      }
    } catch (_err) {
      // Proceed to search fallback
    }
  }

  // LRCLIB Search endpoint fallback
  const searchQueries = [
    cleanArtist ? `${cleanArtist} ${cleanTitle}` : cleanTitle,
    rawTitle,
  ].filter(Boolean);

  for (const q of searchQueries) {
    try {
      const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(q)}`;
      const res = await fetch(searchUrl, {
        headers: { "Lrclib-Client": "OblivionMusicApp v1.0 (https://ai.studio/build)" },
        signal: AbortSignal.timeout(4500),
      });

      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          // Priority 1: Synced lyrics
          const withSynced = list.find((item) => item.syncedLyrics && item.syncedLyrics.trim().length > 0);
          if (withSynced) {
            const searchLrcDur = typeof withSynced.duration === "number" && withSynced.duration > 0 ? withSynced.duration : undefined;
            return {
              syncedLyrics: withSynced.syncedLyrics,
              plainLyrics: withSynced.plainLyrics,
              isSynced: true,
              source: "lrclib",
              trackName: withSynced.trackName,
              artistName: withSynced.artistName,
              lrcDuration: searchLrcDur,
            };
          }
          // Priority 2: Stash plain lyrics from search
          const withPlain = list.find((item) => item.plainLyrics && item.plainLyrics.trim().length > 0);
          if (withPlain && !lrclibPlainMatch) {
            lrclibPlainMatch = {
              plainLyrics: withPlain.plainLyrics,
              isSynced: false,
              source: "lrclib",
              trackName: withPlain.trackName,
              artistName: withPlain.artistName,
              lrcDuration: typeof withPlain.duration === "number" && withPlain.duration > 0 ? withPlain.duration : undefined,
            };
          }
        }
      }
    } catch (_err) {
      // Proceed to next fallback
    }
  }

  // =========================================================================
  // Step 2: YouTube Music Native Lyrics Fallback
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
          source: (data.source as any) || "lrclib",
          lrcDuration: serverLrcDur,
        };
      }
      if (data.plainLyrics && (data.source === "youtube_music" || !lrclibPlainMatch)) {
        return {
          plainLyrics: data.plainLyrics,
          isSynced: false,
          source: (data.source as any) || "youtube_music",
          lrcDuration: serverLrcDur,
        };
      }
    }
  } catch (_sErr) {}

  // =========================================================================
  // Step 3: LRCLIB Plain Text Fallback (if saved from earlier)
  // =========================================================================
  if (lrclibPlainMatch) {
    return lrclibPlainMatch;
  }

  // =========================================================================
  // Step 4: No lyrics available across all providers
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
