import React from "react";
import {
  Music,
  Music2,
  Guitar,
  Drum,
  Disc3,
  Radio,
  AudioWaveform,
  Sparkles,
  Mic,
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
  | "sparkles"
  | "flame"
  | "radio"
  | "disc"
  | "category"
  | "heroBadge";

interface ThemeIconProps extends LucideProps {
  name?: IconType;
  themeId?: string;
  genreTitle?: string;
  fallback?: React.ComponentType<LucideProps>;
}

/**
 * Maps standard music & category icons to rock/jazz instruments (Guitar, Drum, Bass/Waveform, Disc)
 * when the Sugar Time Jazz theme is active.
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
    // Contextual instrument selection based on genre/category or icon name
    const lowerTitle = (genreTitle || "").toLowerCase();
    
    if (lowerTitle.includes("rock") || lowerTitle.includes("metal") || lowerTitle.includes("punk") || lowerTitle.includes("guitar")) {
      return <Guitar className={className} {...props} />;
    }
    if (lowerTitle.includes("drum") || lowerTitle.includes("beat") || lowerTitle.includes("hip hop") || lowerTitle.includes("r&b") || lowerTitle.includes("dance")) {
      return <Drum className={className} {...props} />;
    }
    if (lowerTitle.includes("jazz") || lowerTitle.includes("blues") || lowerTitle.includes("acoustic") || lowerTitle.includes("folk") || lowerTitle.includes("indie")) {
      return <Guitar className={className} {...props} />;
    }
    if (lowerTitle.includes("electronic") || lowerTitle.includes("synth") || lowerTitle.includes("bass") || lowerTitle.includes("ambient")) {
      return <AudioWaveform className={className} {...props} />;
    }

    switch (name) {
      case "music":
      case "music2":
      case "genre":
      case "guitar":
        return <Guitar className={className} {...props} />;
      case "drum":
      case "mood":
        return <Drum className={className} {...props} />;
      case "instrument":
      case "heroBadge":
        return <Guitar className={className} {...props} />;
      case "category":
      case "disc":
        return <Disc3 className={className} {...props} />;
      case "radio":
        return <Radio className={className} {...props} />;
      case "sparkles":
      case "flame":
        return <Guitar className={className} {...props} />;
      default:
        return <Guitar className={className} {...props} />;
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
