import React, { useEffect, useState } from "react";
import { Track, Playlist } from "../types";
import { Search, Play, Plus, Music2, Radio } from "lucide-react";
import { cleanTrackTitle } from "../utils/formatters";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";

interface SearchViewProps {
  onPlayTrack: (track: Track) => void;
  onPlayQueue?: (tracks: Track[], startIndex: number) => void;
  onAddToQueue: (track: Track) => void;
  onAddTrackToPlaylist: (track: Track, playlistId: string) => void;
  playlists: Playlist[];
  onSelectPlaylist?: (playlist: Playlist) => void;
  designConfig?: FullAppDesignConfig;
}

export const SearchView: React.FC<SearchViewProps> = ({
  onPlayTrack,
  onPlayQueue,
  onAddToQueue,
  onAddTrackToPlaylist,
  playlists,
  onSelectPlaylist,
  designConfig = FULL_APP_DESIGNS["designer"],
}) => {
  const [query, setQuery] = useState("Synthwave");
  const [filter, setFilter] = useState<"all" | "track" | "album" | "artist">("all");
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [openPlaylistMenuId, setOpenPlaylistMenuId] = useState<string | null>(null);

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
          const data = await res.json();
          if (data.results) {
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
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar pb-40 md:pb-48 select-none">
      {/* Search Header Bar */}
      <div className="space-y-4">
        <h1 className={`text-2xl font-bold ${designConfig.textPrimary} font-mono flex items-center gap-2`}>
          <Search className={`w-6 h-6 ${designConfig.accentText}`} />
          <span>Search YouTube Music</span>
        </h1>

        <div className="relative max-w-2xl">
          <Search className={`absolute left-4 top-3.5 w-5 h-5 ${designConfig.textMuted}`} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists, albums, or genres..."
            className={`w-full pl-12 pr-4 py-3 ${designConfig.inputBg} rounded-2xl text-sm focus:outline-none shadow-md transition-all`}
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

      {/* Results List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`h-16 ${designConfig.cardBg} rounded-2xl animate-pulse`}></div>
            ))}
          </div>
        ) : (filteredResults || []).length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-16 ${designConfig.textMuted} space-y-2`}>
            <Music2 className="w-12 h-12 stroke-1" />
            <p className="text-sm font-medium">No YouTube Music results found for "{query}".</p>
          </div>
        ) : (
          (filteredResults || []).map((item: any, idx: number) => {
            const isAlbum = item.type === "album" || Boolean(item.playlistId);
            const isArtist = item.type === "artist" || Boolean(item.channelId);

            const handleItemClick = () => {
              if (isAlbum && onSelectPlaylist) {
                onSelectPlaylist({
                  id: item.playlistId || item.id,
                  title: item.title,
                  description: item.artist || "YouTube Album",
                  coverUrl: item.coverUrl,
                  tracks: [],
                  isYouTubeSynced: true,
                  tracksCount: item.tracksCount || 10
                });
              } else if (isArtist) {
                setQuery(item.title);
                setFilter("all");
              } else {
                const trackResults = (filteredResults || []).filter((i: any) => !i.type || i.type === "track");
                const itemTrId = item.id || item.youtubeVideoId;
                const trackIdx = trackResults.findIndex((t: any) => (t.id || t.youtubeVideoId) === itemTrId);
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
                className={`group flex items-center justify-between p-3 rounded-2xl ${designConfig.cardBg} ${designConfig.cardHover} transition-all relative shadow-sm`}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div
                    onClick={handleItemClick}
                    className={`relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border ${designConfig.borderSubtle} cursor-pointer`}
                  >
                    <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
                    <button className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Play className="w-5 h-5 text-white fill-white" />
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4
                        onClick={handleItemClick}
                        className={`text-sm font-bold ${designConfig.textPrimary} truncate cursor-pointer group-hover:${designConfig.accentText}`}
                        title={item.title}
                      >
                        {cleanTrackTitle(item.title, item.artist)}
                      </h4>
                      {item.type && item.type !== "track" && (
                        <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded ${designConfig.pillBg}`}>
                          {item.type}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs ${designConfig.textMuted} truncate`}>{item.artist}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {!isAlbum && !isArtist && (
                    <button
                      onClick={() => onAddToQueue(item)}
                      className={`p-2 ${designConfig.btnSecondary} rounded-xl text-xs flex items-center gap-1 transition-colors`}
                      title="Queue Next"
                    >
                      <Radio className={`w-3.5 h-3.5 ${designConfig.accentText}`} />
                      <span className="hidden sm:inline">Queue</span>
                    </button>
                  )}

                  {!isArtist && (
                    <div className="relative">
                      <button
                        onClick={() =>
                          setOpenPlaylistMenuId(openPlaylistMenuId === item.id ? null : item.id)
                        }
                        className={`p-2 ${designConfig.btnSecondary} rounded-xl text-xs flex items-center gap-1 transition-colors`}
                        title="Add to Playlist"
                      >
                        <Plus className="w-4 h-4" />
                      </button>

                      {openPlaylistMenuId === item.id && (
                        <div className={`absolute right-0 top-10 w-52 ${designConfig.modalBg} rounded-2xl shadow-2xl p-2 z-30 space-y-1`}>
                          <p className={`text-[10px] font-mono ${designConfig.textMuted} uppercase px-3 py-1`}>
                            Add to Playlist
                          </p>
                          {(playlists || []).map((pl, idx) => (
                            <button
                              key={`dd_pl_${pl.id}_${idx}`}
                              onClick={() => {
                                onAddTrackToPlaylist(item, pl.id);
                                setOpenPlaylistMenuId(null);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs font-semibold ${designConfig.textSecondary} hover:${designConfig.textPrimary} ${designConfig.isLight ? "hover:bg-[#ede8dc]" : "hover:bg-slate-800"} rounded-xl truncate transition-colors flex items-center gap-2`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${designConfig.accentBg}`}></span>
                              <span>{pl.title}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleItemClick}
                    className={`p-2.5 ${designConfig.btnPrimary} rounded-xl transition-all active:scale-95 shadow-md`}
                  >
                    <Play className="w-4 h-4 fill-current" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
