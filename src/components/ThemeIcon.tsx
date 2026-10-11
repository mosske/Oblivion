import React from "react";
import {
  Music,
  Music2,
  Disc3,
  Radio,
  Volume2,
  Mic2,
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
  | "piano"
  | "trumpet"
  | "sax"
  | "saxophone"
  | "violin"
  | "strings"
  | "headphone"
  | "headphones"
  | "studio"
  | "sheet"
  | "notes"
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
  | "track"
  | (string & {});

export interface ThemeIconProps extends LucideProps {
  name?: IconType;
  themeId?: string;
  genreTitle?: string;
  fallback?: React.ComponentType<LucideProps>;
}

/**
 * Computes font size for emoji span based on Tailwind width/height classes.
 */
const getEmojiSizeStyle = (className: string = ""): string => {
  if (className.includes("w-16") || className.includes("h-16")) return "2.85rem";
  if (className.includes("w-12") || className.includes("h-12")) return "2.15rem";
  if (className.includes("w-10") || className.includes("h-10")) return "1.75rem";
  if (className.includes("w-8") || className.includes("h-8")) return "1.45rem";
  if (className.includes("w-6") || className.includes("h-6")) return "1.25rem";
  if (className.includes("w-5") || className.includes("h-5")) return "1.15rem";
  if (className.includes("w-4") || className.includes("h-4")) return "1rem";
  if (className.includes("w-3.5") || className.includes("h-3.5")) return "0.9rem";
  if (className.includes("w-3") || className.includes("h-3")) return "0.75rem";
  return "1.1em";
};

/**
 * Returns the contextual musical instrument / rock emoji for Hard Rock.
 * Example emojis: 🎸 🎤 🎹 🎺 🎷 🎙️ 🎧 🎼 🎻 🥁 📻
 */
const getHardRockEmoji = (name?: IconType, genreTitle?: string): string => {
  const lowerTitle = (genreTitle || "").toLowerCase();

  // 1. Contextual matching by genre / category / mood title
  if (
    lowerTitle.includes("rock") ||
    lowerTitle.includes("metal") ||
    lowerTitle.includes("punk") ||
    lowerTitle.includes("guitar") ||
    lowerTitle.includes("electric") ||
    lowerTitle.includes("indie") ||
    lowerTitle.includes("trailer") ||
    lowerTitle.includes("movie")
  ) {
    return "🎸";
  }

  if (
    lowerTitle.includes("jazz") ||
    lowerTitle.includes("sax") ||
    lowerTitle.includes("blues") ||
    lowerTitle.includes("soul") ||
    lowerTitle.includes("smooth") ||
    lowerTitle.includes("brass") ||
    lowerTitle.includes("discovery") ||
    lowerTitle.includes("explore")
  ) {
    return "🎷";
  }

  if (
    lowerTitle.includes("chart") ||
    lowerTitle.includes("top") ||
    lowerTitle.includes("hit") ||
    lowerTitle.includes("popular") ||
    lowerTitle.includes("trumpet") ||
    lowerTitle.includes("horn") ||
    lowerTitle.includes("fanfare")
  ) {
    return "🎺";
  }

  if (
    lowerTitle.includes("piano") ||
    lowerTitle.includes("keyboard") ||
    lowerTitle.includes("classical") ||
    lowerTitle.includes("lofi") ||
    lowerTitle.includes("chill") ||
    lowerTitle.includes("relax") ||
    lowerTitle.includes("peaceful") ||
    lowerTitle.includes("ambient")
  ) {
    return "🎹";
  }

  if (
    lowerTitle.includes("violin") ||
    lowerTitle.includes("orchestra") ||
    lowerTitle.includes("symphony") ||
    lowerTitle.includes("strings") ||
    lowerTitle.includes("acoustic") ||
    lowerTitle.includes("folk") ||
    lowerTitle.includes("country")
  ) {
    return "🎻";
  }

  if (
    lowerTitle.includes("drum") ||
    lowerTitle.includes("beat") ||
    lowerTitle.includes("rhythm") ||
    lowerTitle.includes("hip hop") ||
    lowerTitle.includes("r&b") ||
    lowerTitle.includes("dance") ||
    lowerTitle.includes("party") ||
    lowerTitle.includes("groove") ||
    lowerTitle.includes("workout")
  ) {
    return "🥁";
  }

  if (
    lowerTitle.includes("podcast") ||
    lowerTitle.includes("media") ||
    lowerTitle.includes("interview") ||
    lowerTitle.includes("studio") ||
    lowerTitle.includes("talk") ||
    lowerTitle.includes("news")
  ) {
    return "🎙️";
  }

  if (
    lowerTitle.includes("vocal") ||
    lowerTitle.includes("sing") ||
    lowerTitle.includes("voice") ||
    lowerTitle.includes("live") ||
    lowerTitle.includes("performance") ||
    lowerTitle.includes("featured") ||
    lowerTitle.includes("pop") ||
    lowerTitle.includes("concert") ||
    lowerTitle.includes("music video") ||
    lowerTitle.includes("video")
  ) {
    return "🎤";
  }

  if (
    lowerTitle.includes("headphone") ||
    lowerTitle.includes("electronic") ||
    lowerTitle.includes("synth") ||
    lowerTitle.includes("edm") ||
    lowerTitle.includes("dj") ||
    lowerTitle.includes("focus") ||
    lowerTitle.includes("bass")
  ) {
    return "🎧";
  }

  if (
    lowerTitle.includes("radio") ||
    lowerTitle.includes("broadcast") ||
    lowerTitle.includes("station") ||
    lowerTitle.includes("mood") ||
    lowerTitle.includes("moment")
  ) {
    return "📻";
  }

  if (
    lowerTitle.includes("playlist") ||
    lowerTitle.includes("song") ||
    lowerTitle.includes("track") ||
    lowerTitle.includes("score") ||
    lowerTitle.includes("soundscape") ||
    lowerTitle.includes("curated")
  ) {
    return "🎼";
  }

  if (
    lowerTitle.includes("album") ||
    lowerTitle.includes("disc") ||
    lowerTitle.includes("vinyl")
  ) {
    return "🎷";
  }

  // 2. Icon name mapping
  switch (name) {
    case "guitar":
      return "🎸";
    case "mic":
    case "mic2":
    case "vocal":
      return "🎤";
    case "piano":
      return "🎹";
    case "trumpet":
      return "🎺";
    case "sax":
    case "saxophone":
      return "🎷";
    case "studio":
      return "🎙️";
    case "headphone":
    case "headphones":
    case "volume":
    case "volume2":
      return "🎧";
    case "sheet":
    case "notes":
    case "music":
    case "music2":
    case "track":
      return "🎼";
    case "violin":
    case "strings":
      return "🎻";
    case "drum":
    case "rhythm":
      return "🥁";
    case "radio":
      return "📻";
    case "flame":
      return "🎺";
    case "disc":
    case "playlist":
      return "🎷";
    case "mood":
      return "🎹";
    case "genre":
    case "category":
    case "heroBadge":
    case "sparkles":
      return "🎷";
    case "instrument":
    default:
      return "🎸";
  }
};

/**
 * Maps standard music & category icons to rich musical instrument Emojis (🎸, 🎤, 🎹, 🎺, 🎷, 🎙️, 🎧, 🎼, 🎻, 🥁, 📻)
 * with purple glow styling when the Hard Rock theme is active.
 */
export const ThemeIcon: React.FC<ThemeIconProps> = ({
  name = "music",
  themeId,
  genreTitle,
  fallback: FallbackIcon,
  className = "w-4 h-4",
  ...props
}) => {
  // Check if active theme is Hard Rock (from prop, document attribute, or class)
  const isHardRock =
    themeId === "hard-rock" || themeId === "sugar-time-jazz" ||
    (typeof document !== "undefined" &&
      (document.documentElement.getAttribute("data-theme") === "hard-rock" || document.documentElement.getAttribute("data-theme") === "sugar-time-jazz" ||
        document.body.classList.contains("theme-hard-rock") || document.body.classList.contains("theme-sugar-time-jazz") ||
        document.documentElement.classList.contains("theme-hard-rock") || document.documentElement.classList.contains("theme-sugar-time-jazz")));

  if (isHardRock) {
    const emoji = getHardRockEmoji(name, genreTitle);
    const fontSize = getEmojiSizeStyle(className);

    return (
      <span
        role="img"
        aria-label={genreTitle || name || "music emoji"}
        className={`emoji-icon jazz-emoji-icon inline-flex items-center justify-center shrink-0 select-none leading-none ${className}`}
        style={{
          fontSize,
          lineHeight: 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          filter: "drop-shadow(0 0 8px rgba(168, 85, 247, 0.75))",
          fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
          ...props.style,
        }}
      >
        {emoji}
      </span>
    );
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
