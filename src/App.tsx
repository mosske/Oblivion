import React, { useEffect, useState } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Player } from "./components/Player";
import { Home, Search, Music, Settings, PlayCircle, LogOut, LogIn } from "lucide-react";
import { Track, PlayerState } from "./types";

type NavTab = "home" | "explore" | "library" | "settings";

function AppContent() {
  const [currentView, setCurrentView] = useState<NavTab>("home");
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<Track[]>([]);

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
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me");
      const data = await response.json();
      if (data.isLoggedIn) {
        setIsLoggedIn(true);
        fetchPlaylists();
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setLoading(false);
    }
  };

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

  const fetchPlaylistSongs = async (playlistId: string) => {
    try {
      const response = await fetch(`/api/youtube/playlists/${playlistId}/videos`);
      const data = await response.json();
      if (data.success && data.videos) {
        setPlaylistSongs(
          data.videos.map((video: any) => ({
            id: video.id,
            youtubeVideoId: video.videoId,
            title: video.title,
            artist: video.channelTitle,
            coverUrl: video.thumbnail,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch playlist songs:", error);
    }
  };

  const handleSignIn = async () => {
    try {
      const res = await fetch("/api/auth/google/config");
      const config = await res.json();

      if (!config.configured) {
        alert("OAuth not configured");
        return;
      }

      const scopes = [
        "https://www.googleapis.com/auth/youtube.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
      ];

      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.append("client_id", config.clientId);
      authUrl.searchParams.append("redirect_uri", config.redirectUri);
      authUrl.searchParams.append("response_type", "code");
      authUrl.searchParams.append("scope", scopes.join(" "));
      authUrl.searchParams.append("access_type", "offline");

      window.location.href = authUrl.toString();
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setIsLoggedIn(false);
      setPlaylists([]);
      setSelectedPlaylistId(null);
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

  const renderView = () => {
    if (selectedPlaylistId) {
      return (
        <div className="p-6">
          <button
            onClick={() => setSelectedPlaylistId(null)}
            className="mb-6 text-cyan-400 hover:text-cyan-300 transition"
          >
            ← Back to Library
          </button>
          <h1 className="text-3xl font-bold mb-6">
            {playlists.find((p) => p.id === selectedPlaylistId)?.title}
          </h1>
          {playlistSongs.length === 0 ? (
            <div className="text-gray-400">Loading songs...</div>
          ) : (
            <div className="space-y-3">
              {playlistSongs.map((song, index) => (
                <div
                  key={song.id}
                  onClick={() => handlePlayTrack(playlistSongs, playlistSongs, index)}
                  className="flex items-center gap-4 p-3 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition"
                >
                  {song.coverUrl && (
                    <img
                      src={song.coverUrl}
                      alt={song.title}
                      className="w-12 h-12 rounded object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate text-white">{song.title}</h3>
                    <p className="text-sm text-gray-400 truncate">{song.artist}</p>
                  </div>
                  <PlayCircle className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    switch (currentView) {
      case "home":
        return (
          <div className="p-6">
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-2">Good evening</h1>
              <p className="text-gray-400">Your YouTube Music library</p>
            </div>

            {!isLoggedIn ? (
              <div className="text-center py-12">
                <LogIn className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-gray-400 mb-6">Sign in to see your playlists</p>
                <button
                  onClick={handleSignIn}
                  className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-full font-semibold transition"
                >
                  Sign In with Google
                </button>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <button
                    onClick={() => fetchPlaylists()}
                    className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white font-medium transition"
                  >
                    🔄 Refresh
                  </button>
                </div>

                {loading ? (
                  <div className="text-gray-400 text-center py-12">Loading playlists...</div>
                ) : playlists.length === 0 ? (
                  <div className="text-gray-400 text-center py-12">No playlists found</div>
                ) : (
                  <div>
                    <h2 className="text-2xl font-bold mb-4">Your Playlists</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {playlists.map((playlist) => (
                        <div
                          key={playlist.id}
                          onClick={() => {
                            setSelectedPlaylistId(playlist.id);
                            fetchPlaylistSongs(playlist.id);
                          }}
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
              </>
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
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold">Your Library</h1>
              {isLoggedIn && (
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              )}
            </div>

            {!isLoggedIn ? (
              <div className="text-center py-12">
                <LogIn className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-gray-400 mb-6">Sign in to see your library</p>
                <button
                  onClick={handleSignIn}
                  className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-full font-semibold transition"
                >
                  Sign In with Google
                </button>
              </div>
            ) : playlists.length === 0 ? (
              <div className="text-gray-400 text-center py-12">No playlists</div>
            ) : (
              <div className="space-y-3">
                {playlists.map((playlist) => (
                  <div
                    key={playlist.id}
                    onClick={() => {
                      setSelectedPlaylistId(playlist.id);
                      fetchPlaylistSongs(playlist.id);
                    }}
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
      <div className="flex-1 overflow-auto pb-24">{renderView()}</div>

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