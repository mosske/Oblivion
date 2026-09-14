import React, { useEffect, useState, useMemo } from "react";
import { Playlist, Track, User } from "../types";
import {
  Library,
  Sparkles,
  Plus,
  Play,
  Trash2,
  Edit,
  ArrowUpDown,
  Music,
  EyeOff,
  Eye,
  SlidersHorizontal,
  RefreshCw,
  LogIn,
  CheckCircle2
} from "lucide-react";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";
import { PlaylistCoverArt } from "./PlaylistCoverArt";
import { PlaylistCard } from "./PlaylistCard";
import { ManageVisibilityModal } from "./ManageVisibilityModal";
import { getCachedPlaylists } from "../services/playlistService";

interface LibraryViewProps {
  playlists: Playlist[];
  onSelectPlaylist: (playlist: Playlist) => void;
  onCreatePlaylist: () => void;
  onEditPlaylist: (playlist: Playlist) => void;
  onDeletePlaylist: (playlistId: string) => void;
  onPlayTrack: (track: Track) => void;
  onPlayQueue: (tracks: Track[], startIndex: number) => void;
  currentTrackId?: string;
  likedTrackIds: string[];
  currentTrack?: Track | null;
  designConfig?: FullAppDesignConfig;
  user?: User | null;
  onOpenAuthModal?: () => void;
  selectedPlaylist?: any;
  onReorderPlaylistTracks?: any;
  onRemoveTrackFromPlaylist?: any;
  onAddTrackToPlaylist?: any;
  onSyncPlaylistTracks?: any;
}

type SortOption = "recent" | "name-asc" | "name-desc" | "tracks-desc" | "tracks-asc";

