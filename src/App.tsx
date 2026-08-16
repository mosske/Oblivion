import React, { useEffect, useState } from "react";
import { User, Playlist, Track, PlayerState, UserSettings } from "./types";
import { FULL_APP_DESIGNS } from "./utils/appDesignThemes";
import { Sidebar } from "./components/Sidebar";
import { BottomNav } from "./components/BottomNav";
import { HomeView } from "./components/HomeView";
import { SearchView } from "./components/SearchView";
import { LibraryView } from "./components/LibraryView";
import { SettingsView } from "./components/SettingsView";
import { Player } from "./components/Player";
import { PlaylistModal } from "./components/PlaylistModal";
import { AuthModal } from "./components/AuthModal";
import { AlertTriangle, X, Disc3 } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"home" | "search" | "library" | "settings">("home");
  
  // Initialize saved user from localStorage
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem("oblivion_saved_user");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.name) {
          return { ...parsed, isLoggedIn: true };
        }
      }
    } catch (err) {
      console.error("Error reading saved user:", err);
    }
    return null;
  });

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState<boolean>(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [isSyncingYouTube, setIsSyncingYouTube] = useState<boolean>(false);
  const [oauthBannerError, setOauthBannerError] = useState<string | null>(null);

  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem("oblivion_user_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          audioQuality: parsed.audioQuality || "high",
          crossfadeDuration: parsed.crossfadeDuration ?? 2,
          normalizeVolume: parsed.normalizeVolume ?? true,
          autoPlaySimilar: parsed.autoPlaySimilar ?? true,
          themePreset: parsed.themePreset || "designer-ivory",
          miniPlayerLayout: parsed.miniPlayerLayout || "designer-waveform",
          fullAppDesign: parsed.fullAppDesign || "designer",
          compactMode: parsed.compactMode ?? false,
          lyricsFontSize: parsed.lyricsFontSize || "md",
          lyricsAlignment: parsed.lyricsAlignment || "left",
          autoDownloadFavorites: parsed.autoDownloadFavorites ?? false,
          maxCacheSizeMB: parsed.maxCacheSizeMB || 500,
        };
      }
    } catch {
      // Fallback
    }
    return {
      audioQuality: "high",
      crossfadeDuration: 2,
      normalizeVolume: true,
      autoPlaySimilar: true,
      themePreset: "designer-ivory",
      miniPlayerLayout: "designer-waveform",
      fullAppDesign: "designer",
      compactMode: false,
      lyricsFontSize: "md",
      lyricsAlignment: "left",
      autoDownloadFavorites: false,
      maxCacheSizeMB: 500,
    };
  });

  const activeFullDesign = FULL_APP_DESIGNS[settings.fullAppDesign || "designer"] || FULL_APP_DESIGNS["designer"];

  // Save settings whenever they update
  useEffect(() => {
    try {
      localStorage.setItem("oblivion_user_settings", JSON.stringify(settings));
    } catch {
      // Silently ignore storage quota exceptions
    }
  }, [settings]);

  const [playerState, setPlayerState] = useState<PlayerState>({
    currentTrack: null,
    queue: [],
    queueIndex: 0,
    isPlaying: false,
    volume: 0.8,
    isMuted: false,
    currentTime: 0,
    duration: 0,
    repeatMode: "off",
    isShuffle: false,
    isFullscreen: false,
    showLyrics: false,
    showQueue: false,
    showSimilar: false,
    likedTrackIds: [],
  });

  // Save user changes to localStorage
  useEffect(() => {
    if (user && user.isLoggedIn) {
      localStorage.setItem("oblivion_saved_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("oblivion_saved_user");
    }
  }, [user]);

  // Check auth status on mount and sync session
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errParam = urlParams.get("oauth_error");
    const successParam = urlParams.get("oauth_success");
    const userParam = urlParams.get("user");

    if (errParam) {
      setOauthBannerError(errParam);
      setActiveTab("settings");
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (successParam || userParam) {
      if (userParam) {
        try {
          const parsedUser = JSON.parse(decodeURIComponent(userParam));
          if (parsedUser && (parsedUser.id || parsedUser.email)) {
            const fullUser = { ...parsedUser, isLoggedIn: true };
            setUser(fullUser);
            localStorage.setItem("oblivion_saved_user", JSON.stringify(fullUser));
          }
        } catch (e) {
          console.error("Failed to parse user param:", e);
        }
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.isLoggedIn && data.user) {
          const fullUser = { ...data.user, isLoggedIn: true };
          setUser(fullUser);
          localStorage.setItem("oblivion_saved_user", JSON.stringify(fullUser));
        }
        fetchPlaylists();
      })
      .catch((err) => {
        console.error("Auth check error:", err);
        fetchPlaylists();
      });
  }, []);

  useEffect(() => {
    if (user?.isLoggedIn) {
      fetchPlaylists();
    }
  }, [user?.isLoggedIn]);

  const handleLoginSuccess = (loggedUser: User) => {
    const fullUser = { ...loggedUser, isLoggedIn: true };
    setUser(fullUser);
    localStorage.setItem("oblivion_saved_user", JSON.stringify(fullUser));
    fetchPlaylists();
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error:", err);
    }
    setUser(null);
    localStorage.removeItem("oblivion_saved_user");
    fetchPlaylists();
  };

  // Fetch Playlists
  const fetchPlaylists = async () => {
    setIsSyncingYouTube(true);
    try {
      let activeToken = user?.accessToken;
      if (!activeToken) {
        try {
          const saved = localStorage.getItem("oblivion_saved_user");
          if (saved) {
            const parsed = JSON.parse(saved);
            activeToken = parsed?.accessToken;
          }
        } catch {}
      }

      const headers: Record<string, string> = {};
      if (activeToken) {
        headers["Authorization"] = `Bearer ${activeToken}`;
      }

      const res = await fetch("/api/youtube/playlists", { headers });
      const data = await res.json();
      if (data.playlists) {
        const seenPlIds = new Set<string>();
        const sanitizedPlaylists: Playlist[] = [];

        for (const pl of data.playlists) {
          if (!pl) continue;
          const plId = pl.id || pl.playlistId;
          if (!plId || seenPlIds.has(plId)) continue;
          seenPlIds.add(plId);

          const seenTrackIds = new Set<string>();
          const sanitizedTracks: Track[] = [];

          for (const t of pl.tracks || []) {
            if (!t) continue;
            const trId = t.id || t.youtubeVideoId;
            if (!trId || seenTrackIds.has(trId)) continue;
            seenTrackIds.add(trId);
            sanitizedTracks.push({ ...t, id: trId });
          }

          sanitizedPlaylists.push({
            ...pl,
            id: plId,
            tracks: sanitizedTracks,
            tracksCount: sanitizedTracks.length || pl.tracksCount || 0,
          });
        }

        setPlaylists(sanitizedPlaylists);
        // If initial track is empty, set default from first playlist
        if (!playerState.currentTrack && sanitizedPlaylists[0]?.tracks?.[0]) {
          const defaultTrack = sanitizedPlaylists[0].tracks[0];
          setPlayerState((prev) => ({
            ...prev,
            currentTrack: defaultTrack,
            queue: sanitizedPlaylists[0].tracks,
            queueIndex: 0,
          }));
        }
      }
    } catch (err) {
      console.error("Fetch playlists error:", err);
    } finally {
      setIsSyncingYouTube(false);
    }
  };

  // Fetch specific playlist items when selected
  const fetchPlaylistDetails = async (playlistId: string) => {
    try {
      const res = await fetch(`/api/youtube/playlists/${playlistId}/items`);
      const data = await res.json();
      if (data.tracks) {
        const seenIds = new Set<string>();
        const uniqueTracks: Track[] = [];

        for (const t of data.tracks) {
          if (!t) continue;
          const trId = t.id || t.youtubeVideoId;
          if (!trId || seenIds.has(trId)) continue;
          seenIds.add(trId);
          uniqueTracks.push({ ...t, id: trId });
        }

        setPlaylists((prev) =>
          prev.map((p) =>
            p.id === playlistId
              ? {
                  ...p,
                  tracks: uniqueTracks,
                  tracksCount: uniqueTracks.length,
                  coverUrl: uniqueTracks[0]?.coverUrl || p.coverUrl,
                }
              : p
          )
        );
        setSelectedPlaylist((prev) =>
          prev && prev.id === playlistId
            ? {
                ...prev,
                tracks: uniqueTracks,
                tracksCount: uniqueTracks.length,
                coverUrl: uniqueTracks[0]?.coverUrl || prev.coverUrl,
              }
            : prev
        );
      }
    } catch (err) {
      console.error("Fetch playlist details error:", err);
    }
  };

  useEffect(() => {
    if (selectedPlaylist?.id) {
      fetchPlaylistDetails(selectedPlaylist.id);
    }
  }, [selectedPlaylist?.id]);

  // Play single track
  const handlePlayTrack = (track: Track) => {
    const trId = track.id || track.youtubeVideoId;
    const cleanTrack = { ...track, id: trId };
    setPlayerState((prev) => {
      const existingIdx = prev.queue.findIndex((t) => (t.id || t.youtubeVideoId) === trId);
      let newQueue = [...prev.queue];
      let newIdx = existingIdx;

      if (existingIdx === -1) {
        newQueue.unshift(cleanTrack);
        newIdx = 0;
      }

      return {
        ...prev,
        currentTrack: cleanTrack,
        queue: newQueue,
        queueIndex: newIdx >= 0 ? newIdx : 0,
        isPlaying: true,
      };
    });
  };

  // Play array queue
  const handlePlayQueue = (tracks: Track[], startIndex = 0) => {
    if (!tracks || tracks.length === 0) return;
    const seen = new Set<string>();
    const cleanTracks: Track[] = [];
    for (const t of tracks) {
      if (!t) continue;
      const trId = t.id || t.youtubeVideoId;
      if (!trId || seen.has(trId)) continue;
      seen.add(trId);
      cleanTracks.push({ ...t, id: trId });
    }
    if (cleanTracks.length === 0) return;
    const validIdx = Math.min(Math.max(0, startIndex), cleanTracks.length - 1);
    setPlayerState((prev) => ({
      ...prev,
      queue: cleanTracks,
      queueIndex: validIdx,
      currentTrack: cleanTracks[validIdx],
      isPlaying: true,
    }));
  };

  // Add to queue
  const handleAddToQueue = (track: Track) => {
    const trId = track.id || track.youtubeVideoId;
    if (!trId) return;
    const cleanTrack = { ...track, id: trId };
    setPlayerState((prev) => {
      const exists = prev.queue.some((t) => (t.id || t.youtubeVideoId) === trId);
      if (exists) return prev;
      return {
        ...prev,
        queue: [...prev.queue, cleanTrack],
      };
    });
  };

  // Next Track
  const handleNextTrack = () => {
    setPlayerState((prev) => {
      if (prev.queue.length === 0) return prev;
      let nextIndex = prev.queueIndex + 1;
      if (nextIndex >= prev.queue.length) {
        nextIndex = 0;
      }
      return {
        ...prev,
        queueIndex: nextIndex,
        currentTrack: prev.queue[nextIndex],
        isPlaying: true,
      };
    });
  };

  // Previous Track
  const handlePrevTrack = () => {
    setPlayerState((prev) => {
      if (prev.queue.length === 0) return prev;
      let prevIndex = prev.queueIndex - 1;
      if (prevIndex < 0) {
        prevIndex = prev.queue.length - 1;
      }
      return {
        ...prev,
        queueIndex: prevIndex,
        currentTrack: prev.queue[prevIndex],
        isPlaying: true,
      };
    });
  };

  // Toggle Like
  const handleToggleLike = (trackId: string) => {
    setPlayerState((prev) => {
      const isLiked = prev.likedTrackIds.includes(trackId);
      const updated = isLiked
        ? prev.likedTrackIds.filter((id) => id !== trackId)
        : [...prev.likedTrackIds, trackId];
      return { ...prev, likedTrackIds: updated };
    });
  };

  // Create or Update Playlist
  const handleSavePlaylist = async (title: string, description: string, coverUrl: string) => {
    if (editingPlaylist) {
      // Update
      try {
        const res = await fetch(`/api/youtube/playlists/${editingPlaylist.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description, coverUrl }),
        });
        const data = await res.json();
        if (data.success) {
          setPlaylists((prev) =>
            prev.map((p) =>
              p.id === editingPlaylist.id ? { ...p, title, description, coverUrl } : p
            )
          );
          if (selectedPlaylist?.id === editingPlaylist.id) {
            setSelectedPlaylist((prev) => (prev ? { ...prev, title, description, coverUrl } : null));
          }
        }
      } catch (err) {
        console.error("Update playlist error:", err);
      }
    } else {
      // Create
      try {
        const res = await fetch("/api/youtube/playlists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description, coverUrl }),
        });
        const data = await res.json();
        if (data.playlist) {
          setPlaylists((prev) => [data.playlist, ...prev]);
        }
      } catch (err) {
        console.error("Create playlist error:", err);
      }
    }
    setEditingPlaylist(null);
  };

  // Delete Playlist
  const handleDeletePlaylist = async (playlistId: string) => {
    if (!confirm("Are you sure you want to delete this playlist?")) return;
    try {
      await fetch(`/api/youtube/playlists/${playlistId}`, { method: "DELETE" });
      setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
      if (selectedPlaylist?.id === playlistId) {
        setSelectedPlaylist(null);
      }
    } catch (err) {
      console.error("Delete playlist error:", err);
    }
  };

  // Reorder Tracks inside Playlist
  const handleReorderPlaylistTracks = async (playlistId: string, newTracks: Track[]) => {
    setPlaylists((prev) =>
      prev.map((p) => (p.id === playlistId ? { ...p, tracks: newTracks } : p))
    );
    if (selectedPlaylist?.id === playlistId) {
      setSelectedPlaylist((prev) => (prev ? { ...prev, tracks: newTracks } : null));
    }

    try {
      await fetch(`/api/youtube/playlists/${playlistId}/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracks: newTracks }),
      });
    } catch (err) {
      console.error("Reorder tracks error:", err);
    }
  };

  // Remove Track from Playlist
  const handleRemoveTrackFromPlaylist = async (playlistId: string, trackId: string) => {
    setPlaylists((prev) =>
      prev.map((p) =>
        p.id === playlistId
          ? {
              ...p,
              tracks: p.tracks.filter((t) => t.id !== trackId),
              tracksCount: p.tracks.length - 1,
            }
          : p
      )
    );
    if (selectedPlaylist?.id === playlistId) {
      setSelectedPlaylist((prev) =>
        prev
          ? {
              ...prev,
              tracks: prev.tracks.filter((t) => t.id !== trackId),
              tracksCount: prev.tracks.length - 1,
            }
          : null
      );
    }

    try {
      await fetch(`/api/youtube/playlists/${playlistId}/items/${trackId}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Remove track error:", err);
    }
  };

  // Add Track to Playlist
  const handleAddTrackToPlaylist = async (track: Track, playlistId: string) => {
    const trId = track.id || track.youtubeVideoId;
    if (!trId) return;
    const cleanTrack = { ...track, id: trId };

    try {
      const res = await fetch(`/api/youtube/playlists/${playlistId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track: cleanTrack }),
      });
      const data = await res.json();
      if (data.success) {
        setPlaylists((prev) =>
          prev.map((p) => {
            if (p.id === playlistId) {
              const exists = p.tracks.some((t) => (t.id || t.youtubeVideoId) === trId);
              if (exists) return p;
              const updated = [...p.tracks, cleanTrack];
              return {
                ...p,
                tracks: updated,
                tracksCount: updated.length,
              };
            }
            return p;
          })
        );
        if (selectedPlaylist?.id === playlistId) {
          setSelectedPlaylist((prev) => {
            if (!prev) return null;
            const exists = prev.tracks.some((t) => (t.id || t.youtubeVideoId) === trId);
            if (exists) return prev;
            const updated = [...prev.tracks, cleanTrack];
            return {
              ...prev,
              tracks: updated,
              tracksCount: updated.length,
            };
          });
        }
      }
    } catch (err) {
      console.error("Add track error:", err);
    }
  };

  // Sync / Batch Save Playlist Tracks
  const handleSyncPlaylistTracks = async (playlistId: string, updatedTracks: Track[]) => {
    try {
      const res = await fetch(`/api/youtube/playlists/${playlistId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracks: updatedTracks }),
      });
      const data = await res.json();
      if (data.success) {
        setPlaylists((prev) =>
          prev.map((p) =>
            p.id === playlistId
              ? {
                  ...p,
                  tracks: updatedTracks,
                  tracksCount: updatedTracks.length,
                  coverUrl: updatedTracks[0]?.coverUrl || p.coverUrl,
                }
              : p
          )
        );
        if (selectedPlaylist?.id === playlistId) {
          setSelectedPlaylist((prev) =>
            prev
              ? {
                  ...prev,
                  tracks: updatedTracks,
                  tracksCount: updatedTracks.length,
                  coverUrl: updatedTracks[0]?.coverUrl || prev.coverUrl,
                }
              : null
          );
        }
      }
      return data;
    } catch (err) {
      console.error("Sync playlist tracks error:", err);
      throw err;
    }
  };

  return (
    <div className={`flex h-screen w-screen bg-gradient-to-b ${activeFullDesign.bgCanvas} text-slate-100 overflow-hidden font-sans select-none`}>
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        playlists={playlists}
        onSelectPlaylist={(pl) => setSelectedPlaylist(pl)}
        onCreatePlaylist={() => {
          setEditingPlaylist(null);
          setIsPlaylistModalOpen(true);
        }}
        isSyncingYouTube={isSyncingYouTube}
        onSyncYouTube={fetchPlaylists}
        activeTheme={settings.themePreset}
        designConfig={activeFullDesign}
      />

      {/* Main Content Workspace Area */}
      <main className={`flex-1 flex flex-col relative h-full overflow-hidden bg-gradient-to-b ${activeFullDesign.bgCanvas}`}>
        {/* Mobile Top App Bar */}
        <header className={`md:hidden flex items-center justify-between px-4 py-3 ${activeFullDesign.headerBg} backdrop-blur-xl border-b ${activeFullDesign.borderSubtle} shrink-0 z-20`}>
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab("home")}>
            <div className={`w-8 h-8 rounded-xl ${activeFullDesign.btnPrimary} p-0.5 flex items-center justify-center shadow-md`}>
              <div className={`w-full h-full ${activeFullDesign.isLight ? "bg-[#f5f2eb]" : "bg-slate-950"} rounded-[10px] flex items-center justify-center`}>
                <Disc3 className={`w-4 h-4 ${activeFullDesign.accentText}`} />
              </div>
            </div>
            <span className={`text-sm font-bold tracking-wider ${activeFullDesign.textPrimary} font-mono`}>OBLIVION</span>
          </div>

          <div className="flex items-center gap-2">
            {!user?.isLoggedIn && (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className={`px-3 py-1.5 rounded-xl ${activeFullDesign.pillBg} ${activeFullDesign.textPrimary} text-xs font-semibold`}
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        {oauthBannerError && (
          <div className="bg-red-500/15 border-b border-red-500/30 px-4 py-3 flex items-center justify-between text-red-200 text-xs font-medium shrink-0 shadow-lg z-20 animate-fade-in">
            <div className="flex items-center gap-2.5 pr-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>
                <strong className="font-bold text-red-300">Authentication Alert:</strong> {oauthBannerError}
              </span>
            </div>
            <button
              onClick={() => setOauthBannerError(null)}
              className="p-1 hover:text-white rounded text-slate-400 hover:bg-red-500/20 transition-colors shrink-0"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {activeTab === "home" && (
          <HomeView
            onPlayTrack={handlePlayTrack}
            onPlayQueue={handlePlayQueue}
            onSelectPlaylist={(pl) => {
              setSelectedPlaylist(pl);
              setActiveTab("library");
            }}
            playlists={playlists}
            user={user}
            onOpenSettings={() => setActiveTab("settings")}
            currentTrack={playerState.currentTrack}
            designConfig={activeFullDesign}
          />
        )}

        {activeTab === "search" && (
          <SearchView
            onPlayTrack={handlePlayTrack}
            onPlayQueue={handlePlayQueue}
            onAddToQueue={handleAddToQueue}
            onAddTrackToPlaylist={handleAddTrackToPlaylist}
            playlists={playlists}
            onSelectPlaylist={(pl) => {
              setSelectedPlaylist(pl);
              setActiveTab("library");
            }}
            designConfig={activeFullDesign}
          />
        )}

        {activeTab === "library" && (
          <LibraryView
            playlists={playlists}
            selectedPlaylist={selectedPlaylist}
            onSelectPlaylist={setSelectedPlaylist}
            onCreatePlaylist={() => {
              setEditingPlaylist(null);
              setIsPlaylistModalOpen(true);
            }}
            onEditPlaylist={(pl) => {
              setEditingPlaylist(pl);
              setIsPlaylistModalOpen(true);
            }}
            onDeletePlaylist={handleDeletePlaylist}
            onReorderPlaylistTracks={handleReorderPlaylistTracks}
            onRemoveTrackFromPlaylist={handleRemoveTrackFromPlaylist}
            onPlayTrack={handlePlayTrack}
            onPlayQueue={handlePlayQueue}
            currentTrackId={playerState.currentTrack?.id}
            likedTrackIds={playerState.likedTrackIds}
            currentTrack={playerState.currentTrack}
            onAddTrackToPlaylist={handleAddTrackToPlaylist}
            onSyncPlaylistTracks={handleSyncPlaylistTracks}
            designConfig={activeFullDesign}
          />
        )}

        {activeTab === "settings" && (
          <SettingsView
            settings={settings}
            onUpdateSettings={(newSet) => setSettings((prev) => ({ ...prev, ...newSet }))}
            user={user}
            onLoginSuccess={handleLoginSuccess}
            onLogout={handleLogout}
          />
        )}

        {/* Audio Player Component */}
        <Player
          playerState={playerState}
          setPlayerState={setPlayerState}
          onNextTrack={handleNextTrack}
          onPrevTrack={handlePrevTrack}
          onTogglePlay={() =>
            setPlayerState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }))
          }
          onSeek={(t) => setPlayerState((prev) => ({ ...prev, currentTime: t }))}
          onVolumeChange={(v) => setPlayerState((prev) => ({ ...prev, volume: v, isMuted: false }))}
          onToggleLike={handleToggleLike}
          isLiked={!!playerState.currentTrack && playerState.likedTrackIds.includes(playerState.currentTrack.id)}
          onPlayTrack={handlePlayTrack}
          onAddToQueue={handleAddToQueue}
          settings={settings}
        />
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} designConfig={activeFullDesign} />

      {/* Playlist Create/Edit Modal */}
      <PlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => {
          setIsPlaylistModalOpen(false);
          setEditingPlaylist(null);
        }}
        onSave={handleSavePlaylist}
        initialPlaylist={editingPlaylist}
        isYouTubeSynced={!!user?.isLoggedIn}
        designConfig={activeFullDesign}
      />

      {/* Google Login Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleLoginSuccess}
        designConfig={activeFullDesign}
      />
    </div>
  );
}
