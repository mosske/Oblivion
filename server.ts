import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import session from "express-session";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

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
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL),
      httpOnly: true,
      sameSite: "lax",
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

function setInCache<T>(key: string, data: T) {
  if (apiCache.size > 300) {
    const firstKey = apiCache.keys().next().value;
    if (firstKey) apiCache.delete(firstKey);
  }
  apiCache.set(key, { data, timestamp: Date.now() });
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

async function getPlaylistItemsFromYouTube(accessToken: string | null, playlistId: string): Promise<any[]> {
  const cacheKey = `pl_items:${accessToken ? 'auth' : 'pub'}:${playlistId}`;
  const cached = getFromCache<any[]>(cacheKey);
  if (cached) return cached;

  if (accessToken) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/playlistItems`;
      const params = new URLSearchParams({
        playlistId,
        part: 'snippet,contentDetails',
        maxResults: '50',
      });

      const response = await fetch(`${url}?${params}`, {
        signal: AbortSignal.timeout(8000),
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const items = data.items.map((item: any) => ({
          id: item.contentDetails?.videoId || item.id,
          youtubeVideoId: item.contentDetails?.videoId,
          title: item.snippet?.title || 'Unknown',
          artist: item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle || 'Unknown Artist',
          album: '',
          duration: 0,
          coverUrl: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || `https://i.ytimg.com/vi/${item.contentDetails?.videoId}/hqdefault.jpg`,
          audioUrl: `/api/youtube/stream/${item.contentDetails?.videoId}`,
          genre: 'Music',
          playsCount: 0
        }));
        const deduped = deduplicateById(items);
        setInCache(cacheKey, deduped);
        return deduped;
      }
    } catch (err) {
      console.warn('YouTube API playlist items error, falling back to public extraction');
    }
  }

  // Fallback: extract videos directly from public YouTube playlist page
  const items = deduplicateById(await getPublicYouTubePlaylistItems(playlistId));
  if (items.length > 0) setInCache(cacheKey, items);
  return items;
}

async function getPublicYouTubePlaylistItems(playlistId: string): Promise<any[]> {
  const cacheKey = `pub_pl:${playlistId}`;
  const cached = getFromCache<any[]>(cacheKey);
  if (cached) return cached;

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
    if (!match) return [];
    const data = JSON.parse(match[1]);

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
              id: v.videoId,
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
                id: videoId,
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
    const deduped = deduplicateById(videoItems);
    if (deduped.length > 0) setInCache(cacheKey, deduped);
    return deduped;
  } catch (err: any) {
    if (err?.name === "TimeoutError" || err?.message?.includes("aborted")) {
      console.warn(`Public playlist fetch timed out for ${playlistId}`);
    } else {
      console.warn("Public playlist fetch note:", err?.message || err);
    }
    return [];
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

async function getValidAccessToken(req: express.Request): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token && token !== "undefined" && token !== "null") return token;
  }
  const customHeader = req.headers["x-access-token"] as string;
  if (customHeader && customHeader !== "undefined" && customHeader !== "null") return customHeader;

  if (req.query?.access_token) {
    const qToken = String(req.query.access_token).trim();
    if (qToken && qToken !== "undefined" && qToken !== "null") return qToken;
  }

  if (!req.session?.tokens) return null;
  const { access_token, refresh_token, expires_at } = req.session.tokens;
  
  if (expires_at && Date.now() < expires_at - 60000) {
    return access_token;
  }

  if (!refresh_token) return access_token;

  const clientId = getOAuthClientId();
  const clientSecret = getOAuthClientSecret();

  if (!clientId || !clientSecret) return access_token;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refresh_token,
        grant_type: "refresh_token",
      }),
    });

    const data = await res.json();
    if (data.access_token) {
      req.session.tokens.access_token = data.access_token;
      req.session.tokens.expires_at = Date.now() + (data.expires_in || 3600) * 1000;
      return data.access_token;
    }
  } catch (err) {
    console.error("Token refresh error:", err);
  }

  return access_token;
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
    "https://www.googleapis.com/auth/youtube.readonly"
  ];

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent"
  });

  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
});

// Default seed playlists and tracks (empty - no demo data)
const DEFAULT_PLAYLISTS: any[] = [];

