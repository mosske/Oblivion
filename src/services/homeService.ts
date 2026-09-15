import { Track, Album, Playlist, User } from "../types";
import { getInMemoryToken } from "./authService";

export const OBLIVION_PLAYBACK_HISTORY_KEY = "OBLIVION_PLAYBACK_HISTORY";

export interface PlaybackHistoryItem extends Track {
  playedAt?: number;
  mediaType?: "song" | "video";
}

/**
 * Retrieves the local playback history from localStorage.
 */
export function getPlaybackHistory(): PlaybackHistoryItem[] {
  try {
    const raw = localStorage.getItem(OBLIVION_PLAYBACK_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => item && (item.id || item.youtubeVideoId));
    }
  } catch (err) {
    console.warn("Failed to parse OBLIVION_PLAYBACK_HISTORY:", err);
  }
  return [];
}

/**
 * Records a track or video into the local playback history.
 */
export function recordPlaybackHistory(track: Track, mediaType?: "song" | "video") {
  if (!track) return;
  try {
    const trId = track.id || track.youtubeVideoId;
    if (!trId) return;

    const existing = getPlaybackHistory();
    const filtered = existing.filter((item) => (item.id || item.youtubeVideoId) !== trId);

    const isVideo = mediaType === "video" || track.isVideo || Boolean(track.channelTitle && !track.album);

    filtered.unshift({
      ...track,
      id: trId,
      playedAt: Date.now(),
      mediaType: isVideo ? "video" : "song",
    });

    localStorage.setItem(OBLIVION_PLAYBACK_HISTORY_KEY, JSON.stringify(filtered.slice(0, 60)));
  } catch (err) {
    console.warn("Failed to record OBLIVION_PLAYBACK_HISTORY:", err);
  }
}

/**
 * Extracts unique artist names from the user's library playlists and tracks.
 */
export function extractUserLibraryArtists(playlists: Playlist[]): string[] {
  const artists = new Set<string>();

  if (Array.isArray(playlists)) {
    for (const pl of playlists) {
      if (pl.artist && typeof pl.artist === "string") {
        const clean = pl.artist.trim();
        if (clean && clean.toLowerCase() !== "youtube" && clean.toLowerCase() !== "various artists") {
          artists.add(clean);
        }
      }
      if (Array.isArray(pl.tracks)) {
        for (const t of pl.tracks) {
          if (t && t.artist && typeof t.artist === "string") {
            const clean = t.artist.trim();
            if (clean && clean.toLowerCase() !== "unknown artist") {
              artists.add(clean);
            }
          }
        }
      }
    }
  }

  // Also extract from playback history
  const history = getPlaybackHistory();
  for (const h of history.slice(0, 20)) {
    if (h.artist && typeof h.artist === "string" && h.artist !== "Unknown Artist") {
      artists.add(h.artist.trim());
    }
  }

  return Array.from(artists);
}

export interface CuratedGenreItem {
  id: string;
  title: string;
  query: string;
  color: string;
  matchedFromUser?: boolean;
}

const ALL_GENRES_CATALOG: CuratedGenreItem[] = [
  { id: "jazz", title: "Jazz & Blues", query: "Smooth Jazz and Blues Classics", color: "from-amber-700 to-amber-900" },
  { id: "kpop", title: "K-Pop", query: "Top K-Pop Music Hits Official", color: "from-violet-500 to-fuchsia-600" },
  { id: "funk", title: "Funk & Soul", query: "Classic Funk and Soul Grooves", color: "from-orange-600 to-amber-800" },
  { id: "gaming", title: "Gaming OST", query: "Epic Gaming Soundtracks and OST", color: "from-purple-600 to-indigo-950" },
  { id: "classical", title: "Classical", query: "Top Classical Music Masterpieces", color: "from-slate-700 to-zinc-900" },
  { id: "rnb", title: "R&B", query: "Top R&B Soul Hits", color: "from-pink-600 to-purple-800" },
  { id: "pop", title: "Pop Hits", query: "Top Pop Music Hits", color: "from-pink-500 to-rose-600" },
  { id: "hiphop", title: "Hip-Hop & Rap", query: "Top Hip Hop Rap Hits Official", color: "from-amber-600 to-orange-700" },
  { id: "rock", title: "Rock & Alternative", query: "Top Rock Alternative Hits", color: "from-red-700 to-zinc-900" },
  { id: "electronic", title: "Electronic / EDM", query: "Top EDM Electronic Dance Music", color: "from-cyan-500 to-blue-700" },
  { id: "lofi", title: "Lo-Fi & Chill", query: "Lofi hip hop chill beats to study relax", color: "from-teal-700 to-indigo-800" },
  { id: "indie", title: "Indie", query: "Top Indie Pop Rock Music", color: "from-emerald-600 to-teal-700" },
];

