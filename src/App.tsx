import React, { useEffect, useState, useRef } from "react";
import { User, Playlist, Track, PlayerState, UserSettings, NavTab } from "./types";
import { FULL_APP_DESIGNS } from "./utils/appDesignThemes";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Sidebar } from "./components/Sidebar";
import { BottomNav } from "./components/BottomNav";
import { HomeView } from "./components/HomeView";
import { ExploreView } from "./components/ExploreView";
import { SearchView } from "./components/SearchView";
import { LibraryView } from "./components/LibraryView";
import { SettingsView } from "./components/SettingsView";
import { PlaylistDetailView } from "./components/PlaylistDetailView";
import { Player } from "./components/Player";
import { PlaylistModal } from "./components/PlaylistModal";
import { AuthModal } from "./components/AuthModal";
import { AlertTriangle, X } from "lucide-react";

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentView, setCurrentView] = useState<NavTab>("home");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem("oblivion_user_settings");
      return saved ? JSON.parse(saved) : {
        theme: "designer-ivory",
        audioQuality: "high",
        autoDownload: false,
        miniPlayerLayout: "compact",
        lyricsDisplayMode: "inline",
      };
    } catch {
      return {
        theme: "designer-ivory",
        audioQuality: "high",
        autoDownload: false,
        miniPlayerLayout: "compact",
        lyricsDisplayMode: "inline",
      };
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

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me");
      const data = await response.json();
      if (data.isLoggedIn) {
        setUser(data.user);
        fetchPlaylists();
      }
    } catch (error) {
      console.error("Auth check failed:", error);
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

  const handleSignIn = async () => {
    try {
      const res = await fetch("/api/auth/google/config");
      const config = await res.json();

      if (!config.configured) {
        setError({ message: "OAuth not configured", code: "CONFIG_ERROR" });
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

      const width = 500;
      const height = 600;
      const left = window.innerWidth / 2 - width / 2;
      const top = window.innerHeight / 2 - height / 2;

      const authWindow = window.open(
        authUrl.toString(),
        "oauth",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      const checkInterval = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkInterval);
          checkAuth();
        }
      }, 500);

      setShowAuthModal(false);
    } catch (error) {
      setError({ message: "Sign in failed", code: "SIGNIN_ERROR" });
      console.error("Sign in error:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
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
    setPlayerState({
      ...playerState,
      currentTrack: track,
      queue,
      currentIndex: index,
      isPlaying: true,
    });
    localStorage.setItem("oblivion_player_state", JSON.stringify({
      ...playerState,
      currentTrack: track,
      queue,
      currentIndex: index,
      isPlaying: true,
    }));
  };

  const handlePlayPause = () => {
    const newState = { ...playerState, isPlaying: !playerState.isPlaying };
    setPlayerState(newState);
    localStorage.setItem("oblivion_player_state", JSON.stringify(newState));
  };

  const handleNext = () => {
    if (playerState.currentIndex < playerState.queue.length - 1) {
      const nextIndex = playerState.currentIndex + 1;
      const nextTrack = playerState.queue[nextIndex];
      const newState = {
        ...playerState,
        currentTrack: nextTrack,
        currentIndex: nextIndex,
      };
      setPlayerState(newState);
      localStorage.setItem("oblivion_player_state", JSON.stringify(newState));
    }
  };

  const handlePrevious = () => {
    if (playerState.currentIndex > 0) {
      const prevIndex = playerState.currentIndex - 1;
      const prevTrack = playerState.queue[prevIndex];
      const newState = {
        ...playerState,
        currentTrack: prevTrack,
        currentIndex: prevIndex,
      };
      setPlayerState(newState);
      localStorage.setItem("oblivion_player_state", JSON.stringify(newState));
    }
  };

  const theme = FULL_APP_DESIGNS[settings.theme as keyof typeof FULL_APP_DESIGNS] || FULL_APP_DESIGNS["designer-ivory"];

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={theme.rootStyle}>
      {error && (
        <div className="absolute top-0 left-0 right-0 z-50 p-4 bg-red-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span>{error.message}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          isLoggedIn={!!user}
          onSignIn={() => setShowAuthModal(true)}
          onSignOut={handleSignOut}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            {currentView === "home" && <HomeView onPlayTrack={handlePlayTrack} />}
            {currentView === "explore" && <ExploreView onPlayTrack={handlePlayTrack} />}
            {currentView === "search" && <SearchView onPlayTrack={handlePlayTrack} />}
            {currentView === "library" && (
              selectedPlaylistId ? (
                <PlaylistDetailView
                  playlistId={selectedPlaylistId}
                  onBack={() => setSelectedPlaylistId(null)}
                  onPlayTrack={handlePlayTrack}
                />
              ) : (
                <LibraryView
                  playlists={playlists}
                  isLoggedIn={!!user}
                  onPlaylistSelect={setSelectedPlaylistId}
                  onRefresh={fetchPlaylists}
                />
              )
            )}
            {currentView === "settings" && (
              <SettingsView
                settings={settings}
                onSettingsChange={(newSettings) => {
                  setSettings(newSettings);
                  localStorage.setItem("oblivion_user_settings", JSON.stringify(newSettings));
                }}
              />
            )}
          </div>

          <BottomNav currentView={currentView} onViewChange={setCurrentView} />
        </div>
      </div>

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

      {showAuthModal && (
        <AuthModal onSignIn={handleSignIn} onClose={() => setShowAuthModal(false)} />
      )}

      {showPlaylistModal && (
        <PlaylistModal onClose={() => setShowPlaylistModal(false)} />
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