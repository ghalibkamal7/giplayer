import { PlaybackProgress, WatchHistoryItem, UserPreferences, MediaItem } from '../types';

const PROGRESS_KEY = 'giplayer_playback_progress';
const HISTORY_KEY = 'giplayer_watch_history';
const FAVORITES_KEY = 'giplayer_favorites';
const LIBRARY_KEY = 'giplayer_custom_library';
const SETTINGS_KEY = 'giplayer_user_settings';
const SEARCH_HISTORY_KEY = 'giplayer_search_history';

export const DEFAULT_PREFERENCES: UserPreferences = {
  volume: 1.0,
  isMuted: false,
  playbackSpeed: 1.0,
  autoPlayNext: true,
  doubleTapSeekSeconds: 10,
  gesturesEnabled: true,
  brightnessGesture: true,
  volumeGesture: true,
  seekGesture: true,
  aspectRatio: 'contain',
  audioBoost: 1.0,
  subtitleSize: 'base',
  subtitleColor: '#ffffff',
  subtitleBg: 'semi-dark',
  subtitleOffset: 0,
  themeAccent: 'blue',
  hardwareAcceleration: true,
};

// Safe storage access with error handling for quota and private mode
class StorageService {
  private safeGet<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;
      return JSON.parse(item) as T;
    } catch (e) {
      console.warn(`Error reading key ${key} from storage:`, e);
      return defaultValue;
    }
  }

  private safeSet<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`Error saving key ${key} to storage:`, e);
      return false;
    }
  }

  // --- PLAYBACK PROGRESS ---
  getAllProgress(): Record<string, PlaybackProgress> {
    return this.safeGet<Record<string, PlaybackProgress>>(PROGRESS_KEY, {});
  }

  getProgress(mediaId: string): PlaybackProgress | null {
    const all = this.getAllProgress();
    return all[mediaId] || null;
  }

  saveProgress(
    mediaId: string,
    currentTime: number,
    duration: number,
    mediaItem?: MediaItem,
    episodeId?: string
  ): void {
    if (!mediaId || duration <= 0) return;
    const all = this.getAllProgress();
    const percentage = Math.min(100, Math.max(0, (currentTime / duration) * 100));
    const completed = percentage >= 95;

    all[mediaId] = {
      mediaId,
      currentTime,
      duration,
      percentage,
      lastUpdated: Date.now(),
      completed,
      episodeId,
      mediaItem: mediaItem || all[mediaId]?.mediaItem,
    };

    this.safeSet(PROGRESS_KEY, all);
  }

  removeProgress(mediaId: string): void {
    const all = this.getAllProgress();
    delete all[mediaId];
    this.safeSet(PROGRESS_KEY, all);
  }

  getContinueWatchingList(): PlaybackProgress[] {
    const all = this.getAllProgress();
    return Object.values(all)
      .filter((p) => !p.completed && p.currentTime > 5 && p.percentage < 95)
      .sort((a, b) => b.lastUpdated - a.lastUpdated);
  }

  // --- WATCH HISTORY ---
  getWatchHistory(): WatchHistoryItem[] {
    return this.safeGet<WatchHistoryItem[]>(HISTORY_KEY, []);
  }

  addToWatchHistory(item: {
    mediaId: string;
    title: string;
    type: MediaItem['type'];
    posterUrl: string;
    currentTime: number;
    duration: number;
    episodeTitle?: string;
  }): void {
    const history = this.getWatchHistory().filter((h) => h.mediaId !== item.mediaId);
    const percentage = item.duration > 0 ? (item.currentTime / item.duration) * 100 : 0;
    
    const newEntry: WatchHistoryItem = {
      ...item,
      watchedAt: Date.now(),
      percentage,
    };

    // Keep up to 100 recent entries
    const updated = [newEntry, ...history].slice(0, 100);
    this.safeSet(HISTORY_KEY, updated);
  }

  removeFromWatchHistory(mediaId: string): void {
    const history = this.getWatchHistory().filter((h) => h.mediaId !== mediaId);
    this.safeSet(HISTORY_KEY, history);
  }

  clearWatchHistory(): void {
    this.safeSet(HISTORY_KEY, []);
  }

  // --- FAVORITES / WATCHLIST ---
  getFavorites(): MediaItem[] {
    return this.safeGet<MediaItem[]>(FAVORITES_KEY, []);
  }

  isFavorite(mediaId: string): boolean {
    const favs = this.getFavorites();
    return favs.some((f) => f.id === mediaId);
  }

  toggleFavorite(item: MediaItem): boolean {
    const favs = this.getFavorites();
    const index = favs.findIndex((f) => f.id === item.id);
    let isNowFavorite = false;

    if (index >= 0) {
      favs.splice(index, 1);
      isNowFavorite = false;
    } else {
      favs.unshift(item);
      isNowFavorite = true;
    }

    this.safeSet(FAVORITES_KEY, favs);
    return isNowFavorite;
  }

  // --- CUSTOM LIBRARY (NETWORK STREAMS & LOCAL FILES) ---
  getCustomLibrary(): MediaItem[] {
    return this.safeGet<MediaItem[]>(LIBRARY_KEY, []);
  }

  addToCustomLibrary(item: MediaItem): void {
    const library = this.getCustomLibrary().filter((i) => i.id !== item.id);
    this.safeSet(LIBRARY_KEY, [item, ...library]);
  }

  removeFromCustomLibrary(itemId: string): void {
    const library = this.getCustomLibrary().filter((i) => i.id !== itemId);
    this.safeSet(LIBRARY_KEY, library);
  }

  // --- USER SETTINGS ---
  getSettings(): UserPreferences {
    const saved = this.safeGet<Partial<UserPreferences>>(SETTINGS_KEY, {});
    return { ...DEFAULT_PREFERENCES, ...saved };
  }

  saveSettings(partial: Partial<UserPreferences>): UserPreferences {
    const current = this.getSettings();
    const updated = { ...current, ...partial };
    this.safeSet(SETTINGS_KEY, updated);
    return updated;
  }

  // --- SEARCH HISTORY ---
  getSearchHistory(): string[] {
    return this.safeGet<string[]>(SEARCH_HISTORY_KEY, []);
  }

  addSearchHistory(query: string): void {
    const clean = query.trim();
    if (!clean) return;
    const existing = this.getSearchHistory().filter((q) => q.toLowerCase() !== clean.toLowerCase());
    this.safeSet(SEARCH_HISTORY_KEY, [clean, ...existing].slice(0, 10));
  }

  clearSearchHistory(): void {
    this.safeSet(SEARCH_HISTORY_KEY, []);
  }

  // --- STORAGE STATS ---
  getStorageUsageBytes(): number {
    let total = 0;
    try {
      for (const key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
          total += (localStorage[key].length + key.length) * 2;
        }
      }
    } catch {
      // ignore
    }
    return total;
  }
}

export const storage = new StorageService();
