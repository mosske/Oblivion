import React, { useEffect, useState } from "react";
import { User, Playlist, Track, PlayerState, UserSettings, NavTab } from "./types";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Player } from "./components/Player";
import { Sidebar } from "./components/Sidebar";
import { BottomNav } from "./components/BottomNav";

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentView, setCurrentView] = useState<NavTab>("home");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncingYouTube, setIsSyncingYouTube] = useState(false);
  const [hiddenPlaylists, setHiddenPlaylists] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("oblivion_hidden_playlists");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem("oblivion_user_settings");
      return saved ? JSON.parse(saved) : {
        theme: "default",
        audioQuality: "high",
        autoDownload: false,
      };
    } catch {
      return { theme: "default", audioQuality: "high", autoDownload: false };
    }
  });

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
      if (data.isLoggedIn && data.user) {
        setUser(data.user);
        fetchPlaylists();
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlaylists = async () => {
    try {
      const response = await fetch("/api/youtube/playlists");
      const data = await response.json();
      if (data.success && data.playlists) {
        setPlaylists(data.playlists);
        localStorage.setItem("oblivion_saved_playlists", JSON.stringify(data.playlists));
        localStorage.setItem("oblivion_playlist_sync_time", new Date().toISOString());
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

  const fetchPlaylistSongs = async (playlistId: string) => {
    try {
      const response = await fetch(`/api/youtube/playlists/${playlistId}/videos`);
      const data = await response.json();
      if (data.success && data.videos) {
        const songs = data.videos.map((video: any) => ({
          id: video.id,
          youtubeVideoId: video.videoId,
          title: video.title,
          artist: video.channelTitle,
          coverUrl: video.thumbnail,
        }));
        setPlaylistSongs(songs);
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
        "https://www.googleapis.com/auth/userinfo.profile",
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
      setUser(null);
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

  const visiblePlaylists = playlists.filter((p) => !hiddenPlaylists.includes(p.id));

  const renderPlaylistDetail = () => {
    const playlist = playlists.find((p) => p.id === selectedPlaylistId);
    if (!playlist) return null;

    return (
      <div className="p-6">
        <button
          onClick={() => setSelectedPlaylistId(null)}
          className="mb-6 text-cyan-400 hover:text-cyan-300 transition"
        >
          ← Back to Library
        </button>
        <div className="mb-6">
          {playlist.coverUrl && (
            <img
              src={playlist.coverUrl}
              alt={playlist.title}
              className="w-48 h-48 rounded-lg object-cover mb-4"
            />
          )}
          <h1 className="text-4xl font-bold mb-2">{playlist.title}</h1>
          <p className="text-gray-400">Playlist • {playlistSongs.length} songs</p>
        </div>

        {playlistSongs.length === 0 ? (
          <div className="text-gray-400 text-center py-12">No songs in this playlist</div>
        ) : (
          <div className="space-y-2">
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
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (selectedPlaylistId) {
      return renderPlaylistDetail();
    }

    switch (currentView) {
      case "home":
        return (
          <div className="p-6">
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-2">Good evening</h1>
              <p className="text-gray-400">Your YouTube Music library</p>
            </div>

            {!user ? (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-6">Sign in to see your playlists</p>
                <button
                  onClick={handleSignIn}
                  className="px-8 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-full font-semibold transition"
                >
                  Sign In to YouTube Music
                </button>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <button
                    onClick={() => fetchPlaylists()}
                    className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full font-medium transition"
                  >
                    🔄 Refresh Playlists
                  </button>
                </div>

                {visiblePlaylists.length === 0 ? (
                  <div className="text-gray-400 text-center py-12">No playlists found</div>
                ) : (
                  <div>
                    <h2 className="text-2xl font-bold mb-6">Your Playlists</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {visiblePlaylists.map((playlist) => (
                        <div
                          key={playlist.id}
                          onClick={() => {
                            setSelectedPlaylistId(playlist.id);
                            fetchPlaylistSongs(playlist.id);
                          }}
                          className="bg-white/5 hover:bg-white/10 rounded-lg overflow-hidden cursor-pointer transition transform hover:scale-105 group"
                        >
                          {playlist.coverUrl && (
                            <div className="relative aspect-square overflow-hidden">
                              <img
                                src={playlist.coverUrl}
                                alt={playlist.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition"
                              />
                            </div>
                          )}
                          <div className="p-4">
                            <h3 className="font-semibold truncate text-white">{playlist.title}</h3>
                            <p className="text-sm text-gray-400">{playlist.itemCount} songs</p>
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

      case "library":
        return (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold">Your Library</h1>
              <div className="flex gap-2">
                {user && (
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
                  >
                    Sign Out
                  </button>
                )}
              </div>
            </div>

            {!user ? (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-6">Sign in to access your library</p>
                <button
                  onClick={handleSignIn}
                  className="px-8 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-full font-semibold transition"
                >
                  Sign In
                </button>
              </div>
            ) : visiblePlaylists.length === 0 ? (
              <div className="text-gray-400 text-center py-12">No playlists</div>
            ) : (
              <div className="space-y-3">
                {visiblePlaylists.map((playlist) => (
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
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "explore":
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold mb-6">Explore</h1>
            <div className="text-gray-400 text-center py-12">Coming soon</div>
          </div>
        );

      case "search":
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold mb-6">Search</h1>
            <div className="text-gray-400 text-center py-12">Coming soon</div>
          </div>
        );

      case "settings":
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold mb-6">Settings</h1>
            <div className="text-gray-400 text-center py-12">Coming soon</div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading && !user) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-bold mb-4">Oblivion</div>
          <div className="text-gray-400">Starting...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Main content */}
      <div className="flex-1 overflow-auto pb-24">{renderContent()}</div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 border-t border-slate-700 backdrop-blur-sm z-10">
        <div className="flex items-center justify-around h-20 max-w-screen">
          {[
            { id: "home", label: "Home", icon: "🏠" },
            { id: "explore", label: "Explore", icon: "🔍" },
            { id: "library", label: "Library", icon: "♪" },
            { id: "search", label: "Search", icon: "🔎" },
            { id: "settings", label: "Settings", icon: "⚙️" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentView(tab.id as NavTab)}
              className={`flex flex-col items-center gap-1 py-2 px-4 transition ${
                currentView === tab.id ? "text-cyan-400" : "text-gray-400 hover:text-white"
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
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