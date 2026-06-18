import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getSchoolById } from '../data/schools';
import DeleteAccountModal from '../components/DeleteAccountModal';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const YEAR_LABELS = { 1: 'Прва', 2: 'Втора', 3: 'Трета', 4: 'Четврта' };

const THEME_OPTIONS = [
  {
    value: 'system',
    label: 'Системска',
    desc: 'Следи го браузерот',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
  {
    value: 'light',
    label: 'Светла',
    desc: 'Секогаш светла',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6} strokeLinecap="round">
        <circle cx="12" cy="12" r="5" />
        <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    ),
  },
  {
    value: 'dark',
    label: 'Темна',
    desc: 'Секогаш темна',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
  },
];

function FieldRow({ label, value }) {
  return (
    <div
      className="flex items-start justify-between gap-4 py-3.5"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      <span style={{ fontSize: 13, color: 'var(--color-muted)', flexShrink: 0, minWidth: 110 }}>{label}</span>
      <span
        style={{ fontSize: 13.5, color: 'var(--color-ink-dim)', textAlign: 'right', wordBreak: 'break-all' }}
      >
        {value || '—'}
      </span>
    </div>
  );
}

export default function Settings() {
  const { userProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const schoolName = getSchoolById(userProfile?.school)?.name ?? userProfile?.school ?? '—';
  const yearLabel = userProfile?.year
    ? `${YEAR_LABELS[userProfile.year] ?? userProfile.year} година`
    : '—';

  return (
    <div className="max-w-2xl" style={{ animation: 'fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) both' }}>
      {/* Page header */}
      <div className="mb-10">
        <p
          className="text-[9px] font-bold uppercase tracking-[0.18em] mb-1.5"
          style={{ color: 'var(--color-muted-dimmer)' }}
        >
          Средношколски Глас
        </p>
        <h1 className="font-display font-bold text-[22px] tracking-tight leading-none" style={{ color: 'var(--color-ink)' }}>
          Поставки на сметката
        </h1>
      </div>

      {/* ── Profile section ── */}
      <section className="mb-10">
        <h2
          className="font-display font-semibold text-[13px] mb-1"
          style={{ letterSpacing: '-0.01em', color: 'var(--color-ink)' }}
        >
          Профил
        </h2>
        <p className="text-[12px] mb-4" style={{ color: 'var(--color-muted-dim)' }}>
          Промена на профилот ќе биде достапна подоцна.
        </p>

        <Card className="px-4 py-0">
          <FieldRow label="Псевдоним" value={userProfile?.username} />
          <FieldRow label="Е-маил" value={userProfile?.email} />
          <FieldRow label="Училиште" value={schoolName} />
          <FieldRow label="Година" value={yearLabel} />
        </Card>
      </section>

      <div style={{ height: 1, background: 'var(--color-border)', marginBottom: '2.5rem' }} />

      {/* ── Theme section ── */}
      <section className="mb-10">
        <h2
          className="font-display font-semibold text-[13px] mb-1"
          style={{ letterSpacing: '-0.01em', color: 'var(--color-ink)' }}
        >
          Тема
        </h2>
        <p className="text-[12px] mb-4" style={{ color: 'var(--color-muted-dim)' }}>
          Изберете тема за изгледот на апликацијата.
        </p>

        <div className="flex gap-3">
          {THEME_OPTIONS.map(({ value, label, desc, icon }) => {
            const active = theme === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  borderRadius: 14,
                  border: `1px solid ${active ? 'rgba(124,92,255,0.5)' : 'var(--color-border)'}`,
                  background: active ? 'rgba(124,92,255,0.07)' : 'var(--color-surface)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.18s cubic-bezier(0.16,1,0.3,1)',
                  boxShadow: active ? '0 0 0 3px rgba(124,92,255,0.1)' : 'none',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.borderColor = 'var(--color-border-strong)';
                    e.currentTarget.style.background = 'var(--color-surface-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.background = 'var(--color-surface)';
                  }
                }}
              >
                {active && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: 'var(--color-accent)',
                    }}
                  />
                )}
                <span
                  style={{
                    display: 'block',
                    marginBottom: 8,
                    color: active ? 'var(--color-accent)' : 'var(--color-muted)',
                  }}
                >
                  {icon}
                </span>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: active ? 'var(--color-accent)' : 'var(--color-ink)',
                    marginBottom: 2,
                    fontFamily: 'inherit',
                  }}
                >
                  {label}
                </p>
                <p style={{ fontSize: 11.5, color: 'var(--color-muted)', fontFamily: 'inherit' }}>
                  {desc}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <div style={{ height: 1, background: 'var(--color-border)', marginBottom: '2.5rem' }} />

      {/* ── Danger zone ── */}
      <section>
        <h2
          className="font-display font-semibold text-[13px] mb-4"
          style={{ letterSpacing: '-0.01em', color: 'var(--color-coral)' }}
        >
          Опасна зона
        </h2>

        <div
          style={{
            background: 'rgba(248,113,113,0.03)',
            border: '1px solid rgba(248,113,113,0.15)',
            borderRadius: 14,
            padding: '20px 22px',
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3
                className="font-display font-semibold mb-2"
                style={{ fontSize: 15, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}
              >
                Избриши ја сметката
              </h3>
              <p className="leading-relaxed mb-3" style={{ fontSize: 13, color: 'var(--color-ink-dim)' }}>
                Кога ќе ја избришеш сметката: твоите лични податоци (е-маил, псевдоним, училиште) се
                трајно отстрануваат. Твоите постови и коментари остануваат видливи но без твоето
                ime, за да не се загубат разговорите. Оваа акција е неповратна.
              </p>
              <Link
                to="/privacy"
                style={{
                  fontSize: 12,
                  color: 'var(--color-accent)',
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px',
                }}
              >
                Прочитај повеќе за обработката на податоци
              </Link>
            </div>

            <div className="shrink-0">
              <Button
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
                className="whitespace-nowrap"
              >
                Избриши сметка
              </Button>
            </div>
          </div>
        </div>
      </section>

      {deleteOpen && <DeleteAccountModal onClose={() => setDeleteOpen(false)} />}
    </div>
  );
}
