import app from "../server.js";

export default function handler(req: any, res: any) {
  try {
    if (req.query && req.query.__path) {
      const subpath = Array.isArray(req.query.__path)
        ? req.query.__path.join("/")
        : String(req.query.__path);
      
      delete req.query.__path;
      const queryObj = { ...req.query };
      const search = new URLSearchParams(queryObj as any).toString();
      req.url = `/api/${subpath}` + (search ? `?${search}` : "");
    } else {
      const originalUrl =
        req.headers["x-forwarded-uri"] ||
        req.headers["x-original-url"] ||
        req.headers["x-matched-path"];

      if (originalUrl && typeof originalUrl === "string" && originalUrl.startsWith("/api")) {
        req.url = originalUrl;
      }
    }
  } catch (e) {
    console.warn("Could not rewrite req.url in api/index.ts:", e);
  }

  return app(req, res);
}



