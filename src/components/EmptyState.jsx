import { useNavigate } from 'react-router-dom';
import Button from './ui/Button';

export default function EmptyState({ icon, title, message, action, tone = 'default' }) {
  const navigate = useNavigate();
  const isSoft = tone === 'soft';

  return (
    <div
      className="relative flex flex-col items-center text-center mx-auto"
      style={{
        maxWidth: 400,
        padding: isSoft ? '32px 24px' : '64px 24px',
      }}
    >
      {/* Iris glow blob */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: isSoft ? 16 : 32,
          left: '50%',
          transform: 'translateX(-50%)',
          width: isSoft ? 160 : 220,
          height: isSoft ? 160 : 220,
          borderRadius: '9999px',
          background: 'radial-gradient(circle, rgba(124,92,255,0.09) 0%, transparent 70%)',
          pointerEvents: 'none',
          filter: 'blur(24px)',
        }}
      />

      {/* Icon squircle */}
      {icon && (
        <div
          className="relative flex items-center justify-center mb-5 shrink-0"
          style={{
            width: isSoft ? 40 : 52,
            height: isSoft ? 40 : 52,
            borderRadius: isSoft ? 12 : 16,
            background: 'rgba(124,92,255,0.08)',
            border: '1px solid rgba(124,92,255,0.14)',
            fontSize: isSoft ? 18 : 22,
          }}
        >
          {icon}
        </div>
      )}

      <div className="relative flex flex-col gap-2">
        <h3
          className="font-display font-semibold leading-snug"
          style={{ fontSize: isSoft ? 14 : 15, color: 'var(--color-ink)', letterSpacing: '-0.01em' }}
        >
          {title}
        </h3>
        {message && (
          <p className="leading-relaxed" style={{ fontSize: isSoft ? 12.5 : 13, color: 'var(--color-muted)' }}>
            {message}
          </p>
        )}
      </div>

      {action && (
        <div className="mt-5">
          <Button
            variant="primary"
            size="sm"
            onClick={action.to ? () => navigate(action.to) : action.onClick}
          >
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
