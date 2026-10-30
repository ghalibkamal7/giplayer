import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Lock,
  Unlock,
  Subtitles,
  Gauge,
  Maximize2,
  Minimize2,
  Tv,
  Clock,
  Volume2,
  Sliders,
  Upload,
  Check,
  HelpCircle,
} from 'lucide-react';
import { AspectRatioMode, SubtitleTrack } from '../../types';

interface PlayerHeaderProps {
  title: string;
  subtitleInfo?: string;
  isLocked: boolean;
  onToggleLock: () => void;
  onBack: () => void;
  aspectRatio: AspectRatioMode;
  onChangeAspectRatio: (mode: AspectRatioMode) => void;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
  subtitles: SubtitleTrack[];
  activeSubtitleId: string | null;
  onSelectSubtitle: (id: string | null) => void;
  onLoadCustomSubtitle: (file: File) => void;
  subtitleOffset: number;
  onChangeSubtitleOffset: (offset: number) => void;
  audioBoost: number;
  onChangeAudioBoost: (boost: number) => void;
  sleepTimerRemaining: number | null;
  onSetSleepTimer: (minutes: number | null) => void;
  isPipAvailable: boolean;
  isPipActive: boolean;
  onTogglePip: () => void;
  onOpenShortcuts: () => void;
}

