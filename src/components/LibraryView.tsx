import React from 'react';

interface Playlist {
  id: string;
  name: string;
  itemCount: number;
}

interface LibraryViewProps {
  onPlaylistSelect?: (playlistId: string, playlistName: string) => void;
  isLoggedIn?: boolean;
}

export function LibraryView({ onPlaylistSelect, isLoggedIn }: LibraryViewProps) {
  const [playlists, setPlaylists] = React.useState<Playlist[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const checkAuthAndFetchPlaylists = async () => {
      try {
        const authRes = await fetch('/api/auth/me');
        const authData = await authRes.json();

        if (authData.isLoggedIn) {
          setLoading(true);
          const playlistRes = await fetch('/api/youtube/playlists');
          const playlistData = await playlistRes.json();
          if (playlistData.success) {
            setPlaylists(playlistData.playlists || []);
          }
          setLoading(false);
        } else {
          setPlaylists([]);
        }
      } catch (error) {
        console.error('Failed to fetch playlists:', error);
        setLoading(false);
      }
    };

    checkAuthAndFetchPlaylists();
  }, [isLoggedIn]);

  if (playlists.length === 0 && !loading) {
    return (
      <div className="p-8 pb-24">
        <h2 className="text-3xl font-bold mb-4">Your Library</h2>
        <p className="text-gray-400">Sign in to see your playlists</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 pb-24">
        <h2 className="text-3xl font-bold mb-4">Your Library</h2>
        <p className="text-gray-400">Loading playlists...</p>
      </div>
    );
  }

  return (
    <div className="p-8 pb-24">
      <h2 className="text-3xl font-bold mb-6">Your Library</h2>
      <div className="grid grid-cols-2 gap-4">
        {playlists.map((playlist) => (
          <div
            key={playlist.id}
            onClick={() => onPlaylistSelect?.(playlist.id, playlist.name)}
            className="bg-slate-800/50 p-4 rounded hover:bg-slate-700/50 cursor-pointer transition"
          >
            <h3 className="font-semibold">{playlist.name}</h3>
            <p className="text-sm text-gray-400">{playlist.itemCount} songs</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LibraryView;