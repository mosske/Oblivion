import React, { useState, useEffect, useRef } from "react";
import { Playlist, Track, Album } from "../types";
import {
  ArrowLeft,
  Play,
  Pause,
  Shuffle,
  Repeat,
  Repeat1,
  DownloadCloud,
  Check,
  Save,
  ArrowUpDown,
  Trash2,
  Edit,
  Plus,
  Sparkles,
  Music2,
  Clock,
  GripVertical,
  CheckCircle2,
  Layers,
  Share2,
  Loader2,
  RefreshCw,
  Image as ImageIcon
} from "lucide-react";
import { cacheTrackAudio, isTrackCached } from "../utils/offlineCache";
import { cleanTrackTitle } from "../utils/formatters";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";
import { PlaylistCustomCoverModal } from "./PlaylistCustomCoverModal";
import { PlaylistCoverArt } from "./PlaylistCoverArt";

interface PlaylistDetailViewProps {
  item: Playlist | Album;
  isAlbum?: boolean;
  onBack: () => void;
  onPlayTrack: (track: Track) => void;
  onPlayQueue: (tracks: Track[], startIndex: number) => void;
  onEditPlaylist?: (playlist: Playlist) => void;
  onUpdateCover?: (coverUrl: string, isCustom: boolean) => void;
  onReorderTracks?: (newTracks: Track[]) => void;
  onRemoveTrack?: (trackId: string) => void;
  onSyncToYouTube?: (tracks: Track[]) => Promise<any>;
  onAddToQueue?: (track: Track) => void;
  onAddTrackToPlaylist?: (track: Track, playlistId: string) => void;
  currentTrackId?: string;
  isPlaying?: boolean;
  playlists?: Playlist[];
  designConfig?: FullAppDesignConfig;
  repeatMode?: "off" | "one" | "all";
  onToggleRepeat?: () => void;
  isShuffle?: boolean;
  onToggleShuffle?: () => void;
  isSyncingLive?: boolean;
  onSyncLive?: () => void;
}

