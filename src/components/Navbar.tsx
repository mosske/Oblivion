import React, { useState } from "react";
import { Search, LogIn, LogOut, X, Check } from "lucide-react";
import { User, NavTab } from "../types";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";
import { OblivionLogo } from "./OblivionLogo";

export interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  user: User | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  designConfig: FullAppDesignConfig;
  onLogoClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  user,
  onOpenAuthModal,
  onLogout,
  designConfig = FULL_APP_DESIGNS["designer"],
  onLogoClick,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <header
      className={`top-navbar sticky top-0 z-40 h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-xs backdrop-blur-2xl transition-all ${
        designConfig.headerBg || "bg-[#141216]/80 border-b border-white/10"
      }`}
    >
      {/* Brand / Logo */}
      <div
        className="flex items-center gap-2.5 cursor-pointer group"
        onClick={() => {
          if (onLogoClick) onLogoClick();
          else setActiveTab("home");
        }}
      >
        <OblivionLogo size={34} designId={designConfig.id} withAura animated />
        <div className="flex items-baseline gap-1">
          <span className={`text-sm font-extrabold tracking-widest ${designConfig.textPrimary}`}>
            OBLIVION
          </span>
          <span className={`text-[9px] font-bold tracking-[0.18em] ${designConfig.accentText} hidden sm:inline`}>
            MUSIC
          </span>
        </div>
        {(designConfig.id === "dynamic-emerald" || designConfig.isEmeraldWilderness) && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#00f5a0]/20 via-[#00d9f5]/15 to-transparent border border-[#00f5a0]/35 shadow-[0_0_12px_rgba(0,245,160,0.25)] text-[#00f5a0] text-[10px] font-mono tracking-wider ml-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ffe040] shadow-[0_0_8px_#ffe040] animate-ping" />
            <span className="font-bold">EMERALD WILDERNESS</span>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Top Search Button (Magnifying Glass Icon) */}
        <button
          id="top-header-search-btn"
          onClick={() => {
            setActiveTab("search");
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
            activeTab === "search"
              ? `${designConfig.btnPrimary} text-white shadow-md`
              : `${designConfig.btnSecondary} ${designConfig.textPrimary} hover:scale-105 active:scale-95 border border-zinc-300/80`
          }`}
          title="Search music, albums, artists"
        >
          <Search className="w-4 h-4" />
          <span className="text-xs font-semibold hidden sm:inline">Search</span>
        </button>

        {/* User Auth Section */}
        {!user?.isLoggedIn ? (
          <button
            id="top-header-signin-btn"
            onClick={onOpenAuthModal}
            className={`px-4 py-2 rounded-xl ${designConfig.btnPrimary} text-white text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        ) : (
          <div className="relative">
            <button
              id="top-header-user-avatar-btn"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              className="w-9 h-9 rounded-full overflow-hidden shadow-md hover:scale-105 active:scale-95 transition-transform flex items-center justify-center bg-zinc-800 focus:outline-none user-avatar-ring"
              title={user.name || user.email || "Account Profile"}
            >
              {user.picture ? (
                <img src={user.picture} alt={user.name || "User"} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-white">
                  {(user.name || user.email || "U")[0].toUpperCase()}
                </span>
              )}
            </button>

            {/* Account Pop-Up Window */}
            {isUserMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsUserMenuOpen(false)}
                />
                <div className="absolute right-0 top-12 z-50 w-72 bg-white border border-zinc-200 rounded-3xl shadow-2xl p-5 space-y-4 animate-fade-in text-left select-none ring-1 ring-black/5">
                  {/* Header with Close X */}
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
                      Account Profile
                    </span>
                    <button
                      onClick={() => setIsUserMenuOpen(false)}
                      className="p-1 rounded-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                      title="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* User Info */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 shadow-sm bg-zinc-800 flex items-center justify-center user-avatar-ring">
                      {user.picture ? (
                        <img src={user.picture} alt={user.name || "User"} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-white">
                          {(user.name || user.email || "U")[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-zinc-900 truncate">{user.name || "Google User"}</h4>
                      <p className="text-xs text-zinc-600 truncate font-medium">{user.email}</p>
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold border border-emerald-300">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                        YouTube Synced
                      </span>
                    </div>
                  </div>

                  {/* Sign Out Button */}
                  <button
                    id="user-menu-signout-btn"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full py-2.5 px-4 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-700 font-bold text-xs rounded-2xl border border-red-200 flex items-center justify-center gap-2 transition-all shadow-sm hover:scale-[1.02]"
                  >
                    <LogOut className="w-4 h-4 text-red-600" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
