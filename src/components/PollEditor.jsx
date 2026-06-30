import { useState, useEffect, useMemo } from 'react';
import { validatePoll } from '../lib/firestore/polls';

function Toggle({ checked, onChange }) {
  const [pressed, setPressed] = useState(false);
  // Thumb elongates on press (iOS-style tactile feedback), then settles.
  const thumbW = pressed ? 17 : 14;
  const thumbLeft = checked ? 34 - thumbW - 2 : 2;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: 36,
        height: 20,
        borderRadius: 10,
        background: checked ? 'var(--color-accent)' : 'var(--color-surface-2)',
        border: `1px solid ${checked ? 'rgba(124,92,255,0.45)' : 'var(--color-border-strong)'}`,
        boxShadow: checked
          ? 'inset 0 0 0 1px rgba(124,92,255,0.2)'
          : 'inset 0 1px 2px rgba(0,0,0,0.18)',
        cursor: 'pointer',
        transition:
          'background 0.22s cubic-bezier(0.23,1,0.32,1), border-color 0.22s, box-shadow 0.22s',
        flexShrink: 0,
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '50%',
          left: thumbLeft,
          width: thumbW,
          height: 14,
          borderRadius: 7,
          background: '#FFFFFF',
          boxShadow: '0 1px 3px rgba(0,0,0,0.25), 0 0 0 0.5px rgba(0,0,0,0.04)',
          transform: 'translateY(-50%)',
          transition:
            'left 0.22s cubic-bezier(0.23,1,0.32,1), width 0.18s cubic-bezier(0.23,1,0.32,1)',
        }}
      />
    </button>
  );
}

function Checkbox({ checked, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          flexShrink: 0,
          border: `1px solid ${checked ? 'var(--color-accent)' : 'var(--color-border-strong)'}`,
          background: checked ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
          boxShadow: checked
            ? '0 1px 4px rgba(124,92,255,0.3)'
            : 'inset 0 1px 2px rgba(0,0,0,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s cubic-bezier(0.23,1,0.32,1)',
          padding: 0,
        }}
        onMouseEnter={(e) => {
          if (!checked) e.currentTarget.style.borderColor = 'rgba(124,92,255,0.45)';
        }}
        onMouseLeave={(e) => {
          if (!checked) e.currentTarget.style.borderColor = 'var(--color-border-strong)';
        }}
      >
        {checked && (
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
      <span style={{ fontSize: 12.5, color: 'var(--color-muted)', lineHeight: 1.3 }}>{label}</span>
    </label>
  );
}

