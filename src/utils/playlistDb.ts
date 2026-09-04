import { Playlist, Track } from "../types";

const DB_NAME = "OblivionPlaylistStoreDB";
const DB_VERSION = 2;
const STORE_PLAYLISTS = "playlists";
const STORE_PLAYLIST_TRACKS = "playlist_tracks";
const STORE_CUSTOM_COVERS = "custom_covers";

const LOCAL_STORAGE_KEY_PLAYLISTS = "oblivion_saved_playlists";
const LOCAL_STORAGE_KEY_CUSTOM_COVERS = "oblivion_custom_covers_map";

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Opens and initializes the IndexedDB playlist store with dedicated stores for:
 * 1. `playlists`: Metadata, track counts, sync states
 * 2. `playlist_tracks`: Track arrays keyed by playlistId for immediate offline/local rendering
 * 3. `custom_covers`: Isolated store for custom playlist covers to prevent remote overwrite
 */
export function openPlaylistDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this environment"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_PLAYLISTS)) {
        db.createObjectStore(STORE_PLAYLISTS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_PLAYLIST_TRACKS)) {
        db.createObjectStore(STORE_PLAYLIST_TRACKS, { keyPath: "playlistId" });
      }
      if (!db.objectStoreNames.contains(STORE_CUSTOM_COVERS)) {
        db.createObjectStore(STORE_CUSTOM_COVERS, { keyPath: "playlistId" });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
        dbPromise = null;
      };
      resolve(request.result);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

/**
 * Get all isolated custom covers from IndexedDB and localStorage
 */
export async function getCustomCoversFromCache(): Promise<Record<string, { customCoverUrl: string; isCustom: boolean }>> {
  const result: Record<string, { customCoverUrl: string; isCustom: boolean }> = {};

  // 1. Read from localStorage fallback
  try {
    const rawLocal = localStorage.getItem(LOCAL_STORAGE_KEY_CUSTOM_COVERS);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (parsed && typeof parsed === "object") {
        Object.assign(result, parsed);
      }
    }
  } catch {}

  // 2. Read from IndexedDB store
  try {
    const db = await openPlaylistDB();
    const tx = db.transaction(STORE_CUSTOM_COVERS, "readonly");
    const store = tx.objectStore(STORE_CUSTOM_COVERS);
    const req = store.getAll();

    await new Promise<void>((resolve) => {
      req.onsuccess = () => {
        const items = req.result || [];
        for (const item of items) {
          if (item?.playlistId && item?.customCoverUrl) {
            result[item.playlistId] = {
              customCoverUrl: item.customCoverUrl,
              isCustom: item.isCustom !== false,
            };
            const cleanId = item.playlistId.replace(/^VL/, "");
            result[cleanId] = {
              customCoverUrl: item.customCoverUrl,
              isCustom: item.isCustom !== false,
            };
          }
        }
        resolve();
      };
      req.onerror = () => resolve();
    });
  } catch {}

  return result;
}

/**
 * Lock and save a custom playlist cover to the dedicated store
 */
export async function saveCustomCoverToCache(
  playlistId: string,
  customCoverUrl: string,
  isCustom: boolean = true
): Promise<void> {
  const cleanId = playlistId.replace(/^VL/, "");
  const payload = {
    playlistId,
    customCoverUrl,
    isCustom,
    updatedAt: Date.now(),
  };

  // 1. Save to localStorage map
  try {
    const current = await getCustomCoversFromCache();
    current[playlistId] = { customCoverUrl, isCustom };
    current[cleanId] = { customCoverUrl, isCustom };
    localStorage.setItem(LOCAL_STORAGE_KEY_CUSTOM_COVERS, JSON.stringify(current));
  } catch {}

  // 2. Save to IndexedDB STORE_CUSTOM_COVERS
  try {
    const db = await openPlaylistDB();
    const tx = db.transaction(STORE_CUSTOM_COVERS, "readwrite");
    tx.objectStore(STORE_CUSTOM_COVERS).put(payload);
    if (cleanId !== playlistId) {
      tx.objectStore(STORE_CUSTOM_COVERS).put({ ...payload, playlistId: cleanId });
    }
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (e) {
    console.warn("IndexedDB save custom cover notice:", e);
  }
}

/**
 * Get all cached playlists from IndexedDB with instantaneous localStorage fallback
 */
export async function getCachedPlaylistsFromDB(): Promise<Playlist[]> {
  // 1. Initial synchronous check from localStorage for zero-latency initial paint
  let cached: Playlist[] = [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_PLAYLISTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        cached = parsed;
      }
    }
  } catch {}

  // 2. Read authoritative state from IndexedDB
  try {
    const db = await openPlaylistDB();
    const tx = db.transaction([STORE_PLAYLISTS, STORE_CUSTOM_COVERS], "readonly");
    const plStore = tx.objectStore(STORE_PLAYLISTS);
    const coverStore = tx.objectStore(STORE_CUSTOM_COVERS);

    const [dbPlaylists, dbCovers] = await Promise.all([
      new Promise<Playlist[]>((res) => {
        const req = plStore.getAll();
        req.onsuccess = () => res(req.result || []);
        req.onerror = () => res([]);
      }),
      new Promise<any[]>((res) => {
        const req = coverStore.getAll();
        req.onsuccess = () => res(req.result || []);
        req.onerror = () => res([]);
      }),
    ]);

    if (dbPlaylists.length > 0) {
      const coverMap = new Map<string, string>();
      for (const c of dbCovers) {
        if (c?.playlistId && c?.customCoverUrl) {
          coverMap.set(c.playlistId, c.customCoverUrl);
          coverMap.set(c.playlistId.replace(/^VL/, ""), c.customCoverUrl);
        }
      }

      cached = dbPlaylists.map((pl) => {
        const customUrl = coverMap.get(pl.id) || coverMap.get(pl.id.replace(/^VL/, "")) || pl.customCoverUrl;
        const isCustom = Boolean(customUrl || pl.isCustomCover);
        return {
          ...pl,
          customCoverUrl: customUrl || (isCustom ? pl.coverUrl : undefined),
          isCustomCover: isCustom,
        };
      });
    }
  } catch (err) {
    console.warn("IndexedDB get playlists notice:", err);
  }

  return cached;
}

