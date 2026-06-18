import { Link } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import Card from '../components/ui/Card';

const suggestions = [
  { emoji: '🏠', label: 'Почетна', desc: 'Назад на главната страна', to: '/' },
  { emoji: '🔍', label: 'Пребарај', desc: 'Пронајди теми и дискусии', to: '/search' },
  {
    emoji: '💬',
    label: 'Скорешни коментари',
    desc: 'Погледни ги последните активности',
    to: '/recent',
  },
];

function NotFoundContent() {
  return (
    <div className="flex flex-col items-center py-16 px-4 text-center">
      {/* Giant 404 */}
      <p
        className="font-display font-bold select-none"
        style={{
          fontSize: 'clamp(5rem, 16vw, 9rem)',
          lineHeight: 1,
          background: 'linear-gradient(135deg, var(--color-accent) 0%, #06B6D4 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '-0.04em',
        }}
      >
        404
      </p>

      <div className="mt-6 flex flex-col gap-3 max-w-sm">
        <h1 className="font-display text-xl font-semibold" style={{ color: 'var(--color-ink)' }}>
          Оваа страна не постои
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          Можеби линкот е стар, или страната е избришана. Не се грижи — еве каде може да продолжиш:
        </p>
      </div>

      {/* Suggestion cards */}
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl">
        {suggestions.map(({ emoji, label, desc, to }) => (
          <Link key={to} to={to} style={{ textDecoration: 'none', display: 'block' }}>
            <Card variant="hover" className="flex flex-col items-start gap-2 p-5 text-left">
              <span className="text-2xl">{emoji}</span>
              <span className="font-display text-base font-semibold" style={{ color: 'var(--color-ink)' }}>
                {label}
              </span>
              <span className="text-xs leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                {desc}
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function NotFound() {
  return (
    <MainLayout>
      <NotFoundContent />
    </MainLayout>
  );
}