// YouTube Music API Routes - Pulls authentic YouTube content and user playlists
app.get("/api/youtube/playlists", async (req, res) => {
  try {
    const accessToken = await getValidAccessToken(req);
    let ytPlaylists: any[] = [];

    if (accessToken) {
      try {
        // Fetch User's actual playlists from YouTube Data API
        const ytRes = await fetch(
          "https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails,status&mine=true&maxResults=50",
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        const ytData = await ytRes.json();
        if (ytData.items && Array.isArray(ytData.items)) {
          ytPlaylists = ytData.items.map((item: any) => ({
            id: item.id,
            playlistId: item.id,
            title: item.snippet?.title || "YouTube Playlist",
            description: item.snippet?.description || "Synced from your YouTube Music library",
            coverUrl:
              item.snippet?.thumbnails?.maxres?.url ||
              item.snippet?.thumbnails?.high?.url ||
              item.snippet?.thumbnails?.medium?.url ||
              item.snippet?.thumbnails?.default?.url ||
              "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80",
            isYouTubeSynced: true,
            tracksCount: item.contentDetails?.itemCount || 0,
            tracks: [],
          }));
        }

        // Try to fetch Liked Videos / Liked Music playlist (id: LL)
        try {
          const likedRes = await fetch(
            "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=LL&maxResults=25",
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
          const likedData = await likedRes.json();
          if (likedData.items && likedData.items.length > 0) {
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
        } catch (likedErr) {
          console.log("Liked music fetch note:", likedErr);
        }
      } catch (e) {
        console.warn("Failed to fetch user YouTube playlists:", e);
      }
    }

    const sessionPlaylists = req.session.playlists || localPlaylistsStore || [];
    let combined = [...sessionPlaylists];

    // Merge authentic YouTube playlists
    for (const ytp of ytPlaylists) {
      const idx = combined.findIndex((p) => p.id === ytp.id || p.playlistId === ytp.id);
      if (idx >= 0) {
        combined[idx] = { ...combined[idx], ...ytp };
      } else {
        combined.unshift(ytp);
      }
    }

    // If no user playlists exist yet, fetch live trending YouTube Music playlists
    if (combined.length === 0) {
      try {
        const publicPlaylists = await searchYouTubePlaylistsPublic("Today's Top Hits Music");
        if (publicPlaylists && publicPlaylists.length > 0) {
          combined = publicPlaylists.slice(0, 10);
        }
      } catch (e) {
        console.warn("Live public playlist pull fallback:", e);
      }
    }

    res.json({ playlists: deduplicateById(combined) });
  } catch (err: any) {
    console.error("Error in /api/youtube/playlists:", err);
    res.json({ playlists: [] });
  }
});

app.get("/api/youtube/playlists/:id/items", async (req, res) => {
  const { id } = req.params;
  try {
    const accessToken = await getValidAccessToken(req);
    
    // Check session or local store first
    const allPlaylists = req.session.playlists || localPlaylistsStore || [];
    const found = allPlaylists.find(p => p.id === id || p.playlistId === id);

    if (found && found.tracks && found.tracks.length > 0) {
      return res.json({ tracks: found.tracks });
    }

    if (id) {
      const ytTracks = await getPlaylistItemsFromYouTube(accessToken, id);
      if (ytTracks && ytTracks.length > 0) {
        if (found) {
          found.tracks = ytTracks;
        }
        return res.json({ tracks: ytTracks });
      }
    }

    res.json({ tracks: found?.tracks || [] });
  } catch (err) {
    console.error(`Error in /api/youtube/playlists/${id}/items:`, err);
    res.json({ tracks: [] });
  }
});

app.post("/api/youtube/playlists", (req, res) => {
  const { title, description, coverUrl } = req.body;
  const newPlaylist = {
    id: `pl_custom_${Date.now()}`,
    title: title || "New Playlist",
    description: description || "",
    coverUrl: coverUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80",
    isYouTubeSynced: false,
    tracks: []
  };

  if (!req.session.playlists) req.session.playlists = [...localPlaylistsStore];
  req.session.playlists.unshift(newPlaylist);
  localPlaylistsStore = req.session.playlists;

  res.json({ playlist: newPlaylist });
});

app.put("/api/youtube/playlists/:id", (req, res) => {
  const { id } = req.params;
  const { title, description, coverUrl } = req.body;

  if (!req.session.playlists) req.session.playlists = [...localPlaylistsStore];
  req.session.playlists = req.session.playlists.map(p => {
    if (p.id === id) {
      return { ...p, title: title ?? p.title, description: description ?? p.description, coverUrl: coverUrl ?? p.coverUrl };
    }
    return p;
  });
  localPlaylistsStore = req.session.playlists;

  res.json({ success: true });
});

app.delete("/api/youtube/playlists/:id", (req, res) => {
  const { id } = req.params;
  if (!req.session.playlists) req.session.playlists = [...localPlaylistsStore];
  req.session.playlists = req.session.playlists.filter(p => p.id !== id);
  localPlaylistsStore = req.session.playlists;

  res.json({ success: true });
});

app.post("/api/youtube/playlists/:id/items", (req, res) => {
  const { id } = req.params;
  const { track } = req.body;

  if (!req.session.playlists) req.session.playlists = [...localPlaylistsStore];
  const found = req.session.playlists.find(p => p.id === id);
  if (found) {
    if (!found.tracks) found.tracks = [];
    found.tracks.push(track);
  }
  localPlaylistsStore = req.session.playlists;

  res.json({ success: true });
});

app.delete("/api/youtube/playlists/:id/items/:trackId", (req, res) => {
  const { id, trackId } = req.params;
  if (!req.session.playlists) req.session.playlists = [...localPlaylistsStore];
  const found = req.session.playlists.find(p => p.id === id);
  if (found && found.tracks) {
    found.tracks = found.tracks.filter((t: any) => t.id !== trackId);
  }
  localPlaylistsStore = req.session.playlists;

  res.json({ success: true });
});

app.put("/api/youtube/playlists/:id/reorder", (req, res) => {
  const { id } = req.params;
  const { tracks } = req.body;
  if (!req.session.playlists) req.session.playlists = [...localPlaylistsStore];
  const found = req.session.playlists.find(p => p.id === id);
  if (found) {
    found.tracks = tracks || [];
  }
  localPlaylistsStore = req.session.playlists;

  res.json({ success: true });
});

app.post("/api/youtube/playlists/:id/sync", (req, res) => {
  const { id } = req.params;
  const { tracks } = req.body;
  if (!req.session.playlists) req.session.playlists = [...localPlaylistsStore];
  const found = req.session.playlists.find(p => p.id === id);
  if (found) {
    found.tracks = tracks || [];
  }
  localPlaylistsStore = req.session.playlists;

  res.json({ success: true });
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
    res.json({
      isLoggedIn: true,
      user: req.session.user,
    });
  } else {
    res.json({
      isLoggedIn: false,
      user: null,
    });
  }
});

app.post("/api/auth/logout", (req, res) => {
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