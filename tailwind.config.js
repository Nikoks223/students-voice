/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // All colors resolve via CSS custom properties — theme switching handled by [data-theme] on <html>
        bg: 'var(--color-bg)',
        'bg-elevated': 'var(--color-bg-elevated)',
        surface: 'var(--color-surface)',
        'surface-2': 'var(--color-surface-2)',
        'surface-3': 'var(--color-surface-3)',

        border: 'var(--color-border)',
        'border-strong': 'var(--color-border-strong)',

        ink: 'var(--color-ink)',
        'ink-dim': 'var(--color-ink-dim)',
        muted: 'var(--color-muted)',

        accent: {
          DEFAULT: 'var(--color-accent)',
          deep: 'var(--color-accent-deep)',
          bright: 'var(--color-accent-bright)',
          soft: 'var(--color-accent-soft)',
          border: 'var(--color-accent-border)',
        },
        // Alias kept for legacy `iris-*` utility call sites
        iris: {
          DEFAULT: 'var(--color-accent)',
          bright: 'var(--color-accent-bright)',
          soft: 'var(--color-accent-soft)',
        },

        coral: {
          DEFAULT: 'var(--color-coral)',
          soft: 'var(--color-coral-soft)',
        },
        amber: {
          DEFAULT: 'var(--color-amber)',
          soft: 'var(--color-amber-soft)',
          border: 'var(--color-amber-border)',
        },
      },

      fontFamily: {
        sans: ['"Geist"', 'system-ui', 'sans-serif'],
        display: ['"Outfit"', '"Geist"', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },

      borderRadius: {
        '2xl': '14px',
        '3xl': '20px',
        '4xl': '28px',
      },

      boxShadow: {
        // All shadows resolve via CSS custom properties — theme-aware
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        pop: 'var(--shadow-pop)',
        glass: 'var(--shadow-glass)',
        'iris-glow': 'var(--shadow-iris-glow)',
      },

      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },

      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
      },
      animation: {
        shimmer: 'shimmer 2.5s linear infinite',
        'fade-up': 'fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both',
        'glow-pulse': 'glow-pulse 5s ease-in-out infinite',
      },
    },
  },

  safelist: [
    'bg-bg',
    'bg-bg-elevated',
    'bg-surface',
    'bg-surface-2',
    'bg-surface-3',
    'bg-accent',
    'bg-accent-soft',
    'text-ink',
    'text-ink-dim',
    'text-muted',
    'text-accent',
    'text-accent-bright',
    'text-coral',
    'text-amber',
    'border-border',
    'border-border-strong',
    'border-accent',
    'border-amber',
    'shadow-card',
    'shadow-card-hover',
    'shadow-pop',
    'shadow-glass',
    'font-display',
    'font-mono',
    'animate-shimmer',
    'animate-fade-up',
    'animate-glow-pulse',
    'hover:bg-surface',
    'hover:bg-surface-2',
    'hover:bg-surface-3',
    'hover:text-ink',
    'group-hover:text-accent',
  ],

  plugins: [],
};
