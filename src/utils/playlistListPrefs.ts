import { Playlist } from "../types";
import { getCachedPlaylists } from "../services/playlistService";

// Shared by the Library page and the desktop sidebar so both always show the same playlists.
export const HIDDEN_PLAYLISTS_KEY = "oblivion_hidden_playlists";
export const PLAYLIST_SORT_KEY = "oblivion_playlist_sort";
export const PLAYLIST_PREFS_EVENT = "oblivion-playlist-prefs-changed";

export function readHiddenPlaylistIds(): string[] {
  try {
    const stored = localStorage.getItem(HIDDEN_PLAYLISTS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readPlaylistSort(): string {
  try {
    return localStorage.getItem(PLAYLIST_SORT_KEY) || "recent";
  } catch {
    return "recent";
  }
}

// Tell other parts of the app (e.g. the sidebar) that hidden playlists / sort order changed.
// Deferred so it is safe to call from inside a React state updater.
export function notifyPlaylistPrefsChanged(): void {
  setTimeout(() => {
    try {
      window.dispatchEvent(new Event(PLAYLIST_PREFS_EVENT));
    } catch {}
  }, 0);
}

// Same filtering and de-duplication rules the Library page applies.
export function cleanLibraryPlaylists(playlists: Playlist[] | null | undefined): Playlist[] {
  const effective = Array.isArray(playlists) && playlists.length > 0 ? playlists : getCachedPlaylists();
  const seen = new Set<string>();
  return (effective || []).filter((pl) => {
    if (!pl) return false;
    const id = pl.id || pl.playlistId;
    if (!id || seen.has(id)) return false;
    const cleanId = String(id).replace(/^VL/, "");
    if (cleanId === "LL" || cleanId === "LM" || cleanId === "WL" || cleanId === "HL") return false;
    if (cleanId.length === 11 && !cleanId.startsWith("PL")) return false; // single video ID
    if (cleanId.startsWith("FE")) return false;
    if (cleanId.startsWith("UC") && cleanId.length === 24) return false;
    const title = pl.title ? pl.title.toLowerCase() : "";
    if (
      title === "liked music & videos" ||
      title === "liked videos" ||
      title === "liked music" ||
      title === "watch later" ||
      title === "history" ||
      title === "watch history"
    ) {
      return false;
    }
    seen.add(id);
    return true;
  });
}

// Visible (non-hidden) playlists in the same order the Library shows them.
export function getLibraryVisiblePlaylists(
  playlists: Playlist[] | null | undefined,
  hiddenIds: string[],
  sortOption: string
): Playlist[] {
  const list = cleanLibraryPlaylists(playlists).filter((pl) => !hiddenIds.includes(pl.id));
  return list.sort((a, b) => {
    if (sortOption === "name-asc") return (a.title || "").localeCompare(b.title || "");
    if (sortOption === "name-desc") return (b.title || "").localeCompare(a.title || "");
    if (sortOption === "tracks-desc") {
      const countA = a.tracks?.length || a.tracksCount || 0;
      const countB = b.tracks?.length || b.tracksCount || 0;
      return countB - countA;
    }
    if (sortOption === "tracks-asc") {
      const countA = a.tracks?.length || a.tracksCount || 0;
      const countB = b.tracks?.length || b.tracksCount || 0;
      return countA - countB;
    }
    return 0; // "recent" keeps the default order
  });
}
