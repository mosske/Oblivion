import React, { useState, useEffect } from "react";
import { Settings, Plus } from "lucide-react";
import { Playlist } from "../types";
import { LibrarySettings } from "./LibrarySettings";

interface LibraryViewProps {
  onPlaylistSelect?: (playlistId: string, playlistName: string) => void;
  isLoggedIn?: boolean;
}

export function LibraryView({ onPlaylistSelect, isLoggedIn }: LibraryViewProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [hiddenPlaylistIds, setHiddenPlaylistIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("oblivion_hidden_playlists");
      return new Set(saved ? JSON.parse(saved) : []);
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    if (isLoggedIn) {
      fetchPlaylists();
    }
  }, [isLoggedIn]);

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      // Try loading from cache first
      const cachedPlaylists = localStorage.getItem("oblivion_saved_playlists");
      if (cachedPlaylists) {
        const parsed = JSON.parse(cachedPlaylists);
        setPlaylists(parsed);
      }

      // Fetch fresh from server
      const response = await fetch("/api/youtube/playlists");
      const data = await response.json();
      if (data.success) {
        setPlaylists(data.playlists);
        localStorage.setItem("oblivion_saved_playlists", JSON.stringify(data.playlists));
        localStorage.setItem("oblivion_playlist_sync_time", new Date().toISOString());
      }
    } catch (error) {
      console.error("Failed to fetch playlists:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter out hidden playlists
  const visiblePlaylists = playlists.filter(p => !hiddenPlaylistIds.has(p.id));

  const handleSaveHiddenState = (hiddenIds: string[]) => {
    setHiddenPlaylistIds(new Set(hiddenIds));
  };

  if (!isLoggedIn) {
    return (
      <div className="p-8">
        <h2 className="text-3xl font-bold text-white mb-4">Your Library</h2>
        <div className="text-gray-400">Sign in to see your playlists</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Your Library</h2>
          <div className="text-gray-400 text-sm">{visiblePlaylists.length} visible playlists</div>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition"
        >
          <Settings className="w-4 h-4" />
          Manage
        </button>
      </div>

      {loading && !playlists.length && (
        <div className="text-center py-12">
          <div className="text-gray-400">Loading playlists...</div>
        </div>
      )}

      {visiblePlaylists.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">No visible playlists</div>
          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 transition"
          >
            Unhide Playlists
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visiblePlaylists.map((playlist) => (
            <div
              key={playlist.id}
              onClick={() => onPlaylistSelect?.(playlist.id, playlist.title)}
              className="bg-slate-800 rounded-lg overflow-hidden cursor-pointer hover:bg-slate-700 transition group"
            >
              {playlist.coverUrl && (
                <div className="aspect-square overflow-hidden">
                  <img
                    src={playlist.coverUrl}
                    alt={playlist.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                </div>
              )}
              <div className="p-4">
                <h3 className="text-white font-semibold truncate mb-1">{playlist.title}</h3>
                <p className="text-gray-400 text-sm">{playlist.itemCount} songs</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showSettings && (
        <LibrarySettings
          playlists={playlists}
          onClose={() => setShowSettings(false)}
          onSave={handleSaveHiddenState}
        />
      )}
    </div>
  );
}

export default LibraryView;