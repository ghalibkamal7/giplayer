import React, { useState, useMemo } from 'react';
import { Film, Filter, ArrowUpDown } from 'lucide-react';
import { MediaItem } from '../types';
import { CATALOG, GENRES } from '../data/catalog';
import { MediaCard } from '../components/media/MediaCard';

interface MoviesViewProps {
  onPlayMedia: (item: MediaItem) => void;
}

export const MoviesView: React.FC<MoviesViewProps> = ({ onPlayMedia }) => {
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'rating' | 'year' | 'title'>('rating');

  const allMovies = CATALOG.filter((m) => m.type === 'movie');

  const filtered = useMemo(() => {
    let result = [...allMovies];

    if (selectedGenre !== 'All') {
      result = result.filter((m) => m.genres.includes(selectedGenre));
    }

    result.sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'year') return b.releaseYear - a.releaseYear;
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return 0;
    });

    return result;
  }, [allMovies, selectedGenre, sortBy]);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Film className="w-7 h-7 text-primary-400" />
            <span>Movies</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Stream high-definition open cinema and creative commons motion pictures.
          </p>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 text-xs">
          <ArrowUpDown className="w-4 h-4 text-gray-400" />
          <span className="text-gray-400 font-medium">Sort By:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-surface text-white px-3 py-1.5 rounded-xl border border-surface-border outline-none font-semibold cursor-pointer"
          >
            <option value="rating">Top Rated</option>
            <option value="year">Newest Release</option>
            <option value="title">Alphabetical (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Genre Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold scrollbar-none">
        <Filter className="w-3.5 h-3.5 text-gray-500 mr-1 flex-shrink-0" />
        {GENRES.map((genre) => (
          <button
            key={genre}
            onClick={() => setSelectedGenre(genre)}
            className={`px-3.5 py-1.5 rounded-xl transition whitespace-nowrap ${
              selectedGenre === genre
                ? 'bg-primary-500 text-white shadow-glow-primary'
                : 'bg-surface hover:bg-surface-lighter text-gray-300 border border-surface-border'
            }`}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filtered.map((item) => (
          <MediaCard key={item.id} item={item} onPlay={onPlayMedia} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm">No movies match the selected filter.</p>
        </div>
      )}
    </div>
  );
};
