// Oblivion Music PWA Service Worker
const CACHE_VERSION = "oblivion-v4";
const STATIC_CACHE_NAME = `oblivion-static-${CACHE_VERSION}`;
const RUNTIME_CACHE_NAME = `oblivion-runtime-${CACHE_VERSION}`;

// Core assets to pre-cache on install
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn("[SW] Pre-cache partial warning:", err);
        });
      })
      .then(() => self.skipWaiting())
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
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match("/index.html") || caches.match(request);
        })
    );
    return;
  }

  // Static assets (scripts, styles, icons, fonts) -> Stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
            const responseToCache = networkResponse.clone();
            caches.open(RUNTIME_CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline, cachedResponse is used
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
