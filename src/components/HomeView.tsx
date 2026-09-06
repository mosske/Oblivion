import React, { useEffect, useState } from "react";
import { User, Track, Album, Playlist } from "../types";
import { PlaylistCoverArt } from "./PlaylistCoverArt";
import {
  Play,
  Sparkles,
  TrendingUp,
  Disc,
  Flame,
  Radio,
  Clock,
  Loader2,
  RefreshCw,
  Layers,
  Music2,
  Zap,
} from "lucide-react";
import { cleanTrackTitle } from "../utils/formatters";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";
import { getInMemoryToken } from "../App";

interface HomeViewProps {
  onPlayTrack: (track: Track) => void;
  onPlayQueue: (tracks: Track[], startIndex?: number) => void;
  onSelectPlaylist: (playlist: Playlist) => void;
  onSelectAlbum?: (album: Album) => void;
  playlists: Playlist[];
  user?: User | null;
  onOpenSettings?: () => void;
  currentTrack?: Track | null;
  designConfig?: FullAppDesignConfig;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onPlayTrack,
  onPlayQueue,
  onSelectPlaylist,
  onSelectAlbum,
  playlists,
  user,
  onOpenSettings,
  currentTrack,
  designConfig = FULL_APP_DESIGNS["designer"],
}) => {
  const [activeMood, setActiveMood] = useState<string>("All");
  const [filters, setFilters] = useState<string[]>([
    "All",
    "Relax",
    "Workout",
    "Focus",
    "Energize",
    "Commute",
    "Party",
    "Romance",
    "Sleep",
  ]);
  const [quickPicks, setQuickPicks] = useState<Track[]>([]);
  const [listenAgain, setListenAgain] = useState<Track[]>([]);
  const [similarTo, setSimilarTo] = useState<{ artist: string; tracks: Track[] } | null>(null);
  const [trendingHits, setTrendingHits] = useState<Track[]>([]);
  const [mixedForYou, setMixedForYou] = useState<any[]>([]);
  const [recommendedAlbums, setRecommendedAlbums] = useState<Album[]>([]);
  const [communityPlaylists, setCommunityPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [timeGreeting, setTimeGreeting] = useState<string>("");

  useEffect(() => {
    const hour = new Date().getHours();
    let greeting = "Welcome";
    if (hour >= 5 && hour < 12) greeting = "Good morning";
    else if (hour >= 12 && hour < 17) greeting = "Good afternoon";
    else if (hour >= 17 && hour < 22) greeting = "Good evening";
    else greeting = "Good night";
    setTimeGreeting(greeting);
  }, []);

  const fetchHomeFeed = async (mood = "All") => {
    try {
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

      const headers: Record<string, string> = {};
      if (activeToken) {
        headers["Authorization"] = `Bearer ${activeToken}`;
      }

      const res = await fetch(`/api/youtube/home?mood=${encodeURIComponent(mood)}&_t=${Date.now()}`, { headers });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setQuickPicks(data?.quickPicks || []);
        setListenAgain(data.listenAgain || []);
        setSimilarTo(data.similarTo || null);
        setTrendingHits(data.trendingHits || []);
        setMixedForYou(data.mixedForYou || []);
        setRecommendedAlbums(data.recommendedAlbums || []);
        setCommunityPlaylists(data.communityPlaylists || []);
        if (data.filters && Array.isArray(data.filters)) setFilters(data.filters);
      }
    } catch (err) {
      console.warn("YouTube Home feed load error:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Always perform a fresh pull every time Home view loads, mood changes, or auth status changes
  useEffect(() => {
    setLoading(true);
    fetchHomeFeed(activeMood);
  }, [activeMood, user?.accessToken, user?.isLoggedIn]);

  const handleMoodSelect = (filter: string) => {
    if (filter === activeMood) return;
    setActiveMood(filter);
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchHomeFeed(activeMood);
  };

  const formatDuration = (sec?: number) => {
    if (!sec || sec <= 0) return "--:--";
    const mins = Math.floor(sec / 60);
    const remainder = Math.floor(sec % 60);
    return `${mins}:${String(remainder).padStart(2, "0")}`;
  };

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 space-y-8 pb-64 sm:pb-72 md:pb-52 select-none">
      {/* Top Greeting & Fresh Pull Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-extrabold ${designConfig.headingPrimary} tracking-tight`}>
            {timeGreeting}{user?.isLoggedIn && user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className={`text-xs ${designConfig.headingMuted} mt-1 font-medium`}>
            Your fresh YouTube Music dashboard • Live lossless streaming
          </p>
        </div>

        <button
          id="home-fresh-pull-btn"
          onClick={handleManualRefresh}
          disabled={isRefreshing || loading}
          className={`self-start sm:self-auto px-3.5 py-2 rounded-xl ${designConfig.btnSecondary} font-bold text-xs flex items-center gap-2 shadow-sm hover:scale-105 active:scale-95 transition-all border ${designConfig.borderSubtle}`}
          title="Fresh pull from YouTube Music"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${designConfig.accentText} text-[var(--accent-color,var(--primary))] ${isRefreshing || loading ? "animate-spin" : ""}`} stroke="currentColor" />
          <span className={`${designConfig.textPrimary} font-bold`}>{isRefreshing ? "Refreshing..." : "Fresh Pull"}</span>
        </button>
      </div>

      {/* YouTube Music Mood Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar -mx-1 px-1">
        {filters.map((filter) => {
          const isActive = activeMood === filter;
          return (
            <button
              key={filter}
              onClick={() => handleMoodSelect(filter)}
              className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all active:scale-95 ${
                isActive
                  ? `${designConfig.accentBg} ${designConfig.accentContrastText} shadow-md ring-2 ${designConfig.accentBorder}`
                  : `${designConfig.btnSecondary} ${designConfig.textSecondary} hover:${designConfig.textPrimary} border ${designConfig.borderSubtle}`
              }`}
            >
              {filter}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className={`p-20 text-center rounded-3xl ${designConfig.cardBg} border ${designConfig.borderSubtle} space-y-3`}>
          <Loader2 className={`w-8 h-8 mx-auto ${designConfig.accentText} text-[var(--accent-color,var(--primary))] animate-spin`} stroke="currentColor" />
          <p className={`text-sm font-semibold ${designConfig.textPrimary}`}>
            Pulling fresh lineup from YouTube Music...
          </p>
          <p className={`text-xs ${designConfig.textMuted}`}>Synchronizing quick picks and daily mixes</p>
        </div>
      ) : (
        <>
          {/* 1. Quick Picks (4-column grid of instant songs) */}
          {quickPicks.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Zap className={`w-5 h-5 ${designConfig.accentText} text-[var(--accent-color,var(--primary))]`} />
                  <div>
                    <h2 className={`text-lg sm:text-xl font-bold ${designConfig.headingPrimary} tracking-tight`}>
                      Quick picks
                    </h2>
                    <p className={`text-[11px] ${designConfig.headingMuted} font-medium`}>Start radio from a song</p>
                  </div>
                </div>

                <button
                  onClick={() => onPlayQueue(quickPicks, 0)}
                  className={`px-3.5 py-1.5 rounded-xl ${designConfig.btnPrimary} text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play all</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {quickPicks.map((track, idx) => {
                  const trId = track.id || track.youtubeVideoId;
                  const isCurrent = currentTrack?.id === trId || currentTrack?.youtubeVideoId === trId;

                  return (
                    <div
                      key={trId || idx}
                      onClick={() => onPlayQueue(quickPicks, idx)}
                      className={`group flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all ${
                        isCurrent
                          ? `${designConfig.cardBg} ring-1.5 ${designConfig.accentBorder} shadow-md`
                          : `${designConfig.cardBg} ${designConfig.cardHover}`
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-sm">
                          <img
                            src={track.coverUrl}
                            alt={track.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src =
                                "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80";
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Play className="w-4 h-4 text-white fill-white" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className={`text-xs sm:text-sm font-semibold truncate ${isCurrent ? designConfig.accentText : designConfig.textPrimary} group-hover:${designConfig.accentText} transition-colors`}>
                            {cleanTrackTitle(track.title)}
                          </p>
                          <p className={`text-[11px] ${designConfig.textMuted} truncate mt-0.5`}>
                            {track.artist}
                          </p>
                        </div>
                      </div>

                      <span className={`text-[11px] font-mono ${designConfig.textMuted} shrink-0 ml-2`}>
                        {formatDuration(track.duration)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 2. Listen Again (Live YouTube Music Stream) */}
          {listenAgain.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-5 h-5 text-sky-500" />
                  <div>
                    <h2 className={`text-lg sm:text-xl font-bold ${designConfig.headingPrimary} tracking-tight`}>
                      Listen again
                    </h2>
                    <p className={`text-[11px] ${designConfig.headingMuted} font-medium`}>
                      Live dynamic recommendations from YouTube Music
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onPlayQueue(listenAgain, 0)}
                  className={`px-3.5 py-1.5 rounded-xl ${designConfig.btnPrimary} text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play all</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {listenAgain.map((track, idx) => {
                  const trId = track.id || track.youtubeVideoId;
                  const isCurrent = currentTrack?.id === trId || currentTrack?.youtubeVideoId === trId;

                  return (
                    <div
                      key={trId || idx}
                      onClick={() => onPlayQueue(listenAgain, idx)}
                      className={`group flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all ${
                        isCurrent
                          ? `${designConfig.cardBg} ring-1.5 ${designConfig.accentBorder} shadow-md`
                          : `${designConfig.cardBg} ${designConfig.cardHover}`
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-sm">
                          <img
                            src={track.coverUrl}
                            alt={track.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src =
                                "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80";
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Play className="w-4 h-4 text-white fill-white" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className={`text-xs sm:text-sm font-semibold truncate ${isCurrent ? designConfig.accentText : designConfig.textPrimary} group-hover:${designConfig.accentText} transition-colors`}>
                            {cleanTrackTitle(track.title)}
                          </p>
                          <p className={`text-[11px] ${designConfig.textMuted} truncate mt-0.5`}>
                            {track.artist}
                          </p>
                        </div>
                      </div>

                      <span className={`text-[11px] font-mono ${designConfig.textMuted} shrink-0 ml-2`}>
                        {formatDuration(track.duration)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 3. Mixed for you */}
          {mixedForYou.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2.5">
                <Radio className="w-5 h-5 text-indigo-500" />
                <div>
                  <h2 className={`text-lg sm:text-xl font-bold ${designConfig.headingPrimary} tracking-tight`}>
                    Mixed for you
                  </h2>
                  <p className={`text-[11px] ${designConfig.headingMuted} font-medium`}>Endless personalized stations</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {mixedForYou.map((mix) => (
                  <div
                    key={mix.id}
                    onClick={() => {
                      if (onSelectPlaylist) {
                        onSelectPlaylist({
                          id: mix.id,
                          title: mix.title,
                          description: mix.description,
                          coverUrl: mix.coverUrl,
                          tracksCount: mix.tracksCount || 40,
                          tracks: [],
                          updatedAt: new Date().toISOString(),
                        });
                      }
                    }}
                    className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 ${designConfig.cardBg} ${designConfig.cardHover} border border-transparent hover:${designConfig.accentBorder} p-3 flex flex-col shadow-sm hover:shadow-xl`}
                  >
                    <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-black/10 shadow-inner">
                      <img
                        src={mix.coverUrl}
                        alt={mix.title}
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
                        {mix.title}
                      </h3>
                      <p className={`text-[11px] ${designConfig.textMuted} line-clamp-2 mt-0.5 leading-snug`}>
                        {mix.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 4. Similar to <Artist> */}
          {similarTo && similarTo.tracks.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <div>
                    <h2 className={`text-lg sm:text-xl font-bold ${designConfig.headingPrimary} tracking-tight`}>
                      Similar to {similarTo.artist}
                    </h2>
                    <p className={`text-[11px] ${designConfig.headingMuted} font-medium`}>Tracks you might love based on your music taste</p>
                  </div>
                </div>

                <button
                  onClick={() => onPlayQueue(similarTo.tracks, 0)}
                  className={`px-3.5 py-1.5 rounded-xl ${designConfig.btnPrimary} text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play all</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {similarTo.tracks.map((track, idx) => {
                  const trId = track.id || track.youtubeVideoId;
                  const isCurrent = currentTrack?.id === trId || currentTrack?.youtubeVideoId === trId;

                  return (
                    <div
                      key={trId || idx}
                      onClick={() => onPlayQueue(similarTo.tracks, idx)}
                      className={`group flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all ${
                        isCurrent
                          ? `${designConfig.cardBg} ring-1.5 ${designConfig.accentBorder} shadow-md`
                          : `${designConfig.cardBg} ${designConfig.cardHover}`
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
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

                        <div className="flex-1 min-w-0">
                          <p className={`text-xs sm:text-sm font-semibold truncate ${isCurrent ? designConfig.accentText : designConfig.textPrimary} group-hover:${designConfig.accentText} transition-colors`}>
                            {cleanTrackTitle(track.title)}
                          </p>
                          <p className={`text-[11px] ${designConfig.textMuted} truncate mt-0.5`}>
                            {track.artist}
                          </p>
                        </div>
                      </div>

                      <span className={`text-[11px] font-mono ${designConfig.textMuted} shrink-0 ml-2`}>
                        {formatDuration(track.duration)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 5. Recommended Albums */}
          {recommendedAlbums.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-emerald-500" />
                <div>
                  <h2 className={`text-lg sm:text-xl font-bold ${designConfig.headingPrimary} tracking-tight`}>
                    Recommended Albums
                  </h2>
                  <p className={`text-[11px] ${designConfig.headingMuted} font-medium`}>Official album releases from YouTube Music</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {recommendedAlbums.map((album) => (
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

          {/* 6. Trending Hits */}
          {trendingHits.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Flame className="w-5 h-5 text-rose-500" />
                  <div>
                    <h2 className={`text-lg sm:text-xl font-bold ${designConfig.headingPrimary} tracking-tight`}>
                      Trending Hits
                    </h2>
                    <p className={`text-[11px] ${designConfig.headingMuted} font-medium`}>Hot tracks today on YouTube Music</p>
                  </div>
                </div>

                <button
                  onClick={() => onPlayQueue(trendingHits, 0)}
                  className={`px-3.5 py-1.5 rounded-xl ${designConfig.btnPrimary} text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play all</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {trendingHits.map((track, idx) => {
                  const trId = track.id || track.youtubeVideoId;
                  const isCurrent = currentTrack?.id === trId || currentTrack?.youtubeVideoId === trId;

                  return (
                    <div
                      key={trId || idx}
                      onClick={() => onPlayQueue(trendingHits, idx)}
                      className={`group flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all ${
                        isCurrent
                          ? `${designConfig.cardBg} ring-1.5 ${designConfig.accentBorder} shadow-md`
                          : `${designConfig.cardBg} ${designConfig.cardHover}`
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 shadow-sm bg-slate-800 flex items-center justify-center">
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

                        <div className="flex-1 min-w-0">
                          <p className={`text-xs sm:text-sm font-semibold truncate ${isCurrent ? designConfig.accentText : designConfig.textPrimary} group-hover:${designConfig.accentText} transition-colors`}>
                            {cleanTrackTitle(track.title)}
                          </p>
                          <p className={`text-[11px] ${designConfig.textMuted} truncate mt-0.5`}>
                            {track.artist}
                          </p>
                        </div>
                      </div>

                      <span className={`text-[11px] font-mono ${designConfig.textMuted} shrink-0 ml-2`}>
                        {formatDuration(track.duration)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 7. Community & Curated Playlists */}
          {communityPlaylists.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2.5">
                <Music2 className={`w-5 h-5 ${designConfig.accentText} text-[var(--accent-color,var(--primary))]`} />
                <div>
                  <h2 className={`text-lg sm:text-xl font-bold ${designConfig.headingPrimary} tracking-tight`}>
                    Community & Curated Playlists
                  </h2>
                  <p className={`text-[11px] ${designConfig.headingMuted} font-medium`}>Top trending collections on YouTube Music</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {communityPlaylists.map((pl) => (
                  <div
                    key={pl.id}
                    onClick={() => {
                      if (onSelectPlaylist) {
                        onSelectPlaylist({
                          id: pl.id,
                          title: pl.title,
                          description: pl.description,
                          coverUrl: pl.coverUrl,
                          tracksCount: pl.tracksCount || 50,
                          tracks: [],
                          updatedAt: new Date().toISOString(),
                        });
                      }
                    }}
                    className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 ${designConfig.cardBg} ${designConfig.cardHover} border border-transparent hover:${designConfig.accentBorder} p-3 flex flex-col shadow-sm hover:shadow-xl`}
                  >
                    <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-black/10 shadow-inner">
                      <PlaylistCoverArt
                        playlist={pl}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <div className="p-3 rounded-full bg-white text-black shadow-lg transform group-hover:scale-110 transition-transform">
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold text-sm ${designConfig.textPrimary} truncate group-hover:${designConfig.accentText} transition-colors`}>
                        {pl.title}
                      </h3>
                      <p className={`text-[11px] ${designConfig.textMuted} line-clamp-2 mt-0.5 leading-snug`}>
                        {pl.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

