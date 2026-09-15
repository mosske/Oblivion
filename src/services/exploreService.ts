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

export interface MovieTrailerItem extends Track {
  videoType: "trailer";
  publishedText?: string;
  publishedAt?: string;
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
  musicVideos: Track[];
  movieTrailers: MovieTrailerItem[];
  videosAndTrailers?: VideoTrailerItem[];
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

  // 3. Fetch latest movie trailers fresh from the past 3 months strictly
  const trailersPromise = fetch(`/api/youtube/trailers?_t=${Date.now()}`, { headers })
    .then((r) => (r.ok ? r.json() : { trailers: [] }))
    .catch(() => ({ trailers: [] }));

  // 4. Fetch trending 4K music videos
  const musicVideosPromise = fetch(
    `/api/youtube/search?q=${encodeURIComponent("Official 4K Music Videos 2026 Hits")}&type=video`,
    { headers }
  )
    .then((r) => (r.ok ? r.json() : { results: [] }))
    .catch(() => ({ results: [] }));

  const [rawBaseData, podcastsRes, trailersRes, musicVideosRes] = await Promise.all([
    basePromise,
    podcastsPromise,
    trailersPromise,
    musicVideosPromise,
  ]);

  const baseData: any = rawBaseData || {};

  const baseTrendingVideos: Track[] = baseData?.trendingVideos || [];
  const searchMusicVideos: Track[] = musicVideosRes?.results || [];

  // Combine base trending music videos with search music videos
  const musicVideos: Track[] = [
    ...baseTrendingVideos.map((v) => ({ ...v, isVideo: true, mediaType: "video" as const })),
    ...searchMusicVideos.map((v) => ({ ...v, isVideo: true, mediaType: "video" as const })),
  ];

  // Movie trailers fresh within past 3 months
  const rawTrailers = trailersRes?.trailers || [];
  const movieTrailers: MovieTrailerItem[] = rawTrailers.map((t: any) => ({
    ...t,
    isVideo: true,
    videoType: "trailer" as const,
    mediaType: "video" as const,
    publishedText: t.publishedText || "Past 3 Months",
  }));

  const podcasts: PodcastItem[] = (podcastsRes?.results || []).slice(0, 8).map((p: any) => ({
    id: p.id || p.youtubeVideoId,
    youtubeVideoId: p.youtubeVideoId || p.id,
    title: p.title || "Music Podcast",
    channelTitle: p.artist || p.uploader || "Podcast Network",
    coverUrl: p.coverUrl || "",
    durationText: p.durationText,
    description: p.album || "Full Episode & Discussion",
  }));

  // Backwards compatibility for videosAndTrailers
  const videosAndTrailers: VideoTrailerItem[] = [
    ...musicVideos.slice(0, 8).map((v) => ({ ...v, videoType: "music_video" as const })),
    ...movieTrailers.slice(0, 8).map((t) => ({ ...t, videoType: "trailer" as const })),
  ];

  return {
    newReleases: baseData?.newReleases || [],
    charts: baseData?.charts || [],
    moodsAndMoments: baseData?.moodsAndMoments || [],
    genres: baseData?.genres || [],
    podcasts,
    musicVideos,
    movieTrailers,
    videosAndTrailers,
  };
}
