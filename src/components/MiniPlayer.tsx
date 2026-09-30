import React from "react";
import { Player, PlayerProps } from "./Player";

export type MiniPlayerProps = PlayerProps;

/**
 * Dedicated MiniPlayer component for floating bottom dock playback.
 * Ensures playerState.isFullscreen is false when rendering mini player mode.
 */
export const MiniPlayer: React.FC<MiniPlayerProps> = (props) => {
  const adjustedPlayerState = {
    ...props.playerState,
    isFullscreen: false,
  };

  return <Player {...props} playerState={adjustedPlayerState} />;
};

export default MiniPlayer;
