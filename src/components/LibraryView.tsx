import React, { useEffect, useState } from "react";
import { Playlist, Track } from "../types";
import { DragDropPlaylist } from "./DragDropPlaylist";
import { cleanTrackTitle } from "../utils/formatters";
import {
  Play,
  Plus,
  Trash2,
  Grid3x3,
  List,
  Download,
  Music,
  ChevronRight,
  Loader,
} from "lucide-react";

export interface LibraryViewProps {
  playerState: any;
  onPlayTrack: (track: Track) => void;
  onPlayQueue: (tracks: Track[], startIndex: number) => void;
  onAddToQueue: (track: Track) => void;
}

export function LibraryView({
  playerState,
  onPlayTrack,
  onPlayQueue,
  onAddToQueue,
}: LibraryViewProps) {
  // STATE MANAGEMENT
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [cachedTracks, setCachedTracks] = useState<Track[]>([]);
  const [cacheSizeMB, setCacheSizeMB] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);

  // CRITICAL FIX: ADD PLAYLIST LOADING STATE
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(
    null
  );
  const [playlistTracks, setPlaylistTracks] = useState<Track[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);

  // CRITICAL FIX: FETCH USER PLAYLISTS ON MOUNT
  useEffect(() => {
    const fetchUserPlaylists = async () => {
      // Only fetch if user is authenticated
      if (!playerState?.user?.id) {
        console.log("Not authenticated, skipping playlist fetch");
        return;
      }

      try {
        setLoadingPlaylists(true);
        setPlaylistError(null);

        console.log("Fetching user playlists...");

        // Call API to get user's YouTube playlists
        const response = await fetch("/api/youtube/playlists", {
          headers: {
            Authorization: `Bearer ${playerState.tokens?.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch playlists: ${response.status}`);
        }

        const data = await response.json();
        console.log("Playlists fetched:", data);

        // Handle response structure
        const playlists = data.playlists || data.items || [];
        setUserPlaylists(playlists);

        if (playlists.length === 0) {
          setPlaylistError("No playlists found");
        }
      } catch (error) {
        console.error("Error fetching playlists:", error);
        setPlaylistError(
          error instanceof Error ? error.message : "Failed to load playlists"
        );
      } finally {
        setLoadingPlaylists(false);
      }
    };

    fetchUserPlaylists();
  }, [playerState?.user?.id, playerState?.tokens?.access_token]);

  // CRITICAL FIX: LOAD PLAYLIST TRACKS WHEN PLAYLIST SELECTED
  const handlePlaylistClick = async (playlist: Playlist) => {
    setSelectedPlaylistId(playlist.id);

    // If tracks already exist in playlist object, use them
    if (playlist.tracks && playlist.tracks.length > 0) {
      setPlaylistTracks(playlist.tracks);
      return;
    }

    // Otherwise, fetch tracks from API
    try {
      setLoadingTracks(true);

      const response = await fetch(`/api/youtube/playlists/${playlist.id}`, {
        headers: {
          Authorization: `Bearer ${playerState.tokens?.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch playlist tracks: ${response.status}`);
      }

      const data = await response.json();
      const tracks = data.tracks || data.items || [];

      setPlaylistTracks(tracks);
      console.log(`Loaded ${tracks.length} tracks from playlist`);
    } catch (error) {
      console.error("Error fetching playlist tracks:", error);
    } finally {
      setLoadingTracks(false);
    }
  };

  // CRITICAL FIX: PLAY TRACKS FROM PLAYLIST
  const handlePlayPlaylist = (playlist: Playlist) => {
    if (!onPlayQueue) return;

    const tracks = playlist.tracks || playlistTracks;
    if (tracks && tracks.length > 0) {
      onPlayQueue(tracks, 0);
      console.log(`Playing ${playlist.name} with ${tracks.length} tracks`);
    }
  };

  // RENDER
  return (
    <div className="p-6 bg-gradient-to-b from-slate-900 to-slate-950 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Music className="w-8 h-8 text-cyan-400" />
          <h1 className="text-3xl font-bold text-white">Your Library</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded ${
              viewMode === "grid"
                ? "bg-cyan-500 text-white"
                : "bg-slate-700 text-gray-300"
            }`}
          >
            <Grid3x3 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded ${
              viewMode === "list"
                ? "bg-cyan-500 text-white"
                : "bg-slate-700 text-gray-300"
            }`}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loadingPlaylists && (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-cyan-400 animate-spin" />
          <span className="ml-4 text-gray-400">Loading playlists...</span>
        </div>
      )}

      {/* Error State */}
      {playlistError && (
        <div className="bg-red-900/20 border border-red-500 text-red-300 p-4 rounded mb-6">
          ⚠️ {playlistError}
        </div>
      )}

      {/* Playlists Grid / List */}
      {!loadingPlaylists && userPlaylists.length > 0 && (
        <>
          <h2 className="text-xl font-semibold text-white mb-6">
            Your YouTube Playlists ({userPlaylists.length})
          </h2>

          {viewMode === "grid" ? (
            // GRID VIEW
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
              {userPlaylists.map((playlist) => (
                <div
                  key={playlist.id}
                  className="group cursor-pointer"
                  onClick={() => handlePlaylistClick(playlist)}
                >
                  <div className="relative overflow-hidden rounded-lg mb-4 bg-slate-800 aspect-square">
                    {/* Playlist Cover Art */}
                    {playlist.coverUrl ? (
                      <img
                        src={playlist.coverUrl}
                        alt={playlist.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600">
                        <Music className="w-12 h-12 text-white" />
                      </div>
                    )}

                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayPlaylist(playlist);
                        }}
                        className="bg-cyan-500 hover:bg-cyan-600 text-white rounded-full p-3 transform scale-0 group-hover:scale-100 transition"
                      >
                        <Play className="w-6 h-6 ml-1" fill="white" />
                      </button>
                    </div>
                  </div>

                  {/* Playlist Info */}
                  <h3 className="font-semibold text-white truncate group-hover:text-cyan-400 transition">
                    {playlist.name}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {playlist.tracks?.length || 0} songs
                  </p>
                </div>
              ))}
            </div>
          ) : (
            // LIST VIEW
            <div className="space-y-2 mb-12">
              {userPlaylists.map((playlist) => (
                <div
                  key={playlist.id}
                  onClick={() => handlePlaylistClick(playlist)}
                  className="flex items-center gap-4 p-4 bg-slate-800/50 hover:bg-slate-700 rounded cursor-pointer transition"
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded flex-shrink-0">
                    {playlist.coverUrl ? (
                      <img
                        src={playlist.coverUrl}
                        alt={playlist.name}
                        className="w-full h-full object-cover rounded"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 rounded flex items-center justify-center">
                        <Music className="w-8 h-8 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">
                      {playlist.name}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {playlist.tracks?.length || 0} songs
                    </p>
                  </div>

                  {/* Play Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayPlaylist(playlist);
                    }}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white rounded-full p-2 transition"
                  >
                    <Play className="w-5 h-5 ml-0.5" fill="white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Playlist Detail / Tracks View */}
      {selectedPlaylistId && playlistTracks.length > 0 && (
        <>
          <div className="mb-8">
            <button
              onClick={() => {
                setSelectedPlaylistId(null);
                setPlaylistTracks([]);
              }}
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 mb-6"
            >
              ← Back to Playlists
            </button>

            <h2 className="text-2xl font-bold text-white mb-6">
              {userPlaylists.find((p) => p.id === selectedPlaylistId)?.name}
            </h2>

            {loadingTracks && (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-6 h-6 text-cyan-400 animate-spin" />
              </div>
            )}

            {!loadingTracks && (
              <div className="space-y-2">
                {playlistTracks.map((track, index) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-4 p-3 bg-slate-800/50 hover:bg-slate-700 rounded cursor-pointer transition group"
                    onClick={() => onPlayTrack(track)}
                  >
                    {/* Index */}
                    <span className="text-gray-400 w-6 text-right">
                      {index + 1}
                    </span>

                    {/* Cover */}
                    <img
                      src={track.coverUrl || ""}
                      alt={track.title}
                      className="w-12 h-12 rounded object-cover"
                      loading="lazy"
                    />

                    {/* Track Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {cleanTrackTitle(track.title)}
                      </p>
                      <p className="text-sm text-gray-400 truncate">
                        {track.artist}
                      </p>
                    </div>

                    {/* Play Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayTrack(track);
                      }}
                      className="bg-cyan-500 hover:bg-cyan-600 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition"
                    >
                      <Play className="w-4 h-4 ml-0.5" fill="white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Empty State */}
      {!loadingPlaylists && userPlaylists.length === 0 && !playlistError && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Music className="w-16 h-16 text-gray-500 mb-4" />
          <p className="text-gray-400 text-lg">No playlists yet</p>
          <p className="text-gray-500">Create a playlist on YouTube to see it here</p>
        </div>
      )}
    </div>
  );
}

export default LibraryView;