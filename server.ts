import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import session from "express-session";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "oblivion-ytmusic-secret-key-2026",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // http in preview
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  })
);

// Declare session types
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
    };
    playlists?: any[];
  }
}

// In-memory fallback playlist store for guest / demo users or modified playlists
let localPlaylistsStore: any[] = [
  {
    id: "pl_midnight_synth",
    title: "Synthwave Oblivion",
    description: "Deep neon electronic rhythms & nocturnal beats.",
    coverUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80",
    isYouTubeSynced: true,
    tracksCount: 5,
    updatedAt: "2026-08-06T06:00:00.000Z",
    tracks: [
      {
        id: "yt_01",
        youtubeVideoId: "4xDzrJKXOOY",
        title: "Resonance",
        artist: "HOME",
        album: "Odyssey",
        duration: 212,
        coverUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
        audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        genre: "Chillwave",
        playsCount: 1420000
      },
      {
        id: "yt_02",
        youtubeVideoId: "fTrs_3Kx7U8",
        title: "Sunset Sunset",
        artist: "Kavinsky",
        album: "OutRun",
        duration: 198,
        coverUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
        audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
        genre: "Synthwave",
        playsCount: 980000
      },
      {
        id: "yt_03",
        youtubeVideoId: "vN08m_G1410",
        title: "After Hours",
        artist: "The Weeknd",
        album: "After Hours",
        duration: 361,
        coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
        audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
        genre: "R&B / Synthpop",
        playsCount: 3200000
      },
      {
        id: "yt_04",
        youtubeVideoId: "5y3P930G30A",
        title: "Turbo Killer",
        artist: "Carpenter Brut",
        album: "Trilogy",
        duration: 208,
        coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
        audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
        genre: "Darksynth",
        playsCount: 870000
      },
      {
        id: "yt_05",
        youtubeVideoId: "aFkX3a0y1a8",
        title: "Starboy",
        artist: "Daft Punk & The Weeknd",
        album: "Starboy",
        duration: 230,
        coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
        audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
        genre: "Pop Electro",
        playsCount: 4100000
      }
    ]
  },
  {
    id: "pl_lofi_focus",
    title: "Oblivion Chill & Lofi",
    description: "Relaxing study sessions & ambient background audio.",
    coverUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80",
    isYouTubeSynced: true,
    tracksCount: 4,
    updatedAt: "2026-08-05T18:30:00.000Z",
    tracks: [
      {
        id: "yt_06",
        youtubeVideoId: "5qap5aO4i9A",
        title: "Lofi Hip Hop Radio Beat",
        artist: "Lofi Girl",
        album: "Beats to Relax",
        duration: 184,
        coverUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80",
        audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
        genre: "Lofi Chill",
        playsCount: 8900000
      },
      {
        id: "yt_07",
        youtubeVideoId: "2OEL4P1r404",
        title: "Midnight Walk",
        artist: "ChilledCow",
        album: "Night Dreams",
        duration: 165,
        coverUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80",
        audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
        genre: "Ambient",
        playsCount: 1560000
      },
      {
        id: "yt_08",
        youtubeVideoId: "9S_63xL1b00",
        title: "Coffee Shop Rain",
        artist: "Jazz Hop Cafe",
        album: "Acoustic Spaces",
        duration: 210,
        coverUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80",
        audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
        genre: "Jazz Lofi",
        playsCount: 2300000
      },
      {
        id: "yt_09",
        youtubeVideoId: "8Z0a06c11a0",
        title: "Stargazing",
        artist: "Nujabes Vibe",
        album: "Modal Soul Legacy",
        duration: 245,
        coverUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80",
        audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
        genre: "Instrumental",
        playsCount: 1800000
      }
    ]
  }
];

// Helper to get Gemini client if API key is present
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") return null;
  return new GoogleGenAI({ apiKey });
}

// Helper for dynamic app base URL
function getBaseUrl(req: express.Request) {
  if (process.env.APP_URL && !process.env.APP_URL.includes("MY_APP_URL")) {
    return process.env.APP_URL.replace(/\/$/, "");
  }
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "http";
  return `${proto}://${host}`;
}

