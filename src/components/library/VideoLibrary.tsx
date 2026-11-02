import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, AudioLines, Check, ChevronRight, Folder, FolderOpen,
  Grid2X2, List, LockKeyhole, Music2, Play, Plus, Search, Share2, Shield,
  Trash2, Video, X, Globe2,
} from 'lucide-react';
import { getPlayerPreference, makeVideoId, playerLibrary, SavedPlaylist, setPlayerPreference } from '../../services/playerLibrary';
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

type FolderEntry = { name: string; path: string; videos: VideoFile[] };
type PlaylistView = 'playlists' | 'share' | 'privacy' | 'music' | 'stream' | null;
type PickedFile = { file: File; path: string };
type DirectoryFileHandle = { kind: 'file'; name: string; getFile(): Promise<File> };
type DirectoryHandle = {
  kind: 'directory'; name: string;
  values(): AsyncIterable<DirectoryHandle | DirectoryFileHandle>;
};

const VIDEO_EXTENSIONS = new Set(['mp4', 'm4v', 'webm', 'mov', 'mkv', 'avi', 'ogv', '3gp', 'ts']);
const AUDIO_EXTENSIONS = new Set(['mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg', 'opus', 'weba']);

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

async function readDirectory(handle: DirectoryHandle, parentPath = ''): Promise<PickedFile[]> {
  const path = parentPath ? `${parentPath}/${handle.name}` : handle.name;
  const files: PickedFile[] = [];
  for await (const entry of handle.values()) {
    if (entry.kind === 'directory') files.push(...await readDirectory(entry, path));
    else files.push({ file: await entry.getFile(), path: `${path}/${entry.name}` });
  }
  return files;
}

