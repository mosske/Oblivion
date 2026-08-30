import React, { useEffect, useState } from "react";
import { Track } from "../types";
import { Sparkles, Play, Plus, Radio, X, Check } from "lucide-react";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";

interface SimilarTracksDrawerProps {
  currentTrack: Track;
  onPlayTrack: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  onClose: () => void;
  designConfig?: FullAppDesignConfig;
}

export const SimilarTracksDrawer: React.FC<SimilarTracksDrawerProps> = ({
  currentTrack,
  onPlayTrack,
  onAddToQueue,
  onClose,
  designConfig = FULL_APP_DESIGNS["designer"],
}) => {
  const [similarTracks, setSimilarTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [addedIds, setAddedIds] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchSimilar = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/youtube/similar?trackId=${currentTrack.id}&title=${encodeURIComponent(
            currentTrack.title
          )}&artist=${encodeURIComponent(currentTrack.artist)}&genre=${encodeURIComponent(
            currentTrack.genre || ""
          )}`
        );
        const data = await res.json().catch(() => ({}));
        if (isMounted && data?.similarTracks) {
          setSimilarTracks(data.similarTracks);
        }
      } catch (err) {
        console.error("Similar tracks error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSimilar();
    return () => {
      isMounted = false;
    };
  }, [currentTrack.id, currentTrack.title]);

  const handleAddQueue = (track: Track) => {
    onAddToQueue(track);
    setAddedIds((prev) => [...prev, track.id]);
    setTimeout(() => {
      setAddedIds((prev) => prev.filter((id) => id !== track.id));
    }, 2000);
  };

  const cleanSimilar = React.useMemo(() => {
    const seen = new Set<string>();
    return (similarTracks || []).filter((tr) => {
      if (!tr) return false;
      const id = tr.id || tr.youtubeVideoId;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [similarTracks]);

  return (
    <div className={`w-80 ${designConfig.sidebarBg} border-l ${designConfig.borderSubtle} flex flex-col h-full z-20 backdrop-blur-2xl p-4 shadow-2xl ${designConfig.textSecondary}`}>
      <div className={`flex items-center justify-between pb-3 border-b ${designConfig.borderSubtle} mb-3`}>
        <div className={`flex items-center gap-2 ${designConfig.accentText} font-semibold text-sm`}>
          <Radio className="w-4 h-4 animate-pulse" />
          <span>Similar Tracks Radio</span>
        </div>
        <button
          onClick={onClose}
          className={`p-1.5 hover:${designConfig.isLight ? "bg-[#ede8dc]" : "bg-slate-800"} ${designConfig.textMuted} hover:${designConfig.textPrimary} rounded-xl transition-colors`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className={`mb-3 px-3 py-2.5 ${designConfig.cardBg} rounded-2xl border ${designConfig.borderSubtle}`}>
        <p className={`text-[10px] ${designConfig.textMuted} font-mono uppercase font-bold tracking-wider`}>In the vein of</p>
        <p className={`text-xs font-bold ${designConfig.textPrimary} truncate`}>{currentTrack.title}</p>
        <p className={`text-[11px] ${designConfig.accentText} font-medium truncate`}>{currentTrack.artist}</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
        {loading ? (
          <div className={`flex flex-col items-center justify-center h-48 space-y-2 ${designConfig.textMuted}`}>
            <Sparkles className={`w-6 h-6 animate-spin ${designConfig.accentText}`} />
            <p className="text-xs font-mono">Generating Radio Queue...</p>
          </div>
        ) : (
          cleanSimilar.map((track) => {
            const isAdded = addedIds.includes(track.id);
            return (
              <div
                key={track.id}
                className={`group flex items-center justify-between p-2.5 rounded-2xl ${designConfig.cardBg} ${designConfig.cardHover} border ${designConfig.borderSubtle} transition-all`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="relative w-10 h-10 shrink-0 bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center">
                    <img
                      src={track.coverUrl || (track.youtubeVideoId || track.id ? `https://i.ytimg.com/vi/${track.youtubeVideoId || track.id}/hqdefault.jpg` : "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80")}
                      alt={track.title}
                      className="w-10 h-10 rounded-xl object-cover"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      onError={(e) => {
                        const currentSrc = e.currentTarget.src || "";
                        const vId = track.youtubeVideoId || track.id;
                        if (vId && (currentSrc.includes("maxresdefault.jpg") || currentSrc.includes("sddefault.jpg"))) {
                          e.currentTarget.src = `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`;
                        } else if (vId && currentSrc.includes("hqdefault.jpg")) {
                          e.currentTarget.src = `https://i.ytimg.com/vi/${vId}/mqdefault.jpg`;
                        } else if (vId && currentSrc.includes("mqdefault.jpg")) {
                          e.currentTarget.src = `https://i.ytimg.com/vi/${vId}/default.jpg`;
                        } else {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80";
                        }
                      }}
                    />
                    <button
                      onClick={() => onPlayTrack(track)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-xl transition-opacity"
                    >
                      <Play className="w-4 h-4 text-white fill-white" />
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-semibold ${designConfig.textPrimary} truncate group-hover:${designConfig.accentText}`}>
                      {track.title}
                    </p>
                    <p className={`text-[10px] ${designConfig.textMuted} truncate`}>{track.artist}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleAddQueue(track)}
                  className={`p-1.5 rounded-xl text-xs transition-colors shrink-0 ${
                    isAdded
                      ? "bg-emerald-500/20 text-emerald-600 font-bold"
                      : `${designConfig.pillBg} ${designConfig.textPrimary} hover:scale-105 active:scale-95`
                  }`}
                  title="Add to Queue"
                >
                  {isAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
