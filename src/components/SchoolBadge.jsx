import { getSchoolById } from '../data/schools';

const SIZE = {
  xs: 'px-1.5 py-0.5 text-[10px]',
  sm: 'px-2 py-0.5 text-xs',
};

export default function SchoolBadge({ school, size = 'xs' }) {
  const entry = getSchoolById(school);
  if (!entry) return null;

  const label = entry.shortName ?? entry.name.charAt(0);

  return (
    <span
      className={`chip bg-iris-soft text-iris font-mono font-medium rounded-full ${SIZE[size]}`}
    >
      {label}
    </span>
  );
}
