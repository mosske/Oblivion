import { Track } from "../types";

const DB_NAME = "OblivionMusicCacheDB";
const DB_VERSION = 1;
const STORE_TRACKS = "tracks";
const STORE_AUDIO = "audio_blobs";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_TRACKS)) {
        db.createObjectStore(STORE_TRACKS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_AUDIO)) {
        db.createObjectStore(STORE_AUDIO, { keyPath: "trackId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function cacheTrackAudio(
  track: Track,
  onProgress?: (pct: number) => void
): Promise<boolean> {
  try {
    // Fetch audio stream or file
    const res = await fetch(track.audioUrl);
    if (!res.ok) throw new Error("Failed to fetch audio stream");

    const reader = res.body?.getReader();
    const contentLength = +(res.headers.get("Content-Length") || 0);
    let receivedLength = 0;
    const chunks: Uint8Array[] = [];

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          receivedLength += value.length;
          if (contentLength && onProgress) {
            onProgress(Math.round((receivedLength / contentLength) * 100));
          }
        }
      }
    }

    const blob = new Blob(chunks, { type: "audio/mp3" });

    const db = await openDB();
    const tx = db.transaction([STORE_TRACKS, STORE_AUDIO], "readwrite");

    tx.objectStore(STORE_TRACKS).put({ ...track, cachedAt: new Date().toISOString() });
    tx.objectStore(STORE_AUDIO).put({ trackId: track.id, blob, size: blob.size });

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("Failed to cache track offline:", err);
    return false;
  }
}

export async function getCachedTrackAudioUrl(trackId: string): Promise<string | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_AUDIO, "readonly");
    const request = tx.objectStore(STORE_AUDIO).get(trackId);

    return new Promise((resolve) => {
      request.onsuccess = () => {
        if (request.result && request.result.blob) {
          const url = URL.createObjectURL(request.result.blob);
          resolve(url);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function isTrackCached(trackId: string): Promise<boolean> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_TRACKS, "readonly");
    const request = tx.objectStore(STORE_TRACKS).get(trackId);

    return new Promise((resolve) => {
      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function removeCachedTrack(trackId: string): Promise<boolean> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_TRACKS, STORE_AUDIO], "readwrite");
    tx.objectStore(STORE_TRACKS).delete(trackId);
    tx.objectStore(STORE_AUDIO).delete(trackId);

    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function getAllCachedTracks(): Promise<Track[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_TRACKS, "readonly");
    const request = tx.objectStore(STORE_TRACKS).getAll();

    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function getCacheSizeMB(): Promise<number> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_AUDIO, "readonly");
    const request = tx.objectStore(STORE_AUDIO).getAll();

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const items = request.result || [];
        const totalBytes = items.reduce((acc: number, item: any) => acc + (item.size || 0), 0);
        resolve(+(totalBytes / (1024 * 1024)).toFixed(2));
      };
      request.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

export async function clearAllCache(): Promise<boolean> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_TRACKS, STORE_AUDIO], "readwrite");
    tx.objectStore(STORE_TRACKS).clear();
    tx.objectStore(STORE_AUDIO).clear();

    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}
