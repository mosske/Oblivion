import React, { useEffect, useState } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Player } from "./components/Player";
import { Home, Search, Music, Settings, PlayCircle } from "lucide-react";
import { Track, PlayerState } from "./types";

type NavTab = "home" | "explore" | "library" | "settings";

function AppContent() {
  const [currentView, setCurrentView] = useState<NavTab>("home");
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    setLoading(true);
    try {
      const response = await fetch("/api/youtube/playlists");
      const data = await response.json();
      if (data.success && data.playlists) {
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
    } finally {
      setLoading(false);
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

  const renderView = () => {
    switch (currentView) {
      case "home":
        return (
          <div className="p-6">
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-2">Good evening</h1>
              <p className="text-gray-400">Your YouTube Music library</p>
            </div>

            <div className="mb-8">
              <button className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white font-medium transition">
                🔄 Refresh
              </button>
            </div>

            {loading ? (
              <div className="text-gray-400 text-center py-12">Loading playlists...</div>
            ) : playlists.length === 0 ? (
              <div className="text-gray-400 text-center py-12">No playlists found. Sign in to YouTube to sync your library.</div>
            ) : (
              <div>
                <h2 className="text-2xl font-bold mb-4">Your Playlists</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {playlists.map((playlist) => (
                    <div
                      key={playlist.id}
                      onClick={() => handlePlayTrack(
                        {
                          id: playlist.id,
                          youtubeVideoId: playlist.id,
                          title: playlist.title,
                          artist: "Playlist",
                          coverUrl: playlist.coverUrl || "",
                        },
                        [],
                        0
                      )}
                      className="bg-white/5 hover:bg-white/10 rounded-lg overflow-hidden cursor-pointer transition transform hover:scale-105"
                    >
                      {playlist.coverUrl && (
                        <img
                          src={playlist.coverUrl}
                          alt={playlist.title}
                          className="w-full aspect-square object-cover"
                        />
                      )}
                      <div className="p-4">
                        <h3 className="font-semibold truncate text-white">{playlist.title}</h3>
                        <p className="text-sm text-gray-400 truncate">Playlist • {playlist.itemCount} songs</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case "explore":
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold mb-6">Explore</h1>
            <div className="text-gray-400 text-center py-12">
              <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Coming soon</p>
            </div>
          </div>
        );

      case "library":
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold mb-6">Your Library</h1>
            {playlists.length === 0 ? (
              <div className="text-gray-400 text-center py-12">No playlists</div>
            ) : (
              <div className="space-y-3">
                {playlists.map((playlist) => (
                  <div
                    key={playlist.id}
                    onClick={() => handlePlayTrack(
                      {
                        id: playlist.id,
                        youtubeVideoId: playlist.id,
                        title: playlist.title,
                        artist: "Playlist",
                        coverUrl: playlist.coverUrl || "",
                      },
                      [],
                      0
                    )}
                    className="flex items-center gap-4 p-3 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition"
                  >
                    {playlist.coverUrl && (
                      <img
                        src={playlist.coverUrl}
                        alt={playlist.title}
                        className="w-12 h-12 rounded object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate text-white">{playlist.title}</h3>
                      <p className="text-sm text-gray-400">{playlist.itemCount} songs</p>
                    </div>
                    <PlayCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "settings":
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold mb-6">Settings</h1>
            <div className="text-gray-400 text-center py-12">
              <Settings className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Coming soon</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Main content area */}
      <div className="flex-1 overflow-auto pb-24">
        {renderView()}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 border-t border-slate-700 backdrop-blur-sm">
        <div className="flex items-center justify-around h-20">
          <button
            onClick={() => setCurrentView("home")}
            className={`flex flex-col items-center gap-1 py-2 px-4 transition ${
              currentView === "home" ? "text-cyan-400" : "text-gray-400 hover:text-white"
            }`}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs font-medium">Home</span>
          </button>
          <button
            onClick={() => setCurrentView("explore")}
            className={`flex flex-col items-center gap-1 py-2 px-4 transition ${
              currentView === "explore" ? "text-cyan-400" : "text-gray-400 hover:text-white"
            }`}
          >
            <Search className="w-6 h-6" />
            <span className="text-xs font-medium">Explore</span>
          </button>
          <button
            onClick={() => setCurrentView("library")}
            className={`flex flex-col items-center gap-1 py-2 px-4 transition ${
              currentView === "library" ? "text-cyan-400" : "text-gray-400 hover:text-white"
            }`}
          >
            <Music className="w-6 h-6" />
            <span className="text-xs font-medium">Library</span>
          </button>
          <button
            onClick={() => setCurrentView("settings")}
            className={`flex flex-col items-center gap-1 py-2 px-4 transition ${
              currentView === "settings" ? "text-cyan-400" : "text-gray-400 hover:text-white"
            }`}
          >
            <Settings className="w-6 h-6" />
            <span className="text-xs font-medium">Settings</span>
          </button>
        </div>
      </div>

      {/* Player */}
      {playerState.currentTrack && (
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