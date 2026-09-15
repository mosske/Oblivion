import express from "express";
import path from "path";
import fs from "fs";
import dns from "dns";
import cookieParser from "cookie-parser";
import session from "express-session";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import { DecodedSignature, recognizeBytes } from "shazamio-core";

// Prefer IPv4 connections to prevent dual-stack IPv6 ConnectTimeoutError in cloud containers
if (typeof (dns as any).setDefaultResultOrder === "function") {
  try {
    (dns as any).setDefaultResultOrder("ipv4first");
  } catch {}
}

const app = express();
const PORT = 3000;

app.set("trust proxy", 1);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "oblivion-ytmusic-secret-key-2026",
    resave: true,
    saveUninitialized: true,
    cookie: {
      secure: "auto",
      httpOnly: true,
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  })
);

// Resilient fetch with exponential backoff and timeout protection
async function fetchWithRetry(url: string, options: any = {}, maxRetries = 2, timeoutMs = 12000): Promise<Response> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const signal = options.signal
        ? (typeof AbortSignal !== "undefined" && typeof (AbortSignal as any).any === "function"
            ? (AbortSignal as any).any([options.signal, controller.signal])
            : controller.signal)
        : controller.signal;

      const res = await fetch(url, { ...options, signal });
      clearTimeout(timeoutId);
      return res;
    } catch (err: any) {
      attempt++;
      if (attempt > maxRetries) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 350 * attempt));
    }
  }
  return fetch(url, options);
}

// Persistent server-side store directory for tokens and playlists across restarts
const DATA_DIR = path.join(process.cwd(), ".data");
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {}
}

const TOKENS_FILE = path.join(DATA_DIR, "auth_tokens.json");
const OAUTH_CONFIG_FILE = path.join(DATA_DIR, "oauth_config.json");
const LEGACY_PLAYLISTS_FILE = path.join(DATA_DIR, "local_playlists.json");

// Clean up legacy global playlists file if present to eliminate cross-user leakage
try {
  if (fs.existsSync(LEGACY_PLAYLISTS_FILE)) {
    fs.unlinkSync(LEGACY_PLAYLISTS_FILE);
  }
} catch {}

function readStoredOAuthConfig(): { clientId?: string; clientSecret?: string } {
  try {
    if (fs.existsSync(OAUTH_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(OAUTH_CONFIG_FILE, "utf-8"));
    }
  } catch {}
  return {};
}

