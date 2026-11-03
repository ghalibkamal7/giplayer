export interface SavedPlaylist {
  id: string;
  name: string;
  videoIds: string[];
  updatedAt: number;
}

export interface SavedBookmark {
  id: string;
  time: number;
  note: string;
  createdAt: number;
}

export interface RememberedDirectoryHandle {
  kind: 'directory';
  name: string;
  values(): AsyncIterable<RememberedDirectoryHandle | { kind: 'file'; name: string; getFile(): Promise<File> }>;
  queryPermission?(descriptor: { mode: 'read' }): Promise<PermissionState>;
  requestPermission?(descriptor: { mode: 'read' }): Promise<PermissionState>;
  isSameEntry?(other: RememberedDirectoryHandle): Promise<boolean>;
}

export interface SavedDirectory {
  id: string;
  name: string;
  handle: RememberedDirectoryHandle;
}

export interface LocalProfile {
  displayName: string;
  email: string;
  avatar: string;
}

export interface MediaFolderNode<T> {
  name: string;
  path: string;
  parentPath: string;
  videos: T[];
}

const PLAYLISTS_KEY = 'giplayer-playlists';
const BOOKMARKS_KEY = 'giplayer-bookmarks';
const DIRECTORY_DATABASE = 'giplayer-library';
const DIRECTORY_STORE = 'handles';
const DIRECTORY_KEY = 'selected-directory';
const LIBRARY_DB_VERSION = 2;
const PROFILE_KEY = 'giplayer-local-profile';
const FAVORITES_KEY = 'giplayer-favorites';

function openDirectoryDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DIRECTORY_DATABASE, LIBRARY_DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(DIRECTORY_STORE)) database.createObjectStore(DIRECTORY_STORE);
      if (!database.objectStoreNames.contains('vault-config')) database.createObjectStore('vault-config');
      if (!database.objectStoreNames.contains('vault-items')) database.createObjectStore('vault-items', { keyPath: 'id' });
      if (!database.objectStoreNames.contains('vault-chunks')) database.createObjectStore('vault-chunks');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open directory storage.'));
  });
}

export function getPlayerPreference(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch (error) {
    console.warn(`Could not read player preference ${key}.`, error);
    return fallback;
  }
}

export function setPlayerPreference(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error(`Could not save player preference ${key}.`, error);
  }
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (error) {
    console.warn(`Could not read ${key} from local storage.`, error);
    return fallback;
  }
}

