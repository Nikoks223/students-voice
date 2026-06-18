export const MATURA_DATES = {
  2026: '2026-06-03',
  2027: '2027-06-02',
  2028: '2028-06-07',
};

function localDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateLocal(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d); // local midnight
}

export function getNextMaturaDate(now = new Date()) {
  const todayStr = localDateStr(now);
  const sorted = Object.entries(MATURA_DATES)
    .map(([year, dateStr]) => ({ year: Number(year), dateStr, date: parseDateLocal(dateStr) }))
    .sort((a, b) => a.date - b.date);
  const next = sorted.find(({ dateStr }) => dateStr >= todayStr);
  return next ? next.date : null;
}

export function getDaysUntilMatura(now = new Date()) {
  const todayStr = localDateStr(now);
  const sorted = Object.entries(MATURA_DATES)
    .map(([year, dateStr]) => ({ year: Number(year), dateStr, date: parseDateLocal(dateStr) }))
    .sort((a, b) => a.date - b.date);
  const next = sorted.find(({ dateStr }) => dateStr >= todayStr);
  if (!next) return null;

  const todayMidnight = parseDateLocal(todayStr);
  const diffMs = next.date - todayMidnight;
  const days = Math.floor(diffMs / 86400000);
  // hours remaining from now until matura midnight (used when days === 0 to show sub-day count)
  const hours = Math.max(0, Math.floor((next.date - now) / 3600000));

  return { days, hours, date: next.date, year: next.year };
}

// Returns info about a matura that passed within `withinDays` calendar days.
export function getRecentlyPassedMatura(now = new Date(), withinDays = 3) {
  const todayStr = localDateStr(now);
  const sorted = Object.entries(MATURA_DATES)
    .map(([year, dateStr]) => ({ year: Number(year), dateStr, date: parseDateLocal(dateStr) }))
    .sort((a, b) => b.date - a.date); // descending — most recent first
  const recent = sorted.find(({ dateStr }) => {
    if (dateStr >= todayStr) return false;
    const diffDays = Math.floor((parseDateLocal(todayStr) - parseDateLocal(dateStr)) / 86400000);
    return diffDays <= withinDays;
  });
  return recent ? { date: recent.date, year: recent.year } : null;
}
