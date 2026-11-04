import { ChangeEvent, PointerEvent, TouchEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  ArrowLeft, ChevronDown, Lock, Maximize, Minimize, Music2, Ratio, RotateCw,
  Pause, Play, SkipBack, SkipForward, Subtitles, Sun, Volume2, VolumeX, X,
} from 'lucide-react';
import MoreOptionsMenu, { AspectRatioChoice, AudioTrack, PanelName, PlayerVideo } from './MoreOptionsMenu';
import { getPlayerPreference, SavedPlaylist, setPlayerPreference } from '../../services/playerLibrary';
import { getAudioCodecSupport, inspectMediaFile } from '../../services/mediaMetadata';
import type { ParsedAudioTrack, ParsedMediaMetadata } from '../../services/mediaMetadata';

type Props = {
  video: PlayerVideo;
  queue?: PlayerVideo[];
  library?: PlayerVideo[];
  onBack: () => void;
  onChangeVideo?: (video: PlayerVideo, queue?: PlayerVideo[]) => void;
};

type SubtitleCue = { start: number; end: number; text: string };
type AudioTrackList = EventTarget & { length: number; [index: number]: { id: string; label?: string; language?: string; enabled: boolean } };
type VideoWithAudioTracks = HTMLVideoElement & { audioTracks?: AudioTrackList };
type PlayerAudioTrack = AudioTrack;
type TouchGesture = 'pending' | 'seek' | 'volume' | 'brightness';
type TouchOrigin = {
  x: number;
  y: number;
  time: number;
  startTime: number;
  startVolume: number;
  startBrightness: number;
  moved: boolean;
  gesture: TouchGesture;
  seekTarget: number;
  volumeTarget: number;
};
const ASPECT_RATIOS: AspectRatioChoice[] = ['Fit', 'Fill', 'Stretch', 'Crop', 'Original', '16:9', '4:3'];

function displayLanguage(language?: string): string | undefined {
  if (!language) return undefined;
  try {
    return new Intl.DisplayNames([navigator.language], { type: 'language' }).of(language) || language;
  } catch {
    return language;
  }
}

function trackPreferenceKey(track: Pick<PlayerAudioTrack, 'id' | 'language' | 'label' | 'codec' | 'channels'>): string {
  return [track.language, track.label, track.codec, track.channels, track.id].map((value) => value?.trim().toLowerCase() ?? '').join('|');
}

function metadataTrack(track: ParsedAudioTrack, index: number, selectable: boolean, enabled: boolean): PlayerAudioTrack {
  return {
    id: `metadata-${index}`,
    label: track.title || displayLanguage(track.language) || `Audio ${index + 1}`,
    language: displayLanguage(track.language),
    codec: track.codec || undefined,
    channels: track.channels || undefined,
    sampleRate: track.sampleRate || undefined,
    isDefault: track.isDefault,
    support: track.support,
    enabled,
    selectable,
  };
}

function probeAudioCodec(codec?: string): ParsedAudioTrack['support'] {
  if (!codec) return 'unknown';
  const probe = document.createElement('audio');
  return getAudioCodecSupport(codec, (mimeType) => probe.canPlayType(mimeType));
}

function resolveAudioTracks(video: HTMLVideoElement | null, hls: Hls | null, metadata: ParsedMediaMetadata | null): PlayerAudioTrack[] {
  if (hls?.audioTracks.length) {
    return hls.audioTracks.map((track, index) => {
      const parsed = metadata?.audioTracks[index];
      const language = track.lang || parsed?.language;
      return {
        id: `hls-${track.id}`,
        label: track.name || parsed?.title || displayLanguage(language) || `Audio ${index + 1}`,
        language: displayLanguage(language),
        codec: track.audioCodec || parsed?.codec,
        channels: track.channels || parsed?.channels,
        sampleRate: parsed?.sampleRate,
        isDefault: track.default,
        support: parsed?.support ?? probeAudioCodec(track.audioCodec),
        enabled: hls.audioTrack === track.id || (hls.audioTrack < 0 && track.default),
        selectable: true,
      };
    });
  }
  const nativeTracks = (video as VideoWithAudioTracks | null)?.audioTracks;
  if (nativeTracks?.length) {
    const count = Math.max(nativeTracks.length, metadata?.audioTracks.length ?? 0);
    return Array.from({ length: count }, (_, index) => {
      const track = index < nativeTracks.length ? nativeTracks[index] : undefined;
      const parsed = metadata?.audioTracks[index];
      if (!track && parsed) return metadataTrack(parsed, index, false, false);
      if (!track) return null;
      const language = track.language || parsed?.language;
      return {
        id: `native-${track.id}`,
        label: track.label || parsed?.title || displayLanguage(language) || `Audio ${index + 1}`,
        language: displayLanguage(language),
        codec: parsed?.codec,
        channels: parsed?.channels,
        sampleRate: parsed?.sampleRate,
        isDefault: parsed?.isDefault,
        support: parsed?.support,
        enabled: track.enabled,
        selectable: true,
      };
    }).filter((track): track is PlayerAudioTrack => track !== null);
  }
  return metadata?.audioTracks.map((track, index) => metadataTrack(track, index, false, false)) ?? [];
}

