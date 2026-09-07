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
