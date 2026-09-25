import { getYouTubeClient } from "./youtubeClient";
import { Track } from "../types";

export type HomeFeedItemType =
  | "song"
  | "playlist"
  | "album"
  | "video"
  | "artist"
  | "SONG"
  | "PLAYLIST"
  | "ALBUM"
  | "VIDEO"
  | "ARTIST";

export interface HomeFeedCardItem {
  id: string;
  videoId?: string;
  browseId?: string;
  title: string;
  subtitle?: string;
  artist?: string;
  thumbnail: string;
  thumbnails?: Array<{ url: string; width?: number; height?: number }>;
  type: "song" | "playlist" | "album" | "video" | "artist";
  duration?: string;
  year?: string;
  itemCount?: string;
}

export interface HomeSection {
  id: string;
  title: string;
  subtitle?: string;
  type?: string;
  items: HomeFeedCardItem[];
}

export interface HomeFeedResult {
  sections: HomeSection[];
  continuationToken?: string;
  hasContinuation?: boolean;
}

// Strict regional blocklist to eliminate generic, non-personalized regional noise (e.g. Tamil/Indian/Bollywood)
export const REGIONAL_BLOCKLIST = [
  "tamil",
  "indian music",
  "bollywood",
  "kollywood",
  "telugu",
  "punjabi",
  "desi",
  "tollywood",
  "mollywood",
  "bhojpuri",
  "malayalam",
  "kannada",
  "hindi",
];

/**
 * Checks if a title or text contains any keyword from the regional blocklist.
 */
export function containsRegionalNoise(text?: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return REGIONAL_BLOCKLIST.some((keyword) => lower.includes(keyword));
}

/**
 * Extracts the highest resolution image URL from a YouTube InnerTube thumbnail object or array.
 */
export function extractHighestResThumbnail(thumbData: any, fallbackId?: string): string {
  try {
    let list: any[] = [];
    if (Array.isArray(thumbData)) {
      list = thumbData;
    } else if (thumbData && Array.isArray(thumbData.contents)) {
      list = thumbData.contents;
    } else if (thumbData && Array.isArray(thumbData.thumbnails)) {
      list = thumbData.thumbnails;
    } else if (typeof thumbData === "string" && thumbData.length > 0) {
      return thumbData.startsWith("//") ? `https:${thumbData}` : thumbData;
    }

    if (list.length > 0) {
      // Sort by resolution (width * height or width) descending
      const sorted = [...list].sort((a, b) => {
        const resA = (a.width || 0) * (a.height || 0) || a.width || 0;
        const resB = (b.width || 0) * (b.height || 0) || b.width || 0;
        return resB - resA;
      });

      const best = sorted[0];
      if (best && best.url) {
        let url = best.url;
        if (url.startsWith("//")) url = `https:${url}`;
        // Enhance YouTube image dimensions if parameterized (e.g. =w120-h120 -> =w544-h544)
        if (url.includes("=w120-h120") || url.includes("=s120")) {
          url = url.replace("=w120-h120", "=w544-h544").replace("=s120", "=s544");
        }
        return url;
      }
    }
  } catch (e) {
    console.warn("[homeFeedService] Error parsing thumbnails:", e);
  }

  if (fallbackId && fallbackId.length === 11) {
    return `https://i.ytimg.com/vi/${fallbackId}/hqdefault.jpg`;
  }

  return "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=544&auto=format&fit=crop&q=80";
}

/**
 * Normalizes an InnerTube item (MusicTwoRowItem, MusicResponsiveListItem, raw renderers)
 * into our clean HomeFeedCardItem interface.
 */