function timestamp(value: number): string {
  if (!Number.isFinite(value)) return '00:00';
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = Math.floor(value % 60);
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function VideoPlayerControls({
  visible, locked, currentTime, duration, buffered, playing, muted, volume, aspectRatio, isFullscreen,
  onSeek, onLock, onPrevious, onTogglePlay, onNext, onAspectRatio, onFullscreen, onToggleMute, onVolume,
}: {
  visible: boolean;
  locked: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  playing: boolean;
  muted: boolean;
  volume: number;
  aspectRatio: AspectRatioChoice;
  isFullscreen: boolean;
  onSeek: (time: number) => void;
  onLock: () => void;
  onPrevious: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onAspectRatio: () => void;
  onFullscreen: () => void;
  onToggleMute: () => void;
  onVolume: (volume: number) => void;
}) {
  const playedPercent = duration ? currentTime / duration * 100 : 0;
  const bufferedPercent = duration ? buffered / duration * 100 : 0;
  return <footer className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/95 via-black/55 to-transparent px-3 pb-[max(.8rem,env(safe-area-inset-bottom))] pt-12 transition-opacity duration-200 sm:px-6 sm:pb-[max(1rem,env(safe-area-inset-bottom))] ${visible && !locked ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
    <div className="mx-auto mb-2 flex max-w-xl items-center gap-3">
      <button onClick={onToggleMute} aria-label={muted ? 'Unmute video' : 'Mute video'} title={muted ? 'Unmute video' : 'Mute video'} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/75 transition hover:bg-white/10 hover:text-white">{muted || volume === 0 ? <VolumeX className="h-[18px] w-[18px]" /> : <Volume2 className="h-[18px] w-[18px]" />}</button>
      <input aria-label="Video volume" title={`Volume ${Math.round((muted ? 0 : volume) * 100)}%`} className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full accent-sky-300" type="range" min="0" max="1" step="0.01" value={muted ? 0 : volume} onChange={(event) => onVolume(Number(event.target.value))} />
      <span className="w-10 text-right text-xs tabular-nums text-white/65">{muted ? 'Muted' : `${Math.round(volume * 100)}%`}</span>
    </div>
    <div className="mb-3 flex items-center gap-2 text-[11px] tabular-nums text-white/75 sm:gap-3 sm:text-xs"><span>{timestamp(currentTime)}</span><input aria-label="Seek video" className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full accent-sky-300" type="range" min="0" max={duration || 0} step="0.1" value={currentTime} onChange={(event: ChangeEvent<HTMLInputElement>) => onSeek(Number(event.target.value))} style={{ background: `linear-gradient(to right,#7dd3fc ${playedPercent}%,#ffffff70 ${playedPercent}%,#ffffff70 ${bufferedPercent}%,#ffffff35 ${bufferedPercent}%)` }} /><span>{timestamp(duration)}</span></div>
    <div className="mx-auto flex max-w-xl items-center justify-between gap-0.5 sm:gap-2">
      <button onClick={onLock} aria-label="Lock controls" title="Lock controls" className="flex h-11 w-11 items-center justify-center rounded-full text-white/75 transition hover:bg-white/10 hover:text-white"><Lock className="h-[18px] w-[18px]" /></button>
      <button onClick={onPrevious} aria-label="Previous video" className="flex h-11 w-11 items-center justify-center rounded-full text-white/75 transition hover:bg-white/10 hover:text-white"><SkipBack className="h-5 w-5 fill-current" /></button>
      <button onClick={onTogglePlay} aria-label={playing ? 'Pause' : 'Play'} className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-95">{playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}</button>
      <button onClick={onNext} aria-label="Next video" className="flex h-11 w-11 items-center justify-center rounded-full text-white/75 transition hover:bg-white/10 hover:text-white"><SkipForward className="h-5 w-5 fill-current" /></button>
      <button onClick={onAspectRatio} aria-label={`Aspect ratio ${aspectRatio}`} title={`Aspect ratio: ${aspectRatio}`} className="hidden min-h-11 items-center gap-1 rounded-full px-2.5 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white min-[390px]:flex"><Ratio className="h-[18px] w-[18px]" /><span>{aspectRatio}</span></button>
      <button onClick={onFullscreen} aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} className="flex h-11 w-11 items-center justify-center rounded-full text-white/75 transition hover:bg-white/10 hover:text-white">{isFullscreen ? <Minimize className="h-[18px] w-[18px]" /> : <Maximize className="h-[18px] w-[18px]" />}</button>
    </div>
  </footer>;
}

function parseSubtitles(text: string): SubtitleCue[] {
  const lines = text.replace(/\r/g, '').split('\n');
  const cues: SubtitleCue[] = [];
  const toSeconds = (value: string) => {
    const parts = value.trim().replace(',', '.').split(':').map(Number);
    if (parts.some((part) => !Number.isFinite(part))) return 0;
    return parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
  };
  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].includes('-->')) continue;
    const [start, end] = lines[index].split('-->');
    const body: string[] = [];
    for (index += 1; index < lines.length && lines[index].trim(); index += 1) body.push(lines[index].trim());
    if (body.length) cues.push({ start: toSeconds(start), end: toSeconds(end.split(/\s/)[0]), text: body.join('\n') });
  }
  return cues;
}

