import React, { useEffect, useState } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Sidebar } from "./components/Sidebar";
import { HomeView } from "./components/HomeView";
import { LibraryView } from "./components/LibraryView";
import { Player } from "./components/Player";
import { Track, PlayerState } from "./types";

type NavTab = "home" | "search" | "library" | "settings" | "explore";

function AppContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<NavTab>("home");
  const [playlists, setPlaylists] = useState([]);

  // Player state - with auto-play fix
  const [playerState, setPlayerState] = useState<PlayerState>(() => {
    try {
      const saved = localStorage.getItem("oblivion_player_state");
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          isPlaying: false, // CRITICAL: Never auto-play on return
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
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me", { timeout: 5000 });
      if (response.ok) {
        const data = await response.json();
        if (data.isLoggedIn) {
          setIsLoggedIn(true);
          fetchPlaylists();
        }
      }
    } catch (err) {
      console.log("Auth check skipped");
    } finally {
      setLoading(false);
    }
  };

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

  const handleSignIn = () => {
    window.location.href = "/auth/login";
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setIsLoggedIn(false);
      setPlaylists([]);
      setPlayerState({
        currentTrack: null,
        queue: [],
        currentIndex: 0,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        volume: 1,
        repeatMode: "off",
        shuffle: false,
      });
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

  // Loading screen
  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-900 to-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-bold mb-4">🎵 Oblivion</div>
          <div className="text-gray-400">Starting up...</div>
        </div>
      </div>
    );
  }

  // Login screen
  if (!isLoggedIn) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-900 to-slate-950 text-white flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div className="text-6xl mb-4">🎵</div>
          <h1 className="text-5xl font-bold mb-2">Oblivion</h1>
          <p className="text-xl text-gray-400 mb-8">Your YouTube Music Player</p>
          <button
            onClick={handleSignIn}
            className="w-full px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition font-semibold text-lg"
          >
            Sign In with Google
          </button>
        </div>
      </div>
    );
  }

  // Main app with sidebar
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950 text-white">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          isLoggedIn={isLoggedIn}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
        />

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto pb-24">
            {currentView === "home" && (
              <HomeView onPlayTrack={handlePlayTrack} />
            )}
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
                <h2 className="text-2xl font-bold">Search</h2>
                <p className="text-gray-400 mt-4">Coming soon</p>
              </div>
            )}
            {currentView === "explore" && (
              <div className="p-8">
                <h2 className="text-2xl font-bold">Explore</h2>
                <p className="text-gray-400 mt-4">Coming soon</p>
              </div>
            )}
            {currentView === "settings" && (
              <div className="p-8">
                <h2 className="text-2xl font-bold">Settings</h2>
                <p className="text-gray-400 mt-4">Coming soon</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Player at bottom */}
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