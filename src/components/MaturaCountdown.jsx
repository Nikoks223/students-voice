import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDaysUntilMatura, getRecentlyPassedMatura } from '../lib/maturaDate';
import Card from './ui/Card';
import Button from './ui/Button';

const MK_MONTHS = [
  'јануари',
  'февруари',
  'март',
  'април',
  'мај',
  'јуни',
  'јули',
  'август',
  'септември',
  'октомври',
  'ноември',
  'декември',
];

function formatMacedonianDate(date) {
  return `${date.getDate()} ${MK_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function Label() {
  return (
    <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted mb-2">
      ДРЖАВНА МАТУРА
    </p>
  );
}

function ForumLink({ onLinkClick, navigate, primary = false }) {
  if (primary) {
    return (
      <Button
        variant="primary"
        size="sm"
        fullWidth
        className="mt-3 justify-center"
        style={{ fontSize: '0.75rem' }}
        onClick={() => {
          onLinkClick?.();
          navigate('/p/drzavna-matura');
        }}
      >
        Кон форумот
      </Button>
    );
  }
  return (
    <Link
      to="/p/drzavna-matura"
      onClick={onLinkClick}
      className="text-xs text-muted hover:text-ink-dim transition-colors mt-2 block"
    >
      → Подготовка
    </Link>
  );
}

export default function MaturaCountdown({ onLinkClick }) {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const info = useMemo(() => getDaysUntilMatura(), []);
  const recent = useMemo(() => getRecentlyPassedMatura(), []);

  if (userProfile?.year !== 4) return null;
  if (!info && !recent) return null;

  // STATE F: matura just passed (within 3 days)
  if (recent) {
    return (
      <Card
        className="p-4"
        style={{ background: 'rgba(124,92,255,0.04)', borderColor: 'rgba(124,92,255,0.22)' }}
      >
        <Label />
        <p className="font-display text-lg font-bold text-ink leading-tight mb-1">
          Матурата помина! 🎉
        </p>
        <p className="text-xs text-ink-dim mb-2">Честитки на сите матуранти!</p>
        <Link
          to="/p/drzavna-matura"
          onClick={onLinkClick}
          className="text-xs text-muted hover:text-ink-dim transition-colors block"
        >
          → Кон форумот
        </Link>
      </Card>
    );
  }

  const { days, date } = info;
  const formattedDate = formatMacedonianDate(date);

  // STATE D: today
  if (days === 0) {
    return (
      <Card
        className="p-4"
        style={{ background: 'rgba(248,113,113,0.05)', borderColor: 'rgba(248,113,113,0.25)' }}
      >
        <Label />
        <p
          className="font-display text-3xl font-bold leading-none mb-1"
          style={{ color: 'var(--color-coral)' }}
        >
          ДЕНЕС
        </p>
        <p className="text-xs text-ink-dim mb-3">Кошуло на матура! 🍀</p>
        <ForumLink onLinkClick={onLinkClick} navigate={navigate} primary />
      </Card>
    );
  }

  // STATE C: very close (< 7 days)
  if (days < 7) {
    return (
      <Card
        className="p-4"
        style={{ background: 'rgba(248,113,113,0.05)', borderColor: 'rgba(248,113,113,0.25)' }}
      >
        <Label />
        <div className="flex items-baseline gap-1.5 mb-0.5">
          <span
            className="font-display text-3xl font-bold leading-none"
            style={{ color: 'var(--color-coral)' }}
          >
            {days}
          </span>
          <span className="text-sm text-ink-dim">дена</span>
        </div>
        <p className="text-xs text-muted mb-1">до {formattedDate}</p>
        <p className="text-xs text-muted mb-3">Уште малку! 💪</p>
        <ForumLink onLinkClick={onLinkClick} navigate={navigate} primary />
      </Card>
    );
  }

  // STATE B: final stretch (< 30 days)
  if (days < 30) {
    return (
      <Card
        className="p-4"
        style={{ background: 'rgba(124,92,255,0.04)', borderColor: 'rgba(124,92,255,0.22)' }}
      >
        <Label />
        <div className="flex items-baseline gap-1.5 mb-0.5">
          <span
            className="font-display text-3xl font-bold leading-none"
            style={{ color: 'var(--color-accent)' }}
          >
            {days}
          </span>
          <span className="text-sm text-ink-dim">дена</span>
        </div>
        <p className="text-xs text-muted mb-1">до {formattedDate}</p>
        <p className="text-xs text-muted mb-3">Време е за финална подготовка ✨</p>
        <ForumLink onLinkClick={onLinkClick} navigate={navigate} />
      </Card>
    );
  }

  // STATE A: many days (>= 30) — calm
  return (
    <Card className="p-4" style={{ background: 'rgba(124,92,255,0.025)' }}>
      <Label />
      <div className="flex items-baseline gap-1.5 mb-0.5">
        <span className="font-display text-3xl font-bold leading-none text-ink">{days}</span>
        <span className="text-sm text-ink-dim">дена</span>
      </div>
      <p className="text-xs text-muted mb-3">до {formattedDate}</p>
      <ForumLink onLinkClick={onLinkClick} navigate={navigate} />
    </Card>
  );
}
