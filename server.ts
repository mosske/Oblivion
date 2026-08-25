import express from "express";
import path from "path";
import fs from "fs";
import dns from "dns";
import cookieParser from "cookie-parser";
import session from "express-session";
import { GoogleGenAI } from "@google/genai";

// Prefer IPv4 connections to prevent dual-stack IPv6 ConnectTimeoutError in cloud containers
if (typeof (dns as any).setDefaultResultOrder === "function") {
  try {
    (dns as any).setDefaultResultOrder("ipv4first");
  } catch {}
}

const app = express();
const PORT = 3000;

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
const PLAYLISTS_FILE = path.join(DATA_DIR, "local_playlists.json");
const CUSTOM_COVERS_FILE = path.join(DATA_DIR, "custom_covers.json");

function readStoredTokens(): Record<string, any> {
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      return JSON.parse(fs.readFileSync(TOKENS_FILE, "utf-8"));
    }
  } catch {}
  return {};
}

function writeStoredTokens(tokens: Record<string, any>) {
  try {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), "utf-8");
  } catch {}
}

function readStoredPlaylists(): any[] {
  try {
    if (fs.existsSync(PLAYLISTS_FILE)) {
      return JSON.parse(fs.readFileSync(PLAYLISTS_FILE, "utf-8"));
    }
  } catch {}
  return [];
}

function writeStoredPlaylists(pls: any[]) {
  try {
    fs.writeFileSync(PLAYLISTS_FILE, JSON.stringify(pls, null, 2), "utf-8");
  } catch {}
}

function readStoredCustomCovers(): Record<string, string> {
  try {
    if (fs.existsSync(CUSTOM_COVERS_FILE)) {
      return JSON.parse(fs.readFileSync(CUSTOM_COVERS_FILE, "utf-8"));
    }
  } catch {}
  return {};
}

function writeStoredCustomCovers(map: Record<string, string>) {
  try {
    fs.writeFileSync(CUSTOM_COVERS_FILE, JSON.stringify(map || {}, null, 2), "utf-8");
  } catch {}
}

