import React, { useState } from "react";
import { Eye, EyeOff, Save, X } from "lucide-react";
import { Playlist } from "../types";

interface LibrarySettingsProps {
  playlists: Playlist[];
  onClose: () => void;
  onSave: (hiddenPlaylistIds: string[]) => void;
}

export function LibrarySettings({ playlists, onClose, onSave }: LibrarySettingsProps) {
  const [hiddenPlaylists, setHiddenPlaylists] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("oblivion_hidden_playlists");
      return new Set(saved ? JSON.parse(saved) : []);
    } catch {
      return new Set();
    }
  });

  const togglePlaylist = (playlistId: string) => {
    setHiddenPlaylists((prev) => {
      const next = new Set(prev);
      if (next.has(playlistId)) {
        next.delete(playlistId);
      } else {
        next.add(playlistId);
      }
      return next;
    });
  };

  const handleSave = () => {
    const hiddenIds = Array.from(hiddenPlaylists);
    localStorage.setItem("oblivion_hidden_playlists", JSON.stringify(hiddenIds));
    onSave(hiddenIds);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-lg p-6 w-full max-w-2xl max-h-96 flex flex-col border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Manage Playlists Visibility</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-2 flex-1 overflow-y-auto mb-6">
          {playlists.length === 0 ? (
            <div className="text-gray-400 text-center py-8">No playlists to manage</div>
          ) : (
            playlists.map((playlist) => (
              <div
                key={playlist.id}
                className="flex items-center p-3 bg-slate-800 rounded hover:bg-slate-700 transition cursor-pointer"
                onClick={() => togglePlaylist(playlist.id)}
              >
                <button className="mr-3 text-cyan-400 hover:text-cyan-300">
                  {hiddenPlaylists.has(playlist.id) ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
                <div className="flex-1">
                  <div className="text-white font-medium">{playlist.title}</div>
                  <div className="text-xs text-gray-400">{playlist.itemCount} songs</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 transition font-semibold"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default LibrarySettings;