// Helper to refresh Google access token if expired
async function getValidAccessToken(req: express.Request): Promise<string | null> {
  if (!req.session?.tokens) return null;
  const { access_token, refresh_token, expires_at } = req.session.tokens;
  
  if (expires_at && Date.now() < expires_at - 60000) {
    return access_token;
  }

  if (!refresh_token) return access_token;

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET;

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
      req.session.tokens.expires_at = Date.now() + data.expires_in * 1000;
      return data.access_token;
    }
  } catch (err) {
    console.error("Token refresh error:", err);
  }

  return access_token;
}

// -------------------------------------------------------------
// AUTH ROUTES
// -------------------------------------------------------------

let storedClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || process.env.CLIENT_ID || "";
let storedClientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.VITE_GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET || "";

function getOAuthClientId(): string {
  return process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || process.env.CLIENT_ID || storedClientId;
}

function getOAuthClientSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET || process.env.VITE_GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET || storedClientSecret;
}

// Get Google OAuth Configuration Status
app.get("/api/auth/google/config", (req, res) => {
  const clientId = getOAuthClientId();
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  res.json({
    configured: Boolean(clientId),
    clientId: clientId || "",
    hasSecret: Boolean(getOAuthClientSecret()),
    redirectUri,
  });
});

// Update Google OAuth Configuration Status at runtime
app.post("/api/auth/google/config", (req, res) => {
  const { clientId, clientSecret } = req.body || {};
  if (typeof clientId === "string") {
    storedClientId = clientId.trim();
  }
  if (typeof clientSecret === "string") {
    storedClientSecret = clientSecret.trim();
  }

  const activeClientId = getOAuthClientId();
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  res.json({
    success: true,
    configured: Boolean(activeClientId),
    clientId: activeClientId,
    redirectUri,
  });
});

// Get Google OAuth URL
app.get("/api/auth/google/url", (req, res) => {
  const clientId = getOAuthClientId();
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  if (!clientId) {
    return res.status(400).json({
      configured: false,
      redirectUri,
      error: "Google OAuth Client ID is not configured. Please enter your Google Client ID or configure environment variables.",
    });
  }

  const scopes = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
  ].join(" ");

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    access_type: "offline",
    prompt: "consent",
  }).toString();

  res.json({
    configured: true,
    url: authUrl,
    redirectUri,
  });
});

// Initiate Google Login
app.get("/api/auth/google", (req, res) => {
  const clientId = getOAuthClientId();
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  if (!clientId) {
    return res.status(500).send(`
      <html>
        <body style="font-family:sans-serif; background:#0f172a; color:#f8fafc; padding:2rem; text-align:center;">
          <h2>Google OAuth Client ID Not Configured</h2>
          <p>Please configure process.env.GOOGLE_CLIENT_ID or process.env.CLIENT_ID in settings.</p>
          <p>Callback URL required: <code>${redirectUri}</code></p>
          <button onclick="window.close()" style="padding:10px 20px; background:#06b6d4; color:#000; border:none; border-radius:8px; cursor:pointer;">Close Window</button>
        </body>
      </html>
    `);
  }

  const scopes = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
  ].join(" ");

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    access_type: "offline",
    prompt: "consent",
  }).toString();

  res.redirect(authUrl);
});

// OAuth Callback
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
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId || "",
        client_secret: clientSecret || "",
        code: code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.access_token) {
      req.session.tokens = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: Date.now() + tokenData.expires_in * 1000,
      };

      // Fetch User Info
      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userData = await userRes.json();

      req.session.user = {
        id: userData.id,
        name: userData.name || userData.email.split("@")[0],
        email: userData.email,
        picture: userData.picture || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
      };

      return res.send(`
        <script>
          if (window.opener) {
            window.opener.postMessage({
              type: 'OAUTH_SUCCESS',
              user: ${JSON.stringify(req.session.user)}
            }, '*');
            window.close();
          } else {
            window.location.href = '/';
          }
        </script>
      `);
    } else {
      throw new Error(tokenData.error_description || "Failed to acquire tokens");
    }
  } catch (err: any) {
    console.error("OAuth token exchange error:", err);
    return res.send(`
      <script>
        if (window.opener) {
          window.opener.postMessage({ type: 'OAUTH_ERROR', error: '${encodeURIComponent(err.message)}' }, '*');
          window.close();
        } else {
          window.location.href = '/?oauth_error=failed';
        }
      </script>
    `);
  }
});

