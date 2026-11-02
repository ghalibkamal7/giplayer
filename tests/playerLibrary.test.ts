import { beforeEach, describe, expect, it } from 'vitest';
import { makeVideoId, playerLibrary } from '../src/services/playerLibrary';

const storage = new Map<string, string>();

globalThis.localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => { storage.set(key, String(value)); },
  removeItem: (key: string) => { storage.delete(key); },
  clear: () => storage.clear(),
  key: (index: number) => Array.from(storage.keys())[index] ?? null,
  get length() { return storage.size; },
};

describe('player library persistence', () => {
  beforeEach(() => localStorage.clear());

  it('persists and retrieves playlists', () => {
    const playlists = [{ id: 'list-1', name: 'Favorites', videoIds: ['video-1'], updatedAt: 123 }];
    playerLibrary.savePlaylists(playlists);
    expect(playerLibrary.getPlaylists()).toEqual(playlists);
  });

  it('persists bookmarks independently for each video', () => {
    const bookmark = { id: 'mark-1', time: 82, note: 'Opening scene', createdAt: 456 };
    playerLibrary.saveBookmarks('video-1', [bookmark]);
    playerLibrary.saveBookmarks('video-2', []);
    expect(playerLibrary.getBookmarks('video-1')).toEqual([bookmark]);
    expect(playerLibrary.getBookmarks('video-2')).toEqual([]);
  });

  it('uses the selected path and file metadata for a stable media identity', () => {
    const file = { name: 'movie.mp4', size: 2048, lastModified: 789 } as File;
    expect(makeVideoId('Movies/movie.mp4', file)).toBe('Movies/movie.mp4:2048:789');
  });
});
