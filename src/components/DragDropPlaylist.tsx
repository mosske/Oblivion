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

interface SortableTrackItemProps {
  key?: string;
  track: Track;
  index: number;
  onPlay: (track: Track) => void;
  onRemove: (trackId: string) => void;
  isPlayingCurrent: boolean;
}

function SortableTrackItem({
  track,
  index,
  onPlay,
  onRemove,
  isPlayingCurrent,
}: SortableTrackItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: track.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center justify-between p-3 rounded-xl mb-1.5 transition-all select-none border ${
        isPlayingCurrent
          ? "bg-cyan-950/40 border-cyan-500/40 text-cyan-300"
          : "bg-slate-900/40 hover:bg-slate-800/60 border-slate-800/50 hover:border-slate-700"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="p-1 text-slate-600 group-hover:text-slate-400 cursor-grab active:cursor-grabbing hover:bg-slate-800 rounded-lg transition-colors"
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <span className="w-5 text-xs font-mono text-slate-500 text-center shrink-0">
          {index + 1}
        </span>

        {/* Artwork & Play button */}
        <div className="relative w-10 h-10 shrink-0">
          <img
            src={track.coverUrl}
            alt={track.title}
            className="w-10 h-10 rounded-lg object-cover"
          />
          <button
            onClick={() => onPlay(track)}
            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition-opacity"
          >
            <Play className="w-4 h-4 text-white fill-white" />
          </button>
        </div>

        {/* Track Title & Artist */}
        <div className="min-w-0 flex-1">
          <p
            onClick={() => onPlay(track)}
            className={`text-sm font-semibold truncate cursor-pointer hover:underline ${
              isPlayingCurrent ? "text-cyan-400" : "text-slate-200"
            }`}
          >
            {track.title}
          </p>
          <p className="text-xs text-slate-400 truncate">{track.artist}</p>
        </div>
      </div>

      {/* Duration & Remove Action */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs font-mono text-slate-400">
          {Math.floor(track.duration / 60)}:
          {String(Math.floor(track.duration % 60)).padStart(2, "0")}
        </span>

        <button
          onClick={() => onRemove(track.id)}
          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
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
  onRemoveTrack: (trackId: string) => void;
  currentTrackId?: string;
}

export const DragDropPlaylist: React.FC<DragDropPlaylistProps> = ({
  tracks,
  onReorderTracks,
  onPlayTrack,
  onRemoveTrack,
  currentTrackId,
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = tracks.findIndex((t) => t.id === active.id);
      const newIndex = tracks.findIndex((t) => t.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(tracks, oldIndex, newIndex);
        onReorderTracks(reordered);
      }
    }
  };

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
        <Music2 className="w-12 h-12 mb-2 stroke-1" />
        <p className="text-sm font-medium text-slate-400">This playlist is currently empty.</p>
        <p className="text-xs">Search for tracks and add them here to start listening!</p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tracks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="w-full space-y-1">
          {tracks.map((track, idx) => (
            <SortableTrackItem
              key={track.id}
              track={track}
              index={idx}
              onPlay={onPlayTrack}
              onRemove={onRemoveTrack}
              isPlayingCurrent={track.id === currentTrackId}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
