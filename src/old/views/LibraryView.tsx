import React, { useState, useEffect } from 'react';
import {
  FolderHeart,
  Heart,
  History,
  Clock,
  HardDrive,
  Trash2,
  PlusCircle,
  Play,
} from 'lucide-react';
import { MediaItem, PlaybackProgress, WatchHistoryItem } from '../types';
import { storage } from '../services/storage';
import { formatDuration, formatRelativeTime } from '../utils/formatters';
import { MediaCard } from '../components/media/MediaCard';
import { ContinueWatchingCard } from '../components/media/ContinueWatchingCard';

interface LibraryViewProps {
  onPlayMedia: (item: MediaItem) => void;
  onOpenQuickPlay: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ onPlayMedia, onOpenQuickPlay }) => {
  const [activeTab, setActiveTab] = useState<'favorites' | 'continue' | 'history' | 'custom'>('favorites');
  const [favorites, setFavorites] = useState<MediaItem[]>([]);
  const [continueWatching, setContinueWatching] = useState<PlaybackProgress[]>([]);
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [customLibrary, setCustomLibrary] = useState<MediaItem[]>([]);

  const reloadData = () => {
    setFavorites(storage.getFavorites());
    setContinueWatching(storage.getContinueWatchingList());
    setHistory(storage.getWatchHistory());
    setCustomLibrary(storage.getCustomLibrary());
  };

  useEffect(() => {
    reloadData();
  }, []);

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear your entire watch history?')) {
      storage.clearWatchHistory();
      reloadData();
    }
  };

  const handleRemoveProgress = (id: string) => {
    storage.removeProgress(id);
    reloadData();
  };

  const handleRemoveCustom = (id: string) => {
    storage.removeFromCustomLibrary(id);
    reloadData();
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <FolderHeart className="w-7 h-7 text-primary-400" />
            <span>My Library</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Access your saved favorites, continue watching, playback history, and local files.
          </p>
        </div>

        <button
          onClick={onOpenQuickPlay}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-primary-500 to-accent-cyan text-white text-xs sm:text-sm font-bold shadow-glow-primary transition active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Stream / File</span>
        </button>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold scrollbar-none">
        {[
          { id: 'favorites', label: `Favorites (${favorites.length})`, icon: Heart },
          { id: 'continue', label: `Continue Watching (${continueWatching.length})`, icon: Clock },
          { id: 'history', label: `History (${history.length})`, icon: History },
          { id: 'custom', label: `Custom & Local (${customLibrary.length})`, icon: HardDrive },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 transition whitespace-nowrap ${
                isActive
                  ? 'bg-primary-500 text-white shadow-glow-primary font-bold'
                  : 'bg-surface hover:bg-surface-lighter text-gray-300 border border-surface-border'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: FAVORITES */}
      {activeTab === 'favorites' && (
        <div>
          {favorites.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {favorites.map((item) => (
                <MediaCard
                  key={item.id}
                  item={item}
                  onPlay={onPlayMedia}
                  onFavoriteChange={reloadData}
                />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center rounded-3xl bg-surface border border-surface-border">
              <Heart className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">Your Watchlist is Empty</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4">
                Click the heart icon on any movie or web series to bookmark it for later.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CONTINUE WATCHING */}
      {activeTab === 'continue' && (
        <div>
          {continueWatching.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {continueWatching.map((p) => (
                <ContinueWatchingCard
                  key={p.mediaId}
                  progress={p}
                  onPlay={onPlayMedia}
                  onRemove={handleRemoveProgress}
                />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center rounded-3xl bg-surface border border-surface-border">
              <Clock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">No In-Progress Videos</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Start watching any video and GIPlayer will automatically remember your position.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: WATCH HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {history.length > 0 ? (
            <>
              <div className="flex justify-end">
                <button
                  onClick={handleClearHistory}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear All History
                </button>
              </div>

              <div className="space-y-2">
                {history.map((h, idx) => (
                  <div
                    key={`${h.mediaId}-${idx}`}
                    className="flex items-center justify-between p-3 rounded-2xl bg-surface border border-surface-border hover:bg-surface-light transition text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={h.posterUrl}
                        alt={h.title}
                        className="w-12 h-14 rounded-xl object-cover bg-surface-lighter flex-shrink-0"
                      />
                      <div className="truncate">
                        <h4 className="font-bold text-white truncate text-sm">
                          {h.title}
                        </h4>
                        {h.episodeTitle && (
                          <p className="text-primary-400 text-xs truncate">
                            {h.episodeTitle}
                          </p>
                        )}
                        <span className="text-gray-400 font-mono mt-0.5 block">
                          Watched {formatDuration(h.currentTime)} / {formatDuration(h.duration)} ({Math.round(h.percentage)}%)
                        </span>
                      </div>
                    </div>

                    <span className="text-gray-400 font-medium whitespace-nowrap ml-4">
                      {formatRelativeTime(h.watchedAt)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="p-12 text-center rounded-3xl bg-surface border border-surface-border">
              <History className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">No Watch History Yet</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Completed and played media sessions will be recorded here privately on your device.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CUSTOM & LOCAL MEDIA */}
      {activeTab === 'custom' && (
        <div>
          {customLibrary.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {customLibrary.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onPlayMedia(item)}
                  className="p-4 rounded-2xl bg-surface border border-surface-border hover:border-primary-500/50 hover:bg-surface-light transition cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-primary-500/10 text-primary-400 flex items-center justify-center flex-shrink-0">
                      <Play className="w-5 h-5 fill-primary-400 ml-0.5" />
                    </div>
                    <div className="truncate">
                      <h4 className="font-bold text-white group-hover:text-primary-400 transition truncate text-sm">
                        {item.title}
                      </h4>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {item.category}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveCustom(item.id);
                    }}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 transition"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center rounded-3xl bg-surface border border-surface-border">
              <HardDrive className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">No Custom Streams or Files</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4">
                Play any direct HLS/MP4 link or choose a video file from your computer or phone.
              </p>
              <button
                onClick={onOpenQuickPlay}
                className="px-4 py-2 bg-primary-500 text-white font-bold rounded-xl text-xs shadow-glow-primary transition active:scale-95"
              >
                Open Stream or File Now
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
