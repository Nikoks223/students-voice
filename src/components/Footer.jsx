import { Link } from 'react-router-dom';

function HeartIcon() {
  return (
    <svg
      width="12"
      height="11"
      viewBox="0 0 12 11"
      fill="currentColor"
      aria-hidden="true"
      style={{ color: 'var(--color-coral)', flexShrink: 0 }}
    >
      <path d="M6 10.5 1.318 5.864A3 3 0 0 1 5.56 1.44L6 1.883l.44-.443a3 3 0 0 1 4.242 4.242L6 10.5z" />
    </svg>
  );
}

const NAV_LINKS = [
  { label: 'Правила', to: '/guidelines' },
  { label: 'Услови', to: '/terms' },
  { label: 'Приватност', to: '/privacy' },
];

export default function Footer() {
  return (
    <footer
      style={{
        background: 'var(--footer-bg)',
        borderTop: '1px solid var(--color-border)',
        marginTop: '4rem',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Top row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          {/* Brand block */}
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Средношколски Глас" style={{ height: 34, width: 'auto', flexShrink: 0 }} />
            <div>
              <p
                style={{
                  fontFamily: "'Outfit', system-ui, sans-serif",
                  fontWeight: 600,
                  fontSize: 13.5,
                  color: 'var(--color-ink)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                }}
              >
                Средношколски Глас
              </p>
              <p
                style={{
                  fontSize: 11.5,
                  color: 'var(--color-muted-dim)',
                  marginTop: 3,
                  lineHeight: 1,
                }}
              >
                Гласот на средношколците во Македонија
              </p>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {NAV_LINKS.map(({ label, to }) => (
              <FooterLink key={to} to={to}>
                {label}
              </FooterLink>
            ))}
          </nav>
        </div>

        {/* Hairline divider */}
        <div
          style={{
            height: 1,
            background: 'var(--footer-divider)',
            margin: '20px 0',
          }}
        />

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p style={{ fontSize: 11.5, color: 'var(--color-muted-dimmer)' }}>
            &copy; 2026 Средношколски Глас. Сите права задржани.
          </p>
          <p
            style={{
              fontSize: 11.5,
              color: 'var(--color-muted-dimmer)',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            Изградено со <HeartIcon /> за средношколците
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ to, children }) {
  return (
    <Link
      to={to}
      style={{
        fontSize: 13,
        color: 'var(--color-muted)',
        textDecoration: 'none',
        transition: 'color 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--color-ink)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--color-muted)';
      }}
    >
      {children}
    </Link>
  );
}
