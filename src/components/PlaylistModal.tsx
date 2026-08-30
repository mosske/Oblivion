import React, { useState } from "react";
import { Playlist } from "../types";
import { X, Sparkles, Globe, Link2, Lock, Loader2, Check } from "lucide-react";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, description: string, coverUrl: string, visibility?: "PUBLIC" | "UNLISTED" | "PRIVATE") => Promise<void> | void;
  initialPlaylist?: Playlist | null;
  isYouTubeSynced?: boolean;
  designConfig?: FullAppDesignConfig;
}

export const YOUTUBE_ARTWORK_PRESETS = [
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
  const [coverUrl, setCoverUrl] = useState(initialPlaylist?.coverUrl || "");
  const [visibility, setVisibility] = useState<"PUBLIC" | "UNLISTED" | "PRIVATE">("PUBLIC");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Keep state synchronized when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setTitle(initialPlaylist?.title || "");
      setDescription(initialPlaylist?.description || "");
      setCoverUrl(initialPlaylist?.coverUrl || "");
      const rawPriv = (initialPlaylist?.privacy || initialPlaylist?.privacyStatus || "PUBLIC").toUpperCase();
      if (rawPriv === "PRIVATE") setVisibility("PRIVATE");
      else if (rawPriv === "UNLISTED") setVisibility("UNLISTED");
      else setVisibility("PUBLIC");

      setIsSubmitting(false);
    }
  }, [isOpen, initialPlaylist]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      // Race against a safety timeout (8s) so the UI can never hang perpetually
      const saveAction = async () => {
        await onSave(title, description, coverUrl, visibility);
      };
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 8000));
      await Promise.race([saveAction(), timeoutPromise]);
      onClose();
    } catch (err) {
      console.error("Failed to save playlist changes:", err);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const VISIBILITY_OPTIONS = [
    {
      id: "PUBLIC" as const,
      label: "Public",
      description: "Anyone can search for and view",
      icon: Globe,
    },
    {
      id: "UNLISTED" as const,
      label: "Unlisted",
      description: "Anyone with the link can view",
      icon: Link2,
    },
    {
      id: "PRIVATE" as const,
      label: "Private",
      description: "Only you can view",
      icon: Lock,
    },
  ];

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
            disabled={isSubmitting}
            className={`p-1.5 ${designConfig.textMuted} hover:${designConfig.textPrimary} rounded-xl ${designConfig.isLight ? "hover:bg-[#ede8dc]" : "hover:bg-slate-800"} transition-colors`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
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

          {/* Set Visibility Section */}
          <div className="space-y-2 pt-1">
            <label className={`block text-xs font-bold ${designConfig.textMuted} uppercase tracking-wider`}>
              Set Visibility
            </label>

            <div className="space-y-2">
              {VISIBILITY_OPTIONS.map((opt) => {
                const isSelected = visibility === opt.id;
                const IconComponent = opt.icon;

                return (
                  <div
                    key={opt.id}
                    onClick={() => setVisibility(opt.id)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                      isSelected
                        ? `border-[#c89b3c] ${designConfig.isLight ? "bg-[#c89b3c]/10" : "bg-[#c89b3c]/15"} shadow-sm`
                        : `${designConfig.borderSubtle} ${designConfig.isLight ? "bg-[#f5f2eb]/60 hover:bg-[#f5f2eb]" : "bg-black/20 hover:bg-black/40"}`
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className={`p-2 rounded-xl shrink-0 ${isSelected ? "bg-[#c89b3c] text-white shadow-sm" : `${designConfig.inputBg} ${designConfig.textMuted}`}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-bold ${isSelected ? designConfig.textPrimary : designConfig.textPrimary}`}>
                            {opt.label}
                          </h4>
                        </div>
                        <p className={`text-xs ${designConfig.textMuted} truncate`}>
                          {opt.description}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-[#c89b3c] text-white flex items-center justify-center shrink-0 ml-2 shadow-sm">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={`px-5 py-2.5 rounded-xl ${designConfig.btnSecondary} ${designConfig.textPrimary} text-xs font-semibold transition-colors`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2.5 rounded-xl ${designConfig.btnPrimary} text-xs font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{initialPlaylist ? "Save Changes" : "Create Playlist"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