export const LibraryView: React.FC<LibraryViewProps> = ({
  playlists,
  onSelectPlaylist,
  onCreatePlaylist,
  onEditPlaylist,
  onDeletePlaylist,
  onPlayTrack,
  onPlayQueue,
  currentTrackId,
  likedTrackIds,
  currentTrack,
  designConfig = FULL_APP_DESIGNS["designer"],
  user,
  onOpenAuthModal,
}) => {
  const [showHidden, setShowHidden] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);

  // Persistent Sort and Hidden Playlist state from LocalStorage
  const [sortOption, setSortOption] = useState<SortOption>(() => {
    return (localStorage.getItem("oblivion_playlist_sort") as SortOption) || "recent";
  });

  const [hiddenPlaylistIds, setHiddenPlaylistIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("oblivion_hidden_playlists");
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // Save sort option whenever it changes
  const handleSortChange = (newSort: SortOption) => {
    setSortOption(newSort);
    localStorage.setItem("oblivion_playlist_sort", newSort);
  };

  // Save hidden playlist IDs and persist to storage
  const handleSaveHiddenPlaylists = (newHiddenIds: string[]) => {
    const safeIds = Array.isArray(newHiddenIds) ? newHiddenIds : [];
    setHiddenPlaylistIds(safeIds);
    try {
      localStorage.setItem("oblivion_hidden_playlists", JSON.stringify(safeIds));
    } catch {}
    setToastText("Playlist visibility preferences saved");
    setTimeout(() => setToastText(null), 3000);
  };

  // Toggle hiding a single playlist directly
  const toggleHidePlaylist = (e: React.MouseEvent, playlistId: string) => {
    e.stopPropagation();
    setHiddenPlaylistIds((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const isHidden = safePrev.includes(playlistId);
      const updated = isHidden ? safePrev.filter((id) => id !== playlistId) : [...safePrev, playlistId];
      try {
        localStorage.setItem("oblivion_hidden_playlists", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Effective playlists with instant OBLIVION_PLAYLIST_CACHE fallback
  const effectivePlaylists = useMemo(() => {
    if (Array.isArray(playlists) && playlists.length > 0) return playlists;
    return getCachedPlaylists();
  }, [playlists]);

  // Filter and deduplicate playlists
  const cleanPlaylists = useMemo(() => {
    const seen = new Set<string>();
    return (effectivePlaylists || []).filter((pl) => {
      if (!pl) return false;
      const id = pl.id || pl.playlistId;
      if (!id || seen.has(id)) return false;
      const cleanId = String(id).replace(/^VL/, "");
      if (cleanId === "LL" || cleanId === "LM" || cleanId === "WL" || cleanId === "HL") return false;
      if (cleanId.length === 11 && !cleanId.startsWith("PL")) return false; // single video ID
      if (cleanId.startsWith("FE")) return false;
      if (cleanId.startsWith("UC") && cleanId.length === 24) return false;
      if (pl.title && (pl.title.toLowerCase() === "liked music & videos" || pl.title.toLowerCase() === "liked videos" || pl.title.toLowerCase() === "liked music" || pl.title.toLowerCase() === "watch later" || pl.title.toLowerCase() === "history" || pl.title.toLowerCase() === "watch history")) return false;
      seen.add(id);
      return true;
    });
  }, [effectivePlaylists]);

  // Sort and apply Hidden filter
  const displayedPlaylists = useMemo(() => {
    let list = cleanPlaylists.filter((pl) => {
      const isHidden = hiddenPlaylistIds.includes(pl.id);
      return showHidden ? isHidden : !isHidden;
    });

    return list.sort((a, b) => {
      if (sortOption === "name-asc") {
        return (a.title || "").localeCompare(b.title || "");
      }
      if (sortOption === "name-desc") {
        return (b.title || "").localeCompare(a.title || "");
      }
      if (sortOption === "tracks-desc") {
        const countA = a.tracks?.length || a.tracksCount || 0;
        const countB = b.tracks?.length || b.tracksCount || 0;
        return countB - countA;
      }
      if (sortOption === "tracks-asc") {
        const countA = a.tracks?.length || a.tracksCount || 0;
        const countB = b.tracks?.length || b.tracksCount || 0;
        return countA - countB;
      }
      return 0; // "recent" preserves default order
    });
  }, [cleanPlaylists, hiddenPlaylistIds, showHidden, sortOption]);

  const isUserAuthenticated = Boolean(user && user.isLoggedIn);

  const hiddenCount = hiddenPlaylistIds.filter((id) => cleanPlaylists.some((pl) => pl.id === id)).length;

  // When signed out, never show any playlists; show the Sign-In prompt
  if (!isUserAuthenticated) {
    return (
      <div className="flex flex-col select-none">
        <div className="flex-1 p-6 md:p-10 pb-40 md:pb-48 max-w-4xl mx-auto w-full">
          <div className={`p-8 sm:p-12 text-center ${designConfig.cardBg} rounded-3xl border ${designConfig.borderSubtle} shadow-xl flex flex-col items-center justify-center space-y-6 mt-4`}>
            <div className={`w-16 h-16 rounded-2xl ${designConfig.isLight ? "bg-black/5" : "bg-white/5"} text-[var(--accent-primary,#dfb86c)] border ${designConfig.borderSubtle} flex items-center justify-center shadow-inner`}>
              <Library className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-md">
              <h2 className={`text-2xl sm:text-3xl font-black ${designConfig.textPrimary} tracking-tight`}>
                Sign In to View Your Library
              </h2>
              <p className={`text-xs sm:text-sm ${designConfig.textSecondary} font-medium leading-relaxed`}>
                Connect your Google Account to access and synchronize your personal YouTube Music playlists, custom cover artwork, and saved collections.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg text-left pt-2">
              <div className={`p-3.5 rounded-2xl ${designConfig.isLight ? "bg-black/5" : "bg-white/5"} border ${designConfig.borderSubtle} space-y-1`}>
                <div className={`flex items-center gap-2 text-xs font-bold ${designConfig.accentText}`}>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className={`${designConfig.textPrimary} font-bold`}>Personal Playlists</span>
                </div>
                <p className={`text-[11px] ${designConfig.textMuted} font-medium leading-normal`}>
                  Stream, organize, and sync your YouTube collections in real-time.
                </p>
              </div>

              <div className={`p-3.5 rounded-2xl ${designConfig.isLight ? "bg-black/5" : "bg-white/5"} border ${designConfig.borderSubtle} space-y-1`}>
                <div className={`flex items-center gap-2 text-xs font-bold ${designConfig.accentText}`}>
                  <Music className="w-3.5 h-3.5" />
                  <span className={`${designConfig.textPrimary} font-bold`}>Custom Artwork</span>
                </div>
                <p className={`text-[11px] ${designConfig.textMuted} font-medium leading-normal`}>
                  Full support for HD square custom covers with instant sync.
                </p>
              </div>

              <div className={`p-3.5 rounded-2xl ${designConfig.isLight ? "bg-black/5" : "bg-white/5"} border ${designConfig.borderSubtle} space-y-1`}>
                <div className={`flex items-center gap-2 text-xs font-bold ${designConfig.accentText}`}>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className={`${designConfig.textPrimary} font-bold`}>Live Sync</span>
                </div>
                <p className={`text-[11px] ${designConfig.textMuted} font-medium leading-normal`}>
                  Changes you make here immediately sync back to YouTube Music.
                </p>
              </div>
            </div>

            {onOpenAuthModal && (
              <button
                id="library-signin-prompt-btn"
                onClick={onOpenAuthModal}
                className={`px-8 py-3.5 rounded-2xl ${designConfig.btnPrimary} text-white text-sm font-bold shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 mt-2`}
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In with Google</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col select-none">
      <div className="flex-1 space-y-8 p-6 md:p-8 pb-64 sm:pb-72 md:pb-52">
        {/* Playlists Section Header */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className={`text-2xl sm:text-3xl font-extrabold ${designConfig.headingPrimary} flex items-center gap-2.5 tracking-tight drop-shadow-xs`}>
                <Library className={`w-7 h-7 ${designConfig.accentText}`} />
                <span>Library Playlists</span>
              </h2>
              <p className={`text-xs ${designConfig.headingSecondary || "text-slate-300"} mt-1 font-medium`}>
                All your curated YouTube Music collections with live track counts and instant synchronization.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="library-manage-visibility-btn"
                onClick={() => setIsManageModalOpen(true)}
                className={`px-3.5 py-2.5 ${designConfig.btnSecondary} rounded-xl transition-all font-semibold flex items-center gap-2 text-xs shadow-sm hover:scale-[1.02] active:scale-95`}
                title="Manage hidden playlists"
              >
                <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                <span>Hide / Unhide</span>
                {hiddenCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-500/30 text-amber-300 rounded-full text-[10px] font-mono">
                    {hiddenCount}
                  </span>
                )}
              </button>

              <button
                onClick={onCreatePlaylist}
                className={`px-4 py-2.5 ${designConfig.btnPrimary} rounded-xl transition-all font-bold flex items-center gap-2 text-xs shadow-lg active:scale-95`}
              >
                <Plus className="w-4 h-4" />
                <span>New Playlist</span>
              </button>
            </div>
          </div>

          {/* Sort and Hide Filter Toolbar */}
          <div className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl ${designConfig.cardBg} border ${designConfig.borderSubtle}`}>
            {/* Sort Control */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal className={`w-3.5 h-3.5 ${designConfig.textMuted}`} />
              <span className={`text-xs font-semibold ${designConfig.textMuted}`}>Sort:</span>
              <select
                value={sortOption}
                onChange={(e) => handleSortChange(e.target.value as SortOption)}
                className={`sort-dropdown px-3 py-1.5 rounded-xl text-xs font-semibold ${designConfig.inputBg} ${designConfig.textPrimary} border border-transparent focus:outline-none cursor-pointer`}
              >
                <option value="recent">Recently Added (Default)</option>
                <option value="name-asc">Name (A → Z)</option>
                <option value="name-desc">Name (Z → A)</option>
                <option value="tracks-desc">Most Songs</option>
                <option value="tracks-asc">Fewest Songs</option>
              </select>
            </div>

            {/* Hidden Toggle */}
            <div className="flex items-center gap-2">
              {hiddenCount > 0 && (
                <button
                  onClick={() => setShowHidden(!showHidden)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                    showHidden
                      ? "viewing-hidden-active shadow-sm"
                      : `${designConfig.btnSecondary} ${designConfig.textSecondary}`
                  }`}
                  style={
                    showHidden
                      ? {
                          background: "var(--accent-gradient, var(--accent-primary))",
                          color: "var(--text-on-accent, var(--accent-contrast-text, #ffffff))",
                          border: "1px solid var(--accent-border, var(--border-active, transparent))",
                        }
                      : undefined
                  }
                >
                  {showHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{showHidden ? "Viewing Hidden" : `Hidden (${hiddenCount})`}</span>
                </button>
              )}

              <span className={`text-xs font-mono ${designConfig.textMuted}`}>
                {displayedPlaylists.length} {showHidden ? "hidden" : "active"} playlists
              </span>
            </div>
          </div>

          {/* Playlists Grid */}
          {displayedPlaylists.length === 0 ? (
            <div className={`p-12 text-center ${designConfig.cardBg} rounded-3xl border ${designConfig.borderSubtle} flex flex-col items-center justify-center`}>
              <Music className={`w-12 h-12 mx-auto mb-3 ${designConfig.textMuted}`} />
              <p className={`text-sm font-semibold ${designConfig.textPrimary} mb-4`}>
                {showHidden ? "No hidden playlists found." : "No playlists yet. Create a new playlist to get started!"}
              </p>
              {showHidden ? (
                <button
                  onClick={() => setShowHidden(false)}
                  className={`px-4 py-2 text-xs font-semibold ${designConfig.btnPrimary} rounded-xl`}
                >
                  Back to Active Playlists
                </button>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={onCreatePlaylist}
                    className={`px-4 py-2 text-xs font-bold ${designConfig.btnPrimary} rounded-xl shadow-md flex items-center gap-2`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Playlist</span>
                  </button>
                  {!user?.isLoggedIn && onOpenAuthModal && (
                    <button
                      onClick={onOpenAuthModal}
                      className={`px-4 py-2 text-xs font-bold ${designConfig.btnSecondary} ${designConfig.textPrimary} rounded-xl flex items-center gap-2 border ${designConfig.borderSubtle}`}
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign In with Google</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {displayedPlaylists.map((pl) => (
                <PlaylistCard
                  key={pl.id}
                  playlist={pl}
                  onSelect={onSelectPlaylist}
                  onPlay={(playlist) => {
                    if (playlist.tracks && playlist.tracks.length > 0) {
                      onPlayQueue(playlist.tracks, 0);
                    } else {
                      onSelectPlaylist(playlist);
                    }
                  }}
                  onToggleHide={(id, e) => toggleHidePlaylist(e, id)}
                  isHidden={hiddenPlaylistIds.includes(pl.id)}
                  designConfig={designConfig}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hide / Unhide Management Modal */}
      <ManageVisibilityModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        playlists={cleanPlaylists}
        initialHiddenIds={hiddenPlaylistIds}
        onSave={handleSaveHiddenPlaylists}
        designConfig={designConfig}
      />

      {/* Floating Save Toast */}
      {toastText && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-emerald-500/90 text-white text-xs font-bold shadow-2xl backdrop-blur-md flex items-center gap-2 border border-emerald-400/30 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
          <span>{toastText}</span>
        </div>
      )}
    </div>
  );
};
