import { describe, it, expect } from 'vitest';
import { fmt } from './format';

describe('fmt (byte formatting)', () => {
  it('returns empty string for falsy / zero input', () => {
    expect(fmt(0)).toBe('');
    expect(fmt(undefined)).toBe('');
    expect(fmt(null)).toBe('');
  });

  it('formats bytes under 1 KB', () => {
    expect(fmt(512)).toBe('512 B');
    expect(fmt(1023)).toBe('1023 B');
  });

  it('formats kilobytes with no decimals', () => {
    expect(fmt(1024)).toBe('1 KB');
    expect(fmt(2048)).toBe('2 KB');
  });

  it('formats megabytes with one decimal', () => {
    expect(fmt(1048576)).toBe('1.0 MB');
    expect(fmt(1572864)).toBe('1.5 MB');
  });
});
