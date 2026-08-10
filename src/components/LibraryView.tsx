import React from "react";
import { Music } from "lucide-react";

export function LibraryView() {
  return (
    <div className="p-6 bg-gradient-to-b from-slate-900 to-slate-950 min-h-screen">
      <div className="flex items-center gap-3 mb-8">
        <Music className="w-8 h-8 text-cyan-400" />
        <h1 className="text-3xl font-bold text-white">Your Library</h1>
      </div>
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Music className="w-16 h-16 text-gray-500 mb-4" />
        <p className="text-gray-400 text-lg">Sign in to see your playlists</p>
      </div>
    </div>
  );
}

export default LibraryView;