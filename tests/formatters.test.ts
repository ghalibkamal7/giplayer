import { describe, it, expect } from 'vitest';
import { formatDuration, formatTimeRemaining, formatBytes, formatRelativeTime } from '../src/utils/formatters';

describe('formatters', () => {
  it('formats seconds into MM:SS correctly', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(45)).toBe('00:45');
    expect(formatDuration(65)).toBe('01:05');
    expect(formatDuration(599)).toBe('09:59');
  });

  it('formats hours into HH:MM:SS correctly', () => {
    expect(formatDuration(3600)).toBe('01:00:00');
    expect(formatDuration(3665)).toBe('01:01:05');
    expect(formatDuration(7325)).toBe('02:02:05');
  });

  it('handles negative or NaN values safely', () => {
    expect(formatDuration(-10)).toBe('00:00');
    expect(formatDuration(NaN)).toBe('00:00');
  });

  it('formats time remaining with minus sign', () => {
    expect(formatTimeRemaining(10, 60)).toBe('-00:50');
    expect(formatTimeRemaining(60, 60)).toBe('-00:00');
  });

  it('formats byte sizes cleanly', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
  });

  it('formats relative timestamps', () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 10000)).toBe('Just now');
    expect(formatRelativeTime(now - 5 * 60 * 1000)).toBe('5m ago');
    expect(formatRelativeTime(now - 3 * 3600 * 1000)).toBe('3h ago');
  });
});
