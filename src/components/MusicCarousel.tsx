import React, { useRef } from "react";
import { Play, Pause, ChevronLeft, ChevronRight, Music, Disc, ListMusic, Video, User } from "lucide-react";
import { HomeFeedCardItem, HomeSection } from "../services/homeFeedService";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";

interface MusicCarouselProps {
  section: HomeSection;
  onPlaySong: (item: HomeFeedCardItem) => void;
  onSelectItem: (item: HomeFeedCardItem) => void;
  activeTrackId?: string;
  isPlaying?: boolean;
  designConfig?: FullAppDesignConfig;
}

export const MusicCarousel: React.FC<MusicCarouselProps> = ({
  section,
  onPlaySong,
  onSelectItem,
  activeTrackId,
  isPlaying = false,
  designConfig = FULL_APP_DESIGNS["designer"],
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -320, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 320, behavior: "smooth" });
    }
  };

  if (!section.items || section.items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3 relative group/carousel">
      {/* Section Header */}
      <div className="flex items-end justify-between px-1">
        <div>
          <h2
            className={`home-section-title text-lg sm:text-xl font-bold tracking-tight ${designConfig.headingPrimary || "text-white"}`}
            style={{ color: "var(--theme-text-primary, inherit)" }}
          >
            {section.title}
          </h2>
          {section.subtitle && (
            <p
              className={`text-xs ${designConfig.headingMuted || "text-white/60"} mt-0.5 font-medium`}
              style={{ color: "var(--theme-text-secondary, inherit)" }}
            >
              {section.subtitle}
            </p>
          )}
        </div>

        {/* Carousel Navigation Arrows */}
        <div className="hidden sm:flex items-center gap-1.5 opacity-70 group-hover/carousel:opacity-100 transition-opacity">
          <button
            onClick={scrollLeft}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 transition-all border border-white/10 text-white"
            style={{
              backgroundColor: "var(--theme-card-bg, rgba(255,255,255,0.05))",
              borderColor: "var(--theme-border-color, rgba(255,255,255,0.1))",
              color: "var(--theme-text-primary, #ffffff)",
            }}
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={scrollRight}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 transition-all border border-white/10 text-white"
            style={{
              backgroundColor: "var(--theme-card-bg, rgba(255,255,255,0.05))",
              borderColor: "var(--theme-border-color, rgba(255,255,255,0.1))",
              color: "var(--theme-text-primary, #ffffff)",
            }}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Scroll Track */}
      <div
        ref={scrollContainerRef}
        className="flex items-start gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 px-1 custom-scrollbar snap-x snap-mandatory scroll-smooth -mx-1"
      >
        {section.items.map((item, index) => {
          const isItemActive =
            Boolean(activeTrackId) &&
            (item.videoId === activeTrackId || item.id === activeTrackId);
          const isCurrentlyPlaying = isItemActive && isPlaying;
          const isSongOrVideo = item.type === "song" || item.type === "video";

          const handleCardClick = () => {
            if (isSongOrVideo) {
              onPlaySong(item);
            } else {
              onSelectItem(item);
            }
          };

          const handlePlayClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (isSongOrVideo) {
              onPlaySong(item);
            } else {
              onSelectItem(item);
            }
          };

          return (
            <div
              key={`${item.id}-${index}`}
              onClick={handleCardClick}
              className={`home-card music-card card-has-glow shrink-0 w-36 sm:w-44 group cursor-pointer select-none rounded-2xl p-2.5 transition-all duration-200 snap-start relative border ${
                isItemActive
                  ? "ring-2 ring-[var(--theme-border-color,#d4af37)] shadow-lg"
                  : "hover:scale-[1.02] hover:shadow-md"
              }`}
              style={{
                backgroundColor: "var(--theme-card-bg, rgba(20,20,20,0.6))",
                borderColor: isItemActive
                  ? "var(--theme-border-color, #d4af37)"
                  : "var(--theme-border-color, rgba(255,255,255,0.08))",
              }}
            >
              {/* Artwork Cover Frame */}
              <div
                className={`relative aspect-square w-full overflow-hidden mb-2.5 bg-black/40 ${
                  item.type === "artist" ? "rounded-full" : item.type === "playlist" ? "rounded-xl" : item.type === "album" ? "rounded-lg" : "rounded-xl"
                }`}
              >
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (item.videoId && !target.src.includes("hqdefault.jpg")) {
                      target.src = `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`;
                    } else {
                      target.src = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80";
                    }
                  }}
                />

                {/* Type Icon Badge */}
                <div className="absolute top-2 left-2 z-10">
                  <span className="p-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-white/90 flex items-center justify-center">
                    {item.type === "song" && <Music className="w-3 h-3" />}
                    {item.type === "video" && <Video className="w-3 h-3 text-red-400" />}
                    {item.type === "album" && <Disc className="w-3 h-3" />}
                    {item.type === "playlist" && <ListMusic className="w-3 h-3" />}
                    {item.type === "artist" && <User className="w-3 h-3 text-sky-400" />}
                  </span>
                </div>

                {/* Floating Play Action Button */}
                <div
                  className={`absolute inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center transition-opacity duration-200 ${
                    isItemActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}
                >
                  <button
                    onClick={handlePlayClick}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-black shadow-xl transform transition-transform active:scale-90 hover:scale-110"
                    style={{
                      backgroundColor: "var(--theme-border-color, #ffffff)",
                      color: "#000000",
                    }}
                    title={isCurrentlyPlaying ? "Pause" : "Play"}
                  >
                    {isCurrentlyPlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>
                </div>

                {/* Equalizer indicator if active */}
                {isCurrentlyPlaying && (
                  <div className="absolute bottom-2 right-2 flex items-end gap-0.5 px-1.5 py-1 rounded bg-black/70 backdrop-blur-md">
                    <span className="w-0.5 h-3 bg-[var(--theme-border-color,#d4af37)] animate-pulse" />
                    <span className="w-0.5 h-4 bg-[var(--theme-border-color,#d4af37)] animate-pulse delay-75" />
                    <span className="w-0.5 h-2 bg-[var(--theme-border-color,#d4af37)] animate-pulse delay-150" />
                  </div>
                )}
              </div>

              {/* Title & Metadata */}
              <div className="space-y-0.5">
                <h3
                  className={`text-xs sm:text-sm font-semibold truncate ${
                    isItemActive
                      ? "text-[var(--theme-border-color,#d4af37)] font-bold"
                      : "text-white"
                  }`}
                  style={{
                    color: isItemActive
                      ? "var(--theme-border-color, #d4af37)"
                      : "var(--theme-text-primary, #ffffff)",
                  }}
                  title={item.title}
                >
                  {item.title}
                </h3>
                <p
                  className="text-[11px] truncate opacity-70"
                  style={{ color: "var(--theme-text-secondary, rgba(255,255,255,0.7))" }}
                  title={item.artist || item.subtitle}
                >
                  {item.artist || item.subtitle || (item.type === "album" ? "Album" : "YouTube Music")}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
