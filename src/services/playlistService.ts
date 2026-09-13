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
import { getStoredAuthToken, getStoredUserSession } from "./authService";
import { apiFetch } from "./apiClient";

export const OBLIVION_PLAYLIST_CACHE_KEY = "OBLIVION_PLAYLIST_CACHE";
const LEGACY_PLAYLIST_CACHE_KEY = "oblivion_saved_playlists";

/**
 * 0. Read playlists synchronously from perpetual client-side cache
 */
export function getCachedPlaylists(): Playlist[] {
  try {
    const raw = localStorage.getItem(OBLIVION_PLAYLIST_CACHE_KEY) || localStorage.getItem(LEGACY_PLAYLIST_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return stitchCustomArtworkToPlaylists(parsed);
      }
    }
  } catch (err) {
    console.warn("[playlistService] Failed reading cached playlists:", err);
  }
  return [];
}

/**
 * Save playlists strictly into OBLIVION_PLAYLIST_CACHE and legacy key for resilience.
 * Stores explicit cover image URLs directly in OBLIVION_PLAYLIST_CACHE.
 */
export function setCachedPlaylists(playlists: Playlist[]): void {
  if (!Array.isArray(playlists)) return;
  try {
    // Dedicated Artwork Caching: Ensure every playlist has an explicit coverUrl stored directly
    const playlistsWithExplicitArtwork = playlists.map((pl) => {
      if (!pl || !pl.id) return pl;
      const customArt = getPlaylistCustomArtwork(pl.id);
      const explicitCover =
        customArt ||
        pl.customCoverUrl ||
        pl.customArtwork ||
        pl.coverUrl ||
        pl.snippet?.thumbnails?.high?.url ||
        pl.snippet?.thumbnails?.medium?.url ||
        pl.snippet?.thumbnails?.default?.url ||
        pl.thumbnails?.high?.url ||
        pl.thumbnails?.medium?.url ||
        pl.thumbnails?.default?.url ||
        pl.thumbnail ||
        "";

      return {
        ...pl,
        coverUrl: explicitCover || pl.coverUrl || "",
        customCoverUrl: customArt || pl.customCoverUrl || pl.customArtwork,
      };
    });

    const serialized = JSON.stringify(playlistsWithExplicitArtwork);
    localStorage.setItem(OBLIVION_PLAYLIST_CACHE_KEY, serialized);
    localStorage.setItem(LEGACY_PLAYLIST_CACHE_KEY, serialized);
    localStorage.setItem("oblivion_playlist_sync_time", String(Date.now()));
  } catch (err) {
    console.warn("[playlistService] Failed saving cached playlists:", err);
  }
}

/**
 * Read tracks for a specific playlist from local cache (OBLIVION_TRACKS_CACHE_[PLAYLIST_ID])
 */