const AdvancedPlayer = ({ video, queue = [], library = queue, onBack, onChangeVideo }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const currentVideoId = useRef(video.id);
  currentVideoId.current = video.id;
  const isMounted = useRef(true);
  const mediaMetadataCache = useRef(new Map<string, ParsedMediaMetadata>());
  const metadataLoading = useRef(new Set<string>());
  const metadataTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const touchTimer = useRef<number | null>(null);
  const temporarySpeed = useRef<number | null>(null);
  const touchOrigin = useRef<TouchOrigin | null>(null);
  const lastTap = useRef<{ x: number; time: number } | null>(null);
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);
  const equalizer = useRef<{ context: AudioContext; source: MediaElementAudioSourceNode; filters: BiquadFilterNode[]; connected: boolean } | null>(null);
  const lastPositionSave = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [locked, setLocked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPanel, setMenuPanel] = useState<PanelName | null>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0);
  const [buffered, setBuffered] = useState(0);
  const [audioTracks, setAudioTracks] = useState<PlayerAudioTrack[]>([]);
  const [mediaMetadata, setMediaMetadata] = useState<ParsedMediaMetadata | null>(null);
  const [metadataStatus, setMetadataStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [metadataError, setMetadataError] = useState('');
  const [audioDiagnostic, setAudioDiagnostic] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [speed, setSpeed] = useState(1);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioChoice>('Fit');
  const [brightness, setBrightness] = useState(1);
  const [displayEnabled, setDisplayEnabled] = useState(() => getPlayerPreference('giplayer-video-display', 'true') !== 'false');
  const [shortcutsEnabled, setShortcutsEnabled] = useState(() => getPlayerPreference('giplayer-shortcuts', 'true') !== 'false');
  const [subtitleEnabled, setSubtitleEnabled] = useState(false);
  const [subtitleName, setSubtitleName] = useState<string | null>(null);
  const [subtitleOffset, setSubtitleOffset] = useState(0);
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);
  const [subtitleStyle, setSubtitleStyle] = useState(() => ({
    size: Number(getPlayerPreference('giplayer-subtitle-size', '24')),
    color: getPlayerPreference('giplayer-subtitle-color', '#ffffff'),
  }));
  const [subtitleTime, setSubtitleTime] = useState(0);
  const [keepAwake, setKeepAwake] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [sleepMinutes, setSleepMinutes] = useState<number | null>(null);
  const [sleepSeconds, setSleepSeconds] = useState<number | null>(null);
  const [volume, setVolume] = useState(() => {
    const saved = Number(getPlayerPreference('giplayer-player-volume', '1'));
    return Number.isFinite(saved) && saved > 0 ? Math.min(1, Math.max(0, saved)) : 1;
  });
  const [muted, setMuted] = useState(false);
  const [gestureFeedback, setGestureFeedback] = useState<{ kind: 'volume' | 'brightness'; value: number } | null>(null);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [toast, setToast] = useState('');
  const queueIndex = queue.findIndex((entry) => entry.id === video.id);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      const context = equalizer.current?.context;
      equalizer.current = null;
      if (context && context.state !== 'closed') {
        void context.close().catch((error: unknown) => console.warn('Could not close the player audio context cleanly.', error));
      }
    };
  }, []);
  const refreshAudioTracks = useCallback(() => {
    setAudioTracks(resolveAudioTracks(
      videoRef.current,
      hlsRef.current,
      mediaMetadataCache.current.get(currentVideoId.current) ?? null,
    ));
  }, []);
  const analyzeMedia = useCallback(async () => {
    if (!video.file) {
      setMetadataStatus('idle');
      setMetadataError('');
      return;
    }
    const cached = mediaMetadataCache.current.get(video.id);
    if (cached) {
      setMediaMetadata(cached);
      setMetadataStatus('ready');
      setMetadataError('');
      return;
    }
    if (metadataLoading.current.has(video.id)) return;
    const requestedVideoId = video.id;
    metadataLoading.current.add(requestedVideoId);
    setMetadataStatus('loading');
    setMetadataError('');
    try {
      const parsed = await inspectMediaFile(video.file);
      const probe = document.createElement('video');
      const result: ParsedMediaMetadata = {
        ...parsed,
        audioTracks: parsed.audioTracks.map((track) => ({
          ...track,
          support: track.codec
            ? getAudioCodecSupport(track.codec, (mimeType) => probe.canPlayType(mimeType))
            : 'unknown',
        })),
      };
      if (!isMounted.current || currentVideoId.current !== requestedVideoId) return;
      mediaMetadataCache.current.set(requestedVideoId, result);
      setMediaMetadata(result);
      setMetadataStatus('ready');
      const availableTracks = resolveAudioTracks(videoRef.current, hlsRef.current, result);
      setAudioTracks(availableTracks);
      const unsupported = result.audioTracks.filter((track) => track.support === 'unsupported');
      setAudioDiagnostic(result.audioTracks.length === 0 && availableTracks.length === 0
        ? 'No audio stream was detected in this video.'
        : unsupported.length
          ? `The browser does not report support for ${unsupported.map((track) => track.codec).join(', ')} audio. The video may play without sound.`
          : result.audioTracks.length > 1 && !availableTracks.some((track) => track.selectable)
            ? `${result.audioTracks.length} audio tracks were found, but this browser cannot switch embedded tracks in this local file.`
            : '');
    } catch (error) {
      if (!isMounted.current || currentVideoId.current !== requestedVideoId) return;
      console.error('Could not inspect local media metadata.', error);
      setMetadataError('Could not inspect this file’s media metadata. Playback is unchanged; the browser may still expose audio tracks directly.');
      setMetadataStatus('error');
    } finally {
      metadataLoading.current.delete(requestedVideoId);
    }
  }, [video.file, video.id]);
  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    element.volume = volume;
    element.muted = muted || volume === 0;
  }, [volume, muted, video.id]);
  const persistPlayback = useCallback(() => {
    if (video.privateVault) {
      try {
        localStorage.removeItem(`giplayer-playback:${video.id}`);
      } catch (error) {
        console.error('Could not clear private media playback position.', error);
      }
      return;
    }
    const element = videoRef.current;
    if (element && element.duration > 0) setPlayerPreference(`giplayer-playback:${video.id}`, String(element.currentTime));
  }, [video.id, video.privateVault]);
  const ratioStyles = useMemo((): React.CSSProperties => {
    switch (aspectRatio) {
      case 'Fill': return { objectFit: 'cover' };
      case 'Crop': return { objectFit: 'cover', transform: 'scale(1.15)' };
      case 'Stretch': return { objectFit: 'fill' };
      case 'Original': return { objectFit: 'none', maxWidth: '100%', maxHeight: '100%' };
      case '16:9': return { objectFit: 'contain', width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%', aspectRatio: '16 / 9' };
      case '4:3': return { objectFit: 'contain', width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%', aspectRatio: '4 / 3' };
      default: return { objectFit: 'contain' };
    }
  }, [aspectRatio]);

  const showActivity = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    if (playing && !locked && !menuOpen) {
      hideTimer.current = window.setTimeout(() => setControlsVisible(false), 3500);
    }
  }, [playing, locked, menuOpen]);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    let active = true;
    if (metadataTimer.current) window.clearTimeout(metadataTimer.current);
    setLoading(true);
    setError('');
    setTime(0);
    setDuration(video.duration || 0);
    setSubtitleEnabled(false);
    setSubtitleName(null);
    setSubtitleCues([]);
    setAudioTracks([]);
    setMediaMetadata(mediaMetadataCache.current.get(video.id) ?? null);
    setMetadataStatus(mediaMetadataCache.current.has(video.id) ? 'ready' : 'idle');
    setMetadataError('');
    setAudioDiagnostic('');
    lastPositionSave.current = 0;
    hlsRef.current?.destroy();
    hlsRef.current = null;
    element.removeAttribute('src');
    element.muted = false;
    setMuted(false);
    const saved = video.privateVault ? 0 : Number(getPlayerPreference(`giplayer-playback:${video.id}`, '0'));

    if (/\.m3u8(?:$|[?#])/i.test(video.url) && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 60 });
      hlsRef.current = hls;
      const refreshHlsTracks = () => {
        setAudioTracks(resolveAudioTracks(element, hls, mediaMetadataCache.current.get(video.id) ?? null));
      };
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, refreshHlsTracks);
      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, refreshHlsTracks);
      hls.on(Hls.Events.MANIFEST_PARSED, refreshHlsTracks);
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal && active) {
          setLoading(false);
          setError(data.type === Hls.ErrorTypes.NETWORK_ERROR
            ? 'The stream could not be reached. Check the URL and stream access.'
            : 'This HLS stream could not be played by the browser.');
          hls.destroy();
          hlsRef.current = null;
        }
      });
      hls.loadSource(video.url);
      hls.attachMedia(element);
    } else {
      element.src = video.url;
      element.load();
    }

    const refreshNativeTracks = () => refreshAudioTracks();
    element.addEventListener('loadedmetadata', refreshNativeTracks);
    const nativeTrackList = (element as VideoWithAudioTracks).audioTracks;
    nativeTrackList?.addEventListener('addtrack', refreshNativeTracks);
    nativeTrackList?.addEventListener('removetrack', refreshNativeTracks);
    nativeTrackList?.addEventListener('change', refreshNativeTracks);
    const restore = () => {
      if (saved > 5 && saved < (element.duration || Infinity) - 5) element.currentTime = saved;
      setLoading(false);
    };
    element.addEventListener('loadedmetadata', restore, { once: true });
    const onError = () => {
      if (!active) return;
      setLoading(false);
      setError('This browser could not decode the file or reach the stream. Try MP4/H.264, WebM, or a supported HLS URL.');
    };
    element.addEventListener('error', onError);
    return () => {
      active = false;
      element.removeEventListener('error', onError);
      element.removeEventListener('loadedmetadata', refreshNativeTracks);
      nativeTrackList?.removeEventListener('addtrack', refreshNativeTracks);
      nativeTrackList?.removeEventListener('removetrack', refreshNativeTracks);
      nativeTrackList?.removeEventListener('change', refreshNativeTracks);
      if (metadataTimer.current) window.clearTimeout(metadataTimer.current);
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [video.id, video.url, video.privateVault, refreshAudioTracks]);
  useEffect(() => {
    refreshAudioTracks();
  }, [mediaMetadata, refreshAudioTracks]);

  useEffect(() => {
    if (keepAwake && 'wakeLock' in navigator) {
      (navigator as Navigator & { wakeLock: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> } })
        .wakeLock.request('screen').then((lock) => { wakeLock.current = lock; })
        .catch(() => setToast('Screen wake lock is unavailable or was denied by the browser.'));
    } else if (keepAwake) {
      setToast('This browser does not support keeping the screen awake.');
      setKeepAwake(false);
    }
    return () => {
      void wakeLock.current?.release();
      wakeLock.current = null;
    };
  }, [keepAwake]);

  useEffect(() => {
    if (sleepMinutes === null) {
      setSleepSeconds(null);
      return;
    }
    setSleepSeconds(sleepMinutes * 60);
  }, [sleepMinutes]);

  useEffect(() => {
    if (sleepSeconds === null) return;
    if (sleepSeconds <= 0) {
      videoRef.current?.pause();
      setPlaying(false);
      setSleepMinutes(null);
      setToast('Sleep timer paused playback.');
      return;
    }
    const timeout = window.setTimeout(() => setSleepSeconds((value) => value === null ? null : value - 1), 1000);
    return () => window.clearTimeout(timeout);
  }, [sleepSeconds]);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  useEffect(() => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    if (playing && !locked && !menuOpen) {
      hideTimer.current = window.setTimeout(() => setControlsVisible(false), 3500);
    }
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, [playing, locked, menuOpen]);

  useEffect(() => () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    if (touchTimer.current) window.clearTimeout(touchTimer.current);
    hlsRef.current?.destroy();
    void wakeLock.current?.release();
    void equalizer.current?.context.close();
    persistPlayback();
  }, [persistPlayback]);

  const togglePlay = useCallback(() => {
    const element = videoRef.current;
    if (!element) return;
    if (element.paused) {
      void element.play().then(() => setPlaying(true)).catch(() => setError('Playback was blocked. Press play again to start the video.'));
    } else {
      element.pause();
      setPlaying(false);
    }
    showActivity();
  }, [showActivity]);

  const seek = useCallback((target: number) => {
    const element = videoRef.current;
    if (!element) return;
    element.currentTime = Math.max(0, Math.min(Number.isFinite(element.duration) ? element.duration : target, target));
    setTime(element.currentTime);
    showActivity();
  }, [showActivity]);

  const changeSpeed = (next: number) => {
    setSpeed(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
  };

  const changeVolume = (next: number, persist = true) => {
    const safe = Math.min(1, Math.max(0, next));
    if (videoRef.current) {
      videoRef.current.volume = safe;
      videoRef.current.muted = safe === 0;
    }
    setVolume(safe);
    setMuted(safe === 0);
    if (persist && safe > 0) setPlayerPreference('giplayer-player-volume', String(safe));
  };

  const toggleMute = () => {
    if (muted || volume === 0) {
      const restoredVolume = volume > 0 ? volume : Number(getPlayerPreference('giplayer-player-volume', '1')) || 1;
      changeVolume(restoredVolume);
      return;
    }
    setMuted(true);
    if (videoRef.current) videoRef.current.muted = true;
  };

  const handleEnded = () => {
    if (repeat) {
      seek(0);
      void videoRef.current?.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      setPlaying(false);
      playNext();
    }
  };

  const setEqualizerPreset = (preset: string) => {
    const element = videoRef.current;
    if (!element) return;
    const isLocal = video.url.startsWith('blob:') || new URL(video.url, window.location.href).origin === window.location.origin;
    if (!isLocal) {
      setToast('Equalizer is unavailable for remote streams unless the server permits cross-origin audio access.');
      return;
    }
    try {
      if (!equalizer.current) {
        const AudioContextClass = window.AudioContext;
        if (!AudioContextClass) throw new Error('Web Audio is unsupported.');
        const context = new AudioContextClass();
        const source = context.createMediaElementSource(element);
        equalizer.current = { context, source, filters: [], connected: false };
        const low = context.createBiquadFilter();
        low.type = 'lowshelf';
        low.frequency.value = 180;
        const mid = context.createBiquadFilter();
        mid.type = 'peaking';
        mid.frequency.value = 1100;
        mid.Q.value = 0.9;
        const high = context.createBiquadFilter();
        high.type = 'highshelf';
        high.frequency.value = 6000;
        equalizer.current.filters = [low, mid, high];
      }
      const graph = equalizer.current;
      if (!graph.filters.length) throw new Error('Equalizer filters could not be initialized.');
      graph.source.disconnect();
      graph.connected = false;
      graph.source.connect(graph.filters[0]).connect(graph.filters[1]).connect(graph.filters[2]).connect(graph.context.destination);
      graph.connected = true;
      const gains: Record<string, [number, number, number]> = {
        Normal: [0, 0, 0], Voice: [-2, 4, 1], Bass: [6, 0, -2], Treble: [-2, 1, 6],
      };
      graph.filters.forEach((filter, index) => {
        filter.gain.setTargetAtTime(gains[preset]?.[index] ?? 0, graph.context.currentTime, 0.08);
      });
      void graph.context.resume().catch((error: unknown) => {
        console.error('Could not resume the player audio context.', error);
        setToast('The browser could not resume audio processing. Check browser audio permissions and try reloading the video.');
      });
      setToast(`${preset} equalizer enabled.`);
    } catch {
      const graph = equalizer.current;
      if (graph && !graph.connected) {
        try {
          graph.source.disconnect();
          graph.source.connect(graph.context.destination);
          void graph.context.resume().catch((error: unknown) => console.error('Could not resume direct player audio after equalizer setup failed.', error));
        } catch (error) {
          console.error('Could not restore direct audio after equalizer setup failed.', error);
        }
      }
      setToast('Equalizer setup failed. Direct audio output was restored where the browser allows it.');
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (containerRef.current?.requestFullscreen) await containerRef.current.requestFullscreen();
      else throw new Error('Fullscreen is unsupported.');
    } catch { setToast('Fullscreen is not available in this browser context.'); }
  };

  const changeOrientation = async () => {
    const orientationApi = screen.orientation as ScreenOrientation & { lock?: (orientation: 'portrait' | 'landscape') => Promise<void>; unlock?: () => void };
    const next = orientation === 'portrait' ? 'landscape' : 'portrait';
    try {
      if (!orientationApi.lock) throw new Error('Unsupported');
      await orientationApi.lock(next);
      setOrientation(next);
    } catch {
      setToast('Screen rotation is controlled by the device; rotate it or enable auto-rotate in system settings.');
    }
  };

  const loadSubtitle = async (file: File) => {
    if (!/\.(srt|vtt)$/i.test(file.name)) {
      setToast('Choose a .SRT or .VTT subtitle file.');
      return;
    }
    try {
      setSubtitleCues(parseSubtitles(await file.text()));
      setSubtitleName(file.name);
      setSubtitleEnabled(true);
    } catch {
      setToast('The subtitle file could not be read.');
    }
  };

  const subtitleText = subtitleCues.find((cue) => subtitleTime + subtitleOffset >= cue.start && subtitleTime + subtitleOffset <= cue.end)?.text;

  const selectAudioTrack = (id: string, persist = true) => {
    const element = videoRef.current;
    if (!element) return;
    const selected = audioTracks.find((track) => track.id === id);
    if (!selected?.selectable) return;
    if (id.startsWith('hls-') && hlsRef.current) {
      hlsRef.current.audioTrack = Number(id.slice('hls-'.length));
    } else if (id.startsWith('native-')) {
      const tracks = (element as VideoWithAudioTracks).audioTracks;
      if (!tracks) return;
      const nativeId = id.slice('native-'.length);
      for (let index = 0; index < tracks.length; index += 1) tracks[index].enabled = String(tracks[index].id) === nativeId;
    } else return;
    if (persist && !video.privateVault) setPlayerPreference(`giplayer-audio-track:${video.id}`, trackPreferenceKey(selected));
    refreshAudioTracks();
  };
  useEffect(() => {
    if (video.privateVault) return;
    const saved = getPlayerPreference(`giplayer-audio-track:${video.id}`, '');
    if (!saved) return;
    const selected = audioTracks.find((track) => track.selectable && trackPreferenceKey(track) === saved);
    if (selected && !selected.enabled) selectAudioTrack(selected.id, false);
  }, [audioTracks, video.id]);

  const exportClip = async (start: number, end: number): Promise<boolean> => {
    const element = videoRef.current as (HTMLVideoElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream }) | null;
    const capture = element?.captureStream || element?.mozCaptureStream;
    if (!element || !capture || !window.MediaRecorder) return false;
    try {
      const stream = capture.call(element);
      const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
        .find((candidate) => MediaRecorder.isTypeSupported(candidate));
      if (!mimeType) {
        stream.getTracks().forEach((track) => track.stop());
        return false;
      }
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];
      const originalTime = element.currentTime;
      const wasPlaying = !element.paused;
      return await new Promise<boolean>((resolve, reject) => {
        let settled = false;
        const finish = (success: boolean) => {
          if (settled) return;
          settled = true;
          element.removeEventListener('timeupdate', onTime);
          recorder.onstop = null;
          stream.getTracks().forEach((track) => track.stop());
          element.currentTime = originalTime;
          if (wasPlaying) void element.play().catch(() => {});
          if (success && chunks.length) {
            const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${video.name.replace(/\.[^.]+$/, '')}-clip.webm`;
            link.click();
            window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
            resolve(true);
          } else resolve(false);
        };
        const onTime = () => { if (element.currentTime >= end) recorder.stop(); };
        recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
        recorder.onstop = () => finish(true);
        recorder.onerror = () => { finish(false); reject(new Error('Media recording failed.')); };
        element.addEventListener('timeupdate', onTime);
        element.addEventListener('seeked', function startAfterSeek() {
          element.removeEventListener('seeked', startAfterSeek);
          try {
            recorder.start(250);
            void element.play().catch(() => finish(false));
          } catch { finish(false); }
        }, { once: true });
        element.currentTime = start;
      });
    } catch {
      return false;
    }
  };

  const openPlaylist = (playlist: SavedPlaylist) => {
    const ordered = playlist.videoIds
      .map((id) => library.find((entry) => entry.id === id))
      .filter((entry): entry is PlayerVideo => Boolean(entry));
    if (!ordered.length) {
      setToast('Select the playlist’s source folder again to access its local files.');
      return;
    }
    onChangeVideo?.(ordered[0], ordered);
    setMenuOpen(false);
  };

  const playPrevious = () => {
    if (queueIndex > 0) onChangeVideo?.(queue[queueIndex - 1], queue);
    else seek(0);
  };
  const playNext = () => {
    if (queueIndex >= 0 && queueIndex < queue.length - 1) onChangeVideo?.(queue[queueIndex + 1], queue);
    else if (repeat) seek(0);
  };

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (locked || event.touches.length !== 1 || menuOpen) return;
    const touch = event.touches[0];
    const now = Date.now();
    if (lastTap.current && now - lastTap.current.time < 300) {
      const position = lastTap.current.x / (containerRef.current?.clientWidth || window.innerWidth);
      if (position < 0.35) { seek((videoRef.current?.currentTime || 0) - 10); setToast('−10 seconds'); }
      else if (position > 0.65) { seek((videoRef.current?.currentTime || 0) + 10); setToast('+10 seconds'); }
      else togglePlay();
      lastTap.current = null;
      touchOrigin.current = null;
      return;
    }
    lastTap.current = { x: touch.clientX, time: now };
    touchOrigin.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: now,
      startTime: videoRef.current?.currentTime || 0,
      startVolume: volume,
      startBrightness: brightness,
      moved: false,
      gesture: 'pending',
      seekTarget: videoRef.current?.currentTime || 0,
      volumeTarget: volume,
    };
    touchTimer.current = window.setTimeout(() => {
      if (touchOrigin.current && !touchOrigin.current.moved && videoRef.current) {
        temporarySpeed.current = speed;
        videoRef.current.playbackRate = 2;
        setToast('2× playback · release to restore');
      }
    }, 500);
  };

  const onTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchOrigin.current;
    if (!start || !event.touches[0]) return;
    const touch = event.touches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    start.moved = true;
    if (touchTimer.current) window.clearTimeout(touchTimer.current);
    const width = containerRef.current?.clientWidth || window.innerWidth;
    const height = containerRef.current?.clientHeight || window.innerHeight;
    if (start.gesture === 'pending') {
      start.gesture = Math.abs(dx) > Math.abs(dy)
        ? 'seek'
        : start.x < width / 2 ? 'volume' : 'brightness';
    }
    if (start.gesture === 'seek') {
      if (duration > 0) {
        start.seekTarget = Math.max(0, Math.min(duration, start.startTime + dx / width * Math.min(duration, 90)));
        setToast(`${timestamp(start.seekTarget)} · ${start.seekTarget >= start.startTime ? '+' : ''}${Math.round(start.seekTarget - start.startTime)}s`);
      }
    } else if (start.gesture === 'volume') {
      const nextVolume = Math.max(0, Math.min(1, start.startVolume - dy / height));
      start.volumeTarget = nextVolume;
      changeVolume(nextVolume, false);
      setGestureFeedback({ kind: 'volume', value: nextVolume });
      setToast(`Volume ${Math.round(nextVolume * 100)}%`);
    } else {
      const nextBrightness = Math.max(0.5, Math.min(1.5, start.startBrightness - dy / height));
      setBrightness(nextBrightness);
      setGestureFeedback({ kind: 'brightness', value: (nextBrightness - 0.5) });
      setToast(`Brightness ${Math.round(nextBrightness * 100)}%`);
    }
  };

  const onTouchEnd = () => {
    if (touchTimer.current) window.clearTimeout(touchTimer.current);
    if (touchOrigin.current?.gesture === 'seek' && touchOrigin.current.moved) seek(touchOrigin.current.seekTarget);
    if (touchOrigin.current?.gesture === 'volume' && touchOrigin.current.moved && touchOrigin.current.volumeTarget > 0) {
      setPlayerPreference('giplayer-player-volume', String(touchOrigin.current.volumeTarget));
    }
    if (temporarySpeed.current !== null && videoRef.current) {
      videoRef.current.playbackRate = temporarySpeed.current;
      temporarySpeed.current = null;
    }
    if (touchOrigin.current?.moved) setToast('');
    setGestureFeedback(null);
    touchOrigin.current = null;
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (locked || menuOpen || event.pointerType !== 'mouse') return;
    const now = Date.now();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (lastTap.current && now - lastTap.current.time < 300) {
      const position = (event.clientX - rect.left) / rect.width;
      if (position < 0.35) seek((videoRef.current?.currentTime || 0) - 10);
      else if (position > 0.65) seek((videoRef.current?.currentTime || 0) + 10);
      else togglePlay();
      lastTap.current = null;
    } else {
      lastTap.current = { x: event.clientX, time: now };
      showActivity();
    }
  };

  useEffect(() => {
    if (!shortcutsEnabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
      switch (event.key.toLowerCase()) {
        case ' ': case 'k': event.preventDefault(); togglePlay(); break;
        case 'arrowleft': case 'j': event.preventDefault(); seek((videoRef.current?.currentTime || 0) - (event.key.toLowerCase() === 'j' ? 10 : 5)); break;
        case 'arrowright': case 'l': event.preventDefault(); seek((videoRef.current?.currentTime || 0) + (event.key.toLowerCase() === 'l' ? 10 : 5)); break;
        case 'f': event.preventDefault(); void toggleFullscreen(); break;
        case 'm': event.preventDefault(); toggleMute(); break;
        case 'c': setSubtitleEnabled((value) => !value); break;
        case 'arrowup': event.preventDefault(); changeVolume(volume + 0.05); break;
        case 'arrowdown': event.preventDefault(); changeVolume(volume - 0.05); break;
        case 'p':
          event.preventDefault();
          if (document.pictureInPictureElement) void document.exitPictureInPicture().catch(() => setToast('Picture-in-Picture could not be closed.'));
          else if (videoRef.current?.requestPictureInPicture) void videoRef.current.requestPictureInPicture().catch(() => setToast('Picture-in-Picture is unavailable for this media.'));
          else setToast('Picture-in-Picture is not supported by this browser.');
          break;
        case 'n': event.preventDefault(); playNext(); break;
        case '?': event.preventDefault(); setMenuPanel('Tutorial'); setMenuOpen(true); break;
        case '0': case '1': case '2': case '3': case '4':
        case '5': case '6': case '7': case '8': case '9':
          if (duration > 0) seek(duration * Number(event.key) / 10);
          break;
        case '+': case '=': changeSpeed(Math.min(2, speed + 0.25)); break;
        case '-': changeSpeed(Math.max(0.25, speed - 0.25)); break;
        case 'escape': if (menuOpen) setMenuOpen(false); else onBack(); break;
        default: break;
      }
      showActivity();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcutsEnabled, menuOpen, speed, volume, duration, togglePlay, seek, changeVolume, toggleMute, playNext, showActivity, onBack]);

  return <main ref={containerRef} className="fixed inset-0 z-40 flex h-[100dvh] w-full touch-none flex-col overflow-hidden bg-black text-white" onPointerMove={showActivity} onPointerUp={onPointerUp} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}>
    <video
      ref={videoRef}
      autoPlay
      playsInline
      preload="auto"
      className={`absolute inset-0 m-auto h-full w-full transition-opacity duration-200 ${displayEnabled ? 'opacity-100' : 'opacity-0'}`}
      style={{ ...ratioStyles, filter: `brightness(${brightness})` }}
      onTimeUpdate={() => {
        const element = videoRef.current;
        if (!element) return;
        setTime(element.currentTime);
        setSubtitleTime(element.currentTime);
        if (element.duration > 0 && Date.now() - lastPositionSave.current >= 5000) {
          persistPlayback();
          lastPositionSave.current = Date.now();
        }
        if (element.buffered.length) setBuffered(element.buffered.end(element.buffered.length - 1));
      }}
      onLoadedMetadata={(event) => {
        setDuration(event.currentTarget.duration);
        setLoading(false);
        if (video.file && !mediaMetadataCache.current.has(video.id)) {
          metadataTimer.current = window.setTimeout(() => {
            metadataTimer.current = null;
            if (currentVideoId.current === video.id) void analyzeMedia();
          }, 1200);
        }
      }}
      onCanPlay={() => setLoading(false)}
      onWaiting={() => setLoading(true)}
      onPlaying={() => { setPlaying(true); setLoading(false); }}
      onPause={() => { setPlaying(false); persistPlayback(); }}
      onEnded={handleEnded}
      onClick={() => { if (!locked && !menuOpen) setControlsVisible((value) => !value); }}
      onDoubleClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const position = (event.clientX - rect.left) / rect.width;
        if (position < 0.35) seek(time - 10);
        else if (position > 0.65) seek(time + 10);
      }}
      onError={() => { if (!loading) setError('The selected media format or stream is not supported.'); }}
    />

    {audioDiagnostic && <div role="status" className="absolute left-3 right-3 top-20 z-20 mx-auto flex max-w-xl items-start gap-3 rounded-xl border border-amber-200/20 bg-black/85 p-3 text-xs leading-5 text-amber-100 shadow-lg backdrop-blur">
      <span className="min-w-0 flex-1">{audioDiagnostic} Open Audio Track for codec details and available selections.</span>
      <button onClick={() => setAudioDiagnostic('')} aria-label="Dismiss audio diagnostic" className="shrink-0 rounded-full p-1 hover:bg-white/10"><X className="h-4 w-4" /></button>
    </div>}

    {gestureFeedback && <div className={`pointer-events-none absolute top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-2 rounded-full border border-white/15 bg-black/70 px-3 py-4 shadow-xl backdrop-blur ${gestureFeedback.kind === 'volume' ? 'left-4' : 'right-4'}`}>
      {gestureFeedback.kind === 'volume' ? <Volume2 className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      <div className="flex h-24 w-1.5 items-end overflow-hidden rounded-full bg-white/20">
        <div className="w-full rounded-full bg-sky-300 transition-[height] duration-75" style={{ height: `${Math.round(gestureFeedback.value * 100)}%` }} />
      </div>
      <span className="text-[10px] tabular-nums text-white/80">{Math.round((gestureFeedback.kind === 'brightness' ? gestureFeedback.value + 0.5 : gestureFeedback.value) * 100)}%</span>
    </div>}

    {subtitleEnabled && subtitleText && <div className="pointer-events-none absolute bottom-28 left-4 right-4 z-20 whitespace-pre-line text-center font-semibold drop-shadow-[0_2px_3px_rgba(0,0,0,.95)]" style={{ fontSize: `clamp(16px, ${subtitleStyle.size}px, 40px)`, color: subtitleStyle.color }}>{subtitleText}</div>}
    {loading && !error && <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20"><span className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-sky-400" aria-label="Buffering" /></div>}
    {error && <div className="absolute inset-x-5 top-1/2 z-30 -translate-y-1/2 rounded-2xl bg-black/80 p-5 text-center"><p role="alert" className="text-sm text-rose-100">{error}</p><button onClick={() => { setError(''); if (videoRef.current) { videoRef.current.load(); void videoRef.current.play().catch(() => {}); } }} className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-sm">Retry</button></div>}

    <header className={`absolute inset-x-0 top-0 z-20 flex items-center gap-1 bg-gradient-to-b from-black/90 to-transparent px-2 pb-8 pt-[max(1rem,env(safe-area-inset-top))] transition-opacity sm:gap-2 sm:px-3 ${controlsVisible && !locked ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
      <button onClick={onBack} aria-label="Back to folders" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-white/10"><ArrowLeft className="h-5 w-5" /></button>
      <div className="min-w-0 flex-1"><h1 className="truncate text-sm font-semibold sm:text-base">{video.name}</h1>{queue.length > 1 && <p className="text-xs text-white/60">{queueIndex + 1} of {queue.length}</p>}</div>
      <button onClick={() => { setMenuPanel('Audio Track'); setMenuOpen(true); }} aria-label={`Audio tracks${audioTracks.length ? `, ${audioTracks.length} detected` : ''}`} title={audioTracks.length ? `${audioTracks.length} audio ${audioTracks.length === 1 ? 'track' : 'tracks'}` : 'Inspect audio tracks'} className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-white/10"><Music2 className="h-5 w-5" />{audioTracks.length > 1 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-400 px-1 text-[9px] font-bold text-slate-950">{audioTracks.length}</span>}</button>
      <button onClick={() => changeSpeed(([0.5, 0.75, 1, 1.25, 1.5, 2][([0.5, 0.75, 1, 1.25, 1.5, 2].indexOf(speed) + 1) % 6]))} aria-label="Playback speed" title="Change playback speed" className="flex h-11 min-w-11 shrink-0 items-center justify-center rounded-full px-2 text-sm font-semibold hover:bg-white/10">{speed.toFixed(speed % 1 ? 2 : 0)}×</button>
      <button onClick={() => { if (!subtitleName) { setMenuPanel('Subtitle'); setMenuOpen(true); } else setSubtitleEnabled((value) => !value); }} aria-label="Toggle subtitles" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-white/10"><Subtitles className="h-5 w-5" /></button>
      <button onClick={() => void changeOrientation()} aria-label="Rotate screen" className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-white/10 sm:flex"><RotateCw className="h-5 w-5" /></button>
      <button onClick={() => setMenuOpen(true)} aria-label="More options" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-white/10"><ChevronDown className="h-5 w-5" /></button>
    </header>

    <button onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'} className={`absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/45 p-4 transition-opacity ${controlsVisible && !playing && !menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>{playing ? <Pause className="h-8 w-8 fill-white" /> : <Play className="h-8 w-8 fill-white" />}</button>
    {locked && <button onClick={() => { setLocked(false); setControlsVisible(true); }} className="absolute right-4 top-1/2 z-30 -translate-y-1/2 rounded-full border border-white/30 bg-black/60 p-4" aria-label="Unlock controls"><Lock className="h-6 w-6" /></button>}

    <VideoPlayerControls
      visible={controlsVisible}
      locked={locked}
      currentTime={time}
      duration={duration}
      buffered={buffered}
      playing={playing}
      muted={muted}
      volume={volume}
      aspectRatio={aspectRatio}
      isFullscreen={isFullscreen}
      onSeek={seek}
      onLock={() => { setLocked(true); setControlsVisible(false); }}
      onPrevious={playPrevious}
      onTogglePlay={togglePlay}
      onNext={playNext}
      onAspectRatio={() => setAspectRatio((value) => ASPECT_RATIOS[(ASPECT_RATIOS.indexOf(value) + 1) % ASPECT_RATIOS.length])}
      onFullscreen={() => void toggleFullscreen()}
      onToggleMute={toggleMute}
      onVolume={changeVolume}
    />

    {toast && <button onClick={() => setToast('')} className="absolute left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/75 px-5 py-3 text-sm shadow-lg">{toast}</button>}
    {menuOpen && <MoreOptionsMenu
      video={{ ...video, duration, width: videoRef.current?.videoWidth, height: videoRef.current?.videoHeight }}
      currentTime={time} duration={duration} onClose={() => { setMenuOpen(false); setMenuPanel(null); }} initialPanel={menuPanel}
      aspectRatio={aspectRatio} onAspectRatio={setAspectRatio} audioTracks={audioTracks} onAudioTrack={selectAudioTrack}
      mediaMetadata={mediaMetadata} metadataStatus={metadataStatus} metadataError={metadataError} onAnalyzeMedia={analyzeMedia}
      subtitlesEnabled={subtitleEnabled} subtitleName={subtitleName} subtitleOffset={subtitleOffset}
      onSubtitleEnabled={setSubtitleEnabled} onSubtitleFile={(file) => void loadSubtitle(file)} onSubtitleOffset={setSubtitleOffset}
      onSubtitleStyle={(size, color) => setSubtitleStyle({ size, color })}
      brightness={brightness} onBrightness={setBrightness} keepAwake={keepAwake} onKeepAwake={setKeepAwake}
      displayEnabled={displayEnabled} onDisplayEnabled={(value) => { setDisplayEnabled(value); setPlayerPreference('giplayer-video-display', String(value)); }}
      shortcutsEnabled={shortcutsEnabled} onShortcutsEnabled={(value) => { setShortcutsEnabled(value); setPlayerPreference('giplayer-shortcuts', String(value)); }}
      playbackSpeed={speed} onPlaybackSpeed={changeSpeed} repeat={repeat} onRepeat={setRepeat} onSleepTimer={setSleepMinutes}
      onSeek={seek} onOpenNetworkStream={(url) => {
        const next: PlayerVideo = { id: url, url, name: new URL(url).pathname.split('/').pop() || 'Network Stream' };
        onChangeVideo?.(next, [next]);
        setMenuOpen(false);
      }}
      onCut={exportClip} onPlayPlaylist={openPlaylist}
      onSetEqualizer={setEqualizerPreset}
    />}
  </main>;
};

export default AdvancedPlayer;
