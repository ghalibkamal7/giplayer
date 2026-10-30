import React, { useState } from 'react';
import { Tv, Play, Star, Clock, X } from 'lucide-react';
import { MediaItem, Episode } from '../types';
import { CATALOG } from '../data/catalog';
import { formatDuration } from '../utils/formatters';

interface SeriesViewProps {
  onPlayMedia: (item: MediaItem, episode?: Episode) => void;
}

export const SeriesView: React.FC<SeriesViewProps> = ({ onPlayMedia }) => {
  const seriesList = CATALOG.filter((m) => m.type === 'series');
  const [selectedSeries, setSelectedSeries] = useState<MediaItem | null>(null);
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState<number>(0);

  const activeSeason = selectedSeries?.seasons?.[selectedSeasonIndex];

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="pb-4 border-b border-surface-border">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
          <Tv className="w-7 h-7 text-accent-purple" />
          <span>Web Series</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          Binge-watch episodic series with seamless auto-play and season navigation.
        </p>
      </div>

      {/* Series Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {seriesList.map((series) => (
          <div
            key={series.id}
            onClick={() => {
              setSelectedSeries(series);
              setSelectedSeasonIndex(0);
            }}
            className="group rounded-3xl bg-surface border border-surface-border hover:border-accent-purple/50 overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 shadow-lg flex flex-col"
          >
            {/* Backdrop image */}
            <div className="relative aspect-video w-full overflow-hidden bg-surface-lighter">
              <img
                src={series.backdropUrl || series.posterUrl}
                alt={series.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-black/30 to-transparent" />

              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1 text-xs font-bold text-amber-400">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span>{series.rating.toFixed(1)}</span>
              </div>

              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-accent-purple/30 text-accent-purple border border-accent-purple/40 backdrop-blur-md">
                  {series.seasons?.length || 1} Seasons • {series.seasons?.[0]?.episodes.length || 0} Episodes
                </span>
                <div className="w-9 h-9 rounded-full bg-accent-purple text-white flex items-center justify-center shadow-glow-purple group-hover:scale-110 transition-transform">
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                </div>
              </div>
            </div>

            {/* Content info */}
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-white group-hover:text-accent-purple transition-colors line-clamp-1">
                  {series.title}
                </h3>
                <p className="text-xs text-gray-400 line-clamp-2 mt-1.5 leading-relaxed">
                  {series.description}
                </p>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
                {series.genres.slice(0, 3).map((g) => (
                  <span
                    key={g}
                    className="text-[11px] px-2 py-0.5 rounded-lg bg-surface-lighter text-gray-400 font-medium"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Episode Selector Drawer / Modal */}
      {selectedSeries && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-light border border-surface-border rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setSelectedSeries(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Series Title */}
            <div className="flex items-center gap-3 mb-4 pr-10">
              <img
                src={selectedSeries.posterUrl}
                alt={selectedSeries.title}
                className="w-12 h-16 rounded-xl object-cover bg-surface-lighter"
              />
              <div>
                <h3 className="text-lg font-bold text-white">{selectedSeries.title}</h3>
                <p className="text-xs text-accent-purple font-semibold">
                  {selectedSeries.category} • {selectedSeries.releaseYear}
                </p>
              </div>
            </div>

            {/* Season Selector Tabs */}
            {selectedSeries.seasons && selectedSeries.seasons.length > 1 && (
              <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                {selectedSeries.seasons.map((season, idx) => (
                  <button
                    key={season.seasonNumber}
                    onClick={() => setSelectedSeasonIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      selectedSeasonIndex === idx
                        ? 'bg-accent-purple text-white shadow'
                        : 'bg-surface text-gray-400 hover:text-white'
                    }`}
                  >
                    Season {season.seasonNumber}
                  </button>
                ))}
              </div>
            )}

            {/* Episodes List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {activeSeason?.episodes.map((ep) => (
                <div
                  key={ep.id}
                  onClick={() => {
                    onPlayMedia(selectedSeries, ep);
                    setSelectedSeries(null);
                  }}
                  className="flex items-center gap-3.5 p-3 rounded-2xl bg-surface hover:bg-surface-lighter border border-surface-border hover:border-accent-purple/50 cursor-pointer transition group"
                >
                  {/* Episode thumbnail */}
                  <div className="relative w-24 h-16 rounded-xl overflow-hidden bg-surface-lighter flex-shrink-0">
                    <img
                      src={ep.thumbnailUrl}
                      alt={ep.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-7 h-7 rounded-full bg-accent-purple text-white flex items-center justify-center scale-90 group-hover:scale-110 transition-transform">
                        <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Episode Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-white group-hover:text-accent-purple transition truncate">
                        {ep.episodeNumber}. {ep.title}
                      </h4>
                      <span className="text-xs text-gray-400 font-mono flex items-center gap-1 flex-shrink-0">
                        <Clock className="w-3 h-3 text-gray-500" />
                        {formatDuration(ep.duration)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2 mt-1 leading-relaxed">
                      {ep.overview}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
