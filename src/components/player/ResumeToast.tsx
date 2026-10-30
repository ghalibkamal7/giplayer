import React from 'react';
import { RotateCcw, Play } from 'lucide-react';
import { formatDuration } from '../../utils/formatters';

interface ResumeToastProps {
  resumeTime: number;
  onResume: () => void;
  onRestart: () => void;
  onDismiss: () => void;
}

export const ResumeToast: React.FC<ResumeToastProps> = ({
  resumeTime,
  onResume,
  onRestart,
  onDismiss,
}) => {
  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-surface/95 backdrop-blur-md border border-primary-500/30 text-white px-5 py-3 rounded-2xl shadow-glow-primary flex items-center gap-4 animate-slide-up">
      <div className="flex flex-col">
        <span className="text-xs text-gray-400 font-medium">Saved Playback Position</span>
        <span className="text-sm font-bold text-white">
          Resume from <span className="text-primary-400 font-mono">{formatDuration(resumeTime)}</span>?
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            onResume();
            onDismiss();
          }}
          className="px-3.5 py-1.5 bg-primary-500 hover:bg-primary-400 text-white text-xs font-bold rounded-lg shadow flex items-center gap-1.5 transition active:scale-95"
        >
          <Play className="w-3.5 h-3.5 fill-white" /> Resume
        </button>
        <button
          onClick={() => {
            onRestart();
            onDismiss();
          }}
          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white text-xs font-medium rounded-lg transition active:scale-95 flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" /> Start Over
        </button>
      </div>
    </div>
  );
};
