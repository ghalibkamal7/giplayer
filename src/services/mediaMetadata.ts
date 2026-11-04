import type { AudioTrack as MediaInfoAudioTrack, GeneralTrack, Track, VideoTrack } from 'mediainfo.js';

export type ParsedAudioTrack = {
  id: string;
  title: string;
  language: string;
  codec: string;
  channels: string;
  sampleRate: string;
  isDefault: boolean;
  support?: 'supported' | 'unsupported' | 'unknown';
};

export type ParsedMediaMetadata = {
  container: string;
  videoCodec: string;
  resolution: string;
  frameRate: string;
  audioTracks: ParsedAudioTrack[];
};

const codecMimeTypes: Array<{ matches: RegExp; mimeType: string }> = [
  { matches: /AAC|mp4a\.40/i, mimeType: 'audio/mp4; codecs="mp4a.40.2"' },
  { matches: /E-?AC-?3|EC-?3/i, mimeType: 'audio/mp4; codecs="ec-3"' },
  { matches: /AC-?3|A_AC3/i, mimeType: 'audio/mp4; codecs="ac-3"' },
  { matches: /DTS|dtsc|dtse|dtsh/i, mimeType: 'audio/mp4; codecs="dtsc"' },
  { matches: /MP3|MPEG Audio/i, mimeType: 'audio/mpeg' },
  { matches: /Opus/i, mimeType: 'audio/webm; codecs="opus"' },
  { matches: /Vorbis/i, mimeType: 'audio/webm; codecs="vorbis"' },
  { matches: /FLAC/i, mimeType: 'audio/flac' },
  { matches: /PCM|LPCM|WAV/i, mimeType: 'audio/wav' },
];

function isGeneralTrack(track: Track): track is GeneralTrack {
  return track['@type'] === 'General';
}

function isVideoTrack(track: Track): track is VideoTrack {
  return track['@type'] === 'Video';
}

function isAudioTrack(track: Track): track is MediaInfoAudioTrack {
  return track['@type'] === 'Audio';
}

function firstValue(...values: Array<string | number | undefined>): string {
  const found = values.find((value) => value !== undefined && String(value).trim() !== '');
  return found === undefined ? '' : String(found);
}

export function normalizeMediaMetadata(tracks: Track[]): ParsedMediaMetadata {
  const general = tracks.find(isGeneralTrack);
  const video = tracks.find(isVideoTrack);
  const audioTracks = tracks.filter(isAudioTrack).map((track, index) => ({
    id: track.ID || track.ID_String || String(index),
    title: firstValue(track.Title),
    language: firstValue(track.Language_String, track.Language),
    codec: firstValue(track.Format_Commercial, track.Format, track.CodecID_Hint, track.CodecID),
    channels: firstValue(track.ChannelLayout, track.Channels_String, track.Channels),
    sampleRate: firstValue(track.SamplingRate_String, track.SamplingRate),
    isDefault: /yes|true|1/i.test(firstValue(track.Default, track.Default_String)),
  }));
  return {
    container: firstValue(general?.Format_Commercial, general?.Format, general?.Format_String),
    videoCodec: video ? firstValue(video.Format_Commercial, video.Format, video.CodecID_Hint, video.CodecID) : '',
    resolution: video?.Width && video?.Height ? `${video.Width} × ${video.Height}` : '',
    frameRate: video ? firstValue(video.FrameRate_String, video.FrameRate) : '',
    audioTracks,
  };
}

export function getAudioCodecSupport(codec: string, canPlayType: (mimeType: string) => string): 'supported' | 'unsupported' | 'unknown' {
  const candidate = codecMimeTypes.find((entry) => entry.matches.test(codec));
  if (!candidate) return 'unknown';
  return canPlayType(candidate.mimeType) ? 'supported' : 'unsupported';
}

export async function inspectMediaFile(file: File): Promise<ParsedMediaMetadata> {
  const [{ default: mediaInfoFactory }, { default: wasmUrl }] = await Promise.all([
    import('mediainfo.js'),
    import('mediainfo.js/MediaInfoModule.wasm?url'),
  ]);
  const mediaInfo = await mediaInfoFactory({
    format: 'object',
    chunkSize: 256 * 1024,
    coverData: false,
    locateFile: () => wasmUrl,
  });
  try {
    const result = await mediaInfo.analyzeData(
      file.size,
      async (size, offset) => new Uint8Array(await file.slice(offset, offset + size).arrayBuffer()),
    );
    return normalizeMediaMetadata(result.media?.track ?? []);
  } finally {
    mediaInfo.close();
  }
}
