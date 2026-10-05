import {
  sanitizeLyricsQuery,
  sanitizeCaptionsAndLyrics,
  cleanArtistName,
  extractPrimaryArtist,
  getArtistSearchVariants,
  getTitleSearchVariants,
  cleanTrackTitle,
  normalizeDurationSeconds,
  autoSyncPlainLyrics,
  formatLRC,
} from "../utils/lyricsSanitizer";
import { LyricLine } from "../types";

export { autoSyncPlainLyrics, formatLRC, getTitleSearchVariants };

export type LyricsSourceType =
  | "lrclib"
  | "lyricsplus"
  | "youtube_music"
  | "genius"
  | "lyrics_ovh"
  | "public_lyrics"
  | "auto_karaoke"
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
  lines?: LyricLine[];
}

/**
 * Global Sync Timing Offset (in seconds)
 * Compensates for YouTube audio playback lead-times and aligns lyric line highlighting precisely with vocal onset.
 */
export const DEFAULT_SYNC_OFFSET = 0;

/**
 * YouLyPlus / LyricsPlus /v2 mirror endpoints for 100% uptime reliability
 */
export const YOULYPLUS_MIRRORS = [
  "https://lyricsplus.prjktla.my.id/v2/lyrics/get",
  "https://lyricsplus.prjktla.workers.dev/v2/lyrics/get",
  "https://lyricsplus-seven.vercel.app/v2/lyrics/get",
];

/**
 * In-Memory Parsed Synced Lyrics Cache keyed by `${cleanArtist}_${cleanTitle}`
 */
export const lyricsMemoryCache = new Map<string, LyricLine[]>();

/**
 * Automatically strips YouTube noise, bracketed labels, featured artists, album suffix noise, and remasters from song titles
 * Examples: (Official Music Video), [Official Audio], FT., FEAT., Love Me Tomorrow (Remastered) -> Love Me Tomorrow
 */
export function cleanLyricsTitle(title: string): string {
  if (!title) return "";
  let clean = title;

  // 1. Strip standard YouTube and release bracketed/parenthesized noise (official video, 4k, audio, remastered, etc.)
  clean = clean.replace(
    /\s*[\(\[\{]\s*(?:official\s*(?:music\s*)?video|official\s*audio|official\s*lyric\s*video|lyric\s*video|visualizer|audio|video|clip\s*officiel|mv|hd|4k|1080p|hq|remaster(?:ed)?(?:\s*\d{4})?|\d{4}\s*remaster(?:ed)?|from\s*["'][^"']+["']|soundtrack|ost|live(?:\s*at\s*[^)\]}]+)?|deluxe(?:\s*edition)?|bonus\s*track|album\s*version|single\s*version|radio\s*edit|extended\s*mix|original\s*mix)\s*[\)\]\}]/gi,
    ""
  );

  // 2. Strip hyphenated album/remaster/live/version suffix noise (e.g., "Love Me Tomorrow - Remastered", "Hotel California - 2013 Remaster")
  clean = clean.replace(
    /\s*[-–—]\s*(?:remaster(?:ed)?(?:\s+\d{4})?|\d{4}\s*remaster(?:ed)?|deluxe(?:\s*edition)?|radio\s*edit|single\s*version|bonus\s*track|live(?:\s*at[^)\]]+)?|original\s*mix|album\s*version).*$/i,
    ""
  );

  // 3. Strip featured artists: FT., FEAT., ft., feat., featuring
  clean = clean.replace(
    /\s*[\(\[\{]?\s*(?:ft\.?|feat\.?|featuring)\s+[^()\[\]{}-]+[\)\]\}]?/gi,
    ""
  );

  // 4. Strip "From <anything>" in brackets or quotes
  clean = clean.replace(/\s*[\(\[]\s*from\s+[^)\]]+[\)\]]/gi, "");

  // 5. Strip specific noise labels like (Remastered 2020), [Remastered], or (Remastered)
  clean = clean.replace(/\s*[\(\[]\s*remaster(?:ed)?(?:\s*\d{4})?\s*[\)\]]/gi, "");

  // 6. Clean punctuation, trailing hyphens, double spaces
  clean = clean
    .replace(/[«»""]/g, "")
    .replace(/\s*-\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return clean;
}

/**
 * Aggressive metadata sanitization for artist queries:
 * - Removes secondary group members & featured artists (e.g. "Sergio Mendes & Brasil '77" -> "Sergio Mendes")
 * - Splits on &, ,, feat., ft., with, and takes ONLY the primary artist.
 * - Strips YouTube Topic, VEVO, and channel noise.
 */
