import { MediaItem, MediaFolder } from '../types';
import { storage } from './storage';

const VIDEO_EXTENSIONS = new Set(['mp4', 'mkv', 'webm', 'avi', 'mov', 'm4v', 'ts', '3gp', 'ogv', 'flv']);
const AUDIO_EXTENSIONS = new Set(['mp3', 'm4a', 'wav', 'flac', 'aac', 'ogg', 'opus', 'wma', 'weba']);

export const DEFAULT_STREAMS: MediaItem[] = [
  {
    id: 'stream-hls-sample',
    title: 'Sample HLS Live Test Stream',
    description: 'High-performance Big Buck Bunny HLS adaptive bitrate stream for testing player gestures and audio.',
    type: 'stream',
    mediaKind: 'stream',
    category: 'Test Stream',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    duration: 596,
    releaseYear: 2024,
    rating: 9.0,
    genres: ['HLS', 'Test', 'Direct Stream'],
    streamType: 'mp4',
    isLive: false,
    folderPath: 'Online Streams',
    dateAdded: Date.now(),
  },
  {
    id: 'stream-audio-sample',
    title: 'Lo-Fi Ambient Chill Audio Stream',
    description: 'High-fidelity audio stream demonstration for the music visualizer and 200% volume booster.',
    type: 'audio',
    mediaKind: 'audio',
    category: 'Audio Demo',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    duration: 15,
    releaseYear: 2024,
    rating: 9.2,
    genres: ['Music', 'Audio', 'Lo-Fi'],
    streamType: 'mp4',
    isLive: false,
    folderPath: 'Online Audio',
    dateAdded: Date.now(),
  }
];

class LocalMediaService {
  private activeBlobUrls = new Map<string, string>();

  // Detect file media type
  getMediaKind(file: File): 'video' | 'audio' | 'unknown' {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (VIDEO_EXTENSIONS.has(ext) || file.type.startsWith('video/')) return 'video';
    if (AUDIO_EXTENSIONS.has(ext) || file.type.startsWith('audio/')) return 'audio';
    return 'unknown';
  }

  // Parse Folder Path from webkitRelativePath or default to 'Main Folder'
  extractFolderPath(file: File): string {
    if (file.webkitRelativePath) {
      const parts = file.webkitRelativePath.split('/');
      if (parts.length > 1) {
        return parts.slice(0, parts.length - 1).join('/');
      }
    }
    return 'Root / Single Files';
  }

  // Clean title without file extension
  cleanTitle(fileName: string): string {
    return fileName.replace(/\.[^/.]+$/, '').replace(/[_.-]+/g, ' ').trim();
  }

  // Import files selected by user
  processFiles(files: FileList | File[]): MediaItem[] {
    const fileArray = Array.from(files);
    const imported: MediaItem[] = [];

    for (const file of fileArray) {
      const kind = this.getMediaKind(file);
      if (kind === 'unknown') continue;

      const blobUrl = URL.createObjectURL(file);
      const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      this.activeBlobUrls.set(id, blobUrl);

      const title = this.cleanTitle(file.name);
      const folderPath = this.extractFolderPath(file);

      const item: MediaItem = {
        id,
        title,
        fileName: file.name,
        fileSize: file.size,
        fileMimeType: file.type || `${kind}/*`,
        type: 'local',
        mediaKind: kind,
        category: kind === 'video' ? 'Local Video' : 'Local Music',
        videoUrl: blobUrl,
        duration: 0, // determined on load
        folderPath,
        dateAdded: Date.now(),
        lastModified: file.lastModified,
        streamType: 'blob',
        genres: [kind.toUpperCase(), folderPath.split('/').pop() || 'Media'],
      };

      storage.addToCustomLibrary(item);
      imported.push(item);
    }

    return imported;
  }

  // Get all media items (custom imported + active streams)
  getAllMedia(): MediaItem[] {
    const saved = storage.getCustomLibrary();
    if (saved.length === 0) {
      return DEFAULT_STREAMS;
    }
    return saved;
  }

  // Get only videos
  getVideos(): MediaItem[] {
    return this.getAllMedia().filter((m) => m.mediaKind === 'video');
  }

  // Get only audio / music tracks
  getAudio(): MediaItem[] { return this.getAudioTracks(); }

  getAudioTracks(): MediaItem[] { return this.getAllMedia().filter((m) => m.mediaKind === 'audio'); }

  // Get only network streams
  getStreams(): MediaItem[] {
    return this.getAllMedia().filter((m) => m.type === 'stream');
  }

  // Group media by folders
  getFolders(): MediaFolder[] {
    const all = this.getAllMedia();
    const folderMap = new Map<string, MediaItem[]>();

    for (const item of all) {
      const folder = item.folderPath || 'Uncategorized';
      if (!folderMap.has(folder)) {
        folderMap.set(folder, []);
      }
      folderMap.get(folder)!.push(item);
    }

    const folders: MediaFolder[] = [];
    for (const [path, items] of folderMap.entries()) {
      const videoCount = items.filter((i) => i.mediaKind === 'video').length;
      const audioCount = items.filter((i) => i.mediaKind === 'audio').length;
      const totalSize = items.reduce((acc, curr) => acc + (curr.fileSize || 0), 0);
      const name = path.split('/').pop() || path;

      folders.push({
        path,
        name,
        videoCount,
        audioCount,
        totalSize,
        items,
      });
    }

    // Sort folders alphabetically
    return folders.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Add custom URL stream
  addStream(url: string, title?: string): MediaItem {
    const cleanUrl = url.trim();
    const isHls = cleanUrl.includes('.m3u8');
    const isAudio = cleanUrl.endsWith('.mp3') || cleanUrl.endsWith('.aac') || cleanUrl.endsWith('.ogg');
    const cleanTitle = title?.trim() || cleanUrl.split('/').pop()?.split('?')[0] || 'Network Stream';

    const newItem: MediaItem = {
      id: `stream-${Date.now()}`,
      title: cleanTitle,
      description: `Stream played from ${new URL(cleanUrl).hostname}`,
      type: 'stream',
      mediaKind: isAudio ? 'audio' : 'stream',
      category: 'Network Stream',
      videoUrl: cleanUrl,
      duration: 0,
      folderPath: 'Custom Streams',
      dateAdded: Date.now(),
      genres: [isHls ? 'HLS' : 'Stream', isAudio ? 'Audio' : 'Video'],
      streamType: isHls ? 'hls' : 'mp4',
    };

    storage.addToCustomLibrary(newItem);
    return newItem;
  }
}

export const localMedia = new LocalMediaService();
