import React, { useEffect, useState, ChangeEvent } from 'react';
import { FolderOpen, Play, Search, Grid, List, ArrowLeft, Music, Share2, Settings, Video } from 'lucide-react';

export type VideoFile = {
  file: File;
  url: string;
  name: string;
  thumbnail?: string; // optional preview image data URL
  lastModified?: number;
};

type Folder = {
  name: string;
  videos: VideoFile[];
};

/**
 * Helper to generate a thumbnail data URL for a video file.
 * It creates a hidden video element, seeks to 0.5s (or 0 if not possible),
 * draws the frame onto a canvas and returns the data URL.
 */
const generateThumbnail = (file: File): Promise<string | undefined> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.src = URL.createObjectURL(file);
    const capture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL('image/png');
      URL.revokeObjectURL(video.src);
      resolve(data);
    };
    video.addEventListener('loadeddata', () => {
      if (video.duration > 0.5) video.currentTime = 0.5;
      else video.currentTime = 0;
    });
    video.addEventListener('seeked', capture);
    video.addEventListener('error', () => {
      URL.revokeObjectURL(video.src);
      resolve(undefined);
    });
  });
};

/**
 * VideoLibrary component lets the user pick a folder (via the webkitdirectory
 * attribute) and displays the contained videos. It stores a lightweight snapshot
 * of the folder structure in localStorage so the UI is restored on reload. The
 * actual File objects cannot survive a page reload, so on a reload the user has
 * to re‑select the folder – this mirrors the limitation of browsers.
 */
