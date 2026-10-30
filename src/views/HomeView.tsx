import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, Tv, Radio, Layers } from 'lucide-react';
import { MediaItem, PlaybackProgress } from '../types';
import { CATALOG, GENRES } from '../data/catalog';
import { storage } from '../services/storage';
import { HeroBanner } from '../components/media/HeroBanner';
import { MediaCard } from '../components/media/MediaCard';
import { ContinueWatchingCard } from '../components/media/ContinueWatchingCard';

interface HomeViewProps {
  onPlayMedia: (item: MediaItem) => void;
  onNavigateTab: (tab: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onPlayMedia, onNavigateTab }) => {
  const [continueWatching, setContinueWatching] = useState<PlaybackProgress[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>('All');

  const refreshProgress = () => {
    setContinueWatching(storage.getContinueWatchingList());
  };

  useEffect(() => {
    refreshProgress();
  }, []);

  const featured = CATALOG[0]; // Tears of Steel
  const movies = CATALOG.filter((m) => m.type === 'movie');
  const series = CATALOG.filter((m) => m.type === 'series');
  const livetv = CATALOG.filter((m) => m.type === 'livetv');

  const filteredMovies =
    selectedGenre === 'All'
      ? movies
      : movies.filter((m) => m.genres.includes(selectedGenre));

  const handleRemoveProgress = (mediaId: string) => {
    storage.removeProgress(mediaId);
    refreshProgress();
  };

  return (
    <div className="space-y-10 pb-12 animate-fade-in">
      {/* Featured Cinematic Hero Banner */}
      <HeroBanner item={featured} onPlay={onPlayMedia} />

      {/* Continue Watching Section (only if progress exists) */}
      {continueWatching.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-400" />
              <span>Continue Watching</span>
            </h2>
            <button
              onClick={() => onNavigateTab('library')}
              className="text-xs text-primary-400 hover:text-primary-300 font-semibold"
            >
              View All ({continueWatching.length})
            </button>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
            {continueWatching.map((p) => (
              <ContinueWatchingCard
                key={p.mediaId}
                progress={p}
                onPlay={onPlayMedia}
                onRemove={handleRemoveProgress}
              />
            ))}
          </div>
        </section>
      )}

      {/* Genre Filter Pills */}
      <section>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold scrollbar-none">
          {GENRES.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-4 py-2 rounded-xl transition whitespace-nowrap ${
                selectedGenre === genre
                  ? 'bg-primary-500 text-white shadow-glow-primary'
                  : 'bg-surface hover:bg-surface-lighter text-gray-300 border border-surface-border'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </section>

      {/* Trending Movies Shelf */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent-cyan" />
            <span>Trending Movies</span>
          </h2>
          <button
            onClick={() => onNavigateTab('movies')}
            className="text-xs text-primary-400 hover:text-primary-300 font-semibold"
          >
            See More
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredMovies.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              onPlay={onPlayMedia}
              onFavoriteChange={refreshProgress}
            />
          ))}
        </div>
      </section>

      {/* Web Series Shelf */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Tv className="w-5 h-5 text-accent-purple" />
            <span>Popular Web Series</span>
          </h2>
          <button
            onClick={() => onNavigateTab('series')}
            className="text-xs text-primary-400 hover:text-primary-300 font-semibold"
          >
            Explore Series
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {series.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              onPlay={onPlayMedia}
              onFavoriteChange={refreshProgress}
            />
          ))}
        </div>
      </section>

      {/* Live TV Channels Shelf */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-rose-500 animate-pulse" />
              <span>Live Channels</span>
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
              Free Live Stream
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('livetv')}
            className="text-xs text-primary-400 hover:text-primary-300 font-semibold"
          >
            All Channels
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {livetv.map((item) => (
            <div
              key={item.id}
              onClick={() => onPlayMedia(item)}
              className="p-4 rounded-2xl bg-surface border border-surface-border hover:border-primary-500/50 hover:bg-surface-light transition-all cursor-pointer group flex items-center gap-4 shadow-sm"
            >
              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-surface-lighter flex-shrink-0">
                <img
                  src={item.posterUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-rose-600 text-white">
                    LIVE
                  </span>
                  <span className="text-xs font-mono text-gray-400">
                    CH {item.channelNumber}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-primary-400 transition truncate">
                  {item.title}
                </h4>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {item.currentProgram}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* MX Player Experience Feature Highlight Banner */}
      <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-primary-950/40 via-surface-light to-accent-purple/20 border border-surface-border flex flex-col md:flex-row items-center justify-between gap-6 shadow-glow-card">
        <div className="space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 text-primary-400 text-xs font-bold uppercase tracking-wider">
            <Layers className="w-4 h-4" /> MX Player Pro Experience
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-white">
            Touch Gestures & Hardware Acceleration
          </h3>
          <p className="text-xs sm:text-sm text-gray-300 max-w-xl leading-relaxed">
            Swipe left for brightness, swipe right for volume, double-tap to seek, pinch to zoom, and boost audio up to 200%. All running in an installable PWA.
          </p>
        </div>
        <button
          onClick={() => onPlayMedia(featured)}
          className="px-6 py-3 bg-primary-500 hover:bg-primary-400 text-white font-bold rounded-2xl shadow-glow-primary transition active:scale-95 text-xs sm:text-sm whitespace-nowrap"
        >
          Try Player Demo
        </button>
      </section>
    </div>
  );
};
