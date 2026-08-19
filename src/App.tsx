import React, { useEffect, useState } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Sidebar } from "./components/Sidebar";
import { BottomNav } from "./components/BottomNav";
import { HomeView } from "./components/HomeView";
import { LibraryView } from "./components/LibraryView";
import { Player } from "./components/Player";
import { Track, PlayerState } from "./types";

type NavTab = "home" | "search" | "library" | "settings" | "explore";

function AppContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [currentView, setCurrentView] = useState<NavTab>("home");
  const [playlists, setPlaylists] = useState([]);

  const [playerState, setPlayerState] = useState<PlayerState>(() => {
    try {
      const saved = localStorage.getItem("oblivion_player_state");
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          isPlaying: false,
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

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    try {
      const response = await fetch("/api/youtube/playlists");
      const data = await response.json();
      if (data.success) {
        setPlaylists(data.playlists);
        localStorage.setItem("oblivion_saved_playlists", JSON.stringify(data.playlists));
      }
    } catch (error) {
      console.error("Failed to fetch playlists:", error);
      try {
        const cached = localStorage.getItem("oblivion_saved_playlists");
        if (cached) {
          setPlaylists(JSON.parse(cached));
        }
      } catch {}
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setIsLoggedIn(false);
      setPlaylists([]);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const handlePlayTrack = (track: Track, queue: Track[], index: number) => {
    const newState = {
      ...playerState,
      currentTrack: track,
      queue,
      currentIndex: index,
      isPlaying: true,
    };
    setPlayerState(newState);
    localStorage.setItem("oblivion_player_state", JSON.stringify(newState));
  };

  const handlePlayPause = () => {
    const newState = { ...playerState, isPlaying: !playerState.isPlaying };
    setPlayerState(newState);
    localStorage.setItem("oblivion_player_state", JSON.stringify(newState));
  };

  const handleNext = () => {
    if (playerState.currentIndex < playerState.queue.length - 1) {
      const nextIndex = playerState.currentIndex + 1;
      const newState = {
        ...playerState,
        currentTrack: playerState.queue[nextIndex],
        currentIndex: nextIndex,
      };
      setPlayerState(newState);
      localStorage.setItem("oblivion_player_state", JSON.stringify(newState));
    }
  };

  const handlePrevious = () => {
    if (playerState.currentIndex > 0) {
      const prevIndex = playerState.currentIndex - 1;
      const newState = {
        ...playerState,
        currentTrack: playerState.queue[prevIndex],
        currentIndex: prevIndex,
      };
      setPlayerState(newState);
      localStorage.setItem("oblivion_player_state", JSON.stringify(newState));
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950 text-white">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          isLoggedIn={isLoggedIn}
          onSignIn={() => {}}
          onSignOut={handleSignOut}
        />

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Views */}
          <div className="flex-1 overflow-auto">
            {currentView === "home" && <HomeView onPlayTrack={handlePlayTrack} />}
            {currentView === "library" && (
              <LibraryView
                playlists={playlists}
                isLoggedIn={isLoggedIn}
                onPlaylistSelect={() => {}}
                onRefresh={fetchPlaylists}
              />
            )}
            {currentView === "search" && (
              <div className="p-8">
                <h2 className="text-3xl font-bold mb-4">Search</h2>
                <p className="text-gray-400">Coming soon</p>
              </div>
            )}
            {currentView === "explore" && (
              <div className="p-8">
                <h2 className="text-3xl font-bold mb-4">Explore</h2>
                <p className="text-gray-400">Coming soon</p>
              </div>
            )}
            {currentView === "settings" && (
              <div className="p-8">
                <h2 className="text-3xl font-bold mb-4">Settings</h2>
                <p className="text-gray-400">Coming soon</p>
              </div>
            )}
          </div>

          {/* Bottom Nav */}
          <BottomNav currentView={currentView} onViewChange={setCurrentView} />
        </div>
      </div>

      {/* Player - ALWAYS at bottom */}
      {playerState.currentTrack ? (
        <Player
          currentTrack={playerState.currentTrack}
          queue={playerState.queue}
          currentIndex={playerState.currentIndex}
          isPlaying={playerState.isPlaying}
          onPlayPause={handlePlayPause}
          onNext={handleNext}
          onPrevious={handlePrevious}
          volume={playerState.volume}
          onVolumeChange={(volume) => {
            const newState = { ...playerState, volume };
            setPlayerState(newState);
            localStorage.setItem("oblivion_player_state", JSON.stringify(newState));
          }}
        />
      ) : (
        <div className="h-20 bg-slate-900 border-t border-slate-700" />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}