// Get current user session
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

// Logout
app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// -------------------------------------------------------------
// YOUTUBE MUSIC & PLAYLISTS ROUTES
// -------------------------------------------------------------

// Fetch Playlists (YouTube API with local fallback/sync)
app.get("/api/youtube/playlists", async (req, res) => {
  const token = await getValidAccessToken(req);

  if (token) {
    try {
      const ytRes = await fetch(
        "https://www.googleapis.com/youtube/v3/playlists?mine=true&part=snippet,contentDetails,status&maxResults=50",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await ytRes.json();

      if (data.items) {
        const syncedPlaylists = data.items.map((item: any, idx: number) => ({
          id: item.id,
          title: item.snippet.title,
          description: item.snippet.description || "YouTube Synced Playlist",
          coverUrl:
            item.snippet.thumbnails?.high?.url ||
            item.snippet.thumbnails?.medium?.url ||
            `https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80`,
          isYouTubeSynced: true,
          tracksCount: item.contentDetails?.itemCount || 0,
          updatedAt: item.snippet.publishedAt || new Date().toISOString(),
          tracks: [],
        }));

        // Merge with local created playlists
        const combined = [...syncedPlaylists];
        for (const lp of localPlaylistsStore) {
          if (!combined.some((p) => p.id === lp.id)) {
            combined.push(lp);
          }
        }
        return res.json({ playlists: combined, isLiveYouTube: true });
      }
    } catch (err) {
      console.error("YouTube playlists error:", err);
    }
  }

  // Fallback to local user playlists
  return res.json({ playlists: localPlaylistsStore, isLiveYouTube: false });
});

// Fetch Single Playlist Items
app.get("/api/youtube/playlists/:id/items", async (req, res) => {
  const { id } = req.params;
  const token = await getValidAccessToken(req);

  // Check if it's in local store first
  const localPlaylist = localPlaylistsStore.find((p) => p.id === id);
  if (localPlaylist && localPlaylist.tracks && localPlaylist.tracks.length > 0) {
    return res.json({ playlist: localPlaylist, tracks: localPlaylist.tracks });
  }

  if (token) {
    try {
      const ytRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?playlistId=${id}&part=snippet,contentDetails&maxResults=50`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await ytRes.json();

      if (data.items) {
        const tracks = data.items.map((item: any, idx: number) => {
          const vid = item.snippet.resourceId.videoId;
          return {
            id: item.id,
            youtubeVideoId: vid,
            title: item.snippet.title,
            artist: item.snippet.videoOwnerChannelTitle || item.snippet.channelTitle || "YouTube Artist",
            album: item.snippet.playlistTitle || "YouTube Music Collection",
            duration: 210,
            coverUrl:
              item.snippet.thumbnails?.high?.url ||
              item.snippet.thumbnails?.medium?.url ||
              "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
            audioUrl: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${(idx % 15) + 1}.mp3`,
            genre: "YouTube Music",
            playsCount: Math.floor(Math.random() * 800000) + 100000,
          };
        });

        return res.json({
          playlistId: id,
          tracks,
        });
      }
    } catch (err) {
      console.error("YouTube playlist items error:", err);
    }
  }

  return res.json({
    playlistId: id,
    tracks: localPlaylist ? localPlaylist.tracks : [],
  });
});

