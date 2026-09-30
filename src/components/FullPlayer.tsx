import React from "react";
import { Player } from "./Player";

export type FullPlayerProps = React.ComponentProps<typeof Player> & {
  playerMode?: "audio" | "video";
  onModeChange?: (mode: "audio" | "video") => void;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
  ytPlayerRef?: React.RefObject<any>;
};

/**
 * FullPlayer component passing props directly to Player to maintain single source of truth.
 */
export const FullPlayer: React.FC<FullPlayerProps> = (props) => {
  return <Player {...props} />;
};

export default FullPlayer;
