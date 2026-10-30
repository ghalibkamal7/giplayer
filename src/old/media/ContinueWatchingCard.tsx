import React from 'react';
import { Play, X, Clock } from 'lucide-react';
import { PlaybackProgress, MediaItem } from '../../types';
import { formatDuration, formatTimeRemaining } from '../../utils/formatters';

interface ContinueWatchingCardProps {
  progress: PlaybackProgress;
  onPlay: (item: MediaItem) => void;
  onRemove: (mediaId: string) => void;
}

export const ContinueWatchingCard: React.FC<ContinueWatchingCardProps> = ({
  progress,
  onPlay,
  onRemove,
}) => {
  const item = progress.mediaItem;
  if (!item) return null;

  return (
    <div
      onClick={() => onPlay(item)}
      className="group relative flex items-center gap-3 p-2.5 rounded-2xl bg-surface border border-surface-border hover:border-primary-500/40 hover:bg-surface-light transition-all cursor-pointer min-w-[280px] max-w-sm flex-1 shadow-sm"
    >
      {/* Thumbnail with mini play overlay & progress */}
      <div className="relative w-28 h-20 rounded-xl overflow-hidden bg-surface-lighter flex-shrink-0">
        <img
          src={item.posterUrl}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-primary-500/90 text-white flex items-center justify-center shadow-glow-primary group-hover:scale-110 transition-transform">
            <Play className="w-4 h-4 fill-white ml-0.5" />
          </div>
        </div>

        {/* Bottom progress track */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/70">
          <div
            className="h-full bg-primary-500"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 pr-6">
        <h4 className="text-sm font-bold text-white group-hover:text-primary-400 transition-colors truncate">
          {item.title}
        </h4>
        <p className="text-xs text-gray-400 truncate mt-0.5">
          {item.category}
        </p>

        <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-400 font-mono">
          <span className="flex items-center gap-1 text-primary-400">
            <Clock className="w-3 h-3" />
            {formatTimeRemaining(progress.currentTime, progress.duration)} left
          </span>
          <span>•</span>
          <span>{formatDuration(progress.currentTime)}</span>
        </div>
      </div>

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(progress.mediaId);
        }}
        className="absolute top-2 right-2 p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition"
        title="Remove from Continue Watching"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
