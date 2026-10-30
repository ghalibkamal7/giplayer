import React, { useEffect, useState, ChangeEvent } from 'react';
import { FolderOpen, Play, Search, Grid, List, ArrowLeft } from 'lucide-react';

export type VideoFile = {
  file: File;
  url: string;
  name: string;
  thumbnail?: string; // optional preview image data URL
};

type Folder = {
  name: string;
  videos: VideoFile[];
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
  const [searchTerm, setSearchTerm] = useState('');
  const [gridView, setGridView] = useState(true);

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

  const handleFolderSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const videoExt = ['mp4', 'webm', 'mov', 'mkv', 'avi', 'mp3', 'wav', 'flac'];
    const map = new Map<string, VideoFile[]>();
    Array.from(files).forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext || !videoExt.includes(ext)) return;
      const pathParts = (file as any).webkitRelativePath?.split('/') ?? [];
      const folderName = pathParts.length > 1 ? pathParts[pathParts.length - 2] : 'Root';
      const url = URL.createObjectURL(file);
      const video: VideoFile = { file, url, name: file.name };
      const arr = map.get(folderName) ?? [];
      arr.push(video);
      map.set(folderName, arr);
    });
    const newFolders: Folder[] = Array.from(map.entries()).map(([name, videos]) => ({ name, videos }));
    setFolders(newFolders);
    localStorage.setItem('giplayer-last-folder', JSON.stringify(newFolders));
  };

  const filteredFolders = folders.filter((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleBack = () => {
    setFolders([]);
    localStorage.removeItem('giplayer-last-folder');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={handleBack} className="p-2 hover:text-blue-400">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold flex-1">GIPlayer Library</h1>
        <button onClick={() => setGridView(!gridView)} className="p-2 hover:text-blue-400">
          {gridView ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
        </button>
      </div>
      <div className="flex items-center gap-2 mb-4">
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
      </div>
      {filteredFolders.map((folder) => (
        <div key={folder.name} className="mb-6">
          <h2 className="text-lg font-semibold mb-2 flex items-center">
            <FolderOpen className="w-4 h-4 mr-1" />
            {folder.name} ({folder.videos.length})
          </h2>
          <div className={gridView ? 'grid grid-cols-2 md:grid-cols-4 gap-2' : 'space-y-2'}>
            {folder.videos.map((video) => (
              <button
                key={video.url}
                onClick={() => onSelect(video)}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 p-2 rounded"
              >
                <Play className="w-5 h-5" />
                <span className="truncate">{video.name}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
