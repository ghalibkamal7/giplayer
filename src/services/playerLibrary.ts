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
}

const PLAYLISTS_KEY = 'giplayer-playlists';
const BOOKMARKS_KEY = 'giplayer-bookmarks';
const DIRECTORY_DATABASE = 'giplayer-library';
const DIRECTORY_STORE = 'handles';
const DIRECTORY_KEY = 'selected-directory';

function openDirectoryDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DIRECTORY_DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(DIRECTORY_STORE)) {
        request.result.createObjectStore(DIRECTORY_STORE);
      }
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
  async saveDirectoryHandle(handle: RememberedDirectoryHandle): Promise<boolean> {
    if (typeof indexedDB === 'undefined') return false;
    let database: IDBDatabase | undefined;
    try {
      database = await openDirectoryDatabase();
      await new Promise<void>((resolve, reject) => {
        const request = database!.transaction(DIRECTORY_STORE, 'readwrite')
          .objectStore(DIRECTORY_STORE).put(handle, DIRECTORY_KEY);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error ?? new Error('Could not save the selected folder.'));
      });
      return true;
    } catch (error) {
      console.warn('Could not remember the selected folder in this browser.', error);
      return false;
    } finally {
      database?.close();
    }
  },
  async getDirectoryHandle(): Promise<RememberedDirectoryHandle | null> {
    if (typeof indexedDB === 'undefined') return null;
    let database: IDBDatabase | undefined;
    try {
      database = await openDirectoryDatabase();
      return await new Promise((resolve, reject) => {
        const request = database!.transaction(DIRECTORY_STORE, 'readonly')
          .objectStore(DIRECTORY_STORE).get(DIRECTORY_KEY);
        request.onsuccess = () => resolve((request.result as RememberedDirectoryHandle | undefined) ?? null);
        request.onerror = () => reject(request.error ?? new Error('Could not restore the selected folder.'));
      });
    } catch (error) {
      console.warn('Could not restore the remembered folder in this browser.', error);
      return null;
    } finally {
      database?.close();
    }
  },
  getPlaylists(): SavedPlaylist[] {
    return readJson<SavedPlaylist[]>(PLAYLISTS_KEY, []);
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