export function normalizeInnerTubeItem(rawInput: any): HomeFeedCardItem | null {
  if (!rawInput) return null;

  try {
    const item =
      rawInput.musicResponsiveListItemRenderer ||
      rawInput.musicTwoRowItemRenderer ||
      rawInput.musicMultiRowListItemRenderer ||
      rawInput;

    // 1. Extract title
    let rawTitle =
      item.title?.toString?.() ||
      item.title?.text ||
      (typeof item.title === "string" ? item.title : "") ||
      item.name?.toString?.() ||
      item.name?.text ||
      "";

    if (!rawTitle && Array.isArray(item.title?.runs)) {
      rawTitle = item.title.runs.map((r: any) => r.text || "").join("");
    }

    // Check flex columns if MusicResponsiveListItem
    if (!rawTitle && Array.isArray(item.flex_columns) && item.flex_columns[0]?.title) {
      const col0 = item.flex_columns[0].title;
      rawTitle = col0.text || col0.toString?.() || (Array.isArray(col0.runs) ? col0.runs.map((r: any) => r.text || "").join("") : "");
    }

    if (!rawTitle) return null;

    // 2. Extract IDs and endpoints
    const payload = item.endpoint?.payload || item.navigationEndpoint?.payload || {};
    let videoId: string | undefined =
      item.id ||
      payload.videoId ||
      item.playlistItemData?.videoId ||
      (item.item_type === "song" || item.item_type === "video" ? item.id : undefined);

    let browseId: string | undefined =
      payload.browseId ||
      item.navigationEndpoint?.browseEndpoint?.browseId ||
      (item.item_type !== "song" && item.item_type !== "video" ? item.id : undefined);

    // If ID is an 11-char video ID, assign videoId
    if (!videoId && typeof item.id === "string" && /^[a-zA-Z0-9_-]{11}$/.test(item.id)) {
      videoId = item.id;
    }

    const id = videoId || browseId || `item-${Math.random().toString(36).substring(2, 9)}`;

    // 3. Determine precise Item Type (SONG, ALBUM, PLAYLIST, ARTIST, VIDEO)
    let itemType: "song" | "playlist" | "album" | "video" | "artist" = "song";
    const declaredType = (item.item_type || item.type || "").toString().toLowerCase();
    const pageType = (
      payload.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType ||
      item.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType ||
      ""
    ).toLowerCase();

    if (
      declaredType === "artist" ||
      pageType.includes("artist") ||
      pageType.includes("user_channel") ||
      (browseId && (browseId.startsWith("UC") || browseId.startsWith("FEmusic_library_privately_owned_artist_detail")))
    ) {
      itemType = "artist";
    } else if (
      declaredType === "album" ||
      pageType.includes("album") ||
      (browseId && browseId.startsWith("MPREb_"))
    ) {
      itemType = "album";
    } else if (
      declaredType === "playlist" ||
      pageType.includes("playlist") ||
      (browseId && (browseId.startsWith("VL") || browseId.startsWith("PL") || browseId.startsWith("RD")))
    ) {
      itemType = "playlist";
    } else if (
      declaredType === "video" ||
      (item.subtitle && /video/i.test(String(item.subtitle)))
    ) {
      itemType = "video";
    } else {
      itemType = "song";
    }

    // 4. Extract Artists and Subtitle
    let artistStr = "";
    if (Array.isArray(item.artists) && item.artists.length > 0) {
      artistStr = item.artists
        .map((a: any) => a.name || a.text || (typeof a === "string" ? a : ""))
        .filter(Boolean)
        .join(", ");
    } else if (Array.isArray(item.authors) && item.authors.length > 0) {
      artistStr = item.authors
        .map((a: any) => a.name || a.text || (typeof a === "string" ? a : ""))
        .filter(Boolean)
        .join(", ");
    } else if (item.author) {
      artistStr = item.author.name || item.author.text || (typeof item.author === "string" ? item.author : "");
    }

    let rawSubtitle =
      item.subtitle?.toString?.() ||
      item.subtitle?.text ||
      (typeof item.subtitle === "string" ? item.subtitle : "") ||
      "";

    if (!rawSubtitle && Array.isArray(item.subtitle?.runs)) {
      rawSubtitle = item.subtitle.runs.map((r: any) => r.text || "").join("");
    }

    // Check flex column 1 for responsive list item
    if (!rawSubtitle && Array.isArray(item.flex_columns) && item.flex_columns[1]?.title) {
      const col1 = item.flex_columns[1].title;
      rawSubtitle = col1.text || col1.toString?.() || (Array.isArray(col1.runs) ? col1.runs.map((r: any) => r.text || "").join("") : "");
    }

    if (!artistStr && rawSubtitle) {
      artistStr = rawSubtitle;
    }

    // 5. Extract duration, year, item count
    const duration =
      item.duration?.toString?.() ||
      item.duration?.text ||
      item.lengthText?.toString?.() ||
      item.lengthText?.text ||
      undefined;

    const year =
      item.year?.toString?.() ||
      item.year?.text ||
      undefined;

    const itemCount =
      item.item_count?.toString?.() ||
      item.item_count?.text ||
      item.song_count?.toString?.() ||
      item.song_count?.text ||
      undefined;

    // 6. Extract highest resolution thumbnail
    const thumbUrl = extractHighestResThumbnail(
      item.thumbnail?.contents || item.thumbnail?.thumbnails || item.thumbnail || item.thumbnails,
      videoId
    );

    return {
      id,
      videoId: itemType === "song" || itemType === "video" ? videoId : undefined,
      browseId,
      title: rawTitle,
      subtitle: rawSubtitle || artistStr || "YouTube Music",
      artist: artistStr || "YouTube Music",
      thumbnail: thumbUrl,
      type: itemType,
      duration,
      year,
      itemCount,
    };
  } catch (err) {
    console.warn("[homeFeedService] Failed to normalize item:", err, rawInput);
    return null;
  }
}

