import React from 'react';
import { Music, Menu, LogIn, LogOut } from 'lucide-react';
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

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white">
      <div className="w-48 bg-slate-950/50 border-r border-slate-700 p-4 flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <Music className="w-8 h-8 text-cyan-400" />
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
          onClick={() => {
            if (isLoggedIn) {
              fetch('/api/auth/logout', { method: 'POST' }).then(() => {
                setIsLoggedIn(false);
              });
            } else {
              const width = 500;
              const height = 600;
              const left = window.innerWidth / 2 - width / 2;
              const top = window.innerHeight / 2 - height / 2;
              const authWindow = window.open(
                '/api/auth/google/config',
                'auth',
                `width=${width},height=${height},left=${left},top=${top}`
              );
              window.addEventListener('message', (e) => {
                if (e.data.type === 'OAUTH_SUCCESS') {
                  setIsLoggedIn(true);
                  authWindow?.close();
                }
              });
            }
          }}
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