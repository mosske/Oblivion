import React, { useState } from "react";
import { Playlist } from "../types";
import { X, Upload, Sparkles, Image as ImageIcon } from "lucide-react";

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, description: string, coverUrl: string) => void;
  initialPlaylist?: Playlist | null;
  isYouTubeSynced?: boolean;
}

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialPlaylist,
  isYouTubeSynced,
}) => {
  const [title, setTitle] = useState(initialPlaylist?.title || "");
  const [description, setDescription] = useState(initialPlaylist?.description || "");
  const [coverUrl, setCoverUrl] = useState(
    initialPlaylist?.coverUrl ||
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80"
  );
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setCoverUrl(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(title, description, coverUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-white">
              {initialPlaylist ? "Edit Playlist Details" : "Create New Playlist"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Cover Image Drag & Drop */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
              Playlist Cover Image
            </label>

            <div className="flex gap-4 items-center">
              <img
                src={coverUrl}
                alt="Playlist cover preview"
                className="w-24 h-24 rounded-xl object-cover border border-slate-700 shadow-md shrink-0"
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex-1 border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                  isDragging
                    ? "border-cyan-400 bg-cyan-950/20 text-cyan-300"
                    : "border-slate-700 hover:border-slate-500 bg-slate-950/40 text-slate-400"
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleImageUpload(e.target.files[0]);
                  }}
                  className="hidden"
                  id="playlist-cover-file-input"
                />
                <label htmlFor="playlist-cover-file-input" className="cursor-pointer flex flex-col items-center">
                  <Upload className="w-6 h-6 mb-1 text-cyan-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    Click to upload or drag & drop image
                  </span>
                  <span className="text-[10px] text-slate-500">JPG, PNG, WEBP</span>
                </label>
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Oblivion Synthwave Beats"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add an optional description for this playlist..."
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors resize-none"
            />
          </div>

          {/* Sync status notice */}
          {isYouTubeSynced && (
            <div className="p-3 bg-cyan-950/30 border border-cyan-800/40 rounded-xl text-xs text-cyan-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-cyan-400" />
              <span>This playlist will automatically update real-time on your YouTube account.</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
            >
              {initialPlaylist ? "Save Changes" : "Create Playlist"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
