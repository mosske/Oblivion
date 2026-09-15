import { Track } from "../types";
import { getInMemoryToken } from "./authService";

export interface GenreItem {
  id: string;
  title: string;
  query: string;
  color?: string;
  description?: string;
  coverUrl?: string;
}

const genreTracksCache = new Map<string, Track[]>();

export async function fetchGenreTracks(query: string): Promise<Track[]> {
  const normalizedKey = query.trim().toLowerCase();
  if (genreTracksCache.has(normalizedKey)) {
    return genreTracksCache.get(normalizedKey)!;
  }

  let activeToken = getInMemoryToken() || "";
  if (!activeToken) {
    try {
      const saved = localStorage.getItem("oblivion_saved_user");
      if (saved) {
        const parsed = JSON.parse(saved);
        activeToken = parsed?.accessToken || "";
      }
    } catch {}
  }

  const headers: Record<string, string> = {};
  if (activeToken) {
    headers["Authorization"] = `Bearer ${activeToken}`;
  }

  try {
    const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}&type=track`, {
      headers,
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch genre tracks (${res.status})`);
    }
    const data = await res.json();
    const results: Track[] = (data?.results || []).map((t: any) => ({
      ...t,
      id: t.id || t.youtubeVideoId,
      coverUrl:
        t.coverUrl ||
        (t.youtubeVideoId || t.id
          ? `https://i.ytimg.com/vi/${t.youtubeVideoId || t.id}/hqdefault.jpg`
          : "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80"),
    }));

    genreTracksCache.set(normalizedKey, results);
    return results;
  } catch (err) {
    console.error("fetchGenreTracks error:", err);
    return [];
  }
}
