import { useNavigate } from 'react-router-dom';
import Button from './ui/Button';

export default function LegalPage({ title, lastUpdated, sections }) {
  const navigate = useNavigate();

  return (
    <div
      className="max-w-3xl mx-auto py-10"
      style={{ animation: 'fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) both' }}
    >
      {/* Back link */}
      <Button
        variant="ghost"
        onClick={() => navigate('/')}
        className="mb-8"
        style={{ fontSize: 13, paddingLeft: 0 }}
      >
        <svg
          className="w-3.5 h-3.5 mr-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Назад на почетна
      </Button>

      {/* Page header */}
      <div className="mb-12">
        <h1
          className="font-display text-3xl font-bold text-ink"
          style={{ letterSpacing: '-0.03em' }}
        >
          {title}
        </h1>
        {lastUpdated && (
          <p className="text-muted text-sm mt-2">Последно ажурирање: {lastUpdated}</p>
        )}
      </div>

      {/* Sections */}
      <div>
        {sections.map((section, i) => (
          <div key={i}>
            {/* Divider — only between sections that have headings (not above intro) */}
            {i > 0 && (
              <hr
                style={{
                  border: 'none',
                  borderTop: '1px solid var(--color-border)',
                  margin: '2.5rem 0',
                }}
              />
            )}

            {section.heading && (
              <h2
                className="font-display text-lg font-semibold text-ink mb-3"
                style={{ letterSpacing: '-0.02em' }}
              >
                {section.heading}
              </h2>
            )}

            {section.paragraphs.map((p, j) => (
              <p
                key={j}
                className="leading-relaxed mb-3"
                style={{ fontSize: 15, color: 'var(--color-ink-dim)', lineHeight: 1.75 }}
              >
                {p}
              </p>
            ))}

            {section.items && (
              <ul className="mt-1 space-y-2 mb-3" style={{ paddingLeft: '0.25rem' }}>
                {section.items.map((item, k) => (
                  <li
                    key={k}
                    className="flex items-start gap-3"
                    style={{ fontSize: 15, color: 'var(--color-ink-dim)', lineHeight: 1.75 }}
                  >
                    <span
                      style={{
                        flexShrink: 0,
                        marginTop: '0.55rem',
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: 'var(--color-accent)',
                        opacity: 0.7,
                        display: 'block',
                      }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