export const playerLibrary = {
  async saveDirectoryHandle(handle: RememberedDirectoryHandle): Promise<SavedDirectory | null> {
    if (typeof indexedDB === 'undefined') return null;
    let database: IDBDatabase | undefined;
    try {
      database = await openDirectoryDatabase();
      const readStore = database.transaction(DIRECTORY_STORE, 'readonly').objectStore(DIRECTORY_STORE);
      const [legacy, allRecords] = await Promise.all([
        new Promise<RememberedDirectoryHandle | null>((resolve, reject) => {
          const request = readStore.get(DIRECTORY_KEY);
          request.onsuccess = () => resolve((request.result as RememberedDirectoryHandle | undefined) ?? null);
          request.onerror = () => reject(request.error ?? new Error('Could not inspect saved folders.'));
        }),
        new Promise<SavedDirectory[]>((resolve, reject) => {
          const request = readStore.getAll();
          request.onsuccess = () => resolve(request.result as SavedDirectory[]);
          request.onerror = () => reject(request.error ?? new Error('Could not list saved folders.'));
        }),
      ]);
      const existing = allRecords.filter((record) => record?.handle && record.id !== DIRECTORY_KEY);
      if (legacy && legacy.name === handle.name) {
        const same = await legacy.isSameEntry?.(handle).catch(() => false);
        if (same) {
          const record = { id: 'legacy', name: handle.name, handle };
          const transaction = database.transaction(DIRECTORY_STORE, 'readwrite');
          const writeStore = transaction.objectStore(DIRECTORY_STORE);
          writeStore.put(record, record.id);
          writeStore.delete(DIRECTORY_KEY);
          await new Promise<void>((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error ?? new Error('Could not migrate the saved folder.'));
          });
          return record;
        }
      }
      let match: SavedDirectory | undefined;
      for (const record of existing) {
        if (record.name === handle.name && await record.handle.isSameEntry?.(handle).catch(() => false)) {
          match = record;
          break;
        }
      }
      const record = { id: match?.id ?? crypto.randomUUID(), name: handle.name, handle };
      const writeStore = database.transaction(DIRECTORY_STORE, 'readwrite').objectStore(DIRECTORY_STORE);
      writeStore.put(record, record.id);
      writeStore.delete(DIRECTORY_KEY);
      await new Promise<void>((resolve, reject) => {
        writeStore.transaction.oncomplete = () => resolve();
        writeStore.transaction.onerror = () => reject(writeStore.transaction.error ?? new Error('Could not save the selected folder.'));
      });
      return record;
    } catch (error) {
      console.warn('Could not remember the selected folder in this browser.', error);
      return null;
    } finally {
      database?.close();
    }
  },
  async getDirectoryHandles(): Promise<SavedDirectory[]> {
    if (typeof indexedDB === 'undefined') return [];
    let database: IDBDatabase | undefined;
    try {
      database = await openDirectoryDatabase();
      const store = database.transaction(DIRECTORY_STORE, 'readonly').objectStore(DIRECTORY_STORE);
      const [allRecords, legacy] = await Promise.all([
        new Promise<SavedDirectory[]>((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result as SavedDirectory[]);
          request.onerror = () => reject(request.error ?? new Error('Could not restore saved folders.'));
        }),
        new Promise<RememberedDirectoryHandle | null>((resolve, reject) => {
          const request = store.get(DIRECTORY_KEY);
          request.onsuccess = () => resolve((request.result as RememberedDirectoryHandle | undefined) ?? null);
          request.onerror = () => reject(request.error ?? new Error('Could not restore the earlier saved folder.'));
        }),
      ]);
      const records = allRecords.filter((record) => record?.handle && record.id !== DIRECTORY_KEY);
      return legacy ? [...records, { id: 'legacy', name: legacy.name, handle: legacy }] : records;
    } catch (error) {
      console.warn('Could not restore the remembered folder in this browser.', error);
      return [];
    } finally {
      database?.close();
    }
  },
  async removeDirectoryHandle(id: string): Promise<boolean> {
    if (typeof indexedDB === 'undefined') return false;
    let database: IDBDatabase | undefined;
    try {
      database = await openDirectoryDatabase();
      await new Promise<void>((resolve, reject) => {
        const transaction = database!.transaction(DIRECTORY_STORE, 'readwrite');
        const store = transaction.objectStore(DIRECTORY_STORE);
        store.delete(id);
        if (id === 'legacy') store.delete(DIRECTORY_KEY);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error('Could not remove the saved folder.'));
      });
      return true;
    } catch (error) {
      console.warn('Could not remove the saved folder.', error);
      return false;
    } finally {
      database?.close();
    }
  },
  async clearDirectoryHandle(): Promise<void> {
    if (typeof indexedDB === 'undefined') return;
    let database: IDBDatabase | undefined;
    try {
      database = await openDirectoryDatabase();
      await new Promise<void>((resolve, reject) => {
        const transaction = database!.transaction(DIRECTORY_STORE, 'readwrite');
        transaction.objectStore(DIRECTORY_STORE).clear();
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error('Could not clear saved folders.'));
      });
    } catch (error) {
      console.warn('Could not clear saved folders.', error);
    } finally {
      database?.close();
    }
  },
  getPlaylists(): SavedPlaylist[] {
    return readJson<SavedPlaylist[]>(PLAYLISTS_KEY, []);
  },
  getProfile(): LocalProfile {
    return readJson<LocalProfile>(PROFILE_KEY, { displayName: '', email: '', avatar: '' });
  },
  saveProfile(profile: LocalProfile): boolean {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      return true;
    } catch (error) {
      console.error('Could not save local profile.', error);
      return false;
    }
  },
  getFavorites(): string[] {
    return readJson<string[]>(FAVORITES_KEY, []);
  },
  saveFavorites(ids: string[]): void {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(new Set(ids))));
    } catch (error) {
      console.error('Could not save favorites.', error);
    }
  },
  removeMediaReferences(ids: string[]): SavedPlaylist[] {
    const removed = new Set(ids);
    const playlists = this.getPlaylists().map((playlist) => ({
      ...playlist,
      videoIds: playlist.videoIds.filter((id) => !removed.has(id)),
    }));
    this.savePlaylists(playlists);
    this.saveFavorites(this.getFavorites().filter((id) => !removed.has(id)));
    const bookmarks = readJson<Record<string, SavedBookmark[]>>(BOOKMARKS_KEY, {});
    removed.forEach((id) => {
      delete bookmarks[id];
      try {
        localStorage.removeItem(`giplayer-playback:${id}`);
      } catch (error) {
        console.error(`Could not clear playback position for ${id}.`, error);
      }
    });
    try {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
    } catch (error) {
      console.error('Could not clear bookmarks for private media.', error);
    }
    return playlists;
  },
  savePlaylists(playlists: SavedPlaylist[]): void {
    try {
      localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
    } catch (error) {
      console.error('Could not save playlists to local storage.', error);
    }
  },
  getBookmarks(videoId: string): SavedBookmark[] {
    const all = readJson<Record<string, SavedBookmark[]>>(BOOKMARKS_KEY, {});
    return all[videoId] ?? [];
  },
  saveBookmarks(videoId: string, bookmarks: SavedBookmark[]): void {
    const all = readJson<Record<string, SavedBookmark[]>>(BOOKMARKS_KEY, {});
    all[videoId] = bookmarks;
    try {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(all));
    } catch (error) {
      console.error('Could not save bookmarks to local storage.', error);
    }
  },
};

export function makeVideoId(relativePath: string, file: File): string {
  return `${relativePath}:${file.size}:${file.lastModified}`;
}

export function getMediaDirectory(relativePath: string, rootFolderName = ''): string {
  const parts = relativePath.split('/').filter(Boolean);
  if (rootFolderName && parts[0] === rootFolderName) parts.shift();
  return parts.slice(0, -1).join('/');
}

export function buildMediaFolderTree<T extends { relativePath: string; kind: 'video' | 'audio' }>(
  media: T[],
  rootFolderName = '',
): MediaFolderNode<T>[] {
  const folders = new Map<string, MediaFolderNode<T>>();
  media.filter((item) => item.kind === 'video').forEach((item) => {
    const parts = getMediaDirectory(item.relativePath, rootFolderName).split('/').filter(Boolean);
    parts.forEach((name, index) => {
      const path = parts.slice(0, index + 1).join('/');
      const parentPath = parts.slice(0, index).join('/');
      const folder = folders.get(path) ?? { name, path, parentPath, videos: [] };
      folder.videos.push(item);
      folders.set(path, folder);
    });
  });
  return Array.from(folders.values());
}
