import { Component } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, errorInfo } = this.state;

    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
        {/* Iris glow blob */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '480px',
            height: '480px',
            borderRadius: '9999px',
            background: 'radial-gradient(circle, rgba(124,92,255,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
            filter: 'blur(40px)',
          }}
        />

        <Card className="max-w-md w-full p-8 relative z-10 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p
              className="text-xs font-medium tracking-widest uppercase"
              style={{ color: 'rgba(124,92,255,0.7)' }}
            >
              Грешка
            </p>
            <h1 className="font-display text-xl font-semibold" style={{ color: 'var(--color-ink)' }}>
              Нешто тргна наопаку
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
              Се случи неочекувана грешка. Можеш да се обидеш повторно, или да се вратиш на почетна.
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button variant="primary" onClick={this.handleRetry}>
              Пробај повторно
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                window.location.href = '/';
              }}
            >
              Назад на почетна
            </Button>
          </div>

          {import.meta.env.DEV && error && (
            <details className="mt-2">
              <summary className="text-xs cursor-pointer select-none" style={{ color: 'var(--color-muted-dim)' }}>
                Детали за грешката
              </summary>
              <pre
                className="mt-3 p-4 rounded-lg text-xs overflow-auto"
                style={{
                  background: '#0D0D10',
                  color: '#EF4444',
                  border: '1px solid rgba(239,68,68,0.15)',
                  maxHeight: '200px',
                  lineHeight: 1.6,
                }}
              >
                {error.toString()}
                {errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </Card>
      </div>
    );
  }
}
