/**
 * Lyrics Metadata Pre-Filter & Title Sanitization Utility
 * Strips uploader names, channel branding, video noise (e.g. [Official Music Video], [4K], HD, Topic, ft., etc.)
 * and separates the track performing artist from the video uploader name.
 */

export interface SanitizedLyricsQuery {
  cleanTitle: string;
  cleanArtist: string;
  searchQuery: string;
  secondaryQueries: string[];
  uploader?: string;
  featuredArtists: string[];
}

/**
 * Common video noise patterns to strip out of music titles and queries
 */
const VIDEO_NOISE_PATTERNS = [
  // Official video / audio tags
  /\s*[\(\[]\s*official\s+(?:music\s+)?video\s*[\)\]]/gi,
  /\s*[\(\[]\s*official\s+(?:audio|lyric\s+video|lyrics\s+video|track|stream|visualizer)\s*[\)\]]/gi,
  /\s*[\(\[]\s*(?:official\s+)?(?:hd|4k|4k\s+60fps|8k|1080p|720p)\s*[\)\]]/gi,
  /\s*[\(\[]\s*(?:official\s+)?(?:music\s+video|music\s+audio|video\s+clip|clip\s+officiel|videoclip)\s*[\)\]]/gi,
  /\s*[\(\[]\s*(?:official\s+)?lyric\s*video\s*[\)\]]/gi,
  /\s*[\(\[]\s*(?:official\s+)?visualizer\s*[\)\]]/gi,
  /\s*[\(\[]\s*(?:official\s+)?audio\s*[\)\]]/gi,
  /\s*[\(\[]\s*(?:official\s+)?mv\s*[\)\]]/gi,
  /\s*[\(\[]\s*mv\s*[\)\]]/gi,
  /\s*[\(\[]\s*m\/v\s*[\)\]]/gi,
  /\s*[\(\[]\s*(?:full\s+)?album\s+(?:stream|audio|track)\s*[\)\]]/gi,
  /\s*[\(\[]\s*(?:original\s+)?soundtrack\s*(?:ost)?\s*[\)\]]/gi,
  /\s*[\(\[]\s*ost\s*[\)\]]/gi,
  /\s*[\(\[]\s*(?:hq|hd|uhd|4k|1080p|remastered|remaster|20\d{2}\s+remaster(?:ed)?)\s*[\)\]]/gi,
  /\s*[\(\[]\s*live\s+(?:at|in|performance|session|version)?\s*[^)\]]*[\)\]]/gi,
  /\s*[\(\[]\s*(?:performance|acoustic|instrumental|clean|explicit|bonus\s+track)\s*version\s*[\)\]]/gi,
  /\s*[\(\[]\s*lyrics?\s*[\)\]]/gi,
  /\s*[\(\[]\s*with\s+lyrics?\s*[\)\]]/gi,
  /\s*[\(\[]\s*color\s+coded\s+(?:lyrics?)?\s*[\)\]]/gi,
  /\s*[\(\[]\s*free\s+download\s*[\)\]]/gi,
  /\s*[\(\[]\s*prod(?:\.|\s+by)\s+[^)\]]+[\)\]]/gi,
  /\s*[\(\[]\s*dir(?:\.|\s+by)\s+[^)\]]+[\)\]]/gi,
  /\s*[\(\[]\s*premiere\s*[\)\]]/gi,
];

/**
 * Common channel branding patterns to strip from artist/uploader
 */
const CHANNEL_BRANDING_PATTERNS = [
  /\s*-\s*topic$/i,
  /\s*topic$/i,
  /\s*vevo$/i,
  /\s*official$/i,
  /\s*official\s+channel$/i,
  /\s*official\s+artist\s+channel$/i,
  /\s*records$/i,
  /\s*entertainment$/i,
  /\s*music$/i,
  /\s*tv$/i,
  /\s*media$/i,
];

/**
 * Strips feature tags (ft., feat., featuring) from a string and returns the cleaned base string
 * along with the extracted featured artists.
 */
