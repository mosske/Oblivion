import React, { useState, useEffect } from "react";
import { Playlist, Track, YouTubeThumbnails } from "../types";
import { Music, Sparkles } from "lucide-react";
import {
  getPlaylistCustomArtwork,
  setPlaylistCustomArtwork,
  isAuthenticCustomArtworkUrl,
  isVideoThumbnailUrl,
} from "../utils/customCoversStorage";

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
  const playlistId = playlist?.id || (playlist as any)?.playlistId || "";
  const cleanId = playlistId ? playlistId.replace(/^VL/, "") : "";

  // 1. ISOLATED LOCAL IMAGE RESOLUTION SYNCHRONOUSLY ON MOUNT
  const [customArt, setCustomArt] = useState<string | null>(() => {
    if (!playlistId) return null;
    const fromStore = getPlaylistCustomArtwork(playlistId);
    if (fromStore) return fromStore;

    // Check if the playlist prop already has valid custom artwork and lock it in
    const candidate = playlist?.customCoverUrl || (playlist?.isCustomCover ? playlist?.coverUrl : null);
    if (candidate && isAuthenticCustomArtworkUrl(candidate)) {
      setPlaylistCustomArtwork(playlistId, candidate);
      return candidate;
    }
    return null;
  });

  const [imageError, setImageError] = useState<boolean>(false);
  const [fallbackCover, setFallbackCover] = useState<string | null>(null);

  // Sync state if playlist ID changes or custom artwork event fires
  useEffect(() => {
    setImageError(false);
    let resolved = getPlaylistCustomArtwork(playlistId);
    if (!resolved) {
      const candidate = playlist?.customCoverUrl || (playlist?.isCustomCover ? playlist?.coverUrl : null);
      if (candidate && isAuthenticCustomArtworkUrl(candidate)) {
        setPlaylistCustomArtwork(playlistId, candidate);
        resolved = candidate;
      }
    }
    setCustomArt(resolved);

    const handleStorageChange = (e: any) => {
      const detail = e.detail;
      if (
        detail &&
        (detail.playlistId === playlistId ||
          detail.cleanId === cleanId ||
          detail.playlistId === cleanId ||
          detail.sync)
      ) {
        const updatedArt = getPlaylistCustomArtwork(playlistId);
        setCustomArt(updatedArt);
        setImageError(false);
      }
    };

    window.addEventListener("playlist_custom_artwork_changed", handleStorageChange);
    return () => {
      window.removeEventListener("playlist_custom_artwork_changed", handleStorageChange);
    };
  }, [playlistId, cleanId, playlist?.customCoverUrl, playlist?.coverUrl, playlist?.isCustomCover]);

  // Determine if this playlist is authentically custom
  const isExplicitCustom = Boolean(
    customArt ||
    (playlist?.customCoverUrl && isAuthenticCustomArtworkUrl(playlist.customCoverUrl)) ||
    (playlist?.isCustomCover && playlist?.coverUrl && !isVideoThumbnailUrl(playlist.coverUrl)) ||
    (playlist?.coverUrl && isAuthenticCustomArtworkUrl(playlist.coverUrl))
  );

  // 2. STRICT RESOLUTION ORDER:
  // If this playlist has custom artwork: ONLY resolve custom artwork, NEVER tracks[0]!
  let finalSource: string | null = null;
  if (customArt) {
    finalSource = customArt;
  } else if (playlist?.customCoverUrl && isAuthenticCustomArtworkUrl(playlist.customCoverUrl)) {
    finalSource = playlist.customCoverUrl;
  } else if (playlist?.isCustomCover && playlist?.coverUrl && !isVideoThumbnailUrl(playlist.coverUrl)) {
    finalSource = playlist.coverUrl;
  } else if (playlist?.coverUrl && isAuthenticCustomArtworkUrl(playlist.coverUrl)) {
    finalSource = playlist.coverUrl;
  } else if (!isExplicitCustom) {
    // Only non-custom playlists are allowed to display tracks[0] or generic coverUrl
    finalSource = playlist?.coverUrl || playlist?.tracks?.[0]?.coverUrl || fallbackCover;
  }

  const handleImageError = () => {
    // STRICT IMMUTABILITY: If this playlist has custom artwork, DO NOT fall back to the first song!
    if (isExplicitCustom) {
      setImageError(true);
      return;
    }
    const trackZero = playlist?.tracks?.[0];
    const trackZeroCover = trackZero?.coverUrl;
    if (finalSource !== trackZeroCover && trackZeroCover) {
      setFallbackCover(trackZeroCover);
    } else {
      setImageError(true);
    }
  };

  if (finalSource && !imageError) {
    return (
      <div
        className={`relative overflow-hidden bg-neutral-900 ${
          aspectSquare ? "aspect-square" : ""
        } ${className}`}
      >
        <img
          key={finalSource}
          src={finalSource}
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

  // Elegant stylized playlist placeholder
  const displayTitle = playlist?.title || "Music";
  const initials =
    displayTitle
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