/**
 * Detects genres user listens to from their playlist titles and tracks.
 */
export function extractUserLibraryGenres(playlists: Playlist[]): CuratedGenreItem[] {
  const combinedText = playlists
    .map((p) => `${p.title} ${p.description || ""} ${p.tracks?.map((t) => `${t.title} ${t.artist}`).join(" ") || ""}`)
    .join(" ")
    .toLowerCase();

  const matched: CuratedGenreItem[] = [];
  const unmatched: CuratedGenreItem[] = [];

  for (const g of ALL_GENRES_CATALOG) {
    const key = g.id.toLowerCase();
    const titleKey = g.title.toLowerCase();
    if (combinedText.includes(key) || combinedText.includes(titleKey) || (key === "gaming" && combinedText.includes("ost"))) {
      matched.push({ ...g, matchedFromUser: true });
    } else {
      unmatched.push(g);
    }
  }

  // Prioritize matched genres, then fill up to 8 total
  return [...matched, ...unmatched].slice(0, 8);
}

export interface PersonalizedHomeData {
  jumpBackIn: Playlist[];
  listenAgain: PlaybackHistoryItem[];
  newReleasesForYou: Album[];
  quickPicks: Playlist[];
  communityPlaylists: Playlist[];
  livePerformances: Track[];
  albumsForYou: Album[];
  musicGenres: CuratedGenreItem[];
  moodFilters: string[];
}

/**
 * Fetches all dynamic personalized sections for an authenticated user.
 */