function PollIcon({ size = 14, color = 'currentColor' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/**
 * Standalone poll creation widget for NewThread.
 * Calls onChange(null) when disabled, onChange({ question, options, ... , _valid }) when enabled.
 * Internal state is preserved when toggled off → back on.
 */
export default function PollEditor({ onChange }) {
  const [enabled, setEnabled] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState([{ text: '' }, { text: '' }]);
  const [hideResults, setHideResults] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    if (!enabled) {
      onChange(null);
      return;
    }
    const draft = { question, options, expiresAt: expiresAt ? new Date(expiresAt) : null };
    const { valid } = validatePoll(draft);
    onChange({
      question,
      options,
      hideResultsUntilVote: hideResults,
      expiresAt: expiresAt || null,
      _valid: valid,
    });
  }, [enabled, question, options, hideResults, expiresAt, onChange]);

  const addOption = () => {
    if (options.length >= 6) return;
    setOptions((prev) => [...prev, { text: '' }]);
  };

  const removeOption = (idx) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateOption = (idx, text) => {
    setOptions((prev) => prev.map((o, i) => (i === idx ? { ...o, text: text.slice(0, 80) } : o)));
  };

  // Show validation error only if user has started filling in
  const dirty = question.length > 0 || options.some((o) => o.text.length > 0);
  const { valid, error } =
    enabled && dirty
      ? validatePoll({ question, options, expiresAt: expiresAt ? new Date(expiresAt) : null })
      : { valid: true, error: null };

  const minDatetime = useMemo(
    // eslint-disable-next-line react-hooks/purity -- computes once on mount; stable min date for datetime input
    () => new Date(Date.now() + 60_000).toISOString().slice(0, 16),
    [],
  );

  const inputStyle = {
    flex: 1,
    background: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border)',
    borderRadius: 10,
    padding: '8px 12px',
    fontSize: 13,
    color: 'var(--color-ink)',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
    width: '100%',
  };

  return (
    <div>
      {/* Toggle header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Toggle checked={enabled} onChange={setEnabled} />
        <span
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-muted)' }}
        >
          <PollIcon size={13} color="var(--color-muted)" />
          Анкета (опционално)
        </span>
      </div>

      {enabled && (
        <div
          style={{
            marginTop: 14,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 14,
            padding: '16px',
            animation: 'fadeUp 0.18s cubic-bezier(0.23,1,0.32,1) both',
          }}
        >
          {/* Question */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--color-muted-dim)',
                }}
              >
                Прашање
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: question.length > 180 ? '#F59E0B' : 'var(--color-muted-dimmer)',
                  fontFamily: 'monospace',
                }}
              >
                {question.length}/200
              </span>
            </div>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value.slice(0, 200))}
              placeholder="Прашање на анкетата…"
              maxLength={200}
              style={{ ...inputStyle }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(124,92,255,0.35)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            />
          </div>

          {/* Options */}
          <div style={{ marginBottom: 8 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--color-muted-dim)',
                display: 'block',
                marginBottom: 8,
              }}
            >
              Опции
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {options.map((opt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--color-muted-dimmer)',
                      fontWeight: 600,
                      width: 14,
                      textAlign: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  <input
                    value={opt.text}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Опција ${i + 1}…`}
                    maxLength={80}
                    style={{ ...inputStyle, flex: 1 }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(124,92,255,0.35)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--color-muted-dimmer)',
                      fontFamily: 'monospace',
                      flexShrink: 0,
                      width: 36,
                      textAlign: 'right',
                    }}
                  >
                    {opt.text.length}/80
                  </span>
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    disabled={options.length <= 2}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      flexShrink: 0,
                      color: options.length <= 2 ? 'var(--color-surface-2)' : 'var(--color-muted-dim)',
                      background: 'transparent',
                      border: '1px solid transparent',
                      cursor: options.length <= 2 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.12s',
                    }}
                    onMouseEnter={(e) => {
                      if (options.length > 2) {
                        e.currentTarget.style.color = 'var(--color-coral)';
                        e.currentTarget.style.borderColor = 'rgba(248,113,113,0.2)';
                        e.currentTarget.style.background = 'rgba(248,113,113,0.06)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = options.length <= 2 ? 'var(--color-surface-2)' : 'var(--color-muted-dim)';
                      e.currentTarget.style.borderColor = 'transparent';
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <RemoveIcon />
                  </button>
                </div>
              ))}
            </div>

            {options.length < 6 && (
              <button
                type="button"
                onClick={addOption}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  marginTop: 8,
                  padding: '5px 10px',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'var(--color-muted-dim)',
                  background: 'transparent',
                  border: '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--color-accent)';
                  e.currentTarget.style.borderColor = 'rgba(124,92,255,0.2)';
                  e.currentTarget.style.background = 'rgba(124,92,255,0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--color-muted-dim)';
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Додај опција
              </button>
            )}
          </div>

          {/* Settings */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px 24px',
              marginTop: 14,
              paddingTop: 14,
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <Checkbox
              checked={hideResults}
              onChange={setHideResults}
              label="Сокриј резултати додека не гласаш"
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5, color: 'var(--color-muted)' }}>Затвори на</span>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={minDatetime}
                style={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  padding: '4px 10px',
                  fontSize: 12,
                  color: expiresAt ? 'var(--color-ink)' : 'var(--color-muted-dim)',
                  outline: 'none',
                  fontFamily: 'inherit',
                  colorScheme: 'dark',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(124,92,255,0.35)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              />
            </div>
          </div>

          {/* Validation hint */}
          {dirty && !valid && error && (
            <p style={{ fontSize: 11.5, color: 'var(--color-coral)', marginTop: 10 }}>{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
