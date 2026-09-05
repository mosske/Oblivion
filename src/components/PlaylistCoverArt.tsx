import React, { useState, useEffect } from "react";
import { Playlist, Track, YouTubeThumbnails } from "../types";
import { Music, Sparkles } from "lucide-react";
import { getCustomPlaylistCovers, DEFAULT_PLACEHOLDER_COVER } from "../utils/customCoversStorage";

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

const DEFAULT_PLACEHOLDER = DEFAULT_PLACEHOLDER_COVER;

export const PlaylistCoverArt: React.FC<PlaylistCoverArtProps> = ({
  playlist,
  className = "w-full h-full",
  showCustomBadge = false,
  aspectSquare = true,
}) => {
  const [failedSources, setFailedSources] = useState<Set<string>>(new Set());

  const playlistId = playlist?.id || (playlist as any)?.playlistId || "";
  const cleanId = playlistId ? playlistId.replace(/^VL/, "") : "";
  const customCoversStore = getCustomPlaylistCovers();
  const customFromStore = (playlistId && customCoversStore[playlistId]) || (cleanId && customCoversStore[cleanId]);

  const customCoverUrl = customFromStore || playlist?.customCoverUrl;
  const standardCoverUrl = playlist?.coverUrl;

  // Reset failure states when the playlist ID or cover URLs change
  useEffect(() => {
    setFailedSources(new Set());
  }, [playlistId, customCoverUrl, standardCoverUrl]);

  const hasCustomCover = Boolean(customCoverUrl && customCoverUrl.trim().length > 0);
  const isExplicitCustom = Boolean(playlist?.isCustomCover || hasCustomCover);

  const trackZeroArtwork = playlist?.tracks?.[0]?.coverUrl || (playlist?.tracks?.[0] as any)?.artwork;

  // Exact fallback resolution hierarchy:
  // CUSTOM_PLAYLIST_COVERS[playlist.id] || playlist.customCoverUrl || playlist.coverUrl || playlist.tracks?.[0]?.coverUrl || DEFAULT_PLACEHOLDER
  const candidateUrls: string[] = [
    customFromStore,
    playlist?.customCoverUrl,
    playlist?.coverUrl,
    trackZeroArtwork,
    DEFAULT_PLACEHOLDER,
  ].filter((u): u is string => Boolean(u && typeof u === "string" && u.trim().length > 0 && !failedSources.has(u)));

  const activeSrc = candidateUrls[0] || DEFAULT_PLACEHOLDER;

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

  // Default music disc artwork placeholder
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