export const VideoLibrary = ({
  onSelect,
  onOpenStream,
}: {
  onSelect: (video: VideoFile, queue: VideoFile[], library: VideoFile[]) => void;
  onOpenStream: (url: string) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrls = useRef<string[]>([]);
  const [videos, setVideos] = useState<VideoFile[]>([]);
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

  useEffect(() => () => objectUrls.current.forEach(URL.revokeObjectURL), []);

  const folders = useMemo(() => {
    const groups = new Map<string, FolderEntry>();
    videos.filter((video) => video.kind === 'video').forEach((video) => {
      const pathParts = video.relativePath.split('/');
      const folderPath = pathParts.slice(0, -1).join('/') || 'Selected files';
      const name = pathParts[pathParts.length - 2] || 'Selected files';
      const folder: FolderEntry = groups.get(folderPath) ?? { name, path: folderPath, videos: [] };
      folder.videos.push(video);
      groups.set(folderPath, folder);
    });
    const result = Array.from(groups.values());
    result.sort((a, b) => sort === 'date'
      ? Math.max(...b.videos.map((video) => video.lastModified)) - Math.max(...a.videos.map((video) => video.lastModified))
      : a.name.localeCompare(b.name));
    return result;
  }, [videos, sort]);

  const savePlaylists = (next: SavedPlaylist[]) => {
    setPlaylists(next);
    playerLibrary.savePlaylists(next);
  };

  const importFiles = async (picked: PickedFile[]) => {
    setIsImporting(true);
    objectUrls.current.forEach(URL.revokeObjectURL);
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
    const videoImports = imports.filter((item) => item.kind === 'video');
    await Promise.all(videoImports.map(async (item) => { Object.assign(item, await createThumbnail(item.file)); }));
    objectUrls.current = imports.map((item) => item.url);
    setVideos(imports);
    setActiveFolder(null);
    const restoredFolder = getPlayerPreference('giplayer-last-opened-folder', '');
    if (restoredFolder && imports.some((video) => video.relativePath.startsWith(restoredFolder))) {
      setActiveFolder(restoredFolder);
    }
    setNotice(imports.length
      ? `${videoImports.length} video${videoImports.length === 1 ? '' : 's'} and ${imports.length - videoImports.length} audio file${imports.length - videoImports.length === 1 ? '' : 's'} available in this tab.`
      : 'No supported video or audio files were found.');
    setIsImporting(false);
  };

  const importFolder = async () => {
    const directoryWindow = window as Window & {
      showDirectoryPicker?: () => Promise<DirectoryHandle>;
    };
    if (window.isSecureContext && directoryWindow.showDirectoryPicker) {
      try {
        await importFiles(await readDirectory(await directoryWindow.showDirectoryPicker()));
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setNotice('Folder access was unavailable. Choose a folder with the browser file picker instead.');
        inputRef.current?.click();
      }
    } else {
      inputRef.current?.click();
    }
  };

  const handleFallbackImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    await importFiles(files.map((file) => ({
      file,
      path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
    })));
    event.target.value = '';
  };

  const matchingVideos = (items: VideoFile[]) => items
    .filter((video) => video.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
    .sort((a, b) => sort === 'date' ? b.lastModified - a.lastModified
      : sort === 'size' ? b.file.size - a.file.size : a.name.localeCompare(b.name));
  const currentFolder = folders.find((folder) => folder.path === activeFolder);
  const listedVideos = quickView === 'music'
    ? videos.filter((video) => video.kind === 'audio')
    : currentFolder ? currentFolder.videos : [];
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

  const header = (
    <header className="sticky top-0 z-20 border-b border-white/5 bg-[#111b24]/95 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl sm:px-7">
      <div className="mx-auto flex max-w-6xl items-center gap-2">
        {(activeFolder || quickView) && (
          <button onClick={() => { setActiveFolder(null); setQuickView(null); setPlaylistSelection(null); }} className="rounded-full p-2 text-slate-300 hover:bg-white/10" aria-label="Back to folders"><ArrowLeft /></button>
        )}
        <div className="min-w-0 flex-1">
          <p className="hidden text-xs font-semibold uppercase tracking-[.25em] text-sky-400 min-[350px]:block">GIPlayer</p>
          <h1 className="truncate text-base font-bold text-white min-[350px]:text-xl sm:text-2xl">{playlistSelection?.name ?? currentFolder?.name ?? (quickView === 'music' ? 'Music' : quickView === 'playlists' ? 'Video Playlists' : quickView === 'share' ? 'GIPlayer Share' : quickView === 'privacy' ? 'Privacy' : quickView === 'stream' ? 'Network Stream' : 'Folders')}</h1>
        </div>
        <button onClick={() => { setSearchOpen((value) => !value); setSearch(''); }} className="shrink-0 rounded-full p-2 text-slate-300 hover:bg-white/10" aria-label="Search"><Search className="h-5 w-5" /></button>
        <button onClick={() => setGrid((value) => !value)} className="shrink-0 rounded-full p-2 text-slate-300 hover:bg-white/10" aria-label={grid ? 'List view' : 'Grid view'}>{grid ? <List className="h-5 w-5" /> : <Grid2X2 className="h-5 w-5" />}</button>
        <button onClick={() => void importFolder()} className="hidden shrink-0 rounded-full p-2 text-sky-300 hover:bg-sky-400/10 min-[300px]:block" aria-label="Choose local folder" title="Choose local folder"><FolderOpen className="h-5 w-5" /></button>
      </div>
      {searchOpen && (
        <div className="mx-auto mt-3 max-w-6xl">
          <input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') { setSearch(''); setSearchOpen(false); } }} placeholder="Search videos and folders" className="w-full rounded-xl border border-white/10 bg-[#0b1219] px-4 py-2.5 text-white outline-none focus:border-sky-400" />
        </div>
      )}
      {!activeFolder && !quickView && (
        <nav className="mx-auto mt-4 flex max-w-6xl gap-2 overflow-x-auto pb-1">
          {[
            { label: 'Music', icon: <Music2 />, action: () => { setQuickView('music'); setActiveFolder(null); } },
            { label: 'Privacy', icon: <LockKeyhole />, action: () => setQuickView('privacy') },
            { label: 'GIPlayer Share', icon: <Share2 />, action: () => setQuickView('share') },
            { label: 'Video Playlists', icon: <List />, action: () => setQuickView('playlists') },
            { label: 'Network Stream', icon: <Globe2 />, action: () => setQuickView('stream') },
          ].map((item) => <button key={item.label} onClick={item.action} className="flex shrink-0 items-center gap-2 rounded-full bg-[#25313c] px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-[#334352]">{item.icon}<span>{item.label}</span></button>)}
        </nav>
      )}
      <input ref={inputRef} type="file" multiple accept="video/*,audio/*" onChange={(event) => void handleFallbackImport(event)} className="hidden" {...{ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>} />
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

  const mainContent = () => {
    if (quickView === 'privacy') return <section className="mx-auto mt-8 max-w-2xl rounded-3xl border border-white/5 bg-[#1a252f] p-6"><Shield className="mb-4 h-9 w-9 text-sky-400" /><h2 className="text-lg font-bold">Your files stay in your browser</h2><p className="mt-2 text-sm leading-6 text-slate-300">GIPlayer can read only files and folders you explicitly choose. Browsers do not grant websites unrestricted access to Android or desktop storage. Selected files are held in memory for this tab and must be selected again after a reload; playback positions and playlists are stored locally.</p></section>;
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

    if (activeFolder || quickView === 'music') {
      const items = matchingVideos(listedVideos);
      return <section className="mx-auto mt-5 max-w-6xl"><div className="mb-4 flex flex-col items-start gap-3 min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between"><p className="text-sm text-slate-400">{items.length} {quickView === 'music' ? 'audio tracks' : 'videos'}</p><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="rounded-lg bg-[#1a252f] px-3 py-2 text-sm"><option value="name">Name</option><option value="date">Date added</option><option value="size">File size</option></select></div><div className={grid ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4' : 'space-y-2'}>{items.map(videoCard)}</div>{items.length === 0 && <p className="rounded-2xl bg-[#1a252f] p-8 text-center text-slate-400">No matching media in this folder.</p>}<button onClick={() => items[0] && onSelect(items[0], items, videos.filter((video) => video.kind === 'video'))} disabled={!items.length} className="fixed bottom-6 right-5 z-10 rounded-full bg-sky-500 p-5 text-slate-950 shadow-xl shadow-sky-950/30 disabled:opacity-40" aria-label="Play all"><Play className="h-7 w-7 fill-current" /></button></section>;
    }

    const filteredFolders = folders.filter((folder) => `${folder.name} ${folder.path}`.toLowerCase().includes(search.trim().toLowerCase()));
    const rootVideoMatches = matchingVideos(videos.filter((video) => video.kind === 'video'));
    return <section className="mx-auto mt-5 max-w-6xl"><div className="mb-4 flex flex-col items-start gap-3 min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between"><p className="text-sm text-slate-400">{folders.length} folders · {videos.filter((video) => video.kind === 'video').length} videos</p><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="rounded-lg bg-[#1a252f] px-3 py-2 text-sm"><option value="name">Name</option><option value="date">Recently added</option></select></div>{filteredFolders.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filteredFolders.map((folder) => <article key={folder.path} className="flex items-center gap-4 rounded-2xl border border-white/5 bg-[#1a252f] p-4"><button onClick={() => openFolder(folder)} className="flex min-w-0 flex-1 items-center gap-4 text-left"><div className="relative flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#33404c]">{folder.videos[0]?.thumbnail ? <img src={folder.videos[0].thumbnail} alt="" className="h-full w-full object-cover" /> : <Folder className="h-9 w-9 fill-slate-400/20 text-slate-400" />}{folder.videos.some((video) => Date.now() - video.lastModified < 86400000) && <span className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-2 py-1 text-[10px] font-bold">NEW</span>}</div><span className="min-w-0 flex-1"><strong className="block truncate">{folder.name}</strong><span className="mt-1 block text-sm text-slate-400">{folder.videos.length} videos</span></span><ChevronRight className="h-5 w-5 shrink-0 text-slate-500" /></button><button onClick={() => addFolderToPlaylist(folder)} className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-sky-300" title="Add folder videos to playlist" aria-label={`Add ${folder.name} to playlist`}><Plus className="h-4 w-4" /></button></article>)}</div> : videos.length === 0 ? <div className="mt-8 rounded-3xl border border-white/5 bg-[#1a252f] px-6 py-12 text-center"><FolderOpen className="mx-auto h-12 w-12 text-slate-500" /><h2 className="mt-4 text-lg font-bold">{isImporting ? 'Preparing your library…' : 'Choose local videos'}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">Select a folder or files. Browsers only expose items you explicitly choose; after reload, you’ll need to grant access again.</p><button onClick={() => void importFolder()} disabled={isImporting} className="mt-5 whitespace-nowrap rounded-xl bg-sky-500 px-3 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50"><FolderOpen className="mr-1 inline h-4 w-4" />Select folder</button></div> : <p className="rounded-2xl bg-[#1a252f] p-8 text-center text-slate-400">No folders match that search.</p>}{search.trim() && rootVideoMatches.length > 0 && <div className="mt-8"><h2 className="mb-3 text-sm font-semibold text-slate-300">Matching videos</h2><div className={grid ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4' : 'space-y-2'}>{rootVideoMatches.map(videoCard)}</div></div>}</section>;
  };

  return <main className="min-h-screen bg-[#111b24] pb-24 text-white">{header}<div className="mx-auto max-w-6xl px-4 pb-8 sm:px-7">{notice && <div role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100"><AudioLines className="h-4 w-4 shrink-0" /><span className="flex-1">{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss"><X className="h-4 w-4" /></button></div>}{mainContent()}</div></main>;
};

export { VideoLibrary as VideoFolderBrowser };
