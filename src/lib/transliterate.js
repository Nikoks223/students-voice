// Multi-char Latin→Cyrillic sequences, longest first (order is critical)
const LATIN_TO_CYR_MULTI = [
  ['dzh', 'џ'],
  ['gj', 'ѓ'],
  ['zh', 'ж'],
  ['dz', 'ѕ'],
  ['lj', 'љ'],
  ['nj', 'њ'],
  ['kj', 'ќ'],
  ['ch', 'ч'],
  ['sh', 'ш'],
];

const LATIN_TO_CYR_SINGLE = {
  a: 'а', b: 'б', v: 'в', g: 'г', d: 'д', e: 'е', z: 'з',
  i: 'и', j: 'ј', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о',
  p: 'п', r: 'р', s: 'с', t: 'т', u: 'у', f: 'ф', h: 'х', c: 'ц',
};

const CYR_TO_LATIN_SINGLE = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'ѓ': 'gj', 'е': 'e',
  'ж': 'zh', 'з': 'z', 'ѕ': 'dz', 'и': 'i', 'ј': 'j', 'к': 'k', 'л': 'l',
  'љ': 'lj', 'м': 'm', 'н': 'n', 'њ': 'nj', 'о': 'o', 'п': 'p', 'р': 'r',
  'с': 's', 'т': 't', 'ќ': 'kj', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c',
  'ч': 'ch', 'џ': 'dzh', 'ш': 'sh',
};

function isUppercase(ch) {
  return ch !== ch.toLowerCase() && ch === ch.toUpperCase();
}

export function toCyrillic(text) {
  let result = '';
  let i = 0;
  while (i < text.length) {
    let matched = false;
    for (const [latin, cyr] of LATIN_TO_CYR_MULTI) {
      const chunk = text.slice(i, i + latin.length);
      if (chunk.toLowerCase() === latin) {
        result += isUppercase(chunk[0]) ? cyr.toUpperCase() : cyr;
        i += latin.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      const ch = text[i];
      const lower = ch.toLowerCase();
      const cyr = LATIN_TO_CYR_SINGLE[lower];
      result += cyr ? (isUppercase(ch) ? cyr.toUpperCase() : cyr) : ch;
      i++;
    }
  }
  return result;
}

export function toLatin(text) {
  let result = '';
  for (const ch of text) {
    const lower = ch.toLowerCase();
    const latin = CYR_TO_LATIN_SINGLE[lower];
    if (latin) {
      result += isUppercase(ch) ? latin[0].toUpperCase() + latin.slice(1) : latin;
    } else {
      result += ch;
    }
  }
  return result;
}

export function transliterateQuery(query) {
  const original = query.trim().toLowerCase();
  const cyrillic = toCyrillic(original);
  const latin = toLatin(original);
  return [...new Set([original, cyrillic, latin])];
}

// Test cases (verified manually):
// toCyrillic('programiranje') === 'програмирање'
// toCyrillic('Shkolo') === 'Школо'
// toCyrillic('matematika') === 'математика'
// toCyrillic('srednoshkolski glas') === 'средношколски глас'
// toCyrillic('Gjorgji') === 'Ѓорѓи'
// toCyrillic('dzhepaot') === 'џепаот'
// toCyrillic('Kumanovo') === 'Кумановo'  ← 'o' at end is Latin, maps to 'о'
// toLatin('програмирање') === 'programiranje'
// toLatin('Средношколски Глас') === 'Srednoshkolski Glas'
// toLatin('ѓаволот') === 'gjavolot'
// transliterateQuery('matematika') → ['matematika', 'математика']
// transliterateQuery('програмирање') → ['програмирање', 'programiranje']
// transliterateQuery('test123') → ['test123', 'тест123']
