import React, { useRef } from 'react';
import {
  Folder,
  FolderOpen,
  Video,
  Music,
  Play,
  HardDrive,
  Upload,
} from 'lucide-react';
import { MediaItem, MediaFolder } from '../types';
import { localMedia } from '../services/localMedia';
import { formatBytes } from '../utils/formatters';

interface FoldersViewProps {
  onPlayMedia: (item: MediaItem) => void;
  onRefresh: () => void;
}

export const FoldersView: React.FC<FoldersViewProps> = ({ onPlayMedia, onRefresh }) => {
  const folderInputRef = useRef<HTMLInputElement>(null);
  const folders = localMedia.getFolders();

  const handleFolderInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      localMedia.processFiles(e.target.files);
      onRefresh();
    }
  };

  const handlePlayFirstInFolder = (folder: MediaFolder) => {
    if (folder.items.length > 0) {
      onPlayMedia(folder.items[0]);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Folder className="w-7 h-7 text-amber-400" />
            <span>Local Media Folders</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Explore media organized by local storage directories on your device.
          </p>
        </div>

        <button
          onClick={() => folderInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition active:scale-95 shadow-lg"
        >
          <FolderOpen className="w-4 h-4" />
          <span>Import Directory</span>
        </button>

        <input
          ref={folderInputRef}
          type="file"
          multiple
          // @ts-expect-error webkitdirectory attribute
          webkitdirectory="true"
          directory=""
          onChange={handleFolderInput}
          className="hidden"
        />
      </div>

      {/* Folders Grid */}
      {folders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {folders.map((folder) => (
            <div
              key={folder.path}
              onClick={() => handlePlayFirstInFolder(folder)}
              className="p-5 rounded-3xl bg-surface border border-surface-border hover:border-amber-400/50 hover:bg-surface-light transition-all cursor-pointer group shadow-sm flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Folder className="w-6 h-6 fill-amber-400/20" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition truncate">
                      {folder.name}
                    </h3>
                    <p className="text-xs text-gray-400 font-mono truncate mt-0.5" title={folder.path}>
                      {folder.path}
                    </p>
                  </div>
                </div>

                <div className="w-9 h-9 rounded-full bg-surface-lighter group-hover:bg-amber-400 group-hover:text-black text-white flex items-center justify-center transition-all flex-shrink-0">
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </div>
              </div>

              {/* Stats Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-gray-400">
                <div className="flex items-center gap-3">
                  {folder.videoCount > 0 && (
                    <span className="flex items-center gap-1 text-primary-400">
                      <Video className="w-3.5 h-3.5" /> {folder.videoCount}
                    </span>
                  )}
                  {folder.audioCount > 0 && (
                    <span className="flex items-center gap-1 text-accent-cyan">
                      <Music className="w-3.5 h-3.5" /> {folder.audioCount}
                    </span>
                  )}
                </div>

                {folder.totalSize > 0 && (
                  <span className="flex items-center gap-1 font-mono text-gray-400">
                    <HardDrive className="w-3 h-3 text-gray-500" />
                    {formatBytes(folder.totalSize)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center rounded-3xl bg-surface border border-surface-border">
          <FolderOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No Folders Imported Yet</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto mb-6">
            Open an entire folder from your computer or Android device to automatically categorize all media.
          </p>
          <button
            onClick={() => folderInputRef.current?.click()}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs transition active:scale-95"
          >
            <Upload className="w-4 h-4 inline mr-1.5" />
            Select Local Folder
          </button>
        </div>
      )}
    </div>
  );
};
