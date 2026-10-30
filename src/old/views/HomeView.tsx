// HomeView component - displays library overview and media sections
import React, { useState, useEffect } from 'react';
import { MediaItem, PlaybackProgress } from '../types';
import { storage } from '../services/storage';
import { HeroBanner } from '../components/media/HeroBanner';
import { MediaCard } from '../components/media/MediaCard';
import { ContinueWatchingCard } from '../components/media/ContinueWatchingCard';
import { localMedia } from '../services/localMedia';
import { CATALOG, GENRES } from '../data/catalog';

interface HomeViewProps {
  onPlayMedia: (item: MediaItem) => void;
  onNavigateTab: (tab: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onPlayMedia, onNavigateTab }) => {
  // Continue watching progress
  const [continueWatching, setContinueWatching] = useState<PlaybackProgress[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>('All');

  const refreshProgress = () => {
    setContinueWatching(storage.getContinueWatchingList());
  };

  useEffect(() => {
    refreshProgress();
  }, []);

  // Local media stats
  const videosCount = localMedia.getVideos().length;
  const musicCount = localMedia.getAudio().length;
  const foldersCount = localMedia.getFolders().length;
  const streamsCount = localMedia.getStreams().length;

  // Featured and filtered lists from static catalog
  const featured = CATALOG[0];
  const movies = CATALOG.filter((m) => m.type === 'movie');
  const series = CATALOG.filter((m) => m.type === 'series');
  const livetv = CATALOG.filter((m) => m.type === 'livetv');

  const filteredMovies = selectedGenre === 'All'
    ? movies
    : movies.filter((m) => m.genres?.includes(selectedGenre));

  const handleRemoveProgress = (mediaId: string) => {
    storage.removeProgress(mediaId);
    refreshProgress();
  };

  return (
    <div className="space-y-10 pb-12 animate-fade-in">
      {/* Continue Watching Section */}
      {continueWatching.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              Continue Watching
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
                onRemove={(id) => {
                  storage.removeProgress(id);
                  refreshProgress();
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Simple Overview */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Your Library Overview</h2>
        <ul className="list-disc list-inside text-gray-200">
          <li>{videosCount} Videos</li>
          <li>{musicCount} Music Tracks</li>
          <li>{foldersCount} Folders</li>
          <li>{streamsCount} Streams</li>
        </ul>
      </section>

      {/* Featured Banner */}
      <section>
        <HeroBanner item={featured} onPlay={onPlayMedia} />
      </section>

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
          <h2 className="text-lg sm:text-xl font-bold text-white">Trending Movies</h2>
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
          <h2 className="text-lg sm:text-xl font-bold text-white">Popular Web Series</h2>
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
          <h2 className="text-lg sm:text-xl font-bold text-white">Live Channels</h2>
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
                <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-rose-600 text-white">LIVE</span>
                  <span className="text-xs font-mono text-gray-400">CH {item.channelNumber}</span>
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-primary-400 transition truncate">{item.title}</h4>
                <p className="text-xs text-gray-400 truncate mt-0.5">{item.currentProgram}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
