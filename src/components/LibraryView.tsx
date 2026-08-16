import React, { useEffect, useState } from "react";
import { Playlist, Track } from "../types";
import { DragDropPlaylist } from "./DragDropPlaylist";
import {
  Library,
  Sparkles,
  Plus,
  Play,
  Trash2,
  Edit,
  HardDrive,
  ArrowUpDown,
  Music
} from "lucide-react";
import { getAllCachedTracks, getCacheSizeMB, removeCachedTrack } from "../utils/offlineCache";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";

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
  designConfig?: FullAppDesignConfig;
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
  designConfig = FULL_APP_DESIGNS["designer"],
}) => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
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

  const cleanPlaylists = React.useMemo(() => {
    const seen = new Set<string>();
    return (playlists || []).filter((pl) => {
      if (!pl) return false;
      const id = pl.id || pl.playlistId;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [playlists]);

  const cleanCachedTracks = React.useMemo(() => {
    const seen = new Set<string>();
    return (cachedTracks || []).filter((tr) => {
      if (!tr) return false;
      const id = tr.id || tr.youtubeVideoId;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [cachedTracks]);

  const handleRemoveFromCache = async (trackId: string) => {
    await removeCachedTrack(trackId);
    const updated = cachedTracks.filter((t) => t.id !== trackId);
    setCachedTracks(updated);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      <div className="flex-1 overflow-y-auto space-y-6 p-6 md:p-8 custom-scrollbar pb-40 md:pb-48">
        {/* Playlists Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-2xl font-bold ${designConfig.textPrimary} flex items-center gap-2`}>
              <Library className={`w-6 h-6 ${designConfig.accentText}`} />
              Your Playlists
            </h2>
            <button
              onClick={onCreatePlaylist}
              className={`px-4 py-2 ${designConfig.btnPrimary} rounded-xl transition-all font-semibold flex items-center gap-2 text-xs shadow-md active:scale-95`}
            >
              <Plus className="w-4 h-4" />
              New Playlist
            </button>
          </div>

          {cleanPlaylists.length === 0 ? (
            <div className={`p-8 text-center ${designConfig.cardBg} rounded-2xl border ${designConfig.borderSubtle}`}>
              <Music className={`w-12 h-12 mx-auto mb-3 ${designConfig.textMuted}`} />
              <p className={designConfig.textSecondary}>No playlists yet. Create one to get started!</p>
            </div>
          ) : (
            <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" : "space-y-2"}>
              {cleanPlaylists.map((pl) => (
                <div
                  key={pl.id}
                  onClick={() => onSelectPlaylist(pl)}
                  className={`group rounded-2xl overflow-hidden cursor-pointer transition-all ${designConfig.cardBg} ${designConfig.cardHover} ${
                    selectedPlaylist?.id === pl.id
                      ? `ring-2 ${designConfig.accentBorder} shadow-lg`
                      : ""
                  } ${viewMode === "list" ? "p-3 flex items-center gap-3" : "p-3"}`}
                >
                  <img
                    src={
                      pl.coverUrl ||
                      pl.tracks?.[0]?.coverUrl ||
                      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80"
                    }
                    alt={pl.title}
                    className={`object-cover rounded-xl ${designConfig.isLight ? "bg-[#ede8dc]" : "bg-slate-700"} ${
                      viewMode === "grid" ? "w-full aspect-square mb-2.5" : "w-12 h-12 shrink-0"
                    }`}
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80";
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold text-sm ${designConfig.textPrimary} truncate group-hover:${designConfig.accentText}`}>{pl.title}</h3>
                    <p className={`text-xs ${designConfig.textMuted}`}>{pl.tracks?.length || 0} tracks</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Playlist Detail View */}
        {selectedPlaylist ? (
          <div className="space-y-6 animate-fade-in">
            {/* Playlist Hero */}
            <div className={`flex flex-col sm:flex-row items-center sm:items-end gap-6 p-6 rounded-3xl ${designConfig.cardBg} border ${designConfig.borderSubtle} shadow-lg`}>
              <img
                src={selectedPlaylist.coverUrl || selectedPlaylist.tracks?.[0]?.coverUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80"}
                alt={selectedPlaylist.title}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80";
                }}
                className={`w-24 h-24 rounded-2xl object-cover border ${designConfig.accentBorder} shadow-lg shrink-0`}
              />

              <div className="flex-1 space-y-2 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  {selectedPlaylist.isYouTubeSynced && (
                    <span className={`px-2.5 py-1 rounded-full ${designConfig.pillBg} text-[10px] font-mono font-bold flex items-center gap-1`}>
                      <Sparkles className={`w-3 h-3 ${designConfig.accentText}`} />
                      YouTube Synced
                    </span>
                  )}
                </div>
                <h1 className={`text-2xl sm:text-3xl font-bold ${designConfig.textPrimary}`}>{selectedPlaylist.title}</h1>
                <p className={`text-sm ${designConfig.textMuted}`}>{selectedPlaylist.tracks?.length || 0} tracks</p>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => onPlayQueue(selectedPlaylist.tracks || [], 0)}
                  className={`flex-1 sm:flex-none px-6 py-2.5 ${designConfig.btnPrimary} rounded-xl transition-all font-semibold flex items-center justify-center gap-2 shadow-md`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  Play All
                </button>
                <button
                  onClick={() => onEditPlaylist(selectedPlaylist)}
                  className={`px-4 py-2.5 ${designConfig.btnSecondary} rounded-xl transition-all`}
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tracks */}
            {selectedPlaylist.tracks && selectedPlaylist.tracks.length > 0 ? (
              <DragDropPlaylist
                tracks={selectedPlaylist.tracks}
                onReorderTracks={(newTracks) => onReorderPlaylistTracks(selectedPlaylist.id, newTracks)}
                onRemoveTrack={(trackId) => onRemoveTrackFromPlaylist(selectedPlaylist.id, trackId)}
                onPlayTrack={onPlayTrack}
                onPlayQueue={onPlayQueue}
                currentTrackId={currentTrackId}
              />
            ) : (
              <div className={`p-8 text-center ${designConfig.cardBg} rounded-2xl border ${designConfig.borderSubtle}`}>
                <Music className={`w-12 h-12 mx-auto mb-3 ${designConfig.textMuted}`} />
                <p className={designConfig.textSecondary}>No tracks in this playlist. Add some to get started!</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center">
              <Music className={`w-16 h-16 mx-auto mb-4 ${designConfig.textMuted}`} />
              <p className={`${designConfig.textSecondary} text-base`}>Select a playlist to view tracks</p>
            </div>
          </div>
        )}

        {/* Cached Tracks Section */}
        {cachedTracks.length > 0 && (
          <div className={`border-t ${designConfig.borderSubtle} pt-6`}>
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <h2 className={`text-lg font-bold ${designConfig.textPrimary} flex items-center gap-2`}>
                <HardDrive className={`w-5 h-5 ${designConfig.accentText}`} />
                Offline Cache ({cacheSizeMB.toFixed(1)}MB)
              </h2>
              <ArrowUpDown className={`w-4 h-4 ${designConfig.textMuted} transition-transform ${isExpanded ? "rotate-180" : ""}`} />
            </div>

            {isExpanded && (
              <div className="mt-4 space-y-2">
                {cleanCachedTracks.map((track, idx) => (
                  <div key={track.id} className={`group flex items-center justify-between p-3 ${designConfig.cardBg} rounded-xl ${designConfig.cardHover} transition-colors`}>
                    <div
                      onClick={() => onPlayQueue(cleanCachedTracks, idx)}
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
                        <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Play className="w-4 h-4 text-white fill-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${designConfig.textPrimary} truncate group-hover:${designConfig.accentText}`}>{track.title}</p>
                        <p className={`text-xs ${designConfig.textMuted}`}>{track.artist}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onPlayQueue(cleanCachedTracks, idx)}
                        className={`p-2 ${designConfig.btnSecondary} rounded-lg transition-colors`}
                        title="Play"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <button
                        onClick={() => handleRemoveFromCache(track.id)}
                        className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                        title="Remove from cache"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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