/**
 * Universal InnerTube section / shelf parser.
 * Supports:
 * - `musicCarouselShelfRenderer` (Standard horizontal carousel)
 * - `musicImmersiveCarouselShelfRenderer` (Hero/featured carousels)
 * - `musicShelfRenderer` (Vertical lists like Quick Picks / Song lists)
 * - `musicCardShelfRenderer` (Artist/Album spotlight cards)
 */
export function parseInnerTubeSection(sec: any, index: number): HomeSection | null {
  if (!sec) return null;

  // Unwrap any raw renderer wrapper if present
  const rawSec =
    sec.musicCarouselShelfRenderer ||
    sec.musicImmersiveCarouselShelfRenderer ||
    sec.musicShelfRenderer ||
    sec.musicCardShelfRenderer ||
    sec;

  // 1. Title extraction across all renderer variants
  let rawTitle =
    rawSec.header?.title?.toString?.() ||
    rawSec.header?.title?.text ||
    rawSec.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text ||
    rawSec.header?.musicCarouselShelfBasicHeaderRenderer?.title?.text ||
    rawSec.title?.toString?.() ||
    rawSec.title?.text ||
    (typeof rawSec.title === "string" ? rawSec.title : "") ||
    "";

  if (!rawTitle && Array.isArray(rawSec.title?.runs)) {
    rawTitle = rawSec.title.runs.map((r: any) => r.text || "").join("");
  }

  // 2. Subtitle extraction
  let rawSubtitle =
    rawSec.header?.subtitle?.toString?.() ||
    rawSec.header?.subtitle?.text ||
    rawSec.header?.musicCarouselShelfBasicHeaderRenderer?.subtitle?.runs?.[0]?.text ||
    rawSec.header?.musicCarouselShelfBasicHeaderRenderer?.subtitle?.text ||
    rawSec.subheaders?.[0]?.toString?.() ||
    rawSec.subheaders?.[0]?.text ||
    rawSec.subtitle?.toString?.() ||
    rawSec.subtitle?.text ||
    undefined;

  if (!rawSubtitle && Array.isArray(rawSec.subtitle?.runs)) {
    rawSubtitle = rawSec.subtitle.runs.map((r: any) => r.text || "").join("");
  }

  // 3. Extract items
  let rawItems: any[] = [];
  if (Array.isArray(rawSec.contents)) {
    rawItems = rawSec.contents;
  } else if (rawSec.contents && Array.isArray(rawSec.contents.contents)) {
    rawItems = rawSec.contents.contents;
  }

  const parsedItems: HomeFeedCardItem[] = [];

  for (const rawItem of rawItems) {
    const normalized = normalizeInnerTubeItem(rawItem);
    if (normalized) {
      parsedItems.push(normalized);
    }
  }

  // 4. Special handling for MusicCardShelf (Artist / Album spotlight card)
  const isCardShelf =
    rawSec.type === "MusicCardShelf" ||
    Boolean(rawSec.musicCardShelfRenderer) ||
    Boolean(sec.musicCardShelfRenderer) ||
    Boolean(rawSec.on_tap || rawSec.onTap);

  if (isCardShelf && (rawSec.thumbnail || rawSec.on_tap || rawSec.onTap)) {
    const tapPayload = rawSec.on_tap?.payload || rawSec.onTap?.payload || {};
    const bId = tapPayload.browseId;
    const vId = tapPayload.videoId;
    const spotlightTitle = rawSec.title?.toString?.() || rawSec.title?.text || rawTitle;
    if (spotlightTitle) {
      const spotlightItem: HomeFeedCardItem = {
        id: vId || bId || `spotlight-${index}`,
        videoId: vId,
        browseId: bId,
        title: spotlightTitle,
        subtitle: rawSec.subtitle?.toString?.() || rawSec.subtitle?.text || rawSubtitle || "Featured Spotlight",
        artist: spotlightTitle,
        thumbnail: extractHighestResThumbnail(
          rawSec.thumbnail?.contents || rawSec.thumbnail?.thumbnails || rawSec.thumbnail || rawSec.thumbnails,
          vId
        ),
        type: bId?.startsWith("UC") ? "artist" : bId?.startsWith("MPREb_") ? "album" : "playlist",
      };
      if (parsedItems.length === 0) {
        parsedItems.push(spotlightItem);
      }
    }
  }

  if (parsedItems.length === 0) {
    return null;
  }

  const sectionType =
    rawSec.type ||
    (sec.musicImmersiveCarouselShelfRenderer
      ? "MusicImmersiveCarouselShelf"
      : sec.musicShelfRenderer
      ? "MusicShelf"
      : sec.musicCardShelfRenderer
      ? "MusicCardShelf"
      : "MusicCarouselShelf");

  const titleFallback = index === 0 ? "Quick Picks" : "Recommended for You";

  return {
    id: `sec-${index}-${encodeURIComponent(rawTitle || titleFallback)}-${Math.random().toString(36).substring(2, 6)}`,
    title: rawTitle || titleFallback,
    subtitle: rawSubtitle,
    type: sectionType,
    items: parsedItems,
  };
}