export const VideoLibrary: React.FC<{ onSelect: (video: VideoFile) => void }> = ({ onSelect }) => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [gridView, setGridView] = useState(true);
  const [sortOption, setSortOption] = useState<'name' | 'date'>('name');

  // Load saved snapshot from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('giplayer-last-folder');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Folder[];
        setFolders(parsed);
      } catch (_) {}
    }
  }, []);

  // After folders are loaded, restore last opened folder if any
  useEffect(() => {
    if (folders.length === 0) return;
    const last = localStorage.getItem('giplayer-last-opened-folder');
    if (last) {
      try {
        const parsed = JSON.parse(last) as { name: string };
        const match = folders.find((f) => f.name === parsed.name);
        if (match) setSelectedFolder(match);
      } catch (_) {}
    }
  }, [folders]);

  const handleFolderSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const videoExt = ['mp4', 'webm', 'mov', 'mkv', 'avi', 'mp3', 'wav', 'flac'];
    const map = new Map<string, VideoFile[]>();
    const tempVideos: { folder: string; video: VideoFile }[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext || !videoExt.includes(ext)) continue;
      const pathParts = (file as any).webkitRelativePath?.split('/') ?? [];
      const folderName = pathParts.length > 1 ? pathParts[pathParts.length - 2] : 'Root';
      const url = URL.createObjectURL(file);
      const video: VideoFile = { file, url, name: file.name, lastModified: file.lastModified };
      tempVideos.push({ folder: folderName, video });
      const arr = map.get(folderName) ?? [];
      arr.push(video);
      map.set(folderName, arr);
    }
    // Generate thumbnails in parallel (best‑effort)
    await Promise.all(
      tempVideos.map(async ({ video }) => {
        const thumb = await generateThumbnail(video.file);
        if (thumb) video.thumbnail = thumb;
      })
    );
    const newFolders: Folder[] = Array.from(map.entries()).map(([name, videos]) => ({ name, videos }));
    setFolders(newFolders);
    localStorage.setItem('giplayer-last-folder', JSON.stringify(newFolders));
  };

  const handleFolderClick = (folder: Folder) => {
    setSelectedFolder(folder);
    localStorage.setItem('giplayer-last-opened-folder', JSON.stringify({ name: folder.name }));
  };

  const handleBack = () => {
    if (selectedFolder) {
      setSelectedFolder(null);
    } else {
      setFolders([]);
      localStorage.removeItem('giplayer-last-folder');
      localStorage.removeItem('giplayer-last-opened-folder');
    }
  };

  const sortVideos = (videos: VideoFile[]) => {
    if (sortOption === 'name') {
      return [...videos].sort((a, b) => a.name.localeCompare(b.name));
    }
    return [...videos].sort((a, b) => (b.lastModified ?? 0) - (a.lastModified ?? 0));
  };

  const filteredFolders = folders.filter((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const renderVideoItem = (video: VideoFile) => (
    <button
      key={video.url}
      onClick={() => onSelect(video)}
      className="flex flex-col items-center gap-1 bg-gray-800 hover:bg-gray-700 p-2 rounded"
    >
      {video.thumbnail ? (
        <img src={video.thumbnail} alt={video.name} className="w-full h-24 object-cover rounded" />
      ) : (
        <Play className="w-8 h-8" />
      )}
      <span className="truncate text-sm" title={video.name}>{video.name}</span>
      {video.lastModified && Date.now() - video.lastModified < 24 * 60 * 60 * 1000 && (
        <span className="text-xs text-blue-400">New</span>
      )}
    </button>
  );

  const renderFolderList = () => (
    <div>
      {filteredFolders.map((folder) => (
        <div key={folder.name} className="mb-6">
          <h2 className="text-lg font-semibold mb-2 flex items-center cursor-pointer" onClick={() => handleFolderClick(folder)}>
            <FolderOpen className="w-4 h-4 mr-1" />
            {folder.name} ({folder.videos.length})
          </h2>
          <div className={gridView ? 'grid grid-cols-2 md:grid-cols-4 gap-2' : 'space-y-2'}>
            {sortVideos(folder.videos).map(renderVideoItem)}
          </div>
        </div>
      ))}
    </div>
  );

  const renderSelectedFolder = () => {
    if (!selectedFolder) return null;
    return (
      <div>
        <div className="flex items-center mb-4">
          <button onClick={handleBack} className="p-2 hover:text-blue-400">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold flex-1">{selectedFolder.name}</h2>
          <button onClick={() => setGridView(!gridView)} className="p-2 hover:text-blue-400">
            {gridView ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
          </button>
        </div>
        <div className={gridView ? 'grid grid-cols-2 md:grid-cols-4 gap-2' : 'space-y-2'}>
          {sortVideos(selectedFolder.videos).map(renderVideoItem)}
        </div>
        {/* Floating Play‑All button */}
        <button
          onClick={() => {
            if (selectedFolder.videos.length) onSelect(selectedFolder.videos[0]);
          }}
          className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full p-4 shadow-lg"
          title="Play All"
        >
          <Play className="w-6 h-6" />
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header quick‑access */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">GIPlayer Library</h1>
        <div className="flex gap-2">
          <button className="p-2 hover:text-blue-400" title="Music"><Music className="w-5 h-5" /></button>
          <button className="p-2 hover:text-blue-400" title="Privacy"><Settings className="w-5 h-5" /></button>
          <button className="p-2 hover:text-blue-400" title="Share"><Share2 className="w-5 h-5" /></button>
          <button className="p-2 hover:text-blue-400" title="Playlists"><Video className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button onClick={handleBack} className="p-2 hover:text-blue-400"><ArrowLeft className="w-5 h-5" /></button>
        <label className="flex items-center gap-2 cursor-pointer bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded">
          <FolderOpen className="w-5 h-5" />
          <span>Select Folder</span>
          {/* @ts-ignore */}
          <input type="file" webkitdirectory multiple onChange={handleFolderSelect} className="hidden" />
        </label>
        <div className="flex-1">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search folders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-2 py-1 rounded bg-gray-800 focus:outline-none"
            />
          </div>
        </div>
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value as any)}
          className="bg-gray-800 text-white rounded p-1"
        >
          <option value="name">Sort by Name</option>
          <option value="date">Sort by Date Added</option>
        </select>
        <button onClick={() => setGridView(!gridView)} className="p-2 hover:text-blue-400">
          {gridView ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
        </button>
      </div>

      {selectedFolder ? renderSelectedFolder() : renderFolderList()}
    </div>
  );
};
