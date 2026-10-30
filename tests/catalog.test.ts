import { describe, it, expect } from 'vitest';
import { CATALOG, GENRES } from '../src/data/catalog';

describe('Catalog Data', () => {
  it('contains movies, series, and live tv items', () => {
    const movies = CATALOG.filter((m) => m.type === 'movie');
    const series = CATALOG.filter((m) => m.type === 'series');
    const livetv = CATALOG.filter((m) => m.type === 'livetv');

    expect(movies.length).toBeGreaterThan(0);
    expect(series.length).toBeGreaterThan(0);
    expect(livetv.length).toBeGreaterThan(0);
  });

  it('all items have valid id, title, and videoUrl', () => {
    for (const item of CATALOG) {
      expect(item.id).toBeTruthy();
      expect(item.title).toBeTruthy();
      expect(item.videoUrl).toMatch(/^https?:\/\//);
      expect(item.posterUrl).toMatch(/^https?:\/\//);
    }
  });

  it('web series have valid seasons and episodes', () => {
    const series = CATALOG.filter((m) => m.type === 'series');
    for (const s of series) {
      expect(s.seasons).toBeDefined();
      expect(s.seasons?.length).toBeGreaterThan(0);
      for (const season of s.seasons!) {
        expect(season.episodes.length).toBeGreaterThan(0);
        for (const ep of season.episodes) {
          expect(ep.videoUrl).toBeTruthy();
          expect(ep.title).toBeTruthy();
          expect(ep.duration).toBeGreaterThan(0);
        }
      }
    }
  });

  it('genres array includes All as primary default', () => {
    expect(GENRES[0]).toBe('All');
    expect(GENRES).toContain('Sci-Fi');
    expect(GENRES).toContain('Action');
  });
});
