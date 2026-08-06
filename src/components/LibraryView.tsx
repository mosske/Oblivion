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
  CheckCircle2
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
        /* Playlists Grid View */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">All Playlists</h2>
            <button
              onClick={onCreatePlaylist}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create Playlist</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {playlists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => onSelectPlaylist(pl)}
                className="group p-4 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 rounded-2xl cursor-pointer transition-all shadow-lg hover:shadow-cyan-500/10 flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-3 border border-slate-800">
                    <img
                      src={pl.coverUrl}
                      alt={pl.title}
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
        </div>
      )}
    </div>
  );
};
