import React from "react";
import { Music, Music2 } from "lucide-react";

export function HomeView() {
  return (
    <div className="p-6 bg-gradient-to-b from-slate-900 to-slate-950 min-h-screen">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Welcome</h1>
        <p className="text-gray-400">YouTube Music Player</p>
      </div>
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Music2 className="w-16 h-16 text-gray-500 mb-4" />
        <p className="text-gray-400">Sign in to get started</p>
      </div>
    </div>
  );
}

export default HomeView;