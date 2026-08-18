import React from "react";
import { Home, Compass, Library, Settings } from "lucide-react";
import { NavTab } from "../types";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";

interface BottomNavProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  designConfig?: FullAppDesignConfig;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  designConfig = FULL_APP_DESIGNS["designer"],
}) => {
  return (
    <div className={`md:hidden fixed bottom-0 left-0 right-0 h-16 ${designConfig.bottomNavBg} ${designConfig.borderSubtle} border-t flex items-center justify-around z-30 px-2 shadow-2xl backdrop-blur-xl`}>
      <button
        id="bottom-nav-home-btn"
        onClick={() => setActiveTab("home")}
        className={`flex flex-col items-center justify-center gap-1 w-16 py-1 transition-colors ${
          activeTab === "home"
            ? `${designConfig.accentText} font-bold`
            : `${designConfig.textSecondary} hover:${designConfig.textPrimary}`
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-[11px]">Home</span>
      </button>

      <button
        id="bottom-nav-explore-btn"
        onClick={() => setActiveTab("explore")}
        className={`flex flex-col items-center justify-center gap-1 w-16 py-1 transition-colors ${
          activeTab === "explore"
            ? `${designConfig.accentText} font-bold`
            : `${designConfig.textSecondary} hover:${designConfig.textPrimary}`
        }`}
      >
        <Compass className="w-5 h-5" />
        <span className="text-[11px]">Explore</span>
      </button>

      <button
        id="bottom-nav-library-btn"
        onClick={() => setActiveTab("library")}
        className={`flex flex-col items-center justify-center gap-1 w-16 py-1 transition-colors ${
          activeTab === "library"
            ? `${designConfig.accentText} font-bold`
            : `${designConfig.textSecondary} hover:${designConfig.textPrimary}`
        }`}
      >
        <Library className="w-5 h-5" />
        <span className="text-[11px]">Library</span>
      </button>

      <button
        id="bottom-nav-settings-btn"
        onClick={() => setActiveTab("settings")}
        className={`flex flex-col items-center justify-center gap-1 w-16 py-1 transition-colors ${
          activeTab === "settings"
            ? `${designConfig.accentText} font-bold`
            : `${designConfig.textSecondary} hover:${designConfig.textPrimary}`
        }`}
      >
        <Settings className="w-5 h-5" />
        <span className="text-[11px]">Settings</span>
      </button>
    </div>
  );
};
