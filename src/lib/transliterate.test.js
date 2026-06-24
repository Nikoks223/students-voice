import { describe, it, expect } from 'vitest';
import { toCyrillic, toLatin, transliterateQuery } from './transliterate';

describe('toCyrillic', () => {
  it('transliterates basic Latin words', () => {
    expect(toCyrillic('matematika')).toBe('математика');
    expect(toCyrillic('programiranje')).toBe('програмирање');
    expect(toCyrillic('srednoshkolski glas')).toBe('средношколски глас');
  });

  it('handles multi-char sequences, longest-first', () => {
    expect(toCyrillic('dzhepaot')).toBe('џепаот');
    expect(toCyrillic('zhaba')).toBe('жаба');
  });

  it('preserves uppercase on the first letter of a digraph', () => {
    expect(toCyrillic('Shkolo')).toBe('Школо');
    expect(toCyrillic('Gjorgji')).toBe('Ѓорѓи');
  });

  it('passes through characters with no mapping', () => {
    expect(toCyrillic('test123')).toBe('тест123');
  });
});

describe('toLatin', () => {
  it('transliterates Cyrillic back to Latin', () => {
    expect(toLatin('програмирање')).toBe('programiranje');
    expect(toLatin('ѓаволот')).toBe('gjavolot');
  });

  it('capitalises only the first Latin letter of a digraph', () => {
    expect(toLatin('Средношколски Глас')).toBe('Srednoshkolski Glas');
  });
});

describe('transliterateQuery', () => {
  it('returns unique original + cyrillic + latin variants', () => {
    expect(transliterateQuery('matematika')).toEqual(['matematika', 'математика']);
    expect(transliterateQuery('програмирање')).toEqual(['програмирање', 'programiranje']);
  });

  it('deduplicates when variants collide', () => {
    const result = transliterateQuery('test123');
    expect(new Set(result).size).toBe(result.length);
    expect(result).toContain('test123');
  });
});
