import React, { useState, useEffect, useMemo } from "react";
import { Playlist, Track } from "../types";
import { Play, Sparkles, Eye, EyeOff, Music } from "lucide-react";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";
import {
  getPlaylistArtwork,
  resolvePlaylistCover,
  getCustomArtworkFromStorage,
} from "../services/playlistService";
import { isAuthenticCustomArtworkUrl, isVideoThumbnailUrl } from "../utils/customCoversStorage";

export { resolvePlaylistCover };

interface PlaylistCardProps {
  playlist: Playlist;
  onSelect: (playlist: Playlist) => void;
  onPlay?: (playlist: Playlist, e?: React.MouseEvent) => void;
  onToggleHide?: (playlistId: string, e: React.MouseEvent) => void;
  isHidden?: boolean;
  designConfig?: FullAppDesignConfig;
  className?: string;
  showCustomBadge?: boolean;
}

export const PlaylistCard: React.FC<PlaylistCardProps> = ({
  playlist,
  onSelect,
  onPlay,
  onToggleHide,
  isHidden = false,
  designConfig = FULL_APP_DESIGNS["designer"],
  className = "",
  showCustomBadge = false,
}) => {
  const playlistId = playlist.id || (playlist as any).playlistId || "";
  const cleanId = playlistId ? playlistId.replace(/^VL/, "") : "";

  // 1. Initial Synchronous Artwork Resolution
  const initialArt = useMemo(() => resolvePlaylistCover(playlist), [playlist]);
  const [currentArtwork, setCurrentArtwork] = useState<string | null>(initialArt);
  const [hasImageError, setHasImageError] = useState<boolean>(false);
  const [hasAttemptedTrackFallback, setHasAttemptedTrackFallback] = useState<boolean>(false);

  // Sync artwork whenever playlist prop changes or custom artwork storage updates
  useEffect(() => {
    setHasImageError(false);
    setHasAttemptedTrackFallback(false);
    const resolved = resolvePlaylistCover(playlist);
    setCurrentArtwork(resolved);

    const handleStorageChange = (e: any) => {
      const detail = e.detail;
      if (
        detail &&
        (detail.playlistId === playlistId ||
          detail.cleanId === cleanId ||
          detail.playlistId === cleanId ||
          detail.sync)
      ) {
        const updated = resolvePlaylistCover(playlist);
        setCurrentArtwork((prev) => (prev !== updated ? updated : prev));
        setHasImageError(false);
      }
    };

    window.addEventListener("playlist_custom_artwork_changed", handleStorageChange);
    return () => {
      window.removeEventListener("playlist_custom_artwork_changed", handleStorageChange);
    };
  }, [playlist, playlistId, cleanId]);

  // Determine if this playlist is authentically custom
  const isCustom = useMemo(() => {
    const customFromStore = getCustomArtworkFromStorage(playlistId);
    if (customFromStore && isAuthenticCustomArtworkUrl(customFromStore)) return true;
    if (playlist.customArtwork && isAuthenticCustomArtworkUrl(playlist.customArtwork)) return true;
    if (playlist.customCoverUrl && isAuthenticCustomArtworkUrl(playlist.customCoverUrl)) return true;
    if (playlist.isCustomCover && playlist.coverUrl && !isVideoThumbnailUrl(playlist.coverUrl)) return true;
    return false;
  }, [playlistId, playlist.customArtwork, playlist.customCoverUrl, playlist.isCustomCover, playlist.coverUrl]);

  /**
   * 2. Image Error Handling:
   * If the custom image fails to load or returns a 404/expired Blob URL,
   * automatically fall back to playlist.tracks[0].thumbnail (or first available track thumbnail)
   * instead of immediately dropping to the initial badge placeholder.
   */
  const handleImageError = () => {
    // 1. Fallback to First Track Cover Art if not attempted yet
    if (!hasAttemptedTrackFallback && playlist.tracks && playlist.tracks.length > 0) {
      setHasAttemptedTrackFallback(true);
      for (const track of playlist.tracks) {
        const trackThumb = track.thumbnail || track.coverUrl;
        if (trackThumb && trackThumb !== currentArtwork) {
          setCurrentArtwork(trackThumb);
          return;
        }
      }
    }

    // 2. Fallback to YouTube Official Thumbnails if custom image failed
    const officialThumbs = playlist.snippet?.thumbnails || playlist.thumbnails;
    const officialUrl =
      officialThumbs?.high?.url ||
      officialThumbs?.medium?.url ||
      officialThumbs?.default?.url;
    if (officialUrl && officialUrl !== currentArtwork) {
      setCurrentArtwork(officialUrl);
      return;
    }

    // 3. Fallback to general coverUrl if not equal to current failed artwork
    if (playlist.coverUrl && playlist.coverUrl !== currentArtwork) {
      setCurrentArtwork(playlist.coverUrl);
      return;
    }

    // 4. Finally drop to initial badge placeholder only when all image fallbacks are exhausted
    setHasImageError(true);
  };

  const count = playlist.tracks?.length || playlist.tracksCount || 0;
  const displayTitle = playlist.title || "Untitled Playlist";
  const initials = displayTitle
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

  return (
    <div
      id={`playlist-card-${cleanId}`}
      onClick={() => onSelect(playlist)}
      className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 ${designConfig.cardBg} ${designConfig.cardHover} border border-transparent hover:${designConfig.accentBorder} p-3 flex flex-col shadow-sm hover:shadow-xl ${className}`}
    >
      {/* Cover Art Container */}
      <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-neutral-900 shadow-inner flex items-center justify-center">
        {currentArtwork && !hasImageError ? (
          <img
            key={currentArtwork}
            src={currentArtwork}
            alt={displayTitle}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={handleImageError}
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        ) : (
          /* Stylized Letter-Avatar Placeholder Badge */
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-950 p-4 text-center select-none">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-2 shadow-inner">
              <span className="font-black text-xl tracking-wider text-neutral-300">
                {initials || <Music className="w-6 h-6 text-neutral-400" />}
              </span>
            </div>
            <p className="text-[11px] font-medium text-neutral-400 truncate max-w-full px-2">
              {displayTitle}
            </p>
          </div>
        )}

        {/* Custom Artwork Badge - Removed from Library/Cards per user request */}
        {showCustomBadge && isCustom && !hasImageError && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-[9px] font-mono text-white flex items-center gap-1 shadow-lg z-10 pointer-events-none">
            <Sparkles className="w-2.5 h-2.5 text-[var(--accent-color,var(--primary))]" />
            <span>Custom</span>
          </div>
        )}

        {/* Play Overlay Button (Desktop hover only - Backdrop allows clicks to open playlist; inner button triggers immediate playback) */}
        {onPlay && (
          <div
            className="hidden md:flex absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 items-center justify-center transition-opacity pointer-events-none"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlay(playlist, e);
              }}
              className="pointer-events-auto w-11 h-11 rounded-full bg-[var(--accent-color,#c89b3c)] text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 hover:scale-115 active:scale-95 transition-transform cursor-pointer"
              title={`Play ${displayTitle}`}
              aria-label={`Play ${displayTitle}`}
            >
              <Play className="w-5 h-5 fill-white ml-0.5" />
            </button>
          </div>
        )}

        {/* Hide / Unhide Quick Action Button */}
        {onToggleHide && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleHide(playlist.id, e);
            }}
            className={`absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 hover:bg-black/80 transition-all z-10 ${
              isHidden ? `!opacity-100 ${designConfig.accentText} text-[var(--accent-color,var(--primary))]` : ""
            }`}
            title={isHidden ? "Unhide playlist" : "Hide playlist"}
            aria-label={isHidden ? "Unhide playlist" : "Hide playlist"}
          >
            {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Playlist Metadata Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h3 className={`font-bold text-sm ${designConfig.textPrimary} truncate group-hover:${designConfig.accentText} transition-colors`}>
            {displayTitle}
          </h3>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className={`text-xs font-mono font-medium ${designConfig.accentText}`}>
            {count} {count === 1 ? "track" : "tracks"}
          </span>
          {playlist.isYouTubeSynced && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${designConfig.pillBg} font-mono`}>
              Synced
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
