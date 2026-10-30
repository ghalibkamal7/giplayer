import React, { useState, useMemo, useRef } from 'react';
import {
  Video,
  FolderOpen,
  Upload,
  ArrowUpDown,
  Filter,
  Play,
  Trash2,
  HardDrive,
  FileVideo,
} from 'lucide-react';
import { MediaItem } from '../types';
import { localMedia } from '../services/localMedia';
import { storage } from '../services/storage';
import { formatBytes, formatDuration } from '../utils/formatters';

interface VideosViewProps {
  onPlayMedia: (item: MediaItem) => void;
  onRefresh: () => void;
}

export const VideosView: React.FC<VideosViewProps> = ({ onPlayMedia, onRefresh }) => {
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const allVideos = localMedia.getVideos();

  // Extract unique folders
  const folders = useMemo(() => {
    const set = new Set<string>();
    allVideos.forEach((v) => {
      if (v.folderPath) set.add(v.folderPath);
    });
    return Array.from(set);
  }, [allVideos]);

  // Filter & sort
  const filteredVideos = useMemo(() => {
    let result = [...allVideos];
    if (selectedFolder !== 'all') {
      result = result.filter((v) => v.folderPath === selectedFolder);
    }

    result.sort((a, b) => {
      if (sortBy === 'name') return a.title.localeCompare(b.title);
      if (sortBy === 'size') return (b.fileSize || 0) - (a.fileSize || 0);
      return (b.dateAdded || 0) - (a.dateAdded || 0);
    });

    return result;
  }, [allVideos, selectedFolder, sortBy]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      localMedia.processFiles(e.target.files);
      onRefresh();
    }
  };

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    storage.removeFromCustomLibrary(id);
    onRefresh();
  };

  const totalSize = allVideos.reduce((acc, curr) => acc + (curr.fileSize || 0), 0);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Video className="w-7 h-7 text-primary-400" />
            <span>Local Videos</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Browse and play your offline video files with MX Player Pro gesture controls and 200% audio boost.
          </p>
        </div>

        {/* Action Import Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => folderInputRef.current?.click()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-lighter text-gray-200 border border-surface-border text-xs font-semibold transition active:scale-95 shadow-sm"
            title="Import an entire folder from your computer or device"
          >
            <FolderOpen className="w-4 h-4 text-amber-400" />
            <span>Open Folder</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-accent-cyan text-white text-xs font-bold shadow-glow-primary transition active:scale-95"
            title="Select video files from disk"
          >
            <Upload className="w-4 h-4" />
            <span>Select Videos</span>
          </button>

          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="video/*,.mkv,.mp4,.webm,.avi,.mov,.flv,.ts"
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

      {/* Filter and Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-2xl bg-surface border border-surface-border text-xs">
        <div className="flex items-center gap-3 text-gray-400">
          <span className="font-semibold text-white">
            {allVideos.length} {allVideos.length === 1 ? 'Video' : 'Videos'}
          </span>
          {totalSize > 0 && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1 font-mono text-primary-400">
                <HardDrive className="w-3.5 h-3.5" /> {formatBytes(totalSize)}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Folder filter */}
          {folders.length > 1 && (
            <div className="flex items-center gap-1.5 text-gray-400">
              <Filter className="w-3.5 h-3.5" />
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="bg-surface-lighter text-white px-2.5 py-1 rounded-lg border border-white/10 outline-none cursor-pointer"
              >
                <option value="all">All Folders ({folders.length})</option>
                {folders.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sort dropdown */}
          <div className="flex items-center gap-1.5 text-gray-400">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-surface-lighter text-white px-2.5 py-1 rounded-lg border border-white/10 outline-none cursor-pointer"
            >
              <option value="date">Recently Added</option>
              <option value="name">Name (A-Z)</option>
              <option value="size">File Size</option>
            </select>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      {filteredVideos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              onClick={() => onPlayMedia(video)}
              className="group rounded-2xl bg-surface border border-surface-border hover:border-primary-500/50 hover:bg-surface-light transition-all p-3 flex flex-col justify-between gap-3 cursor-pointer shadow-sm transform hover:-translate-y-1"
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-surface-lighter flex items-center justify-center">
                {video.posterUrl ? (
                  <img
                    src={video.posterUrl}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-surface-lighter to-surface text-gray-500 group-hover:text-primary-400 transition-colors">
                    <FileVideo className="w-10 h-10 mb-1" />
                    <span className="text-[10px] font-mono uppercase tracking-wider">
                      {video.fileName?.split('.').pop() || 'VIDEO'}
                    </span>
                  </div>
                )}

                {/* Center Hover Play Button */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-11 h-11 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-glow-primary">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </div>
                </div>

                {/* Duration Badge */}
                {video.duration > 0 && (
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/75 text-white text-[10px] font-mono font-bold">
                    {formatDuration(video.duration)}
                  </div>
                )}
              </div>

              {/* Title & Details */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-white group-hover:text-primary-400 transition truncate" title={video.title}>
                    {video.title}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-1">
                    {video.fileSize && <span>{formatBytes(video.fileSize)}</span>}
                    {video.folderPath && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[120px] text-primary-400" title={video.folderPath}>
                          {video.folderPath.split('/').pop()}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={(e) => handleRemove(video.id, e)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-white/5 transition"
                  title="Remove from list"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center rounded-3xl bg-surface border border-surface-border">
          <Video className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No Local Videos Loaded</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto mb-6">
            Click "Select Videos" or "Open Folder" to load local video files from your hard drive or phone storage.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-2.5 bg-primary-500 hover:bg-primary-400 text-white font-bold rounded-xl text-xs shadow-glow-primary transition active:scale-95"
          >
            Choose Video Files Now
          </button>
        </div>
      )}
    </div>
  );
};
