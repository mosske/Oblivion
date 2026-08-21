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

  // Build candidate URL hierarchy:
  // 1. Explicit user custom cover (local or remote)
  // 2. maxres.url -> standard.url -> high.url -> medium.url -> default.url
  // 3. playlist.coverUrl & YouTube fallback resolution strings
  const candidates: string[] = useMemo(() => {
    const list: string[] = [];

    if (localCustomCover) list.push(localCustomCover);
    if (playlist.customCoverUrl && playlist.customCoverUrl !== playlist.coverUrl) {
      list.push(playlist.customCoverUrl);
    }

    const thumbs = (playlist as any).thumbnails as YouTubeThumbnails | undefined;
    if (thumbs) {
      if (thumbs.maxres?.url) list.push(thumbs.maxres.url);
      if (thumbs.standard?.url) list.push(thumbs.standard.url);
      if (thumbs.high?.url) list.push(thumbs.high.url);
      if (thumbs.medium?.url) list.push(thumbs.medium.url);
      if (thumbs.default?.url) list.push(thumbs.default.url);
    }

    if (playlist.coverUrl) {
      list.push(playlist.coverUrl);
      // If it's a YouTube cover image URL, generate prioritized resolution fallbacks
      if (
        playlist.coverUrl.includes("i.ytimg.com") ||
        playlist.coverUrl.includes("googleusercontent.com") ||
        playlist.coverUrl.includes("ggpht.com")
      ) {
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
          list.push(playlist.coverUrl.replace("hqdefault.jpg", "mqdefault.jpg"));
          list.push(playlist.coverUrl.replace("hqdefault.jpg", "default.jpg"));
        }
      }
    }

    // Deduplicate
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
