import React, { useEffect, useState } from "react";
import { Playlist, Track } from "../types";
import { DragDropPlaylist } from "./DragDropPlaylist";
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
  onPlayQueue: (tracks: Track[], startIndex?: number) => void;
  currentTrackId?: string;
  likedTrackIds: string[];
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
}) => {
  const [tab, setTab] = useState<"playlists" | "offline" | "liked">("playlists");
  const [offlineTracks, setOfflineTracks] = useState<Track[]>([]);
  const [cacheSizeMB, setCacheSizeMB] = useState<number>(0);

  // View type and sorting state
  const [viewMode, setViewMode] = useState<"grid" | "compact" | "list">("grid");
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "tracks-desc" | "tracks-asc" | "recent">("recent");
  
  // Hidden playlists state
  const [hiddenPlaylistIds, setHiddenPlaylistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("oblivion_hidden_playlists");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showHiddenPanel, setShowHiddenPanel] = useState<boolean>(false);

  // Sync hidden playlists to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("oblivion_hidden_playlists", JSON.stringify(hiddenPlaylistIds));
    } catch (e) {
      console.error("Failed to save hidden playlists:", e);
    }
  }, [hiddenPlaylistIds]);

  // Load offline cached tracks
  useEffect(() => {
    const loadOfflineData = async () => {
      const tracks = await getAllCachedTracks();
      const size = await getCacheSizeMB();
      setOfflineTracks(tracks);
      setCacheSizeMB(size);
    };

    loadOfflineData();
  }, [tab]);

  const handleRemoveOfflineTrack = async (trackId: string) => {
    await removeCachedTrack(trackId);
    setOfflineTracks((prev) => prev.filter((t) => t.id !== trackId));
    const size = await getCacheSizeMB();
    setCacheSizeMB(size);
  };

  const handleHidePlaylist = (e: React.MouseEvent, playlistId: string) => {
    e.stopPropagation();
    if (!hiddenPlaylistIds.includes(playlistId)) {
      setHiddenPlaylistIds((prev) => [...prev, playlistId]);
    }
  };

  const handleUnhidePlaylist = (playlistId: string) => {
    setHiddenPlaylistIds((prev) => prev.filter((id) => id !== playlistId));
  };

  const handleUnhideAll = () => {
    setHiddenPlaylistIds([]);
  };

  // Filter visible vs hidden playlists
  const visiblePlaylists = playlists.filter((pl) => !hiddenPlaylistIds.includes(pl.id));
  const hiddenPlaylists = playlists.filter((pl) => hiddenPlaylistIds.includes(pl.id));

  // Sorted Playlists
  const sortedPlaylists = [...visiblePlaylists].sort((a, b) => {
    if (sortBy === "name-asc") {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === "name-desc") {
      return b.title.localeCompare(a.title);
    }
    if (sortBy === "tracks-desc") {
      const countA = a.tracksCount || a.tracks?.length || 0;
      const countB = b.tracksCount || b.tracks?.length || 0;
      return countB - countA;
    }
    if (sortBy === "tracks-asc") {
      const countA = a.tracksCount || a.tracks?.length || 0;
      const countB = b.tracksCount || b.tracks?.length || 0;
      return countA - countB;
    }
    // "recent"
    const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return timeB - timeA;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar pb-28 select-none">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold text-white font-mono flex items-center gap-2">
            <Library className="w-6 h-6 text-cyan-400" />
            <span>Your Library</span>
          </h1>
          <p className="text-xs text-slate-400">
            Real-time YouTube Playlists & Offline Saved Music
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => {
              setTab("playlists");
              onSelectPlaylist(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === "playlists" && !selectedPlaylist
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Playlists ({playlists.length})
          </button>

          <button
            onClick={() => {
              setTab("offline");
              onSelectPlaylist(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              tab === "offline"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>Offline Downloads</span>
          </button>
        </div>
      </div>

      {/* Selected Playlist Detail View */}
      {selectedPlaylist ? (
        <div className="space-y-6 animate-fade-in">
          {/* Playlist Hero */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80">
            <img
              src={selectedPlaylist.coverUrl}
              alt={selectedPlaylist.title}
              className="w-40 h-40 rounded-2xl object-cover border border-slate-700 shadow-2xl"
            />

            <div className="flex-1 space-y-2 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                {selectedPlaylist.isYouTubeSynced && (
                  <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    YouTube Synced
                  </span>
                )}
                <span className="text-xs text-slate-400 font-mono">
                  {selectedPlaylist.tracks?.length || 0} tracks
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                {selectedPlaylist.title}
              </h2>
              <p className="text-xs text-slate-400 max-w-lg">{selectedPlaylist.description}</p>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-center sm:justify-start gap-3">
                <button
                  onClick={() => {
                    if (selectedPlaylist.tracks && selectedPlaylist.tracks.length > 0) {
                      onPlayQueue(selectedPlaylist.tracks, 0);
                    }
                  }}
                  disabled={!selectedPlaylist.tracks || selectedPlaylist.tracks.length === 0}
                  className="px-5 py-2.5 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-400/20 flex items-center gap-2 transition-all active:scale-95"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Play All</span>
                </button>

                <button
                  onClick={() => onEditPlaylist(selectedPlaylist)}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
                  title="Edit details & cover image"
                >
                  <Edit className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onDeletePlaylist(selectedPlaylist.id)}
                  className="p-2.5 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-xl transition-colors"
                  title="Delete playlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Drag & Drop Sortable Tracks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">
              <span>Track List (Drag handle to reorder)</span>
              <span>Duration</span>
            </div>

            <DragDropPlaylist
              tracks={selectedPlaylist.tracks || []}
              onReorderTracks={(newTracks) => onReorderPlaylistTracks(selectedPlaylist.id, newTracks)}
              onPlayTrack={onPlayTrack}
              onRemoveTrack={(trackId) => onRemoveTrackFromPlaylist(selectedPlaylist.id, trackId)}
              currentTrackId={currentTrackId}
            />
          </div>
        </div>
      ) : tab === "offline" ? (
        /* Offline Downloads View */
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
            <div className="flex items-center gap-3">
              <HardDrive className="w-6 h-6 text-cyan-400" />
              <div>
                <p className="text-sm font-bold text-white">IndexedDB Song Storage</p>
                <p className="text-xs text-slate-400">{offlineTracks.length} tracks cached for offline playback</p>
              </div>
            </div>

            <span className="font-mono text-sm text-cyan-400 font-bold px-3 py-1 bg-cyan-950/60 rounded-xl border border-cyan-800/60">
              {cacheSizeMB} MB Used
            </span>
          </div>

          <div className="space-y-2">
            {offlineTracks.length === 0 ? (
              <div className="text-center py-12 text-slate-500 space-y-2 border border-dashed border-slate-800 rounded-2xl">
                <DownloadCloud className="w-12 h-12 mx-auto stroke-1" />
                <p className="text-sm font-medium">No offline downloads yet.</p>
                <p className="text-xs">Click the download icon on any playing track to save for offline listening!</p>
              </div>
            ) : (
              offlineTracks.map((track, idx) => (
                <div
                  key={track.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/40 border border-slate-800/60 hover:bg-slate-800/70 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="w-5 text-xs font-mono text-slate-500 text-center">{idx + 1}</span>
                    <img src={track.coverUrl} alt={track.title} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">{track.title}</p>
                      <p className="text-xs text-slate-400 truncate">{track.artist}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Offline
                    </span>
                    <button
                      onClick={() => onPlayTrack(track)}
                      className="p-2 bg-cyan-400 text-slate-950 hover:bg-cyan-300 rounded-xl transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-slate-950" />
                    </button>
                    <button
                      onClick={() => handleRemoveOfflineTrack(track.id)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Playlists Main View */
        <div className="space-y-6">
          {/* Controls Bar: View Picker, Sort Dropdown, Hidden Toggle, Create Playlist */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex flex-wrap items-center gap-3">
              {/* View Mode Buttons */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    viewMode === "grid"
                      ? "bg-cyan-500 text-slate-950 shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="hidden sm:inline">Grid</span>
                </button>
                <button
                  onClick={() => setViewMode("compact")}
                  className={`p-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    viewMode === "compact"
                      ? "bg-cyan-500 text-slate-950 shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Compact Cards View"
                >
                  <Columns className="w-4 h-4" />
                  <span className="hidden sm:inline">Compact</span>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    viewMode === "list"
                      ? "bg-cyan-500 text-slate-950 shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">List</span>
                </button>
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-xs text-slate-400 font-mono hidden sm:inline">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
                >
                  <option value="recent" className="bg-slate-900 text-white">Recently Updated</option>
                  <option value="name-asc" className="bg-slate-900 text-white">Name (A – Z)</option>
                  <option value="name-desc" className="bg-slate-900 text-white">Name (Z – A)</option>
                  <option value="tracks-desc" className="bg-slate-900 text-white">Most Tracks</option>
                  <option value="tracks-asc" className="bg-slate-900 text-white">Fewest Tracks</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Hidden Playlists Toggle Button */}
              {hiddenPlaylists.length > 0 && (
                <button
                  onClick={() => setShowHiddenPanel((prev) => !prev)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                    showHiddenPanel
                      ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                      : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                  }`}
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Hidden ({hiddenPlaylists.length})</span>
                </button>
              )}

              {/* Create Playlist Button */}
              <button
                onClick={onCreatePlaylist}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Create Playlist</span>
              </button>
            </div>
          </div>

          {/* Hidden Playlists Drawer/Panel */}
          {showHiddenPanel && hiddenPlaylists.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                <div className="flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-amber-200">Hidden Playlists ({hiddenPlaylists.length})</span>
                </div>
                <button
                  onClick={handleUnhideAll}
                  className="text-xs font-mono text-amber-400 hover:underline"
                >
                  Unhide All
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {hiddenPlaylists.map((pl) => (
                  <div
                    key={pl.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <img
                        src={pl.coverUrl}
                        alt={pl.title}
                        className="w-9 h-9 rounded-lg object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{pl.title}</p>
                        <p className="text-[10px] text-slate-400">{pl.tracksCount || pl.tracks?.length || 0} tracks</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnhidePlaylist(pl.id)}
                      className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Restore to library view"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Unhide</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {sortedPlaylists.length === 0 ? (
            <div className="text-center py-16 text-slate-500 space-y-3 border border-dashed border-slate-800 rounded-3xl">
              <Music className="w-12 h-12 mx-auto stroke-1" />
              <p className="text-sm font-medium text-slate-300">No visible playlists found.</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {hiddenPlaylists.length > 0
                  ? "All playlists are currently hidden. Use the 'Hidden' button above to restore them."
                  : "Connect your YouTube account to automatically sync your playlists or click 'Create Playlist' above."}
              </p>
            </div>
          ) : viewMode === "grid" ? (
            /* GRID VIEW */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {sortedPlaylists.map((pl) => (
                <div
                  key={pl.id}
                  onClick={() => onSelectPlaylist(pl)}
                  className="group relative p-4 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 rounded-2xl cursor-pointer transition-all shadow-lg hover:shadow-cyan-500/10 flex flex-col justify-between"
                >
                  {/* Hide Action Button */}
                  <button
                    onClick={(e) => handleHidePlaylist(e, pl.id)}
                    className="absolute top-6 right-6 z-10 p-2 bg-black/60 hover:bg-red-500/80 text-slate-300 hover:text-white rounded-xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all shadow"
                    title="Hide this playlist"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>

                  <div>
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-3 border border-slate-800">
                      <img
                        src={pl.coverUrl}
                        alt={pl.title}
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80";
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Play className="w-8 h-8 text-white fill-white" />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 mb-1">
                      {pl.isYouTubeSynced && (
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                      <h3 className="text-sm font-bold text-white truncate group-hover:text-cyan-300">
                        {pl.title}
                      </h3>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2">{pl.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/60 mt-3 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>{pl.tracksCount || pl.tracks?.length || 0} tracks</span>
                    <span>{pl.isYouTubeSynced ? "YouTube" : "Local"}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : viewMode === "compact" ? (
            /* COMPACT CARDS VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedPlaylists.map((pl) => (
                <div
                  key={pl.id}
                  onClick={() => onSelectPlaylist(pl)}
                  className="group relative flex items-center gap-4 p-3 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 rounded-2xl cursor-pointer transition-all shadow-lg hover:shadow-cyan-500/10"
                >
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-slate-800">
                    <img
                      src={pl.coverUrl}
                      alt={pl.title}
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80";
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Play className="w-5 h-5 text-white fill-white" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 pr-8">
                    <div className="flex items-center gap-1.5 mb-1">
                      {pl.isYouTubeSynced && (
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                      <h3 className="text-sm font-bold text-white truncate group-hover:text-cyan-300">
                        {pl.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 truncate mb-2">{pl.description || "YouTube Playlist"}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                      <span>{pl.tracksCount || pl.tracks?.length || 0} tracks</span>
                      <span>•</span>
                      <span>{pl.isYouTubeSynced ? "YouTube" : "Local"}</span>
                    </div>
                  </div>

                  {/* Hide Action Button */}
                  <button
                    onClick={(e) => handleHidePlaylist(e, pl.id)}
                    className="absolute top-3 right-3 p-1.5 bg-slate-800 hover:bg-red-500/80 text-slate-400 hover:text-white rounded-lg transition-all"
                    title="Hide this playlist"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            /* LIST VIEW */
            <div className="space-y-2">
              {sortedPlaylists.map((pl, idx) => (
                <div
                  key={pl.id}
                  onClick={() => onSelectPlaylist(pl)}
                  className="group flex items-center justify-between p-3 rounded-2xl bg-slate-900/40 hover:bg-slate-800/70 border border-slate-800/60 hover:border-slate-700 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <span className="w-5 text-xs font-mono text-slate-500 text-center font-bold">
                      {idx + 1}
                    </span>

                    <div className="relative w-12 h-12 shrink-0 rounded-xl overflow-hidden border border-slate-800">
                      <img
                        src={pl.coverUrl}
                        alt={pl.title}
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80";
                        }}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Play className="w-4 h-4 text-white fill-white" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-semibold text-slate-200 truncate group-hover:text-cyan-300">
                          {pl.title}
                        </h4>
                        {pl.isYouTubeSynced && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-mono shrink-0">
                            YouTube
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate">{pl.description || "No description"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-xs font-mono text-slate-400">
                      {pl.tracksCount || pl.tracks?.length || 0} tracks
                    </span>

                    <button
                      onClick={(e) => handleHidePlaylist(e, pl.id)}
                      className="p-2 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-xl transition-colors"
                      title="Hide playlist"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