function writeStoredCustomCover(playlistId: string, coverUrl: string) {
  try {
    if (!playlistId || !coverUrl) return;
    const cleanId = playlistId.replace(/^VL/, "");
    const map = readStoredCustomCovers();
    map[cleanId] = coverUrl;
    map[playlistId] = coverUrl;
    writeStoredCustomCovers(map);
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

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "oblivion-ytmusic-secret-key-2026",
    resave: true,
    saveUninitialized: true,
    cookie: {
      secure: "auto",
      httpOnly: false,
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  })
);

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
  if (v.includes("watch?v=")) {
    const match = v.match(/watch\?v=([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
  }
  if (v.includes("youtu.be/")) {
    const match = v.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
  }
  const match = v.match(/([a-zA-Z0-9_-]{11})/);
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

  // 1. Authenticated YouTube Data API v3 playlistItems with pagination
  if (currentToken) {
    try {
      let pageToken: string | undefined = undefined;
      let pagesFetched = 0;
      const maxPages = 8; // Up to 400 tracks

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
          // Token expired, attempt refresh
          const allTokens = readStoredTokens();
          const entries = Object.values(allTokens);
          let refToken: string | undefined = undefined;
          for (const ent of entries) {
            if ((ent as any)?.refresh_token) {
              refToken = (ent as any).refresh_token;
              break;
            }
          }
          if (refToken) {
            const clientId = getOAuthClientId();
            const clientSecret = getOAuthClientSecret();
            if (clientId && clientSecret) {
              const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                  client_id: clientId,
                  client_secret: clientSecret,
                  refresh_token: refToken,
                  grant_type: "refresh_token",
                }),
              });
              if (refreshRes.ok) {
                const refData = await refreshRes.json();
                if (refData.access_token) {
                  currentToken = refData.access_token;
                  response = await fetch(`${url}?${params}`, {
                    signal: AbortSignal.timeout(8000),
                    headers: {
                      Authorization: `Bearer ${currentToken}`,
                      "Cache-Control": "no-cache",
                    }
                  });
                }
              }
            }
          }
        }

        if (!response.ok) {
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

  // 2. Authenticated InnerTube YouTube Music / YouTube Web Browse for user & private playlists
  if (accessToken) {
    const browseIds = [`VL${cleanPlId}`, cleanPlId];
    for (const bId of browseIds) {
      try {
        const ytmRes = await fetch("https://music.youtube.com/youtubei/v1/browse", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "X-Origin": "https://music.youtube.com",
            Authorization: `Bearer ${accessToken}`,
            "Cache-Control": "no-cache",
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
            browseId: bId,
          }),
          signal: AbortSignal.timeout(6000),
        });

        if (ytmRes.ok) {
          const data = await ytmRes.json();
          const innerTracks: any[] = [];
          
          // Parse contents tabs
          const tabs = data.contents?.singleColumnBrowseResultsRenderer?.tabs || data.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
          for (const tab of tabs) {
            const sectionContents = tab.tabRenderer?.content?.sectionListRenderer?.contents || [];
            for (const sec of sectionContents) {
              const items = sec.musicPlaylistShelfRenderer?.contents || sec.musicShelfRenderer?.contents || sec.itemSectionRenderer?.contents || [];
              for (const item of items) {
                const renderer = item.musicResponsiveListItemRenderer;
                if (renderer) {
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
                  const durationSecs = parseDurationText(durStr);

                  if (vidId && title && title !== "Private video" && title !== "Deleted video") {
                    const uniqueId = renderer.playlistItemData?.playlistSetVideoId || `${vidId}_${innerTracks.length}`;
                    innerTracks.push({
                      id: uniqueId,
                      youtubeVideoId: vidId,
                      title,
                      artist,
                      album: "",
                      duration: durationSecs,
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

          if (innerTracks.length > 0) {
            const enriched = await enrichTracksWithDuration(innerTracks, accessToken);
            setInCache(cacheKey, enriched);
            return enriched;
          }
        }
      } catch (_innerErr) {
        // Continue to public extractor
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
  if (!url) return null;
  let cleaned = url.startsWith("//") ? `https:${url}` : url;
  cleaned = cleaned.replace(/&amp;/g, "&");

  if (
    cleaned.includes("googleusercontent.com") ||
    cleaned.includes("ggpht.com") ||
    cleaned.includes("yt3.ggpht.com")
  ) {
    if (cleaned.match(/=w\d+-h\d+/)) {
      cleaned = cleaned.replace(/=w\d+-h\d+[^?&]*/, "=w1200-h1200-l90-rj");
    } else if (cleaned.match(/=s\d+/)) {
      cleaned = cleaned.replace(/=s\d+[^?&]*/, "=s1200");
    } else if (!cleaned.includes("=")) {
      cleaned = `${cleaned}=w1200-h1200-l90-rj`;
    }
  } else if (cleaned.includes("i.ytimg.com/vi/")) {
    if (cleaned.includes("hqdefault.jpg")) {
      cleaned = cleaned.replace("hqdefault.jpg", "maxresdefault.jpg");
    }
  }
  return cleaned;
}

// Fetch authentic YouTube Music Library playlists & custom covers directly from InnerTube
async function fetchYouTubeMusicLibraryPlaylists(accessToken: string): Promise<any[]> {
  try {
    const seenIds = new Set<string>();
    const results: any[] = [];

    // Query YouTube Music (ANDROID_MUSIC, WEB_REMIX) and YouTube Web (WEB, ANDROID) endpoints
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
          "FEmusic_library_landing",
          "FEmusic_library_albums",
          "FEmusic_library_songs",
        ],
      },
      {
        url: "https://music.youtube.com/youtubei/v1/browse",
        clientName: "ANDROID_MUSIC",
        clientVersion: "6.45.52",
        origin: "https://music.youtube.com",
        headers: {
          "X-YouTube-Client-Name": "21",
          "X-YouTube-Client-Version": "6.45.52",
        },
        browseIds: [
          "FEmusic_library_landing",
          "FEmusic_liked_playlists",
          "FEmusic_library_playlists",
          "FEmusic_library_corpus_playlists",
          "FEmusic_library_albums",
          "FEmusic_library_songs",
          "FEmusic_liked_videos",
        ],
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
        browseIds: [
          "FEplaylist_aggregation",
          "FElibrary",
          "FEsubscriptions",
        ],
      },
      {
        url: "https://www.youtube.com/youtubei/v1/browse",
        clientName: "ANDROID",
        clientVersion: "19.09.37",
        origin: "https://www.youtube.com",
        headers: {
          "X-YouTube-Client-Name": "3",
          "X-YouTube-Client-Version": "19.09.37",
        },
        browseIds: [
          "FEplaylist_aggregation",
          "FElibrary",
          "FEsubscriptions",
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

            // Universal recursive collector for ALL YouTube & YouTube Music UI renderers
            const collectItems = (obj: any, depth = 0) => {
              if (!obj || typeof obj !== "object" || depth > 25) return;

              if (obj.musicTwoRowItemRenderer) candidateItems.push({ type: "twoRow", data: obj.musicTwoRowItemRenderer });
              if (obj.musicResponsiveListItemRenderer) candidateItems.push({ type: "responsive", data: obj.musicResponsiveListItemRenderer });
              if (obj.lockupViewModel) candidateItems.push({ type: "lockup", data: obj.lockupViewModel });
              if (obj.gridPlaylistRenderer) candidateItems.push({ type: "twoRow", data: obj.gridPlaylistRenderer });
              if (obj.playlistRenderer) candidateItems.push({ type: "twoRow", data: obj.playlistRenderer });
              if (obj.compactPlaylistRenderer) candidateItems.push({ type: "twoRow", data: obj.compactPlaylistRenderer });
              if (obj.gridVideoRenderer) candidateItems.push({ type: "twoRow", data: obj.gridVideoRenderer });
              if (obj.gridShowRenderer) candidateItems.push({ type: "twoRow", data: obj.gridShowRenderer });
              if (obj.musicCardShelfRenderer) candidateItems.push({ type: "twoRow", data: obj.musicCardShelfRenderer });

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
                  r.playlistId ||
                  r.navigationEndpoint?.watchPlaylistEndpoint?.playlistId ||
                  r.navigationEndpoint?.watchEndpoint?.playlistId ||
                  r.doubleTapCommand?.watchEndpoint?.playlistId ||
                  r.thumbnailOverlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.playlistId ||
                  r.navigationEndpoint?.browseEndpoint?.browseId ||
                  r.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ||
                  r.thumbnailRenderer?.musicThumbnailRenderer?.navigationEndpoint?.browseEndpoint?.browseId ||
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
                  r.playlistId ||
                  r.navigationEndpoint?.watchPlaylistEndpoint?.playlistId ||
                  r.navigationEndpoint?.watchEndpoint?.playlistId ||
                  r.doubleTapCommand?.watchEndpoint?.playlistId ||
                  r.navigationEndpoint?.browseEndpoint?.browseId ||
                  r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ||
                  "";
                playlistId = rawId.replace(/^VL/, "");
                title = r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.map((s: any) => s.text).join("") || "YouTube Playlist";
                subtitle = r.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.map((s: any) => s.text).join("") || "";
                const thumbs = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || r.thumbnail?.thumbnails;
                coverUrl = thumbs?.slice(-1)?.[0]?.url || thumbs?.[0]?.url || "";
              } else if (item.type === "lockup") {
                const r = item.data;
                const rawId =
                  r.contentId ||
                  r.rendererContext?.commandContext?.onTap?.innertubeCommand?.watchEndpoint?.playlistId ||
                  r.rendererContext?.commandContext?.onTap?.innertubeCommand?.browseEndpoint?.browseId ||
                  r.onTap?.innertubeCommand?.browseEndpoint?.browseId ||
                  "";
                playlistId = rawId.replace(/^VL/, "");
                title = r.metadata?.lockupMetadataViewModel?.title?.content || "YouTube Playlist";
                subtitle = r.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.elements?.map((el: any) => el?.text?.content).join(" • ") || "";
                coverUrl = r.contentImage?.collectionThumbnailViewModel?.primaryThumbnail?.thumbnailViewModel?.image?.sources?.slice(-1)?.[0]?.url || r.contentImage?.sources?.[0]?.url || "";
              }

              if (!playlistId || seenIds.has(playlistId) || playlistId.length < 2) continue;
              // Skip non-playlist IDs like generic browse tabs or channels
              if (playlistId.startsWith("FE")) continue;
              if (playlistId.startsWith("UC") && playlistId.length === 24) continue; // standard channel ID

              seenIds.add(playlistId);

              const formatted = formatHighResCover(coverUrl);
              if (formatted) {
                setInCache(`yt_pl_custom_img:${playlistId}`, formatted);
              }

              const rawCount = subtitle.match(/(\d+)\s*(songs|tracks|items|videos)/i)?.[1] || subtitle.replace(/\D/g, "");

              const isCustom = Boolean(
                (coverUrl && (
                  coverUrl.includes("googleusercontent.com") ||
                  coverUrl.includes("ggpht.com") ||
                  coverUrl.includes("yt3.ggpht.com") ||
                  coverUrl.includes("/pl/") ||
                  coverUrl.includes("/s_p/")
                )) || formatted
              );

              results.push({
                id: playlistId,
                playlistId,
                title: title.trim() || "YouTube Playlist",
                description: subtitle || "Synced from YouTube Music Library",
                coverUrl: formatted || coverUrl || `https://i.ytimg.com/vi/${playlistId}/hqdefault.jpg`,
                customCoverUrl: formatted || coverUrl || null,
                isCustomCover: isCustom,
                isYouTubeSynced: true,
                tracksCount: parseInt(rawCount || "0", 10) || 0,
                tracks: [],
              });
            }
          }
        } catch (_bErr) {
          // Continue to next browse ID
        }
      }
    }

    console.log(`[YouTube InnerTube] Successfully discovered ${results.length} authentic library playlists.`);
    return results;
  } catch (err) {
    console.warn("YouTube Music library InnerTube fetch notice:", err);
    return [];
  }
}

// High-resolution YouTube Playlist Custom Artwork Fetcher
// Extracts authentic custom artwork (YouTube Studio square thumbnails, Google User Content covers, and user-customized covers)
async function fetchYouTubePlaylistCustomImage(
  playlistId: string,
  accessToken?: string | null,
  fallbackThumbnails?: any
): Promise<string | null> {
  if (!playlistId || playlistId.startsWith("pl_custom_")) return null;
  const cleanPlId = playlistId.replace(/^VL/, "");

  // 1. Check persistent disk custom covers store first
  const storedCustom = readStoredCustomCovers();
  if (storedCustom[cleanPlId] || storedCustom[playlistId]) {
    const customUrl = storedCustom[cleanPlId] || storedCustom[playlistId];
    return formatHighResCover(customUrl) || customUrl;
  }

  const cacheKey = `yt_pl_custom_img:${cleanPlId}`;
  const cached = getFromCache<string>(cacheKey);
  if (cached) return cached;

  const isAuthenticCustomUrl = (u: string) => {
    if (!u || typeof u !== "string") return false;
    return (
      u.includes("studio_square_thumbnail") ||
      u.includes("/pl_c/") ||
      u.includes("googleusercontent.com") ||
      u.includes("ggpht.com") ||
      u.includes("yt3.ggpht.com") ||
      u.includes("yt4.ggpht.com") ||
      u.includes("ytimg.com/pl/") ||
      u.includes("/pl/") ||
      u.includes("/s_p/") ||
      u.startsWith("data:image")
    );
  };

  // 2. Direct Inspection of fallbackThumbnails (from playlist snippet)
  if (fallbackThumbnails) {
    const thumbCandidates = [
      fallbackThumbnails.maxres?.url,
      fallbackThumbnails.standard?.url,
      fallbackThumbnails.high?.url,
      fallbackThumbnails.medium?.url,
      fallbackThumbnails.default?.url,
    ].filter(Boolean);

    for (const url of thumbCandidates) {
      if (isAuthenticCustomUrl(url)) {
        const formatted = formatHighResCover(url);
        if (formatted) {
          writeStoredCustomCover(cleanPlId, formatted);
          setInCache(cacheKey, formatted);
          return formatted;
        }
      }
    }
  }

  // 3. YouTube Music & YouTube Web HTML Scraper (extracts authentic studio_square_thumbnail & googleusercontent artwork)
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
          if (isAuthenticCustomUrl(rawUrl)) {
            const formatted = formatHighResCover(rawUrl);
            if (formatted) {
              writeStoredCustomCover(cleanPlId, formatted);
              setInCache(cacheKey, formatted);
              return formatted;
            }
          }
        }

        const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
        if (match) {
          const pData = JSON.parse(match[1]);
          const customThumb =
            pData.sidebar?.playlistSidebarRenderer?.items?.[0]?.playlistSidebarPrimaryInfoRenderer?.thumbnailRenderer?.playlistCustomThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)?.[0]?.url ||
            pData.header?.musicResponsiveHeaderRenderer?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)?.[0]?.url ||
            pData.header?.playlistHeaderRenderer?.playlistHeaderBanner?.thumbnails?.slice(-1)?.[0]?.url ||
            pData.header?.playlistHeaderRenderer?.image?.playlistCustomThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)?.[0]?.url ||
            pData.microformat?.microformatDataRenderer?.thumbnail?.thumbnails?.slice(-1)?.[0]?.url;

          if (customThumb && isAuthenticCustomUrl(customThumb)) {
            const formatted = formatHighResCover(customThumb);
            if (formatted) {
              writeStoredCustomCover(cleanPlId, formatted);
              setInCache(cacheKey, formatted);
              return formatted;
            }
          }
        }
      }
    } catch (_htmlErr) {}
  }

  // 4. Official YouTube Data API v3 playlist query (if authenticated)
  if (accessToken) {
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
        const bestUrl =
          thumbs?.maxres?.url ||
          thumbs?.standard?.url ||
          thumbs?.high?.url ||
          thumbs?.medium?.url ||
          thumbs?.default?.url;
        if (bestUrl && isAuthenticCustomUrl(bestUrl)) {
          const formatted = formatHighResCover(bestUrl);
          if (formatted) {
            writeStoredCustomCover(cleanPlId, formatted);
            setInCache(cacheKey, formatted);
            return formatted;
          }
        }
      }
    } catch (_apiErr) {}

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
        const bestImgUrl =
          imgThumbs?.maxres?.url ||
          imgThumbs?.standard?.url ||
          imgThumbs?.high?.url ||
          imgThumbs?.default?.url;
        if (bestImgUrl && isAuthenticCustomUrl(bestImgUrl)) {
          const formatted = formatHighResCover(bestImgUrl);
          if (formatted) {
            writeStoredCustomCover(cleanPlId, formatted);
            setInCache(cacheKey, formatted);
            return formatted;
          }
        }
      }
    } catch (_apiImgErr) {}
  }

  // 5. Fast InnerTube API with Auth Header support
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

          const findCustomThumbnails = (obj: any, depth = 0) => {
            if (!obj || typeof obj !== "object" || depth > 20) return;

            if (Array.isArray(obj.thumbnails)) {
              for (const t of obj.thumbnails) {
                if (t?.url && isAuthenticCustomUrl(t.url)) candidateThumbUrls.push(t.url);
              }
            }
            if (Array.isArray(obj.sources)) {
              for (const s of obj.sources) {
                if (s?.url && isAuthenticCustomUrl(s.url)) candidateThumbUrls.push(s.url);
              }
            }
            if (typeof obj.url === "string" && isAuthenticCustomUrl(obj.url)) {
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
          const title = v.title?.runs?.[0]?.text || "Unknown";
          const artist = v.ownerText?.runs?.[0]?.text || v.longBylineText?.runs?.[0]?.text || "Unknown Artist";
          const coverUrl = v.thumbnail?.thumbnails?.slice(-1)?.[0]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
          const durationText = v.lengthText?.simpleText || "0:00";
          results.push({
            id: videoId,
            youtubeVideoId: videoId,
            title,
            artist,
            album: searchType === "album" ? title : "",
            type: searchType === "album" ? "album" : "track",
            coverUrl,
            audioUrl: `/api/youtube/stream/${videoId}`,
            durationText
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
        const items = data.items.map((item: any) => ({
          id: item.id?.videoId || item.id?.playlistId || item.id,
          youtubeVideoId: item.id?.videoId,
          playlistId: item.id?.playlistId,
          title: item.snippet?.title || 'Unknown',
          artist: item.snippet?.channelTitle || 'Unknown Artist',
          album: type === 'album' ? item.snippet?.title : '',
          type: item.id?.playlistId || type === 'album' ? 'album' : 'track',
          coverUrl: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
          audioUrl: item.id?.videoId ? `/api/youtube/stream/${item.id.videoId}` : undefined,
          genre: 'Music',
          playsCount: 0
        }));
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

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") return null;
  return new GoogleGenAI({ apiKey });
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

async function refreshAccessToken(req: express.Request, tokenHint?: string): Promise<string | null> {
  const allTokens = readStoredTokens();
  let refreshToken = req.session?.tokens?.refresh_token;

  if (!refreshToken && tokenHint) {
    for (const k of Object.keys(allTokens)) {
      const entry = allTokens[k];
      if (entry.access_token === tokenHint || k === tokenHint || entry.user?.email === tokenHint) {
        if (entry.refresh_token) {
          refreshToken = entry.refresh_token;
          break;
        }
      }
    }
  }

  if (!refreshToken) {
    const entries = Object.values(allTokens);
    if (entries.length > 0) {
      const latest = entries[entries.length - 1] as any;
      if (latest?.refresh_token) {
        refreshToken = latest.refresh_token;
      }
    }
  }

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
      if (!req.session.tokens) req.session.tokens = { access_token: data.access_token };
      req.session.tokens.access_token = data.access_token;
      req.session.tokens.expires_at = Date.now() + (data.expires_in || 3600) * 1000;
      if (data.refresh_token) {
        req.session.tokens.refresh_token = data.refresh_token;
        refreshToken = data.refresh_token;
      }

      const userKey = req.session.user?.id || req.session.user?.email || "default_user";
      allTokens[userKey] = {
        ...(allTokens[userKey] || {}),
        access_token: data.access_token,
        refresh_token: refreshToken,
        expires_at: Date.now() + (data.expires_in || 3600) * 1000,
        user: req.session.user || allTokens[userKey]?.user,
        updated_at: Date.now(),
      };
      writeStoredTokens(allTokens);

      if (req.session.user) {
        req.session.user.accessToken = data.access_token;
      }
      return data.access_token;
    }
  } catch (err) {
    console.error("Token refresh error:", err);
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

  if (token) {
    if (!req.session?.tokens) {
      const allTokens = readStoredTokens();
      const match = Object.values(allTokens).find((entry: any) => entry.access_token === token);
      if (match) {
        req.session.tokens = {
          access_token: match.access_token,
          refresh_token: match.refresh_token,
          expires_at: match.expires_at,
        };
        if (match.user) req.session.user = match.user;
      }
    }
    return token;
  }

  if (req.session?.tokens?.access_token) {
    const { access_token, expires_at } = req.session.tokens;
    if (expires_at && Date.now() < expires_at - 60000) {
      return access_token;
    }
    const refreshed = await refreshAccessToken(req);
    return refreshed || access_token;
  }

  // Fallback to disk store
  const allTokens = readStoredTokens();
  const entries = Object.values(allTokens);
  if (entries.length > 0) {
    const latest = entries[entries.length - 1] as any;
    if (latest?.refresh_token) {
      const refreshed = await refreshAccessToken(req, latest.access_token);
      if (refreshed) return refreshed;
    }
    if (latest?.access_token) return latest.access_token;
  }

  return null;
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
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || process.env.CLIENT_ID || "";
  console.log("OAuth: clientId = ", clientId ? "present" : "MISSING");
  return clientId;
}

function getOAuthClientSecret(): string {
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.VITE_GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET || "";
  console.log("OAuth: clientSecret = ", clientSecret ? "present" : "MISSING");
  return clientSecret;
}

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
  if (clientId) {
    process.env.GOOGLE_CLIENT_ID = sanitizeCredential(clientId);
  }
  if (clientSecret) {
    process.env.GOOGLE_CLIENT_SECRET = sanitizeCredential(clientSecret);
  }
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  res.json({
    success: true,
    hasSecret: Boolean(process.env.GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET),
    redirectUri,
  });
});

app.get("/api/auth/google/url", (req, res) => {
  const clientId = getOAuthClientId();
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  if (!clientId) {
    return res.status(400).json({ error: "Google OAuth Client ID is not configured" });
  }

  const scopes = [
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/youtube.force-ssl",
  ];

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
  });

  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
});

