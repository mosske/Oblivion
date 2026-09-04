import React, { useState, useEffect } from "react";
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

const DEFAULT_PLACEHOLDER = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80";

export const PlaylistCoverArt: React.FC<PlaylistCoverArtProps> = ({
  playlist,
  className = "w-full h-full",
  showCustomBadge = false,
  aspectSquare = true,
}) => {
  const [customImageFailed, setCustomImageFailed] = useState<boolean>(false);
  const [fallbackImageFailed, setFallbackImageFailed] = useState<boolean>(false);

  const playlistId = playlist?.id || (playlist as any)?.playlistId || "";
  const customCoverUrl = playlist?.customCoverUrl;

  // Reset failure states ONLY when the playlist ID or custom cover URL explicitly changes
  useEffect(() => {
    setCustomImageFailed(false);
    setFallbackImageFailed(false);
  }, [playlistId, customCoverUrl]);

  const hasCustomCover = Boolean(customCoverUrl && customCoverUrl.trim().length > 0);
  const isExplicitCustom = Boolean(playlist?.isCustomCover || hasCustomCover);

  // Requirement C: Enforce Immutable Image Precedence & Defensive Guard Clause
  // Hierarchy: playlist.customCoverUrl > tracks[0].artwork > defaultPlaceholder
  // If customCoverUrl is present and non-empty, hard-lock it as the image source.
  // Fallback to tracks[0].artwork triggers ONLY if custom image fails and explicitly fires onError.
  const tracks = playlist?.tracks || [];
  const trackZeroArtwork = tracks[0]?.coverUrl || (tracks[0] as any)?.artwork;
  const standardCover = playlist?.coverUrl;

  const displayArtwork = (playlist?.customCoverUrl && !customImageFailed)
    ? playlist.customCoverUrl
    : (trackZeroArtwork || standardCover || DEFAULT_PLACEHOLDER);

  const handleImageError = () => {
    if (playlist?.customCoverUrl && !customImageFailed) {
      // Event-driven fallback: custom image explicitly fired an onError event
      setCustomImageFailed(true);
    } else {
      setFallbackImageFailed(true);
    }
  };

  if (!fallbackImageFailed && displayArtwork) {
    return (
      <div
        className={`relative overflow-hidden bg-neutral-900 ${
          aspectSquare ? "aspect-square" : ""
        } ${className}`}
      >
        <img
          src={displayArtwork}
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
