import React, { useState } from 'react';
import { Radio, Plus, Play, Trash2, Link as LinkIcon, Globe } from 'lucide-react';
import { MediaItem } from '../types';
import { localMedia, DEFAULT_STREAMS } from '../services/localMedia';
import { storage } from '../services/storage';

interface StreamsViewProps {
  onPlayMedia: (item: MediaItem) => void;
  onRefresh: () => void;
}

export const StreamsView: React.FC<StreamsViewProps> = ({ onPlayMedia, onRefresh }) => {
  const [streamUrl, setStreamUrl] = useState('');
  const [streamTitle, setStreamTitle] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  const streams = localMedia.getStreams();

  const handleAddStream = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = streamUrl.trim();
    if (!clean) {
      setUrlError('Please enter a valid stream URL');
      return;
    }

    try {
      new URL(clean);
    } catch {
      setUrlError('Please enter a valid HTTP/HTTPS URL');
      return;
    }

    localMedia.addStream(clean, streamTitle);
    setStreamUrl('');
    setStreamTitle('');
    setUrlError(null);
    onRefresh();
  };

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    storage.removeFromCustomLibrary(id);
    onRefresh();
  };

  const allDisplayStreams = streams.length > 0 ? streams : DEFAULT_STREAMS;

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Radio className="w-7 h-7 text-accent-purple" />
            <span>Network & Live Streams</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Stream any direct HLS (.m3u8), MP4, WebM, or online audio broadcast link.
          </p>
        </div>
      </div>

      {/* Add Stream Form Card */}
      <div className="p-6 rounded-3xl bg-surface border border-surface-border shadow-lg">
        <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          <Plus className="w-4 h-4 text-accent-purple" /> Add Network Stream
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Enter an HLS stream manifest or video feed to play with GIPlayer gesture controls.
        </p>

        <form onSubmit={handleAddStream} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-7 relative">
            <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="url"
              placeholder="https://example.com/stream/index.m3u8"
              value={streamUrl}
              onChange={(e) => {
                setStreamUrl(e.target.value);
                setUrlError(null);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-lighter border border-surface-border focus:border-accent-purple rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 outline-none transition"
              required
            />
          </div>

          <div className="sm:col-span-3">
            <input
              type="text"
              placeholder="Stream Title (Optional)"
              value={streamTitle}
              onChange={(e) => setStreamTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface-lighter border border-surface-border focus:border-accent-purple rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 outline-none transition"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full h-full py-2.5 px-4 bg-accent-purple hover:bg-accent-violet text-white font-bold rounded-xl text-xs shadow-glow-purple transition active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Add & Play</span>
            </button>
          </div>
        </form>
        {urlError && <p className="text-xs text-rose-400 mt-2">{urlError}</p>}
      </div>

      {/* Streams List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-300">
          Saved Streams ({allDisplayStreams.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allDisplayStreams.map((stream) => (
            <div
              key={stream.id}
              onClick={() => onPlayMedia(stream)}
              className="p-4 rounded-2xl bg-surface border border-surface-border hover:border-accent-purple/50 hover:bg-surface-light transition-all cursor-pointer group flex items-center justify-between gap-4 shadow-sm"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-accent-purple/10 text-accent-purple flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Globe className="w-6 h-6" />
                </div>
                <div className="truncate">
                  <h4 className="text-sm font-bold text-white group-hover:text-accent-purple transition truncate">
                    {stream.title}
                  </h4>
                  <p className="text-xs text-gray-400 font-mono truncate mt-0.5">
                    {stream.videoUrl}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleRemove(stream.id, e)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-white/5 transition"
                  title="Remove stream"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="w-9 h-9 rounded-full bg-accent-purple text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
