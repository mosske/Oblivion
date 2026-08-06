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
  Palette
} from "lucide-react";
import { User, Playlist, ThemePreset } from "../types";
import { ThemeRegistry } from "../utils/themeMap";

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
  onOpenDesignModal?: () => void;
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
  activeTheme = "oblivion-dark",
  onOpenDesignModal,
}) => {
  const activeThemeMeta = ThemeRegistry.getTheme(activeTheme as ThemePreset);

  return (
    <aside className="w-64 bg-slate-950/80 backdrop-blur-xl border-r border-slate-800/60 flex flex-col h-full text-slate-200 select-none z-20 shrink-0 hidden md:flex">
      {/* Brand Logo */}
      <div className="p-6 pb-4 flex items-center justify-between">
        <div
          onClick={() => setActiveTab("home")}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-300">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Disc3 className="w-6 h-6 text-cyan-400 animate-spin-slow" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider text-white font-mono flex items-center gap-1.5">
              OBLIVION
              <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                YT Music
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Seamless Audio Engine</p>
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
              ? "bg-slate-800/90 text-white shadow-md border border-slate-700/60"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
          }`}
        >
          <Home className={`w-5 h-5 ${activeTab === "home" ? activeThemeMeta.accentClass : ""}`} />
          <span>Home</span>
        </button>

        <button
          id="nav-search-btn"
          onClick={() => setActiveTab("search")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
            activeTab === "search"
              ? "bg-slate-800/90 text-white shadow-md border border-slate-700/60"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
          }`}
        >
          <Search className={`w-5 h-5 ${activeTab === "search" ? activeThemeMeta.accentClass : ""}`} />
          <span>Search</span>
        </button>

        <button
          id="nav-library-btn"
          onClick={() => setActiveTab("library")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
            activeTab === "library"
              ? "bg-slate-800/90 text-white shadow-md border border-slate-700/60"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
          }`}
        >
          <Library className={`w-5 h-5 ${activeTab === "library" ? activeThemeMeta.accentClass : ""}`} />
          <span>Library</span>
        </button>

        <button
          id="nav-settings-btn"
          onClick={() => setActiveTab("settings")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
            activeTab === "settings"
              ? "bg-slate-800/90 text-white shadow-md border border-slate-700/60"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
          }`}
        >
          <Settings className={`w-5 h-5 ${activeTab === "settings" ? activeThemeMeta.accentClass : ""}`} />
          <span>Settings</span>
        </button>

        {/* Quick Design Switcher Button */}
        {onOpenDesignModal && (
          <button
            id="nav-designs-btn"
            onClick={onOpenDesignModal}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 transition-all duration-200 group mt-2"
          >
            <span className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-cyan-400 group-hover:rotate-12 transition-transform" />
              <span>App Designs</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-400/20 text-cyan-300">
              {activeThemeMeta.name.split(" ")[0]}
            </span>
          </button>
        )}
      </nav>

      {/* User / Google Sync Section */}
      <div className="px-4 py-3 my-2 mx-3 bg-slate-900/70 border border-slate-800/80 rounded-2xl">
        {user?.isLoggedIn ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <img
                src={user.picture}
                alt={user.name}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-cyan-500/40"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  YouTube Synced
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
              <button
                onClick={onSyncYouTube}
                disabled={isSyncingYouTube}
                className="flex-1 text-xs py-1.5 px-2 bg-slate-800 hover:bg-slate-700/80 text-slate-300 rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                title="Sync Playlists with YouTube"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingYouTube ? "animate-spin text-cyan-400" : ""}`} />
                <span>{isSyncingYouTube ? "Syncing..." : "Sync YT"}</span>
              </button>

              <button
                onClick={onLogout}
                className="p-1.5 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-1">
            <p className="text-xs text-slate-300 font-medium mb-1.5">Sign in with Google</p>
            <p className="text-[11px] text-slate-400 mb-2.5 leading-tight">
              Automatically sync your existing YouTube Music playlists in real-time.
            </p>
            <button
              id="sidebar-login-google-btn"
              onClick={onOpenAuthModal}
              className="w-full py-2 px-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Connect Account</span>
            </button>
          </div>
        )}
      </div>

      {/* Playlists Quick List Header */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
        <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <ListMusic className="w-3.5 h-3.5" />
            Playlists
          </span>
          <button
            onClick={onCreatePlaylist}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 rounded-md transition-colors"
            title="Create Playlist"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {playlists.map((pl) => (
          <button
            key={pl.id}
            onClick={() => {
              setActiveTab("library");
              onSelectPlaylist(pl);
            }}
            className="w-full group flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-900/80 transition-all text-left"
          >
            <img
              src={pl.coverUrl}
              alt={pl.title}
              className="w-7 h-7 rounded-md object-cover border border-slate-800 group-hover:border-slate-700"
            />
            <div className="flex-1 min-w-0">
              <p className="truncate text-slate-300 group-hover:text-white">{pl.title}</p>
              <p className="text-[10px] text-slate-500 flex items-center gap-1">
                {pl.isYouTubeSynced && <Sparkles className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
                <span>{pl.tracksCount || 0} tracks</span>
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Offline Caching Quick Info */}
      <div className="p-3 border-t border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <DownloadCloud className="w-3.5 h-3.5 text-cyan-400" />
          Offline Cache
        </span>
        <span className="font-mono text-emerald-400">Ready</span>
      </div>
    </aside>
  );
};
