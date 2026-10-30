import React, { useEffect, useState } from 'react';
import { Play, X } from 'lucide-react';
import { Episode } from '../../types';

interface NextEpisodeOverlayProps {
  nextEpisode: Episode;
  onPlayNext: () => void;
  onCancel: () => void;
}

export const NextEpisodeOverlay: React.FC<NextEpisodeOverlayProps> = ({
  nextEpisode,
  onPlayNext,
  onCancel,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(8);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onPlayNext();
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, onPlayNext]);

  return (
    <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in pointer-events-auto">
      <div className="bg-surface-light border border-surface-border rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col items-center text-center relative">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        <span className="text-xs uppercase tracking-widest font-bold text-primary-400 mb-2">
          Up Next in {secondsLeft}s
        </span>

        <h3 className="text-lg font-bold text-white mb-1">
          {nextEpisode.title}
        </h3>
        <p className="text-xs text-gray-400 line-clamp-2 mb-6">
          {nextEpisode.overview}
        </p>

        <div className="flex items-center gap-3 w-full">
          <button
            onClick={onPlayNext}
            className="flex-1 py-3 px-4 bg-primary-500 hover:bg-primary-400 text-white font-bold rounded-xl shadow-glow-primary flex items-center justify-center gap-2 transition active:scale-95"
          >
            <Play className="w-4 h-4 fill-white" /> Play Now
          </button>
          <button
            onClick={onCancel}
            className="py-3 px-5 bg-white/10 hover:bg-white/15 text-gray-300 font-semibold rounded-xl transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
