import React, { useEffect, useState, useRef, useCallback } from "react";
import { User, Playlist, Track, PlayerState, UserSettings, NavTab } from "./types";
import { FULL_APP_DESIGNS, syncDocumentThemeColor } from "./utils/appDesignThemes";
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
import { CandylandFallingSweets } from "./components/CandylandFallingSweets";
import { NebulaLiquidBackground } from "./components/NebulaLiquidBackground";
import { DesignerTrapezoidBackground } from "./components/DesignerTrapezoidBackground";
import { EqualizerProvider } from "./context/EqualizerContext";
import {
  getCachedPlaylistsFromDB,
  savePlaylistsToDBCache,
  getCustomCoversFromCache,
  saveCustomCoverToCache,
  savePlaylistTracksToDBCache,
  deletePlaylistFromDb,
} from "./utils/playlistDb";
import {
  getCustomPlaylistCovers,
  setCustomPlaylistCover,
  resolvePlaylistCoverUrl,
  getPlaylistCustomArtwork,
  setPlaylistCustomArtwork,
  isAuthenticCustomArtworkUrl,
  isVideoThumbnailUrl,
  syncCustomCoversFromServer,
  removePlaylistCustomArtwork,
} from "./utils/customCoversStorage";
import {
  getPlaylistArtwork,
  fetchServerCustomArtwork,
  saveCustomArtwork,
  deleteCustomArtwork,
  stitchCustomArtworkToPlaylists,
  reorderPlaylistTracks,
  getCachedPlaylists,
  setCachedPlaylists,
  getCachedPlaylistTracks,
  setCachedPlaylistTracks,
  mergePlaylists,
  OBLIVION_PLAYLIST_CACHE_KEY,
} from "./services/playlistService";
import {
  getStoredAuthToken,
  getStoredUserSession,
  setStoredAuth,
  clearStoredAuth,
  OBLIVION_AUTH_TOKEN_KEY,
  OBLIVION_USER_SESSION_KEY,
} from "./services/authService";
import { Navbar } from "./components/Navbar";
import { AlertTriangle, X, Disc3, Search, CheckCircle2, LogIn, LogOut, Check, User as UserIcon } from "lucide-react";

export function isValidPlaylistId(id: string | undefined | null): boolean {
  if (!id || typeof id !== "string") return false;
  const clean = id.trim().replace(/^VL/, "");
  if (!clean || clean.length < 3) return false;
  if (clean.length === 11 && !clean.startsWith("PL")) return false;
  if (clean === "LL" || clean === "LM" || clean === "WL" || clean === "HL") return false;
  if (clean.startsWith("FE")) return false;
  if (clean.startsWith("UC") && clean.length === 24) return false;
  if (
    clean.startsWith("PL") ||
    clean.startsWith("PLS") ||
    clean.startsWith("OLAK5uy_") ||
    clean.startsWith("RD") ||
    clean.startsWith("MPREb_") ||
    clean.startsWith("FL") ||
    clean.startsWith("UU") ||
    clean.startsWith("pl_custom_")
  ) {
    return true;
  }
  if (clean.length >= 12 && /^[a-zA-Z0-9_-]+$/.test(clean)) {
    return true;
  }
  return false;
}

// Global auth expiry and token update handler callback registrations
let globalAuthExpiryHandler: (() => void) | null = null;
let globalTokenUpdateHandler: ((newToken: string, userObj?: any) => void) | null = null;
let activeRefreshPromise: Promise<string | null> | null = null;

// In-Memory Auth & Interceptor Guard State imported from authService to prevent circular dependencies
import {
  setInMemoryAuth,
  getInMemoryToken,
  getInMemoryUser,
  setIsAuthenticatingGlobal,
  getIsAuthenticatingGlobal,
} from "./services/authService";

export {
  setInMemoryAuth,
  getInMemoryToken,
  getInMemoryUser,
  setIsAuthenticatingGlobal,
  getIsAuthenticatingGlobal,
};

// Silent background token refresh mechanism
export async function performSilentRefresh(): Promise<string | null> {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    try {
      let activeToken = getInMemoryToken() || "";
      if (!activeToken) {
        try {
          const savedUser = localStorage.getItem("oblivion_saved_user");
          if (savedUser) {
            const parsed = JSON.parse(savedUser);
            activeToken = parsed?.accessToken || "";
          }
        } catch {}
      }

      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({ token: activeToken }),
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.success && data?.accessToken) {
          const newToken = data.accessToken;
          setInMemoryAuth(newToken, data.user || null);
          try {
            const savedUser = localStorage.getItem("oblivion_saved_user");
            if (savedUser) {
              const parsed = JSON.parse(savedUser);
              const updated = {
                ...parsed,
                ...(data.user || {}),
                accessToken: newToken,
                isLoggedIn: true,
                tokenRefreshedAt: Date.now(),
              };
              localStorage.setItem("oblivion_saved_user", JSON.stringify(updated));
            }
          } catch {}

          if (globalTokenUpdateHandler) {
            globalTokenUpdateHandler(newToken, data.user);
          }
          return newToken;
        }
      }
      // If refresh could not generate a new token, preserve the user's active session without disruption
      return null;
    } catch (err) {
      console.log("[Auth] Silent refresh network notice (session preserved):", err);
      return null;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

// Resilient client fetch helper with automatic retry, silent refresh, and selective auth interceptor
async function safeClientFetch(
  url: string,
  options: RequestInit = {},
  retries = 2,
  backoffMs = 800
): Promise<Response | null> {
  let lastError: any = null;
  let didAttemptRefresh = false;

  // Clone headers and inject current in-memory bearer token immediately
  const activeToken = getInMemoryToken();
  const baseHeaders = new Headers(options.headers || {});
  if (activeToken && !baseHeaders.has("Authorization")) {
    baseHeaders.set("Authorization", `Bearer ${activeToken}`);
    baseHeaders.set("X-Access-Token", activeToken);
  }
  const mergedOptions: RequestInit = {
    ...options,
    headers: baseHeaders,
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, mergedOptions);

      // Check if server returned a refreshed access token in the response headers
      if (res && res.headers) {
        const newServerToken = res.headers.get("x-new-access-token");
        if (newServerToken && newServerToken !== activeToken) {
          setInMemoryAuth(newServerToken);
          try {
            const saved = localStorage.getItem("oblivion_saved_user");
            if (saved) {
              const parsed = JSON.parse(saved);
              const updated = { ...parsed, accessToken: newServerToken };
              localStorage.setItem("oblivion_saved_user", JSON.stringify(updated));
            }
          } catch {}
          if (globalTokenUpdateHandler) {
            globalTokenUpdateHandler(newServerToken);
          }
        }
      }

      // Only 401 Unauthorized or 403 Forbidden trigger auth consideration
      if (res && (res.status === 401 || res.status === 403)) {
        // If authentication is in progress, do not trigger false auth expiry popups
        if (getIsAuthenticatingGlobal()) {
          return res;
        }

        // For endpoints: attempt silent background token refresh once before returning
        if (!didAttemptRefresh && !url.includes("/api/auth/refresh") && !url.includes("/api/auth/logout")) {
          didAttemptRefresh = true;
          const newToken = await performSilentRefresh();
          if (newToken) {
            // Clone and update headers with the fresh token
            const updatedHeaders = new Headers(mergedOptions.headers || {});
            updatedHeaders.set("Authorization", `Bearer ${newToken}`);
            updatedHeaders.set("X-Access-Token", newToken);
            const retryRes = await fetch(url, { ...mergedOptions, headers: updatedHeaders });
            return retryRes;
          }
        }
      }

      return res;
    } catch (err: any) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, backoffMs * (attempt + 1)));
      }
    }
  }

  console.warn(`[Network Notice] Fetch to ${url.split("?")[0]} deferred:`, lastError?.message || lastError);
  return null;
}

