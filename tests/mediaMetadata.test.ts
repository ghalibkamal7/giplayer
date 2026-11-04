import { describe, expect, it } from 'vitest';
import type { Track } from 'mediainfo.js';
import { getAudioCodecSupport, normalizeMediaMetadata } from '../src/services/mediaMetadata';

describe('media metadata', () => {
  it('uses parsed container, codec, language, channel, sample-rate, and default-track metadata', () => {
    const metadata = normalizeMediaMetadata([
      { '@type': 'General', Format: 'Matroska' },
      { '@type': 'Video', Format: 'AVC', Width: 1920, Height: 1080, FrameRate_String: '23.976 FPS' },
      { '@type': 'Audio', ID: '2', Title: 'Hindi', Language_String: 'Hindi', Format: 'AAC', Channels: 2, Channels_String: '2 channels', SamplingRate_String: '48.0 kHz', Default: 'Yes' },
      { '@type': 'Audio', ID: '3', Title: 'English', Language: 'en', Format: 'E-AC-3', Channels: 6, Default: 'No' },
    ] as Track[]);

    expect(metadata).toEqual({
      container: 'Matroska',
      videoCodec: 'AVC',
      resolution: '1920 × 1080',
      frameRate: '23.976 FPS',
      audioTracks: [
        {
          id: '2',
          title: 'Hindi',
          language: 'Hindi',
          codec: 'AAC',
          channels: '2 channels',
          sampleRate: '48.0 kHz',
          isDefault: true,
        },
        {
          id: '3',
          title: 'English',
          language: 'en',
          codec: 'E-AC-3',
          channels: '6',
          sampleRate: '',
          isDefault: false,
        },
      ],
    });
  });

  it('does not invent tracks when the parser finds no audio stream', () => {
    const metadata = normalizeMediaMetadata([{ '@type': 'General', Format: 'MPEG-4' }] as Track[]);
    expect(metadata.audioTracks).toEqual([]);
  });

  it('reports codec support only when it has a known MIME mapping', () => {
    expect(getAudioCodecSupport('AAC LC', () => 'probably')).toBe('supported');
    expect(getAudioCodecSupport('mp4a.40.2', () => 'probably')).toBe('supported');
    expect(getAudioCodecSupport('DTS-HD MA', () => '')).toBe('unsupported');
    expect(getAudioCodecSupport('Proprietary Audio', () => 'probably')).toBe('unknown');
  });

  it('probes known browser audio MIME types without claiming every codec is supported', () => {
    const probed: string[] = [];
    for (const codec of ['AAC', 'MP3', 'Opus', 'Vorbis', 'AC-3', 'E-AC-3', 'DTS', 'FLAC', 'PCM']) {
      expect(getAudioCodecSupport(codec, (mimeType) => { probed.push(mimeType); return ''; })).toBe('unsupported');
    }
    expect(probed).toHaveLength(9);
    expect(probed).toContain('audio/mp4; codecs="ec-3"');
    expect(probed).toContain('audio/mp4; codecs="ac-3"');
  });
});
