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
} from "lucide-react";
import { cleanTrackTitle } from "../utils/formatters";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";

interface ExploreViewProps {
  onPlayTrack: (track: Track) => void;
  onPlayQueue: (tracks: Track[], startIndex?: number) => void;
  onSelectAlbum?: (album: Album) => void;
  onSearchGenre?: (genreQuery: string) => void;
  currentTrackId?: string;
  isPlaying?: boolean;
  designConfig?: FullAppDesignConfig;
}

interface ChartTrack extends Track {
  rank: number;
  rankChange: "up" | "down" | "same";
}

interface MoodItem {
  id: string;
  title: string;
  color: string;
  query: string;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  onPlayTrack,
  onPlayQueue,
  onSelectAlbum,
  onSearchGenre,
  currentTrackId,
  isPlaying = false,
  designConfig = FULL_APP_DESIGNS["designer"],
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [newReleases, setNewReleases] = useState<Album[]>([]);
  const [charts, setCharts] = useState<ChartTrack[]>([]);
  const [trendingVideos, setTrendingVideos] = useState<Track[]>([]);
  const [moods, setMoods] = useState<MoodItem[]>([]);
  const [genres, setGenres] = useState<MoodItem[]>([]);

  const fetchExploreFeed = async () => {
    try {
      let activeToken = "";
      try {
        const saved = localStorage.getItem("oblivion_saved_user");
        if (saved) {
          const parsed = JSON.parse(saved);
          activeToken = parsed?.accessToken || "";
        }
      } catch {}

      const headers: Record<string, string> = {};
      if (activeToken) {
        headers["Authorization"] = `Bearer ${activeToken}`;
      }

      const res = await fetch(`/api/youtube/explore?_t=${Date.now()}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setNewReleases(data.newReleases || []);
        setCharts(data.charts || []);
        setTrendingVideos(data.trendingVideos || []);
        setMoods(data.moodsAndMoments || []);
        setGenres(data.genres || []);
      }
    } catch (err) {
      console.warn("Explore feed load error:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Always perform a fresh pull every time Explore opens
  useEffect(() => {
    setLoading(true);
    fetchExploreFeed();
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchExploreFeed();
  };

  const formatDuration = (sec?: number) => {
    if (!sec || sec <= 0) return "--:--";
    const mins = Math.floor(sec / 60);
    const remainder = Math.floor(sec % 60);
    return `${mins}:${String(remainder).padStart(2, "0")}`;
  };

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 space-y-8 pb-40 md:pb-48 select-none">
      {/* Top Banner */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${designConfig.bannerGradient} border ${designConfig.accentBorder} p-6 sm:p-8 shadow-2xl transition-all duration-300`}>
        <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-20 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-500/30 via-indigo-600/40 to-transparent"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-xl space-y-2">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${designConfig.isLight ? "bg-[#c89b3c]/15 text-[#fbfaf7] border border-[#c89b3c]/40" : "bg-cyan-500/10 border border-cyan-500/30 text-cyan-300"} text-xs font-semibold`}>
              <Compass className={`w-3.5 h-3.5 ${designConfig.accentText}`} />
              <span>YouTube Music Explore</span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Explore & Discover
            </h1>
            <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed font-normal">
              New releases, live global charts, trending music videos, and mood stations pulled fresh from YouTube Music.
            </p>
          </div>

          <button
            id="explore-fresh-pull-btn"
            onClick={handleManualRefresh}
            disabled={isRefreshing || loading}
            className={`px-4 py-2.5 rounded-xl ${designConfig.btnSecondary} font-bold text-xs flex items-center gap-2 shadow-md hover:scale-105 active:scale-95 transition-all border ${designConfig.borderSubtle}`}
            title="Refresh Explore Feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${designConfig.accentText} ${isRefreshing || loading ? "animate-spin" : ""}`} />
            <span className={`${designConfig.textPrimary} font-bold`}>{isRefreshing ? "Refreshing..." : "Fresh Pull"}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className={`p-20 text-center rounded-3xl ${designConfig.cardBg} border ${designConfig.borderSubtle} space-y-3`}>
          <Loader2 className="w-8 h-8 mx-auto text-[#c89b3c] animate-spin" />
          <p className={`text-sm font-semibold ${designConfig.textPrimary}`}>
            Pulling fresh Explore data from YouTube Music...
          </p>
          <p className={`text-xs ${designConfig.textMuted}`}>Fetching new releases, charts, and genre vibes</p>
        </div>
      ) : (
        <>
          {/* 1. New Releases & Albums */}
          {newReleases.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Flame className="w-5 h-5 text-amber-500" />
                  <div>
                    <h2 className={`text-lg sm:text-xl font-bold ${designConfig.headingPrimary} tracking-tight`}>
                      New Albums & Singles
                    </h2>
                    <p className={`text-[11px] ${designConfig.headingMuted} font-medium`}>Fresh picks updated hourly</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {newReleases.map((album) => (
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

                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold text-sm ${designConfig.textPrimary} truncate group-hover:${designConfig.accentText} transition-colors`}>
                        {cleanTrackTitle(album.title)}
                      </h3>
                      <p className={`text-xs ${designConfig.textMuted} truncate mt-0.5`}>
                        {album.artist}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 2. Top Charts Top 20 */}
          {charts.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  <div>
                    <h2 className={`text-lg sm:text-xl font-bold ${designConfig.headingPrimary} tracking-tight`}>
                      Charts • Top Global Songs
                    </h2>
                    <p className={`text-[11px] ${designConfig.headingMuted} font-medium`}>The most played songs on YouTube this week</p>
                  </div>
                </div>
                <button
                  onClick={() => onPlayQueue(charts, 0)}
                  className={`px-3.5 py-1.5 rounded-xl ${designConfig.btnPrimary} text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play Charts</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {charts.map((track, idx) => {
                  const trId = track.id || track.youtubeVideoId;
                  const isCurrent = currentTrackId === trId;

                  return (
                    <div
                      key={trId || idx}
                      onClick={() => onPlayQueue(charts, idx)}
                      className={`group flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${
                        isCurrent
                          ? `${designConfig.cardBg} ring-1.5 ${designConfig.accentBorder} shadow-md`
                          : `${designConfig.cardBg} ${designConfig.cardHover}`
                      }`}
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        {/* Rank & Change */}
                        <div className="w-8 text-center shrink-0 flex flex-col items-center">
                          <span className={`text-sm font-black font-mono ${idx < 3 ? "text-[#c89b3c]" : designConfig.textPrimary}`}>
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
                            src={track.coverUrl || (track.youtubeVideoId || track.id ? `https://i.ytimg.com/vi/${track.youtubeVideoId || track.id}/hqdefault.jpg` : "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80")}
                            alt={track.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            onError={(e) => {
                              const currentSrc = e.currentTarget.src || "";
                              const vId = track.youtubeVideoId || track.id;
                              if (vId && (currentSrc.includes("maxresdefault.jpg") || currentSrc.includes("sddefault.jpg"))) {
                                e.currentTarget.src = `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`;
                              } else if (vId && currentSrc.includes("hqdefault.jpg")) {
                                e.currentTarget.src = `https://i.ytimg.com/vi/${vId}/mqdefault.jpg`;
                              } else if (vId && currentSrc.includes("mqdefault.jpg")) {
                                e.currentTarget.src = `https://i.ytimg.com/vi/${vId}/default.jpg`;
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
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${isCurrent ? designConfig.accentText : designConfig.textPrimary} group-hover:${designConfig.accentText} transition-colors`}>
                            {cleanTrackTitle(track.title)}
                          </p>
                          <p className={`text-xs ${designConfig.textMuted} truncate`}>
                            {track.artist}
                          </p>
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

          {/* 3. Trending Music Videos */}
          {trendingVideos.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Video className="w-5 h-5 text-red-500" />
                  <div>
                    <h2 className={`text-lg sm:text-xl font-bold ${designConfig.headingPrimary} tracking-tight`}>
                      Trending Music Videos
                    </h2>
                    <p className={`text-[11px] ${designConfig.headingMuted} font-medium`}>Top viral music videos from YouTube</p>
                  </div>
                </div>

                <button
                  onClick={() => onPlayQueue(trendingVideos, 0)}
                  className={`px-3.5 py-1.5 rounded-xl ${designConfig.btnPrimary} text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play all</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
                {trendingVideos.map((video, idx) => {
                  const vId = video.id || video.youtubeVideoId;
                  const isCurrent = currentTrackId === vId;

                  return (
                    <div
                      key={vId || idx}
                      onClick={() => onPlayQueue(trendingVideos, idx)}
                      className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 ${designConfig.cardBg} ${designConfig.cardHover} border border-transparent hover:${designConfig.accentBorder} p-3 flex flex-col shadow-sm hover:shadow-xl`}
                    >
                      <div className="relative aspect-video rounded-xl overflow-hidden mb-2.5 bg-black/20 shadow-inner">
                        <img
                          src={video.coverUrl}
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.src =
                              "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80";
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <div className="p-2.5 rounded-full bg-white text-black shadow-lg transform group-hover:scale-110 transition-transform">
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          </div>
                        </div>
                        {video.duration ? (
                          <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-mono">
                            {formatDuration(video.duration)}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className={`font-bold text-xs ${isCurrent ? designConfig.accentText : designConfig.textPrimary} truncate group-hover:${designConfig.accentText} transition-colors`}>
                          {cleanTrackTitle(video.title)}
                        </h3>
                        <p className={`text-[11px] ${designConfig.textMuted} truncate mt-0.5`}>
                          {video.artist}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 4. Moods & Moments */}
          {moods.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2.5">
                <Radio className="w-5 h-5 text-indigo-500" />
                <div>
                  <h2 className={`text-lg sm:text-xl font-bold ${designConfig.headingPrimary} tracking-tight`}>
                    Moods & Moments
                  </h2>
                  <p className={`text-[11px] ${designConfig.headingMuted} font-medium`}>Music tailored for every activity</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {moods.map((mood) => (
                  <button
                    key={mood.id}
                    onClick={() => onSearchGenre && onSearchGenre(mood.query)}
                    className={`h-24 p-4 rounded-2xl bg-gradient-to-br ${mood.color} text-white font-bold text-base flex flex-col justify-between items-start shadow-md hover:scale-[1.03] active:scale-95 transition-all text-left group overflow-hidden relative`}
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

          {/* 4. Genres */}
          {genres.length > 0 && (
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

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {genres.map((genre) => (
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
