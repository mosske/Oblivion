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
    };
    playlists?: any[];
  }
}

let localPlaylistsStore: any[] = [];

async function getPlaylistItemsFromYouTube(accessToken: string, playlistId: string): Promise<any[]> {
  try {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems`;
    const params = new URLSearchParams({
      playlistId,
      part: 'snippet,contentDetails',
      maxResults: '50',
      access_token: accessToken
    });

    const response = await fetch(`${url}?${params}`);
    const data = await response.json();

    if (!data.items) return [];

    return data.items.map((item: any) => ({
      id: item.contentDetails?.videoId || item.id,
      youtubeVideoId: item.contentDetails?.videoId,
      title: item.snippet?.title || 'Unknown',
      artist: item.snippet?.channelTitle || 'Unknown Artist',
      album: '',
      duration: 0,
      coverUrl: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
      audioUrl: `https://www.youtube.com/watch?v=${item.contentDetails?.videoId}`,
      genre: 'Music',
      playsCount: 0
    }));
  } catch (err) {
    console.error('Error fetching YouTube playlist items:', err);
    return [];
  }
}

async function searchYouTubeMusic(query: string, accessToken?: string): Promise<any[]> {
  try {
    const url = `https://www.googleapis.com/youtube/v3/search`;
    const params = new URLSearchParams({
      q: query,
      part: 'snippet',
      type: 'video',
      videoCategoryId: '10',
      maxResults: '20',
      relevanceLanguage: 'en'
    });

    if (accessToken) {
      params.append('access_token', accessToken);
    } else {
      params.append('key', process.env.YOUTUBE_API_KEY || '');
    }

    const response = await fetch(`${url}?${params}`);
    const data = await response.json();

    if (!data.items) return [];

    return data.items.map((item: any) => ({
      id: item.id?.videoId || item.id,
      youtubeVideoId: item.id?.videoId,
      title: item.snippet?.title || 'Unknown',
      artist: item.snippet?.channelTitle || 'Unknown Artist',
      album: '',
      duration: 0,
      coverUrl: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
      audioUrl: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
      genre: 'Music',
      playsCount: 0
    }));
  } catch (err) {
    console.error('Error searching YouTube:', err);
    return [];
  }
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") return null;
  return new GoogleGenAI({ apiKey });
}

function getBaseUrl(req: express.Request) {
  if (process.env.APP_URL && !process.env.APP_URL.includes("MY_APP_URL")) {
    return process.env.APP_URL.replace(/\/$/, "");
  }
  const rawHost = req.headers["x-forwarded-host"] || req.headers.host || "";
  const host = Array.isArray(rawHost) ? rawHost[0] : String(rawHost).split(",")[0].trim();
  const rawProto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const proto = Array.isArray(rawProto) ? rawProto[0] : String(rawProto).split(",")[0].trim();

  if (host) {
    return `${proto}://${host}`;
  }
  return "https://oblivion-rho.vercel.app";
}

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

function sanitizeCredential(val: string | undefined | null): string {
  if (!val) return "";
  let clean = String(val).trim();
  while (
    (clean.startsWith('\"') && clean.endsWith('\"')) ||
    (clean.startsWith("'") && clean.endsWith("'")) ||
    (clean.startsWith('`') && clean.endsWith('`'))
  ) {
    clean = clean.slice(1, -1).trim();
  }
  clean = clean.replace(/[\\r\\n\\t\\f\\v]/g, "").trim();
  return clean;
}

let storedClientId = "";
let storedClientSecret = "";

function getOAuthClientId(): string {
  const envVal = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || process.env.CLIENT_ID || "";
  return sanitizeCredential(storedClientId || envVal);
}

function getOAuthClientSecret(): string {
  const envVal = process.env.GOOGLE_CLIENT_SECRET || process.env.VITE_GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET || "";
  return sanitizeCredential(storedClientSecret || envVal);
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
              window.location.href = '/';
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
  if (process.env.VITE_DEV === "true") {
    try {
      const { createServer } = await import("vite");
      const viteApp = await createServer({
        server: { middlewareMode: true },
      });
      app.use(viteApp.middlewares);
    } catch (e) {
      console.warn("Could not start Vite dev middleware:", e);
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Oblivion YouTube Music Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

export default app;