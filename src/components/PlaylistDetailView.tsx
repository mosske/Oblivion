import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface Video {
  id: string;
  youtubeVideoId: string;
  title: string;
  artist: string;
  coverUrl: string;
}

interface PlaylistDetailViewProps {
  playlistId: string;
  playlistName: string;
  onBack: () => void;
}

export function PlaylistDetailView({ playlistId, playlistName, onBack }: PlaylistDetailViewProps) {
  const [videos, setVideos] = React.useState<Video[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/youtube/playlists/${playlistId}/videos`);
        const data = await res.json();
        if (data.success) {
          setVideos(data.videos || []);
        }
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch playlist videos:', error);
        setLoading(false);
      }
    };

    fetchVideos();
  }, [playlistId]);

  return (
    <div className="p-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 mb-6 text-gray-400 hover:text-white transition"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Library
      </button>

      <h2 className="text-3xl font-bold mb-6">{playlistName}</h2>

      {loading && <p className="text-gray-400">Loading videos...</p>}

      {videos.length === 0 && !loading && (
        <p className="text-gray-400">No videos found in this playlist</p>
      )}

      {videos.length > 0 && (
        <div className="space-y-2">
          {videos.map((video) => (
            <div
              key={video.id}
              className="flex gap-4 p-4 bg-slate-800/50 rounded hover:bg-slate-700/50 cursor-pointer transition"
            >
              {video.coverUrl && (
                <img
                  src={video.coverUrl}
                  alt={video.title}
                  className="w-16 h-16 object-cover rounded flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{video.title}</h3>
                <p className="text-sm text-gray-400 truncate">{video.artist}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PlaylistDetailView;