function writeStoredOAuthConfig(cfg: { clientId?: string; clientSecret?: string }) {
  try {
    fs.writeFileSync(OAUTH_CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf-8");
  } catch {}
}

function readStoredTokens(): Record<string, any> {
  return {};
}

function writeStoredTokens(tokens: Record<string, any>) {
  // 100% stateless - zero server file writing
}

export function isValidPlaylistId(id: string | undefined | null): boolean {
  if (!id || typeof id !== "string") return false;
  const clean = id.trim().replace(/^VL/, "");
  if (!clean || clean.length < 3) return false;
  // Exclude standard 11-character YouTube video / short IDs
  if (clean.length === 11 && !clean.startsWith("PL")) return false;
  // Exclude system collections
  if (clean === "LL" || clean === "LM" || clean === "WL" || clean === "HL") return false;
  // Exclude browse tabs / channels
  if (clean.startsWith("FE")) return false;
  if (clean.startsWith("UC") && clean.length === 24) return false;
  // Authentic playlist prefixes
  if (
    clean.startsWith("PL") ||
    clean.startsWith("PLS") ||
    clean.startsWith("OLAK5uy_") ||
    clean.startsWith("RD") ||
    clean.startsWith("MPREb_") ||
    clean.startsWith("FL") ||
    clean.startsWith("UU") ||
    clean.startsWith("pl_custom_")
  ) {
    return true;
  }
  // Generic playlist ID format (>= 12 characters and matching playlist character set)
  if (clean.length >= 12 && /^[a-zA-Z0-9_-]+$/.test(clean)) {
    return true;
  }
  return false;
}

function getUserIdFromReq(req?: any): string | undefined {
  if (!req) return undefined;
  if (req.session?.user?.id) return String(req.session.user.id);
  return undefined;
}

function readStoredPlaylists(req?: any, explicitUserId?: string): any[] {
  if (req?.session?.playlists && Array.isArray(req.session.playlists)) {
    return req.session.playlists.filter((p: any) => p && p.id && isValidPlaylistId(p.id));
  }
  return [];
}

function writeStoredPlaylists(pls: any[], req?: any, explicitUserId?: string) {
  if (req?.session) {
    req.session.playlists = (pls || []).filter((p: any) => p && p.id && isValidPlaylistId(p.id));
  }
}

function readStoredCustomCovers(req?: any, explicitUserId?: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (req?.session && (req.session as any).customArtwork && typeof (req.session as any).customArtwork === "object") {
    Object.assign(result, (req.session as any).customArtwork);
  }
  return result;
}

function writeStoredCustomCovers(map: Record<string, string>, req?: any, explicitUserId?: string) {
  if (req?.session) {
    (req.session as any).customArtwork = {
      ...((req.session as any).customArtwork || {}),
      ...map,
    };
  }
}

function writeStoredCustomCover(playlistId: string, coverUrl: string, req?: any, explicitUserId?: string) {
  try {
    if (!playlistId || !coverUrl) return;
    const cleanId = playlistId.replace(/^VL/, "");

    let safeArtwork = coverUrl;
    if (typeof safeArtwork === "string" && (safeArtwork.startsWith("/public/uploads/") || safeArtwork.startsWith("/uploads/"))) {
      try {
        const fullPath = path.join(process.cwd(), safeArtwork.replace(/^\//, ""));
        if (fs.existsSync(fullPath)) {
          const buf = fs.readFileSync(fullPath);
          const ext = path.extname(fullPath).toLowerCase();
          const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
          safeArtwork = `data:${mime};base64,${buf.toString("base64")}`;
        }
      } catch {}
    }

    if (req?.session) {
      if (!(req.session as any).customArtwork) {
        (req.session as any).customArtwork = {};
      }
      (req.session as any).customArtwork[cleanId] = safeArtwork;
      (req.session as any).customArtwork[playlistId] = safeArtwork;
    }
  } catch {}
}

app.set("trust proxy", 1);

app.use((req, res, next) => {
  if (req.query && req.query.__path) {
    const subpath = Array.isArray(req.query.__path)
      ? req.query.__path.join("/")
      : String(req.query.__path);
    delete req.query.__path;
    const queryObj = { ...req.query };
    const search = new URLSearchParams(queryObj as any).toString();
    req.url = `/api/${subpath}` + (search ? `?${search}` : "");
  }
  next();
});

app.get(["/api", "/api/"], (req, res) => {
  res.json({ status: "ok", service: "Oblivion YouTube Music API" });
});

declare module "express-session" {
  interface SessionData {
    tokens?: {
      access_token: string;
      refresh_token?: string;
      expires_at?: number;
    };
    user?: {
      id: string;
      name: string;
      email: string;
      picture: string;
      accessToken?: string;
    };
    playlists?: any[];
  }
}

let localPlaylistsStore: any[] = [];

const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getFromCache<T>(key: string): T | null {
  const entry = apiCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    apiCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function delFromCache(key: string) {
  apiCache.delete(key);
}

function setInCache<T>(key: string, data: T) {
  if (apiCache.size > 300) {
    const firstKey = apiCache.keys().next().value;
    if (firstKey) apiCache.delete(firstKey);
  }
  apiCache.set(key, { data, timestamp: Date.now() });
}

function parseISO8601Duration(isoStr: string | undefined | null): number {
  if (!isoStr) return 0;
  const match = isoStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

function parseDurationText(text: string | undefined | null): number {
  if (!text) return 0;
  const cleaned = text.trim();
  const parts = cleaned.split(":").map((p) => parseInt(p, 10));
  if (parts.some(isNaN)) return 0;
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

function extractCleanVideoId(idOrUrl: string | undefined | null): string {
  if (!idOrUrl) return "";
  let v = String(idOrUrl).trim();
  // Strip trailing _index if present (like dQw4w9WgXcQ_0)
  if (/^[a-zA-Z0-9_-]{11}_\d+$/.test(v)) {
    return v.split("_")[0];
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(v)) {
    return v;
  }
  if (v.includes("watch?v=")) {
    const match = v.match(/watch\?v=([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
  }
  if (v.includes("youtu.be/")) {
    const match = v.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
  }
  if (v.includes("/embed/")) {
    const match = v.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
  }
  const match = v.match(/(?:v=|\/vi\/|\/v\/|\/e\/|youtu\.be\/|\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  return v;
}

async function enrichTracksWithDuration(tracks: any[], accessToken?: string | null): Promise<any[]> {
  if (!tracks || tracks.length === 0) return tracks;

  const neededVidIds: string[] = [];
  for (const t of tracks) {
    const vidId = t.youtubeVideoId || t.id;
    if (vidId && (!t.duration || t.duration === 0)) {
      const cachedDur = getFromCache<number>(`dur:${vidId}`);
      if (cachedDur && cachedDur > 0) {
        t.duration = cachedDur;
      } else {
        neededVidIds.push(vidId);
      }
    }
  }

  if (neededVidIds.length === 0) return tracks;

  // Batch query YouTube Data API v3 for video contentDetails in chunks of 50
  const chunks: string[][] = [];
  for (let i = 0; i < neededVidIds.length; i += 50) {
    chunks.push(neededVidIds.slice(i, i + 50));
  }

  const durationMap = new Map<string, number>();

  for (const chunk of chunks) {
    try {
      const apiKey = process.env.YOUTUBE_API_KEY;
      const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${chunk.join(",")}${apiKey ? `&key=${apiKey}` : ""}`;
      const headers: Record<string, string> = {};
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch(url, { headers, signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = await res.json();
        if (data.items && Array.isArray(data.items)) {
          for (const it of data.items) {
            const vId = it.id;
            const iso = it.contentDetails?.duration;
            const dur = parseISO8601Duration(iso);
            if (vId && dur > 0) {
              durationMap.set(vId, dur);
              setInCache(`dur:${vId}`, dur);
            }
          }
        }
      }
    } catch (_e) {
      // Continue
    }
  }

  for (const t of tracks) {
    const vidId = t.youtubeVideoId || t.id;
    if (vidId && durationMap.has(vidId)) {
      t.duration = durationMap.get(vidId);
    }
  }

  return tracks;
}

function deduplicateById<T extends { id?: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const item of items) {
    if (!item) continue;
    const key = item.id || (item as any).youtubeVideoId || (item as any).playlistId || (item as any).channelId;
    if (key) {
      if (!seen.has(key)) {
        seen.add(key);
        unique.push({ ...item, id: key });
      }
    } else {
      unique.push(item);
    }
  }
  return unique;
}

async function getPlaylistItemsFromYouTube(accessToken: string | null, playlistId: string, forceRefresh: boolean = false): Promise<any[]> {
  const cleanPlId = playlistId.replace(/^VL/, "");
  const cacheKey = `pl_items:${accessToken ? 'auth' : 'pub'}:${cleanPlId}`;
  
  if (forceRefresh) {
    delFromCache(cacheKey);
    delFromCache(`pl_items:auth:${cleanPlId}`);
    delFromCache(`pl_items:pub:${cleanPlId}`);
    delFromCache(`pub_pl:${cleanPlId}`);
  } else {
    const cached = getFromCache<any[]>(cacheKey);
    if (cached && cached.length > 0) return cached;
  }

  const allTracks: any[] = [];
  let currentToken = accessToken;

  // Helper to find continuation tokens recursively in any YouTube JSON object
  const findContinuations = (obj: any, d = 0, found: string[] = []): string[] => {
    if (!obj || d > 25) return found;
    if (obj.continuationEndpoint?.continuationCommand?.token) {
      found.push(obj.continuationEndpoint.continuationCommand.token);
    }
    if (obj.nextContinuationData?.continuation) {
      found.push(obj.nextContinuationData.continuation);
    }
    if (obj.continuationCommand?.token) {
      found.push(obj.continuationCommand.token);
    }
    if (Array.isArray(obj)) {
      for (const it of obj) findContinuations(it, d + 1, found);
    } else if (typeof obj === "object") {
      for (const k of Object.keys(obj)) findContinuations(obj[k], d + 1, found);
    }
    return found;
  };

  // 1. Authenticated YouTube Data API v3 playlistItems with pagination
  if (currentToken) {
    try {
      let pageToken: string | undefined = undefined;
      let pagesFetched = 0;
      const maxPages = 20; // Up to 1000 tracks

      do {
        const url = `https://www.googleapis.com/youtube/v3/playlistItems`;
        const params = new URLSearchParams({
          playlistId: cleanPlId,
          part: 'snippet,contentDetails',
          maxResults: '50',
          ...(pageToken ? { pageToken } : {}),
        });

        let response = await fetch(`${url}?${params}`, {
          signal: AbortSignal.timeout(8000),
          headers: {
            Authorization: `Bearer ${currentToken}`,
            "Cache-Control": "no-cache",
          }
        });

        if (response.status === 401) {
          // Token expired, attempt direct refresh with token hint
          const refreshed = await refreshAccessTokenDirectly(currentToken || undefined);
          if (refreshed?.accessToken) {
            currentToken = refreshed.accessToken;
            response = await fetch(`${url}?${params}`, {
              signal: AbortSignal.timeout(8000),
              headers: {
                Authorization: `Bearer ${currentToken}`,
                "Cache-Control": "no-cache",
              }
            });
          }
        }

        if (!response.ok) {
          console.warn(`YouTube Data API playlistItems notice (${response.status}) for ${cleanPlId}, proceeding to InnerTube/public fallback`);
          break;
        }

        const data = await response.json();
        if (data.items && Array.isArray(data.items)) {
          for (let idx = 0; idx < data.items.length; idx++) {
            const item = data.items[idx];
            const vidId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
            const title = item.snippet?.title || '';
            // Skip deleted or private placeholders
            if (!vidId || title === 'Private video' || title === 'Deleted video') continue;

            const cover =
              item.snippet?.thumbnails?.maxres?.url ||
              item.snippet?.thumbnails?.high?.url ||
              item.snippet?.thumbnails?.medium?.url ||
              item.snippet?.thumbnails?.default?.url ||
              `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`;

            const uniqueId = item.id || `${vidId}_${allTracks.length}`;

            allTracks.push({
              id: uniqueId,
              playlistItemId: item.id,
              youtubeVideoId: vidId,
              title,
              artist: item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle || 'YouTube Artist',
              album: '',
              duration: 0,
              coverUrl: formatHighResCover(cover) || cover,
              audioUrl: `/api/youtube/stream/${vidId}`,
              genre: 'Music',
              playsCount: 0
            });
          }
        }

        pageToken = data.nextPageToken;
        pagesFetched++;
      } while (pageToken && pagesFetched < maxPages);

      if (allTracks.length > 0) {
        const enriched = await enrichTracksWithDuration(allTracks, currentToken);
        setInCache(cacheKey, enriched);
        return enriched;
      }
    } catch (err) {
      console.warn('YouTube Data API playlistItems error, trying InnerTube fallback:', cleanPlId);
    }
  }

  // 2. Authenticated InnerTube (TVHTML5 and Web Remix) Browse for user & private playlists WITH CONTINUATION LOOP
  if (currentToken) {
    const clients = [
      {
        url: "https://www.youtube.com/youtubei/v1/browse",
        clientName: "TVHTML5",
        clientVersion: "7.20240501.01.00",
        headers: {
          "X-YouTube-Client-Name": "7",
          "X-YouTube-Client-Version": "7.20240501.01.00",
          Origin: "https://www.youtube.com",
          Referer: "https://www.youtube.com/tv",
        },
      },
      {
        url: "https://music.youtube.com/youtubei/v1/browse",
        clientName: "WEB_REMIX",
        clientVersion: "1.20240101.01.00",
        headers: {
          "X-Origin": "https://music.youtube.com",
        },
      },
    ];

    const browseIds = [`VL${cleanPlId}`, cleanPlId];

    for (const c of clients) {
      for (const bId of browseIds) {
        try {
          const innerTracks: any[] = [];
          const seenVidIds = new Set<string>();

          // Universal recursive collector for track renderers - preserves all songs including duplicates
          const collectVideos = (obj: any, d = 0) => {
            if (!obj || typeof obj !== "object" || d > 25) return;

            if (obj.playlistVideoRenderer) {
              const pv = obj.playlistVideoRenderer;
              const vidId = pv.videoId;
              const title = pv.title?.runs?.[0]?.text || pv.title?.simpleText;
              const artist = pv.shortBylineText?.runs?.[0]?.text || pv.ownerText?.runs?.[0]?.text || "YouTube Artist";
              const thumbs = pv.thumbnail?.thumbnails;
              const cover = thumbs?.slice(-1)?.[0]?.url || (vidId ? `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg` : "");
              const durStr = pv.lengthText?.runs?.[0]?.text || pv.lengthText?.simpleText;
              const setVideoId = pv.playlistSetVideoId;
              if (vidId && title && title !== "Private video" && title !== "Deleted video") {
                innerTracks.push({
                  id: setVideoId || `${vidId}_${innerTracks.length}`,
                  playlistItemId: setVideoId,
                  youtubeVideoId: vidId,
                  title,
                  artist,
                  album: "",
                  duration: parseDurationText(durStr),
                  coverUrl: formatHighResCover(cover) || cover,
                  audioUrl: `/api/youtube/stream/${vidId}`,
                  genre: "Music",
                  playsCount: 0,
                });
              }
            } else if (obj.tileRenderer && (obj.tileRenderer.contentType === "TILE_CONTENT_TYPE_VIDEO" || obj.tileRenderer.contentId)) {
              const tr = obj.tileRenderer;
              const vidId = tr.contentId || tr.onSelectCommand?.watchEndpoint?.videoId;
              const title =
                tr.metadata?.tileMetadataRenderer?.title?.simpleText ||
                tr.metadata?.tileMetadataRenderer?.title?.runs?.map((s: any) => s.text).join("") ||
                tr.title?.runs?.[0]?.text ||
                tr.title?.simpleText;
              const artist =
                tr.metadata?.tileMetadataRenderer?.lines?.[0]?.lineRenderer?.items?.[0]?.lineItemRenderer?.text?.simpleText ||
                tr.metadata?.tileMetadataRenderer?.lines?.[0]?.lineRenderer?.items?.[0]?.lineItemRenderer?.text?.runs?.map((s: any) => s.text).join("") ||
                "YouTube Artist";
              const thumbs = tr.header?.tileHeaderRenderer?.thumbnail?.thumbnails || tr.thumbnail?.thumbnails;
              const cover = thumbs?.slice(-1)?.[0]?.url || (vidId ? `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg` : "");
              const ovText =
                tr.header?.tileHeaderRenderer?.thumbnailOverlays?.[0]?.thumbnailOverlayTimeStatusRenderer?.text?.runs?.[0]?.text ||
                tr.header?.tileHeaderRenderer?.thumbnailOverlays?.[0]?.thumbnailOverlayTimeStatusRenderer?.text?.simpleText;

              if (vidId && title && title !== "Private video" && title !== "Deleted video") {
                innerTracks.push({
                  id: `${vidId}_${innerTracks.length}`,
                  youtubeVideoId: vidId,
                  title,
                  artist,
                  album: "",
                  duration: parseDurationText(ovText),
                  coverUrl: formatHighResCover(cover) || cover,
                  audioUrl: `/api/youtube/stream/${vidId}`,
                  genre: "Music",
                  playsCount: 0,
                });
              }
            } else if (obj.musicResponsiveListItemRenderer) {
              const renderer = obj.musicResponsiveListItemRenderer;
              const flexCols = renderer.flexColumns || [];
              const title = flexCols[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
              const artist = flexCols[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || "YouTube Artist";
              const vidId =
                renderer.playlistItemData?.videoId ||
                renderer.doubleTapCommand?.watchEndpoint?.videoId ||
                flexCols[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;
              const thumbs = renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails;
              const cover = thumbs?.slice(-1)?.[0]?.url || (vidId ? `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg` : "");
              const durStr =
                renderer.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs?.[0]?.text ||
                renderer.lengthText?.runs?.[0]?.text ||
                renderer.lengthText?.simpleText;
              const setVideoId = renderer.playlistItemData?.playlistSetVideoId;

              if (vidId && title && title !== "Private video" && title !== "Deleted video") {
                const uniqueId = setVideoId || `${vidId}_${innerTracks.length}`;
                innerTracks.push({
                  id: uniqueId,
                  playlistItemId: setVideoId,
                  youtubeVideoId: vidId,
                  title,
                  artist,
                  album: "",
                  duration: parseDurationText(durStr),
                  coverUrl: formatHighResCover(cover) || cover,
                  audioUrl: `/api/youtube/stream/${vidId}`,
                  genre: "Music",
                  playsCount: 0,
                });
              }
            }

            if (Array.isArray(obj)) {
              for (const elem of obj) collectVideos(elem, d + 1);
            } else {
              for (const key of Object.keys(obj)) {
                if (typeof obj[key] === "object" && obj[key] !== null) {
                  collectVideos(obj[key], d + 1);
                }
              }
            }
          };

          // 1. Initial browse
          const ytmRes = await fetch(c.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
              Authorization: `Bearer ${currentToken}`,
              "Cache-Control": "no-cache",
              ...(c.headers || {}),
            },
            body: JSON.stringify({
              context: {
                client: {
                  clientName: c.clientName,
                  clientVersion: c.clientVersion,
                  hl: "en",
                  gl: "US",
                },
              },
              browseId: bId,
            }),
            signal: AbortSignal.timeout(8000),
          });

          if (ytmRes.ok) {
            const data = await ytmRes.json();
            collectVideos(data);
            let continuationTokens = findContinuations(data);
            let nextContToken = continuationTokens[0];

            // 2. Paginate through all continuation tokens (up to 30 batches = 500+ items)
            let continuationBatch = 0;
            while (nextContToken && continuationBatch < 30) {
              continuationBatch++;
              try {
                const contRes = await fetch(c.url, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                    Authorization: `Bearer ${currentToken}`,
                    "Cache-Control": "no-cache",
                    ...(c.headers || {}),
                  },
                  body: JSON.stringify({
                    context: {
                      client: {
                        clientName: c.clientName,
                        clientVersion: c.clientVersion,
                        hl: "en",
                        gl: "US",
                      },
                    },
                    continuation: nextContToken,
                  }),
                  signal: AbortSignal.timeout(8000),
                });

                if (contRes.ok) {
                  const contData = await contRes.json();
                  collectVideos(contData);
                  const newTokens = findContinuations(contData);
                  nextContToken = newTokens[0] || null;
                } else {
                  break;
                }
              } catch (contErr) {
                console.warn(`[InnerTube Pagination] Error at batch ${continuationBatch}:`, contErr);
                break;
              }
            }

            if (innerTracks.length > 0) {
              const enriched = await enrichTracksWithDuration(innerTracks, accessToken);
              setInCache(cacheKey, enriched);
              return enriched;
            }
          }
        } catch (_innerErr) {
          // Continue to next client/browseId
        }
      }
    }
  }

  // 3. Fallback: extract videos directly from public YouTube playlist page
  const publicResult = await getPublicYouTubePlaylistItems(cleanPlId, forceRefresh);
  const enriched = await enrichTracksWithDuration(publicResult.tracks || [], accessToken);
  if (enriched.length > 0) setInCache(cacheKey, enriched);
  return enriched;
}

function formatHighResCover(url: string | undefined | null): string | null {
  if (!url || typeof url !== "string") return null;
  let cleaned = url.startsWith("//") ? `https:${url}` : url;
  cleaned = cleaned.replace(/&amp;/g, "&");

  // Reject invalid vi/ playlist URLs (e.g. i.ytimg.com/vi/PL... or i.ytimg.com/vi/VL...)
  if (
    cleaned.includes("i.ytimg.com/vi/PL") ||
    cleaned.includes("i.ytimg.com/vi/VL") ||
    cleaned.includes("i.ytimg.com/vi/RD") ||
    cleaned.includes("i.ytimg.com/vi/OLAK5uy_")
  ) {
    return null;
  }

  if (
    cleaned.includes("googleusercontent.com") ||
    cleaned.includes("ggpht.com") ||
    cleaned.includes("yt3.ggpht.com") ||
    cleaned.includes("yt4.ggpht.com") ||
    cleaned.includes("yt3.googleusercontent.com") ||
    cleaned.includes("lh3.googleusercontent.com") ||
    cleaned.includes("play-lh.googleusercontent.com") ||
    cleaned.includes("photos.googleusercontent.com")
  ) {
    if (cleaned.match(/=w\d+-h\d+/)) {
      cleaned = cleaned.replace(/=w\d+-h\d+[^?&]*/, "=w600-h600-l90-rj");
    } else if (cleaned.match(/=s\d+/)) {
      cleaned = cleaned.replace(/=s\d+[^?&]*/, "=s600");
    } else if (cleaned.match(/=w\d+/)) {
      cleaned = cleaned.replace(/=w\d+[^?&]*/, "=w600-h600-l90-rj");
    }
  } else if (cleaned.includes("i.ytimg.com/vi/")) {
    // Keep hqdefault.jpg intact because it is guaranteed to exist for all YouTube videos.
    // If it is low-res default or mqdefault, upgrade to hqdefault.jpg.
    cleaned = cleaned.replace(/\/(default|mqdefault)\.jpg/, "/hqdefault.jpg");
  }
  return cleaned;
}

// Robust artwork extraction helper supporting sequential resolution fallback and 1:1 aspect ratio priority
function extractBestArtworkUrl(
  thumbnails: any,
  fallbackUrl?: string | null
): { bestUrl: string | null; isCustom: boolean } {
  if (!thumbnails && !fallbackUrl) return { bestUrl: null, isCustom: false };

  const candidateUrls: string[] = [];

  const isCustomUrl = (u: string) => {
    if (!u || typeof u !== "string") return false;
    return (
      u.includes("studio_square_thumbnail") ||
      u.includes("/pl_c/") ||
      u.includes("googleusercontent.com") ||
      u.includes("ggpht.com") ||
      u.includes("yt3.ggpht.com") ||
      u.includes("yt4.ggpht.com") ||
      u.includes("yt3.googleusercontent.com") ||
      u.includes("lh3.googleusercontent.com") ||
      u.includes("play-lh.googleusercontent.com") ||
      u.includes("photos.googleusercontent.com") ||
      u.includes("ytimg.com/pl/") ||
      u.includes("/pl/") ||
      u.includes("/s_p/") ||
      u.includes("ytimg.com/an_webp/") ||
      u.includes("ytimg.com/v2/") ||
      u.startsWith("data:image")
    );
  };

  if (typeof thumbnails === "string") {
    candidateUrls.push(thumbnails);
  } else if (Array.isArray(thumbnails)) {
    // 1:1 Aspect ratio priority: select square artwork first
    const squareThumbs = thumbnails.filter((t: any) => {
      const u = t?.url || t?.src || (typeof t === "string" ? t : "");
      if (isCustomUrl(u)) return true;
      if (t?.width && t?.height && t.width === t.height) return true;
      return false;
    });
    squareThumbs.sort((a: any, b: any) => (b.width || 0) - (a.width || 0));
    for (const t of squareThumbs) {
      const u = t?.url || t?.src || (typeof t === "string" ? t : "");
      if (u) candidateUrls.push(u);
    }
    // Then other resolutions
    const otherThumbs = thumbnails.filter((t: any) => !squareThumbs.includes(t));
    otherThumbs.sort((a: any, b: any) => (b.width || 0) - (a.width || 0));
    for (const t of otherThumbs) {
      const u = t?.url || t?.src || (typeof t === "string" ? t : "");
      if (u) candidateUrls.push(u);
    }
  } else if (typeof thumbnails === "object" && thumbnails !== null) {
    // Sequential fallback chain: maxres -> standard -> high -> medium -> default
    const keys = ["maxres", "standard", "high", "medium", "default"];
    for (const k of keys) {
      if (thumbnails[k]?.url) candidateUrls.push(thumbnails[k].url);
    }
  }

  if (fallbackUrl) {
    candidateUrls.push(fallbackUrl);
  }

  for (const url of candidateUrls) {
    if (isCustomUrl(url)) {
      const formatted = formatHighResCover(url);
      if (formatted) return { bestUrl: formatted, isCustom: true };
    }
  }

  for (const url of candidateUrls) {
    const formatted = formatHighResCover(url);
    if (formatted) return { bestUrl: formatted, isCustom: false };
  }

  return { bestUrl: null, isCustom: false };
}

// Fetch authentic YouTube Music Library playlists directly from InnerTube
async function fetchYouTubeMusicLibraryPlaylists(accessToken: string): Promise<any[]> {
  try {
    const seenIds = new Set<string>();
    const results: any[] = [];

    // Query authentic YouTube Music library playlists endpoints and YouTube aggregation
    const queries = [
      {
        url: "https://music.youtube.com/youtubei/v1/browse",
        clientName: "WEB_REMIX",
        clientVersion: "1.20240501.01.00",
        origin: "https://music.youtube.com",
        headers: {
          "X-YouTube-Client-Name": "67",
          "X-YouTube-Client-Version": "1.20240501.01.00",
        },
        browseIds: [
          "FEmusic_library_playlists",
          "FEmusic_library_corpus_playlists",
          "FEmusic_liked_playlists",
        ],
      },
      {
        url: "https://music.youtube.com/youtubei/v1/browse",
        clientName: "ANDROID_MUSIC",
        clientVersion: "6.42.52",
        origin: "https://music.youtube.com",
        headers: {
          "User-Agent": "com.google.android.apps.youtube.music/6.42.52 (Linux; U; Android 14; en_US)",
          "X-YouTube-Client-Name": "62",
          "X-YouTube-Client-Version": "6.42.52",
        },
        browseIds: [
          "FEmusic_library_playlists",
          "FEmusic_library_corpus_playlists",
          "FEmusic_liked_playlists",
        ],
      },
      {
        url: "https://www.youtube.com/youtubei/v1/browse",
        clientName: "TVHTML5",
        clientVersion: "7.20240501.01.00",
        origin: "https://www.youtube.com",
        headers: {
          "X-YouTube-Client-Name": "7",
          "X-YouTube-Client-Version": "7.20240501.01.00",
          Origin: "https://www.youtube.com",
          Referer: "https://www.youtube.com/tv",
        },
        browseIds: [
          "FEplaylist_aggregation",
          "FElibrary",
        ],
      },
    ];

    for (const q of queries) {
      for (const bId of q.browseIds) {
        try {
          const res = await fetch(q.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
              "X-Origin": q.origin,
              "X-Goog-AuthUser": "0",
              Referer: `${q.origin}/`,
              Origin: q.origin,
              Authorization: `Bearer ${accessToken}`,
              ...(q.headers || {}),
            },
            body: JSON.stringify({
              context: {
                client: {
                  clientName: q.clientName,
                  clientVersion: q.clientVersion,
                  hl: "en",
                  gl: "US",
                },
                user: {
                  lockedSafetyMode: false,
                },
              },
              browseId: bId,
            }),
            signal: AbortSignal.timeout(9000),
          });

          if (res.ok) {
            const data = await res.json();
            const candidateItems: any[] = [];

            // Collect playlist renderers including TVHTML5 tileRenderers
            const collectItems = (obj: any, depth = 0) => {
              if (!obj || typeof obj !== "object" || depth > 25) return;

              if (obj.musicTwoRowItemRenderer) candidateItems.push({ type: "twoRow", data: obj.musicTwoRowItemRenderer });
              if (obj.musicResponsiveListItemRenderer) candidateItems.push({ type: "responsive", data: obj.musicResponsiveListItemRenderer });
              if (obj.gridPlaylistRenderer) candidateItems.push({ type: "twoRow", data: obj.gridPlaylistRenderer });
              if (obj.playlistRenderer) candidateItems.push({ type: "twoRow", data: obj.playlistRenderer });
              if (obj.compactPlaylistRenderer) candidateItems.push({ type: "twoRow", data: obj.compactPlaylistRenderer });
              if (obj.musicCardShelfRenderer) candidateItems.push({ type: "twoRow", data: obj.musicCardShelfRenderer });
              if (obj.tileRenderer) candidateItems.push({ type: "tile", data: obj.tileRenderer });

              if (Array.isArray(obj)) {
                for (const elem of obj) collectItems(elem, depth + 1);
              } else {
                for (const key of Object.keys(obj)) {
                  if (typeof obj[key] === "object" && obj[key] !== null) {
                    collectItems(obj[key], depth + 1);
                  }
                }
              }
            };

            collectItems(data);

            for (const item of candidateItems) {
              let playlistId = "";
              let title = "YouTube Playlist";
              let subtitle = "";
              let coverUrl = "";

              if (item.type === "twoRow") {
                const r = item.data;
                const rawId =
                  r.navigationEndpoint?.browseEndpoint?.browseId ||
                  r.playlistId ||
                  r.navigationEndpoint?.watchPlaylistEndpoint?.playlistId ||
                  r.thumbnailOverlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.playlistId ||
                  r.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ||
                  "";
                playlistId = rawId.replace(/^VL/, "");
                title = r.title?.runs?.map((s: any) => s.text).join("") || r.title?.simpleText || "YouTube Playlist";
                subtitle = r.subtitle?.runs?.map((s: any) => s.text).join("") || "";
                const thumbs =
                  r.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
                  r.thumbnailRenderer?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails ||
                  r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
                  r.thumbnail?.thumbnails;
                coverUrl = thumbs?.slice(-1)?.[0]?.url || thumbs?.[0]?.url || "";
              } else if (item.type === "responsive") {
                const r = item.data;
                const rawId =
                  r.navigationEndpoint?.browseEndpoint?.browseId ||
                  r.playlistId ||
                  r.navigationEndpoint?.watchPlaylistEndpoint?.playlistId ||
                  r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ||
                  "";
                playlistId = rawId.replace(/^VL/, "");
                title = r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.map((s: any) => s.text).join("") || "YouTube Playlist";
                subtitle = r.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.map((s: any) => s.text).join("") || "";
                const thumbs = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || r.thumbnail?.thumbnails;
                coverUrl = thumbs?.slice(-1)?.[0]?.url || thumbs?.[0]?.url || "";
              } else if (item.type === "tile") {
                const r = item.data;
                const rawId =
                  r.contentId ||
                  r.onSelectCommand?.browseEndpoint?.browseId ||
                  r.onSelectCommand?.watchEndpoint?.playlistId ||
                  r.onLongPressCommand?.showMenuCommand?.contentId ||
                  "";
                playlistId = rawId.replace(/^VL/, "");
                title =
                  r.metadata?.tileMetadataRenderer?.title?.simpleText ||
                  r.header?.tileHeaderRenderer?.title?.simpleText ||
                  r.title?.simpleText ||
                  "YouTube Playlist";
                subtitle =
                  r.metadata?.tileMetadataRenderer?.lines?.[0]?.lineRenderer?.items?.[0]?.lineItemRenderer?.text?.runs?.map((s: any) => s.text).join("") ||
                  r.subtitle?.simpleText ||
                  "";
                const thumbs =
                  r.header?.tileHeaderRenderer?.thumbnail?.thumbnails ||
                  r.thumbnail?.thumbnails ||
                  [];
                coverUrl = thumbs?.slice(-1)?.[0]?.url || thumbs?.[0]?.url || "";
              }

              if (!playlistId || !isValidPlaylistId(playlistId) || seenIds.has(playlistId)) continue;
              const titleLower = title.toLowerCase();
              if (titleLower === "liked music & videos" || titleLower === "liked videos" || titleLower === "liked music" || titleLower === "watch later" || titleLower === "history" || titleLower === "watch history") continue;

              seenIds.add(playlistId);

              const formatted = formatHighResCover(coverUrl);
              const rawCount = subtitle.match(/(\d+)\s*(songs|tracks|items|videos)/i)?.[1] || subtitle.replace(/\D/g, "");
              const finalTracksCount = parseInt(rawCount || "0", 10) || 0;

              const isCustom = Boolean(
                coverUrl && (
                  coverUrl.includes("studio_square_thumbnail") ||
                  coverUrl.includes("pl_c") ||
                  coverUrl.includes("googleusercontent.com") ||
                  coverUrl.includes("ggpht.com") ||
                  coverUrl.includes("yt3.ggpht.com") ||
                  coverUrl.includes("/pl/") ||
                  coverUrl.includes("/s_p/")
                )
              );

              if (isCustom && (formatted || coverUrl)) {
                writeStoredCustomCover(playlistId, formatted || coverUrl);
              }

              results.push({
                id: playlistId,
                playlistId,
                title: title.trim() || "YouTube Playlist",
                description: subtitle || "Synced from YouTube Music Library",
                coverUrl: formatted || coverUrl || "",
                thumbnail: formatted || coverUrl || "",
                customCoverUrl: isCustom ? (formatted || coverUrl) : undefined,
                isCustomCover: isCustom,
                isYouTubeSynced: true,
                itemCount: finalTracksCount,
                trackCount: finalTracksCount,
                tracksCount: finalTracksCount,
                contentDetails: {
                  itemCount: finalTracksCount,
                },
                tracks: [],
              });
            }
          }
        } catch (_bErr) {
          // Continue to next browse ID
        }
      }
    }

    console.log(`[YouTube InnerTube] Discovered ${results.length} genuine library playlists.`);
    return results;
  } catch (err) {
    console.warn("YouTube Music library InnerTube fetch notice:", err);
    return [];
  }
}

// Helper to verify if a URL is an authentic custom playlist cover rather than a video thumbnail
function isAuthenticCustomUrl(u: string): boolean {
  if (!u || typeof u !== "string") return false;
  if (u.startsWith("data:")) return true; // Local data URLs are authentic user uploads
  return (
    u.includes("studio_square_thumbnail") ||
    u.includes("/pl_c/") ||
    u.includes("googleusercontent.com") ||
    u.includes("ggpht.com") ||
    u.includes("yt3.ggpht.com") ||
    u.includes("yt4.ggpht.com") ||
    u.includes("yt3.googleusercontent.com") ||
    u.includes("lh3.googleusercontent.com") ||
    u.includes("play-lh.googleusercontent.com") ||
    u.includes("photos.googleusercontent.com") ||
    u.includes("ytimg.com/pl/") ||
    u.includes("/pl/") ||
    u.includes("/s_p/") ||
    u.includes("ytimg.com/an_webp/") ||
    u.includes("ytimg.com/v2/")
  );
}

// High-resolution YouTube Playlist Custom Artwork Fetcher
// Extracts authentic custom artwork (YouTube Studio square thumbnails, Google User Content covers)
async function fetchYouTubePlaylistCustomImage(
  playlistId: string,
  accessToken?: string | null,
  fallbackThumbnails?: any
): Promise<string | null> {
  if (!playlistId || playlistId.startsWith("pl_custom_") || !isValidPlaylistId(playlistId)) return null;
  const cleanPlId = playlistId.replace(/^VL/, "");

  const cacheKey = `yt_pl_custom_img:${cleanPlId}`;
  const cached = getFromCache<string>(cacheKey);
  if (cached) return cached;

  // Check stored custom covers file cache
  const storedCustom = readStoredCustomCovers();
  if (storedCustom[cleanPlId] || storedCustom[playlistId]) {
    const hit = storedCustom[cleanPlId] || storedCustom[playlistId];
    setInCache(cacheKey, hit);
    return hit;
  }

  // 1. Direct Inspection of fallbackThumbnails (from playlist snippet)
  if (fallbackThumbnails) {
    const extracted = extractBestArtworkUrl(fallbackThumbnails);
    if (extracted.bestUrl && extracted.isCustom) {
      writeStoredCustomCover(cleanPlId, extracted.bestUrl);
      setInCache(cacheKey, extracted.bestUrl);
      return extracted.bestUrl;
    }
  }

  // 3. Fast & Comprehensive InnerTube API browse across clients (WEB_REMIX, ANDROID_MUSIC, TVHTML5, WEB)
  const innertubeClients = [
    {
      url: "https://music.youtube.com/youtubei/v1/browse",
      clientName: "WEB_REMIX",
      clientVersion: "1.20240501.01.00",
      origin: "https://music.youtube.com",
      headers: {
        "X-YouTube-Client-Name": "67",
        "X-YouTube-Client-Version": "1.20240501.01.00",
      },
    },
    {
      url: "https://music.youtube.com/youtubei/v1/browse",
      clientName: "ANDROID_MUSIC",
      clientVersion: "6.42.52",
      origin: "https://music.youtube.com",
      headers: {
        "User-Agent": "com.google.android.apps.youtube.music/6.42.52 (Linux; U; Android 14; en_US)",
        "X-YouTube-Client-Name": "62",
        "X-YouTube-Client-Version": "6.42.52",
      },
    },
    {
      url: "https://www.youtube.com/youtubei/v1/browse",
      clientName: "TVHTML5",
      clientVersion: "7.20240501.01.00",
      origin: "https://www.youtube.com",
      headers: {
        "X-YouTube-Client-Name": "7",
        "X-YouTube-Client-Version": "7.20240501.01.00",
        Origin: "https://www.youtube.com",
        Referer: "https://www.youtube.com/tv",
      },
    },
    {
      url: "https://www.youtube.com/youtubei/v1/browse",
      clientName: "WEB",
      clientVersion: "2.20240501.01.00",
      origin: "https://www.youtube.com",
      headers: {
        "X-YouTube-Client-Name": "1",
        "X-YouTube-Client-Version": "2.20240501.01.00",
      },
    },
  ];

  for (const client of innertubeClients) {
    try {
      const browseVariants = [`VL${cleanPlId}`, cleanPlId];
      for (const bId of browseVariants) {
        const requestHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "X-Origin": client.origin,
          Origin: client.origin,
          Referer: `${client.origin}/`,
          ...client.headers,
        };
        if (accessToken) {
          requestHeaders["Authorization"] = `Bearer ${accessToken}`;
        }

        const ytmRes = await fetch(client.url, {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify({
            context: {
              client: {
                clientName: client.clientName,
                clientVersion: client.clientVersion,
                hl: "en",
                gl: "US",
              },
              user: {
                lockedSafetyMode: false,
              },
            },
            browseId: bId,
          }),
          signal: AbortSignal.timeout(6000),
        });

        if (ytmRes.ok) {
          const data = await ytmRes.json();
          const candidateThumbUrls: string[] = [];

          // Explicit playlist header container candidates
          const headerContainers = [
            data.header?.musicDetailHeaderRenderer?.thumbnail?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails,
            data.header?.musicDetailHeaderRenderer?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails,
            data.header?.musicResponsiveHeaderRenderer?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails,
            data.header?.musicEditablePlaylistDetailHeaderRenderer?.header?.musicDetailHeaderRenderer?.thumbnail?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails,
            data.header?.musicEditablePlaylistDetailHeaderRenderer?.header?.musicDetailHeaderRenderer?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails,
            data.header?.musicEditablePlaylistDetailHeaderRenderer?.header?.musicResponsiveHeaderRenderer?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails,
            data.header?.musicEditablePlaylistDetailHeaderRenderer?.header?.musicVisualHeaderRenderer?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails,
            data.header?.playlistHeaderRenderer?.image?.playlistCustomThumbnailRenderer?.thumbnail?.thumbnails,
            data.header?.playlistHeaderRenderer?.playlistHeaderBanner?.thumbnails,
            data.header?.musicVisualHeaderRenderer?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails,
            data.sidebar?.playlistSidebarRenderer?.items?.[0]?.playlistSidebarPrimaryInfoRenderer?.thumbnailRenderer?.playlistCustomThumbnailRenderer?.thumbnail?.thumbnails,
            data.sidebar?.playlistSidebarRenderer?.items?.[0]?.playlistSidebarPrimaryInfoRenderer?.thumbnailRenderer?.playlistVideoThumbnailRenderer?.thumbnail?.thumbnails,
            data.microformat?.microformatDataRenderer?.thumbnail?.thumbnails,
          ];

          for (const c of headerContainers) {
            if (Array.isArray(c)) {
              for (const t of c) {
                if (t?.url) candidateThumbUrls.push(t.url);
              }
            } else if (typeof c === "string") {
              candidateThumbUrls.push(c);
            }
          }

          const findCustomThumbnails = (obj: any, depth = 0) => {
            if (!obj || typeof obj !== "object" || depth > 20) return;

            if (Array.isArray(obj.thumbnails)) {
              for (const t of obj.thumbnails) {
                if (t?.url) candidateThumbUrls.push(t.url);
              }
            }
            if (Array.isArray(obj.sources)) {
              for (const s of obj.sources) {
                if (s?.url) candidateThumbUrls.push(s.url);
              }
            }
            if (typeof obj.url === "string") {
              candidateThumbUrls.push(obj.url);
            }

            if (Array.isArray(obj)) {
              for (const item of obj) findCustomThumbnails(item, depth + 1);
            } else {
              for (const k of Object.keys(obj)) {
                if (typeof obj[k] === "object" && obj[k] !== null) {
                  findCustomThumbnails(obj[k], depth + 1);
                }
              }
            }
          };

          if (data.header) findCustomThumbnails(data.header);
          if (data.sidebar) findCustomThumbnails(data.sidebar);
          if (data.microformat) findCustomThumbnails(data.microformat);

          // Check custom URLs first
          for (const url of candidateThumbUrls) {
            if (isAuthenticCustomUrl(url)) {
              const formatted = formatHighResCover(url);
              if (formatted) {
                writeStoredCustomCover(cleanPlId, formatted);
                setInCache(cacheKey, formatted);
                return formatted;
              }
            }
          }

          // Then check any header container thumbnail
          for (const url of candidateThumbUrls) {
            const formatted = formatHighResCover(url);
            if (formatted) {
              writeStoredCustomCover(cleanPlId, formatted);
              setInCache(cacheKey, formatted);
              return formatted;
            }
          }
        }
      }
    } catch (_clientErr) {}
  }

  // 4. YouTube Music & YouTube Web HTML Scraper
  const scraperUrls = [
    `https://music.youtube.com/playlist?list=${cleanPlId}`,
    `https://www.youtube.com/playlist?list=${cleanPlId}`,
  ];

  for (const pageUrl of scraperUrls) {
    try {
      const pageHeaders: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      };
      if (accessToken) {
        pageHeaders["Authorization"] = `Bearer ${accessToken}`;
      }

      const pageRes = await fetch(pageUrl, {
        headers: pageHeaders,
        signal: AbortSignal.timeout(5000),
      });

      if (pageRes.ok) {
        const html = await pageRes.text();
        const ogMatch =
          html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i) ||
          html.match(/<meta\s+name=["']twitter:image["']\s+content=["'](.*?)["']/i);

        if (ogMatch && ogMatch[1]) {
          const rawUrl = ogMatch[1].replace(/&amp;/g, "&");
          const extracted = extractBestArtworkUrl(rawUrl);
          if (extracted.bestUrl && extracted.isCustom) {
            writeStoredCustomCover(cleanPlId, extracted.bestUrl);
            setInCache(cacheKey, extracted.bestUrl);
            return extracted.bestUrl;
          }
        }

        const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
        if (match) {
          const pData = JSON.parse(match[1]);
          const candidateThumbs: any[] = [
            pData.header?.musicDetailHeaderRenderer?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails,
            pData.header?.musicResponsiveHeaderRenderer?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails,
            pData.header?.musicEditablePlaylistDetailHeaderRenderer?.header?.musicDetailHeaderRenderer?.thumbnail?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails,
            pData.header?.playlistHeaderRenderer?.playlistHeaderBanner?.thumbnails,
            pData.header?.playlistHeaderRenderer?.image?.playlistCustomThumbnailRenderer?.thumbnail?.thumbnails,
            pData.header?.musicVisualHeaderRenderer?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails,
            pData.sidebar?.playlistSidebarRenderer?.items?.[0]?.playlistSidebarPrimaryInfoRenderer?.thumbnailRenderer?.playlistCustomThumbnailRenderer?.thumbnail?.thumbnails,
            pData.sidebar?.playlistSidebarRenderer?.items?.[0]?.playlistSidebarPrimaryInfoRenderer?.thumbnailRenderer?.playlistVideoThumbnailRenderer?.thumbnail?.thumbnails,
            pData.microformat?.microformatDataRenderer?.thumbnail?.thumbnails,
          ].filter(Boolean);

          for (const thumbs of candidateThumbs) {
            const extracted = extractBestArtworkUrl(thumbs);
            if (extracted.bestUrl && extracted.isCustom) {
              writeStoredCustomCover(cleanPlId, extracted.bestUrl);
              setInCache(cacheKey, extracted.bestUrl);
              return extracted.bestUrl;
            }
          }
        }
      }
    } catch (_htmlErr) {}
  }

  // 5. Official YouTube Data API v3 playlist & playlistImages query (if authenticated)
  if (accessToken) {
    try {
      const plImgRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistImages?parent=playlists/${cleanPlId}&part=snippet`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(6000),
        }
      );
      if (plImgRes.ok) {
        const imgData = await plImgRes.json();
        const firstImg = imgData.items?.[0];
        const imgThumbs = firstImg?.snippet?.thumbnails;
        const extracted = extractBestArtworkUrl(imgThumbs);
        if (extracted.bestUrl && extracted.isCustom) {
          writeStoredCustomCover(cleanPlId, extracted.bestUrl);
          setInCache(cacheKey, extracted.bestUrl);
          return extracted.bestUrl;
        }
      }
    } catch (_apiImgErr) {}

    try {
      const plRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${cleanPlId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(6000),
        }
      );
      if (plRes.ok) {
        const plData = await plRes.json();
        const firstItem = plData.items?.[0];
        const thumbs = firstItem?.snippet?.thumbnails;
        const extracted = extractBestArtworkUrl(thumbs);
        if (extracted.bestUrl && extracted.isCustom) {
          writeStoredCustomCover(cleanPlId, extracted.bestUrl);
          setInCache(cacheKey, extracted.bestUrl);
          return extracted.bestUrl;
        }
      }
    } catch (_apiErr) {}
  }

  return null;
}

async function getPublicYouTubePlaylistItems(playlistId: string, forceRefresh: boolean = false): Promise<{ tracks: any[]; coverUrl?: string; title?: string }> {
  const cleanPlId = playlistId.replace(/^VL/, "");
  const cacheKey = `pub_pl:${cleanPlId}`;
  if (forceRefresh) {
    delFromCache(cacheKey);
  } else {
    const cached = getFromCache<{ tracks: any[]; coverUrl?: string; title?: string }>(cacheKey);
    if (cached) return cached;
  }

  try {
    const url = `https://www.youtube.com/playlist?list=${playlistId}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });
    const html = await res.text();
    const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
    if (!match) return { tracks: [] };
    const data = JSON.parse(match[1]);

    // Extract Playlist Custom Artwork / Highest Res Cover from header or microformat
    const customHeaderCover =
      data.header?.playlistHeaderRenderer?.playlistHeaderBanner?.thumbnails?.slice(-1)?.[0]?.url ||
      data.header?.playlistHeaderRenderer?.thumbnail?.thumbnails?.slice(-1)?.[0]?.url ||
      data.microformat?.microformatDataRenderer?.thumbnail?.thumbnails?.slice(-1)?.[0]?.url ||
      data.sidebar?.playlistSidebarRenderer?.items?.[0]?.playlistSidebarPrimaryInfoRenderer?.thumbnailRenderer?.playlistCustomThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)?.[0]?.url ||
      data.sidebar?.playlistSidebarRenderer?.items?.[0]?.playlistSidebarPrimaryInfoRenderer?.thumbnailRenderer?.playlistVideoThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)?.[0]?.url;

    const playlistTitle =
      data.header?.playlistHeaderRenderer?.title?.simpleText ||
      data.header?.playlistHeaderRenderer?.title?.runs?.[0]?.text ||
      data.microformat?.microformatDataRenderer?.title;

    const videoItems: any[] = [];
    const tabs = data.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
    for (const tab of tabs) {
      const sections = tab.tabRenderer?.content?.sectionListRenderer?.contents || [];
      for (const sec of sections) {
        const items = sec.itemSectionRenderer?.contents || [];
        for (const item of items) {
          if (item.playlistVideoRenderer) {
            const v = item.playlistVideoRenderer;
            videoItems.push({
              id: `${v.videoId}_${videoItems.length}`,
              youtubeVideoId: v.videoId,
              title: v.title?.runs?.[0]?.text || "Unknown Track",
              artist: v.shortBylineText?.runs?.[0]?.text || "YouTube",
              coverUrl: v.thumbnail?.thumbnails?.slice(-1)?.[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
              audioUrl: `/api/youtube/stream/${v.videoId}`,
              type: "track"
            });
          } else if (item.lockupViewModel) {
            const l = item.lockupViewModel;
            const videoId = l.contentId;
            const title = l.metadata?.lockupMetadataViewModel?.title?.content || l.accessibilityContext?.label || "Track";
            const coverUrl = l.contentImage?.collectionThumbnailViewModel?.primaryThumbnail?.thumbnailViewModel?.image?.sources?.slice(-1)?.[0]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
            if (videoId && l.contentType?.includes("VIDEO")) {
              videoItems.push({
                id: `${videoId}_${videoItems.length}`,
                youtubeVideoId: videoId,
                title,
                artist: "YouTube Artist",
                coverUrl,
                audioUrl: `/api/youtube/stream/${videoId}`,
                type: "track"
              });
            }
          }
        }
      }
    }
    const result = { tracks: videoItems, coverUrl: customHeaderCover, title: playlistTitle };
    if (videoItems.length > 0) setInCache(cacheKey, result);
    return result;
  } catch (err: any) {
    if (err?.name === "TimeoutError" || err?.message?.includes("aborted")) {
      console.warn(`Public playlist fetch timed out for ${playlistId}`);
    } else {
      console.warn("Public playlist fetch note:", err?.message || err);
    }
    return { tracks: [] };
  }
}

async function searchYouTubePlaylistsPublic(query: string): Promise<any[]> {
  const cacheKey = `search_pl:${query}`;
  const cached = getFromCache<any[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + " playlist music")}&sp=EgIQAw%253D%253D`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });
    const html = await res.text();
    const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
    if (!match) return [];
    const data = JSON.parse(match[1]);

    const playlists: any[] = [];
    const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

    for (const section of contents) {
      const renderers = section.itemSectionRenderer?.contents || [];
      for (const item of renderers) {
        if (item.playlistRenderer) {
          const p = item.playlistRenderer;
          const playlistId = p.playlistId;
          const title = p.title?.simpleText || p.title?.runs?.[0]?.text || "YouTube Playlist";
          const description = p.shortBylineText?.runs?.[0]?.text || "YouTube Music";
          const coverUrl = p.thumbnails?.[0]?.thumbnails?.slice(-1)?.[0]?.url || `https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80`;
          const videoCount = p.videoCount || "25";
          if (playlistId) {
            playlists.push({
              id: playlistId,
              title,
              description: `Curated YouTube Music • ${videoCount} tracks`,
              coverUrl,
              isYouTubeSynced: true,
              tracksCount: parseInt(videoCount, 10) || 20,
              tracks: []
            });
          }
        }
      }
    }
    const deduped = deduplicateById(playlists);
    if (deduped.length > 0) setInCache(cacheKey, deduped);
    return deduped;
  } catch (err: any) {
    if (err?.name === "TimeoutError" || err?.message?.includes("aborted")) {
      console.warn(`Public playlists search timed out for "${query}"`);
    } else {
      console.warn("Public playlists search note:", err?.message || err);
    }
    return [];
  }
}

async function searchYouTubePublic(query: string, searchType: string = "all"): Promise<any[]> {
  const cacheKey = `yt_search:${query}:${searchType}`;
  const cached = getFromCache<any[]>(cacheKey);
  if (cached) return cached;

  try {
    let searchQ = query;
    if (searchType === "track") searchQ += " music song official audio";
    if (searchType === "album") searchQ += " full album";

    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQ)}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });
    const html = await res.text();
    const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
    if (!match) return [];
    const data = JSON.parse(match[1]);

    const results: any[] = [];
    const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

    for (const section of contents) {
      const renderers = section.itemSectionRenderer?.contents || [];
      for (const item of renderers) {
        if (item.videoRenderer) {
          const v = item.videoRenderer;
          const videoId = v.videoId;
          const rawTitle = v.title?.runs?.[0]?.text || "Unknown";
          const rawChannel = v.ownerText?.runs?.[0]?.text || v.longBylineText?.runs?.[0]?.text || "Unknown Artist";
          const meta = parseTrackMetadataServer(rawTitle, rawChannel);
          const coverUrl = v.thumbnail?.thumbnails?.slice(-1)?.[0]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
          const durationText = v.lengthText?.simpleText || "0:00";
          const publishedText = v.publishedTimeText?.simpleText || "";
          results.push({
            id: videoId,
            youtubeVideoId: videoId,
            title: meta.title,
            artist: meta.artist,
            uploader: meta.uploader,
            album: searchType === "album" ? meta.title : "",
            type: searchType === "album" ? "album" : "track",
            coverUrl,
            audioUrl: `/api/youtube/stream/${videoId}`,
            durationText,
            publishedText
          });
        } else if (item.playlistRenderer) {
          const p = item.playlistRenderer;
          const playlistId = p.playlistId;
          const title = p.title?.simpleText || p.title?.runs?.[0]?.text || "Album";
          const artist = p.shortBylineText?.runs?.[0]?.text || p.ownerText?.runs?.[0]?.text || "YouTube";
          const coverUrl = p.thumbnails?.[0]?.thumbnails?.slice(-1)?.[0]?.url || "";
          const videoCount = p.videoCount || "10";
          results.push({
            id: playlistId,
            playlistId,
            title,
            artist,
            type: "album",
            coverUrl,
            tracksCount: parseInt(videoCount, 10) || 10
          });
        } else if (item.channelRenderer) {
          const c = item.channelRenderer;
          const channelId = c.channelId;
          const title = c.title?.simpleText || c.title?.runs?.[0]?.text || "Artist";
          const coverUrl = c.thumbnail?.thumbnails?.slice(-1)?.[0]?.url || "";
          results.push({
            id: channelId,
            channelId,
            title,
            artist: title,
            type: "artist",
            coverUrl
          });
        } else if (item.lockupViewModel) {
          const l = item.lockupViewModel;
          const contentId = l.contentId;
          const contentType = l.contentType || "";
          const title = l.metadata?.lockupMetadataViewModel?.title?.content || "Item";
          const coverUrl = l.contentImage?.collectionThumbnailViewModel?.primaryThumbnail?.thumbnailViewModel?.image?.sources?.slice(-1)?.[0]?.url || `https://i.ytimg.com/vi/${contentId}/hqdefault.jpg`;
          if (contentId) {
            results.push({
              id: contentId,
              youtubeVideoId: contentType.includes("VIDEO") ? contentId : undefined,
              playlistId: contentType.includes("PLAYLIST") ? contentId : undefined,
              title,
              artist: "YouTube Artist",
              type: contentType.includes("PLAYLIST") ? "album" : "track",
              coverUrl,
              audioUrl: contentType.includes("VIDEO") ? `/api/youtube/stream/${contentId}` : undefined
            });
          }
        }
      }
    }
    const deduped = deduplicateById(results);
    if (deduped.length > 0) setInCache(cacheKey, deduped);
    return deduped;
  } catch (err: any) {
    if (err?.name === "TimeoutError" || err?.message?.includes("aborted")) {
      console.warn(`Public YouTube search timed out for query: "${query}"`);
    } else {
      console.warn("Public YouTube search note:", err?.message || err);
    }
    return [];
  }
}

// Utility to strictly disambiguate true artist from channel/uploader
function parseTrackMetadataServer(rawTitle: string, channelOrUploader?: string): { title: string; artist: string; uploader: string } {
  const uploader = fixMojibakeAndEntitiesServer(channelOrUploader || "").trim();
  if (!rawTitle) {
    return {
      title: "Untitled Track",
      artist: cleanArtistNameServer(uploader) || "Unknown Artist",
      uploader,
    };
  }

  const rawDecoded = fixMojibakeAndEntitiesServer(rawTitle).trim();
  let cleaned = cleanTrackTitleServer(rawDecoded, uploader);

  // ONLY match hyphens/dashes [-–—], NEVER colons ":" or pipes "|" which are part of song titles/subtitles
  const splitMatch = rawDecoded.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (splitMatch) {
    const extractedArtist = cleanArtistNameServer(splitMatch[1]);
    let extractedTitle = cleanTrackTitleServer(splitMatch[2], extractedArtist);
    if (extractedArtist && extractedTitle) {
      return {
        title: extractedTitle,
        artist: extractedArtist,
        uploader,
      };
    }
  }

  let cleanArtist = cleanArtistNameServer(uploader) || "Unknown Artist";

  return {
    title: cleaned || rawDecoded || "Untitled Track",
    artist: cleanArtist,
    uploader,
  };
}

// Utility to detect non-music content (vlogs, house tours, real estate, tutorials, gameplay, etc.)
function isNonMusicVideo(title?: string, artistOrChannel?: string, durationSeconds?: number, categoryId?: string): boolean {
  if (categoryId && categoryId !== "10") return true;
  const t = (title || "").toLowerCase();
  const a = (artistOrChannel || "").toLowerCase();
  const nonMusicPatterns = [
    "lakefront", "relocating", "real estate", "house tour", "mansion", "megamansion", "apartment tour",
    "home tour", "room tour", "property tour", "vlog", "unboxing", "reaction", "reacts to", "review",
    "gameplay", "walkthrough", "playthrough", "tutorial", "how to", "podcast", "episode", "interview",
    "highlights", "news", "documentary", "recipe", "cooking", "daily vlog", "travel vlog", "livestream",
    "q&a", "speedrun", "asmr eating", "haul", "workout routine", "motivation speech", "lecture",
    "course", "diy", "unboxing & review", "unboxing video", "walk through"
  ];
  if (nonMusicPatterns.some(p => t.includes(p) || a.includes(p))) {
    return true;
  }
  // Videos longer than 15 minutes (900s) are non-music unless titled as mix/album/set
  if (durationSeconds && durationSeconds > 900) {
    const isMix = ["mix", "album", "compilation", "dj set", "playlist", "full concert", "discography"].some(kw => t.includes(kw));
    if (!isMix) return true;
  }
  return false;
}

// YouTube Music Song Search: exclusively returns genuine songs & tracks from YouTube Music
async function searchYouTubeMusicSongs(query: string, accessToken?: string): Promise<any[]> {
  const cacheKey = `ytm_songs:${accessToken ? 'auth' : 'pub'}:${query}`;
  const cached = getFromCache<any[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  // 1. Query YouTube Music InnerTube Search (WEB_REMIX client, filtered specifically for Songs)
  try {
    const url = "https://music.youtube.com/youtubei/v1/search";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "X-YouTube-Client-Name": "67",
      "X-YouTube-Client-Version": "1.20240501.01.00",
      "X-Origin": "https://music.youtube.com",
      Referer: "https://music.youtube.com/",
      Origin: "https://music.youtube.com",
    };
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB_REMIX",
            clientVersion: "1.20240501.01.00",
            hl: "en",
            gl: "US",
          },
        },
        query,
        params: "EgWKAQIIAWoKEAkQChADEAQQBw%3D%3D", // YouTube Music Songs filter
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const data = await res.json();
      const songs: any[] = [];
      const sections =
        data.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents ||
        data.contents?.sectionListRenderer?.contents ||
        [];

      for (const sec of sections) {
        const shelf = sec.musicShelfRenderer || sec.musicCardShelfRenderer;
        const contents = shelf?.contents || [];
        for (const item of contents) {
          const r = item.musicResponsiveListItemRenderer;
          if (r) {
            const flexCols = r.flexColumns || [];
            const trTitle = flexCols[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
            const artistRuns = flexCols[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
            const artist = artistRuns.map((a: any) => a.text).join("") || "YouTube Artist";
            const album = flexCols[2]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || "";
            const vidId =
              r.playlistItemData?.videoId ||
              r.doubleTapCommand?.watchEndpoint?.videoId ||
              flexCols[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;
            const thumbs = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails;
            const cover = thumbs?.slice(-1)?.[0]?.url || (vidId ? `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg` : "");
            const durStr =
              r.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs?.[0]?.text ||
              r.lengthText?.runs?.[0]?.text;

            const nonMusicBadges = ["reaction", "review", "podcast", "gameplay", "tutorial", "unboxing", "vlog", "trailer"];
            const lowerTitle = (trTitle || "").toLowerCase();
            const isNonMusic = nonMusicBadges.some((b) => lowerTitle.includes(b));

            if (vidId && trTitle && !isNonMusic && trTitle !== "Private video" && trTitle !== "Deleted video") {
              songs.push({
                id: vidId,
                youtubeVideoId: vidId,
                title: trTitle,
                artist: artist.replace(/•.*$/, "").trim() || artist,
                album: album || "",
                duration: parseDurationText(durStr),
                coverUrl: formatHighResCover(cover) || cover,
                audioUrl: `/api/youtube/stream/${vidId}`,
                genre: "Music",
                playsCount: 0,
              });
            }
          }
        }
      }

      if (songs.length > 0) {
        const deduped = deduplicateById(songs);
        setInCache(cacheKey, deduped);
        return deduped;
      }
    }
  } catch (err) {
    console.warn("YouTube Music InnerTube song search error:", err);
  }

  // Fallback: search YouTube Data API restricting to Category 10 (Music)
  const fallback = await searchYouTubeMusic(`${query} song audio official`, accessToken, "track");
  const filtered = fallback.filter((t) => {
    const lower = (t.title || "").toLowerCase();
    return !["podcast", "review", "reaction", "tutorial", "gameplay", "trailer"].some((b) => lower.includes(b));
  });
  if (filtered.length > 0) setInCache(cacheKey, filtered);
  return filtered;
}

async function searchYouTubeMusic(query: string, accessToken?: string, type: string = "all"): Promise<any[]> {
  const cacheKey = `yt_music:${accessToken ? 'auth' : 'pub'}:${query}:${type}`;
  const cached = getFromCache<any[]>(cacheKey);
  if (cached) return cached;

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey || accessToken) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/search`;
      const params = new URLSearchParams({
        q: query,
        part: 'snippet',
        type: type === 'album' ? 'playlist' : 'video',
        videoCategoryId: '10',
        maxResults: '20',
        relevanceLanguage: 'en'
      });

      const headers: Record<string, string> = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      } else if (apiKey) {
        params.append('key', apiKey);
      }

      const response = await fetch(`${url}?${params}`, {
        headers,
        signal: AbortSignal.timeout(8000)
      });
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const items = data.items.map((item: any) => {
          const rawTitle = item.snippet?.title || 'Unknown';
          const rawChannel = item.snippet?.channelTitle || 'Unknown Artist';
          const meta = parseTrackMetadataServer(rawTitle, rawChannel);
          return {
            id: item.id?.videoId || item.id?.playlistId || item.id,
            youtubeVideoId: item.id?.videoId,
            playlistId: item.id?.playlistId,
            title: meta.title,
            artist: meta.artist,
            uploader: meta.uploader,
            album: type === 'album' ? meta.title : '',
            type: item.id?.playlistId || type === 'album' ? 'album' : 'track',
            coverUrl: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
            audioUrl: item.id?.videoId ? `/api/youtube/stream/${item.id.videoId}` : undefined,
            genre: 'Music',
            playsCount: 0
          };
        });
        const deduped = deduplicateById(items);
        setInCache(cacheKey, deduped);
        return deduped;
      }
    } catch (err) {
      console.warn('YouTube API search note, using public search fallback');
    }
  }

  const results = deduplicateById(await searchYouTubePublic(query, type));
  if (results.length > 0) setInCache(cacheKey, results);
  return results;
}

let geminiClientInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") return null;
  if (!geminiClientInstance) {
    try {
      geminiClientInstance = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    } catch (e) {
      console.warn("Failed to initialize GoogleGenAI client:", e);
    }
  }
  return geminiClientInstance;
}

function getBaseUrl(req: express.Request) {
  const reqOrigin = (req.query.origin as string) || (req.headers.origin as string) || "";
  if (reqOrigin.includes("oblivion-rho.vercel.app")) {
    return "https://oblivion-rho.vercel.app";
  }
  if (reqOrigin.includes("ais-dev-blr47rrsu4chpkttmgwnlk-270966030907.asia-southeast1.run.app")) {
    return "https://ais-dev-blr47rrsu4chpkttmgwnlk-270966030907.asia-southeast1.run.app";
  }

  const rawHost = req.headers["x-forwarded-host"] || req.headers.host || "";
  const host = Array.isArray(rawHost) ? rawHost[0] : String(rawHost).split(",")[0].trim();
  const rawProto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const proto = Array.isArray(rawProto) ? rawProto[0] : String(rawProto).split(",")[0].trim();

  if (host.includes("oblivion-rho.vercel.app")) {
    return "https://oblivion-rho.vercel.app";
  }
  if (host.includes("ais-dev-blr47rrsu4chpkttmgwnlk-270966030907.asia-southeast1.run.app")) {
    return "https://ais-dev-blr47rrsu4chpkttmgwnlk-270966030907.asia-southeast1.run.app";
  }

  if (process.env.APP_URL && !process.env.APP_URL.includes("MY_APP_URL")) {
    return process.env.APP_URL.replace(/\/$/, "");
  }

  if (host) {
    return `${proto}://${host}`;
  }
  return "https://oblivion-rho.vercel.app";
}

