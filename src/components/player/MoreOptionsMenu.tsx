import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AudioLines, Bookmark, BookOpen, Check, ChevronLeft, Clock3, Eye,
  FileAudio, Gauge, Info, Layout, ListVideo, Music2, Play,
  Scissors, Settings2, Share2, SlidersHorizontal, Subtitles, Trash2, X,
} from 'lucide-react';
import { getPlayerPreference, playerLibrary, SavedPlaylist, setPlayerPreference } from '../../services/playerLibrary';

export type PlayerVideo = {
  id: string;
  url: string;
  name: string;
  file?: File;
  duration?: number;
  width?: number;
  height?: number;
  fileSize?: number;
  mimeType?: string;
  privateVault?: boolean;
};

type AudioTrack = { id: string; label: string; language?: string; enabled: boolean };
export type PanelName = 'Audio Track' | 'Subtitle' | 'Aspect Ratio' | 'Display Settings' | 'Playlists' | 'Network Stream' | 'Information' | 'Share' | 'Cut' | 'Bookmark' | 'Tutorial' | 'More';

const panelNames: { name: PanelName; icon: typeof Music2; hint: string }[] = [
  { name: 'Audio Track', icon: Music2, hint: 'Language and track' },
  { name: 'Subtitle', icon: Subtitles, hint: 'Load, sync, style' },
  { name: 'Aspect Ratio', icon: Layout, hint: 'Fit and crop' },
  { name: 'Display Settings', icon: SlidersHorizontal, hint: 'Brightness and display' },
  { name: 'Playlists', icon: ListVideo, hint: 'Manage video lists' },
  { name: 'Network Stream', icon: AudioLines, hint: 'Open media URL' },
  { name: 'Information', icon: Info, hint: 'File and stream details' },
  { name: 'Share', icon: Share2, hint: 'Share safely' },
  { name: 'Cut', icon: Scissors, hint: 'Save a playback clip' },
  { name: 'Bookmark', icon: Bookmark, hint: 'Save a timestamp' },
  { name: 'Tutorial', icon: BookOpen, hint: 'Player guide' },
  { name: 'More', icon: Settings2, hint: 'Playback preferences' },
];

const ratios = ['Fit', 'Fill', 'Stretch', 'Crop', 'Original', '16:9', '4:3'] as const;
export type AspectRatioChoice = typeof ratios[number];

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '00:00';
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-3"><h3 className="text-sm font-semibold text-slate-200">{title}</h3>{children}</section>;
}

function ActionButton({ children, onClick, disabled = false }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button disabled={disabled} onClick={onClick} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40">{children}</button>;
}

