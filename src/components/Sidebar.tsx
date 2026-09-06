import React from "react";
import {
  Home,
  Compass,
  Search,
  Library,
  Settings,
  Disc3,
  ListMusic,
  DownloadCloud,
  LogOut,
  User as UserIcon,
  Plus,
  Sparkles,
} from "lucide-react";
import { User, Playlist, ThemePreset, NavTab } from "../types";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";
import { PlaylistCoverArt } from "./PlaylistCoverArt";
import { OblivionLogo } from "./OblivionLogo";

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  user: User | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  playlists: Playlist[];
  onSelectPlaylist: (playlist: Playlist) => void;
  onCreatePlaylist: () => void;
  activeTheme?: ThemePreset;
  designConfig?: FullAppDesignConfig;
  onInstallPwa?: () => void;
  isInstalled?: boolean;
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
  designConfig = FULL_APP_DESIGNS["designer"],
  onInstallPwa,
  isInstalled,
}) => {
  const cleanPlaylists = React.useMemo(() => {
    if (!user?.isLoggedIn) return [];

    let hiddenIds: string[] = [];
    try {
      const stored = localStorage.getItem("oblivion_hidden_playlists");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) hiddenIds = parsed;
      }
    } catch {}

    const seen = new Set<string>();
    return (playlists || []).filter((pl) => {
      if (!pl) return false;
      const id = pl.id || pl.playlistId;
      if (!id || seen.has(id) || hiddenIds.includes(id)) return false;
      seen.add(id);
      return true;
    });
  }, [playlists, user?.isLoggedIn]);


  return (
    <aside
      id="app-sidebar-nav"
      className={`w-64 ${designConfig.sidebarBg} ${designConfig.borderSubtle} border-r flex flex-col fixed left-0 top-0 bottom-0 h-screen ${designConfig.textPrimary} select-none z-30 shrink-0 hidden md:flex transition-colors duration-300 shadow-lg overflow-y-auto overflow-x-hidden custom-scrollbar`}
    >
      {/* Brand Logo */}
      <div className="p-6 pb-4 flex items-center justify-between shrink-0">
        <div
          onClick={() => setActiveTab("home")}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <OblivionLogo size={42} designId={designConfig.id} animated withAura />
          <div>
            <h1 className={`text-lg font-extrabold tracking-widest ${designConfig.textPrimary} flex items-center gap-1.5`}>
              OBLIVION
              <span className={`text-[10px] uppercase font-bold tracking-[0.2em] px-1.5 py-0.5 rounded ${designConfig.isLight ? `bg-[#ede8dc] ${designConfig.accentText} text-[var(--accent-color,var(--primary))] border border-[#d8d2c4]` : "bg-white/10 text-white/90 border border-white/20"}`}>
                MUSIC
              </span>
            </h1>
            <p className={`text-[11px] ${designConfig.textSecondary} tracking-tight`}>Seamless Audio Engine</p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="px-3 py-2 space-y-1 shrink-0">
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
          id="nav-explore-btn"
          onClick={() => setActiveTab("explore")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
            activeTab === "explore"
              ? designConfig.navActive
              : designConfig.navInactive
          }`}
        >
          <Compass className={`w-5 h-5 ${activeTab === "explore" ? designConfig.accentText : ""}`} />
          <span>Explore</span>
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
      <div className={`px-4 py-3 my-2 mx-3 ${designConfig.cardBg} ${designConfig.borderSubtle} border rounded-2xl shrink-0`}>
        {user?.isLoggedIn ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <img
                src={user.picture}
                alt={user.name}
                className="w-9 h-9 rounded-full object-cover user-avatar-ring"
              />
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold ${designConfig.textPrimary} truncate`}>{user.name}</p>
                <p className="text-[10px] text-emerald-500 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  YouTube Synced
                </p>
              </div>
            </div>

            <div className={`flex items-center justify-end pt-1 border-t ${designConfig.borderSubtle}`}>
              <button
                onClick={onLogout}
                className={`w-full text-xs py-1.5 px-2.5 ${designConfig.btnSecondary} hover:bg-red-500/20 text-slate-400 hover:text-red-500 rounded-lg transition-colors flex items-center justify-center gap-1.5 font-medium`}
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
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

      {/* Playlists Quick List Section - only when signed in */}
      {user?.isLoggedIn && (
        <div className="px-3 space-y-1 my-1">
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
              <div className="w-7 h-7 rounded-md overflow-hidden shrink-0">
                <PlaylistCoverArt
                  playlist={pl}
                  className={`w-full h-full object-cover border ${designConfig.borderSubtle}`}
                />
              </div>
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
      )}

      {/* Offline Caching Quick Info */}
      <div className={`p-3 border-t ${designConfig.borderSubtle} text-[11px] ${designConfig.textSecondary} flex items-center justify-between shrink-0 mt-auto`}>
        <span className="flex items-center gap-1.5">
          <DownloadCloud className={`w-3.5 h-3.5 ${designConfig.accentText}`} />
          Offline Cache
        </span>
        <span className="font-mono text-emerald-500 font-semibold">Ready</span>
      </div>
    </aside>
  );
};
