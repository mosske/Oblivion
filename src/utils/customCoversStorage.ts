export const CUSTOM_PLAYLIST_COVERS_KEY = "CUSTOM_PLAYLIST_COVERS";

export const DEFAULT_PLACEHOLDER_COVER =
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80";

/**
 * Read the entire isolated CUSTOM_PLAYLIST_COVERS store from LocalStorage
 */
export function getCustomPlaylistCovers(): Record<string, string> {
  if (typeof window === "undefined" || !window.localStorage) return {};
  try {
    const raw = localStorage.getItem(CUSTOM_PLAYLIST_COVERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Failed to parse CUSTOM_PLAYLIST_COVERS from localStorage", err);
  }
  return {};
}

/**
 * Write a custom artwork entry to CUSTOM_PLAYLIST_COVERS immediately.
 * Writes to both full ID and clean ID (without 'VL' prefix) for rock-solid indexing.
 */
export function setCustomPlaylistCover(playlistId: string, customCoverUrl: string | null | undefined): void {
  if (typeof window === "undefined" || !window.localStorage || !playlistId) return;
  try {
    const store = getCustomPlaylistCovers();
    const cleanId = playlistId.replace(/^VL/, "");
    if (customCoverUrl && typeof customCoverUrl === "string" && customCoverUrl.trim().length > 0) {
      store[playlistId] = customCoverUrl.trim();
      store[cleanId] = customCoverUrl.trim();
    } else {
      delete store[playlistId];
      delete store[cleanId];
    }
    localStorage.setItem(CUSTOM_PLAYLIST_COVERS_KEY, JSON.stringify(store));
  } catch (err) {
    console.warn("Failed to persist to CUSTOM_PLAYLIST_COVERS", err);
  }
}

/**
 * Enforces the exact resolution hierarchy:
 * const displayCover =
 *   CUSTOM_PLAYLIST_COVERS[playlist.id] ||
 *   playlist.customCoverUrl ||
 *   playlist.coverUrl ||
 *   playlist.tracks?.[0]?.coverUrl ||
 *   DEFAULT_PLACEHOLDER;
 */
export function resolvePlaylistCoverUrl(
  playlist: {
    id?: string;
    playlistId?: string;
    customCoverUrl?: string;
    coverUrl?: string;
    tracks?: Array<{ coverUrl?: string }>;
  } | null | undefined,
  placeholder: string = DEFAULT_PLACEHOLDER_COVER
): string {
  if (!playlist) return placeholder;
  const plId = playlist.id || playlist.playlistId || "";
  const cleanId = plId ? plId.replace(/^VL/, "") : "";
  const customCovers = getCustomPlaylistCovers();

  const customFromStore = (plId && customCovers[plId]) || (cleanId && customCovers[cleanId]);

  const displayCover =
    customFromStore ||
    playlist.customCoverUrl ||
    playlist.coverUrl ||
    playlist.tracks?.[0]?.coverUrl ||
    placeholder;

  return displayCover || placeholder;
}
