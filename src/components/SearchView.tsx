import React, { useEffect, useState, useRef } from "react";
import { Track, Playlist } from "../types";
import { Search, Play, Pause, Plus, Music2, Radio, Sparkles, TrendingUp, Volume2, Mic, X, Clock, Trash2, Disc3, User } from "lucide-react";
import { cleanTrackTitle } from "../utils/formatters";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";
import { IdentifyMusicModal } from "./IdentifyMusicModal";
import { MarqueeText } from "./MarqueeText";
import { getInMemoryToken } from "../services/authService";

interface SearchViewProps {
  initialQuery?: string;
  initialResults?: Track[];
  initialFilter?: "all" | "track" | "album" | "artist";
  onQueryChange?: (query: string) => void;
  onResultsChange?: (results: Track[]) => void;
  onFilterChange?: (filter: "all" | "track" | "album" | "artist") => void;
  onPlayTrack: (track: Track) => void;
  onPlayQueue?: (tracks: Track[], startIndex: number) => void;
  onAddToQueue: (track: Track) => void;
  onAddTrackToPlaylist?: (track: Track, playlistId: string) => void;
  onOpenAddToPlaylistModal?: (track: Track) => void;
  playlists: Playlist[];
  onSelectPlaylist?: (playlist: Playlist) => void;
  designConfig?: FullAppDesignConfig;
  currentTrackId?: string;
  currentTrack?: Track | null;
  isPlaying?: boolean;
}

const SEARCH_EXPLORE_TAGS = [
  "Top Hits 2026",
  "Synthwave",
  "Cyberpunk Electronic",
  "Lo-Fi Chillhop",
  "Hip-Hop Classics",
  "Deep House & EDM",
  "Indie Pop",
  "Acoustic Coffeehouse",
  "Rock Anthems",
  "Ambient Soundscapes"
];

const SEARCH_HISTORY_KEY = "oblivion_search_history";

