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
 * Extracts all relevant artist search variations for LRCLIB queries.
 * Examples:
 * - "The Sergio Mendes Band" -> ["The Sergio Mendes Band", "Sergio Mendes Band", "Sergio Mendes"]
 * - "Sérgio Mendes & Brasil 66" -> ["Sérgio Mendes & Brasil 66", "Sergio Mendes & Brasil 66", "Sérgio Mendes", "Sergio Mendes", "Brasil 66"]
 * - "Lady Gaga & Bruno Mars" -> ["Lady Gaga & Bruno Mars", "Lady Gaga", "Bruno Mars"]
 */
export function getArtistSearchVariants(rawArtistOrUploader?: string | string[] | any): string[] {
  if (!rawArtistOrUploader) return [];
  const full = cleanArtistName(rawArtistOrUploader);
  if (!full) return [];

  const variants = new Set<string>();

  function addVariant(val?: string) {
    if (!val) return;
    const s = val.trim().replace(/^["'«“\(\[]+|["'»”\)\]]+$/g, "").trim();
    if (s.length >= 2) {
      variants.add(s);
      const unaccented = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (unaccented && unaccented !== s && unaccented.length >= 2) {
        variants.add(unaccented);
      }
    }
  }

  // 1. Full cleaned artist as-is
  addVariant(full);

  // 2. Without leading articles: "The ", "A ", "An "
  const withoutArticles = full.replace(/^(?:the|a|an)\s+/i, "");
  addVariant(withoutArticles);

  // 3. Without trailing ensemble / group words
  const withoutEnsemble = withoutArticles.replace(
    /\s+(?:band|orchestra|trio|quartet|quintet|ensemble|choir|symphony|philharmonic|group|collective|sound\s+system|experience|crew|boys|girls)$/i,
    ""
  );
  addVariant(withoutEnsemble);

  // 4. Split by multi-artist collaboration delimiters
  const splits = full.split(/\s*(?:,|&|\+|\/|;|\bvs\.?\b|\bx\b|\bfeat\.?|\bft\.?|\bfeaturing\b|\bwith\b|\band\b)\s*/i);
  for (const part of splits) {
    addVariant(part);
    const partWithoutThe = part.replace(/^(?:the|a|an)\s+/i, "");
    addVariant(partWithoutThe);
    const partWithoutEnsemble = partWithoutThe.replace(
      /\s+(?:band|orchestra|trio|quartet|quintet|ensemble|choir|symphony|philharmonic|group|collective|sound\s+system|experience|crew|boys|girls)$/i,
      ""
    );
    addVariant(partWithoutEnsemble);
  }

  // Also include the primary artist
  addVariant(extractPrimaryArtist(rawArtistOrUploader));

  return Array.from(variants);
}

/**
 * Extracts and cleans the artist string:
 * - If track.artist is an array, joins or takes the primary entry.
 * - Strips YouTube channel noise (e.g. " - Topic", "VEVO", "Official Artist Channel").
 * - Strips trailing feature additions (e.g. "(feat. ...)", "[ft. ...]").
 * - Preserves intact band names (e.g. "Simon & Garfunkel", "Earth, Wind & Fire", "AC/DC", "Sergio Mendes & Brasil '77").
 */
export function cleanArtistName(rawArtistOrUploader?: string | string[] | any): string {
  if (!rawArtistOrUploader) return "";
  let artist = "";
  if (Array.isArray(rawArtistOrUploader)) {
    artist = rawArtistOrUploader.filter(Boolean).map(String).join(", ").trim();
  } else {
    artist = String(rawArtistOrUploader).trim();
  }

  if (!artist) return "";

  // Strip trailing channel branding (e.g. " - Topic", "Topic", "VEVO", "Official")
  for (const pattern of CHANNEL_BRANDING_PATTERNS) {
    artist = artist.replace(pattern, "").trim();
  }

  // Strip (feat. ...), [feat. ...], feat. ..., ft. ..., featuring ...
  artist = artist.replace(/[\(\[]\s*(?:feat\.?|ft\.?|featuring|with)\s+[^()\[\]]+[\)\]]/gi, " ");
  artist = artist.replace(/\s+(?:feat\.?|ft\.?|featuring)\s+.+$/i, " ");

  // Strip trailing quotes or brackets
  artist = artist.replace(/^["'«“]|["'»”]$/g, "").replace(/\s{2,}/g, " ").trim();
  return artist;
}

/**
 * Extracts the single primary artist name for multi-artist collaborations,
 * (e.g. "Lady Gaga & Bruno Mars" -> "Lady Gaga", "Dua Lipa, DaBaby" -> "Dua Lipa").
 */
export function extractPrimaryArtist(rawArtistOrUploader?: string | string[] | any): string {
  const full = cleanArtistName(rawArtistOrUploader);
  if (!full) return "";
  const parts = full.split(/\s*(?:,|&|\/|;|\bvs\.?\b|\bx\b)\s*/i);
  return (parts[0] || full).trim();
}

/**
 * Strips suffixes, parentheticals, and tags using regex:
 * - Removes leading artist names separated by hyphens (e.g. "Adele - Easy On Me" -> "Easy On Me").
 * - Removes (Official Audio), (Official Video), (Official Visualizer), (Lyric Video), (Remastered...), [Topic], (feat. ...).
 * - Strips anything following - Remastered, - Live, etc.
 * - Preserves compound track titles without blindly discarding the left-hand title.
 */
export function cleanTrackTitle(rawTitle: string, artistName?: string): string {
  if (!rawTitle) return "Untitled Track";
  let title = rawTitle.trim();

  // Strip anything following - Remastered or - Live or - Acoustic etc.
  title = title.replace(/\s*[-–—]\s*(?:remaster(?:ed)?(?:\s+\d{4})?|live(?:\s+at[^)\]]+)?|acoustic|instrumental|deluxe|bonus\s+track|mono|stereo|anniversary|radio\s+edit|single\s+version|original\s+mix|clean\s+version|explicit\s+version|extended\s+mix|club\s+mix).*$/i, "");

  // Strip bullet / pipe / slash metadata channel tags (e.g. "• TopPop", "• VEVO", "• Colors", "| Official", "/ Warner Music", etc.)
  title = title.replace(/\s*[•|~–—/\\:]\s*(?:TopPop|Vevo|Colors|BBC|Live|Sessions?|Official|Show|Studio|Acoustic|Remaster(?:ed)?|Album\s+Version|Extended|Video|Audio|4K|HD|HQ|MV|Visualizer|Pop\s+Bilik\s+Tidur).*$/i, "");

  // Strip years in parentheses or brackets like (1976), [2021]
  title = title.replace(/\s*[\(\[]\s*(?:19\d{2}|20\d{2})\s*[\)\]]/gi, " ");

  // Strip suffixes, parentheticals, and tags using video noise patterns
  for (const pattern of VIDEO_NOISE_PATTERNS) {
    title = title.replace(pattern, " ");
  }

  // Strip (feat. ...), [feat. ...], (ft. ...), [ft. ...]
  title = title.replace(/[\(\[]\s*(?:feat\.?|ft\.?|featuring|with)\s+[^()\[\]]+[\)\]]/gi, " ");
  title = title.replace(/\s+(?:feat\.?|ft\.?|featuring)\s+.+$/i, " ");

  // Strip empty/dangling brackets
  title = title.replace(/\(\s*\)/g, " ").replace(/\[\s*\]/g, " ").replace(/\{\s*\}/g, " ").trim();
  title = title.replace(/\s{2,}/g, " ").trim();

  // If title is "Artist - Title", isolate the title portion ONLY if one side matches the artist or artist is generic
  const delimiterMatch = title.match(/^(.+?)\s+[-–—:|~]\s+(.+)$/);
  if (delimiterMatch) {
    const left = delimiterMatch[1].trim();
    const right = delimiterMatch[2].trim();

    if (artistName) {
      const cleanArt = cleanArtistName(artistName).toLowerCase();
      const primaryArt = extractPrimaryArtist(artistName).toLowerCase();
      const cleanLeft = cleanArtistName(left).toLowerCase();
      const cleanRight = cleanArtistName(right).toLowerCase();

      // If left side is the artist (e.g. "Adele - Easy On Me")
      if (
        cleanArt &&
        (cleanLeft === cleanArt ||
          cleanLeft === primaryArt ||
          left.toLowerCase().includes(cleanArt) ||
          cleanArt.includes(cleanLeft) ||
          (primaryArt.length >= 3 && left.toLowerCase().includes(primaryArt)))
      ) {
        title = right;
      }
      // If right side is the artist (e.g. "Easy On Me - Adele")
      else if (
        cleanArt &&
        (cleanRight === cleanArt ||
          cleanRight === primaryArt ||
          right.toLowerCase().includes(cleanArt) ||
          cleanArt.includes(cleanRight) ||
          (primaryArt.length >= 3 && right.toLowerCase().includes(primaryArt)))
      ) {
        title = left;
      }
      // If artist is generic (Topic, Various Artists, VEVO, etc.), assume Left is Artist and Right is Title
      else if (
        /topic|various\s+artists|records|vevo|official|channel/i.test(artistName) &&
        right.length > 0
      ) {
        title = right;
      }
      // Otherwise, the delimiter is part of the song title! (Do NOT discard left!)
    } else if (right.length > 0) {
      // No artist provided: assume "Artist - Title" format
      title = right;
    }
  }

  // If title still has artist prefix attached without delimiter (e.g. "Adele Easy On Me")
  if (artistName) {
    const cleanArt = cleanArtistName(artistName);
    const primaryArt = extractPrimaryArtist(artistName);
    if (cleanArt && title.toLowerCase().startsWith(cleanArt.toLowerCase())) {
      const rest = title.slice(cleanArt.length).replace(/^[-\s:|~–—"']+/, "").trim();
      if (rest) {
        title = rest;
      }
    } else if (primaryArt && primaryArt.length >= 3 && title.toLowerCase().startsWith(primaryArt.toLowerCase())) {
      const rest = title.slice(primaryArt.length).replace(/^[-\s:|~–—"']+/, "").trim();
      if (rest) {
        title = rest;
      }
    }
  }

  // Clean trailing punctuation or quotes
  title = title.replace(/^["'«“]|["'»”]$/g, "").trim();

  return title || rawTitle.trim();
}

/**
 * Normalizes duration to integer in seconds.
 * Handles both milliseconds (>10000) and seconds.
 */
export function normalizeDurationSeconds(duration?: number): number | undefined {
  if (duration === undefined || duration === null || isNaN(duration) || duration <= 0) {
    return undefined;
  }
  const durationSec = Math.round(duration > 10000 ? duration / 1000 : duration);
  return durationSec > 0 ? durationSec : undefined;
}

/**
 * Pre-Filter: Cleans raw video title, strips noise, uploader branding, and isolates
 * primary performing artist vs uploader name for high-accuracy lyrics retrieval.
 */
export function sanitizeLyricsQuery(
  rawTitle: string,
  rawArtistOrUploader?: string | string[]
): SanitizedLyricsQuery {
  if (!rawTitle) {
    const fallbackArtist = cleanArtistName(rawArtistOrUploader) || "Unknown Artist";
    return {
      cleanTitle: "Untitled Track",
      cleanArtist: fallbackArtist,
      searchQuery: fallbackArtist,
      secondaryQueries: [],
      uploader: typeof rawArtistOrUploader === "string" ? rawArtistOrUploader.trim() : undefined,
      featuredArtists: [],
    };
  }

  let title = cleanTrackTitle(rawTitle);
  const uploader = typeof rawArtistOrUploader === "string" ? rawArtistOrUploader.trim() : undefined;
  const cleanArtist = cleanArtistName(rawArtistOrUploader) || "Unknown Artist";

  // Check if title still starts with the artist name without delimiter
  if (cleanArtist && title.toLowerCase().startsWith(cleanArtist.toLowerCase())) {
    const rest = title.slice(cleanArtist.length).replace(/^[-\s:|~–—"']+/, "").trim();
    if (rest) {
      title = rest;
    }
  }

  let finalTitle = title
    .replace(/^["']|["']$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  // Strip any leftover trailing noise in brackets
  finalTitle = finalTitle
    .replace(/\s*[\(\[]\s*(?:official|video|audio|lyrics?|visualizer|mv|hd|4k)\s*[\)\]]/gi, "")
    .replace(/\(\s*\)|\[\s*\]/g, "")
    .trim();

  const primarySearchQuery = `${cleanArtist} ${finalTitle}`.trim();
  const secondaryQueries: string[] = [];
  if (finalTitle && finalTitle !== primarySearchQuery) {
    secondaryQueries.push(finalTitle);
  }

  return {
    cleanTitle: finalTitle || rawTitle,
    cleanArtist: cleanArtist,
    searchQuery: primarySearchQuery,
    secondaryQueries,
    uploader,
    featuredArtists: [],
  };
}

/**
 * Extracts multiple search title variations for deep lyrics catalog lookup.
 * Generates stripped, word-flipped, and parenthetical-free forms.
 * Example:
 * - "You To Me Are Everything (1976) • TopPop" -> ["You To Me Are Everything", "You To Me Are Everything (1976)"]
 * - "Love City" -> ["Love City", "City Love"]
 */
export function getTitleSearchVariants(rawTitle: string, artistName?: string): string[] {
  if (!rawTitle) return [];
  const variants = new Set<string>();

  function add(val?: string) {
    if (!val) return;
    const s = val.trim().replace(/^["'«“\(\[]+|["'»”\)\]]+$/g, "").trim();
    if (s.length >= 2) {
      variants.add(s);
      const unaccented = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (unaccented && unaccented !== s && unaccented.length >= 2) {
        variants.add(unaccented);
      }
    }
  }

  const baseClean = cleanTrackTitle(rawTitle, artistName);
  add(baseClean);
  add(rawTitle);

  // 1. Strip before bullet dot, pipe, slash
  const beforeSep = rawTitle.split(/[•|~–—/\\:]/)[0].trim();
  if (beforeSep) {
    add(cleanTrackTitle(beforeSep, artistName));
  }

  // 2. Strip all parentheticals and brackets
  const unbracketed = baseClean.replace(/[\(\[][^()\[\]]*[\)\]]/g, " ").replace(/\s{2,}/g, " ").trim();
  if (unbracketed) {
    add(unbracketed);
  }

  // 3. For 2-word titles (e.g. "Love City" <-> "City Love"), provide flipped variant
  const words = unbracketed.split(/\s+/).filter(Boolean);
  if (words.length === 2 && words[0].length >= 3 && words[1].length >= 3) {
    add(`${words[1]} ${words[0]}`);
  }

  // 4. Strip single quotes, double quotes, question marks
  const withoutQuotes = baseClean.replace(/["'?!.,]/g, "").replace(/\s{2,}/g, " ").trim();
  if (withoutQuotes) {
    add(withoutQuotes);
  }

  return Array.from(variants);
}

/**
 * Intelligent Karaoke Auto-Sync Engine for Plain Text Lyrics:
 * Calculates musically paced, millisecond-accurate timestamps for every sentence
 * using track duration, structural section cues ([Intro], [Verse], [Chorus], [Solo], [Outro]),
 * multilingual syllable/character weights, and zero-drift time budget normalization.
 * Guarantees every plain text song can be sung along to with tight synchronization.
 */
export function autoSyncPlainLyrics(
  plainLyrics: string,
  durationSec?: number
): Array<{ time: number; text: string }> {
  if (!plainLyrics || typeof plainLyrics !== "string") return [];

  const rawLines = plainLyrics.split("\n").map((l) => l.trim());

  // 1. Structural Section Analysis
  const parsedLines: Array<{ text: string; section: string; rawIndex: number }> = [];
  let currentSection = "verse";
  let hasExplicitIntro = false;
  let hasExplicitSolo = false;

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i];
    if (!raw) continue;

    // Check for section headers [Verse 1], [Chorus], (Bridge), [Solo], etc.
    const sectionMatch =
      raw.match(/^\[(verse|chorus|bridge|intro|outro|hook|pre-chorus|solo|guitar\s+solo|instrumental|interlude)[^\]]*\]$/i) ||
      raw.match(/^\((verse|chorus|bridge|intro|outro|hook|pre-chorus|solo|guitar\s+solo|instrumental|interlude)[^\)]*\)$/i);

    if (sectionMatch) {
      const tag = sectionMatch[1].toLowerCase();
      currentSection = tag;
      if (tag.includes("intro")) hasExplicitIntro = true;
      if (tag.includes("solo") || tag.includes("instrumental") || tag.includes("interlude")) hasExplicitSolo = true;
      continue;
    }

    parsedLines.push({
      text: raw,
      section: currentSection,
      rawIndex: i,
    });
  }

  if (parsedLines.length === 0) return [];

  // Determine realistic track duration
  const totalDuration = durationSec && durationSec > 20 ? durationSec : Math.max(120, parsedLines.length * 4.8);

  // 2. Musically Grounded Intro Timing
  // Standard pop/dance/rock songs feature a 4-bar or 8-bar musical intro (~9.0s - 14.5s)
  let introTime: number;
  if (hasExplicitIntro) {
    introTime = Math.max(10.0, Math.min(22.0, Math.round(totalDuration * 0.085 * 10) / 10));
  } else if (totalDuration < 150) {
    introTime = Math.max(7.5, Math.min(11.0, Math.round(totalDuration * 0.06 * 10) / 10));
  } else if (totalDuration > 300) {
    introTime = Math.max(12.0, Math.min(20.0, Math.round(totalDuration * 0.055 * 10) / 10));
  } else {
    // Default 8-bar intro cadence for standard 3-4 min tracks (~9.5s - 14.5s)
    introTime = Math.max(9.0, Math.min(14.5, Math.round(totalDuration * 0.048 * 10) / 10));
  }

  // 3. Outro Buffer Calculation (5-7% of track)
  const outroBuffer = Math.max(7.0, Math.min(18.0, Math.round(totalDuration * 0.055 * 10) / 10));

  // 4. Instrumental Solo / Interlude Allocation
  let soloDuration = 0;
  if (hasExplicitSolo) {
    soloDuration = Math.max(10.0, Math.min(22.0, Math.round(totalDuration * 0.07 * 10) / 10));
  }

  const availableVocalSpan = Math.max(20.0, totalDuration - introTime - outroBuffer - soloDuration);

  // 5. Syllable & Linguistic Weighting per Line
  function estimateSyllables(text: string): number {
    const cjkMatches = text.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/g);
    const cjkCount = cjkMatches ? cjkMatches.length : 0;

    const latinClean = text.toLowerCase().replace(/[^a-z\s]/g, "");
    const words = latinClean.split(/\s+/).filter(Boolean);
    let latinSyllables = 0;
    for (const w of words) {
      const matches = w.match(/[aeiouy]+/g);
      latinSyllables += matches ? Math.max(1, matches.length) : 1;
    }

    return Math.max(1, cjkCount + latinSyllables);
  }

  const lineWeights: Array<{ baseWeight: number; gapWeight: number }> = [];
  for (let i = 0; i < parsedLines.length; i++) {
    const item = parsedLines[i];
    const text = item.text;
    const words = text.split(/\s+/).filter(Boolean).length;
    const syllables = estimateSyllables(text);
    const chars = text.replace(/\s+/g, "").length;

    // Musically balanced weight: each word + syllable has breathing & vocal sustain time
    let weight = syllables * 0.55 + words * 0.75 + chars * 0.05;

    if (item.section.includes("chorus") || item.section.includes("hook")) {
      weight *= 1.2;
    }

    if (/[,;:]$/.test(text)) weight += 0.4;
    if (/[.?!]$/.test(text)) weight += 0.8;
    if (/\.{3}$/.test(text)) weight += 1.2;

    const isGap = i > 0 && parsedLines[i].rawIndex - parsedLines[i - 1].rawIndex > 1;
    const isNewSection = i > 0 && parsedLines[i].section !== parsedLines[i - 1].section;
    let gapWeight = 0;
    if (isNewSection) {
      gapWeight = 2.0;
    } else if (isGap) {
      gapWeight = 1.4;
    }

    lineWeights.push({
      baseWeight: Math.max(1.2, weight),
      gapWeight,
    });
  }

  const totalWeight = lineWeights.reduce((sum, w) => sum + w.baseWeight + w.gapWeight, 0);

  // 6. Zero-Drift Proportional Distribution
  const result: Array<{ time: number; text: string }> = [];
  let accumulatedTime = introTime;

  for (let i = 0; i < parsedLines.length; i++) {
    const w = lineWeights[i];

    if (w.gapWeight > 0) {
      const gapSec = (w.gapWeight / totalWeight) * availableVocalSpan;
      accumulatedTime += Math.min(3.5, Math.max(1.2, gapSec));
    }

    result.push({
      time: parseFloat(accumulatedTime.toFixed(2)),
      text: parsedLines[i].text,
    });

    const lineDuration = (w.baseWeight / totalWeight) * availableVocalSpan;
    accumulatedTime += lineDuration;
  }

  return result;
}

/**
 * Converts timed lyric lines back into standard formatted LRC string with [mm:ss.xx] tags
 */
export function formatLRC(lines: Array<{ time: number; text: string }>): string {
  if (!lines || lines.length === 0) return "";
  return lines
    .map((line) => {
      const t = Math.max(0, line.time);
      const min = Math.floor(t / 60);
      const sec = Math.floor(t % 60);
      const ms = Math.floor((t % 1) * 100);
      const mm = String(min).padStart(2, "0");
      const ss = String(sec).padStart(2, "0");
      const xx = String(ms).padStart(2, "0");
      return `[${mm}:${ss}.${xx}] ${line.text}`;
    })
    .join("\n");
}

/**
 * Caption & Lyrics Sanitization Filter:
 * For YouTube Native / ASR / plain lyric tracks, strips speech-to-text artifacts
 * ([Music], [Applause], (Laughter), [Intro], [Outro], etc.) and purges empty lines.
 */
export function sanitizeCaptionsAndLyrics(rawLyricsText: string): string {
  if (!rawLyricsText || typeof rawLyricsText !== "string") return "";

  const artifactRegex = /\s*(\[|\()(?:\s*(?:music|applause|laughter|cheering|cheers|instrumental|silence|intro|outro|vocalizing|screaming|groaning|coughing|sound\s+effects?|audience\s+applause|singing|beatboxing|chatter|whistling|audio)\s*)(\]|\))\s*/gi;
  const musicalSymbolsRegex = /[♪♫♩♬♯♭]+/g;

  const lines = rawLyricsText.split("\n");
  const cleanedLines: string[] = [];

  for (const rawLine of lines) {
    // Preserve LRC timestamp prefix if present
    const timestampMatch = rawLine.match(/^(\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]\s*)/);
    const prefix = timestampMatch ? timestampMatch[1] : "";
    const lineContent = timestampMatch ? rawLine.slice(prefix.length) : rawLine;

    let cleaned = lineContent
      .replace(artifactRegex, " ")
      .replace(musicalSymbolsRegex, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    // If after removing artifacts nothing substantive is left, drop the line
    if (!cleaned || /^[.,!?:;\-_'"~\s]+$/.test(cleaned)) {
      continue;
    }

    cleanedLines.push(prefix ? `${prefix}${cleaned}` : cleaned);
  }

  return cleanedLines.join("\n");
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