export function extractFeatures(input: string): { cleanText: string; featured: string[] } {
  if (!input) return { cleanText: "", featured: [] };

  const featured: string[] = [];
  let cleanText = input;

  // Pattern 1: (feat. Artist) or [ft. Artist]
  const bracketFeatureRegex = /[\(\[]\s*(?:feat\.?|ft\.?|featuring|with)\s+([^()\[\]]+)[\)\]]/gi;
  let match;
  while ((match = bracketFeatureRegex.exec(cleanText)) !== null) {
    const artists = match[1].split(/[,&/]|(?:\s+and\s+)|\s+x\s+/i).map((a) => a.trim()).filter(Boolean);
    featured.push(...artists);
  }
  cleanText = cleanText.replace(bracketFeatureRegex, " ").trim();

  // Pattern 2: feat. Artist (unbracketed at the end of string or before separator)
  const unbracketedFeatureRegex = /\s+(?:feat\.?|ft\.?|featuring)\s+(.+)$/i;
  const match2 = unbracketedFeatureRegex.exec(cleanText);
  if (match2) {
    const artists = match2[1].split(/[,&/]|(?:\s+and\s+)|\s+x\s+/i).map((a) => a.trim()).filter(Boolean);
    featured.push(...artists);
    cleanText = cleanText.replace(unbracketedFeatureRegex, " ").trim();
  }

  return {
    cleanText: cleanText.replace(/\s{2,}/g, " ").trim(),
    featured,
  };
}

/**
 * Cleans channel and uploader branding to isolate the true artist name
 */
export function cleanArtistName(rawArtistOrUploader?: string): string {
  if (!rawArtistOrUploader) return "";
  let artist = rawArtistOrUploader.trim();

  // Strip trailing channel branding
  for (const pattern of CHANNEL_BRANDING_PATTERNS) {
    artist = artist.replace(pattern, "").trim();
  }

  // Remove common prefix "The " if needed or clean multiple spaces
  artist = artist.replace(/\s{2,}/g, " ").trim();
  return artist || rawArtistOrUploader.trim();
}

/**
 * Pre-Filter: Cleans raw video title, strips noise, uploader branding, and isolates
 * primary performing artist vs uploader name for high-accuracy lyrics retrieval.
 */
