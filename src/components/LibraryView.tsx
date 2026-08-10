import React from "react";
import { Music, Grid3x3, List, Play } from "lucide-react";

export function LibraryView() {
  const [playlists, setPlaylists] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("list");

  React.useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const res = await fetch("/api/youtube/playlists");
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (data.success) {
          setPlaylists(data.playlists || []);
        }
      } catch (error) {
        console.error("Failed to fetch playlists:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlaylists();
  }, []);

  return (
    <div className="p-6 bg-gradient-to-b from-slate-900 to-slate-950 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Music className="w-8 h-8 text-cyan-400" />
          <h1 className="text-3xl font-bold text-white">Your Library</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded ${viewMode === "grid" ? "bg-cyan-500" : "bg-slate-700"}`}
          >
            <Grid3x3 className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded ${viewMode === "list" ? "bg-cyan-500" : "bg-slate-700"}`}
          >
            <List className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Music className="w-12 h-12 text-gray-500 mb-4 animate-pulse" />
          <p className="text-gray-400">Loading playlists...</p>
        </div>
      ) : playlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Music className="w-12 h-12 text-gray-500 mb-4" />
          <p className="text-gray-400 text-lg">Sign in to see your playlists</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {playlists.map((playlist: any) => (
            <div key={playlist.id} className="bg-slate-800/50 hover:bg-slate-700/50 rounded-lg overflow-hidden cursor-pointer transition group">
              <div className="relative">
                {playlist.coverUrl && (
                  <img src={playlist.coverUrl} alt={playlist.name} className="w-full aspect-square object-cover" />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <Play className="w-12 h-12 text-cyan-400" />
                </div>
              </div>
              <div className="p-4">
                <p className="text-white font-semibold truncate">{playlist.name}</p>
                <p className="text-gray-400 text-sm">{playlist.itemCount} songs</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {playlists.map((playlist: any) => (
            <div key={playlist.id} className="bg-slate-800/50 hover:bg-slate-700/50 rounded-lg p-4 flex items-center gap-4 cursor-pointer transition">
              {playlist.coverUrl && <img src={playlist.coverUrl} alt={playlist.name} className="w-12 h-12 rounded" />}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate">{playlist.name}</p>
                <p className="text-gray-400 text-sm">{playlist.itemCount} songs</p>
              </div>
              <Play className="w-5 h-5 text-cyan-400" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LibraryView;