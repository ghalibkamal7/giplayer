import { describe, it, expect, beforeEach } from 'vitest';

// Polyfill in-memory localStorage for test environment
const mockStorage: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, val: string) => { mockStorage[key] = String(val); },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => {
    for (const key in mockStorage) {
      delete mockStorage[key];
    }
  },
  key: (i: number) => Object.keys(mockStorage)[i] || null,
  length: 0,
};

import { storage } from '../src/services/storage';
import { MediaItem } from '../src/types';

describe('StorageService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const sampleMedia: MediaItem = {
    id: 'test-item-1',
    title: 'Test Video',
    description: 'Test description',
    type: 'movie',
    category: 'Test',
    videoUrl: 'https://example.com/test.mp4',
    posterUrl: 'https://example.com/poster.jpg',
    backdropUrl: 'https://example.com/backdrop.jpg',
    duration: 600,
    releaseYear: 2024,
    rating: 8.5,
    genres: ['Test'],
  };

  it('saves and retrieves playback progress', () => {
    storage.saveProgress('test-item-1', 120, 600, sampleMedia);
    const progress = storage.getProgress('test-item-1');

    expect(progress).not.toBeNull();
    expect(progress?.currentTime).toBe(120);
    expect(progress?.duration).toBe(600);
    expect(progress?.percentage).toBe(20);
    expect(progress?.completed).toBe(false);
  });

  it('marks video completed when >= 95%', () => {
    storage.saveProgress('test-item-1', 580, 600, sampleMedia);
    const progress = storage.getProgress('test-item-1');
    expect(progress?.completed).toBe(true);
  });

  it('filters active continue watching items', () => {
    // 5 seconds watched -> should be omitted (< 5s threshold)
    storage.saveProgress('item-too-short', 3, 600, sampleMedia);
    // 98% watched -> should be omitted (completed)
    storage.saveProgress('item-completed', 590, 600, sampleMedia);
    // 50% watched -> should be included
    storage.saveProgress('item-in-progress', 300, 600, sampleMedia);

    const list = storage.getContinueWatchingList();
    expect(list.length).toBe(1);
    expect(list[0].mediaId).toBe('item-in-progress');
  });

  it('toggles favorites correctly', () => {
    expect(storage.isFavorite('test-item-1')).toBe(false);

    const isFavNow = storage.toggleFavorite(sampleMedia);
    expect(isFavNow).toBe(true);
    expect(storage.isFavorite('test-item-1')).toBe(true);
    expect(storage.getFavorites().length).toBe(1);

    const isFavRemoved = storage.toggleFavorite(sampleMedia);
    expect(isFavRemoved).toBe(false);
    expect(storage.isFavorite('test-item-1')).toBe(false);
    expect(storage.getFavorites().length).toBe(0);
  });

  it('adds and clears watch history', () => {
    storage.addToWatchHistory({
      mediaId: 'test-item-1',
      title: 'Test Video',
      type: 'movie',
      posterUrl: 'https://example.com/poster.jpg',
      currentTime: 100,
      duration: 500,
    });

    let history = storage.getWatchHistory();
    expect(history.length).toBe(1);
    expect(history[0].title).toBe('Test Video');

    storage.clearWatchHistory();
    history = storage.getWatchHistory();
    expect(history.length).toBe(0);
  });

  it('saves and merges user settings', () => {
    const original = storage.getSettings();
    expect(original.doubleTapSeekSeconds).toBe(10);

    const updated = storage.saveSettings({ doubleTapSeekSeconds: 15, themeAccent: 'purple' });
    expect(updated.doubleTapSeekSeconds).toBe(15);
    expect(updated.themeAccent).toBe('purple');
    expect(updated.volume).toBe(1.0); // preserved default
  });
});