// YouTube Music API Routes - Pulls authentic YouTube content and user playlists
app.get("/api/youtube/playlists", async (req, res) => {
  try {
    let accessToken = await getValidAccessToken(req);
    let ytPlaylists: any[] = [];
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
            part: "snippet,contentDetails",
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
            break;
          }
        } while (pageToken && pagesCount < 4);

        // 2. Check YouTube Channel playlists (resolves brand and music channels)
        try {
          const chanParams = new URLSearchParams({
            part: "snippet,contentDetails",
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
                    part: "snippet,contentDetails",
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

        if (allItems.length > 0) {
          // Fetch custom covers for any playlists not already resolved from YouTube Music Library
          const customCovers = await Promise.allSettled(
            allItems.map((item: any) => {
              const cleanId = item.id.replace(/^VL/, "");
              const ytmMatch = ytmLibraryMap.get(cleanId) || ytmLibraryMap.get(item.id);
              if (ytmMatch?.isCustomCover && ytmMatch?.customCoverUrl) {
                return Promise.resolve(ytmMatch.customCoverUrl);
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

            const cachedCustom = getFromCache<string>(`yt_pl_custom_img:${cleanId}`) || getFromCache<string>(`yt_pl_custom_img:${item.id}`);
            const resolvedCustom = ytmMatch?.customCoverUrl || customResult || cachedCustom || null;

            const primaryCover =
              resolvedCustom ||
              ytmMatch?.coverUrl ||
              bestThumbnail ||
              "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80";

            const isCustom = Boolean(resolvedCustom || ytmMatch?.isCustomCover);

            return {
              id: item.id,
              playlistId: item.id,
              title: item.snippet?.title || ytmMatch?.title || "YouTube Playlist",
              description: item.snippet?.description || ytmMatch?.description || "Synced from your YouTube Music library",
              coverUrl: resolvedCustom || primaryCover,
              customCoverUrl: resolvedCustom || (isCustom ? primaryCover : undefined),
              isCustomCover: isCustom,
              isYouTubeSynced: true,
              tracksCount: item.contentDetails?.itemCount || ytmMatch?.tracksCount || 0,
              thumbnails: thumbs || undefined,
              tracks: [],
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
            }
          } else if (!seenItemIds.has(pl.id) && !seenItemIds.has(cleanId)) {
            seenItemIds.add(pl.id);
            seenItemIds.add(cleanId);
            ytPlaylists.push(pl);
          }
        }

        // 4. Fetch Liked tracks collection (LM, LL, and myRating=like videos)
        try {
          // A. Try myRating=like
          const likedVideosRes = await fetchWithRetry(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&myRating=like&maxResults=50`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            },
            1,
            8000
          );
          if (likedVideosRes.ok) {
            const likedData = await likedVideosRes.json();
            if (likedData?.items && Array.isArray(likedData.items) && likedData.items.length > 0) {
              const likedTracks = likedData.items
                .map((item: any) => {
                  const vidId = item.id;
                  if (!vidId) return null;
                  return {
                    id: vidId,
                    youtubeVideoId: vidId,
                    title: item.snippet?.title || "Liked Song",
                    artist: item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle || "YouTube Artist",
                    coverUrl:
                      item.snippet?.thumbnails?.high?.url ||
                      item.snippet?.thumbnails?.medium?.url ||
                      `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
                    audioUrl: `/api/youtube/stream/${vidId}`,
                    type: "track",
                  };
                })
                .filter(Boolean);

              if (likedTracks.length > 0 && !seenItemIds.has("LL")) {
                seenItemIds.add("LL");
                ytPlaylists.unshift({
                  id: "LL",
                  playlistId: "LL",
                  title: "Liked Music & Videos",
                  description: "Your official YouTube liked tracks collection",
                  coverUrl: likedTracks[0]?.coverUrl || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80",
                  isYouTubeSynced: true,
                  tracksCount: likedTracks.length,
                  tracks: likedTracks,
                });
              }
            }
          }

          // B. Try playlistItems for LL and LM
          if (!seenItemIds.has("LL")) {
            for (const plId of ["LM", "LL"]) {
              if (seenItemIds.has("LL")) break;
              try {
                const likedRes = await fetchWithRetry(
                  `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${plId}&maxResults=50`,
                  {
                    headers: { Authorization: `Bearer ${accessToken}` },
                  },
                  1,
                  8000
                );
                if (likedRes.ok) {
                  const likedData = await likedRes.json();
                  if (likedData?.items && Array.isArray(likedData.items) && likedData.items.length > 0) {
                    const likedTracks = likedData.items
                      .map((item: any) => {
                        const vidId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
                        if (!vidId) return null;
                        return {
                          id: vidId,
                          youtubeVideoId: vidId,
                          title: item.snippet?.title || "Liked Song",
                          artist: item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle || "YouTube Artist",
                          coverUrl:
                            item.snippet?.thumbnails?.high?.url ||
                            item.snippet?.thumbnails?.medium?.url ||
                            `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
                          audioUrl: `/api/youtube/stream/${vidId}`,
                          type: "track",
                        };
                      })
                      .filter(Boolean);

                    if (likedTracks.length > 0) {
                      seenItemIds.add("LL");
                      ytPlaylists.unshift({
                        id: "LL",
                        playlistId: "LL",
                        title: "Liked Music & Videos",
                        description: "Your official YouTube liked tracks collection",
                        coverUrl: likedTracks[0]?.coverUrl || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80",
                        isYouTubeSynced: true,
                        tracksCount: likedTracks.length,
                        tracks: likedTracks,
                      });
                    }
                  }
                }
              } catch (_plItemErr) {}
            }
          }
        } catch (likedErr) {
          console.warn("[YouTube API] Liked songs query notice:", likedErr);
        }
      } catch (e) {
        console.warn("[YouTube API] Authenticated playlists pull notice:", e);
      }
    }

    // Merge local custom playlists from session and disk store
    const rawSession = req.session.playlists || [];
    const diskPlaylists = readStoredPlaylists();
    const allCustom = [...rawSession, ...diskPlaylists, ...localPlaylistsStore];
    const customLocalPlaylists = allCustom.filter((p: any) => p && typeof p.id === "string" && p.id.startsWith("pl_custom_"));

    let combined: any[] = [];

    if (accessToken) {
      // Authenticated user: return authentic YouTube playlists merged with any custom local playlists
      combined = [...ytPlaylists, ...customLocalPlaylists];
    } else {
      // Unauthenticated user: do not return any playlists to prevent stale persistence
      combined = [];
    }

    const deduped = deduplicateById(combined);
    if (deduped.length > 0) {
      setInCache(userCacheKey, deduped);
    }

    console.log(`[YouTube Playlists] Returning ${deduped.length} authentic playlists (User: ${accessToken ? "Logged In" : "Anonymous"}).`);
    res.json({ playlists: deduped, newAccessToken: accessToken || undefined });
  } catch (err: any) {
    console.error("Error in /api/youtube/playlists:", err);
    res.json({ playlists: [] });
  }
});

app.get("/api/youtube/playlists/:id/items", async (req, res) => {
  const { id } = req.params;
  const title = (req.query.title as string) || "";
  const artist = (req.query.artist as string) || "";
  const type = (req.query.type as string) || "";
  const forceRefresh = req.query.refresh === "true" || req.query.force === "true" || req.query.sync === "true" || true;

  try {
    const accessToken = await getValidAccessToken(req);
    
    const cleanPlId = id.replace(/^VL/, "");
    // Check session or local store or disk store
    const storedPlaylists = readStoredPlaylists();
    const allPlaylists = [...(req.session.playlists || []), ...(localPlaylistsStore || []), ...storedPlaylists];
    const found = allPlaylists.find(p => p.id === id || p.playlistId === id || (p.id && p.id.replace(/^VL/, "") === cleanPlId));

    let customCover: string | null = null;
    if (id && !id.startsWith("pl_custom_")) {
      customCover = await fetchYouTubePlaylistCustomImage(id, accessToken);
    }
    if (cleanPlId && !cleanPlId.startsWith("pl_custom_")) {
      const ytTracks = await getPlaylistItemsFromYouTube(accessToken, cleanPlId, forceRefresh);
      if (ytTracks && ytTracks.length > 0) {
        let finalTracks = ytTracks;
        // Merge with any tracks previously stored locally in found.tracks so newly committed additions are NEVER wiped out by YouTube API propagation lag
        if (found && found.tracks && found.tracks.length > 0) {
          const ytVideoIds = new Set(ytTracks.map((t: any) => extractCleanVideoId(t.youtubeVideoId || t.id)));
          const extraLocalTracks = found.tracks.filter((t: any) => {
            const vId = extractCleanVideoId(t.youtubeVideoId || t.id);
            return vId && !ytVideoIds.has(vId);
          });
          if (extraLocalTracks.length > 0) {
            finalTracks = [...ytTracks, ...extraLocalTracks];
          }
        }
        if (found) {
          found.tracks = finalTracks;
          found.tracksCount = finalTracks.length;
          if (customCover) {
            found.coverUrl = customCover;
            found.customCoverUrl = customCover;
            found.isCustomCover = true;
          }
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

    // 4. Official Studio Albums (ONLY when explicitly an album ID or requested as album type)
    const isExplicitAlbum =
      type === "album" ||
      id.startsWith("album_") ||
      id.startsWith("MPREb_") ||
      id.startsWith("OLAK5uy_") ||
      Boolean((found as any)?.isAlbum);

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
  const { title, description, coverUrl, customCoverUrl, isCustomCover, track, initialTrack, tracks } = req.body;
  
  let ytCreatedId: string | null = null;
  const accessToken = await getValidAccessToken(req);

  if (accessToken) {
    try {
      const ytRes = await fetch("https://www.googleapis.com/youtube/v3/playlists?part=snippet,status", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          snippet: {
            title: title || "New Playlist",
            description: description || "Created with Oblivion Music",
          },
          status: {
            privacyStatus: "public",
          },
        }),
      });
      const ytData = await ytRes.json();
      if (ytRes.ok && ytData.id) {
        ytCreatedId = ytData.id;
      } else {
        console.warn("YouTube API create playlist response:", ytRes.status, ytData);
      }
    } catch (ytErr) {
      console.warn("YouTube API create playlist error:", ytErr);
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

    if (accessToken && ytCreatedId && vId) {
      try {
        const addRes = await fetch("https://www.googleapis.com/youtube/v3/playlistItems?part=snippet", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
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
  };

  if (!req.session.playlists) req.session.playlists = [...localPlaylistsStore];
  req.session.playlists.unshift(newPlaylist);
  localPlaylistsStore = req.session.playlists;

  // Invalidate caches
  delFromCache("yt_playlists_auth:*");
  delFromCache("yt_playlists_pub:*");
  delFromCache(`pl_items:auth:${targetId}`);
  delFromCache(`pl_items:pub:${targetId}`);

  res.json({ playlist: newPlaylist, syncedToYouTube: Boolean(ytCreatedId) });
});

app.put("/api/youtube/playlists/:id", (req, res) => {
  const { id } = req.params;
  const { title, description, coverUrl, customCoverUrl, isCustomCover } = req.body;
  const cleanId = id.replace(/^VL/, "");

  if (coverUrl || customCoverUrl) {
    const finalCustom = customCoverUrl || coverUrl;
    writeStoredCustomCover(cleanId, finalCustom);
    writeStoredCustomCover(id, finalCustom);
    setInCache(`yt_pl_custom_img:${cleanId}`, finalCustom);
    setInCache(`yt_pl_custom_img:${id}`, finalCustom);
  }

  if (!req.session.playlists) req.session.playlists = [...localPlaylistsStore];
  req.session.playlists = req.session.playlists.map(p => {
    if (p.id === id || p.id === cleanId || p.id?.replace(/^VL/, "") === cleanId) {
      return {
        ...p,
        title: title ?? p.title,
        description: description ?? p.description,
        coverUrl: coverUrl ?? p.coverUrl,
        customCoverUrl: customCoverUrl !== undefined ? customCoverUrl : (coverUrl ?? p.customCoverUrl),
        isCustomCover: isCustomCover !== undefined ? isCustomCover : true
      };
    }
    return p;
  });
  localPlaylistsStore = req.session.playlists;

  // Also persist to disk
  try {
    const stored = readStoredPlaylists();
    const updated = stored.map((p: any) => {
      if (p.id === id || p.id === cleanId || p.id?.replace(/^VL/, "") === cleanId) {
        return {
          ...p,
          title: title ?? p.title,
          description: description ?? p.description,
          coverUrl: coverUrl ?? p.coverUrl,
          customCoverUrl: customCoverUrl !== undefined ? customCoverUrl : (coverUrl ?? p.customCoverUrl),
          isCustomCover: isCustomCover !== undefined ? isCustomCover : true
        };
      }
      return p;
    });
    writeStoredPlaylists(updated);
  } catch {}

  res.json({ success: true });
});

// Dedicated endpoint to save custom playlist cover artwork
app.post("/api/youtube/playlists/:id/custom-cover", (req, res) => {
  const { id } = req.params;
  const { coverUrl, customCoverUrl, isCustom } = req.body;
  const targetCover = customCoverUrl || coverUrl;
  const cleanId = id.replace(/^VL/, "");

  if (targetCover && isCustom !== false) {
    writeStoredCustomCover(cleanId, targetCover);
    writeStoredCustomCover(id, targetCover);
    setInCache(`yt_pl_custom_img:${cleanId}`, targetCover);
    setInCache(`yt_pl_custom_img:${id}`, targetCover);
  }

  res.json({ success: true, coverUrl: targetCover });
});

// Dedicated endpoint to get all custom covers
app.get("/api/youtube/playlists/custom-covers", (req, res) => {
  const covers = readStoredCustomCovers();
  res.json({ covers });
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

app.delete("/api/youtube/playlists/:id", (req, res) => {
  const { id } = req.params;
  if (!req.session.playlists) req.session.playlists = [...localPlaylistsStore];
  req.session.playlists = req.session.playlists.filter(p => p.id !== id);
  localPlaylistsStore = req.session.playlists;

  res.json({ success: true });
});

async function syncPlaylistTracksToYouTube(
  req: express.Request,
  id: string,
  tracks: any[]
): Promise<{ success: boolean; syncedToYouTube: boolean; count: number; error?: string }> {
  const cleanPlId = id.replace(/^VL/, "");

  // Update in-memory local & session stores
  if (!req.session.playlists) req.session.playlists = [...localPlaylistsStore];
  const found = req.session.playlists.find(
    (p) => p.id === id || p.playlistId === id || (p.id && p.id.replace(/^VL/, "") === cleanPlId)
  );
  if (found && Array.isArray(tracks)) {
    found.tracks = tracks;
    found.tracksCount = tracks.length;
    if (tracks.length > 0 && !found.isCustomCover) {
      found.coverUrl = tracks[0].coverUrl || found.coverUrl;
    }
  }
  localPlaylistsStore = req.session.playlists;

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
      // 1. Fetch ALL existing playlist items from YouTube Data API v3 (handling pagination and 401 refresh)
      let pageToken: string | undefined = undefined;
      let pagesCount = 0;
      const maxPages = 10; // Up to 500 items
      const existingItems: any[] = [];

      do {
        const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=id,snippet,contentDetails&playlistId=${cleanPlId}&maxResults=50${
          pageToken ? `&pageToken=${pageToken}` : ""
        }`;
        let plRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });

        if (plRes.status === 401) {
          const refreshed = await refreshAccessToken(req);
          if (refreshed) {
            accessToken = refreshed;
            plRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
          }
        }

        if (!plRes.ok) {
          const errData = await plRes.json().catch(() => ({}));
          console.warn(`[YouTube API Sync] Failed to fetch playlist items (${plRes.status}):`, errData);
          break;
        }

        const data = await plRes.json();
        if (data.items && Array.isArray(data.items)) {
          existingItems.push(...data.items);
        }
        pageToken = data.nextPageToken;
        pagesCount++;
      } while (pageToken && pagesCount < maxPages);

      console.log(`[YouTube API Sync] Found ${existingItems.length} items in remote playlist ${cleanPlId}`);

      // Map of existing item ID -> item details
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
        let updatedCount = 0;
        let skippedCount = 0;

        for (let pos = 0; pos < tracks.length; pos++) {
          const tr = tracks[pos];
          const vId = extractCleanVideoId(tr.youtubeVideoId || tr.id);
          if (!vId) continue;

          // Find appropriate itemId
          let targetItemId: string | undefined = undefined;
          if (tr.playlistItemId && existingItemIdsSet.has(tr.playlistItemId)) {
            targetItemId = tr.playlistItemId;
            existingItemIdsSet.delete(tr.playlistItemId);
          } else {
            const list = videoToItemIds.get(vId);
            if (list && list.length > 0) {
              targetItemId = list.shift();
              if (targetItemId) existingItemIdsSet.delete(targetItemId);
            }
          }

          if (targetItemId) {
            const existingItem = itemIdToItem.get(targetItemId);
            const currentPos = existingItem?.snippet?.position;

            // If item is already at the target position, skip calling the YouTube API
            if (currentPos !== undefined && currentPos === pos) {
              skippedCount++;
              continue;
            }

            const targetPlaylistId = existingItem?.snippet?.playlistId || cleanPlId;
            const resourceId = existingItem?.snippet?.resourceId || {
              kind: "youtube#video",
              videoId: vId,
            };

            // Small throttle to avoid hitting YouTube API rate limits
            await new Promise((r) => setTimeout(r, 120));

            // Update item position on YouTube
            let updateRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet`, {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                id: targetItemId,
                snippet: {
                  playlistId: targetPlaylistId,
                  resourceId,
                  position: pos,
                },
              }),
            });

            if (updateRes.status === 401) {
              const refreshed = await refreshAccessToken(req);
              if (refreshed) {
                accessToken = refreshed;
                updateRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet`, {
                  method: "PUT",
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    id: targetItemId,
                    snippet: {
                      playlistId: targetPlaylistId,
                      resourceId,
                      position: pos,
                    },
                  }),
                });
              }
            }

            if (updateRes.ok) {
              updatedCount++;
            } else {
              const uData = await updateRes.json().catch(() => ({}));
              console.warn(
                `[YouTube API Sync] Notice updating position for item ${targetItemId} at pos ${pos}:`,
                JSON.stringify(uData)
              );
            }
          } else {
            // Item does not exist on YouTube playlist yet, insert it with designated position
            await new Promise((r) => setTimeout(r, 120));
            let addRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet`, {
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
                  position: pos,
                },
              }),
            });

            if (addRes.status === 401) {
              const refreshed = await refreshAccessToken(req);
              if (refreshed) {
                accessToken = refreshed;
                addRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet`, {
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
                      position: pos,
                    },
                  }),
                });
              }
            }

            if (addRes.ok) {
              const aData = await addRes.json();
              if (aData.id) {
                tr.playlistItemId = aData.id;
                tr.id = aData.id;
              }
              updatedCount++;
            }
          }
        }
        syncedToYouTube = true;
        console.log(
          `[YouTube API Sync] Completed sync for ${updatedCount} moved, ${skippedCount} retained tracks on playlist ${cleanPlId}`
        );
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
    syncedToYouTube,
    count: tracks?.length || 0,
    error: syncError,
  };
}

