import { createContext, useContext, useEffect, useRef, useState } from 'react';

const ThemeContext = createContext(null);

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setThemeRaw] = useState(() => localStorage.getItem('theme') || 'system');
  const [resolvedTheme, setResolvedTheme] = useState(() => {
    const stored = localStorage.getItem('theme') || 'system';
    return stored === 'system' ? getSystemTheme() : stored;
  });
  const isFirstMount = useRef(true);

  useEffect(() => {
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    setResolvedTheme(resolved);

    const root = document.documentElement;
    root.setAttribute('data-theme', resolved);
    localStorage.setItem('theme', theme);

    if (!isFirstMount.current) {
      root.classList.add('switching-theme');
      const t = setTimeout(() => root.classList.remove('switching-theme'), 350);
      return () => clearTimeout(t);
    }
    isFirstMount.current = false;
  }, [theme]);

  // When on system theme, follow OS preference changes live
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const next = mq.matches ? 'dark' : 'light';
      setResolvedTheme(next);
      document.documentElement.setAttribute('data-theme', next);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = (next) => setThemeRaw(next);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}
