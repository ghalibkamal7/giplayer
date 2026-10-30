import React, { useRef, useEffect, useState } from 'react';
import { ArrowLeft, Play, Pause, Settings, Square, Slash, FastForward, Rewind } from 'lucide-react';
import MoreOptionsMenu from './MoreOptionsMenu';

export type AdvancedPlayerProps = {
  video: { url: string; name: string };
};

/**
 * Minimal premium‑style full‑screen player.
 * It provides:
 *  - Top bar (back, filename, settings icon, speed selector, subtitles/audio shortcut placeholders)
 *  - Bottom bar (play/pause, seek bar, current/total time, fullscreen, lock)
 *  - Double‑click left/right to seek –10s / +10s.
 *  - Auto‑hide of controls after 3 s of inactivity.
 *  - Keyboard shortcuts (Space ⇆, ArrowLeft/Right ⇆ 5 s, F fullscreen).
 *  - Playback‑position persistence in localStorage keyed by video URL.
 *  - A placeholder "More" menu that can be expanded later.
 */
const AdvancedPlayer: React.FC<AdvancedPlayerProps> = ({ video }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [locked, setLocked] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showMore, setShowMore] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Load persisted position
  useEffect(() => {
    const saved = localStorage.getItem(`giplayer-pos-${video.url}`);
    if (saved && videoRef.current) {
      videoRef.current.currentTime = parseFloat(saved);
    }
  }, [video.url]);

  // Save position periodically
  useEffect(() => {
    const id = setInterval(() => {
      if (videoRef.current) {
        localStorage.setItem(`giplayer-pos-${video.url}`, videoRef.current.currentTime.toString());
      }
    }, 5000);
    return () => clearInterval(id);
  }, [video.url]);

  // Update time & duration
  const onTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };
  const onLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const seek = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    }
  };

  // Double‑click handling
  const onDoubleClick = (e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX < rect.width / 2) seek(-10);
    else seek(10);
  };

  // Auto‑hide controls after inactivity
  useEffect(() => {
    if (locked) return;
    const hide = () => setShowControls(false);
    const handler = () => {
      setShowControls(true);
      clearTimeout((window as any)._hideTimeout);
      (window as any)._hideTimeout = setTimeout(hide, 3000);
    };
    document.addEventListener('mousemove', handler);
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('mousemove', handler);
      document.removeEventListener('keydown', handler);
    };
  }, [locked]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      switch (e.key) {
        case ' ': // space
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          seek(5);
          break;
        case 'ArrowLeft':
          seek(-5);
          break;
        case 'f':
        case 'F':
          videoRef.current?.requestFullscreen();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [duration]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, '0');
    const sec = Math.floor(s % 60)
      .toString()
      .padStart(2, '0');
    return `${m}:${sec}`;
  };

  const onSeekBarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = value;
    }
  };

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col" onDoubleClick={onDoubleClick}>
      {/* Top bar */}
      {showControls && (
        <div className="flex items-center justify-between p-2 bg-gray-900 bg-opacity-70">
          <button onClick={() => window.history.back()} className="p-1 hover:text-blue-400">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="flex-1 text-center truncate">{video.name}</span>
          <div className="flex items-center space-x-2">
            <select
              value={speed}
              onChange={e => {
                const s = parseFloat(e.target.value);
                setSpeed(s);
                if (videoRef.current) videoRef.current.playbackRate = s;
              }}
              className="bg-gray-800 text-white rounded"
            >
              <option value={0.5}>0.5×</option>
              <option value={0.75}>0.75×</option>
              <option value={1}>1×</option>
              <option value={1.25}>1.25×</option>
              <option value={1.5}>1.5×</option>
              <option value={2}>2×</option>
            </select>
            <button onClick={() => setShowMore(true)} className="p-1 hover:text-blue-400">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Video element */}
      <video
        ref={videoRef}
        src={video.url}
        className="flex-1 object-contain"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        controls={false}
        autoPlay
      />

      {/* Bottom bar */}
      {showControls && (
        <div className="p-2 bg-gray-900 bg-opacity-70 flex flex-col">
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={currentTime}
            onChange={onSeekBarChange}
            className="w-full"
          />
          <div className="flex items-center justify-between mt-2 text-sm">
            <span>{formatTime(currentTime)}</span>
            <div className="flex items-center space-x-2">
              <button onClick={() => setLocked(!locked)} className="p-1 hover:text-blue-400">
                {locked ? <Slash className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
              </button>
              <button onClick={() => seek(-10)} className="p-1 hover:text-blue-400">
                <Rewind className="w-5 h-5" />
              </button>
              <button onClick={togglePlay} className="p-1 hover:text-blue-400">
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>
              <button onClick={() => seek(10)} className="p-1 hover:text-blue-400">
                <FastForward className="w-5 h-5" />
              </button>
              <button onClick={() => videoRef.current?.requestFullscreen()} className="p-1 hover:text-blue-400">
                <Square className="w-5 h-5" />
              </button>
            </div>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      )}

      {/* More options modal */}
      {showMore && (
        <MoreOptionsMenu video={video} onClose={() => setShowMore(false)} />
      )}
    </div>
  );
};

export default AdvancedPlayer;