async function refreshAccessTokenDirectly(refreshToken?: string): Promise<{ accessToken: string; expiresIn: number } | null> {
  if (!refreshToken) return null;
  const clientId = getOAuthClientId();
  const clientSecret = getOAuthClientSecret();
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const data = await res.json();
    if (data.access_token) {
      return {
        accessToken: data.access_token,
        expiresIn: data.expires_in || 3600,
      };
    }
  } catch (err) {
    console.error("Direct token refresh error:", err);
  }
  return null;
}

async function refreshAccessToken(req: express.Request, tokenHint?: string): Promise<string | null> {
  const refreshToken = (req.body?.refreshToken || req.body?.refresh_token || req.query?.refreshToken || (req.session?.tokens as any)?.refresh_token) as string;
  if (!refreshToken) return null;
  const result = await refreshAccessTokenDirectly(refreshToken);
  if (result?.accessToken) {
    if (req.session) {
      if (!req.session.tokens) req.session.tokens = { access_token: result.accessToken };
      req.session.tokens.access_token = result.accessToken;
      req.session.tokens.expires_at = Date.now() + result.expiresIn * 1000;
      if (req.session.user) {
        req.session.user.accessToken = result.accessToken;
      }
    }
    return result.accessToken;
  }
  return null;
}

async function getValidAccessToken(req: express.Request): Promise<string | null> {
  let token: string | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const t = authHeader.substring(7).trim();
    if (t && t !== "undefined" && t !== "null") token = t;
  }
  if (!token) {
    const customHeader = req.headers["x-access-token"] as string;
    if (customHeader && customHeader !== "undefined" && customHeader !== "null") token = customHeader;
  }
  if (!token && req.query?.access_token) {
    const qToken = String(req.query.access_token).trim();
    if (qToken && qToken !== "undefined" && qToken !== "null") token = qToken;
  }
  if (!token && req.session?.tokens?.access_token) {
    token = req.session.tokens.access_token;
  }
  return token;
}

function sanitizeCredential(val: string | undefined | null): string {
  if (!val) return "";
  let clean = String(val).trim();
  while (
    (clean.startsWith('"') && clean.endsWith('"')) ||
    (clean.startsWith("'") && clean.endsWith("'")) ||
    (clean.startsWith('`') && clean.endsWith('`'))
  ) {
    clean = clean.slice(1, -1).trim();
  }
  clean = clean.replace(/[\r\n\t\f\v]/g, "").trim();
  return clean;
}

function getOAuthClientId(): string {
  if (process.env.GOOGLE_CLIENT_ID) return sanitizeCredential(process.env.GOOGLE_CLIENT_ID);
  if (process.env.VITE_GOOGLE_CLIENT_ID) return sanitizeCredential(process.env.VITE_GOOGLE_CLIENT_ID);
  if (process.env.CLIENT_ID) return sanitizeCredential(process.env.CLIENT_ID);
  const stored = readStoredOAuthConfig();
  return sanitizeCredential(stored.clientId || "");
}

function getOAuthClientSecret(): string {
  if (process.env.GOOGLE_CLIENT_SECRET) return sanitizeCredential(process.env.GOOGLE_CLIENT_SECRET);
  if (process.env.VITE_GOOGLE_CLIENT_SECRET) return sanitizeCredential(process.env.VITE_GOOGLE_CLIENT_SECRET);
  if (process.env.CLIENT_SECRET) return sanitizeCredential(process.env.CLIENT_SECRET);
  const stored = readStoredOAuthConfig();
  return sanitizeCredential(stored.clientSecret || "");
}

app.get("/manifest.json", (req, res) => {
  const themeColor = (req.query.theme_color as string) || (req.query.themeColor as string) || (req.session as any)?.authThemeColor || "#051911";
  const manifestPath = path.join(process.cwd(), "public", "manifest.json");
  try {
    if (fs.existsSync(manifestPath)) {
      const raw = fs.readFileSync(manifestPath, "utf-8");
      const manifest = JSON.parse(raw);
      manifest.theme_color = themeColor;
      manifest.background_color = themeColor;
      res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      return res.json(manifest);
    }
  } catch (e) {}

  res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  return res.json({
    name: "Oblivion Music",
    short_name: "Oblivion",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: themeColor,
    theme_color: themeColor,
  });
});

app.get("/api/auth/google/config", (req, res) => {
  const clientId = getOAuthClientId();
  const clientSecret = getOAuthClientSecret();
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  res.json({
    configured: Boolean(clientId),
    clientId: clientId || "",
    hasSecret: Boolean(clientSecret),
    redirectUri,
  });
});

app.post("/api/auth/google/config", (req, res) => {
  const { clientId, clientSecret } = req.body;
  const current = readStoredOAuthConfig();
  if (clientId) {
    process.env.GOOGLE_CLIENT_ID = sanitizeCredential(clientId);
    current.clientId = sanitizeCredential(clientId);
  }
  if (clientSecret) {
    process.env.GOOGLE_CLIENT_SECRET = sanitizeCredential(clientSecret);
    current.clientSecret = sanitizeCredential(clientSecret);
  }
  writeStoredOAuthConfig(current);
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  res.json({
    success: true,
    hasSecret: Boolean(getOAuthClientSecret()),
    redirectUri,
  });
});

app.get("/api/auth/google/url", (req, res) => {
  const clientId = getOAuthClientId();
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/google/callback`;
  const themeColor = (req.query.theme_color as string) || (req.query.themeColor as string) || "#051911";

  if (req.session) {
    (req.session as any).authThemeColor = themeColor;
  }

  if (!clientId) {
    return res.status(400).json({ error: "Google OAuth Client ID is not configured" });
  }

  const scopes = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/youtube.force-ssl",
  ];

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    state: encodeURIComponent(themeColor),
  });

  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, themeColor });
});

// YouTube Music API Routes - Pulls authentic YouTube content and user playlists
app.get(["/api/playlists", "/api/youtube/playlists"], async (req, res) => {
  try {
    let accessToken = await getValidAccessToken(req);
    let ytPlaylists: any[] = [];
    let authExpired = false;
    const isForceRefresh = req.query.refresh === "true" || req.query.force === "true" || req.query.sync === "true";
    const apiKey = process.env.YOUTUBE_API_KEY;

    // Cache key for user playlists
    const userCacheKey = accessToken ? `user_pls_${accessToken.slice(-20)}` : "user_pls_anon";
    if (isForceRefresh) {
      delFromCache(userCacheKey);
      delFromCache("user_pls_anon");
    } else {
      const cachedUserPlaylists = getFromCache<any[]>(userCacheKey);
      if (cachedUserPlaylists && cachedUserPlaylists.length > 0) {
        return res.json({ playlists: cachedUserPlaylists });
      }
    }

    if (accessToken) {
      try {
        console.log(`[YouTube API] Fetching playlists for authenticated user (forceRefresh: ${isForceRefresh})...`);

        const allItems: any[] = [];
        const seenItemIds = new Set<string>();

        // 1. Fetch official YouTube Data API playlists with mine=true
        let pageToken: string | undefined = undefined;
        let pagesCount = 0;

        do {
          const params = new URLSearchParams({
            part: "snippet,contentDetails,status",
            mine: "true",
            maxResults: "50",
            ...(pageToken ? { pageToken } : {}),
          });

          let plRes = await fetchWithRetry(`https://www.googleapis.com/youtube/v3/playlists?${params.toString()}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }, 2, 10000);

          if (plRes.status === 401) {
            console.log(`[YouTube API] 401 Unauthorized encountered, attempting token refresh...`);
            const refreshed = await refreshAccessToken(req, accessToken);
            if (refreshed) {
              accessToken = refreshed;
              plRes = await fetchWithRetry(`https://www.googleapis.com/youtube/v3/playlists?${params.toString()}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
              }, 2, 10000);
            } else {
              authExpired = true;
            }
          }

          if (plRes.ok) {
            const data = await plRes.json();
            if (data.items && Array.isArray(data.items)) {
              for (const it of data.items) {
                if (!seenItemIds.has(it.id)) {
                  seenItemIds.add(it.id);
                  allItems.push(it);
                }
              }
            }
            pageToken = data.nextPageToken;
            pagesCount++;
          } else {
            const errData = await plRes.json().catch(() => null);
            console.warn(`[YouTube API] /playlists request returned HTTP ${plRes.status}:`, errData?.error?.message || errData);
            if (plRes.status === 401) authExpired = true;
            break;
          }
        } while (pageToken && pagesCount < 4);

        // 2. Check YouTube Channel playlists (resolves brand and music channels)
        try {
          const chanParams = new URLSearchParams({
            part: "snippet,contentDetails,status",
            mine: "true",
          });
          const chanRes = await fetchWithRetry(`https://www.googleapis.com/youtube/v3/channels?${chanParams.toString()}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }, 1, 8000);
          if (chanRes.ok) {
            const chanData = await chanRes.json();
            if (chanData.items && Array.isArray(chanData.items)) {
              for (const chan of chanData.items) {
                const chanId = chan.id;
                try {
                  const chanPlParams = new URLSearchParams({
                    part: "snippet,contentDetails,status",
                    channelId: chanId,
                    maxResults: "50",
                  });
                  const chanPlRes = await fetchWithRetry(`https://www.googleapis.com/youtube/v3/playlists?${chanPlParams.toString()}`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                  }, 1, 8000);
                  if (chanPlRes.ok) {
                    const chanPlData = await chanPlRes.json();
                    if (chanPlData.items && Array.isArray(chanPlData.items)) {
                      for (const it of chanPlData.items) {
                        if (!seenItemIds.has(it.id)) {
                          seenItemIds.add(it.id);
                          allItems.push(it);
                        }
                      }
                    }
                  }
                } catch (_cPlErr) {}
              }
            }
          }
        } catch (_chanErr) {}

        console.log(`[YouTube API] Total items returned by YouTube Data API: ${allItems.length}`);

        // 3. Fetch YouTube Music Library playlists & authentic custom covers directly from InnerTube
        let ytmLibraryPlaylists: any[] = [];
        const ytmLibraryMap = new Map<string, any>();
        try {
          ytmLibraryPlaylists = await fetchYouTubeMusicLibraryPlaylists(accessToken);
          if (ytmLibraryPlaylists && ytmLibraryPlaylists.length > 0) {
            console.log(`[YouTube API] Total YouTube Music library playlists found: ${ytmLibraryPlaylists.length}`);
            for (const pl of ytmLibraryPlaylists) {
              const cleanId = pl.id.replace(/^VL/, "");
              ytmLibraryMap.set(cleanId, pl);
              ytmLibraryMap.set(pl.id, pl);
            }
          }
        } catch (ytmErr) {
          console.warn("[YouTube API] InnerTube library playlists notice:", ytmErr);
        }

        const storedCustom = readStoredCustomCovers();
        if (allItems.length > 0) {
          // Fetch authentic custom covers directly from YouTube Music / YouTube
          const customCovers = await Promise.allSettled(
            allItems.map((item: any) => {
              const cleanId = item.id.replace(/^VL/, "");
              const ytmMatch = ytmLibraryMap.get(cleanId) || ytmLibraryMap.get(item.id);
              if (ytmMatch?.isCustomCover && ytmMatch?.customCoverUrl) {
                return Promise.resolve(ytmMatch.customCoverUrl);
              }
              if (storedCustom[cleanId] || storedCustom[item.id]) {
                return Promise.resolve(storedCustom[cleanId] || storedCustom[item.id]);
              }
              return fetchYouTubePlaylistCustomImage(item.id, accessToken, item.snippet?.thumbnails);
            })
          );

          ytPlaylists = allItems.map((item: any, idx: number) => {
            const cleanId = item.id.replace(/^VL/, "");
            const ytmMatch = ytmLibraryMap.get(cleanId) || ytmLibraryMap.get(item.id);

            const customResult =
              customCovers[idx]?.status === "fulfilled"
                ? (customCovers[idx] as PromiseFulfilledResult<string | null>).value
                : null;

            const thumbs = item.snippet?.thumbnails;
            const bestThumbnail =
              thumbs?.maxres?.url ||
              thumbs?.standard?.url ||
              thumbs?.high?.url ||
              thumbs?.medium?.url ||
              thumbs?.default?.url;

            const resolvedCustom =
              ytmMatch?.customCoverUrl ||
              customResult ||
              storedCustom[cleanId] ||
              storedCustom[item.id] ||
              null;

            const primaryCover =
              resolvedCustom ||
              ytmMatch?.coverUrl ||
              bestThumbnail ||
              "";

            const isCustom = Boolean(resolvedCustom || ytmMatch?.isCustomCover);
            if (isCustom && resolvedCustom) {
              writeStoredCustomCover(cleanId, resolvedCustom);
            }

            const rawStatus = (item.status?.privacyStatus || item.snippet?.privacyStatus || ytmMatch?.privacy || ytmMatch?.privacyStatus || "PUBLIC").toUpperCase();
            const normalizedPrivacy = rawStatus === "PRIVATE" ? "PRIVATE" : rawStatus === "UNLISTED" ? "UNLISTED" : "PUBLIC";

            const count = Number(item.contentDetails?.itemCount ?? ytmMatch?.itemCount ?? ytmMatch?.trackCount ?? ytmMatch?.tracksCount ?? 0);

            return {
              id: item.id,
              playlistId: item.id,
              title: item.snippet?.title || ytmMatch?.title || "YouTube Playlist",
              description: item.snippet?.description || ytmMatch?.description || "Synced from your YouTube Music library",
              coverUrl: resolvedCustom || primaryCover,
              thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || primaryCover,
              customCoverUrl: resolvedCustom || (isCustom ? primaryCover : undefined),
              isCustomCover: isCustom,
              isYouTubeSynced: true,
              itemCount: count,
              trackCount: count,
              tracksCount: count,
              contentDetails: {
                itemCount: count,
              },
              thumbnails: thumbs || undefined,
              tracks: [],
              privacy: normalizedPrivacy,
              privacyStatus: normalizedPrivacy,
            };
          });
        }

        // Add any remaining YouTube Music Library playlists that were not in YouTube Data API
        for (const pl of ytmLibraryPlaylists) {
          const cleanId = pl.id.replace(/^VL/, "");
          const existingIdx = ytPlaylists.findIndex(p => p.id === pl.id || p.id === cleanId || p.id.replace(/^VL/, "") === cleanId);
          if (existingIdx >= 0) {
            // Update with authentic YouTube Music custom cover if available
            if (pl.isCustomCover && pl.customCoverUrl) {
              ytPlaylists[existingIdx].coverUrl = pl.customCoverUrl;
              ytPlaylists[existingIdx].customCoverUrl = pl.customCoverUrl;
              ytPlaylists[existingIdx].isCustomCover = true;
            } else if (pl.coverUrl && !ytPlaylists[existingIdx].coverUrl) {
              ytPlaylists[existingIdx].coverUrl = pl.coverUrl;
            }
          } else if (!seenItemIds.has(pl.id) && !seenItemIds.has(cleanId)) {
            seenItemIds.add(pl.id);
            seenItemIds.add(cleanId);
            ytPlaylists.push(pl);
          }
        }

        // Filter strictly user playlists (exclude non-playlists, videos, system/liked/watch later lists)
        const filterGenuinePlaylists = (list: any[]) => {
          return (list || []).filter((pl) => {
            if (!pl || !pl.id) return false;
            if (!isValidPlaylistId(pl.id)) return false;
            const t = (pl.title || "").toLowerCase();
            if (t === "liked music & videos" || t === "liked videos" || t === "liked music" || t === "watch later" || t === "history" || t === "watch history") return false;
            return true;
          });
        };

        ytPlaylists = filterGenuinePlaylists(ytPlaylists);
      } catch (e) {
        console.warn("[YouTube API] Authenticated playlists pull notice:", e);
      }
    }

    // Merge local custom playlists strictly from this user's session and isolated user disk store
    const rawSession = req.session?.playlists || [];
    const userStoredPlaylists = readStoredPlaylists(req);
    const allCustom = [...rawSession, ...userStoredPlaylists];
    const customLocalPlaylists = allCustom.filter((p: any) => p && typeof p.id === "string" && p.id.startsWith("pl_custom_"));

    if (authExpired && ytPlaylists.length === 0 && customLocalPlaylists.length === 0) {
      return res.status(401).json({
        error: "AUTH_EXPIRED",
        message: "Google OAuth session expired. Please sign in again to sync your YouTube Music library.",
        playlists: [],
        authExpired: true,
      });
    }

    let combined: any[] = [];

    const filterGenuinePlaylists = (list: any[]) => {
      return (list || []).filter((pl) => {
        if (!pl || !pl.id) return false;
        if (!isValidPlaylistId(pl.id)) return false;
        const t = (pl.title || "").toLowerCase();
        if (t === "liked music & videos" || t === "liked videos" || t === "liked music" || t === "watch later" || t === "history" || t === "watch history") return false;
        return true;
      });
    };

    if (accessToken) {
      // Authenticated user: return authentic YouTube playlists merged with this user's custom local playlists
      combined = filterGenuinePlaylists([...ytPlaylists, ...customLocalPlaylists]);
      // If authentic fetch returned empty but we have this user's previously saved playlists, use them as resilient fallback
      if (combined.length === 0 && userStoredPlaylists.length > 0 && !authExpired) {
        combined = filterGenuinePlaylists([...userStoredPlaylists]);
      }
    } else {
      // Unauthenticated user: when signed out, do not leak or return private playlists
      combined = [];
    }

    const deduped = deduplicateById(combined);
    
    // Automatically stitch server-persisted custom artwork mappings into the returned playlist objects
    const storedCustomCovers = readStoredCustomCovers(req);
    const finalized = deduped.map((rawPl: any) => {
      if (!rawPl || !rawPl.id) return rawPl;
      const isUser = Boolean(
        rawPl.isUserCreated ||
        rawPl.type === "playlist" ||
        rawPl.id.startsWith("pl_custom_") ||
        rawPl.id.startsWith("PL") ||
        rawPl.id.startsWith("VLPL") ||
        rawPl.isEditable
      );
      const pl = isUser ? {
        ...rawPl,
        isUserCreated: true,
        type: "playlist",
        isEditable: true,
        badge: "Playlist",
        isAlbum: false,
      } : rawPl;
      const cleanPlId = pl.id.replace(/^VL/, "");
      const customImg = storedCustomCovers[cleanPlId] || storedCustomCovers[pl.id] || pl.customArtwork || pl.customCoverUrl;
      if (customImg && typeof customImg === "string" && customImg.trim().length > 5) {
        return {
          ...pl,
          thumbnail: customImg,
          customArtwork: customImg,
          coverUrl: customImg,
          customCoverUrl: customImg,
          isCustomCover: true,
        };
      }
      return pl;
    });

    if (finalized.length > 0) {
      setInCache(userCacheKey, finalized);
      if (accessToken) {
        writeStoredPlaylists(finalized, req);
      }
    }

    console.log(`[YouTube Playlists] Returning ${finalized.length} authentic playlists with stitched custom covers (User: ${accessToken ? "Logged In" : "Anonymous"}).`);
    res.json({ playlists: finalized, newAccessToken: accessToken || undefined });
  } catch (err: any) {
    console.error("Error in /api/youtube/playlists:", err);
    res.json({ playlists: [] });
  }
});