export const PlaylistDetailView: React.FC<PlaylistDetailViewProps> = ({
  item,
  isAlbum = false,
  onBack,
  onPlayTrack,
  onPlayQueue,
  onEditPlaylist,
  onUpdateCover,
  onReorderTracks,
  onRemoveTrack,
  onSyncToYouTube,
  onAddToQueue,
  onAddTrackToPlaylist,
  currentTrackId,
  isPlaying = false,
  playlists = [],
  designConfig = FULL_APP_DESIGNS["designer"],
  repeatMode = "off",
  onToggleRepeat,
  isShuffle = false,
  onToggleShuffle,
  isSyncingLive = false,
  onSyncLive,
}) => {
  if (!item) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
        <p className="text-sm text-slate-400 mb-4">No playlist or album selected.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-[#c89b3c] hover:bg-[#b58b34] text-slate-950 font-bold rounded-xl text-xs"
        >
          Return to Library
        </button>
      </div>
    );
  }

  const [tracks, setTracks] = useState<Track[]>(Array.isArray(item.tracks) ? item.tracks.filter(Boolean) : []);
  const [isInternalSyncing, setIsInternalSyncing] = useState<boolean>(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);

  const [isReorderMode, setIsReorderMode] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadCurrentIndex, setDownloadCurrentIndex] = useState<number>(0);
  const [isFullyDownloaded, setIsFullyDownloaded] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessBanner, setSaveSuccessBanner] = useState<boolean>(false);
  const [cachedTrackMap, setCachedTrackMap] = useState<Record<string, boolean>>({});
  const [openPlaylistDropdownId, setOpenPlaylistDropdownId] = useState<string | null>(null);
  const [isCustomCoverModalOpen, setIsCustomCoverModalOpen] = useState<boolean>(false);
  const [isLoadingTracks, setIsLoadingTracks] = useState<boolean>(!item.tracks || item.tracks.length === 0);

  // Sync state if props item changes
  useEffect(() => {
    if (item.tracks && item.tracks.length > 0) {
      setTracks(item.tracks.filter(Boolean));
      setIsLoadingTracks(false);
    }
  }, [item.tracks]);

  // Execute sync check with YouTube Music on open or when triggered
  const executeSyncCheck = async () => {
    if (onSyncLive) {
      onSyncLive();
    }
    setIsInternalSyncing(true);
    try {
      let activeToken = "";
      try {
        const saved = localStorage.getItem("oblivion_saved_user");
        if (saved) {
          const parsed = JSON.parse(saved);
          activeToken = parsed?.accessToken || "";
        }
      } catch {}

      const headers: Record<string, string> = {};
      if (activeToken) {
        headers["Authorization"] = `Bearer ${activeToken}`;
      }

      const titleParam = encodeURIComponent(item.title || "");
      const artistParam = encodeURIComponent((item as any).artist || (item as any).description || "");
      const typeParam = isAlbum ? "album" : "playlist";
      const res = await fetch(
        `/api/youtube/playlists/${item.id}/items?title=${titleParam}&artist=${artistParam}&type=${typeParam}&refresh=true&_t=${Date.now()}`,
        { headers }
      );
      const data = await res.json();
      if (data.tracks && Array.isArray(data.tracks)) {
        const clean: Track[] = data.tracks
          .filter(Boolean)
          .map((t: any, idx: number) => {
            const vidId = t.youtubeVideoId || t.id;
            return {
              ...t,
              id: t.id ? String(t.id) : (vidId ? `${vidId}_${idx}` : `track_${idx}`),
              youtubeVideoId: vidId || t.id,
            };
          });
        setTracks(clean);
        if (onReorderTracks) {
          onReorderTracks(clean);
        }
      }
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.warn("Sync with YouTube Music failed:", err);
    } finally {
      setIsInternalSyncing(false);
      setIsLoadingTracks(false);
    }
  };

  // Trigger sync check immediately whenever this playlist is opened
  useEffect(() => {
    executeSyncCheck();
  }, [item.id]);

  // Check which tracks are already cached
  useEffect(() => {
    let isMounted = true;
    const checkAllCached = async () => {
      const map: Record<string, boolean> = {};
      let allCached = tracks.length > 0;
      for (const t of tracks) {
        const trId = t.id || t.youtubeVideoId;
        if (!trId) continue;
        const cached = await isTrackCached(trId);
        map[trId] = cached;
        if (!cached) allCached = false;
      }
      if (isMounted) {
        setCachedTrackMap(map);
        setIsFullyDownloaded(allCached);
      }
    };
    if (tracks.length > 0) {
      checkAllCached();
    }
    return () => {
      isMounted = false;
    };
  }, [tracks]);

  const safeTracks = React.useMemo(() => (Array.isArray(tracks) ? tracks.filter(Boolean) : []), [tracks]);

  // Calculate total duration in minutes safely
  const totalDurationSecs = safeTracks.reduce((acc, t) => acc + (t?.duration || 210), 0);
  const durationMins = isNaN(totalDurationSecs) ? 0 : Math.max(0, Math.floor(totalDurationSecs / 60));

  // Download entire playlist with live progress bar
  const handleDownloadAll = async () => {
    if (isDownloading || safeTracks.length === 0) return;
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadCurrentIndex(0);

    const newMap = { ...cachedTrackMap };
    for (let i = 0; i < safeTracks.length; i++) {
      const track = safeTracks[i];

      setDownloadCurrentIndex(i + 1);
      const trId = track.id || track.youtubeVideoId;
      if (trId && !newMap[trId]) {
        await cacheTrackAudio(track, (pct) => {
          const overallPct = Math.round(((i + pct / 100) / tracks.length) * 100);
          setDownloadProgress(overallPct);
        });
        newMap[trId] = true;
        setCachedTrackMap({ ...newMap });
      }
      setDownloadProgress(Math.round(((i + 1) / tracks.length) * 100));
    }

    setIsDownloading(false);
    setIsFullyDownloaded(true);
  };

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Drag and drop handlers for song reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      handleDragEnd();
      return;
    }
    const newTracks = [...tracks];
    const [movedTrack] = newTracks.splice(draggedIndex, 1);
    newTracks.splice(targetIndex, 0, movedTrack);
    setTracks(newTracks);
    if (!isAlbum && onReorderTracks) {
      onReorderTracks(newTracks);
    }
    handleDragEnd();
  };

  // Remove track
  const handleRemoveTrackInternal = (trackId: string) => {
    const updated = tracks.filter((t) => (t.id || t.youtubeVideoId) !== trackId);
    setTracks(updated);
    if (!isAlbum && onRemoveTrack) {
      onRemoveTrack(trackId);
    }
  };

  // Save / Commit changes to YouTube Music backend
  const handleSaveToYouTube = async () => {
    if (isAlbum || !onSyncToYouTube) return;
    setIsSaving(true);
    try {
      await onSyncToYouTube(tracks);
      setSaveSuccessBanner(true);
      setTimeout(() => setSaveSuccessBanner(false), 3500);
    } catch (err) {
      console.error("Save to YouTube failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // When Done Reordering is clicked, exit reorder mode and sync new order to YouTube
  const handleToggleReorderMode = async () => {
    if (isReorderMode) {
      setIsReorderMode(false);
      await handleSaveToYouTube();
    } else {
      setIsReorderMode(true);
    }
  };

  // Shuffle play all tracks in this playlist
  const handleShufflePlay = () => {
    if (tracks.length === 0) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    if (!isShuffle && onToggleShuffle) {
      onToggleShuffle();
    }
    onPlayQueue(shuffled, 0);
  };

  return (
    <div className="flex-1 flex flex-col select-none pb-40 md:pb-48">
      {/* Top Sticky Header with Back Button */}
      <div className={`sticky top-0 z-20 flex items-center justify-between p-4 sm:p-6 ${designConfig.headerBg} backdrop-blur-xl border-b ${designConfig.borderSubtle}`}>
        <button
          onClick={onBack}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${designConfig.btnSecondary} ${designConfig.textPrimary} text-sm font-semibold transition-all hover:scale-105 active:scale-95 shadow-sm`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          {saveSuccessBanner && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Saved & Synced to YouTube Music!</span>
            </div>
          )}

          {/* Live Sync Check Button */}
          <button
            onClick={executeSyncCheck}
            disabled={isInternalSyncing || isSyncingLive}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${designConfig.btnSecondary} ${designConfig.textPrimary} border ${designConfig.borderSubtle} text-xs font-semibold shadow-sm transition-all hover:scale-105 active:scale-95`}
            title="Sync with YouTube Music to fetch latest songs"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isInternalSyncing || isSyncingLive ? "animate-spin text-[#c89b3c]" : "text-[#c89b3c]"
              }`}
            />
            <span>{isInternalSyncing || isSyncingLive ? "Syncing..." : "Sync with YouTube"}</span>
          </button>

          {!isAlbum && (
            <button
              onClick={handleSaveToYouTube}
              disabled={isSaving}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl ${designConfig.btnPrimary} text-xs font-semibold shadow-md transition-all active:scale-95`}
              title="Save and commit all changes to YouTube Music"
            >
              <Save className={`w-3.5 h-3.5 ${isSaving ? "animate-spin" : ""}`} />
              <span>{isSaving ? "Saving..." : "Save to YouTube"}</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto w-full">
        {/* Fresh Hero Card */}
        <div className={`relative overflow-hidden rounded-3xl ${designConfig.cardBg} border ${designConfig.accentBorder} p-6 sm:p-8 shadow-2xl transition-all`}>
          <div className="absolute top-0 right-0 w-96 h-96 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#c89b3c]/40 via-cyan-500/20 to-transparent blur-3xl"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6 sm:gap-8">
            {/* Playlist Cover Art with YouTube Floating Edit Button */}
            <div className="relative group shrink-0">
              <div className="relative">
                {!isAlbum ? (
                  <PlaylistCoverArt
                    playlist={{ ...(item as Playlist), tracks }}
                    className={`w-44 h-44 sm:w-52 sm:h-52 rounded-2xl object-cover shadow-2xl border-2 ${designConfig.accentBorder} transition-transform duration-300 group-hover:scale-[1.02]`}
                  />
                ) : (
                  <img
                    src={
                      item.coverUrl ||
                      tracks[0]?.coverUrl ||
                      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=500&q=80"
                    }
                    alt={item.title}
                    className={`w-44 h-44 sm:w-52 sm:h-52 rounded-2xl object-cover shadow-2xl border-2 ${designConfig.accentBorder} transition-transform duration-300 group-hover:scale-[1.02]`}
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=500&q=80";
                    }}
                  />
                )}

                {/* Custom Image Badge if custom */}
                {((item as Playlist).isCustomCover || (item as Playlist).customCoverUrl) && (
                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-[10px] font-mono text-white flex items-center gap-1 shadow-lg">
                    <Sparkles className="w-3 h-3 text-[#c89b3c]" />
                    <span>Custom Cover</span>
                  </div>
                )}

                {/* YouTube Floating Circular Pencil Edit Button (Matching Screenshot) */}
                {!isAlbum && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCustomCoverModalOpen(true);
                    }}
                    className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-[#18181b] hover:bg-[#27272a] text-white border-2 border-white/20 shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 z-20 group/btn"
                    title="Change playlist custom image"
                  >
                    <Edit className="w-4 h-4 text-white group-hover/btn:text-[#c89b3c]" />
                  </button>
                )}
              </div>
            </div>

            {/* Playlist Information */}
            <div className="flex-1 text-center md:text-left space-y-3 min-w-0">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className={`px-3 py-1 rounded-full ${designConfig.pillBg} text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm`}>
                  {isAlbum ? <Layers className="w-3.5 h-3.5" /> : <Sparkles className={`w-3.5 h-3.5 ${designConfig.accentText}`} />}
                  {isAlbum ? "Official Album" : "YouTube Music Playlist"}
                </span>

                {isFullyDownloaded && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Offline Ready
                  </span>
                )}
              </div>

              <h1 className={`text-2xl sm:text-4xl font-extrabold ${designConfig.textPrimary} tracking-tight leading-tight line-clamp-2`}>
                {item.title}
              </h1>

              <p className={`text-sm ${designConfig.textSecondary} line-clamp-2 max-w-2xl font-normal`}>
                {(item as any).description || (isAlbum ? `Album by ${(item as Album).artist} • Released ${(item as Album).releaseYear}` : "Curated YouTube Music track collection.")}
              </p>

              <div className={`flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs ${designConfig.textSecondary} pt-1 font-mono`}>
                <span className="font-semibold text-[#c89b3c]">{tracks.length} Tracks</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  ~{durationMins} minutes
                </span>
                <span>•</span>
                <span>Lossless HD Audio</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className={`flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl ${designConfig.cardBg} border ${designConfig.borderSubtle} shadow-lg`}>
          {/* Left Action Buttons: Play All, Shuffle, Repeat */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onPlayQueue(tracks, 0)}
              className={`px-5 py-2.5 rounded-xl ${designConfig.btnPrimary} font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Play All</span>
            </button>

            <button
              onClick={handleShufflePlay}
              className={`p-2.5 rounded-xl border transition-all ${
                isShuffle
                  ? `${designConfig.accentBorder} ${designConfig.accentBg} text-white shadow-md`
                  : `${designConfig.btnSecondary} ${designConfig.textMuted} hover:${designConfig.textPrimary}`
              }`}
              title={isShuffle ? "Shuffle is ON — Click to reshuffle & play" : "Turn Shuffle ON & Play Random Sequence"}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            {onToggleRepeat && (
              <button
                onClick={onToggleRepeat}
                className={`p-2.5 rounded-xl border transition-all ${
                  repeatMode !== "off"
                    ? `${designConfig.accentBorder} ${designConfig.accentBg} text-white shadow-md`
                    : `${designConfig.btnSecondary} ${designConfig.textMuted} hover:${designConfig.textPrimary}`
                }`}
                title={`Repeat Mode: ${repeatMode}`}
              >
                {repeatMode === "one" ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
              </button>
            )}
          </div>

          {/* Right Action Buttons: Reorder, Download Playlist, Edit */}
          <div className="flex flex-wrap items-center gap-2">
            {!isAlbum && (
              <button
                onClick={handleToggleReorderMode}
                disabled={isSaving}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                  isReorderMode
                    ? "bg-[#c89b3c] text-white border-[#c89b3c] shadow-lg ring-2 ring-[#c89b3c]/40 animate-pulse"
                    : `${designConfig.btnSecondary} ${designConfig.textSecondary}`
                }`}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Syncing to YouTube...</span>
                  </>
                ) : (
                  <>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    <span>{isReorderMode ? "Done Reordering" : "Reorder Songs"}</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleDownloadAll}
              disabled={isDownloading || isFullyDownloaded || tracks.length === 0}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                isFullyDownloaded
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : `${designConfig.btnSecondary} ${designConfig.textPrimary}`
              }`}
              title={isFullyDownloaded ? "All tracks saved locally" : "Download entire playlist locally"}
            >
              {isFullyDownloaded ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <DownloadCloud className={`w-3.5 h-3.5 ${isDownloading ? "animate-bounce text-[#c89b3c]" : ""}`} />
              )}
              <span>
                {isFullyDownloaded
                  ? "Downloaded"
                  : isDownloading
                  ? `Downloading (${downloadCurrentIndex}/${tracks.length})`
                  : "Download All"}
              </span>
            </button>

            {!isAlbum && onEditPlaylist && (
              <button
                onClick={() => onEditPlaylist(item as Playlist)}
                className={`p-2.5 ${designConfig.btnSecondary} ${designConfig.textMuted} hover:${designConfig.textPrimary} rounded-xl border border-transparent transition-colors`}
                title="Edit Playlist Details"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Live Download Progress Bar */}
        {isDownloading && (
          <div className={`p-4 rounded-2xl ${designConfig.cardBg} border ${designConfig.accentBorder} space-y-2 animate-fade-in shadow-lg`}>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-semibold ${designConfig.textPrimary} flex items-center gap-2`}>
                <DownloadCloud className="w-4 h-4 text-[#c89b3c] animate-bounce" />
                Downloading tracks for offline fast playback...
              </span>
              <span className="font-mono text-[#c89b3c] font-bold">
                {downloadCurrentIndex}/{tracks.length} ({downloadProgress}%)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800/40 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#c89b3c] to-emerald-400 transition-all duration-300 rounded-full"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Songs List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-3 py-1">
            <h3 className={`text-sm font-bold ${designConfig.headingPrimary} uppercase tracking-wider font-mono`}>
              Tracks ({tracks.length})
            </h3>
            {isReorderMode && (
              <span className="text-[11px] text-[#c89b3c] font-medium">
                Use arrows to reposition songs
              </span>
            )}
          </div>

          {isLoadingTracks ? (
            <div className={`p-16 text-center rounded-2xl ${designConfig.cardBg} border ${designConfig.borderSubtle} space-y-3 animate-fade-in`}>
              <Loader2 className="w-8 h-8 mx-auto text-[#c89b3c] animate-spin" />
              <p className={`text-sm font-semibold ${designConfig.textPrimary}`}>
                {isAlbum ? "Pulling album tracks from YouTube Music..." : "Loading playlist tracks..."}
              </p>
              <p className={`text-xs ${designConfig.textMuted}`}>Fetching lossless audio streams & metadata</p>
            </div>
          ) : tracks.length === 0 ? (
            <div className={`p-12 text-center rounded-2xl ${designConfig.cardBg} border ${designConfig.borderSubtle}`}>
              <Music2 className={`w-12 h-12 mx-auto mb-3 ${designConfig.textMuted}`} />
              <p className={`text-sm font-semibold ${designConfig.textPrimary}`}>This collection has no songs yet.</p>
              <p className={`text-xs ${designConfig.textMuted} mt-1`}>Search for songs or try refreshing.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {tracks.map((track, idx) => {
                const trId = track.id || track.youtubeVideoId;
                const isCurrent = currentTrackId === trId;
                const isCached = trId ? !!cachedTrackMap[trId] : false;
                const isBeingDragged = draggedIndex === idx;
                const isDropTarget = dragOverIndex === idx && draggedIndex !== idx;

                return (
                  <div
                    key={`${trId || 'tr'}_${idx}`}
                    draggable={isReorderMode}
                    onDragStart={(e) => isReorderMode && handleDragStart(e, idx)}
                    onDragOver={(e) => isReorderMode && handleDragOver(e, idx)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => isReorderMode && handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`group relative flex items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all ${
                      isReorderMode ? "cursor-grab active:cursor-grabbing" : ""
                    } ${
                      isBeingDragged
                        ? "opacity-40 scale-[0.98] border-2 border-dashed border-[#c89b3c]"
                        : isDropTarget
                        ? "ring-2 ring-[#c89b3c] scale-[1.01] bg-[#c89b3c]/10 shadow-lg"
                        : isCurrent
                        ? `${designConfig.cardBg} ring-1.5 ${designConfig.accentBorder} shadow-md`
                        : `${designConfig.cardBg} ${designConfig.cardHover}`
                    }`}
                  >
                    {/* Left: Index / Play / Cover / Track Details */}
                    <div
                      onClick={() => {
                        if (!isReorderMode) {
                          onPlayQueue(tracks, idx);
                        }
                      }}
                      className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 cursor-pointer"
                    >
                      {/* Track number or active equalizer */}
                      <div className="w-6 text-center shrink-0">
                        {isCurrent && isPlaying ? (
                          <div className="flex items-end justify-center gap-0.5 h-4">
                            <span className="w-1 bg-[#c89b3c] animate-bounce h-3 rounded-full"></span>
                            <span className="w-1 bg-[#c89b3c] animate-bounce delay-75 h-4 rounded-full"></span>
                            <span className="w-1 bg-[#c89b3c] animate-bounce delay-150 h-2 rounded-full"></span>
                          </div>
                        ) : (
                          <span className={`text-xs font-mono font-medium ${isCurrent ? designConfig.accentText : designConfig.textMuted}`}>
                            {idx + 1}
                          </span>
                        )}
                      </div>

                      {/* Thumbnail Cover */}
                      <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 shadow-sm border border-black/10">
                        <img
                          src={track.coverUrl}
                          alt={track.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80";
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Play className="w-4 h-4 text-white fill-white" />
                        </div>
                      </div>

                      {/* Title & Artist */}
                      <div className="flex-1 min-w-0">
                        <h4
                          className={`text-xs sm:text-sm font-semibold truncate ${
                            isCurrent ? designConfig.accentText : designConfig.textPrimary
                          } group-hover:${designConfig.accentText} transition-colors`}
                          title={track.title}
                        >
                          {cleanTrackTitle(track.title)}
                        </h4>
                        <p className={`text-[11px] sm:text-xs ${designConfig.textMuted} truncate`}>
                          {track.artist}
                        </p>
                      </div>
                    </div>

                    {/* Right Controls: Duration, Download, Drag Handle, Remove */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      {isCached && (
                        <span title="Cached locally" className="text-emerald-500">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </span>
                      )}

                      <span className={`text-[11px] sm:text-xs font-mono ${designConfig.textMuted}`}>
                        {track.duration && track.duration > 0
                          ? `${Math.floor(track.duration / 60)}:${String(Math.floor(track.duration % 60)).padStart(2, "0")}`
                          : "--:--"}
                      </span>

                      {/* Drag Handle in Reorder Mode */}
                      {isReorderMode && (
                        <div
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-[#c89b3c]/15 border border-[#c89b3c]/40 text-[#c89b3c] rounded-xl cursor-grab active:cursor-grabbing hover:bg-[#c89b3c]/25 transition-all shadow-sm select-none"
                          title="Drag up or down to reorder"
                        >
                          <GripVertical className="w-4 h-4 shrink-0" />
                          <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Drag</span>
                        </div>
                      )}

                      {/* Add to another playlist */}
                      {!isReorderMode && onAddTrackToPlaylist && playlists.length > 0 && (
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenPlaylistDropdownId(openPlaylistDropdownId === trId ? null : trId);
                            }}
                            className={`p-1.5 ${designConfig.textMuted} hover:${designConfig.textPrimary} rounded-lg hover:bg-black/10 transition-colors`}
                            title="Add to another playlist"
                          >
                            <Plus className="w-4 h-4" />
                          </button>

                          {openPlaylistDropdownId === trId && (
                            <div className={`absolute right-0 top-8 z-30 w-48 ${designConfig.cardBg} border ${designConfig.borderSubtle} rounded-2xl shadow-2xl p-2 space-y-1 animate-fade-in`}>
                              <p className={`text-[10px] font-bold ${designConfig.textMuted} uppercase px-2 py-1`}>
                                Add to Playlist
                              </p>
                              {playlists.map((pl) => (
                                <button
                                  key={pl.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddTrackToPlaylist(track, pl.id);
                                    setOpenPlaylistDropdownId(null);
                                  }}
                                  className={`w-full text-left px-2 py-1.5 rounded-xl text-xs ${designConfig.textPrimary} hover:${designConfig.accentBg} hover:text-white transition-colors truncate`}
                                >
                                  {pl.title}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Remove Song from Playlist */}
                      {!isAlbum && onRemoveTrack && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Remove "${track.title}" from this playlist?`)) {
                              handleRemoveTrackInternal(trId);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Remove Song"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* YouTube Custom Cover Action Sheet Modal */}
      {!isAlbum && (
        <PlaylistCustomCoverModal
          isOpen={isCustomCoverModalOpen}
          onClose={() => setIsCustomCoverModalOpen(false)}
          playlist={item as Playlist}
          onUpdateCover={(newCoverUrl, isCustom) => {
            if (onUpdateCover) {
              onUpdateCover(newCoverUrl, isCustom);
            }
          }}
          designConfig={designConfig}
        />
      )}
    </div>
  );
};
