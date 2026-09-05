/**
 * PLAYLIST_CUSTOM_ARTWORK Standalone Store
 * 
 * Completely decoupled from the playlists table/array and background sync routines.
 * Maps `playlistId` (and clean playlistId without VL prefix) directly to custom artwork URL string.
 * Supports both standalone table key PLAYLIST_CUSTOM_ARTWORK and discrete custom_art_${playlistId} entries.
 */

export const PLAYLIST_CUSTOM_ARTWORK_KEY = "PLAYLIST_CUSTOM_ARTWORK";

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

  // 1. Direct single-key check custom_art_${playlistId}
  try {
    const direct1 = localStorage.getItem(`custom_art_${playlistId}`);
    if (direct1 && direct1.trim().length > 0) return direct1.trim();
    if (cleanId !== playlistId) {
      const direct2 = localStorage.getItem(`custom_art_${cleanId}`);
      if (direct2 && direct2.trim().length > 0) return direct2.trim();
    }
  } catch {}

  // 2. Standalone PLAYLIST_CUSTOM_ARTWORK table
  const store = getCustomArtworkStore();
  if (store[playlistId] && store[playlistId].trim().length > 0) {
    return store[playlistId].trim();
  }
  if (cleanId && store[cleanId] && store[cleanId].trim().length > 0) {
    return store[cleanId].trim();
  }

  // 3. Backward compatibility with CUSTOM_PLAYLIST_COVERS
  try {
    const legacyRaw = localStorage.getItem("CUSTOM_PLAYLIST_COVERS");
    if (legacyRaw) {
      const legacyStore = JSON.parse(legacyRaw);
      if (legacyStore && typeof legacyStore === "object") {
        const val = legacyStore[playlistId] || (cleanId ? legacyStore[cleanId] : null);
        if (val && typeof val === "string" && val.trim().length > 0) {
          return val.trim();
        }
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

// Aliases and helper functions for seamless integration with existing imports
export const CUSTOM_PLAYLIST_COVERS_KEY = PLAYLIST_CUSTOM_ARTWORK_KEY;
export const getCustomPlaylistCovers = getCustomArtworkStore;
export const setCustomPlaylistCover = setPlaylistCustomArtwork;

/**
 * Resolve playlist cover URL synchronously, checking isolated custom artwork storage first
 */
export function resolvePlaylistCoverUrl(playlist: { id?: string; coverUrl?: string; customCoverUrl?: string; isCustomCover?: boolean; tracks?: Array<{ coverUrl?: string }> } | null | undefined): string {
  if (!playlist) return "";
  const custom = getPlaylistCustomArtwork(playlist.id);
  if (custom) return custom;
  if (playlist.customCoverUrl) return playlist.customCoverUrl;
  if (playlist.coverUrl) return playlist.coverUrl;
  if (playlist.tracks?.[0]?.coverUrl) return playlist.tracks[0].coverUrl;
  return "";
}