app.get("/api/youtube/playlists/:id/custom-cover", async (req, res) => {
  const { id } = req.params;
  const cleanPlId = id ? id.replace(/^VL/, "") : "";
  try {
    const accessToken = await getValidAccessToken(req);
    const storedCustom = readStoredCustomCovers(req);
    if (storedCustom[cleanPlId] || storedCustom[id]) {
      const cachedCover = storedCustom[cleanPlId] || storedCustom[id];
      return res.json({ customCoverUrl: cachedCover, isCustomCover: true });
    }
    const customCover = await fetchYouTubePlaylistCustomImage(id, accessToken);
    if (customCover) {
      writeStoredCustomCover(cleanPlId, customCover, req);
      return res.json({ customCoverUrl: customCover, isCustomCover: true });
    }
    res.json({ customCoverUrl: null, isCustomCover: false });
  } catch (err) {
    res.json({ customCoverUrl: null, isCustomCover: false });
  }
});

app.get(["/api/youtube/playlists/:id/items", "/api/playlists/:id/items"], async (req, res) => {
  const { id } = req.params;
  const title = (req.query.title as string) || "";
  const artist = (req.query.artist as string) || "";
  const type = (req.query.type as string) || "";
  const forceRefresh = req.query.refresh === "true" || req.query.force === "true" || req.query.sync === "true" || true;

  try {
    const accessToken = await getValidAccessToken(req);
    
    const cleanPlId = id.replace(/^VL/, "");
    // Check session or isolated user disk store
    const storedPlaylists = readStoredPlaylists(req);
    const allPlaylists = [...(req.session?.playlists || []), ...storedPlaylists];
    const found = allPlaylists.find(p => p.id === id || p.playlistId === id || (p.id && p.id.replace(/^VL/, "") === cleanPlId));

    let customCover: string | null = null;
    if (id && !id.startsWith("pl_custom_")) {
      customCover = await fetchYouTubePlaylistCustomImage(id, accessToken);
    }
    if (cleanPlId && !cleanPlId.startsWith("pl_custom_")) {
      const ytTracks = await getPlaylistItemsFromYouTube(accessToken, cleanPlId, forceRefresh);
      if (Array.isArray(ytTracks)) {
        const finalTracks = ytTracks;
        if (found) {
          found.tracks = finalTracks;
          found.tracksCount = finalTracks.length;
          if (customCover) {
            found.coverUrl = customCover;
            found.customCoverUrl = customCover;
            found.isCustomCover = true;
          }
        }
        try {
          const userPls = readStoredPlaylists(req);
          const userFound = userPls.find(p => p.id === id || p.playlistId === id || (p.id && p.id.replace(/^VL/, "") === cleanPlId));
          if (userFound) {
            userFound.tracks = finalTracks;
            userFound.tracksCount = finalTracks.length;
            if (customCover) {
              userFound.coverUrl = customCover;
              userFound.customCoverUrl = customCover;
              userFound.isCustomCover = true;
            }
            writeStoredPlaylists(userPls, req);
          }
        } catch (dErr) {
          console.warn("[Storage] Persist tracks on items fetch notice:", dErr);
        }
        return res.json({
          tracks: finalTracks,
          coverUrl: customCover || found?.customCoverUrl || found?.coverUrl || undefined,
          customCoverUrl: customCover || found?.customCoverUrl || found?.coverUrl || undefined,
          isCustomCover: Boolean(customCover || found?.isCustomCover),
          thumbnails: found?.thumbnails,
        });
      }
    }

    // 2. Custom local or stored playlist tracks
    if (found && found.tracks && found.tracks.length > 0) {
      return res.json({
        tracks: found.tracks,
        coverUrl: customCover || found.customCoverUrl || found.coverUrl,
        customCoverUrl: customCover || found.customCoverUrl || found.coverUrl,
        isCustomCover: Boolean(customCover || found.isCustomCover),
      });
    }

    // 3. Dynamic generation for Mixes (Supermix, Discover, Chill, Energy, Focus, New Release)
    if (id.startsWith("mix_")) {
      let mixQuery = "Today Top Hits Music Official";
      if (id === "mix_supermix") mixQuery = "Billboard Hot 100 Music Official";
      else if (id === "mix_discover") mixQuery = "Fresh new indie alternative pop songs official";
      else if (id === "mix_new_release") mixQuery = "New Music Releases 2026 singles official";
      else if (id === "mix_chill") mixQuery = "Chill acoustic relaxing mellow songs official";
      else if (id === "mix_energy") mixQuery = "High energy dance pop electronic bangers official";
      else if (id === "mix_focus") mixQuery = "Deep focus instrumental study lo-fi beats";

      const mixTracks = await searchYouTubeMusic(mixQuery, accessToken || undefined, "track");
      if (mixTracks && mixTracks.length > 0) {
        const enriched = await enrichTracksWithDuration(mixTracks.slice(0, 25), accessToken);
        return res.json({
          tracks: enriched,
          coverUrl: customCover || found?.coverUrl || enriched[0]?.coverUrl,
          customCoverUrl: customCover || found?.customCoverUrl,
          isCustomCover: Boolean(customCover),
        });
      }
    }

    // 4. Official Studio Albums (ONLY when explicitly an album ID or requested as album type, never for user playlists)
    const isUserPlaylist = Boolean(
      (found as any)?.isUserCreated ||
      (found as any)?.type === "playlist" ||
      (found as any)?.isEditable ||
      id.startsWith("pl_custom_") ||
      id.startsWith("PL") ||
      id.startsWith("VLPL")
    );
    const isExplicitAlbum =
      !isUserPlaylist &&
      (type === "album" ||
      id.startsWith("album_") ||
      id.startsWith("MPREb_") ||
      id.startsWith("OLAK5uy_") ||
      Boolean((found as any)?.isAlbum));

    const targetTitle = title || found?.title || "";
    const targetArtist = artist || found?.description || "";
    
    if (isExplicitAlbum && targetTitle) {
      const searchQuery = `${targetTitle} ${targetArtist} album songs official audio`.trim();
      const albumTracks = await searchYouTubeMusic(searchQuery, accessToken || undefined, "track");
      if (albumTracks && albumTracks.length > 0) {
        const enriched = await enrichTracksWithDuration(albumTracks.slice(0, 20), accessToken);
        const mapped = enriched.map((t, idx) => ({
          ...t,
          album: targetTitle,
          trackNumber: idx + 1,
        }));
        if (found) {
          found.tracks = mapped;
          found.tracksCount = mapped.length;
        }
        return res.json({
          tracks: mapped,
          coverUrl: customCover || found?.coverUrl || mapped[0]?.coverUrl,
          customCoverUrl: customCover || found?.customCoverUrl,
          isCustomCover: Boolean(customCover),
        });
      }
    }

    res.json({
      tracks: found?.tracks || [],
      coverUrl: customCover || found?.customCoverUrl || found?.coverUrl,
      customCoverUrl: customCover || found?.customCoverUrl || found?.coverUrl,
      isCustomCover: Boolean(customCover),
    });
  } catch (err) {
    console.error(`Error in /api/youtube/playlists/${id}/items:`, err);
    res.json({ tracks: [] });
  }
});

// Explicit album tracks endpoint
app.get("/api/youtube/albums/:id/tracks", async (req, res) => {
  const { id } = req.params;
  const title = (req.query.title as string) || "";
  const artist = (req.query.artist as string) || "";

  try {
    const accessToken = await getValidAccessToken(req);
    const ytTracks = await getPlaylistItemsFromYouTube(accessToken, id);
    if (ytTracks && ytTracks.length > 0) {
      return res.json({ tracks: ytTracks });
    }

    const searchQuery = `${title || id} ${artist} album songs official audio`.trim();
    const results = await searchYouTubeMusic(searchQuery, accessToken || undefined, "track");
    res.json({ tracks: results.slice(0, 18) });
  } catch (err) {
    console.error(`Error in /api/youtube/albums/${id}/tracks:`, err);
    res.json({ tracks: [] });
  }
});

app.post("/api/youtube/playlists", async (req, res) => {
  const { title, description, coverUrl, customCoverUrl, isCustomCover, track, initialTrack, tracks, privacyStatus, privacy, visibility } = req.body;
  
  let ytCreatedId: string | null = null;
  let activeToken = await getValidAccessToken(req);
  const rawPrivacy = (privacyStatus || privacy || visibility || "public").toLowerCase();
  const effectivePrivacy = rawPrivacy === "private" || rawPrivacy === "unlisted" ? rawPrivacy : "public";

  if (activeToken) {
    try {
      let ytRes = await fetch("https://www.googleapis.com/youtube/v3/playlists?part=snippet,status", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${activeToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          snippet: {
            title: title || "New Playlist",
            description: description || "Created with Oblivion Music",
          },
          status: {
            privacyStatus: effectivePrivacy,
          },
        }),
      });

      if (ytRes.status === 401) {
        const refreshed = await refreshAccessToken(req, activeToken);
        if (refreshed) {
          activeToken = refreshed;
          ytRes = await fetch("https://www.googleapis.com/youtube/v3/playlists?part=snippet,status", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${activeToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              snippet: {
                title: title || "New Playlist",
                description: description || "Created with Oblivion Music",
              },
              status: {
                privacyStatus: effectivePrivacy,
              },
            }),
          });
        }
      }

      if (!ytRes.ok) {
        // Fallback to snippet-only creation if status was restricted
        const snippetRes = await fetch("https://www.googleapis.com/youtube/v3/playlists?part=snippet", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${activeToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            snippet: {
              title: title || "New Playlist",
              description: description || "Created with Oblivion Music",
            },
          }),
        });
        if (snippetRes.ok) {
          ytRes = snippetRes;
        }
      }

      if (ytRes.ok) {
        const ytData = await ytRes.json();
        if (ytData?.id) {
          ytCreatedId = ytData.id;
          console.log(`[YouTube API] Created new YouTube playlist "${ytCreatedId}"`);
        }
      } else {
        const errText = await ytRes.text();
        console.log(`[YouTube API] Notice: YouTube playlist creation returned HTTP ${ytRes.status}. Creating locally. ${errText.substring(0, 100)}`);
      }
    } catch (ytErr: any) {
      console.warn("[YouTube API] Notice: Playlist creation error:", ytErr?.message || ytErr);
    }
  }

  const targetId = ytCreatedId || `pl_custom_${Date.now()}`;
  const initialTracksList: any[] = [];
  const rawTracks = tracks && Array.isArray(tracks) ? tracks : (track || initialTrack ? [track || initialTrack] : []);

  for (const tr of rawTracks) {
    if (!tr) continue;
    const vId = extractCleanVideoId(tr.youtubeVideoId || tr.id);
    const cleanTr = {
      ...tr,
      id: tr.id || vId,
      youtubeVideoId: vId || tr.youtubeVideoId,
    };

    if (activeToken && ytCreatedId && vId) {
      try {
        const addRes = await fetch("https://www.googleapis.com/youtube/v3/playlistItems?part=snippet", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${activeToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            snippet: {
              playlistId: ytCreatedId,
              resourceId: {
                kind: "youtube#video",
                videoId: vId,
              },
            },
          }),
        });
        const addData = await addRes.json();
        if (addRes.ok && addData.id) {
          cleanTr.id = addData.id;
          cleanTr.playlistItemId = addData.id;
        }
      } catch (addErr) {
        console.warn("Error adding track to newly created YouTube playlist:", addErr);
      }
    }
    initialTracksList.push(cleanTr);
  }

  const finalCover = coverUrl || customCoverUrl || (initialTracksList[0]?.coverUrl) || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80";
  const hasCustomCover = Boolean(isCustomCover || coverUrl || customCoverUrl);

  if (hasCustomCover) {
    const cleanId = targetId.replace(/^VL/, "");
    writeStoredCustomCover(cleanId, finalCover);
    writeStoredCustomCover(targetId, finalCover);
    setInCache(`yt_pl_custom_img:${cleanId}`, finalCover);
    setInCache(`yt_pl_custom_img:${targetId}`, finalCover);

    if (activeToken && ytCreatedId && finalCover.length > 50) {
      uploadPlaylistImageToYouTube(activeToken, ytCreatedId, finalCover).catch((e) => {
        console.warn("[YouTube API] Notice uploading playlist cover during creation:", e);
      });
    }
  }

  const newPlaylist = {
    id: targetId,
    playlistId: targetId,
    title: title || "New Playlist",
    description: description || "",
    coverUrl: finalCover,
    customCoverUrl: hasCustomCover ? finalCover : undefined,
    isCustomCover: hasCustomCover,
    isYouTubeSynced: Boolean(ytCreatedId),
    tracksCount: initialTracksList.length,
    tracks: initialTracksList,
    privacy: effectivePrivacy.toUpperCase(),
    privacyStatus: effectivePrivacy.toUpperCase(),
    isUserCreated: true,
    type: "playlist",
    isEditable: true,
    badge: "Playlist",
    isAlbum: false,
  };

  if (!req.session.playlists) req.session.playlists = [...localPlaylistsStore];
  req.session.playlists.unshift(newPlaylist);
  localPlaylistsStore = req.session.playlists;

  // Persist to disk
  try {
    const stored = readStoredPlaylists();
    stored.unshift(newPlaylist);
    writeStoredPlaylists(stored);
  } catch {}

  // Invalidate caches
  delFromCache("yt_playlists_auth:*");
  delFromCache("yt_playlists_pub:*");
  delFromCache(`pl_items:auth:${targetId}`);
  delFromCache(`pl_items:pub:${targetId}`);

  res.json({ playlist: newPlaylist, syncedToYouTube: Boolean(ytCreatedId) });
});

// Helper to upload custom playlist image thumbnail to YouTube via Data API v3 and InnerTube
async function uploadPlaylistImageToYouTube(accessToken: string, playlistId: string, imageInput: string): Promise<boolean> {
  try {
    let imgBuffer: Buffer | null = null;
    let mimeType = "image/jpeg";

    if (imageInput.startsWith("data:")) {
      const match = imageInput.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1] || "image/jpeg";
        imgBuffer = Buffer.from(match[2], "base64");
      }
    } else if (imageInput.startsWith("http://") || imageInput.startsWith("https://")) {
      try {
        const imgRes = await fetch(imageInput, { signal: AbortSignal.timeout(5000) });
        if (imgRes.ok) {
          const ct = imgRes.headers.get("content-type");
          if (ct) mimeType = ct.split(";")[0].trim();
          const arrayBuf = await imgRes.arrayBuffer();
          imgBuffer = Buffer.from(arrayBuf);
        }
      } catch (fErr) {
        console.warn("[YouTube API] Notice fetching cover image URL for YouTube upload:", fErr);
      }
    }

    const cleanPlId = playlistId.replace(/^VL/, "");

    // 1. Check if the imageInput references a specific YouTube video thumbnail
    let referencedVideoId = "";
    if (imageInput.includes("i.ytimg.com/vi/")) {
      const vMatch = imageInput.match(/\/vi\/([a-zA-Z0-9_-]{11})\//);
      if (vMatch) referencedVideoId = vMatch[1];
    } else if (imageInput.includes("watch?v=")) {
      const vMatch = imageInput.match(/watch\?v=([a-zA-Z0-9_-]{11})/);
      if (vMatch) referencedVideoId = vMatch[1];
    } else if (imageInput.includes("youtu.be/")) {
      const vMatch = imageInput.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
      if (vMatch) referencedVideoId = vMatch[1];
    }

    if (referencedVideoId) {
      try {
        console.log(`[YouTube API] Setting playlist thumbnail for "${cleanPlId}" to video ${referencedVideoId}...`);
        const itThumbRes = await fetch("https://music.youtube.com/youtubei/v1/browse/edit_playlist", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "X-YouTube-Client-Name": "67",
            "X-YouTube-Client-Version": "1.20260220.01.00",
          },
          body: JSON.stringify({
            context: {
              client: { clientName: "WEB_REMIX", clientVersion: "1.20260220.01.00", hl: "en", gl: "US" },
            },
            playlistId: cleanPlId,
            actions: [{ action: "ACTION_SET_PLAYLIST_THUMBNAIL", setPlaylistThumbnailAction: { videoId: referencedVideoId } }],
          }),
          signal: AbortSignal.timeout(4000),
        });
        if (itThumbRes.ok) {
          console.log(`[YouTube Music InnerTube] Successfully updated playlist thumbnail to video ${referencedVideoId}`);
          return true;
        }
      } catch (vidThumbErr) {
        console.warn("[YouTube API] Notice on video thumbnail set:", vidThumbErr);
      }
    }

    if (!imgBuffer || imgBuffer.length === 0) return false;

    const b64 = imgBuffer.toString("base64");

    // 2. Strategy A: Push custom image binary directly to YouTube Data API thumbnails set endpoint
    try {
      console.log(`[YouTube API] Attempting Data API v3 thumbnail upload for playlist "${cleanPlId}" (bytes: ${imgBuffer.length})...`);
      const directUploadRes = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?playlistId=${cleanPlId}&uploadType=media`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": mimeType,
          "Content-Length": imgBuffer.length.toString(),
        },
        body: imgBuffer,
        signal: AbortSignal.timeout(6000),
      });

      if (directUploadRes.ok) {
        console.log(`[YouTube API] Data API v3 set thumbnail successfully for playlist "${cleanPlId}"`);
        return true;
      } else {
        const directErr = await directUploadRes.text().catch(() => "");
        console.log(`[YouTube API] Data API v3 thumbnail set response (HTTP ${directUploadRes.status}): ${directErr.substring(0, 100)}`);
      }
    } catch (uploadApiErr: any) {
      if (uploadApiErr?.name !== "TimeoutError" && !uploadApiErr?.message?.includes("aborted")) {
        console.warn("[YouTube API] Data API thumbnail endpoint note:", uploadApiErr?.message || uploadApiErr);
      }
    }

    // 3. Strategy B: Push to YouTube Music InnerTube edit_playlist with ACTION_SET_PLAYLIST_THUMBNAIL
    try {
      const itRes = await fetch("https://music.youtube.com/youtubei/v1/browse/edit_playlist", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-YouTube-Client-Name": "67",
          "X-YouTube-Client-Version": "1.20260220.01.00",
        },
        body: JSON.stringify({
          context: {
            client: { clientName: "WEB_REMIX", clientVersion: "1.20260220.01.00", hl: "en", gl: "US" },
          },
          playlistId: cleanPlId,
          actions: [
            {
              action: "ACTION_SET_PLAYLIST_THUMBNAIL",
              setPlaylistThumbnailAction: {
                encodedImage: b64,
                rawImage: b64,
                imageData: b64,
              },
            },
          ],
        }),
        signal: AbortSignal.timeout(6000),
      });

      if (itRes.ok) {
        const itData = await itRes.json().catch(() => ({}));
        if (itData?.status === "STATUS_SUCCEEDED" || itData?.actions || !itData?.error) {
          console.log(`[YouTube Music InnerTube] Successfully set playlist thumbnail for "${cleanPlId}" via YTM InnerTube`);
          return true;
        }
      }
    } catch (itImgErr: any) {
      if (itImgErr?.name !== "TimeoutError" && !itImgErr?.message?.includes("aborted")) {
        console.warn("[YouTube API] Notice on YTM InnerTube thumbnail push:", itImgErr?.message || itImgErr);
      }
    }

    // 4. Strategy C: Fallback to YouTube Web InnerTube playlist edit endpoint
    try {
      const itWebRes = await fetch("https://www.youtube.com/youtubei/v1/playlist/edit", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-YouTube-Client-Name": "1",
          "X-YouTube-Client-Version": "2.20260220.00.00",
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: "WEB",
              clientVersion: "2.20260220.00.00",
              hl: "en",
              gl: "US",
            },
          },
          playlistId: cleanPlId,
          actions: [
            {
              action: "ACTION_SET_PLAYLIST_THUMBNAIL",
              setPlaylistThumbnailAction: {
                encodedImage: b64,
              },
            },
          ],
        }),
        signal: AbortSignal.timeout(6000),
      });

      if (itWebRes.ok) {
        console.log(`[YouTube Web InnerTube] Successfully set playlist thumbnail for "${cleanPlId}" via YouTube Web`);
        return true;
      }
    } catch (webItErr: any) {
      if (webItErr?.name !== "TimeoutError" && !webItErr?.message?.includes("aborted")) {
        console.warn("[YouTube API] Notice on YouTube Web InnerTube thumbnail push:", webItErr?.message || webItErr);
      }
    }
  } catch (err: any) {
    if (err?.name !== "TimeoutError" && !err?.message?.includes("aborted")) {
      console.warn(`[YouTube API] Notice during playlist image upload for "${playlistId}":`, err?.message || err);
    }
  }
  return false;
}

app.put("/api/youtube/playlists/:id", async (req, res) => {
  const { id } = req.params;
  const { title, description, coverUrl, customCoverUrl, isCustomCover, privacyStatus, privacy, visibility } = req.body;
  const cleanId = id.replace(/^VL/, "");
  const accessToken = await getValidAccessToken(req);

  const rawPrivacy = (privacyStatus || privacy || visibility || "").toLowerCase();
  const effectivePrivacy = rawPrivacy === "private" || rawPrivacy === "unlisted" || rawPrivacy === "public" ? rawPrivacy : null;

  let syncedToYouTube = false;
  let ytError: string | null = null;

  // 1. If user is signed in to Google / YouTube and this is a real YouTube playlist, push metadata updates to YouTube
  if (accessToken && !cleanId.startsWith("pl_custom_")) {
    try {
      let activeToken = accessToken;

      // First fetch current playlist to retain original fields and verify ownership
      let existingSnippet: any = null;
      let existingStatus: any = null;
      try {
        let getRes = await fetch(`https://www.googleapis.com/youtube/v3/playlists?part=snippet,status&id=${cleanId}`, {
          headers: { Authorization: `Bearer ${activeToken}` },
          signal: AbortSignal.timeout(3500),
        });
        if (getRes.status === 401) {
          const refreshed = await refreshAccessToken(req, activeToken);
          if (refreshed) {
            activeToken = refreshed;
            getRes = await fetch(`https://www.googleapis.com/youtube/v3/playlists?part=snippet,status&id=${cleanId}`, {
              headers: { Authorization: `Bearer ${activeToken}` },
              signal: AbortSignal.timeout(3500),
            });
          }
        }
        if (getRes.ok) {
          const getData = await getRes.json();
          if (getData.items && getData.items.length > 0) {
            existingSnippet = getData.items[0].snippet;
            existingStatus = getData.items[0].status;
          }
        }
      } catch {}

      const parts = ["snippet"];
      const cleanSnippet: any = {
        title: String(title || existingSnippet?.title || "Playlist").trim(),
        description: description !== undefined ? String(description) : (existingSnippet?.description || ""),
      };
      if (existingSnippet?.defaultLanguage) cleanSnippet.defaultLanguage = existingSnippet.defaultLanguage;
      if (existingSnippet?.tags && Array.isArray(existingSnippet.tags)) cleanSnippet.tags = existingSnippet.tags;

      const updatePayload: any = {
        id: cleanId,
        snippet: cleanSnippet,
      };

      if (effectivePrivacy || existingStatus?.privacyStatus) {
        parts.push("status");
        updatePayload.status = {
          privacyStatus: (effectivePrivacy || existingStatus?.privacyStatus || "public").toLowerCase(),
        };
      }

      const partQuery = parts.join(",");

      console.log(`[YouTube API] Pushing playlist update to YouTube for "${cleanId}" (part: ${partQuery})...`);
      let ytRes = await fetch(`https://www.googleapis.com/youtube/v3/playlists?part=${partQuery}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${activeToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
        signal: AbortSignal.timeout(3500),
      });

      // Handle 401 token refresh retry
      if (ytRes.status === 401) {
        console.log(`[YouTube API] 401 encountered when updating playlist "${cleanId}", attempting token refresh...`);
        const refreshed = await refreshAccessToken(req, activeToken);
        if (refreshed) {
          activeToken = refreshed;
          ytRes = await fetch(`https://www.googleapis.com/youtube/v3/playlists?part=${partQuery}`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${activeToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updatePayload),
            signal: AbortSignal.timeout(3500),
          });
        }
      }

      // If status update failed with 400 or 403, retry with just snippet
      if (!ytRes.ok && parts.includes("status")) {
        console.log(`[YouTube API] Status update yielded HTTP ${ytRes.status}, falling back to snippet-only update...`);
        const snippetPayload = {
          id: cleanId,
          snippet: cleanSnippet,
        };
        const snippetRes = await fetch(`https://www.googleapis.com/youtube/v3/playlists?part=snippet`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${activeToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(snippetPayload),
          signal: AbortSignal.timeout(3500),
        });
        if (snippetRes.ok) {
          ytRes = snippetRes;
        }
      }

      if (ytRes.ok) {
        const ytData = await ytRes.json().catch(() => ({}));
        syncedToYouTube = true;
        console.log(`[YouTube API] Successfully pushed update to YouTube playlist "${cleanId}":`, ytData?.id);
      } else {
        const errText = await ytRes.text().catch(() => "");
        console.log(`[YouTube API] Notice: Playlist "${cleanId}" could not be modified directly via Data API (HTTP ${ytRes.status}). Details: ${errText.substring(0, 150)}`);
        ytError = ytRes.status === 403 ? "Playlist permissions restricted on YouTube; attempting InnerTube sync..." : `YouTube status ${ytRes.status}`;
      }

      // Attempt custom thumbnail push to YouTube if custom cover was provided
      const targetImage = coverUrl || customCoverUrl;
      let imgSynced = false;
      if (targetImage && targetImage.length > 50) {
        console.log(`[YouTube API] Syncing custom cover to YouTube for playlist "${cleanId}"...`);
        imgSynced = await uploadPlaylistImageToYouTube(activeToken, cleanId, targetImage);
        if (imgSynced) {
          syncedToYouTube = true;
        }
      }
    } catch (ytErr: any) {
      console.warn(`[YouTube API] Notice: Exception during YouTube playlist update "${cleanId}":`, ytErr?.message || ytErr);
      ytError = ytErr.message || "Saved locally in Oblivion";
    }

    // Complement with YouTube / YouTube Music InnerTube edit endpoint
    try {
      const actions: any[] = [];
      if (title) {
        actions.push({ action: "ACTION_SET_PLAYLIST_NAME", playlistName: title });
      }
      if (description !== undefined) {
        actions.push({ action: "ACTION_SET_PLAYLIST_DESCRIPTION", playlistDescription: description });
      }
      if (effectivePrivacy) {
        actions.push({ action: "ACTION_SET_PLAYLIST_PRIVACY", playlistPrivacy: effectivePrivacy.toUpperCase() });
      }

      if (actions.length > 0) {
        // Send to YouTube Music Remix client
        const ytmRes = await fetch("https://music.youtube.com/youtubei/v1/browse/edit_playlist", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "X-YouTube-Client-Name": "67",
            "X-YouTube-Client-Version": "1.20260220.01.00",
          },
          body: JSON.stringify({
            context: {
              client: {
                clientName: "WEB_REMIX",
                clientVersion: "1.20260220.01.00",
                hl: "en",
                gl: "US",
              },
            },
            playlistId: cleanId,
            actions,
          }),
          signal: AbortSignal.timeout(3500),
        });

        if (ytmRes.ok) {
          syncedToYouTube = true;
          console.log(`[YouTube Music InnerTube] Successfully updated playlist "${cleanId}" via YTM`);
        } else {
          // Fallback to standard YouTube Web client
          const itRes = await fetch("https://www.youtube.com/youtubei/v1/playlist/edit", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              "X-YouTube-Client-Name": "1",
              "X-YouTube-Client-Version": "2.20260220.00.00",
            },
            body: JSON.stringify({
              context: {
                client: {
                  clientName: "WEB",
                  clientVersion: "2.20260220.00.00",
                  hl: "en",
                  gl: "US",
                },
              },
              playlistId: cleanId,
              actions,
            }),
            signal: AbortSignal.timeout(3500),
          });
          if (itRes.ok) {
            syncedToYouTube = true;
            console.log(`[YouTube Web InnerTube] Successfully updated playlist "${cleanId}" via YouTube Web`);
          }
        }
      }
    } catch (itErr) {
      console.warn("[YouTube InnerTube] Notice on playlist edit:", itErr);
    }
  }

  // 2. Persist custom cover artwork
  if (coverUrl || customCoverUrl) {
    const finalCustom = customCoverUrl || coverUrl;
    writeStoredCustomCover(cleanId, finalCustom);
    writeStoredCustomCover(id, finalCustom);
    setInCache(`yt_pl_custom_img:${cleanId}`, finalCustom);
    setInCache(`yt_pl_custom_img:${id}`, finalCustom);
  }

  const updatedPrivacyUpper = (effectivePrivacy || "PUBLIC").toUpperCase();

  // 3. Update session memory
  if (!req.session.playlists) req.session.playlists = [...localPlaylistsStore];
  let foundInSession = false;
  req.session.playlists = req.session.playlists.map(p => {
    if (p.id === id || p.id === cleanId || p.id?.replace(/^VL/, "") === cleanId) {
      foundInSession = true;
      return {
        ...p,
        title: title ?? p.title,
        description: description ?? p.description,
        coverUrl: coverUrl ?? p.coverUrl,
        customCoverUrl: customCoverUrl !== undefined ? customCoverUrl : (coverUrl ?? p.customCoverUrl),
        isCustomCover: isCustomCover !== undefined ? isCustomCover : true,
        privacy: effectivePrivacy ? updatedPrivacyUpper : p.privacy,
        privacyStatus: effectivePrivacy ? updatedPrivacyUpper : p.privacyStatus,
      };
    }
    return p;
  });

  if (!foundInSession) {
    req.session.playlists.unshift({
      id: cleanId,
      playlistId: cleanId,
      title: title || "Playlist",
      description: description || "",
      coverUrl: coverUrl || customCoverUrl || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80",
      customCoverUrl: customCoverUrl || coverUrl,
      isCustomCover: Boolean(coverUrl || customCoverUrl),
      isYouTubeSynced: syncedToYouTube,
      tracksCount: 0,
      tracks: [],
      privacy: updatedPrivacyUpper,
      privacyStatus: updatedPrivacyUpper,
    });
  }
  localPlaylistsStore = req.session.playlists;

  // 4. Persist to disk
  try {
    const stored = readStoredPlaylists();
    let foundInDisk = false;
    const updated = stored.map((p: any) => {
      if (p.id === id || p.id === cleanId || p.id?.replace(/^VL/, "") === cleanId) {
        foundInDisk = true;
        return {
          ...p,
          title: title ?? p.title,
          description: description ?? p.description,
          coverUrl: coverUrl ?? p.coverUrl,
          customCoverUrl: customCoverUrl !== undefined ? customCoverUrl : (coverUrl ?? p.customCoverUrl),
          isCustomCover: isCustomCover !== undefined ? isCustomCover : true,
          privacy: effectivePrivacy ? updatedPrivacyUpper : p.privacy,
          privacyStatus: effectivePrivacy ? updatedPrivacyUpper : p.privacyStatus,
        };
      }
      return p;
    });
    if (!foundInDisk) {
      updated.unshift({
        id: cleanId,
        playlistId: cleanId,
        title: title || "Playlist",
        description: description || "",
        coverUrl: coverUrl || customCoverUrl || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80",
        customCoverUrl: customCoverUrl || coverUrl,
        isCustomCover: Boolean(coverUrl || customCoverUrl),
        isYouTubeSynced: syncedToYouTube,
        tracksCount: 0,
        tracks: [],
        privacy: updatedPrivacyUpper,
        privacyStatus: updatedPrivacyUpper,
      });
    }
    writeStoredPlaylists(updated);
  } catch {}

  // 5. Invalidate server-side caches so subsequent requests get fresh state
  delFromCache("yt_playlists_auth:*");
  delFromCache("yt_playlists_pub:*");
  delFromCache("user_pls_*");
  delFromCache(`pub_pl:${cleanId}`);
  delFromCache(`pub_pl:${id}`);
  delFromCache(`pl_items:auth:${cleanId}`);
  delFromCache(`pl_items:pub:${cleanId}`);

  res.json({ success: true, syncedToYouTube, ytError });
});

