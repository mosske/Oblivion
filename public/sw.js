// Oblivion Music PWA Service Worker
const CACHE_VERSION = "oblivion-v6";
const STATIC_CACHE_NAME = `oblivion-static-${CACHE_VERSION}`;
const RUNTIME_CACHE_NAME = `oblivion-runtime-${CACHE_VERSION}`;

// Core assets to pre-cache on install
const PRECACHE_ASSETS = [
  "/manifest.json",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn("[SW] Pre-cache partial warning:", err);
        });
      })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE_NAME && key !== RUNTIME_CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Never intercept or cache Vite development modules, HMR, or TypeScript files
  if (
    url.pathname.startsWith("/@") ||
    url.pathname.startsWith("/src/") ||
    url.pathname.startsWith("/node_modules/") ||
    url.pathname.endsWith(".tsx") ||
    url.pathname.endsWith(".ts") ||
    url.search.includes("t=") ||
    url.search.includes("v=") ||
    url.pathname.includes("vite")
  ) {
    return;
  }

  // Never cache API routes, live audio streams, or OAuth redirects
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("/stream") ||
    url.pathname.includes("/auth/") ||
    url.hostname.includes("googlevideo.com") ||
    url.hostname.includes("youtube.com")
  ) {
    return;
  }

  // Navigation requests (HTML pages) -> Network first, fallback to cached index.html
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cachedIndex = await caches.match("/index.html");
          if (cachedIndex) return cachedIndex;
          const cachedDirect = await caches.match(request);
          if (cachedDirect) return cachedDirect;
          return new Response(
            `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Oblivion Music</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="background:#0e0d11;color:#fdfcf9;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;padding:20px;"><h2>Oblivion Music</h2><p style="color:#a0a0a0;">Application is offline. Please verify connection and refresh.</p><button onclick="location.reload()" style="padding:10px 20px;border-radius:8px;background:#dfb86c;color:#120f14;border:none;font-weight:bold;cursor:pointer;">Refresh</button></div></body></html>`,
            { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 200 }
          );
        })
    );
    return;
  }

  // Static assets (scripts, styles, modules) -> Network first with cache fallback to avoid stale code
  if (
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.startsWith("/assets/")
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response("", { status: 404, statusText: "Not Found" });
        })
    );
    return;
  }

  // Media, fonts, images, icons -> Cache first, fallback to network
  if (
    request.destination === "image" ||
    request.destination === "font" ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(RUNTIME_CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => new Response("", { status: 404, statusText: "Not Found" }));
      })
    );
    return;
  }
});
