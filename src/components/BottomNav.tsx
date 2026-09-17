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
  const tabs: Array<{
    id: string;
    tab: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: "bottom-nav-home-btn", tab: "home", label: "Home", icon: Home },
    { id: "bottom-nav-explore-btn", tab: "explore", label: "Explore", icon: Compass },
    { id: "bottom-nav-library-btn", tab: "library", label: "Library", icon: Library },
    { id: "bottom-nav-settings-btn", tab: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <nav
      id="bottom-navigation-bar"
      role="tablist"
      aria-label="Bottom Navigation"
      className={`bottom-nav-dock md:hidden fixed bottom-0 left-0 right-0 h-16 flex items-center justify-around z-30 px-2 shadow-2xl backdrop-blur-xl ${designConfig.bottomNavBg} ${designConfig.borderSubtle}`}
    >
      {tabs.map(({ id, tab, label, icon: Icon }) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            id={id}
            data-nav={tab}
            role="tab"
            aria-selected={isActive}
            aria-label={label}
            onClick={() => setActiveTab(tab)}
            className={`bottom-nav-item nav-item relative flex flex-col items-center justify-center gap-0.5 w-16 py-1 cursor-pointer transition-all duration-250 select-none bg-transparent ${
              isActive ? "nav-item-active tab-item-active tab-active" : "nav-item-inactive"
            }`}
          >
            <div className="nav-icon-container relative z-10 flex items-center justify-center w-8 h-8 rounded-full transition-all duration-250 bg-transparent">
              <Icon className="w-5 h-5 transition-transform duration-250" />
            </div>
            <span className="nav-label relative z-10 text-[11px] font-medium leading-none tracking-tight transition-all duration-250">
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