export function AudioTrackSelector({ tracks, onSelect }: { tracks: AudioTrack[]; onSelect: (id: string) => void }) {
  return <Section title="Audio tracks">
    {tracks.length ? tracks.map((track) => <button key={track.id} onClick={() => onSelect(track.id)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-white/5"><FileAudio className="h-5 w-5 text-sky-300" /><span className="flex-1"><span className="block text-sm">{track.label}</span><span className="text-xs text-slate-400">{track.language || 'Language not reported'}</span></span>{track.enabled && <Check className="h-4 w-4 text-sky-300" />}</button>) : <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-400">This browser does not expose selectable embedded audio tracks for this media.</p>}
  </Section>;
}

export function SubtitleSelector({ enabled, subtitleName, offset, onEnable, onLoad, onOffset, onStyle }: {
  enabled: boolean; subtitleName: string | null; offset: number;
  onEnable: (enabled: boolean) => void; onLoad: (file: File) => void; onOffset: (offset: number) => void;
  onStyle: (size: number, color: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [size, setSize] = useState(() => Number(getPlayerPreference('giplayer-subtitle-size', '24')));
  const [color, setColor] = useState(() => getPlayerPreference('giplayer-subtitle-color', '#ffffff'));
  const load = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onLoad(file);
    event.target.value = '';
  };
  return <div className="space-y-5">
    <Section title="Subtitle track">
      <div className="flex items-center justify-between rounded-xl bg-white/5 p-3"><span className="text-sm">{subtitleName || 'No external subtitle loaded'}</span><button onClick={() => onEnable(!enabled)} className={`rounded-full px-3 py-1 text-xs font-semibold ${enabled ? 'bg-sky-400 text-slate-950' : 'bg-white/10 text-slate-300'}`}>{enabled ? 'On' : 'Off'}</button></div>
      <input ref={fileRef} type="file" accept=".srt,.vtt,text/vtt,application/x-subrip" onChange={load} className="hidden" />
      <ActionButton onClick={() => fileRef.current?.click()}>Choose .SRT or .VTT file</ActionButton>
      <p className="text-xs text-slate-400">External subtitles are read locally and are not uploaded.</p>
    </Section>
    <Section title="Synchronization"><div className="flex items-center gap-2"><ActionButton onClick={() => onOffset(offset - 0.5)}>-0.5 s</ActionButton><span className="min-w-16 text-center font-mono text-sm">{offset > 0 ? '+' : ''}{offset.toFixed(1)} s</span><ActionButton onClick={() => onOffset(offset + 0.5)}>+0.5 s</ActionButton><ActionButton onClick={() => onOffset(0)}>Reset</ActionButton></div></Section>
    <Section title="Subtitle appearance"><label className="flex items-center gap-3 text-sm">Size <input type="range" min="14" max="40" value={size} onChange={(event) => { const next = Number(event.target.value); setSize(next); setPlayerPreference('giplayer-subtitle-size', String(next)); onStyle(next, color); }} /></label><label className="flex items-center gap-3 text-sm">Color <input type="color" value={color} onChange={(event) => { setColor(event.target.value); setPlayerPreference('giplayer-subtitle-color', event.target.value); onStyle(size, event.target.value); }} /></label></Section>
  </div>;
}

export function AspectRatioSelector({ value, onChange }: { value: AspectRatioChoice; onChange: (ratio: AspectRatioChoice) => void }) {
  return <Section title="Video aspect ratio">{ratios.map((ratio) => <button key={ratio} onClick={() => onChange(ratio)} className="flex w-full items-center justify-between rounded-xl p-3 text-sm hover:bg-white/5"><span>{ratio}</span>{value === ratio && <Check className="h-4 w-4 text-sky-300" />}</button>)}</Section>;
}

export function DisplaySettings({ brightness, onBrightness, displayEnabled, onDisplayEnabled, keepAwake, onKeepAwake }: {
  brightness: number; onBrightness: (value: number) => void; displayEnabled: boolean; onDisplayEnabled: (value: boolean) => void;
  keepAwake: boolean; onKeepAwake: (value: boolean) => void;
}) {
  return <div className="space-y-5"><Section title="Video display"><label className="flex items-center justify-between rounded-xl bg-white/5 p-3 text-sm"><span>Video Display</span><input type="checkbox" checked={displayEnabled} onChange={(event) => onDisplayEnabled(event.target.checked)} className="accent-sky-400" /></label><label className="block space-y-2 text-sm"><span>Brightness · {(brightness * 100).toFixed(0)}%</span><input className="w-full accent-sky-400" type="range" min="0.5" max="1.5" step="0.05" value={brightness} onChange={(event) => onBrightness(Number(event.target.value))} /></label></Section><Section title="Screen"><label className="flex items-center justify-between rounded-xl bg-white/5 p-3 text-sm"><span>Keep screen awake</span><input type="checkbox" checked={keepAwake} onChange={(event) => onKeepAwake(event.target.checked)} className="accent-sky-400" /></label><p className="text-xs text-slate-400">Uses the Screen Wake Lock API when available; the operating system may still dim the display.</p></Section></div>;
}

export function PlaylistManager({ video, onPlay }: { video: PlayerVideo; onPlay: (playlist: SavedPlaylist) => void }) {
  const [playlists, setPlaylists] = useState(() => playerLibrary.getPlaylists());
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const save = (next: SavedPlaylist[]) => { setPlaylists(next); playerLibrary.savePlaylists(next); };
  const create = () => {
    const clean = name.trim();
    if (!clean) return;
    if (playlists.some((playlist) => playlist.name.toLowerCase() === clean.toLowerCase())) {
      setError('A playlist with that name already exists.');
      return;
    }
    const playlist = { id: crypto.randomUUID(), name: clean, videoIds: [video.id], updatedAt: Date.now() };
    save([...playlists, playlist]);
    setName('');
    setError('');
  };
  return <div className="space-y-3"><form onSubmit={(event) => { event.preventDefault(); create(); }} className="flex gap-2"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="New playlist" className="min-w-0 flex-1 rounded-xl bg-white/5 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-400" /><button className="rounded-xl bg-sky-500 px-3 text-sm font-semibold text-slate-950">Create</button></form>{error && <p role="alert" className="text-sm text-rose-300">{error}</p>}{playlists.length ? playlists.map((playlist) => {
    const included = playlist.videoIds.includes(video.id);
    return <div key={playlist.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-white/5 p-3"><span className="min-w-0 flex-1 truncate text-sm">{playlist.name} <span className="text-xs text-slate-400">· {playlist.videoIds.length}</span></span><ActionButton onClick={() => { const nextName = window.prompt('Rename playlist', playlist.name)?.trim(); if (nextName) save(playlists.map((item) => item.id === playlist.id ? { ...item, name: nextName, updatedAt: Date.now() } : item)); }}>Rename</ActionButton><button onClick={() => { if (window.confirm(`Delete “${playlist.name}”?`)) save(playlists.filter((item) => item.id !== playlist.id)); }} aria-label={`Delete ${playlist.name}`} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button><ActionButton onClick={() => save(playlists.map((item) => item.id === playlist.id ? { ...item, videoIds: included ? item.videoIds.filter((id) => id !== video.id) : [...item.videoIds, video.id], updatedAt: Date.now() } : item))}>{included ? 'Remove' : 'Add'}</ActionButton><button onClick={() => onPlay(playlist)} className="rounded-full bg-sky-500 p-2 text-slate-950" aria-label={`Play ${playlist.name}`}><Play className="h-4 w-4 fill-current" /></button></div>;
  }) : <p className="text-sm text-slate-400">No playlists yet. Create one to save this video.</p>}</div>;
}

export function NetworkStreamDialog({ onPlay }: { onPlay: (url: string) => void }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const parsed = new URL(url.trim());
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Use an HTTP or HTTPS media URL.');
      if (parsed.username || parsed.password) throw new Error('URLs containing credentials are not allowed.');
      if (parsed.pathname === '/' || parsed.pathname === '') throw new Error('Enter a direct media file or stream URL.');
      setError('');
      onPlay(parsed.href);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Enter a valid HTTP or HTTPS media URL.'); }
  };
  return <form onSubmit={submit} className="space-y-3"><label className="block text-sm">Direct media URL<input autoFocus type="url" required value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/video.m3u8" className="mt-2 w-full rounded-xl bg-white/5 px-3 py-3 text-sm outline-none focus:ring-1 focus:ring-sky-400" /></label>{error && <p role="alert" className="text-sm text-rose-300">{error}</p>}<button className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950">Open stream</button><p className="text-xs text-slate-400">Direct HTTP(S) streams only. HLS requires native browser support; this player does not proxy or fetch media through a server.</p></form>;
}

export function VideoInformation({ video, duration }: { video: PlayerVideo; duration: number }) {
  const rows = [
    ['Filename', video.name],
    ['Type', video.mimeType || video.file?.type || video.name.split('.').pop()?.toUpperCase() || 'Unknown'],
    ['Duration', formatTime(duration)],
    ['Resolution', video.width && video.height ? `${video.width} × ${video.height}` : 'Unavailable'],
    ['File size', video.file?.size ? `${(video.file.size / 1024 / 1024).toFixed(1)} MB` : video.fileSize ? `${(video.fileSize / 1024 / 1024).toFixed(1)} MB` : 'Unavailable for remote streams'],
    ['Source', video.url.startsWith('blob:') ? 'Selected local file (private to this tab)' : video.url.startsWith('http') ? new URL(video.url).host : 'Unavailable'],
  ];
  return <dl className="space-y-3">{rows.map(([label, value]) => <div key={label} className="flex justify-between gap-4 border-b border-white/5 pb-2"><dt className="text-sm text-slate-400">{label}</dt><dd className="max-w-[65%] break-all text-right text-sm">{value}</dd></div>)}</dl>;
}

export function BookmarkManager({ videoId, currentTime, onSeek, persist = true }: { videoId: string; currentTime: number; onSeek: (time: number) => void; persist?: boolean }) {
  const [bookmarks, setBookmarks] = useState(() => persist ? playerLibrary.getBookmarks(videoId) : []);
  const [note, setNote] = useState('');
  const add = () => {
    const next = [...bookmarks, { id: crypto.randomUUID(), time: currentTime, note: note.trim(), createdAt: Date.now() }];
    setBookmarks(next);
    if (persist) playerLibrary.saveBookmarks(videoId, next);
    setNote('');
  };
  const remove = (id: string) => {
    const next = bookmarks.filter((bookmark) => bookmark.id !== id);
    setBookmarks(next);
    if (persist) playerLibrary.saveBookmarks(videoId, next);
  };
  return <div className="space-y-3">{!persist && <p className="text-xs text-slate-400">Bookmarks for private playback stay in memory and are cleared when you leave the player.</p>}<form onSubmit={(event) => { event.preventDefault(); add(); }} className="flex gap-2"><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note for current time" className="min-w-0 flex-1 rounded-xl bg-white/5 px-3 py-2 text-sm outline-none" /><button className="rounded-xl bg-sky-500 px-3 text-sm font-semibold text-slate-950">Save {formatTime(currentTime)}</button></form>{bookmarks.map((bookmark) => <div key={bookmark.id} className="flex items-center gap-2 rounded-xl bg-white/5 p-3"><button onClick={() => onSeek(bookmark.time)} className="flex min-w-0 flex-1 items-center gap-2 text-left"><Clock3 className="h-4 w-4 shrink-0 text-sky-300" /><span className="font-mono text-sm">{formatTime(bookmark.time)}</span><span className="truncate text-sm text-slate-300">{bookmark.note || 'Bookmark'}</span></button><button onClick={() => remove(bookmark.id)} aria-label="Remove bookmark" className="p-1 text-slate-400 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button></div>)}</div>;
}

export function PlayerSettings({ playbackSpeed, onPlaybackSpeed, repeat, onRepeat, onSleepTimer, shortcutsEnabled, onShortcutsEnabled }: {
  playbackSpeed: number;
  onPlaybackSpeed: (value: number) => void;
  repeat: boolean;
  onRepeat: (value: boolean) => void;
  onSleepTimer: (minutes: number | null) => void;
  shortcutsEnabled: boolean;
  onShortcutsEnabled: (value: boolean) => void;
}) {
  const [timerMinutes, setTimerMinutes] = useState('');
  const [error, setError] = useState('');
  return <div className="space-y-5">
    <Section title="Playback preferences">
      <label className="block text-sm">Playback speed · {playbackSpeed.toFixed(2)}×<input type="range" min="0.25" max="2" step="0.05" value={playbackSpeed} onChange={(event) => onPlaybackSpeed(Number(event.target.value))} className="mt-2 w-full accent-sky-400" /></label>
      <label className="flex items-center justify-between rounded-xl bg-white/5 p-3 text-sm"><span>Repeat current video</span><input type="checkbox" checked={repeat} onChange={(event) => onRepeat(event.target.checked)} className="accent-sky-400" /></label>
      <div className="flex gap-2"><input type="number" min="1" max="240" value={timerMinutes} onChange={(event) => setTimerMinutes(event.target.value)} placeholder="Sleep timer (minutes)" className="min-w-0 flex-1 rounded-xl bg-white/5 px-3 py-2 text-sm" /><ActionButton onClick={() => { const minutes = Number(timerMinutes); if (Number.isInteger(minutes) && minutes >= 1 && minutes <= 240) { onSleepTimer(minutes); setError(''); } else setError('Enter a whole number from 1 to 240 minutes.'); }}>Set</ActionButton><ActionButton onClick={() => { onSleepTimer(null); setError(''); }}>Off</ActionButton></div>
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
    </Section>
    <Section title="Shortcuts"><label className="flex items-center justify-between rounded-xl bg-white/5 p-3 text-sm"><span>Keyboard shortcuts</span><input type="checkbox" checked={shortcutsEnabled} onChange={(event) => onShortcutsEnabled(event.target.checked)} className="accent-sky-400" /></label></Section>
  </div>;
}

export default function MoreOptionsMenu({
  video, currentTime, duration, onClose, initialPanel = null, aspectRatio, onAspectRatio, audioTracks, onAudioTrack,
  subtitlesEnabled, subtitleName, subtitleOffset, onSubtitleEnabled, onSubtitleFile, onSubtitleOffset,
  onSubtitleStyle, brightness, onBrightness, keepAwake, onKeepAwake, displayEnabled, onDisplayEnabled,
  shortcutsEnabled, onShortcutsEnabled, playbackSpeed, onPlaybackSpeed, repeat, onRepeat, onSleepTimer,
  onSeek, onOpenNetworkStream, onCut, onPlayPlaylist, onSetEqualizer,
}: {
  video: PlayerVideo; currentTime: number; duration: number; onClose: () => void; initialPanel?: PanelName | null;
  aspectRatio: AspectRatioChoice; onAspectRatio: (value: AspectRatioChoice) => void;
  audioTracks: AudioTrack[]; onAudioTrack: (id: string) => void;
  subtitlesEnabled: boolean; subtitleName: string | null; subtitleOffset: number;
  onSubtitleEnabled: (enabled: boolean) => void; onSubtitleFile: (file: File) => void; onSubtitleOffset: (offset: number) => void;
  onSubtitleStyle: (size: number, color: string) => void; brightness: number; onBrightness: (value: number) => void;
  keepAwake: boolean; onKeepAwake: (value: boolean) => void; displayEnabled: boolean; onDisplayEnabled: (value: boolean) => void;
  shortcutsEnabled: boolean; onShortcutsEnabled: (value: boolean) => void; playbackSpeed: number; onPlaybackSpeed: (value: number) => void;
  repeat: boolean; onRepeat: (value: boolean) => void; onSleepTimer: (minutes: number | null) => void;
  onSeek: (time: number) => void; onOpenNetworkStream: (url: string) => void;
  onCut: (start: number, end: number) => Promise<boolean>; onPlayPlaylist: (playlist: SavedPlaylist) => void;
  onSetEqualizer: (preset: string) => void;
}) {
  const [panel, setPanel] = useState<PanelName | null>(initialPanel);
  const [cutStart, setCutStart] = useState(0);
  const [cutEnd, setCutEnd] = useState(Math.max(0, duration));
  const [cutMessage, setCutMessage] = useState('');
  const [equalizer, setEqualizer] = useState('Normal');
  const info = useMemo(() => video.url.startsWith('http') ? new URL(video.url).host : '', [video.url]);
  useEffect(() => {
    if (duration > 0) setCutEnd((end) => end > 0 ? Math.min(end, duration) : duration);
  }, [duration]);

  const share = async () => {
    try {
      if (video.file && navigator.canShare?.({ files: [video.file] }) && navigator.share) {
        await navigator.share({ title: video.name, files: [video.file] });
      } else if (/^https?:\/\//.test(video.url) && navigator.share) {
        await navigator.share({ title: video.name, url: video.url });
      } else if (/^https?:\/\//.test(video.url) && navigator.clipboard) {
        await navigator.clipboard.writeText(video.url);
      } else {
        setCutMessage('This browser cannot share a local file. No private file path was copied.');
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setCutMessage('Sharing is unavailable in this browser.');
    }
  };

  const handleCut = async () => {
    if (cutStart < 0 || cutEnd <= cutStart || cutEnd > duration) {
      setCutMessage('Choose a valid range within this video.');
      return;
    }
    setCutMessage(await onCut(cutStart, cutEnd)
      ? 'Clip saved; the original file was not changed.'
      : 'This browser cannot export a clipped media file. You can still seek to the selected timestamps.');
  };

  const renderPanel = () => {
    switch (panel) {
      case 'Audio Track': return <div className="space-y-4"><AudioTrackSelector tracks={audioTracks} onSelect={onAudioTrack} /><Section title="Equalizer"><div className="flex items-center gap-2"><select value={equalizer} onChange={(event) => { setEqualizer(event.target.value); onSetEqualizer(event.target.value); }} className="flex-1 rounded-xl bg-white/5 px-3 py-2 text-sm"><option>Normal</option><option>Voice</option><option>Bass</option><option>Treble</option></select><AudioLines className="h-5 w-5 text-sky-300" /></div><p className="text-xs text-slate-400">Equalizer presets process audio only when Web Audio is supported and the stream permits it.</p></Section></div>;
      case 'Subtitle': return <SubtitleSelector enabled={subtitlesEnabled} subtitleName={subtitleName} offset={subtitleOffset} onEnable={onSubtitleEnabled} onLoad={onSubtitleFile} onOffset={onSubtitleOffset} onStyle={onSubtitleStyle} />;
      case 'Aspect Ratio': return <AspectRatioSelector value={aspectRatio} onChange={onAspectRatio} />;
      case 'Display Settings': return <DisplaySettings brightness={brightness} onBrightness={onBrightness} displayEnabled={displayEnabled} onDisplayEnabled={onDisplayEnabled} keepAwake={keepAwake} onKeepAwake={onKeepAwake} />;
      case 'Playlists': return video.privateVault
        ? <p className="rounded-xl bg-white/5 p-4 text-sm text-slate-300">Private vault videos cannot be added to public playlists. Their names and playlist references stay private.</p>
        : <PlaylistManager video={video} onPlay={onPlayPlaylist} />;
      case 'Network Stream': return <NetworkStreamDialog onPlay={onOpenNetworkStream} />;
      case 'Information': return <VideoInformation video={video} duration={duration} />;
      case 'Share': return <Section title="Share media"><p className="text-sm text-slate-300">{video.file ? 'Share this selected file using the device share sheet when supported.' : `Stream host: ${info || 'not available'}.`}</p><ActionButton onClick={() => void share()}><Share2 className="mr-2 inline h-4 w-4" />Share</ActionButton><p className="text-xs text-slate-400">Local blob URLs and private file paths are never exposed. If file sharing is unsupported, the browser will show a limitation instead.</p></Section>;
      case 'Cut': return <Section title="Export a clip"><p className="text-sm text-slate-400">Captures the selected playback segment in real time where this browser supports MediaRecorder and video capture. The source file is never edited.</p><div className="grid grid-cols-2 gap-3"><label className="text-xs text-slate-400">Start (seconds)<input type="number" min="0" max={duration} step="0.1" value={cutStart} onChange={(event) => setCutStart(Number(event.target.value))} className="mt-1 w-full rounded-xl bg-white/5 p-2 text-sm text-white" /></label><label className="text-xs text-slate-400">End (seconds)<input type="number" min="0" max={duration} step="0.1" value={cutEnd} onChange={(event) => setCutEnd(Number(event.target.value))} className="mt-1 w-full rounded-xl bg-white/5 p-2 text-sm text-white" /></label></div><div className="flex gap-2"><ActionButton onClick={() => onSeek(cutStart)}>Preview start</ActionButton><ActionButton onClick={() => void handleCut()} disabled={!duration}>Export clip</ActionButton></div>{cutMessage && <p role="status" className="text-sm text-sky-200">{cutMessage}</p>}</Section>;
      case 'Bookmark': return <BookmarkManager key={video.id} videoId={video.id} currentTime={currentTime} onSeek={onSeek} persist={!video.privateVault} />;
      case 'Tutorial': return <Section title="Player guide"><div className="space-y-3 text-sm leading-6 text-slate-300"><p><b className="text-white">Tap:</b> show or hide controls. <b className="text-white">Double-tap:</b> seek back or forward 10 seconds.</p><p><b className="text-white">Swipe:</b> horizontal scrubbing; swipe vertically on the left for volume and on the right for brightness. On-screen meters show the level. Brightness changes affect the video only; system brightness remains controlled by your device.</p><p><b className="text-white">Long-press:</b> temporary 2× playback. <b className="text-white">Keyboard:</b> Space/K play, ←/→ seek, F fullscreen, M mute, C subtitles, +/- speed.</p><p>Use the lock control to prevent accidental player gestures. Browser and device policies may restrict fullscreen, wake lock, rotation, or track selection.</p></div></Section>;
      case 'More': return <PlayerSettings playbackSpeed={playbackSpeed} onPlaybackSpeed={onPlaybackSpeed} repeat={repeat} onRepeat={onRepeat} onSleepTimer={onSleepTimer} shortcutsEnabled={shortcutsEnabled} onShortcutsEnabled={onShortcutsEnabled} />;
      default: return null;
    }

  };

  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-[3px] sm:items-center sm:p-5" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label="Player options" className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[1.4rem] border border-white/[.09] bg-[#12171b] text-white shadow-[0_24px_80px_rgba(0,0,0,.6)] sm:rounded-2xl" onClick={(event) => event.stopPropagation()}>
      <header className="flex shrink-0 items-center gap-3 border-b border-white/[.07] px-4 py-3.5 sm:px-5">
        {panel && <button onClick={() => { setPanel(null); setCutMessage(''); }} aria-label="Back to options" className="rounded-full p-2 text-slate-300 hover:bg-white/10"><ChevronLeft className="h-5 w-5" /></button>}
        <div className="min-w-0 flex-1"><h2 className="text-base font-semibold">{panel || 'More options'}</h2><p className="truncate text-xs text-slate-500">{video.name}</p></div>
        <button onClick={onClose} aria-label="Close options" className="rounded-full p-2 text-slate-300 hover:bg-white/10"><X className="h-5 w-5" /></button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
        {panel ? <div className="space-y-5">{renderPanel()}</div> : <>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2">
            {panelNames.map(({ name, icon: Icon, hint }) => <button key={name} onClick={() => setPanel(name)} className="group app-nav-item flex min-h-[6.8rem] flex-col items-center justify-center gap-2 rounded-xl px-1.5 py-3 text-center hover:bg-white/[.04] sm:min-h-28"><span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[.11] bg-white/[.025] text-slate-200 transition group-hover:border-sky-300/40 group-hover:bg-sky-300/[.07] group-hover:text-sky-200"><Icon className="h-[19px] w-[19px]" /></span><span className="text-xs font-medium text-slate-100 sm:text-[13px]">{name}</span><span className="text-[10px] leading-4 text-slate-500 sm:text-[11px]">{hint}</span></button>)}
          </div>
          <div className="mt-4 grid gap-2 border-t border-white/[.07] pt-4 sm:grid-cols-2">
            <label className="flex items-center justify-between rounded-xl bg-white/[.035] px-3 py-2.5 text-sm"><span className="flex items-center gap-2.5"><Eye className="h-4 w-4 text-slate-400" />Video display</span><input aria-label="Video Display" type="checkbox" checked={displayEnabled} onChange={(event) => onDisplayEnabled(event.target.checked)} className="h-4 w-4 accent-sky-400" /></label>
            <label className="flex items-center justify-between rounded-xl bg-white/[.035] px-3 py-2.5 text-sm"><span className="flex items-center gap-2.5"><Gauge className="h-4 w-4 text-slate-400" />Keyboard shortcuts</span><input aria-label="Shortcuts" type="checkbox" checked={shortcutsEnabled} onChange={(event) => onShortcutsEnabled(event.target.checked)} className="h-4 w-4 accent-sky-400" /></label>
          </div>
        </>}
      </div>
    </div>
  </div>;
}

export { MoreOptionsMenu as PlayerMoreMenu };
