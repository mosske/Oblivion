import { Track, Album } from "../types";
import { getInMemoryToken } from "./authService";

export interface ChartTrack extends Track {
  rank: number;
  rankChange: "up" | "down" | "same";
}

export interface MoodItem {
  id: string;
  title: string;
  color: string;
  query: string;
}

export interface PodcastItem {
  id: string;
  youtubeVideoId: string;
  title: string;
  channelTitle: string;
  coverUrl: string;
  durationText?: string;
  description?: string;
}

export interface VideoTrailerItem extends Track {
  videoType: "music_video" | "trailer" | "live";
}

export interface ExploreData {
  newReleases: Album[];
  charts: ChartTrack[];
  moodsAndMoments: MoodItem[];
  genres: MoodItem[];
  podcasts: PodcastItem[];
  videosAndTrailers: VideoTrailerItem[];
}

export async function fetchExploreFeedData(): Promise<ExploreData> {
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

  // 1. Fetch base explore feed
  const basePromise = fetch(`/api/youtube/explore?_t=${Date.now()}`, { headers })
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}));

  // 2. Fetch podcasts and music reviews
  const podcastsPromise = fetch(
    `/api/youtube/search?q=${encodeURIComponent("Popular Music Podcasts Full Episode Interview")}&type=track`,
    { headers }
  )
    .then((r) => (r.ok ? r.json() : { results: [] }))
    .catch(() => ({ results: [] }));

  // 3. Fetch trailers and official music videos
  const trailersPromise = fetch(
    `/api/youtube/search?q=${encodeURIComponent("Official New Movie Trailers 4K Official Teaser")}&type=track`,
    { headers }
  )
    .then((r) => (r.ok ? r.json() : { results: [] }))
    .catch(() => ({ results: [] }));

  const [rawBaseData, podcastsRes, trailersRes] = await Promise.all([
    basePromise,
    podcastsPromise,
    trailersPromise,
  ]);

  const baseData: any = rawBaseData || {};

  const trendingVideos: Track[] = baseData?.trendingVideos || [];
  const trailerTracks: Track[] = trailersRes?.results || [];

  // Combine trending music videos and movie trailers
  const videosAndTrailers: VideoTrailerItem[] = [
    ...trendingVideos.map((v) => ({ ...v, isVideo: true, videoType: "music_video" as const })),
    ...trailerTracks.slice(0, 10).map((t) => ({ ...t, isVideo: true, videoType: "trailer" as const })),
  ];

  const podcasts: PodcastItem[] = (podcastsRes?.results || []).slice(0, 8).map((p: any) => ({
    id: p.id || p.youtubeVideoId,
    youtubeVideoId: p.youtubeVideoId || p.id,
    title: p.title || "Music Podcast",
    channelTitle: p.artist || p.uploader || "Podcast Network",
    coverUrl: p.coverUrl || "",
    durationText: p.durationText,
    description: p.album || "Full Episode & Discussion",
  }));

  return {
    newReleases: baseData?.newReleases || [],
    charts: baseData?.charts || [],
    moodsAndMoments: baseData?.moodsAndMoments || [],
    genres: baseData?.genres || [],
    podcasts,
    videosAndTrailers,
  };
}
