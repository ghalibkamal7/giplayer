import React, { useState } from 'react';
import { Radio, Play, Tv2, Clock } from 'lucide-react';
import { MediaItem } from '../types';
import { CATALOG } from '../data/catalog';

interface LiveTvViewProps {
  onPlayMedia: (item: MediaItem) => void;
}

export const LiveTvView: React.FC<LiveTvViewProps> = ({ onPlayMedia }) => {
  const liveChannels = CATALOG.filter((m) => m.type === 'livetv');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Space & Science', 'News & Finance', 'Sports & Adventure', 'Wildlife & Nature'];

  const filteredChannels =
    selectedCategory === 'All'
      ? liveChannels
      : liveChannels.filter((c) => c.category === selectedCategory);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Radio className="w-7 h-7 text-rose-500 animate-pulse" />
            <span>Live TV Broadcasts</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            24/7 continuous live broadcasts from official open and public domain networks.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <span>{liveChannels.length} Channels Broadcasting</span>
        </div>
      </div>

      {/* Categories Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl transition whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-rose-600 text-white shadow-glow-primary'
                : 'bg-surface hover:bg-surface-lighter text-gray-300 border border-surface-border'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Channel Grid with Interactive Program Guide (EPG) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredChannels.map((channel) => (
          <div
            key={channel.id}
            onClick={() => onPlayMedia(channel)}
            className="p-5 rounded-3xl bg-surface border border-surface-border hover:border-rose-500/50 hover:bg-surface-light transition-all cursor-pointer group shadow-lg flex flex-col justify-between gap-4"
          >
            {/* Top info */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-surface-lighter flex-shrink-0">
                  <img
                    src={channel.posterUrl}
                    alt={channel.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-rose-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-rose-600 text-white">
                      LIVE
                    </span>
                    <span className="text-xs font-mono font-bold text-gray-400">
                      CH {channel.channelNumber}
                    </span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-rose-400 font-medium">
                      {channel.category}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-rose-400 transition">
                    {channel.title}
                  </h3>
                </div>
              </div>

              <div className="w-10 h-10 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                <Play className="w-5 h-5 fill-white ml-0.5" />
              </div>
            </div>

            {/* Electronic Program Guide (EPG) */}
            <div className="p-3.5 rounded-2xl bg-surface-lighter border border-white/5 space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <span className="font-bold text-rose-400 flex items-center gap-1 flex-shrink-0">
                  <Tv2 className="w-3.5 h-3.5" /> NOW:
                </span>
                <span className="text-white font-medium line-clamp-1">
                  {channel.currentProgram}
                </span>
              </div>
              <div className="flex items-start gap-2 text-gray-400">
                <span className="font-semibold text-gray-400 flex items-center gap-1 flex-shrink-0">
                  <Clock className="w-3.5 h-3.5 text-gray-400" /> NEXT:
                </span>
                <span className="line-clamp-1 text-gray-300">
                  {channel.nextProgram}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
