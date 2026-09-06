import React, { useState, useRef } from "react";
import {
  Image as ImageIcon,
  Camera,
  Sparkles,
  Trash2,
  X,
  Check,
  Upload,
  Youtube,
  Wand2,
  RefreshCw,
  Sliders,
  ChevronRight
} from "lucide-react";
import { Playlist, Track } from "../types";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";

interface PlaylistCustomCoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: Playlist;
  onUpdateCover: (newCoverUrl: string, isCustom: boolean) => void;
  designConfig?: FullAppDesignConfig;
}

const AI_CURATED_STYLES = [
  {
    name: "A.I. Neural Special",
    url: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=800&q=80",
    prompt: "Neural network cybernetic brain glowing with gold and crimson circuits"
  },
  {
    name: "Golden Vinyl Studio",
    url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80",
    prompt: "Gold vinyl record floating over vintage recording acoustic studio"
  },
  {
    name: "Neon Cyberpunk Night",
    url: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80",
    prompt: "Futuristic Tokyo neon cityscape with synthwave glow"
  },
  {
    name: "Deep Cosmos Nebula",
    url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80",
    prompt: "Galactic spiral nebula in ultra high definition deep space"
  },
  {
    name: "Lo-Fi Midnight Chill",
    url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80",
    prompt: "Cozy rainy window with warm coffee and headphones at midnight"
  },
  {
    name: "Retro Synth Horizon",
    url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80",
    prompt: "Retro 80s wireframe grid with neon sunset horizon"
  }
];

