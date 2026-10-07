import React, { useEffect, useState } from "react";
import { PlaylistDetailView, PlaylistDetailViewProps } from "./PlaylistDetailView";
import {
  revalidatePlaylist,
  syncPlaylistWithRemote,
  purgeTrackFromStorage,
  purgeTrackGlobally,
  getCachedPlaylist,
  fetchFreshYouTubePlaylist,
  savePlaylistToLocalStorage,
  getCachedPlaylistTracks,
  cleanVideoId,
} from "../services/playlistService";
import { Track } from "../types";

export function PlaylistView(props: PlaylistDetailViewProps) {
  const playlistId = props.item?.id;
  const [tracks, setTracks] = useState<Track[]>([]);

  useEffect(() => {
    if (!playlistId) return;

    // 1. Load the locally stored playlist array into React state immediately
    const cached = getCachedPlaylist(playlistId);
    const initialTracks = cached && cached.tracks && cached.tracks.length > 0
      ? cached.tracks
      : (props.item?.tracks || []);
    if (initialTracks.length > 0) {
      setTracks(initialTracks);
    }

    // 2. Concurrently execute a background fetch to YouTube's API for that playlist ID
    fetchFreshYouTubePlaylist(playlistId)
      .then((fresh) => {
        if (fresh && fresh.tracks) {
          const currentLocal = getCachedPlaylistTracks(playlistId).length > 0
            ? getCachedPlaylistTracks(playlistId)
            : initialTracks;

          // Re-verify that if a track missing from YouTube's API is found in local cache, call purgeTrackGlobally() immediately
          const freshVideoIds = new Set(
            fresh.tracks.map((t) => cleanVideoId(t.youtubeVideoId || t.youtubeId || t.id)).filter(Boolean)
          );
          for (const localT of currentLocal) {
            const lVid = cleanVideoId(localT.youtubeVideoId || localT.youtubeId || localT.id);
            if (lVid && !freshVideoIds.has(lVid)) {
              purgeTrackGlobally(playlistId, lVid);
            }
          }

          // 3. Compare the response against local storage: purge missing tracks, overwrite localStorage for ALL playlist cache keys, and update React state
          const synced = syncPlaylistWithRemote(playlistId, currentLocal, fresh.tracks);
          setTracks(synced.syncedTracks);
          savePlaylistToLocalStorage(playlistId, {
            tracks: synced.syncedTracks,
            coverUrl: fresh.coverUrl,
            title: fresh.title,
          });
        }
      })
      .catch((err) => console.warn("[PlaylistView] Background sync failed:", err));
  }, [playlistId]);

  // Listen for global hard purge events to instantly update view
  useEffect(() => {
    if (!playlistId) return;
    const handlePlaylistUpdated = (e: any) => {
      const targetPlId = e.detail?.playlistId;
      if (!targetPlId || targetPlId === playlistId || targetPlId === playlistId.replace(/^VL/, "")) {
        const cleaned = getCachedPlaylistTracks(playlistId);
        setTracks(cleaned);
      }
    };

    window.addEventListener("oblivion:playlist_updated" as any, handlePlaylistUpdated);
    window.addEventListener("oblivion_track_purged" as any, handlePlaylistUpdated);
    window.addEventListener("oblivion_track_unavailable" as any, handlePlaylistUpdated);
    return () => {
      window.removeEventListener("oblivion:playlist_updated" as any, handlePlaylistUpdated);
      window.removeEventListener("oblivion_track_purged" as any, handlePlaylistUpdated);
      window.removeEventListener("oblivion_track_unavailable" as any, handlePlaylistUpdated);
    };
  }, [playlistId]);

  return <PlaylistDetailView {...props} />;
}

export {
  PlaylistDetailView,
  PlaylistDetailView as PlaylistViewComponent,
  revalidatePlaylist,
  syncPlaylistWithRemote,
  purgeTrackFromStorage,
  purgeTrackGlobally,
  getCachedPlaylist,
  fetchFreshYouTubePlaylist,
  savePlaylistToLocalStorage,
};
export type { PlaylistDetailViewProps, PlaylistDetailViewProps as PlaylistViewProps };
export default PlaylistView;
