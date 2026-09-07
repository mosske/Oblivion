import React, { useState, useEffect } from "react";
import { Playlist, Track, YouTubeThumbnails } from "../types";
import { Music, Sparkles } from "lucide-react";
import {
  getPlaylistCustomArtwork,
  setPlaylistCustomArtwork,
  isAuthenticCustomArtworkUrl,
  isVideoThumbnailUrl,
} from "../utils/customCoversStorage";
import { getPlaylistArtwork, resolvePlaylistCover } from "../services/playlistService";

interface PlaylistCoverArtProps {
  playlist: Playlist | {
    id?: string;
    playlistId?: string;
    title?: string;
    coverUrl?: string;
    thumbnail?: string;
    customCoverUrl?: string;
    customArtwork?: string;
    isCustomCover?: boolean;
    thumbnails?: YouTubeThumbnails;
    snippet?: {
      thumbnails?: YouTubeThumbnails;
      title?: string;
      description?: string;
    };
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

    const candidate = playlist?.customArtwork || playlist?.customCoverUrl || (playlist?.isCustomCover ? playlist?.coverUrl : null);
    if (candidate && isAuthenticCustomArtworkUrl(candidate)) {
      return candidate;
    }
    return null;
  });

  const [imageError, setImageError] = useState<boolean>(false);
  const [fallbackCover, setFallbackCover] = useState<string | null>(null);

  // Sync state if playlist ID changes or custom artwork event fires
  useEffect(() => {
    setImageError(false);
    setFallbackCover(null);
    let resolved = getPlaylistCustomArtwork(playlistId);
    if (!resolved) {
      const candidate = playlist?.customArtwork || playlist?.customCoverUrl || (playlist?.isCustomCover ? playlist?.coverUrl : null);
      if (candidate && isAuthenticCustomArtworkUrl(candidate)) {
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
        const updatedArt = getPlaylistCustomArtwork(playlistId) || playlist?.customArtwork || playlist?.customCoverUrl || null;
        setCustomArt((prev) => (prev !== updatedArt ? updatedArt : prev));
        setImageError(false);
        setFallbackCover(null);
      }
    };

    window.addEventListener("playlist_custom_artwork_changed", handleStorageChange);
    return () => {
      window.removeEventListener("playlist_custom_artwork_changed", handleStorageChange);
    };
  }, [playlistId, cleanId, playlist?.customArtwork, playlist?.customCoverUrl, playlist?.coverUrl, playlist?.isCustomCover]);

  // Determine if this playlist is authentically custom
  const isExplicitCustom = Boolean(
    customArt ||
    (playlist?.customArtwork && isAuthenticCustomArtworkUrl(playlist.customArtwork)) ||
    (playlist?.customCoverUrl && isAuthenticCustomArtworkUrl(playlist.customCoverUrl)) ||
    (playlist?.isCustomCover && playlist?.coverUrl && !isVideoThumbnailUrl(playlist.coverUrl)) ||
    (playlist?.coverUrl && isAuthenticCustomArtworkUrl(playlist.coverUrl))
  );

  // 2. RESOLUTION ORDER VIA getPlaylistArtwork:
  let finalSource = fallbackCover || getPlaylistArtwork(playlist as Playlist);

  const handleImageError = () => {
    // If current source failed and we haven't tried the track thumbnails yet, try them!
    if (!fallbackCover && playlist?.tracks && playlist.tracks.length > 0) {
      for (const track of playlist.tracks) {
        const trackThumb = track.thumbnail || track.coverUrl;
        if (trackThumb && trackThumb !== finalSource) {
          setFallbackCover(trackThumb);
          return;
        }
      }
    }
    setImageError(true);
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
            <Sparkles className="w-2.5 h-2.5 text-[var(--accent-color,var(--primary))]" />
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
      <div className="w-12 h-12 rounded-full bg-black/50 border border-[var(--accent-color,var(--primary))]/30 flex items-center justify-center shadow-inner mb-1">
        <Music className="w-5 h-5 text-[var(--accent-color,var(--primary))]/90 stroke-1" />
      </div>
      <span className="text-[11px] font-mono font-bold tracking-widest text-[var(--accent-color,var(--primary))]/80 uppercase">
        {initials}
      </span>
    </div>
  );
};
