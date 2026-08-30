import React, { useEffect, useState } from "react";
import { Track, Playlist } from "../types";
import { Search, Play, Pause, Plus, Music2, Radio, Sparkles, TrendingUp, Volume2 } from "lucide-react";
import { cleanTrackTitle } from "../utils/formatters";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";

interface SearchViewProps {
  initialQuery?: string;
  onQueryChange?: (query: string) => void;
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

export const SearchView: React.FC<SearchViewProps> = ({
  initialQuery = "",
  onQueryChange,
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
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<"all" | "track" | "album" | "artist">("all");
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [openPlaylistMenuId, setOpenPlaylistMenuId] = useState<string | null>(null);

  useEffect(() => {
    setQuery(initialQuery || "");
  }, [initialQuery]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        let activeToken: string | undefined;
        try {
          const saved = localStorage.getItem("oblivion_saved_user");
          if (saved) {
            const parsed = JSON.parse(saved);
            activeToken = parsed?.accessToken;
          }
        } catch {}

        const headers: Record<string, string> = {};
        if (activeToken) {
          headers["Authorization"] = `Bearer ${activeToken}`;
        }

        const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query.trim())}&type=${filter}`, {
          headers,
          signal: controller.signal
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({ results: [] }));
          if (data?.results) {
            setResults(data.results);
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

  const filteredResults = results.filter((item: any) => {
    if (filter === "all") return true;
    return item.type === filter;
  });

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 space-y-6 pb-40 md:pb-48 select-none">
      {/* Search Header Bar */}
      <div className="space-y-4">
        <h1 className={`text-2xl sm:text-3xl font-extrabold ${designConfig.headingPrimary} tracking-tight flex items-center gap-2.5`}>
          <Search className={`w-6 h-6 ${designConfig.accentText}`} />
          <span>Search Oblivion Music</span>
        </h1>

        <div className="relative max-w-2xl">
          <Search className={`absolute left-4 top-3.5 w-5 h-5 ${designConfig.textMuted}`} />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              onQueryChange?.(e.target.value);
            }}
            placeholder="Search songs, artists, albums, or genres..."
            className={`w-full pl-12 pr-4 py-3 ${designConfig.inputBg} rounded-2xl text-sm focus:outline-none shadow-md transition-all font-medium`}
            autoFocus
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(["all", "track", "album", "artist"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                filter === f
                  ? designConfig.pillActive
                  : designConfig.pillBg
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
            <TrendingUp className="w-4 h-4 text-[#c89b3c]" />
            Trending Search Topics
          </h3>
          <div className="flex flex-wrap gap-2">
            {SEARCH_EXPLORE_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  setQuery(tag);
                  onQueryChange?.(tag);
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
        ) : query.trim() && (filteredResults || []).length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-16 ${designConfig.textMuted} space-y-2`}>
            <Music2 className="w-12 h-12 stroke-1" />
            <p className="text-sm font-medium">No results found for "{query}".</p>
          </div>
        ) : (
          (filteredResults || []).map((item: any, idx: number) => {
            const isAlbum = item.type === "album" || Boolean(item.playlistId);
            const isArtist = item.type === "artist" || Boolean(item.channelId);
            const itemVid = item.youtubeVideoId || item.id;
            const isCurrent = Boolean(
              (!isAlbum && !isArtist) && (
                (currentTrackId && (itemVid === currentTrackId || item.id === currentTrackId)) ||
                (currentTrack?.title && item.title && item.title.toLowerCase().trim() === currentTrack.title.toLowerCase().trim())
              )
            );

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
                  tracksCount: item.tracksCount || 10
                });
              } else if (isArtist) {
                setQuery(item.title);
                onQueryChange?.(item.title);
                setFilter("all");
              } else {
                const trackResults = (filteredResults || []).filter((i: any) => !i.type || i.type === "track");
                const trackIdx = trackResults.findIndex((t: any) => (t.id || t.youtubeVideoId) === itemVid);
                if (onPlayQueue && trackResults.length > 0) {
                  onPlayQueue(trackResults, trackIdx >= 0 ? trackIdx : 0);
                } else {
                  onPlayTrack(item);
                }
              }
            };

            return (
              <div
                key={`sr_${item.id || item.youtubeVideoId || item.playlistId || 'item'}_${idx}`}
                className={`group flex items-center justify-between p-3 rounded-2xl transition-all relative shadow-sm ${
                  isCurrent
                    ? `${designConfig.cardBg} ring-2 ring-[#c89b3c] shadow-lg bg-[#c89b3c]/5`
                    : `${designConfig.cardBg} ${designConfig.cardHover}`
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div
                    onClick={handleItemClick}
                    className={`relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border ${isCurrent ? "border-[#c89b3c]" : designConfig.borderSubtle} cursor-pointer shadow-sm bg-slate-800 flex items-center justify-center`}
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
                        <div className="flex items-end justify-center gap-0.5 h-4">
                          <span className="w-1 bg-[#c89b3c] animate-bounce h-3 rounded-full"></span>
                          <span className="w-1 bg-[#c89b3c] animate-bounce delay-75 h-4 rounded-full"></span>
                          <span className="w-1 bg-[#c89b3c] animate-bounce delay-150 h-2 rounded-full"></span>
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
                      <h4
                        onClick={handleItemClick}
                        className={`text-sm font-bold truncate cursor-pointer transition-colors ${
                          isCurrent ? designConfig.accentText : `${designConfig.textPrimary} group-hover:${designConfig.accentText}`
                        }`}
                        title={item.title}
                      >
                        {cleanTrackTitle(item.title, item.artist)}
                      </h4>
                      {item.type && item.type !== "track" && (
                        <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded ${designConfig.pillBg}`}>
                          {item.type}
                        </span>
                      )}
                      {isCurrent && isPlaying && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#c89b3c]/20 text-[#855f10] text-[10px] font-mono font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#c89b3c] animate-ping" />
                          Playing
                        </span>
                      )}
                    </div>
                    <p className={`text-xs ${designConfig.textMuted} truncate`}>{item.artist}</p>
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
                        className={`p-2 ${designConfig.textMuted} hover:${designConfig.textPrimary} hover:text-[#c89b3c] rounded-xl hover:bg-black/10 transition-colors`}
                        title="Add to playlist"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
