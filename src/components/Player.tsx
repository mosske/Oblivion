import React from 'react';
import { Play, Pause, SkipBack, SkipForward, X } from 'lucide-react';

interface Track {
  id: string;
  youtubeVideoId: string;
  title: string;
  artist: string;
  coverUrl: string;
}

interface PlayerProps {
  currentTrack: Track | null;
  playlist: Track[];
  currentTrackIndex: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function Player({
  currentTrack,
  playlist,
  currentTrackIndex,
  isPlaying,
  onPlayPause,
  onNext,
  onPrevious,
}: PlayerProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (!currentTrack) {
    return null;
  }

  const upNextTracks = playlist.slice(currentTrackIndex + 1).slice(0, 5);

  if (isExpanded) {
    // Full screen player
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold">Now Playing</h2>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-2 hover:bg-slate-700 rounded transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto flex flex-col items-center justify-center p-8">
          {/* Album Art */}
          {currentTrack.coverUrl && (
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              className="w-64 h-64 object-cover rounded-lg mb-8 shadow-2xl"
            />
          )}

          {/* Track Info */}
          <h1 className="text-3xl font-bold text-center mb-2">{currentTrack.title}</h1>
          <p className="text-xl text-gray-400 text-center mb-8">{currentTrack.artist}</p>

          {/* YouTube Embed */}
          <div className="w-full max-w-2xl mb-8 rounded overflow-hidden">
            <iframe
              width="100%"
              height="200"
              src={`https://www.youtube.com/embed/${currentTrack.youtubeVideoId}?autoplay=${isPlaying ? 1 : 0}`}
              title={currentTrack.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-6 mb-8">
            <button
              onClick={onPrevious}
              disabled={currentTrackIndex === 0}
              className="p-3 hover:bg-slate-700 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SkipBack className="w-6 h-6" />
            </button>
            <button
              onClick={onPlayPause}
              className="p-4 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-full transition"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 text-cyan-400" />
              ) : (
                <Play className="w-8 h-8 text-cyan-400" />
              )}
            </button>
            <button
              onClick={onNext}
              disabled={currentTrackIndex === playlist.length - 1}
              className="p-3 hover:bg-slate-700 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SkipForward className="w-6 h-6" />
            </button>
          </div>

          {/* Up Next */}
          {upNextTracks.length > 0 && (
            <div className="w-full max-w-2xl">
              <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase">Up Next</h3>
              <div className="space-y-2">
                {upNextTracks.map((track, idx) => (
                  <div key={track.id} className="text-sm text-gray-300 p-2 hover:bg-slate-700 rounded">
                    {idx + 1}. {track.title}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Mini player at bottom
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 shadow-lg z-50">
      <div className="px-4 py-3 cursor-pointer hover:bg-slate-700/50 transition" onClick={() => setIsExpanded(true)}>
        <div className="flex items-center gap-4">
          {currentTrack.coverUrl && (
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              className="w-14 h-14 object-cover rounded flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate text-white text-sm">{currentTrack.title}</h4>
            <p className="text-xs text-gray-400 truncate">{currentTrack.artist}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrevious();
              }}
              className="p-2 hover:bg-slate-700 rounded transition"
            >
              <SkipBack className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlayPause();
              }}
              className="p-2 hover:bg-slate-700 rounded transition"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-cyan-400" />
              ) : (
                <Play className="w-4 h-4 text-cyan-400" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              className="p-2 hover:bg-slate-700 rounded transition"
            >
              <SkipForward className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Player;