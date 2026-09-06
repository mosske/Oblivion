import {
  sanitizeLyricsQuery,
  sanitizeCaptionsAndLyrics,
  cleanArtistName,
  cleanTrackTitle,
  normalizeDurationSeconds,
} from "../utils/lyricsSanitizer";
import { LyricLine } from "../types";

export type LyricsSourceType =
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
 * Parses timestamped LRC strings (e.g. "[01:23.45] Lyric line" or "[00:15.678]") into LyricLine array with millisecond precision
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

    // Skip metadata tags like [ar: Artist], [ti: Title], [al: Album], [length: ...], [by: ...], [offset: ...]
    if (/^\[(ti|ar|al|au|length|by|offset|re|ve):/i.test(trimmed)) {
      continue;
    }

    const matches = Array.from(trimmed.matchAll(timeRegex));
    if (matches.length > 0) {
      let rawContent = trimmed.replace(timeRegex, "").trim();
      // Apply caption sanitization to strip speech-to-text artifacts ([Music], [Applause], etc.)
      const cleaned = sanitizeCaptionsAndLyrics(rawContent);
      if (cleaned) {
        for (const match of matches) {
          const minutes = parseInt(match[1], 10);
          const seconds = parseInt(match[2], 10);
          const msStr = match[3] || "0";
          const ms =
            msStr.length === 2
              ? parseInt(msStr, 10) / 100
              : msStr.length === 3
              ? parseInt(msStr, 10) / 1000
              : msStr.length === 1
              ? parseInt(msStr, 10) / 10
              : 0;
          const totalSeconds = minutes * 60 + seconds + ms;
          parsed.push({ time: totalSeconds, text: cleaned });
        }
      }
    }
  }

  // Sort chronologically by time
  parsed.sort((a, b) => a.time - b.time);
  return parsed;
}

/** Alias for parseLRC */
export const parseLrc = parseLRC;

/**
 * Checks if a string contains valid LRC timestamp tags like [00:12.34] or [01:23.456]
 */
export function hasLrcTimestamps(text?: string): boolean {
  if (!text || typeof text !== "string") return false;
  return /\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/.test(text);
}

/**
 * Converts plain multi-line lyrics text into LyricLine array for fallback display
 */
