import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';

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
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onTrackSelect: (track: Track) => void;
}

export function Player({
  currentTrack,
  playlist,
  isPlaying,
  onPlayPause,
  onNext,
  onPrevious,
  onTrackSelect,
}: PlayerProps) {
  const [showPlayer, setShowPlayer] = React.useState(false);

  if (!currentTrack) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 shadow-lg">
      {/* Now Playing Bar */}
      <div className="px-4 py-3 cursor-pointer hover:bg-slate-700/50 transition" onClick={() => setShowPlayer(!showPlayer)}>
        <div className="flex items-center gap-4">
          {currentTrack.coverUrl && (
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              className="w-14 h-14 object-cover rounded"
            />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate text-white">{currentTrack.title}</h4>
            <p className="text-sm text-gray-400 truncate">{currentTrack.artist}</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrevious();
              }}
              className="p-2 hover:bg-slate-700 rounded transition"
            >
              <SkipBack className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlayPause();
              }}
              className="p-2 hover:bg-slate-700 rounded transition"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-cyan-400" />
              ) : (
                <Play className="w-5 h-5 text-cyan-400" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              className="p-2 hover:bg-slate-700 rounded transition"
            >
              <SkipForward className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Player */}
      {showPlayer && currentTrack.youtubeVideoId && (
        <div className="bg-slate-900 p-4 border-t border-slate-700">
          <div className="max-w-full">
            {/* YouTube Embed */}
            <div className="mb-4 rounded overflow-hidden">
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

            {/* Queue */}
            <div>
              <h5 className="text-sm font-semibold text-gray-400 mb-2">Up Next</h5>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {playlist.slice(playlist.indexOf(currentTrack) + 1).slice(0, 3).map((track) => (
                  <div
                    key={track.id}
                    onClick={() => onTrackSelect(track)}
                    className="flex gap-2 p-2 rounded hover:bg-slate-800 cursor-pointer transition text-sm"
                  >
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className="w-8 h-8 object-cover rounded flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-white truncate">{track.title}</p>
                      <p className="text-gray-400 text-xs truncate">{track.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Player;