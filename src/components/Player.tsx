import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Maximize2 } from 'lucide-react';

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
  const [duration, setDuration] = React.useState(180); // Estimate 3 mins
  const audioRef = React.useRef<HTMLAudioElement>(null);

  React.useEffect(() => {
    if (!audioRef.current || !currentTrack) return;

    // Try to play - YouTube URLs won't work due to CORS, but this triggers the player
    if (isPlaying) {
      audioRef.current.play().catch(() => {
        // Expected: CORS blocks YouTube URLs
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrack]);

  if (!currentTrack) {
    return null;
  }

  const upNextTracks = playlist.slice(currentTrackIndex + 1).slice(0, 5);
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isExpanded) {
    // Full screen player with YouTube embed
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold">Now Playing</h2>
          <button
            onClick={() => setIsExpanded(false)}
            className="px-4 py-2 hover:bg-slate-700 rounded transition"
          >
            Close
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

          {/* YouTube Embed for Playback */}
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

  // FIXED mini player toolbar at bottom
  return (
    <>
      {/* Hidden audio element - note: YouTube URLs won't play due to CORS */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={onNext}
      />

      {/* TRULY FIXED player toolbar */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t-2 border-cyan-500 shadow-2xl z-50">
        {/* Progress bar at top */}
        <div className="h-1 bg-slate-800">
          <div
            className="h-full bg-cyan-500 transition-all"
            style={{
              width: duration ? `${(currentTime / duration) * 100}%` : '0%',
            }}
          />
        </div>

        {/* Player controls */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-4">
            {/* Album art */}
            {currentTrack.coverUrl && (
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className="w-12 h-12 object-cover rounded shadow-lg flex-shrink-0 cursor-pointer hover:opacity-80 transition"
                onClick={() => setIsExpanded(true)}
              />
            )}

            {/* Track info */}
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setIsExpanded(true)}>
              <h4 className="font-semibold truncate text-white text-sm">{currentTrack.title}</h4>
              <p className="text-xs text-cyan-300 truncate">{currentTrack.artist}</p>
            </div>

            {/* Time display */}
            <div className="text-xs text-gray-400 whitespace-nowrap">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPrevious();
                }}
                className="p-1.5 hover:bg-slate-700 rounded-full transition"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayPause();
                }}
                className="p-2 bg-cyan-500/30 hover:bg-cyan-500/50 rounded-full transition"
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
                className="p-1.5 hover:bg-slate-700 rounded-full transition"
              >
                <SkipForward className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsExpanded(true)}
                className="p-1.5 hover:bg-slate-700 rounded-full transition ml-2"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Padding to prevent content from being hidden under player */}
      <div className="h-20" />
    </>
  );
}

export default Player;