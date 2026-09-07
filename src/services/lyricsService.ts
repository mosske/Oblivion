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
    // Non-contiguous / anagram check: only allow if artist matches
    const qTokens = qTitle.split(" ").filter((t) => t.length > 1);
    const matchedTokens = qTokens.filter((t) => candTitle.includes(t));
    const artistMatches = qArtist && (candArtist.includes(qArtist) || qArtist.includes(candArtist));
    if (qTokens.length > 0 && matchedTokens.length === qTokens.length && artistMatches) {
      score += 20;
    } else {
      return { score: 0, isSynced: false }; // Scrambled words without artist match -> Reject
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
 * Multi-Source Lyrics Pipeline with Title Sanitization & Scored Provider Hierarchy (Glossy Engine):
 *
 * Tier 1 (LRCLIB - Primary Synced):
 *   - Pass 1: Exact GET https://lrclib.net/api/get passing track_name, artist_name, and duration.
 *   - Pass 2: Exact GET https://lrclib.net/api/get passing track_name and artist_name without duration.
 *   - Pass 3: Parametric Search https://lrclib.net/api/search?track_name=...&artist_name=... with candidate scoring.
 *   - Pass 4: Parametric Search with primary artist (if collaboration / features exist).
 *   - Pass 5: Combined Query Search https://lrclib.net/api/search?q=Artist+Title with candidate scoring.
 *   - Pass 6: Query Search with Title only https://lrclib.net/api/search?q=Title with candidate scoring.
 *
 * Tier 2 (YT InnerTube Native Lyrics):
 *   - Fallback to official YouTube Music lyrics from YouTube Music backend API.
 *
 * Tier 3 (Public Lyrics Fallback):
 *   - Fallback to tertiary APIs (Lyrics.ovh / Genius) if no synced LRC exists.
 */
export async function fetchLyricsMultiSource(
  rawTitle: string,
  rawArtist: string | string[],
  duration?: number,
  videoId?: string,
  albumName?: string
): Promise<LyricsResult> {
  const cleanArtist = cleanArtistName(rawArtist);
  const primaryArtist = extractPrimaryArtist(rawArtist);
  const artistVariants = getArtistSearchVariants(rawArtist);
  const titleVariants = getTitleSearchVariants(rawTitle, cleanArtist || (typeof rawArtist === "string" ? rawArtist : undefined));
  const cleanTitle = titleVariants[0] || cleanTrackTitle(rawTitle, cleanArtist || (typeof rawArtist === "string" ? rawArtist : undefined));
  const durationSec = normalizeDurationSeconds(duration);
  const cleanVid = videoId ? videoId.split("_")[0] : "";

  console.log("[Lyrics] Multi-source fetching for:", { cleanTitle, titleVariants, cleanArtist, primaryArtist, artistVariants, durationSec });

  // =========================================================================
  // PRIMARY TIER — FAST SERVER PROXY (/api/youtube/lyrics)
  // Queries server-side multi-pass engine with caching, variant expansion,
  // LRCLIB, YouTube Music InnerTube captions & lyrics, and tertiary APIs.
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
      const serverLrcDur =
        typeof data.lrcDuration === "number"
          ? data.lrcDuration
          : typeof data.duration === "number"
          ? data.duration
          : undefined;

      if (data.syncedLyrics && data.isSynced) {
        console.log("[Lyrics] Server proxy returned Synced Lyrics for:", cleanTitle, "via", data.provider);
        return {
          syncedLyrics: sanitizeCaptionsAndLyrics(data.syncedLyrics),
          plainLyrics: data.plainLyrics ? sanitizeCaptionsAndLyrics(data.plainLyrics) : undefined,
          isSynced: true,
          source: (data.source as LyricsSourceType) || "lrclib",
          provider: data.provider || "Synced (LRCLIB)",
          trackName: data.cleanTitle || cleanTitle,
          artistName: data.cleanArtist || cleanArtist,
          lrcDuration: serverLrcDur,
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
        };
      }
    }
  } catch (serverErr) {
    console.warn("[Lyrics] Server lyrics proxy notice, trying direct client fallbacks:", serverErr);
  }

  // =========================================================================
  // SECONDARY TIER — DIRECT CLIENT LRCLIB PARALLEL PASSES (Safety Net)
  // =========================================================================
  const queryInfo = { title: cleanTitle, artist: cleanArtist, durationSec };

  const fetchClientLrc = async (url: string): Promise<{ data: any; score: number; isSynced: boolean } | null> => {
    try {
      const resp = await fetch(url, {
        headers: { "Lrclib-Client": "OblivionMusicApp (https://ai.studio/build)" },
        signal: AbortSignal.timeout(3500),
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
    };
  }

  // Fallback to Lyrics.ovh
  for (const t of titleVariants.slice(0, 2)) {
    if (t && cleanArtist) {
      try {
        const ovhRes = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(t)}`, {
          signal: AbortSignal.timeout(3000),
        });
        if (ovhRes.ok) {
          const ovhData = await ovhRes.json();
          if (ovhData.lyrics && typeof ovhData.lyrics === "string" && ovhData.lyrics.trim().length > 10) {
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
