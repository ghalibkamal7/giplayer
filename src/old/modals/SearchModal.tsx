import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Clock, Film, Tv, Radio, ArrowRight } from 'lucide-react';
import { MediaItem } from '../../types';
import { CATALOG } from '../../data/catalog';
import { storage } from '../../services/storage';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMedia: (item: MediaItem) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectMedia,
}) => {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'movie' | 'series' | 'livetv'>('all');
  const [recentQueries, setRecentQueries] = useState<string[]>(() => storage.getSearchHistory());

  useEffect(() => {
    if (isOpen) {
      setRecentQueries(storage.getSearchHistory());
    }
  }, [isOpen]);

  // Filtered Results with debounced memo
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return CATALOG.filter((item) => {
      const matchesCategory = categoryFilter === 'all' || item.type === categoryFilter;
      const matchesQuery =
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.genres.some((g) => g.toLowerCase().includes(q));
      return matchesCategory && matchesQuery;
    });
  }, [query, categoryFilter]);

  if (!isOpen) return null;

  const handleSelect = (item: MediaItem) => {
    if (query.trim()) {
      storage.addSearchHistory(query.trim());
    }
    onSelectMedia(item);
    onClose();
  };

  const handleSearchTagClick = (tag: string) => {
    setQuery(tag);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-start justify-center p-4 pt-16 sm:pt-24 animate-fade-in">
      <div className="bg-surface-light border border-surface-border rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[80vh] flex flex-col">
        {/* Search Input Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-400" />
          <input
            type="text"
            autoFocus
            placeholder="Search movies, web series, live channels, genres..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-10 py-3.5 bg-surface border border-surface-border focus:border-primary-500 rounded-2xl text-white placeholder-gray-500 outline-none transition text-sm sm:text-base shadow-inner"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white"
            >
              ESC
            </button>
          )}
        </div>

        {/* Filter Category Chips */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 text-xs font-semibold">
          {[
            { id: 'all', label: 'All Media' },
            { id: 'movie', label: 'Movies', icon: Film },
            { id: 'series', label: 'Series', icon: Tv },
            { id: 'livetv', label: 'Live TV', icon: Radio },
          ].map((cat) => {
            const Icon = cat.icon;
            const isActive = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id as typeof categoryFilter)}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
                  isActive
                    ? 'bg-primary-500 text-white shadow'
                    : 'bg-surface hover:bg-white/5 text-gray-400 hover:text-white border border-white/5'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Results / History Container */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
          {query.trim() === '' ? (
            <div>
              {recentQueries.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Recent Searches
                    </span>
                    <button
                      onClick={() => {
                        storage.clearSearchHistory();
                        setRecentQueries([]);
                      }}
                      className="text-gray-500 hover:text-gray-300"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentQueries.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSearchTagClick(q)}
                        className="px-3 py-1 bg-surface hover:bg-surface-lighter text-xs text-gray-300 rounded-lg border border-white/5 transition"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-400 mb-2">Popular Trending Topics</div>
              <div className="flex flex-wrap gap-2">
                {['Sci-Fi', 'Cyberpunk', 'Animation', 'NASA', 'Amsterdam', 'Blender', 'Live News'].map(
                  (tag) => (
                    <button
                      key={tag}
                      onClick={() => handleSearchTagClick(tag)}
                      className="px-3 py-1 bg-primary-500/10 hover:bg-primary-500/20 text-xs text-primary-400 rounded-lg border border-primary-500/20 transition"
                    >
                      #{tag}
                    </button>
                  )
                )}
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-2">
              {results.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-surface hover:bg-surface-lighter border border-surface-border cursor-pointer transition group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.posterUrl}
                      alt={item.title}
                      className="w-12 h-16 rounded-xl object-cover bg-surface-lighter flex-shrink-0"
                    />
                    <div className="truncate">
                      <h4 className="text-sm font-bold text-white group-hover:text-primary-400 transition truncate">
                        {item.title}
                      </h4>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {item.category} • {item.releaseYear}
                      </p>
                      <div className="flex gap-1.5 mt-1">
                        {item.genres.slice(0, 2).map((g) => (
                          <span
                            key={g}
                            className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-gray-400"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-primary-400 group-hover:translate-x-1 transition-all mr-2 flex-shrink-0" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-gray-300 font-semibold mb-1">
                No matching media found for "{query}"
              </p>
              <p className="text-xs text-gray-500">
                Try searching for "Sci-Fi", "Sintel", "NASA", or "Action"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
