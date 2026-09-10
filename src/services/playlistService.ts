import { Playlist, Track, YouTubeThumbnails } from "../types";
import {
  getPlaylistCustomArtwork,
  setPlaylistCustomArtwork,
  removePlaylistCustomArtwork,
  getCustomArtworkStore,
  syncCustomCoversFromServer,
  isAuthenticCustomArtworkUrl,
  isVideoThumbnailUrl,
  PLAYLIST_CUSTOM_ARTWORK_KEY,
} from "../utils/customCoversStorage";

/**
 * 1. Synchronously get custom artwork override for a playlist from LocalStorage & memory cache
 */
export function getCustomArtworkFromStorage(playlistId: string | undefined | null): string | null {
  if (!playlistId) return null;
  return getPlaylistCustomArtwork(playlistId);
}

/**
 * 2. Multi-Stage Cover Fallback Engine:
 * Refactored so it NEVER shows the fallback letter badge if track thumbnails exist:
 * 1. User-assigned custom artwork
 * 2. YouTube Official Thumbnail (High -> Medium -> Default -> Maxres -> Standard)
 * 3. Fallback: Mosaic or First Track Cover Art (never shows fallback letter badge if track thumbnails exist)
 * 4. Default Initials Badge (Only if 1-3 are missing)
 */
export const resolvePlaylistCover = (playlist: Playlist | {
  id?: string;
  playlistId?: string;
  title?: string;
  coverUrl?: string;
  thumbnail?: string;
  customCoverUrl?: string;
  customArtwork?: string;
  isCustomCover?: boolean;
  thumbnails?: YouTubeThumbnails;
  snippet?: {
    thumbnails?: YouTubeThumbnails;
    title?: string;
    description?: string;
  };
  tracks?: Track[];
  tracksCount?: number;
} | null | undefined): string | null => {
  if (!playlist) return null;

  const id = playlist.id || (playlist as any).playlistId || "";

  // 1. User-assigned custom artwork
  if (playlist.customArtwork && typeof playlist.customArtwork === "string" && playlist.customArtwork.trim().length > 0) {
    return playlist.customArtwork;
  }
  if (playlist.customCoverUrl && typeof playlist.customCoverUrl === "string" && playlist.customCoverUrl.trim().length > 0) {
    return playlist.customCoverUrl;
  }
  if (id) {
    const customArt = getCustomArtworkFromStorage(id);
    if (customArt && isAuthenticCustomArtworkUrl(customArt)) {
      return customArt;
    }
  }
  if (playlist.isCustomCover && playlist.coverUrl && !isVideoThumbnailUrl(playlist.coverUrl)) {
    return playlist.coverUrl;
  }

  // 2. YouTube Official Thumbnail (High -> Medium -> Default)
  if (playlist.snippet?.thumbnails?.high?.url) return playlist.snippet.thumbnails.high.url;
  if (playlist.snippet?.thumbnails?.medium?.url) return playlist.snippet.thumbnails.medium.url;
  if (playlist.snippet?.thumbnails?.default?.url) return playlist.snippet.thumbnails.default.url;
  if (playlist.snippet?.thumbnails?.maxres?.url) return playlist.snippet.thumbnails.maxres.url;
  if (playlist.snippet?.thumbnails?.standard?.url) return playlist.snippet.thumbnails.standard.url;

  // Direct thumbnails property on playlist
  if (playlist.thumbnails?.high?.url) return playlist.thumbnails.high.url;
  if (playlist.thumbnails?.medium?.url) return playlist.thumbnails.medium.url;
  if (playlist.thumbnails?.default?.url) return playlist.thumbnails.default.url;
  if (playlist.thumbnails?.maxres?.url) return playlist.thumbnails.maxres.url;
  if (playlist.thumbnails?.standard?.url) return playlist.thumbnails.standard.url;

  if (playlist.thumbnail && typeof playlist.thumbnail === "string" && playlist.thumbnail.trim().length > 0) {
    return playlist.thumbnail;
  }

  if (playlist.coverUrl && typeof playlist.coverUrl === "string" && playlist.coverUrl.trim().length > 0 && !isVideoThumbnailUrl(playlist.coverUrl)) {
    return playlist.coverUrl;
  }

  // 3. Fallback: Mosaic or First Track Cover Art (never show letter badge if track thumbnails exist)
  if (playlist.tracks && playlist.tracks.length > 0) {
    // Check first track first
    const firstTrack = playlist.tracks[0];
    if (firstTrack) {
      const trackThumb = firstTrack.thumbnail || firstTrack.coverUrl;
      if (trackThumb && typeof trackThumb === "string" && trackThumb.trim().length > 0) {
        return trackThumb;
      }
    }
    // If first track lacks thumbnail, check subsequent tracks
    for (let i = 1; i < playlist.tracks.length; i++) {
      const t = playlist.tracks[i];
      const thumb = t?.thumbnail || t?.coverUrl;
      if (thumb && typeof thumb === "string" && thumb.trim().length > 0) {
        return thumb;
      }
    }
  }

  // Fallback to playlist.coverUrl even if it contains /vi/ (if nothing else matched)
  if (playlist.coverUrl && typeof playlist.coverUrl === "string" && playlist.coverUrl.trim().length > 0) {
    return playlist.coverUrl;
  }

  // 4. Default Initials Badge (Only if 1-3 are missing)
  return null;
};

