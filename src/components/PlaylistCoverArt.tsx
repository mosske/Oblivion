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

  const playlistId = playlist.id || (playlist as any).playlistId || "";
  const customCoverUrl = playlist.customCoverUrl;
  const standardCoverUrl = playlist.coverUrl;
  const isExplicitCustom = Boolean(playlist.isCustomCover || customCoverUrl);

  // Helper to append Google User Content sizing variants
  const addGoogleUserContentVariants = (url: string, targetList: string[]) => {
    if (!url) return;
    let clean = url.startsWith("//") ? `https:${url}` : url;
    clean = clean.replace(/&amp;/g, "&");

    if (clean.includes("studio_square_thumbnail") || clean.includes("/pl_c/")) {
      targetList.push(clean);
      return;
    }

    if (
      clean.includes("googleusercontent.com") ||
      clean.includes("ggpht.com") ||
      clean.includes("yt3.ggpht.com") ||
      clean.includes("yt4.ggpht.com") ||
      clean.includes("yt3.googleusercontent.com") ||
      clean.includes("lh3.googleusercontent.com") ||
      clean.includes("play-lh.googleusercontent.com") ||
      clean.includes("photos.googleusercontent.com") ||
      clean.includes("ytimg.com/pl/") ||
      clean.includes("/pl/") ||
      clean.includes("/s_p/")
    ) {
      if (clean.match(/=w\d+-h\d+/)) {
        targetList.push(clean.replace(/=w\d+-h\d+[^?&]*/, "=w1200-h1200-l90-rj"));
        targetList.push(clean.replace(/=w\d+-h\d+[^?&]*/, "=w800-h800-l90-rj"));
        targetList.push(clean.replace(/=w\d+-h\d+[^?&]*/, "=w544-h544-l90-rj"));
        targetList.push(clean);
      } else if (clean.match(/=s\d+/)) {
        targetList.push(clean.replace(/=s\d+[^?&]*/, "=s1200"));
        targetList.push(clean.replace(/=s\d+[^?&]*/, "=s800"));
        targetList.push(clean.replace(/=s\d+[^?&]*/, "=s544"));
        targetList.push(clean);
      } else if (clean.match(/=w\d+/)) {
        targetList.push(clean.replace(/=w\d+[^?&]*/, "=w1200-h1200-l90-rj"));
        targetList.push(clean);
      } else {
        targetList.push(`${clean}=w1200-h1200-l90-rj`);
        targetList.push(`${clean}=w544-h544-l90-rj`);
        targetList.push(clean);
      }
    } else {
      targetList.push(clean);
    }
  };

  /**
   * Refactored artwork rendering hierarchy:
   * 1. If customCoverUrl is present, it is STRICTLY prioritized.
   *    Fallbacks to first track or generic video thumbnails execute ONLY if custom artwork URL is
   *    explicitly null/undefined OR all custom URL variants trigger onError.
   */
  const candidates: string[] = useMemo(() => {
    const list: string[] = [];

    // Phase 1: Custom Artwork candidates
    if (customCoverUrl) {
      addGoogleUserContentVariants(customCoverUrl, list);
    }

    // Phase 2: If isExplicitCustom flag is true and coverUrl looks like custom Google User Content
    if (list.length === 0 && standardCoverUrl) {
      const isCustomUrl =
        standardCoverUrl.includes("studio_square_thumbnail") ||
        standardCoverUrl.includes("/pl_c/") ||
        standardCoverUrl.includes("googleusercontent.com") ||
        standardCoverUrl.includes("ggpht.com") ||
        standardCoverUrl.includes("ytimg.com/pl/") ||
        standardCoverUrl.includes("/pl/") ||
        standardCoverUrl.includes("/s_p/") ||
        standardCoverUrl.startsWith("data:") ||
        Boolean(playlist.isCustomCover);

      if (isCustomUrl) {
        addGoogleUserContentVariants(standardCoverUrl, list);
      }
    }

    // Phase 3: Standard playlist coverUrl (non-custom) and resolution variants
    if (standardCoverUrl) {
      list.push(standardCoverUrl);
      if (standardCoverUrl.includes("i.ytimg.com")) {
        if (standardCoverUrl.includes("maxresdefault.jpg")) {
          list.push(standardCoverUrl.replace("maxresdefault.jpg", "sddefault.jpg"));
          list.push(standardCoverUrl.replace("maxresdefault.jpg", "hqdefault.jpg"));
          list.push(standardCoverUrl.replace("maxresdefault.jpg", "mqdefault.jpg"));
          list.push(standardCoverUrl.replace("maxresdefault.jpg", "default.jpg"));
        } else if (standardCoverUrl.includes("sddefault.jpg")) {
          list.push(standardCoverUrl.replace("sddefault.jpg", "hqdefault.jpg"));
          list.push(standardCoverUrl.replace("sddefault.jpg", "mqdefault.jpg"));
          list.push(standardCoverUrl.replace("sddefault.jpg", "default.jpg"));
        } else if (standardCoverUrl.includes("hqdefault.jpg")) {
          list.push(standardCoverUrl.replace("hqdefault.jpg", "mqdefault.jpg"));
          list.push(standardCoverUrl.replace("hqdefault.jpg", "default.jpg"));
          list.push(standardCoverUrl.replace("hqdefault.jpg", "sddefault.jpg"));
        }
      }
    }

    // Phase 4: YouTube Data API thumbnails
    const thumbs = (playlist as any).thumbnails as YouTubeThumbnails | undefined;
    if (thumbs) {
      if (thumbs.maxres?.url) list.push(thumbs.maxres.url);
      if (thumbs.standard?.url) list.push(thumbs.standard.url);
      if (thumbs.high?.url) list.push(thumbs.high.url);
      if (thumbs.medium?.url) list.push(thumbs.medium.url);
      if (thumbs.default?.url) list.push(thumbs.default.url);
    }

    // Phase 5: Fallback to first track's cover ONLY as the absolute last resort
    // (i.e. if no custom artwork or all other resolutions fail)
    const firstTrackCover = playlist.tracks?.[0]?.coverUrl;
    if (firstTrackCover) {
      list.push(firstTrackCover);
    }

    // Deduplicate preserving strict priority order
    const unique: string[] = [];
    for (const url of list) {
      if (url && !unique.includes(url)) {
        unique.push(url);
      }
    }
    return unique;
  }, [
    customCoverUrl,
    standardCoverUrl,
    playlist.isCustomCover,
    (playlist as any).thumbnails,
    playlist.tracks?.[0]?.coverUrl,
  ]);

  // Reset candidate index ONLY when the identity of the playlist or its artwork URLs change
  useEffect(() => {
    setCandidateIndex(0);
    setAllFailed(false);
  }, [playlistId, customCoverUrl, standardCoverUrl]);

  const currentSrc = candidates[candidateIndex] || null;

  const handleImageError = () => {
    if (candidateIndex < candidates.length - 1) {
      // Step down to next candidate in prioritized fallback order
      setCandidateIndex((prev) => prev + 1);
    } else {
      setAllFailed(true);
    }
  };

  // 1. If a valid candidate URL is available and hasn't failed all candidate variants
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

  // 2. Default music disc artwork fallback
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
