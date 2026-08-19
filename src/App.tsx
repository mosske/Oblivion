import React, { useEffect, useState } from "react";
import { User, Playlist, Track, PlayerState, UserSettings, NavTab } from "./types";
import { FULL_APP_DESIGNS } from "./utils/appDesignThemes";
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
import { AlertTriangle, X, Disc3, Search, CheckCircle2 } from "lucide-react";

// Helpers to read and write user-customized covers persistently
const getStoredCustomCovers = (): Record<string, { customCoverUrl: string; isCustomCover: boolean }> => {
  try {
    const raw = localStorage.getItem("oblivion_playlist_custom_covers");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveCustomCoverToStorage = (playlistId: string, customCoverUrl: string, isCustom: boolean) => {
  try {
    const existing = getStoredCustomCovers();
    existing[playlistId] = { customCoverUrl, isCustomCover: isCustom };
    localStorage.setItem("oblivion_playlist_custom_covers", JSON.stringify(existing));
  } catch {}
};

export default function App() {
  // Persistent activeTab state
  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    try {
      const saved = localStorage.getItem("oblivion_active_tab");
      if (saved && ["home", "explore", "search", "library", "settings"].includes(saved)) {
        return saved as NavTab;
      }
    } catch {}
    return "home";
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };
  
  // Persistent user state - remains signed in until explicit sign out
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem("oblivion_saved_user");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.name || parsed.email)) {
          return { ...parsed, isLoggedIn: true };
        }
      }
    } catch (err) {
      console.error("Error reading saved user:", err);
    }
    return null;
  });

  // Persistent playlists state
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      const saved = localStorage.getItem("oblivion_saved_playlists");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  // Persistent selectedPlaylist state so user stays in the playlist they were viewing
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(() => {
    try {
      const saved = localStorage.getItem("oblivion_selected_playlist");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.id || parsed.title)) return parsed;
      }
    } catch {}
    return null;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState<boolean>(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [isSyncingYouTube, setIsSyncingYouTube] = useState<boolean>(false);
  const [isSyncingPlaylist, setIsSyncingPlaylist] = useState<boolean>(false);
  const [oauthBannerError, setOauthBannerError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

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
          backgroundPlay: parsed.backgroundPlay ?? true,
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
      backgroundPlay: true,
    };
  });

  const activeFullDesign = FULL_APP_DESIGNS[settings.fullAppDesign || "designer"] || FULL_APP_DESIGNS["designer"];

  // Save settings whenever updated
  useEffect(() => {
    try {
      localStorage.setItem("oblivion_user_settings", JSON.stringify(settings));
    } catch {}
  }, [settings]);

  // Persist activeTab
  useEffect(() => {
    try {
      localStorage.setItem("oblivion_active_tab", activeTab);
    } catch {}
  }, [activeTab]);

  // Persist selectedPlaylist
  useEffect(() => {
    try {
      if (selectedPlaylist) {
        localStorage.setItem("oblivion_selected_playlist", JSON.stringify(selectedPlaylist));
      } else {
        localStorage.removeItem("oblivion_selected_playlist");
      }
    } catch {}
  }, [selectedPlaylist]);

  // Persistent player state
  const [playerState, setPlayerState] = useState<PlayerState>(() => {
    const defaultState: PlayerState = {
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
    };
    try {
      const saved = localStorage.getItem("oblivion_saved_player_state");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.currentTrack) {
          return {
            ...defaultState,
            currentTrack: parsed.currentTrack,
            queue: parsed.queue && parsed.queue.length > 0 ? parsed.queue : [parsed.currentTrack],
            queueIndex: parsed.queueIndex || 0,
            currentTime: parsed.currentTime || 0,
            duration: parsed.duration || parsed.currentTrack.duration || 0,
            volume: parsed.volume ?? 0.8,
            repeatMode: parsed.repeatMode || "off",
            isShuffle: parsed.isShuffle || false,
            likedTrackIds: parsed.likedTrackIds || [],
            isPlaying: false,
          };
        }
      }
    } catch {}
    return defaultState;
  });

  // Save player state changes to localStorage
  useEffect(() => {
    try {
      if (playerState.currentTrack) {
        localStorage.setItem(
          "oblivion_saved_player_state",
          JSON.stringify({
            currentTrack: playerState.currentTrack,
            queue: playerState.queue,
            queueIndex: playerState.queueIndex,
            currentTime: playerState.currentTime,
            duration: playerState.duration,
            volume: playerState.volume,
            repeatMode: playerState.repeatMode,
            isShuffle: playerState.isShuffle,
            likedTrackIds: playerState.likedTrackIds,
          })
        );
      }
    } catch {}
  }, [
    playerState.currentTrack?.id,
    playerState.queue.length,
    playerState.queueIndex,
    playerState.volume,
    playerState.repeatMode,
    playerState.isShuffle,
    playerState.likedTrackIds.length,
  ]);

  // Save user changes to localStorage to keep user signed in
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

  // Fetch Playlists with immediate tracks count
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
        const customCoversMap = getStoredCustomCovers();

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

          const userStoredCover = customCoversMap[plId];
          const hasUserCustom = Boolean(userStoredCover?.customCoverUrl);

          const primaryCover =
            userStoredCover?.customCoverUrl ||
            pl.customCoverUrl ||
            pl.coverUrl ||
            (sanitizedTracks[0]?.coverUrl ?? "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80");

          sanitizedPlaylists.push({
            ...pl,
            id: plId,
            coverUrl: primaryCover,
            customCoverUrl: userStoredCover?.customCoverUrl || pl.customCoverUrl || pl.coverUrl || primaryCover,
            isCustomCover: hasUserCustom || Boolean(pl.isCustomCover || pl.customCoverUrl),
            tracks: sanitizedTracks,
            tracksCount: pl.tracksCount || sanitizedTracks.length || 0,
          });
        }

        setPlaylists(sanitizedPlaylists);
        try {
          localStorage.setItem("oblivion_saved_playlists", JSON.stringify(sanitizedPlaylists));
        } catch {}

        // Sync currently viewed playlist if one is open
        setSelectedPlaylist((prev) => {
          if (!prev) return null;
          const match = sanitizedPlaylists.find((p) => p.id === prev.id);
          return match ? { ...prev, ...match } : prev;
        });

        // Preload default track if queue is empty
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

  // Fetch playlist or album details & tracks from YouTube Music with live sync check
  const fetchPlaylistDetails = async (playlistId: string, title = "", artist = "", forceRefresh = true) => {
    if (!playlistId) return;
    setIsSyncingPlaylist(true);
    const cleanId = playlistId.replace(/^VL/, "");
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

      const qTitle = encodeURIComponent(title || selectedPlaylist?.title || "");
      const qArtist = encodeURIComponent(artist || (selectedPlaylist as any)?.artist || selectedPlaylist?.description || "");
      const isAlb = Boolean((selectedPlaylist as any)?.isAlbum || (selectedPlaylist as any)?.artist || playlistId.startsWith("MPREb_") || playlistId.startsWith("OLAK5uy_"));
      const qType = isAlb ? "album" : "playlist";
      const refreshParam = forceRefresh ? "&refresh=true" : "";

      const res = await fetch(
        `/api/youtube/playlists/${playlistId}/items?title=${qTitle}&artist=${qArtist}&type=${qType}${refreshParam}&_t=${Date.now()}`,
        { headers }
      );
      const data = await res.json();
      if (data.tracks && Array.isArray(data.tracks)) {
        const uniqueTracks: Track[] = data.tracks
          .filter(Boolean)
          .map((t: any, idx: number) => {
            const vidId = t.youtubeVideoId || t.id;
            return {
              ...t,
              id: t.id ? String(t.id) : (vidId ? `${vidId}_${idx}` : `track_${idx}`),
              youtubeVideoId: vidId || t.id,
            };
          });

        const customCoversMap = getStoredCustomCovers();
        const userStoredCover = customCoversMap[playlistId] || customCoversMap[cleanId];

        const customCover = userStoredCover?.customCoverUrl || data.customCoverUrl || data.coverUrl;
        const isCustom = Boolean(userStoredCover?.isCustomCover || data.isCustomCover || data.customCoverUrl || customCover);

        setPlaylists((prev) => {
          const updated = prev.map((p) => {
            const pClean = (p.id || p.playlistId || "").replace(/^VL/, "");
            if (p.id === playlistId || p.playlistId === playlistId || pClean === cleanId) {
              return {
                ...p,
                tracks: uniqueTracks,
                tracksCount: uniqueTracks.length,
                coverUrl: userStoredCover?.customCoverUrl || p.customCoverUrl || customCover || p.coverUrl,
                customCoverUrl: userStoredCover?.customCoverUrl || p.customCoverUrl || customCover || p.coverUrl,
                isCustomCover: isCustom || p.isCustomCover,
              };
            }
            return p;
          });
          try {
            localStorage.setItem("oblivion_saved_playlists", JSON.stringify(updated));
          } catch {}
          return updated;
        });

        setSelectedPlaylist((prev) => {
          if (!prev) return null;
          const prevClean = (prev.id || prev.playlistId || "").replace(/^VL/, "");
          if (prev.id === playlistId || prev.playlistId === playlistId || prevClean === cleanId) {
            return {
              ...prev,
              tracks: uniqueTracks,
              tracksCount: uniqueTracks.length,
              coverUrl: userStoredCover?.customCoverUrl || (prev as any).customCoverUrl || customCover || prev.coverUrl,
              customCoverUrl: userStoredCover?.customCoverUrl || (prev as any).customCoverUrl || customCover || prev.coverUrl,
              isCustomCover: isCustom || (prev as any).isCustomCover,
            };
          }
          return prev;
        });
      }
    } catch (err) {
      console.error("Fetch playlist details error:", err);
    } finally {
      setIsSyncingPlaylist(false);
    }
  };

  // When a Playlist or Album is opened, immediately perform a live sync check with YouTube Music
  useEffect(() => {
    if (selectedPlaylist?.id) {
      fetchPlaylistDetails(
        selectedPlaylist.id,
        selectedPlaylist.title,
        (selectedPlaylist as any).artist || selectedPlaylist.description
      );
    }
  }, [selectedPlaylist?.id]);

  // Immediate Auto-play single track
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
        currentTime: 0,
        queue: newQueue,
        queueIndex: newIdx >= 0 ? newIdx : 0,
        isPlaying: true,
      };
    });
  };

  // Immediate Auto-play queue
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
      currentTime: 0,
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

  // Next Track with immediate auto-play and full Shuffle support
  const handleNextTrack = () => {
    setPlayerState((prev) => {
      if (prev.queue.length === 0) return prev;
      let nextIndex: number;
      if (prev.isShuffle && prev.queue.length > 1) {
        let rand = Math.floor(Math.random() * prev.queue.length);
        if (rand === prev.queueIndex) {
          rand = (rand + 1) % prev.queue.length;
        }
        nextIndex = rand;
      } else {
        nextIndex = prev.queueIndex + 1;
        if (nextIndex >= prev.queue.length) {
          nextIndex = 0;
        }
      }
      return {
        ...prev,
        queueIndex: nextIndex,
        currentTrack: prev.queue[nextIndex],
        currentTime: 0,
        isPlaying: true,
      };
    });
  };

  // Previous Track with immediate auto-play and full Shuffle support
  const handlePrevTrack = () => {
    setPlayerState((prev) => {
      if (prev.queue.length === 0) return prev;
      let prevIndex: number;
      if (prev.isShuffle && prev.queue.length > 1) {
        let rand = Math.floor(Math.random() * prev.queue.length);
        if (rand === prev.queueIndex) {
          rand = (rand - 1 + prev.queue.length) % prev.queue.length;
        }
        prevIndex = rand;
      } else {
        prevIndex = prev.queueIndex - 1;
        if (prevIndex < 0) {
          prevIndex = prev.queue.length - 1;
        }
      }
      return {
        ...prev,
        queueIndex: prevIndex,
        currentTrack: prev.queue[prevIndex],
        currentTime: 0,
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
      if (coverUrl) {
        saveCustomCoverToStorage(editingPlaylist.id, coverUrl, true);
      }
      try {
        const res = await fetch(`/api/youtube/playlists/${editingPlaylist.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description, coverUrl, customCoverUrl: coverUrl, isCustomCover: true }),
        });
        const data = await res.json();
        if (data.success) {
          setPlaylists((prev) =>
            prev.map((p) =>
              p.id === editingPlaylist.id ? { ...p, title, description, coverUrl, customCoverUrl: coverUrl, isCustomCover: true } : p
            )
          );
          if (selectedPlaylist?.id === editingPlaylist.id) {
            setSelectedPlaylist((prev) => (prev ? { ...prev, title, description, coverUrl, customCoverUrl: coverUrl, isCustomCover: true } : null));
          }
        }
      } catch (err) {
        console.error("Update playlist error:", err);
      }
    } else {
      try {
        const res = await fetch("/api/youtube/playlists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description, coverUrl, customCoverUrl: coverUrl, isCustomCover: Boolean(coverUrl) }),
        });
        const data = await res.json();
        if (data.playlist) {
          if (coverUrl) {
            saveCustomCoverToStorage(data.playlist.id, coverUrl, true);
          }
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

  // Update Custom Playlist Cover
  const handleUpdatePlaylistCover = async (playlistId: string, newCoverUrl: string, isCustom: boolean) => {
    saveCustomCoverToStorage(playlistId, newCoverUrl, isCustom);
    setPlaylists((prev) => {
      const updated = prev.map((p) =>
        p.id === playlistId
          ? {
              ...p,
              coverUrl: newCoverUrl,
              customCoverUrl: newCoverUrl,
              isCustomCover: isCustom,
            }
          : p
      );
      try {
        localStorage.setItem("oblivion_saved_playlists", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (selectedPlaylist?.id === playlistId) {
      setSelectedPlaylist((prev) =>
        prev
          ? {
              ...prev,
              coverUrl: newCoverUrl,
              customCoverUrl: newCoverUrl,
              isCustomCover: isCustom,
            }
          : null
      );
    }

    try {
      await fetch(`/api/youtube/playlists/${playlistId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coverUrl: newCoverUrl,
          customCoverUrl: newCoverUrl,
          isCustomCover: isCustom,
        }),
      });
    } catch (err) {
      console.error("Update custom playlist cover error:", err);
    }
  };

  // Reorder Tracks inside Playlist
  const handleReorderPlaylistTracks = async (playlistId: string, newTracks: Track[]) => {
    setPlaylists((prev) =>
      prev.map((p) => (p.id === playlistId ? { ...p, tracks: newTracks, tracksCount: newTracks.length } : p))
    );
    if (selectedPlaylist?.id === playlistId) {
      setSelectedPlaylist((prev) => (prev ? { ...prev, tracks: newTracks, tracksCount: newTracks.length } : null));
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
      prev.map((p) => {
        if (p.id === playlistId) {
          const updated = p.tracks.filter((t) => t.id !== trackId);
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
        const updated = prev.tracks.filter((t) => t.id !== trackId);
        return {
          ...prev,
          tracks: updated,
          tracksCount: updated.length,
        };
      });
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
    const targetPl = playlists.find((p) => p.id === playlistId || (p as any).playlistId === playlistId);
    const playlistName = targetPl?.title || "Playlist";

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
        showToast(`Added to ${playlistName} Playlist`);
      }
    } catch (err) {
      console.error("Add track error:", err);
    }
  };

  // Sync / Commit changes to YouTube Music
  const handleSyncPlaylistTracks = async (playlistId: string, updatedTracks: Track[]) => {
    try {
      const res = await fetch(`/api/youtube/playlists/${playlistId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracks: updatedTracks }),
      });
      const data = await res.json();
      if (data.success) {
        setPlaylists((prev) => {
          const updated = prev.map((p) =>
            p.id === playlistId
              ? {
                  ...p,
                  tracks: updatedTracks,
                  tracksCount: updatedTracks.length,
                  coverUrl: (p.isCustomCover && p.customCoverUrl) || p.customCoverUrl || p.coverUrl || updatedTracks[0]?.coverUrl,
                }
              : p
          );
          try {
            localStorage.setItem("oblivion_saved_playlists", JSON.stringify(updated));
          } catch {}
          return updated;
        });
        if (selectedPlaylist?.id === playlistId) {
          setSelectedPlaylist((prev) =>
            prev
              ? {
                  ...prev,
                  tracks: updatedTracks,
                  tracksCount: updatedTracks.length,
                  coverUrl: ((prev as any).isCustomCover && (prev as any).customCoverUrl) || (prev as any).customCoverUrl || prev.coverUrl || updatedTracks[0]?.coverUrl,
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
        setActiveTab={(tab) => {
          setSelectedPlaylist(null);
          setActiveTab(tab);
        }}
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
        {/* Top Header App Bar (Desktop + Mobile) with Search Magnifying Glass Icon Button */}
        <header className={`flex items-center justify-between px-4 sm:px-6 py-3 ${activeFullDesign.headerBg} backdrop-blur-xl border-b ${activeFullDesign.borderSubtle} shrink-0 z-20`}>
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => {
              setSelectedPlaylist(null);
              setActiveTab("home");
            }}
          >
            <div className={`w-8 h-8 rounded-xl ${activeFullDesign.btnPrimary} p-0.5 flex items-center justify-center shadow-md`}>
              <div className={`w-full h-full ${activeFullDesign.isLight ? "bg-[#f5f2eb]" : "bg-slate-950"} rounded-[10px] flex items-center justify-center`}>
                <Disc3 className={`w-4 h-4 ${activeFullDesign.accentText}`} />
              </div>
            </div>
            <span className={`text-sm font-bold tracking-wider ${activeFullDesign.textPrimary} font-mono`}>OBLIVION</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Top Search Button (Magnifying Glass Icon) */}
            <button
              id="top-header-search-btn"
              onClick={() => {
                setSelectedPlaylist(null);
                setActiveTab("search");
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
                activeTab === "search"
                  ? `${activeFullDesign.btnPrimary} shadow-md`
                  : `${activeFullDesign.btnSecondary} ${activeFullDesign.textPrimary} hover:scale-105 active:scale-95`
              }`}
              title="Search music, albums, artists"
            >
              <Search className="w-4 h-4" />
              <span className="text-xs font-semibold hidden sm:inline">Search</span>
            </button>

            {!user?.isLoggedIn && (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className={`px-3 py-1.5 rounded-xl ${activeFullDesign.pillBg} ${activeFullDesign.textPrimary} text-xs font-semibold hover:scale-105 active:scale-95 transition-transform`}
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        {/* Global Toast Notification */}
        {toastMessage && (
          <div className="fixed top-16 right-4 sm:right-8 z-50 animate-bounce">
            <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl ${activeFullDesign.cardBg} border ${activeFullDesign.accentBorder} shadow-2xl backdrop-blur-xl text-xs font-bold ${activeFullDesign.textPrimary}`}>
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          </div>
        )}

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

        {/* Fresh Screen: When a Playlist or Album is clicked, open PlaylistDetailView as a dedicated screen */}
        {selectedPlaylist ? (
          <PlaylistDetailView
            item={selectedPlaylist}
            isAlbum={Boolean(
              (selectedPlaylist as any).isAlbum ||
              (selectedPlaylist as any).artist ||
              (selectedPlaylist.description && selectedPlaylist.description.toLowerCase().includes("album")) ||
              selectedPlaylist.id?.startsWith("MPREb_") ||
              selectedPlaylist.id?.startsWith("OLAK5uy_")
            )}
            onBack={() => setSelectedPlaylist(null)}
            onPlayTrack={handlePlayTrack}
            onPlayQueue={handlePlayQueue}
            onAddToQueue={handleAddToQueue}
            onAddTrackToPlaylist={handleAddTrackToPlaylist}
            onEditPlaylist={(pl) => {
              setEditingPlaylist(pl);
              setIsPlaylistModalOpen(true);
            }}
            onUpdateCover={(newCoverUrl, isCustom) =>
              handleUpdatePlaylistCover(selectedPlaylist.id, newCoverUrl, isCustom)
            }
            currentTrackId={playerState.currentTrack?.id}
            isPlaying={playerState.isPlaying}
            playlists={playlists}
            isShuffle={playerState.isShuffle}
            onToggleShuffle={() => setPlayerState((prev) => ({ ...prev, isShuffle: !prev.isShuffle }))}
            repeatMode={playerState.repeatMode}
            onToggleRepeat={() =>
              setPlayerState((prev) => ({
                ...prev,
                repeatMode:
                  prev.repeatMode === "off" ? "all" : prev.repeatMode === "all" ? "one" : "off",
              }))
            }
            onReorderTracks={(newTracks) => handleReorderPlaylistTracks(selectedPlaylist.id, newTracks)}
            onRemoveTrack={(trackId) => handleRemoveTrackFromPlaylist(selectedPlaylist.id, trackId)}
            onSyncToYouTube={(updatedTracks) => handleSyncPlaylistTracks(selectedPlaylist.id, updatedTracks)}
            isSyncingLive={isSyncingPlaylist}
            onSyncLive={() =>
              fetchPlaylistDetails(
                selectedPlaylist.id,
                selectedPlaylist.title,
                (selectedPlaylist as any).artist || selectedPlaylist.description
              )
            }
            designConfig={activeFullDesign}
          />
        ) : (
          <>
            {activeTab === "home" && (
              <HomeView
                onPlayTrack={handlePlayTrack}
                onPlayQueue={handlePlayQueue}
                onSelectPlaylist={(pl) => setSelectedPlaylist(pl)}
                onSelectAlbum={(alb: any) =>
                  setSelectedPlaylist({
                    ...alb,
                    id: alb.id,
                    title: alb.title,
                    artist: alb.artist,
                    coverUrl: alb.coverUrl,
                    isAlbum: true,
                    tracks: alb.tracks || [],
                    tracksCount: alb.tracksCount || (alb.tracks ? alb.tracks.length : 0),
                  })
                }
                playlists={playlists}
                user={user}
                onOpenSettings={() => setActiveTab("settings")}
                currentTrack={playerState.currentTrack}
                designConfig={activeFullDesign}
              />
            )}

            {activeTab === "explore" && (
              <ExploreView
                onPlayTrack={handlePlayTrack}
                onPlayQueue={handlePlayQueue}
                onSelectAlbum={(alb: any) => setSelectedPlaylist(alb)}
                onSearchGenre={(genreQuery) => {
                  setSelectedPlaylist(null);
                  setSearchQuery(genreQuery);
                  setActiveTab("search");
                }}
                currentTrackId={playerState.currentTrack?.id}
                isPlaying={playerState.isPlaying}
                designConfig={activeFullDesign}
              />
            )}

            {activeTab === "search" && (
              <SearchView
                initialQuery={searchQuery}
                onPlayTrack={handlePlayTrack}
                onPlayQueue={handlePlayQueue}
                onAddToQueue={handleAddToQueue}
                onAddTrackToPlaylist={handleAddTrackToPlaylist}
                playlists={playlists}
                onSelectPlaylist={(pl) => setSelectedPlaylist(pl)}
                designConfig={activeFullDesign}
              />
            )}

            {activeTab === "library" && (
              <LibraryView
                playlists={playlists}
                selectedPlaylist={null}
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
                isSyncingYouTube={isSyncingYouTube}
                onSyncYouTube={fetchPlaylists}
                user={user}
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
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
          </>
        )}
      </main>

      {/* Permanent Root Audio Player Fixture - Uneffected by Page & View Navigation */}
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
        playlists={playlists}
        onAddTrackToPlaylist={handleAddTrackToPlaylist}
        designConfig={activeFullDesign}
      />

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setSelectedPlaylist(null);
          setActiveTab(tab);
        }}
        designConfig={activeFullDesign}
      />

      {/* Playlist Create/Edit Modal with Custom YouTube Images */}
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