/**
 * Save playlists to local database and localStorage, locking custom artwork properties
 */
export async function savePlaylistsToDBCache(playlists: Playlist[]): Promise<void> {
  if (!Array.isArray(playlists)) return;

  // 1. Mirror to localStorage
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_PLAYLISTS, JSON.stringify(playlists));
  } catch {}

  // 2. Persist to IndexedDB
  try {
    const db = await openPlaylistDB();
    const tx = db.transaction([STORE_PLAYLISTS, STORE_PLAYLIST_TRACKS, STORE_CUSTOM_COVERS], "readwrite");
    const plStore = tx.objectStore(STORE_PLAYLISTS);
    const trackStore = tx.objectStore(STORE_PLAYLIST_TRACKS);
    const coverStore = tx.objectStore(STORE_CUSTOM_COVERS);

    for (const pl of playlists) {
      if (!pl || !pl.id) continue;
      plStore.put(pl);

      // Save tracks array separately if populated
      if (Array.isArray(pl.tracks) && pl.tracks.length > 0) {
        trackStore.put({
          playlistId: pl.id,
          tracks: pl.tracks,
          cachedAt: Date.now(),
        });
      }

      // If playlist has custom cover art, lock it in the dedicated custom_covers store
      if (pl.customCoverUrl || pl.isCustomCover) {
        const cover = pl.customCoverUrl || pl.coverUrl;
        if (cover) {
          coverStore.put({
            playlistId: pl.id,
            customCoverUrl: cover,
            isCustom: true,
            updatedAt: Date.now(),
          });
        }
      }
    }

    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.warn("IndexedDB save playlists notice:", err);
  }
}

/**
 * Retrieve cached tracks for a specific playlist instantaneously on route open or launch
 */
export async function getCachedPlaylistTracksFromDB(playlistId: string): Promise<Track[] | null> {
  const cleanId = playlistId.replace(/^VL/, "");

  // 1. Check in-memory / localStorage playlists
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_PLAYLISTS);
    if (raw) {
      const parsed: Playlist[] = JSON.parse(raw);
      const match = parsed.find((p) => p.id === playlistId || p.id === cleanId || p.id?.replace(/^VL/, "") === cleanId);
      if (match?.tracks && Array.isArray(match.tracks) && match.tracks.length > 0) {
        return match.tracks;
      }
    }
  } catch {}

  // 2. Check IndexedDB STORE_PLAYLIST_TRACKS
  try {
    const db = await openPlaylistDB();
    const tx = db.transaction(STORE_PLAYLIST_TRACKS, "readonly");
    const store = tx.objectStore(STORE_PLAYLIST_TRACKS);

    const [res1, res2] = await Promise.all([
      new Promise<any>((res) => {
        const req = store.get(playlistId);
        req.onsuccess = () => res(req.result);
        req.onerror = () => res(null);
      }),
      new Promise<any>((res) => {
        const req = store.get(cleanId);
        req.onsuccess = () => res(req.result);
        req.onerror = () => res(null);
      }),
    ]);

    const record = res1 || res2;
    if (record?.tracks && Array.isArray(record.tracks) && record.tracks.length > 0) {
      return record.tracks;
    }
  } catch (err) {
    console.warn("IndexedDB get tracks notice:", err);
  }

  return null;
}

