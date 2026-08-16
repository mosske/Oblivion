import React from "react";
import {
  Home,
  Search,
  Library,
  Settings,
  Disc3,
  ListMusic,
  DownloadCloud,
  LogOut,
  User as UserIcon,
  RefreshCw,
  Plus,
  Sparkles,
} from "lucide-react";
import { User, Playlist, ThemePreset } from "../types";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";

interface SidebarProps {
  activeTab: "home" | "search" | "library" | "settings";
  setActiveTab: (tab: "home" | "search" | "library" | "settings") => void;
  user: User | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  playlists: Playlist[];
  onSelectPlaylist: (playlist: Playlist) => void;
  onCreatePlaylist: () => void;
  isSyncingYouTube: boolean;
  onSyncYouTube: () => void;
  activeTheme?: ThemePreset;
  designConfig?: FullAppDesignConfig;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  user,
  onOpenAuthModal,
  onLogout,
  playlists,
  onSelectPlaylist,
  onCreatePlaylist,
  isSyncingYouTube,
  onSyncYouTube,
  designConfig = FULL_APP_DESIGNS["designer"],
}) => {
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

  return (
    <aside className={`w-64 ${designConfig.sidebarBg} ${designConfig.borderSubtle} border-r flex flex-col h-full ${designConfig.textPrimary} select-none z-20 shrink-0 hidden md:flex transition-colors duration-300 shadow-lg`}>
      {/* Brand Logo */}
      <div className="p-6 pb-4 flex items-center justify-between">
        <div
          onClick={() => setActiveTab("home")}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl ${designConfig.accentBg} p-0.5 shadow-md ${designConfig.glowRing} group-hover:scale-105 transition-transform duration-300`}>
            <div className={`w-full h-full ${designConfig.isLight ? "bg-[#fbfaf7]" : "bg-slate-950"} rounded-[10px] flex items-center justify-center`}>
              <Disc3 className={`w-6 h-6 ${designConfig.accentText} animate-spin-slow`} />
            </div>
          </div>
          <div>
            <h1 className={`text-xl font-bold tracking-wider ${designConfig.textPrimary} font-mono flex items-center gap-1.5`}>
              OBLIVION
              <span className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded ${designConfig.isLight ? "bg-[#ede8dc] text-[#c89b3c] border border-[#d8d2c4]" : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"}`}>
                YT Music
              </span>
            </h1>
            <p className={`text-[11px] ${designConfig.textSecondary}`}>Seamless Audio Engine</p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="px-3 py-2 space-y-1">
        <button
          id="nav-home-btn"
          onClick={() => setActiveTab("home")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
            activeTab === "home"
              ? designConfig.navActive
              : designConfig.navInactive
          }`}
        >
          <Home className={`w-5 h-5 ${activeTab === "home" ? designConfig.accentText : ""}`} />
          <span>Home</span>
        </button>

        <button
          id="nav-search-btn"
          onClick={() => setActiveTab("search")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
            activeTab === "search"
              ? designConfig.navActive
              : designConfig.navInactive
          }`}
        >
          <Search className={`w-5 h-5 ${activeTab === "search" ? designConfig.accentText : ""}`} />
          <span>Search</span>
        </button>

        <button
          id="nav-library-btn"
          onClick={() => setActiveTab("library")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
            activeTab === "library"
              ? designConfig.navActive
              : designConfig.navInactive
          }`}
        >
          <Library className={`w-5 h-5 ${activeTab === "library" ? designConfig.accentText : ""}`} />
          <span>Library</span>
        </button>

        <button
          id="nav-settings-btn"
          onClick={() => setActiveTab("settings")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
            activeTab === "settings"
              ? designConfig.navActive
              : designConfig.navInactive
          }`}
        >
          <Settings className={`w-5 h-5 ${activeTab === "settings" ? designConfig.accentText : ""}`} />
          <span>Settings</span>
        </button>
      </nav>

      {/* User / Google Sync Section */}
      <div className={`px-4 py-3 my-2 mx-3 ${designConfig.cardBg} ${designConfig.borderSubtle} border rounded-2xl`}>
        {user?.isLoggedIn ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <img
                src={user.picture}
                alt={user.name}
                className={`w-9 h-9 rounded-full object-cover ring-2 ${designConfig.accentBorder}`}
              />
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold ${designConfig.textPrimary} truncate`}>{user.name}</p>
                <p className="text-[10px] text-emerald-500 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  YouTube Synced
                </p>
              </div>
            </div>

            <div className={`flex items-center gap-2 pt-1 border-t ${designConfig.borderSubtle}`}>
              <button
                onClick={onSyncYouTube}
                disabled={isSyncingYouTube}
                className={`flex-1 text-xs py-1.5 px-2 ${designConfig.btnSecondary} rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50`}
                title="Sync Playlists with YouTube"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingYouTube ? `animate-spin ${designConfig.accentText}` : ""}`} />
                <span>{isSyncingYouTube ? "Syncing..." : "Sync YT"}</span>
              </button>

              <button
                onClick={onLogout}
                className={`p-1.5 ${designConfig.btnSecondary} hover:bg-red-500/20 text-slate-400 hover:text-red-500 rounded-lg transition-colors`}
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-1">
            <p className={`text-xs ${designConfig.textPrimary} font-bold mb-1.5`}>Sign in with Google</p>
            <p className={`text-[11px] ${designConfig.textSecondary} mb-2.5 leading-tight`}>
              Automatically sync your existing YouTube Music playlists in real-time.
            </p>
            <button
              id="sidebar-login-google-btn"
              onClick={onOpenAuthModal}
              className={`w-full py-2 px-3 ${designConfig.btnPrimary} rounded-xl text-xs shadow-md flex items-center justify-center gap-2 transition-all active:scale-95`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Connect Account</span>
            </button>
          </div>
        )}
      </div>

      {/* Playlists Quick List Header */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
        <div className={`flex items-center justify-between px-3 py-2 text-xs font-semibold ${designConfig.textSecondary} uppercase tracking-wider`}>
          <span className="flex items-center gap-1.5">
            <ListMusic className="w-3.5 h-3.5" />
            Playlists
          </span>
          <button
            onClick={onCreatePlaylist}
            className={`p-1 ${designConfig.btnSecondary} rounded-md transition-colors`}
            title="Create Playlist"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {cleanPlaylists.map((pl) => (
          <button
            key={pl.id}
            onClick={() => {
              setActiveTab("library");
              onSelectPlaylist(pl);
            }}
            className={`w-full group flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium ${designConfig.textSecondary} hover:${designConfig.textPrimary} ${designConfig.isLight ? "hover:bg-[#f4f1ea]" : "hover:bg-slate-900/80"} transition-all text-left`}
          >
            <img
              src={pl.coverUrl}
              alt={pl.title}
              className={`w-7 h-7 rounded-md object-cover border ${designConfig.borderSubtle}`}
            />
            <div className="flex-1 min-w-0">
              <p className={`truncate font-medium group-hover:${designConfig.accentText}`}>{pl.title}</p>
              <p className={`text-[10px] ${designConfig.textMuted} flex items-center gap-1`}>
                {pl.isYouTubeSynced && <Sparkles className="w-2.5 h-2.5 text-amber-500 shrink-0" />}
                <span>{pl.tracksCount || 0} tracks</span>
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Offline Caching Quick Info */}
      <div className={`p-3 border-t ${designConfig.borderSubtle} text-[11px] ${designConfig.textSecondary} flex items-center justify-between`}>
        <span className="flex items-center gap-1.5">
          <DownloadCloud className={`w-3.5 h-3.5 ${designConfig.accentText}`} />
          Offline Cache
        </span>
        <span className="font-mono text-emerald-500 font-semibold">Ready</span>
      </div>
    </aside>
  );
};
