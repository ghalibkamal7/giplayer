import React, { useState, useRef } from 'react';
import { X, Play, Globe, HardDrive, Link as LinkIcon, FileVideo } from 'lucide-react';
import { MediaItem } from '../../types';
import { storage } from '../../services/storage';

interface QuickPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayMedia: (item: MediaItem) => void;
}

export const QuickPlayModal: React.FC<QuickPlayModalProps> = ({
  isOpen,
  onClose,
  onPlayMedia,
}) => {
  const [activeTab, setActiveTab] = useState<'url' | 'file'>('url');
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handlePlayUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = urlInput.trim();
    if (!cleanUrl) {
      setUrlError('Please enter a valid video stream URL');
      return;
    }

    try {
      new URL(cleanUrl);
    } catch {
      setUrlError('Please enter a valid HTTP/HTTPS URL');
      return;
    }

    const isHls = cleanUrl.includes('.m3u8');
    const isLive = cleanUrl.includes('live') || isHls;
    const title = titleInput.trim() || cleanUrl.split('/').pop()?.split('?')[0] || 'Network Stream';

    const newItem: MediaItem = {
      id: `custom-url-${Date.now()}`,
      title,
      description: `Stream played from ${new URL(cleanUrl).hostname}`,
      type: isLive ? 'livetv' : 'movie',
      category: 'Network Stream',
      videoUrl: cleanUrl,
      posterUrl: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=600&auto=format&fit=crop&q=80',
      backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
      duration: isLive ? 0 : 3600,
      releaseYear: new Date().getFullYear(),
      rating: 9.0,
      genres: ['Stream', 'Custom'],
      streamType: isHls ? 'hls' : 'mp4',
      isLive,
    };

    // Save to user's custom library
    storage.addToCustomLibrary(newItem);
    onPlayMedia(newItem);
    onClose();
  };

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const blobUrl = URL.createObjectURL(file);
    const cleanName = file.name.replace(/\.[^/.]+$/, '');

    const localItem: MediaItem = {
      id: `local-file-${Date.now()}`,
      title: cleanName,
      description: `Local file: ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`,
      type: 'local',
      category: 'Local Storage',
      videoUrl: blobUrl,
      posterUrl: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=600&auto=format&fit=crop&q=80',
      backdropUrl: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=1600&auto=format&fit=crop&q=80',
      duration: 3600,
      releaseYear: new Date().getFullYear(),
      rating: 8.5,
      genres: ['Local Media'],
      streamType: 'blob',
    };

    storage.addToCustomLibrary(localItem);
    onPlayMedia(localItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-surface-light border border-surface-border rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white mb-2">Open Video Stream or File</h3>
        <p className="text-xs text-gray-400 mb-6">
          Play any HLS / MP4 network stream or open a local video directly in the MX-style player.
        </p>

        {/* Tabs */}
        <div className="grid grid-cols-2 p-1 bg-surface rounded-2xl mb-6 border border-white/5">
          <button
            onClick={() => setActiveTab('url')}
            className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition ${
              activeTab === 'url' ? 'bg-primary-500 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4" /> Network URL
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition ${
              activeTab === 'file' ? 'bg-primary-500 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <HardDrive className="w-4 h-4" /> Local Video File
          </button>
        </div>

        {activeTab === 'url' ? (
          <form onSubmit={handlePlayUrl} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Stream URL (HLS .m3u8, MP4, WebM)
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="url"
                  placeholder="https://example.com/stream/index.m3u8"
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    setUrlError(null);
                  }}
                  className="w-full pl-10 pr-4 py-3 bg-surface border border-surface-border focus:border-primary-500 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 outline-none transition"
                  required
                />
              </div>
              {urlError && <p className="text-xs text-rose-400 mt-1">{urlError}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Media Title (Optional)
              </label>
              <input
                type="text"
                placeholder="My Stream Name"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                className="w-full px-4 py-3 bg-surface border border-surface-border focus:border-primary-500 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 outline-none transition"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-primary-500 hover:bg-primary-400 text-white font-bold rounded-2xl shadow-glow-primary flex items-center justify-center gap-2 transition active:scale-95 text-sm"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Play Network Stream</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-8 rounded-2xl border-2 border-dashed border-surface-border hover:border-primary-500/60 bg-surface/50 hover:bg-surface cursor-pointer transition flex flex-col items-center justify-center gap-3 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary-500/10 group-hover:bg-primary-500/20 text-primary-400 flex items-center justify-center transition">
                <FileVideo className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-white mb-1">
                  Click to choose a video file
                </p>
                <p className="text-xs text-gray-400">
                  Supports MP4, MKV, WebM, MOV, AVI files
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleSelectFile}
                className="hidden"
              />
            </div>
            <p className="text-[11px] text-gray-500">
              Files are played 100% locally on your machine via HTML5 Blob API. No data is uploaded anywhere.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
