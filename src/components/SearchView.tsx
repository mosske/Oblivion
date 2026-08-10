import React from "react";
import { Search, Music2 } from "lucide-react";

export function SearchView() {
  const [query, setQuery] = React.useState("");

  return (
    <div className="p-6 bg-gradient-to-b from-slate-900 to-slate-950 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
          <Search className="w-8 h-8 text-cyan-400" />
          Search YouTube Music
        </h1>
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search songs, albums, artists..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
          />
        </div>
      </div>
      <div className="flex flex-col items-center justify-center py-12">
        <Music2 className="w-16 h-16 text-gray-500 mb-4" />
        <p className="text-gray-400">Start searching</p>
      </div>
    </div>
  );
}

export default SearchView;