export default function AdminPageHeader({ title, subtitle, actions }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 24,
        flexWrap: 'wrap',
      }}
    >
      <div>
        <h1
          style={{
            fontFamily: "'Outfit', system-ui, sans-serif",
            fontWeight: 700,
            fontSize: 22,
            color: 'var(--color-ink)',
            letterSpacing: '-0.03em',
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: '4px 0 0' }}>{subtitle}</p>
        )}
      </div>
      {actions && <div style={{ flexShrink: 0 }}>{actions}</div>}
    </div>
  );
}
