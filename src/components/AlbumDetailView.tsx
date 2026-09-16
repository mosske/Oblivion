import React from "react";
import { Album, Track, Playlist } from "../types";
import { FullAppDesignConfig } from "../utils/appDesignThemes";
import { PlaylistDetailView } from "./PlaylistDetailView";

export interface AlbumDetailViewProps {
  album: Album;
  onBack: () => void;
  onBackToLibrary?: () => void;
  onPlayTrack: (track: Track) => void;
  onPlayQueue: (tracks: Track[], startIndex: number) => void;
  onAddToQueue?: (track: Track) => void;
  onAddTrackToPlaylist?: (track: Track, playlistId: string) => void;
  onOpenAddToPlaylistModal?: (track: Track) => void;
  currentTrackId?: string;
  activeTrack?: Track | null;
  isPlaying?: boolean;
  playlists?: Playlist[];
  designConfig?: FullAppDesignConfig;
  repeatMode?: "off" | "one" | "all";
  onToggleRepeat?: () => void;
  isShuffle?: boolean;
  onToggleShuffle?: () => void;
}

export const AlbumDetailView: React.FC<AlbumDetailViewProps> = ({
  album,
  ...props
}) => {
  return (
    <PlaylistDetailView
      item={album}
      isAlbum={true}
      {...props}
    />
  );
};

export default AlbumDetailView;
