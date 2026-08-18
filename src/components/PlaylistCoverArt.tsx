import React, { useState } from "react";
import { Playlist, Track } from "../types";
import { Music, Sparkles } from "lucide-react";

interface PlaylistCoverArtProps {
  playlist: Playlist | {
    id?: string;
    title?: string;
    coverUrl?: string;
    customCoverUrl?: string;
    isCustomCover?: boolean;
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
  const [imgError, setImgError] = useState(false);

  const isCustom = Boolean(playlist.isCustomCover || playlist.customCoverUrl);
  const explicitCover = playlist.customCoverUrl || playlist.coverUrl;
  const tracks = playlist.tracks || [];

  // Extract up to 4 unique track covers for authentic YouTube Music 2x2 collage
  const uniqueTrackCovers: string[] = [];
  for (const t of tracks) {
    const cUrl = t?.coverUrl;
    if (cUrl && !uniqueTrackCovers.includes(cUrl) && !cUrl.includes("unsplash.com")) {
      uniqueTrackCovers.push(cUrl);
      if (uniqueTrackCovers.length === 4) break;
    }
  }

  // If explicit custom cover is provided and hasn't failed to load
  const isGenericUnsplash = explicitCover?.includes("unsplash.com") && tracks.length > 0;
  const shouldUseExplicit = explicitCover && !imgError && (!isGenericUnsplash || isCustom);

  if (shouldUseExplicit) {
    return (
      <div className={`relative overflow-hidden bg-neutral-900 ${aspectSquare ? "aspect-square" : ""} ${className}`}>
        <img
          src={explicitCover}
          alt={playlist.title || "Playlist cover"}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setImgError(true)}
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        {showCustomBadge && isCustom && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-[9px] font-mono text-white flex items-center gap-1 shadow-lg z-10">
            <Sparkles className="w-2.5 h-2.5 text-[#c89b3c]" />
            <span>Custom</span>
          </div>
        )}
      </div>
    );
  }

  // Authentic YouTube Music 2x2 Quad-Mosaic Collage (Matches https://music.youtube.com/library)
  if (uniqueTrackCovers.length >= 4) {
    return (
      <div className={`relative overflow-hidden bg-neutral-900 grid grid-cols-2 grid-rows-2 ${aspectSquare ? "aspect-square" : ""} ${className}`}>
        {uniqueTrackCovers.slice(0, 4).map((src, i) => (
          <div key={i} className="relative w-full h-full overflow-hidden border-[0.5px] border-black/10">
            <img
              src={src}
              alt=""
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.src = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80";
              }}
            />
          </div>
        ))}
        {showCustomBadge && isCustom && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-[9px] font-mono text-white flex items-center gap-1 shadow-lg z-10">
            <Sparkles className="w-2.5 h-2.5 text-[#c89b3c]" />
            <span>Custom</span>
          </div>
        )}
      </div>
    );
  }

  // Fallback to single track cover if 1-3 tracks exist
  if (uniqueTrackCovers.length > 0) {
    return (
      <div className={`relative overflow-hidden bg-neutral-900 ${aspectSquare ? "aspect-square" : ""} ${className}`}>
        <img
          src={uniqueTrackCovers[0]}
          alt={playlist.title || "Playlist cover"}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      </div>
    );
  }

  // Default elegant music disc artwork for empty or placeholder playlists
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-[#122820] via-[#0d1d17] to-[#07100d] flex items-center justify-center border border-[#1a382d]/40 ${
        aspectSquare ? "aspect-square" : ""
      } ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-black/40 border border-[#c89b3c]/20 flex items-center justify-center">
        <Music className="w-6 h-6 text-[#c89b3c]/80 stroke-1" />
      </div>
    </div>
  );
};
