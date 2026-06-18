import { getAvatarGradient } from '../../lib/avatarGradient';
import { cloudinaryThumb } from '../../lib/cloudinary';

// xs added; sizes mapped to fixed px for predictable layout.
const SIZE = {
  xs: { px: 20, iconPx: 9, text: 'text-[10px]', radius: 'rounded-lg' },
  sm: { px: 28, iconPx: 13, text: 'text-xs', radius: 'rounded-xl' },
  md: { px: 36, iconPx: 16, text: 'text-sm', radius: 'rounded-2xl' },
  lg: { px: 48, iconPx: 21, text: 'text-base', radius: 'rounded-2xl' },
  xl: { px: 72, iconPx: 30, text: 'text-xl', radius: 'rounded-2xl' },
};

const DELETED = '[избришан корисник]';

// Supports both { user } and legacy { username, avatarUrl } call sites.
export default function Avatar({
  user,
  username: usernameProp,
  avatarUrl: avatarUrlProp,
  size = 'md',
  className = '',
  eager = false,
}) {
  const username = user?.username ?? usernameProp;
  const avatarUrl = user?.avatarUrl ?? avatarUrlProp;

  const { px, iconPx, text, radius } = SIZE[size] ?? SIZE.md;
  const base = `shrink-0 inline-flex items-center justify-center overflow-hidden cursor-default border ${radius} ${className}`;

  if (!username || username === DELETED) {
    return (
      <div
        className={base}
        style={{
          width: px,
          height: px,
          background: 'var(--color-surface-2)',
          borderColor: 'var(--color-border)',
        }}
        aria-hidden="true"
      >
        <svg
          style={{ width: iconPx, height: iconPx, color: 'var(--color-muted-dimmer)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      </div>
    );
  }

  const { from, to } = getAvatarGradient(username);

  if (avatarUrl) {
    const thumbWidth = size === 'xl' ? 288 : size === 'lg' ? 192 : 96;
    return (
      <img
        src={cloudinaryThumb(avatarUrl, { width: thumbWidth })}
        alt={username}
        width={px}
        height={px}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className={`${base} border-border object-cover`}
        style={{ width: px, height: px }}
      />
    );
  }

  return (
    <div
      className={`${base} border-border font-medium text-white ${text}`}
      style={{ width: px, height: px, background: `linear-gradient(135deg, ${from}, ${to})` }}
      aria-label={username}
    >
      {username.charAt(0).toUpperCase()}
    </div>
  );
}
