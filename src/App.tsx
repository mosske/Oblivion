import React, { useEffect, useState } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";

function AppContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me", { timeout: 5000 });
      if (response.ok) {
        const data = await response.json();
        setIsLoggedIn(data.isLoggedIn || false);
      }
    } catch (err) {
      // Silently fail - user can still sign in
      console.log("Auth check skipped");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = () => {
    window.location.href = "/auth/login";
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white flex flex-col items-center justify-center p-4">
      {!loading && (
        <div className="text-center max-w-md">
          {/* Logo */}
          <div className="text-6xl mb-4">🎵</div>
          <h1 className="text-5xl font-bold mb-2">Oblivion</h1>
          <p className="text-xl text-gray-400 mb-12">Your YouTube Music Player</p>

          {/* Status */}
          {isLoggedIn ? (
            <div>
              <div className="text-lg text-green-400 mb-4">✅ Signed In</div>
              <div className="text-gray-400 mb-6">Loading full app...</div>
            </div>
          ) : (
            <div>
              <div className="text-lg text-gray-400 mb-6">Sign in to get started</div>
              <button
                onClick={handleSignIn}
                className="w-full px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition font-semibold text-lg"
              >
                Sign In with Google
              </button>
              <div className="mt-6 text-xs text-gray-500">
                Secure authentication via Google
              </div>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="text-center">
          <div className="text-3xl font-bold mb-4">🎵 Oblivion</div>
          <div className="text-gray-400">Starting up...</div>
        </div>
      )}

      <div className="absolute bottom-4 right-4 text-xs text-gray-600">
        v1.0 • Minimal Build
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}