// Create Playlist
app.post("/api/youtube/playlists", async (req, res) => {
  const { title, description, coverUrl } = req.body;
  const token = await getValidAccessToken(req);

  const newPlaylist = {
    id: `pl_${Date.now()}`,
    title: title || "New Oblivion Playlist",
    description: description || "Created with Oblivion YouTube Music",
    coverUrl: coverUrl || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80",
    isYouTubeSynced: !!token,
    tracksCount: 0,
    updatedAt: new Date().toISOString(),
    tracks: [],
  };

  if (token) {
    try {
      const ytRes = await fetch("https://www.googleapis.com/youtube/v3/playlists?part=snippet,status", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          snippet: {
            title: newPlaylist.title,
            description: newPlaylist.description,
          },
          status: {
            privacyStatus: "private",
          },
        }),
      });
      const data = await ytRes.json();
      if (data.id) {
        newPlaylist.id = data.id;
      }
    } catch (err) {
      console.error("YouTube playlist creation error:", err);
    }
  }

  localPlaylistsStore.unshift(newPlaylist);
  res.json({ success: true, playlist: newPlaylist });
});

// Update Playlist (Title, Description, Cover image)
app.put("/api/youtube/playlists/:id", async (req, res) => {
  const { id } = req.params;
  const { title, description, coverUrl } = req.body;
  const token = await getValidAccessToken(req);

  const playlist = localPlaylistsStore.find((p) => p.id === id);
  if (playlist) {
    if (title !== undefined) playlist.title = title;
    if (description !== undefined) playlist.description = description;
    if (coverUrl !== undefined) playlist.coverUrl = coverUrl;
    playlist.updatedAt = new Date().toISOString();
  }

  if (token) {
    try {
      await fetch("https://www.googleapis.com/youtube/v3/playlists?part=snippet", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: id,
          snippet: {
            title: title || playlist?.title || "Playlist",
            description: description || playlist?.description || "",
          },
        }),
      });
    } catch (err) {
      console.error("YouTube update playlist error:", err);
    }
  }

  res.json({ success: true, playlist });
});

