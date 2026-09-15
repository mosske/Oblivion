import React, { useEffect, useState } from "react";
import { Track, Album } from "../types";
import {
  Compass,
  Flame,
  TrendingUp,
  Sparkles,
  Play,
  Music,
  ArrowUp,
  ArrowDown,
  Minus,
  Radio,
  Clock,
  Disc3,
  Loader2,
  RefreshCw,
  Video,
  Mic,
  Film,
  Tv,
} from "lucide-react";
import { cleanTrackTitle } from "../utils/formatters";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";
import { MarqueeText } from "./MarqueeText";
import {
  fetchExploreFeedData,
  ExploreData,
  ChartTrack,
  MoodItem,
  PodcastItem,
  VideoTrailerItem,
} from "../services/exploreService";

interface ExploreViewProps {
  onPlayTrack: (track: Track) => void;
  onPlayQueue: (tracks: Track[], startIndex?: number) => void;
  onSelectAlbum?: (album: Album) => void;
  onSearchGenre?: (genreQuery: string) => void;
  onPlayVideo?: (track: Track) => void;
  currentTrackId?: string;
  isPlaying?: boolean;
  designConfig?: FullAppDesignConfig;
}

type ExploreCategory = "All" | "New Releases" | "Charts" | "Moods & Genres" | "Videos & Trailers" | "Podcasts";