export async function fetchPersonalizedHomeFeed(
  user: User | null | undefined,
  playlists: Playlist[],
  activeMood = "All"
): Promise<PersonalizedHomeData> {
  let activeToken = user?.accessToken || getInMemoryToken() || "";
  if (!activeToken) {
    try {
      const saved = localStorage.getItem("oblivion_saved_user");
      if (saved) {
        const parsed = JSON.parse(saved);
        activeToken = parsed?.accessToken || "";
      }
    } catch {}
  }

  const authHeaders: Record<string, string> = {};
  if (activeToken) {
    authHeaders["Authorization"] = `Bearer ${activeToken}`;
  }

  // 1. Jump Back In: user playlists with actual tracks (top 4-6)
  const validUserPlaylists = (playlists || []).filter(
    (p) => p && ((Array.isArray(p.tracks) && p.tracks.length > 0) || (p.tracksCount && p.tracksCount > 0))
  );

  const jumpBackIn: Playlist[] = validUserPlaylists.slice(0, 6);

  // 2. Quick Picks: shortcuts to favorite user playlists
  const quickPicks: Playlist[] = validUserPlaylists.slice(0, 8);

  // 3. Listen Again: from local playback history
  const history = getPlaybackHistory();
  let listenAgain = history.slice(0, 16);

  // If local history is small, fetch recent liked/popular songs to fill
  if (listenAgain.length < 6 && validUserPlaylists.length > 0) {
    const fallbackTracks: Track[] = [];
    for (const pl of validUserPlaylists) {
      if (Array.isArray(pl.tracks)) {
        for (const t of pl.tracks) {
          if (t && !listenAgain.some((item) => (item.id || item.youtubeVideoId) === (t.id || t.youtubeVideoId))) {
            fallbackTracks.push({ ...t, isVideo: false });
          }
        }
      }
    }
    listenAgain = [...listenAgain, ...fallbackTracks].slice(0, 16);
  }

  // 4. Extract Artists from user library
  const userArtists = extractUserLibraryArtists(playlists);
  const primaryArtists = userArtists.slice(0, 4);

  // 5. Query dynamic recommendations in parallel
  const searchQueries: Promise<any>[] = [];

  // A. New releases for you (matching user's artists)
  const newReleasesQuery = primaryArtists.length > 0
    ? `${primaryArtists[0]} new album 2026`
    : "New Music Releases 2026 Album Official";
  searchQueries.push(
    fetch(`/api/youtube/search?q=${encodeURIComponent(newReleasesQuery)}&type=album`, { headers: authHeaders })
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .catch(() => ({ results: [] }))
  );

  // B. Live performances by user's artists
  const liveQuery = primaryArtists.length > 0
    ? `${primaryArtists[0]} live concert performance official music video`
    : "Top live concert performance official music video";
  searchQueries.push(
    fetch(`/api/youtube/search?q=${encodeURIComponent(liveQuery)}&type=track`, { headers: authHeaders })
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .catch(() => ({ results: [] }))
  );

  // C. Albums for you (matching user's artists)
  const albumQuery = primaryArtists.length > 1
    ? `${primaryArtists[1]} full album`
    : primaryArtists.length > 0
    ? `${primaryArtists[0]} full album`
    : "Best albums of all time music";
  searchQueries.push(
    fetch(`/api/youtube/search?q=${encodeURIComponent(albumQuery)}&type=album`, { headers: authHeaders })
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .catch(() => ({ results: [] }))
  );

  // D. From the community (public playlists with actual tracks matching user's artists)
  const communityQuery = primaryArtists.length > 0
    ? `${primaryArtists[0]} playlist hits`
    : "Top Hits Playlist 2026";
  searchQueries.push(
    fetch(`/api/youtube/search?q=${encodeURIComponent(communityQuery)}&type=playlist`, { headers: authHeaders })
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .catch(() => ({ results: [] }))
  );

  const [newReleasesRes, liveRes, albumsRes, communityRes] = await Promise.all(searchQueries);

  const newReleasesForYou: Album[] = (newReleasesRes?.results || [])
    .filter((a: any) => a && (a.id || a.playlistId))
    .slice(0, 10);

  const livePerformances: Track[] = (liveRes?.results || [])
    .filter((t: any) => t && (t.id || t.youtubeVideoId))
    .map((t: any) => ({ ...t, isVideo: true }))
    .slice(0, 10);

  const albumsForYou: Album[] = (albumsRes?.results || [])
    .filter((a: any) => a && (a.id || a.playlistId))
    .slice(0, 10);

  const communityPlaylists: Playlist[] = (communityRes?.results || [])
    .filter((p: any) => p && (p.id || p.playlistId) && !p.id?.startsWith("pl_"))
    .map((p: any) => ({
      id: p.id || p.playlistId,
      title: p.title || "Community Playlist",
      description: p.artist ? `Curated by ${p.artist}` : "Curated YouTube Playlist",
      coverUrl: p.coverUrl || "",
      tracksCount: p.tracksCount || 25,
      tracks: [],
    }))
    .slice(0, 8);

  // 6. Music Genres personalized
  const musicGenres = extractUserLibraryGenres(playlists);

  return {
    jumpBackIn,
    listenAgain,
    newReleasesForYou,
    quickPicks,
    communityPlaylists,
    livePerformances,
    albumsForYou,
    musicGenres,
    moodFilters: ["All", "Relax", "Workout", "Focus", "Energize", "Commute", "Party", "Romance", "Sleep"],
  };
}
