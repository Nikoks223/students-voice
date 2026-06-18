const MK_MONTHS = [
  'јан',
  'фев',
  'мар',
  'апр',
  'мај',
  'јун',
  'јул',
  'авг',
  'сеп',
  'окт',
  'ное',
  'дек',
];

export function timeAgo(date) {
  if (!date) return '';
  const d = date?.toDate ? date.toDate() : new Date(date);
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);

  if (seconds < 60) return 'сега';
  if (seconds < 3600) return `пред ${Math.floor(seconds / 60)} мин`;
  if (seconds < 86400) return `пред ${Math.floor(seconds / 3600)} ч`;
  if (seconds < 30 * 86400) return `пред ${Math.floor(seconds / 86400)} д`;

  return `${d.getDate()} ${MK_MONTHS[d.getMonth()]}`;
}

export function formatFullDate(date) {
  if (!date) return '';
  const d = date?.toDate ? date.toDate() : new Date(date);
  return d.toLocaleString('mk-MK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
