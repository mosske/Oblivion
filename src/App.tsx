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
import { AddToPlaylistModal } from "./components/AddToPlaylistModal";
import { AuthModal } from "./components/AuthModal";
import { OblivionLogo } from "./components/OblivionLogo";
import { AlertTriangle, X, Disc3, Search, CheckCircle2, LogIn, LogOut, Check, User as UserIcon } from "lucide-react";

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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return (
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes("android-app://")
      );
    }
    return false;
  });
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState<boolean>(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [trackForAddToPlaylist, setTrackForAddToPlaylist] = useState<Track | null>(null);
  const [isSyncingYouTube, setIsSyncingYouTube] = useState<boolean>(false);
  const [isSyncingPlaylist, setIsSyncingPlaylist] = useState<boolean>(false);
  const [oauthBannerError, setOauthBannerError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    // Check if app is already running as standalone PWA
    const checkStandalone = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes("android-app://");
      setIsPwaInstalled(standalone);
    };
    checkStandalone();

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).__deferredPrompt = e;
    };

    const handleAppInstalled = () => {
      setIsPwaInstalled(true);
      setDeferredPrompt(null);
      (window as any).__deferredPrompt = null;
      showToast("🎉 Oblivion Music installed successfully!");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [isPwaInstalled]);

  const handleInstallPwa = async () => {
    const promptEvent = deferredPrompt || (window as any).__deferredPrompt;
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice && choice.outcome === "accepted") {
          setIsPwaInstalled(true);
          showToast("🎉 Oblivion Music installed successfully!");
        }
      } catch (err) {
        console.error("PWA prompt error:", err);
      }
      setDeferredPrompt(null);
      (window as any).__deferredPrompt = null;
    } else {
      if (isPwaInstalled) {
        showToast("Oblivion Music is already installed on your device!");
      } else {
        // In Safari / iOS or non-Chromium browsers
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        if (isIOS) {
          showToast("Tap the Share button (⎋) in Safari and choose 'Add to Home Screen'");
        } else {
          showToast("Tap browser menu (⋮) -> 'Install App' or 'Add to Home Screen'");
        }
      }
    }
  };

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

  // Persist selectedPlaylist & Sync with Browser History for Native Android Back Button
  useEffect(() => {
    try {
      if (selectedPlaylist) {
        localStorage.setItem("oblivion_selected_playlist", JSON.stringify(selectedPlaylist));
        // Push a state entry if not already on the playlist state
        if (!window.history.state || window.history.state.view !== "playlist_detail") {
          window.history.pushState({ view: "playlist_detail", playlistId: selectedPlaylist.id }, "");
        }
      } else {
        localStorage.removeItem("oblivion_selected_playlist");
        // If the current history state was playlist_detail, replace or pop
        if (window.history.state && window.history.state.view === "playlist_detail") {
          window.history.replaceState({ view: "main_tabs" }, "");
        }
      }
    } catch {}
  }, [selectedPlaylist]);

  // Handle native Android back button (popstate event)
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // If user pressed native back button and we are currently viewing a playlist/album, exit the view
      if (selectedPlaylist) {
        setSelectedPlaylist(null);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
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
    showToast(`Signed in as ${loggedUser.name || loggedUser.email || "Google User"}`);
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
    showToast("Signed out successfully.");
  };

  // Fetch Playlists with immediate tracks count
  const fetchPlaylists = async (forceRefresh: boolean = false) => {
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

      const url = forceRefresh ? `/api/youtube/playlists?refresh=true&_t=${Date.now()}` : "/api/youtube/playlists";
      const res = await fetch(url, { headers });
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

          const thumbs = pl.thumbnails;
          const bestThumb =
            thumbs?.maxres?.url ||
            thumbs?.standard?.url ||
            thumbs?.high?.url ||
            thumbs?.medium?.url ||
            thumbs?.default?.url;

          const primaryCover =
            userStoredCover?.customCoverUrl ||
            pl.customCoverUrl ||
            bestThumb ||
            pl.coverUrl ||
            "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80";

          sanitizedPlaylists.push({
            ...pl,
            id: plId,
            coverUrl: primaryCover,
            customCoverUrl: userStoredCover?.customCoverUrl || pl.customCoverUrl || bestThumb || primaryCover,
            isCustomCover: hasUserCustom || Boolean(pl.isCustomCover || pl.customCoverUrl),
            tracks: sanitizedTracks,
            tracksCount: pl.tracksCount || sanitizedTracks.length || 0,
            thumbnails: pl.thumbnails,
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
              const serverVidIds = new Set(
                uniqueTracks.map((t) => t.youtubeVideoId || t.id).filter(Boolean)
              );
              // Preserve any locally tracked items that might not have propagated through YouTube's API cache yet
              const localUnsynced = (p.tracks || []).filter((t) => {
                const vid = t.youtubeVideoId || t.id;
                return vid && !serverVidIds.has(vid);
              });
              const mergedTracks = [...uniqueTracks, ...localUnsynced];

              return {
                ...p,
                tracks: mergedTracks,
                tracksCount: mergedTracks.length,
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
            const serverVidIds = new Set(
              uniqueTracks.map((t) => t.youtubeVideoId || t.id).filter(Boolean)
            );
            const localUnsynced = (prev.tracks || []).filter((t) => {
              const vid = t.youtubeVideoId || t.id;
              return vid && !serverVidIds.has(vid);
            });
            const mergedTracks = [...uniqueTracks, ...localUnsynced];

            return {
              ...prev,
              tracks: mergedTracks,
              tracksCount: mergedTracks.length,
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

  // Direct quick playlist creation (e.g. from AddToPlaylist modal)
  const handleCreatePlaylist = async (title: string): Promise<Playlist | null> => {
    try {
      let activeToken = user?.accessToken;
      if (!activeToken) {
        try {
          const saved = localStorage.getItem("oblivion_saved_user");
          if (saved) activeToken = JSON.parse(saved)?.accessToken;
        } catch {}
      }
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (activeToken) headers["Authorization"] = `Bearer ${activeToken}`;

      const res = await fetch("/api/youtube/playlists", {
        method: "POST",
        headers,
        body: JSON.stringify({ title, description: "Created with Oblivion Music" }),
      });
      const data = await res.json();
      if (data.playlist) {
        setPlaylists((prev) => [data.playlist, ...prev]);
        try {
          localStorage.setItem("oblivion_saved_playlists", JSON.stringify([data.playlist, ...playlists]));
        } catch {}
        return data.playlist;
      }
    } catch (err) {
      console.error("Create playlist error:", err);
    }
    return null;
  };

  // Dedicated creation with full details, custom artwork, and instant sync to YouTube Music
  const handleCreatePlaylistWithTrack = async (
    title: string,
    description: string,
    coverUrl: string,
    track: Track
  ) => {
    const vId = (track.youtubeVideoId || track.id || "").replace(/^VL/, "");
    const cleanTrack: Track = {
      ...track,
      id: track.id || vId,
      youtubeVideoId: vId || track.youtubeVideoId,
    };

    try {
      let activeToken = user?.accessToken;
      if (!activeToken) {
        try {
          const saved = localStorage.getItem("oblivion_saved_user");
          if (saved) activeToken = JSON.parse(saved)?.accessToken;
        } catch {}
      }
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (activeToken) headers["Authorization"] = `Bearer ${activeToken}`;

      const res = await fetch("/api/youtube/playlists", {
        method: "POST",
        headers,
        body: JSON.stringify({
          title,
          description,
          coverUrl,
          customCoverUrl: coverUrl,
          isCustomCover: Boolean(coverUrl),
          track: cleanTrack,
        }),
      });
      const data = await res.json();
      if (data.playlist) {
        const createdPl: Playlist = {
          ...data.playlist,
          tracks: data.playlist.tracks?.length ? data.playlist.tracks : [cleanTrack],
          tracksCount: data.playlist.tracksCount || 1,
          coverUrl: coverUrl || data.playlist.coverUrl,
          customCoverUrl: coverUrl || data.playlist.customCoverUrl,
          isCustomCover: Boolean(coverUrl),
        };

        if (coverUrl) {
          saveCustomCoverToStorage(createdPl.id, coverUrl, true);
        }

        setPlaylists((prev) => [createdPl, ...prev]);
        try {
          localStorage.setItem("oblivion_saved_playlists", JSON.stringify([createdPl, ...playlists]));
        } catch {}

        // Extra guarantee sync to YouTube Data API
        if (createdPl.id && !createdPl.id.startsWith("pl_custom_")) {
          try {
            await fetch(`/api/youtube/playlists/${createdPl.id}/sync`, {
              method: "POST",
              headers,
              body: JSON.stringify({ tracks: [cleanTrack] }),
            });
          } catch (syncErr) {
            console.warn("YouTube playlist whole sync error on creation:", syncErr);
          }
        }

        if (data.syncedToYouTube) {
          showToast(`Created "${title}" with custom artwork & synced to YouTube Music`);
        } else {
          showToast(`Created "${title}" and added song to playlist`);
        }
      }
    } catch (err) {
      console.error("Create playlist with track error:", err);
      showToast("Error creating playlist. Please try again.");
    }
  };

  const handleOpenAddToPlaylistModal = (track: Track) => {
    setTrackForAddToPlaylist(track);
    fetchPlaylists(true); // Pull up real-time number of songs in each Playlist!
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
    const cleanPlId = playlistId.replace(/^VL/, "");
    setPlaylists((prev) => {
      const updated = prev.map((p) => {
        const pId = p.id || (p as any).playlistId;
        if (pId === playlistId || pId?.replace(/^VL/, "") === cleanPlId) {
          return { ...p, tracks: newTracks, tracksCount: newTracks.length };
        }
        return p;
      });
      try {
        localStorage.setItem("oblivion_saved_playlists", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (selectedPlaylist?.id === playlistId || (selectedPlaylist as any)?.playlistId === playlistId || selectedPlaylist?.id?.replace(/^VL/, "") === cleanPlId) {
      setSelectedPlaylist((prev) => (prev ? { ...prev, tracks: newTracks, tracksCount: newTracks.length } : null));
    }

    try {
      let activeToken = user?.accessToken;
      if (!activeToken) {
        try {
          const saved = localStorage.getItem("oblivion_saved_user");
          if (saved) activeToken = JSON.parse(saved)?.accessToken;
        } catch {}
      }
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (activeToken) headers["Authorization"] = `Bearer ${activeToken}`;

      await fetch(`/api/youtube/playlists/${playlistId}/reorder`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ tracks: newTracks }),
      });
    } catch (err) {
      console.error("Reorder tracks error:", err);
    }
  };

  // Remove Track from Playlist
  const handleRemoveTrackFromPlaylist = async (playlistId: string, trackId: string) => {
    const cleanPlId = playlistId.replace(/^VL/, "");
    const cleanTrId = trackId.trim();

    setPlaylists((prev) => {
      const updated = prev.map((p) => {
        const pId = p.id || (p as any).playlistId;
        if (pId === playlistId || pId?.replace(/^VL/, "") === cleanPlId) {
          const filtered = p.tracks.filter((t) => {
            const tId = t.id || t.youtubeVideoId || "";
            const tVid = t.youtubeVideoId || t.id || "";
            return tId !== cleanTrId && tVid !== cleanTrId && (t as any).playlistItemId !== cleanTrId;
          });
          return {
            ...p,
            tracks: filtered,
            tracksCount: filtered.length,
          };
        }
        return p;
      });
      try {
        localStorage.setItem("oblivion_saved_playlists", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (selectedPlaylist?.id === playlistId || (selectedPlaylist as any)?.playlistId === playlistId || selectedPlaylist?.id?.replace(/^VL/, "") === cleanPlId) {
      setSelectedPlaylist((prev) => {
        if (!prev) return null;
        const filtered = prev.tracks.filter((t) => {
          const tId = t.id || t.youtubeVideoId || "";
          const tVid = t.youtubeVideoId || t.id || "";
          return tId !== cleanTrId && tVid !== cleanTrId && (t as any).playlistItemId !== cleanTrId;
        });
        return {
          ...prev,
          tracks: filtered,
          tracksCount: filtered.length,
        };
      });
    }

    try {
      let activeToken = user?.accessToken;
      if (!activeToken) {
        try {
          const saved = localStorage.getItem("oblivion_saved_user");
          if (saved) activeToken = JSON.parse(saved)?.accessToken;
        } catch {}
      }
      const headers: Record<string, string> = {};
      if (activeToken) headers["Authorization"] = `Bearer ${activeToken}`;

      const res = await fetch(`/api/youtube/playlists/${playlistId}/items/${encodeURIComponent(cleanTrId)}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json();
      if (data.syncedToYouTube) {
        showToast("Removed from playlist & synced with YouTube Music");
      } else {
        showToast("Removed from playlist");
      }
    } catch (err) {
      console.error("Remove track error:", err);
      showToast("Removed from playlist");
    }
  };

  // Add Track to Playlist: EXACT 3-STEP SEQUENCE:
  // (1) IMMEDIATELY PULL ALL THE SONGS FROM THAT PLAYLIST FROM YOUTUBE MUSIC
  // (2) ADD THE NEW SONG TO THE END OF THE LIST TO INCREASE THE SONG COUNT BY 1
  // (3) IMMEDIATELY SYNC THE UPDATED LIST BACK TO YOUTUBE MUSIC
  const handleAddTrackToPlaylist = async (track: Track, playlistId: string) => {
    const rawVidId = track.youtubeVideoId || track.id || "";
    const cleanVidId = rawVidId.replace(/^VL/, "");
    if (!cleanVidId) return;

    const cleanTrack: Track = {
      ...track,
      id: track.id || cleanVidId,
      youtubeVideoId: cleanVidId,
      audioUrl: track.audioUrl || `/api/youtube/stream/${cleanVidId}`,
    };

    const cleanPlId = playlistId.replace(/^VL/, "");
    const targetPl = playlists.find(
      (p) =>
        (p.id || (p as any).playlistId) === playlistId ||
        (p.id || (p as any).playlistId)?.replace(/^VL/, "") === cleanPlId
    );
    const playlistName = targetPl?.title || "Playlist";

    let activeToken = user?.accessToken;
    if (!activeToken) {
      try {
        const saved = localStorage.getItem("oblivion_saved_user");
        if (saved) activeToken = JSON.parse(saved)?.accessToken;
      } catch {}
    }
    const authHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (activeToken) authHeaders["Authorization"] = `Bearer ${activeToken}`;

    try {
      // -------------------------------------------------------------
      // (1) IMMEDIATELY PULL ALL THE SONGS FROM THAT PLAYLIST FROM YOUTUBE MUSIC
      // -------------------------------------------------------------
      let currentSongs: Track[] = [];
      try {
        const itemsRes = await fetch(
          `/api/youtube/playlists/${encodeURIComponent(playlistId)}/items?refresh=true&force=true&_t=${Date.now()}`,
          { headers: authHeaders }
        );
        if (itemsRes.ok) {
          const itemsData = await itemsRes.json();
          if (itemsData.tracks && Array.isArray(itemsData.tracks)) {
            currentSongs = itemsData.tracks;
          }
        }
      } catch (pullErr) {
        console.warn("Pull playlist items error from YouTube Music:", pullErr);
      }

      // If network pull returned 0 but we have local tracks in memory, safely keep them
      if (currentSongs.length === 0 && targetPl?.tracks && targetPl.tracks.length > 0) {
        currentSongs = targetPl.tracks;
      }

      // -------------------------------------------------------------
      // (2) ADD THE NEW SONG TO THE END OF THE LIST TO INCREASE THE SONG COUNT BY 1
      // -------------------------------------------------------------
      // Filter out previous duplicate instance of this video if already present so it appends cleanly to the end
      const filteredExisting = currentSongs.filter((t) => {
        const tVid = (t.youtubeVideoId || t.id || "").replace(/^VL/, "");
        return tVid !== cleanVidId && t.id !== cleanTrack.id;
      });
      const updatedPlaylistTracks: Track[] = [...filteredExisting, cleanTrack];
      const newSongCount = updatedPlaylistTracks.length;

      // Update UI state & localStorage immediately with new song and incremented count
      setPlaylists((prev) => {
        const updated = prev.map((p) => {
          const pId = p.id || (p as any).playlistId;
          if (pId === playlistId || pId?.replace(/^VL/, "") === cleanPlId) {
            return {
              ...p,
              tracks: updatedPlaylistTracks,
              tracksCount: newSongCount,
            };
          }
          return p;
        });
        try {
          localStorage.setItem("oblivion_saved_playlists", JSON.stringify(updated));
        } catch {}
        return updated;
      });

      if (
        selectedPlaylist?.id === playlistId ||
        (selectedPlaylist as any)?.playlistId === playlistId ||
        selectedPlaylist?.id?.replace(/^VL/, "") === cleanPlId
      ) {
        setSelectedPlaylist((prev) =>
          prev
            ? {
                ...prev,
                tracks: updatedPlaylistTracks,
                tracksCount: newSongCount,
              }
            : null
        );
      }

      // -------------------------------------------------------------
      // (3) IMMEDIATELY COMMIT THE NEW SONG TO YOUTUBE MUSIC!
      // -------------------------------------------------------------
      const itemRes = await fetch(`/api/youtube/playlists/${encodeURIComponent(playlistId)}/items`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ track: cleanTrack }),
      });

      let syncedToYT = false;
      let returnedErrMsg = "";
      if (itemRes.ok) {
        try {
          const itemData = await itemRes.json();
          if (itemData.syncedToYouTube) syncedToYT = true;
          if (itemData.error) returnedErrMsg = itemData.error;
        } catch {}
      }

      if (syncedToYT) {
        showToast(`Added "${cleanTrack.title}" to ${playlistName} (${newSongCount} songs) & synced to YouTube Music`);
      } else if (returnedErrMsg && returnedErrMsg.toLowerCase().includes("permission")) {
        showToast(`Added "${cleanTrack.title}" to ${playlistName} (${newSongCount} songs). Note: Re-authenticate to grant YouTube write permissions.`);
      } else {
        showToast(`Added "${cleanTrack.title}" to ${playlistName} (${newSongCount} songs)`);
      }
    } catch (err) {
      console.error("Add track to playlist error:", err);
      showToast(`Added to "${playlistName}"`);
    }
  };

  // Sync / Commit changes to YouTube Music
  const handleSyncPlaylistTracks = async (playlistId: string, updatedTracks: Track[]) => {
    const cleanPlId = playlistId.replace(/^VL/, "");
    try {
      let activeToken = user?.accessToken;
      if (!activeToken) {
        try {
          const saved = localStorage.getItem("oblivion_saved_user");
          if (saved) activeToken = JSON.parse(saved)?.accessToken;
        } catch {}
      }
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (activeToken) headers["Authorization"] = `Bearer ${activeToken}`;

      const res = await fetch(`/api/youtube/playlists/${playlistId}/sync`, {
        method: "POST",
        headers,
        body: JSON.stringify({ tracks: updatedTracks }),
      });
      const data = await res.json();
      if (data.success) {
        setPlaylists((prev) => {
          const updated = prev.map((p) => {
            const pId = p.id || (p as any).playlistId;
            if (pId === playlistId || pId?.replace(/^VL/, "") === cleanPlId) {
              return {
                ...p,
                tracks: updatedTracks,
                tracksCount: updatedTracks.length,
                coverUrl: (p.isCustomCover && p.customCoverUrl) || p.customCoverUrl || p.coverUrl || updatedTracks[0]?.coverUrl,
              };
            }
            return p;
          });
          try {
            localStorage.setItem("oblivion_saved_playlists", JSON.stringify(updated));
          } catch {}
          return updated;
        });
        if (selectedPlaylist?.id === playlistId || (selectedPlaylist as any)?.playlistId === playlistId || selectedPlaylist?.id?.replace(/^VL/, "") === cleanPlId) {
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
    <div className={`flex min-h-screen w-full bg-gradient-to-b ${activeFullDesign.bgCanvas} text-slate-100 font-sans select-none`}>
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
        onInstallPwa={handleInstallPwa}
        isInstalled={isPwaInstalled}
      />

      {/* Main Content Workspace Area */}
      <main className={`flex-1 flex flex-col min-w-0 min-h-screen md:ml-64 relative bg-gradient-to-b ${activeFullDesign.bgCanvas}`}>
        {/* Top Header App Bar (Desktop + Mobile) with Search Magnifying Glass Icon Button */}
        <header className={`sticky top-0 h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6 ${activeFullDesign.headerBg} backdrop-blur-xl border-b ${activeFullDesign.borderSubtle} shrink-0 z-30 shadow-xs`}>
          <div
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => {
              setSelectedPlaylist(null);
              setActiveTab("home");
            }}
          >
            <OblivionLogo size={34} withAura animated />
            <span className={`text-sm font-bold tracking-wider ${activeFullDesign.textPrimary} font-mono`}>OBLIVION</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Top Search Button (Magnifying Glass Icon) */}
            <button
              id="top-header-search-btn"
              onClick={() => {
                setSearchQuery("");
                setSelectedPlaylist(null);
                setActiveTab("search");
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
                activeTab === "search"
                  ? `${activeFullDesign.btnPrimary} text-white shadow-md`
                  : `${activeFullDesign.btnSecondary} ${activeFullDesign.textPrimary} hover:scale-105 active:scale-95 border border-zinc-300/80`
              }`}
              title="Search music, albums, artists"
            >
              <Search className="w-4 h-4" />
              <span className="text-xs font-semibold hidden sm:inline">Search</span>
            </button>

            {/* User Auth Section: Sign-In Button OR User Portrait with Pop-up Sign Out */}
            {!user?.isLoggedIn ? (
              <button
                id="top-header-signin-btn"
                onClick={() => setIsAuthModalOpen(true)}
                className={`px-4 py-2 rounded-xl ${activeFullDesign.btnPrimary} text-white text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            ) : (
              <div className="relative">
                <button
                  id="top-header-user-avatar-btn"
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#c89b3c] shadow-md hover:scale-105 active:scale-95 transition-transform flex items-center justify-center bg-zinc-800 focus:outline-none ring-2 ring-[#c89b3c]/30"
                  title={user.name || user.email || "Account Profile"}
                >
                  {user.picture ? (
                    <img src={user.picture} alt={user.name || "User"} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-white">{(user.name || user.email || "U")[0].toUpperCase()}</span>
                  )}
                </button>

                {/* Account Pop-Up Window */}
                {isUserMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsUserMenuOpen(false)}
                    />
                    <div className={`absolute right-0 top-12 z-50 w-72 bg-white border border-zinc-200 rounded-3xl shadow-2xl p-5 space-y-4 animate-fade-in text-left select-none ring-1 ring-black/5`}>
                      {/* Header with Close X */}
                      <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
                          Account Profile
                        </span>
                        <button
                          onClick={() => setIsUserMenuOpen(false)}
                          className="p-1 rounded-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                          title="Close"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* User Info */}
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-zinc-300 shrink-0 shadow-sm bg-zinc-800 flex items-center justify-center">
                          {user.picture ? (
                            <img src={user.picture} alt={user.name || "User"} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-bold text-white">{(user.name || user.email || "U")[0].toUpperCase()}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-zinc-900 truncate">{user.name || "Google User"}</h4>
                          <p className="text-xs text-zinc-600 truncate font-medium">{user.email}</p>
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold border border-emerald-300">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                            YouTube Synced
                          </span>
                        </div>
                      </div>

                      {/* Sign Out Button */}
                      <button
                        id="user-menu-signout-btn"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full py-2.5 px-4 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-700 font-bold text-xs rounded-2xl border border-red-200 flex items-center justify-center gap-2 transition-all shadow-sm hover:scale-[1.02]"
                      >
                        <LogOut className="w-4 h-4 text-red-600" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
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
            onBack={() => {
              if (window.history.state && window.history.state.view === "playlist_detail") {
                window.history.back();
              } else {
                setSelectedPlaylist(null);
              }
            }}
            onPlayTrack={handlePlayTrack}
            onPlayQueue={handlePlayQueue}
            onAddToQueue={handleAddToQueue}
            onAddTrackToPlaylist={handleAddTrackToPlaylist}
            onOpenAddToPlaylistModal={handleOpenAddToPlaylistModal}
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
                onQueryChange={setSearchQuery}
                onPlayTrack={handlePlayTrack}
                onPlayQueue={handlePlayQueue}
                onAddToQueue={handleAddToQueue}
                onAddTrackToPlaylist={handleAddTrackToPlaylist}
                onOpenAddToPlaylistModal={handleOpenAddToPlaylistModal}
                playlists={playlists}
                onSelectPlaylist={(pl) => setSelectedPlaylist(pl)}
                designConfig={activeFullDesign}
                currentTrackId={playerState.currentTrack?.id || playerState.currentTrack?.youtubeVideoId}
                currentTrack={playerState.currentTrack}
                isPlaying={playerState.isPlaying}
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
                designConfig={activeFullDesign}
                deferredPrompt={deferredPrompt}
                onInstallPwa={handleInstallPwa}
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
        onOpenAddToPlaylistModal={handleOpenAddToPlaylistModal}
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

      {/* Dedicated Add To Playlist Dialog Window */}
      <AddToPlaylistModal
        isOpen={Boolean(trackForAddToPlaylist)}
        track={trackForAddToPlaylist}
        playlists={playlists}
        onClose={() => setTrackForAddToPlaylist(null)}
        onSelectPlaylist={handleAddTrackToPlaylist}
        onCreatePlaylist={handleCreatePlaylist}
        onCreatePlaylistWithTrack={handleCreatePlaylistWithTrack}
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