export function cleanLyricsArtist(artist: string | string[]): string {
  const raw = Array.isArray(artist) ? artist[0] : (artist || "");
  let clean = raw;

  // 1. Strip YouTube topic / VEVO channel markers
  clean = clean.replace(/\s*-\s*Topic$/i, "").replace(/VEVO$/i, "");

  // 2. Strip bracketed/parenthesized featured artists
  clean = clean.replace(/\s*[\(\[\{]?\s*(?:ft\.?|feat\.?|featuring|with)\s+[^()\[\]{}-]+[\)\]\}]?/gi, "");

  // 3. Extract ONLY primary artist: remove secondary group members & split on collaboration markers
  // e.g. "Sergio Mendes & Brasil '77" -> "Sergio Mendes", "Dua Lipa, DaBaby" -> "Dua Lipa", "Eminem ft. Rihanna" -> "Eminem"
  const splitParts = clean.split(/\s+(?:&|feat\.?|ft\.?|featuring|with|vs\.?|x)\s+|,|\/|;/i);
  if (splitParts.length > 0 && splitParts[0].trim().length > 0) {
    clean = splitParts[0].trim();
  }

  // 4. Strip quotes and clean whitespace
  clean = clean.replace(/[«»"']/g, "").replace(/\s{2,}/g, " ").trim();
  return clean;
}

/**
 * Parses timestamped LRC strings (e.g. "[01:23.45] Lyric line" or "[00:15.678]" or "[01:23:45]")
 * into LyricLine array with exact floating point seconds and chronological sorting.
 * Applies DEFAULT_SYNC_OFFSET (-0.35s) for audio lead-time compensation.
 */
export function parseLRC(lrcText: string, syncOffset: number = DEFAULT_SYNC_OFFSET): LyricLine[] {
  if (!lrcText) return [];
  const lines = lrcText.split("\n");
  const parsed: LyricLine[] = [];

  // Match [mm:ss.xx] or [mm:ss:xxx] or [mm:ss.xxx]
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Skip metadata tags like [ti: ...], [ar: ...], [al: ...], etc.
    if (/^\[(ti|ar|al|au|length|by|offset|re|ve):/i.test(trimmed)) {
      continue;
    }

    const matches = Array.from(trimmed.matchAll(timeRegex));
    if (matches.length > 0) {
      const rawContent = trimmed.replace(timeRegex, "").trim();
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
          const parsedSeconds = minutes * 60 + seconds + ms;
          const lineTime = Math.max(0, Math.round((parsedSeconds + syncOffset) * 1000) / 1000);
          parsed.push({
            time: lineTime,
            text: cleaned,
          });
        }
      }
    }
  }

  // Sort lines chronologically by timestamp
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
  return /\[\d{1,2}:\d{2}(?:[.:]\d{1,3})?\]/.test(text);
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
    if (orig.time >= 0) {
      const exactMatch = subLines.find((s) => Math.abs(s.time - orig.time) <= 0.75);
      if (exactMatch && exactMatch.text) {
        return {
          ...orig,
          subText: exactMatch.text,
        };
      }
    }

    if (subLines[idx] && subLines[idx].text) {
      return {
        ...orig,
        subText: subLines[idx].text,
      };
    }

    return orig;
  });
}

function parseTTMLTimestamp(timeStr: string): number {
  if (!timeStr) return -1;
  const clean = timeStr.trim();

  if (clean.endsWith("s")) {
    const val = parseFloat(clean.slice(0, -1));
    return isNaN(val) ? -1 : val;
  }

  const parts = clean.split(":");
  if (parts.length === 3) {
    const hours = parseInt(parts[0], 10) || 0;
    const mins = parseInt(parts[1], 10) || 0;
    const secs = parseFloat(parts[2]) || 0;
    return hours * 3600 + mins * 60 + secs;
  } else if (parts.length === 2) {
    const mins = parseInt(parts[0], 10) || 0;
    const secs = parseFloat(parts[1]) || 0;
    return mins * 60 + secs;
  } else if (parts.length === 1) {
    const val = parseFloat(parts[0]);
    return isNaN(val) ? -1 : val;
  }

  return -1;
}

/**
 * Parse TTML formatted lyrics into timestamped LyricLine array with sync offset compensation
 */