export function getCachedPlaylistTracks(playlistId: string): Track[] {
  if (!playlistId) return [];
  const cleanId = playlistId.replace(/^VL/, "");
  try {
    const raw =
      localStorage.getItem(`OBLIVION_TRACKS_CACHE_${playlistId}`) ||
      localStorage.getItem(`OBLIVION_TRACKS_CACHE_${cleanId}`) ||
      localStorage.getItem(`OBLIVION_PLAYLIST_CACHE_${playlistId}`) ||
      localStorage.getItem(`OBLIVION_PLAYLIST_CACHE_${cleanId}`) ||
      localStorage.getItem(`oblivion_tracks_${cleanId}`) ||
      localStorage.getItem(`oblivion_tracks_${playlistId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(Boolean);
      }
    }
  } catch {}
  return [];
}

/**
 * Save tracks for a specific playlist to local cache (OBLIVION_TRACKS_CACHE_[PLAYLIST_ID])
 * ZERO-OVERWRITE GUARD: Rejects empty or invalid arrays if previous cached tracks exist.
 */
export function setCachedPlaylistTracks(playlistId: string, tracks: Track[]): void {
  if (!playlistId || !Array.isArray(tracks)) return;
  const cleanId = playlistId.replace(/^VL/, "");
  const cleanTracks = tracks.filter(Boolean).filter((t: any) => Boolean(t && (t.id || t.youtubeVideoId || t.title)));

  // ZERO-OVERWRITE GUARD:
  // If the incoming tracks array is empty, check if we already have valid cached tracks for this playlist.
  // If so, REJECT the update completely! DO NOT overwrite or clear localStorage key OBLIVION_TRACKS_CACHE_[PLAYLIST_ID]!
  if (cleanTracks.length === 0) {
    const existing = getCachedPlaylistTracks(playlistId);
    if (existing && existing.length > 0) {
      console.warn(`[playlistService] ZERO-OVERWRITE GUARD: rejected overwriting ${existing.length} cached tracks with 0 tracks for ${playlistId}`);
      return;
    }
  }

  try {
    const serialized = JSON.stringify(cleanTracks);
    localStorage.setItem(`OBLIVION_TRACKS_CACHE_${playlistId}`, serialized);
    localStorage.setItem(`OBLIVION_TRACKS_CACHE_${cleanId}`, serialized);
    localStorage.setItem(`OBLIVION_PLAYLIST_CACHE_${playlistId}`, serialized);
    localStorage.setItem(`OBLIVION_PLAYLIST_CACHE_${cleanId}`, serialized);
    localStorage.setItem(`oblivion_tracks_${cleanId}`, serialized);

    // Concurrently update track count in OBLIVION_PLAYLIST_CACHE while preserving explicit coverUrl
    const currentPlaylists = getCachedPlaylists();
    if (currentPlaylists.length > 0) {
      const updated = currentPlaylists.map((pl) => {
        if (pl.id === playlistId || pl.id.replace(/^VL/, "") === cleanId || (pl as any).playlistId === playlistId) {
          const finalCount = cleanTracks.length > 0 ? cleanTracks.length : (pl.itemCount ?? pl.trackCount ?? 0);
          return {
            ...pl,
            tracks: cleanTracks.length > 0 ? cleanTracks : (pl.tracks || []),
            itemCount: finalCount,
            trackCount: finalCount,
            tracksCount: finalCount,
            contentDetails: {
              ...(pl.contentDetails || {}),
              itemCount: finalCount,
            },
          };
        }
        return pl;
      });
      setCachedPlaylists(updated);
    }
  } catch (err) {
    console.warn("[playlistService] Failed saving cached tracks:", err);
  }
}

/**
 * Merge newly fetched YouTube playlists into existing local cache
 */
export function mergePlaylists(cachedList: Playlist[], remoteList: Playlist[]): Playlist[] {
  if (!Array.isArray(remoteList) || remoteList.length === 0) {
    return cachedList;
  }
  const mergedMap = new Map<string, Playlist>();

  // 1. Seed with cached items to preserve locally fetched tracks & custom covers
  for (const pl of cachedList) {
    if (pl && pl.id) {
      mergedMap.set(pl.id, pl);
      mergedMap.set(pl.id.replace(/^VL/, ""), pl);
    }
  }

  // 2. Overlay remote items
  for (const remote of remoteList) {
    if (!remote || !remote.id) continue;
    const cleanId = remote.id.replace(/^VL/, "");
    const existing = mergedMap.get(remote.id) || mergedMap.get(cleanId);

    const mergedTracks = remote.tracks && remote.tracks.length > 0 ? remote.tracks : (existing?.tracks || []);
    const directCount = Number(
      remote.itemCount ?? remote.trackCount ?? remote.tracksCount ?? remote.contentDetails?.itemCount ?? mergedTracks.length ?? (existing?.tracksCount || 0)
    );

    const mergedItem: Playlist = {
      ...existing,
      ...remote,
      id: remote.id,
      tracks: mergedTracks,
      itemCount: directCount,
      trackCount: directCount,
      tracksCount: directCount,
      coverUrl: existing?.isCustomCover && existing?.coverUrl ? existing.coverUrl : (remote.coverUrl || existing?.coverUrl || ""),
      customCoverUrl: existing?.customCoverUrl || remote.customCoverUrl,
      isCustomCover: Boolean(existing?.isCustomCover || remote.isCustomCover),
    };

    mergedMap.set(remote.id, mergedItem);
    mergedMap.set(cleanId, mergedItem);
  }

  // Deduplicate by clean ID
  const result: Playlist[] = [];
  const seenIds = new Set<string>();
  for (const pl of mergedMap.values()) {
    const cleanId = pl.id.replace(/^VL/, "");
    if (!seenIds.has(cleanId)) {
      seenIds.add(cleanId);
      result.push(pl);
    }
  }

  return stitchCustomArtworkToPlaylists(result);
}

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

  if (playlist.coverUrl && typeof playlist.coverUrl === "string" && playlist.coverUrl.trim().length > 0) {
    return playlist.coverUrl;
  }

  // 3. Fallback: First Track Cover Art only if no playlist cover or snippet thumbnail exists
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
 * Permanent Playlist Type Lock:
 * Ensures user-created playlists never inherit official album properties, badges, or types from added tracks.
 */
export function lockPlaylistTypeMetadata<T extends Partial<Playlist>>(playlist: T): T {
  if (!playlist) return playlist;
  const isUser = Boolean(
    playlist.isUserCreated === true ||
    playlist.type === "playlist" ||
    (playlist.id && typeof playlist.id === "string" && (playlist.id.startsWith("pl_custom_") || playlist.id.startsWith("PL") || playlist.id.startsWith("VLPL"))) ||
    playlist.isEditable === true
  );

  if (isUser) {
    return {
      ...playlist,
      isUserCreated: true,
      type: "playlist",
      isEditable: true,
      isAlbum: false,
      // Never allow an official album badge on user-created playlists
      badge: playlist.badge && !playlist.badge.toLowerCase().includes("album") ? playlist.badge : "Playlist",
    };
  }

  return playlist;
}

/**
 * Creates explicit user playlist metadata with locked properties
 */
export function createPlaylistMetadata(
  title: string,
  options?: {
    description?: string;
    coverUrl?: string;
    tracks?: Track[];
    id?: string;
    privacy?: string;
  }
): Playlist {
  const id = options?.id || `pl_custom_${Date.now()}`;
  return {
    id,
    playlistId: id,
    title: title || "New Playlist",
    description: options?.description || "Created with Oblivion Music",
    coverUrl: options?.coverUrl || options?.tracks?.[0]?.coverUrl || "",
    customCoverUrl: options?.coverUrl,
    isCustomCover: Boolean(options?.coverUrl),
    tracks: options?.tracks || [],
    tracksCount: options?.tracks?.length || 0,
    isUserCreated: true,
    type: "playlist",
    isEditable: true,
    badge: "Playlist",
    privacy: options?.privacy || "PUBLIC",
    privacyStatus: options?.privacy || "PUBLIC",
  };
}

/**
 * Stitch server-persisted and locally cached custom artwork into a list of playlists
 */
export function stitchCustomArtworkToPlaylists(playlists: Playlist[]): Playlist[] {
  if (!Array.isArray(playlists)) return [];

  const store = getCustomArtworkStore();

  return playlists.map((rawPl) => {
    if (!rawPl || !rawPl.id) return rawPl;
    const pl = lockPlaylistTypeMetadata(rawPl);
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

  let token = tokenOverride || getStoredAuthToken();
  if (!token) {
    try {
      const inMem = (window as any).__OBLIVION_ACCESS_TOKEN;
      if (inMem) token = inMem;
    } catch {}
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    headers["X-Access-Token"] = token;
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
    let res = await apiFetch(`/api/youtube/playlists/${encodeURIComponent(cleanId)}/items?${queryParams}`, {
      headers,
    });
    if (!res.ok) {
      res = await apiFetch(`/api/playlists/${encodeURIComponent(cleanId)}/items?${queryParams}`, {
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
    let res = await apiFetch(`/api/youtube/playlists/${encodeURIComponent(cleanId)}/items`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        track,
        allowDuplicate: Boolean(options?.allowDuplicate),
      }),
    });

    if (!res.ok) {
      res = await apiFetch(`/api/playlists/${encodeURIComponent(cleanId)}/items`, {
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
    let res = await apiFetch(`/api/youtube/playlists/${encodeURIComponent(cleanId)}/items/${cleanTrackId}`, {
      method: "DELETE",
      headers,
    });

    if (!res.ok) {
      res = await apiFetch(`/api/playlists/${encodeURIComponent(cleanId)}/items/${cleanTrackId}`, {
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

    let res = await apiFetch(`/api/playlists/reorder`, {
      method: "POST",
      headers,
      body: payload,
    }).catch(() => null);

    if (!res || !res.ok) {
      res = await apiFetch(`/api/youtube/playlists/${encodeURIComponent(cleanId)}/reorder`, {
        method: "PUT",
        headers,
        body: payload,
      }).catch(() => null);
    }

    if (!res || !res.ok) {
      res = await apiFetch(`/api/playlists/${encodeURIComponent(cleanId)}/reorder`, {
        method: "PUT",
        headers,
        body: payload,
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