export const ExploreView: React.FC<ExploreViewProps> = ({
  onPlayTrack,
  onPlayQueue,
  onSelectAlbum,
  onSearchGenre,
  onPlayVideo,
  currentTrackId,
  isPlaying = false,
  designConfig = FULL_APP_DESIGNS["designer"],
}) => {
  const [activeCategory, setActiveCategory] = useState<ExploreCategory>("All");
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [data, setData] = useState<ExploreData>({
    newReleases: [],
    charts: [],
    moodsAndMoments: [],
    genres: [],
    podcasts: [],
    videosAndTrailers: [],
  });

  const categories: ExploreCategory[] = [
    "All",
    "New Releases",
    "Charts",
    "Moods & Genres",
    "Videos & Trailers",
    "Podcasts",
  ];

  const loadFeed = async () => {
    try {
      const exploreData = await fetchExploreFeedData();
      setData(exploreData);
    } catch (err) {
      console.warn("Explore feed load error:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadFeed();
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadFeed();
  };

  const formatDuration = (sec?: number) => {
    if (!sec || sec <= 0) return "--:--";
    const mins = Math.floor(sec / 60);
    const remainder = Math.floor(sec % 60);
    return `${mins}:${String(remainder).padStart(2, "0")}`;
  };

  const handleVideoClick = (item: Track) => {
    if (onPlayVideo) {
      onPlayVideo(item);
    } else {
      onPlayTrack(item);
    }
  };

  const showAll = activeCategory === "All";
  const showNewReleases = showAll || activeCategory === "New Releases";
  const showCharts = showAll || activeCategory === "Charts";
  const showMoodsAndGenres = showAll || activeCategory === "Moods & Genres";
  const showVideos = showAll || activeCategory === "Videos & Trailers";
  const showPodcasts = showAll || activeCategory === "Podcasts";

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 space-y-8 pb-64 sm:pb-72 md:pb-52 select-none">
      {/* Top Banner */}
      <div
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${
          designConfig.bannerGradient ||
          designConfig.multiAccentGradient ||
          "from-slate-900 via-indigo-950 to-slate-900"
        } border ${designConfig.accentBorder} p-6 sm:p-8 shadow-2xl transition-all duration-300`}
      >
        <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-20 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-500/30 via-indigo-600/40 to-transparent"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-xl space-y-2">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${
                designConfig.id === "neue-editorial"
                  ? "bg-[#1F1F1F]/10 text-[#1F1F1F] border border-[#1F1F1F]/20 shadow-xs"
                  : designConfig.isCandy
                  ? "bg-white/90 text-[#1e4a7a] border border-pink-200 shadow-xs"
                  : designConfig.isLight
                  ? "bg-white/15 text-[#f8f6f0] border border-white/25"
                  : "bg-cyan-500/10 border border-cyan-500/30 text-cyan-300"
              } text-xs font-bold`}
            >
              <Compass
                className={`w-3.5 h-3.5 ${
                  designConfig.id === "neue-editorial" ? "text-[#1F1F1F]" : designConfig.accentText
                }`}
              />
              <span>YouTube Music Discovery</span>
            </div>

            <h1
              className={`text-2xl sm:text-3xl md:text-4xl font-extrabold ${
                designConfig.id === "neue-editorial"
                  ? "text-white drop-shadow-[0_2px_8px_rgba(31,31,31,0.7)] [text-shadow:_0_2px_8px_rgba(31,31,31,0.7)]"
                  : designConfig.isCandy
                  ? "text-[#1e4a7a]"
                  : "text-white"
              } tracking-tight leading-tight`}
            >
              Explore & Discover
            </h1>
            <p
              className={`text-xs sm:text-sm ${
                designConfig.id === "neue-editorial"
                  ? "text-[#3A3530]"
                  : designConfig.isCandy
                  ? "text-[#3b1235]"
                  : "text-slate-200/90"
              } leading-relaxed font-medium`}
            >
              New releases, live global charts, 4K music videos & trailers, audio podcasts, and mood soundscapes.
            </p>
          </div>

          <button
            id="explore-fresh-pull-btn"
            onClick={handleManualRefresh}
            disabled={isRefreshing || loading}
            className={`px-4 py-2.5 rounded-xl ${designConfig.btnSecondary} font-bold text-xs flex items-center gap-2 shadow-md hover:scale-105 active:scale-95 transition-all border ${designConfig.borderSubtle}`}
            title="Refresh Explore Feed"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${designConfig.accentText} text-[var(--accent-color,var(--primary))] ${
                isRefreshing || loading ? "animate-spin" : ""
              }`}
              stroke="currentColor"
            />
            <span className={`${designConfig.textPrimary} font-bold`}>
              {isRefreshing ? "Refreshing..." : "Fresh Pull"}
            </span>
          </button>
        </div>
      </div>

      {/* Category Selector Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar -mx-1 px-1">
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all active:scale-95 ${
                isActive
                  ? `${designConfig.accentBg} ${designConfig.accentContrastText} shadow-md ring-2 ${designConfig.accentBorder}`
                  : `${designConfig.btnSecondary} ${designConfig.textSecondary} hover:${designConfig.textPrimary} border ${designConfig.borderSubtle}`
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div
          className={`p-20 text-center rounded-3xl ${designConfig.cardBg} border ${designConfig.borderSubtle} space-y-3`}
        >
          <Loader2
            className={`w-8 h-8 mx-auto ${designConfig.accentText} text-[var(--accent-color,var(--primary))] animate-spin`}
            stroke="currentColor"
          />
          <p className={`text-sm font-semibold ${designConfig.textPrimary}`}>
            Pulling fresh Explore data from YouTube Music...
          </p>
          <p className={`text-xs ${designConfig.textMuted}`}>
            Fetching trending singles, global charts, videos, and podcasts
          </p>
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* 1. NEW RELEASES & POPULAR SINGLES */}
          {/* ========================================================================= */}
          {showNewReleases && data.newReleases.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Flame className="w-5 h-5 text-amber-500" />
                  <div>
                    <h2 className={`text-lg sm:text-xl font-bold ${designConfig.headingPrimary} tracking-tight`}>
                      New Releases & Popular Singles
                    </h2>
                    <p className={`text-[11px] ${designConfig.headingMuted} font-medium`}>
                      Fresh trending albums and singles updated hourly
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {data.newReleases.map((album) => (
                  <div
                    key={album.id}
                    onClick={() => onSelectAlbum && onSelectAlbum(album)}
                    className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 ${designConfig.cardBg} ${designConfig.cardHover} border border-transparent hover:${designConfig.accentBorder} p-3 flex flex-col shadow-sm hover:shadow-xl`}
                  >
                    <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-black/10 shadow-inner">
                      <img
                        src={album.coverUrl}
                        alt={album.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80";
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <div className="p-3 rounded-full bg-white text-black shadow-lg transform group-hover:scale-110 transition-transform">
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 w-full">
                      <MarqueeText
                        text={cleanTrackTitle(album.title, album.artist)}
                        className={`font-bold text-sm ${designConfig.textPrimary} group-hover:${designConfig.accentText} transition-colors`}
                        containerClassName="w-full"
                        speed={28}
                      />
                      <MarqueeText
                        text={album.artist || "Unknown Artist"}
                        className={`text-xs ${designConfig.textMuted}`}
                        containerClassName="w-full mt-0.5"
                        speed={24}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* 2. CHARTS • TOP GLOBAL SONGS */}
          {/* ========================================================================= */}
          {showCharts && data.charts.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  <div>
                    <h2 className={`text-lg sm:text-xl font-bold ${designConfig.headingPrimary} tracking-tight`}>
                      Charts • Top Global Songs
                    </h2>
                    <p className={`text-[11px] ${designConfig.headingMuted} font-medium`}>
                      The most played songs on YouTube this week
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onPlayQueue(data.charts, 0)}
                  className={`px-3.5 py-1.5 rounded-xl ${designConfig.btnPrimary} text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play Charts</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {data.charts.map((track, idx) => {
                  const trId = track.id || track.youtubeVideoId;
                  const isCurrent = currentTrackId === trId;

                  return (
                    <div
                      key={trId || idx}
                      onClick={() => onPlayQueue(data.charts, idx)}
                      className={`group flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${
                        isCurrent
                          ? `${designConfig.cardBg} ring-1.5 ${designConfig.accentBorder} shadow-md`
                          : `${designConfig.cardBg} ${designConfig.cardHover}`
                      }`}
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        {/* Rank & Change */}
                        <div className="w-8 text-center shrink-0 flex flex-col items-center">
                          <span
                            className={`text-sm font-black font-mono ${
                              idx < 3 ? "text-[#c89b3c]" : designConfig.textPrimary
                            }`}
                          >
                            {track.rank}
                          </span>
                          <span className="text-[10px]">
                            {track.rankChange === "up" ? (
                              <ArrowUp className="w-3 h-3 text-emerald-500" />
                            ) : track.rankChange === "down" ? (
                              <ArrowDown className="w-3 h-3 text-rose-500" />
                            ) : (
                              <Minus className="w-3 h-3 text-slate-400" />
                            )}
                          </span>
                        </div>

                        {/* Thumbnail */}
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-sm bg-slate-800 flex items-center justify-center">
                          <img
                            src={
                              track.coverUrl ||
                              (track.youtubeVideoId || track.id
                                ? `https://i.ytimg.com/vi/${track.youtubeVideoId || track.id}/hqdefault.jpg`
                                : "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80")
                            }
                            alt={track.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            onError={(e) => {
                              const vId = track.youtubeVideoId || track.id;
                              if (vId) {
                                e.currentTarget.src = `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`;
                              } else {
                                e.currentTarget.src =
                                  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80";
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Play className="w-4 h-4 text-white fill-white" />
                          </div>
                        </div>

                        {/* Track Info */}
                        <div className="flex-1 min-w-0 w-full">
                          <MarqueeText
                            text={cleanTrackTitle(track.title, track.artist)}
                            className={`text-sm font-semibold ${
                              isCurrent ? designConfig.accentText : designConfig.textPrimary
                            } group-hover:${designConfig.accentText} transition-colors`}
                            containerClassName="w-full"
                            speed={28}
                          />
                          <MarqueeText
                            text={track.artist || "Unknown Artist"}
                            className={`text-xs ${designConfig.textMuted}`}
                            containerClassName="w-full"
                            speed={24}
                          />
                        </div>
                      </div>

                      {/* Duration */}
                      <span className={`text-xs font-mono font-medium ${designConfig.textMuted} shrink-0 ml-3`}>
                        {formatDuration(track.duration)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* 3. MUSIC VIDEOS & MOVIE TRAILERS (Built-in Video Player Integration) */}
          {/* ========================================================================= */}
          {showVideos && data.videosAndTrailers.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Film className="w-5 h-5 text-red-500" />
                  <div>
                    <h2 className={`text-lg sm:text-xl font-bold ${designConfig.headingPrimary} tracking-tight`}>
                      Music Videos & Movie Trailers
                    </h2>
                    <p className={`text-[11px] ${designConfig.headingMuted} font-medium`}>
                      High-definition videos & movie trailers • Plays in Oblivion's built-in video player
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const first = data.videosAndTrailers[0];
                    if (first) handleVideoClick(first);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl ${designConfig.btnPrimary} text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play videos</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {data.videosAndTrailers.map((video, idx) => {
                  const vId = video.id || video.youtubeVideoId;
                  const isCurrent = currentTrackId === vId;
                  const isTrailer = video.videoType === "trailer";

                  return (
                    <div
                      key={vId || idx}
                      onClick={() => handleVideoClick(video)}
                      className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 ${
                        designConfig.cardBg
                      } ${designConfig.cardHover} border border-transparent hover:${
                        designConfig.accentBorder
                      } p-3 flex flex-col shadow-sm hover:shadow-xl ${
                        isCurrent ? `ring-2 ${designConfig.accentBorder}` : ""
                      }`}
                    >
                      <div className="relative aspect-video rounded-xl overflow-hidden mb-2.5 bg-black/20 shadow-inner">
                        <img
                          src={video.coverUrl}
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            if (vId) {
                              e.currentTarget.src = `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`;
                            } else {
                              e.currentTarget.src =
                                "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80";
                            }
                          }}
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 text-white text-[10px] font-bold flex items-center gap-1">
                          {isTrailer ? <Film className="w-3 h-3 text-amber-400" /> : <Video className="w-3 h-3 text-red-500" />}
                          <span>{isTrailer ? "TRAILER" : "MUSIC VIDEO"}</span>
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <div className="p-3 rounded-full bg-white text-black shadow-lg transform group-hover:scale-110 transition-transform">
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </div>
                        </div>
                        {video.duration ? (
                          <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-mono">
                            {formatDuration(video.duration)}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex-1 min-w-0 w-full">
                        <MarqueeText
                          text={cleanTrackTitle(video.title, video.artist)}
                          className={`font-bold text-xs ${
                            isCurrent ? designConfig.accentText : designConfig.textPrimary
                          } group-hover:${designConfig.accentText} transition-colors`}
                          containerClassName="w-full"
                          speed={28}
                        />
                        <MarqueeText
                          text={video.artist || "Official Video"}
                          className={`text-[11px] ${designConfig.textMuted}`}
                          containerClassName="w-full mt-0.5"
                          speed={24}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* 4. PODCASTS & MEDIA */}
          {/* ========================================================================= */}
          {showPodcasts && data.podcasts.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Mic className="w-5 h-5 text-indigo-500" />
                  <div>
                    <h2 className={`text-lg sm:text-xl font-bold ${designConfig.headingPrimary} tracking-tight`}>
                      Podcasts & Media
                    </h2>
                    <p className={`text-[11px] ${designConfig.headingMuted} font-medium`}>
                      Top audio podcasts, artist discussions, and music media
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {data.podcasts.map((podcast) => (
                  <div
                    key={podcast.id}
                    onClick={() =>
                      handleVideoClick({
                        id: podcast.id,
                        youtubeVideoId: podcast.youtubeVideoId,
                        title: podcast.title,
                        artist: podcast.channelTitle,
                        coverUrl: podcast.coverUrl,
                        album: podcast.description || "Podcast",
                        audioUrl: "",
                        isVideo: true,
                        duration: 3600,
                      })
                    }
                    className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 ${designConfig.cardBg} ${designConfig.cardHover} border border-transparent hover:${designConfig.accentBorder} p-3 flex flex-col shadow-sm hover:shadow-xl`}
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden mb-2.5 bg-black/20 shadow-inner">
                      <img
                        src={podcast.coverUrl}
                        alt={podcast.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=400&q=80";
                        }}
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-indigo-600/90 text-white text-[10px] font-bold flex items-center gap-1">
                        <Mic className="w-3 h-3" />
                        <span>PODCAST</span>
                      </div>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <div className="p-3 rounded-full bg-white text-black shadow-lg transform group-hover:scale-110 transition-transform">
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 w-full">
                      <MarqueeText
                        text={podcast.title}
                        className={`font-bold text-xs ${designConfig.textPrimary} group-hover:${designConfig.accentText} transition-colors`}
                        containerClassName="w-full"
                        speed={28}
                      />
                      <MarqueeText
                        text={podcast.channelTitle}
                        className={`text-[11px] ${designConfig.textMuted}`}
                        containerClassName="w-full mt-0.5"
                        speed={24}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* 5. MOODS & MOMENTS */}
          {/* ========================================================================= */}
          {showMoodsAndGenres && data.moodsAndMoments.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2.5">
                <Radio className="w-5 h-5 text-indigo-500" />
                <div>
                  <h2 className={`text-lg sm:text-xl font-bold ${designConfig.headingPrimary} tracking-tight`}>
                    Moods & Moments
                  </h2>
                  <p className={`text-[11px] ${designConfig.headingMuted} font-medium`}>
                    Curated stations for Chill, Focus, Workout, Party, Romance, and Gaming
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {data.moodsAndMoments.map((mood) => (
                  <button
                    key={mood.id}
                    onClick={() => onSearchGenre && onSearchGenre(mood.query)}
                    className={`h-24 p-3.5 rounded-2xl bg-gradient-to-br ${mood.color} text-white font-bold text-sm flex flex-col justify-between items-start shadow-md hover:scale-[1.03] active:scale-95 transition-all text-left group overflow-hidden relative`}
                  >
                    <div className="absolute -right-2 -bottom-2 opacity-20 group-hover:opacity-40 transition-opacity">
                      <Sparkles className="w-16 h-16" />
                    </div>
                    <span>{mood.title}</span>
                    <span className="text-[11px] font-mono opacity-80 group-hover:opacity-100 flex items-center gap-1">
                      Play Station →
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* 6. GENRES */}
          {/* ========================================================================= */}
          {showMoodsAndGenres && data.genres.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2.5">
                <Disc3 className="w-5 h-5 text-pink-500" />
                <div>
                  <h2 className={`text-lg sm:text-xl font-bold ${designConfig.headingPrimary} tracking-tight`}>
                    Genres
                  </h2>
                  <p className={`text-[11px] ${designConfig.headingMuted} font-medium`}>Explore soundscapes by genre</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {data.genres.map((genre) => (
                  <button
                    key={genre.id}
                    onClick={() => onSearchGenre && onSearchGenre(genre.query)}
                    className={`h-20 p-3.5 rounded-2xl bg-gradient-to-br ${genre.color} text-white font-bold text-sm flex flex-col justify-between items-start shadow-md hover:scale-[1.03] active:scale-95 transition-all text-left group overflow-hidden relative`}
                  >
                    <div className="absolute -right-2 -bottom-2 opacity-20 group-hover:opacity-40 transition-opacity">
                      <Music className="w-12 h-12" />
                    </div>
                    <span>{genre.title}</span>
                    <span className="text-[10px] font-mono opacity-80 group-hover:opacity-100">
                      Explore Hits →
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};