export function parsePlainLyrics(plainText: string): LyricLine[] {
  if (!plainText) return [];
  const sanitized = sanitizeCaptionsAndLyrics(plainText);
  return sanitized
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
 * Multi-Source Lyrics Pipeline with Title Sanitization & 3-Tier Provider Fallback:
 *
 * Tier 1 (LRCLIB - Primary Synced):
 *   - Query https://lrclib.net/api/get passing track_name, artist_name, album_name, and duration.
 *   - If /api/get returns syncedLyrics: null OR lacks timestamps, DO NOT settle for plain lyrics.
 *   - Fallback to /api/search and loop through results to find first entry with valid syncedLyrics within <= 4s tolerance.
 *   - Only drop to plainLyrics as an absolute last resort if NO result contains synced lyrics.
 *
 * Tier 2 (YT InnerTube Native):
 *   - If LRCLIB fails or has no synced lyrics, call YouTube InnerTube browse endpoint on the backend.
 *
 * Tier 3 (Genius / Secondary Fallback):
 *   - Fallback to tertiary APIs (Genius & Lyrics.ovh) if no synced LRC timestamps exist.
 */
export async function fetchLyricsMultiSource(
  rawTitle: string,
  rawArtist: string | string[],
  duration?: number,
  videoId?: string,
  albumName?: string
): Promise<LyricsResult> {
  const cleanArtist = cleanArtistName(rawArtist);
  const cleanTitle = cleanTrackTitle(rawTitle, cleanArtist || (typeof rawArtist === "string" ? rawArtist : undefined));
  const rawArtistStr = Array.isArray(rawArtist) ? rawArtist.join(" ") : (rawArtist || "");
  const durationSec = normalizeDurationSeconds(duration);
  const cleanVid = videoId ? videoId.split("_")[0] : "";

  let lrclibPlainMatch: LyricsResult | null = null;

  // =========================================================================
  // PASS 1 — EXACT GET (/api/get with track_name, artist_name, and duration)
  // =========================================================================
  if (cleanTitle && cleanArtist) {
    try {
      const getUrl = durationSec
        ? `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}&duration=${durationSec}`
        : `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`;

      const res = await fetch(getUrl, {
        headers: { "Lrclib-Client": "OblivionMusicApp v1.0 (https://ai.studio/build)" },
        signal: AbortSignal.timeout(4500),
      });

      if (res.ok) {
        const data = await res.json();
        const lrcDur = typeof data.duration === "number" && data.duration > 0 ? data.duration : undefined;

        if (data.syncedLyrics && data.syncedLyrics.trim().length > 0 && hasLrcTimestamps(data.syncedLyrics)) {
          return {
            syncedLyrics: sanitizeCaptionsAndLyrics(data.syncedLyrics),
            plainLyrics: data.plainLyrics ? sanitizeCaptionsAndLyrics(data.plainLyrics) : undefined,
            isSynced: true,
            source: "lrclib",
            provider: "Synced (LRCLIB)",
            trackName: data.trackName || cleanTitle,
            artistName: data.artistName || cleanArtist,
            lrcDuration: lrcDur,
          };
        }
        if (data.plainLyrics && data.plainLyrics.trim().length > 0) {
          lrclibPlainMatch = {
            plainLyrics: sanitizeCaptionsAndLyrics(data.plainLyrics),
            isSynced: false,
            source: "lrclib",
            provider: "Plain Text (LRCLIB)",
            trackName: data.trackName || cleanTitle,
            artistName: data.artistName || cleanArtist,
            lrcDuration: lrcDur,
          };
        }
      }
    } catch (_err) {
      // Proceed to Pass 2
    }
  }

  // =========================================================================
  // PASS 2 — PARAMETRIC SEARCH (/api/search with Track & Artist)
  // Pick the FIRST result where syncedLyrics exists AND Math.abs(item.duration - durationSec) <= 45
  // =========================================================================
  if (cleanTitle && cleanArtist) {
    try {
      const searchUrl = `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`;
      const res = await fetch(searchUrl, {
        headers: { "Lrclib-Client": "OblivionMusicApp v1.0 (https://ai.studio/build)" },
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          const matched = list.find((item: any) => {
            if (!item.syncedLyrics || !item.syncedLyrics.trim() || !hasLrcTimestamps(item.syncedLyrics)) {
              return false;
            }
            if (durationSec && typeof item.duration === "number" && item.duration > 0) {
              if (Math.abs(item.duration - durationSec) > 45.0) {
                return false;
              }
            }
            return true;
          });

          if (matched) {
            const searchLrcDur = typeof matched.duration === "number" && matched.duration > 0 ? matched.duration : undefined;
            return {
              syncedLyrics: sanitizeCaptionsAndLyrics(matched.syncedLyrics),
              plainLyrics: matched.plainLyrics ? sanitizeCaptionsAndLyrics(matched.plainLyrics) : undefined,
              isSynced: true,
              source: "lrclib",
              provider: "Synced (LRCLIB)",
              trackName: matched.trackName || cleanTitle,
              artistName: matched.artistName || cleanArtist,
              lrcDuration: searchLrcDur,
            };
          }

          const plainMatched = list.find((item: any) => item.plainLyrics && item.plainLyrics.trim().length > 0);
          if (plainMatched && !lrclibPlainMatch) {
            lrclibPlainMatch = {
              plainLyrics: sanitizeCaptionsAndLyrics(plainMatched.plainLyrics),
              isSynced: false,
              source: "lrclib",
              provider: "Plain Text (LRCLIB)",
              trackName: plainMatched.trackName || cleanTitle,
              artistName: plainMatched.artistName || cleanArtist,
              lrcDuration: typeof plainMatched.duration === "number" ? plainMatched.duration : undefined,
            };
          }
        }
      }
    } catch (_err) {
      // Proceed to Pass 3
    }
  }

  // =========================================================================
  // PASS 3 — GENERAL QUERY SEARCH (/api/search with Title Only)
  // Filter: item.artistName contains at least one key word from cleanArtist AND syncedLyrics is present
  // =========================================================================
  if (cleanTitle) {
    try {
      const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(cleanTitle)}`;
      const res = await fetch(searchUrl, {
        headers: { "Lrclib-Client": "OblivionMusicApp v1.0 (https://ai.studio/build)" },
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          const artistTokens = (cleanArtist + " " + rawArtistStr)
            .toLowerCase()
            .split(/[\s,;&/]+/)
            .filter((t) => t.length >= 3);

          const matched = list.find((item: any) => {
            if (!item.syncedLyrics || !item.syncedLyrics.trim() || !hasLrcTimestamps(item.syncedLyrics)) {
              return false;
            }
            if (artistTokens.length > 0) {
              const itemArtistLower = (item.artistName || "").toLowerCase();
              const hasTokenMatch = artistTokens.some((tok) => itemArtistLower.includes(tok));
              if (!hasTokenMatch) {
                return false;
              }
            }
            if (durationSec && typeof item.duration === "number" && item.duration > 0) {
              if (Math.abs(item.duration - durationSec) > 45.0) {
                return false;
              }
            }
            return true;
          });

          if (matched) {
            const searchLrcDur = typeof matched.duration === "number" && matched.duration > 0 ? matched.duration : undefined;
            return {
              syncedLyrics: sanitizeCaptionsAndLyrics(matched.syncedLyrics),
              plainLyrics: matched.plainLyrics ? sanitizeCaptionsAndLyrics(matched.plainLyrics) : undefined,
              isSynced: true,
              source: "lrclib",
              provider: "Synced (LRCLIB)",
              trackName: matched.trackName || cleanTitle,
              artistName: matched.artistName || cleanArtist,
              lrcDuration: searchLrcDur,
            };
          }
        }
      }
    } catch (_err) {
      // Proceed to Pass 4
    }
  }

  // =========================================================================
  // PASS 4 — YOUTUBE INNERTUBE / CAPTION FALLBACK
  // Query server-side lyrics route (/api/youtube/lyrics)
  // =========================================================================
  try {
    const params = new URLSearchParams({
      title: cleanTitle,
      artist: cleanArtist,
      duration: (durationSec || 0).toString(),
      videoId: cleanVid,
    });
    if (albumName && albumName.trim()) {
      params.append("album", albumName.trim());
    }

    const serverUrl = `/api/youtube/lyrics?${params.toString()}`;
    const serverRes = await fetch(serverUrl, { signal: AbortSignal.timeout(6000) });
    if (serverRes.ok) {
      const data = await serverRes.json();
      const serverLrcDur = typeof data.lrcDuration === "number" ? data.lrcDuration : typeof data.duration === "number" ? data.duration : undefined;

      if (data.syncedLyrics && data.isSynced) {
        return {
          syncedLyrics: sanitizeCaptionsAndLyrics(data.syncedLyrics),
          plainLyrics: data.plainLyrics ? sanitizeCaptionsAndLyrics(data.plainLyrics) : undefined,
          isSynced: true,
          source: (data.source as LyricsSourceType) || "lrclib",
          provider: data.provider || "Synced (LRCLIB)",
          trackName: cleanTitle,
          artistName: cleanArtist,
          lrcDuration: serverLrcDur,
        };
      }
      if (data.plainLyrics && (data.source === "youtube_music" || data.source === "genius" || data.source === "lyrics_ovh" || !lrclibPlainMatch)) {
        return {
          plainLyrics: sanitizeCaptionsAndLyrics(data.plainLyrics),
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
  // Tier 3 Plain Fallback (if LRCLIB plain text was cached earlier)
  // =========================================================================
  if (lrclibPlainMatch) {
    return lrclibPlainMatch;
  }

  // =========================================================================
  // Tier 3 Direct Client-Side Fallback: Public Lyrics API (Lyrics.ovh)
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
            plainLyrics: sanitizeCaptionsAndLyrics(ovhData.lyrics.trim()),
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
  // No lyrics available across all tiers
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