export function parseTTML(ttmlText: string, syncOffset: number = DEFAULT_SYNC_OFFSET): LyricLine[] {
  if (!ttmlText || typeof ttmlText !== "string") return [];
  const lines: LyricLine[] = [];

  const pRegex = /<p[^>]*begin="([^"]+)"[^>]*>([\s\S]*?)<\/p>/gi;
  let match: RegExpExecArray | null;

  while ((match = pRegex.exec(ttmlText)) !== null) {
    const timeStr = match[1];
    let content = match[2];

    content = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!content) continue;

    const seconds = parseTTMLTimestamp(timeStr);
    if (seconds >= 0) {
      const lineTime = Math.max(0, Math.round((seconds + syncOffset) * 1000) / 1000);
      lines.push({
        time: lineTime,
        text: sanitizeCaptionsAndLyrics(content),
      });
    }
  }

  lines.sort((a, b) => a.time - b.time);
  return lines;
}

/**
 * YouLyPlus /v2 Response Parser
 * Accepts parameters: title, artist, and duration (in seconds).
 * The /v2 endpoint returns JSON with a `lyrics` array containing objects formatted as:
 *   { time: number, duration: number, text: string } (time in milliseconds or seconds).
 * Normalizes timestamps: if time > 1000, converts to seconds (time / 1000).
 * Applies DEFAULT_SYNC_OFFSET (-0.35s).
 */
export function parseYouLyPlusV2(
  data: any,
  syncOffset: number = DEFAULT_SYNC_OFFSET
): LyricLine[] {
  if (!data) return [];
  const rawList = Array.isArray(data.lyrics) ? data.lyrics : Array.isArray(data) ? data : [];
  if (rawList.length === 0) {
    // Check if syllable or legacy formats exist
    return parseLyricsPlusResponse(data, syncOffset);
  }

  const lines: LyricLine[] = [];
  for (const item of rawList) {
    if (!item) continue;
    const text = typeof item.text === "string" ? item.text.trim() : (item.words || item.line || "");
    const cleaned = sanitizeCaptionsAndLyrics(text);
    if (!cleaned) continue;

    let timeSec = typeof item.time === "number" ? item.time : parseFloat(item.time || "0");
    if (timeSec > 1000) {
      timeSec = timeSec / 1000;
    }

    const finalTime = Math.max(0, Math.round((timeSec + syncOffset) * 1000) / 1000);
    lines.push({
      time: finalTime,
      text: cleaned,
    });
  }

  lines.sort((a, b) => a.time - b.time);
  return lines;
}

/**
 * Parses response from YouLy+ / LyricsPlus Backend (both /v2 and legacy formats)
 */
export function parseLyricsPlusResponse(
  data: any,
  syncOffset: number = DEFAULT_SYNC_OFFSET
): LyricLine[] {
  if (!data) return [];

  // Case 1: Syllable array with word-level timestamps (TTML DOM conversion)
  if (Array.isArray(data.lyrics) && (data.type === "syllable" || data.type === "word")) {
    const lines: LyricLine[] = [];
    let curText = "";
    let curStart = -1;

    for (const item of data.lyrics) {
      if (typeof item.time === "number" && curStart < 0) {
        curStart = item.time > 1000 ? item.time / 1000 : item.time;
      }
      curText += item.text || "";
      if (item.isLineEnding === 1 || item.isLineEnding === true) {
        const trimmed = sanitizeCaptionsAndLyrics(curText.trim());
        if (trimmed && curStart >= 0) {
          const lineTime = Math.max(0, Math.round((curStart + syncOffset) * 1000) / 1000);
          lines.push({
            time: lineTime,
            text: trimmed,
          });
        }
        curText = "";
        curStart = -1;
      }
    }

    if (curText.trim() && curStart >= 0) {
      const trimmed = sanitizeCaptionsAndLyrics(curText.trim());
      if (trimmed) {
        const lineTime = Math.max(0, Math.round((curStart + syncOffset) * 1000) / 1000);
        lines.push({
          time: lineTime,
          text: trimmed,
        });
      }
    }

    if (lines.length > 0) {
      lines.sort((a, b) => a.time - b.time);
      return lines;
    }
  }

  // Case 2: Line array
  if (Array.isArray(data.lyrics) || Array.isArray(data.lines)) {
    const rawLines = Array.isArray(data.lyrics) ? data.lyrics : data.lines;
    const lines: LyricLine[] = [];

    for (const item of rawLines) {
      if (!item) continue;
      const text = item.text || item.words || item.line || "";
      const rawTime =
        typeof item.time === "number"
          ? item.time
          : parseFloat(item.time || item.startTime || "0");
      const timeInSec = rawTime > 1000 ? rawTime / 1000 : rawTime;
      const lineTime = Math.max(0, Math.round((timeInSec + syncOffset) * 1000) / 1000);
      const cleaned = sanitizeCaptionsAndLyrics(text.trim());
      if (cleaned) {
        lines.push({
          time: lineTime,
          text: cleaned,
        });
      }
    }

    if (lines.length > 0) {
      lines.sort((a, b) => a.time - b.time);
      return lines;
    }
  }

  // Case 3: TTML or LRC string
  const rawString =
    typeof data === "string"
      ? data
      : data.ttml || data.lrc || data.syncedLyrics || data.data || "";

  if (typeof rawString === "string" && rawString.trim().length > 0) {
    if (rawString.includes("<tt") || rawString.includes("<p begin=")) {
      const parsedTTML = parseTTML(rawString, syncOffset);
      if (parsedTTML.length > 0) return parsedTTML;
    }
    if (hasLrcTimestamps(rawString)) {
      const parsedLRC = parseLRC(rawString, syncOffset);
      if (parsedLRC.length > 0) return parsedLRC;
    }
  }

  return [];
}

