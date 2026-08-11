import React from 'react';

interface Track {
  id: string;
  youtubeVideoId: string;
  title: string;
  artist: string;
  coverUrl: string;
}

export function SearchView() {
  const [query, setQuery] = React.useState('');
  const [tracks, setTracks] = React.useState<Track[]>([]);
  const [loading, setLoading] = React.useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success) {
        setTracks(data.tracks || []);
      }
      setLoading(false);
    } catch (error) {
      console.error('Search failed:', error);
      setLoading(false);
    }
  };

  return (
    <div className="p-8 pb-24">
      <h2 className="text-3xl font-bold mb-6">Search Music</h2>

      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for music..."
            className="flex-1 px-4 py-2 rounded bg-slate-800 text-white placeholder-gray-400 border border-slate-700 focus:border-cyan-400 focus:outline-none"
          />
          <button
            type="submit"
            className="px-6 py-2 rounded bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition"
          >
            Search
          </button>
        </div>
      </form>

      {loading && <p className="text-gray-400">Searching...</p>}

      {tracks.length > 0 ? (
        <div className="grid grid-cols-3 gap-4">
          {tracks.map((track) => (
            <div
              key={track.id}
              className="bg-slate-800/50 p-4 rounded hover:bg-slate-700/50 transition"
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
      ) : (
        query && !loading && <p className="text-gray-400">No results found</p>
      )}
    </div>
  );
}

export default SearchView;