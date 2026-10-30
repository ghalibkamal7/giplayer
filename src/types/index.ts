export type MediaType = 'video' | 'audio' | 'stream' | 'local' | 'movie' | 'series' | 'livetv';

export interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
  src: string;
  default?: boolean;
}

export interface Episode {
  id: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  overview: string;
  duration: number; // in seconds
  videoUrl: string;
  thumbnailUrl: string;
  subtitles?: SubtitleTrack[];
}

export interface MediaItem {
  id: string;
  title: string;
  description?: string;
  type: MediaType;
  mediaKind: 'video' | 'audio' | 'stream';
  category?: string;
  videoUrl: string;
  posterUrl?: string;
  backdropUrl?: string;
  duration: number; // in seconds
  fileSize?: number; // in bytes
  fileName?: string;
  folderPath?: string;
  fileMimeType?: string;
  dateAdded?: number;
  lastModified?: number;
  releaseYear?: number;
  rating?: number;
  genres?: string[];
  isLive?: boolean;
  streamType?: 'hls' | 'mp4' | 'dash' | 'webm' | 'blob';
  subtitles?: SubtitleTrack[];
  seasons?: {
    seasonNumber: number;
    title: string;
    episodes: Episode[];
  }[];
  channelNumber?: number;
  currentProgram?: string;
  nextProgram?: string;
}

export interface MediaFolder {
  path: string;
  name: string;
  videoCount: number;
  audioCount: number;
  totalSize: number;
  items: MediaItem[];
}

export interface PlaybackProgress {
  mediaId: string;
  currentTime: number;
  duration: number;
  percentage: number;
  lastUpdated: number; // timestamp
  completed: boolean;
  episodeId?: string;
  mediaItem?: MediaItem;
}

export interface WatchHistoryItem {
  mediaId: string;
  title: string;
  type: MediaType;
  posterUrl?: string;
  watchedAt: number;
  currentTime: number;
  duration: number;
  percentage: number;
  episodeTitle?: string;
  mediaKind?: 'video' | 'audio' | 'stream';
}

export type AspectRatioMode = 'contain' | 'cover' | 'fill' | '16:9' | '4:3';

export interface UserPreferences {
  volume: number;
  isMuted: boolean;
  playbackSpeed: number;
  autoPlayNext: boolean;
  doubleTapSeekSeconds: number; // 5, 10, 15, 30
  gesturesEnabled: boolean;
  brightnessGesture: boolean;
  volumeGesture: boolean;
  seekGesture: boolean;
  aspectRatio: AspectRatioMode;
  audioBoost: number; // 1.0 to 2.0
  // Subtitle customizer
  subtitleSize: 'sm' | 'base' | 'lg' | 'xl';
  subtitleColor: string; // hex
  subtitleBg: 'transparent' | 'semi-dark' | 'solid-black';
  subtitleOffset: number; // in seconds
  // Theme
  themeAccent: 'blue' | 'purple' | 'cyan' | 'emerald' | 'amber';
  hardwareAcceleration: boolean;
  audioLanguagePreference?: string;
  subtitleLanguagePreference?: string;
}

export interface PlayerGestureState {
  type: 'none' | 'brightness' | 'volume' | 'seek';
  value: number; // percentage or seconds
  displayValue: string;
}