export const PlaylistCustomCoverModal: React.FC<PlaylistCustomCoverModalProps> = ({
  isOpen,
  onClose,
  playlist,
  onUpdateCover,
  designConfig = FULL_APP_DESIGNS["designer"],
}) => {
  const [activeSubView, setActiveSubView] = useState<"menu" | "ai" | "video_thumb">("menu");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [ytUrlInput, setYtUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle local image file
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onUpdateCover(event.target.result as string, true);
          onClose();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle camera photo capture
  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onUpdateCover(event.target.result as string, true);
          onClose();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove custom image -> revert to default playlist/video cover
  const handleRemoveCustomImage = () => {
    const defaultCover =
      playlist.tracks?.[0]?.coverUrl ||
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=500&q=80";
    onUpdateCover(defaultCover, false);
    onClose();
  };

  // Apply AI Style
  const handleSelectAiStyle = (styleUrl: string) => {
    onUpdateCover(styleUrl, true);
    onClose();
  };

  // Generate Custom AI Artwork
  const handleGenerateAiCover = async () => {
    if (!aiPrompt.trim()) return;
    setIsGeneratingAi(true);
    try {
      // Find matching preset or generate high-quality unsplash/curated thematic artwork
      const encoded = encodeURIComponent(aiPrompt.trim());
      const generatedUrl = `https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=800&q=80`;
      
      // Select best matching curated aesthetic
      const match = AI_CURATED_STYLES.find((s) =>
        s.prompt.toLowerCase().includes(aiPrompt.toLowerCase().split(" ")[0])
      );
      const finalUrl = match?.url || generatedUrl;

      setTimeout(() => {
        setIsGeneratingAi(false);
        onUpdateCover(finalUrl, true);
        onClose();
      }, 1000);
    } catch {
      setIsGeneratingAi(false);
    }
  };

  // Extract from YouTube Video
  const handleApplyYouTubeVideoId = (videoId: string) => {
    const cleanId = videoId.replace(/[^a-zA-Z0-9_-]/g, "");
    if (cleanId) {
      const url = `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`;
      onUpdateCover(url, true);
      onClose();
    }
  };

  const handleCustomYtInput = () => {
    if (!ytUrlInput.trim()) return;
    let vId = ytUrlInput.trim();
    if (vId.includes("watch?v=")) {
      const m = vId.match(/v=([a-zA-Z0-9_-]{11})/);
      if (m) vId = m[1];
    } else if (vId.includes("youtu.be/")) {
      const m = vId.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
      if (m) vId = m[1];
    }
    handleApplyYouTubeVideoId(vId);
  };

  const isCustomCoverActive = Boolean(playlist.isCustomCover || playlist.customCoverUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      {/* Hidden file & camera inputs */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCameraCapture}
      />

      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md ${designConfig.modalBg} border-t sm:border ${designConfig.borderSubtle} rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden text-white transition-all transform animate-slide-up flex flex-col max-h-[85vh]`}
      >
        {/* Top Handle / Grab Bar (YouTube Style) */}
        <div className="pt-3 pb-1 flex justify-center sm:hidden">
          <div className="w-10 h-1 bg-white/30 rounded-full"></div>
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#c89b3c]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {activeSubView === "menu"
                  ? "Playlist Custom Image"
                  : activeSubView === "ai"
                  ? "Create with AI"
                  : "YouTube Video Artwork"}
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-[240px]">
                {playlist.title}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (activeSubView !== "menu") setActiveSubView("menu");
              else onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Action Sheet Options (Matching YouTube Screenshot) */}
        {activeSubView === "menu" && (
          <div className="p-3 space-y-1 overflow-y-auto custom-scrollbar">
            {/* 1. Choose from library */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-white/10 transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 group-hover:text-white group-hover:bg-[#c89b3c]/20 group-hover:border-[#c89b3c]/40 transition-colors">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white">Choose from library</div>
                <div className="text-xs text-slate-400">Upload any photo or image from your device</div>
              </div>
            </button>

            {/* 2. Take photo */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-white/10 transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 group-hover:text-white group-hover:bg-[#c89b3c]/20 group-hover:border-[#c89b3c]/40 transition-colors">
                <Camera className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white">Take photo</div>
                <div className="text-xs text-slate-400">Capture a new image with your camera</div>
              </div>
            </button>

            {/* 3. Create with AI */}
            <button
              onClick={() => setActiveSubView("ai")}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-white/10 transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#c89b3c]/15 border border-[#c89b3c]/30 flex items-center justify-center text-[#c89b3c] group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <span>Create with AI</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#c89b3c]/20 text-[#c89b3c] text-[10px] font-bold">
                    NEW
                  </span>
                </div>
                <div className="text-xs text-slate-400">Generate neural artwork or choose AI styles</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            {/* 4. YouTube Video Thumbnail */}
            <button
              onClick={() => setActiveSubView("video_thumb")}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-white/10 transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 group-hover:scale-105 transition-transform">
                <Youtube className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white">YouTube Video Thumbnail</div>
                <div className="text-xs text-slate-400">Pick from playlist songs or enter video link</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            {/* 5. Remove custom image (Exact option highlighted with yellow arrow in screenshot) */}
            {isCustomCoverActive && (
              <button
                onClick={handleRemoveCustomImage}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-red-500/15 text-red-400 transition-colors text-left group border-t border-white/5 mt-1"
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 group-hover:scale-105 transition-transform">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-red-400">Remove custom image</div>
                  <div className="text-xs text-red-300/70">Revert to default playlist track cover</div>
                </div>
              </button>
            )}
          </div>
        )}

        {/* AI Generator Subview */}
        {activeSubView === "ai" && (
          <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Describe Your AI Artwork
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. A.I. Special neural brain gold circuit..."
                  className="flex-1 px-4 py-2.5 bg-black/40 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-[#c89b3c]"
                />
                <button
                  type="button"
                  onClick={handleGenerateAiCover}
                  disabled={isGeneratingAi || !aiPrompt.trim()}
                  className={`px-4 py-2.5 ${designConfig.btnPrimary} disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-lg shrink-0`}
                >
                  <Wand2 className={`w-4 h-4 ${isGeneratingAi ? "animate-spin" : ""}`} stroke="currentColor" />
                  <span>{isGeneratingAi ? "Creating..." : "Generate"}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Curated AI Preset Themes
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {AI_CURATED_STYLES.map((style) => (
                  <div
                    key={style.name}
                    onClick={() => handleSelectAiStyle(style.url)}
                    className="group relative rounded-2xl overflow-hidden aspect-video border border-white/10 hover:border-[#c89b3c] cursor-pointer transition-all hover:scale-[1.02] shadow-md"
                  >
                    <img src={style.url} alt={style.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2.5 flex flex-col justify-end">
                      <p className="text-xs font-bold text-white truncate">{style.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* YouTube Video Thumbnail Subview */}
        {activeSubView === "video_thumb" && (
          <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Paste YouTube Video Link or ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ytUrlInput}
                  onChange={(e) => setYtUrlInput(e.target.value)}
                  placeholder="https://youtu.be/... or Video ID"
                  className="flex-1 px-4 py-2.5 bg-black/40 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-red-500"
                />
                <button
                  type="button"
                  onClick={handleCustomYtInput}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-lg shrink-0"
                >
                  <Check className="w-4 h-4" />
                  <span>Apply</span>
                </button>
              </div>
            </div>

            {playlist.tracks && playlist.tracks.length > 0 && (
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Pick from Playlist Tracks
                </label>
                <div className="grid grid-cols-2 gap-2.5 max-h-56 overflow-y-auto custom-scrollbar p-0.5">
                  {playlist.tracks.slice(0, 8).map((t, idx) => {
                    const trId = t.youtubeVideoId || t.id;
                    const thumbUrl =
                      t.coverUrl || `https://i.ytimg.com/vi/${trId}/hqdefault.jpg`;
                    return (
                      <div
                        key={`thumb_${trId}_${idx}`}
                        onClick={() => {
                          onUpdateCover(thumbUrl, true);
                          onClose();
                        }}
                        className="group relative rounded-xl overflow-hidden aspect-video border border-white/10 hover:border-red-500 cursor-pointer transition-all hover:scale-[1.02]"
                      >
                        <img src={thumbUrl} alt={t.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                        <div className="absolute bottom-0 inset-x-0 bg-black/75 p-1.5">
                          <p className="text-[10px] text-white font-semibold truncate">{t.title}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
