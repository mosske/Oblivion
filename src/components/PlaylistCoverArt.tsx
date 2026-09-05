import React, { useState, useEffect } from "react";
import { Playlist, Track, YouTubeThumbnails } from "../types";
import { Music, Sparkles } from "lucide-react";
import { getCustomPlaylistCovers, setCustomPlaylistCover } from "../utils/customCoversStorage";

interface PlaylistCoverArtProps {
  playlist: Playlist | {
    id?: string;
    playlistId?: string;
    title?: string;
    coverUrl?: string;
    customCoverUrl?: string;
    isCustomCover?: boolean;
    thumbnails?: YouTubeThumbnails;
    tracks?: Track[];
    tracksCount?: number;
  };
  className?: string;
  showCustomBadge?: boolean;
  aspectSquare?: boolean;
}

export const PlaylistCoverArt: React.FC<PlaylistCoverArtProps> = ({
  playlist,
  className = "w-full h-full",
  showCustomBadge = false,
  aspectSquare = true,
}) => {
  const [failedSources, setFailedSources] = useState<Set<string>>(new Set());
  const [dynamicallyFetchedCover, setDynamicallyFetchedCover] = useState<string | null>(null);

  const playlistId = playlist?.id || (playlist as any)?.playlistId || "";
  const cleanId = playlistId ? playlistId.replace(/^VL/, "") : "";
  const customCoversStore = getCustomPlaylistCovers();
  const customFromStore = (playlistId && customCoversStore[playlistId]) || (cleanId && customCoversStore[cleanId]);

  const customCoverUrl = customFromStore || playlist?.customCoverUrl;
  const standardCoverUrl = playlist?.coverUrl;

  // Reset failure states when the playlist ID or cover URLs change
  useEffect(() => {
    setFailedSources(new Set());
    setDynamicallyFetchedCover(null);
  }, [playlistId, customCoverUrl, standardCoverUrl]);

  const hasCustomCover = Boolean(customCoverUrl && customCoverUrl.trim().length > 0);
  const isExplicitCustom = Boolean(playlist?.isCustomCover || hasCustomCover);

  const trackZero = playlist?.tracks?.[0];
  const trackZeroArtwork = trackZero?.coverUrl || (trackZero as any)?.artwork;
  const trackZeroVideoId = trackZero?.youtubeVideoId || trackZero?.id;

  // Helper to validate whether a URL is a syntactically valid image candidate
  const isValidCandidateUrl = (url: any): url is string => {
    if (!url || typeof url !== "string") return false;
    const u = url.trim();
    if (u.length === 0 || u.startsWith("data:")) return false;
    // Reject invalid playlist IDs passed to YouTube video endpoint
    if (
      u.includes("i.ytimg.com/vi/PL") ||
      u.includes("i.ytimg.com/vi/VL") ||
      u.includes("i.ytimg.com/vi/RD") ||
      u.includes("i.ytimg.com/vi/OLAK5uy_")
    ) {
      return false;
    }
    return true;
  };

  // Build a comprehensive, hierarchical list of all candidate artwork URLs
  const candidateUrls: string[] = [];

  const addCandidate = (url: string | null | undefined) => {
    if (isValidCandidateUrl(url) && !failedSources.has(url) && !candidateUrls.includes(url)) {
      candidateUrls.push(url);
      // If Google User Content or ggpht URL with size modifier, also add base URL as secondary fallback
      if (
        (url.includes("googleusercontent.com") || url.includes("ggpht.com")) &&
        url.includes("=")
      ) {
        const baseUrl = url.split("=")[0];
        if (isValidCandidateUrl(baseUrl) && !failedSources.has(baseUrl) && !candidateUrls.includes(baseUrl)) {
          candidateUrls.push(baseUrl);
        }
      }
    }
  };

  // 1. Isolated custom storage (highest priority)
  addCandidate(customFromStore);

  // 2. Custom cover URL on playlist object
  addCandidate(playlist?.customCoverUrl);

  // 3. Dynamically retrieved cover (if previously fetched)
  addCandidate(dynamicallyFetchedCover);

  // 4. Primary cover URL
  addCandidate(playlist?.coverUrl);

  // 5. YouTube Data API thumbnails resolutions
  const thumbs: any = playlist?.thumbnails;
  if (thumbs) {
    if (Array.isArray(thumbs)) {
      for (const t of [...thumbs].reverse()) {
        if (t?.url) addCandidate(t.url);
      }
    } else if (typeof thumbs === "object") {
      addCandidate(thumbs.maxres?.url);
      addCandidate(thumbs.standard?.url);
      addCandidate(thumbs.high?.url);
      addCandidate(thumbs.medium?.url);
      addCandidate(thumbs.default?.url);
    }
  }

  // 6. First track's artwork
  addCandidate(trackZeroArtwork);

  // 7. First track's YouTube video thumbnail
  if (trackZeroVideoId && typeof trackZeroVideoId === "string" && !trackZeroVideoId.startsWith("PL")) {
    addCandidate(`https://i.ytimg.com/vi/${trackZeroVideoId}/hqdefault.jpg`);
    addCandidate(`https://i.ytimg.com/vi/${trackZeroVideoId}/mqdefault.jpg`);
  }

  // Auto-fetch authentic cover if no candidate URLs exist or all have failed
  useEffect(() => {
    if (candidateUrls.length === 0 && cleanId && !cleanId.startsWith("pl_custom_")) {
      let isMounted = true;
      const fetchCover = async () => {
        try {
          const res = await fetch(`/api/youtube/playlists/${cleanId}/custom-cover`);
          if (res.ok) {
            const data = await res.json();
            if (data?.customCoverUrl && isMounted) {
              setDynamicallyFetchedCover(data.customCoverUrl);
              setCustomPlaylistCover(cleanId, data.customCoverUrl);
            }
          }
        } catch {}
      };
      fetchCover();
      return () => {
        isMounted = false;
      };
    }
  }, [candidateUrls.length, cleanId]);

  const activeSrc = candidateUrls[0] || null;

  const handleImageError = () => {
    if (activeSrc) {
      setFailedSources((prev) => {
        const next = new Set(prev);
        next.add(activeSrc);
        return next;
      });
    }
  };

  if (activeSrc) {
    return (
      <div
        className={`relative overflow-hidden bg-neutral-900 ${
          aspectSquare ? "aspect-square" : ""
        } ${className}`}
      >
        <img
          key={activeSrc}
          src={activeSrc}
          alt={playlist?.title || "Playlist cover"}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={handleImageError}
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        {showCustomBadge && isExplicitCustom && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-[9px] font-mono text-white flex items-center gap-1 shadow-lg z-10 pointer-events-none">
            <Sparkles className="w-2.5 h-2.5 text-[#c89b3c]" />
            <span>Custom</span>
          </div>
        )}
      </div>
    );
  }

  // Elegant stylized playlist placeholder (never arbitrary photo)
  const displayTitle = playlist?.title || "Music";
  const initials = displayTitle
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("") || "PL";

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-[#162a22] via-[#0d1d17] to-[#07100d] flex flex-col items-center justify-center border border-[#1a382d]/40 select-none ${
        aspectSquare ? "aspect-square" : ""
      } ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-black/50 border border-[#c89b3c]/30 flex items-center justify-center shadow-inner mb-1">
        <Music className="w-5 h-5 text-[#c89b3c]/90 stroke-1" />
      </div>
      <span className="text-[11px] font-mono font-bold tracking-widest text-[#c89b3c]/80 uppercase">
        {initials}
      </span>
    </div>
  );
};
