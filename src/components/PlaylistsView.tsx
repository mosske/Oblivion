import React, { useState, useMemo } from "react";
import { Playlist, User, UserSettings } from "../types";
import { Plus, Search, Filter, Sparkles, ListMusic, Eye, EyeOff, Shuffle } from "lucide-react";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";
import { PlaylistCard } from "./PlaylistCard";
import {
  getPlaylistArtwork,
  resolvePlaylistCover,
  getCustomArtworkFromStorage,
} from "../services/playlistService";

export { PlaylistCard, getPlaylistArtwork, resolvePlaylistCover, getCustomArtworkFromStorage };

interface PlaylistsViewProps {
  playlists: Playlist[];
  onSelectPlaylist: (playlist: Playlist) => void;
  onPlayPlaylist?: (playlist: Playlist, e?: React.MouseEvent) => void;
  onCreatePlaylist: () => void;
  user: User | null;
  designConfig?: FullAppDesignConfig;
  settings?: UserSettings;
}

export const PlaylistsView: React.FC<PlaylistsViewProps> = ({
  playlists,
  onSelectPlaylist,
  onPlayPlaylist,
  onCreatePlaylist,
  user,
  designConfig = FULL_APP_DESIGNS["designer"],
  settings,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "custom" | "synced" | "hidden">("all");
  const [hiddenIds, setHiddenIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("oblivion_hidden_playlists");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleHidePlaylist = (playlistId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanId = playlistId.replace(/^VL/, "");
    setHiddenIds((prev) => {
      const exists = prev.includes(playlistId) || prev.includes(cleanId);
      const next = exists
        ? prev.filter((id) => id !== playlistId && id !== cleanId)
        : [...prev, playlistId];
      localStorage.setItem("oblivion_hidden_playlists", JSON.stringify(next));
      return next;
    });
  };

  const filteredPlaylists = useMemo(() => {
    let list = playlists || [];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.tracks?.some((t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q))
      );
    }

    // Filter by type
    if (filterType === "custom") {
      list = list.filter((p) => {
        const custom = getCustomArtworkFromStorage(p.id) || p.customArtwork || p.customCoverUrl;
        return Boolean(custom || p.isCustomCover);
      });
    } else if (filterType === "synced") {
      list = list.filter((p) => p.isYouTubeSynced);
    } else if (filterType === "hidden") {
      list = list.filter((p) => hiddenIds.includes(p.id) || hiddenIds.includes(p.id.replace(/^VL/, "")));
    } else {
      // "all" tab hides hidden items
      list = list.filter((p) => !hiddenIds.includes(p.id) && !hiddenIds.includes(p.id.replace(/^VL/, "")));
    }

    return list;
  }, [playlists, searchQuery, filterType, hiddenIds]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 select-none">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-black ${designConfig.textPrimary} tracking-tight flex items-center gap-3`}>
            <ListMusic className={`w-8 h-8 ${designConfig.accentText}`} />
            <span>Playlists</span>
            <span className={`text-xs px-2.5 py-1 rounded-full ${designConfig.pillBg} ${designConfig.accentText} font-mono font-bold`}>
              {playlists.length}
            </span>
          </h1>
          <p className={`text-xs sm:text-sm ${designConfig.textMuted} mt-1`}>
            Manage your personal playlists, customized artwork, and synced YouTube libraries.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="create-playlist-btn"
            onClick={onCreatePlaylist}
            style={{ color: "#0f0d13", opacity: 1, fontWeight: 700 }}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg transition-all transform hover:scale-105 active:scale-95 ${designConfig.btnPrimary}`}
          >
            <Plus className="w-4 h-4" color="#0f0d13" stroke="#0f0d13" style={{ color: "#0f0d13", stroke: "#0f0d13", opacity: 1 }} strokeWidth={2.5} />
            <span style={{ color: "#0f0d13", opacity: 1, fontWeight: 700 }}>Create Playlist</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 my-6">
        {/* Search Input */}
        <div className={`relative flex-1 max-w-md rounded-2xl ${designConfig.pillBg} border ${designConfig.borderSubtle} flex items-center px-3.5 py-2`}>
          <Search className={`w-4 h-4 ${designConfig.textMuted} mr-2.5 shrink-0`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search playlists or songs..."
            className={`w-full bg-transparent text-xs sm:text-sm font-medium ${designConfig.textPrimary} outline-none placeholder:text-neutral-500`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className={`text-xs font-bold ${designConfig.textMuted} hover:${designConfig.textPrimary} px-1.5`}
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
          {(["all", "custom", "synced", "hidden"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterType(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all capitalize whitespace-nowrap cursor-pointer ${
                filterType === tab
                  ? `${designConfig.accentBg} text-white shadow-md`
                  : `${designConfig.pillBg} ${designConfig.textMuted} hover:${designConfig.textPrimary}`
              }`}
            >
              {tab === "all" ? "All Playlists" : tab === "custom" ? "Custom Covers" : tab === "synced" ? "Synced" : "Hidden"}
            </button>
          ))}
        </div>
      </div>

      {/* Playlist Grid */}
      {filteredPlaylists.length === 0 ? (
        <div className={`flex-1 flex flex-col items-center justify-center py-16 text-center ${designConfig.textMuted} space-y-3`}>
          <div className={`p-4 rounded-3xl ${designConfig.pillBg} border ${designConfig.borderSubtle}`}>
            <ListMusic className={`w-10 h-10 ${designConfig.accentText} opacity-70`} />
          </div>
          <p className={`text-base font-bold ${designConfig.textPrimary}`}>No playlists found</p>
          <p className="text-xs max-w-xs opacity-75">
            {searchQuery
              ? `No playlists matching "${searchQuery}"`
              : filterType === "hidden"
              ? "You don't have any hidden playlists"
              : "Create your first playlist or sync with YouTube Music to get started."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredPlaylists.map((pl) => (
            <PlaylistCard
              key={pl.id}
              playlist={pl}
              onSelect={onSelectPlaylist}
              onToggleHide={toggleHidePlaylist}
              isHidden={hiddenIds.includes(pl.id) || hiddenIds.includes(pl.id.replace(/^VL/, ""))}
              designConfig={designConfig}
            />
          ))}
        </div>
      )}
    </div>
  );
};
