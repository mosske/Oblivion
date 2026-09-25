import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { User, Track, Album, Playlist } from "../types";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";
import {
  getHomeFeed,
  fetchNextHomeFeedPage,
  HomeSection,
  HomeFeedCardItem,
  homeCardToTrack,
} from "../services/homeFeedService";
import { MusicCarousel } from "./MusicCarousel";
import {
  RefreshCw,
  AlertCircle,
  LogIn,
  Loader2,
} from "lucide-react";

export interface HomeProps {
  onPlayTrack: (track: Track) => void;
  onPlayQueue?: (tracks: Track[], startIndex?: number) => void;
  onSelectPlaylist?: (playlist: Playlist) => void;
  onSelectAlbum?: (album: Album) => void;
  onSearchGenre?: (genreQuery: string) => void;
  playlists?: Playlist[];
  user?: User | null;
  onOpenSettings?: () => void;
  onOpenAuthModal?: () => void;
  onPlayVideo?: (track: Track) => void;
  currentTrack?: Track | null;
  isPlaying?: boolean;
  designConfig?: FullAppDesignConfig;
}

export const Home: React.FC<HomeProps> = ({
  onPlayTrack,
  onSelectPlaylist,
  onSelectAlbum,
  playlists = [],
  user,
  onOpenAuthModal,
  onPlayVideo,
  currentTrack,
  isPlaying = false,
  designConfig = FULL_APP_DESIGNS["designer"],
}) => {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [continuationToken, setContinuationToken] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>("All");

  const [timeGreeting, setTimeGreeting] = useState<string>("Welcome");
  const containerRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef<boolean>(false);

  // Dynamic time-of-day greeting
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setTimeGreeting("Good morning");
    else if (hour >= 12 && hour < 17) setTimeGreeting("Good afternoon");
    else if (hour >= 17 && hour < 22) setTimeGreeting("Good evening");
    else setTimeGreeting("Good night");
  }, []);

  // Fetch initial Home Feed from InnerTube API
  const fetchFeed = useCallback(async () => {
    setError(null);
    try {
      const result = await getHomeFeed(user?.accessToken);
      const initialSections: HomeSection[] = Array.isArray(result) ? result : (result as any).sections || [];
      const nextToken: string | undefined =
        (result as any).continuationToken ||
        (Array.isArray(result) ? (result as any).continuationToken : undefined);

      if (initialSections && initialSections.length > 0) {
        setSections(initialSections);
        setContinuationToken(nextToken);
      } else {
        setError("Unable to load YouTube Music recommendations. Please check your connection or retry.");
      }
    } catch (err: any) {
      console.error("[Home] Error loading home feed:", err);
      setError(err?.message || "Failed to connect to YouTube Music feed.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.accessToken]);

  useEffect(() => {
    setLoading(true);
    fetchFeed();
  }, [fetchFeed]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchFeed();
  };

  // Pagination: Load next batch of shelves when user scrolls near the bottom
  const loadMoreShelves = useCallback(async () => {
    if (!continuationToken || loadingMoreRef.current || loading) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const res = await fetchNextHomeFeedPage(continuationToken, user?.accessToken);
      if (res.sections && res.sections.length > 0) {
        setSections((prev) => {
          const existingTitles = new Set(prev.map((s) => s.title.toLowerCase()));
          const newShelves = res.sections.filter(
            (s) => !existingTitles.has(s.title.toLowerCase())
          );
          return [...prev, ...newShelves];
        });
      }
      setContinuationToken(res.continuationToken);
    } catch (err) {
      console.warn("[Home] Error loading continuation shelves:", err);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [continuationToken, loading, user?.accessToken]);

  // Infinite scroll listener
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const scrollTop = el.scrollTop;
      const scrollHeight = el.scrollHeight;
      const clientHeight = el.clientHeight;

      if (scrollHeight - (scrollTop + clientHeight) < 600) {
        loadMoreShelves();
      }
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [loadMoreShelves]);

  // Play individual song or video card
  const handlePlaySong = (item: HomeFeedCardItem) => {
    const track = homeCardToTrack(item);
    if (item.type === "video" && onPlayVideo) {
      onPlayVideo(track);
    } else {
      onPlayTrack(track);
    }
  };

  // Select playlist, album, or artist card
  const handleSelectItem = (item: HomeFeedCardItem) => {
    const id = item.browseId || item.id;
    if (item.type === "album" && onSelectAlbum) {
      const alb: Album = {
        id,
        title: item.title,
        artist: item.artist || item.subtitle || "Various Artists",
        coverUrl: item.thumbnail,
        releaseYear: item.year || new Date().getFullYear().toString(),
        tracks: [],
        tracksCount: 0,
      };
      onSelectAlbum(alb);
    } else if (onSelectPlaylist) {
      const pl: Playlist = {
        id,
        title: item.title,
        description: item.subtitle || "YouTube Music Collection",
        artist: item.artist || item.subtitle,
        coverUrl: item.thumbnail,
        tracks: [],
        tracksCount: 0,
        updatedAt: new Date().toISOString(),
        type: item.type === "artist" ? "artist" : "playlist",
      };
      onSelectPlaylist(pl);
    }
  };

  // Extract filter tabs based on parsed section titles
  const filterTabs = useMemo(() => {
    const tabs = ["All"];
    sections.forEach((sec) => {
      if (sec.title && !tabs.includes(sec.title)) {
        tabs.push(sec.title);
      }
    });
    return tabs;
  }, [sections]);

  const displayedSections = useMemo(() => {
    if (selectedFilter === "All") return sections;
    return sections.filter((s) => s.title === selectedFilter);
  }, [sections, selectedFilter]);

  return (
    <div
      ref={containerRef}
      className="home-container flex-1 p-4 sm:p-6 md:p-8 space-y-8 pb-64 sm:pb-72 md:pb-52 select-none overflow-y-auto"
      style={{
        color: "var(--theme-text-primary, #ffffff)",
      }}
    >
      {/* Top Brand Navigation Header & Time Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h1
            className={`home-greeting home-user-title text-2xl sm:text-3xl font-black tracking-tight ${designConfig.headingPrimary || "text-white"}`}
            style={{ color: "var(--theme-text-primary, #ffffff)" }}
          >
            {timeGreeting}
            {user?.name ? `, ${user.name.trim().split(" ")[0]}` : ""}
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            id="home-refresh-button"
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 border shadow-sm"
            style={{
              backgroundColor: "var(--theme-card-bg, rgba(255,255,255,0.05))",
              borderColor: "var(--theme-border-color, rgba(255,255,255,0.12))",
              color: "var(--theme-text-primary, #ffffff)",
            }}
            title="Refresh YouTube Music Home Feed"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing || loading ? "animate-spin text-[var(--theme-border-color,#d4af37)]" : ""}`}
            />
            <span>{isRefreshing ? "Fetching..." : "Refresh Feed"}</span>
          </button>

          {!user?.isLoggedIn && onOpenAuthModal && (
            <button
              onClick={onOpenAuthModal}
              className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 border"
              style={{
                backgroundColor: "var(--theme-card-bg, rgba(255,255,255,0.05))",
                borderColor: "var(--theme-border-color, rgba(255,255,255,0.15))",
                color: "var(--theme-text-primary, #ffffff)",
              }}
              title="Sign in for personalized YouTube Music recommendations"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs / Quick Shelves */}
      {!loading && filterTabs.length > 2 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar -mx-1 px-1">
          {filterTabs.map((tab) => {
            const isActive = selectedFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setSelectedFilter(tab)}
                className={`home-filter-chip px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all active:scale-95 border ${
                  isActive
                    ? "active shadow-md"
                    : "opacity-70 hover:opacity-100"
                }`}
                style={
                  isActive
                    ? {
                        backgroundColor: "var(--theme-border-color, #ffffff)",
                        borderColor: "var(--theme-border-color, #ffffff)",
                        color: "#000000",
                      }
                    : {
                        backgroundColor: "var(--theme-card-bg, rgba(255,255,255,0.04))",
                        borderColor: "var(--theme-border-color, rgba(255,255,255,0.1))",
                        color: "var(--theme-text-primary, #ffffff)",
                      }
                }
              >
                {tab}
              </button>
            );
          })}
        </div>
      )}

      {/* UI State 1: Animated Skeleton Loaders */}
      {loading && (
        <div className="space-y-8 animate-pulse">
          {[1, 2, 3, 4].map((shelfIdx) => (
            <div key={shelfIdx} className="space-y-3">
              <div
                className="h-6 w-44 rounded-lg bg-white/10"
                style={{ backgroundColor: "var(--theme-card-bg, rgba(255,255,255,0.08))" }}
              />
              <div className="flex gap-4 overflow-hidden -mx-1 px-1">
                {[1, 2, 3, 4, 5, 6].map((cardIdx) => (
                  <div
                    key={cardIdx}
                    className="shrink-0 w-36 sm:w-44 rounded-2xl p-2.5 border space-y-2.5"
                    style={{
                      backgroundColor: "var(--theme-card-bg, rgba(255,255,255,0.04))",
                      borderColor: "var(--theme-border-color, rgba(255,255,255,0.06))",
                    }}
                  >
                    <div
                      className="aspect-square w-full rounded-xl"
                      style={{ backgroundColor: "var(--theme-border-color, rgba(255,255,255,0.08))" }}
                    />
                    <div className="space-y-1.5">
                      <div className="h-3 w-3/4 rounded bg-white/10" />
                      <div className="h-2.5 w-1/2 rounded bg-white/5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* UI State 2: Error / Fallback State */}
      {!loading && error && sections.length === 0 && (
        <div
          className="p-8 sm:p-12 text-center rounded-3xl border shadow-xl flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto my-8"
          style={{
            backgroundColor: "var(--theme-card-bg, rgba(20,20,20,0.6))",
            borderColor: "var(--theme-border-color, rgba(255,255,255,0.1))",
          }}
        >
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold">Failed to load YouTube Music feed</h3>
            <p className="text-xs text-white/60 leading-relaxed">{error}</p>
          </div>
          <button
            onClick={fetchFeed}
            className="px-6 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 border"
            style={{
              backgroundColor: "var(--theme-border-color, #d4af37)",
              color: "#000000",
              borderColor: "transparent",
            }}
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* UI State 3: Render Authentic Music Carousels */}
      {!loading && displayedSections.length > 0 && (
        <div className="space-y-8">
          {displayedSections.map((section) => (
            <MusicCarousel
              key={section.id}
              section={section}
              onPlaySong={handlePlaySong}
              onSelectItem={handleSelectItem}
              activeTrackId={currentTrack?.id || currentTrack?.youtubeVideoId}
              isPlaying={isPlaying}
              designConfig={designConfig}
            />
          ))}

          {/* Continuation loader indicator */}
          {loadingMore && (
            <div className="flex items-center justify-center py-6 gap-2 text-white/60 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--theme-border-color,#d4af37)]" />
              <span>Loading more recommendations...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
