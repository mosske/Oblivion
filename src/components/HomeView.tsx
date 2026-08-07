import React, { useEffect, useState } from "react";
import { User, Track, Album, Playlist } from "../types";
import { Play, Sparkles, TrendingUp, Disc, Flame, Radio, Plus, User as UserIcon, Settings as SettingsIcon, Check } from "lucide-react";

interface HomeViewProps {
  onPlayTrack: (track: Track) => void;
  onPlayQueue: (tracks: Track[], startIndex?: number) => void;
  onSelectPlaylist: (playlist: Playlist) => void;
  playlists: Playlist[];
  user?: User | null;
  onOpenSettings?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onPlayTrack,
  onPlayQueue,
  onSelectPlaylist,
  playlists,
  user,
  onOpenSettings,
}) => {
  const [recommendations, setRecommendations] = useState<{
    trendingTracks: Track[];
    topAlbums: Album[];
    quickPicks: Track[];
    isPersonalized?: boolean;
  }>({
    trendingTracks: [],
    topAlbums: [],
    quickPicks: [],
    isPersonalized: false,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [timeGreeting, setTimeGreeting] = useState<string>("");
  const [subGreeting, setSubGreeting] = useState<string>("");

  useEffect(() => {
    // Dynamic greeting calculation based on hour of day
    const hour = new Date().getHours();
    let greeting = "Welcome";
    if (hour >= 5 && hour < 12) greeting = "Good morning";
    else if (hour >= 12 && hour < 17) greeting = "Good afternoon";
    else if (hour >= 17 && hour < 22) greeting = "Good evening";
    else greeting = "Good night";

    setTimeGreeting(greeting);

    const subGreetings = [
      "Your personalized YouTube Music stream is live.",
      "Ready for your soundwave escape today?",
      "Here is your customized musical lineup.",
      "Synchronized lyrics & offline audio ready.",
      "Let's dive into your favorite beats."
    ];
    // Random / dynamic selection for fresh feeling on refresh
    const randomIndex = Math.floor(Math.random() * subGreetings.length);
    setSubGreeting(subGreetings[randomIndex]);
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    const fetchRecs = async () => {
      try {
        const res = await fetch("/api/youtube/recommendations");
        const data = await res.json();
        if (isMounted && data.trendingTracks) {
          setRecommendations(data);
        }
      } catch (err) {
        console.error("Failed to fetch recommendations:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRecs();
    return () => {
      isMounted = false;
    };
  }, [user?.isLoggedIn, user?.email]);

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar pb-28 select-none">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-950 via-indigo-900/90 to-slate-950 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-25 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-400 via-indigo-500 to-transparent"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              <span>Oblivion YouTube Music Engine</span>
            </div>

            {/* Dynamic Greeting Heading */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight font-sans">
              {timeGreeting}
              {user?.isLoggedIn ? (
                <span className="text-cyan-400">, {user.name.split(" ")[0]}!</span>
              ) : (
                <span> to Oblivion</span>
              )}
            </h1>

            <p className="text-slate-300 text-sm leading-relaxed">
              {user?.isLoggedIn
                ? `${subGreeting} Your Google YouTube Music account is connected.`
                : "Experience real-time Google account playlist syncing, synchronized scrolling lyrics, background playback, and offline caching."}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  if (recommendations.trendingTracks.length > 0) {
                    onPlayQueue(recommendations.trendingTracks, 0);
                  }
                }}
                className="px-5 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-400/25 flex items-center gap-2 transition-all active:scale-95"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Play Trending Mix</span>
              </button>

              {!user?.isLoggedIn && onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="px-4 py-2.5 bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 flex items-center gap-2 transition-all"
                >
                  <UserIcon className="w-4 h-4 text-cyan-400" />
                  <span>Connect Google Account</span>
                </button>
              )}
            </div>
          </div>

          {/* User Photo & Account Card in Banner when logged in */}
          {user?.isLoggedIn && (
            <div
              onClick={onOpenSettings}
              className="group cursor-pointer shrink-0 flex items-center gap-4 p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-cyan-500/30 shadow-xl transition-all hover:border-cyan-400"
            >
              <div className="relative">
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-cyan-400 shadow-md group-hover:scale-105 transition-transform"
                />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-slate-950 flex items-center justify-center">
                  <Check className="w-3 h-3 text-slate-950 stroke-[3]" />
                </span>
              </div>

              <div className="space-y-1 pr-2">
                <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-cyan-300">
                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                  <span>Logged in</span>
                </div>
                <h3 className="text-sm font-bold text-white max-w-[140px] truncate">
                  {user.name}
                </h3>
                <p className="text-[11px] text-slate-400 max-w-[140px] truncate">
                  {user.email}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Picks Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber-400" />
          <span>Quick Picks</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 bg-slate-900/60 rounded-xl animate-pulse"></div>
              ))
            : [...recommendations.quickPicks, ...recommendations.trendingTracks.slice(0, 4)].map(
                (track) => (
                  <div
                    key={track.id}
                    onClick={() => onPlayTrack(track)}
                    className="group flex items-center gap-3 p-2.5 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-cyan-500/40 cursor-pointer transition-all shadow-md"
                  >
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0">
                      <img
                        src={track.coverUrl}
                        alt={track.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Play className="w-5 h-5 text-white fill-white" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-semibold text-white truncate group-hover:text-cyan-300">
                        {track.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">{track.artist}</p>
                    </div>
                  </div>
                )
              )}
        </div>
      </section>

      {/* Trending Tracks */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            <span>
              {user?.isLoggedIn && recommendations.isPersonalized
                ? "Your YouTube Account Trending Hits"
                : "General YouTube Trending Hits"}
            </span>
          </h2>
          {user?.isLoggedIn && recommendations.isPersonalized && (
            <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono flex items-center gap-1 self-start sm:self-auto">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              Synced with Google Account
            </span>
          )}
        </div>

        <div className="space-y-2">
          {recommendations.trendingTracks.map((track, idx) => (
            <div
              key={track.id}
              className="group flex items-center justify-between p-3 rounded-2xl bg-slate-900/40 hover:bg-slate-800/70 border border-slate-800/50 hover:border-slate-700 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="w-6 text-xs font-mono text-slate-500 text-center font-bold">
                  {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                </span>

                <div className="relative w-10 h-10 shrink-0 rounded-xl overflow-hidden">
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => onPlayTrack(track)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <Play className="w-4 h-4 text-white fill-white" />
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <h4
                    onClick={() => onPlayTrack(track)}
                    className="text-sm font-semibold text-slate-200 truncate cursor-pointer hover:text-cyan-300"
                  >
                    {track.title}
                  </h4>
                  <p className="text-xs text-slate-400 truncate">{track.artist}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <span className="text-xs text-slate-500 font-mono hidden sm:inline">
                  {track.playsCount ? (track.playsCount / 1000000).toFixed(1) + "M plays" : ""}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {Math.floor(track.duration / 60)}:
                  {String(Math.floor(track.duration % 60)).padStart(2, "0")}
                </span>
                <button
                  onClick={() => onPlayTrack(track)}
                  className="p-2 bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 rounded-xl transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Albums */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Disc className="w-5 h-5 text-indigo-400" />
            <span>
              {user?.isLoggedIn && recommendations.isPersonalized
                ? "Your YouTube Account Albums & Collections"
                : "Top General YouTube Featured Albums"}
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {recommendations.topAlbums.map((album) => (
            <div
              key={album.id}
              className="group p-4 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 rounded-2xl transition-all cursor-pointer shadow-lg hover:shadow-cyan-500/10"
            >
              <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-3 border border-slate-800">
                <img
                  src={album.coverUrl}
                  alt={album.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <h4 className="text-sm font-bold text-white truncate group-hover:text-cyan-300">
                {album.title}
              </h4>
              <p className="text-xs text-slate-400 truncate">{album.artist}</p>
              <p className="text-[10px] text-slate-500 font-mono mt-1">
                {album.releaseYear} • {album.tracksCount} tracks
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
