import React, { useState } from 'react';
import { Play, Heart, Star, Clock } from 'lucide-react';
import { MediaItem } from '../../types';
import { formatDuration } from '../../utils/formatters';
import { storage } from '../../services/storage';

interface MediaCardProps {
  item: MediaItem;
  onPlay: (item: MediaItem) => void;
  progressPercent?: number;
  onFavoriteChange?: () => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  onPlay,
  progressPercent,
  onFavoriteChange,
}) => {
  const [isFav, setIsFav] = useState(() => storage.isFavorite(item.id));
  const [imgLoaded, setImgLoaded] = useState(false);

  const toggleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = storage.toggleFavorite(item);
    setIsFav(updated);
    if (onFavoriteChange) onFavoriteChange();
  };

  return (
    <div
      onClick={() => onPlay(item)}
      className="group relative flex flex-col rounded-2xl bg-surface border border-surface-border overflow-hidden cursor-pointer hover:border-primary-500/50 hover:shadow-glow-card transition-all duration-300 transform hover:-translate-y-1.5"
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-surface-lighter">
        {/* Skeleton Loader placeholder */}
        {!imgLoaded && (
          <div className="absolute inset-0 bg-surface-lighter animate-pulse flex items-center justify-center">
            <span className="w-8 h-8 rounded-full bg-white/10" />
          </div>
        )}
        <img
          src={item.posterUrl}
          alt={item.title}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

        {/* Favorite Button */}
        <button
          onClick={toggleFav}
          className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-all active:scale-90 z-10 ${
            isFav
              ? 'bg-rose-500/30 text-rose-500 border border-rose-500/50'
              : 'bg-black/50 hover:bg-black/80 text-white/80 hover:text-white border border-white/10'
          }`}
          title={isFav ? 'Remove from Watchlist' : 'Add to Watchlist'}
        >
          <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500' : ''}`} />
        </button>

        {/* Rating Badge */}
        {item.rating && item.rating > 0 && (
          <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1 text-[11px] font-bold text-amber-400">
            <Star className="w-3 h-3 fill-amber-400" />
            <span>{item.rating?.toFixed(1) ?? '-'}</span>
          </div>
        )}

        {/* Hover Center Play Button */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-glow-primary scale-0 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-6 h-6 fill-white ml-0.5" />
          </div>
        </div>

        {/* Progress Bar (if in progress) */}
        {progressPercent !== undefined && progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-accent-cyan"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Card Info */}
      <div className="p-3.5 flex flex-col flex-1 justify-between">
        <div>
          <h3 className="text-sm font-bold text-white group-hover:text-primary-400 transition-colors line-clamp-1">
            {item.title}
          </h3>
          <p className="text-[11px] text-gray-400 font-medium mt-0.5 line-clamp-1">
            {item.category}
          </p>
        </div>

        <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5 text-[11px] text-gray-400">
          <span>{item.releaseYear || '2024'}</span>
          {item.duration > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-gray-500" />
              {formatDuration(item.duration)}
            </span>
          )}
          {item.isLive && (
            <span className="text-red-400 font-bold uppercase tracking-wider text-[10px]">
              ● LIVE
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
