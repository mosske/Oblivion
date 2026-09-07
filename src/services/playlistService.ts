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
 * 2. Strict Playlist Artwork Resolution Engine:
 * 
 * Order of Resolution:
 * 1. Local / Server Persistent Override (IndexedDB / LocalStorage / customArtwork property)
 * 2. YouTube Official Thumbnail (snippet.thumbnails.high -> medium -> default -> maxres -> standard -> coverUrl)
 * 3. First Track Cover Fallback (playlist.tracks[0].thumbnail / playlist.tracks[0].coverUrl)
 * 4. Default Placeholder (null)
 */
export function getPlaylistArtwork(playlist: Playlist | {
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
} | null | undefined): string | null {
  if (!playlist) return null;

  const id = playlist.id || (playlist as any).playlistId || "";

  // 1. Local Persistent Override (IndexedDB / LocalStorage / In-memory custom mappings)
  if (id) {
    const customArt = getCustomArtworkFromStorage(id);
    if (customArt && isAuthenticCustomArtworkUrl(customArt)) {
      return customArt;
    }
  }

  // Check explicit custom artwork fields on the playlist object
  const customProp = playlist.customArtwork || playlist.customCoverUrl;
  if (customProp && isAuthenticCustomArtworkUrl(customProp)) {
    if (id) {
      setPlaylistCustomArtwork(id, customProp);
    }
    return customProp;
  }

  if (playlist.isCustomCover && playlist.coverUrl && !isVideoThumbnailUrl(playlist.coverUrl)) {
    if (id) {
      setPlaylistCustomArtwork(id, playlist.coverUrl);
    }
    return playlist.coverUrl;
  }

  // 2. YouTube Official Thumbnail Hierarchy
  // A. Check snippet.thumbnails (standard YouTube Data API format)
  const snippetThumbs = playlist.snippet?.thumbnails;
  if (snippetThumbs?.high?.url) return snippetThumbs.high.url;
  if (snippetThumbs?.medium?.url) return snippetThumbs.medium.url;
  if (snippetThumbs?.default?.url) return snippetThumbs.default.url;
  if (snippetThumbs?.maxres?.url) return snippetThumbs.maxres.url;
  if (snippetThumbs?.standard?.url) return snippetThumbs.standard.url;

  // B. Check playlist.thumbnails object
  const directThumbs = playlist.thumbnails;
  if (directThumbs?.high?.url) return directThumbs.high.url;
  if (directThumbs?.medium?.url) return directThumbs.medium.url;
  if (directThumbs?.default?.url) return directThumbs.default.url;
  if (directThumbs?.maxres?.url) return directThumbs.maxres.url;
  if (directThumbs?.standard?.url) return directThumbs.standard.url;

  // C. Direct thumbnail / coverUrl property if present and not a generic video thumbnail
  if (playlist.thumbnail && typeof playlist.thumbnail === "string" && playlist.thumbnail.trim().length > 0) {
    return playlist.thumbnail;
  }

  if (playlist.coverUrl && typeof playlist.coverUrl === "string" && playlist.coverUrl.trim().length > 0 && !isVideoThumbnailUrl(playlist.coverUrl)) {
    return playlist.coverUrl;
  }

  // 3. First Track Cover Fallback
  if (playlist.tracks && playlist.tracks.length > 0) {
    const firstTrack = playlist.tracks[0];
    if (firstTrack) {
      const trackThumb = firstTrack.thumbnail || firstTrack.coverUrl;
      if (trackThumb && typeof trackThumb === "string" && trackThumb.trim().length > 0) {
        return trackThumb;
      }
    }
  }

  // Fallback to playlist.coverUrl even if it contains /vi/ (if nothing else matched)
  if (playlist.coverUrl && typeof playlist.coverUrl === "string" && playlist.coverUrl.trim().length > 0) {
    return playlist.coverUrl;
  }

  // 4. Default Placeholder
  return null;
}

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