// Delete Playlist
app.delete("/api/youtube/playlists/:id", async (req, res) => {
  const { id } = req.params;
  const token = await getValidAccessToken(req);

  localPlaylistsStore = localPlaylistsStore.filter((p) => p.id !== id);

  if (token) {
    try {
      await fetch(`https://www.googleapis.com/youtube/v3/playlists?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("YouTube playlist deletion error:", err);
    }
  }

  res.json({ success: true });
});

// Add Track to Playlist
app.post("/api/youtube/playlists/:id/items", async (req, res) => {
  const { id } = req.params;
  const { track } = req.body;
  const token = await getValidAccessToken(req);

  const playlist = localPlaylistsStore.find((p) => p.id === id);
  if (playlist) {
    playlist.tracks.push(track);
    playlist.tracksCount = playlist.tracks.length;
    playlist.updatedAt = new Date().toISOString();
  }

  if (token && track?.youtubeVideoId) {
    try {
      await fetch("https://www.googleapis.com/youtube/v3/playlistItems?part=snippet", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          snippet: {
            playlistId: id,
            resourceId: {
              kind: "youtube#video",
              videoId: track.youtubeVideoId,
            },
          },
        }),
      });
    } catch (err) {
      console.error("YouTube playlist item add error:", err);
    }
  }

  res.json({ success: true, tracks: playlist ? playlist.tracks : [] });
});

// Remove Track from Playlist
app.delete("/api/youtube/playlists/:id/items/:itemId", async (req, res) => {
  const { id, itemId } = req.params;
  const token = await getValidAccessToken(req);

  const playlist = localPlaylistsStore.find((p) => p.id === id);
  if (playlist) {
    playlist.tracks = playlist.tracks.filter((t: any) => t.id !== itemId && t.youtubeVideoId !== itemId);
    playlist.tracksCount = playlist.tracks.length;
    playlist.updatedAt = new Date().toISOString();
  }

  if (token) {
    try {
      await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?id=${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("YouTube playlist item delete error:", err);
    }
  }

  res.json({ success: true, tracks: playlist ? playlist.tracks : [] });
});

// Reorder Playlist Items
app.put("/api/youtube/playlists/:id/reorder", (req, res) => {
  const { id } = req.params;
  const { tracks } = req.body;

  const playlist = localPlaylistsStore.find((p) => p.id === id);
  if (playlist) {
    playlist.tracks = tracks;
    playlist.updatedAt = new Date().toISOString();
  }

  res.json({ success: true, tracks });
});

// Search YouTube Tracks, Albums, Artists
app.get("/api/youtube/search", async (req, res) => {
  const { q, type } = req.query;
  const queryStr = (q as string || "Synthwave").trim();
  const token = await getValidAccessToken(req);

  if (token) {
    try {
      const ytRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?q=${encodeURIComponent(queryStr + " music")}&type=video,playlist&part=snippet&maxResults=25`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await ytRes.json();

      if (data.items) {
        const results = data.items.map((item: any, idx: number) => {
          const isPlaylist = item.id.kind === "youtube#playlist";
          return {
            id: isPlaylist ? item.id.playlistId : item.id.videoId,
            youtubeVideoId: isPlaylist ? undefined : item.id.videoId,
            type: isPlaylist ? "playlist" : "track",
            title: item.snippet.title,
            artist: item.snippet.channelTitle,
            album: isPlaylist ? "YouTube Playlist" : "YouTube Single",
            duration: 195 + (idx * 17) % 120,
            coverUrl:
              item.snippet.thumbnails?.high?.url ||
              item.snippet.thumbnails?.medium?.url ||
              "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
            audioUrl: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${(idx % 15) + 1}.mp3`,
            genre: "YouTube Music",
            playsCount: Math.floor(Math.random() * 2000000) + 500000,
          };
        });

        return res.json({ results });
      }
    } catch (err) {
      console.error("YouTube search API error:", err);
    }
  }

  // Generative / Rich Search Fallback
  const catalog = [
    {
      id: "search_01",
      youtubeVideoId: "kJQP7kiw5Fk",
      type: "track",
      title: "Despacito (Acoustic Oblivion Mix)",
      artist: "Luis Fonsi ft. Daddy Yankee",
      album: "Vida",
      duration: 228,
      coverUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      genre: "Latin Pop",
      playsCount: 9400000,
    },
    {
      id: "search_02",
      youtubeVideoId: "OPf0YbXqDm0",
      type: "track",
      title: "Uptown Funk Electro Edit",
      artist: "Mark Ronson ft. Bruno Mars",
      album: "Uptown Special",
      duration: 270,
      coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      genre: "Funk / Pop",
      playsCount: 8100000,
    },
    {
      id: "search_03",
      youtubeVideoId: "fJ9rUzIMcZQ",
      type: "track",
      title: "Bohemian Rhapsody Live Synth",
      artist: "Queen",
      album: "A Night at the Opera",
      duration: 354,
      coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
      genre: "Rock Legend",
      playsCount: 12500000,
    },
    {
      id: "search_04",
      youtubeVideoId: "YQHsXMglC9A",
      type: "track",
      title: "Hello (Night Vibe Edition)",
      artist: "Adele",
      album: "25",
      duration: 295,
      coverUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
      genre: "Soul Pop",
      playsCount: 6800000,
    },
    {
      id: "search_05",
      youtubeVideoId: "JGwWNGJdvx8",
      type: "artist",
      title: "Ed Sheeran",
      artist: "Official Artist Channel",
      album: "Artist Profile",
      duration: 0,
      coverUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
      audioUrl: "",
      genre: "Pop / Acoustic",
      playsCount: 18000000,
    },
    {
      id: "search_06",
      youtubeVideoId: "e-ORhEE9VVg",
      type: "album",
      title: "Blinding Lights Deluxe",
      artist: "The Weeknd",
      album: "After Hours",
      duration: 1200,
      coverUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
      genre: "Synthpop",
      playsCount: 15400000,
    }
  ];

  const filtered = catalog.filter(
    (item) =>
      item.title.toLowerCase().includes(queryStr.toLowerCase()) ||
      item.artist.toLowerCase().includes(queryStr.toLowerCase()) ||
      item.genre.toLowerCase().includes(queryStr.toLowerCase())
  );

  res.json({ results: filtered.length > 0 ? filtered : catalog });
});

// Recommendations / Home Feed
app.get("/api/youtube/recommendations", (req, res) => {
  const recommendations = {
    trendingTracks: [
      {
        id: "rec_01",
        youtubeVideoId: "09R8_2nJtjg",
        title: "Starboy Midnight Drive",
        artist: "The Weeknd ft. Daft Punk",
        album: "Starboy",
        duration: 230,
        coverUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
        audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        genre: "Electro Pop",
        playsCount: 5200000,
      },
      {
        id: "rec_02",
        youtubeVideoId: "bFD4A5qN8XU",
        title: "Levitating Oblivion Edit",
        artist: "Dua Lipa",
        album: "Future Nostalgia",
        duration: 203,
        coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
        audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
        genre: "Disco Pop",
        playsCount: 4800000,
      },
      {
        id: "rec_03",
        youtubeVideoId: "H5v3kku4y6Q",
        title: "As It Was (Acoustic Echo)",
        artist: "Harry Styles",
        album: "Harry's House",
        duration: 167,
        coverUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80",
        audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
        genre: "Indie Pop",
        playsCount: 6100000,
      },
      {
        id: "rec_04",
        youtubeVideoId: "K4DyBUG242c",
        title: "Save Your Tears (Chilledwave)",
        artist: "The Weeknd & Ariana Grande",
        album: "After Hours",
        duration: 215,
        coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
        audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
        genre: "Synthwave",
        playsCount: 3900000,
      },
    ],
    topAlbums: [
      {
        id: "alb_01",
        title: "Future Nostalgia",
        artist: "Dua Lipa",
        coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
        releaseYear: "2020",
        tracksCount: 11,
      },
      {
        id: "alb_02",
        title: "Odyssey Ambient",
        artist: "HOME",
        coverUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
        releaseYear: "2014",
        tracksCount: 12,
      },
      {
        id: "alb_03",
        title: "Random Access Memories",
        artist: "Daft Punk",
        coverUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80",
        releaseYear: "2013",
        tracksCount: 13,
      },
    ],
    quickPicks: [
      {
        id: "qp_01",
        youtubeVideoId: "fTrs_3Kx7U8",
        title: "Nightcall",
        artist: "Kavinsky",
        album: "Drive OST",
        duration: 259,
        coverUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
        audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
        genre: "Electro",
        playsCount: 7800000,
      },
      {
        id: "qp_02",
        youtubeVideoId: "vN08m_G1410",
        title: "Midnight City",
        artist: "M83",
        album: "Hurry Up, We're Dreaming",
        duration: 243,
        coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
        audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
        genre: "Dream Pop",
        playsCount: 9200000,
      },
    ],
  };

  res.json(recommendations);
});

// Similar Tracks / Radio Queue Generator
app.get("/api/youtube/similar", async (req, res) => {
  const { trackId, title, artist, genre } = req.query;

  const ai = getGeminiClient();
  if (ai && title) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Generate a JSON array of 5 recommended similar music tracks for a listener who likes "${title}" by "${artist || 'Artist'}" (Genre: ${genre || 'Pop/Electronic'}).
Return strictly a JSON array of objects with keys: "title", "artist", "album", "genre", "duration" (number in seconds). No markdown, no commentary.`,
              },
            ],
          },
        ],
      });

      const text = response.text?.trim() || "";
      const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (Array.isArray(parsed) && parsed.length > 0) {
        const formatted = parsed.map((item: any, idx: number) => ({
          id: `sim_ai_${Date.now()}_${idx}`,
          youtubeVideoId: `sim_vid_${idx}`,
          title: item.title,
          artist: item.artist,
          album: item.album || "Recommended Radio",
          duration: item.duration || 210,
          coverUrl: `https://images.unsplash.com/photo-${1500000000000 + (idx * 50000)}?auto=format&fit=crop&w=600&q=80` || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
          audioUrl: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${((idx + 5) % 15) + 1}.mp3`,
          genre: item.genre || "Similar Radio",
          playsCount: Math.floor(Math.random() * 1000000) + 200000,
        }));

        return res.json({ similarTracks: formatted });
      }
    } catch (err) {
      console.error("Gemini AI similar tracks error:", err);
    }
  }

  // Fallback similar tracks
  const defaultSimilar = [
    {
      id: `sim_01`,
      youtubeVideoId: "sim_vid_01",
      title: `${title || 'Nocturnal'} - Midnight Remix`,
      artist: `${artist || 'Oblivion Sound'}`,
      album: "Oblivion Radio Volume 1",
      duration: 215,
      coverUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
      genre: "Electro Vibe",
      playsCount: 1400000,
    },
    {
      id: `sim_02`,
      youtubeVideoId: "sim_vid_02",
      title: "Stardust Waves",
      artist: "Cyber Horizon",
      album: "Neon Galaxy",
      duration: 198,
      coverUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
      genre: "Synthpop",
      playsCount: 890000,
    },
    {
      id: `sim_03`,
      youtubeVideoId: "sim_vid_03",
      title: "Echoes of Eternity",
      artist: "Lunar Tide",
      album: "Ethereal Soundscapes",
      duration: 240,
      coverUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
      genre: "Ambient Chill",
      playsCount: 2100000,
    },
    {
      id: `sim_04`,
      youtubeVideoId: "sim_vid_04",
      title: "Hyperdrive Love",
      artist: "Velocity 88",
      album: "Overdrive",
      duration: 205,
      coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3",
      genre: "Darksynth",
      playsCount: 1150000,
    }
  ];

  res.json({ similarTracks: defaultSimilar });
});

// Synchronized Timecoded Lyrics API
app.get("/api/youtube/lyrics", async (req, res) => {
  const { title, artist, duration } = req.query;
  const trackTitle = (title as string || "Resonance").trim();
  const trackArtist = (artist as string || "HOME").trim();
  const durSec = parseInt(duration as string) || 200;

  const ai = getGeminiClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Generate synchronized lyrics with timestamp timestamps for the song "${trackTitle}" by "${trackArtist}" (total duration: ${durSec} seconds).
Format each line with timing in seconds like this:
[00:12.50] Verse line text here...
[00:18.00] Next line of lyrics here...

Generate around 12 to 20 timed lines spanning across the ${durSec} seconds song duration from start to finish.
Return strictly the LRC/timed text. No markdown header, no commentary.`,
              },
            ],
          },
        ],
      });

      const text = response.text?.trim() || "";
      if (text) {
        return res.json({ lyricsRaw: text });
      }
    } catch (err) {
      console.error("Gemini AI lyrics generation error:", err);
    }
  }

  // High-quality fallback synchronized lyrics
  const sampleLyrics = `[00:05.00] (Instrumental Synth Intro)
[00:14.20] Wandering through the neon lights in the oblivion
[00:22.80] Searching for a rhythm that we lost along the way
[00:30.50] Echoes of sunset calling out your name
[00:38.10] Can you hear the electric pulse inside the rain?
[00:46.40] We turn the volume high and drift into the night
[00:54.00] Every harmonic frequency shining oh so bright
[01:02.30] (Synthesizer Solo & Bass Drop)
[01:18.60] Synced across the stars in a timeless digital haze
[01:26.10] Running through the endless digital maze
[01:34.50] Hold on tight to the memory of this sound
[01:42.90] In Oblivion YouTube Music, lost and found
[01:52.00] (Fade out into ambient reverb)`;

  res.json({ lyricsRaw: sampleLyrics });
});

// -------------------------------------------------------------
// VITE MIDDLEWARE & PRODUCTION SERVING
// -------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Oblivion YouTube Music Server listening on http://0.0.0.0:${PORT}`);
    });
  }
}

startServer();

export default app;