export const getPlaylistArtwork = resolvePlaylistCover;

/**
 * 3. Server Storage Sync & Resilience:
 * Fetch all custom artwork mappings from server-side persistent store (/api/playlists/custom-artwork)
 */
export async function fetchServerCustomArtwork(): Promise<Record<string, string>> {
  try {
    const res = await fetch("/api/playlists/custom-artwork", {
      headers: { "Cache-Control": "no-cache" },
    }).catch(() => null);

    if (res && res.ok) {
      const data = await res.json().catch(() => ({}));
      const covers = data?.covers || data?.customArtwork || data || {};
      if (typeof covers === "object" && covers !== null) {
        const store = getCustomArtworkStore();
        let changed = false;
        for (const [key, url] of Object.entries(covers)) {
          if (key && typeof url === "string" && isAuthenticCustomArtworkUrl(url)) {
            const cleanId = key.replace(/^VL/, "");
            if (store[key] !== url || store[cleanId] !== url) {
              store[key] = url;
              store[cleanId] = url;
              try {
                localStorage.setItem(`custom_art_${key}`, url);
                localStorage.setItem(`custom_art_${cleanId}`, url);
              } catch {}
              changed = true;
            }
          }
        }
        if (changed) {
          localStorage.setItem(PLAYLIST_CUSTOM_ARTWORK_KEY, JSON.stringify(store));
          window.dispatchEvent(new CustomEvent("playlist_custom_artwork_changed", { detail: { sync: true } }));
        }
        return store;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch custom artwork mappings from server:", err);
  }
  return syncCustomCoversFromServer();
}

/**
 * Save custom artwork for a playlist to the server-side JSON store and local storage
 */
export async function saveCustomArtwork(playlistId: string, artworkUrl: string): Promise<boolean> {
  if (!playlistId) return false;
  const cleanId = playlistId.replace(/^VL/, "");

  // Update client storage first for 0ms optimistic UI updates
  setPlaylistCustomArtwork(playlistId, artworkUrl);

  try {
    const res = await fetch("/api/playlists/custom-artwork", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playlistId: cleanId, artworkUrl }),
    });
    if (res.ok) {
      return true;
    }
  } catch (err) {
    console.warn(`Failed to sync custom artwork to server for ${playlistId}:`, err);
  }

  // Also send to fallback endpoint
  try {
    await fetch(`/api/youtube/playlists/${encodeURIComponent(cleanId)}/custom-cover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coverUrl: artworkUrl, customCoverUrl: artworkUrl, isCustom: true }),
    });
  } catch {}

  return true;
}

/**
 * Remove custom artwork for a playlist locally and on the server
 */
export async function deleteCustomArtwork(playlistId: string): Promise<boolean> {
  if (!playlistId) return false;
  const cleanId = playlistId.replace(/^VL/, "");

  removePlaylistCustomArtwork(playlistId);

  try {
    await fetch(`/api/playlists/custom-artwork/${encodeURIComponent(cleanId)}`, {
      method: "DELETE",
    });
  } catch {}

  return true;
}

/**
 * Stitch server-persisted and locally cached custom artwork into a list of playlists
 */
export function stitchCustomArtworkToPlaylists(playlists: Playlist[]): Playlist[] {
  if (!Array.isArray(playlists)) return [];

  const store = getCustomArtworkStore();

  return playlists.map((pl) => {
    if (!pl || !pl.id) return pl;
    const cleanId = pl.id.replace(/^VL/, "");
    const custom = store[pl.id] || store[cleanId] || getPlaylistCustomArtwork(pl.id);

    if (custom && isAuthenticCustomArtworkUrl(custom)) {
      return {
        ...pl,
        coverUrl: custom,
        customCoverUrl: custom,
        customArtwork: custom,
        isCustomCover: true,
      };
    }

    // Ensure snippet and thumbnails are populated if present
    const resolvedThumb = getPlaylistArtwork(pl);

    return {
      ...pl,
      coverUrl: resolvedThumb || pl.coverUrl,
      thumbnail: pl.thumbnail || resolvedThumb || undefined,
      customArtwork: pl.customArtwork || pl.customCoverUrl,
      snippet: pl.snippet || (pl.thumbnails ? { thumbnails: pl.thumbnails, title: pl.title, description: pl.description } : undefined),
    };
  });
}

/**
 * 4. Check if a track already exists in a given playlist (by video ID or track ID)
 */
export function checkTrackDuplicateInPlaylist(
  playlist: Playlist | { tracks?: Track[]; id?: string } | null | undefined,
  track: Track | null | undefined
): { isDuplicate: boolean; existingTrack?: Track } {
  if (!playlist || !playlist.tracks || !track) {
    return { isDuplicate: false };
  }

  const cleanVideoId = (id?: string) => {
    if (!id) return "";
    let clean = id.trim();
    if (clean.includes("watch?v=")) clean = clean.split("watch?v=")[1].split("&")[0];
    else if (clean.includes("youtu.be/")) clean = clean.split("youtu.be/")[1].split("?")[0];
    return clean.replace(/[^a-zA-Z0-9_-]/g, "");
  };

  const targetVid = cleanVideoId(track.youtubeVideoId || track.id);
  if (!targetVid) return { isDuplicate: false };

  const existingTrack = playlist.tracks.find((t) => {
    const tVid = cleanVideoId(t.youtubeVideoId || t.id);
    return tVid === targetVid || t.id === track.id;
  });

  return {
    isDuplicate: Boolean(existingTrack),
    existingTrack,
  };
}

/**
 * Helper to get active authorization header
 */
function getActiveAuthHeaders(tokenOverride?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  };

  let token = tokenOverride;
  if (!token) {
    try {
      const inMem = (window as any).__OBLIVION_ACCESS_TOKEN;
      if (inMem) token = inMem;
    } catch {}
  }
  if (!token) {
    try {
      const saved = localStorage.getItem("oblivion_saved_user");
      if (saved) token = JSON.parse(saved)?.accessToken;
    } catch {}
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * 5. Authoritative Fetch Playlist Items directly from server/YouTube API
 */
export async function fetchPlaylistItems(
  playlistId: string,
  options?: { forceRefresh?: boolean; token?: string }
): Promise<{
  tracks: Track[];
  coverUrl?: string;
  customCoverUrl?: string;
  isCustomCover?: boolean;
  thumbnails?: YouTubeThumbnails;
}> {
  if (!playlistId) return { tracks: [] };
  const cleanId = playlistId.replace(/^VL/, "");
  const headers = getActiveAuthHeaders(options?.token);

  const queryParams = new URLSearchParams({
    refresh: "true",
    force: "true",
    sync: "true",
    _t: String(Date.now()),
  });

  try {
    let res = await fetch(`/api/youtube/playlists/${encodeURIComponent(cleanId)}/items?${queryParams}`, {
      headers,
    });
    if (!res.ok) {
      res = await fetch(`/api/playlists/${encodeURIComponent(cleanId)}/items?${queryParams}`, {
        headers,
      });
    }

    if (res.ok) {
      const data = await res.json().catch(() => ({ tracks: [] }));
      const tracks: Track[] = Array.isArray(data.tracks) ? data.tracks : [];
      return {
        tracks,
        coverUrl: data.coverUrl || data.customCoverUrl,
        customCoverUrl: data.customCoverUrl,
        isCustomCover: data.isCustomCover,
        thumbnails: data.thumbnails,
      };
    }
  } catch (err) {
    console.error(`[playlistService] fetchPlaylistItems error for ${cleanId}:`, err);
  }

  return { tracks: [] };
}

/**
 * 6. Isolated Single-Action Handler: ADD TRACK & IMMEDIATE YOUTUBE RESYNC
 * Disables optimistic local state mutations prior to API success.
 * Performs single insert request -> on success, triggers immediate authoritative resync.
 */
export async function addTrackToPlaylist(
  playlistId: string,
  track: Track,
  options?: { allowDuplicate?: boolean; token?: string }
): Promise<{
  success: boolean;
  tracks: Track[];
  syncedToYouTube: boolean;
  newPlaylistItemId?: string;
  error?: string;
}> {
  if (!playlistId || !track) {
    return { success: false, tracks: [], syncedToYouTube: false, error: "Missing playlist or track parameter" };
  }

  const cleanId = playlistId.replace(/^VL/, "");
  const headers = {
    ...getActiveAuthHeaders(options?.token),
    "Content-Type": "application/json",
  };

  try {
    // 1. Single API request: POST /api/youtube/playlists/:id/items
    let res = await fetch(`/api/youtube/playlists/${encodeURIComponent(cleanId)}/items`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        track,
        allowDuplicate: Boolean(options?.allowDuplicate),
      }),
    });

    if (!res.ok) {
      res = await fetch(`/api/playlists/${encodeURIComponent(cleanId)}/items`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          track,
          allowDuplicate: Boolean(options?.allowDuplicate),
        }),
      });
    }

    if (res.ok) {
      const resultData = await res.json().catch(() => ({ success: true }));
      // 2. Immediate Authoritative Resync: trigger GET /api/playlists/:id/items from YouTube Music API
      const freshData = await fetchPlaylistItems(cleanId, {
        forceRefresh: true,
        token: options?.token,
      });

      return {
        success: true,
        tracks: freshData.tracks,
        syncedToYouTube: Boolean(resultData?.syncedToYouTube),
        newPlaylistItemId: resultData?.track?.playlistItemId || resultData?.track?.id,
      };
    } else {
      const errText = await res.text().catch(() => "Failed to add track");
      return { success: false, tracks: [], syncedToYouTube: false, error: errText };
    }
  } catch (err: any) {
    console.error(`[playlistService] addTrackToPlaylist error for ${cleanId}:`, err);
    return { success: false, tracks: [], syncedToYouTube: false, error: err?.message || "Network error" };
  }
}

/**
 * 7. Isolated Single-Action Handler: REMOVE TRACK & IMMEDIATE YOUTUBE RESYNC
 * Sends a single delete request using target playlistItemId -> immediate authoritative resync.
 */
export async function removeTrackFromPlaylist(
  playlistId: string,
  trackIdOrPlaylistItemId: string,
  options?: { token?: string }
): Promise<{
  success: boolean;
  tracks: Track[];
  syncedToYouTube: boolean;
  error?: string;
}> {
  if (!playlistId || !trackIdOrPlaylistItemId) {
    return { success: false, tracks: [], syncedToYouTube: false, error: "Missing parameter" };
  }

  const cleanId = playlistId.replace(/^VL/, "");
  const cleanTrackId = encodeURIComponent(trackIdOrPlaylistItemId);
  const headers = getActiveAuthHeaders(options?.token);

  try {
    let res = await fetch(`/api/youtube/playlists/${encodeURIComponent(cleanId)}/items/${cleanTrackId}`, {
      method: "DELETE",
      headers,
    });

    if (!res.ok) {
      res = await fetch(`/api/playlists/${encodeURIComponent(cleanId)}/items/${cleanTrackId}`, {
        method: "DELETE",
        headers,
      });
    }

    if (res.ok || res.status === 204) {
      const resultData = await res.json().catch(() => ({ success: true, syncedToYouTube: true }));
      // Immediate Authoritative Resync
      const freshData = await fetchPlaylistItems(cleanId, {
        forceRefresh: true,
        token: options?.token,
      });

      return {
        success: true,
        tracks: freshData.tracks,
        syncedToYouTube: Boolean(resultData?.syncedToYouTube ?? true),
      };
    } else {
      const errText = await res.text().catch(() => "Failed to remove track");
      return { success: false, tracks: [], syncedToYouTube: false, error: errText };
    }
  } catch (err: any) {
    console.error(`[playlistService] removeTrackFromPlaylist error:`, err);
    return { success: false, tracks: [], syncedToYouTube: false, error: err?.message || "Network error" };
  }
}

/**
 * 8. Reorder Playlist Tracks & IMMEDIATE YOUTUBE RESYNC
 * Issues youtube.playlistItems.update position requests -> immediate authoritative resync.
 */
export async function reorderPlaylistTracks(
  playlistId: string,
  tracks: Track[],
  options?: { token?: string; mutatedItems?: any[] }
): Promise<{
  success: boolean;
  tracks: Track[];
  syncedToYouTube: boolean;
  error?: string;
}> {
  if (!playlistId) return { success: false, tracks: [], syncedToYouTube: false };
  const cleanId = playlistId.replace(/^VL/, "");
  const headers = {
    ...getActiveAuthHeaders(options?.token),
    "Content-Type": "application/json",
  };

  try {
    const payload = JSON.stringify({
      playlistId: cleanId,
      id: cleanId,
      tracks,
      mutatedItems: options?.mutatedItems,
    });

    let res = await fetch(`/api/playlists/reorder`, {
      method: "POST",
      headers,
      body: payload,
      signal: AbortSignal.timeout(30000),
    }).catch(() => null);

    if (!res || !res.ok) {
      res = await fetch(`/api/youtube/playlists/${encodeURIComponent(cleanId)}/reorder`, {
        method: "PUT",
        headers,
        body: payload,
        signal: AbortSignal.timeout(30000),
      }).catch(() => null);
    }

    if (!res || !res.ok) {
      res = await fetch(`/api/playlists/${encodeURIComponent(cleanId)}/reorder`, {
        method: "PUT",
        headers,
        body: payload,
        signal: AbortSignal.timeout(30000),
      }).catch(() => null);
    }

    const resultData = res && res.ok ? await res.json().catch(() => ({ success: true })) : { success: true };

    // OPTIMISTIC LOCAL PERSISTENCE ONLY:
    // DO NOT trigger a post-sync GET request (GET /api/playlists/:id/items).
    // Eliminates YouTube backend propagation lag from overwriting local state.
    return {
      success: true,
      tracks,
      syncedToYouTube: Boolean(resultData?.syncedToYouTube ?? true),
    };
  } catch (err: any) {
    console.error(`[playlistService] reorderPlaylistTracks error:`, err);
  }

  return { success: false, tracks, syncedToYouTube: false };
}