export function sanitizeLyricsQuery(
  rawTitle: string,
  rawArtistOrUploader?: string
): SanitizedLyricsQuery {
  if (!rawTitle) {
    const fallbackArtist = cleanArtistName(rawArtistOrUploader) || "Unknown Artist";
    return {
      cleanTitle: "Untitled Track",
      cleanArtist: fallbackArtist,
      searchQuery: fallbackArtist,
      secondaryQueries: [],
      uploader: rawArtistOrUploader?.trim(),
      featuredArtists: [],
    };
  }

  let title = rawTitle.trim();
  const uploader = rawArtistOrUploader?.trim();
  let artistFromUploader = cleanArtistName(rawArtistOrUploader);

  // 1. Strip standard video noise tags
  for (const pattern of VIDEO_NOISE_PATTERNS) {
    title = title.replace(pattern, " ");
  }

  // 2. Clean empty or dangling brackets
  title = title.replace(/\(\s*\)/g, " ").replace(/\[\s*\]/g, " ").replace(/\{\s*\}/g, " ").trim();

  // 3. Extract features from title
  const { cleanText: titleWithoutFeatures, featured: titleFeatures } = extractFeatures(title);
  title = titleWithoutFeatures;

  let detectedArtist = "";
  let detectedTitle = title;

  // 4. Check for "Artist - Title" or "Artist : Title" or "Artist ~ Title"
  const delimiterMatch = title.match(/^(.+?)\s+[-–—:|~]\s+(.+)$/);
  if (delimiterMatch) {
    const left = delimiterMatch[1].trim();
    const right = delimiterMatch[2].trim();

    // Check if left looks like an artist name
    if (left && right) {
      detectedArtist = left;
      detectedTitle = right;
    }
  } else if (artistFromUploader && title.toLowerCase().startsWith(artistFromUploader.toLowerCase())) {
    // If title starts with the uploader/artist name without a clean hyphen
    const rest = title.slice(artistFromUploader.length).replace(/^[-\s:|~–—"']+/, "").trim();
    if (rest) {
      detectedArtist = artistFromUploader;
      detectedTitle = rest;
    }
  }

  // 5. Final fallback for artist
  const finalArtist = cleanArtistName(detectedArtist || artistFromUploader || "Unknown Artist");
  
  // 6. Final cleaning on title
  let finalTitle = detectedTitle
    .replace(/^["']|["']$/g, "") // remove surrounding quotes
    .replace(/\s{2,}/g, " ")
    .trim();

  // Strip any leftover trailing noise in brackets
  finalTitle = finalTitle
    .replace(/\s*[\(\[]\s*(?:official|video|audio|lyrics?|visualizer|mv|hd|4k)\s*[\)\]]/gi, "")
    .replace(/\(\s*\)|\[\s*\]/g, "")
    .trim();

  // 7. Assemble high-accuracy search queries for multi-provider fallback
  const primarySearchQuery = `${finalArtist} ${finalTitle}`.trim();
  
  const secondaryQueries: string[] = [];
  if (finalTitle && finalTitle !== primarySearchQuery) {
    secondaryQueries.push(finalTitle);
  }
  if (rawArtistOrUploader && rawTitle) {
    const rawComb = `${cleanArtistName(rawArtistOrUploader)} ${rawTitle}`.trim();
    if (!secondaryQueries.includes(rawComb) && rawComb !== primarySearchQuery) {
      secondaryQueries.push(rawComb);
    }
  }

  return {
    cleanTitle: finalTitle || rawTitle,
    cleanArtist: finalArtist,
    searchQuery: primarySearchQuery,
    secondaryQueries,
    uploader,
    featuredArtists: titleFeatures,
  };
}

/**
 * Detects whether YouTube caption track metadata represents auto-generated / ASR captions
 */
export function isAutoGeneratedCaptionMetadata(track: {
  kind?: string;
  vssId?: string;
  name?: { simpleText?: string; runs?: Array<{ text?: string }> } | string;
}): boolean {
  if (!track) return true;

  // 1. Check kind (ASR / auto-generated)
  const kind = (track.kind || "").toLowerCase().trim();
  if (kind === "asr" || kind === "auto-generated" || kind === "automatic") {
    return true;
  }

  // 2. Check vssId (e.g., 'a.en', '.a.en', 'a.es', etc. ASR vssIds start with 'a.' or contain '.a.')
  const vssId = (track.vssId || "").toLowerCase().trim();
  if (
    vssId.startsWith("a.") ||
    vssId.includes(".a.") ||
    vssId.startsWith(".a.") ||
    vssId.startsWith(".a") ||
    vssId === "a" ||
    vssId.includes("asr")
  ) {
    return true;
  }

  // 3. Check track name / label for auto-generated indicators
  const trackName = (
    (typeof track.name === "string"
      ? track.name
      : track.name?.simpleText ||
        track.name?.runs?.map((r: any) => r.text || "").join(" ")) || ""
  ).toLowerCase().trim();

  if (
    trackName.includes("auto-generated") ||
    trackName.includes("automatic caption") ||
    trackName.includes("auto generated") ||
    trackName.includes("(auto)") ||
    trackName.includes("automatic")
  ) {
    return true;
  }

  return false;
}

/**
 * Validation & Sanity Check Pre-Filter:
 * Analyzes raw lyrics (LRC or plain text) for common auto-generated caption artifacts:
 * - Excessive single-word repetition (e.g. ASR looping or stuttering)
 * - Music note spam / sound effect tags without substance (e.g. ♪, ♫, [Music], [Applause])
 * - Low line count density relative to track duration (e.g. 1-2 lines for a 3-minute song)
 * - Lack of stanza formatting or total emptiness
 */
export function validateLyricsQuality(
  rawLyrics: string | undefined | null,
  options?: {
    isSynced?: boolean;
    trackDurationSec?: number;
    source?: string;
  }
): { isValid: boolean; reason?: string; cleanedLines?: string[] } {
  if (!rawLyrics || typeof rawLyrics !== "string") {
    return { isValid: false, reason: "Empty lyrics text" };
  }

  const trimmed = rawLyrics.trim();
  if (trimmed.length < 20) {
    return { isValid: false, reason: "Lyrics too short (< 20 chars)" };
  }

  // Strip LRC timestamps if present: [00:12.34] or [00:12]
  const cleanLines = trimmed
    .split("\n")
    .map((line) => line.replace(/^\[\d{2}:\d{2}(?:\.\d{1,3})?\]\s*/, "").trim())
    .filter((line) => line.length > 0);

  if (cleanLines.length === 0) {
    return { isValid: false, reason: "No text lines found" };
  }

  // Count lines that are just audio markers / music notes / bracketed noise
  const noiseLineRegex = /^(\[?(?:music|applause|laughter|cheering|instrumental|silence|intro|outro|vocalizing|screaming|groaning|coughing)\]?|[♪♫♩♬\s\-_.,!?:;]+)$/i;
  let noiseLineCount = 0;
  let substantiveLineCount = 0;
  const substantiveLines: string[] = [];

  for (const line of cleanLines) {
    const isNoise = noiseLineRegex.test(line) || /^\[.*\]$/.test(line);
    if (isNoise) {
      noiseLineCount++;
    } else {
      substantiveLineCount++;
      substantiveLines.push(line);
    }
  }

  // If over 60% of all lines are pure noise/music markers (and total lines > 3)
  if (cleanLines.length > 3 && noiseLineCount / cleanLines.length > 0.6) {
    return {
      isValid: false,
      reason: `Too much noise/music note spam (${noiseLineCount}/${cleanLines.length} lines)`,
    };
  }

  // If there are zero substantive lines
  if (substantiveLineCount === 0) {
    return { isValid: false, reason: "No substantive lyric lines found" };
  }

  const duration = options?.trackDurationSec;
  // Line-count density check relative to track duration:
  if (duration && duration > 45) {
    // If track is > 45s, a 1-2 line snippet is usually a fragmented ASR artifact
    if (substantiveLineCount < 3) {
      return {
        isValid: false,
        reason: `Insufficient line count for duration (${substantiveLineCount} lines for ${duration}s track)`,
      };
    }
    // If track is > 100s, require at least 5 lines
    if (duration > 100 && substantiveLineCount < 5) {
      return {
        isValid: false,
        reason: `Insufficient line count for long track (${substantiveLineCount} lines for ${duration}s track)`,
      };
    }
  }

  // Repetition & Gibberish check:
  // Tokenize words (length >= 2)
  const fullText = substantiveLines.join(" ").toLowerCase();
  const words = fullText
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);

  if (words.length >= 10) {
    const wordCounts = new Map<string, number>();
    for (const w of words) {
      wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
    }

    let maxWordFreq = 0;
    let mostFrequentWord = "";
    for (const [w, count] of wordCounts.entries()) {
      if (count > maxWordFreq) {
        maxWordFreq = count;
        mostFrequentWord = w;
      }
    }

    const maxRatio = maxWordFreq / words.length;
    // If a single word is > 42% of all words (e.g. ASR repeating "yeah" or "the" infinitely)
    if (maxRatio > 0.42 && words.length >= 12) {
      return {
        isValid: false,
        reason: `Excessive single-word repetition: '${mostFrequentWord}' represents ${(maxRatio * 100).toFixed(0)}% of words`,
      };
    }

    // Top 2 words ratio
    const sortedCounts = Array.from(wordCounts.values()).sort((a, b) => b - a);
    if (sortedCounts.length >= 2 && words.length >= 16) {
      const top2Ratio = (sortedCounts[0] + sortedCounts[1]) / words.length;
      if (top2Ratio > 0.65) {
        return {
          isValid: false,
          reason: `Excessive 2-word repetition represents ${(top2Ratio * 100).toFixed(0)}% of words`,
        };
      }
    }
  }

  // Check unique lines ratio
  if (substantiveLines.length >= 8) {
    const uniqueLines = new Set(substantiveLines.map((l) => l.toLowerCase()));
    if (uniqueLines.size < 3) {
      return {
        isValid: false,
        reason: `Excessive identical line repetition (${uniqueLines.size} unique lines among ${substantiveLines.length})`,
      };
    }
  }

  return { isValid: true, cleanedLines: substantiveLines };
}
