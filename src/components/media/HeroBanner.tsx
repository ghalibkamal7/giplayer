import React, { useState } from 'react';
import { Play, Plus, Check, Star, Info } from 'lucide-react';
import { MediaItem } from '../../types';
import { storage } from '../../services/storage';

interface HeroBannerProps {
  item: MediaItem;
  onPlay: (item: MediaItem) => void;
  onMoreInfo?: (item: MediaItem) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ item, onPlay, onMoreInfo }) => {
  const [isFav, setIsFav] = useState(() => storage.isFavorite(item.id));

  const toggleFavorite = () => {
    const updated = storage.toggleFavorite(item);
    setIsFav(updated);
  };

  return (
    <div className="relative w-full h-[65vh] min-h-[460px] max-h-[640px] rounded-3xl overflow-hidden mb-8 border border-surface-border shadow-2xl">
      {/* Background Image with Cinematic Vignette Gradients */}
      <img
        src={item.backdropUrl || item.posterUrl}
        alt={item.title}
        className="absolute inset-0 w-full h-full object-cover object-center transform scale-105 transition-transform duration-1000"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent md:w-3/4" />

      {/* Content Container */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 md:p-14 max-w-2xl z-10">
        {/* Badges Row */}
        <div className="flex flex-wrap items-center gap-2.5 mb-3">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-primary-500/20 text-primary-400 border border-primary-500/40">
            Featured
          </span>
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-xs font-bold text-amber-400">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span>{item.rating.toFixed(1)}</span>
          </div>
          <span className="text-xs font-semibold text-gray-300">
            {item.releaseYear}
          </span>
          <span className="text-xs text-gray-400">•</span>
          <span className="text-xs font-semibold text-primary-300">
            {item.category}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-3 drop-shadow-lg">
          {item.title}
        </h1>

        {/* Synopsis */}
        <p className="text-xs sm:text-sm text-gray-300 line-clamp-3 mb-6 drop-shadow leading-relaxed font-normal">
          {item.description}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => onPlay(item)}
            className="flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-cyan hover:from-primary-400 hover:to-accent-cyan text-white font-bold rounded-2xl shadow-glow-primary transition-all transform active:scale-95 text-sm"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>Play Now</span>
          </button>

          <button
            onClick={toggleFavorite}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold backdrop-blur-md transition-all active:scale-95 border ${
              isFav
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                : 'bg-white/10 hover:bg-white/15 text-white border-white/10'
            }`}
          >
            {isFav ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{isFav ? 'In Watchlist' : 'Watchlist'}</span>
          </button>

          {onMoreInfo && (
            <button
              onClick={() => onMoreInfo(item)}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10 backdrop-blur-md transition"
              title="More Details"
            >
              <Info className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
