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
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [volume, setVolume] = React.useState(1);

  React.useEffect(() => {
    if (!audioRef.current || !currentTrack) return;

    if (isPlaying) {
      audioRef.current.play().catch((err) => {
        console.log('Playback error:', err);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrack]);

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const upNextTracks = playlist.slice(currentTrackIndex + 1).slice(0, 5);

  // Audio URL using YouTube audio proxy
  const audioUrl = currentTrack ? `https://www.youtube.com/watch?v=${currentTrack.youtubeVideoId}` : '';

  // Expanded view
  if (isExpanded && currentTrack) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
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

          {/* Progress */}
          <div className="w-full max-w-2xl mb-8">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={(e) => {
                if (audioRef.current) {
                  audioRef.current.currentTime = parseFloat(e.target.value);
                }
              }}
              className="w-full cursor-pointer"
            />
            <div className="flex justify-between text-sm text-gray-400 mt-2">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
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

          {/* Volume */}
          <div className="w-full max-w-xs mb-8 flex items-center gap-3">
            <Volume2 className="w-5 h-5" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full cursor-pointer"
            />
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

  // Always-visible mini player at bottom
  return (
    <>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={onNext}
        crossOrigin="anonymous"
      />

      {/* Mini player toolbar - ALWAYS at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t-2 border-cyan-500 shadow-2xl z-40">
        {/* Progress bar */}
        <div className="h-1 bg-slate-800">
          <div
            className="h-full bg-cyan-500 transition-all"
            style={{
              width: duration ? `${(currentTime / duration) * 100}%` : '0%',
            }}
          />
        </div>

        {/* Player bar */}
        <div className="px-4 py-3 flex items-center gap-4">
          {/* Album art - clickable to expand */}
          {currentTrack?.coverUrl && (
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              className="w-14 h-14 object-cover rounded shadow-lg flex-shrink-0 cursor-pointer hover:opacity-80 transition"
              onClick={() => setIsExpanded(true)}
            />
          )}

          {/* Track info - clickable to expand */}
          <div
            className="flex-1 min-w-0 cursor-pointer hover:opacity-80 transition"
            onClick={() => setIsExpanded(true)}
          >
            <h4 className="font-semibold truncate text-white text-sm">{currentTrack?.title || 'No track'}</h4>
            <p className="text-xs text-cyan-300 truncate">{currentTrack?.artist || 'No artist'}</p>
          </div>

          {/* Time */}
          <div className="text-xs text-gray-400 whitespace-nowrap">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrevious();
              }}
              className="p-1.5 hover:bg-slate-700 rounded transition"
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
              className="p-1.5 hover:bg-slate-700 rounded transition"
            >
              <SkipForward className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsExpanded(true)}
              className="p-1.5 hover:bg-slate-700 rounded transition ml-2"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Player;