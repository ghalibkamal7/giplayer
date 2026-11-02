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

const PLAYLISTS_KEY = 'giplayer-playlists';
const BOOKMARKS_KEY = 'giplayer-bookmarks';

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