/**
 * PARTS 1 & 2: Fail-Safe Multi-Provider Synced Lyrics Engine with Metadata Caching
 *
 * Waterfall Cascade:
 *   - STEP 1: Query YouLyPlus /v2 across mirror URLs.
 *   - STEP 2 (If Step 1 fails or returns empty): Query LRCLib Exact (/api/get?track_name=...&artist_name=...&duration=...).
 *   - STEP 3 (If Step 2 fails): Query LRCLib Search (/api/search?q=...) and grab best match with syncedLyrics.
 *
 * Catches all network/timeout errors at every step to prevent silent failures.
 */
export async function fetchSyncedLyrics(
  title: string,
  artist: string,
  durationSec: number = 0
): Promise<LyricLine[]> {
  const cleanTitle = cleanLyricsTitle(title);
  const cleanArtist = cleanLyricsArtist(artist);
  const durRounded = Math.round(durationSec || 0);

  if (!cleanTitle) return [];

  // In-Memory Cache Lookup: keyed by `${cleanArtist}_${cleanTitle}`
  const cacheKey = `${cleanArtist}_${cleanTitle}`.toLowerCase();
  if (lyricsMemoryCache.has(cacheKey)) {
    const cached = lyricsMemoryCache.get(cacheKey)!;
    if (cached && cached.length > 0) {
      console.log(`[LyricsEngine] Cache hit for "${cacheKey}" (${cached.length} lines)`);
      return cached;
    }
  }

  console.log(`[LyricsEngine] Fail-safe waterfall fetch for "${cleanTitle}" by "${cleanArtist}" (${durRounded}s)`);

  // =========================================================================
  // STEP 1: Query YouLyPlus /v2 across mirror URLs
  // =========================================================================
  for (const mirror of YOULYPLUS_MIRRORS) {
    try {
      let url = `${mirror}?title=${encodeURIComponent(cleanTitle)}&artist=${encodeURIComponent(cleanArtist)}`;
      if (durRounded > 0) {
        url += `&duration=${durRounded}`;
      }

      const res = await fetch(url, {
        headers: {
          "User-Agent": "OblivionMusicApp/2.0 (WebClient)",
        },
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const data = await res.json();
        const parsed = parseYouLyPlusV2(data, DEFAULT_SYNC_OFFSET);
        if (parsed.length > 0) {
          console.log(
            `[LyricsEngine] Step 1: Resolved via YouLyPlus mirror (${mirror}) with ${parsed.length} lines`
          );
          (parsed as any).source = "lyricsplus";
          (parsed as any).provider = "LyricsPlus / YouLy+";
          (parsed as any).syncedLyrics = formatLRC(parsed);
          lyricsMemoryCache.set(cacheKey, parsed);
          return parsed;
        }
      }
    } catch (mirrorErr) {
      console.warn(`[LyricsEngine] Step 1: Mirror ${mirror} failed, trying next:`, mirrorErr);
    }
  }

  // =========================================================================
  // STEP 2: LRCLib Exact Match
  // Endpoint: https://lrclib.net/api/get?track_name=...&artist_name=...&duration=...
  // =========================================================================
  try {
    let exactUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(
      cleanTitle
    )}&artist_name=${encodeURIComponent(cleanArtist)}`;

    if (durRounded > 0) {
      exactUrl += `&duration=${durRounded}`;
    }

    const res = await fetch(exactUrl, {
      headers: {
        "Lrclib-Client": "OblivionMusicApp (https://ai.studio/build)",
      },
      signal: AbortSignal.timeout(3000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.syncedLyrics && typeof data.syncedLyrics === "string") {
        const parsed = parseLRC(data.syncedLyrics, DEFAULT_SYNC_OFFSET);
        if (parsed.length > 0) {
          console.log(
            `[LyricsEngine] Step 2: Resolved via LRCLib Exact Match with ${parsed.length} lines`
          );
          (parsed as any).source = "lrclib";
          (parsed as any).provider = "LRCLIB (Exact Match)";
          (parsed as any).syncedLyrics = data.syncedLyrics;
          lyricsMemoryCache.set(cacheKey, parsed);
          return parsed;
        }
      }
    }
  } catch (step2Err) {
    console.warn("[LyricsEngine] Step 2: LRCLib Exact failed, proceeding to Step 3:", step2Err);
  }

  // =========================================================================
  // STEP 3: LRCLib Search (Fuzzy Fallback within ±5s)
  // Endpoint: https://lrclib.net/api/search?q=...
  // =========================================================================
  try {
    const query = cleanArtist ? `${cleanArtist} ${cleanTitle}` : cleanTitle;
    const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;

    const res = await fetch(searchUrl, {
      headers: {
        "Lrclib-Client": "OblivionMusicApp (https://ai.studio/build)",
      },
      signal: AbortSignal.timeout(3500),
    });

    if (res.ok) {
      const results = await res.json();
      if (Array.isArray(results) && results.length > 0) {
        const candidates = results.filter(
          (item: any) =>
            item &&
            typeof item.syncedLyrics === "string" &&
            item.syncedLyrics.trim().length > 0
        );

        if (candidates.length > 0) {
          let bestMatch: any = null;

          if (durRounded > 0) {
            const within5s = candidates.filter(
              (c: any) =>
                typeof c.duration === "number" &&
                Math.abs(c.duration - durRounded) <= 5
            );
            if (within5s.length > 0) {
              within5s.sort(
                (a: any, b: any) =>
                  Math.abs(a.duration - durRounded) -
                  Math.abs(b.duration - durRounded)
              );
              bestMatch = within5s[0];
            }
          }

          if (!bestMatch) {
            if (durRounded > 0) {
              candidates.sort(
                (a: any, b: any) =>
                  Math.abs((a.duration || durRounded) - durRounded) -
                  Math.abs((b.duration || durRounded) - durRounded)
              );
            }
            bestMatch = candidates[0];
          }

          if (bestMatch && bestMatch.syncedLyrics) {
            const parsed = parseLRC(bestMatch.syncedLyrics, DEFAULT_SYNC_OFFSET);
            if (parsed.length > 0) {
              console.log(
                `[LyricsEngine] Step 3: Resolved via LRCLib Search for "${cleanTitle}" with ${parsed.length} lines`
              );
              (parsed as any).source = "lrclib";
              (parsed as any).provider = "LRCLIB (Fuzzy Search)";
              (parsed as any).syncedLyrics = bestMatch.syncedLyrics;
              lyricsMemoryCache.set(cacheKey, parsed);
              return parsed;
            }
          }
        }
      }
    }
  } catch (step3Err) {
    console.warn("[LyricsEngine] Step 3: LRCLib Search failed:", step3Err);
  }

  // All 3 steps exhausted without finding synced lyrics
  return [];
}

function normalizeCompare(str: string): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function scoreLyricsCandidate(
  candidate: {
    trackName?: string;
    artistName?: string;
    duration?: number;
    syncedLyrics?: string;
    plainLyrics?: string;
    instrumental?: boolean;
  },
  query: {
    title: string;
    artist: string;
    durationSec?: number;
  }
): { score: number; isSynced: boolean } {
  if (candidate.instrumental) return { score: 0, isSynced: false };

  const candTitle = normalizeCompare(candidate.trackName || "");
  const candArtist = normalizeCompare(candidate.artistName || "");
  const qTitle = normalizeCompare(query.title);
  const qArtist = normalizeCompare(query.artist);

  if (!candTitle || !qTitle) return { score: 0, isSynced: false };

  let score = 0;

  // 1. Title Matching (0 to 60 pts)
  if (candTitle === qTitle) {
    score += 60;
  } else if (candTitle.startsWith(qTitle) || qTitle.startsWith(candTitle)) {
    score += 50;
  } else if (candTitle.includes(qTitle) || qTitle.includes(candTitle)) {
    score += 45;
  } else {
    const qTokens = qTitle.split(" ").filter((t) => t.length > 1);
    const matchedTokens = qTokens.filter((t) => candTitle.includes(t));
    const artistMatches = qArtist && (candArtist.includes(qArtist) || qArtist.includes(candArtist));
    if (qTokens.length > 0 && matchedTokens.length === qTokens.length && artistMatches) {
      score += 20;
    } else {
      return { score: 0, isSynced: false };
    }
  }

  // 2. Artist Matching (0 to 40 pts)
  if (candArtist && qArtist) {
    if (candArtist === qArtist) {
      score += 40;
    } else if (candArtist.includes(qArtist) || qArtist.includes(candArtist)) {
      score += 30;
    } else {
      const artTokens = qArtist.split(" ").filter((t) => t.length > 1);
      const matchedArtTokens = artTokens.filter((t) => candArtist.includes(t));
      if (artTokens.length > 0 && matchedArtTokens.length > 0) {
        score += (matchedArtTokens.length / artTokens.length) * 20;
      }
    }
  }

  // 3. Synced Lyrics Bonus (10 pts)
  const hasSynced = Boolean(
    candidate.syncedLyrics &&
      candidate.syncedLyrics.trim().length > 0 &&
      hasLrcTimestamps(candidate.syncedLyrics)
  );

  if (hasSynced) {
    score += 10;
  } else if (candidate.plainLyrics && candidate.plainLyrics.trim().length > 0) {
    score += 3;
  } else {
    return { score: 0, isSynced: false };
  }

  // 4. Duration Proximity Bonus (up to 15 pts)
  if (query.durationSec && typeof candidate.duration === "number" && candidate.duration > 0) {
    const delta = Math.abs(candidate.duration - query.durationSec);
    if (delta <= 4) {
      score += 15;
    } else if (delta <= 10) {
      score += 10;
    } else if (delta <= 25) {
      score += 5;
    }
  }

  return { score, isSynced: hasSynced };
}

/**
 * Multi-Source Lyrics Pipeline integrating:
 *   - Tier 1: Fail-safe Waterfall Engine (YouLyPlus /v2 -> LRCLib Exact -> LRCLib Search)
 *   - Tier 2: Server-side Proxy & YouTube Music InnerTube Captions
 *   - Tier 3: Client Direct LRCLib Multi-Variant search
 *   - Tier 4: Tertiary Public Lyrics (Lyrics.ovh) & Auto-Karaoke Machine
 */
export async function fetchLyricsMultiSource(
  rawTitle: string,
  rawArtist: string | string[],
  duration?: number,
  videoId?: string,
  albumName?: string
): Promise<LyricsResult> {
  const cleanArtist = cleanLyricsArtist(rawArtist) || cleanArtistName(rawArtist);
  const primaryArtist = extractPrimaryArtist(rawArtist);
  const artistVariants = getArtistSearchVariants(rawArtist);
  const titleVariants = getTitleSearchVariants(rawTitle, cleanArtist || (typeof rawArtist === "string" ? rawArtist : undefined));
  const cleanTitle = cleanLyricsTitle(rawTitle) || titleVariants[0] || cleanTrackTitle(rawTitle, cleanArtist || (typeof rawArtist === "string" ? rawArtist : undefined));
  const durationSec = normalizeDurationSeconds(duration);
  const cleanVid = videoId ? videoId.split("_")[0] : "";

  console.log("[Lyrics] Multi-source fetching for:", { cleanTitle, titleVariants, cleanArtist, primaryArtist, artistVariants, durationSec });

  // =========================================================================
  // TIER 1: FAIL-SAFE WATERFALL ENGINE (With In-Memory Caching)
  // =========================================================================
  try {
    const syncedLines = await fetchSyncedLyrics(cleanTitle, cleanArtist, durationSec);
    if (syncedLines && syncedLines.length > 0) {
      const lrcString = (syncedLines as any).syncedLyrics || formatLRC(syncedLines);
      const prov = (syncedLines as any).provider || "Synced Lyrics";
      const src = (syncedLines as any).source || "lrclib";

      return {
        syncedLyrics: lrcString,
        isSynced: true,
        source: src,
        provider: prov,
        trackName: cleanTitle,
        artistName: cleanArtist,
        lrcDuration: durationSec,
        lines: syncedLines,
      };
    }
  } catch (tier1Err) {
    console.warn("[Lyrics] Tier 1 synced engine notice:", tier1Err);
  }

  // =========================================================================
  // TIER 2 — FAST SERVER PROXY (/api/youtube/lyrics)
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
    const serverRes = await fetch(serverUrl, { signal: AbortSignal.timeout(4000) });
    if (serverRes.ok) {
      const data = await serverRes.json();
      const serverLrcDur =
        typeof data.lrcDuration === "number"
          ? data.lrcDuration
          : typeof data.duration === "number"
          ? data.duration
          : undefined;

      if (data.syncedLyrics && data.isSynced) {
        console.log("[Lyrics] Server proxy returned Synced Lyrics for:", cleanTitle, "via", data.provider);
        const parsed = parseLRC(data.syncedLyrics, DEFAULT_SYNC_OFFSET);
        return {
          syncedLyrics: sanitizeCaptionsAndLyrics(data.syncedLyrics),
          plainLyrics: data.plainLyrics ? sanitizeCaptionsAndLyrics(data.plainLyrics) : undefined,
          isSynced: true,
          source: (data.source as LyricsSourceType) || "lrclib",
          provider: data.provider || "Synced (LRCLIB)",
          trackName: data.cleanTitle || cleanTitle,
          artistName: data.cleanArtist || cleanArtist,
          lrcDuration: serverLrcDur,
          lines: parsed,
        };
      }

      if (data.plainLyrics && data.plainLyrics.trim().length > 0) {
        console.log("[Lyrics] Server proxy returned Plain Lyrics -> Auto-Syncing Karaoke timing for:", cleanTitle);
        const cleanedPlain = sanitizeCaptionsAndLyrics(data.plainLyrics);
        const autoSyncedLines = autoSyncPlainLyrics(cleanedPlain, durationSec);
        const autoLrc = formatLRC(autoSyncedLines);

        return {
          syncedLyrics: autoLrc,
          plainLyrics: cleanedPlain,
          isSynced: true,
          source: "auto_karaoke",
          provider: data.provider ? `Synced (${data.provider})` : "Synced (Karaoke Machine)",
          trackName: data.cleanTitle || cleanTitle,
          artistName: data.cleanArtist || cleanArtist,
          lrcDuration: serverLrcDur || durationSec,
          lines: autoSyncedLines,
        };
      }
    }
  } catch (serverErr) {
    console.warn("[Lyrics] Server lyrics proxy notice, trying direct client fallbacks:", serverErr);
  }

  // =========================================================================
  // TIER 3 — DIRECT CLIENT LRCLIB PARALLEL PASSES (Safety Net)
  // =========================================================================
  const queryInfo = { title: cleanTitle, artist: cleanArtist, durationSec };

  const fetchClientLrc = async (url: string): Promise<{ data: any; score: number; isSynced: boolean } | null> => {
    try {
      const resp = await fetch(url, {
        headers: { "Lrclib-Client": "OblivionMusicApp (https://ai.studio/build)" },
        signal: AbortSignal.timeout(2500),
      });
      if (resp.status === 200) {
        const json = await resp.json();
        if (Array.isArray(json)) {
          const candidates = json
            .map((item: any) => ({ item, ...scoreLyricsCandidate(item, queryInfo) }))
            .filter((c) => c.score >= 35)
            .sort((a, b) => b.score - a.score);
          if (candidates.length > 0) {
            return { data: candidates[0].item, score: candidates[0].score, isSynced: candidates[0].isSynced };
          }
        } else if (json && typeof json === "object") {
          const { score, isSynced } = scoreLyricsCandidate(json, queryInfo);
          if (score >= 35) {
            return { data: json, score, isSynced };
          }
        }
      }
    } catch (_) {}
    return null;
  };

  const clientUrls: string[] = [];
  for (const t of titleVariants.slice(0, 3)) {
    for (const art of artistVariants.slice(0, 3)) {
      if (!t || !art) continue;
      if (durationSec) {
        clientUrls.push(
          `https://lrclib.net/api/get?track_name=${encodeURIComponent(t)}&artist_name=${encodeURIComponent(art)}&duration=${durationSec}`
        );
      }
      clientUrls.push(
        `https://lrclib.net/api/get?track_name=${encodeURIComponent(t)}&artist_name=${encodeURIComponent(art)}`
      );
      clientUrls.push(
        `https://lrclib.net/api/search?track_name=${encodeURIComponent(t)}&artist_name=${encodeURIComponent(art)}`
      );
    }
  }
  for (const t of titleVariants.slice(0, 2)) {
    for (const art of artistVariants.slice(0, 2)) {
      clientUrls.push(`https://lrclib.net/api/search?q=${encodeURIComponent(`${t} ${art}`)}`);
    }
  }
  if (cleanTitle) {
    clientUrls.push(`https://lrclib.net/api/search?q=${encodeURIComponent(cleanTitle)}`);
  }

  const clientResults = await Promise.allSettled(clientUrls.map(fetchClientLrc));
  const validClientMatches = clientResults
    .filter(
      (r): r is PromiseFulfilledResult<{ data: any; score: number; isSynced: boolean } | null> =>
        r.status === "fulfilled" && r.value !== null
    )
    .map((r) => r.value!);

  const syncedClient = validClientMatches
    .filter((m) => m.isSynced && m.data.syncedLyrics)
    .sort((a, b) => b.score - a.score)[0];

  if (syncedClient) {
    const data = syncedClient.data;
    const lrcDur = typeof data.duration === "number" && data.duration > 0 ? data.duration : undefined;
    const parsed = parseLRC(data.syncedLyrics, DEFAULT_SYNC_OFFSET);
    return {
      syncedLyrics: sanitizeCaptionsAndLyrics(data.syncedLyrics),
      plainLyrics: data.plainLyrics ? sanitizeCaptionsAndLyrics(data.plainLyrics) : undefined,
      isSynced: true,
      source: "lrclib",
      provider: "Synced (LRCLIB)",
      trackName: data.trackName || cleanTitle,
      artistName: data.artistName || cleanArtist,
      lrcDuration: lrcDur,
      lines: parsed,
    };
  }

  const plainClient = validClientMatches
    .filter((m) => m.data.plainLyrics && m.data.plainLyrics.trim().length > 0)
    .sort((a, b) => b.score - a.score)[0];

  if (plainClient) {
    const data = plainClient.data;
    const lrcDur = typeof data.duration === "number" && data.duration > 0 ? data.duration : undefined;
    const cleanedPlain = sanitizeCaptionsAndLyrics(data.plainLyrics);
    const autoSyncedLines = autoSyncPlainLyrics(cleanedPlain, durationSec || lrcDur);
    const autoLrc = formatLRC(autoSyncedLines);

    return {
      syncedLyrics: autoLrc,
      plainLyrics: cleanedPlain,
      isSynced: true,
      source: "auto_karaoke",
      provider: "Synced (Karaoke Machine)",
      trackName: data.trackName || cleanTitle,
      artistName: data.artistName || cleanArtist,
      lrcDuration: lrcDur,
      lines: autoSyncedLines,
    };
  }

  // =========================================================================
  // TIER 4: TERTIARY FALLBACK (Lyrics.ovh)
  // =========================================================================
  for (const t of titleVariants.slice(0, 2)) {
    if (t && cleanArtist) {
      try {
        const ovhRes = await fetch(
          `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(t)}`,
          {
            signal: AbortSignal.timeout(2500),
          }
        );
        if (ovhRes.ok) {
          const ovhData = await ovhRes.json();
          if (
            ovhData.lyrics &&
            typeof ovhData.lyrics === "string" &&
            ovhData.lyrics.trim().length > 10
          ) {
            const cleanedPlain = sanitizeCaptionsAndLyrics(ovhData.lyrics.trim());
            const autoSyncedLines = autoSyncPlainLyrics(cleanedPlain, durationSec);
            const autoLrc = formatLRC(autoSyncedLines);

            return {
              syncedLyrics: autoLrc,
              plainLyrics: cleanedPlain,
              isSynced: true,
              source: "auto_karaoke",
              provider: "Synced (Lyrics.ovh)",
              trackName: t,
              artistName: cleanArtist,
              lines: autoSyncedLines,
            };
          }
        }
      } catch (_ovhErr) {}
    }
  }

  // No lyrics found across all tiers
  return {
    isSynced: false,
    source: "none",
  };
}

/**
 * Backward-compatible alias
 */
export const fetchLyricsFromLRCLIB = fetchLyricsMultiSource;
