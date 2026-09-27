import React from "react";
import {
  Music,
  Music2,
  Guitar,
  Drum,
  Mic2,
  Radio,
  Volume2,
  Disc3,
  AudioWaveform,
  Sparkles,
  Flame,
  Compass,
  LucideProps,
} from "lucide-react";

export type IconType =
  | "music"
  | "music2"
  | "genre"
  | "mood"
  | "instrument"
  | "guitar"
  | "drum"
  | "mic"
  | "mic2"
  | "radio"
  | "volume"
  | "volume2"
  | "sparkles"
  | "flame"
  | "disc"
  | "category"
  | "heroBadge"
  | "playlist"
  | "rhythm"
  | "vocal"
  | "track";

export interface ThemeIconProps extends LucideProps {
  name?: IconType;
  themeId?: string;
  genreTitle?: string;
  fallback?: React.ComponentType<LucideProps>;
}

/**
 * Maps standard music & category icons to rock/jazz instruments (Guitar, Drum, Mic2, Radio, Volume2, Waveform)
 * with purple glow and warm cream styling when the Sugar Time Jazz theme is active.
 */
export const ThemeIcon: React.FC<ThemeIconProps> = ({
  name = "music",
  themeId,
  genreTitle,
  fallback: FallbackIcon,
  className = "w-4 h-4",
  ...props
}) => {
  // Check if active theme is Sugar Time Jazz (from prop, document attribute, or class)
  const isSugarTimeJazz =
    themeId === "sugar-time-jazz" ||
    (typeof document !== "undefined" &&
      (document.documentElement.getAttribute("data-theme") === "sugar-time-jazz" ||
        document.body.classList.contains("theme-sugar-time-jazz") ||
        document.documentElement.classList.contains("theme-sugar-time-jazz")));

  if (isSugarTimeJazz) {
    const combinedClassName = `rock-icon category-icon ${className}`;
    const lowerTitle = (genreTitle || "").toLowerCase();

    // 1. Contextual instrument selection by genre / category title
    if (
      lowerTitle.includes("rock") ||
      lowerTitle.includes("metal") ||
      lowerTitle.includes("punk") ||
      lowerTitle.includes("guitar") ||
      lowerTitle.includes("jazz") ||
      lowerTitle.includes("blues") ||
      lowerTitle.includes("acoustic") ||
      lowerTitle.includes("folk") ||
      lowerTitle.includes("indie") ||
      lowerTitle.includes("explore") ||
      lowerTitle.includes("discovery")
    ) {
      return <Guitar className={combinedClassName} {...props} />;
    }

    if (
      lowerTitle.includes("drum") ||
      lowerTitle.includes("beat") ||
      lowerTitle.includes("rhythm") ||
      lowerTitle.includes("hip hop") ||
      lowerTitle.includes("r&b") ||
      lowerTitle.includes("dance") ||
      lowerTitle.includes("playlist") ||
      lowerTitle.includes("groove")
    ) {
      return <Drum className={combinedClassName} {...props} />;
    }

    if (
      lowerTitle.includes("vocal") ||
      lowerTitle.includes("sing") ||
      lowerTitle.includes("voice") ||
      lowerTitle.includes("live") ||
      lowerTitle.includes("performance") ||
      lowerTitle.includes("featured") ||
      lowerTitle.includes("pop") ||
      lowerTitle.includes("concert")
    ) {
      return <Mic2 className={combinedClassName} {...props} />;
    }

    if (
      lowerTitle.includes("radio") ||
      lowerTitle.includes("broadcast") ||
      lowerTitle.includes("station")
    ) {
      return <Radio className={combinedClassName} {...props} />;
    }

    if (
      lowerTitle.includes("electronic") ||
      lowerTitle.includes("synth") ||
      lowerTitle.includes("bass") ||
      lowerTitle.includes("ambient") ||
      lowerTitle.includes("sound")
    ) {
      return <AudioWaveform className={combinedClassName} {...props} />;
    }

    // 2. Icon name mapping for Sugar Time Jazz
    switch (name) {
      // Guitar for Rock / Main Categories / Explore headers
      case "guitar":
      case "category":
      case "heroBadge":
      case "music":
      case "music2":
      case "genre":
      case "sparkles":
      case "flame":
        return <Guitar className={combinedClassName} {...props} />;

      // Drum for Rhythms / Playlists / Beats
      case "drum":
      case "rhythm":
      case "playlist":
      case "mood":
      case "disc":
        return <Drum className={combinedClassName} {...props} />;

      // Mic2 for Vocals / Live Performances / Featured Tracks
      case "mic":
      case "mic2":
      case "vocal":
      case "track":
        return <Mic2 className={combinedClassName} {...props} />;

      // Radio & Volume2 for Stations / Sound Levels
      case "radio":
        return <Radio className={combinedClassName} {...props} />;
      case "volume":
      case "volume2":
        return <Volume2 className={combinedClassName} {...props} />;

      case "instrument":
      default:
        return <Guitar className={combinedClassName} {...props} />;
    }
  }

  // Default theme icon mappings
  if (FallbackIcon) {
    return <FallbackIcon className={className} {...props} />;
  }

  switch (name) {
    case "music2":
      return <Music2 className={className} {...props} />;
    case "genre":
      return <Music className={className} {...props} />;
    case "mood":
      return <Sparkles className={className} {...props} />;
    case "category":
      return <Compass className={className} {...props} />;
    case "disc":
      return <Disc3 className={className} {...props} />;
    case "radio":
      return <Radio className={className} {...props} />;
    case "volume":
    case "volume2":
      return <Volume2 className={className} {...props} />;
    case "mic":
    case "mic2":
    case "vocal":
      return <Mic2 className={className} {...props} />;
    case "sparkles":
      return <Sparkles className={className} {...props} />;
    case "flame":
      return <Flame className={className} {...props} />;
    case "heroBadge":
      return <Sparkles className={className} {...props} />;
    default:
      return <Music className={className} {...props} />;
  }
};

export const CategoryIcon = ThemeIcon;
export default ThemeIcon;
