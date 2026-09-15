import React, { useEffect, useState, useMemo } from "react";
import { User, Track, Album, Playlist } from "../types";
import { PlaylistCoverArt } from "./PlaylistCoverArt";
import { MarqueeText } from "./MarqueeText";
import {
  Play,
  Shuffle,
  Sparkles,
  Compass,
  Clock,
  Video,
  Disc3,
  Flame,
  Radio,
  Loader2,
  RefreshCw,
  Layers,
  Music2,
  Zap,
  LogIn,
  Library,
  Tv,
} from "lucide-react";
import { cleanTrackTitle } from "../utils/formatters";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";
import {
  fetchPersonalizedHomeFeed,
  PersonalizedHomeData,
  PlaybackHistoryItem,
  CuratedGenreItem,
  MusicVideoItem,
} from "../services/homeService";
import { GenreDetailView } from "./GenreDetailView";
import { GenreItem } from "../services/genreService";

interface HomeViewProps {
  onPlayTrack: (track: Track) => void;
  onPlayQueue: (tracks: Track[], startIndex?: number) => void;
  onSelectPlaylist: (playlist: Playlist) => void;
  onSelectAlbum?: (album: Album) => void;
  onSearchGenre?: (genreQuery: string) => void;
  playlists: Playlist[];
  user?: User | null;
  onOpenSettings?: () => void;
  onOpenAuthModal?: () => void;
  onPlayVideo?: (track: Track) => void;
  currentTrack?: Track | null;
  designConfig?: FullAppDesignConfig;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onPlayTrack,
  onPlayQueue,
  onSelectPlaylist,
  onSelectAlbum,
  onSearchGenre,
  playlists,
  user,
  onOpenSettings,
  onOpenAuthModal,
  onPlayVideo,
  currentTrack,
  designConfig = FULL_APP_DESIGNS["designer"],
}) => {
  const isUserAuthenticated = Boolean(
    user && (user.isLoggedIn || user.accessToken || user.email)
  );

  const [activeMood, setActiveMood] = useState<string>("All");
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [timeGreeting, setTimeGreeting] = useState<string>("Welcome");
  const [selectedGenre, setSelectedGenre] = useState<GenreItem | null>(null);

  // Restore active genre modal if stashed in sessionStorage
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("OBLIVION_ACTIVE_GENRE_MODAL");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.title && parsed.originView === "home") {
          setSelectedGenre(parsed);
        }
      }
    } catch {}
  }, []);

  const handleSelectGenre = (genre: CuratedGenreItem) => {
    const item: GenreItem = {
      id: genre.id,
      title: genre.title,
      query: genre.query,
      color: genre.color,
      description: `Curated ${genre.title} soundscape with top trending songs and live performances.`,
    };
    setSelectedGenre(item);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
    try {
      sessionStorage.setItem("OBLIVION_ACTIVE_GENRE_MODAL", JSON.stringify({ ...item, originView: "home" }));
    } catch {}
  };

  const handleCloseGenre = () => {
    const closedId = selectedGenre?.id;
    setSelectedGenre(null);
    try {
      sessionStorage.removeItem("OBLIVION_ACTIVE_GENRE_MODAL");
    } catch {}
    if (closedId) {
      setTimeout(() => {
        const elem = document.getElementById(`home-genre-tile-${closedId}`);
        if (elem) {
          elem.scrollIntoView({ behavior: "smooth", block: "nearest" });
          elem.focus?.();
        }
      }, 50);
    }
  };

  // Dynamic Personalized Home state
  const [homeData, setHomeData] = useState<PersonalizedHomeData>({
    jumpBackIn: [],
    listenAgain: [],
    musicVideos: [],
    newReleasesForYou: [],
    quickPicks: [],
    communityPlaylists: [],
    livePerformances: [],
    albumsForYou: [],
    musicGenres: [],
    moodFilters: ["All", "Relax", "Workout", "Focus", "Energize", "Commute", "Party", "Romance", "Sleep"],
  });

  const [selectedVideoFilter, setSelectedVideoFilter] = useState<string>("All");

  const videoFilterSources = useMemo(() => {
    const sources = new Set<string>();
    (homeData.musicVideos || []).forEach((v) => {
      if (v.matchedSource && v.matchedSource !== "Trending") {
        sources.add(v.matchedSource);
      }
    });
    return ["All", ...Array.from(sources)];
  }, [homeData.musicVideos]);

  const displayedMusicVideos = useMemo(() => {
    if (selectedVideoFilter === "All") return homeData.musicVideos || [];
    return (homeData.musicVideos || []).filter((v) => v.matchedSource === selectedVideoFilter);
  }, [homeData.musicVideos, selectedVideoFilter]);

  useEffect(() => {
    const hour = new Date().getHours();
    let greeting = "Welcome";
    if (hour >= 5 && hour < 12) greeting = "Good morning";
    else if (hour >= 12 && hour < 17) greeting = "Good afternoon";
    else if (hour >= 17 && hour < 22) greeting = "Good evening";
    else greeting = "Good night";
    setTimeGreeting(greeting);
  }, []);

  const loadFeed = async (mood = activeMood) => {
    if (!isUserAuthenticated) {
      setLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      const data = await fetchPersonalizedHomeFeed(user, playlists, mood);
      setHomeData(data);
    } catch (err) {
      console.warn("Personalized Home feed load error:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isUserAuthenticated) {
      setLoading(true);
      loadFeed(activeMood);
    } else {
      setLoading(false);
    }
  }, [isUserAuthenticated, user?.accessToken, playlists.length, activeMood]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadFeed(activeMood);
  };

  const formatDuration = (sec?: number) => {
    if (!sec || sec <= 0) return "--:--";
    const mins = Math.floor(sec / 60);
    const remainder = Math.floor(sec % 60);
    return `${mins}:${String(remainder).padStart(2, "0")}`;
  };

  const handleTrackOrVideoPlay = (track: Track) => {
    if (track.isVideo && onPlayVideo) {
      onPlayVideo(track);
    } else {
      onPlayTrack(track);
    }
  };

  // --------------------------------------------------------------------------
  // 1. AUTHENTICATION WALL FOR UNAUTHENTICATED USERS
  // --------------------------------------------------------------------------
  if (!isUserAuthenticated) {
    return (
      <div className="flex flex-col select-none">
        <div className="flex-1 p-6 md:p-10 pb-40 md:pb-48 max-w-4xl mx-auto w-full">
          <div
            className={`p-8 sm:p-12 text-center ${designConfig.cardBg} rounded-3xl border ${designConfig.borderSubtle} shadow-xl flex flex-col items-center justify-center space-y-6 mt-4`}
          >
            <div
              className={`w-16 h-16 rounded-2xl ${
                designConfig.isLight ? "bg-black/5" : "bg-white/5"
              } text-[var(--accent-primary,#dfb86c)] border ${designConfig.borderSubtle} flex items-center justify-center shadow-inner`}
            >
              <Sparkles className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-md">
              <h2 className={`text-2xl sm:text-3xl font-black ${designConfig.textPrimary} tracking-tight`}>
                Sign In to Oblivion Music
              </h2>
              <p className={`text-xs sm:text-sm ${designConfig.textSecondary} font-medium leading-relaxed`}>
                Sign in to access your personalized home, recommendations, and listening history.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg text-left pt-2">
              <div
                className={`p-3.5 rounded-2xl ${
                  designConfig.isLight ? "bg-black/5" : "bg-white/5"
                } border ${designConfig.borderSubtle} space-y-1`}
              >
                <div className={`flex items-center gap-2 text-xs font-bold ${designConfig.accentText}`}>
                  <Compass className="w-3.5 h-3.5" />
                  <span className={`${designConfig.textPrimary} font-bold`}>Personalized Home</span>
                </div>
                <p className={`text-[11px] ${designConfig.textMuted} font-medium leading-normal`}>
                  Tailored shelves, artist new releases, and live stages based on your library.
                </p>
              </div>

              <div
                className={`p-3.5 rounded-2xl ${
                  designConfig.isLight ? "bg-black/5" : "bg-white/5"
                } border ${designConfig.borderSubtle} space-y-1`}
              >
                <div className={`flex items-center gap-2 text-xs font-bold ${designConfig.accentText}`}>
                  <Clock className="w-3.5 h-3.5" />
                  <span className={`${designConfig.textPrimary} font-bold`}>Listen Again</span>
                </div>
                <p className={`text-[11px] ${designConfig.textMuted} font-medium leading-normal`}>
                  Synchronized history for both high-fidelity songs and music videos.
                </p>
              </div>

              <div
                className={`p-3.5 rounded-2xl ${
                  designConfig.isLight ? "bg-black/5" : "bg-white/5"
                } border ${designConfig.borderSubtle} space-y-1`}
              >
                <div className={`flex items-center gap-2 text-xs font-bold ${designConfig.accentText}`}>
                  <Tv className="w-3.5 h-3.5" />
                  <span className={`${designConfig.textPrimary} font-bold`}>Live Performances</span>
                </div>
                <p className={`text-[11px] ${designConfig.textMuted} font-medium leading-normal`}>
                  Stream live concerts in Oblivion's built-in high definition video player.
                </p>
              </div>
            </div>

            {onOpenAuthModal && (
              <button
                id="home-signin-prompt-btn"
                onClick={onOpenAuthModal}
                className={`px-8 py-3.5 rounded-2xl ${designConfig.btnPrimary} text-white text-sm font-bold shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 mt-2`}
              >
                <LogIn className="w-4 h-4" />
                <span>Sign in with Google</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 2. ENCAPSULATED GENRE DETAIL VIEW MODAL
  // --------------------------------------------------------------------------
  if (selectedGenre) {
    return (
      <GenreDetailView
        genre={selectedGenre}
        onClose={handleCloseGenre}
        onPlayTrack={onPlayTrack}
        onPlayQueue={onPlayQueue}
        currentTrackId={currentTrack?.id || currentTrack?.youtubeVideoId}
        designConfig={designConfig}
      />
    );
  }

  // --------------------------------------------------------------------------
  // 3. AUTHENTICATED USER PERSONALIZED HOME
  // --------------------------------------------------------------------------
  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 space-y-9 pb-64 sm:pb-72 md:pb-52 select-none">
      {/* Top Greeting & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-extrabold ${designConfig.headingPrimary} tracking-tight`}>
            {timeGreeting}
            {user?.name && typeof user.name === "string" ? `, ${user.name.trim().split(" ")[0]}` : ""}
          </h1>
          <p className={`text-xs ${designConfig.headingMuted} mt-1 font-medium`}>
            Personalized dashboard • Based on your library and listening taste
          </p>
        </div>

        <button
          id="home-fresh-pull-btn"
          onClick={handleManualRefresh}
          disabled={isRefreshing || loading}
          className={`self-start sm:self-auto px-3.5 py-2 rounded-xl ${designConfig.btnSecondary} font-bold text-xs flex items-center gap-2 shadow-sm hover:scale-105 active:scale-95 transition-all border ${designConfig.borderSubtle}`}
          title="Refresh personalized lineup"
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

      {/* Mood Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar -mx-1 px-1">
        {homeData.moodFilters.map((filter) => {
          const isActive = activeMood === filter;
          return (
            <button
              key={filter}
              onClick={() => setActiveMood(filter)}
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
        <div
          className={`p-20 text-center rounded-3xl ${designConfig.cardBg} border ${designConfig.borderSubtle} space-y-3`}
        >
          <Loader2
            className={`w-8 h-8 mx-auto ${designConfig.accentText} text-[var(--accent-color,var(--primary))] animate-spin`}
            stroke="currentColor"
          />
          <p className={`text-sm font-semibold ${designConfig.textPrimary}`}>
            Personalizing your Home lineup...
          </p>
          <p className={`text-xs ${designConfig.textMuted}`}>
            Curating playlists, new releases, and live stages based on your library
          </p>
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* 1. JUMP BACK IN (Quick access shortcuts to user's playlists/albums) */}
          {/* ========================================================================= */}
          {homeData.jumpBackIn.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Clock className={`w-5 h-5 ${designConfig.accentText}`} />
                  <div>
                    <h2 className={`text-lg sm:text-xl font-bold ${designConfig.headingPrimary} tracking-tight`}>
                      Jump Back In
                    </h2>
                    <p className={`text-[11px] ${designConfig.headingMuted} font-medium`}>
                      Recently accessed playlists and albums from your Library
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {homeData.jumpBackIn.map((pl) => (
                  <div
                    key={pl.id}
                    onClick={() => onSelectPlaylist(pl)}
                    className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 ${designConfig.cardBg} ${designConfig.cardHover} border border-transparent hover:${designConfig.accentBorder} p-3 flex flex-col shadow-sm hover:shadow-xl`}
                  >
                    <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-black/10 shadow-inner">
                      <PlaylistCoverArt
                        playlist={pl}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                        {/* Direct Play button */}
                        <button
                          title="Play playlist"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (pl.tracks && pl.tracks.length > 0) {
                              onPlayQueue(pl.tracks, 0);
                            } else {
                              onSelectPlaylist(pl);
                            }
                          }}
                          className="p-2.5 rounded-full bg-white text-black shadow-lg hover:scale-110 active:scale-95 transition-transform"
                        >
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        </button>
                        {/* Direct Shuffle button */}
                        {pl.tracks && pl.tracks.length > 1 && (
                          <button
                            title="Shuffle playlist"
                            onClick={(e) => {
                              e.stopPropagation();
                              const shuffled = [...pl.tracks].sort(() => Math.random() - 0.5);
                              onPlayQueue(shuffled, 0);
                            }}
                            className="p-2.5 rounded-full bg-white text-black shadow-lg hover:scale-110 active:scale-95 transition-transform"
                          >
                            <Shuffle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 w-full">
                      <MarqueeText
                        text={pl.title}
                        className={`font-bold text-sm ${designConfig.textPrimary} group-hover:${designConfig.accentText} transition-colors`}
                        containerClassName="w-full"
                        speed={28}
                      />
                      <p className={`text-[11px] ${designConfig.textMuted} mt-0.5 truncate`}>
                        {pl.tracksCount || pl.tracks?.length || 0} tracks
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* 2. LISTEN AGAIN (Songs & Music Videos from playback history) */}
          {/* ========================================================================= */}
          {homeData.listenAgain.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <div>
                    <h2 className={`text-lg sm:text-xl font-bold ${designConfig.headingPrimary} tracking-tight`}>
                      Listen Again
                    </h2>
                    <p className={`text-[11px] ${designConfig.headingMuted} font-medium`}>
                      Songs and music videos from your listening history
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onPlayQueue(homeData.listenAgain, 0)}
                  className={`px-3.5 py-1.5 rounded-xl ${designConfig.btnPrimary} text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play all</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {homeData.listenAgain.map((track, idx) => {
                  const trId = track.id || track.youtubeVideoId;
                  const isCurrent = currentTrack?.id === trId || currentTrack?.youtubeVideoId === trId;
                  const isVideoItem = track.isVideo || track.mediaType === "video";

                  return (
                    <div
                      key={trId || idx}
                      onClick={() => {
                        if (isVideoItem && onPlayVideo) {
                          onPlayVideo(track);
                        } else {
                          onPlayQueue(homeData.listenAgain, idx);
                        }
                      }}
                      className={`group flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all ${
                        isCurrent
                          ? `${designConfig.cardBg} ring-1.5 ${designConfig.accentBorder} shadow-md`
                          : `${designConfig.cardBg} ${designConfig.cardHover}`
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
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

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <MarqueeText
                              text={cleanTrackTitle(track.title, track.artist)}
                              className={`text-xs sm:text-sm font-semibold ${
                                isCurrent ? designConfig.accentText : designConfig.textPrimary
                              } group-hover:${designConfig.accentText} transition-colors`}
                              containerClassName="w-full"
                              speed={28}
                            />
                          </div>

                          <div className="flex items-center gap-1.5 mt-0.5">
                            {isVideoItem && (
                              <span className="px-1 py-0.2 text-[9px] font-bold rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-0.5 shrink-0">
                                <Video className="w-2.5 h-2.5" />
                                Video
                              </span>
                            )}
                            <MarqueeText
                              text={track.artist || "Unknown Artist"}
                              className={`text-[11px] ${designConfig.textMuted}`}
                              containerClassName="w-full"
                              speed={24}
                            />
                          </div>
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

          {/* ========================================================================= */}
          {/* 3. MUSIC VIDEOS (Official Music Videos based on user's playlists & artists) */}
          {/* ========================================================================= */}
          {homeData.musicVideos && homeData.musicVideos.length > 0 && (
            <section id="home-music-videos-section" className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-md">
                    <Video className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className={`text-lg sm:text-xl font-bold ${designConfig.headingPrimary} tracking-tight`}>
                        Music Videos
                      </h2>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                        HD
                      </span>
                    </div>
                    <p className={`text-[11px] ${designConfig.headingMuted} font-medium`}>
                      Official music videos based on your playlists & favorite artists • Plays in built-in video player
                    </p>
                  </div>
                </div>

                {/* Top Action Buttons */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {displayedMusicVideos.length > 1 && (
                    <button
                      id="home-music-videos-shuffle-btn"
                      title="Shuffle music videos"
                      onClick={() => {
                        const shuffled = [...displayedMusicVideos].sort(() => Math.random() - 0.5);
                        if (shuffled[0]) {
                          if (onPlayVideo) onPlayVideo(shuffled[0]);
                          else onPlayTrack(shuffled[0]);
                        }
                      }}
                      className={`p-2 sm:px-3 sm:py-1.5 rounded-xl ${designConfig.btnSecondary} text-xs font-bold flex items-center gap-1.5 shadow-sm hover:scale-105 active:scale-95 transition-all border ${designConfig.borderSubtle}`}
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Shuffle</span>
                    </button>
                  )}
                  <button
                    id="home-music-videos-watch-all-btn"
                    onClick={() => {
                      const first = displayedMusicVideos[0];
                      if (first) {
                        if (onPlayVideo) onPlayVideo(first);
                        else onPlayTrack(first);
                      }
                    }}
                    className={`px-3.5 py-1.5 rounded-xl ${designConfig.btnPrimary} text-white text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 hover:scale-105 transition-all`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Watch all</span>
                  </button>
                </div>
              </div>

              {/* Source Filter Pills (All, Artist 1, Artist 2, Playlist 1) */}
              {videoFilterSources.length > 2 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar -mx-1 px-1">
                  {videoFilterSources.map((source) => {
                    const isSelected = selectedVideoFilter === source;
                    return (
                      <button
                        key={source}
                        id={`home-music-video-filter-${source.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                        onClick={() => setSelectedVideoFilter(source)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all active:scale-95 ${
                          isSelected
                            ? `${designConfig.accentBg} ${designConfig.accentContrastText} shadow-sm ring-1 ${designConfig.accentBorder}`
                            : `${designConfig.btnSecondary} ${designConfig.textSecondary} hover:${designConfig.textPrimary} border ${designConfig.borderSubtle}`
                        }`}
                      >
                        {source === "All" ? `All Videos (${homeData.musicVideos.length})` : source}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Videos Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {displayedMusicVideos.map((video, idx) => {
                  const vId = video.youtubeVideoId || video.id;
                  const isCurrent = currentTrack?.id === vId || currentTrack?.youtubeVideoId === vId;

                  return (
                    <div
                      key={vId || idx}
                      id={`home-music-video-card-${vId}`}
                      onClick={() => (onPlayVideo ? onPlayVideo(video) : onPlayTrack(video))}
                      className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 ${
                        designConfig.cardBg
                      } ${designConfig.cardHover} border ${
                        isCurrent ? designConfig.accentBorder : "border-transparent"
                      } hover:${designConfig.accentBorder} p-3 flex flex-col shadow-sm hover:shadow-xl`}
                    >
                      {/* Video Widescreen Thumbnail */}
                      <div className="relative aspect-video rounded-xl overflow-hidden mb-2.5 bg-black/20 shadow-inner">
                        <img
                          src={
                            video.coverUrl ||
                            `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`
                          }
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          onError={(e) => {
                            if (vId) {
                              e.currentTarget.src = `https://i.ytimg.com/vi/${vId}/mqdefault.jpg`;
                            } else {
                              e.currentTarget.src =
                                "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80";
                            }
                          }}
                        />

                        {/* Top Badges */}
                        <div className="absolute top-2 left-2 flex items-center gap-1.5">
                          <div className="px-2 py-0.5 rounded-full bg-red-600/90 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm backdrop-blur-xs">
                            <Video className="w-3 h-3" />
                            <span>MUSIC VIDEO</span>
                          </div>
                        </div>

                        {video.matchedSource && (
                          <div className="absolute top-2 right-2 max-w-[55%]">
                            <span className="truncate block px-2 py-0.5 rounded-md bg-black/75 text-white/90 text-[10px] font-medium backdrop-blur-xs shadow-xs">
                              {video.matchedType === "playlist" ? `📁 ${video.matchedSource}` : `🎤 ${video.matchedSource}`}
                            </span>
                          </div>
                        )}

                        {/* Bottom-right Duration */}
                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-white text-[10px] font-mono font-medium shadow-xs">
                          {video.duration ? formatDuration(video.duration) : "VIDEO"}
                        </div>

                        {/* Center Hover Play Overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                          <div
                            id={`home-music-video-play-btn-${vId}`}
                            className="p-3.5 rounded-full bg-white text-black shadow-xl transform group-hover:scale-110 transition-transform"
                          >
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </div>
                        </div>
                      </div>

                      {/* Video Title & Artist */}
                      <div className="flex-1 min-w-0 w-full">
                        <MarqueeText
                          text={cleanTrackTitle(video.title, video.artist)}
                          className={`font-bold text-sm ${
                            isCurrent ? designConfig.accentText : designConfig.textPrimary
                          } group-hover:${designConfig.accentText} transition-colors`}
                          containerClassName="w-full"
                          speed={28}
                        />
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <MarqueeText
                            text={video.artist || "Unknown Artist"}
                            className={`text-xs ${designConfig.textMuted}`}
                            containerClassName="w-full"
                            speed={24}
                          />
                          {video.uploader && video.uploader !== video.artist && (
                            <span className={`text-[10px] ${designConfig.textMuted} shrink-0 opacity-75 truncate max-w-[40%]`}>
                              {video.uploader}
                            </span>
                          )}
                        </div>

                        {/* Matched context footer */}
                        <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px]">
                          <span className={`${designConfig.textMuted} truncate`}>
                            {video.matchedType === "playlist"
                              ? `Matched from your playlist`
                              : video.matchedType === "artist"
                              ? `Based on artist you listen to`
                              : `Trending video for you`}
                          </span>
                          <span className={`font-semibold ${designConfig.accentText} group-hover:underline`}>
                            Watch →
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* 4. NEW RELEASES FOR YOU (Based on Library Artists) */}
          {/* ========================================================================= */}
          {homeData.newReleasesForYou.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2.5">
                <Flame className="w-5 h-5 text-rose-500" />
                <div>
                  <h2 className={`text-lg sm:text-xl font-bold ${designConfig.headingPrimary} tracking-tight`}>
                    New Releases For You
                  </h2>
                  <p className={`text-[11px] ${designConfig.headingMuted} font-medium`}>
                    New albums and singles from artists in your library
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {homeData.newReleasesForYou.map((album) => (
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
                        text={album.artist || "YouTube Artist"}
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
          {/* 5. QUICK PICKS (Direct access links & shuffle shortcuts for favorite playlists) */}
          {/* ========================================================================= */}
          {homeData.quickPicks.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2.5">
                <Zap className={`w-5 h-5 ${designConfig.accentText} text-[var(--accent-color,var(--primary))]`} />
                <div>
                  <h2 className={`text-lg sm:text-xl font-bold ${designConfig.headingPrimary} tracking-tight`}>
                    Quick Picks
                  </h2>
                  <p className={`text-[11px] ${designConfig.headingMuted} font-medium`}>
                    Direct access links and shuffle shortcuts for your favorite playlists
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {homeData.quickPicks.map((pl) => (
                  <div
                    key={pl.id}
                    onClick={() => onSelectPlaylist(pl)}
                    className={`group flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${designConfig.cardBg} ${designConfig.cardHover} border border-transparent hover:${designConfig.accentBorder} shadow-sm`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-inner bg-black/10">
                        <PlaylistCoverArt playlist={pl} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <MarqueeText
                          text={pl.title}
                          className={`font-bold text-sm ${designConfig.textPrimary} group-hover:${designConfig.accentText} transition-colors`}
                          containerClassName="w-full"
                          speed={28}
                        />
                        <p className={`text-[11px] ${designConfig.textMuted} mt-0.5 truncate`}>
                          {pl.tracksCount || pl.tracks?.length || 0} tracks
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {pl.tracks && pl.tracks.length > 1 && (
                        <button
                          title="Shuffle playlist"
                          onClick={(e) => {
                            e.stopPropagation();
                            const shuffled = [...pl.tracks].sort(() => Math.random() - 0.5);
                            onPlayQueue(shuffled, 0);
                          }}
                          className={`p-2 rounded-xl ${designConfig.btnSecondary} hover:scale-105 active:scale-95 transition-all`}
                        >
                          <Shuffle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        title="Play playlist"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (pl.tracks && pl.tracks.length > 0) {
                            onPlayQueue(pl.tracks, 0);
                          } else {
                            onSelectPlaylist(pl);
                          }
                        }}
                        className={`p-2 rounded-xl ${designConfig.btnPrimary} text-white hover:scale-105 active:scale-95 transition-all`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* 6. FROM THE COMMUNITY (Public playlists with similar music to user's playlists) */}
          {/* ========================================================================= */}
          {homeData.communityPlaylists.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2.5">
                <Music2 className={`w-5 h-5 ${designConfig.accentText}`} />
                <div>
                  <h2 className={`text-lg sm:text-xl font-bold ${designConfig.headingPrimary} tracking-tight`}>
                    From the Community
                  </h2>
                  <p className={`text-[11px] ${designConfig.headingMuted} font-medium`}>
                    Public playlists matched to the artists and vibes you listen to
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {homeData.communityPlaylists.map((pl) => (
                  <div
                    key={pl.id}
                    onClick={() => onSelectPlaylist(pl)}
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

                    <div className="flex-1 min-w-0 w-full">
                      <MarqueeText
                        text={pl.title}
                        className={`font-bold text-sm ${designConfig.textPrimary} group-hover:${designConfig.accentText} transition-colors`}
                        containerClassName="w-full"
                        speed={28}
                      />
                      <MarqueeText
                        text={pl.description || "Community Playlist"}
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
          {/* 7. LIVE PERFORMANCES (Direct video launch in Oblivion built-in video player) */}
          {/* ========================================================================= */}
          {homeData.livePerformances.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Tv className="w-5 h-5 text-red-500" />
                  <div>
                    <h2 className={`text-lg sm:text-xl font-bold ${designConfig.headingPrimary} tracking-tight`}>
                      Live Performances
                    </h2>
                    <p className={`text-[11px] ${designConfig.headingMuted} font-medium`}>
                      Live stages and concerts by your artists • Launches in built-in video player
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const first = homeData.livePerformances[0];
                    if (first) {
                      if (onPlayVideo) onPlayVideo(first);
                      else onPlayTrack(first);
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-xl ${designConfig.btnPrimary} text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Watch now</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {homeData.livePerformances.map((perf) => {
                  const vId = perf.id || perf.youtubeVideoId;
                  return (
                    <div
                      key={vId}
                      onClick={() => (onPlayVideo ? onPlayVideo(perf) : onPlayTrack(perf))}
                      className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 ${designConfig.cardBg} ${designConfig.cardHover} border border-transparent hover:${designConfig.accentBorder} p-3 flex flex-col shadow-sm hover:shadow-xl`}
                    >
                      <div className="relative aspect-video rounded-xl overflow-hidden mb-2.5 bg-black/20 shadow-inner">
                        <img
                          src={
                            perf.coverUrl ||
                            `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`
                          }
                          alt={perf.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.src =
                              "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80";
                          }}
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-red-600/90 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
                          <Video className="w-3 h-3" />
                          <span>LIVE</span>
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <div className="p-3 rounded-full bg-white text-black shadow-lg transform group-hover:scale-110 transition-transform">
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 w-full">
                        <MarqueeText
                          text={cleanTrackTitle(perf.title, perf.artist)}
                          className={`font-bold text-sm ${designConfig.textPrimary} group-hover:${designConfig.accentText} transition-colors`}
                          containerClassName="w-full"
                          speed={28}
                        />
                        <MarqueeText
                          text={perf.artist || "Live Performance"}
                          className={`text-xs ${designConfig.textMuted}`}
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
          {/* 8. ALBUMS FOR YOU (Albums matched to artists in user's playlists) */}
          {/* ========================================================================= */}
          {homeData.albumsForYou.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-emerald-500" />
                <div>
                  <h2 className={`text-lg sm:text-xl font-bold ${designConfig.headingPrimary} tracking-tight`}>
                    Albums for You
                  </h2>
                  <p className={`text-[11px] ${designConfig.headingMuted} font-medium`}>
                    Explore complete albums from the artists you love
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {homeData.albumsForYou.map((album) => (
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
                        text={album.artist || "Artist"}
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
          {/* 9. MUSIC GENRES (Curated list tailored to user's playlist genres) */}
          {/* ========================================================================= */}
          {homeData.musicGenres.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2.5">
                <Disc3 className="w-5 h-5 text-indigo-500" />
                <div>
                  <h2 className={`text-lg sm:text-xl font-bold ${designConfig.headingPrimary} tracking-tight`}>
                    Music Genres
                  </h2>
                  <p className={`text-[11px] ${designConfig.headingMuted} font-medium`}>
                    Curated genres based on your playlists (Jazz, K-pop, Funk, Gaming OST, Classical, etc.)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {homeData.musicGenres.map((genre) => (
                  <button
                    key={genre.id}
                    id={`home-genre-tile-${genre.id}`}
                    onClick={() => handleSelectGenre(genre)}
                    className={`h-22 p-4 rounded-2xl bg-gradient-to-br ${genre.color} text-white font-bold text-sm flex flex-col justify-between items-start shadow-md hover:scale-[1.03] active:scale-95 transition-all text-left group overflow-hidden relative`}
                  >
                    <div className="absolute -right-2 -bottom-2 opacity-20 group-hover:opacity-40 transition-opacity">
                      <Radio className="w-14 h-14" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>{genre.title}</span>
                      {genre.matchedFromUser && (
                        <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-white/20 text-white font-semibold">
                          Your vibe
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono opacity-80 group-hover:opacity-100 flex items-center gap-1">
                      Explore Soundscape →
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
