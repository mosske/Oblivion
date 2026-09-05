/**
 * PLAYLIST_CUSTOM_ARTWORK Standalone Store
 * 
 * Completely decoupled from the playlists table/array and background sync routines.
 * Maps `playlistId` (and clean playlistId without VL prefix) directly to custom artwork URL string.
 * Supports both standalone table key PLAYLIST_CUSTOM_ARTWORK and discrete custom_art_${playlistId} entries.
 */

export const PLAYLIST_CUSTOM_ARTWORK_KEY = "PLAYLIST_CUSTOM_ARTWORK";

/**
 * Check if a URL represents authentic custom playlist artwork rather than a video thumbnail
 */
export function isAuthenticCustomArtworkUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (trimmed.length < 10) return false;

  // Local user uploads and canvas/blobs
  if (trimmed.startsWith("data:image/") || trimmed.startsWith("blob:")) return true;

  // YouTube Studio custom playlist covers & Google User Content hosts
  if (
    trimmed.includes("studio_square_thumbnail") ||
    trimmed.includes("/pl_c/") ||
    trimmed.includes("googleusercontent.com") ||
    trimmed.includes("ggpht.com") ||
    trimmed.includes("ytimg.com/pl/") ||
    trimmed.includes("/pl/") ||
    trimmed.includes("/s_p/") ||
    trimmed.includes("unsplash.com")
  ) {
    return true;
  }

  // Explicitly reject video thumbnail patterns (YouTube uses /vi/ for video thumbnails)
  if (
    trimmed.includes("/vi/") ||
    trimmed.includes("hqdefault.") ||
    trimmed.includes("maxresdefault.") ||
    trimmed.includes("sddefault.") ||
    trimmed.includes("mqdefault.")
  ) {
    return false;
  }

  // General image URLs that are not video thumbnails
  return !trimmed.includes("/vi/");
}

/**
 * Check if a URL is a video track thumbnail (the first song image pattern)
 */
export function isVideoThumbnailUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  return (
    url.includes("/vi/") ||
    url.includes("hqdefault.") ||
    url.includes("maxresdefault.") ||
    url.includes("sddefault.") ||
    url.includes("mqdefault.")
  );
}

/**
 * Read the entire isolated PLAYLIST_CUSTOM_ARTWORK store
 */
