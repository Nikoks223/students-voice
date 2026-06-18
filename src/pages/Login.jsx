import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { signInWithGoogle, signInWithFacebook, isAuthenticated, userProfile, loading } = useAuth();
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setChecking(false);
      return;
    }
    if (userProfile === undefined) return;
    navigate(userProfile ? '/' : '/onboarding', { replace: true });
  }, [isAuthenticated, userProfile, navigate]);

  const handleGoogleSignIn = async () => {
    setError('');
    setChecking(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setError('Грешка при најава. Обиди се повторно.');
      }
      setChecking(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setError('');
    setChecking(true);
    try {
      await signInWithFacebook();
    } catch (err) {
      if (err?.code === 'auth/account-exists-with-different-credential') {
        setError('Веќе постои сметка со оваа е-пошта. Најави се со Google.');
      } else if (err?.code !== 'auth/popup-closed-by-user') {
        setError('Грешка при најава. Обиди се повторно.');
      }
      setChecking(false);
    }
  };

  const showChecking = checking || (isAuthenticated && userProfile === undefined);
  const showButtons = !loading && !checking && !isAuthenticated;

  return (
    <div className="min-h-[100dvh] flex relative overflow-hidden bg-bg">
      {/* Accent smear — top-right */}
      <div
        style={{
          position: 'fixed',
          top: '-10%',
          right: '-5%',
          width: '60vw',
          height: '60vw',
          maxWidth: 700,
          maxHeight: 700,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,92,255,0.06) 0%, transparent 65%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      {/* Accent smear — bottom-left */}
      <div
        style={{
          position: 'fixed',
          bottom: '-15%',
          left: '-8%',
          width: '50vw',
          height: '50vw',
          maxWidth: 600,
          maxHeight: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,92,255,0.03) 0%, transparent 65%)',
          filter: 'blur(90px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      {/* Vignette */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--vignette)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* ── Content ── */}
      <div className="relative z-10 flex w-full min-h-[100dvh]">
        {/* ── Left panel — editorial brand ── */}
        <div
          className="hidden md:flex flex-col justify-between w-[45%] relative overflow-hidden p-12"
          style={{
            background: 'var(--login-panel-bg)',
            borderRight: '1px solid var(--login-panel-border)',
          }}
        >
          {/* Subtle directional glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 55% 55% at 25% 70%, rgba(124,92,255,0.07), transparent)',
            }}
          />
          {/* Top accent line */}
          <div
            className="absolute top-0 left-0 right-0 h-[1px]"
            style={{
              background:
                'linear-gradient(90deg, transparent, var(--color-accent) 20%, var(--color-accent) 80%, transparent)',
              opacity: 0.55,
            }}
          />

          {/* Brand mark */}
          <div className="relative z-10">
            <img src="/logo.png" alt="Средношколски Глас" className="w-8 h-8 object-contain" />
          </div>

          {/* Headline */}
          <div className="relative z-10">
            <h1
              className="font-display font-bold text-ink leading-none tracking-tight"
              style={{ fontSize: 'clamp(2rem, 3.5vw, 3.2rem)' }}
            >
              Гласот на
              <br />
              <span style={{ color: 'var(--color-accent)' }}>средното</span>
              <br />
              образование.
            </h1>
            <p className="text-ink-dim text-[13.5px] mt-4 leading-relaxed max-w-[260px]">
              Дискутирај, прашувај и поврзувај се со средношколци низ Македонија.
            </p>
          </div>

          {/* Bottom decoration — abstract bar chart */}
          <div className="relative z-10 flex items-end gap-[3px]" aria-hidden="true">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className="w-[2px] rounded-full"
                style={{
                  height: `${14 + Math.abs(Math.sin(i * 0.65) * 14)}px`,
                  background: `rgba(124,92,255,${0.1 + (i % 4) * 0.06})`,
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Right panel — auth form ── */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 md:px-16">
          {/* Mobile brand */}
          <div className="flex items-center gap-2.5 mb-10 md:hidden">
            <img src="/logo.png" alt="Средношколски Глас" className="h-8 w-auto" />
          </div>

          <div className="w-full max-w-[360px]">
            <div className="mb-8">
              <h2 className="font-display font-bold text-[22px] text-ink tracking-tight">
                Добредојдовте
              </h2>
              <p className="text-ink-dim text-[13.5px] mt-1">
                {showChecking ? 'Се проверува твојата сметка…' : 'Најавете се за да продолжите.'}
              </p>
            </div>

            {/* Error state */}
            {error && (
              <div
                className="mb-5 px-4 py-3 rounded-xl text-[13px] text-coral font-medium"
                style={{
                  background: 'var(--color-coral-soft)',
                  border: '1px solid var(--color-coral-border)',
                }}
              >
                {error}
              </div>
            )}

            {showChecking ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <div
                  className="animate-spin w-6 h-6 rounded-full border-2"
                  style={{
                    borderColor: 'var(--color-border)',
                    borderTopColor: 'var(--color-accent)',
                  }}
                />
                <p className="text-[12.5px] font-medium" style={{ color: 'var(--color-muted-dim)' }}>
                  Се проверува…
                </p>
              </div>
            ) : showButtons ? (
              <div className="space-y-2.5">
                {/* Google */}
                <button
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center gap-3 font-medium text-[14px] px-5 py-3.5 rounded-xl active:scale-[0.98]"
                  style={{
                    background: 'var(--login-btn-bg)',
                    border: '1px solid var(--login-btn-border)',
                    color: 'var(--color-ink)',
                    boxShadow: 'var(--login-btn-shadow)',
                    transition: 'background 0.2s cubic-bezier(0.16,1,0.3,1), border-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--login-btn-hover-bg)';
                    e.currentTarget.style.borderColor = 'var(--login-btn-hover-border)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--login-btn-bg)';
                    e.currentTarget.style.borderColor = 'var(--login-btn-border)';
                  }}
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Најави се со Google
                </button>

                {/* Facebook */}
                <button
                  onClick={handleFacebookSignIn}
                  className="w-full flex items-center justify-center gap-3 font-medium text-[14px] px-5 py-3.5 rounded-xl active:scale-[0.98]"
                  style={{
                    background: 'var(--login-btn-bg)',
                    border: '1px solid var(--login-btn-border)',
                    color: 'var(--color-ink)',
                    boxShadow: 'var(--login-btn-shadow)',
                    transition: 'background 0.2s cubic-bezier(0.16,1,0.3,1), border-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--login-btn-hover-bg)';
                    e.currentTarget.style.borderColor = 'var(--login-btn-hover-border)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--login-btn-bg)';
                    e.currentTarget.style.borderColor = 'var(--login-btn-border)';
                  }}
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
                    <rect width="24" height="24" rx="4" fill="#1877F2" />
                    <path
                      d="M16 8h-2a1 1 0 0 0-1 1v2h3l-.5 3H13v7h-3v-7H8v-3h2V9a4 4 0 0 1 4-4h2v3z"
                      fill="white"
                    />
                  </svg>
                  Најави се со Facebook
                </button>

                {/* Apple — coming soon */}
                <button
                  disabled
                  className="w-full flex items-center justify-center gap-2 font-medium text-[13.5px] px-5 py-3 rounded-xl cursor-not-allowed"
                  style={{
                    background: 'var(--login-apple-bg)',
                    border: '1px solid var(--login-apple-border)',
                    color: 'var(--color-muted)',
                  }}
                >
                  Apple
                  <span
                    className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-full"
                    style={{
                      background: 'var(--login-badge-bg)',
                      color: 'var(--color-muted-dim)',
                      border: '1px solid var(--login-badge-border)',
                    }}
                  >
                    наскоро
                  </span>
                </button>
              </div>
            ) : (
              <div style={{ height: 130 }} />
            )}

            <p
              className="text-[11px] text-center mt-6 leading-relaxed"
              style={{ color: 'var(--color-muted-dim)' }}
            >
              Со најава се согласуваш со нашите{' '}
              <Link
                to="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-muted transition-colors"
              >
                Услови
              </Link>{' '}
              и{' '}
              <Link
                to="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-muted transition-colors"
              >
                Политика за приватност
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
