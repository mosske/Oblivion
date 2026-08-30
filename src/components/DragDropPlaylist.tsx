import React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Track } from "../types";
import { GripVertical, Play, Trash2, Music2 } from "lucide-react";
import { cleanTrackTitle } from "../utils/formatters";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";
import { MarqueeText } from "./MarqueeText";

interface SortableTrackItemProps {
  key?: string;
  track: Track;
  dndId: string;
  index: number;
  onPlay: (track: Track, index: number) => void;
  onRemove: (trackId: string) => void;
  isPlayingCurrent: boolean;
  designConfig: FullAppDesignConfig;
}

function SortableTrackItem({
  track,
  dndId,
  index,
  onPlay,
  onRemove,
  isPlayingCurrent,
  designConfig,
}: SortableTrackItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dndId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center justify-between p-3 rounded-2xl mb-1.5 transition-all select-none border ${
        isPlayingCurrent
          ? `${designConfig.pillActive} shadow-md`
          : `${designConfig.cardBg} ${designConfig.cardHover}`
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className={`p-1 ${designConfig.textMuted} hover:${designConfig.textPrimary} cursor-grab active:cursor-grabbing rounded-lg transition-colors`}
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <span className={`w-5 text-xs font-mono ${designConfig.textMuted} text-center shrink-0 font-bold`}>
          {index + 1}
        </span>

        {/* Artwork & Play button */}
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
            onClick={() => onPlay(track, index)}
            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-xl transition-opacity"
          >
            <Play className="w-4 h-4 text-white fill-white" />
          </button>
        </div>

        {/* Track Title & Artist */}
        <div className="min-w-0 flex-1">
          <MarqueeText
            text={cleanTrackTitle(track.title, track.artist)}
            className={`text-sm font-semibold cursor-pointer hover:underline ${
              isPlayingCurrent ? designConfig.accentText : designConfig.textPrimary
            }`}
            containerClassName="w-full"
            onClick={() => onPlay(track, index)}
            speed={30}
          />
          <MarqueeText
            text={track.artist}
            className={`text-xs ${designConfig.textMuted}`}
            containerClassName="w-full"
            speed={26}
          />
        </div>
      </div>

      {/* Duration & Remove Action */}
      <div className="flex items-center gap-3 shrink-0">
        <span className={`text-xs font-mono ${designConfig.textSecondary}`}>
          {Math.floor(track.duration / 60)}:
          {String(Math.floor(track.duration % 60)).padStart(2, "0")}
        </span>

        <button
          onClick={() => onRemove(track.id)}
          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          title="Remove from playlist"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface DragDropPlaylistProps {
  tracks: Track[];
  onReorderTracks: (newTracks: Track[]) => void;
  onPlayTrack: (track: Track) => void;
  onPlayQueue?: (tracks: Track[], startIndex: number) => void;
  onRemoveTrack: (trackId: string) => void;
  currentTrackId?: string;
  designConfig?: FullAppDesignConfig;
}

export const DragDropPlaylist: React.FC<DragDropPlaylistProps> = ({
  tracks,
  onReorderTracks,
  onPlayTrack,
  onPlayQueue,
  onRemoveTrack,
  currentTrackId,
  designConfig = FULL_APP_DESIGNS["designer"],
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleTrackPlay = (track: Track, index: number) => {
    if (onPlayQueue && tracks && tracks.length > 0) {
      onPlayQueue(tracks, index);
    } else {
      onPlayTrack(track);
    }
  };

  const uniqueTracks = React.useMemo(() => {
    return tracks.map((t, idx) => ({
      ...t,
      dndId: `${t.id || 'tr'}_dnd_${idx}`,
    }));
  }, [tracks]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = uniqueTracks.findIndex((t) => t.dndId === active.id);
      const newIndex = uniqueTracks.findIndex((t) => t.dndId === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(tracks, oldIndex, newIndex);
        onReorderTracks(reordered);
      }
    }
  };

  if (uniqueTracks.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-12 ${designConfig.textMuted} border border-dashed ${designConfig.borderSubtle} rounded-3xl`}>
        <Music2 className="w-12 h-12 mb-2 stroke-1" />
        <p className={`text-sm font-medium ${designConfig.textPrimary}`}>This playlist is currently empty.</p>
        <p className={`text-xs ${designConfig.textSecondary}`}>Search for tracks and add them here to start listening!</p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={uniqueTracks.map((t) => t.dndId)} strategy={verticalListSortingStrategy}>
        <div className="w-full space-y-1">
          {uniqueTracks.map((track, idx) => (
            <SortableTrackItem
              key={track.dndId}
              track={track}
              dndId={track.dndId}
              index={idx}
              onPlay={handleTrackPlay}
              onRemove={onRemoveTrack}
              isPlayingCurrent={track.id === currentTrackId}
              designConfig={designConfig}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
