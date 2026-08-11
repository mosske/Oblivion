import React from 'react';

interface Playlist {
  id: string;
  name: string;
  itemCount: number;
}

export function LibraryView() {
  const [playlists, setPlaylists] = React.useState<Playlist[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  React.useEffect(() => {
    const checkAuthAndFetchPlaylists = async () => {
      try {
        const authRes = await fetch('/api/auth/me');
        const authData = await authRes.json();
        setIsLoggedIn(authData.isLoggedIn);

        if (authData.isLoggedIn) {
          setLoading(true);
          const playlistRes = await fetch('/api/youtube/playlists');
          const playlistData = await playlistRes.json();
          if (playlistData.success) {
            setPlaylists(playlistData.playlists || []);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to fetch playlists:', error);
        setLoading(false);
      }
    };

    checkAuthAndFetchPlaylists();
  }, []);

  if (!isLoggedIn) {
    return (
      <div className="p-8">
        <h2 className="text-3xl font-bold mb-4">Your Library</h2>
        <p className="text-gray-400">Sign in to see your playlists</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <h2 className="text-3xl font-bold mb-4">Your Library</h2>
        <p className="text-gray-400">Loading playlists...</p>
      </div>
    );
  }

  if (playlists.length === 0) {
    return (
      <div className="p-8">
        <h2 className="text-3xl font-bold mb-4">Your Library</h2>
        <p className="text-gray-400">No playlists found</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-6">Your Library</h2>
      <div className="grid grid-cols-2 gap-4">
        {playlists.map((playlist) => (
          <div
            key={playlist.id}
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