import React, { useState, useMemo } from "react";
import { Playlist } from "../types";
import {
  Eye,
  EyeOff,
  Search,
  Check,
  X,
  Sparkles,
  SlidersHorizontal,
  CheckCircle2,
  ListMusic
} from "lucide-react";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";
import { PlaylistCoverArt } from "./PlaylistCoverArt";

interface ManageVisibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlists: Playlist[];
  initialHiddenIds: string[];
  onSave: (hiddenIds: string[]) => void;
  designConfig?: FullAppDesignConfig;
}

export const ManageVisibilityModal: React.FC<ManageVisibilityModalProps> = ({
  isOpen,
  onClose,
  playlists,
  initialHiddenIds,
  onSave,
  designConfig = FULL_APP_DESIGNS["designer"],
}) => {
  const [selectedHiddenIds, setSelectedHiddenIds] = useState<string[]>(initialHiddenIds || []);
  const [searchQuery, setSearchQuery] = useState("");

  // Sync state when opened
  React.useEffect(() => {
    if (isOpen) {
      setSelectedHiddenIds(initialHiddenIds || []);
      setSearchQuery("");
    }
  }, [isOpen, initialHiddenIds]);

  const cleanPlaylists = useMemo(() => {
    const seen = new Set<string>();
    return (playlists || []).filter((pl) => {
      if (!pl) return false;
      const id = pl.id || pl.playlistId;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [playlists]);

  const filteredPlaylists = useMemo(() => {
    if (!searchQuery.trim()) return cleanPlaylists;
    const q = searchQuery.toLowerCase();
    return cleanPlaylists.filter(
      (pl) =>
        (pl.title && pl.title.toLowerCase().includes(q)) ||
        (pl.description && pl.description.toLowerCase().includes(q))
    );
  }, [cleanPlaylists, searchQuery]);

  if (!isOpen) return null;

  const togglePlaylist = (id: string) => {
    setSelectedHiddenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleHideAll = () => {
    const allIds = cleanPlaylists.map((pl) => pl.id);
    setSelectedHiddenIds(allIds);
  };

  const handleUnhideAll = () => {
    setSelectedHiddenIds([]);
  };

  const handleDone = () => {
    onSave(selectedHiddenIds);
    onClose();
  };

  const totalHidden = selectedHiddenIds.filter((id) =>
    cleanPlaylists.some((pl) => pl.id === id)
  ).length;
  const totalVisible = cleanPlaylists.length - totalHidden;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className={`w-full max-w-xl ${designConfig.modalBg} border ${designConfig.accentBorder} rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#c89b3c]/20 text-[#c89b3c] border border-[#c89b3c]/30 flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${designConfig.textPrimary} tracking-tight`}>
                Hide / Unhide Playlists
              </h2>
              <p className={`text-xs ${designConfig.textMuted}`}>
                Choose which playlists appear in your Library.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl ${designConfig.btnSecondary} ${designConfig.textMuted} hover:${designConfig.textPrimary} transition-colors`}
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Visibility Stats & Quick Actions */}
        <div className="py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
              {totalVisible} Visible
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold">
              {totalHidden} Hidden
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={handleUnhideAll}
              className={`px-3 py-1 rounded-xl ${designConfig.btnSecondary} ${designConfig.textPrimary} hover:scale-105 active:scale-95 transition-all text-xs font-medium`}
            >
              Unhide All
            </button>
            <button
              onClick={handleHideAll}
              className={`px-3 py-1 rounded-xl ${designConfig.btnSecondary} text-amber-400 hover:scale-105 active:scale-95 transition-all text-xs font-medium`}
            >
              Hide All
            </button>
          </div>
        </div>

        {/* Search filter input */}
        <div className="relative mb-3 shrink-0">
          <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${designConfig.textMuted}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search playlists to toggle..."
            className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs ${designConfig.inputBg} ${designConfig.textPrimary} border ${designConfig.borderSubtle} focus:outline-none focus:border-[#c89b3c] transition-colors`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Playlists List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[220px]">
          {filteredPlaylists.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No playlists matched your search.
            </div>
          ) : (
            filteredPlaylists.map((pl) => {
              const isHidden = selectedHiddenIds.includes(pl.id);
              const count = pl.tracks?.length || pl.tracksCount || 0;

              return (
                <div
                  key={pl.id}
                  onClick={() => togglePlaylist(pl.id)}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border ${
                    isHidden
                      ? "bg-black/40 border-white/5 opacity-70 hover:opacity-100"
                      : `${designConfig.cardBg} border-white/10 hover:${designConfig.accentBorder}`
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/10">
                      <PlaylistCoverArt playlist={pl} className="w-full h-full object-cover" />
                      {isHidden && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
                          <EyeOff className="w-4 h-4 text-amber-400" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className={`text-xs font-bold ${designConfig.textPrimary} truncate`}>
                          {pl.title}
                        </p>
                        {(pl.isCustomCover || pl.customCoverUrl) && (
                          <Sparkles className="w-3 h-3 text-[#c89b3c] shrink-0" />
                        )}
                      </div>
                      <p className={`text-[11px] ${designConfig.textMuted} truncate mt-0.5`}>
                        {count} tracks {pl.isYouTubeSynced ? "• YouTube Synced" : ""}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlaylist(pl.id);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      isHidden
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                    }`}
                  >
                    {isHidden ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hidden</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Visible</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Done Button */}
        <div className="pt-4 mt-3 border-t border-white/10 flex items-center justify-between shrink-0">
          <p className={`text-[11px] ${designConfig.textMuted}`}>
            Saved automatically across sessions.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-xl ${designConfig.btnSecondary} ${designConfig.textPrimary} text-xs font-semibold hover:scale-105 active:scale-95 transition-all`}
            >
              Cancel
            </button>
            <button
              id="manage-visibility-done-btn"
              onClick={handleDone}
              className="px-6 py-2 rounded-xl bg-[#c89b3c] hover:bg-[#b58b34] text-slate-950 text-xs font-bold shadow-lg flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Done</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