export const SearchView: React.FC<SearchViewProps> = ({
  initialQuery = "",
  initialResults = [],
  initialFilter = "all",
  onQueryChange,
  onResultsChange,
  onFilterChange,
  onPlayTrack,
  onPlayQueue,
  onAddToQueue,
  onAddTrackToPlaylist,
  onOpenAddToPlaylistModal,
  playlists,
  onSelectPlaylist,
  designConfig = FULL_APP_DESIGNS["designer"],
  currentTrackId,
  currentTrack,
  isPlaying = false,
}) => {
  const [query, setQuery] = useState<string>(initialQuery);
  const [filter, setFilter] = useState<"all" | "track" | "album" | "artist">(initialFilter);
  const [results, setResults] = useState<Track[]>(initialResults);
  const [loading, setLoading] = useState<boolean>(false);
  const [isIdentifyModalOpen, setIsIdentifyModalOpen] = useState<boolean>(false);

  // Search history state
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const lastFetchedQueryRef = useRef<string>(
    initialQuery && initialResults.length > 0 ? `${initialQuery.trim()}_${initialFilter}` : ""
  );

  // Close search history dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Save query to localStorage history (max 10 items) ONLY on explicit user submission or selection
  const saveQueryToHistory = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    try {
      const current: string[] = (() => {
        try {
          const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
          return raw ? JSON.parse(raw) : [];
        } catch {
          return [];
        }
      })();
      const updated = [trimmed, ...current.filter((item: string) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, 10);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      setSearchHistory(updated);
    } catch (err) {
      console.warn("Failed to persist search history", err);
    }
  };

  const handleRemoveHistoryItem = (e: React.MouseEvent, itemToRemove: string) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const current: string[] = (() => {
        try {
          const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
          return raw ? JSON.parse(raw) : [];
        } catch {
          return [];
        }
      })();
      const updated = current.filter((item) => item !== itemToRemove);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      setSearchHistory(updated);
    } catch (err) {
      console.warn("Failed to remove search history item", err);
    }
  };

  const handleClearAllHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
      setSearchHistory([]);
    } catch (err) {
      console.warn("Failed to clear search history", err);
    }
  };

  const handleSelectHistoryItem = (selectedText: string) => {
    setQuery(selectedText);
    onQueryChange?.(selectedText);
    saveQueryToHistory(selectedText);
    setShowHistory(false);
    searchInputRef.current?.focus();
  };

  const handleExplicitSubmit = () => {
    if (query.trim()) {
      saveQueryToHistory(query.trim());
      setShowHistory(false);
    }
  };

  // Clear search input, results, and refocus input
  const handleClearSearch = () => {
    setQuery("");
    onQueryChange?.("");
    setResults([]);
    onResultsChange?.([]);
    lastFetchedQueryRef.current = "";
    setShowHistory(true);
    searchInputRef.current?.focus();
  };

  // Synchronize when initialQuery changes from parent
  useEffect(() => {
    if (initialQuery !== query) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  // Synchronize filter with parent
  const handleFilterSelect = (newFilter: "all" | "track" | "album" | "artist") => {
    setFilter(newFilter);
    onFilterChange?.(newFilter);
  };

  // Search execution
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      onResultsChange?.([]);
      setLoading(false);
      lastFetchedQueryRef.current = "";
      return;
    }

    // If initial query was already fetched and results exist, skip duplicate search
    if (lastFetchedQueryRef.current === `${trimmed}_${filter}` && results.length > 0) {
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        let activeToken: string | undefined = getInMemoryToken() || undefined;
        if (!activeToken) {
          try {
            const saved = localStorage.getItem("oblivion_saved_user");
            if (saved) {
              const parsed = JSON.parse(saved);
              activeToken = parsed?.accessToken;
            }
          } catch {}
        }

        const headers: Record<string, string> = {};
        if (activeToken) {
          headers["Authorization"] = `Bearer ${activeToken}`;
        }

        const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(trimmed)}&type=${filter}`, {
          headers,
          signal: controller.signal
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({ results: [] }));
          if (data?.results) {
            setResults(data.results);
            onResultsChange?.(data.results);
            lastFetchedQueryRef.current = `${trimmed}_${filter}`;
          }
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.warn("Search note:", err);
        }
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, filter]);

  const trackResults = (results || []).filter((i: any) => !i.type || i.type === "track");
  const albumResults = (results || []).filter((i: any) => i.type === "album" || Boolean(i.playlistId));
  const artistResults = (results || []).filter((i: any) => i.type === "artist" || Boolean(i.channelId));

  const showTracks = (filter === "all" || filter === "track") && trackResults.length > 0;
  const showAlbums = (filter === "all" || filter === "album") && albumResults.length > 0;
  const showArtists = (filter === "all" || filter === "artist") && artistResults.length > 0;

  const hasAnyResults = showTracks || showAlbums || showArtists;

  const renderResultItem = (item: any, idx: number, sourceList: any[]) => {
    const isAlbum = item.type === "album" || Boolean(item.playlistId);
    const isArtist = item.type === "artist" || Boolean(item.channelId);
    const itemVid = item.videoId || item.youtubeVideoId || item.id;
    const currentVid = currentTrack
      ? ((currentTrack as any).videoId || currentTrack.youtubeVideoId || currentTrack.id)
      : currentTrackId || null;

    // 1. Strict Track Equality via Unique ID:
    const hasItemUniqueId = Boolean(item.id || item.videoId || item.youtubeVideoId);
    const hasCurrentUniqueId = Boolean(currentTrack?.id || (currentTrack as any)?.videoId || currentTrack?.youtubeVideoId || currentTrackId);

    let isCurrentlyPlaying = false;
    if (!isAlbum && !isArtist && currentTrack) {
      if (hasItemUniqueId && hasCurrentUniqueId) {
        const idMatch = Boolean(item.id && (item.id === currentTrack.id || item.id === currentTrackId));
        const vidMatch = Boolean(itemVid && currentVid && itemVid === currentVid);
        isCurrentlyPlaying = idMatch || vidMatch;
      } else if (item.title && item.artist && currentTrack.title && currentTrack.artist) {
        const itemCompound = `${String(item.title).trim().toLowerCase()}::${String(item.artist).trim().toLowerCase()}`;
        const currentCompound = `${String(currentTrack.title).trim().toLowerCase()}::${String(currentTrack.artist).trim().toLowerCase()}`;
        isCurrentlyPlaying = itemCompound === currentCompound;
      }
    }

    const isCurrent = isCurrentlyPlaying;

    const handleItemClick = () => {
      if (isAlbum && onSelectPlaylist) {
        onSelectPlaylist({
          id: item.playlistId || item.id,
          title: item.title,
          artist: item.artist,
          description: item.artist || "YouTube Album",
          coverUrl: item.coverUrl,
          tracks: [],
          isYouTubeSynced: true,
          isAlbum: true,
          tracksCount: item.tracksCount || 10,
        });
      } else if (isArtist) {
        setQuery(item.title);
        onQueryChange?.(item.title);
        saveQueryToHistory(item.title);
        handleFilterSelect("all");
      } else {
        const trackIdx = sourceList.findIndex((t: any) => (t.id || t.youtubeVideoId || t.videoId) === itemVid);
        if (onPlayQueue && sourceList.length > 0) {
          onPlayQueue(sourceList, trackIdx >= 0 ? trackIdx : 0);
        } else {
          onPlayTrack(item);
        }
      }
    };

    return (
      <div
        key={item.id ? `${item.id}_${idx}` : (item.videoId || item.youtubeVideoId ? `${item.videoId || item.youtubeVideoId}_${idx}` : `search_track_${idx}`)}
        className={`group flex items-center justify-between p-3 rounded-2xl transition-all relative shadow-sm ${
          isCurrent
            ? `${designConfig.cardBg} shadow-lg ring-2`
            : `${designConfig.cardBg} ${designConfig.cardHover} border border-transparent`
        }`}
        style={
          isCurrent
            ? {
                borderColor: "var(--border-active, var(--accent-primary))",
                boxShadow: "0 0 0 2px var(--border-active, var(--accent-primary)), 0 4px 14px rgba(0, 0, 0, 0.12)",
                backgroundColor: "rgba(var(--accent-primary-rgb, 197, 155, 39), 0.08)",
              }
            : undefined
        }
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div
            onClick={handleItemClick}
            className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border cursor-pointer shadow-sm bg-slate-800 flex items-center justify-center transition-all"
            style={{
              borderColor: isCurrent
                ? "var(--border-active, var(--accent-primary))"
                : "var(--border-subtle, rgba(200, 200, 200, 0.25))",
              boxShadow: isCurrent ? "0 0 0 1.5px var(--border-active, var(--accent-primary))" : undefined,
            }}
          >
            <img
              src={item.coverUrl || (item.youtubeVideoId || item.id ? `https://i.ytimg.com/vi/${item.youtubeVideoId || item.id}/hqdefault.jpg` : "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80")}
              alt={item.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              loading="lazy"
              onError={(e) => {
                const currentSrc = e.currentTarget.src || "";
                const vId = item.youtubeVideoId || item.id;
                if (vId && (currentSrc.includes("maxresdefault.jpg") || currentSrc.includes("sddefault.jpg"))) {
                  e.currentTarget.src = `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`;
                } else if (vId && currentSrc.includes("hqdefault.jpg")) {
                  e.currentTarget.src = `https://i.ytimg.com/vi/${vId}/mqdefault.jpg`;
                } else if (vId && currentSrc.includes("mqdefault.jpg")) {
                  e.currentTarget.src = `https://i.ytimg.com/vi/${vId}/default.jpg`;
                } else {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80";
                }
              }}
            />

            {/* Playing Equalizer Animation Overlay if Active Song */}
            {isCurrent && isPlaying ? (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="flex items-end justify-center gap-0.5 h-4" title="Currently Playing">
                  <span className={`w-1 h-3 rounded-full animate-bounce bg-gradient-to-t ${designConfig.waveformGradient || "from-[#c59b27] to-[#f59e0b]"} shadow-[0_0_6px_var(--accent-primary)]`}></span>
                  <span className={`w-1 h-4 rounded-full animate-bounce delay-75 bg-gradient-to-t ${designConfig.waveformGradient || "from-[#c59b27] to-[#f59e0b]"} shadow-[0_0_6px_var(--accent-primary)]`}></span>
                  <span className={`w-1 h-2 rounded-full animate-bounce delay-150 bg-gradient-to-t ${designConfig.waveformGradient || "from-[#c59b27] to-[#f59e0b]"} shadow-[0_0_6px_var(--accent-primary)]`}></span>
                </div>
              </div>
            ) : (
              <button className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Play className="w-5 h-5 text-white fill-white" />
              </button>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1 cursor-pointer" onClick={handleItemClick}>
                <MarqueeText
                  text={cleanTrackTitle(item.title, item.artist)}
                  className={`text-sm font-bold ${
                    isCurrent ? designConfig.accentText : `${designConfig.textPrimary} group-hover:${designConfig.accentText}`
                  } transition-colors`}
                  containerClassName="w-full"
                  speed={30}
                />
              </div>
              {item.type && item.type !== "track" && (
                <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded ${designConfig.pillBg} shrink-0`}>
                  {item.type}
                </span>
              )}
              {isCurrent && isPlaying && (
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${designConfig.pillBg} ${designConfig.accentText} border ${designConfig.accentBorder} text-[10px] font-mono font-bold shadow-sm shrink-0`}>
                  <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${designConfig.waveformGradient || "from-[#c59b27] to-[#f59e0b]"} animate-ping`} />
                  Playing
                </span>
              )}
            </div>
            {item.artist && (
              <div className="min-w-0 flex-1 mt-0.5">
                <MarqueeText
                  text={item.artist}
                  className={`text-xs ${designConfig.textMuted}`}
                  containerClassName="w-full"
                  speed={26}
                />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {(!item.type || item.type === "track") && (
            <>
              <button
                onClick={() => onAddToQueue(item)}
                className={`p-2 ${designConfig.textMuted} hover:${designConfig.textPrimary} rounded-xl hover:bg-black/10 transition-colors`}
                title="Add to queue"
              >
                <Radio className="w-4 h-4" />
              </button>

              <button
                id={`search-add-playlist-btn-${item.id}`}
                onClick={() => {
                  if (onOpenAddToPlaylistModal) {
                    onOpenAddToPlaylistModal(item);
                  } else if (onAddTrackToPlaylist && playlists.length > 0) {
                    onAddTrackToPlaylist(item, playlists[0].id);
                  }
                }}
                className={`p-2 ${designConfig.textMuted} hover:${designConfig.accentText} rounded-xl hover:bg-black/10 transition-colors`}
                title="Add to playlist"
              >
                <Plus className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 space-y-6 pb-64 sm:pb-72 md:pb-52 select-none">
      {/* Search Header Bar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className={`text-2xl sm:text-3xl font-extrabold ${designConfig.headingPrimary} tracking-tight flex items-center gap-2.5`}>
            <Search className={`w-6 h-6 ${designConfig.accentText}`} />
            <span>Search Oblivion Music</span>
          </h1>

          {/* Identify Music Button */}
          <button
            id="identify-music-btn"
            onClick={() => setIsIdentifyModalOpen(true)}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 ${designConfig.btnPrimary}`}
            title="Identify music from audio"
          >
            <Mic className="w-4 h-4" />
            <span>Identify Music</span>
          </button>
        </div>

        {/* Search Input Box with Search Button, Clear Button & History Dropdown */}
        <div ref={searchContainerRef} className="relative max-w-2xl">
          <button
            type="button"
            id="search-submit-icon-btn"
            onClick={handleExplicitSubmit}
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full ${designConfig.textMuted} hover:${designConfig.accentText} transition-colors z-10`}
            title="Search"
            aria-label="Submit search"
          >
            <Search className="w-5 h-5" />
          </button>
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => {
              const val = e.target.value;
              setQuery(val);
              onQueryChange?.(val);
            }}
            onFocus={() => setShowHistory(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim()) {
                handleExplicitSubmit();
              } else if (e.key === "Escape") {
                setShowHistory(false);
              }
            }}
            placeholder="Search songs, artists, albums, or genres..."
            className={`w-full pl-12 ${query.trim().length > 0 ? "pr-12" : "pr-4"} py-3 ${designConfig.inputBg} rounded-2xl text-sm focus:outline-none shadow-md transition-all font-medium border ${designConfig.borderSubtle}`}
            autoFocus
          />

          {/* Clear Button ("X" icon) on the far right inside the input box */}
          {query.trim().length > 0 && (
            <button
              type="button"
              id="search-clear-input-btn"
              onClick={handleClearSearch}
              className={`absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full ${designConfig.textMuted} hover:${designConfig.textPrimary} hover:bg-black/10 transition-colors active:scale-90`}
              title="Clear search text and results"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Search History Dropdown (Last 10 Queries) */}
          {showHistory && searchHistory.length > 0 && (
            <div
              id="search-history-dropdown"
              className={`absolute left-0 right-0 top-full mt-2 z-50 ${designConfig.cardBg} backdrop-blur-xl border ${designConfig.borderSubtle} rounded-2xl shadow-2xl p-2 animate-fade-in`}
            >
              <div className={`flex items-center justify-between px-3 py-1.5 mb-1 border-b ${designConfig.borderSubtle}`}>
                <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${designConfig.accentText} flex items-center gap-1.5`}>
                  <Clock className="w-3.5 h-3.5" />
                  Recent Searches
                </span>
                <button
                  type="button"
                  id="clear-all-search-history-btn"
                  onClick={handleClearAllHistory}
                  className={`text-[10px] ${designConfig.textMuted} hover:${designConfig.accentText} transition-colors font-medium`}
                >
                  Clear All
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar">
                {searchHistory.map((item, idx) => (
                  <div
                    key={`hist_${item}_${idx}`}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer ${designConfig.textPrimary} hover:bg-black/5 transition-colors group`}
                    onClick={() => handleSelectHistoryItem(item)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Clock className={`w-3.5 h-3.5 ${designConfig.textMuted} group-hover:${designConfig.accentText} shrink-0`} />
                      <span className="truncate">{item}</span>
                    </div>
                    <button
                      type="button"
                      id={`delete-search-history-item-${idx}`}
                      onClick={(e) => handleRemoveHistoryItem(e, item)}
                      className={`p-1.5 rounded-lg ${designConfig.textMuted} hover:${designConfig.accentText} hover:bg-black/10 transition-colors shrink-0 ml-2`}
                      title={`Remove "${item}" from history`}
                      aria-label={`Remove "${item}" from history`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Filter Pills */}
        <div className="chips-container category-bar chip-scroll-wrapper flex items-center gap-2 overflow-x-auto pb-1 bg-transparent border-0 shadow-none outline-none">
          {(["all", "track", "album", "artist"] as const).map((f) => (
            <button
              key={f}
              onClick={() => handleFilterSelect(f)}
              className={`category-chip filter-pill chip-button px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all active:scale-95 border ${
                filter === f
                  ? `active ${designConfig.pillActive} shadow-md`
                  : `${designConfig.pillBg} hover:opacity-90 border-transparent`
              }`}
            >
              {f === "all" ? "All Results" : f + "s"}
            </button>
          ))}
        </div>
      </div>

      {/* Suggested Topics when search is blank */}
      {!query.trim() && (
        <div className="space-y-4 animate-fade-in pt-2">
          <h3 className={`text-xs font-bold ${designConfig.headingMuted} uppercase tracking-wider flex items-center gap-1.5 font-mono`}>
            <TrendingUp className={`w-4 h-4 ${designConfig.accentText}`} />
            Trending Search Topics
          </h3>
          <div className="flex flex-wrap gap-2">
            {SEARCH_EXPLORE_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  setQuery(tag);
                  onQueryChange?.(tag);
                  saveQueryToHistory(tag);
                  setShowHistory(false);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold ${designConfig.cardBg} ${designConfig.cardHover} ${designConfig.textPrimary} border ${designConfig.borderSubtle} transition-all hover:scale-105 active:scale-95 shadow-sm`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`h-16 ${designConfig.cardBg} rounded-2xl animate-pulse`}></div>
            ))}
          </div>
        ) : query.trim() && !hasAnyResults ? (
          <div className={`flex flex-col items-center justify-center py-16 ${designConfig.textMuted} space-y-2`}>
            <Music2 className="w-12 h-12 stroke-1" />
            <p className="text-sm font-medium">No results found for "{query}".</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Tracks Section */}
            {showTracks && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${designConfig.headingMuted} font-mono flex items-center gap-1.5`}>
                    <Music2 className={`w-3.5 h-3.5 ${designConfig.accentText}`} />
                    <span>Tracks ({trackResults.length})</span>
                  </h3>
                </div>
                <div className="space-y-2">
                  {trackResults.map((item, idx) => renderResultItem(item, idx, trackResults))}
                </div>
              </div>
            )}

            {/* Albums Section */}
            {showAlbums && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${designConfig.headingMuted} font-mono flex items-center gap-1.5`}>
                    <Disc3 className={`w-3.5 h-3.5 ${designConfig.accentText}`} />
                    <span>Albums ({albumResults.length})</span>
                  </h3>
                </div>
                <div className="space-y-2">
                  {albumResults.map((item, idx) => renderResultItem(item, idx, albumResults))}
                </div>
              </div>
            )}

            {/* Artists Section */}
            {showArtists && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${designConfig.headingMuted} font-mono flex items-center gap-1.5`}>
                    <User className={`w-3.5 h-3.5 ${designConfig.accentText}`} />
                    <span>Artists ({artistResults.length})</span>
                  </h3>
                </div>
                <div className="space-y-2">
                  {artistResults.map((item, idx) => renderResultItem(item, idx, artistResults))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Identify Music Modal */}
      <IdentifyMusicModal
        isOpen={isIdentifyModalOpen}
        onClose={() => setIsIdentifyModalOpen(false)}
        onSelectSong={(songQuery) => {
          setQuery(songQuery);
          onQueryChange?.(songQuery);
          saveQueryToHistory(songQuery);
        }}
        designConfig={designConfig}
      />
    </div>
  );
};
