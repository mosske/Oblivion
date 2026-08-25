import React, { useState, useEffect, useMemo } from "react";
import { Playlist, Track, YouTubeThumbnails } from "../types";
import { Music, Sparkles } from "lucide-react";

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
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [allFailed, setAllFailed] = useState(false);
  const [localCustomCover, setLocalCustomCover] = useState<string | null>(null);

  const playlistId = playlist.id || (playlist as any).playlistId;

  // Retrieve any user-customized artwork from persistent local storage
  useEffect(() => {
    if (!playlistId) return;
    try {
      const stored = localStorage.getItem("oblivion_playlist_custom_covers");
      if (stored) {
        const map = JSON.parse(stored);
        if (map && map[playlistId]?.customCoverUrl) {
          setLocalCustomCover(map[playlistId].customCoverUrl);
          setAllFailed(false);
          setCandidateIndex(0);
          return;
        }
      }
    } catch {}
    setLocalCustomCover(null);
  }, [playlistId, playlist.customCoverUrl, playlist.coverUrl]);

  // Build candidate URL hierarchy with proper priority:
  // 1. Explicit user custom cover (local or remote)
  // 2. Custom YouTube Music image artwork variants (googleusercontent, ggpht, yt3, /pl/, /s_p/)
  // 3. Playlist coverUrl & YouTube fallback resolution strings
  // 4. YouTube Data API standard thumbnails (maxres -> standard -> high -> medium -> default)
  const candidates: string[] = useMemo(() => {
    const list: string[] = [];

    const addGoogleUserContentVariants = (url: string) => {
      if (!url) return;
      let clean = url.startsWith("//") ? `https:${url}` : url;
      clean = clean.replace(/&amp;/g, "&");

      if (
        clean.includes("studio_square_thumbnail") ||
        clean.includes("/pl_c/")
      ) {
        list.push(clean);
        return;
      }

      if (
        clean.includes("googleusercontent.com") ||
        clean.includes("ggpht.com") ||
        clean.includes("yt3.ggpht.com")
      ) {
        if (clean.match(/=w\d+-h\d+/)) {
          list.push(clean.replace(/=w\d+-h\d+[^?&]*/, "=w1200-h1200-l90-rj"));
          list.push(clean.replace(/=w\d+-h\d+[^?&]*/, "=w800-h800-l90-rj"));
          list.push(clean.replace(/=w\d+-h\d+[^?&]*/, "=w544-h544-l90-rj"));
          list.push(clean);
        } else if (clean.match(/=s\d+/)) {
          list.push(clean.replace(/=s\d+[^?&]*/, "=s1200"));
          list.push(clean.replace(/=s\d+[^?&]*/, "=s800"));
          list.push(clean.replace(/=s\d+[^?&]*/, "=s544"));
          list.push(clean);
        } else {
          list.push(`${clean}=w1200-h1200-l90-rj`);
          list.push(`${clean}=w544-h544-l90-rj`);
          list.push(clean);
        }
      } else {
        list.push(clean);
      }
    };

    // 1. Local custom cover takes highest priority
    if (localCustomCover) {
      addGoogleUserContentVariants(localCustomCover);
    }

    // 2. Explicit customCoverUrl from YouTube Music / Server
    if (playlist.customCoverUrl) {
      addGoogleUserContentVariants(playlist.customCoverUrl);
    }

    // 3. If playlist.coverUrl is custom or has high-res Google User Content / studio thumbnail
    if (playlist.coverUrl) {
      const isCustomUrl =
        playlist.coverUrl.includes("studio_square_thumbnail") ||
        playlist.coverUrl.includes("/pl_c/") ||
        playlist.coverUrl.includes("googleusercontent.com") ||
        playlist.coverUrl.includes("ggpht.com") ||
        playlist.coverUrl.includes("yt3.ggpht.com") ||
        playlist.coverUrl.includes("/pl/") ||
        playlist.coverUrl.includes("/s_p/") ||
        playlist.coverUrl.startsWith("data:") ||
        Boolean(playlist.isCustomCover);

      if (isCustomUrl) {
        addGoogleUserContentVariants(playlist.coverUrl);
      }
    }

    // 4. YouTube Thumbnails from snippet (checking for custom URLs first)
    const thumbs = (playlist as any).thumbnails as YouTubeThumbnails | undefined;
    if (thumbs) {
      const thumbUrls = [
        thumbs.maxres?.url,
        thumbs.standard?.url,
        thumbs.high?.url,
        thumbs.medium?.url,
        thumbs.default?.url,
      ].filter(Boolean) as string[];

      for (const u of thumbUrls) {
        if (
          u.includes("studio_square_thumbnail") ||
          u.includes("/pl_c/") ||
          u.includes("googleusercontent.com") ||
          u.includes("ggpht.com") ||
          u.includes("yt3.ggpht.com") ||
          u.includes("/pl/") ||
          u.includes("/s_p/")
        ) {
          addGoogleUserContentVariants(u);
        }
      }
    }

    // 5. Standard playlist.coverUrl if not already added
    if (playlist.coverUrl) {
      list.push(playlist.coverUrl);
      if (playlist.coverUrl.includes("i.ytimg.com")) {
        if (playlist.coverUrl.includes("maxresdefault.jpg")) {
          list.push(playlist.coverUrl.replace("maxresdefault.jpg", "sddefault.jpg"));
          list.push(playlist.coverUrl.replace("maxresdefault.jpg", "hqdefault.jpg"));
          list.push(playlist.coverUrl.replace("maxresdefault.jpg", "mqdefault.jpg"));
          list.push(playlist.coverUrl.replace("maxresdefault.jpg", "default.jpg"));
        } else if (playlist.coverUrl.includes("sddefault.jpg")) {
          list.push(playlist.coverUrl.replace("sddefault.jpg", "hqdefault.jpg"));
          list.push(playlist.coverUrl.replace("sddefault.jpg", "mqdefault.jpg"));
          list.push(playlist.coverUrl.replace("sddefault.jpg", "default.jpg"));
        } else if (playlist.coverUrl.includes("hqdefault.jpg")) {
          list.push(playlist.coverUrl.replace("hqdefault.jpg", "maxresdefault.jpg"));
          list.push(playlist.coverUrl.replace("hqdefault.jpg", "mqdefault.jpg"));
          list.push(playlist.coverUrl.replace("hqdefault.jpg", "default.jpg"));
        }
      }
    }

    // 6. Generic YouTube Data API video thumbnails
    if (thumbs) {
      if (thumbs.maxres?.url) list.push(thumbs.maxres.url);
      if (thumbs.standard?.url) list.push(thumbs.standard.url);
      if (thumbs.high?.url) list.push(thumbs.high.url);
      if (thumbs.medium?.url) list.push(thumbs.medium.url);
      if (thumbs.default?.url) list.push(thumbs.default.url);
    }

    // Deduplicate while preserving order
    const unique: string[] = [];
    for (const url of list) {
      if (url && !unique.includes(url)) {
        unique.push(url);
      }
    }
    return unique;
  }, [
    localCustomCover,
    playlist.customCoverUrl,
    playlist.coverUrl,
    playlist.isCustomCover,
    (playlist as any).thumbnails,
  ]);

  // Reset candidates index when playlist changes
  useEffect(() => {
    setCandidateIndex(0);
    setAllFailed(false);
  }, [playlistId, playlist.coverUrl, playlist.customCoverUrl, localCustomCover]);

  const isExplicitCustom = Boolean(
    playlist.isCustomCover || playlist.customCoverUrl || localCustomCover
  );

  const currentSrc = candidates[candidateIndex] || null;

  const handleImageError = () => {
    if (candidateIndex < candidates.length - 1) {
      // Step down to next resolution in prioritized fallback order (e.g. maxres -> standard -> high -> medium -> default)
      setCandidateIndex((prev) => prev + 1);
    } else {
      setAllFailed(true);
    }
  };

  // 1. If a valid candidate URL is available and hasn't failed all resolutions
  if (currentSrc && !allFailed) {
    return (
      <div
        className={`relative overflow-hidden bg-neutral-900 ${
          aspectSquare ? "aspect-square" : ""
        } ${className}`}
      >
        <img
          src={currentSrc}
          alt={playlist.title || "Playlist cover"}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={handleImageError}
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        {showCustomBadge && isExplicitCustom && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-[9px] font-mono text-white flex items-center gap-1 shadow-lg z-10">
            <Sparkles className="w-2.5 h-2.5 text-[#c89b3c]" />
            <span>Custom</span>
          </div>
        )}
      </div>
    );
  }

  // 2. Default elegant music disc artwork for playlists
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-[#122820] via-[#0d1d17] to-[#07100d] flex items-center justify-center border border-[#1a382d]/40 ${
        aspectSquare ? "aspect-square" : ""
      } ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-black/40 border border-[#c89b3c]/20 flex items-center justify-center shadow-inner">
        <Music className="w-6 h-6 text-[#c89b3c]/80 stroke-1" />
      </div>
    </div>
  );
};
