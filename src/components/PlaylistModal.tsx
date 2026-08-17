import React, { useState } from "react";
import { Playlist } from "../types";
import { X, Upload, Sparkles, Image as ImageIcon, Youtube, Check } from "lucide-react";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, description: string, coverUrl: string) => void;
  initialPlaylist?: Playlist | null;
  isYouTubeSynced?: boolean;
  designConfig?: FullAppDesignConfig;
}

const YOUTUBE_ARTWORK_PRESETS = [
  {
    name: "Studio Gold",
    url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Neon Synthwave",
    url: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Cyberpunk Glow",
    url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Deep Space Vibes",
    url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Midnight Vinyl",
    url: "https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Lo-Fi Acoustic",
    url: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Festival Lights",
    url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Ambient Aurora",
    url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80",
  },
];

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
  const [ytVideoInput, setYtVideoInput] = useState("");
  const [customUrlInput, setCustomUrlInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [activeCoverTab, setActiveCoverTab] = useState<"preset" | "youtube" | "url" | "upload">("preset");

  // Keep state synchronized when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setTitle(initialPlaylist?.title || "");
      setDescription(initialPlaylist?.description || "");
      setCoverUrl(
        initialPlaylist?.coverUrl ||
          "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80"
      );
      setYtVideoInput("");
      setCustomUrlInput("");
    }
  }, [isOpen, initialPlaylist]);

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

  // Extract YouTube Thumbnail from URL or ID
  const handleApplyYouTubeThumbnail = () => {
    if (!ytVideoInput.trim()) return;
    let videoId = ytVideoInput.trim();
    // Check if it's a URL
    if (videoId.includes("youtube.com/watch")) {
      const match = videoId.match(/v=([a-zA-Z0-9_-]{11})/);
      if (match) videoId = match[1];
    } else if (videoId.includes("youtu.be/")) {
      const match = videoId.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
      if (match) videoId = match[1];
    }
    const cleanId = videoId.replace(/[^a-zA-Z0-9_-]/g, "");
    if (cleanId) {
      const highResUrl = `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`;
      setCoverUrl(highResUrl);
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
      <div className={`w-full max-w-xl ${designConfig.modalBg} border ${designConfig.borderSubtle} rounded-3xl shadow-2xl overflow-hidden ${designConfig.textSecondary} max-h-[90vh] flex flex-col`}>
        {/* Modal Header */}
        <div className={`flex items-center justify-between p-5 border-b ${designConfig.borderSubtle} shrink-0`}>
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          {/* Cover Art Section with Tabbed Pickers */}
          <div>
            <label className={`block text-xs font-bold ${designConfig.textMuted} uppercase mb-2 tracking-wider`}>
              YouTube Custom Playlist Image
            </label>

            <div className="flex gap-4 items-start mb-3">
              <div className="relative group shrink-0">
                <img
                  src={coverUrl}
                  alt="Playlist cover preview"
                  className={`w-28 h-28 rounded-2xl object-cover border-2 ${designConfig.accentBorder} shadow-lg shrink-0`}
                  onError={(e) => {
                    e.currentTarget.src =
                      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80";
                  }}
                />
              </div>

              {/* Cover Art Tab Choosers */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-black/15 border border-white/5 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveCoverTab("preset")}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      activeCoverTab === "preset"
                        ? `${designConfig.accentBg} text-white shadow-sm font-semibold`
                        : `${designConfig.textMuted} hover:${designConfig.textPrimary}`
                    }`}
                  >
                    Presets
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCoverTab("youtube")}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      activeCoverTab === "youtube"
                        ? `${designConfig.accentBg} text-white shadow-sm font-semibold`
                        : `${designConfig.textMuted} hover:${designConfig.textPrimary}`
                    }`}
                  >
                    YouTube Video Art
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCoverTab("url")}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      activeCoverTab === "url"
                        ? `${designConfig.accentBg} text-white shadow-sm font-semibold`
                        : `${designConfig.textMuted} hover:${designConfig.textPrimary}`
                    }`}
                  >
                    Custom URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCoverTab("upload")}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      activeCoverTab === "upload"
                        ? `${designConfig.accentBg} text-white shadow-sm font-semibold`
                        : `${designConfig.textMuted} hover:${designConfig.textPrimary}`
                    }`}
                  >
                    Upload File
                  </button>
                </div>

                {/* Preset Artwork Grid */}
                {activeCoverTab === "preset" && (
                  <div className="grid grid-cols-4 gap-2 pt-1 max-h-32 overflow-y-auto custom-scrollbar p-1">
                    {YOUTUBE_ARTWORK_PRESETS.map((preset) => (
                      <div
                        key={preset.name}
                        onClick={() => setCoverUrl(preset.url)}
                        className={`relative rounded-xl overflow-hidden cursor-pointer border transition-all aspect-video ${
                          coverUrl === preset.url
                            ? `ring-2 ${designConfig.accentBorder} scale-95`
                            : "border-transparent opacity-80 hover:opacity-100 hover:scale-105"
                        }`}
                        title={preset.name}
                      >
                        <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                        {coverUrl === preset.url && (
                          <div className="absolute inset-0 bg-[#c89b3c]/40 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* YouTube Video Thumbnail Option */}
                {activeCoverTab === "youtube" && (
                  <div className="space-y-2 pt-1">
                    <p className={`text-[11px] ${designConfig.textMuted}`}>
                      Paste any YouTube Video URL or Video ID to use its artwork:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={ytVideoInput}
                        onChange={(e) => setYtVideoInput(e.target.value)}
                        placeholder="e.g. https://youtu.be/kJQP7kiw5Fk"
                        className={`flex-1 px-3 py-1.5 ${designConfig.inputBg} rounded-xl text-xs focus:outline-none`}
                      />
                      <button
                        type="button"
                        onClick={handleApplyYouTubeThumbnail}
                        className={`px-3 py-1.5 ${designConfig.btnPrimary} rounded-xl text-xs font-semibold shrink-0`}
                      >
                        Get Artwork
                      </button>
                    </div>
                  </div>
                )}

                {/* Custom URL Input */}
                {activeCoverTab === "url" && (
                  <div className="space-y-2 pt-1">
                    <input
                      type="url"
                      value={customUrlInput}
                      onChange={(e) => {
                        setCustomUrlInput(e.target.value);
                        if (e.target.value.startsWith("http")) {
                          setCoverUrl(e.target.value);
                        }
                      }}
                      placeholder="Paste image web link (https://...)"
                      className={`w-full px-3 py-2 ${designConfig.inputBg} rounded-xl text-xs focus:outline-none`}
                    />
                  </div>
                )}

                {/* Drag and Drop File Upload */}
                {activeCoverTab === "upload" && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
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
                      <Upload className={`w-5 h-5 mb-1 ${designConfig.accentText}`} />
                      <span className={`text-xs font-semibold ${designConfig.textPrimary}`}>
                        Click to choose or drop image file
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className={`block text-xs font-bold ${designConfig.textMuted} uppercase mb-1.5 tracking-wider`}>
              Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. My Favorite Synthwave Classics"
              className={`w-full px-4 py-2.5 ${designConfig.inputBg} rounded-xl text-sm focus:outline-none transition-colors font-medium`}
            />
          </div>

          {/* Description */}
          <div>
            <label className={`block text-xs font-bold ${designConfig.textMuted} uppercase mb-1.5 tracking-wider`}>
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add an optional description for your YouTube Music playlist..."
              className={`w-full px-4 py-2.5 ${designConfig.inputBg} rounded-xl text-sm focus:outline-none transition-colors resize-none`}
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-5 py-2.5 rounded-xl ${designConfig.btnSecondary} ${designConfig.textPrimary} text-xs font-semibold transition-colors`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-6 py-2.5 rounded-xl ${designConfig.btnPrimary} text-xs font-bold shadow-lg transition-all active:scale-95`}
            >
              {initialPlaylist ? "Save Changes" : "Create Playlist"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
