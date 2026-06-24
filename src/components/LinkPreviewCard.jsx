export default function LinkPreviewCard({ preview, loading, onDismiss }) {
  if (loading) {
    return (
      <div
        className="rounded-xl overflow-hidden flex gap-3 p-3"
        style={{
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="shimmer w-16 h-16 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2 py-1">
          <div className="shimmer h-3 rounded w-2/3" />
          <div className="shimmer h-2.5 rounded w-full" />
          <div className="shimmer h-2.5 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (!preview || (!preview.title && !preview.description)) return null;

  let domain = '';
  try {
    domain = new URL(preview.url).hostname.replace(/^www\./, '');
  } catch {
    // Malformed URL — leave domain empty.
  }

  return (
    <div className="relative">
      <a
        href={preview.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex gap-3 rounded-xl overflow-hidden"
        style={{
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          textDecoration: 'none',
          transition: 'border-color 0.18s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-border-strong)')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
      >
        {preview.image && (
          <img
            src={preview.image}
            alt=""
            className="w-20 h-20 object-cover shrink-0"
            style={{ borderRight: '1px solid var(--color-border)' }}
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        )}
        <div className="flex-1 min-w-0 p-3">
          {domain && (
            <p
              className="text-[10px] font-bold uppercase tracking-widest mb-1 truncate"
              style={{ color: 'var(--color-muted-dim)' }}
            >
              {domain}
            </p>
          )}
          {preview.title && (
            <p
              className="text-[13px] font-semibold leading-snug mb-1"
              style={{
                color: 'var(--color-ink)',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {preview.title}
            </p>
          )}
          {preview.description && (
            <p
              className="text-[11.5px] leading-snug"
              style={{
                color: 'var(--color-muted-dim)',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {preview.description}
            </p>
          )}
        </div>
      </a>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Отстрани преглед"
          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
          style={{
            background: 'var(--color-surface-hover)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-muted-dim)',
            cursor: 'pointer',
            fontSize: 10,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
