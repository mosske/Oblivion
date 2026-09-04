import React, { useState, useMemo, useEffect } from "react";
import { Track, Playlist } from "../types";
import {
  X,
  Search,
  Check,
  Loader2,
  ListMusic,
  Plus,
  Music2,
  Sparkles,
  ArrowLeft,
  Upload,
  Youtube,
  Image as ImageIcon,
} from "lucide-react";
import { PlaylistCoverArt } from "./PlaylistCoverArt";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";
import { YOUTUBE_ARTWORK_PRESETS } from "./PlaylistModal";
import { getInMemoryToken } from "../App";

export interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  playlists: Playlist[];
  onSelectPlaylist: (track: Track, playlistId: string) => Promise<void> | void;
  onCreatePlaylistWithTrack?: (
    title: string,
    description: string,
    coverUrl: string,
    track: Track
  ) => Promise<void> | void;
  onCreatePlaylist?: (title: string) => Promise<Playlist | null | void>;
  designConfig?: FullAppDesignConfig;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  isOpen,
  onClose,
  track,
  playlists,
  onSelectPlaylist,
  onCreatePlaylistWithTrack,
  onCreatePlaylist,
  designConfig = FULL_APP_DESIGNS["designer"],
}) => {
  const [viewMode, setViewMode] = useState<"select" | "create">("select");
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [livePlaylists, setLivePlaylists] = useState<Playlist[]>(playlists || []);
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);

  // Synchronize with external playlists prop
  useEffect(() => {
    if (playlists && playlists.length > 0) {
      setLivePlaylists((prev) => {
        // Merge so we preserve any fresher live counts
        const prevMap = new Map(prev.map((p) => [p.id || (p as any).playlistId, p]));
        return playlists.map((pl) => {
          const plId = pl.id || (pl as any).playlistId;
          const existing = prevMap.get(plId);
          return {
            ...pl,
            tracksCount: existing?.tracksCount !== undefined ? Math.max(existing.tracksCount, pl.tracksCount ?? 0) : pl.tracksCount,
          };
        });
      });
    }
  }, [playlists]);

  // New Playlist Creation Form State
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState(
    YOUTUBE_ARTWORK_PRESETS[0]?.url ||
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80"
  );
  const [activeCoverTab, setActiveCoverTab] = useState<"preset" | "youtube" | "url" | "upload">("preset");
  const [ytVideoInput, setYtVideoInput] = useState("");
  const [customUrlInput, setCustomUrlInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // 1. When the Playlist Selection Dialog pops up, pull up the number of songs in each Playlist!
  useEffect(() => {
    if (isOpen) {
      setViewMode("select");
      setSearchFilter("");
      setSelectedPlaylistId(null);
      setIsSubmitting(false);
      setIsCreating(false);
      setNewTitle("");
      setNewDescription("");
      setCoverUrl(
        track?.coverUrl ||
          YOUTUBE_ARTWORK_PRESETS[0]?.url ||
          "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80"
      );
      setYtVideoInput("");
      setCustomUrlInput("");

      // Fetch live playlists and song counts immediately from YouTube Music
      const fetchLivePlaylistCounts = async () => {
        setIsLoadingCounts(true);
        try {
          let activeToken: string | undefined = getInMemoryToken() || undefined;
          if (!activeToken) {
            try {
              const saved = localStorage.getItem("oblivion_saved_user");
              if (saved) activeToken = JSON.parse(saved)?.accessToken;
            } catch {}
          }

          const headers: Record<string, string> = {};
          if (activeToken) headers["Authorization"] = `Bearer ${activeToken}`;

          const res = await fetch(`/api/youtube/playlists?refresh=true&_t=${Date.now()}`, { headers });
          if (res.ok) {
            const data = await res.json().catch(() => ({ playlists: [] }));
            if (Array.isArray(data.playlists) && data.playlists.length > 0) {
              setLivePlaylists((prev) => {
                const combinedMap = new Map<string, Playlist>();
                // Base from props first
                (playlists || []).forEach((p) => {
                  const id = p.id || (p as any).playlistId;
                  if (id) combinedMap.set(id, p);
                });
                // Base from prev
                prev.forEach((p) => {
                  const id = p.id || (p as any).playlistId;
                  if (id) combinedMap.set(id, p);
                });
                // Update with freshly fetched data
                data.playlists.forEach((p: Playlist) => {
                  const id = p.id || (p as any).playlistId;
                  if (id) {
                    const existing = combinedMap.get(id);
                    combinedMap.set(id, {
                      ...existing,
                      ...p,
                      tracksCount: p.tracksCount !== undefined ? p.tracksCount : (existing?.tracksCount ?? 0),
                    });
                  }
                });
                return Array.from(combinedMap.values());
              });
            }
          }
        } catch (err) {
          console.warn("Pulling live song counts note:", err);
        } finally {
          setIsLoadingCounts(false);
        }
      };

      fetchLivePlaylistCounts();
    }
  }, [isOpen, track]);

  // Filter visible playlists according to search query
  const effectivePlaylists = livePlaylists.length > 0 ? livePlaylists : (playlists || []);
  const filteredPlaylists = useMemo(() => {
    if (!searchFilter.trim()) return effectivePlaylists;
    const q = searchFilter.toLowerCase().trim();
    return effectivePlaylists.filter(
      (pl) =>
        (pl.title || "").toLowerCase().includes(q) ||
        (pl.description || "").toLowerCase().includes(q)
    );
  }, [effectivePlaylists, searchFilter]);

  if (!isOpen || !track) return null;

  const handleChoosePlaylist = async (playlist: Playlist) => {
    const plId = playlist.id || (playlist as any).playlistId;
    if (!plId || isSubmitting) return;

    setSelectedPlaylistId(plId);
    setIsSubmitting(true);
    try {
      await onSelectPlaylist(track, plId);
      setTimeout(() => {
        setIsSubmitting(false);
        setSelectedPlaylistId(null);
        setSearchFilter("");
        onClose();
      }, 400);
    } catch (err) {
      console.error("Error adding song to playlist:", err);
      setIsSubmitting(false);
      setSelectedPlaylistId(null);
    }
  };

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setCoverUrl(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  // Extract YouTube Thumbnail from URL or ID
  const handleApplyYouTubeThumbnail = () => {
    if (!ytVideoInput.trim()) return;
    let videoId = ytVideoInput.trim();
    if (videoId.includes("youtube.com/watch")) {
      const match = videoId.match(/v=([a-zA-Z0-9_-]{11})/);
      if (match) videoId = match[1];
    } else if (videoId.includes("youtu.be/")) {
      const match = videoId.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
      if (match) videoId = match[1];
    }
    const cleanId = videoId.replace(/[^a-zA-Z0-9_-]/g, "");
    if (cleanId) {
      const highResUrl = `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`;
      setCoverUrl(highResUrl);
    }
  };

  const handleSaveNewPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || isCreating) return;

    setIsCreating(true);
    try {
      if (onCreatePlaylistWithTrack) {
        await onCreatePlaylistWithTrack(
          newTitle.trim(),
          newDescription.trim(),
          coverUrl,
          track
        );
      } else if (onCreatePlaylist) {
        const created = await onCreatePlaylist(newTitle.trim());
        if (created && (created.id || (created as any).playlistId)) {
          const createdId = created.id || (created as any).playlistId;
          await onSelectPlaylist(track, createdId);
        }
      }
      onClose();
    } catch (err) {
      console.error("Error creating new playlist and syncing track:", err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      id="add-to-playlist-modal-backdrop"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        id="add-to-playlist-modal-container"
        className={`w-full max-w-lg ${designConfig.modalBg} border ${designConfig.borderSubtle} rounded-3xl p-6 shadow-2xl space-y-4 flex flex-col max-h-[92vh] overflow-hidden text-left relative`}
        onClick={(e) => e.stopPropagation()}
      >
        {viewMode === "select" ? (
          <>
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-black/10 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`p-2 rounded-xl ${designConfig.accentBg} text-white shadow-sm flex-shrink-0`}>
                  <ListMusic className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className={`text-base font-bold ${designConfig.textPrimary} tracking-tight truncate`}>
                    Add to Playlist
                  </h3>
                  <p className={`text-xs ${designConfig.textMuted} truncate`}>
                    Choose an existing playlist or create a new one
                  </p>
                </div>
              </div>

              <button
                id="add-to-playlist-modal-close-btn"
                onClick={onClose}
                className={`p-2 rounded-xl ${designConfig.textMuted} hover:${designConfig.textPrimary} hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex-shrink-0`}
                title="Close dialog"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selected Track Preview Banner */}
            <div
              id="add-to-playlist-track-banner"
              className={`flex items-center gap-3.5 p-3 rounded-2xl ${designConfig.cardBg} border ${designConfig.borderSubtle} shadow-inner flex-shrink-0`}
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md flex-shrink-0 bg-black/20 relative">
                {track.coverUrl ? (
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music2 className={`w-6 h-6 ${designConfig.textMuted}`} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-bold ${designConfig.textPrimary} truncate`}>
                  {track.title}
                </p>
                <p className={`text-xs ${designConfig.textMuted} truncate`}>
                  {track.artist || "Unknown Artist"}
                </p>
              </div>
            </div>

            {/* Create New Playlist Prominent Action Button */}
            <button
              id="open-create-new-playlist-dialog-btn"
              type="button"
              onClick={() => setViewMode("create")}
              className={`w-full py-3 px-4 rounded-2xl border-2 border-dashed ${designConfig.accentBorder} bg-[#c89b3c]/10 hover:bg-[#c89b3c]/20 ${designConfig.textPrimary} flex items-center justify-between gap-3 text-xs font-bold transition-all shadow-sm group active:scale-[0.99] flex-shrink-0 cursor-pointer`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#c89b3c] text-white flex items-center justify-center shadow">
                  <Plus className="w-4 h-4 stroke-[3]" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-xs">Create New Playlist</p>
                  <p className={`text-[10px] ${designConfig.textMuted} font-normal`}>
                    Enter custom title, description &amp; artwork
                  </p>
                </div>
              </div>
              <Sparkles className="w-4 h-4 text-[#c89b3c] group-hover:scale-110 transition-transform" />
            </button>

            {/* Search Filter Input */}
            {playlists.length > 3 && (
              <div className="relative flex-shrink-0">
                <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${designConfig.textMuted}`} />
                <input
                  id="add-to-playlist-search-input"
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search your playlists..."
                  className={`w-full pl-9 pr-4 py-2 text-xs rounded-xl ${designConfig.inputBg} border ${designConfig.borderSubtle} ${designConfig.textPrimary} placeholder:${designConfig.textMuted} outline-none focus:ring-2 ${designConfig.glowRing} transition-all`}
                />
              </div>
            )}

            {/* Playlists Scrollable List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 min-h-[140px] max-h-[260px]">
              {filteredPlaylists.length === 0 ? (
                <div className="text-center py-6 space-y-2">
                  <ListMusic className={`w-8 h-8 ${designConfig.textMuted} mx-auto opacity-50`} />
                  <p className={`text-xs ${designConfig.textMuted}`}>
                    {searchFilter
                      ? "No playlists matched your search."
                      : "No playlists yet. Click 'Create New Playlist' above to get started!"}
                  </p>
                </div>
              ) : (
                filteredPlaylists.map((pl) => {
                  const plId = pl.id || (pl as any).playlistId;
                  const isSelected = selectedPlaylistId === plId;
                  const songCount = pl.tracksCount ?? (pl.tracks?.length || 0);

                  return (
                    <button
                      key={plId}
                      id={`select-playlist-${plId}`}
                      disabled={isSubmitting}
                      onClick={() => handleChoosePlaylist(pl)}
                      className={`w-full text-left p-2.5 rounded-2xl ${designConfig.cardBg} ${designConfig.cardHover} border ${
                        isSelected ? "border-[#c89b3c] ring-2 ring-[#c89b3c]/30" : designConfig.borderSubtle
                      } flex items-center justify-between gap-3 transition-all duration-200 group active:scale-[0.99] disabled:opacity-60 cursor-pointer`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-11 h-11 rounded-xl overflow-hidden shadow-sm flex-shrink-0 bg-black/20 relative">
                          <PlaylistCoverArt playlist={pl} className="w-full h-full object-cover" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-bold ${designConfig.textPrimary} group-hover:text-[#c89b3c] transition-colors truncate`}>
                            {pl.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[11px] font-medium ${designConfig.textMuted}`}>
                              {songCount} {songCount === 1 ? "song" : "songs"}
                            </span>
                            {pl.isYouTubeSynced && (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-md">
                                YT Music
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex-shrink-0 pl-2">
                        {isSelected && isSubmitting ? (
                          <Loader2 className="w-5 h-5 animate-spin text-[#c89b3c]" />
                        ) : isSelected ? (
                          <div className="w-6 h-6 rounded-full bg-[#c89b3c] text-white flex items-center justify-center shadow-md">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className={`p-1.5 rounded-xl ${designConfig.textMuted} group-hover:text-[#c89b3c] group-hover:bg-[#c89b3c]/10 transition-colors`}>
                            <Plus className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-black/10 dark:border-white/10 shrink-0">
              <p className={`text-[11px] ${designConfig.textMuted}`}>
                Song will be added to the end &amp; committed to YouTube Music
              </p>

              <button
                id="add-to-playlist-cancel-btn"
                type="button"
                onClick={onClose}
                className={`px-4 py-2 text-xs font-semibold rounded-xl ${designConfig.textPrimary} hover:bg-black/10 dark:hover:bg-white/10 border ${designConfig.borderSubtle} transition-colors flex-shrink-0 cursor-pointer`}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          /* ================= CREATE NEW PLAYLIST DETAILS VIEW ================= */
          <form onSubmit={handleSaveNewPlaylist} className="space-y-4 flex flex-col overflow-hidden text-left">
            {/* Header with Back button */}
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-black/10 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  id="create-playlist-back-btn"
                  type="button"
                  onClick={() => setViewMode("select")}
                  className={`p-1.5 rounded-xl ${designConfig.textMuted} hover:${designConfig.textPrimary} hover:bg-black/10 dark:hover:bg-white/10 transition-colors`}
                  title="Back to Playlists"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className={`w-4 h-4 ${designConfig.accentText}`} />
                    <h3 className={`text-base font-bold ${designConfig.textPrimary} tracking-tight truncate`}>
                      Create New Playlist
                    </h3>
                  </div>
                  <p className={`text-xs ${designConfig.textMuted} truncate`}>
                    Enter details, custom artwork &amp; sync to YouTube Music
                  </p>
                </div>
              </div>

              <button
                id="create-playlist-close-btn"
                type="button"
                onClick={onClose}
                className={`p-2 rounded-xl ${designConfig.textMuted} hover:${designConfig.textPrimary} hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex-shrink-0`}
                title="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="overflow-y-auto custom-scrollbar space-y-4 pr-1 max-h-[60vh] flex-1">
              {/* Song to be added preview */}
              <div className={`p-2.5 rounded-2xl ${designConfig.cardBg} border ${designConfig.borderSubtle} flex items-center justify-between gap-3 shadow-inner`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm flex-shrink-0 bg-black/20">
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-bold ${designConfig.textPrimary} truncate`}>
                      {track.title}
                    </p>
                    <p className={`text-[11px] ${designConfig.textMuted} truncate`}>
                      {track.artist || "Unknown Artist"}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#c89b3c] bg-[#c89b3c]/15 px-2 py-1 rounded-lg shrink-0">
                  Track #1
                </span>
              </div>

              {/* Title Input */}
              <div>
                <label className={`block text-xs font-bold ${designConfig.textMuted} uppercase mb-1.5 tracking-wider`}>
                  Playlist Title *
                </label>
                <input
                  id="create-playlist-title-input"
                  type="text"
                  required
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Midnight Beats & Synth Vibes"
                  className={`w-full px-3.5 py-2.5 ${designConfig.inputBg} border ${designConfig.borderSubtle} rounded-xl text-xs font-semibold ${designConfig.textPrimary} placeholder:${designConfig.textMuted} focus:ring-2 ${designConfig.glowRing} outline-none transition-all`}
                />
              </div>

              {/* Description Input */}
              <div>
                <label className={`block text-xs font-bold ${designConfig.textMuted} uppercase mb-1.5 tracking-wider`}>
                  Description (Optional)
                </label>
                <textarea
                  id="create-playlist-description-input"
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Add an optional description for your YouTube Music playlist..."
                  className={`w-full px-3.5 py-2 ${designConfig.inputBg} border ${designConfig.borderSubtle} rounded-xl text-xs ${designConfig.textPrimary} placeholder:${designConfig.textMuted} focus:ring-2 ${designConfig.glowRing} outline-none transition-all resize-none`}
                />
              </div>

              {/* Custom Image Artwork Section */}
              <div>
                <label className={`block text-xs font-bold ${designConfig.textMuted} uppercase mb-2 tracking-wider`}>
                  Custom Image Artwork
                </label>

                <div className="flex gap-3 items-start">
                  {/* Artwork Preview Box */}
                  <div className="relative group shrink-0">
                    <img
                      src={coverUrl}
                      alt="Playlist artwork preview"
                      className={`w-24 h-24 rounded-2xl object-cover border-2 ${designConfig.accentBorder} shadow-lg shrink-0`}
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80";
                      }}
                    />
                  </div>

                  {/* Artwork Tab Selectors */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-black/15 border border-white/5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setActiveCoverTab("preset")}
                        className={`px-2 py-1 rounded-lg font-medium transition-all ${
                          activeCoverTab === "preset"
                            ? `${designConfig.accentBg} text-white shadow-sm font-semibold`
                            : `${designConfig.textMuted} hover:${designConfig.textPrimary}`
                        }`}
                      >
                        Presets
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveCoverTab("youtube")}
                        className={`px-2 py-1 rounded-lg font-medium transition-all ${
                          activeCoverTab === "youtube"
                            ? `${designConfig.accentBg} text-white shadow-sm font-semibold`
                            : `${designConfig.textMuted} hover:${designConfig.textPrimary}`
                        }`}
                      >
                        YouTube Art
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveCoverTab("url")}
                        className={`px-2 py-1 rounded-lg font-medium transition-all ${
                          activeCoverTab === "url"
                            ? `${designConfig.accentBg} text-white shadow-sm font-semibold`
                            : `${designConfig.textMuted} hover:${designConfig.textPrimary}`
                        }`}
                      >
                        Web Link
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveCoverTab("upload")}
                        className={`px-2 py-1 rounded-lg font-medium transition-all ${
                          activeCoverTab === "upload"
                            ? `${designConfig.accentBg} text-white shadow-sm font-semibold`
                            : `${designConfig.textMuted} hover:${designConfig.textPrimary}`
                        }`}
                      >
                        Upload
                      </button>
                    </div>

                    {/* Presets Grid */}
                    {activeCoverTab === "preset" && (
                      <div className="grid grid-cols-4 gap-1.5 pt-0.5 max-h-28 overflow-y-auto custom-scrollbar p-1">
                        {YOUTUBE_ARTWORK_PRESETS.map((preset) => (
                          <div
                            key={preset.name}
                            onClick={() => setCoverUrl(preset.url)}
                            className={`relative rounded-xl overflow-hidden cursor-pointer border transition-all aspect-video ${
                              coverUrl === preset.url
                                ? `ring-2 ${designConfig.accentBorder} scale-95`
                                : "border-transparent opacity-80 hover:opacity-100 hover:scale-105"
                            }`}
                            title={preset.name}
                          >
                            <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                            {coverUrl === preset.url && (
                              <div className="absolute inset-0 bg-[#c89b3c]/40 flex items-center justify-center">
                                <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* YouTube Video Art */}
                    {activeCoverTab === "youtube" && (
                      <div className="space-y-1.5 pt-0.5">
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={ytVideoInput}
                            onChange={(e) => setYtVideoInput(e.target.value)}
                            placeholder="Paste YouTube Video URL or ID"
                            className={`flex-1 px-3 py-1.5 ${designConfig.inputBg} border ${designConfig.borderSubtle} rounded-xl text-xs text-left focus:outline-none`}
                          />
                          <button
                            type="button"
                            onClick={handleApplyYouTubeThumbnail}
                            className={`px-3 py-1.5 ${designConfig.btnPrimary} rounded-xl text-xs font-semibold shrink-0 cursor-pointer`}
                          >
                            Get Art
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Custom URL */}
                    {activeCoverTab === "url" && (
                      <div className="space-y-1.5 pt-0.5">
                        <input
                          type="url"
                          value={customUrlInput}
                          onChange={(e) => {
                            setCustomUrlInput(e.target.value);
                            if (e.target.value.startsWith("http")) {
                              setCoverUrl(e.target.value);
                            }
                          }}
                          placeholder="Paste image URL (https://...)"
                          className={`w-full px-3 py-1.5 ${designConfig.inputBg} border ${designConfig.borderSubtle} rounded-xl text-xs focus:outline-none`}
                        />
                      </div>
                    )}

                    {/* Upload File */}
                    {activeCoverTab === "upload" && (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-xl p-2.5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                          isDragging
                            ? `${designConfig.accentBorder} ${designConfig.accentText}`
                            : `${designConfig.borderSubtle} ${designConfig.isLight ? "bg-[#f5f2eb]" : "bg-slate-950/40"} ${designConfig.textMuted}`
                        }`}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleImageUpload(e.target.files[0]);
                          }}
                          className="hidden"
                          id="add-to-playlist-cover-file-input"
                        />
                        <label htmlFor="add-to-playlist-cover-file-input" className="cursor-pointer flex items-center gap-2">
                          <Upload className={`w-4 h-4 ${designConfig.accentText}`} />
                          <span className={`text-xs font-semibold ${designConfig.textPrimary}`}>
                            Choose image file
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-black/10 dark:border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("select")}
                className={`px-4 py-2.5 rounded-xl ${designConfig.textMuted} hover:${designConfig.textPrimary} hover:bg-black/10 dark:hover:bg-white/10 text-xs font-semibold transition-colors cursor-pointer`}
              >
                Back
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-4 py-2.5 rounded-xl ${designConfig.textPrimary} hover:bg-black/10 dark:hover:bg-white/10 border ${designConfig.borderSubtle} text-xs font-semibold transition-colors cursor-pointer`}
                >
                  Cancel
                </button>

                <button
                  id="save-new-playlist-sync-btn"
                  type="submit"
                  disabled={!newTitle.trim() || isCreating}
                  className={`px-5 py-2.5 rounded-xl ${designConfig.btnPrimary} text-xs font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50`}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Syncing with YouTube...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Save &amp; Sync to YouTube Music</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
