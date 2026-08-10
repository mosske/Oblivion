import React from "react";
import { Music, Music2, ChevronRight, Play } from "lucide-react";

export function HomeView() {
  const [trendingTracks, setTrendingTracks] = React.useState([]);
  const [quickPicks, setQuickPicks] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const res = await fetch("/api/youtube/recommendations");
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (data.success) {
          setTrendingTracks(data.trendingTracks || []);
          setQuickPicks(data.quickPicks || []);
        }
      } catch (error) {
        console.error("Failed to fetch recommendations:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendations();
  }, []);

  return (
    <div className="p-6 bg-gradient-to-b from-slate-900 to-slate-950 min-h-screen">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Welcome to Oblivion</h1>
        <p className="text-gray-400">Your YouTube Music Player</p>
      </div>

      <div className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Music className="w-6 h-6 text-cyan-400" />
          Quick Picks
        </h2>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 bg-slate-800/50 rounded-lg">
            <Music2 className="w-12 h-12 text-gray-500 mb-4 animate-pulse" />
            <p className="text-gray-400">Loading...</p>
          </div>
        ) : quickPicks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-slate-800/50 rounded-lg">
            <Music2 className="w-12 h-12 text-gray-500 mb-4" />
            <p className="text-gray-400">No recommendations available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {quickPicks.map((track: any) => (
              <div key={track.id} className="bg-slate-800/50 hover:bg-slate-700/50 rounded-lg p-4 flex items-center gap-4 cursor-pointer transition">
                {track.coverUrl && <img src={track.coverUrl} alt={track.title} className="w-12 h-12 rounded" />}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{track.title}</p>
                  <p className="text-gray-400 text-sm truncate">{track.artist}</p>
                </div>
                <Play className="w-5 h-5 text-cyan-400" />
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Music className="w-6 h-6 text-cyan-400" />
          Trending Hits
        </h2>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 bg-slate-800/50 rounded-lg">
            <Music2 className="w-12 h-12 text-gray-500 mb-4 animate-pulse" />
            <p className="text-gray-400">Loading...</p>
          </div>
        ) : trendingTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-slate-800/50 rounded-lg">
            <Music2 className="w-12 h-12 text-gray-500 mb-4" />
            <p className="text-gray-400">No trending music available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {trendingTracks.slice(0, 10).map((track: any) => (
              <div key={track.id} className="bg-slate-800/50 hover:bg-slate-700/50 rounded-lg p-4 flex items-center gap-4 cursor-pointer transition">
                {track.coverUrl && <img src={track.coverUrl} alt={track.title} className="w-12 h-12 rounded" />}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{track.title}</p>
                  <p className="text-gray-400 text-sm truncate">{track.artist}</p>
                </div>
                <Play className="w-5 h-5 text-cyan-400" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default HomeView;