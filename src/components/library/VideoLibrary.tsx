import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, AudioLines, Check, ChevronRight, Folder, FolderOpen,
  Grid2X2, List, LockKeyhole, Music2, Play, Plus, RefreshCw, Search, Share2, Shield,
  Trash2, Video, X, Globe2,
} from 'lucide-react';
import { buildMediaFolderTree, getMediaDirectory, getPlayerPreference, makeVideoId, playerLibrary, RememberedDirectoryHandle, SavedPlaylist, setPlayerPreference } from '../../services/playerLibrary';
import { NetworkStreamDialog } from '../player/MoreOptionsMenu';

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
};

type FolderEntry = { name: string; path: string; parentPath: string; videos: VideoFile[] };
type PlaylistView = 'playlists' | 'share' | 'privacy' | 'music' | 'stream' | null;
type PickedFile = { file: File; path: string };
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
}: {
  onSelect: (video: VideoFile, queue: VideoFile[], library: VideoFile[]) => void;
  onOpenStream: (url: string) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrls = useRef<string[]>([]);
  const directoryHandleRef = useRef<RememberedDirectoryHandle | null>(null);
  const importGenerationRef = useRef(0);
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [rootFolderName, setRootFolderName] = useState('');
  const [rememberedDirectoryName, setRememberedDirectoryName] = useState('');
  const [needsDirectoryPermission, setNeedsDirectoryPermission] = useState(false);
  const [isCheckingLibrary, setIsCheckingLibrary] = useState(true);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [quickView, setQuickView] = useState<PlaylistView>(null);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sort, setSort] = useState<'name' | 'date' | 'size'>('name');
  const [grid, setGrid] = useState(false);
  const [notice, setNotice] = useState('');
  const [playlists, setPlaylists] = useState(() => playerLibrary.getPlaylists());
  const [playlistName, setPlaylistName] = useState('');
  const [playlistSelection, setPlaylistSelection] = useState<SavedPlaylist | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const supportsDirectoryAccess = typeof window !== 'undefined'
    && window.isSecureContext
    && typeof (window as Window & { showDirectoryPicker?: () => Promise<RememberedDirectoryHandle> }).showDirectoryPicker === 'function';

  useEffect(() => () => objectUrls.current.forEach(URL.revokeObjectURL), []);

  const directoryFor = (video: VideoFile) => getMediaDirectory(video.relativePath, rootFolderName);

  const folderNodes = useMemo(() => {
    const result = buildMediaFolderTree(videos, rootFolderName);
    result.sort((a, b) => sort === 'date'
      ? Math.max(...b.videos.map((video) => video.lastModified)) - Math.max(...a.videos.map((video) => video.lastModified))
      : a.name.localeCompare(b.name));
    return result;
  }, [videos, rootFolderName, sort]);
  const folders = folderNodes.filter((folder) => folder.parentPath === (activeFolder ?? ''));

  const savePlaylists = (next: SavedPlaylist[]) => {
    setPlaylists(next);
    playerLibrary.savePlaylists(next);
  };

  const importFiles = async (picked: PickedFile[], inaccessible = 0, selectedRoot = '') => {
    const generation = ++importGenerationRef.current;
    setIsImporting(true);
    const previousUrls = objectUrls.current;
    objectUrls.current = [];
    const imports: VideoFile[] = [];
    for (const { file, path } of picked) {
      const kind = isMediaFile(file);
      if (!kind) continue;
      const url = URL.createObjectURL(file);
      objectUrls.current.push(url);
      imports.push({
        id: makeVideoId(path, file), file, url, name: file.name,
        relativePath: path, lastModified: file.lastModified, kind,
      });
    }
    objectUrls.current = imports.map((item) => item.url);
    setRootFolderName(selectedRoot);
    setVideos(imports);
    setActiveFolder(null);
    const restoredFolder = getPlayerPreference('giplayer-last-opened-folder', '');
    if (restoredFolder && imports.some((video) => {
      const parts = video.relativePath.split('/');
      if (selectedRoot && parts[0] === selectedRoot) parts.shift();
      return parts.slice(0, -1).join('/') === restoredFolder || parts.slice(0, -1).join('/').startsWith(`${restoredFolder}/`);
    })) {
      setActiveFolder(restoredFolder);
    }
    previousUrls.forEach(URL.revokeObjectURL);
    setIsImporting(false);
    const videoImports = imports.filter((item) => item.kind === 'video');
    const skipped = picked.length - imports.length;
    setNotice(imports.length
      ? `${videoImports.length} videos and ${imports.length - videoImports.length} audio files found${skipped ? ` · ${skipped} unsupported files skipped` : ''}${inaccessible ? ` · ${inaccessible} items could not be read` : ''}. Thumbnails are loading in the background.`
      : inaccessible
        ? `No media files could be read from this folder (${inaccessible} inaccessible items). Check the folder permission and try again.`
        : 'No supported video or audio files were found. Try selecting individual files or a different folder.');
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
      setVideos((current) => current.map((item) => {
        const metadata = thumbnailResults.get(item.id);
        return metadata ? { ...item, ...metadata } : item;
      }));
    }
  };

  const importFolder = async () => {
    const directoryWindow = window as Window & {
      showDirectoryPicker?: () => Promise<RememberedDirectoryHandle>;
    };
    if (window.isSecureContext && directoryWindow.showDirectoryPicker) {
      try {
        const handle = await directoryWindow.showDirectoryPicker();
        directoryHandleRef.current = handle;
        setRememberedDirectoryName(handle.name);
        setNeedsDirectoryPermission(false);
        if (navigator.storage?.persist) await navigator.storage.persist().catch(() => false);
        const remembered = await playerLibrary.saveDirectoryHandle(handle);
        setIsImporting(true);
        const scan = await readDirectory(handle);
        await importFiles(scan.files, scan.inaccessible, handle.name);
        if (!remembered) {
          setNotice('Folder loaded. This browser cannot remember folder access, so select it again after reload.');
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

  const restoreRememberedFolder = async () => {
    try {
      const handle = directoryHandleRef.current ?? await playerLibrary.getDirectoryHandle();
      if (!handle) {
        setNotice('No remembered folder is available. Choose a folder to start your library.');
        await importFolder();
        return;
      }
      directoryHandleRef.current = handle;
      setRememberedDirectoryName(handle.name);
      let permission = await handle.queryPermission?.({ mode: 'read' });
      if (permission !== 'granted') permission = await handle.requestPermission?.({ mode: 'read' });
      if (permission !== 'granted') {
        setNeedsDirectoryPermission(true);
        setNotice(`Allow folder access in your browser to scan ${handle.name}.`);
        return;
      }
      setNeedsDirectoryPermission(false);
      setIsImporting(true);
      const scan = await readDirectory(handle);
      await importFiles(scan.files, scan.inaccessible, handle.name);
    } catch (error) {
      console.error('Could not scan the remembered folder.', error);
      setNotice('Could not read the remembered folder. Check its browser permission or choose it again.');
    } finally {
      setIsImporting(false);
    }
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      const handle = await playerLibrary.getDirectoryHandle();
      if (!active || !handle) {
        if (active) setIsCheckingLibrary(false);
        return;
      }
      directoryHandleRef.current = handle;
      setRememberedDirectoryName(handle.name);
      try {
        if (await handle.queryPermission?.({ mode: 'read' }) === 'granted') {
          setIsImporting(true);
          const scan = await readDirectory(handle);
          if (active && directoryHandleRef.current === handle) await importFiles(scan.files, scan.inaccessible, handle.name);
        } else if (active) {
          setNeedsDirectoryPermission(true);
          setNotice('A folder was remembered. Tap Restore folder access to let GIPlayer scan it again.');
        }
      } catch (error) {
        console.error('Could not automatically scan the remembered folder.', error);
        if (active) {
          setNeedsDirectoryPermission(true);
          setNotice('Could not automatically scan the remembered folder. Tap Restore folder access to retry.');
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
    directoryHandleRef.current = null;
    setNeedsDirectoryPermission(false);
    await playerLibrary.clearDirectoryHandle();
    const picked = files.map((file) => ({
      file,
      path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
    }));
    const pathSegments = picked.map(({ path }) => path.split('/'));
    const firstDirectory = pathSegments[0]?.[0] ?? '';
    const selectedRoot = pathSegments.length > 0
      && pathSegments.every((parts) => parts.length > 1 && parts[0] === firstDirectory)
      ? firstDirectory
      : '';
    setRememberedDirectoryName(selectedRoot);
    await importFiles(picked, 0, selectedRoot);
    event.target.value = '';
  };

  const matchingVideos = (items: VideoFile[]) => items
    .filter((video) => video.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
    .sort((a, b) => sort === 'date' ? b.lastModified - a.lastModified
      : sort === 'size' ? b.file.size - a.file.size : a.name.localeCompare(b.name));
  const currentFolder = folderNodes.find((folder) => folder.path === activeFolder);
  const directFolderVideos = videos.filter((video) => video.kind === 'video' && directoryFor(video) === (activeFolder ?? ''));
  const listedVideos = quickView === 'music'
    ? videos.filter((video) => video.kind === 'audio')
    : activeFolder ? directFolderVideos : videos.filter((video) => directoryFor(video) === '');
  const listMode = !grid;

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
    if (activeFolder) {
      const parent = activeFolder.split('/').slice(0, -1).join('/');
      setActiveFolder(parent || null);
      return;
    }
    setQuickView(null);
    setPlaylistSelection(null);
  };

  const header = (
    <header className="sticky top-0 z-20 border-b border-white/5 bg-[#111b24]/95 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] shadow-lg shadow-black/10 backdrop-blur-xl sm:px-7">
      <div className="mx-auto flex max-w-6xl items-center gap-2">
        {(activeFolder || quickView) && (
          <button onClick={goBack} className="rounded-full p-2 text-slate-300 hover:bg-white/10" aria-label="Back"><ArrowLeft /></button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-md shadow-sky-950/30"><Play className="h-4 w-4 fill-current text-slate-950" /></span>
            <span className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-[.22em] text-sky-300">GIPlayer</span>
              <h1 className="truncate text-sm font-bold text-white sm:text-lg">{playlistSelection?.name ?? currentFolder?.name ?? (quickView === 'music' ? 'Music' : quickView === 'playlists' ? 'Video Playlists' : quickView === 'share' ? 'GIPlayer Share' : quickView === 'privacy' ? 'Privacy' : quickView === 'stream' ? 'Network Stream' : 'Folders')}</h1>
            </span>
          </div>
        </div>
        <button onClick={() => { setSearchOpen((value) => !value); setSearch(''); }} className="shrink-0 rounded-full p-2 text-slate-300 hover:bg-white/10" aria-label="Search"><Search className="h-5 w-5" /></button>
        <button onClick={() => setGrid((value) => !value)} className="shrink-0 rounded-full p-2 text-slate-300 hover:bg-white/10" aria-label={grid ? 'List view' : 'Grid view'}>{grid ? <List className="h-5 w-5" /> : <Grid2X2 className="h-5 w-5" />}</button>
        {needsDirectoryPermission && <button onClick={() => void restoreRememberedFolder()} className="shrink-0 rounded-full bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-300" title={`Restore access to ${rememberedDirectoryName}`} aria-label="Restore remembered folder access">Restore folder</button>}
        {rememberedDirectoryName && !needsDirectoryPermission && <button onClick={() => void restoreRememberedFolder()} disabled={isImporting} className="shrink-0 rounded-full p-2 text-slate-300 hover:bg-white/10 disabled:opacity-50" title={`Scan ${rememberedDirectoryName} again`} aria-label="Scan selected folder again"><RefreshCw className={`h-5 w-5 ${isImporting ? 'animate-spin' : ''}`} /></button>}
        <button onClick={() => void importFolder()} className="shrink-0 rounded-full p-2 text-sky-300 hover:bg-sky-400/10 disabled:opacity-50" aria-label="Choose local folder" title="Choose local folder" disabled={isImporting}><FolderOpen className="h-5 w-5" /></button>
      </div>
      {searchOpen && (
        <div className="mx-auto mt-3 max-w-6xl">
          <input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') { setSearch(''); setSearchOpen(false); } }} placeholder="Search videos and folders" className="w-full rounded-xl border border-white/10 bg-[#0b1219] px-4 py-2.5 text-white outline-none focus:border-sky-400" />
        </div>
      )}
      {!activeFolder && !quickView && (
        <nav className="scrollbar-none mx-auto mt-3 flex max-w-6xl gap-2 overflow-x-auto pb-1">
          {[
            { label: 'Music', icon: <Music2 />, action: () => { setQuickView('music'); setActiveFolder(null); } },
            { label: 'Privacy', icon: <LockKeyhole />, action: () => setQuickView('privacy') },
            { label: 'GIPlayer Share', icon: <Share2 />, action: () => setQuickView('share') },
            { label: 'Video Playlists', icon: <List />, action: () => setQuickView('playlists') },
            { label: 'Network Stream', icon: <Globe2 />, action: () => setQuickView('stream') },
          ].map((item) => <button key={item.label} onClick={item.action} className="flex shrink-0 items-center gap-2 rounded-full border border-white/5 bg-[#202d38] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-sky-400/20 hover:bg-[#2b3a47]">{item.icon}<span>{item.label}</span></button>)}
        </nav>
      )}
      <input ref={inputRef} type="file" multiple accept="video/*,audio/*,.mkv,.avi,.wmv,.flv,.m2ts,.mts,.vob,.mpg,.mpeg" onChange={(event) => void handleFallbackImport(event)} className="hidden" {...{ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>} />
      <input ref={fileInputRef} type="file" multiple accept="video/*,audio/*,.mkv,.avi,.wmv,.flv,.m2ts,.mts,.vob,.mpg,.mpeg" onChange={(event) => void handleFallbackImport(event)} className="hidden" />
    </header>
  );

  const videoCard = (video: VideoFile) => (
    <article key={video.id} className={`group relative overflow-hidden rounded-2xl border border-white/5 bg-[#1a252f] ${listMode ? 'flex items-center gap-4 p-3' : ''}`}>
      <button onClick={() => onSelect(video, matchingVideos(activeFolder && currentFolder ? currentFolder.videos : videos.filter((item) => item.kind === video.kind)), videos.filter((item) => item.kind === 'video'))} className={`relative block overflow-hidden text-left ${listMode ? 'h-20 w-32 shrink-0 rounded-xl' : 'aspect-video w-full'}`} aria-label={`Play ${video.name}`}>
        {video.thumbnail ? <img src={video.thumbnail} alt="" className="h-full w-full object-cover transition group-hover:scale-105" /> : <div className="flex h-full w-full items-center justify-center bg-[#283541]">{video.kind === 'audio' ? <Music2 className="h-8 w-8 text-slate-500" /> : <Video className="h-8 w-8 text-slate-500" />}</div>}
        <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] text-white">{formatDuration(video.duration ?? Number.NaN)}</span>
      </button>
      <div className={`min-w-0 flex-1 ${listMode ? 'py-1 pr-1' : 'p-3'}`}>
        <button onClick={() => onSelect(video, matchingVideos(activeFolder && currentFolder ? currentFolder.videos : videos.filter((item) => item.kind === video.kind)), videos.filter((item) => item.kind === 'video'))} className="block w-full truncate text-left text-sm font-semibold text-slate-100">{video.name}</button>
        <p className="mt-1 text-xs text-slate-400">{formatBytes(video.file.size)} · {new Date(video.lastModified).toLocaleDateString()}</p>
      </div>
      <button onClick={() => void shareVideo(video)} className={`rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-sky-300 ${listMode ? 'mr-2' : 'absolute right-2 top-2 bg-black/50'}`} aria-label={`Share ${video.name}`}><Share2 className="h-4 w-4" /></button>
    </article>
  );

  const folderCard = (folder: FolderEntry) => (
    <article key={folder.path} className="group flex items-center gap-4 rounded-2xl border border-white/5 bg-[#1a252f] p-4 transition hover:border-sky-400/30 hover:bg-[#202d38]">
      <button onClick={() => openFolder(folder)} className="flex min-w-0 flex-1 items-center gap-4 text-left">
        <div className="relative flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#33404c]">
          {folder.videos[0]?.thumbnail ? <img src={folder.videos[0].thumbnail} alt="" className="h-full w-full object-cover" /> : <Folder className="h-9 w-9 fill-slate-400/20 text-slate-400" />}
          {folder.videos.some((video) => Date.now() - video.lastModified < 86400000) && <span className="absolute right-1 top-1 rounded-full bg-rose-500 px-2 py-1 text-[10px] font-bold">NEW</span>}
        </div>
        <span className="min-w-0 flex-1">
          <strong className="block truncate">{folder.name}</strong>
          <span className="mt-1 block text-sm text-slate-400">{folder.videos.length} video{folder.videos.length === 1 ? '' : 's'}</span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-sky-300" />
      </button>
      <button onClick={() => addFolderToPlaylist(folder)} className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-sky-300" title="Add folder videos to playlist" aria-label={`Add ${folder.name} to playlist`}><Plus className="h-4 w-4" /></button>
    </article>
  );

  const mainContent = () => {
    if (quickView === 'privacy') return <section className="mx-auto mt-8 max-w-2xl rounded-3xl border border-white/5 bg-[#1a252f] p-6"><Shield className="mb-4 h-9 w-9 text-sky-400" /><h2 className="text-lg font-bold">Your files stay in your browser</h2><p className="mt-2 text-sm leading-6 text-slate-300">GIPlayer can read only files and folders you explicitly choose. Browsers do not grant websites unrestricted access to Android or desktop storage. GIPlayer saves your selected folder handle and requests persistent site storage where supported, then scans it automatically while Chrome keeps read permission. If Chrome resets folder permission, tap Restore folder once to grant it again; web apps cannot override Chrome’s permission policy. Selected file data stays in memory for this tab, while playback positions and playlists are stored locally.</p></section>;
    if (quickView === 'share') return <section className="mx-auto mt-8 max-w-2xl rounded-3xl border border-white/5 bg-[#1a252f] p-6"><Share2 className="mb-4 h-9 w-9 text-sky-400" /><h2 className="text-lg font-bold">Share a selected file</h2><p className="mt-2 text-sm leading-6 text-slate-300">Use your device share sheet on an imported item. If the browser cannot share files, GIPlayer will explain that a private local file cannot be shared as a public link.</p>{videos.length ? <div className="mt-5 grid gap-2">{videos.map((video) => <div key={video.id} className="flex items-center justify-between rounded-xl bg-black/20 p-3"><span className="truncate pr-3 text-sm">{video.name}</span><button onClick={() => void shareVideo(video)} className="rounded-full bg-sky-500/15 p-2 text-sky-300" aria-label={`Share ${video.name}`}><Share2 className="h-4 w-4" /></button></div>)}</div> : <p className="mt-5 text-sm text-slate-400">Choose a folder first to browse your files.</p>}</section>;
    if (quickView === 'stream') return <section className="mx-auto mt-8 max-w-2xl rounded-3xl border border-white/5 bg-[#1a252f] p-6"><Globe2 className="mb-4 h-9 w-9 text-sky-400" /><h2 className="mb-4 text-lg font-bold">Play a network stream</h2><NetworkStreamDialog onPlay={onOpenStream} /></section>;
    if (quickView === 'playlists') return (
      <section className="mx-auto mt-6 max-w-4xl">
        <form onSubmit={(event) => { event.preventDefault(); createPlaylist(); }} className="mb-5 flex gap-2"><input value={playlistName} onChange={(event) => setPlaylistName(event.target.value)} placeholder="New playlist name" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#1a252f] px-4 py-3 outline-none focus:border-sky-400" /><button className="rounded-xl bg-sky-500 px-4 font-semibold text-slate-950"><Plus className="inline h-4 w-4" /> Create</button></form>
        <div className="space-y-3">{playlists.map((playlist) => <div key={playlist.id} className="rounded-2xl border border-white/5 bg-[#1a252f] p-4">
          <div className="flex items-center gap-2"><button onClick={() => setPlaylistSelection(playlistSelection?.id === playlist.id ? null : playlist)} className="min-w-0 flex-1 text-left"><strong className="block truncate">{playlist.name}</strong><span className="text-xs text-slate-400">{playlist.videoIds.length} saved videos</span></button><button onClick={() => { const name = window.prompt('Rename playlist', playlist.name)?.trim(); if (name) savePlaylists(playlists.map((item) => item.id === playlist.id ? { ...item, name } : item)); }} className="rounded-lg p-2 text-slate-400 hover:bg-white/10" aria-label={`Rename ${playlist.name}`}>Rename</button><button onClick={() => { if (window.confirm(`Delete “${playlist.name}”?`)) { savePlaylists(playlists.filter((item) => item.id !== playlist.id)); if (playlistSelection?.id === playlist.id) setPlaylistSelection(null); } }} className="rounded-lg p-2 text-rose-300 hover:bg-white/10" aria-label={`Delete ${playlist.name}`}><Trash2 className="h-4 w-4" /></button>
            <button onClick={() => { const queue = playlist.videoIds.map((id) => videos.find((video) => video.id === id)).filter((video): video is VideoFile => Boolean(video)); if (queue.length) onSelect(queue[0], queue, videos.filter((video) => video.kind === 'video')); else setNotice('Re-select the source folder to play files in this playlist.'); }} className="rounded-full bg-sky-500 p-2.5 text-slate-950" aria-label={`Play ${playlist.name}`}><Play className="h-4 w-4 fill-current" /></button>
          </div>
          {playlistSelection?.id === playlist.id && <div className="mt-4 border-t border-white/5 pt-4"><p className="mb-2 text-xs text-slate-400">Add or remove videos currently selected in this tab</p>{videos.filter((video) => video.kind === 'video').map((video) => <button key={video.id} onClick={() => togglePlaylistVideo(playlist, video)} className="flex w-full items-center gap-3 border-b border-white/5 py-2 text-left"><span className="min-w-0 flex-1 truncate text-sm">{video.name}</span>{playlist.videoIds.includes(video.id) ? <Check className="h-4 w-4 text-sky-300" /> : <Plus className="h-4 w-4 text-slate-400" />}</button>)}</div>}
        </div>)}</div>
      </section>
    );

    if (quickView === 'music') {
      const items = matchingVideos(listedVideos);
      return <section className="mx-auto mt-5 max-w-6xl"><div className="mb-4 flex flex-col items-start gap-3 min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between"><p className="text-sm text-slate-400">{items.length} {quickView === 'music' ? 'audio tracks' : 'videos'}</p><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="rounded-lg bg-[#1a252f] px-3 py-2 text-sm"><option value="name">Name</option><option value="date">Date added</option><option value="size">File size</option></select></div><div className={grid ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4' : 'space-y-2'}>{items.map(videoCard)}</div>{items.length === 0 && <p className="rounded-2xl bg-[#1a252f] p-8 text-center text-slate-400">No matching media in this folder.</p>}<button onClick={() => items[0] && onSelect(items[0], items, videos.filter((video) => video.kind === 'video'))} disabled={!items.length} className="fixed bottom-6 right-5 z-10 rounded-full bg-sky-500 p-5 text-slate-950 shadow-xl shadow-sky-950/30 disabled:opacity-40" aria-label="Play all"><Play className="h-7 w-7 fill-current" /></button></section>;
    }

    const filteredFolders = folders.filter((folder) => `${folder.name} ${folder.path}`.toLowerCase().includes(search.trim().toLowerCase()));
    const rootVideoMatches = matchingVideos(videos.filter((video) =>
      video.kind === 'video' && (!search.trim() || video.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()))));
    const emptyLibrary = (
      <div className="mx-auto mt-8 max-w-2xl rounded-3xl border border-white/5 bg-[#1a252f] px-6 py-10 text-center sm:px-10">
        <FolderOpen className="mx-auto h-12 w-12 text-sky-400" />
        <h2 className="mt-4 text-xl font-bold">{isCheckingLibrary ? 'Checking your library…' : isImporting ? 'Scanning selected media…' : needsDirectoryPermission ? `Restore access to ${rememberedDirectoryName}` : 'Build your video library'}</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">
          {isCheckingLibrary
            ? 'Checking whether a previously selected folder can be scanned.'
            : needsDirectoryPermission
              ? 'Your browser remembers the folder, but needs your permission before GIPlayer can scan it.'
              : supportsDirectoryAccess
                ? 'Choose a media folder and approve the browser prompt. GIPlayer scans compatible videos and music in that folder and its subfolders. It cannot request access to the rest of your device.'
                : 'For privacy, this browser cannot scan your device automatically. Choose a folder or select the videos and music you want GIPlayer to show.'}
        </p>
        {!isCheckingLibrary && !isImporting && (
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            {supportsDirectoryAccess
              ? <button onClick={() => void (needsDirectoryPermission ? restoreRememberedFolder() : importFolder())} className="rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950"><FolderOpen className="mr-2 inline h-4 w-4" />{needsDirectoryPermission ? 'Grant folder access' : 'Choose media folder'}</button>
              : <button onClick={() => inputRef.current && 'webkitdirectory' in inputRef.current ? inputRef.current.click() : fileInputRef.current?.click()} className="rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950"><FolderOpen className="mr-2 inline h-4 w-4" />Choose media folder</button>}
            <button onClick={() => fileInputRef.current?.click()} className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"><Video className="mr-2 inline h-4 w-4" />Select videos and music</button>
          </div>
        )}
        {!supportsDirectoryAccess && !isCheckingLibrary && <p className="mt-4 text-xs text-slate-500">Automatic folder scanning depends on browser support and explicit folder permission. It cannot access all Android storage in the background.</p>}
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
        : rootFolderName
          ? `Videos in ${rootFolderName}`
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filteredFolders.map(folderCard)}</div>
          </section>
        )}
        {items.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">{sectionTitle} · {items.length}</h2>
            {renderVideoGrid(items)}
          </section>
        )}
        {!filteredFolders.length && !items.length && (videos.length ? (
          <p className="mt-8 rounded-2xl bg-[#1a252f] p-8 text-center text-slate-400">
            {search.trim() ? 'No matching folders or videos.' : 'This folder has no media or subfolders.'}
          </p>
        ) : emptyLibrary)}
      </>
    );
    return (
      <section className="mx-auto mt-5 max-w-6xl">
        <div className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-[#17232d] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">{activeFolder || rootFolderName || 'Your library'}</p>
            <p className="mt-1 text-xs text-slate-400">{videos.filter((video) => video.kind === 'video').length} videos · {folders.length} folders</p>
          </div>
          <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="rounded-lg bg-[#25313c] px-3 py-2 text-sm text-white">
            <option value="name">Sort by name</option><option value="date">Recently added</option><option value="size">File size</option>
          </select>
        </div>
        {filteredFolders.length || visibleDirectVideos.length
          ? renderFolderContents(visibleDirectVideos)
          : videos.length === 0
            ? emptyLibrary
            : <p className="mt-8 rounded-2xl bg-[#1a252f] p-8 text-center text-slate-400">{search.trim() ? 'No matching folders or videos.' : 'No media found in this folder.'}</p>}
        {videos.some((video) => video.kind === 'video') && (
          <button onClick={() => {
            const queue = activeFolder ? currentFolder?.videos ?? directFolderVideos : videos.filter((video) => video.kind === 'video');
            if (queue.length) onSelect(queue[0], matchingVideos(queue), videos.filter((video) => video.kind === 'video'));
          }} className="fixed bottom-6 right-5 z-10 rounded-full bg-sky-500 p-5 text-slate-950 shadow-xl shadow-sky-950/30 transition hover:scale-105" aria-label="Play all videos in this folder">
            <Play className="h-7 w-7 fill-current" />
          </button>
        )}
      </section>
    );
  };

  return <main className="min-h-screen bg-[#111b24] pb-24 text-white">{header}<div className="mx-auto max-w-6xl px-4 pb-8 sm:px-7">{notice && <div role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100"><AudioLines className="h-4 w-4 shrink-0" /><span className="flex-1">{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss"><X className="h-4 w-4" /></button></div>}{mainContent()}</div></main>;
};

export { VideoLibrary as VideoFolderBrowser };
