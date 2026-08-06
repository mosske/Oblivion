import React, { useEffect, useState } from "react";
import { Track, Playlist } from "../types";
import { Search, Play, Plus, Sparkles, Music2, Check, Radio } from "lucide-react";

interface SearchViewProps {
  onPlayTrack: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  onAddTrackToPlaylist: (track: Track, playlistId: string) => void;
  playlists: Playlist[];
}

export const SearchView: React.FC<SearchViewProps> = ({
  onPlayTrack,
  onAddToQueue,
  onAddTrackToPlaylist,
  playlists,
}) => {
  const [query, setQuery] = useState("Synthwave");
  const [filter, setFilter] = useState<"all" | "track" | "album" | "artist">("all");
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [openPlaylistMenuId, setOpenPlaylistMenuId] = useState<string | null>(null);

  const fetchSearchResults = async (qStr: string) => {
    if (!qStr.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(qStr)}&type=${filter}`);
      const data = await res.json();
      if (data.results) {
        setResults(data.results);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSearchResults(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, filter]);

  const filteredResults = results.filter((item: any) => {
    if (filter === "all") return true;
    return item.type === filter;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar pb-28 select-none">
      {/* Search Header Bar */}
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-white font-mono flex items-center gap-2">
          <Search className="w-6 h-6 text-cyan-400" />
          <span>Search YouTube Music</span>
        </h1>

        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists, albums, or genres..."
            className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 shadow-xl transition-all"
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
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                  : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800"
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
              <div key={i} className="h-16 bg-slate-900/60 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 space-y-2">
            <Music2 className="w-12 h-12 stroke-1" />
            <p className="text-sm font-medium">No YouTube Music results found for "{query}".</p>
          </div>
        ) : (
          filteredResults.map((item: any) => (
            <div
              key={item.id}
              className="group flex items-center justify-between p-3 rounded-2xl bg-slate-900/40 hover:bg-slate-800/80 border border-slate-800/50 hover:border-slate-700 transition-all relative"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-800">
                  <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
                  <button
                    onClick={() => onPlayTrack(item)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <Play className="w-5 h-5 text-white fill-white" />
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4
                      onClick={() => onPlayTrack(item)}
                      className="text-sm font-bold text-white truncate cursor-pointer hover:text-cyan-300"
                    >
                      {item.title}
                    </h4>
                    {item.type && item.type !== "track" && (
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {item.type}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">{item.artist}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onAddToQueue(item)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs flex items-center gap-1 transition-colors"
                  title="Queue Next"
                >
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">Queue</span>
                </button>

                {/* Playlist addition dropdown */}
                <div className="relative">
                  <button
                    onClick={() =>
                      setOpenPlaylistMenuId(openPlaylistMenuId === item.id ? null : item.id)
                    }
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs flex items-center gap-1 transition-colors"
                    title="Add to Playlist"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  {openPlaylistMenuId === item.id && (
                    <div className="absolute right-0 top-10 w-52 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-30 space-y-1">
                      <p className="text-[10px] font-mono text-slate-500 uppercase px-3 py-1">
                        Add to Playlist
                      </p>
                      {playlists.map((pl) => (
                        <button
                          key={pl.id}
                          onClick={() => {
                            onAddTrackToPlaylist(item, pl.id);
                            setOpenPlaylistMenuId(null);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl truncate transition-colors flex items-center gap-2"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                          <span>{pl.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onPlayTrack(item)}
                  className="p-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl transition-all active:scale-95 shadow-md shadow-cyan-400/20"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
