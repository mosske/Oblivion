import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import session from "express-session";

const app = express();
const PORT = 3000;

app.set("trust proxy", 1);
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "oblivion-key",
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
    tokens?: { access_token: string; refresh_token?: string; expires_at?: number };
    user?: { id: string; name: string; email: string; picture: string };
  }
}

function getBaseUrl(req: express.Request) {
  const host = req.headers.host || "oblivion-rho.vercel.app";
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}`;
}

async function getValidAccessToken(req: express.Request): Promise<string | null> {
  if (!req.session?.tokens) return null;
  const { access_token, refresh_token, expires_at } = req.session.tokens;
  if (expires_at && Date.now() < expires_at - 60000) return access_token;
  if (!refresh_token) return access_token;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
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

app.get("/api/auth/google/config", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/google/callback`;
  res.json({ configured: Boolean(clientId), clientId, hasSecret: Boolean(clientSecret), redirectUri });
});

app.get("/api/auth/google/callback", async (req, res) => {
  const code = req.query.code as string;
  const error = req.query.error as string;
  if (error || !code) {
    return res.send(`<script>if (window.opener) { window.opener.postMessage({ type: 'OAUTH_ERROR', error: '${error || "No code"}' }, '*'); window.close(); }</script>`);
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/google/callback`;
  try {
    if (!clientId || !clientSecret) throw new Error("Missing OAuth config");
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, grant_type: "authorization_code", redirect_uri: redirectUri }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) throw new Error("Token exchange failed");
    req.session.tokens = { access_token: tokenData.access_token, refresh_token: tokenData.refresh_token, expires_at: Date.now() + tokenData.expires_in * 1000 };
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
    const userData = await userRes.json();
    req.session.user = { id: userData.id, name: userData.name || "User", email: userData.email || "", picture: userData.picture || "" };
    req.session.save(() => {
      res.send(`<script>if (window.opener) { window.opener.postMessage({ type: 'OAUTH_SUCCESS', user: ${JSON.stringify(req.session.user)} }, '*'); window.close(); } else { window.location.href = '/'; }</script>`);
    });
  } catch (err: any) {
    res.send(`<script>if (window.opener) { window.opener.postMessage({ type: 'OAUTH_ERROR', error: '${err.message}' }, '*'); window.close(); }</script>`);
  }
});

app.get("/api/auth/me", (req, res) => {
  res.json({ isLoggedIn: !!req.session?.user, user: req.session?.user || null });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get("/api/youtube/playlists", async (req, res) => {
  try {
    const accessToken = await getValidAccessToken(req);
    if (!accessToken) {
      return res.status(401).json({ success: false, playlists: [] });
    }
    const response = await fetch("https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=25&access_token=" + accessToken);
    if (!response.ok) {
      return res.status(500).json({ success: false, playlists: [] });
    }
    const data = await response.json();
    const playlists = (data.items || []).map((item: any) => ({
      id: item.id,
      name: item.snippet?.title || "Untitled",
      description: item.snippet?.description || "",
      coverUrl: item.snippet?.thumbnails?.medium?.url || "",
      tracks: [],
      isPrivate: false,
      createdAt: item.snippet?.publishedAt || new Date().toISOString(),
      itemCount: item.contentDetails?.itemCount || 0,
    }));
    res.json({ success: true, playlists, count: playlists.length });
  } catch (error) {
    console.error("Playlists error:", error);
    res.status(500).json({ success: false, playlists: [] });
  }
});

app.get("/api/youtube/playlists/:playlistId", async (req, res) => {
  try {
    const { playlistId } = req.params;
    const accessToken = await getValidAccessToken(req);
    if (!playlistId) {
      return res.status(400).json({ success: false, tracks: [] });
    }
    const apiKey = process.env.YOUTUBE_API_KEY || "";
    const token = accessToken || apiKey;
    if (!token) {
      return res.status(401).json({ success: false, tracks: [] });
    }
    const response = await fetch("https://www.googleapis.com/youtube/v3/playlistItems?playlistId=" + playlistId + "&part=snippet,contentDetails&maxResults=50&" + (accessToken ? "access_token=" + accessToken : "key=" + apiKey));
    if (!response.ok) {
      return res.status(500).json({ success: false, tracks: [] });
    }
    const data = await response.json();
    const tracks = (data.items || []).map((item: any) => ({
      id: item.contentDetails?.videoId || item.id,
      youtubeVideoId: item.contentDetails?.videoId,
      title: item.snippet?.title || "Unknown",
      artist: item.snippet?.channelTitle || "Unknown",
      album: "",
      duration: 0,
      coverUrl: item.snippet?.thumbnails?.medium?.url || "",
      audioUrl: "https://www.youtube.com/watch?v=" + item.contentDetails?.videoId,
      genre: "Music",
      playsCount: 0,
    }));
    res.json({ success: true, tracks, count: tracks.length });
  } catch (error) {
    console.error("Playlist tracks error:", error);
    res.status(500).json({ success: false, tracks: [] });
  }
});

async function startServer() {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  app.listen(PORT, "0.0.0.0", () => console.log(`Server listening on port ${PORT}`));
}

startServer();
export default app;