export const PlayerHeader: React.FC<PlayerHeaderProps> = ({
  title,
  subtitleInfo,
  isLocked,
  onToggleLock,
  onBack,
  aspectRatio,
  onChangeAspectRatio,
  playbackSpeed,
  onChangeSpeed,
  subtitles,
  activeSubtitleId,
  onSelectSubtitle,
  onLoadCustomSubtitle,
  subtitleOffset,
  onChangeSubtitleOffset,
  audioBoost,
  onChangeAudioBoost,
  sleepTimerRemaining,
  onSetSleepTimer,
  isPipAvailable,
  isPipActive,
  onTogglePip,
  onOpenShortcuts,
}) => {
  const [activeMenu, setActiveMenu] = useState<'subtitles' | 'speed' | 'aspect' | 'audio' | 'timer' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleMenu = (menu: 'subtitles' | 'speed' | 'aspect' | 'audio' | 'timer') => {
    setActiveMenu((prev) => (prev === menu ? null : menu));
  };

  const speeds = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
  const aspectRatios: { label: string; mode: AspectRatioMode }[] = [
    { label: 'Fit to Screen', mode: 'contain' },
    { label: 'Fill / Zoom', mode: 'cover' },
    { label: 'Stretch Full', mode: 'fill' },
    { label: '16:9 Widescreen', mode: '16:9' },
    { label: '4:3 Classic', mode: '4:3' },
  ];

  if (isLocked) {
    return (
      <div className="absolute top-4 left-4 z-40">
        <button
          onClick={onToggleLock}
          className="p-3 bg-red-600/80 hover:bg-red-600 backdrop-blur-md text-white rounded-full shadow-lg border border-red-400/40 transition-transform active:scale-95 flex items-center gap-2 px-4"
          title="Screen is Locked. Click to Unlock"
        >
          <Lock className="w-5 h-5 text-white" />
          <span className="text-xs font-semibold">Locked</span>
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-0 left-0 right-0 z-30 p-4 md:p-6 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between pointer-events-auto">
      {/* Left: Back & Title */}
      <div className="flex items-center gap-3 max-w-[60%]">
        <button
          onClick={onBack}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all active:scale-95 border border-white/10"
          aria-label="Go Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="truncate">
          <h1 className="text-base md:text-lg font-bold text-white tracking-wide truncate drop-shadow-md">
            {title}
          </h1>
          {subtitleInfo && (
            <p className="text-xs md:text-sm text-primary-400 font-medium truncate drop-shadow-sm">
              {subtitleInfo}
            </p>
          )}
        </div>
      </div>

      {/* Right: Quick Action Controls */}
      <div className="flex items-center gap-2">
        {/* Screen Lock Toggle */}
        <button
          onClick={onToggleLock}
          className="p-2 rounded-full bg-black/40 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10 backdrop-blur-sm transition-all"
          title="Lock Screen"
        >
          <Unlock className="w-4 h-4" />
        </button>

        {/* Subtitles Menu */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('subtitles')}
            className={`p-2 rounded-full border border-white/10 backdrop-blur-sm transition-all ${
              activeSubtitleId
                ? 'bg-primary-500/30 text-primary-300 border-primary-500/40'
                : 'bg-black/40 hover:bg-white/15 text-gray-300 hover:text-white'
            }`}
            title="Subtitles & Closed Captions"
          >
            <Subtitles className="w-4 h-4" />
          </button>

          {activeMenu === 'subtitles' && (
            <div className="absolute right-0 mt-3 w-64 bg-surface-light/95 backdrop-blur-xl border border-surface-border rounded-xl shadow-2xl p-3 z-50 text-sm animate-slide-up">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                <span className="font-semibold text-white">Subtitles</span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" /> Load File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".vtt,.srt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onLoadCustomSubtitle(file);
                      setActiveMenu(null);
                    }
                  }}
                />
              </div>

              <div className="space-y-1 max-h-48 overflow-y-auto">
                <button
                  onClick={() => {
                    onSelectSubtitle(null);
                    setActiveMenu(null);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left text-xs transition ${
                    activeSubtitleId === null ? 'bg-primary-500/20 text-primary-300 font-semibold' : 'hover:bg-white/5 text-gray-300'
                  }`}
                >
                  <span>Off</span>
                  {activeSubtitleId === null && <Check className="w-3.5 h-3.5 text-primary-400" />}
                </button>

                {subtitles.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => {
                      onSelectSubtitle(sub.id);
                      setActiveMenu(null);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left text-xs transition ${
                      activeSubtitleId === sub.id ? 'bg-primary-500/20 text-primary-300 font-semibold' : 'hover:bg-white/5 text-gray-300'
                    }`}
                  >
                    <span>{sub.label}</span>
                    {activeSubtitleId === sub.id && <Check className="w-3.5 h-3.5 text-primary-400" />}
                  </button>
                ))}
              </div>

              {/* Subtitle Sync Offset */}
              {activeSubtitleId && (
                <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-gray-400">Sync Offset:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onChangeSubtitleOffset(subtitleOffset - 0.5)}
                      className="px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded"
                    >
                      -0.5s
                    </button>
                    <span className="font-mono text-primary-400 w-12 text-center">
                      {subtitleOffset > 0 ? `+${subtitleOffset.toFixed(1)}` : `${subtitleOffset.toFixed(1)}`}s
                    </span>
                    <button
                      onClick={() => onChangeSubtitleOffset(subtitleOffset + 0.5)}
                      className="px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded"
                    >
                      +0.5s
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Audio Boost & Volume Menu */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('audio')}
            className={`p-2 rounded-full border border-white/10 backdrop-blur-sm transition-all ${
              audioBoost > 1.0
                ? 'bg-amber-500/30 text-amber-300 border-amber-500/40'
                : 'bg-black/40 hover:bg-white/15 text-gray-300 hover:text-white'
            }`}
            title="Audio Boost (Up to 200%)"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {activeMenu === 'audio' && (
            <div className="absolute right-0 mt-3 w-60 bg-surface-light/95 backdrop-blur-xl border border-surface-border rounded-xl shadow-2xl p-4 z-50 text-sm animate-slide-up">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
                <span className="font-semibold text-white flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-amber-400" /> Audio Booster
                </span>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {Math.round(audioBoost * 100)}%
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-2">
                MX-style 200% Web Audio gain boost for quiet dialogues:
              </p>
              <input
                type="range"
                min="1.0"
                max="2.0"
                step="0.1"
                value={audioBoost}
                onChange={(e) => onChangeAudioBoost(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-mono">
                <span>100% (Normal)</span>
                <span>150%</span>
                <span className="text-amber-400 font-bold">200% (Boost)</span>
              </div>
            </div>
          )}
        </div>

        {/* Playback Speed Menu */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('speed')}
            className="p-2 rounded-full bg-black/40 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10 backdrop-blur-sm transition-all text-xs font-mono font-semibold"
            title="Playback Speed"
          >
            <span className="flex items-center gap-0.5">
              <Gauge className="w-3.5 h-3.5" />
              <span>{playbackSpeed}x</span>
            </span>
          </button>

          {activeMenu === 'speed' && (
            <div className="absolute right-0 mt-3 w-44 bg-surface-light/95 backdrop-blur-xl border border-surface-border rounded-xl shadow-2xl p-2 z-50 text-sm animate-slide-up">
              <div className="pb-1.5 mb-1.5 border-b border-white/10 text-xs font-semibold text-white px-2">
                Playback Speed
              </div>
              <div className="grid grid-cols-2 gap-1">
                {speeds.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      onChangeSpeed(s);
                      setActiveMenu(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition text-center ${
                      playbackSpeed === s
                        ? 'bg-primary-500 text-white font-bold'
                        : 'hover:bg-white/5 text-gray-300'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Aspect Ratio Menu */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('aspect')}
            className="p-2 rounded-full bg-black/40 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10 backdrop-blur-sm transition-all"
            title="Aspect Ratio"
          >
            <Tv className="w-4 h-4" />
          </button>

          {activeMenu === 'aspect' && (
            <div className="absolute right-0 mt-3 w-48 bg-surface-light/95 backdrop-blur-xl border border-surface-border rounded-xl shadow-2xl p-2 z-50 text-sm animate-slide-up">
              <div className="pb-1.5 mb-1.5 border-b border-white/10 text-xs font-semibold text-white px-2">
                Aspect Ratio
              </div>
              <div className="space-y-1">
                {aspectRatios.map((item) => (
                  <button
                    key={item.mode}
                    onClick={() => {
                      onChangeAspectRatio(item.mode);
                      setActiveMenu(null);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition ${
                      aspectRatio === item.mode
                        ? 'bg-primary-500/20 text-primary-300 font-semibold'
                        : 'hover:bg-white/5 text-gray-300'
                    }`}
                  >
                    <span>{item.label}</span>
                    {aspectRatio === item.mode && <Check className="w-3.5 h-3.5 text-primary-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sleep Timer Menu */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('timer')}
            className={`p-2 rounded-full border border-white/10 backdrop-blur-sm transition-all ${
              sleepTimerRemaining !== null
                ? 'bg-accent-purple/30 text-accent-purple border-accent-purple/40'
                : 'bg-black/40 hover:bg-white/15 text-gray-300 hover:text-white'
            }`}
            title="Sleep Timer"
          >
            <Clock className="w-4 h-4" />
          </button>

          {activeMenu === 'timer' && (
            <div className="absolute right-0 mt-3 w-44 bg-surface-light/95 backdrop-blur-xl border border-surface-border rounded-xl shadow-2xl p-2 z-50 text-sm animate-slide-up">
              <div className="pb-1.5 mb-1.5 border-b border-white/10 text-xs font-semibold text-white px-2">
                Sleep Timer {sleepTimerRemaining ? `(${Math.ceil(sleepTimerRemaining / 60)}m)` : ''}
              </div>
              <div className="space-y-1">
                {[null, 15, 30, 45, 60].map((mins) => (
                  <button
                    key={String(mins)}
                    onClick={() => {
                      onSetSleepTimer(mins);
                      setActiveMenu(null);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition ${
                      (mins === null && sleepTimerRemaining === null)
                        ? 'bg-accent-purple/20 text-accent-purple font-semibold'
                        : 'hover:bg-white/5 text-gray-300'
                    }`}
                  >
                    <span>{mins === null ? 'Turn Off' : `${mins} Minutes`}</span>
                    {mins === null && sleepTimerRemaining === null && (
                      <Check className="w-3.5 h-3.5 text-accent-purple" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Picture-in-Picture */}
        {isPipAvailable && (
          <button
            onClick={onTogglePip}
            className={`p-2 rounded-full border border-white/10 backdrop-blur-sm transition-all ${
              isPipActive
                ? 'bg-primary-500 text-white'
                : 'bg-black/40 hover:bg-white/15 text-gray-300 hover:text-white'
            }`}
            title="Picture in Picture"
          >
            {isPipActive ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        )}

        {/* Keyboard Shortcuts Help */}
        <button
          onClick={onOpenShortcuts}
          className="p-2 rounded-full bg-black/40 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10 backdrop-blur-sm transition-all hidden md:block"
          title="Keyboard Shortcuts (?)"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
