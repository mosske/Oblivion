import React from "react";
import { Home, Search, Library, Settings } from "lucide-react";

interface BottomNavProps {
  activeTab: "home" | "search" | "library" | "settings";
  setActiveTab: (tab: "home" | "search" | "library" | "settings") => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800/80 flex items-center justify-around z-30 px-2">
      <button
        onClick={() => setActiveTab("home")}
        className={`flex flex-col items-center justify-center gap-1 w-16 py-1 ${
          activeTab === "home" ? "text-cyan-400 font-semibold" : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px]">Home</span>
      </button>

      <button
        onClick={() => setActiveTab("search")}
        className={`flex flex-col items-center justify-center gap-1 w-16 py-1 ${
          activeTab === "search" ? "text-cyan-400 font-semibold" : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <Search className="w-5 h-5" />
        <span className="text-[10px]">Search</span>
      </button>

      <button
        onClick={() => setActiveTab("library")}
        className={`flex flex-col items-center justify-center gap-1 w-16 py-1 ${
          activeTab === "library" ? "text-cyan-400 font-semibold" : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <Library className="w-5 h-5" />
        <span className="text-[10px]">Library</span>
      </button>

      <button
        onClick={() => setActiveTab("settings")}
        className={`flex flex-col items-center justify-center gap-1 w-16 py-1 ${
          activeTab === "settings" ? "text-cyan-400 font-semibold" : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <Settings className="w-5 h-5" />
        <span className="text-[10px]">Settings</span>
      </button>
    </div>
  );
};