/**
 * Filter sections and individual items against regional noise blocklist.
 */
export function filterSectionsForRegionalNoise(sections: HomeSection[]): HomeSection[] {
  return sections
    .filter((section) => {
      const title = (section.title || "").toLowerCase();
      const subtitle = (section.subtitle || "").toLowerCase();
      return !REGIONAL_BLOCKLIST.some(
        (keyword) => title.includes(keyword) || subtitle.includes(keyword)
      );
    })
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          !containsRegionalNoise(item.title) &&
          !containsRegionalNoise(item.artist) &&
          !containsRegionalNoise(item.subtitle)
      ),
    }))
    .filter((section) => section.items && section.items.length > 0);
}

/**
 * Converts a HomeFeedCardItem into an Oblivion Track model for direct audio playback.
 */
export function homeCardToTrack(item: HomeFeedCardItem): Track {
  const vid = item.videoId || item.id;
  return {
    id: vid,
    youtubeId: vid,
    youtubeVideoId: vid,
    title: item.title,
    artist: item.artist || item.subtitle || "YouTube Music",
    album: item.subtitle || "YouTube Music",
    thumbnail: item.thumbnail,
    coverUrl: item.thumbnail,
    duration: 210,
    audioUrl: `/api/stream?id=${vid}`,
    isVideo: item.type === "video",
  };
}

/**
 * Fetches the next page of YouTube Music Home feed using an InnerTube continuation token.
 */