export default function App() {
  // Purge any stale legacy local cover cache on mount
  useEffect(() => {
    try {
      localStorage.removeItem("oblivion_playlist_custom_covers");
    } catch {}
  }, []);

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
  
  // Persistent user state - remains signed in perpetually until explicit sign out
  const [user, setUser] = useState<User | null>(() => {
    const session = getStoredUserSession();
    if (session) {
      setInMemoryAuth(session.accessToken || null, session);
      return session;
    }
    return null;
  });

  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  const getAuthHeaders = (): Record<string, string> => {
    let activeToken = user?.accessToken || getStoredAuthToken() || getInMemoryToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (activeToken) {
      headers["Authorization"] = `Bearer ${activeToken}`;
      headers["X-Access-Token"] = activeToken;
    }
    return headers;
  };

  // Persistent playlists state - loaded immediately from perpetual OBLIVION_PLAYLIST_CACHE
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      const cached = getCachedPlaylists();
      if (Array.isArray(cached) && cached.length > 0) {
        return cached.filter((p) => p && p.id && isValidPlaylistId(p.id) && !p.id.startsWith("mix_"));
      }
    } catch {}
    return [];
  });

  // Tab view stack for restoring exact open Playlist/Album when switching tabs (Home, Explore, Library, Search)
  const [tabViewStack, setTabViewStack] = useState<Record<string, Playlist | null>>(() => {
    try {
      const saved = localStorage.getItem("oblivion_tab_view_stack");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch {}
    try {
      const legacy = localStorage.getItem("oblivion_selected_playlist");
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (parsed && (parsed.id || parsed.title)) {
          const tab = localStorage.getItem("oblivion_active_tab") || "library";
          return { [tab]: parsed };
        }
      }
    } catch {}
    return { home: null, explore: null, search: null, library: null, settings: null };
  });

  const activeTabRef = useRef<NavTab>(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const selectedPlaylist = tabViewStack[activeTab] || null;

  const setSelectedPlaylist = useCallback(
    (
      pl: Playlist | null | ((prev: Playlist | null) => Playlist | null),
      targetTab?: string
    ) => {
      setTabViewStack((prev) => {
        const tabToUpdate = targetTab || activeTabRef.current;
        const currentForTab = prev[tabToUpdate] || null;
        const nextVal = typeof pl === "function" ? pl(currentForTab) : pl;
        const normalizedVal = nextVal ? { ...nextVal } : null;
        const nextStack = {
          ...prev,
          [tabToUpdate]: normalizedVal,
        };
        try {
          localStorage.setItem("oblivion_tab_view_stack", JSON.stringify(nextStack));
          if (tabToUpdate === activeTabRef.current) {
            if (normalizedVal) {
              localStorage.setItem("oblivion_selected_playlist", JSON.stringify(normalizedVal));
            } else {
              localStorage.removeItem("oblivion_selected_playlist");
            }
          }
        } catch {}
        return nextStack;
      });
    },
    []
  );

  const handleTabChange = useCallback((newTab: NavTab) => {
    setActiveTab((currentTab) => {
      if (newTab === currentTab) {
        // If user taps the active tab while a playlist or album detail is open, pop back to the tab root
        setTabViewStack((prev) => {
          if (prev[newTab]) {
            const nextStack = { ...prev, [newTab]: null };
            try {
              localStorage.setItem("oblivion_tab_view_stack", JSON.stringify(nextStack));
              localStorage.removeItem("oblivion_selected_playlist");
            } catch {}
            return nextStack;
          }
          return prev;
        });
      }
      return newTab;
    });
  }, []);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
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
  const [isAuthInitializing, setIsAuthInitializing] = useState<boolean>(true);
  const [oauthBannerError, setOauthBannerError] = useState<string | null>(null);

  // Persistent search state (query, results, and active filter)
  const [searchQuery, setSearchQuery] = useState<string>(() => {
    try {
      return localStorage.getItem("oblivion_saved_search_query") || "";
    } catch {
      return "";
    }
  });

  const [searchResults, setSearchResults] = useState<Track[]>(() => {
    try {
      const saved = localStorage.getItem("oblivion_saved_search_results");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [searchFilter, setSearchFilter] = useState<"all" | "track" | "album" | "artist">(() => {
    try {
      const saved = localStorage.getItem("oblivion_saved_search_filter");
      if (saved && ["all", "track", "album", "artist"].includes(saved)) {
        return saved as any;
      }
    } catch {}
    return "all";
  });

  useEffect(() => {
    try {
      localStorage.setItem("oblivion_saved_search_query", searchQuery);
    } catch {}
  }, [searchQuery]);

  useEffect(() => {
    try {
      localStorage.setItem("oblivion_saved_search_results", JSON.stringify(searchResults));
    } catch {}
  }, [searchResults]);

  useEffect(() => {
    try {
      localStorage.setItem("oblivion_saved_search_filter", searchFilter);
    } catch {}
  }, [searchFilter]);

  // Synchronize custom playlist artwork from the server immediately on startup
  useEffect(() => {
    syncCustomCoversFromServer().catch((err) => {
      console.warn("Failed to sync custom covers on app mount:", err);
    });
  }, []);

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
          playerBackgroundAnimation: parsed.playerBackgroundAnimation || "ambient-drift",
          animationDriftSpeed: parsed.animationDriftSpeed ?? 6,
          animationAuroraSpeed: parsed.animationAuroraSpeed ?? 6,
          animationOrbitalSpeed: parsed.animationOrbitalSpeed ?? 6,
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
      playerBackgroundAnimation: "ambient-drift",
      animationDriftSpeed: 6,
      animationAuroraSpeed: 6,
      animationOrbitalSpeed: 6,
      compactMode: false,
      lyricsFontSize: "md",
      lyricsAlignment: "left",
      autoDownloadFavorites: false,
      maxCacheSizeMB: 500,
      backgroundPlay: true,
    };
  });

  const activeFullDesign = FULL_APP_DESIGNS[settings.fullAppDesign || "designer"] || FULL_APP_DESIGNS["designer"];

  // Set data-theme attribute on <html> element, sync <meta name="theme-color"> and propagate dynamic --accent-color / --primary variables whenever active full design changes
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", activeFullDesign.id);
      syncDocumentThemeColor(activeFullDesign);

      const themeVariables: Record<
        string,
        {
          accent: string;
          secondary: string;
          tertiary: string;
          contrastText: string;
          sliderTrack?: string;
          sliderFill?: string;
        }
      > = {
        designer: {
          accent: "#dfb86c",
          secondary: "#f7e2ab",
          tertiary: "#a07422",
          contrastText: "#120f14",
          sliderTrack: "rgba(223, 184, 108, 0.2)",
          sliderFill: "#dfb86c",
        },
        "cyberpunk-neon": {
          accent: "#00f3ff",
          secondary: "#ff007f",
          tertiary: "#7928ca",
          contrastText: "#000000",
        },
        candyland: {
          accent: "#ff70a6",
          secondary: "#ff9ebb",
          tertiary: "#ffd166",
          contrastText: "#ffffff",
          sliderTrack: "#ffd1dc",
          sliderFill: "#ff70a6",
        },
        "ytmusic-red": {
          accent: "#dc2626",
          secondary: "#ef4444",
          tertiary: "#991b1b",
          contrastText: "#ffffff",
          sliderTrack: "#27272a",
          sliderFill: "#dc2626",
        },
        "dynamic-emerald": {
          accent: "#00f5a0",
          secondary: "#00d9f5",
          tertiary: "#059669",
          contrastText: "#000000",
          sliderTrack: "#06281e",
          sliderFill: "#00f5a0",
        },
        "audiophile-gold": {
          accent: "#f59e0b",
          secondary: "#fbbf24",
          tertiary: "#d97706",
          contrastText: "#000000",
          sliderTrack: "#291508",
          sliderFill: "#f59e0b",
        },
        "twilight-vaporwave": {
          accent: "#ff2a8d",
          secondary: "#9d4edd",
          tertiary: "#05d9e8",
          contrastText: "#ffffff",
          sliderTrack: "#241442",
          sliderFill: "#ff2a8d",
        },
        "neue-editorial": {
          accent: "#1F1F1F",
          secondary: "#3A3530",
          tertiary: "#181816",
          contrastText: "#F2E8D8",
          sliderTrack: "#ded8cb",
          sliderFill: "#1F1F1F",
        },
        "obsidian-depth": {
          accent: "#38bdf8",
          secondary: "#a5f3fc",
          tertiary: "#0284c7",
          contrastText: "#0f172a",
          sliderTrack: "#1c2026",
          sliderFill: "#38bdf8",
        },
        "nebula-liquid-glass": {
          accent: "#ff007f",
          secondary: "#ff7b00",
          tertiary: "#00f0ff",
          contrastText: "#ffffff",
          sliderTrack: "rgba(255, 255, 255, 0.14)",
          sliderFill: "#ff007f",
        },
      };

      const vars = themeVariables[activeFullDesign.id] || themeVariables.designer;
      document.documentElement.style.setProperty("--accent-color", vars.accent);
      document.documentElement.style.setProperty("--primary", vars.accent);
      document.documentElement.style.setProperty("--accent-primary", vars.accent);
      document.documentElement.style.setProperty("--accent-secondary", vars.secondary);
      document.documentElement.style.setProperty("--accent-tertiary", vars.tertiary);
      document.documentElement.style.setProperty("--accent-contrast-text", vars.contrastText);
      if (vars.sliderTrack) {
        document.documentElement.style.setProperty("--slider-track-bg", vars.sliderTrack);
      }
      if (vars.sliderFill) {
        document.documentElement.style.setProperty("--slider-fill-bg", vars.sliderFill);
      }
    }
  }, [activeFullDesign.id, activeFullDesign.themeColorMeta]);

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
      mediaMode: "song",
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
            mediaMode: parsed.mediaMode || "song",
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

  // Save user changes to perpetual localStorage to keep user signed in indefinitely
  useEffect(() => {
    if (user && user.isLoggedIn) {
      setInMemoryAuth(user.accessToken || null, user);
      setStoredAuth(user.accessToken || null, user);
    }
  }, [user]);

  // Check auth status on mount and sync session
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const errParam = urlParams.get("oauth_error");
      const successParam = urlParams.get("oauth_success");
      const userParam = urlParams.get("user");

      if (errParam) {
        setOauthBannerError(errParam);
        setActiveTab("settings");
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (successParam || userParam) {
        setIsAuthenticating(true);
        setIsAuthenticatingGlobal(true);
        if (userParam) {
          try {
            const parsedUser = JSON.parse(decodeURIComponent(userParam));
            if (parsedUser && (parsedUser.id || parsedUser.email)) {
              const fullUser = { ...parsedUser, isLoggedIn: true };
              setInMemoryAuth(fullUser.accessToken || null, fullUser);
              setStoredAuth(fullUser.accessToken || null, fullUser);
              setUser(fullUser);
              showToast(`Signed in as ${fullUser.name || fullUser.email || "Google User"}`);
            }
          } catch (e) {
            console.error("Failed to parse user param:", e);
          }
        }
        window.history.replaceState({}, document.title, window.location.pathname);
        setTimeout(() => {
          setIsAuthenticating(false);
          setIsAuthenticatingGlobal(false);
        }, 1200);
      }

      const localToken = getStoredAuthToken();
      const localUser = getStoredUserSession();
      if (localUser && localUser.isLoggedIn && isMounted) {
        setUser(localUser);
        setInMemoryAuth(localUser.accessToken || null, localUser);
      }

      try {
        const headers: Record<string, string> = {};
        if (localToken) {
          headers["Authorization"] = `Bearer ${localToken}`;
          headers["X-Access-Token"] = localToken;
        }

        const res = await safeClientFetch("/api/auth/me", { headers, credentials: "include" }, 1, 500);
        if (res && res.ok) {
          const data = await res.json().catch(() => null);
          if (data && data.isLoggedIn && data.user) {
            const fullUser = { ...data.user, isLoggedIn: true };
            setInMemoryAuth(fullUser.accessToken || null, fullUser);
            setStoredAuth(fullUser.accessToken || null, fullUser);
            if (isMounted) {
              setUser(fullUser);
            }
            fetchPlaylists(false, fullUser.accessToken, false);
          } else if (localToken) {
            fetchPlaylists(false, localToken, false);
          }
        } else if (localToken) {
          // If server or network returned non-200, preserve user perpetually and load cached playlists
          fetchPlaylists(false, localToken, false);
        }
      } catch (err) {
        console.warn("Auth check notice (preserving perpetual session):", err);
        if (localToken) {
          fetchPlaylists(false, localToken, false);
        }
      } finally {
        if (isMounted) {
          setIsAuthInitializing(false);
        }
      }
    };

    initAuth();

    // Fetch server-side custom artwork mappings to survive browser cache clears
    fetchServerCustomArtwork().catch(() => {});

    // Immediate local-first playlist load on startup
    const localCached = getCachedPlaylists();
    if (localCached && localCached.length > 0) {
      setPlaylists(localCached);
    }

    let isDbMounted = true;
    getCachedPlaylistsFromDB().then((cached) => {
      if (isDbMounted && Array.isArray(cached) && cached.length > 0) {
        setPlaylists((prev) => {
          if (prev.length === 0) return cached;
          return prev.map((p) => {
            const match = cached.find((c) => c.id === p.id || c.id.replace(/^VL/, "") === p.id.replace(/^VL/, ""));
            if (match && (match.customCoverUrl || match.isCustomCover)) {
              return {
                ...p,
                customCoverUrl: match.customCoverUrl || match.coverUrl,
                isCustomCover: true,
              };
            }
            return p;
          });
        });
      }
    });

    return () => {
      isMounted = false;
      isDbMounted = false;
    };
  }, []);

  // Proactive background silent refresh before token expiry (runs every 35 minutes and on window focus)
  useEffect(() => {
    if (!user?.isLoggedIn) return;

    const intervalId = setInterval(() => {
      performSilentRefresh();
    }, 35 * 60 * 1000);

    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        performSilentRefresh();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [user?.isLoggedIn]);

  // Automatic live sync whenever the user navigates to Library (just like Home and Explore feeds)
  useEffect(() => {
    if (activeTab === "library") {
      let activeToken = user?.accessToken || getStoredAuthToken() || getInMemoryToken();
      // Trigger a live background verification & sync with YouTube Music
      fetchPlaylists(false, activeToken, false);
    }
  }, [activeTab]);

  const handleLoginSuccess = async (loggedUser: User) => {
    setIsAuthenticating(true);
    setIsAuthenticatingGlobal(true);
    const fullUser = { ...loggedUser, isLoggedIn: true };
    setInMemoryAuth(fullUser.accessToken || null, fullUser);
    setStoredAuth(fullUser.accessToken || null, fullUser);
    setUser(fullUser);
    setIsAuthModalOpen(false);
    showToast(`Signed in as ${fullUser.name || fullUser.email || "Google User"}`);
    try {
      await fetchPlaylists(true, fullUser.accessToken, true);
    } catch (e) {
      console.warn("Post-login playlist fetch notice:", e);
    } finally {
      setIsAuthenticating(false);
      setIsAuthenticatingGlobal(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch (err) {
      console.error("Logout error:", err);
    }
    setInMemoryAuth(null, null);
    clearStoredAuth();
    setIsAuthenticatingGlobal(false);
    setUser(null);
    setPlaylists([]);
    setSelectedPlaylist(null);
    showToast("Signed out successfully.");
  };

  // Register global auth handlers for token update and session invalidation
  useEffect(() => {
    globalTokenUpdateHandler = (newToken: string, userObj?: any) => {
      setUser((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, ...(userObj || {}), accessToken: newToken, isLoggedIn: true };
        setInMemoryAuth(newToken, updated);
        setStoredAuth(newToken, updated);
        return updated;
      });
    };

    globalAuthExpiryHandler = () => {
      console.log("[Auth Interceptor] YouTube token notice received. Preserving user session and library.");
    };

    return () => {
      globalTokenUpdateHandler = null;
      globalAuthExpiryHandler = null;
    };
  }, []);

  // Helper to append cache-busting timestamp to custom artwork CDN URLs
  const applyArtworkCacheBuster = (url: string | undefined | null, ts: number): string | undefined => {
    if (!url) return undefined;
    if (
      url.includes("googleusercontent.com") ||
      url.includes("ggpht.com") ||
      url.includes("yt3.ggpht.com") ||
      url.includes("yt4.ggpht.com") ||
      url.includes("ytimg.com/pl/")
    ) {
      const sep = url.includes("?") ? "&" : "?";
      return `${url}${sep}v=${ts}`;
    }
    return url;
  };

  // Auto-sync engine: checks with YouTube in background
  const checkAndAutoSyncPlaylists = (token?: string) => {
    const activeToken = token || user?.accessToken;
    if (!activeToken) return;
    fetchPlaylists(false, activeToken, false);
  };

  // Fetch Playlists with immediate tracks count, silent refresh recovery, & custom artwork resolution
  const fetchPlaylists = async (
    forceRefresh: boolean = false,
    overrideToken?: string,
    isManualSync: boolean = false
  ): Promise<{ success: boolean; count: number; authExpired?: boolean }> => {
    try {
      let activeToken = overrideToken || user?.accessToken;
      if (!activeToken) {
        try {
          const saved = localStorage.getItem("oblivion_saved_user");
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed?.isLoggedIn || parsed?.accessToken) {
              activeToken = parsed?.accessToken;
            }
          }
        } catch {}
      }

      // If user has never logged in and no token exists, return cleanly without clearing existing playlists
      if (!activeToken && !user?.isLoggedIn) {
        return { success: false, count: playlists.length };
      }

      const headers: Record<string, string> = {};
      if (activeToken) {
        headers["Authorization"] = `Bearer ${activeToken}`;
        headers["X-Access-Token"] = activeToken;
      }

      const tokenParam = activeToken ? `&access_token=${encodeURIComponent(activeToken)}` : "";
      const url = forceRefresh ? `/api/youtube/playlists?refresh=true&_t=${Date.now()}${tokenParam}` : `/api/youtube/playlists?_t=${Date.now()}${tokenParam}`;
      const res = await safeClientFetch(url, { headers, credentials: "include" }, 2, 800);

      if (!res) {
        // Safe fallback to perpetual local cache
        const cached = getCachedPlaylists();
        if (Array.isArray(cached) && cached.length > 0) {
          setPlaylists(cached);
          return { success: true, count: cached.length };
        }
        return { success: false, count: playlists.length };
      }

      if (res.status === 401 || res.status === 403) {
        console.warn(`YouTube API returned ${res.status} Unauthorized. Attempting silent refresh...`);
        const refreshedToken = await performSilentRefresh();
        if (refreshedToken) {
          return fetchPlaylists(forceRefresh, refreshedToken, false);
        }
        return { success: false, count: playlists.length, authExpired: true };
      }

      const data = await res.json().catch(() => ({ playlists: [] }));

      if (data.authExpired || data.error === "AUTH_EXPIRED") {
        console.warn("YouTube API returned AUTH_EXPIRED. Attempting silent refresh...");
        const refreshedToken = await performSilentRefresh();
        if (refreshedToken) {
          return fetchPlaylists(forceRefresh, refreshedToken, false);
        }
        return { success: false, count: playlists.length, authExpired: true };
      }

      if (data.newAccessToken) {
        setUser((prev) => {
          if (!prev) return prev;
          const updated = { ...prev, accessToken: data.newAccessToken };
          try {
            localStorage.setItem("oblivion_saved_user", JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }

      if (data.playlists && Array.isArray(data.playlists) && data.playlists.length > 0) {
        const customCoversStore = getCustomPlaylistCovers();
        const customCoversMap = await getCustomCoversFromCache().catch(() => ({}));
        const seenPlIds = new Set<string>();
        const sanitizedPlaylists: Playlist[] = [];
        const syncTimestamp = Date.now();

        for (const pl of data.playlists) {
          if (!pl) continue;
          const plId = pl.id || pl.playlistId;
          if (!plId || !isValidPlaylistId(plId) || seenPlIds.has(plId)) continue;
          const plTitle = (pl.title || "").toLowerCase();
          if (plTitle === "liked music & videos" || plTitle === "liked videos" || plTitle === "liked music" || plTitle === "watch later" || plTitle === "history" || plTitle === "watch history") continue;
          seenPlIds.add(plId);

          const cleanId = plId.replace(/^VL/, "");
          const seenTrackIds = new Set<string>();
          const sanitizedTracks: Track[] = [];

          for (const t of pl.tracks || []) {
            if (!t) continue;
            const trId = t.id || t.youtubeVideoId;
            if (!trId || seenTrackIds.has(trId)) continue;
            seenTrackIds.add(trId);
            sanitizedTracks.push({ ...t, id: trId });
          }

          const thumbs = pl.thumbnails;
          const bestThumb =
            thumbs?.maxres?.url ||
            thumbs?.standard?.url ||
            thumbs?.high?.url ||
            thumbs?.medium?.url ||
            thumbs?.default?.url;

          // Match with existing playlist to preserve full tracks if already fetched
          const existingMatch = playlists.find(
            (p) => p.id === plId || (p.id && p.id.replace(/^VL/, "") === cleanId)
          );

          // STRICT IMMUTABILITY: Custom artwork is resolved and preserved from ALL available sources
          const standaloneCustom = getPlaylistCustomArtwork(plId) || getPlaylistCustomArtwork(cleanId);
          const existingCustom = existingMatch?.customCoverUrl || (existingMatch?.isCustomCover && !isVideoThumbnailUrl(existingMatch?.coverUrl) ? existingMatch.coverUrl : undefined);
          const propCustom = pl.customCoverUrl || (pl.isCustomCover && !isVideoThumbnailUrl(pl.coverUrl) ? pl.coverUrl : undefined);
          const lockedCustom = standaloneCustom || existingCustom || (isAuthenticCustomArtworkUrl(propCustom) ? propCustom : undefined);

          if (lockedCustom) {
            setPlaylistCustomArtwork(plId, lockedCustom);
            setPlaylistCustomArtwork(cleanId, lockedCustom);
          }

          const hasCustom = Boolean(lockedCustom || existingMatch?.isCustomCover || pl.isCustomCover);
          const resolvedCover = lockedCustom || (hasCustom ? (existingMatch?.coverUrl || pl.coverUrl) : (pl.coverUrl || bestThumb || existingMatch?.coverUrl || ""));

          const rawPlPrivacy = (pl.privacyStatus || pl.privacy || pl.status?.privacyStatus || "PUBLIC").toUpperCase();
          const normalizedPlPrivacy = rawPlPrivacy === "PRIVATE" ? "PRIVATE" : rawPlPrivacy === "UNLISTED" ? "UNLISTED" : "PUBLIC";

          const finalTracks = sanitizedTracks.length > 0 ? sanitizedTracks : (existingMatch?.tracks || []);

          const count = Number(pl.itemCount ?? pl.trackCount ?? pl.contentDetails?.itemCount ?? pl.tracksCount ?? finalTracks.length ?? 0);

          sanitizedPlaylists.push({
            ...pl,
            id: plId,
            coverUrl: resolvedCover,
            customCoverUrl: lockedCustom || (hasCustom ? resolvedCover : undefined),
            isCustomCover: hasCustom,
            itemCount: count,
            trackCount: count,
            tracksCount: count,
            contentDetails: pl.contentDetails || { itemCount: count },
            tracks: finalTracks,
            thumbnails: pl.thumbnails,
            privacy: normalizedPlPrivacy,
            privacyStatus: normalizedPlPrivacy,
          });
        }

        // Save sanitized playlists to IndexedDB and local storage cache
        savePlaylistsToDBCache(sanitizedPlaylists);

        // Compare and update if playlists have changed
        setPlaylists((prevPlaylists) => {
          const isDifferent =
            prevPlaylists.length !== sanitizedPlaylists.length ||
            sanitizedPlaylists.some((newP, idx) => {
              const oldP = prevPlaylists[idx];
              if (!oldP) return true;
              return (
                oldP.id !== newP.id ||
                oldP.title !== newP.title ||
                (oldP.tracksCount || 0) !== (newP.tracksCount || 0) ||
                oldP.coverUrl !== newP.coverUrl ||
                oldP.customCoverUrl !== newP.customCoverUrl ||
                oldP.privacy !== newP.privacy
              );
            });

          if (isDifferent || prevPlaylists.length === 0) {
            setCachedPlaylists(sanitizedPlaylists);
            return sanitizedPlaylists;
          }
          return prevPlaylists;
        });

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

        return { success: true, count: sanitizedPlaylists.length };
      }
      return { success: true, count: 0 };
    } catch (err: any) {
      console.warn("Fetch playlists notice (recovering from local store):", err?.message || err);
      const cached = getCachedPlaylists();
      if (Array.isArray(cached) && cached.length > 0) {
        setPlaylists(cached);
        return { success: true, count: cached.length };
      }
      return { success: false, count: playlists.length };
    }
  };

  // Fetch playlist or album details & tracks from YouTube Music with live sync check
  const fetchPlaylistDetails = async (playlistId: string, title = "", artist = "", forceRefresh = true) => {
    if (!playlistId) return;
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

      const res = await safeClientFetch(
        `/api/youtube/playlists/${playlistId}/items?title=${qTitle}&artist=${qArtist}&type=${qType}${refreshParam}&_t=${Date.now()}`,
        { headers },
        2,
        800
      );
      if (!res) {
        return;
      }
      const data = await res.json().catch(() => ({ tracks: [] }));
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

        const isAuthenticCustom = Boolean(
          data.isCustomCover ||
          (data.customCoverUrl && (
            data.customCoverUrl.includes("studio_square_thumbnail") ||
            data.customCoverUrl.includes("/pl_c/") ||
            data.customCoverUrl.includes("googleusercontent.com") ||
            data.customCoverUrl.includes("ggpht.com") ||
            data.customCoverUrl.includes("yt3.ggpht.com") ||
            data.customCoverUrl.includes("yt4.ggpht.com") ||
            data.customCoverUrl.includes("yt3.googleusercontent.com") ||
            data.customCoverUrl.includes("lh3.googleusercontent.com") ||
            data.customCoverUrl.includes("play-lh.googleusercontent.com") ||
            data.customCoverUrl.includes("photos.googleusercontent.com") ||
            data.customCoverUrl.includes("ytimg.com/pl/") ||
            data.customCoverUrl.includes("/pl/") ||
            data.customCoverUrl.includes("/s_p/") ||
            data.customCoverUrl.includes("ytimg.com/an_webp/") ||
            data.customCoverUrl.includes("ytimg.com/v2/") ||
            data.customCoverUrl.startsWith("data:")
          )) ||
          (data.coverUrl && (
            data.coverUrl.includes("studio_square_thumbnail") ||
            data.coverUrl.includes("/pl_c/") ||
            data.coverUrl.includes("googleusercontent.com") ||
            data.coverUrl.includes("ggpht.com") ||
            data.coverUrl.includes("yt3.ggpht.com") ||
            data.coverUrl.includes("yt4.ggpht.com") ||
            data.coverUrl.includes("yt3.googleusercontent.com") ||
            data.coverUrl.includes("lh3.googleusercontent.com") ||
            data.coverUrl.includes("play-lh.googleusercontent.com") ||
            data.coverUrl.includes("photos.googleusercontent.com") ||
            data.coverUrl.includes("ytimg.com/pl/") ||
            data.coverUrl.includes("/pl/") ||
            data.coverUrl.includes("/s_p/") ||
            data.coverUrl.includes("ytimg.com/an_webp/") ||
            data.coverUrl.includes("ytimg.com/v2/") ||
            data.coverUrl.startsWith("data:")
          ))
        );

        const standaloneCustom = getPlaylistCustomArtwork(playlistId) || getPlaylistCustomArtwork(cleanId);
        const lockedCustom = standaloneCustom || (isAuthenticCustom ? (data.customCoverUrl || data.coverUrl) : undefined);
        if (lockedCustom) {
          setPlaylistCustomArtwork(playlistId, lockedCustom);
          setPlaylistCustomArtwork(cleanId, lockedCustom);
        }

        setPlaylists((prev) => {
          const updated = prev.map((p) => {
            const pClean = (p.id || p.playlistId || "").replace(/^VL/, "");
            if (p.id === playlistId || p.playlistId === playlistId || pClean === cleanId) {
              const hasCustom = Boolean(lockedCustom || isAuthenticCustom || p.isCustomCover);
              const finalCover = lockedCustom || p.customCoverUrl || (hasCustom ? p.coverUrl : (data.coverUrl || p.coverUrl));

              return {
                ...p,
                tracks: uniqueTracks,
                tracksCount: uniqueTracks.length,
                coverUrl: finalCover,
                customCoverUrl: hasCustom ? finalCover : undefined,
                isCustomCover: hasCustom,
              };
            }
            return p;
          });
          try {
            localStorage.setItem("oblivion_saved_playlists", JSON.stringify(updated));
          } catch {}
          savePlaylistsToDBCache(updated);
          return updated;
        });

        // Update local and indexedDB caches for this specific playlist
        savePlaylistTracksToDBCache(playlistId, uniqueTracks);
        try {
          localStorage.setItem(`OBLIVION_PLAYLIST_CACHE_${playlistId}`, JSON.stringify(uniqueTracks));
          localStorage.setItem(`OBLIVION_PLAYLIST_CACHE_${cleanId}`, JSON.stringify(uniqueTracks));
        } catch {}

        setSelectedPlaylist((prev) => {
          if (!prev) return null;
          const prevClean = (prev.id || prev.playlistId || "").replace(/^VL/, "");
          if (prev.id === playlistId || prev.playlistId === playlistId || prevClean === cleanId) {
            const hasCustom = Boolean(lockedCustom || isAuthenticCustom || (prev as any).isCustomCover);
            const finalCover = lockedCustom || (prev as any).customCoverUrl || (hasCustom ? prev.coverUrl : (data.coverUrl || prev.coverUrl));

            return {
              ...prev,
              tracks: uniqueTracks,
              tracksCount: uniqueTracks.length,
              coverUrl: finalCover,
              customCoverUrl: hasCustom ? finalCover : undefined,
              isCustomCover: hasCustom,
            };
          }
          return prev;
        });
      }
    } catch (err) {
      console.error("Fetch playlist details error:", err);
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
      if (!prev.queue || prev.queue.length === 0) return prev;
      let currentIndex = prev.queueIndex;
      if (currentIndex < 0 || currentIndex >= prev.queue.length) {
        if (prev.currentTrack) {
          const cId = prev.currentTrack.id || prev.currentTrack.youtubeVideoId;
          const foundIdx = prev.queue.findIndex((t) => (t.id || t.youtubeVideoId) === cId);
          currentIndex = foundIdx >= 0 ? foundIdx : 0;
        } else {
          currentIndex = 0;
        }
      }

      let nextIndex: number;
      if (prev.isShuffle && prev.queue.length > 1) {
        let rand = Math.floor(Math.random() * prev.queue.length);
        if (rand === currentIndex) {
          rand = (rand + 1) % prev.queue.length;
        }
        nextIndex = rand;
      } else {
        nextIndex = currentIndex + 1;
        if (nextIndex >= prev.queue.length) {
          nextIndex = 0;
        }
      }

      const nextTrack = prev.queue[nextIndex];
      return {
        ...prev,
        queueIndex: nextIndex,
        currentTrack: nextTrack,
        currentTime: 0,
        isPlaying: true,
      };
    });
  };

  // Previous Track with immediate auto-play and full Shuffle support
  const handlePrevTrack = () => {
    setPlayerState((prev) => {
      if (!prev.queue || prev.queue.length === 0) return prev;
      let currentIndex = prev.queueIndex;
      if (currentIndex < 0 || currentIndex >= prev.queue.length) {
        if (prev.currentTrack) {
          const cId = prev.currentTrack.id || prev.currentTrack.youtubeVideoId;
          const foundIdx = prev.queue.findIndex((t) => (t.id || t.youtubeVideoId) === cId);
          currentIndex = foundIdx >= 0 ? foundIdx : 0;
        } else {
          currentIndex = 0;
        }
      }

      let prevIndex: number;
      if (prev.isShuffle && prev.queue.length > 1) {
        let rand = Math.floor(Math.random() * prev.queue.length);
        if (rand === currentIndex) {
          rand = (rand - 1 + prev.queue.length) % prev.queue.length;
        }
        prevIndex = rand;
      } else {
        prevIndex = currentIndex - 1;
        if (prevIndex < 0) {
          prevIndex = prev.queue.length - 1;
        }
      }

      const prevTrack = prev.queue[prevIndex];
      return {
        ...prev,
        queueIndex: prevIndex,
        currentTrack: prevTrack,
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
  const handleSavePlaylist = async (
    title: string,
    description: string,
    coverUrl: string,
    visibility: "PUBLIC" | "UNLISTED" | "PRIVATE" = "PUBLIC"
  ) => {
    const authHeaders = getAuthHeaders();

    if (editingPlaylist) {
      const updatedPlaylist: Playlist = {
        ...editingPlaylist,
        title,
        description,
        coverUrl: coverUrl || editingPlaylist.coverUrl,
        customCoverUrl: coverUrl || editingPlaylist.customCoverUrl,
        isCustomCover: Boolean(coverUrl || editingPlaylist.isCustomCover),
        privacy: visibility,
        privacyStatus: visibility,
      };

      // Optimistically update React state immediately
      setPlaylists((prev) => {
        const next = prev.map((p) =>
          p.id === editingPlaylist.id || p.id.replace(/^VL/, "") === editingPlaylist.id.replace(/^VL/, "")
            ? {
                ...p,
                ...updatedPlaylist,
              }
            : p
        );
        try {
          localStorage.setItem("oblivion_saved_playlists", JSON.stringify(next));
        } catch {}
        savePlaylistsToDBCache(next);
        if (coverUrl) {
          saveCustomCoverToCache(editingPlaylist.id, coverUrl, true);
        }
        return next;
      });

      if (selectedPlaylist?.id === editingPlaylist.id || selectedPlaylist?.id?.replace(/^VL/, "") === editingPlaylist.id.replace(/^VL/, "")) {
        setSelectedPlaylist((prev) => (prev ? { ...prev, ...updatedPlaylist } : null));
        try {
          localStorage.setItem("oblivion_selected_playlist", JSON.stringify({ ...selectedPlaylist, ...updatedPlaylist }));
        } catch {}
      }

      try {
        const res = await fetch(`/api/youtube/playlists/${editingPlaylist.id}`, {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify({
            title,
            description,
            coverUrl,
            customCoverUrl: coverUrl,
            isCustomCover: Boolean(coverUrl),
            privacyStatus: visibility,
            privacy: visibility,
            visibility: visibility,
          }),
          signal: AbortSignal.timeout(6000),
        });
        const data = await res.json().catch(() => ({}));

        if (data?.syncedToYouTube) {
          showToast("Updated playlist & synced to YouTube Music");
        } else {
          showToast("Saved playlist changes");
        }
      } catch (err) {
        console.warn("Update playlist network note:", err);
        showToast("Saved playlist changes");
      }
    } else {
      try {
        const res = await fetch("/api/youtube/playlists", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            title,
            description,
            coverUrl,
            customCoverUrl: coverUrl,
            isCustomCover: Boolean(coverUrl),
            privacyStatus: visibility.toLowerCase(),
            privacy: visibility,
            visibility,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (data && data.playlist) {
          setPlaylists((prev) => [
            {
              ...data.playlist,
              privacy: visibility,
              privacyStatus: visibility,
            },
            ...prev,
          ]);
          if (data.syncedToYouTube) {
            showToast(`Created "${title}" & synced to YouTube`);
          } else {
            showToast(`Created playlist "${title}"`);
          }
        }
      } catch (err) {
        console.error("Create playlist error:", err);
        showToast("Error creating playlist. Please try again.");
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
      const data = await res.json().catch(() => ({}));
      if (data && data.playlist) {
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
      const data = await res.json().catch(() => ({}));
      if (data && data.playlist) {
        const createdPl: Playlist = {
          ...data.playlist,
          tracks: data.playlist.tracks?.length ? data.playlist.tracks : [cleanTrack],
          tracksCount: data.playlist.tracksCount || 1,
          coverUrl: coverUrl || data.playlist.coverUrl,
          customCoverUrl: coverUrl || data.playlist.customCoverUrl,
          isCustomCover: Boolean(coverUrl),
        };

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
    const cleanId = playlistId.replace(/^VL/, "");
    try {
      const headers = getAuthHeaders();
      await fetch(`/api/playlists/${encodeURIComponent(playlistId)}`, { method: "DELETE", headers }).catch(() => {});
      await fetch(`/api/youtube/playlists/${encodeURIComponent(playlistId)}`, { method: "DELETE", headers }).catch(() => {});

      await deletePlaylistFromDb(playlistId);
      removePlaylistCustomArtwork(playlistId);

      setPlaylists((prev) => {
        const filtered = prev.filter(
          (p) => p.id !== playlistId && p.id !== cleanId && p.id?.replace(/^VL/, "") !== cleanId
        );
        try {
          localStorage.setItem("oblivion_saved_playlists", JSON.stringify(filtered));
        } catch {}
        return filtered;
      });

      if (
        selectedPlaylist?.id === playlistId ||
        selectedPlaylist?.id === cleanId ||
        selectedPlaylist?.id?.replace(/^VL/, "") === cleanId
      ) {
        setSelectedPlaylist(null);
        setActiveTab("library");
      }
      showToast("Playlist permanently deleted");
    } catch (err) {
      console.error("Delete playlist error:", err);
    }
  };

  // Update Custom Playlist Cover
  const handleUpdatePlaylistCover = async (playlistId: string, newCoverUrl: string, isCustom: boolean) => {
    const cleanId = playlistId.replace(/^VL/, "");

    // Lock custom cover in dedicated store immediately
    setCustomPlaylistCover(playlistId, isCustom ? newCoverUrl : null);
    saveCustomCoverToCache(playlistId, newCoverUrl, isCustom);
    if (isCustom && newCoverUrl) {
      saveCustomArtwork(playlistId, newCoverUrl).catch(() => {});
    } else {
      deleteCustomArtwork(playlistId).catch(() => {});
    }

    setPlaylists((prev) => {
      const updated = prev.map((p) =>
        p.id === playlistId || p.id?.replace(/^VL/, "") === cleanId
          ? {
              ...p,
              coverUrl: newCoverUrl,
              customCoverUrl: isCustom ? newCoverUrl : undefined,
              customArtwork: isCustom ? newCoverUrl : undefined,
              thumbnail: isCustom ? newCoverUrl : p.thumbnail,
              isCustomCover: isCustom,
            }
          : p
      );
      try {
        localStorage.setItem("oblivion_saved_playlists", JSON.stringify(updated));
      } catch {}
      savePlaylistsToDBCache(updated);
      return updated;
    });

    if (selectedPlaylist?.id === playlistId || selectedPlaylist?.id?.replace(/^VL/, "") === cleanId) {
      setSelectedPlaylist((prev) =>
        prev
          ? {
              ...prev,
              coverUrl: newCoverUrl,
              customCoverUrl: newCoverUrl,
              customArtwork: isCustom ? newCoverUrl : undefined,
              thumbnail: isCustom ? newCoverUrl : prev.thumbnail,
              isCustomCover: isCustom,
            }
          : null
      );
    }

    try {
      const headers = getAuthHeaders();
      await fetch(`/api/youtube/playlists/${playlistId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          coverUrl: newCoverUrl,
          customCoverUrl: newCoverUrl,
          isCustomCover: isCustom,
        }),
      });
      showToast("Cover artwork updated");
    } catch (err) {
      console.error("Update custom playlist cover error:", err);
    }
  };

  // Reorder Tracks inside Playlist - optimistic local persistence without post-reorder GET resync
  const handleReorderPlaylistTracks = async (playlistId: string, newTracks: Track[]) => {
    const cleanPlId = playlistId.replace(/^VL/, "");

    // 1. Immediately write localTracks directly to persistent storage (IndexedDB, localStorage, OBLIVION_PLAYLIST_CACHE)
    savePlaylistTracksToDBCache(playlistId, newTracks);
    try {
      localStorage.setItem(`OBLIVION_PLAYLIST_CACHE_${playlistId}`, JSON.stringify(newTracks));
      localStorage.setItem(`OBLIVION_PLAYLIST_CACHE_${cleanPlId}`, JSON.stringify(newTracks));
    } catch {}

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
      savePlaylistsToDBCache(updated);
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

      // Send position changes to YouTube in the background without triggering post-sync GET
      const syncResult = await reorderPlaylistTracks(playlistId, newTracks, { token: activeToken });

      if (syncResult.syncedToYouTube) {
        showToast("Playlist reordered & synced with YouTube Music");
      } else {
        showToast("Playlist reordering saved");
      }

      return {
        success: syncResult.success,
        tracks: newTracks,
        syncedToYouTube: syncResult.syncedToYouTube,
      };
    } catch (err) {
      console.error("Reorder tracks error:", err);
      showToast("Playlist order saved locally");
      return {
        success: false,
        tracks: newTracks,
        syncedToYouTube: false,
      };
    }
  };

  // Remove Track from Playlist
  const handleRemoveTrackFromPlaylist = async (playlistId: string, trackId: string, trackObj?: Track) => {
    const cleanPlId = playlistId.replace(/^VL/, "");
    const cleanTrId = trackId.trim();
    const vidFromObj = trackObj?.youtubeVideoId || "";
    const plItemFromObj = trackObj?.playlistItemId || "";

    setPlaylists((prev) => {
      const updated = prev.map((p) => {
        const pId = p.id || (p as any).playlistId;
        if (pId === playlistId || pId?.replace(/^VL/, "") === cleanPlId) {
          const filtered = p.tracks.filter((t) => {
            const tId = t.id || t.youtubeVideoId || "";
            const tVid = t.youtubeVideoId || t.id || "";
            const tPlItemId = (t as any).playlistItemId || "";
            if (cleanTrId && (tId === cleanTrId || tVid === cleanTrId || tPlItemId === cleanTrId)) return false;
            if (plItemFromObj && tPlItemId === plItemFromObj) return false;
            if (vidFromObj && tVid === vidFromObj && tId === (trackObj?.id || "")) return false;
            return true;
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
      savePlaylistsToDBCache(updated);
      return updated;
    });

    if (selectedPlaylist?.id === playlistId || (selectedPlaylist as any)?.playlistId === playlistId || selectedPlaylist?.id?.replace(/^VL/, "") === cleanPlId) {
      setSelectedPlaylist((prev) => {
        if (!prev) return null;
        const filtered = prev.tracks.filter((t) => {
          const tId = t.id || t.youtubeVideoId || "";
          const tVid = t.youtubeVideoId || t.id || "";
          const tPlItemId = (t as any).playlistItemId || "";
          if (cleanTrId && (tId === cleanTrId || tVid === cleanTrId || tPlItemId === cleanTrId)) return false;
          if (plItemFromObj && tPlItemId === plItemFromObj) return false;
          if (vidFromObj && tVid === vidFromObj && tId === (trackObj?.id || "")) return false;
          return true;
        });
        savePlaylistTracksToDBCache(playlistId, filtered);
        try {
          localStorage.setItem(`OBLIVION_PLAYLIST_CACHE_${playlistId}`, JSON.stringify(filtered));
          localStorage.setItem(`OBLIVION_PLAYLIST_CACHE_${cleanPlId}`, JSON.stringify(filtered));
        } catch {}
        return {
          ...prev,
          tracks: filtered,
          tracksCount: filtered.length,
        };
      });
    } else {
      const match = playlists.find(p => (p.id || (p as any).playlistId) === playlistId || (p.id || (p as any).playlistId)?.replace(/^VL/, "") === cleanPlId);
      if (match) {
        const filtered = match.tracks.filter((t) => {
          const tId = t.id || t.youtubeVideoId || "";
          const tVid = t.youtubeVideoId || t.id || "";
          const tPlItemId = (t as any).playlistItemId || "";
          if (cleanTrId && (tId === cleanTrId || tVid === cleanTrId || tPlItemId === cleanTrId)) return false;
          if (plItemFromObj && tPlItemId === plItemFromObj) return false;
          if (vidFromObj && tVid === vidFromObj && tId === (trackObj?.id || "")) return false;
          return true;
        });
        savePlaylistTracksToDBCache(playlistId, filtered);
        try {
          localStorage.setItem(`OBLIVION_PLAYLIST_CACHE_${playlistId}`, JSON.stringify(filtered));
          localStorage.setItem(`OBLIVION_PLAYLIST_CACHE_${cleanPlId}`, JSON.stringify(filtered));
        } catch {}
      }
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

      const queryParams = new URLSearchParams();
      if (vidFromObj) queryParams.set("videoId", vidFromObj);
      if (plItemFromObj) queryParams.set("playlistItemId", plItemFromObj);
      const qStr = queryParams.toString() ? `?${queryParams.toString()}` : "";

      const res = await fetch(`/api/youtube/playlists/${encodeURIComponent(cleanPlId)}/items/${encodeURIComponent(cleanTrId)}${qStr}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (data?.syncedToYouTube) {
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
      // (2) ADD THE NEW SONG TO THE END OF THE LIST TO INCREASE THE SONG COUNT BY 1 (ALLOW DUPLICATES)
      // -------------------------------------------------------------
      const updatedPlaylistTracks: Track[] = [...currentSongs, cleanTrack];
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
      const data = await res.json().catch(() => ({}));
      if (data?.success) {
        setPlaylists((prev) => {
          const updated = prev.map((p) => {
            const pId = p.id || (p as any).playlistId;
            if (pId === playlistId || pId?.replace(/^VL/, "") === cleanPlId) {
              const standaloneCustom = getPlaylistCustomArtwork(pId) || getPlaylistCustomArtwork(cleanPlId);
              const isCustom = Boolean(standaloneCustom || p.isCustomCover || p.customCoverUrl || isAuthenticCustomArtworkUrl(p.coverUrl));
              const finalCover = standaloneCustom || p.customCoverUrl || (isCustom ? p.coverUrl : (p.coverUrl || updatedTracks[0]?.coverUrl));
              return {
                ...p,
                tracks: updatedTracks,
                tracksCount: updatedTracks.length,
                coverUrl: finalCover,
                customCoverUrl: isCustom ? finalCover : undefined,
                isCustomCover: isCustom,
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
            const standaloneCustom = getPlaylistCustomArtwork(prev.id) || getPlaylistCustomArtwork(cleanPlId);
            const isCustom = Boolean(standaloneCustom || (prev as any).isCustomCover || (prev as any).customCoverUrl || isAuthenticCustomArtworkUrl(prev.coverUrl));
            const finalCover = standaloneCustom || (prev as any).customCoverUrl || (isCustom ? prev.coverUrl : (prev.coverUrl || updatedTracks[0]?.coverUrl));
            return {
              ...prev,
              tracks: updatedTracks,
              tracksCount: updatedTracks.length,
              coverUrl: finalCover,
              customCoverUrl: isCustom ? finalCover : undefined,
              isCustomCover: isCustom,
            };
          });
        }
      }
      return data;
    } catch (err) {
      console.error("Sync playlist tracks error:", err);
      throw err;
    }
  };

  // Scroll to top whenever a playlist or album is selected
  useEffect(() => {
    if (selectedPlaylist) {
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
      const mainEl = document.querySelector("main");
      if (mainEl) mainEl.scrollTop = 0;
      const rootEl = document.documentElement || document.body;
      if (rootEl) rootEl.scrollTop = 0;
    }
  }, [selectedPlaylist?.id]);

  return (
    <EqualizerProvider>
      <div data-theme={activeFullDesign.id} className={`flex min-h-screen w-full ${activeFullDesign.isCandy ? "candyland-canvas-bg" : (activeFullDesign.isNebulaGlass || activeFullDesign.id === "nebula-liquid-glass") ? "bg-[#0c071e]" : (activeFullDesign.isDesigner || activeFullDesign.id === "designer") ? "bg-[#0e0d11]" : `bg-gradient-to-b ${activeFullDesign.bgCanvas}`} ${activeFullDesign.textPrimary} font-sans select-none relative overflow-x-clip`}>
      {/* Animated Falling Sweets with Device Orientation Physics for Theme 03 (Candyland) */}
      <CandylandFallingSweets isActive={Boolean(activeFullDesign.isCandy || activeFullDesign.id === "candyland")} />

      {/* Animated Glowing Nebula Gradient & Fluid Aurora Canvas for Theme 09 (Nebula Liquid Glass) */}
      <NebulaLiquidBackground isActive={Boolean(activeFullDesign.isNebulaGlass || activeFullDesign.id === "nebula-liquid-glass")} />

      {/* Animated Dynamic Trapezoid Lines Mesh & Shifting Charcoal Shadows for Theme 01 (Designer) */}
      <DesignerTrapezoidBackground isActive={Boolean(activeFullDesign.isDesigner || activeFullDesign.id === "designer" || settings.themePreset === "designer-ivory")} />

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        user={user}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        playlists={playlists}
        onSelectPlaylist={(pl) => {
          setActiveTab("library");
          setSelectedPlaylist(pl, "library");
        }}
        onCreatePlaylist={() => {
          setEditingPlaylist(null);
          setIsPlaylistModalOpen(true);
        }}
        activeTheme={settings.themePreset}
        designConfig={activeFullDesign}
        onInstallPwa={handleInstallPwa}
        isInstalled={isPwaInstalled}
      />

      {/* Main Content Workspace Area */}
      <main className={`app-content main-viewport flex-1 flex flex-col min-w-0 min-h-screen md:ml-64 relative z-10 ${(activeFullDesign.isCandy || activeFullDesign.isNebulaGlass || activeFullDesign.id === "nebula-liquid-glass" || activeFullDesign.isDesigner || activeFullDesign.id === "designer" || settings.themePreset === "designer-ivory") ? "bg-transparent" : `bg-gradient-to-b ${activeFullDesign.bgCanvas}`}`}>
        {/* Sticky Top Navigation Header Across All Views */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          user={user}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
          designConfig={activeFullDesign}
          onLogoClick={() => {
            setSelectedPlaylist(null);
            setActiveTab("home");
          }}
        />

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
              setSelectedPlaylist(null);
              if (window.history.state && window.history.state.view === "playlist_detail") {
                try {
                  window.history.replaceState({ view: "main_tabs" }, "");
                } catch {}
              }
            }}
            onBackToLibrary={() => {
              setSelectedPlaylist(null);
              setActiveTab("library");
            }}
            onDeletePlaylist={(delId) => {
              handleDeletePlaylist(delId);
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
            onRemoveTrack={(trackId, trackObj) => handleRemoveTrackFromPlaylist(selectedPlaylist.id, trackId, trackObj)}
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
                initialResults={searchResults}
                initialFilter={searchFilter}
                onQueryChange={setSearchQuery}
                onResultsChange={setSearchResults}
                onFilterChange={setSearchFilter}
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
                designConfig={activeFullDesign}
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
        onPlayQueue={handlePlayQueue}
        onRegisterRadioQueue={(radioTracks) => {
          setPlayerState((prev) => {
            const curId = prev.currentTrack?.id || prev.currentTrack?.youtubeVideoId;
            const curIdx = radioTracks.findIndex(
              (t) => (t.id || t.youtubeVideoId) === curId
            );
            return {
              ...prev,
              queue: radioTracks,
              queueIndex: curIdx >= 0 ? curIdx : 0,
            };
          });
        }}
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
        setActiveTab={handleTabChange}
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
    </EqualizerProvider>
  );
}