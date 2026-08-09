import React, { useEffect, useState } from "react";
import { Track, Playlist } from "../types";
import {
  Search,
  Play,
  Plus,
  Sparkles,
  Music2,
  ChevronRight,
  Loader,
  AlertCircle,
} from "lucide-react";

export interface SearchViewProps {
  playerState: any;
  onPlayTrack: (track: Track) => void;
  onPlayQueue: (tracks: Track[], startIndex: number) => void;
  onAddToQueue: (track: Track) => void;
}

export function SearchView({
  playerState,
  onPlayTrack,
  onPlayQueue,
  onAddToQueue,
}: SearchViewProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"songs" | "albums">("songs");
  const [filter, setFilter] = useState("all");

  // ENHANCED: Search function with debouncing
  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setAlbums([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log("Searching for:", searchQuery);

      // Call search API - NOW AVAILABLE via new server endpoint!
      const response = await fetch(
        `/api/youtube/search?q=${encodeURIComponent(searchQuery)}&type=${filter}`,
        {
          headers: playerState?.tokens?.access_token
            ? {
                Authorization: `Bearer ${playerState.tokens.access_token}`,
              }
            : {},
        }
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      console.log("Search results:", data);

      // Extract songs and albums
      const songs = data.tracks || data.items || [];
      const albumsData = data.albums || [];

      setResults(songs);
      setAlbums(albumsData);

      if (songs.length === 0 && albumsData.length === 0) {
        setError("No results found");
      }
    } catch (err) {
      console.error("Search error:", err);
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
      setAlbums([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        handleSearch(query);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // ENHANCED: Handle album click - fetch tracks from album
  const handleAlbumClick = async (album: any) => {
    try {
      setLoading(true);

      // Note: YouTube API search doesn't return albums per se,
      // but we filter by artist instead
      // In a real implementation, this would fetch related tracks by the artist
      if (album.id || album.artistId) {
        // Search for more tracks by this artist
        const artistQuery = album.artist || album.title;
        await handleSearch(artistQuery);
      }

      setActiveTab("songs");
      console.log(`Showing tracks from album`);
    } catch (err) {
      console.error("Error loading album tracks:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load album tracks"
      );
    } finally {
      setLoading(false);
    }
  };

  // ENHANCED: Handle song click - play it immediately
  const handleSongClick = (track: Track) => {
    // Verify track has required fields
    if (!track.id || !track.title) {
      console.error("Invalid track:", track);
      return;
    }

    console.log("Playing track:", track.title);

    // Call the onPlayTrack handler from parent
    onPlayTrack(track);
  };

  // ENHANCED: Queue all results for continuous play
  const handlePlayAll = () => {
    if (!onPlayQueue || results.length === 0) return;

    // Play all results starting from first
    onPlayQueue(results, 0);
    console.log(`Queued ${results.length} songs for playback`);
  };

  // RENDER
  return (
    <div className="p-6 bg-gradient-to-b from-slate-900 to-slate-950 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
          <Search className="w-8 h-8 text-cyan-400" />
          Search YouTube Music
        </h1>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search songs, albums, artists..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-cyan-500 focus:outline-none transition"
          />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-900/20 border border-red-500 text-red-300 p-4 rounded mb-6 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-cyan-400 animate-spin" />
          <span className="ml-4 text-gray-400">Searching...</span>
        </div>
      )}

      {/* Results Found */}
      {!loading && (results.length > 0 || albums.length > 0) && (
        <>
          {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b border-slate-700">
            <button
              onClick={() => setActiveTab("songs")}
              className={`px-4 py-2 font-semibold transition ${
                activeTab === "songs"
                  ? "text-cyan-400 border-b-2 border-cyan-400"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Songs ({results.length})
            </button>
            {albums.length > 0 && (
              <button
                onClick={() => setActiveTab("albums")}
                className={`px-4 py-2 font-semibold transition ${
                  activeTab === "albums"
                    ? "text-cyan-400 border-b-2 border-cyan-400"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Albums ({albums.length})
              </button>
            )}
          </div>

          {/* Songs Tab */}
          {activeTab === "songs" && results.length > 0 && (
            <>
              {/* Play All Button */}
              <div className="mb-6">
                <button
                  onClick={handlePlayAll}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition"
                >
                  <Play className="w-5 h-5" fill="white" />
                  Play All ({results.length})
                </button>
              </div>

              {/* Songs List */}
              <div className="space-y-2">
                {results.map((track, index) => (
                  <div
                    key={track.id || index}
                    className="flex items-center gap-4 p-3 bg-slate-800/50 hover:bg-slate-700 rounded cursor-pointer transition group"
                    onClick={() => handleSongClick(track)}
                  >
                    {/* Index */}
                    <span className="text-gray-400 w-6 text-right">
                      {index + 1}
                    </span>

                    {/* Cover Art */}
                    {track.coverUrl && (
                      <img
                        src={track.coverUrl}
                        alt={track.title}
                        className="w-12 h-12 rounded object-cover"
                        loading="lazy"
                      />
                    )}

                    {/* Track Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {track.title}
                      </p>
                      <p className="text-sm text-gray-400 truncate">
                        {track.artist}
                      </p>
                    </div>

                    {/* Duration */}
                    {track.duration > 0 && (
                      <span className="text-sm text-gray-400">
                        {Math.floor(track.duration / 60)}:
                        {String(track.duration % 60).padStart(2, "0")}
                      </span>
                    )}

                    {/* Action Buttons */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSongClick(track);
                      }}
                      className="bg-cyan-500 hover:bg-cyan-600 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition"
                      title="Play"
                    >
                      <Play className="w-4 h-4 ml-0.5" fill="white" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToQueue(track);
                      }}
                      className="bg-slate-600 hover:bg-slate-500 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition"
                      title="Add to queue"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Albums Tab */}
          {activeTab === "albums" && albums.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {albums.map((album) => (
                <div
                  key={album.id}
                  className="group cursor-pointer"
                  onClick={() => handleAlbumClick(album)}
                >
                  <div className="relative overflow-hidden rounded-lg mb-4 bg-slate-800 aspect-square">
                    {album.coverUrl && (
                      <img
                        src={album.coverUrl}
                        alt={album.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                        loading="lazy"
                      />
                    )}

                    {/* Play Button */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAlbumClick(album);
                        }}
                        className="bg-cyan-500 hover:bg-cyan-600 text-white rounded-full p-3 transform scale-0 group-hover:scale-100 transition"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </div>
                  </div>

                  {/* Album Info */}
                  <h3 className="font-semibold text-white truncate group-hover:text-cyan-400 transition">
                    {album.title}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {album.artist || album.tracks?.length || "Album"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!loading && query === "" && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Music2 className="w-16 h-16 text-gray-500 mb-4" />
          <p className="text-gray-400 text-lg">Start searching for music</p>
          <p className="text-gray-500">Enter a song, album, or artist name</p>
        </div>
      )}

      {/* No Results State */}
      {!loading && query !== "" && results.length === 0 && albums.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="w-16 h-16 text-gray-500 mb-4" />
          <p className="text-gray-400 text-lg">No results found</p>
          <p className="text-gray-500">Try a different search term</p>
        </div>
      )}
    </div>
  );
}

export default SearchView;