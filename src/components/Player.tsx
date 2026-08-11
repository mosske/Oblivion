import React from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

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
  const [showPlayer, setShowPlayer] = React.useState(false);

  if (!currentTrack) {
    return null;
  }

  const upNextTracks = playlist.slice(currentTrackIndex + 1).slice(0, 5);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 shadow-lg z-50">
      {/* Now Playing Bar */}
      <div className="px-4 py-3 cursor-pointer hover:bg-slate-700/50 transition" onClick={() => setShowPlayer(!showPlayer)}>
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

      {/* Expanded Player */}
      {showPlayer && currentTrack.youtubeVideoId && (
        <div className="bg-slate-900 p-4 border-t border-slate-700 max-h-64 overflow-y-auto">
          {/* YouTube Embed */}
          <div className="mb-4 rounded overflow-hidden">
            <iframe
              width="100%"
              height="180"
              src={`https://www.youtube.com/embed/${currentTrack.youtubeVideoId}?autoplay=${isPlaying ? 1 : 0}`}
              title={currentTrack.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Queue - Text Only */}
          {upNextTracks.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-gray-400 mb-2 uppercase">Up Next</h5>
              <div className="space-y-1">
                {upNextTracks.map((track, idx) => (
                  <div key={track.id} className="text-xs text-gray-300 p-1 hover:bg-slate-800 rounded cursor-pointer transition">
                    {idx + 1}. {track.title}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Player;