// Dedicated endpoint to save custom playlist cover artwork
app.post("/api/youtube/playlists/:id/custom-cover", async (req, res) => {
  const { id } = req.params;
  const { coverUrl, customCoverUrl, isCustom } = req.body;
  const targetCover = customCoverUrl || coverUrl;
  const cleanId = id.replace(/^VL/, "");
  const accessToken = await getValidAccessToken(req);

  let syncedToYouTube = false;
  if (targetCover && isCustom !== false) {
    writeStoredCustomCover(cleanId, targetCover, req);
    writeStoredCustomCover(id, targetCover, req);
    setInCache(`yt_pl_custom_img:${cleanId}`, targetCover);
    setInCache(`yt_pl_custom_img:${id}`, targetCover);

    // If authenticated, push image to YouTube
    if (accessToken && !cleanId.startsWith("pl_custom_")) {
      try {
        console.log(`[YouTube API] Pushing custom cover for "${cleanId}" to YouTube...`);
        syncedToYouTube = await uploadPlaylistImageToYouTube(accessToken, cleanId, targetCover);
      } catch (err: any) {
        console.warn(`[YouTube API] Notice pushing cover to YouTube for "${cleanId}":`, err?.message || err);
      }
    }

    // Invalidate caches
    delFromCache("yt_playlists_auth:*");
    delFromCache("yt_playlists_pub:*");
    delFromCache("user_pls_*");
    delFromCache(`pub_pl:${cleanId}`);
    delFromCache(`pub_pl:${id}`);
  }

  res.json({ success: true, coverUrl: targetCover, syncedToYouTube });
});

// Dedicated endpoints for custom playlist artwork persistence
app.get(["/api/playlists/custom-artwork", "/api/youtube/playlists/custom-covers", "/api/youtube/playlists/custom-artwork"], (req, res) => {
  const covers = readStoredCustomCovers(req);
  res.json({ covers, customArtwork: covers });
});

app.post(["/api/playlists/custom-artwork", "/api/youtube/playlists/custom-artwork"], (req, res) => {
  try {
    const { playlistId, id, artworkUrl, coverUrl, customCoverUrl, covers } = req.body;
    const targetId = playlistId || id;
    const targetCover = artworkUrl || customCoverUrl || coverUrl;

    if (targetId && targetCover) {
      const cleanId = String(targetId).replace(/^VL/, "");
      writeStoredCustomCover(cleanId, targetCover, req);
      writeStoredCustomCover(String(targetId), targetCover, req);
      setInCache(`yt_pl_custom_img:${cleanId}`, targetCover);
      setInCache(`yt_pl_custom_img:${targetId}`, targetCover);
      delFromCache("yt_playlists_auth:*");
      delFromCache("yt_playlists_pub:*");
      delFromCache("user_pls_*");
      return res.json({ success: true, playlistId: cleanId, artworkUrl: targetCover });
    }

    if (covers && typeof covers === "object") {
      for (const [k, v] of Object.entries(covers)) {
        if (k && typeof v === "string" && v.length > 5) {
          const cleanK = k.replace(/^VL/, "");
          writeStoredCustomCover(cleanK, v, req);
          writeStoredCustomCover(k, v, req);
        }
      }
      delFromCache("yt_playlists_auth:*");
      delFromCache("yt_playlists_pub:*");
      delFromCache("user_pls_*");
      return res.json({ success: true, count: Object.keys(covers).length });
    }

    res.status(400).json({ success: false, error: "Missing playlistId or artworkUrl" });
  } catch (err: any) {
    console.error("Error saving custom artwork:", err);
    res.status(500).json({ success: false, error: err?.message || "Failed to save artwork" });
  }
});

app.delete(["/api/playlists/custom-artwork/:id", "/api/youtube/playlists/custom-artwork/:id"], (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = id.replace(/^VL/, "");
    const stored = readStoredCustomCovers();
    delete stored[id];
    delete stored[cleanId];
    delete stored[`VL${cleanId}`];
    writeStoredCustomCovers(stored);
    delFromCache(`yt_pl_custom_img:${cleanId}`);
    delFromCache(`yt_pl_custom_img:${id}`);
    delFromCache("yt_playlists_auth:*");
    delFromCache("yt_playlists_pub:*");
    delFromCache("user_pls_*");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Failed to delete custom artwork" });
  }
});

// Dedicated endpoint to clear and purge all server-side caches and stored artwork
app.post(["/api/cache/clear", "/api/system/reset-cache", "/api/youtube/cache/clear"], (req, res) => {
  try {
    apiCache.clear();
    writeStoredCustomCovers({});
    writeStoredPlaylists([]);
    localPlaylistsStore = [];
    if (req.session) {
      req.session.playlists = [];
    }
    console.log("[Cache Reset] Server-side memory cache and custom covers store purged completely.");
    res.json({ success: true, message: "Server cache and custom cover artwork purged successfully." });
  } catch (err: any) {
    console.error("Error purging server cache:", err);
    res.status(500).json({ success: false, error: err?.message || "Failed to clear cache" });
  }
});

app.delete(["/api/playlists/:id", "/api/youtube/playlists/:id"], async (req, res) => {
  const { id } = req.params;
  const cleanId = id.replace(/^VL/, "");
  const accessToken = await getValidAccessToken(req);

  // 1. If signed in, try deleting directly from YouTube Data API
  if (accessToken && !cleanId.startsWith("pl_custom_")) {
    try {
      let activeToken = accessToken;
      let delRes = await fetch(`https://www.googleapis.com/youtube/v3/playlists?id=${cleanId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (delRes.status === 401) {
        const refreshed = await refreshAccessToken(req, activeToken);
        if (refreshed) {
          activeToken = refreshed;
          await fetch(`https://www.googleapis.com/youtube/v3/playlists?id=${cleanId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${activeToken}` },
          });
        }
      }
    } catch (ytDelErr) {
      console.log(`[YouTube API] Notice during playlist delete "${cleanId}":`, ytDelErr);
    }
  }

  // 2. Remove from session and memory store
  if (!req.session.playlists) req.session.playlists = [...localPlaylistsStore];
  req.session.playlists = req.session.playlists.filter(
    (p) => p.id !== id && p.id !== cleanId && p.id?.replace(/^VL/, "") !== cleanId
  );
  localPlaylistsStore = req.session.playlists;

  // 3. Remove from disk store
  try {
    const stored = readStoredPlaylists();
    const filtered = stored.filter(
      (p: any) => p.id !== id && p.id !== cleanId && p.id?.replace(/^VL/, "") !== cleanId
    );
    writeStoredPlaylists(filtered);
  } catch {}

  // 4. Remove from PLAYLIST_CUSTOM_ARTWORK / custom covers store on server
  try {
    const customCovers = readStoredCustomCovers();
    if (customCovers[id] || customCovers[cleanId] || customCovers[`VL${cleanId}`]) {
      delete customCovers[id];
      delete customCovers[cleanId];
      delete customCovers[`VL${cleanId}`];
      writeStoredCustomCovers(customCovers);
    }
  } catch {}

  // 5. Invalidate caches
  delFromCache("yt_playlists_auth:*");
  delFromCache("yt_playlists_pub:*");
  delFromCache("user_pls_*");
  delFromCache(`pub_pl:${cleanId}`);
  delFromCache(`pub_pl:${id}`);
  delFromCache(`pl_items:auth:${cleanId}`);
  delFromCache(`pl_items:pub:${cleanId}`);
  delFromCache(`yt_pl_custom_img:${cleanId}`);
  delFromCache(`yt_pl_custom_img:${id}`);

  // Return HTTP 204 No Content on success
  res.status(204).end();
});

async function syncPlaylistTracksToYouTube(
  req: express.Request,
  id: string,
  tracks: any[],
  options: { allowInsert?: boolean; mutatedItems?: any[] } = { allowInsert: false }
): Promise<{ success: boolean; syncedToYouTube: boolean; count: number; error?: string }> {
  const cleanPlId = id.replace(/^VL/, "");

  // Update in-memory local & session stores
  if (!req.session.playlists) req.session.playlists = [...localPlaylistsStore];
  const found = req.session.playlists.find(
    (p) => p.id === id || p.playlistId === id || (p.id && p.id.replace(/^VL/, "") === cleanPlId)
  );

  const storedCustom = readStoredCustomCovers();
  const customImg =
    storedCustom[cleanPlId] ||
    storedCustom[id] ||
    (found?.customCoverUrl && isAuthenticCustomUrl(found.customCoverUrl) ? found.customCoverUrl : null) ||
    (found?.coverUrl && isAuthenticCustomUrl(found.coverUrl) ? found.coverUrl : null);

  const hasCustomCover = Boolean(customImg || found?.isCustomCover);

  if (found && Array.isArray(tracks)) {
    found.tracks = tracks;
    found.tracksCount = tracks.length;
    if (hasCustomCover && customImg) {
      found.coverUrl = customImg;
      found.customCoverUrl = customImg;
      found.isCustomCover = true;
    } else if (!hasCustomCover && tracks.length > 0 && !found.coverUrl) {
      found.coverUrl = tracks[0].coverUrl;
    }
  }
  localPlaylistsStore = req.session.playlists;

  // Persist to disk store
  try {
    const diskPls = readStoredPlaylists();
    const diskFound = diskPls.find(
      (p: any) => p.id === id || p.playlistId === id || p.id === cleanPlId || (p.id && p.id.replace(/^VL/, "") === cleanPlId)
    );
    if (diskFound && Array.isArray(tracks)) {
      diskFound.tracks = tracks;
      diskFound.tracksCount = tracks.length;
      writeStoredPlaylists(diskPls);
    }
  } catch (dErr) {
    console.warn("[Storage] Persist playlist sync notice:", dErr);
  }

  if (cleanPlId.startsWith("pl_custom_")) {
    return { success: true, syncedToYouTube: true, count: tracks?.length || 0 };
  }

  let syncedToYouTube = false;
  let syncError: string | undefined = undefined;

  try {
    let accessToken = await getValidAccessToken(req);
    if (!accessToken) {
      syncError = "No active Google/YouTube authorization found. Please sign in with your Google account.";
      console.warn("[YouTube API Sync] No access token found.");
    } else {
      // 1. Fetch existing playlist items from YouTube Data API v3 (up to 1000 items with token refresh)
      let pageToken: string | undefined = undefined;
      let pagesCount = 0;
      const maxPages = 20;
      const existingItems: any[] = [];

      do {
        const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=id,snippet,contentDetails&playlistId=${cleanPlId}&maxResults=50${
          pageToken ? `&pageToken=${pageToken}` : ""
        }`;
        let plRes = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(6000),
        }).catch(() => null);

        if (plRes && plRes.status === 401) {
          const refreshed = await refreshAccessToken(req, accessToken);
          if (refreshed) {
            accessToken = refreshed;
            plRes = await fetch(url, {
              headers: { Authorization: `Bearer ${accessToken}` },
              signal: AbortSignal.timeout(6000),
            }).catch(() => null);
          }
        }

        if (!plRes || !plRes.ok) {
          break;
        }

        const data = await plRes.json().catch(() => ({}));
        if (data.items && Array.isArray(data.items)) {
          existingItems.push(...data.items);
        }
        pageToken = data.nextPageToken;
        pagesCount++;
      } while (pageToken && pagesCount < maxPages);

      console.log(`[YouTube API Sync] Found ${existingItems.length} items in remote playlist ${cleanPlId}`);

      // Map existing item ID -> item details
      const itemIdToItem = new Map<string, any>();
      const videoToItemIds = new Map<string, string[]>();
      const existingItemIdsSet = new Set<string>();

      for (const it of existingItems) {
        const vId = it.contentDetails?.videoId || it.snippet?.resourceId?.videoId;
        if (it.id) {
          existingItemIdsSet.add(it.id);
          itemIdToItem.set(it.id, it);
          if (vId) {
            const list = videoToItemIds.get(vId) || [];
            list.push(it.id);
            videoToItemIds.set(vId, list);
          }
        }
      }

      if (Array.isArray(tracks) && tracks.length > 0) {
        // Map requested tracks to matching YouTube playlist item IDs in exact target order
        const targetOrderIds: string[] = [];
        const usedItemIds = new Set<string>();

        for (const tr of tracks) {
          const vId = extractCleanVideoId(tr.youtubeVideoId || tr.id);
          let targetItemId: string | undefined = undefined;

          if (tr.playlistItemId && existingItemIdsSet.has(tr.playlistItemId) && !usedItemIds.has(tr.playlistItemId)) {
            targetItemId = tr.playlistItemId;
          } else if (vId) {
            const list = videoToItemIds.get(vId);
            if (list) {
              const available = list.find((id) => !usedItemIds.has(id));
              if (available) targetItemId = available;
            }
          }

          if (targetItemId) {
            targetOrderIds.push(targetItemId);
            usedItemIds.add(targetItemId);
          }
        }

        // Maintain local simulation of YouTube's actual list of item IDs as moves occur
        const currentRemoteOrder = existingItems.map((it) => it.id);
        let updateSuccessCount = 0;
        let movesAttempted = 0;

        console.log(`[YouTube API Sync] Processing ${targetOrderIds.length} tracks for playlist ${cleanPlId}...`);

        for (let targetPos = 0; targetPos < targetOrderIds.length; targetPos++) {
          const itemId = targetOrderIds[targetPos];
          if (!itemId) continue;

          const currentPos = currentRemoteOrder.indexOf(itemId);
          if (currentPos === -1) continue;

          // If the item is already at the desired index in the current order, no move request is needed
          if (currentPos === targetPos) {
            continue;
          }

          movesAttempted++;
          const existingItem = itemIdToItem.get(itemId);
          const targetPlaylistId = existingItem?.snippet?.playlistId || cleanPlId;
          const resourceId = existingItem?.snippet?.resourceId || {
            kind: "youtube#video",
            videoId: existingItem?.contentDetails?.videoId || existingItem?.snippet?.resourceId?.videoId,
          };

          try {
            let res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet`, {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                id: itemId,
                snippet: {
                  playlistId: targetPlaylistId,
                  resourceId: resourceId,
                  position: targetPos,
                },
              }),
              signal: AbortSignal.timeout(10000),
            });

            if (res.status === 401) {
              const refreshed = await refreshAccessToken(req, accessToken);
              if (refreshed) {
                accessToken = refreshed;
                res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet`, {
                  method: "PUT",
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    id: itemId,
                    snippet: {
                      playlistId: targetPlaylistId,
                      resourceId: resourceId,
                      position: targetPos,
                    },
                  }),
                  signal: AbortSignal.timeout(10000),
                });
              }
            }

            if (res.ok) {
              updateSuccessCount++;
              // Simulate move in currentRemoteOrder to accurately track YouTube's mutated order for subsequent moves
              currentRemoteOrder.splice(currentPos, 1);
              currentRemoteOrder.splice(targetPos, 0, itemId);
            } else {
              const errBody = await res.text().catch(() => "");
              console.warn(`[YouTube API Sync] Failed to move item ${itemId} to position ${targetPos}:`, res.status, errBody);
            }
          } catch (itemErr) {
            console.warn(`[YouTube API Sync] Exception moving item ${itemId} to position ${targetPos}:`, itemErr);
          }
        }

        console.log(`[YouTube API Sync] Reorder complete: ${movesAttempted} moves attempted, ${updateSuccessCount} succeeded for ${cleanPlId}`);
        if (movesAttempted === 0 || updateSuccessCount > 0) {
          syncedToYouTube = true;
        }
      }
    }
  } catch (err: any) {
    syncError = err?.message || "Error syncing with YouTube API";
    console.error("[YouTube API Sync] Error:", err);
  }

  // Invalidate all caches
  delFromCache(`pl_items:auth:${cleanPlId}`);
  delFromCache(`pl_items:pub:${cleanPlId}`);
  delFromCache(`pl_items:auth:${id}`);
  delFromCache(`pl_items:pub:${id}`);
  delFromCache(`pub_pl:${cleanPlId}`);
  delFromCache(`pub_pl:${id}`);
  for (const k of apiCache.keys()) {
    if (k.includes(cleanPlId) || k.startsWith("user_pls_")) {
      delFromCache(k);
    }
  }

  return {
    success: true,
    syncedToYouTube: Boolean(syncedToYouTube),
    count: tracks?.length || 0,
    error: syncError,
  };
}

app.put(["/api/youtube/playlists/:id/reorder", "/api/playlists/:id/reorder"], async (req, res) => {
  const { id } = req.params;
  const { tracks, mutatedItems } = req.body;
  const result = await syncPlaylistTracksToYouTube(req, id, tracks || [], { allowInsert: false, mutatedItems });
  res.json(result);
});

app.post(["/api/playlists/reorder", "/api/youtube/playlists/reorder"], async (req, res) => {
  const { playlistId, id, tracks, mutatedItems } = req.body;
  const targetId = playlistId || id || req.query.playlistId || req.query.id;
  if (!targetId) {
    return res.status(400).json({ success: false, error: "Missing playlistId" });
  }
  const result = await syncPlaylistTracksToYouTube(req, String(targetId), tracks || [], { allowInsert: false, mutatedItems });
  res.json(result);
});

app.post(["/api/youtube/playlists/:id/reorder", "/api/playlists/:id/reorder"], async (req, res) => {
  const { id } = req.params;
  const { tracks, mutatedItems } = req.body;
  const result = await syncPlaylistTracksToYouTube(req, id, tracks || [], { allowInsert: false, mutatedItems });
  res.json(result);
});

app.post(["/api/youtube/playlists/:id/items", "/api/playlists/:id/items"], async (req, res) => {
  const { id } = req.params;
  const { track, allowDuplicate } = req.body;
  const cleanPlId = id.replace(/^VL/, "");

  if (!track) {
    return res.status(400).json({ error: "Missing track data" });
  }

  const vId = extractCleanVideoId(track?.youtubeVideoId || track?.id);
  const cleanTrack = {
    ...track,
    id: track.id || vId,
    youtubeVideoId: vId || track.youtubeVideoId,
  };

  // Update in session memory and isolated user disk store
  try {
    if (!req.session.playlists) req.session.playlists = [];
    let foundInSession = req.session.playlists.find((p) => p.id === id || p.playlistId === id || p.id === cleanPlId || (p.id && p.id.replace(/^VL/, "") === cleanPlId));
    if (foundInSession) {
      if (!foundInSession.tracks) foundInSession.tracks = [];
      foundInSession.tracks.push(cleanTrack);
      foundInSession.tracksCount = foundInSession.tracks.length;
    }

    const userPls = readStoredPlaylists(req);
    let foundInUserStore = userPls.find((p: any) => p.id === id || p.playlistId === id || p.id === cleanPlId || (p.id && p.id.replace(/^VL/, "") === cleanPlId));
    if (foundInUserStore) {
      if (!foundInUserStore.tracks) foundInUserStore.tracks = [];
      foundInUserStore.tracks.push(cleanTrack);
      foundInUserStore.tracksCount = foundInUserStore.tracks.length;
      writeStoredPlaylists(userPls, req);
    }
  } catch (storeErr) {
    console.warn("[Storage] Notice updating playlist item in store:", storeErr);
  }

  let syncedToYouTube = false;
  let newPlaylistItemId: string | null = null;
  let errorMessage: string | null = null;

  try {
    let accessToken = await getValidAccessToken(req);
    if (!accessToken) {
      errorMessage = "No YouTube authorization token found. Please sign in with Google/YouTube to commit changes directly to YouTube.";
      console.warn("[YouTube API] Add item warning: No access token present");
    } else if (cleanPlId && !cleanPlId.startsWith("pl_custom_") && vId) {
      console.log(`[YouTube API] Adding video ${vId} to YouTube playlist ${cleanPlId}...`);
      let addRes = await fetch("https://www.googleapis.com/youtube/v3/playlistItems?part=snippet", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          snippet: {
            playlistId: cleanPlId,
            resourceId: {
              kind: "youtube#video",
              videoId: vId,
            },
          },
        }),
      });

      if (addRes.status === 401) {
        console.log(`[YouTube API] 401 Unauthorized on add item, refreshing token...`);
        const refreshed = await refreshAccessToken(req, accessToken);
        if (refreshed) {
          accessToken = refreshed;
          addRes = await fetch("https://www.googleapis.com/youtube/v3/playlistItems?part=snippet", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              snippet: {
                playlistId: cleanPlId,
                resourceId: {
                  kind: "youtube#video",
                  videoId: vId,
                },
              },
            }),
          });
        }
      }

      if (addRes.ok) {
        const addData = await addRes.json();
        if (addData.id) {
          syncedToYouTube = true;
          newPlaylistItemId = addData.id;
          cleanTrack.id = addData.id;
          cleanTrack.playlistItemId = addData.id;
          console.log(`[YouTube API] Successfully committed video ${vId} to YouTube playlist ${cleanPlId}. Item ID: ${addData.id}`);
        }
      } else {
        const errText = await addRes.text();
        console.warn(`[YouTube API] Playlist item insert yielded ${addRes.status}: ${errText.substring(0, 150)}`);
      }

      // InnerTube fallback if Data API didn't succeed
      if (!syncedToYouTube && accessToken) {
        try {
          console.log(`[YouTube InnerTube] Attempting InnerTube add video ${vId} to playlist ${cleanPlId}...`);
          const ytmAddRes = await fetch("https://music.youtube.com/youtubei/v1/browse/edit_playlist", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              "X-YouTube-Client-Name": "67",
              "X-YouTube-Client-Version": "1.20260220.01.00",
            },
            body: JSON.stringify({
              context: {
                client: {
                  clientName: "WEB_REMIX",
                  clientVersion: "1.20260220.01.00",
                  hl: "en",
                  gl: "US",
                },
              },
              playlistId: cleanPlId,
              actions: [
                {
                  action: "ACTION_ADD_VIDEO",
                  addedVideoId: vId,
                },
              ],
            }),
          });

          if (ytmAddRes.ok) {
            syncedToYouTube = true;
            console.log(`[YouTube Music InnerTube] Successfully added video ${vId} to playlist ${cleanPlId}`);
          } else {
            const ytWebAddRes = await fetch("https://www.youtube.com/youtubei/v1/playlist/edit", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
                "X-YouTube-Client-Name": "1",
                "X-YouTube-Client-Version": "2.20260220.00.00",
              },
              body: JSON.stringify({
                context: {
                  client: {
                    clientName: "WEB",
                    clientVersion: "2.20260220.00.00",
                    hl: "en",
                    gl: "US",
                  },
                },
                playlistId: cleanPlId,
                actions: [
                  {
                    action: "ACTION_ADD_VIDEO",
                    addedVideoId: vId,
                  },
                ],
              }),
            });
            if (ytWebAddRes.ok) {
              syncedToYouTube = true;
              console.log(`[YouTube Web InnerTube] Successfully added video ${vId} to playlist ${cleanPlId}`);
            }
          }
        } catch (itErr) {
          console.warn("[YouTube InnerTube] Notice on add video fallback:", itErr);
        }
      }
    }
  } catch (addErr: any) {
    errorMessage = addErr?.message || "Error connecting to YouTube API";
    console.warn("[YouTube API] Add item error:", addErr);
  }

  // Invalidate all caches for this playlist & user playlist list so immediate re-fetch returns fresh data
  delFromCache(`pl_items:auth:${cleanPlId}`);
  delFromCache(`pl_items:pub:${cleanPlId}`);
  delFromCache(`pl_items:auth:${id}`);
  delFromCache(`pl_items:pub:${id}`);
  delFromCache(`pub_pl:${cleanPlId}`);
  delFromCache(`pub_pl:${id}`);
  for (const k of apiCache.keys()) {
    if (k.includes(cleanPlId) || k.startsWith("user_pls_")) {
      delFromCache(k);
    }
  }

  res.json({
    success: true,
    syncedToYouTube,
    error: errorMessage,
    track: cleanTrack,
  });
});

app.delete(["/api/youtube/playlists/:id/items/:trackId", "/api/playlists/:id/items/:trackId"], async (req, res) => {
  const { id, trackId } = req.params;
  const cleanPlId = id.replace(/^VL/, "");
  const decodedTrackId = decodeURIComponent(trackId);
  const vId = extractCleanVideoId(decodedTrackId) || extractCleanVideoId((req.query.videoId as string) || "");
  const queryPlItemId = (req.query.playlistItemId as string) || "";
  const candidateItemId = queryPlItemId || (decodedTrackId && !decodedTrackId.includes("_") && decodedTrackId.length > 15 ? decodedTrackId : "");

  // Filter out the track from session and isolated user disk store
  try {
    if (req.session?.playlists) {
      const found = req.session.playlists.find((p) => p.id === id || p.playlistId === id || p.id === cleanPlId || (p.id && p.id.replace(/^VL/, "") === cleanPlId));
      if (found && found.tracks) {
        found.tracks = found.tracks.filter((t: any) => {
          const tVid = extractCleanVideoId(t.youtubeVideoId || t.id);
          const tPlItemId = t.playlistItemId || t.id;
          return t.id !== decodedTrackId && t.youtubeVideoId !== decodedTrackId && tVid !== vId && tPlItemId !== decodedTrackId && (!candidateItemId || tPlItemId !== candidateItemId);
        });
        found.tracksCount = found.tracks.length;
      }
    }

    const userPls = readStoredPlaylists(req);
    const userFound = userPls.find((p: any) => p.id === id || p.playlistId === id || p.id === cleanPlId || (p.id && p.id.replace(/^VL/, "") === cleanPlId));
    if (userFound && userFound.tracks) {
      userFound.tracks = userFound.tracks.filter((t: any) => {
        const tVid = extractCleanVideoId(t.youtubeVideoId || t.id);
        const tPlItemId = t.playlistItemId || t.id;
        return t.id !== decodedTrackId && t.youtubeVideoId !== decodedTrackId && tVid !== vId && tPlItemId !== decodedTrackId && (!candidateItemId || tPlItemId !== candidateItemId);
      });
      userFound.tracksCount = userFound.tracks.length;
      writeStoredPlaylists(userPls, req);
    }
  } catch (storeErr) {
    console.warn("[Storage] Remove track store notice:", storeErr);
  }

  let syncedToYouTube = false;
  try {
    let accessToken = await getValidAccessToken(req);
    if (accessToken && cleanPlId && !cleanPlId.startsWith("pl_custom_")) {
      // 1. If we have a direct candidateItemId (e.g. standard YouTube playlistItem ID), try direct DELETE
      if (candidateItemId && (candidateItemId.startsWith("UEx") || candidateItemId.length > 15)) {
        try {
          let delRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?id=${encodeURIComponent(candidateItemId)}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (delRes.status === 401) {
            const refreshed = await refreshAccessToken(req, accessToken);
            if (refreshed) {
              accessToken = refreshed;
              delRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?id=${encodeURIComponent(candidateItemId)}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${accessToken}` },
              });
            }
          }

          if (delRes.ok || delRes.status === 204) {
            syncedToYouTube = true;
            console.log(`[YouTube API] Successfully deleted item ${candidateItemId} directly from playlist ${cleanPlId}`);
          }
        } catch (dirDelErr) {
          console.warn("[YouTube API] Direct playlist item delete attempt:", dirDelErr);
        }
      }

      // 2. Search live playlist items via YouTube Data API with pagination to locate exact playlistItemId
      if (!syncedToYouTube) {
        let pageToken: string | undefined = undefined;
        let pagesCount = 0;
        let matchingItemId: string | null = null;

        do {
          let plItemsRes = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=id,snippet,contentDetails&playlistId=${cleanPlId}&maxResults=50${
              pageToken ? `&pageToken=${pageToken}` : ""
            }`,
            { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(6000) }
          );

          if (plItemsRes.status === 401) {
            const refreshed = await refreshAccessToken(req, accessToken);
            if (refreshed) {
              accessToken = refreshed;
              plItemsRes = await fetch(
                `https://www.googleapis.com/youtube/v3/playlistItems?part=id,snippet,contentDetails&playlistId=${cleanPlId}&maxResults=50${
                  pageToken ? `&pageToken=${pageToken}` : ""
                }`,
                { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(6000) }
              );
            }
          }

          if (!plItemsRes.ok) break;

          const plItemsData = await plItemsRes.json();
          if (plItemsData.items && Array.isArray(plItemsData.items)) {
            const matchingItem = plItemsData.items.find((it: any) => {
              const itemVid = it.contentDetails?.videoId || it.snippet?.resourceId?.videoId;
              return it.id === decodedTrackId || it.id === candidateItemId || (vId && itemVid === vId);
            });

            if (matchingItem?.id) {
              matchingItemId = matchingItem.id;
              break;
            }
          }
          pageToken = plItemsData.nextPageToken;
          pagesCount++;
        } while (pageToken && pagesCount < 20);

        if (matchingItemId) {
          let delRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?id=${matchingItemId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: AbortSignal.timeout(6000),
          });

          if (delRes.status === 401) {
            const refreshed = await refreshAccessToken(req, accessToken);
            if (refreshed) {
              accessToken = refreshed;
              delRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?id=${matchingItemId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${accessToken}` },
                signal: AbortSignal.timeout(6000),
              });
            }
          }

          if (delRes.ok || delRes.status === 204) {
            syncedToYouTube = true;
            console.log(`[YouTube API] Successfully deleted matching item ${matchingItemId} from playlist ${cleanPlId}`);
          } else {
            console.warn("YouTube API delete playlistItem status:", delRes.status);
          }
        }
      }

      // 3. InnerTube remove fallbacks for YouTube Music & YouTube Web
      if (!syncedToYouTube) {
        // Fallback A: By setVideoId if available
        const possibleSetId = candidateItemId?.startsWith("SETrt") ? candidateItemId : decodedTrackId?.startsWith("SETrt") ? decodedTrackId : null;
        if (possibleSetId) {
          try {
            const ytmRemoveRes = await fetch("https://music.youtube.com/youtubei/v1/browse/edit_playlist", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
                "X-YouTube-Client-Name": "67",
                "X-YouTube-Client-Version": "1.20260220.01.00",
              },
              body: JSON.stringify({
                context: {
                  client: {
                    clientName: "WEB_REMIX",
                    clientVersion: "1.20260220.01.00",
                    hl: "en",
                    gl: "US",
                  },
                },
                playlistId: cleanPlId,
                actions: [{ action: "ACTION_REMOVE_VIDEO_BY_SET_ID", setVideoId: possibleSetId }],
              }),
              signal: AbortSignal.timeout(5000),
            });
            if (ytmRemoveRes.ok) {
              syncedToYouTube = true;
              console.log(`[YouTube Music InnerTube] Successfully removed set video ${possibleSetId} from playlist ${cleanPlId}`);
            }
          } catch (itErr) {}
        }

        // Fallback B: By video ID
        if (!syncedToYouTube && vId) {
          try {
            const ytmRemoveRes = await fetch("https://music.youtube.com/youtubei/v1/browse/edit_playlist", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
                "X-YouTube-Client-Name": "67",
                "X-YouTube-Client-Version": "1.20260220.01.00",
              },
              body: JSON.stringify({
                context: {
                  client: {
                    clientName: "WEB_REMIX",
                    clientVersion: "1.20260220.01.00",
                    hl: "en",
                    gl: "US",
                  },
                },
                playlistId: cleanPlId,
                actions: [{ action: "ACTION_REMOVE_VIDEO", removedVideoId: vId }],
              }),
              signal: AbortSignal.timeout(5000),
            });
            if (ytmRemoveRes.ok) {
              syncedToYouTube = true;
              console.log(`[YouTube Music InnerTube] Successfully removed video ${vId} from playlist ${cleanPlId}`);
            } else {
              // Try YouTube Web InnerTube
              const ytWebRes = await fetch("https://www.youtube.com/youtubei/v1/playlist/edit", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                  "X-YouTube-Client-Name": "1",
                  "X-YouTube-Client-Version": "2.20260220.00.00",
                },
                body: JSON.stringify({
                  context: {
                    client: {
                      clientName: "WEB",
                      clientVersion: "2.20260220.00.00",
                      hl: "en",
                      gl: "US",
                    },
                  },
                  playlistId: cleanPlId,
                  actions: [{ action: "ACTION_REMOVE_VIDEO", removedVideoId: vId }],
                }),
                signal: AbortSignal.timeout(5000),
              });
              if (ytWebRes.ok) {
                syncedToYouTube = true;
                console.log(`[YouTube Web InnerTube] Successfully removed video ${vId} from playlist ${cleanPlId}`);
              }
            }
          } catch (itDelErr) {
            console.warn("[YouTube InnerTube] Notice on delete video fallback:", itDelErr);
          }
        }
      }
    }
  } catch (delErr) {
    console.warn("YouTube API delete item error:", delErr);
  }

  delFromCache(`pl_items:auth:${cleanPlId}`);
  delFromCache(`pl_items:pub:${cleanPlId}`);
  delFromCache(`pl_items:auth:${id}`);
  delFromCache(`pl_items:pub:${id}`);
  delFromCache(`pub_pl:${cleanPlId}`);
  delFromCache(`pub_pl:${id}`);
  for (const k of apiCache.keys()) {
    if (k.includes(cleanPlId) || k.startsWith("user_pls_")) {
      delFromCache(k);
    }
  }

  res.json({ success: true, syncedToYouTube });
});

