import React, { useState, useRef, useMemo } from 'react';
import {
  Music,
  FolderOpen,
  Upload,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  Trash2,
  Sliders,
  Repeat,
  Shuffle,
  Activity,
} from 'lucide-react';
import { MediaItem } from '../types';
import { localMedia } from '../services/localMedia';
import { storage } from '../services/storage';
import { formatBytes, formatDuration } from '../utils/formatters';

interface MusicViewProps {
  onPlayMedia: (item: MediaItem) => void;
  onRefresh: () => void;
}

export const MusicView: React.FC<MusicViewProps> = ({ onPlayMedia, onRefresh }) => {
  const [activeTrack, setActiveTrack] = useState<MediaItem | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [audioBoost, setAudioBoost] = useState<number>(1.0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const allAudio = localMedia.getAudioTracks();

  // Extract unique folders
  const folders = useMemo(() => {
    const set = new Set<string>();
    allAudio.forEach((a) => {
      if (a.folderPath) set.add(a.folderPath);
    });
    return Array.from(set);
  }, [allAudio]);

  const filteredAudio = useMemo(() => {
    if (selectedFolder === 'all') return allAudio;
    return allAudio.filter((a) => a.folderPath === selectedFolder);
  }, [allAudio, selectedFolder]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const items = localMedia.processFiles(e.target.files);
      if (items.length > 0 && !activeTrack) {
        setActiveTrack(items[0]);
      }
      onRefresh();
    }
  };

  const handlePlayTrack = (track: MediaItem) => {
    if (activeTrack?.id === track.id) {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      }
    } else {
      setActiveTrack(track);
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.src = track.videoUrl;
        audioRef.current.load();
        audioRef.current.play().catch(() => {});
      }
    }
  };

  const handleNextTrack = () => {
    if (filteredAudio.length === 0) return;
    if (isShuffle) {
      const randomIdx = Math.floor(Math.random() * filteredAudio.length);
      handlePlayTrack(filteredAudio[randomIdx]);
      return;
    }
    const currentIdx = filteredAudio.findIndex((a) => a.id === activeTrack?.id);
    const nextIdx = (currentIdx + 1) % filteredAudio.length;
    handlePlayTrack(filteredAudio[nextIdx]);
  };

  const handlePrevTrack = () => {
    if (filteredAudio.length === 0) return;
    const currentIdx = filteredAudio.findIndex((a) => a.id === activeTrack?.id);
    const prevIdx = (currentIdx - 1 + filteredAudio.length) % filteredAudio.length;
    handlePlayTrack(filteredAudio[prevIdx]);
  };

  const handleRemoveTrack = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    storage.removeFromCustomLibrary(id);
    if (activeTrack?.id === id) {
      setActiveTrack(null);
      setIsPlaying(false);
    }
    onRefresh();
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Hidden HTML5 Audio Element */}
      <audio
        ref={audioRef}
        loop={isLooping}
        onEnded={handleNextTrack}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Music className="w-7 h-7 text-accent-cyan" />
            <span>Music & Audio Tracks</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Offline music player with real-time visualizer, folder playlists, and 200% volume boost.
          </p>
        </div>

        {/* Action Import Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => folderInputRef.current?.click()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-lighter text-gray-200 border border-surface-border text-xs font-semibold transition active:scale-95"
            title="Import an entire music folder from your device"
          >
            <FolderOpen className="w-4 h-4 text-amber-400" />
            <span>Open Music Folder</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-accent-cyan to-primary-500 text-white text-xs font-bold shadow-glow-primary transition active:scale-95"
            title="Select audio tracks from disk"
          >
            <Upload className="w-4 h-4" />
            <span>Select Audio Files</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*,.mp3,.m4a,.wav,.flac,.aac,.ogg,.opus,.wma"
            onChange={handleFileInput}
            className="hidden"
          />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            // @ts-expect-error webkitdirectory attribute
            webkitdirectory="true"
            directory=""
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      </div>

      {/* Music Visualizer Player Banner */}
      {activeTrack && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-surface-light via-surface to-surface-lighter border border-surface-border shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          {/* Subtle animated background visualizer bars */}
          <div className="absolute inset-0 opacity-10 flex items-end justify-between pointer-events-none px-4">
            {Array.from({ length: 32 }).map((_, i) => (
              <div
                key={i}
                className={`w-2 rounded-t-full bg-accent-cyan transition-all duration-200 ${
                  isPlaying ? 'animate-pulse' : 'h-2'
                }`}
                style={{
                  height: isPlaying ? `${Math.max(15, (i * 17) % 85)}%` : '8px',
                  animationDelay: `${(i * 0.05).toFixed(2)}s`,
                }}
              />
            ))}
          </div>

          {/* Left: Track Information */}
          <div className="flex items-center gap-4 z-10 w-full md:w-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-accent-cyan to-primary-600 text-white flex items-center justify-center shadow-glow-primary flex-shrink-0">
              <Music className={`w-8 h-8 ${isPlaying ? 'animate-bounce' : ''}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-cyan/20 text-accent-cyan font-bold border border-accent-cyan/30">
                  {isPlaying ? 'PLAYING NOW' : 'PAUSED'}
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  {activeTrack.folderPath}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white truncate max-w-md">
                {activeTrack.title}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {activeTrack.fileSize ? formatBytes(activeTrack.fileSize) : 'Audio Stream'}
              </p>
            </div>
          </div>

          {/* Center: Controls */}
          <div className="flex items-center gap-3 z-10">
            <button
              onClick={() => setIsShuffle(!isShuffle)}
              className={`p-2 rounded-xl transition ${
                isShuffle ? 'bg-primary-500/20 text-primary-400' : 'text-gray-400 hover:text-white'
              }`}
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              onClick={handlePrevTrack}
              className="p-2.5 rounded-full bg-surface-lighter hover:bg-white/10 text-white transition active:scale-95"
              title="Previous Track"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => handlePlayTrack(activeTrack)}
              className="p-4 rounded-full bg-accent-cyan hover:bg-accent-cyan/90 text-black font-bold shadow-glow-primary transition active:scale-90"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-6 h-6 fill-black" /> : <Play className="w-6 h-6 fill-black ml-0.5" />}
            </button>

            <button
              onClick={handleNextTrack}
              className="p-2.5 rounded-full bg-surface-lighter hover:bg-white/10 text-white transition active:scale-95"
              title="Next Track"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsLooping(!isLooping)}
              className={`p-2 rounded-xl transition ${
                isLooping ? 'bg-primary-500/20 text-primary-400' : 'text-gray-400 hover:text-white'
              }`}
              title="Loop Track"
            >
              <Repeat className="w-4 h-4" />
            </button>

            {/* Launch full player option */}
            <button
              onClick={() => onPlayMedia(activeTrack)}
              className="ml-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1 transition"
              title="Open in Full Video / Visualizer Player"
            >
              <Activity className="w-3.5 h-3.5 text-accent-cyan" />
              <span className="hidden sm:inline">Theater Player</span>
            </button>
          </div>

          {/* Right: Audio Gain Slider */}
          <div className="flex items-center gap-2 z-10 w-full md:w-auto justify-end">
            <Volume2 className="w-4 h-4 text-amber-400" />
            <input
              type="range"
              min="1.0"
              max="2.0"
              step="0.1"
              value={audioBoost}
              onChange={(e) => {
                const b = parseFloat(e.target.value);
                setAudioBoost(b);
                if (audioRef.current) audioRef.current.volume = Math.min(1.0, b / 2);
              }}
              className="w-24 accent-amber-400 cursor-pointer"
            />
            <span className="text-[11px] font-mono text-amber-400 font-bold w-10">
              {Math.round(audioBoost * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Folder Filter Bar */}
      {folders.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold scrollbar-none">
          <span className="text-gray-500 font-medium mr-1">Folder:</span>
          <button
            onClick={() => setSelectedFolder('all')}
            className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
              selectedFolder === 'all'
                ? 'bg-accent-cyan text-black font-bold'
                : 'bg-surface text-gray-400 hover:text-white'
            }`}
          >
            All Music ({allAudio.length})
          </button>
          {folders.map((f) => (
            <button
              key={f}
              onClick={() => setSelectedFolder(f)}
              className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
                selectedFolder === f
                  ? 'bg-accent-cyan text-black font-bold'
                  : 'bg-surface text-gray-400 hover:text-white'
              }`}
            >
              {f.split('/').pop()}
            </button>
          ))}
        </div>
      )}

      {/* Tracks List */}
      {filteredAudio.length > 0 ? (
        <div className="space-y-2">
          {filteredAudio.map((track, idx) => {
            const isCurrent = activeTrack?.id === track.id;
            return (
              <div
                key={track.id}
                onClick={() => handlePlayTrack(track)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 group ${
                  isCurrent
                    ? 'bg-accent-cyan/10 border-accent-cyan/50 text-accent-cyan'
                    : 'bg-surface border-surface-border hover:bg-surface-light text-white'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-8 text-center text-xs font-mono text-gray-500 font-bold group-hover:text-white">
                    {isCurrent && isPlaying ? (
                      <Activity className="w-4 h-4 text-accent-cyan animate-pulse mx-auto" />
                    ) : (
                      idx + 1
                    )}
                  </div>

                  <div className="w-10 h-10 rounded-xl bg-surface-lighter flex items-center justify-center flex-shrink-0 text-gray-400 group-hover:text-accent-cyan">
                    <Music className="w-5 h-5" />
                  </div>

                  <div className="truncate">
                    <h4 className="text-sm font-bold truncate group-hover:text-accent-cyan transition">
                      {track.title}
                    </h4>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {track.folderPath} • {track.fileName || 'Audio Track'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-gray-400">
                  {track.fileSize && <span>{formatBytes(track.fileSize)}</span>}
                  {track.duration > 0 && <span>{formatDuration(track.duration)}</span>}

                  <button
                    onClick={(e) => handleRemoveTrack(track.id, e)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-white/5 transition"
                    title="Remove from list"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center rounded-3xl bg-surface border border-surface-border">
          <Music className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No Music Files Loaded</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto mb-6">
            Import your local audio songs, albums, and voice memos to listen offline with full equalizer & volume boost.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-2.5 bg-accent-cyan hover:bg-accent-cyan/90 text-black font-bold rounded-xl text-xs shadow-glow-primary transition active:scale-95"
          >
            Select Audio Files Now
          </button>
        </div>
      )}
    </div>
  );
};
