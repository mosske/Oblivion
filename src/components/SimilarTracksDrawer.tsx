import React, { useEffect, useState } from "react";
import { Track } from "../types";
import { Sparkles, Play, Plus, Radio, X, Check } from "lucide-react";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";
import { parseTrackMetadata } from "../utils/formatters";
import { MarqueeText } from "./MarqueeText";

interface SimilarTracksDrawerProps {
  currentTrack: Track;
  seedTrack?: Track;
  isPlaying?: boolean;
  onPlayTrack: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  onClose: () => void;
  designConfig?: FullAppDesignConfig;
}

export const SimilarTracksDrawer: React.FC<SimilarTracksDrawerProps> = ({
  currentTrack,
  seedTrack,
  isPlaying = false,
  onPlayTrack,
  onAddToQueue,
  onClose,
  designConfig = FULL_APP_DESIGNS["designer"],
}) => {
  // Use locked seed track if provided, otherwise fallback to currentTrack
  const activeSeed = seedTrack || currentTrack;
  const [similarTracks, setSimilarTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [addedIds, setAddedIds] = useState<string[]>([]);

  // Disambiguate input seed track metadata
  const parsedMeta = React.useMemo(() => {
    return parseTrackMetadata(activeSeed.title, activeSeed.artist);
  }, [activeSeed.title, activeSeed.artist]);

  const activeSeedId = activeSeed.id || activeSeed.youtubeVideoId || "";
  const activeSeedTitle = activeSeed.title || "";

  useEffect(() => {
    let isMounted = true;
    const fetchSimilar = async () => {
      setLoading(true);
      try {
        const targetArtist = parsedMeta.artist || activeSeed.artist || "";
        const targetTitle = parsedMeta.title || activeSeed.title || "";
        const res = await fetch(
          `/api/youtube/similar?trackId=${encodeURIComponent(activeSeedId)}&title=${encodeURIComponent(
            targetTitle
          )}&artist=${encodeURIComponent(targetArtist)}&genre=${encodeURIComponent(
            activeSeed.genre || ""
          )}`
        );
        const data = await res.json().catch(() => ({}));
        if (isMounted && data?.similarTracks) {
          // Disambiguate results to strictly separate artist from channel
          const sanitizedTracks = (data.similarTracks as Track[]).map((t) => {
            const meta = parseTrackMetadata(t.title, t.artist || t.uploader);
            return {
              ...t,
              title: meta.title,
              artist: meta.artist,
              uploader: meta.uploader || t.uploader || t.artist,
            };
          });
          setSimilarTracks(sanitizedTracks);
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
  }, [activeSeedId, activeSeedTitle, parsedMeta.artist, parsedMeta.title]);

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

  const currentTrackId = currentTrack?.id || currentTrack?.youtubeVideoId;

  return (
    <div className={`w-full max-w-md ${designConfig.sidebarBg} border ${designConfig.borderSubtle} rounded-3xl flex flex-col max-h-[calc(100vh-280px)] min-h-[260px] z-30 backdrop-blur-2xl p-4 shadow-2xl ${designConfig.textSecondary} overflow-hidden my-auto`}>
      <div className={`flex items-center justify-between pb-3 border-b ${designConfig.borderSubtle} mb-3 shrink-0`}>
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

      {/* Emphasized Radio Station Seed card with marquees */}
      <div className={`mb-3.5 px-3.5 py-3 rounded-2xl border-2 ${designConfig.accentBorder} ${designConfig.isLight ? "bg-[#f5f1e8] shadow-md shadow-[#c59b27]/5" : "bg-slate-800/80 shadow-lg shadow-black/40"} shrink-0 relative overflow-hidden group`}>
        {/* Subtle accent corner glow indicator */}
        <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${designConfig.multiAccentGradient || "from-[#c59b27] to-transparent"} opacity-15 pointer-events-none rounded-bl-full`} />

        <div className="flex items-center gap-1.5 mb-1">
          <span className={`w-1.5 h-1.5 rounded-full ${designConfig.accentBg} animate-pulse`} />
          <p className={`text-[10px] ${designConfig.accentText} font-mono uppercase font-bold tracking-wider`}>
            Radio Station Seed
          </p>
        </div>

        <div className="space-y-0.5 min-w-0">
          <MarqueeText
            as="p"
            text={parsedMeta.title}
            className={`text-xs sm:text-sm font-bold ${designConfig.textPrimary} leading-tight`}
            containerClassName="w-full"
            speed={28}
          />
          <MarqueeText
            as="p"
            text={parsedMeta.artist}
            className={`text-[11px] font-semibold ${designConfig.accentText} leading-snug`}
            containerClassName="w-full"
            speed={24}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 custom-scrollbar pr-1">
        {loading ? (
          <div className={`flex flex-col items-center justify-center h-48 space-y-2 ${designConfig.textMuted}`}>
            <Sparkles className={`w-6 h-6 animate-spin ${designConfig.accentText}`} />
            <p className="text-xs font-mono">Generating Radio Queue...</p>
          </div>
        ) : cleanSimilar.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-48 space-y-2 ${designConfig.textMuted}`}>
            <Radio className="w-8 h-8 opacity-40" />
            <p className="text-xs font-mono">No similar tracks found for this title.</p>
          </div>
        ) : (
          cleanSimilar.map((track) => {
            const trId = track.id || track.youtubeVideoId;
            const isCurrent = Boolean(currentTrackId && (trId === currentTrackId || track.id === currentTrack.id || (track.youtubeVideoId && track.youtubeVideoId === currentTrack.youtubeVideoId)));
            const isAdded = addedIds.includes(track.id);

            return (
              <div
                key={track.id}
                className={`group flex items-center justify-between p-2.5 rounded-2xl transition-all ${
                  isCurrent
                    ? `${designConfig.cardBg} ring-1.5 ${designConfig.accentBorder} shadow-md`
                    : `${designConfig.cardBg} ${designConfig.cardHover} border ${designConfig.borderSubtle}`
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Equalizer animation icon or default indicator when active */}
                  {isCurrent && (
                    <div className="shrink-0 flex items-center justify-center w-5 h-5 mr-0.5" title="Currently Playing">
                      {isPlaying ? (
                        <div className="flex items-end justify-center gap-0.5 h-3.5">
                          <span className={`w-1 h-2.5 rounded-full animate-bounce bg-gradient-to-t ${designConfig.waveformGradient || "from-[#c59b27] to-[#f59e0b]"} shadow-[0_0_6px_var(--accent-primary)]`} />
                          <span className={`w-1 h-3.5 rounded-full animate-bounce delay-75 bg-gradient-to-t ${designConfig.waveformGradient || "from-[#c59b27] to-[#f59e0b]"} shadow-[0_0_6px_var(--accent-primary)]`} />
                          <span className={`w-1 h-2 rounded-full animate-bounce delay-150 bg-gradient-to-t ${designConfig.waveformGradient || "from-[#c59b27] to-[#f59e0b]"} shadow-[0_0_6px_var(--accent-primary)]`} />
                        </div>
                      ) : (
                        <div className="flex items-end justify-center gap-0.5 h-3.5 opacity-60">
                          <span className={`w-1 h-2 rounded-full bg-gradient-to-t ${designConfig.waveformGradient || "from-[#c59b27] to-[#f59e0b]"}`} />
                          <span className={`w-1 h-3 rounded-full bg-gradient-to-t ${designConfig.waveformGradient || "from-[#c59b27] to-[#f59e0b]"}`} />
                          <span className={`w-1 h-1.5 rounded-full bg-gradient-to-t ${designConfig.waveformGradient || "from-[#c59b27] to-[#f59e0b]"}`} />
                        </div>
                      )}
                    </div>
                  )}

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

                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onPlayTrack(track)}>
                    <p className={`text-xs font-semibold truncate ${
                      isCurrent
                        ? designConfig.accentText
                        : `${designConfig.textPrimary} group-hover:${designConfig.accentText}`
                    }`}>
                      {track.title}
                    </p>
                    <p className={`text-[10px] truncate ${
                      isCurrent
                        ? `${designConfig.accentText} opacity-80`
                        : designConfig.textMuted
                    }`}>
                      {track.artist}
                    </p>
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
