import React, { useEffect, useState } from "react";
import { Track } from "../types";
import { Sparkles, Play, Plus, Radio, X, Check } from "lucide-react";

interface SimilarTracksDrawerProps {
  currentTrack: Track;
  onPlayTrack: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  onClose: () => void;
}

export const SimilarTracksDrawer: React.FC<SimilarTracksDrawerProps> = ({
  currentTrack,
  onPlayTrack,
  onAddToQueue,
  onClose,
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
        const data = await res.json();
        if (isMounted && data.similarTracks) {
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

  return (
    <div className="w-80 bg-slate-950/95 border-l border-slate-800/80 flex flex-col h-full z-20 backdrop-blur-2xl p-4 shadow-2xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 mb-3">
        <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
          <Radio className="w-4 h-4 animate-pulse" />
          <span>Similar Tracks Radio</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mb-3 px-3 py-2 bg-slate-900/80 rounded-xl border border-slate-800">
        <p className="text-[10px] text-slate-400 font-mono uppercase">In the vein of</p>
        <p className="text-xs font-bold text-white truncate">{currentTrack.title}</p>
        <p className="text-[11px] text-cyan-400 truncate">{currentTrack.artist}</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-2 text-slate-400">
            <Sparkles className="w-6 h-6 animate-spin text-cyan-400" />
            <p className="text-xs font-mono">Generating Radio Queue...</p>
          </div>
        ) : (
          similarTracks.map((track) => {
            const isAdded = addedIds.includes(track.id);
            return (
              <div
                key={track.id}
                className="group flex items-center justify-between p-2 rounded-xl bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800/40 hover:border-slate-700 transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="relative w-10 h-10 shrink-0">
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                    <button
                      onClick={() => onPlayTrack(track)}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition-opacity"
                    >
                      <Play className="w-4 h-4 text-white fill-white" />
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-cyan-300">
                      {track.title}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">{track.artist}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleAddQueue(track)}
                  className={`p-1.5 rounded-lg text-xs transition-colors ${
                    isAdded
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
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
