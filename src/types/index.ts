export type MediaType = 'movie' | 'series' | 'livetv' | 'local';

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
  description: string;
  type: MediaType;
  category: string;
  videoUrl: string;
  posterUrl: string;
  backdropUrl: string;
  duration: number; // in seconds (0 for live)
  releaseYear: number;
  rating: number; // e.g. 8.7
  genres: string[];
  isLive?: boolean;
  streamType?: 'hls' | 'mp4' | 'dash' | 'webm' | 'blob';
  subtitles?: SubtitleTrack[];
  seasons?: {
    seasonNumber: number;
    title: string;
    episodes: Episode[];
  }[];
  // Live channel extra info
  channelNumber?: number;
  currentProgram?: string;
  nextProgram?: string;
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
  posterUrl: string;
  watchedAt: number;
  currentTime: number;
  duration: number;
  percentage: number;
  episodeTitle?: string;
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