app.put("/api/youtube/playlists/:id/reorder", async (req, res) => {
  const { id } = req.params;
  const { tracks } = req.body;
  const result = await syncPlaylistTracksToYouTube(req, id, tracks || []);
  res.json(result);
});

app.post("/api/youtube/playlists/:id/items", async (req, res) => {
  const { id } = req.params;
  const { track } = req.body;
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

  // Only handle local custom playlist in session
  if (cleanPlId.startsWith("pl_custom_")) {
    if (!req.session.playlists) req.session.playlists = [];
    let found = req.session.playlists.find((p) => p.id === id || p.playlistId === id || p.id === cleanPlId);
    if (found) {
      if (!found.tracks) found.tracks = [];
      const exists = found.tracks.some((t: any) => {
        const tVid = extractCleanVideoId(t.youtubeVideoId || t.id);
        return tVid === vId;
      });
      if (!exists) {
        found.tracks.push(cleanTrack);
        found.tracksCount = found.tracks.length;
      }
    }
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

      if (addRes.status === 401 && req.session?.tokens?.refresh_token) {
        console.log(`[YouTube API] 401 Unauthorized on add item, refreshing token...`);
        const refreshed = await refreshAccessToken(req);
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

      const addData = await addRes.json();
      if (addRes.ok && addData.id) {
        syncedToYouTube = true;
        newPlaylistItemId = addData.id;
        cleanTrack.id = addData.id;
        cleanTrack.playlistItemId = addData.id;
        console.log(`[YouTube API] Successfully committed video ${vId} to YouTube playlist ${cleanPlId}. Item ID: ${addData.id}`);
      } else {
        const detailErr = addData.error?.message || `YouTube API HTTP ${addRes.status}`;
        errorMessage = detailErr;
        console.warn(`[YouTube API] Playlist item commit failed (${addRes.status}):`, detailErr);
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

app.delete("/api/youtube/playlists/:id/items/:trackId", async (req, res) => {
  const { id, trackId } = req.params;
  const cleanPlId = id.replace(/^VL/, "");
  const decodedTrackId = decodeURIComponent(trackId);
  const vId = extractCleanVideoId(decodedTrackId);

  // If local custom playlist
  if (cleanPlId.startsWith("pl_custom_")) {
    if (req.session?.playlists) {
      const found = req.session.playlists.find((p) => p.id === id || p.playlistId === id || p.id === cleanPlId);
      if (found && found.tracks) {
        found.tracks = found.tracks.filter((t: any) => {
          const tVid = extractCleanVideoId(t.youtubeVideoId || t.id);
          const tPlItemId = t.playlistItemId || t.id;
          return t.id !== decodedTrackId && t.youtubeVideoId !== decodedTrackId && tVid !== vId && tPlItemId !== decodedTrackId;
        });
        found.tracksCount = found.tracks.length;
      }
    }
  }

  let syncedToYouTube = false;
  try {
    let accessToken = await getValidAccessToken(req);
    if (accessToken && cleanPlId && !cleanPlId.startsWith("pl_custom_")) {
      // Fetch live playlist items from YouTube Data API to locate the playlistItemId
      let plItemsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=id,snippet,contentDetails&playlistId=${cleanPlId}&maxResults=50`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (plItemsRes.status === 401 && req.session?.tokens?.refresh_token) {
        const refreshed = await refreshAccessToken(req);
        if (refreshed) {
          accessToken = refreshed;
          plItemsRes = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=id,snippet,contentDetails&playlistId=${cleanPlId}&maxResults=50`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
        }
      }

      const plItemsData = await plItemsRes.json();
      if (plItemsData.items && Array.isArray(plItemsData.items)) {
        const matchingItem = plItemsData.items.find((it: any) => {
          const itemVid = it.contentDetails?.videoId || it.snippet?.resourceId?.videoId;
          return it.id === decodedTrackId || (vId && itemVid === vId);
        });

        if (matchingItem?.id) {
          const delRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?id=${matchingItem.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (delRes.ok || delRes.status === 204) {
            syncedToYouTube = true;
          } else {
            console.warn("YouTube API delete playlistItem non-ok:", delRes.status);
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
  const result = await syncPlaylistTracksToYouTube(req, id, tracks || []);
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
    const sessionPlaylists = req.session.playlists || localPlaylistsStore || [];

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
      mixes: req.session.playlists || localPlaylistsStore || [],
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

app.get("/api/youtube/lyrics", async (req, res) => {
  const title = (req.query.title as string) || "Song";
  const artist = (req.query.artist as string) || "Artist";

  // Use Gemini client if available for AI synchronized lyrics generation or fallback
  const ai = getGeminiClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Generate timed LRC format lyrics for the song "${title}" by "${artist}". Output ONLY valid LRC formatted lines with [mm:ss.xx] timestamps and lyric text.`
      });
      if (response.text) {
        return res.json({ lyricsRaw: response.text });
      }
    } catch (e) {
      console.warn("Gemini lyrics generation fallback:", e);
    }
  }

  // Fallback LRC lyrics
  const fallbackLrc = `[00:05.00] ${title} - ${artist}
[00:12.00] Driving through the neon lights of the night
[00:20.00] Waves of sound vibrating deep inside
[00:28.00] Feel the rhythm take control of your soul
[00:36.00] Lost in the Oblivion soundscape
[00:45.00] Music plays on endlessly forever
[00:55.00] Echoes of the melody softly fading
[01:05.00] Oblivion YouTube Music Experience`;

  res.json({ lyricsRaw: fallbackLrc });
});

app.get("/api/youtube/similar", async (req, res) => {
  const title = (req.query.title as string) || "";
  const artist = (req.query.artist as string) || "";
  const genre = (req.query.genre as string) || "Music";

  try {
    const accessToken = await getValidAccessToken(req);
    const searchQuery = `${artist} ${genre} music`;
    const results = await searchYouTubeMusic(searchQuery, accessToken || undefined);
    res.json({ similarTracks: deduplicateById(results || []) });
  } catch (err) {
    console.error("Error in /api/youtube/similar:", err);
    res.json({ similarTracks: [] });
  }
});

app.get("/api/auth/google/callback", async (req, res) => {
  const code = req.query.code as string;
  const error = req.query.error as string;

  if (error || !code) {
    return res.send(`
      <script>
        if (window.opener) {
          window.opener.postMessage({ type: 'OAUTH_ERROR', error: '${error || "No auth code provided"}' }, '*');
          window.close();
        } else {
          window.location.href = '/?oauth_error=${encodeURIComponent(error || "Failed")}'
        }
      </script>
    `);
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

      req.session.user = {
        id: userData.id,
        name: userData.name || userData.email?.split("@")[0] || "User",
        email: userData.email || "",
        picture: userData.picture || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
        accessToken: tokenData.access_token,
      };

      // Persist to server disk store so restarts never lose the refresh_token and user info
      const allTokens = readStoredTokens();
      const userKey = userData.id || userData.email || "default_user";
      allTokens[userKey] = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || allTokens[userKey]?.refresh_token,
        expires_at: Date.now() + tokenData.expires_in * 1000,
        user: req.session.user,
        updated_at: Date.now(),
      };
      writeStoredTokens(allTokens);

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("Session save error:", saveErr);
          return res.send(`
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_ERROR', error: 'Session save failed' }, '*');
                window.close();
              } else {
                window.location.href = '/?oauth_error=' + encodeURIComponent('Session save failed');
              }
            </script>
          `);
        }

        return res.send(`
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_SUCCESS',
                user: ${JSON.stringify(req.session.user)}
              }, '*');
              window.close();
            } else {
              window.location.href = '/?oauth_success=true&user=' + encodeURIComponent(JSON.stringify(${JSON.stringify(req.session.user)}));
            }
          </script>
        `);
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
    return res.send(`
      <script>
        if (window.opener) {
          window.opener.postMessage({ type: 'OAUTH_ERROR', error: ${JSON.stringify(errorMsg)} }, '*');
          window.close();
        } else {
          window.location.href = '/?oauth_error=${encodeURIComponent(errorMsg)}';
        }
      </script>
    `);
  }
});

app.get("/api/auth/me", (req, res) => {
  if (req.session?.user) {
    return res.json({
      isLoggedIn: true,
      user: req.session.user,
    });
  }

  // Fallback to disk store if session was cleared on server reload
  const allTokens = readStoredTokens();
  const entries = Object.values(allTokens);
  if (entries.length > 0) {
    const latest = entries[entries.length - 1] as any;
    if (latest?.user && latest?.access_token) {
      req.session.tokens = {
        access_token: latest.access_token,
        refresh_token: latest.refresh_token,
        expires_at: latest.expires_at,
      };
      req.session.user = latest.user;
      return res.json({
        isLoggedIn: true,
        user: latest.user,
      });
    }
  }

  res.json({
    isLoggedIn: false,
    user: null,
  });
});

app.post("/api/auth/logout", (req, res) => {
  try {
    writeStoredTokens({});
  } catch {}
  req.session.destroy(() => {
    res.json({ success: true });
  });
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