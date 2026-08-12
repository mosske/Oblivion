import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, ChevronUp, ChevronDown } from 'lucide-react';

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
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  const upNextTracks = playlist.slice(currentTrackIndex + 1).slice(0, 5);

  // Expanded full screen player
  if (isExpanded && currentTrack) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-800">
          <h2 className="text-xl font-semibold">Now Playing</h2>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-2 hover:bg-slate-700 rounded transition"
          >
            <ChevronDown className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto flex flex-col items-center justify-center p-8">
          {/* Album Art */}
          {currentTrack.coverUrl && (
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              className="w-80 h-80 object-cover rounded-lg mb-8 shadow-2xl"
            />
          )}

          {/* Track Info */}
          <h1 className="text-4xl font-bold text-center mb-2">{currentTrack.title}</h1>
          <p className="text-2xl text-gray-400 text-center mb-12">{currentTrack.artist}</p>

          {/* YouTube Player */}
          <div className="w-full max-w-2xl mb-8 rounded overflow-hidden">
            <iframe
              ref={iframeRef}
              width="100%"
              height="300"
              src={`https://www.youtube.com/embed/${currentTrack.youtubeVideoId}?autoplay=${isPlaying ? 1 : 0}`}
              title={currentTrack.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-8 mb-8">
            <button
              onClick={onPrevious}
              disabled={currentTrackIndex === 0}
              className="p-3 hover:bg-slate-700 rounded-full transition disabled:opacity-50"
            >
              <SkipBack className="w-8 h-8" />
            </button>
            <button
              onClick={onPlayPause}
              className="p-6 bg-cyan-500/30 hover:bg-cyan-500/50 rounded-full transition"
            >
              {isPlaying ? (
                <Pause className="w-10 h-10 text-cyan-400" />
              ) : (
                <Play className="w-10 h-10 text-cyan-400" />
              )}
            </button>
            <button
              onClick={onNext}
              disabled={currentTrackIndex === playlist.length - 1}
              className="p-3 hover:bg-slate-700 rounded-full transition disabled:opacity-50"
            >
              <SkipForward className="w-8 h-8" />
            </button>
          </div>

          {/* Up Next */}
          {upNextTracks.length > 0 && (
            <div className="w-full max-w-2xl mt-8">
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

  if (!currentTrack) {
    return null;
  }

  // MINI PLAYER - TRULY FIXED AT BROWSER BOTTOM
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t-2 border-cyan-500 shadow-2xl z-40 h-24">
      {/* Player bar */}
      <div className="h-full px-4 py-3 flex items-center gap-4 cursor-pointer hover:bg-slate-800/50 transition" onClick={() => setIsExpanded(true)}>
        {/* Album art */}
        {currentTrack.coverUrl && (
          <img
            src={currentTrack.coverUrl}
            alt={currentTrack.title}
            className="w-16 h-16 object-cover rounded shadow-lg flex-shrink-0"
          />
        )}

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold truncate text-white">{currentTrack.title}</h4>
          <p className="text-sm text-cyan-300 truncate">{currentTrack.artist}</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrevious();
            }}
            className="p-2 hover:bg-slate-700 rounded transition"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlayPause();
            }}
            className="p-2 bg-cyan-500/30 hover:bg-cyan-500/50 rounded transition"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="p-2 hover:bg-slate-700 rounded transition"
          >
            <SkipForward className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsExpanded(true)}
            className="p-2 hover:bg-slate-700 rounded transition ml-2"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Player;