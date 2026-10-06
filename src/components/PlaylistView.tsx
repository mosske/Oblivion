import React from "react";
import { PlaylistDetailView, PlaylistDetailViewProps } from "./PlaylistDetailView";
import { revalidatePlaylist, syncPlaylistWithRemote, purgeTrackFromStorage } from "../services/playlistService";

export { PlaylistDetailView, PlaylistDetailView as PlaylistView, revalidatePlaylist, syncPlaylistWithRemote, purgeTrackFromStorage };
export type { PlaylistDetailViewProps, PlaylistDetailViewProps as PlaylistViewProps };
export default PlaylistDetailView;
