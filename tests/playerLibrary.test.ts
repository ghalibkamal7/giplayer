import { beforeEach, describe, expect, it } from 'vitest';
import { buildMediaFolderTree, getMediaDirectory, getPlayerPreference, makeVideoId, playerLibrary, setPlayerPreference } from '../src/services/playerLibrary';

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

  it('persists a local-only profile and unique favorite ids', () => {
    const profile = { displayName: 'Alex', email: 'alex@example.test', avatar: 'data:image/jpeg;base64,abc' };
    playerLibrary.saveProfile(profile);
    playerLibrary.saveFavorites(['video-1', 'video-1', 'video-2']);
    expect(playerLibrary.getProfile()).toEqual(profile);
    expect(playerLibrary.getFavorites()).toEqual(['video-1', 'video-2']);
  });

  it('persists the player display and shortcut toggles', () => {
    setPlayerPreference('giplayer-video-display', 'false');
    setPlayerPreference('giplayer-shortcuts', 'false');
    expect(getPlayerPreference('giplayer-video-display', 'true')).toBe('false');
    expect(getPlayerPreference('giplayer-shortcuts', 'true')).toBe('false');
  });

  it('persists bookmarks independently for each video', () => {
    const bookmark = { id: 'mark-1', time: 82, note: 'Opening scene', createdAt: 456 };
    playerLibrary.saveBookmarks('video-1', [bookmark]);
    playerLibrary.saveBookmarks('video-2', []);
    expect(playerLibrary.getBookmarks('video-1')).toEqual([bookmark]);
    expect(playerLibrary.getBookmarks('video-2')).toEqual([]);
  });

  it('removes private media references from playlists, favorites, bookmarks, and playback positions', () => {
    playerLibrary.savePlaylists([{ id: 'list-1', name: 'Queue', videoIds: ['private-1', 'public-1'], updatedAt: 1 }]);
    playerLibrary.saveFavorites(['private-1', 'public-1']);
    playerLibrary.saveBookmarks('private-1', [{ id: 'mark-1', time: 12, note: 'Private note', createdAt: 1 }]);
    setPlayerPreference('giplayer-playback:private-1', '12');
    const updated = playerLibrary.removeMediaReferences(['private-1']);
    expect(updated[0].videoIds).toEqual(['public-1']);
    expect(playerLibrary.getFavorites()).toEqual(['public-1']);
    expect(playerLibrary.getBookmarks('private-1')).toEqual([]);
    expect(getPlayerPreference('giplayer-playback:private-1', '')).toBe('');
  });

  it('uses the selected path and file metadata for a stable media identity', () => {
    const file = { name: 'movie.mp4', size: 2048, lastModified: 789 } as File;
    expect(makeVideoId('Movies/movie.mp4', file)).toBe('Movies/movie.mp4:2048:789');
  });

  it('groups media by immediate folder while counting nested videos in parent folders', () => {
    const media = [
      { relativePath: 'Movies/Action/One/movie.mp4', kind: 'video' as const },
      { relativePath: 'Movies/Action/Two/clip.webm', kind: 'video' as const },
      { relativePath: 'Movies/Action/song.mp3', kind: 'audio' as const },
      { relativePath: 'Movies/comedy.mp4', kind: 'video' as const },
    ];
    const folders = buildMediaFolderTree(media, 'Movies');
    expect(folders.find((folder) => folder.path === 'Action')?.videos).toHaveLength(2);
    expect(folders.find((folder) => folder.path === 'Action/One')?.parentPath).toBe('Action');
    expect(folders.find((folder) => folder.path === 'Action/Two')?.videos[0].relativePath).toContain('clip.webm');
    expect(getMediaDirectory('Movies/comedy.mp4', 'Movies')).toBe('');
  });
});
