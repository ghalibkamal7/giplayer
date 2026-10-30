import React, { useState, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  SkipForward,
  FastForward,
  Rewind,
  Radio,
} from 'lucide-react';
import { formatDuration, formatTimeRemaining } from '../../utils/formatters';

interface PlayerControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTime: number;
  duration: number;
  bufferedEnd: number;
  onSeek: (time: number) => void;
  volume: number;
  isMuted: boolean;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onSeekRelative: (seconds: number) => void;
  seekInterval: number;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  hasNextEpisode: boolean;
  onNextEpisode?: () => void;
  isLive?: boolean;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  onTogglePlay,
  currentTime,
  duration,
  bufferedEnd,
  onSeek,
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
  onSeekRelative,
  seekInterval,
  isFullscreen,
  onToggleFullscreen,
  hasNextEpisode,
  onNextEpisode,
  isLive = false,
}) => {
  const [showRemaining, setShowRemaining] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const playedPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const bufferedPercent = duration > 0 ? Math.min(100, (bufferedEnd / duration) * 100) : 0;

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isLive || !progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(percent * duration);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isLive || !progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const hoverX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const percent = hoverX / rect.width;
    setHoverPosition(hoverX);
    setHoverTime(percent * duration);
  };

  const handleMouseLeave = () => {
    setHoverPosition(null);
    setHoverTime(null);
  };

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 p-4 md:p-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-auto">
      {/* Interactive Seek Bar */}
      {!isLive && duration > 0 && (
        <div
          ref={progressBarRef}
          onClick={handleSeekClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative w-full h-2.5 py-1 mb-3 cursor-pointer group flex items-center"
        >
          {/* Background rail */}
          <div className="w-full h-1.5 group-hover:h-2 bg-white/20 rounded-full overflow-hidden transition-all duration-150 relative">
            {/* Buffered track */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-white/30 rounded-full transition-all duration-200"
              style={{ width: `${bufferedPercent}%` }}
            />
            {/* Played track */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-primary-500 to-accent-cyan rounded-full transition-all duration-75"
              style={{ width: `${playedPercent}%` }}
            />
          </div>

          {/* Scrubber thumb handle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-glow-primary scale-0 group-hover:scale-100 transition-transform duration-150 pointer-events-none"
            style={{ left: `calc(${playedPercent}% - 7px)` }}
          />

          {/* Hover time preview tooltip */}
          {hoverPosition !== null && hoverTime !== null && (
            <div
              className="absolute -top-8 -translate-x-1/2 px-2 py-0.5 bg-black/90 text-white text-xs font-mono font-semibold rounded border border-white/20 shadow-xl pointer-events-none"
              style={{ left: `${hoverPosition}px` }}
            >
              {formatDuration(hoverTime)}
            </div>
          )}
        </div>
      )}

      {/* Main Controls Row */}
      <div className="flex items-center justify-between gap-4">
        {/* Left: Play/Pause, Rewind, Fast Forward, Time Display */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Play/Pause */}
          <button
            onClick={onTogglePlay}
            className="p-3 bg-primary-500 hover:bg-primary-400 text-white rounded-full shadow-glow-primary transition-transform active:scale-90"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-white" />
            ) : currentTime >= duration && duration > 0 ? (
              <RotateCcw className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 fill-white ml-0.5" />
            )}
          </button>

          {/* Rewind */}
          {!isLive && (
            <button
              onClick={() => onSeekRelative(-seekInterval)}
              className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition active:scale-95 hidden sm:block"
              title={`Rewind ${seekInterval}s (Left Arrow / J)`}
            >
              <Rewind className="w-5 h-5" />
            </button>
          )}

          {/* Fast-Forward */}
          {!isLive && (
            <button
              onClick={() => onSeekRelative(seekInterval)}
              className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition active:scale-95 hidden sm:block"
              title={`Fast Forward ${seekInterval}s (Right Arrow / L)`}
            >
              <FastForward className="w-5 h-5" />
            </button>
          )}

          {/* Volume Control */}
          <div className="flex items-center gap-1.5 group/vol">
            <button
              onClick={onToggleMute}
              className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition"
              title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
            >
              <VolumeIcon className="w-5 h-5" />
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-16 md:w-24 accent-primary-500 cursor-pointer h-1.5 bg-white/20 rounded-lg appearance-none opacity-80 group-hover/vol:opacity-100 transition-opacity"
              aria-label="Volume slider"
            />
          </div>

          {/* Time Display */}
          {isLive ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-600/30 border border-red-500/40 rounded-full">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-bold font-mono tracking-wider text-red-300 flex items-center gap-1">
                <Radio className="w-3.5 h-3.5" /> LIVE STREAM
              </span>
            </div>
          ) : (
            <div
              onClick={() => setShowRemaining(!showRemaining)}
              className="text-xs md:text-sm font-mono text-gray-300 hover:text-white cursor-pointer select-none font-medium ml-1"
              title="Click to toggle remaining time"
            >
              <span>{formatDuration(currentTime)}</span>
              <span className="mx-1 text-gray-500">/</span>
              <span>
                {showRemaining
                  ? formatTimeRemaining(currentTime, duration)
                  : formatDuration(duration)}
              </span>
            </div>
          )}
        </div>

        {/* Right: Next Episode, Fullscreen */}
        <div className="flex items-center gap-2">
          {hasNextEpisode && (
            <button
              onClick={onNextEpisode}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs md:text-sm font-semibold transition active:scale-95 border border-white/10"
              title="Play Next Episode (N)"
            >
              <span>Next</span>
              <SkipForward className="w-4 h-4" />
            </button>
          )}

          {/* Fullscreen Button */}
          <button
            onClick={onToggleFullscreen}
            className="p-2.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition active:scale-95"
            title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
          >
            {isFullscreen ? (
              <Minimize className="w-5 h-5" />
            ) : (
              <Maximize className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
