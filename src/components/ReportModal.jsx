import { useState } from 'react';
import { createReport } from '../lib/firestore/reports';
import { useAuth } from '../context/AuthContext';
import { Dialog, DialogContent, DialogClose } from './ui/Dialog';
import Button from './ui/Button';

const REASONS = [
  { value: 'spam', label: 'Спам' },
  { value: 'offensive', label: 'Навредлива содржина' },
  { value: 'misinformation', label: 'Дезинформации' },
  { value: 'inappropriate_age', label: 'Несоодветна содржина за возраст' },
  { value: 'other', label: 'Друго' },
];

export default function ReportModal({ targetType, targetId, threadId, onClose }) {
  const { userProfile } = useAuth();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!reason || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await createReport({
        targetType,
        targetId,
        threadId,
        reason,
        details,
        reporterId: userProfile.id,
        reporterUsername: userProfile.username,
      });
      setSuccess(true);
      setTimeout(onClose, 1600);
    } catch (err) {
      setError(err.message ?? 'Грешка. Обиди се повторно.');
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-[420px] p-0 overflow-hidden">
        {/* Header */}
        <div
          style={{
            padding: '16px 18px 14px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                background: 'rgba(248,113,113,0.1)',
                border: '1px solid rgba(248,113,113,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg
                style={{ width: 14, height: 14, color: 'var(--color-coral)' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2
              style={{
                fontFamily: "'Outfit', system-ui, sans-serif",
                fontWeight: 700,
                fontSize: 15,
                color: 'var(--color-ink)',
                letterSpacing: '-0.03em',
                margin: 0,
              }}
            >
              Пријави содржина
            </h2>
          </div>
          <DialogClose
            className="w-[26px] h-[26px] rounded-[7px] flex items-center justify-center text-muted hover:text-ink hover:bg-surface transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            aria-label="Затвори"
          >
            <svg
              style={{ width: 13, height: 13 }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </DialogClose>
        </div>

        {/* Body */}
        {success ? (
          <div
            style={{
              padding: '36px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 11,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 13,
                background: 'rgba(34,197,94,0.1)',
                border: '1px solid rgba(34,197,94,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                style={{ width: 19, height: 19, color: '#4ADE80' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p
              style={{
                fontSize: 13.5,
                color: 'var(--color-ink-dim)',
                textAlign: 'center',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Благодариме за пријавата.
              <br />
              <span style={{ color: 'var(--color-muted-dim)', fontSize: 12 }}>Ќе ја разгледаме наскоро.</span>
            </p>
          </div>
        ) : (
          <div style={{ padding: '14px 18px 18px' }}>
            <p style={{ fontSize: 11.5, color: 'var(--color-muted-dim)', margin: '0 0 12px' }}>
              Избери причина за пријавата:
            </p>

            {/* Reason radio list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
              {REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setReason(r.value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 11px',
                    borderRadius: 9,
                    textAlign: 'left',
                    background:
                      reason === r.value ? 'rgba(129,140,248,0.08)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${reason === r.value ? 'rgba(129,140,248,0.25)' : 'var(--color-border)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.13s',
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      flexShrink: 0,
                      border: `1.5px solid ${reason === r.value ? 'var(--color-accent-bright)' : 'var(--color-muted-dimmer)'}`,
                      background: reason === r.value ? 'var(--color-accent-bright)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.13s',
                    }}
                  >
                    {reason === r.value && (
                      <span
                        style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }}
                      />
                    )}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: reason === r.value ? 'var(--color-ink)' : 'var(--color-ink-dim)',
                      fontWeight: reason === r.value ? 500 : 400,
                    }}
                  >
                    {r.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Details */}
            <div style={{ marginBottom: 14 }}>
              <label
                htmlFor="report-details"
                style={{
                  display: 'block',
                  fontSize: 10.5,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--color-muted-dim)',
                  marginBottom: 5,
                }}
              >
                Дополнителни детали&nbsp;
                <span style={{ textTransform: 'none', fontWeight: 400, fontSize: 10.5 }}>
                  (опционално)
                </span>
              </label>
              <textarea
                id="report-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Опиши ја проблематичната содржина…"
                rows={2}
                className="input"
                style={{ resize: 'none', fontSize: 13 }}
              />
            </div>

            {error && <p style={{ fontSize: 11.5, color: 'var(--color-coral)', marginBottom: 10 }}>{error}</p>}

            <div style={{ display: 'flex', gap: 7, justifyContent: 'flex-end' }}>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Откажи
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={submitting}
                disabled={!reason || submitting}
                onClick={handleSubmit}
              >
                Прати пријава
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
