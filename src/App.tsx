// App.tsx - Top section
import React, { useEffect, useState } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { User, Playlist, Track, PlayerState, UserSettings, NavTab } from "./types";
// ... other imports ...

function AppContent() {
  // Initialize player state WITHOUT auto-play
  const [playerState, setPlayerState] = useState<PlayerState>(() => {
    try {
      const saved = localStorage.getItem("oblivion_player_state");
      if (saved) {
        const parsed = JSON.parse(saved);
        // CRITICAL FIX: Never auto-play when app returns from background
        return {
          ...parsed,
          isPlaying: false, // Override to prevent auto-replay
        };
      }
    } catch (error) {
      console.error("Failed to load player state:", error);
    }
    return {
      currentTrack: null,
      queue: [],
      currentIndex: 0,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 1,
      repeatMode: "off",
      shuffle: false,
    };
  });

  // ... rest of component code remains the same ...
  // ... all the state, effects, handlers ...

  return (
    // Main app JSX structure...
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white">
      {/* Sidebar and main content */}
    </div>
  );
}

// IMPORTANT: Wrap entire app in ErrorBoundary
export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}