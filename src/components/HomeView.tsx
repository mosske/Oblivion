import React from 'react';

interface Track {
  id: string;
  youtubeVideoId: string;
  title: string;
  artist: string;
  coverUrl: string;
}

export function HomeView() {
  const [tracks, setTracks] = React.useState<Track[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/youtube/recommendations');
        const data = await res.json();
        if (data.success && data.quickPicks) {
          setTracks(data.quickPicks);
        }
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-6">Welcome to Oblivion</h2>
      <p className="text-gray-400 mb-8">Your YouTube Music Player</p>

      {loading && <p className="text-gray-400">Loading recommendations...</p>}

      {tracks.length > 0 ? (
        <div>
          <h3 className="text-xl font-semibold mb-4">Trending Now</h3>
          <div className="grid grid-cols-3 gap-4">
            {tracks.map((track) => (
              <div
                key={track.id}
                className="bg-slate-800/50 p-4 rounded hover:bg-slate-700/50 cursor-pointer transition"
              >
                {track.coverUrl && (
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    className="w-full h-40 object-cover rounded mb-3"
                  />
                )}
                <h4 className="font-semibold truncate">{track.title}</h4>
                <p className="text-sm text-gray-400 truncate">{track.artist}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        !loading && <p className="text-gray-400">No recommendations available</p>
      )}
    </div>
  );
}

export default HomeView;