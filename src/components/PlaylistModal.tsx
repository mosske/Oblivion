import React, { useState } from "react";
import { Playlist } from "../types";
import { X, Upload, Sparkles } from "lucide-react";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, description: string, coverUrl: string) => void;
  initialPlaylist?: Playlist | null;
  isYouTubeSynced?: boolean;
  designConfig?: FullAppDesignConfig;
}

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialPlaylist,
  isYouTubeSynced,
  designConfig = FULL_APP_DESIGNS["designer"],
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className={`w-full max-w-lg ${designConfig.modalBg} border ${designConfig.borderSubtle} rounded-3xl shadow-2xl overflow-hidden ${designConfig.textSecondary}`}>
        <div className={`flex items-center justify-between p-5 border-b ${designConfig.borderSubtle}`}>
          <div className="flex items-center gap-2">
            <Sparkles className={`w-5 h-5 ${designConfig.accentText}`} />
            <h3 className={`text-lg font-bold ${designConfig.textPrimary}`}>
              {initialPlaylist ? "Edit Playlist Details" : "Create New Playlist"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 ${designConfig.textMuted} hover:${designConfig.textPrimary} rounded-xl ${designConfig.isLight ? "hover:bg-[#ede8dc]" : "hover:bg-slate-800"} transition-colors`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Cover Image Drag & Drop */}
          <div>
            <label className={`block text-xs font-semibold ${designConfig.textMuted} uppercase mb-2`}>
              Playlist Cover Image
            </label>

            <div className="flex gap-4 items-center">
              <img
                src={coverUrl}
                alt="Playlist cover preview"
                className={`w-24 h-24 rounded-2xl object-cover border ${designConfig.accentBorder} shadow-md shrink-0`}
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex-1 border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                  isDragging
                    ? `${designConfig.accentBorder} ${designConfig.accentText}`
                    : `${designConfig.borderSubtle} ${designConfig.isLight ? "bg-[#f5f2eb]" : "bg-slate-950/40"} ${designConfig.textMuted}`
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
                  <Upload className={`w-6 h-6 mb-1 ${designConfig.accentText}`} />
                  <span className={`text-xs font-semibold ${designConfig.textPrimary}`}>
                    Click to upload or drag & drop image
                  </span>
                  <span className={`text-[10px] ${designConfig.textMuted}`}>JPG, PNG, WEBP</span>
                </label>
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className={`block text-xs font-semibold ${designConfig.textMuted} uppercase mb-1`}>
              Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Oblivion Synthwave Beats"
              className={`w-full px-4 py-2.5 ${designConfig.inputBg} rounded-xl text-sm focus:outline-none transition-colors`}
            />
          </div>

          {/* Description */}
          <div>
            <label className={`block text-xs font-semibold ${designConfig.textMuted} uppercase mb-1`}>
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add an optional description for this playlist..."
              className={`w-full px-4 py-2.5 ${designConfig.inputBg} rounded-xl text-sm focus:outline-none transition-colors resize-none`}
            />
          </div>

          {/* Sync status notice */}
          {isYouTubeSynced && (
            <div className={`p-3 rounded-2xl ${designConfig.pillBg} text-xs flex items-center gap-2 font-mono`}>
              <Sparkles className={`w-4 h-4 shrink-0 ${designConfig.accentText}`} />
              <span className={designConfig.textPrimary}>This playlist will automatically update real-time on your YouTube account.</span>
            </div>
          )}

          {/* Actions */}
          <div className={`flex items-center justify-end gap-3 pt-4 border-t ${designConfig.borderSubtle}`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 text-sm ${designConfig.textMuted} hover:${designConfig.textPrimary} rounded-xl transition-colors`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2.5 text-sm font-semibold rounded-xl shadow-lg transition-all active:scale-95 ${designConfig.btnPrimary}`}
            >
              {initialPlaylist ? "Save Changes" : "Create Playlist"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
