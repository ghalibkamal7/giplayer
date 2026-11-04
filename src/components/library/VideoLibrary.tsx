import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, AudioLines, Check, ChevronRight, Folder, FolderOpen,
  Grid2X2, Heart, List, LockKeyhole, Music2, Play, Plus, RefreshCw, Search, Share2,
  Trash2, Video, X, Globe2, UserRound, Clock3, Settings2, Shield, MoreHorizontal,
} from 'lucide-react';
import { buildMediaFolderTree, getMediaDirectory, getPlayerPreference, makeVideoId, playerLibrary, RememberedDirectoryHandle, SavedDirectory, SavedPlaylist, setPlayerPreference } from '../../services/playerLibrary';
import { fingerprintMediaId, getVaultFingerprints, getVaultMediaIdentity } from '../../services/privacyVault';
import { NetworkStreamDialog } from '../player/MoreOptionsMenu';
import PrivacyVault from './PrivacyVault';
import type { DecryptedVaultMedia } from '../../services/privacyVault';

export type VideoFile = {
  id: string;
  file: File;
  url: string;
  name: string;
  relativePath: string;
  thumbnail?: string;
  duration?: number;
  width?: number;
  height?: number;
  lastModified: number;
  kind: 'video' | 'audio';
  sourceId?: string;
  privateVault?: boolean;
};

type FolderEntry = { name: string; path: string; parentPath: string; videos: VideoFile[] };
type PlaylistView = 'playlists' | 'share' | 'privacy' | 'music' | 'stream' | 'folders' | 'profile' | 'favorites' | 'recent' | 'continue' | 'settings' | null;
type PickedFile = { file: File; path: string; sourceId?: string };
type DirectoryScan = { files: PickedFile[]; inaccessible: number };
const VIDEO_EXTENSIONS = new Set(['mp4', 'm4v', 'webm', 'mov', 'mkv', 'avi', 'ogv', '3gp', '3g2', 'ts', 'mts', 'm2ts', 'm2v', 'mpeg', 'mpg', 'wmv', 'flv', 'f4v', 'vob']);
const AUDIO_EXTENSIONS = new Set(['mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg', 'opus', 'weba', 'wma', 'aiff', 'alac', 'amr', 'mid', 'midi']);

function isMediaFile(file: File): 'video' | 'audio' | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (file.type.startsWith('video/') || VIDEO_EXTENSIONS.has(ext)) return 'video';
  if (file.type.startsWith('audio/') || AUDIO_EXTENSIONS.has(ext)) return 'audio';
  return null;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '--:--';
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

async function createThumbnail(file: File): Promise<Pick<VideoFile, 'thumbnail' | 'duration' | 'width' | 'height'>> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.src = url;
      const metadata = (): Pick<VideoFile, 'duration' | 'width' | 'height'> => ({
        duration: Number.isFinite(video.duration) ? video.duration : undefined,
        width: video.videoWidth || undefined,
        height: video.videoHeight || undefined,
      });
      const cleanup = () => {
        URL.revokeObjectURL(url);
        video.removeAttribute('src');
        video.load();
      };
      video.onloadedmetadata = () => {
        if (!video.duration || !Number.isFinite(video.duration)) {
          const details = metadata();
          cleanup();
          resolve(details);
          return;
        }
        video.currentTime = Math.min(1, Math.max(0, video.duration / 2));
      };
      video.onseeked = () => {
        const details = metadata();
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 320 / Math.max(video.videoWidth, video.videoHeight));
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
        const context = canvas.getContext('2d');
        if (!context || !canvas.width || !canvas.height) {
          cleanup();
          resolve(details);
          return;
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnail = canvas.toDataURL('image/jpeg', 0.72);
        cleanup();
        resolve({ ...details, thumbnail });
      };
      video.onerror = () => {
        const details = metadata();
        cleanup();
        resolve(details);
      };
    });
  } catch {
    URL.revokeObjectURL(url);
    return {};
  }
}

async function readDirectory(handle: RememberedDirectoryHandle, parentPath = ''): Promise<DirectoryScan> {
  const path = parentPath ? `${parentPath}/${handle.name}` : handle.name;
  const files: PickedFile[] = [];
  let inaccessible = 0;
  try {
    for await (const entry of handle.values()) {
      try {
        if (entry.kind === 'directory') {
          const nested = await readDirectory(entry, path);
          files.push(...nested.files);
          inaccessible += nested.inaccessible;
        } else {
          files.push({ file: await entry.getFile(), path: `${path}/${entry.name}` });
        }
      } catch {
        inaccessible += 1;
      }
    }
  } catch {
    inaccessible += 1;
  }
  return { files, inaccessible };
}

