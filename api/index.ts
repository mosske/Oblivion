import app from "../server";

export default function handler(req: any, res: any) {
  try {
    const originalUrl =
      req.headers["x-forwarded-uri"] ||
      req.headers["x-original-url"] ||
      req.headers["x-matched-path"];

    if (originalUrl && typeof originalUrl === "string" && originalUrl.startsWith("/api")) {
      req.url = originalUrl;
    }
  } catch (e) {
    console.warn("Could not rewrite req.url in api/index.ts:", e);
  }

  return app(req, res);
}

