import React from 'react';
import { Music, LogIn, LogOut } from 'lucide-react';
import HomeView from './components/HomeView';
import SearchView from './components/SearchView';
import LibraryView from './components/LibraryView';

export function App() {
  const [currentView, setCurrentView] = React.useState<'home' | 'search' | 'library'>('home');
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        setIsLoggedIn(data.isLoggedIn);
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    };
    checkAuth();
  }, []);

  const handleSignIn = async () => {
    try {
      const res = await fetch('/api/auth/google/config');
      const config = await res.json();
      
      if (!config.configured) {
        alert('OAuth not configured on server');
        return;
      }

      const scopes = [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ];

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.append('client_id', config.clientId);
      authUrl.searchParams.append('redirect_uri', config.redirectUri);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('scope', scopes.join(' '));
      authUrl.searchParams.append('access_type', 'offline');

      const width = 500;
      const height = 600;
      const left = window.innerWidth / 2 - width / 2;
      const top = window.innerHeight / 2 - height / 2;
      
      const authWindow = window.open(
        authUrl.toString(),
        'oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      const checkInterval = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkInterval);
          // Re-check auth status after OAuth completes
          const checkAuth = async () => {
            const res = await fetch('/api/auth/me');
            const data = await res.json();
            setIsLoggedIn(data.isLoggedIn);
          };
          checkAuth();
        }
      }, 500);
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsLoggedIn(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white">
      <div className="w-48 bg-slate-950/50 border-r border-slate-700 p-4 flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <span className="text-xl">🎵</span>
          <h1 className="text-xl font-bold">Oblivion</h1>
        </div>
        <nav className="space-y-2 flex-1">
          <button
            onClick={() => setCurrentView('home')}
            className={`w-full text-left px-4 py-2 rounded transition ${
              currentView === 'home' ? 'bg-cyan-500/20 text-cyan-400' : 'hover:bg-slate-800'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => setCurrentView('search')}
            className={`w-full text-left px-4 py-2 rounded transition ${
              currentView === 'search' ? 'bg-cyan-500/20 text-cyan-400' : 'hover:bg-slate-800'
            }`}
          >
            Search
          </button>
          <button
            onClick={() => setCurrentView('library')}
            className={`w-full text-left px-4 py-2 rounded transition ${
              currentView === 'library' ? 'bg-cyan-500/20 text-cyan-400' : 'hover:bg-slate-800'
            }`}
          >
            Library
          </button>
        </nav>
        <button
          onClick={isLoggedIn ? handleSignOut : handleSignIn}
          className="w-full flex items-center gap-2 px-4 py-2 rounded bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition"
        >
          {isLoggedIn ? (
            <>
              <LogOut className="w-4 h-4" />
              Sign Out
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              Sign In
            </>
          )}
        </button>
      </div>
      <div className="flex-1">
        {currentView === 'home' && <HomeView />}
        {currentView === 'search' && <SearchView />}
        {currentView === 'library' && <LibraryView />}
      </div>
    </div>
  );
}

export default App;