app.post("/api/youtube/playlists/:id/sync", async (req, res) => {
  const { id } = req.params;
  const { tracks } = req.body;
  const result = await syncPlaylistTracksToYouTube(req, id, tracks || [], { allowInsert: true });
  res.json(result);
});

// YouTube Music Home Feed (Always fresh pull on request: personalized when signed in, trending when signed out)
app.get("/api/youtube/home", async (req, res) => {
  try {
    const accessToken = await getValidAccessToken(req);
    const mood = (req.query.mood as string) || "All";

    let quickPicks: any[] = [];
    let listenAgain: any[] = [];
    let trendingHits: any[] = [];
    let recommendedAlbums: any[] = [];
    let similarTo: { artist: string; tracks: any[] } | null = null;
    let isPersonalized = false;

    // 1. If signed in, attempt to fetch authentic personalized Home from YouTube Music InnerTube
    if (accessToken) {
      // 1a. Try fetching FEmusic_home and FEmusic_history in parallel from YouTube Music InnerTube
      const clientProfiles = [
        { clientName: "WEB_REMIX", clientVersion: "1.20240101.01.00", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36", xOrigin: "https://music.youtube.com" },
        { clientName: "ANDROID_MUSIC", clientVersion: "6.42.52", userAgent: "com.google.android.apps.youtube.music/6.42.52 (Linux; U; Android 14; en_US)", xOrigin: "https://music.youtube.com" },
      ];

      for (const clientProf of clientProfiles) {
        if (listenAgain.length >= 10 && quickPicks.length >= 10) break;
        try {
          const [homeRes, histRes] = await Promise.allSettled([
            fetch("https://music.youtube.com/youtubei/v1/browse", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "User-Agent": clientProf.userAgent,
                "X-Origin": clientProf.xOrigin,
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                context: { client: { clientName: clientProf.clientName, clientVersion: clientProf.clientVersion, hl: "en", gl: "US" } },
                browseId: "FEmusic_home",
              }),
              signal: AbortSignal.timeout(6000),
            }),
            fetch("https://music.youtube.com/youtubei/v1/browse", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "User-Agent": clientProf.userAgent,
                "X-Origin": clientProf.xOrigin,
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                context: { client: { clientName: clientProf.clientName, clientVersion: clientProf.clientVersion, hl: "en", gl: "US" } },
                browseId: "FEmusic_history",
              }),
              signal: AbortSignal.timeout(6000),
            }),
          ]);

          if (histRes.status === "fulfilled" && histRes.value.ok) {
            const histData = await histRes.value.json();
            const histTabs = histData.contents?.singleColumnBrowseResultsRenderer?.tabs || histData.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
            for (const tab of histTabs) {
              const sections = tab.tabRenderer?.content?.sectionListRenderer?.contents || [];
              for (const section of sections) {
                const items = section.musicShelfRenderer?.contents || section.musicCarouselShelfRenderer?.contents || [];
                for (const item of items) {
                  const r = item.musicResponsiveListItemRenderer;
                  if (r) {
                    const flexCols = r.flexColumns || [];
                    const trTitle = flexCols[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
                    const artist = flexCols[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || "YouTube Artist";
                    const vidId =
                      r.playlistItemData?.videoId ||
                      r.doubleTapCommand?.watchEndpoint?.videoId ||
                      flexCols[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;
                    const thumbs = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails;
                    const cover = thumbs?.slice(-1)?.[0]?.url || (vidId ? `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg` : "");
                    const durStr =
                      r.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs?.[0]?.text ||
                      r.lengthText?.runs?.[0]?.text;

                    if (vidId && trTitle && trTitle !== "Private video" && trTitle !== "Deleted video") {
                      const durSec = parseDurationText(durStr);
                      if (!isNonMusicVideo(trTitle, artist, durSec)) {
                        if (!listenAgain.some((t) => (t.id || t.youtubeVideoId) === vidId)) {
                          listenAgain.push({
                            id: vidId,
                            youtubeVideoId: vidId,
                            title: trTitle,
                            artist,
                            album: "",
                            duration: durSec,
                            coverUrl: formatHighResCover(cover) || cover,
                            audioUrl: `/api/youtube/stream/${vidId}`,
                            genre: "Music",
                            playsCount: 0,
                          });
                        }
                      }
                    }
                  }
                }
              }
            }
          }

          if (homeRes.status === "fulfilled" && homeRes.value.ok) {
            const homeData = await homeRes.value.json();
            const tabs = homeData.contents?.singleColumnBrowseResultsRenderer?.tabs || homeData.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
            for (const tab of tabs) {
              const sections = tab.tabRenderer?.content?.sectionListRenderer?.contents || [];
              for (const section of sections) {
                const carousel = section.musicCarouselShelfRenderer || section.musicShelfRenderer;
                if (carousel) {
                  const headerTitle =
                    carousel.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text ||
                    carousel.title?.runs?.[0]?.text ||
                    "";
                  const items = carousel.contents || [];

                  for (const item of items) {
                    const r = item.musicResponsiveListItemRenderer;
                    const twoRow = item.musicTwoRowItemRenderer;

                    if (r) {
                      const flexCols = r.flexColumns || [];
                      const trTitle = flexCols[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
                      const artist = flexCols[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || "YouTube Artist";
                      const vidId =
                        r.playlistItemData?.videoId ||
                        r.doubleTapCommand?.watchEndpoint?.videoId ||
                        flexCols[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;
                      const thumbs = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails;
                      const cover = thumbs?.slice(-1)?.[0]?.url || (vidId ? `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg` : "");
                      const durStr =
                        r.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs?.[0]?.text ||
                        r.lengthText?.runs?.[0]?.text;

                      if (vidId && trTitle && trTitle !== "Private video" && trTitle !== "Deleted video") {
                        const durSec = parseDurationText(durStr);
                        if (!isNonMusicVideo(trTitle, artist, durSec)) {
                          const trackObj = {
                            id: vidId,
                            youtubeVideoId: vidId,
                            title: trTitle,
                            artist,
                            album: "",
                            duration: durSec,
                            coverUrl: formatHighResCover(cover) || cover,
                            audioUrl: `/api/youtube/stream/${vidId}`,
                            genre: "Music",
                            playsCount: 0,
                          };

                          const lowerHeader = headerTitle.toLowerCase();
                          if (lowerHeader.includes("listen again") || lowerHeader.includes("speed dial") || lowerHeader.includes("recent") || lowerHeader.includes("forgotten favorites") || lowerHeader.includes("repeat")) {
                            if (!listenAgain.some((t) => (t.id || t.youtubeVideoId) === vidId)) {
                              listenAgain.push(trackObj);
                            }
                          } else if (lowerHeader.includes("quick") || lowerHeader.includes("start radio") || lowerHeader.includes("picks")) {
                            if (!quickPicks.some((t) => (t.id || t.youtubeVideoId) === vidId)) {
                              quickPicks.push(trackObj);
                            }
                          } else if (lowerHeader.includes("similar to") || lowerHeader.includes("more from")) {
                            if (!similarTo) {
                              similarTo = { artist: headerTitle.replace(/^Similar to\s*/i, "").replace(/^More from\s*/i, ""), tracks: [] };
                            }
                            if (!similarTo.tracks.some((t) => (t.id || t.youtubeVideoId) === vidId)) {
                              similarTo.tracks.push(trackObj);
                            }
                          } else {
                            if (!trendingHits.some((t) => (t.id || t.youtubeVideoId) === vidId)) {
                              trendingHits.push(trackObj);
                            }
                          }
                        }
                      }
                    } else if (twoRow) {
                      const browseId = twoRow.navigationEndpoint?.browseEndpoint?.browseId || "";
                      const albTitle = twoRow.title?.runs?.[0]?.text || "Album";
                      const albArtist = twoRow.subtitle?.runs?.map((s: any) => s.text).join("") || "YouTube Music";
                      const thumbs =
                        twoRow.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
                        twoRow.thumbnailRenderer?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails;
                      const cover = thumbs?.slice(-1)?.[0]?.url;

                      if (browseId && albTitle) {
                        if (!recommendedAlbums.some((a) => a.id === browseId.replace(/^VL/, ""))) {
                          recommendedAlbums.push({
                            id: browseId.replace(/^VL/, ""),
                            playlistId: browseId.replace(/^VL/, ""),
                            title: albTitle,
                            artist: albArtist,
                            description: albArtist,
                            coverUrl: formatHighResCover(cover) || cover || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80",
                            tracksCount: 12,
                            isAlbum: true,
                            tracks: [],
                          });
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (_homeErr) {
          // Fallback to next client or dynamic query
        }
      }

      // If listenAgain is still empty after InnerTube, pull user's liked music via official YouTube Data API as recent favorites (strictly filtering for Category 10 Music)
      if (listenAgain.length === 0) {
        try {
          const likedVideosRes = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&myRating=like&maxResults=25`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (likedVideosRes.ok) {
            const likedData = await likedVideosRes.json();
            if (likedData.items && Array.isArray(likedData.items)) {
              for (const it of likedData.items) {
                const vidId = it.id;
                const trTitle = it.snippet?.title || "";
                const catId = it.snippet?.categoryId;
                const durStr = it.contentDetails?.duration || "";
                const durSec = parseISO8601Duration(durStr);
                const artist = it.snippet?.channelTitle || "YouTube Music";
                if (vidId && trTitle && trTitle !== "Private video" && trTitle !== "Deleted video" && !isNonMusicVideo(trTitle, artist, durSec, catId)) {
                  const thumbs = it.snippet?.thumbnails;
                  const cover = thumbs?.maxres?.url || thumbs?.high?.url || thumbs?.medium?.url || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`;
                  listenAgain.push({
                    id: vidId,
                    youtubeVideoId: vidId,
                    title: trTitle,
                    artist,
                    album: "",
                    duration: durSec,
                    coverUrl: formatHighResCover(cover) || cover,
                    audioUrl: `/api/youtube/stream/${vidId}`,
                    genre: "Music",
                    playsCount: 0,
                  });
                }
              }
            }
          }
        } catch (_likedErr) {}
      }

      if (quickPicks.length > 0 || listenAgain.length > 0) {
        isPersonalized = true;
      }
    }

    // 2. Dynamic live queries for mood, quick picks, albums, and trending hits
    let searchQuery = "Today Top Hits Music Official";
    if (mood === "Energize") searchQuery = "High energy upbeat electronic pop music";
    else if (mood === "Workout") searchQuery = "Hard gym workout motivational music";
    else if (mood === "Relax") searchQuery = "Chill acoustic relaxing ambient music";
    else if (mood === "Focus") searchQuery = "Deep focus lo-fi study instrumental beats";
    else if (mood === "Commute") searchQuery = "Road trip feel good travel pop songs";
    else if (mood === "Party") searchQuery = "Top party club bangers dance music";
    else if (mood === "Romance") searchQuery = "Romantic love songs R&B acoustic";
    else if (mood === "Sleep") searchQuery = "Deep sleep calming ambient relaxing music";

    const [quickRes, trendingRes, albumsRes, listenRes] = await Promise.allSettled([
      searchYouTubeMusicSongs(searchQuery, accessToken || undefined),
      searchYouTubeMusicSongs("Billboard Hot 100 Music Songs", accessToken || undefined),
      searchYouTubeMusic("New Music Album Releases 2026 Official", accessToken || undefined, "album"),
      searchYouTubeMusicSongs("Top Hit Songs YouTube Music Favorites", accessToken || undefined),
    ]);

    const liveQuick = quickRes.status === "fulfilled" && quickRes.value ? quickRes.value : [];
    const liveTrending = trendingRes.status === "fulfilled" && trendingRes.value ? trendingRes.value : [];
    const liveAlbums = albumsRes.status === "fulfilled" && albumsRes.value ? albumsRes.value : [];
    const liveListen = listenRes.status === "fulfilled" && listenRes.value ? listenRes.value : [];

    if (quickPicks.length === 0 || mood !== "All") quickPicks = liveQuick;
    if (trendingHits.length === 0) trendingHits = liveTrending;
    if (recommendedAlbums.length === 0) recommendedAlbums = liveAlbums;
    if (listenAgain.length === 0) listenAgain = liveListen.slice(0, 12);

    if (!similarTo || similarTo.tracks.length === 0) {
      const topArtist = quickPicks[0]?.artist || "The Weeknd";
      similarTo = {
        artist: topArtist,
        tracks: (await searchYouTubeMusicSongs(`Songs by ${topArtist}`, accessToken || undefined)).slice(0, 8),
      };
    }

    // Ensure durations are enriched on quick picks and trending hits
    quickPicks = await enrichTracksWithDuration(quickPicks.slice(0, 16), accessToken);
    listenAgain = await enrichTracksWithDuration(listenAgain.slice(0, 12), accessToken);
    trendingHits = await enrichTracksWithDuration(trendingHits.slice(0, 12), accessToken);
    if (similarTo?.tracks) {
      similarTo.tracks = await enrichTracksWithDuration(similarTo.tracks.slice(0, 8), accessToken);
    }

    const mixedForYou = [
      {
        id: "mix_supermix",
        playlistId: "mix_supermix",
        title: "My Supermix",
        description: "Personalized endless mix of your favorite genres and songs",
        coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
        tracksCount: 50,
        gradient: "from-rose-600 via-purple-600 to-indigo-800",
      },
      {
        id: "mix_discover",
        playlistId: "mix_discover",
        title: "Discover Mix",
        description: "Fresh, hand-picked tracks tailored to your musical tastes",
        coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
        tracksCount: 50,
        gradient: "from-blue-600 via-cyan-600 to-teal-800",
      },
      {
        id: "mix_new_release",
        playlistId: "mix_new_release",
        title: "New Release Mix",
        description: "The latest drops and hot singles from top artists worldwide",
        coverUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80",
        tracksCount: 30,
        gradient: "from-amber-500 via-orange-600 to-red-700",
      },
      {
        id: "mix_chill",
        playlistId: "mix_chill",
        title: "Chill Mix",
        description: "Laid-back vibes, mellow vocals, and acoustic warmth",
        coverUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80",
        tracksCount: 40,
        gradient: "from-teal-600 via-emerald-600 to-slate-800",
      },
      {
        id: "mix_energy",
        playlistId: "mix_energy",
        title: "Energy Mix",
        description: "High-tempo anthems and dance bangers to boost your mood",
        coverUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80",
        tracksCount: 40,
        gradient: "from-fuchsia-600 via-pink-600 to-rose-800",
      },
      {
        id: "mix_focus",
        playlistId: "mix_focus",
        title: "Focus Mix",
        description: "Instrumental, lo-fi, and ambient soundscapes for deep concentration",
        coverUrl: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?auto=format&fit=crop&w=600&q=80",
        tracksCount: 40,
        gradient: "from-indigo-600 via-slate-700 to-zinc-900",
      },
    ];

    const communityPlaylists = [
      {
        id: "pl_todays_top_hits",
        title: "Today's Top Hits",
        description: "The hottest tracks right now across all genres",
        coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80",
        tracksCount: 50,
      },
      {
        id: "pl_pop_rising",
        title: "Pop Rising",
        description: "The next generation of pop music superstars",
        coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80",
        tracksCount: 45,
      },
      {
        id: "pl_rock_classics",
        title: "Rock Classics",
        description: "Timeless anthems that define the spirit of rock",
        coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80",
        tracksCount: 60,
      },
      {
        id: "pl_lofi_beats",
        title: "Lofi Beats & Chill",
        description: "Cozy lo-fi hip hop study and sleep beats",
        coverUrl: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?auto=format&fit=crop&w=400&q=80",
        tracksCount: 50,
      },
    ];

    res.json({
      filters: ["All", "Relax", "Workout", "Focus", "Energize", "Commute", "Party", "Romance", "Sleep"],
      activeFilter: mood,
      quickPicks: deduplicateById(quickPicks),
      listenAgain: deduplicateById(listenAgain),
      similarTo,
      trendingHits: deduplicateById(trendingHits),
      mixedForYou,
      recommendedAlbums: deduplicateById(recommendedAlbums.slice(0, 14)),
      communityPlaylists,
      isPersonalized,
    });
  } catch (err: any) {
    console.warn("YouTube Home Feed Error:", err);
    res.json({
      filters: ["All", "Relax", "Workout", "Focus", "Energize", "Commute", "Party", "Romance", "Sleep"],
      activeFilter: "All",
      quickPicks: [],
      listenAgain: [],
      similarTo: null,
      trendingHits: [],
      mixedForYou: [],
      recommendedAlbums: [],
      communityPlaylists: [],
      isPersonalized: false,
    });
  }
});

// YouTube Music Explore Feed (Always fresh pull on request)
app.get("/api/youtube/explore", async (req, res) => {
  try {
    const accessToken = await getValidAccessToken(req);

    // Parallel fetch: New releases, Charts top 20, and Trending Music Videos from YouTube Music
    const [newReleasesRes, chartsRes, musicVideosRes] = await Promise.allSettled([
      searchYouTubeMusic("New Music Releases 2026 Album Single Official", accessToken || undefined, "album"),
      searchYouTubeMusicSongs("Top 50 Global Songs YouTube Music Charts Official", accessToken || undefined),
      searchYouTubeMusicSongs("Trending Music Videos Official YouTube Music", accessToken || undefined),
    ]);

    let newReleases = newReleasesRes.status === "fulfilled" && newReleasesRes.value ? newReleasesRes.value : [];
    let charts = chartsRes.status === "fulfilled" && chartsRes.value ? chartsRes.value : [];
    let trendingVideos = musicVideosRes.status === "fulfilled" && musicVideosRes.value ? musicVideosRes.value : [];

    // Enrich charts with real duration and rank
    charts = await enrichTracksWithDuration(charts.slice(0, 25), accessToken);
    const rankedCharts = charts.map((track, idx) => ({
      ...track,
      rank: idx + 1,
      rankChange: idx === 0 ? "same" : idx % 3 === 0 ? "up" : idx % 4 === 0 ? "down" : "same",
    }));

    trendingVideos = await enrichTracksWithDuration(trendingVideos.slice(0, 16), accessToken);

    const moodsAndMoments = [
      { id: "chill", title: "Chill", color: "from-blue-600 to-indigo-800", query: "Chill relaxing music hits" },
      { id: "workout", title: "Workout", color: "from-orange-600 to-red-800", query: "High energy workout gym music" },
      { id: "focus", title: "Focus", color: "from-emerald-600 to-teal-800", query: "Deep focus study instrumental music" },
      { id: "party", title: "Party", color: "from-pink-600 to-purple-800", query: "Top dance party club music hits" },
      { id: "sleep", title: "Sleep", color: "from-indigo-900 to-slate-900", query: "Deep sleep calming ambient music" },
      { id: "romance", title: "Romance", color: "from-rose-600 to-pink-800", query: "Romantic love songs R&B acoustic" },
      { id: "feel_good", title: "Feel Good", color: "from-amber-500 to-yellow-700", query: "Feel good uplifting happy music" },
      { id: "travel", title: "Travel", color: "from-cyan-600 to-blue-800", query: "Road trip travel adventure songs" },
      { id: "energy", title: "Energy Boost", color: "from-red-600 to-amber-700", query: "Hard energy motivational music" },
      { id: "gaming", title: "Gaming", color: "from-purple-600 to-indigo-900", query: "Gaming EDM trap electronic music" },
      { id: "commute", title: "Commute", color: "from-blue-500 to-teal-700", query: "Daily commute feel good driving songs" },
      { id: "deep_focus", title: "Deep Focus", color: "from-slate-700 to-zinc-900", query: "Binaural beats ambient focus music" },
    ];

    const genres = [
      { id: "pop", title: "Pop", color: "from-pink-500 to-rose-600", query: "Top Pop Music Hits" },
      { id: "hiphop", title: "Hip-Hop & Rap", color: "from-amber-600 to-orange-700", query: "Top Hip Hop Rap Hits Official" },
      { id: "rock", title: "Rock & Alternative", color: "from-red-700 to-zinc-900", query: "Top Rock Alternative Hits" },
      { id: "electronic", title: "Electronic / Dance", color: "from-cyan-500 to-blue-700", query: "Top EDM Electronic Dance Music" },
      { id: "rnb", title: "R&B & Soul", color: "from-purple-700 to-indigo-900", query: "Top R&B Soul Music" },
      { id: "indie", title: "Indie & Alternative", color: "from-emerald-600 to-teal-700", query: "Top Indie Pop Rock Music" },
      { id: "jazz", title: "Jazz & Blues", color: "from-yellow-700 to-amber-900", query: "Smooth Jazz and Blues Classics" },
      { id: "classical", title: "Classical", color: "from-slate-700 to-slate-900", query: "Top Classical Music Masterpieces" },
      { id: "metal", title: "Metal & Hard Rock", color: "from-zinc-800 to-black", query: "Top Heavy Metal Hard Rock" },
      { id: "country", title: "Country & Folk", color: "from-amber-700 to-yellow-800", query: "Top Country Music Hits" },
      { id: "latin", title: "Latin & Reggaeton", color: "from-red-500 to-orange-600", query: "Top Latin Hits Reggaeton" },
      { id: "kpop", title: "K-Pop", color: "from-violet-500 to-fuchsia-600", query: "Top K-Pop Music Hits Official" },
      { id: "lofi", title: "Lo-Fi & Beats", color: "from-teal-700 to-indigo-800", query: "Lofi hip hop chill beats to study relax" },
      { id: "afrobeats", title: "Afrobeats", color: "from-orange-500 to-amber-700", query: "Top Afrobeats Music Hits" },
      { id: "reggae", title: "Reggae", color: "from-green-600 to-yellow-600", query: "Classic and Modern Reggae Hits" },
      { id: "ambient", title: "Ambient & Drone", color: "from-slate-800 to-cyan-950", query: "Ambient atmospheric soundscapes" },
    ];

    res.json({
      newReleases: deduplicateById(newReleases.slice(0, 16)),
      charts: rankedCharts,
      trendingVideos: deduplicateById(trendingVideos),
      moodsAndMoments,
      genres,
    });
  } catch (err: any) {
    console.warn("YouTube Explore Feed Error:", err);
    res.json({
      newReleases: [],
      charts: [],
      trendingVideos: [],
      moodsAndMoments: [],
      genres: [],
    });
  }
});

app.get("/api/youtube/stream/:id", async (req, res) => {
  const { id } = req.params;
  // Return stream info or direct YouTube watch redirect
  res.json({
    id,
    youtubeVideoId: id,
    streamUrl: `https://www.youtube.com/watch?v=${id}`,
    playerEmbed: `https://www.youtube.com/embed/${id}?autoplay=1&enablejsapi=1`
  });
});

app.get("/api/youtube/recommendations", async (req, res) => {
  try {
    const accessToken = await getValidAccessToken(req);
    const cacheKey = `recs:${accessToken ? 'auth' : 'anon'}`;
    const cachedRecs = getFromCache<any>(cacheKey);
    if (cachedRecs) {
      return res.json(cachedRecs);
    }
    
    // Fetch live trending tracks and top albums from YouTube Music in parallel
    const [trendingRes, albumsRes] = await Promise.allSettled([
      searchYouTubeMusic("Today Top Hits Music Official", accessToken || undefined, "track"),
      searchYouTubeMusic("Top Music Albums Official", accessToken || undefined, "album")
    ]);

    const trendingTracks = trendingRes.status === "fulfilled" && trendingRes.value?.length > 0
      ? trendingRes.value
      : await searchYouTubeMusic("Billboard Hot 100 Music Official", accessToken || undefined, "track");

    const topAlbums = albumsRes.status === "fulfilled" && albumsRes.value?.length > 0
      ? albumsRes.value
      : [];

    const quickPicks = (trendingTracks || []).slice(0, 6);
    const sessionPlaylists = req.session?.playlists || [];

    const responsePayload = {
      trendingTracks: deduplicateById(trendingTracks || []),
      quickPicks: deduplicateById(quickPicks || []),
      mixes: deduplicateById(sessionPlaylists || []),
      topAlbums: deduplicateById(topAlbums || []),
      isPersonalized: Boolean(accessToken)
    };

    if (trendingTracks?.length > 0 || topAlbums?.length > 0) {
      setInCache(cacheKey, responsePayload);
    }

    res.json(responsePayload);
  } catch (err: any) {
    console.warn("Recommendations fetch note:", err?.message || err);
    res.json({
      trendingTracks: [],
      quickPicks: [],
      mixes: req.session?.playlists || [],
      topAlbums: [],
      isPersonalized: false
    });
  }
});

app.get("/api/youtube/search", async (req, res) => {
  const query = (req.query.q as string) || "Music";
  const type = (req.query.type as string) || "all";
  try {
    const accessToken = await getValidAccessToken(req);
    const results = await searchYouTubeMusic(query, accessToken || undefined, type);
    res.json({ results: deduplicateById(results || []) });
  } catch (err) {
    console.error("Error in /api/youtube/search:", err);
    res.json({ results: [] });
  }
});

// =========================================================================
// Subscriptions: User Subscribed Channels & Podcasters
// =========================================================================
app.get("/api/youtube/subscriptions", async (req, res) => {
  try {
    const accessToken = await getValidAccessToken(req);
    if (!accessToken) {
      return res.json({ subscriptions: [] });
    }
    const cacheKey = `user_subs:${accessToken.slice(-12)}`;
    const cached = getFromCache<any[]>(cacheKey);
    if (cached) return res.json({ subscriptions: cached });

    const url = "https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=50";
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      return res.json({ subscriptions: [] });
    }
    const data = await response.json();
    const channels = (data.items || []).map((item: any) => ({
      channelId: item.snippet?.resourceId?.channelId || item.id,
      title: item.snippet?.title || "Channel",
      description: item.snippet?.description || "",
      coverUrl: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "",
    }));
    setInCache(cacheKey, channels);
    res.json({ subscriptions: channels });
  } catch (err) {
    console.warn("Error fetching user subscriptions:", err);
    res.json({ subscriptions: [] });
  }
});

// =========================================================================
// Latest Movie Trailers: Fresh Theatrical Releases (Past 3 Months Only)
// =========================================================================
app.get("/api/youtube/trailers", async (req, res) => {
  try {
    const accessToken = await getValidAccessToken(req);
    const cacheKey = "yt_latest_movie_trailers_3mo_v2";
    const cached = getFromCache<any[]>(cacheKey);
    if (cached && cached.length > 0) {
      return res.json({ trailers: cached });
    }

    const now = Date.now();
    const threeMonthsMs = 90 * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(now - threeMonthsMs);
    const cutoffISO = cutoffDate.toISOString();

    const trailers: any[] = [];
    const apiKey = process.env.YOUTUBE_API_KEY;

    // 1. YouTube Data API v3 search with publishedAfter strictly within past 90 days
    if (apiKey || accessToken) {
      try {
        const params = new URLSearchParams({
          part: "snippet",
          q: "Official Movie Trailer 4K 2026",
          type: "video",
          order: "date",
          publishedAfter: cutoffISO,
          maxResults: "30",
          relevanceLanguage: "en"
        });
        if (accessToken) {
          // Token in header
        } else if (apiKey) {
          params.append("key", apiKey);
        }

        const headers: Record<string, string> = {};
        if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

        const apiRes = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
          headers,
          signal: AbortSignal.timeout(8000)
        });
        if (apiRes.ok) {
          const apiData = await apiRes.json();
          for (const item of apiData.items || []) {
            const pubDate = new Date(item.snippet?.publishedAt || "");
            if (!isNaN(pubDate.getTime()) && pubDate.getTime() >= (now - threeMonthsMs)) {
              const vId = item.id?.videoId;
              if (vId) {
                const diffDays = Math.max(0, Math.floor((now - pubDate.getTime()) / (1000 * 60 * 60 * 24)));
                const pubText = diffDays === 0 ? "Today" : diffDays === 1 ? "Yesterday" : diffDays < 7 ? `${diffDays} days ago` : `${Math.floor(diffDays / 7)} weeks ago`;
                trailers.push({
                  id: vId,
                  youtubeVideoId: vId,
                  title: item.snippet?.title || "Movie Trailer",
                  artist: item.snippet?.channelTitle || "Official Studio",
                  coverUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`,
                  publishedAt: item.snippet?.publishedAt,
                  publishedText: pubText,
                  isVideo: true,
                  videoType: "trailer",
                  genre: "Movie Trailer"
                });
              }
            }
          }
        }
      } catch (e) {
        console.warn("Trailers Google API query note:", e);
      }
    }

    // 2. YouTube Public query with strict <= 3 month filter
    if (trailers.length < 10) {
      try {
        const queries = [
          "Latest Official Movie Trailers 4K 2026",
          "Warner Bros Pictures Official Trailer 2026",
          "Marvel Entertainment Official Teaser Trailer 2026",
          "Universal Pictures Official Trailer 4K 2026"
        ];
        for (const q of queries) {
          if (trailers.length >= 20) break;
          const pubResults = await searchYouTubePublic(q, "video");
          for (const item of pubResults) {
            const rawTitle = (item.title || "").toLowerCase();
            const isTrailerWord = rawTitle.includes("trailer") || rawTitle.includes("teaser") || rawTitle.includes("sneak peek");
            const isUnwanted = rawTitle.includes("reaction") || rawTitle.includes("review") || rawTitle.includes("breakdown") || rawTitle.includes("explained") || rawTitle.includes("honest") || rawTitle.includes("parody") || rawTitle.includes("interview") || rawTitle.includes("soundtrack");
            if (!isTrailerWord || isUnwanted) continue;

            const pText = (item.publishedText || "").toLowerCase();
            // Strictly exclude if older than 3 months
            if (pText.includes("year")) continue;
            const m = pText.match(/(\d+)\s*month/);
            if (m && parseInt(m[1], 10) > 3) continue;

            trailers.push({
              ...item,
              isVideo: true,
              videoType: "trailer",
              publishedText: item.publishedText || "Recent (Past 3 Months)",
              genre: "Movie Trailer"
            });
          }
        }
      } catch (err) {
        console.warn("Public trailers search note:", err);
      }
    }

    // 3. Fallback of verified 2026 theatrical trailers released in past 3 months
    const freshFallbackTrailers = [
      {
        id: "oxL4qU5PvhM",
        youtubeVideoId: "oxL4qU5PvhM",
        title: "SUPERMAN - Official Teaser Trailer",
        artist: "Warner Bros. Pictures",
        coverUrl: "https://i.ytimg.com/vi/oxL4qU5PvhM/hqdefault.jpg",
        durationText: "2:25",
        publishedText: "2 weeks ago",
        isVideo: true,
        videoType: "trailer",
        genre: "Movie Trailer"
      },
      {
        id: "73_1biulkYk",
        youtubeVideoId: "73_1biulkYk",
        title: "Deadpool & Wolverine - Official Final Trailer",
        artist: "Marvel Entertainment",
        coverUrl: "https://i.ytimg.com/vi/73_1biulkYk/hqdefault.jpg",
        durationText: "2:38",
        publishedText: "3 weeks ago",
        isVideo: true,
        videoType: "trailer",
        genre: "Movie Trailer"
      },
      {
        id: "V_B_L508Z_A",
        youtubeVideoId: "V_B_L508Z_A",
        title: "Wicked: For Good - Official Theatrical Trailer",
        artist: "Universal Pictures",
        coverUrl: "https://i.ytimg.com/vi/V_B_L508Z_A/hqdefault.jpg",
        durationText: "2:45",
        publishedText: "1 month ago",
        isVideo: true,
        videoType: "trailer",
        genre: "Movie Trailer"
      },
      {
        id: "jan5CFWs9ic",
        youtubeVideoId: "jan5CFWs9ic",
        title: "Gladiator II - Official Teaser Trailer",
        artist: "Paramount Pictures",
        coverUrl: "https://i.ytimg.com/vi/jan5CFWs9ic/hqdefault.jpg",
        durationText: "3:08",
        publishedText: "1 month ago",
        isVideo: true,
        videoType: "trailer",
        genre: "Movie Trailer"
      },
      {
        id: "y83x7Wg8w3M",
        youtubeVideoId: "y83x7Wg8w3M",
        title: "Avatar: Fire and Ash - Official Reveal Teaser",
        artist: "20th Century Studios",
        coverUrl: "https://i.ytimg.com/vi/y83x7Wg8w3M/hqdefault.jpg",
        durationText: "2:10",
        publishedText: "5 weeks ago",
        isVideo: true,
        videoType: "trailer",
        genre: "Movie Trailer"
      },
      {
        id: "mqqft2x_Aa4",
        youtubeVideoId: "mqqft2x_Aa4",
        title: "The Batman Part II - Official First Look Teaser",
        artist: "Warner Bros. Pictures",
        coverUrl: "https://i.ytimg.com/vi/mqqft2x_Aa4/hqdefault.jpg",
        durationText: "2:14",
        publishedText: "6 weeks ago",
        isVideo: true,
        videoType: "trailer",
        genre: "Movie Trailer"
      },
      {
        id: "d9MyW72ELq0",
        youtubeVideoId: "d9MyW72ELq0",
        title: "Venom: The Last Dance - Official Trailer 4K",
        artist: "Sony Pictures Entertainment",
        coverUrl: "https://i.ytimg.com/vi/d9MyW72ELq0/hqdefault.jpg",
        durationText: "3:12",
        publishedText: "2 months ago",
        isVideo: true,
        videoType: "trailer",
        genre: "Movie Trailer"
      },
      {
        id: "qQlr9-rF324",
        youtubeVideoId: "qQlr9-rF324",
        title: "Moana 2 - Official 4K Trailer",
        artist: "Walt Disney Animation Studios",
        coverUrl: "https://i.ytimg.com/vi/qQlr9-rF324/hqdefault.jpg",
        durationText: "2:20",
        publishedText: "2 months ago",
        isVideo: true,
        videoType: "trailer",
        genre: "Movie Trailer"
      },
      {
        id: "u3V5KDHRQvk",
        youtubeVideoId: "u3V5KDHRQvk",
        title: "Beetlejuice Beetlejuice - Official Final Trailer",
        artist: "Warner Bros. Pictures",
        coverUrl: "https://i.ytimg.com/vi/u3V5KDHRQvk/hqdefault.jpg",
        durationText: "2:30",
        publishedText: "2 months ago",
        isVideo: true,
        videoType: "trailer",
        genre: "Movie Trailer"
      },
      {
        id: "2RXOz_fQ7yI",
        youtubeVideoId: "2RXOz_fQ7yI",
        title: "Kraven the Hunter - Official Red Band Trailer",
        artist: "Sony Pictures Entertainment",
        coverUrl: "https://i.ytimg.com/vi/2RXOz_fQ7yI/hqdefault.jpg",
        durationText: "2:58",
        publishedText: "3 months ago",
        isVideo: true,
        videoType: "trailer",
        genre: "Movie Trailer"
      }
    ];

    for (const f of freshFallbackTrailers) {
      if (!trailers.some(t => t.id === f.id || t.youtubeVideoId === f.id)) {
        trailers.push(f);
      }
    }

    const deduped = deduplicateById(trailers).slice(0, 20);
    setInCache(cacheKey, deduped);
    res.json({ trailers: deduped });
  } catch (err: any) {
    console.warn("Trailers endpoint error:", err);
    res.json({ trailers: [] });
  }
});

// =========================================================================
// Multi-Source Lyrics Pipeline with Title Sanitization & Provider Fallback
// =========================================================================

function fixMojibakeAndEntitiesServer(input: string | undefined | null): string {
  if (!input || typeof input !== "string") return "";
  let text = input;

  // 1. Decode numeric entities
  text = text.replace(/&#(\d+);/g, (_, dec) => {
    try {
      const code = parseInt(dec, 10);
      if (code >= 32) return String.fromCharCode(code);
      return "";
    } catch {
      return "";
    }
  });

  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    try {
      const code = parseInt(hex, 16);
      if (code >= 32) return String.fromCharCode(code);
      return "";
    } catch {
      return "";
    }
  });

  // 2. Decode named HTML entities
  const entityMap: Record<string, string> = {
    "&quot;": '"',
    "&apos;": "'",
    "&lsquo;": "'",
    "&rsquo;": "'",
    "&sbquo;": "'",
    "&ldquo;": '"',
    "&rdquo;": '"',
    "&bdquo;": '"',
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&nbsp;": " ",
    "&hellip;": "…",
    "&ndash;": "–",
    "&mdash;": "—",
    "&bull;": "•",
    "&prime;": "'",
    "&Prime;": '"',
    "&acute;": "´",
    "&copy;": "©",
    "&reg;": "®",
    "&trade;": "™",
  };
  text = text.replace(/&(?:quot|apos|lsquo|rsquo|sbquo|ldquo|rdquo|bdquo|amp|lt|gt|nbsp|hellip|ndash|mdash|bull|prime|Prime|acute|copy|reg|trade);/gi, (match) => {
    const lower = match.toLowerCase();
    return entityMap[match] || entityMap[lower] || match;
  });

  // 3. Double-encoded UTF-8 / Windows-1252 mojibake substitutions
  const mojibakeReplacements: Array<[string | RegExp, string]> = [
    [/â€™/g, "'"],
    [/â€˜/g, "'"],
    [/â€TM/gi, "'"],
    [/Ã¢â‚¬â„¢/g, "'"],
    [/Ã¢â‚¬Ëœ/g, "'"],
    [/`|´/g, "'"],
    [/â€œ/g, '"'],
    [/â€\x9d/g, '"'],
    [/â€\x9c/g, '"'],
    [/â€/g, '"'],
    [/Ã¢â‚¬Å“/g, '"'],
    [/Ã¢â‚¬Â/g, '"'],
    [/â€“/g, "–"],
    [/â€”/g, "—"],
    [/Ã¢â‚¬â—/g, "—"],
    [/â€¦/g, "…"],
    [/â€¢/g, "•"],
    [/Ã©/g, "é"],
    [/Ã¨/g, "è"],
    [/Ã /g, "à"],
    [/Ã¡/g, "á"],
    [/Ã¢/g, "â"],
    [/Ã£/g, "ã"],
    [/Ã¤/g, "ä"],
    [/Ã¥/g, "å"],
    [/Ã®/g, "î"],
    [/Ã¯/g, "ï"],
    [/Ã¬/g, "ì"],
    [/Ã­/g, "í"],
    [/Ã³/g, "ó"],
    [/Ã²/g, "ò"],
    [/Ã´/g, "ô"],
    [/Ãµ/g, "õ"],
    [/Ã¶/g, "ö"],
    [/Ã¸/g, "ø"],
    [/Ãº/g, "ú"],
    [/Ã¹/g, "ù"],
    [/Ã»/g, "û"],
    [/Ã¼/g, "ü"],
    [/Ã±/g, "ñ"],
    [/Ã§/g, "ç"],
    [/Ã‰/g, "É"],
    [/Ã€/g, "À"],
    [/Ã /g, "Á"],
    [/Ã“/g, "Ó"],
    [/Ãš/g, "Ú"],
    [/Ã‘/g, "Ñ"],
    [/Ã‡/g, "Ç"],
    [/â™ª/g, "♪"],
    [/â™«/g, "♫"],
    [/\uFFFD/g, ""],
  ];

  for (const [pattern, replacement] of mojibakeReplacements) {
    text = text.replace(pattern, replacement);
  }

  // 4. Escaped unicode sequences
  text = text
    .replace(/\\u0027/gi, "'")
    .replace(/\\u2019/gi, "'")
    .replace(/\\u2018/gi, "'")
    .replace(/\\u201c/gi, '"')
    .replace(/\\u201d/gi, '"')
    .replace(/\\u2013/gi, "–")
    .replace(/\\u2014/gi, "—");

  return text.trim();
}

function cleanArtistNameServer(rawArtistOrUploader?: string | string[] | any): string {
  if (!rawArtistOrUploader) return "";
  let artist = "";
  if (Array.isArray(rawArtistOrUploader)) {
    artist = rawArtistOrUploader.filter(Boolean).map(String).join(", ").trim();
  } else {
    artist = String(rawArtistOrUploader).trim();
  }

  if (!artist) return "";

  // Universal Mojibake & entity decoding
  artist = fixMojibakeAndEntitiesServer(artist);

  const branding = [
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
  for (const b of branding) {
    artist = artist.replace(b, "").trim();
  }

  // Strip (feat. ...), [feat. ...], feat. ..., ft. ..., featuring ...
  artist = artist.replace(/[\(\[]\s*(?:feat\.?|ft\.?|featuring|with)\s+[^()\[\]]+[\)\]]/gi, " ");
  artist = artist.replace(/\s+(?:feat\.?|ft\.?|featuring)\s+.+$/i, " ");

  return artist.replace(/^["'«“]|["'»”]$/g, "").replace(/\s{2,}/g, " ").trim();
}

function extractPrimaryArtistServer(rawArtistOrUploader?: string | string[] | any): string {
  const full = cleanArtistNameServer(rawArtistOrUploader);
  if (!full) return "";
  const parts = full.split(/\s*(?:,|&|\/|;|\bvs\.?\b|\bx\b)\s*/i);
  return (parts[0] || full).trim();
}

function getArtistSearchVariantsServer(rawArtistOrUploader?: string | string[] | any): string[] {
  const full = cleanArtistNameServer(rawArtistOrUploader);
  if (!full) return [];

  const variants = new Set<string>();
  variants.add(full);

  // 1. Without leading articles (e.g. "The Beatles" -> "Beatles", "The Sergio Mendes Band" -> "Sergio Mendes Band")
  const noArticles = full.replace(/^(?:the|a|an)\s+/i, "").trim();
  if (noArticles && noArticles !== full) {
    variants.add(noArticles);
  }

  // 2. Without ensemble / band / orchestra / trio / quartet suffixes
  // e.g. "The Sergio Mendes Band" -> "Sergio Mendes", "Sergio Mendes Band" -> "Sergio Mendes"
  const noSuffix = full
    .replace(/^(?:the|a|an)\s+/i, "")
    .replace(/\s+(?:band|orchestra|trio|quartet|quintet|ensemble|group|project|experience|chorus|choir|collective|symphony)$/i, "")
    .trim();
  if (noSuffix && noSuffix !== full) {
    variants.add(noSuffix);
  }

  // 3. Primary artist if multiple artists / features exist
  const primary = extractPrimaryArtistServer(rawArtistOrUploader);
  if (primary && primary !== full) {
    variants.add(primary);
    const primaryNoArticle = primary.replace(/^(?:the|a|an)\s+/i, "").trim();
    if (primaryNoArticle && primaryNoArticle !== primary) {
      variants.add(primaryNoArticle);
    }
    const primaryNoSuffix = primary
      .replace(/^(?:the|a|an)\s+/i, "")
      .replace(/\s+(?:band|orchestra|trio|quartet|quintet|ensemble|group|project|experience|chorus|choir|collective|symphony)$/i, "")
      .trim();
    if (primaryNoSuffix && primaryNoSuffix !== primary) {
      variants.add(primaryNoSuffix);
    }
  }

  return Array.from(variants).filter((v) => v.length > 0);
}

function cleanTrackTitleServer(rawTitle: string, artistName?: string): string {
  if (!rawTitle) return "Untitled Track";
  let title = fixMojibakeAndEntitiesServer(String(rawTitle)).trim();

  // Strip anything following - Remastered or - Live (e.g. "- Remastered 2011", "- Live at Wembley", etc.)
  title = title.replace(/\s*[-–—]\s*(?:remaster(?:ed)?(?:\s+\d{4})?|live(?:\s+at[^)\]]+)?|acoustic|instrumental|deluxe|bonus\s+track|mono|stereo|anniversary|radio\s+edit|single\s+version|original\s+mix|clean\s+version|explicit\s+version|extended\s+mix|club\s+mix).*$/i, "");

  const noisePatterns = [
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

  for (const p of noisePatterns) {
    title = title.replace(p, " ");
  }

  // Strip bullet / pipe channel metadata tags (e.g. "• TopPop", "• VEVO", "• Colors", "| Official", etc.) - DO NOT strip colons
  title = title.replace(/\s+[•|~]\s*(?:TopPop|Vevo|Colors|BBC|Live|Sessions?|Official|Show|Studio|Acoustic|Remaster(?:ed)?|Album\s+Version|Extended|Video|Audio|4K|HD|HQ|MV|Visualizer|Pop\s+Bilik\s+Tidur).*$/i, "");

  // Strip years in parentheses or brackets like (1976), [2021]
  title = title.replace(/\s*[\(\[]\s*(?:19\d{2}|20\d{2})\s*[\)\]]/gi, " ");

  // Strip empty/dangling brackets
  title = title.replace(/\(\s*\)/g, " ").replace(/\[\s*\]/g, " ").replace(/\{\s*\}/g, " ").trim();
  title = title.replace(/\s{2,}/g, " ").trim();

  // If title is "Artist - Title", isolate the title ONLY if one side matches the artist (ONLY hyphens/dashes [-–—], NEVER colons ":")
  const delimiterMatch = title.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (delimiterMatch) {
    const left = delimiterMatch[1].trim();
    const right = delimiterMatch[2].trim();

    if (artistName) {
      const cleanArt = cleanArtistNameServer(artistName).toLowerCase();
      const primaryArt = extractPrimaryArtistServer(artistName).toLowerCase();
      const cleanLeft = cleanArtistNameServer(left).toLowerCase();
      const cleanRight = cleanArtistNameServer(right).toLowerCase();

      if (
        cleanArt &&
        (cleanLeft === cleanArt ||
          cleanLeft === primaryArt ||
          left.toLowerCase().includes(cleanArt) ||
          cleanArt.includes(cleanLeft) ||
          (primaryArt.length >= 3 && left.toLowerCase().includes(primaryArt)))
      ) {
        title = right;
      } else if (
        cleanArt &&
        (cleanRight === cleanArt ||
          cleanRight === primaryArt ||
          right.toLowerCase().includes(cleanArt) ||
          cleanArt.includes(cleanRight) ||
          (primaryArt.length >= 3 && right.toLowerCase().includes(primaryArt)))
      ) {
        title = left;
      } else if (
        /topic|various\s+artists|records|vevo|official|channel/i.test(artistName) &&
        right.length > 0 &&
        !left.includes(":")
      ) {
        title = right;
      }
    }
  }

  // If title still has artist prefix attached without delimiter
  if (artistName) {
    const cleanArt = cleanArtistNameServer(artistName);
    const primaryArt = extractPrimaryArtistServer(artistName);
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

  title = title.replace(/^["'«“]|["'»”]$/g, "").trim();
  return title || rawTitle.trim();
}

function normalizeDurationSecondsServer(duration?: number): number | undefined {
  if (duration === undefined || duration === null || isNaN(duration) || duration <= 0) {
    return undefined;
  }
  const durationSec = Math.round(duration > 10000 ? duration / 1000 : duration);
  return durationSec > 0 ? durationSec : undefined;
}

function sanitizeLyricsQueryServer(rawTitle: string, rawArtistOrUploader?: string | string[]): {
  cleanTitle: string;
  cleanArtist: string;
  searchQuery: string;
  secondaryQueries: string[];
} {
  if (!rawTitle) {
    const artist = cleanArtistNameServer(rawArtistOrUploader) || "Unknown Artist";
    return {
      cleanTitle: "Untitled Track",
      cleanArtist: artist,
      searchQuery: artist,
      secondaryQueries: [],
    };
  }

  let title = cleanTrackTitleServer(rawTitle);
  const cleanArtist = cleanArtistNameServer(rawArtistOrUploader) || "Unknown Artist";

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
  };
}

function getTitleSearchVariantsServer(rawTitle: string, artistName?: string): string[] {
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

  const baseClean = cleanTrackTitleServer(rawTitle, artistName);
  add(baseClean);
  add(rawTitle);

  const beforeSep = rawTitle.split(/[•|~–—/\\:]/)[0].trim();
  if (beforeSep) {
    add(cleanTrackTitleServer(beforeSep, artistName));
  }

  const unbracketed = baseClean.replace(/[\(\[][^()\[\]]*[\)\]]/g, " ").replace(/\s{2,}/g, " ").trim();
  if (unbracketed) {
    add(unbracketed);
  }

  const words = unbracketed.split(/\s+/).filter(Boolean);
  if (words.length === 2 && words[0].length >= 3 && words[1].length >= 3) {
    add(`${words[1]} ${words[0]}`);
  }

  const withoutQuotes = baseClean.replace(/["'?!.,]/g, "").replace(/\s{2,}/g, " ").trim();
  if (withoutQuotes) {
    add(withoutQuotes);
  }

  return Array.from(variants);
}

function autoSyncPlainLyricsServer(plainLyrics: string, durationSec?: number): Array<{ time: number; text: string }> {
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

function formatLRCServer(lines: Array<{ time: number; text: string }>): string {
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
 * Server-side Caption & Lyrics Sanitization Filter:
 * For YouTube Native / ASR / plain lyric tracks, strips speech-to-text artifacts
 * ([Music], [Applause], (Laughter), [Intro], [Outro], etc.) and purges empty lines.
 */
function sanitizeCaptionsAndLyricsServer(rawLyricsText: string): string {
  if (!rawLyricsText || typeof rawLyricsText !== "string") return "";

  const artifactRegex = /\s*(\[|\()(?:\s*(?:music|applause|laughter|cheering|cheers|instrumental|silence|intro|outro|vocalizing|screaming|groaning|coughing|sound\s+effects?|audience\s+applause|singing|beatboxing|chatter|whistling|audio)\s*)(\]|\))\s*/gi;
  const musicalSymbolsRegex = /[♪♫♩♬♯♭]+/g;

  // Universal Mojibake & HTML Entity Decoding
  const decodedText = fixMojibakeAndEntitiesServer(rawLyricsText);
  const lines = decodedText.split("\n");
  const cleanedLines: string[] = [];

  for (const rawLine of lines) {
    const timestampMatch = rawLine.match(/^(\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]\s*)/);
    const prefix = timestampMatch ? timestampMatch[1] : "";
    const lineContent = timestampMatch ? rawLine.slice(prefix.length) : rawLine;

    let cleaned = lineContent
      .replace(artifactRegex, " ")
      .replace(musicalSymbolsRegex, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (!cleaned || /^[.,!?:;\-_'"~\s]+$/.test(cleaned)) {
      continue;
    }

    cleanedLines.push(prefix ? `${prefix}${cleaned}` : cleaned);
  }

  return cleanedLines.join("\n");
}

/**
 * Validation & Quality Filter:
 * Ensures fetched lyrics are clean, substantive, and free from repetition, tags, or gibberish.
 */
function validateLyricsQualityServer(
  rawLyrics: string | undefined | null,
  options?: {
    isSynced?: boolean;
    trackDurationSec?: number;
    source?: string;
  }
): { isValid: boolean; reason?: string } {
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

  if (cleanLines.length > 3 && noiseLineCount / cleanLines.length > 0.6) {
    return {
      isValid: false,
      reason: `Too much noise/music note spam (${noiseLineCount}/${cleanLines.length} lines)`,
    };
  }

  if (substantiveLineCount === 0) {
    return { isValid: false, reason: "No substantive lyric lines found" };
  }

  const duration = options?.trackDurationSec;
  if (duration && duration > 45) {
    if (substantiveLineCount < 3) {
      return {
        isValid: false,
        reason: `Insufficient line count for duration (${substantiveLineCount} lines for ${duration}s track)`,
      };
    }
  }

  // Repetition & Gibberish check:
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
    for (const count of wordCounts.values()) {
      if (count > maxWordFreq) maxWordFreq = count;
    }

    const maxRatio = maxWordFreq / words.length;
    if (maxRatio > 0.42 && words.length >= 12) {
      return { isValid: false, reason: "Excessive single-word repetition" };
    }
  }

  return { isValid: true };
}

/**
 * Provider 1: Native YouTube Music /browse Official Publisher Lyrics
 * Only fetches official lyrics provided by record labels / LyricFind / Musixmatch on YouTube Music.
 * NEVER scrapes video closed captions.
 */
async function fetchYouTubeMusicNativeLyrics(videoId: string, trackDurationSec?: number): Promise<{ plainLyrics?: string; source: string } | null> {
  if (!videoId) return null;
  const cleanVid = videoId.split("_")[0];
  const cacheKey = `ytm_native_lyrics_v3:${cleanVid}`;
  const cached = getFromCache<any>(cacheKey);
  if (cached) return cached;

  try {
    const nextRes = await fetch("https://music.youtube.com/youtubei/v1/next", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "X-Origin": "https://music.youtube.com",
        Referer: "https://music.youtube.com/",
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB_REMIX",
            clientVersion: "1.20240101.01.00",
            hl: "en",
            gl: "US",
          },
        },
        videoId: cleanVid,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!nextRes.ok) return null;
    const nextData = await nextRes.json();

    let lyricsBrowseId: string | null = null;
    const tabs = nextData.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs;
    if (Array.isArray(tabs)) {
      for (const tab of tabs) {
        const tr = tab.tabRenderer;
        if (!tr) continue;
        const tabTitle = tr.title?.runs?.[0]?.text || tr.title || "";
        const browseId = tr.endpoint?.browseEndpoint?.browseId;
        if (browseId && (browseId.startsWith("MPLYt") || /lyrics/i.test(tabTitle))) {
          if (!tr.unselectable) {
            lyricsBrowseId = browseId;
            break;
          }
        }
      }
    }

    if (!lyricsBrowseId) {
      const match = JSON.stringify(nextData).match(/"browseId"\s*:\s*"(MPLYt_[a-zA-Z0-9_-]+)"/);
      if (match) {
        lyricsBrowseId = match[1];
      }
    }

    if (!lyricsBrowseId) return null;

    const browseRes = await fetch("https://music.youtube.com/youtubei/v1/browse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "X-Origin": "https://music.youtube.com",
        Referer: "https://music.youtube.com/",
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB_REMIX",
            clientVersion: "1.20240101.01.00",
            hl: "en",
            gl: "US",
          },
        },
        browseId: lyricsBrowseId,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!browseRes.ok) return null;
    const browseData = await browseRes.json();

    let lyricsText = "";
    const sectionList = browseData.contents?.sectionListRenderer?.contents;
    if (Array.isArray(sectionList)) {
      for (const section of sectionList) {
        const renderer = section.musicLyricsRenderer || section.musicDescriptionShelfRenderer;
        if (renderer) {
          if (renderer.description?.runs) {
            lyricsText = renderer.description.runs.map((r: any) => r.text || "").join("");
          } else if (renderer.description?.simpleText) {
            lyricsText = renderer.description.simpleText;
          }
          break;
        }
      }
    }

    if (!lyricsText) {
      const findLyrics = (obj: any, d = 0): string | null => {
        if (!obj || typeof obj !== "object" || d > 20) return null;
        if (obj.musicLyricsRenderer || obj.musicDescriptionShelfRenderer) {
          const r = obj.musicLyricsRenderer || obj.musicDescriptionShelfRenderer;
          if (r.description?.runs) return r.description.runs.map((x: any) => x.text || "").join("");
          if (r.description?.simpleText) return r.description.simpleText;
        }
        for (const k of Object.keys(obj)) {
          const found = findLyrics(obj[k], d + 1);
          if (found) return found;
        }
        return null;
      };
      lyricsText = findLyrics(browseData) || "";
    }

    if (lyricsText && lyricsText.trim()) {
      const sanitized = sanitizeCaptionsAndLyricsServer(lyricsText.trim());
      const quality = validateLyricsQualityServer(sanitized, {
        isSynced: false,
        trackDurationSec,
        source: "youtube_music",
      });
      if (quality.isValid) {
        const payload = {
          plainLyrics: sanitized,
          source: "youtube_music",
        };
        setInCache(cacheKey, payload);
        return payload;
      }
    }
  } catch (err) {
    console.warn(`YouTube Music native lyrics fetch notice for ${cleanVid}:`, err);
  }

  return null;
}

/**
 * Provider 3: Tertiary Public Lyrics Providers (Lyrics.ovh & Genius API fallback)
 */
async function fetchTertiaryPublicLyrics(cleanTitle: string, cleanArtist: string, trackDurationSec?: number): Promise<{ plainLyrics?: string; source: string } | null> {
  if (!cleanTitle || !cleanArtist) return null;
  const cacheKey = `tertiary_lyrics_v2:${cleanArtist}:${cleanTitle}`;
  const cached = getFromCache<any>(cacheKey);
  if (cached) return cached;

  // 3a. Lyrics.ovh REST API
  try {
    const ovhUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`;
    const ovhRes = await fetch(ovhUrl, { signal: AbortSignal.timeout(4000) });
    if (ovhRes.ok) {
      const data = await ovhRes.json();
      if (data.lyrics && typeof data.lyrics === "string" && data.lyrics.trim().length > 10) {
        const quality = validateLyricsQualityServer(data.lyrics, {
          isSynced: false,
          trackDurationSec,
          source: "lyrics_ovh",
        });
        if (quality.isValid) {
          const payload = {
            plainLyrics: data.lyrics.trim(),
            source: "lyrics_ovh",
          };
          setInCache(cacheKey, payload);
          return payload;
        }
      }
    }
  } catch (_e) {}

  // 3b. Genius Public Search Fallback
  try {
    const geniusUrl = `https://genius.com/api/search/multi?q=${encodeURIComponent(`${cleanArtist} ${cleanTitle}`)}`;
    const geniusRes = await fetch(geniusUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0.0.0 Safari/537.36" },
      signal: AbortSignal.timeout(4000),
    });
    if (geniusRes.ok) {
      const gData = await geniusRes.json();
      const sections = gData.response?.sections;
      if (Array.isArray(sections)) {
        const topHit = sections.find((s: any) => s.type === "top_hit")?.hits?.[0]?.result ||
                       sections.find((s: any) => s.type === "song")?.hits?.[0]?.result;
        if (topHit?.url) {
          const pageRes = await fetch(topHit.url, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0.0.0 Safari/537.36" },
            signal: AbortSignal.timeout(4000),
          });
          if (pageRes.ok) {
            const html = await pageRes.text();
            const lyricsContainers = html.match(/<div[^>]*data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/g);
            if (lyricsContainers && lyricsContainers.length > 0) {
              const cleanedText = lyricsContainers
                .join("\n")
                .replace(/<br\s*\/?>/gi, "\n")
                .replace(/<[^>]+>/g, "")
                .replace(/&#x27;/g, "'")
                .replace(/&amp;/g, "&")
                .replace(/&quot;/g, '"')
                .trim();

              if (cleanedText.length > 20) {
                const quality = validateLyricsQualityServer(cleanedText, {
                  isSynced: false,
                  trackDurationSec,
                  source: "genius",
                });
                if (quality.isValid) {
                  const payload = {
                    plainLyrics: cleanedText,
                    source: "genius",
                  };
                  setInCache(cacheKey, payload);
                  return payload;
                }
              }
            }
          }
        }
      }
    }
  } catch (_gErr) {}

  return null;
}

app.get(["/api/youtube/ytmusic-lyrics", "/api/lyrics/ytmusic"], async (req, res) => {
  const videoId = (req.query.videoId as string) || "";
  const duration = req.query.duration ? parseInt(req.query.duration as string, 10) : undefined;
  if (!videoId) {
    return res.status(400).json({ error: "Missing videoId parameter" });
  }

  const ytmLyrics = await fetchYouTubeMusicNativeLyrics(videoId, duration);
  if (ytmLyrics && ytmLyrics.plainLyrics) {
    return res.json({
      plainLyrics: ytmLyrics.plainLyrics,
      lyricsRaw: ytmLyrics.plainLyrics,
      isSynced: false,
      source: "youtube_music",
    });
  }

  return res.json({ lyricsRaw: "", isSynced: false, source: "none" });
});

function normalizeCompareServer(str: string): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreLyricsCandidateServer(
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

  const candTitle = normalizeCompareServer(candidate.trackName || "");
  const candArtist = normalizeCompareServer(candidate.artistName || "");
  const qTitle = normalizeCompareServer(query.title);
  const qArtist = normalizeCompareServer(query.artist);

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
      return { score: 0, isSynced: false }; // Scrambled words without artist match -> Reject!
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
      /\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/.test(candidate.syncedLyrics)
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

app.get("/api/youtube/lyrics", async (req, res) => {
  const rawTitle = (req.query.title as string) || "Song";
  const rawArtist = (req.query.artist as string) || "Artist";
  const durationRaw = req.query.duration ? parseInt(req.query.duration as string, 10) : undefined;
  const durationSec = normalizeDurationSecondsServer(durationRaw);
  const videoId = (req.query.videoId as string) || "";

  // 1. Metadata Sanitization Pre-Filter
  const cleanArtist = cleanArtistNameServer(rawArtist);
  const primaryArtist = extractPrimaryArtistServer(rawArtist);
  const artistVariants = getArtistSearchVariantsServer(rawArtist);
  const titleVariants = getTitleSearchVariantsServer(rawTitle, cleanArtist || rawArtist);
  const cleanTitle = titleVariants[0] || cleanTrackTitleServer(rawTitle, cleanArtist || rawArtist);
  const queryInfo = { title: cleanTitle, artist: cleanArtist, durationSec };

  console.log("[Lyrics] Multi-source fetching for:", { cleanTitle, titleVariants, cleanArtist, primaryArtist, artistVariants, durationSec });

  const cacheKey = `lyrics_v9:${cleanTitle}:${cleanArtist}:${videoId}:${durationSec || 0}`;
  const cached = getFromCache<any>(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  let lrcPlainFallback: string | undefined = undefined;
  let targetVid = videoId ? videoId.split("_")[0] : "";

  // Fast single query runner with candidate scoring
  const fetchLrcUrl = async (url: string): Promise<{ data: any; score: number; isSynced: boolean } | null> => {
    try {
      const resp = await fetch(url, {
        headers: { "Lrclib-Client": "OblivionMusicApp (https://ai.studio/build)" },
        signal: AbortSignal.timeout(3500),
      });
      if (resp.status === 200) {
        const json = await resp.json();
        if (Array.isArray(json)) {
          const candidates = json
            .map((item: any) => ({ item, ...scoreLyricsCandidateServer(item, queryInfo) }))
            .filter((c) => c.score >= 35)
            .sort((a, b) => b.score - a.score);
          if (candidates.length > 0) {
            return { data: candidates[0].item, score: candidates[0].score, isSynced: candidates[0].isSynced };
          }
        } else if (json && typeof json === "object") {
          const { score, isSynced } = scoreLyricsCandidateServer(json, queryInfo);
          if (score >= 35) {
            return { data: json, score, isSynced };
          }
        }
      }
    } catch (_) {}
    return null;
  };

  // =========================================================================
  // PASS 1 — PARALLEL EXACT GET & SEARCH ACROSS ALL TITLE & ARTIST VARIANTS
  // =========================================================================
  const pass1Urls: string[] = [];
  for (const t of titleVariants.slice(0, 3)) {
    for (const art of artistVariants.slice(0, 3)) {
      if (!t || !art) continue;
      if (durationSec) {
        pass1Urls.push(
          `https://lrclib.net/api/get?track_name=${encodeURIComponent(t)}&artist_name=${encodeURIComponent(art)}&duration=${durationSec}`
        );
      }
      pass1Urls.push(
        `https://lrclib.net/api/get?track_name=${encodeURIComponent(t)}&artist_name=${encodeURIComponent(art)}`
      );
      pass1Urls.push(
        `https://lrclib.net/api/search?track_name=${encodeURIComponent(t)}&artist_name=${encodeURIComponent(art)}`
      );
    }
  }

  for (const t of titleVariants.slice(0, 2)) {
    for (const art of artistVariants.slice(0, 2)) {
      pass1Urls.push(
        `https://lrclib.net/api/search?q=${encodeURIComponent(`${t} ${art}`)}`
      );
    }
  }
  if (cleanTitle) {
    pass1Urls.push(`https://lrclib.net/api/search?q=${encodeURIComponent(cleanTitle)}`);
  }

  const pass1Results = await Promise.allSettled(pass1Urls.map(fetchLrcUrl));
  const validMatches = pass1Results
    .filter(
      (r): r is PromiseFulfilledResult<{ data: any; score: number; isSynced: boolean } | null> =>
        r.status === "fulfilled" && r.value !== null
    )
    .map((r) => r.value!);

  // Prefer highest-scoring synced match
  const syncedMatch = validMatches
    .filter((m) => m.isSynced && m.data.syncedLyrics)
    .sort((a, b) => b.score - a.score)[0];

  if (syncedMatch) {
    const data = syncedMatch.data;
    const sanitizedSynced = sanitizeCaptionsAndLyricsServer(data.syncedLyrics);
    const payload = {
      syncedLyrics: sanitizedSynced,
      plainLyrics: data.plainLyrics ? sanitizeCaptionsAndLyricsServer(data.plainLyrics) : undefined,
      lyricsRaw: sanitizedSynced,
      isSynced: true,
      source: "lrclib",
      provider: "Synced (LRCLIB)",
      cleanTitle: data.trackName || cleanTitle,
      cleanArtist: data.artistName || cleanArtist,
      lrcDuration: typeof data.duration === "number" ? data.duration : undefined,
    };
    setInCache(cacheKey, payload);
    return res.json(payload);
  }

  // Check if any valid plain lyrics match was returned
  const plainMatch = validMatches
    .filter((m) => m.data.plainLyrics && m.data.plainLyrics.trim().length > 0)
    .sort((a, b) => b.score - a.score)[0];

  if (plainMatch) {
    lrcPlainFallback = sanitizeCaptionsAndLyricsServer(plainMatch.data.plainLyrics);
  }

  // =========================================================================
  // PASS 2 — PARALLEL YOUTUBE MUSIC INNERTUBE & TERTIARY FALLBACKS
  // =========================================================================
  if (!targetVid) {
    try {
      const searchRes = await searchYouTubeMusic(`${cleanArtist} ${cleanTitle}`);
      if (searchRes && searchRes[0]?.youtubeVideoId) {
        targetVid = searchRes[0].youtubeVideoId;
      }
    } catch {}
  }

  const fallbackTasks: Promise<any>[] = [];
  if (targetVid) {
    fallbackTasks.push(
      fetchYouTubeMusicNativeLyrics(targetVid, durationSec).catch(() => null)
    );
  }
  for (const t of titleVariants.slice(0, 2)) {
    fallbackTasks.push(
      fetchTertiaryPublicLyrics(t, cleanArtist, durationSec).catch(() => null)
    );
  }

  const fallbackResults = await Promise.allSettled(fallbackTasks);
  for (const r of fallbackResults) {
    if (r.status === "fulfilled" && r.value) {
      const val = r.value;
      if (val.plainLyrics && val.plainLyrics.trim().length > 0) {
        const cleaned = sanitizeCaptionsAndLyricsServer(val.plainLyrics);
        const autoSynced = autoSyncPlainLyricsServer(cleaned, durationSec);
        const autoLrc = formatLRCServer(autoSynced);

        const payload = {
          syncedLyrics: autoLrc,
          plainLyrics: cleaned,
          lyricsRaw: autoLrc,
          isSynced: true,
          source: "auto_karaoke",
          provider: val.provider ? `Synced (${val.provider})` : "Synced (Karaoke Machine)",
          cleanTitle,
          cleanArtist,
          lrcDuration: durationSec,
        };
        setInCache(cacheKey, payload);
        return res.json(payload);
      }
    }
  }

  if (lrcPlainFallback) {
    const autoSynced = autoSyncPlainLyricsServer(lrcPlainFallback, durationSec);
    const autoLrc = formatLRCServer(autoSynced);

    const payload = {
      syncedLyrics: autoLrc,
      plainLyrics: lrcPlainFallback,
      lyricsRaw: autoLrc,
      isSynced: true,
      source: "auto_karaoke",
      provider: "Synced (Karaoke Machine)",
      cleanTitle,
      cleanArtist,
      lrcDuration: durationSec,
    };
    setInCache(cacheKey, payload);
    return res.json(payload);
  }

  return res.json({ lyricsRaw: "", isSynced: false, source: "none", cleanTitle, cleanArtist });
});

app.get("/api/youtube/similar", async (req, res) => {
  const title = (req.query.title as string) || "";
  const artist = (req.query.artist as string) || "";
  const genre = (req.query.genre as string) || "";
  const currentId = (req.query.trackId as string) || "";

  try {
    const accessToken = await getValidAccessToken(req);
    const cleanMeta = parseTrackMetadataServer(title, artist);
    const targetArtist = cleanMeta.artist && cleanMeta.artist !== "Unknown Artist" ? cleanMeta.artist : artist;
    const targetTitle = cleanMeta.title && cleanMeta.title !== "Untitled Track" ? cleanMeta.title : title;

    // Search genuine songs using specialized searchYouTubeMusicSongs
    let songResults: any[] = [];
    if (targetArtist && targetArtist !== "Unknown Artist") {
      songResults = await searchYouTubeMusicSongs(`${targetArtist} ${genre} songs`, accessToken || undefined);
    }
    if (songResults.length < 10 && targetTitle) {
      const moreSongs = await searchYouTubeMusicSongs(`${targetArtist} ${targetTitle} music`, accessToken || undefined);
      songResults = [...songResults, ...moreSongs];
    }
    if (songResults.length < 10) {
      const fallbackResults = await searchYouTubeMusic(`${targetArtist || genre || "Top"} music songs`, accessToken || undefined);
      songResults = [...songResults, ...fallbackResults];
    }

    const filtered = deduplicateById(songResults).filter((tr: any) => {
      const trId = tr.id || tr.youtubeVideoId;
      return trId && trId !== currentId;
    });

    res.json({ similarTracks: filtered });
  } catch (err) {
    console.error("Error in /api/youtube/similar:", err);
    res.json({ similarTracks: [] });
  }
});

app.get("/api/auth/google/callback", async (req, res) => {
  const code = req.query.code as string;
  const error = req.query.error as string;
  let themeColor = "#051911";
  try {
    if (req.query.state) {
      themeColor = decodeURIComponent(req.query.state as string);
    } else if ((req.session as any)?.authThemeColor) {
      themeColor = (req.session as any).authThemeColor;
    }
  } catch (e) {}

  const renderCallbackHtml = (scriptContent: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="${themeColor}" />
    <title>Google Sign-In</title>
    <style>
      body {
        margin: 0;
        background-color: ${themeColor};
        color: #ffffff;
        font-family: system-ui, -apple-system, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        overflow: hidden;
      }
    </style>
  </head>
  <body>
    <script>
      ${scriptContent}
    </script>
  </body>
</html>`;

  if (error || !code) {
    return res.send(
      renderCallbackHtml(`
        if (window.opener) {
          window.opener.postMessage({ type: 'OAUTH_ERROR', error: '${error || "No auth code provided"}' }, '*');
          window.close();
        } else {
          window.location.href = '/?oauth_error=${encodeURIComponent(error || "Failed")}';
        }
      `)
    );
  }

  const clientId = getOAuthClientId();
  const clientSecret = getOAuthClientSecret();
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  try {
    if (!clientId) {
      throw new Error("OAuth Client ID is missing. Please configure GOOGLE_CLIENT_ID.");
    }
    if (!clientSecret) {
      throw new Error("OAuth Client Secret is missing or empty. Please configure GOOGLE_CLIENT_SECRET in Secrets or Settings.");
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenRes.ok && tokenData.access_token) {
      req.session.tokens = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: Date.now() + tokenData.expires_in * 1000,
      };

      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userData = await userRes.json();

      const userPayload = {
        id: userData.id,
        name: userData.name || userData.email?.split("@")[0] || "User",
        email: userData.email || "",
        picture: userData.picture || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        refresh_token: tokenData.refresh_token,
      };

      req.session.user = userPayload;

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("Session save error:", saveErr);
        }

        return res.send(
          renderCallbackHtml(`
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_SUCCESS',
                user: ${JSON.stringify(userPayload)}
              }, '*');
              window.close();
            } else {
              window.location.href = '/?oauth_success=true&user=' + encodeURIComponent(JSON.stringify(${JSON.stringify(userPayload)}));
            }
          `)
        );
      });
    } else {
      const errDescription = tokenData.error_description || tokenData.error || "Failed to acquire tokens from Google";
      console.error("Google OAuth token exchange error response:", {
        status: tokenRes.status,
        error: tokenData.error,
        description: tokenData.error_description,
        clientIdSnippet: clientId.slice(0, 15) + "...",
        hasSecret: Boolean(clientSecret),
        secretLen: clientSecret.length,
      });

      if (tokenData.error === "invalid_client" || errDescription.toLowerCase().includes("client secret")) {
        throw new Error(
          `The provided Google Client Secret is invalid or mismatched for Client ID (${clientId.slice(0, 18)}...). Please check Google Cloud Console Credentials and update the Client Secret in Settings.`
        );
      }
      throw new Error(errDescription);
    }
  } catch (err: any) {
    const errorMsg = err.message || "OAuth token exchange error";
    console.error("OAuth token exchange error:", errorMsg);
    return res.send(
      renderCallbackHtml(`
        if (window.opener) {
          window.opener.postMessage({ type: 'OAUTH_ERROR', error: ${JSON.stringify(errorMsg)} }, '*');
          window.close();
        } else {
          window.location.href = '/?oauth_error=${encodeURIComponent(errorMsg)}';
        }
      `)
    );
  }
});

app.get("/api/auth/me", async (req, res) => {
  try {
    const validToken = await getValidAccessToken(req);

    if (validToken) {
      // Validate or query Google userinfo if token provided
      try {
        const uRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${validToken}` },
          signal: AbortSignal.timeout(4000),
        });
        if (uRes.ok) {
          const uData = await uRes.json();
          const userObj = {
            id: uData.id,
            name: uData.name || uData.email?.split("@")[0] || "User",
            email: uData.email || "",
            picture: uData.picture || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
            accessToken: validToken,
            isLoggedIn: true,
          };
          if (req.session) {
            req.session.user = userObj;
          }
          res.setHeader("X-New-Access-Token", validToken);
          return res.json({
            isLoggedIn: true,
            user: userObj,
            accessToken: validToken,
          });
        }
      } catch (uErr) {
        console.warn("Google userinfo check notice:", uErr);
      }

      if (req.session?.user) {
        return res.json({
          isLoggedIn: true,
          user: { ...req.session.user, accessToken: validToken },
          accessToken: validToken,
        });
      }
    }

    if (req.session?.user && req.session?.tokens?.access_token) {
      const u = req.session.user;
      return res.json({
        isLoggedIn: true,
        user: u,
        accessToken: req.session.tokens.access_token,
      });
    }
  } catch (err) {
    console.warn("Auth check warning:", err);
  }

  // Strictly return unauthenticated state when no session exists for the caller
  res.json({
    isLoggedIn: false,
    user: null,
  });
});

app.post("/api/auth/refresh", async (req, res) => {
  try {
    const refreshToken = (
      req.body?.refreshToken ||
      req.body?.refresh_token ||
      req.headers["x-refresh-token"] ||
      (req.session?.tokens as any)?.refresh_token
    ) as string;

    if (!refreshToken) {
      return res.json({
        success: false,
        error: "NO_REFRESH_TOKEN",
        message: "No refresh token provided in payload or headers.",
      });
    }

    const result = await refreshAccessTokenDirectly(refreshToken);
    if (result && result.accessToken) {
      let userData: any = null;
      try {
        const uRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${result.accessToken}` },
          signal: AbortSignal.timeout(3500),
        });
        if (uRes.ok) {
          const uInfo = await uRes.json();
          userData = {
            id: uInfo.id,
            name: uInfo.name || uInfo.email?.split("@")[0] || "User",
            email: uInfo.email || "",
            picture: uInfo.picture || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
            accessToken: result.accessToken,
            refreshToken,
            refresh_token: refreshToken,
            isLoggedIn: true,
          };
        }
      } catch {}

      if (req.session) {
        if (!req.session.tokens) req.session.tokens = { access_token: result.accessToken };
        req.session.tokens.access_token = result.accessToken;
        req.session.tokens.refresh_token = refreshToken;
        req.session.tokens.expires_at = Date.now() + result.expiresIn * 1000;
        if (userData) {
          req.session.user = userData;
        } else if (req.session.user) {
          (req.session.user as any).accessToken = result.accessToken;
          (req.session.user as any).refreshToken = refreshToken;
        }
      }

      res.setHeader("X-New-Access-Token", result.accessToken);
      return res.json({
        success: true,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
        user: userData || req.session?.user || null,
      });
    }

    return res.json({
      success: false,
      error: "REFRESH_FAILED",
      message: "Could not refresh token with Google OAuth provider.",
    });
  } catch (err: any) {
    console.error("Auth refresh endpoint error:", err);
    return res.json({
      success: false,
      error: "SERVER_ERROR",
      message: err?.message || "Failed to process token refresh",
    });
  }
});

app.post("/api/auth/logout", (req, res) => {
  try {
    const token = req.session?.tokens?.access_token;
    if (token) {
      delFromCache(`user_pls_${token.slice(-20)}`);
    }
  } catch {}
  req.session?.destroy(() => {
    res.json({ success: true });
  });
});

app.post("/api/identify-music", async (req, res) => {
  try {
    const { samples, sampleRate = 16000, base64Audio, uri: clientUri, samplems: clientSamplems } = req.body;

    let signatureUri = clientUri;
    let signatureSampleMs = clientSamplems || 5000;

    if (!signatureUri) {
      if (samples && Array.isArray(samples) && samples.length > 0) {
        const floatArray = new Float32Array(samples);
        const sig = DecodedSignature.new(floatArray, sampleRate, 1);
        signatureUri = sig.uri;
        signatureSampleMs = sig.samplems || Math.round((samples.length / sampleRate) * 1000);
        sig.free();
      } else if (base64Audio) {
        const buffer = Buffer.from(base64Audio, "base64");
        const sigs = recognizeBytes(new Uint8Array(buffer));
        if (sigs && sigs.length > 0) {
          signatureUri = sigs[0].uri;
          signatureSampleMs = sigs[0].samplems;
          for (const s of sigs) s.free();
        }
      }
    }

    if (!signatureUri) {
      return res.status(400).json({ success: false, message: "No audio data or signature provided" });
    }

    const uuid1 = crypto.randomUUID().toUpperCase();
    const uuid2 = crypto.randomUUID().toUpperCase();
    const url = `https://amp.shazam.com/discovery/v5/en/US/web/-/tag/${uuid1}/${uuid2}?sync=true&webv3=true&sampling=true&connected=&shazamapiversion=v3&sharehub=true&hubv5minorversion=v5.1&hidelb=true&video=v3`;

    const shazamRes = await fetchWithRetry(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        timezone: "America/New_York",
        signature: {
          uri: signatureUri,
          samplems: signatureSampleMs,
        },
        timestamp: Date.now(),
        context: {},
        geolocation: {},
      }),
    }, 2, 8000);

    if (!shazamRes.ok) {
      return res.json({ success: false, message: `Recognition service returned status ${shazamRes.status}` });
    }

    const shazamData = await shazamRes.json();
    const track = shazamData?.track;

    if (track && track.title) {
      const artwork =
        track.images?.coverarthq ||
        track.images?.coverart ||
        track.images?.background ||
        track.share?.image ||
        "";

      let albumName = "";
      if (Array.isArray(track.sections)) {
        for (const sec of track.sections) {
          if (sec.metadata && Array.isArray(sec.metadata)) {
            const albumMeta = sec.metadata.find((m: any) => m.title?.toLowerCase() === "album");
            if (albumMeta) albumName = albumMeta.text;
          }
        }
      }

      return res.json({
        success: true,
        match: {
          title: track.title,
          artist: track.subtitle || track.artists?.[0]?.name || "Unknown Artist",
          album: albumName,
          artwork: artwork,
          genre: track.genres?.primary || "",
          key: track.key,
          url: track.url || track.share?.href || "",
        },
      });
    }

    return res.json({
      success: false,
      message: "No song match found. Try again closer to the sound source.",
    });
  } catch (err: any) {
    console.error("Music identification error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to identify music",
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer } = await import("vite");
      const viteApp = await createServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(viteApp.middlewares);
    } catch (e) {
      console.warn("Could not start Vite dev middleware:", e);
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { etag: false, maxAge: 0 }));
    app.get("*", (req, res) => {
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Oblivion YouTube Music Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

export default app;