export function getCustomArtworkStore(): Record<string, string> {
  if (typeof window === "undefined" || !window.localStorage) return {};
  try {
    const raw = localStorage.getItem(PLAYLIST_CUSTOM_ARTWORK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Failed to parse PLAYLIST_CUSTOM_ARTWORK from localStorage", err);
  }
  return {};
}

/**
 * Get custom artwork for a specific playlist synchronously from standalone storage
 */
export function getPlaylistCustomArtwork(playlistId: string | undefined | null): string | null {
  if (!playlistId || typeof window === "undefined" || !window.localStorage) return null;
  
  const cleanId = playlistId.replace(/^VL/, "");

  // Helper to validate that a cached entry is genuine custom artwork and not an accidentally stored video thumb
  const validateAndReturn = (candidate: string | null | undefined): string | null => {
    if (!candidate || typeof candidate !== "string") return null;
    const trimmed = candidate.trim();
    if (trimmed.length > 0 && !isVideoThumbnailUrl(trimmed)) {
      return trimmed;
    }
    return null;
  };

  // 1. Direct single-key check custom_art_${playlistId}
  try {
    const direct1 = validateAndReturn(localStorage.getItem(`custom_art_${playlistId}`));
    if (direct1) return direct1;
    if (cleanId !== playlistId) {
      const direct2 = validateAndReturn(localStorage.getItem(`custom_art_${cleanId}`));
      if (direct2) return direct2;
    }
  } catch {}

  // 2. Standalone PLAYLIST_CUSTOM_ARTWORK table
  const store = getCustomArtworkStore();
  const fromStore1 = validateAndReturn(store[playlistId]);
  if (fromStore1) return fromStore1;
  if (cleanId && cleanId !== playlistId) {
    const fromStore2 = validateAndReturn(store[cleanId]);
    if (fromStore2) return fromStore2;
  }

  // 3. Backward compatibility with CUSTOM_PLAYLIST_COVERS
  try {
    const legacyRaw = localStorage.getItem("CUSTOM_PLAYLIST_COVERS");
    if (legacyRaw) {
      const legacyStore = JSON.parse(legacyRaw);
      if (legacyStore && typeof legacyStore === "object") {
        const val = validateAndReturn(legacyStore[playlistId] || (cleanId ? legacyStore[cleanId] : null));
        if (val) return val;
      }
    }
  } catch {}

  // 4. Check oblivion_custom_covers_map
  try {
    const mapRaw = localStorage.getItem("oblivion_custom_covers_map");
    if (mapRaw) {
      const parsedMap = JSON.parse(mapRaw);
      if (parsedMap && typeof parsedMap === "object") {
        const val = validateAndReturn(parsedMap[playlistId] || (cleanId ? parsedMap[cleanId] : null));
        if (val) return val;
      }
    }
  } catch {}

  return null;
}

/**
 * Write directly to PLAYLIST_CUSTOM_ARTWORK and discrete custom_art_${playlistId} keys
 */
export function setPlaylistCustomArtwork(playlistId: string, artworkUrl: string | null | undefined): void {
  if (!playlistId || typeof window === "undefined" || !window.localStorage) return;
  const cleanId = playlistId.replace(/^VL/, "");

  // Prevent saving video thumbnails as custom artwork
  if (artworkUrl && isVideoThumbnailUrl(artworkUrl)) {
    console.warn(`[Custom Artwork] Blocked attempt to set video thumbnail as custom playlist cover for ${playlistId}`);
    return;
  }

  try {
    // 1. Update standalone map store
    const store = getCustomArtworkStore();
    if (artworkUrl && typeof artworkUrl === "string" && artworkUrl.trim().length > 0) {
      const trimmed = artworkUrl.trim();
      store[playlistId] = trimmed;
      store[cleanId] = trimmed;
      localStorage.setItem(`custom_art_${playlistId}`, trimmed);
      localStorage.setItem(`custom_art_${cleanId}`, trimmed);
    } else {
      delete store[playlistId];
      delete store[cleanId];
      localStorage.removeItem(`custom_art_${playlistId}`);
      localStorage.removeItem(`custom_art_${cleanId}`);
    }
    localStorage.setItem(PLAYLIST_CUSTOM_ARTWORK_KEY, JSON.stringify(store));

    // Also mirror to legacy store for backward compatibility
    try {
      const legacyRaw = localStorage.getItem("CUSTOM_PLAYLIST_COVERS");
      const legacyStore = legacyRaw ? JSON.parse(legacyRaw) : {};
      if (artworkUrl && typeof artworkUrl === "string" && artworkUrl.trim().length > 0) {
        legacyStore[playlistId] = artworkUrl.trim();
        legacyStore[cleanId] = artworkUrl.trim();
      } else {
        delete legacyStore[playlistId];
        delete legacyStore[cleanId];
      }
      localStorage.setItem("CUSTOM_PLAYLIST_COVERS", JSON.stringify(legacyStore));
    } catch {}

    // Dispatch custom storage event for instant UI component reactivity across all views
    window.dispatchEvent(
      new CustomEvent("playlist_custom_artwork_changed", {
        detail: { playlistId, cleanId, artworkUrl },
      })
    );
  } catch (err) {
    console.warn("Failed to persist to PLAYLIST_CUSTOM_ARTWORK", err);
  }
}

/**
 * Synchronize custom artwork definitions from the server into local standalone storage
 */
export async function syncCustomCoversFromServer(): Promise<Record<string, string>> {
  if (typeof window === "undefined" || !window.localStorage) return {};
  try {
    const res = await fetch("/api/youtube/playlists/custom-covers");
    if (!res.ok) return {};
    const data = await res.json().catch(() => ({}));
    if (data?.covers && typeof data.covers === "object") {
      const store = getCustomArtworkStore();
      let updated = false;
      for (const [id, url] of Object.entries(data.covers)) {
        if (id && url && typeof url === "string" && isAuthenticCustomArtworkUrl(url)) {
          const cleanId = id.replace(/^VL/, "");
          if (store[id] !== url || store[cleanId] !== url) {
            store[id] = url;
            store[cleanId] = url;
            try {
              localStorage.setItem(`custom_art_${id}`, url);
              localStorage.setItem(`custom_art_${cleanId}`, url);
            } catch {}
            updated = true;
          }
        }
      }
      if (updated) {
        localStorage.setItem(PLAYLIST_CUSTOM_ARTWORK_KEY, JSON.stringify(store));
        window.dispatchEvent(new CustomEvent("playlist_custom_artwork_changed", { detail: { sync: true } }));
      }
      return store;
    }
  } catch (err) {
    console.warn("Failed to sync custom covers from server:", err);
  }
  return {};
}

// Aliases and helper functions for seamless integration with existing imports
export const CUSTOM_PLAYLIST_COVERS_KEY = PLAYLIST_CUSTOM_ARTWORK_KEY;
export const getCustomPlaylistCovers = getCustomArtworkStore;
export const setCustomPlaylistCover = setPlaylistCustomArtwork;

/**
 * Resolve playlist cover URL synchronously, checking isolated custom artwork storage first
 * Strict rule: If a playlist has custom artwork, NEVER return a track cover or video thumbnail!
 */
export function resolvePlaylistCoverUrl(
  playlist: {
    id?: string;
    coverUrl?: string;
    customCoverUrl?: string;
    isCustomCover?: boolean;
    tracks?: Array<{ coverUrl?: string }>;
  } | null | undefined
): string {
  if (!playlist) return "";
  const playlistId = playlist.id || (playlist as any).playlistId;
  const custom = getPlaylistCustomArtwork(playlistId);
  if (custom) return custom;

  if (playlist.customCoverUrl && isAuthenticCustomArtworkUrl(playlist.customCoverUrl)) {
    // Auto-lock into standalone store
    if (playlistId) setPlaylistCustomArtwork(playlistId, playlist.customCoverUrl);
    return playlist.customCoverUrl;
  }

  const isMarkedCustom = Boolean(playlist.isCustomCover);
  if (isMarkedCustom && playlist.coverUrl && !isVideoThumbnailUrl(playlist.coverUrl)) {
    if (playlistId) setPlaylistCustomArtwork(playlistId, playlist.coverUrl);
    return playlist.coverUrl;
  }

  if (playlist.coverUrl && isAuthenticCustomArtworkUrl(playlist.coverUrl)) {
    if (playlistId) setPlaylistCustomArtwork(playlistId, playlist.coverUrl);
    return playlist.coverUrl;
  }

  // Non-custom fallback logic ONLY
  if (playlist.coverUrl && !isMarkedCustom) return playlist.coverUrl;
  if (!isMarkedCustom && playlist.tracks?.[0]?.coverUrl) return playlist.tracks[0].coverUrl;
  return playlist.coverUrl || "";
}
