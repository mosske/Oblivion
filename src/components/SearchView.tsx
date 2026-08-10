import React from "react";
import { Search, Music2, Play } from "lucide-react";

export function SearchView() {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) {
        setResults([]);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setResults(data.tracks || []);
      }
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const debouncedSearch = React.useMemo(() => {
    let timeout: NodeJS.Timeout;
    return (value: string) => {
      clearTimeout(timeout);
      setQuery(value);
      timeout = setTimeout(() => handleSearch(value), 300);
    };
  }, []);

  return (
    <div className="p-6 bg-gradient-to-b from-slate-900 to-slate-950 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
          <Search className="w-8 h-8 text-cyan-400" />
          Search YouTube Music
        </h1>
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search songs, albums, artists..."
            value={query}
            onChange={(e) => debouncedSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Music2 className="w-12 h-12 text-gray-500 mb-4 animate-pulse" />
          <p className="text-gray-400">Searching...</p>
        </div>
      )}

      {!loading && results.length === 0 && query && (
        <div className="flex flex-col items-center justify-center py-12">
          <Music2 className="w-12 h-12 text-gray-500 mb-4" />
          <p className="text-gray-400">No results found</p>
        </div>
      )}

      {!loading && results.length === 0 && !query && (
        <div className="flex flex-col items-center justify-center py-12">
          <Music2 className="w-12 h-12 text-gray-500 mb-4" />
          <p className="text-gray-400">Start searching for music</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {results.map((track: any) => (
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
  );
}

export default SearchView;