/**
 * Save tracks for a specific playlist in the local-first cache
 */
export async function savePlaylistTracksToDBCache(playlistId: string, tracks: Track[]): Promise<void> {
  if (!playlistId || !Array.isArray(tracks)) return;
  const cleanId = playlistId.replace(/^VL/, "");

  // 1. Update localStorage playlists
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_PLAYLISTS);
    if (raw) {
      const parsed: Playlist[] = JSON.parse(raw);
      const updated = parsed.map((p) => {
        if (p.id === playlistId || p.id === cleanId || p.id?.replace(/^VL/, "") === cleanId) {
          return { ...p, tracks, tracksCount: tracks.length };
        }
        return p;
      });
      localStorage.setItem(LOCAL_STORAGE_KEY_PLAYLISTS, JSON.stringify(updated));
    }
  } catch {}

  // 2. Update IndexedDB stores
  try {
    const db = await openPlaylistDB();
    const tx = db.transaction([STORE_PLAYLISTS, STORE_PLAYLIST_TRACKS], "readwrite");
    const plStore = tx.objectStore(STORE_PLAYLISTS);
    const trackStore = tx.objectStore(STORE_PLAYLIST_TRACKS);

    trackStore.put({
      playlistId,
      tracks,
      cachedAt: Date.now(),
    });

    if (cleanId !== playlistId) {
      trackStore.put({
        playlistId: cleanId,
        tracks,
        cachedAt: Date.now(),
      });
    }

    const plReq = plStore.get(playlistId);
    plReq.onsuccess = () => {
      if (plReq.result) {
        plStore.put({
          ...plReq.result,
          tracks,
          tracksCount: tracks.length,
        });
      }
    };

    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.warn("IndexedDB save tracks notice:", err);
  }
}

/**
 * Merge remote playlists with local cache enforcing:
 * 1. Strict custom cover locking (`customCoverUrl` never overwritten by track art or remote default thumbnail)
 * 2. Cached tracks preservation during shallow background sync
 * 3. Non-destructive sync that preserves active UI state
 */
export function mergeRemotePlaylistsWithLocalCache(
  remotePlaylists: Playlist[],
  cachedPlaylists: Playlist[],
  customCoversMap: Record<string, { customCoverUrl: string; isCustom: boolean }>
): Playlist[] {
  const mergedMap = new Map<string, Playlist>();

  // 1. Seed with cached playlists
  for (const pl of cachedPlaylists) {
    if (pl?.id) {
      mergedMap.set(pl.id, pl);
      mergedMap.set(pl.id.replace(/^VL/, ""), pl);
    }
  }

  const result: Playlist[] = [];
  const seenIds = new Set<string>();

  for (const remote of remotePlaylists) {
    if (!remote || !remote.id) continue;
    const plId = remote.id;
    const cleanId = plId.replace(/^VL/, "");
    if (seenIds.has(plId) || seenIds.has(cleanId)) continue;
    seenIds.add(plId);
    seenIds.add(cleanId);

    const cached = mergedMap.get(plId) || mergedMap.get(cleanId);
    const customLock = customCoversMap[plId] || customCoversMap[cleanId];

    // Determine locked custom cover URL
    const lockedCustomCoverUrl =
      customLock?.customCoverUrl ||
      cached?.customCoverUrl ||
      (cached?.isCustomCover ? cached.coverUrl : undefined) ||
      remote.customCoverUrl ||
      (remote.isCustomCover ? remote.coverUrl : undefined);

    const isCustom = Boolean(lockedCustomCoverUrl || customLock?.isCustom || cached?.isCustomCover || remote.isCustomCover);

    // Retain cached tracks if remote tracks are empty or pending
    const tracks =
      Array.isArray(remote.tracks) && remote.tracks.length > 0
        ? remote.tracks
        : (cached?.tracks && cached.tracks.length > 0 ? cached.tracks : []);

    const primaryCover = lockedCustomCoverUrl || remote.coverUrl || cached?.coverUrl || `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`;

    result.push({
      ...remote,
      id: plId,
      coverUrl: primaryCover,
      customCoverUrl: isCustom ? (lockedCustomCoverUrl || primaryCover) : undefined,
      isCustomCover: isCustom,
      tracks,
      tracksCount: remote.tracksCount || tracks.length || cached?.tracksCount || 0,
    });
  }

  // Include any locally created playlists not present on remote
  for (const cached of cachedPlaylists) {
    if (cached?.id && !seenIds.has(cached.id) && !seenIds.has(cached.id.replace(/^VL/, ""))) {
      seenIds.add(cached.id);
      seenIds.add(cached.id.replace(/^VL/, ""));
      result.push(cached);
    }
  }

  return result;
}
