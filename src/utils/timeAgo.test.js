import { describe, it, expect, vi, afterEach } from 'vitest';
import { timeAgo } from './timeAgo';

const NOW = new Date('2026-06-24T12:00:00Z').getTime();

afterEach(() => {
  vi.useRealTimers();
});

function at(msAgo) {
  return new Date(NOW - msAgo);
}

describe('timeAgo', () => {
  it('returns empty string for missing date', () => {
    expect(timeAgo(null)).toBe('');
    expect(timeAgo(undefined)).toBe('');
  });

  it('says "сега" under a minute', () => {
    vi.setSystemTime(NOW);
    expect(timeAgo(at(30 * 1000))).toBe('сега');
  });

  it('formats minutes, hours and days', () => {
    vi.setSystemTime(NOW);
    expect(timeAgo(at(5 * 60 * 1000))).toBe('пред 5 мин');
    expect(timeAgo(at(3 * 3600 * 1000))).toBe('пред 3 ч');
    expect(timeAgo(at(2 * 86400 * 1000))).toBe('пред 2 д');
  });

  it('supports Firestore Timestamp-like objects (toDate)', () => {
    vi.setSystemTime(NOW);
    const ts = { toDate: () => at(5 * 60 * 1000) };
    expect(timeAgo(ts)).toBe('пред 5 мин');
  });

  it('falls back to a day/month label past 30 days', () => {
    vi.setSystemTime(NOW);
    const result = timeAgo(at(40 * 86400 * 1000));
    expect(result).toMatch(/^\d{1,2} \p{L}+$/u);
  });
});
