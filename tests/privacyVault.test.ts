import { describe, expect, it } from 'vitest';
import { fingerprintMediaId, getVaultMediaIdentity } from '../src/services/privacyVault';

describe('privacy vault media identity', () => {
  it('uses a stable source folder and path for remembered directory imports', () => {
    expect(getVaultMediaIdentity('folder-1', 'Movies/clip.mp4', { size: 10, lastModified: 20 }))
      .toBe('folder-1/Movies/clip.mp4');
  });

  it('includes file metadata when a file picker does not expose a stable folder handle', () => {
    expect(getVaultMediaIdentity(undefined, 'clip.mp4', { size: 10, lastModified: 20 }))
      .toBe('clip.mp4:10:20');
  });

  it('creates a deterministic one-way fingerprint without storing the media identity', async () => {
    const identity = 'folder-1/Movies/clip.mp4';
    const fingerprint = await fingerprintMediaId(identity);
    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(await fingerprintMediaId(identity)).toBe(fingerprint);
    expect(fingerprint).not.toContain('clip');
  });
});
