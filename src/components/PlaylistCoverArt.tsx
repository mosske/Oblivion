import React, { useState, useEffect } from "react";
import { Playlist, Track } from "../types";
import { Music, Sparkles } from "lucide-react";

interface PlaylistCoverArtProps {
  playlist: Playlist | {
    id?: string;
    playlistId?: string;
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
          setImgError(false);
          return;
        }
      }
    } catch {}
    setLocalCustomCover(null);
  }, [playlistId, playlist.customCoverUrl, playlist.coverUrl]);

  // Reset img error if playlist or coverUrl changes
  useEffect(() => {
    setImgError(false);
  }, [playlist.coverUrl, playlist.customCoverUrl, localCustomCover]);

  const isExplicitCustom = Boolean(
    playlist.isCustomCover || playlist.customCoverUrl || localCustomCover
  );

  const resolvedCover =
    localCustomCover ||
    playlist.customCoverUrl ||
    playlist.coverUrl ||
    null;

  // 1. If explicit custom cover or playlist cover is available and hasn't failed
  if (resolvedCover && !imgError) {
    return (
      <div
        className={`relative overflow-hidden bg-neutral-900 ${
          aspectSquare ? "aspect-square" : ""
        } ${className}`}
      >
        <img
          src={resolvedCover}
          alt={playlist.title || "Playlist cover"}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setImgError(true)}
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