export async function fetchNextHomeFeedPage(
  continuationToken: string,
  oauthToken?: string
): Promise<HomeFeedResult> {
  if (!continuationToken) {
    return { sections: [] };
  }

  // 1. Try client-side InnerTube execute('/browse')
  try {
    const yt = await getYouTubeClient(oauthToken);
    const res = await (yt as any).actions.execute("/browse", {
      client: "YTMUSIC",
      continuation: continuationToken,
    });

    if (res && res.data) {
      const sectionList = res.data.continuationContents?.sectionListContinuation;
      const rawSections = sectionList?.contents || [];
      const nextToken = sectionList?.continuations?.[0]?.nextContinuationData?.continuation;

      const parsedSections: HomeSection[] = [];
      rawSections.forEach((sec: any, idx: number) => {
        const parsed = parseInnerTubeSection(sec, idx);
        if (parsed) {
          parsedSections.push(parsed);
        }
      });

      const filtered = filterSectionsForRegionalNoise(parsedSections);
      return {
        sections: filtered,
        continuationToken: nextToken,
        hasContinuation: Boolean(nextToken),
      };
    }
  } catch (clientErr) {
    console.warn("[homeFeedService] Client continuation failed, trying server proxy:", clientErr);
  }

  // 2. Fallback to server proxy endpoint with continuation query
  try {
    const url = `/api/innertube/home?continuation=${encodeURIComponent(continuationToken)}`;
    const res = await fetch(url, {
      headers: oauthToken ? { Authorization: `Bearer ${oauthToken}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.sections) {
        return {
          sections: filterSectionsForRegionalNoise(data.sections),
          continuationToken: data.continuationToken,
          hasContinuation: Boolean(data.continuationToken),
        };
      } else if (Array.isArray(data)) {
        return {
          sections: filterSectionsForRegionalNoise(data),
          continuationToken: undefined,
          hasContinuation: false,
        };
      }
    }
  } catch (proxyErr) {
    console.warn("[homeFeedService] Proxy continuation fallback failed:", proxyErr);
  }

  return { sections: [] };
}

/**
 * Fetches the authentic YouTube Music Home feed (FEmusic_home) via youtubei.js (InnerTube API).
 * Extracts initial sections and continuationToken, auto-paginating initial batches to deliver 10+ distinct shelves.
 */
export async function getHomeFeed(oauthToken?: string): Promise<HomeSection[] & { continuationToken?: string }> {
  let allSections: HomeSection[] = [];
  let nextContinuationToken: string | undefined;

  try {
    const yt = await getYouTubeClient(oauthToken);
    let feed = await yt.music.getHomeFeed();

    // Extract initial continuation token from feed page
    const page = (feed as any).page;
    const tab = page?.contents?.item?.()?.tabs?.find((t: any) => t.selected);
    nextContinuationToken = tab?.content?.continuation;

    const rawSections = feed.sections || [];
    rawSections.forEach((sec: any, i: number) => {
      const parsed = parseInnerTubeSection(sec, i);
      if (parsed) {
        allSections.push(parsed);
      }
    });

    allSections = filterSectionsForRegionalNoise(allSections);

    // If initial shelves are fewer than 10 and continuation is available, fetch up to 3-4 initial batches
    let batchCount = 0;
    while (allSections.length < 10 && feed.has_continuation && batchCount < 4) {
      batchCount++;
      try {
        feed = await feed.getContinuation();
        const contPage = (feed as any).page;
        const contObj = contPage?.continuation_contents;
        nextContinuationToken = contObj?.continuation || nextContinuationToken;

        if (Array.isArray(feed.sections)) {
          const contSections: HomeSection[] = [];
          feed.sections.forEach((sec: any, i: number) => {
            const parsed = parseInnerTubeSection(sec, allSections.length + i);
            if (parsed) {
              contSections.push(parsed);
            }
          });
          const filteredCont = filterSectionsForRegionalNoise(contSections);
          allSections.push(...filteredCont);
        }
      } catch (contErr) {
        console.warn("[homeFeedService] Initial batch continuation error:", contErr);
        break;
      }
    }

    if (allSections.length > 0) {
      const result = allSections as HomeSection[] & { continuationToken?: string };
      result.continuationToken = nextContinuationToken;
      return result;
    }
  } catch (clientErr) {
    console.warn("[homeFeedService] Client-side InnerTube fetch encountered an issue, trying server proxy:", clientErr);
  }

  // Resilient fallback to server proxy endpoint
  try {
    const res = await fetch("/api/innertube/home", {
      headers: oauthToken ? { Authorization: `Bearer ${oauthToken}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      let rawSections: any[] = [];
      if (data && Array.isArray(data.sections)) {
        rawSections = data.sections;
        nextContinuationToken = data.continuationToken;
      } else if (Array.isArray(data)) {
        rawSections = data;
      }

      if (rawSections.length > 0) {
        const filteredProxy = filterSectionsForRegionalNoise(rawSections);
        const result = filteredProxy as HomeSection[] & { continuationToken?: string };
        result.continuationToken = nextContinuationToken;
        return result;
      }
    }
  } catch (proxyErr) {
    console.warn("[homeFeedService] Proxy fallback failed:", proxyErr);
  }

  const emptyResult = [] as HomeSection[] & { continuationToken?: string };
  return emptyResult;
}