export const VideoLibrary = ({
  onSelect,
  onOpenStream,
  onVaultLock,
}: {
  onSelect: (video: VideoFile, queue: VideoFile[], library: VideoFile[]) => void;
  onOpenStream: (url: string) => void;
  onVaultLock: () => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrls = useRef<string[]>([]);
  const videosRef = useRef<VideoFile[]>([]);
  const importGenerationRef = useRef(0);
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [requestedVaultVideos, setRequestedVaultVideos] = useState<VideoFile[]>([]);
  const [favorites, setFavorites] = useState(() => new Set(playerLibrary.getFavorites()));
  const [profile, setProfile] = useState(() => playerLibrary.getProfile());
  const [profileDraft, setProfileDraft] = useState(() => playerLibrary.getProfile());
  const [displayEnabled, setDisplayEnabled] = useState(() => getPlayerPreference('giplayer-video-display', 'true') !== 'false');
  const [shortcutsEnabled, setShortcutsEnabled] = useState(() => getPlayerPreference('giplayer-shortcuts', 'true') !== 'false');
  const [savedDirectories, setSavedDirectories] = useState<SavedDirectory[]>([]);
  const [pendingDirectoryIds, setPendingDirectoryIds] = useState<string[]>([]);
  const [rememberedDirectoryName, setRememberedDirectoryName] = useState('');
  const [needsDirectoryPermission, setNeedsDirectoryPermission] = useState(false);
  const [isCheckingLibrary, setIsCheckingLibrary] = useState(true);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [quickView, setQuickView] = useState<PlaylistView>(null);
  const [libraryMenuOpen, setLibraryMenuOpen] = useState(false);
  const [folderMenuOpen, setFolderMenuOpen] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sort, setSort] = useState<'name' | 'date' | 'size'>('name');
  const [grid, setGrid] = useState(true);
  const [notice, setNotice] = useState('');
  const [playlists, setPlaylists] = useState(() => playerLibrary.getPlaylists());
  const [playlistName, setPlaylistName] = useState('');
  const [playlistSelection, setPlaylistSelection] = useState<SavedPlaylist | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const supportsDirectoryAccess = typeof window !== 'undefined'
    && window.isSecureContext
    && typeof (window as Window & { showDirectoryPicker?: () => Promise<RememberedDirectoryHandle> }).showDirectoryPicker === 'function';

  useEffect(() => () => objectUrls.current.forEach(URL.revokeObjectURL), []);

  const updateVideos = (update: (current: VideoFile[]) => VideoFile[]) => {
    const next = update(videosRef.current);
    videosRef.current = next;
    setVideos(next);
  };

  useEffect(() => {
    if (quickView !== 'settings') return;
    setDisplayEnabled(getPlayerPreference('giplayer-video-display', 'true') !== 'false');
    setShortcutsEnabled(getPlayerPreference('giplayer-shortcuts', 'true') !== 'false');
  }, [quickView]);

  const libraryMenuRef = useRef<HTMLDivElement>(null);
  const folderMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!libraryMenuOpen) return;
    const closeMenu = (event: globalThis.PointerEvent) => {
      if (event.target instanceof Node && !libraryMenuRef.current?.contains(event.target)) setLibraryMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLibraryMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeMenu);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeMenu);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [libraryMenuOpen]);
  useEffect(() => {
    if (!folderMenuOpen) return;
    const closeOnOutsidePointer = (event: globalThis.PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      if (folderMenuRef.current?.contains(event.target) || event.target.closest('[data-folder-action-trigger]')) return;
      setFolderMenuOpen(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFolderMenuOpen(null);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [folderMenuOpen]);

  const directoryFor = (video: VideoFile) => {
    const path = getMediaDirectory(video.relativePath);
    return video.sourceId ? `${video.sourceId}/${video.relativePath.split('/')[0]}/${path.split('/').filter(Boolean).slice(1).join('/')}`.replace(/\/+$/, '') : path;
  };

  const folderNodes = useMemo(() => {
    const originalVideos = new Map(videos.map((video) => [video.id, video]));
    const result = buildMediaFolderTree(videos.map((video) => video.sourceId
      ? { ...video, relativePath: `${video.sourceId}/${video.relativePath}` }
      : video));
    const roots = new Map(savedDirectories.map((directory) => [directory.id, directory.name]));
    const visibleFolders = result.filter((folder) => !roots.has(folder.path));
    visibleFolders.forEach((folder) => {
      const [sourceId, rootName, ...nested] = folder.path.split('/');
      if (roots.has(sourceId) && rootName) {
        folder.name = nested.length ? nested[nested.length - 1] : roots.get(sourceId) ?? rootName;
        if (roots.has(folder.parentPath)) folder.parentPath = '';
      }
      folder.videos = folder.videos.map((video) => originalVideos.get(video.id) ?? video);
    });
    visibleFolders.sort((a, b) => sort === 'date'
      ? Math.max(...b.videos.map((video) => video.lastModified)) - Math.max(...a.videos.map((video) => video.lastModified))
      : a.name.localeCompare(b.name));
    return visibleFolders;
  }, [videos, savedDirectories, sort]);
  const folders = folderNodes.filter((folder) => folder.parentPath === (activeFolder ?? ''));

  const savePlaylists = (next: SavedPlaylist[]) => {
    setPlaylists(next);
    playerLibrary.savePlaylists(next);
  };

  const importFiles = async (picked: PickedFile[], inaccessible = 0, replace = false, replaceSourceId?: string) => {
    const generation = ++importGenerationRef.current;
    setIsImporting(true);
    const imports: VideoFile[] = [];
    let vaultFingerprints: Set<string>;
    try {
      vaultFingerprints = await getVaultFingerprints();
    } catch (error) {
      console.error('Could not inspect the encrypted private media index before importing.', error);
      setIsImporting(false);
      setNotice('Could not verify which files belong to the Privacy Vault. Import stopped to avoid exposing private media.');
      return;
    }
    let hiddenCount = 0;
    for (const { file, path, sourceId } of picked) {
      const kind = isMediaFile(file);
      if (!kind) continue;
      const identity = getVaultMediaIdentity(sourceId, path, file);
      let isHidden: boolean;
      if (!vaultFingerprints.size) {
        isHidden = false;
      } else {
        try {
          isHidden = vaultFingerprints.has(await fingerprintMediaId(identity));
        } catch (error) {
          console.error('Could not verify a media file against the Privacy Vault.', error);
          setIsImporting(false);
          setNotice('Could not verify this media file against the Privacy Vault. Import stopped to avoid exposing private media.');
          return;
        }
      }
      if (isHidden) {
        hiddenCount += 1;
        continue;
      }
      const url = URL.createObjectURL(file);
      imports.push({
        id: makeVideoId(sourceId ? `${sourceId}/${path}` : path, file), file, url, name: file.name,
        relativePath: path, lastModified: file.lastModified, kind, sourceId,
      });
    }
    const currentVideos = videosRef.current;
    const retained = currentVideos.filter((item) => !(replace && replaceSourceId && item.id.startsWith(`${replaceSourceId}/`))
      && !(replace && !replaceSourceId));
    const replaced = currentVideos.filter((item) => !retained.includes(item));
    const knownIds = new Set(retained.map((item) => item.id));
    const added = imports.filter((item) => !knownIds.has(item.id));
    const addedIds = new Set(added.map((item) => item.id));
    imports.filter((item) => !addedIds.has(item.id)).forEach((item) => URL.revokeObjectURL(item.url));
    objectUrls.current = [
      ...objectUrls.current.filter((url) => !replaced.some((item) => item.url === url)),
      ...added.map((item) => item.url),
    ];
    updateVideos(() => [...retained, ...added]);
    replaced.forEach((item) => URL.revokeObjectURL(item.url));
    const restoredFolder = getPlayerPreference('giplayer-last-opened-folder', '');
    if (restoredFolder && imports.some((video) => directoryFor(video) === restoredFolder || directoryFor(video).startsWith(`${restoredFolder}/`))) {
      setActiveFolder(restoredFolder);
    }
    const videoImports = imports.filter((item) => item.kind === 'video');
    const skipped = picked.filter(({ file }) => !isMediaFile(file)).length;
    setNotice(imports.length
      ? `${videoImports.length} videos and ${imports.length - videoImports.length} audio files found${skipped ? ` · ${skipped} unsupported files skipped` : ''}${hiddenCount ? ` · ${hiddenCount} encrypted private files hidden` : ''}${inaccessible ? ` · ${inaccessible} items could not be read` : ''}. Thumbnails are loading in the background.`
      : inaccessible
        ? `No media files could be read (${inaccessible} inaccessible items). Check folder permission and try again.`
        : hiddenCount ? `${hiddenCount} encrypted private files remain hidden. No public media was found.` : 'No supported video or audio files were found. Try selecting individual files or a different folder.');
    const thumbnailResults = new Map<string, Pick<VideoFile, 'thumbnail' | 'duration' | 'width' | 'height'>>();
    let nextIndex = 0;
    const workers = Array.from({ length: Math.min(4, videoImports.length) }, async () => {
      while (nextIndex < videoImports.length) {
        const index = nextIndex++;
        const item = videoImports[index];
        thumbnailResults.set(item.id, await createThumbnail(item.file));
      }
    });
    await Promise.all(workers);
    if (generation === importGenerationRef.current && thumbnailResults.size) {
      updateVideos((current) => current.map((item) => {
        const metadata = thumbnailResults.get(item.id);
        return metadata ? { ...item, ...metadata } : item;
      }));
    }
    if (generation === importGenerationRef.current) setIsImporting(false);
  };

  const scanDirectory = async (directory: SavedDirectory, replace = false) => {
    const scan = await readDirectory(directory.handle);
    const picked = scan.files.map((file) => ({ ...file, sourceId: directory.id }));
    await importFiles(picked, scan.inaccessible, replace && scan.inaccessible === 0, directory.id);
  };

  const importFolder = async () => {
    const directoryWindow = window as Window & {
      showDirectoryPicker?: () => Promise<RememberedDirectoryHandle>;
    };
    if (window.isSecureContext && directoryWindow.showDirectoryPicker) {
      try {
        const handle = await directoryWindow.showDirectoryPicker();
        setRememberedDirectoryName(handle.name);
        if (navigator.storage?.persist) await navigator.storage.persist().catch(() => false);
        const saved = await playerLibrary.saveDirectoryHandle(handle);
        if (saved) {
          setSavedDirectories((current) => [...current.filter((item) => item.id !== saved.id), saved]);
          const remainingPending = pendingDirectoryIds.filter((id) => id !== saved.id);
          setPendingDirectoryIds(remainingPending);
          setNeedsDirectoryPermission(remainingPending.length > 0);
          setNotice('');
          await scanDirectory(saved);
        } else {
          const scan = await readDirectory(handle);
          await importFiles(scan.files, scan.inaccessible);
          setNotice('Folder scanned. This browser could not save its access handle, so you may need to select it again later.');
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setNotice('Folder access was unavailable. Choose a folder with the browser file picker instead.');
        inputRef.current?.click();
      } finally {
        setIsImporting(false);
      }
    } else if (inputRef.current && 'webkitdirectory' in inputRef.current) {
      inputRef.current?.click();
    } else {
      fileInputRef.current?.click();
    }
  };

  const restoreRememberedFolder = async (directory: SavedDirectory) => {
    try {
      let permission = await directory.handle.queryPermission?.({ mode: 'read' });
      if (permission !== 'granted') permission = await directory.handle.requestPermission?.({ mode: 'read' });
      if (permission !== 'granted') {
        setNotice(`Chrome did not grant access to ${directory.name}. Select that folder again to restore access.`);
        return;
      }
      const remainingPermissions = pendingDirectoryIds.filter((id) => id !== directory.id);
      setPendingDirectoryIds(remainingPermissions);
      setNeedsDirectoryPermission(remainingPermissions.length > 0);
      setNotice('');
      await scanDirectory(directory, true);
    } catch (error) {
      console.error(`Could not scan the saved folder ${directory.name}.`, error);
      setNotice(`Could not read ${directory.name}. Check folder permission or select it again.`);
    }
  };

  const forgetDirectory = async (directory: SavedDirectory) => {
    if (!await playerLibrary.removeDirectoryHandle(directory.id)) {
      setNotice(`Could not forget ${directory.name}. The saved folder entry is still in browser storage.`);
      return;
    }
    const remaining = savedDirectories.filter((item) => item.id !== directory.id);
    const pending = pendingDirectoryIds.filter((id) => id !== directory.id);
    setSavedDirectories(remaining);
    setPendingDirectoryIds(pending);
    setNeedsDirectoryPermission(pending.length > 0);
    setRememberedDirectoryName((current) => current === directory.name ? remaining[0]?.name ?? '' : current);
    if (activeFolder?.startsWith(`${directory.id}/`)) {
      setActiveFolder(null);
      setPlayerPreference('giplayer-last-opened-folder', '');
    }
    updateVideos((current) => {
      const removed = current.filter((video) => video.sourceId === directory.id);
      removed.forEach((video) => URL.revokeObjectURL(video.url));
      objectUrls.current = objectUrls.current.filter((url) => !removed.some((video) => video.url === url));
      return current.filter((video) => video.sourceId !== directory.id);
    });
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      const directories = await playerLibrary.getDirectoryHandles();
      if (!active || !directories.length) {
        if (active) setIsCheckingLibrary(false);
        return;
      }
      setSavedDirectories(directories);
      setRememberedDirectoryName(directories[0].name);
      try {
        if (navigator.storage?.persist) await navigator.storage.persist().catch(() => false);
        const granted: SavedDirectory[] = [];
        const pending: string[] = [];
        for (const directory of directories) {
          if (await directory.handle.queryPermission?.({ mode: 'read' }) === 'granted') granted.push(directory);
          else pending.push(directory.id);
        }
        if (active) {
          setPendingDirectoryIds(pending);
          setNeedsDirectoryPermission(pending.length > 0);
          for (const directory of granted) {
            setIsImporting(true);
            await scanDirectory(directory);
            if (!active) return;
          }
        }
      } catch (error) {
        console.error('Could not automatically scan the remembered folder.', error);
        if (active) {
          setPendingDirectoryIds(directories.map((directory) => directory.id));
          setNeedsDirectoryPermission(true);
        }
      } finally {
        if (active) setIsImporting(false);
        if (active) setIsCheckingLibrary(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleFallbackImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const picked = files.map((file) => ({
      file,
      path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
    }));
    await importFiles(picked);
    event.target.value = '';
  };

  const matchingVideos = (items: VideoFile[]) => items
    .filter((video) => video.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
    .sort((a, b) => (sort === 'date' || quickView === 'recent') ? b.lastModified - a.lastModified
      : sort === 'size' ? b.file.size - a.file.size : a.name.localeCompare(b.name));
  const currentFolder = folderNodes.find((folder) => folder.path === activeFolder);
  const directFolderVideos = videos.filter((video) => video.kind === 'video' && directoryFor(video) === (activeFolder ?? ''));
  const listedVideos = quickView === 'music'
    ? videos.filter((video) => video.kind === 'audio')
    : quickView === 'favorites'
      ? videos.filter((video) => favorites.has(video.id))
      : quickView === 'recent'
        ? videos.filter((video) => video.kind === 'video').sort((a, b) => b.lastModified - a.lastModified)
        : quickView === 'continue'
            ? videos.filter((video) => {
              const position = Number(getPlayerPreference(`giplayer-playback:${video.id}`, '0'));
              return video.kind === 'video' && position > 5 && (!video.duration || position < video.duration - 5);
            })
          : activeFolder ? directFolderVideos : videos.filter((video) => directoryFor(video) === '');
  const listMode = !grid;
  const continueVideos = videos.filter((video) => {
    const position = Number(getPlayerPreference(`giplayer-playback:${video.id}`, '0'));
    return video.kind === 'video' && position > 5 && (!video.duration || position < video.duration - 5);
  }).sort((a, b) => Number(getPlayerPreference(`giplayer-playback:${b.id}`, '0')) - Number(getPlayerPreference(`giplayer-playback:${a.id}`, '0')));

  const shareVideo = async (video: VideoFile) => {
    try {
      if (navigator.canShare?.({ files: [video.file] }) && navigator.share) {
        await navigator.share({ title: video.name, files: [video.file] });
      } else {
        setNotice('This browser cannot share local files. The file stays on this device; no private path or link was copied.');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setNotice('The browser could not share this local file.');
    }
  };

  const toggleFavorite = (video: VideoFile) => {
    const updated = new Set(favorites);
    if (updated.has(video.id)) updated.delete(video.id);
    else updated.add(video.id);
    setFavorites(updated);
    playerLibrary.saveFavorites(Array.from(updated));
  };

  const playVideo = (video: VideoFile) => {
    const scope = activeFolder && currentFolder ? currentFolder.videos : listedVideos;
    onSelect(video, matchingVideos(scope), videos.filter((item) => item.kind === 'video'));
  };

  const hideVaultItems = async (ids: string[]) => {
    const requestedIds = new Set(ids);
    const toHide: VideoFile[] = [];
    for (const video of videos) {
      if (!requestedIds.has(video.id)) continue;
      toHide.push(video);
    }
    if (!toHide.length) return;
    const updatedPlaylists = playerLibrary.removeMediaReferences(toHide.map((video) => video.id));
    setPlaylists(updatedPlaylists);
    setFavorites(new Set(playerLibrary.getFavorites()));
    updateVideos((current) => current.filter((video) => !requestedIds.has(video.id)));
    toHide.forEach((video) => URL.revokeObjectURL(video.url));
    objectUrls.current = objectUrls.current.filter((url) => !toHide.some((video) => video.url === url));
    setNotice(`${toHide.length} encrypted file${toHide.length === 1 ? '' : 's'} hidden from the library.`);
  };

  const unhideVaultItem = async (media: DecryptedVaultMedia) => {
    const directory = savedDirectories.find((item) => item.id === media.sourceId);
    if (!directory) {
      setNotice('The encrypted copy was deleted. Re-select the original file or folder to add it back to the library.');
      return;
    }
    try {
      if (await directory.handle.queryPermission?.({ mode: 'read' }) !== 'granted') {
        setNotice('The encrypted copy was deleted. Restore the source folder permission to show its files again.');
        return;
      }
      await scanDirectory(directory, true);
      setNotice('The encrypted copy was deleted. Source files are visible again in the scanned folder.');
    } catch (error) {
      console.error(`Could not restore ${media.name} to the public library.`, error);
      setNotice(`The encrypted copy was deleted. Could not scan ${directory.name}; restore its access or choose the folder again.`);
    }
  };

  const playVaultItem = (media: DecryptedVaultMedia, file: File) => {
    const url = URL.createObjectURL(file);
    objectUrls.current.push(url);
    const video: VideoFile = {
      id: media.id,
      file,
      url,
      name: media.name,
      relativePath: media.sourcePath,
      lastModified: media.lastModified,
      kind: isMediaFile(file) ?? 'video',
      privateVault: true,
    };
    onSelect(video, [video], videos.filter((item) => item.kind === 'video'));
  };

  const handleProfileAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const image = new Image();
    const source = URL.createObjectURL(file);
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 320 / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(source);
        setNotice('Could not process that profile picture in this browser.');
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const avatar = canvas.toDataURL('image/jpeg', 0.8);
      setProfileDraft((current) => ({ ...current, avatar }));
      URL.revokeObjectURL(source);
    };
    image.onerror = () => {
      URL.revokeObjectURL(source);
      setNotice('Could not load that profile picture. Choose a valid image.');
    };
    image.src = source;
    event.target.value = '';
  };

  const saveProfile = () => {
    const saved = { ...profileDraft, displayName: profileDraft.displayName.trim(), email: profileDraft.email.trim() };
    if (!playerLibrary.saveProfile(saved)) {
      setNotice('Could not save your local profile. Check browser storage availability.');
      return;
    }
    setProfile(saved);
    setProfileDraft(saved);
    setNotice('Local profile saved on this device. No account or cloud sign-in was created.');
  };

  const addFolderToPlaylist = (folder: FolderEntry) => {
    const name = window.prompt(`Add ${folder.name} to which playlist?`, playlists[0]?.name ?? '');
    if (!name?.trim()) return;
    const existing = playlists.find((playlist) => playlist.name.toLowerCase() === name.trim().toLowerCase());
    if (existing) {
      savePlaylists(playlists.map((playlist) => playlist.id === existing.id
        ? { ...playlist, videoIds: Array.from(new Set([...playlist.videoIds, ...folder.videos.map((video) => video.id)])), updatedAt: Date.now() }
        : playlist));
    } else {
      savePlaylists([...playlists, {
        id: crypto.randomUUID(), name: name.trim(), videoIds: folder.videos.map((video) => video.id), updatedAt: Date.now(),
      }]);
    }
    setNotice(`Added ${folder.videos.length} video${folder.videos.length === 1 ? '' : 's'} to ${name.trim()}.`);
  };

  const createPlaylist = () => {
    const name = playlistName.trim();
    if (!name) return;
    if (playlists.some((playlist) => playlist.name.toLowerCase() === name.toLowerCase())) {
      setNotice('A playlist with that name already exists.');
      return;
    }
    const created = { id: crypto.randomUUID(), name, videoIds: [], updatedAt: Date.now() };
    savePlaylists([...playlists, created]);
    setPlaylistName('');
    setPlaylistSelection(created);
  };

  const togglePlaylistVideo = (playlist: SavedPlaylist, video: VideoFile) => {
    const videoIds = playlist.videoIds.includes(video.id)
      ? playlist.videoIds.filter((id) => id !== video.id)
      : [...playlist.videoIds, video.id];
    savePlaylists(playlists.map((item) => item.id === playlist.id ? { ...item, videoIds, updatedAt: Date.now() } : item));
    setPlaylistSelection({ ...playlist, videoIds });
  };

  const openFolder = (folder: FolderEntry) => {
    setActiveFolder(folder.path);
    setQuickView(null);
    setPlayerPreference('giplayer-last-opened-folder', folder.path);
  };
  const goBack = () => {
    if (quickView) {
      setQuickView(null);
      setRequestedVaultVideos([]);
      setPlaylistSelection(null);
      return;
    }
    if (activeFolder) {
      const parent = activeFolder.split('/').slice(0, -1).join('/');
      setActiveFolder(parent || null);
      return;
    }
  };

  const navigateTo = (view: PlaylistView) => {
    setActiveFolder(null);
    setQuickView(view);
    setPlaylistSelection(null);
    if (view === 'privacy') setRequestedVaultVideos([]);
    if (view === 'profile') setProfileDraft(profile);
  };
  const navigationItems: { label: string; icon: typeof Video; view: PlaylistView }[] = [
    { label: 'All videos', icon: Video, view: null },
    { label: 'Music', icon: Music2, view: 'music' },
    { label: 'Privacy Vault', icon: LockKeyhole, view: 'privacy' },
    { label: 'Playlists', icon: List, view: 'playlists' },
    { label: 'Recent', icon: RefreshCw, view: 'recent' },
    { label: 'Favorites', icon: Heart, view: 'favorites' },
  ];
  const isNavigationActive = (view: PlaylistView) => view === null ? quickView === null : quickView === view;

  const header = (
    <header className="app-main-header sticky top-0 z-20 border-b px-4 py-2.5 sm:px-7">
      <div ref={libraryMenuRef} className="relative mx-auto flex max-w-6xl items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {(activeFolder || quickView) && (
            <button onClick={goBack} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-300 hover:bg-white/10" aria-label="Back"><ArrowLeft className="h-5 w-5" /></button>
          )}
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-300 text-slate-950"><Play className="h-[18px] w-[18px] fill-current" /></span>
          <span className="min-w-0">
            <span className="block text-base font-extrabold leading-5 tracking-[-.02em] text-white">GIPlayer</span>
            <h1 className="truncate text-xs font-medium leading-4 text-slate-400">{playlistSelection?.name ?? currentFolder?.name ?? (quickView ? ({
              music: 'Music', playlists: 'Video Playlists', share: 'GIPlayer Share', privacy: 'Privacy Vault',
              stream: 'Network Stream', folders: 'Folder access', profile: 'Local profile',
              favorites: 'Favorites', recent: 'Recently Added', continue: 'Continue Watching', settings: 'Player Settings',
            } as Record<NonNullable<PlaylistView>, string>)[quickView] : 'Folders')}</h1>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={() => { setSearchOpen((value) => !value); setSearch(''); }} className="app-nav-item hidden h-10 w-10 items-center justify-center rounded-full text-slate-300 hover:bg-white/5 hover:text-white min-[360px]:flex" aria-label="Search"><Search className="h-5 w-5" /></button>
          <button onClick={() => setLibraryMenuOpen((value) => !value)} className={`app-nav-item flex h-10 w-10 items-center justify-center rounded-full text-slate-300 hover:bg-white/5 hover:text-white ${libraryMenuOpen ? 'bg-white/[.07] text-white' : ''}`} aria-label="Library menu" aria-expanded={libraryMenuOpen} aria-controls="library-actions-menu"><MoreHorizontal className="h-6 w-6" /></button>
          <button onClick={() => navigateTo('profile')} className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/5 text-slate-300 ring-1 ring-white/10 hover:ring-sky-300/50" aria-label="Open local profile" title={profile.displayName || 'Local profile'}>{profile.avatar ? <img src={profile.avatar} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-5 w-5" />}</button>
        </div>
        {libraryMenuOpen && <div id="library-actions-menu" role="menu" aria-label="Library actions" className="app-surface-raised absolute right-0 top-full z-40 mt-2 max-h-[min(70dvh,28rem)] w-64 overflow-y-auto rounded-xl border p-1.5 shadow-2xl shadow-black/50">
          {[
            { label: 'Search library', icon: Search, action: () => { setSearchOpen(true); setSearch(''); } },
            { label: 'Choose media folder', icon: FolderOpen, action: () => { void importFolder(); } },
            ...(savedDirectories.length ? [{ label: 'Manage saved folders', icon: Folder, action: () => navigateTo('folders') }] : []),
            ...(savedDirectories.length ? [{ label: 'Rescan saved folders', icon: RefreshCw, action: () => {
              for (const directory of savedDirectories) void scanDirectory(directory, true).catch((error) => {
                console.error(`Could not rescan ${directory.name}.`, error);
                setNotice(`Could not rescan ${directory.name}. Restore its access first.`);
              });
            } }] : []),
            { label: grid ? 'Switch to list view' : 'Switch to grid view', icon: grid ? List : Grid2X2, action: () => setGrid((value) => !value) },
            { label: 'Continue watching', icon: Clock3, action: () => navigateTo('continue') },
            { label: 'GIPlayer Share', icon: Share2, action: () => navigateTo('share') },
            { label: 'Network stream', icon: Globe2, action: () => navigateTo('stream') },
            { label: 'Settings', icon: Settings2, action: () => navigateTo('settings') },
          ].map(({ label, icon: Icon, action }) => <button key={label} role="menuitem" onClick={() => { action(); setLibraryMenuOpen(false); }} className={`app-nav-item flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-slate-200 hover:bg-white/[.07] ${label === 'Search library' ? 'min-[360px]:hidden' : ''}`}><Icon className="h-[18px] w-[18px] text-slate-400" />{label}</button>)}
        </div>}
      </div>
      {searchOpen && (
        <div className="mx-auto mt-3 max-w-6xl">
          <input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') { setSearch(''); setSearchOpen(false); } }} placeholder="Search videos and folders" className="w-full rounded-xl border border-white/10 bg-[#12171b] px-4 py-2.5 text-white outline-none focus:border-sky-400" />
        </div>
      )}
      <input ref={inputRef} type="file" multiple accept="video/*,audio/*,.mkv,.avi,.wmv,.flv,.m2ts,.mts,.vob,.mpg,.mpeg" onChange={(event) => void handleFallbackImport(event)} className="hidden" {...{ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>} />
      <input ref={fileInputRef} type="file" multiple accept="video/*,audio/*,.mkv,.avi,.wmv,.flv,.m2ts,.mts,.vob,.mpg,.mpeg" onChange={(event) => void handleFallbackImport(event)} className="hidden" />
    </header>
  );

  const videoCard = (video: VideoFile) => {
    const savedPosition = video.privateVault ? 0 : Number(getPlayerPreference(`giplayer-playback:${video.id}`, '0'));
    const progress = video.duration && savedPosition > 0 ? Math.min(100, savedPosition / video.duration * 100) : 0;
    return <article key={video.id} className={`group relative min-w-0 ${listMode ? 'flex items-center gap-3 rounded-xl border border-white/[.06] bg-[#141a1e] p-2.5 transition-colors hover:border-white/[.14] hover:bg-[#181f23] sm:gap-4 sm:p-3' : ''}`}>
      <button onClick={() => playVideo(video)} className={`relative block overflow-hidden text-left ${listMode ? 'h-20 w-32 shrink-0 rounded-xl' : 'aspect-video w-full'}`} aria-label={`Play ${video.name}`}>
        {video.thumbnail ? <img src={video.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]" /> : <div className="flex h-full w-full items-center justify-center bg-[#20282d]">{video.kind === 'audio' ? <Music2 className="h-8 w-8 text-slate-500" /> : <Video className="h-8 w-8 text-slate-500" />}</div>}
        <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">{formatDuration(video.duration ?? Number.NaN)}</span>
        {progress > 0 && <span className="absolute inset-x-0 bottom-0 h-1 bg-white/25"><span className="block h-full bg-sky-300" style={{ width: `${progress}%` }} /></span>}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/15"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-950 opacity-0 shadow-lg transition group-hover:opacity-100"><Play className="ml-0.5 h-4 w-4 fill-current" /></span></span>
      </button>
      <div className={`min-w-0 flex-1 ${listMode ? 'py-1 pr-1' : 'pt-2'}`}>
        <button onClick={() => playVideo(video)} className="block w-full truncate text-left text-[13px] font-semibold leading-5 text-slate-100 sm:text-sm">{video.name}</button>
        <p className="mt-1 truncate text-xs text-slate-400">{formatBytes(video.file.size)}{video.width && video.height ? ` · ${video.width}×${video.height}` : ''} · {new Date(video.lastModified).toLocaleDateString()}</p>
      </div>
      {video.kind === 'video' && <button onClick={() => toggleFavorite(video)} className={`app-nav-item rounded-full p-2 hover:bg-white/10 ${favorites.has(video.id) ? 'text-rose-300' : 'text-slate-400'} ${listMode ? '' : 'absolute right-2 top-2 bg-black/55 backdrop-blur-sm'}`} aria-label={`${favorites.has(video.id) ? 'Remove' : 'Add'} ${video.name} ${favorites.has(video.id) ? 'from' : 'to'} favorites`}><Heart className={`h-4 w-4 ${favorites.has(video.id) ? 'fill-current' : ''}`} /></button>}
      {listMode && <button onClick={() => void shareVideo(video)} className="app-nav-item rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-sky-300" aria-label={`Share ${video.name}`}><Share2 className="h-4 w-4" /></button>}
    </article>;
  };

  const folderCard = (folder: FolderEntry) => (
    <article key={folder.path} className="group relative flex min-w-0 items-center gap-3 border-b border-white/[.07] py-3 transition-colors hover:bg-white/[.02] sm:gap-4">
      <button onClick={() => openFolder(folder)} className="flex min-w-0 flex-1 items-center gap-4 text-left">
        <div className="relative flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#1a2126] sm:h-14 sm:w-[4.5rem]">
          {folder.videos[0]?.thumbnail ? <img src={folder.videos[0].thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Folder className="h-6 w-6 fill-slate-400/15 text-slate-400" />}
          {folder.videos.some((video) => Date.now() - video.lastModified < 86400000) && <span className="absolute right-1 top-1 rounded bg-sky-300 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-950">New</span>}
        </div>
        <span className="min-w-0 flex-1">
          <strong className="block truncate text-sm font-semibold">{folder.name}</strong>
          <span className="mt-1 block truncate text-xs text-slate-400">{folder.videos.length} video{folder.videos.length === 1 ? '' : 's'} <span className="px-1 text-slate-600">·</span> Updated {new Date(Math.max(...folder.videos.map((video) => video.lastModified))).toLocaleDateString()}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-slate-200" />
      </button>
      <button data-folder-action-trigger onClick={() => setFolderMenuOpen((path) => path === folder.path ? null : folder.path)} className="app-nav-item flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-white/5 hover:text-white" title="Folder actions" aria-label={`Actions for ${folder.name}`} aria-expanded={folderMenuOpen === folder.path}><MoreHorizontal className="h-5 w-5" /></button>
      {folderMenuOpen === folder.path && <div ref={folderMenuRef} role="menu" className="app-surface-raised absolute right-0 top-full z-20 w-52 rounded-xl border p-1.5 shadow-xl shadow-black/40">
        <button role="menuitem" onClick={() => { setRequestedVaultVideos(folder.videos); setQuickView('privacy'); setFolderMenuOpen(null); }} className="app-nav-item flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-slate-200 hover:bg-white/[.07]"><LockKeyhole className="h-4 w-4 text-slate-400" />Encrypt in Privacy Vault</button>
        <button role="menuitem" onClick={() => { addFolderToPlaylist(folder); setFolderMenuOpen(null); }} className="app-nav-item flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-slate-200 hover:bg-white/[.07]"><Plus className="h-4 w-4 text-slate-400" />Add to playlist</button>
      </div>}
    </article>
  );

  const mainContent = () => {
    if (quickView === 'folders') return (
      <section className="mx-auto mt-8 max-w-3xl space-y-3">
        <div className="app-surface rounded-xl border p-4">
          <h2 className="text-lg font-bold">Saved folders</h2>
          <p className="mt-1 text-sm text-slate-400">GIPlayer scans saved folders automatically when Chrome keeps access. Restore only asks for access to a folder that needs it.</p>
        </div>
        {savedDirectories.map((directory) => {
          const needsAccess = pendingDirectoryIds.includes(directory.id);
          return <article key={directory.id} className="app-surface flex items-center gap-3 rounded-xl border p-3.5">
            <FolderOpen className={`h-6 w-6 shrink-0 ${needsAccess ? 'text-amber-300' : 'text-sky-300'}`} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{directory.name}</p>
              <p className="text-xs text-slate-400">{needsAccess ? 'Access needs restoring' : 'Saved for automatic scanning'}</p>
            </div>
            <button onClick={() => void restoreRememberedFolder(directory)} disabled={isImporting} className="rounded-xl bg-sky-500/15 px-3 py-2 text-sm font-semibold text-sky-200 disabled:opacity-50">{needsAccess ? 'Restore' : 'Rescan'}</button>
            <button onClick={() => void forgetDirectory(directory)} aria-label={`Forget ${directory.name}`} className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-rose-300"><X className="h-4 w-4" /></button>
          </article>;
        })}
        <button onClick={() => void importFolder()} className="w-full rounded-xl border border-dashed border-white/15 py-3 text-sm font-semibold text-slate-200 hover:border-sky-300/50">+ Add another folder</button>
      </section>
    );
    if (quickView === 'privacy') return <PrivacyVault
      videos={videos.filter((video) => video.kind === 'video')}
      requestedVideos={requestedVaultVideos}
      onHideMedia={hideVaultItems}
      onUnhideMedia={(media) => void unhideVaultItem(media)}
      onVaultRequestComplete={() => setRequestedVaultVideos([])}
      onLock={onVaultLock}
      onPlay={playVaultItem}
    />;
    if (quickView === 'share') return <section className="app-surface mx-auto mt-6 max-w-2xl rounded-2xl border p-5 sm:p-6"><Share2 className="mb-4 h-5 w-5 text-sky-200" /><h2 className="text-base font-semibold">GIPlayer Share</h2><p className="mt-2 text-sm leading-6 text-slate-400">Use your device share sheet for a selected file. If the browser cannot share local files, GIPlayer explains the limitation without exposing private paths.</p>{videos.length ? <div className="mt-5 grid gap-2">{videos.map((video) => <div key={video.id} className="flex items-center justify-between rounded-xl bg-white/[.035] p-3"><span className="truncate pr-3 text-sm">{video.name}</span><button onClick={() => void shareVideo(video)} className="app-nav-item rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-sky-200" aria-label={`Share ${video.name}`}><Share2 className="h-4 w-4" /></button></div>)}</div> : <p className="mt-5 text-sm text-slate-500">Choose a folder first to browse your files.</p>}</section>;
    if (quickView === 'stream') return <section className="app-surface mx-auto mt-6 max-w-2xl rounded-2xl border p-5 sm:p-6"><Globe2 className="mb-4 h-5 w-5 text-sky-200" /><h2 className="mb-4 text-base font-semibold">Play a network stream</h2><NetworkStreamDialog onPlay={onOpenStream} /></section>;
    if (quickView === 'profile') return (
      <section className="app-surface mx-auto mt-6 max-w-2xl rounded-2xl border p-5 sm:p-7">
        <div className="mb-6 flex items-center gap-4">{profileDraft.avatar ? <img src={profileDraft.avatar} alt="Local profile" className="h-16 w-16 rounded-full object-cover" /> : <span className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-400/10"><UserRound className="h-8 w-8 text-sky-300" /></span>}<div><h2 className="text-lg font-bold">{profile.displayName || 'Local profile'}</h2><p className="text-sm text-slate-400">Stored on this device only</p></div></div>
        <form onSubmit={(event) => { event.preventDefault(); saveProfile(); }} className="space-y-4">
          <label className="block text-sm">Display name<input value={profileDraft.displayName} onChange={(event) => setProfileDraft((current) => ({ ...current, displayName: event.target.value }))} maxLength={60} className="mt-2 w-full rounded-xl bg-black/20 px-4 py-3" placeholder="Your name" /></label>
          <label className="block text-sm">Email (optional)<input type="email" value={profileDraft.email} onChange={(event) => setProfileDraft((current) => ({ ...current, email: event.target.value }))} maxLength={120} className="mt-2 w-full rounded-xl bg-black/20 px-4 py-3" placeholder="name@example.com" /></label>
          <label className="block text-sm">Profile picture<input type="file" accept="image/*" onChange={handleProfileAvatar} className="mt-2 block w-full text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white" /></label>
          {profileDraft.avatar && <button type="button" onClick={() => setProfileDraft((current) => ({ ...current, avatar: '' }))} className="text-sm text-rose-300">Remove picture</button>}
          <div className="rounded-xl bg-black/15 p-4 text-sm leading-6 text-slate-400">This is a local profile for organizing your player experience, not an online account. No login, identity verification, or cloud sync is provided.</div>
          <button className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950">Save local profile</button>
        </form>
      </section>
    );
    if (quickView === 'settings') return <section className="mx-auto mt-6 grid max-w-5xl gap-4 md:grid-cols-2">
      <article className="app-surface rounded-2xl border p-5">
        <div className="mb-4 flex items-center gap-3"><span className="rounded-lg bg-white/[.06] p-2"><UserRound className="h-4 w-4 text-slate-300" /></span><div><h2 className="text-sm font-semibold">Account</h2><p className="text-xs text-slate-500">Your profile and sign-in state</p></div></div>
        <div className="flex items-center gap-3 rounded-xl bg-white/[.035] p-3"><span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white/5">{profile.avatar ? <img src={profile.avatar} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-5 w-5 text-slate-400" />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{profile.displayName || 'Local profile'}</p><p className="truncate text-xs text-slate-500">{profile.email || 'This device only'}</p></div><span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] text-emerald-200">Local</span></div>
        <p className="mt-3 text-xs leading-5 text-slate-500">No online account is connected. Your local profile does not sign in or sync between devices.</p><button onClick={() => navigateTo('profile')} className="app-nav-item mt-3 rounded-lg bg-white/[.06] px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10">Edit profile</button>
      </article>
      <article className="app-surface rounded-2xl border p-5">
        <div className="mb-4 flex items-center gap-3"><span className="rounded-lg bg-white/[.06] p-2"><Play className="h-4 w-4 text-slate-300" /></span><div><h2 className="text-sm font-semibold">Playback</h2><p className="text-xs text-slate-500">Player behavior on this browser</p></div></div>
        <label className="flex items-center justify-between border-b border-white/[.06] py-3 text-sm"><span><span className="block font-medium">Video display</span><span className="mt-0.5 block text-xs text-slate-500">Show video picture during playback</span></span><input type="checkbox" checked={displayEnabled} onChange={(event) => { setDisplayEnabled(event.target.checked); setPlayerPreference('giplayer-video-display', String(event.target.checked)); }} className="h-4 w-4 accent-sky-400" /></label>
        <label className="flex items-center justify-between py-3 text-sm"><span><span className="block font-medium">Keyboard shortcuts</span><span className="mt-0.5 block text-xs text-slate-500">Enable player keyboard controls</span></span><input type="checkbox" checked={shortcutsEnabled} onChange={(event) => { setShortcutsEnabled(event.target.checked); setPlayerPreference('giplayer-shortcuts', String(event.target.checked)); }} className="h-4 w-4 accent-sky-400" /></label>
      </article>
      <article className="app-surface rounded-2xl border p-5">
        <div className="mb-4 flex items-center gap-3"><span className="rounded-lg bg-white/[.06] p-2"><FolderOpen className="h-4 w-4 text-slate-300" /></span><div><h2 className="text-sm font-semibold">Library & storage</h2><p className="text-xs text-slate-500">Selected media remains under your control</p></div></div>
        <div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-white/[.035] p-3"><p className="text-lg font-semibold tabular-nums">{videos.filter((video) => video.kind === 'video').length}</p><p className="text-xs text-slate-500">Videos in memory</p></div><div className="rounded-xl bg-white/[.035] p-3"><p className="text-lg font-semibold tabular-nums">{savedDirectories.length}</p><p className="text-xs text-slate-500">Saved folders</p></div></div>
        <p className="mt-3 text-xs leading-5 text-slate-500">Browser-granted access only. Storage and folder permission can be cleared or revoked by the browser.</p><button onClick={() => navigateTo('folders')} className="app-nav-item mt-3 rounded-lg bg-white/[.06] px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10">Manage folders</button>
      </article>
      <article className="app-surface rounded-2xl border p-5">
        <div className="mb-4 flex items-center gap-3"><span className="rounded-lg bg-white/[.06] p-2"><Shield className="h-4 w-4 text-slate-300" /></span><div><h2 className="text-sm font-semibold">Privacy & appearance</h2><p className="text-xs text-slate-500">On-device protection and display</p></div></div>
        <div className="flex items-center justify-between rounded-xl bg-white/[.035] p-3"><span><span className="block text-sm font-medium">Appearance</span><span className="text-xs text-slate-500">Dark · optimized for media playback</span></span><span className="rounded-full bg-white/[.06] px-2.5 py-1 text-xs text-slate-300">Dark</span></div>
        <button onClick={() => navigateTo('privacy')} className="app-nav-item mt-3 flex w-full items-center justify-between rounded-xl bg-white/[.035] p-3 text-left hover:bg-white/[.06]"><span><span className="block text-sm font-medium">Privacy Vault</span><span className="text-xs text-slate-500">Encrypted local copies</span></span><ChevronRight className="h-4 w-4 text-slate-500" /></button>
      </article>
      <article className="app-surface rounded-2xl border p-5 md:col-span-2">
        <div className="flex items-start gap-3"><span className="rounded-lg bg-white/[.06] p-2"><AudioLines className="h-4 w-4 text-slate-300" /></span><div><h2 className="text-sm font-semibold">About GIPlayer</h2><p className="mt-1 text-xs leading-5 text-slate-500">A local-first video player built for your browser. Your media stays on your device unless you explicitly share it. Supported folder access depends on browser permissions; this PWA cannot scan device storage without your selection.</p><p className="mt-2 text-xs text-slate-500">GIPlayer · Version 1.0 · Progressive Web App</p></div></div>
      </article>
    </section>;
    if (quickView === 'playlists') return (
      <section className="mx-auto mt-6 max-w-4xl">
        <form onSubmit={(event) => { event.preventDefault(); createPlaylist(); }} className="mb-5 flex gap-2"><input value={playlistName} onChange={(event) => setPlaylistName(event.target.value)} placeholder="New playlist name" className="min-w-0 flex-1 rounded-xl border border-white/[.08] bg-[#141a1e] px-4 py-3 outline-none focus:border-sky-300/50" /><button className="rounded-lg bg-sky-300 px-4 font-semibold text-slate-950"><Plus className="inline h-4 w-4" /> Create</button></form>
        <div className="space-y-2.5">{playlists.map((playlist) => <div key={playlist.id} className="app-surface rounded-xl border p-3.5">
          <div className="flex items-center gap-2"><button onClick={() => setPlaylistSelection(playlistSelection?.id === playlist.id ? null : playlist)} className="min-w-0 flex-1 text-left"><strong className="block truncate">{playlist.name}</strong><span className="text-xs text-slate-400">{playlist.videoIds.length} saved videos</span></button><button onClick={() => { const name = window.prompt('Rename playlist', playlist.name)?.trim(); if (name && playlists.some((item) => item.id !== playlist.id && item.name.toLowerCase() === name.toLowerCase())) setNotice('A playlist with that name already exists.'); else if (name) savePlaylists(playlists.map((item) => item.id === playlist.id ? { ...item, name } : item)); }} className="rounded-lg p-2 text-slate-400 hover:bg-white/10" aria-label={`Rename ${playlist.name}`}>Rename</button><button onClick={() => { if (window.confirm(`Delete “${playlist.name}”?`)) { savePlaylists(playlists.filter((item) => item.id !== playlist.id)); if (playlistSelection?.id === playlist.id) setPlaylistSelection(null); } }} className="rounded-lg p-2 text-rose-300 hover:bg-white/10" aria-label={`Delete ${playlist.name}`}><Trash2 className="h-4 w-4" /></button>
            <button onClick={() => { const queue = playlist.videoIds.map((id) => videos.find((video) => video.id === id)).filter((video): video is VideoFile => Boolean(video)); if (queue.length) onSelect(queue[0], queue, videos.filter((video) => video.kind === 'video')); else setNotice('Re-select the source folder to play files in this playlist.'); }} className="rounded-full bg-sky-500 p-2.5 text-slate-950" aria-label={`Play ${playlist.name}`}><Play className="h-4 w-4 fill-current" /></button>
          </div>
          {playlistSelection?.id === playlist.id && <div className="mt-4 border-t border-white/5 pt-4"><p className="mb-2 text-xs text-slate-400">Add or remove videos currently selected in this tab</p>{videos.filter((video) => video.kind === 'video').map((video) => <button key={video.id} onClick={() => togglePlaylistVideo(playlist, video)} className="flex w-full items-center gap-3 border-b border-white/5 py-2 text-left"><span className="min-w-0 flex-1 truncate text-sm">{video.name}</span>{playlist.videoIds.includes(video.id) ? <Check className="h-4 w-4 text-sky-300" /> : <Plus className="h-4 w-4 text-slate-400" />}</button>)}</div>}
        </div>)}</div>
      </section>
    );

    if (['music', 'favorites', 'recent', 'continue'].includes(quickView ?? '')) {
      const items = matchingVideos(listedVideos);
      return <section className="mx-auto mt-5 max-w-6xl"><div className="mb-4 flex items-center justify-between"><p className="text-xs text-slate-500">{items.length} {quickView === 'music' ? 'audio tracks' : 'videos'}</p><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} aria-label="Sort media" className="rounded-lg border border-white/[.07] bg-[#141a1e] px-3 py-2 text-xs text-slate-300"><option value="name">Name</option><option value="date">Recently added</option><option value="size">File size</option></select></div><div className={grid ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4' : 'space-y-2'}>{items.map(videoCard)}</div>{items.length === 0 && <p className="app-surface rounded-xl border p-8 text-center text-sm text-slate-500">Nothing here yet.</p>}<button onClick={() => items[0] && onSelect(items[0], items, videos.filter((video) => video.kind === 'video'))} disabled={!items.length} className="fixed bottom-20 right-5 z-10 rounded-full bg-sky-300 p-4 text-slate-950 shadow-lg shadow-black/30 transition hover:bg-sky-200 disabled:opacity-40 lg:bottom-7 lg:p-3.5" aria-label="Play all"><Play className="h-5 w-5 fill-current" /></button></section>;
    }

    const filteredFolders = folders.filter((folder) => `${folder.name} ${folder.path}`.toLowerCase().includes(search.trim().toLowerCase()));
    const rootVideoMatches = matchingVideos(videos.filter((video) =>
      video.kind === 'video' && (!search.trim() || video.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()))));
    const directoriesNeedingAccess = savedDirectories.filter((directory) => pendingDirectoryIds.includes(directory.id));
    const recoveryDirectories = directoriesNeedingAccess.length
      ? directoriesNeedingAccess
      : needsDirectoryPermission ? savedDirectories : [];
    const permissionRecovery = needsDirectoryPermission && !isCheckingLibrary && (
      <section aria-labelledby="restore-access-heading" className="mt-4 border-y border-amber-300/15 py-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-300/10 text-amber-200"><FolderOpen className="h-[18px] w-[18px]" /></span>
          <div className="min-w-0 flex-1">
            <h2 id="restore-access-heading" className="text-sm font-semibold text-white">Folder access needs restoring</h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">Chrome needs approval again for these saved folders. Your other media remains available.</p>
          </div>
        </div>
        <div className="mt-3 divide-y divide-white/[.06]">
          {recoveryDirectories.map((directory) => <div key={directory.id} className="flex min-h-12 items-center gap-3 py-2">
            <Folder className="h-4 w-4 shrink-0 text-amber-200/80" />
            <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{directory.name}</span>
            <button onClick={() => void restoreRememberedFolder(directory)} disabled={isImporting} className="min-h-10 shrink-0 rounded-lg bg-amber-200 px-3 text-xs font-semibold text-slate-950 hover:bg-amber-100 disabled:opacity-50">Restore access</button>
          </div>)}
          {!recoveryDirectories.length && <p className="py-2 text-sm text-slate-400">Choose the folder again to restore its saved access.</p>}
        </div>
        {notice && <div role="status" className="mt-2 flex items-start gap-2 rounded-lg bg-white/[.04] px-3 py-2 text-xs leading-5 text-slate-300"><span className="min-w-0 flex-1">{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss message" className="rounded p-1 text-slate-400 hover:bg-white/10"><X className="h-4 w-4" /></button></div>}
        <button onClick={() => fileInputRef.current?.click()} className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs font-medium text-slate-300 hover:bg-white/[.05]"><Video className="h-4 w-4" />Select media instead</button>
      </section>
    );
    const emptyLibrary = (
      <div className="mx-auto mt-4 max-w-2xl px-1 py-4 sm:py-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-300/10 text-sky-200"><FolderOpen className="h-5 w-5" /></span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{isCheckingLibrary ? 'Checking saved folders' : isImporting ? 'Scanning your media' : 'Start with a folder'}</h2>
            <p className="mt-1 max-w-prose text-sm leading-6 text-slate-400">
              {isCheckingLibrary
                ? 'Checking whether your previous folder selection is still available.'
                : isImporting
                  ? 'GIPlayer is organizing the videos and music you selected.'
                  : supportsDirectoryAccess
                    ? 'Choose a folder to organize its videos and music. Chrome will ask which folder GIPlayer can access.'
                    : 'Choose a folder or select files. Browsers do not grant background access to the rest of your device.'}
            </p>
          </div>
        </div>
        {!isCheckingLibrary && !isImporting && <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => void importFolder()} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-sky-300 px-4 text-sm font-semibold text-slate-950 hover:bg-sky-200"><FolderOpen className="h-4 w-4" />Choose folder</button>
          <button onClick={() => fileInputRef.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/10 px-4 text-sm font-medium text-slate-200 hover:bg-white/[.05]"><Video className="h-4 w-4" />Select media</button>
        </div>}
      </div>
    );
    const visibleDirectVideos = activeFolder
      ? matchingVideos(directFolderVideos)
      : search.trim()
        ? rootVideoMatches
        : matchingVideos(directFolderVideos);
    const sectionTitle = search.trim()
      ? 'Matching videos'
      : activeFolder
        ? 'Videos in this folder'
        : rememberedDirectoryName
          ? `Videos in ${rememberedDirectoryName}`
          : 'Selected videos';
    const renderVideoGrid = (items: VideoFile[]) => (
      <div className={grid ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4' : 'space-y-2'}>
        {items.map(videoCard)}
      </div>
    );
    const renderFolderContents = (items: VideoFile[]) => (
      <>
        {filteredFolders.length > 0 && (
          <section className="mt-7">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Folders</h2>
            <div className="divide-y divide-white/[.07]">{filteredFolders.map(folderCard)}</div>
          </section>
        )}
        {items.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">{sectionTitle} · {items.length}</h2>
            {renderVideoGrid(items)}
          </section>
        )}
        {!filteredFolders.length && !items.length && (videos.length ? (
          <p className="app-surface mt-8 rounded-xl border p-8 text-center text-sm text-slate-400">
            {search.trim() ? 'No matching folders or videos.' : 'This folder has no media or subfolders.'}
          </p>
        ) : emptyLibrary)}
      </>
    );
    return (
      <section className="mx-auto mt-5 max-w-6xl">
        {(videos.length > 0 || folders.length > 0 || activeFolder || search.trim()) && <div className="app-surface mt-5 flex flex-col gap-3 rounded-xl border p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">{activeFolder?.split('/').filter(Boolean).join(' / ') || rememberedDirectoryName || 'All selected media'}</p>
            <p className="mt-1 text-xs text-slate-400">{videos.filter((video) => video.kind === 'video').length} videos <span className="px-1 text-slate-600">·</span> {folders.length} folders</p>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-500">Sort by<select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="rounded-lg border border-white/[.08] bg-[#141a1e] px-3 py-2 text-sm text-white">
            <option value="name">Name</option><option value="date">Recently added</option><option value="size">File size</option>
          </select></label>
        </div>}
        {permissionRecovery}
        {quickView === null && !activeFolder && continueVideos.length > 0 && <section className="mt-6">
          <div className="mb-3 flex items-baseline justify-between"><h2 className="text-sm font-semibold text-white">Continue watching</h2><button onClick={() => navigateTo('continue')} className="min-h-10 px-2 text-xs font-medium text-sky-200 hover:text-white">See all</button></div>
          <div className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">{continueVideos.slice(0, 8).map((video) => <div key={video.id} className="w-[66vw] max-w-56 shrink-0 snap-start sm:w-56">{videoCard(video)}</div>)}</div>
        </section>}
        {filteredFolders.length || visibleDirectVideos.length
          ? renderFolderContents(visibleDirectVideos)
          : videos.length === 0
            ? needsDirectoryPermission ? null : emptyLibrary
            : <p className="app-surface mt-8 rounded-xl border p-8 text-center text-sm text-slate-400">{search.trim() ? 'No matching folders or videos.' : 'No media found in this folder.'}</p>}
        {videos.some((video) => video.kind === 'video') && (
          <button onClick={() => {
            const queue = activeFolder ? currentFolder?.videos ?? directFolderVideos : videos.filter((video) => video.kind === 'video');
            if (queue.length) onSelect(queue[0], matchingVideos(queue), videos.filter((video) => video.kind === 'video'));
          }} className="fixed bottom-20 right-5 z-10 flex items-center gap-2 rounded-full bg-sky-300 px-4 py-3.5 font-semibold text-slate-950 shadow-lg shadow-black/30 transition hover:bg-sky-200 lg:bottom-7" aria-label="Play all videos in this folder">
            <Play className="h-4 w-4 fill-current" /><span className="text-sm">Play all</span>
          </button>
        )}
      </section>
    );
  };

  return <main className="app-shell min-h-[100dvh] text-white lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
    <aside className="app-sidebar sticky top-0 hidden h-[100dvh] flex-col border-r px-4 py-5 lg:flex">
      <button onClick={() => navigateTo(null)} className="mb-9 flex items-center gap-3 px-2 text-left" aria-label="GIPlayer home">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-300 text-slate-950"><Play className="h-4 w-4 fill-current" /></span>
        <span><strong className="block text-sm font-bold tracking-wide">GIPlayer</strong><span className="text-[11px] text-slate-500">Your media, your space</span></span>
      </button>
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">Library</p>
      <nav aria-label="Main navigation" className="space-y-1">
        {navigationItems.map(({ label, icon: Icon, view }) => <button key={label} onClick={() => navigateTo(view)} aria-current={isNavigationActive(view) ? 'page' : undefined} className={`app-nav-item flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium ${isNavigationActive(view) ? 'bg-sky-300/10 text-sky-200' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'}`}><Icon className="h-[17px] w-[17px]" />{label}</button>)}
      </nav>
      <div className="my-5 border-t border-white/[.07]" />
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">More</p>
      <nav aria-label="More navigation" className="space-y-1">
        <button onClick={() => navigateTo('continue')} className={`app-nav-item flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium ${isNavigationActive('continue') ? 'bg-sky-300/10 text-sky-200' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'}`}><Clock3 className="h-[17px] w-[17px]" />Continue watching</button>
        <button onClick={() => navigateTo('stream')} className={`app-nav-item flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium ${isNavigationActive('stream') ? 'bg-sky-300/10 text-sky-200' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'}`}><Globe2 className="h-[17px] w-[17px]" />Network stream</button>
        <button onClick={() => navigateTo('folders')} className={`app-nav-item flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium ${isNavigationActive('folders') ? 'bg-sky-300/10 text-sky-200' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'}`}><FolderOpen className="h-[17px] w-[17px]" />Manage folders</button>
        <button onClick={() => navigateTo('settings')} className={`app-nav-item flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium ${isNavigationActive('settings') ? 'bg-sky-300/10 text-sky-200' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'}`}><Settings2 className="h-[17px] w-[17px]" />Settings</button>
      </nav>
      <div className="mt-auto border-t border-white/[.07] pt-4">
        <button onClick={() => navigateTo('profile')} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/5">
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">{profile.avatar ? <img src={profile.avatar} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-4 w-4 text-slate-300" />}</span>
          <span className="min-w-0"><strong className="block truncate text-xs font-medium">{profile.displayName || 'Local profile'}</strong><span className="text-[10px] text-slate-500">On this device</span></span>
        </button>
      </div>
    </aside>
    <div className="min-w-0">
      {header}
      <div className="mx-auto max-w-[1480px] px-4 pb-28 sm:px-7 lg:px-8 lg:pb-10">
      {notice && (!needsDirectoryPermission || quickView || activeFolder) && <div role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-sky-300/15 bg-sky-300/[.07] px-4 py-3 text-sm text-sky-100"><AudioLines className="h-4 w-4 shrink-0" /><span className="flex-1">{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss" className="rounded-md p-1 hover:bg-white/10"><X className="h-4 w-4" /></button></div>}
        {!quickView && !activeFolder && <section className="mx-auto mt-5 max-w-6xl">
          <div className="flex min-h-11 items-center justify-between gap-3 pb-2">
            <div className="min-w-0"><h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Your library</h2>{videos.length > 0 && <p className="mt-1 text-xs text-slate-400">{videos.filter((video) => video.kind === 'video').length} videos <span className="px-1 text-slate-600">·</span> {folderNodes.length} folders</p>}</div>
            {(videos.length > 0 || (savedDirectories.length > 0 && !needsDirectoryPermission)) && <button onClick={() => void importFolder()} disabled={isImporting} className="app-nav-item inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg bg-sky-300 px-3.5 text-sm font-semibold text-slate-950 hover:bg-sky-200 disabled:opacity-50"><Plus className="h-4 w-4" />Add media</button>}
          </div>
        </section>}
        {mainContent()}
      </div>
    </div>
    <nav aria-label="Primary navigation" className="app-primary-nav fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-white/[.08] bg-[#0c1013] px-1 pb-[max(.25rem,env(safe-area-inset-bottom))] pt-1 lg:hidden">
      {navigationItems.map(({ label, icon: Icon, view }) => {
        const active = isNavigationActive(view);
        const shortLabel = label === 'All videos' ? 'Library' : label === 'Privacy Vault' ? 'Privacy' : label;
        return <button key={label} onClick={() => navigateTo(view)} aria-label={shortLabel} title={shortLabel} aria-current={active ? 'page' : undefined} className={`app-nav-item relative flex min-h-[3.35rem] min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 text-[9px] font-medium min-[360px]:text-[10px] ${active ? 'text-sky-200 after:absolute after:inset-x-3 after:top-0 after:h-0.5 after:rounded-full after:bg-sky-300' : 'text-slate-500 hover:text-slate-200'}`}><Icon className="h-[18px] w-[18px]" /><span className="hidden max-w-full truncate min-[360px]:block">{shortLabel}</span></button>;
      })}
    </nav>
  </main>;
};

export { VideoLibrary as VideoFolderBrowser };
