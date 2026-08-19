import React, { useEffect, useState } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";

function AppContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/me");
      const data = await response.json();
      setIsLoggedIn(data.isLoggedIn || false);
    } catch (err) {
      console.error("Auth check failed:", err);
      setError("Failed to check auth");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white flex flex-col items-center justify-center">
      {error && (
        <div className="mb-4 p-4 bg-red-600 rounded text-center max-w-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center">
          <div className="text-2xl font-bold mb-4">Loading Oblivion...</div>
          <div className="text-gray-400">Initializing app</div>
        </div>
      ) : (
        <div className="text-center">
          <div className="text-4xl font-bold mb-4">🎵 Oblivion</div>
          <div className="text-xl mb-8">Your YouTube Music Player</div>
          
          {isLoggedIn ? (
            <div>
              <div className="text-green-400 mb-4">✅ Signed In</div>
              <div className="text-gray-400 mb-8">App is loading components...</div>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 transition"
              >
                Reload Page
              </button>
            </div>
          ) : (
            <div>
              <div className="text-gray-400 mb-4">Not signed in</div>
              <button
                onClick={() => window.location.href = "/api/auth/google/config"}
                className="px-6 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 transition"
              >
                Sign In with Google
              </button>
            </div>
          )}
        </div>
      )}

      <div className="absolute bottom-4 right-4 text-xs text-gray-500">
        App Version: Minimal Build
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