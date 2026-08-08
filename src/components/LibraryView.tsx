import React, { useEffect, useState } from "react";
import { Playlist, Track } from "../types";
import { DragDropPlaylist } from "./DragDropPlaylist";
import { cleanTrackTitle } from "../utils/formatters";
import {
  Library,
  Sparkles,
  Plus,
  Play,
  DownloadCloud,
  Trash2,
  Edit,
  Heart,
  HardDrive,
  RefreshCcw,
  CheckCircle2,
  LayoutGrid,
  List,
  Columns,
  ArrowUpDown,
  Eye,
  EyeOff,
  Music
} from "lucide-react";
import { getAllCachedTracks, getCacheSizeMB, removeCachedTrack } from "../utils/offlineCache";

interface LibraryViewProps {
  playlists: Playlist[];
  selectedPlaylist: Playlist | null;
  onSelectPlaylist: (playlist: Playlist | null) => void;
  onCreatePlaylist: () => void;
  onEditPlaylist: (playlist: Playlist) => void;
  onDeletePlaylist: (playlistId: string) => void;
  onReorderPlaylistTracks: (playlistId: string, newTracks: Track[]) => void;
  onRemoveTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  onPlayTrack: (track: Track) => void;
  onPlayQueue: (tracks: Track[], startIndex: number) => void;
  currentTrackId?: string;
  likedTrackIds: string[];
  currentTrack?: Track | null;
  onAddTrackToPlaylist: (track: Track, playlistId: string) => void;
  onSyncPlaylistTracks?: (playlistId: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  playlists,
  selectedPlaylist,
  onSelectPlaylist,
  onCreatePlaylist,
  onEditPlaylist,
  onDeletePlaylist,
  onReorderPlaylistTracks,
  onRemoveTrackFromPlaylist,
  onPlayTrack,
  onPlayQueue,
  currentTrackId,
  likedTrackIds,
  currentTrack,
  onAddTrackToPlaylist,
  onSyncPlaylistTracks,
}) => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [cachedTracks, setCachedTracks] = useState<Track[]>([]);
  const [cacheSizeMB, setCacheSizeMB] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const loadCachedTracks = async () => {
      const cached = await getAllCachedTracks();
      setCachedTracks(cached);
      const size = await getCacheSizeMB();
      setCacheSizeMB(size);
    };
    loadCachedTracks();
  }, []);

  const handleRemoveFromCache = async (trackId: string) => {
    await removeCachedTrack(trackId);
    const updated = cachedTracks.filter((t) => t.id !== trackId);
    setCachedTracks(updated);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-950 overflow-hidden">
      <div className="flex-1 overflow-y-auto space-y-6 p-6">
        {/* Playlists Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Library className="w-6 h-6 text-cyan-400" />
              Your Playlists
            </h2>
            <button
              onClick={onCreatePlaylist}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all font-medium flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              New Playlist
            </button>
          </div>

          {playlists.length === 0 ? (
            <div className="p-8 text-center bg-slate-800/50 rounded-lg border border-slate-700/50">
              <Music className="w-12 h-12 mx-auto mb-3 text-slate-500" />
              <p className="text-slate-400">No playlists yet. Create one to get started!</p>
            </div>
          ) : (
            <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" : "space-y-2"}>
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  onClick={() => onSelectPlaylist(pl)}
                  className={`group rounded-lg overflow-hidden cursor-pointer transition-all ${
                    selectedPlaylist?.id === pl.id
                      ? "ring-2 ring-cyan-400 bg-slate-800/80"
                      : "bg-slate-800/50 hover:bg-slate-800"
                  } ${viewMode === "list" ? "p-3 flex items-center gap-3" : "p-3"}`}
                >
                  <img
                    src={
                      pl.coverUrl ||
                      pl.tracks?.[0]?.coverUrl ||
                      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80"
                    }
                    alt={pl.title}
                    className={`object-cover rounded-md bg-slate-700 ${
                      viewMode === "grid" ? "w-full aspect-square" : "w-12 h-12 shrink-0"
                    }`}
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80";
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate group-hover:text-cyan-300">{pl.title}</h3>
                    <p className="text-xs text-slate-400">{pl.tracks?.length || 0} tracks</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Playlist Detail View */}
        {selectedPlaylist ? (
          <div className="space-y-6 animate-fade-in">
            {/* Playlist Hero - PRIORITY 1 FIXES APPLIED HERE */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80">
              <img
                src={selectedPlaylist.coverUrl || selectedPlaylist.tracks?.[0]?.coverUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80"}
                alt={selectedPlaylist.title}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80";
                }}
                className="w-20 h-20 rounded-xl object-cover border border-slate-600 shadow-lg shrink-0"
              />

              <div className="flex-1 space-y-2 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  {selectedPlaylist.isYouTubeSynced && (
                    <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                      YouTube Synced
                    </span>
                  )}
                </div>
                <h1 className="text-3xl font-bold text-white">{selectedPlaylist.title}</h1>
                <p className="text-slate-400 text-sm">{selectedPlaylist.tracks?.length || 0} tracks</p>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => onPlayQueue(selectedPlaylist.tracks || [], 0)}
                  className="flex-1 sm:flex-none px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all font-medium flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Play All
                </button>
                <button
                  onClick={() => onEditPlaylist(selectedPlaylist)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tracks */}
            {selectedPlaylist.tracks && selectedPlaylist.tracks.length > 0 ? (
              <DragDropPlaylist
                tracks={selectedPlaylist.tracks}
                onReorder={(newTracks) => onReorderPlaylistTracks(selectedPlaylist.id, newTracks)}
                onRemoveTrack={(trackId) => onRemoveTrackFromPlaylist(selectedPlaylist.id, trackId)}
                onPlayTrack={onPlayTrack}
                currentTrackId={currentTrackId}
                likedTrackIds={likedTrackIds}
              />
            ) : (
              <div className="p-8 text-center bg-slate-800/50 rounded-lg border border-slate-700/50">
                <Music className="w-12 h-12 mx-auto mb-3 text-slate-500" />
                <p className="text-slate-400">No tracks in this playlist. Add some to get started!</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Music className="w-16 h-16 mx-auto mb-4 text-slate-500" />
              <p className="text-slate-400 text-lg">Select a playlist to view tracks</p>
            </div>
          </div>
        )}

        {/* Cached Tracks Section */}
        {cachedTracks.length > 0 && (
          <div className="border-t border-slate-700 pt-6">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-purple-400" />
                Offline Cache ({cacheSizeMB.toFixed(1)}MB)
              </h2>
              <ArrowUpDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
            </div>

            {isExpanded && (
              <div className="mt-4 space-y-2">
                {cachedTracks.map((track) => (
                  <div key={track.id} className="flex items-center justify-between p-2 bg-slate-800/50 rounded hover:bg-slate-800 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{track.title}</p>
                      <p className="text-xs text-slate-400">{track.artist}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveFromCache(track.id)}
                      className="ml-2 p-1 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};