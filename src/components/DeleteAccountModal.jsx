import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { auth, googleProvider } from '../lib/firebase';
import { deleteAccount } from '../lib/firestore/account';
import { Dialog, DialogContent, DialogClose } from './ui/Dialog';
import Button from './ui/Button';

const CONSEQUENCES = [
  'Твоите лични податоци ќе бидат трајно отстранети',
  "Твоите постови и коментари ќе останат видливи, но како '[избришан корисник]'",
  'Твојот псевдоним ќе се ослободи за идна употреба',
  'Нема да можеш да се најавиш со истата сметка повторно',
  'Оваа акција е неповратна',
];

function CoralDot() {
  return (
    <span
      style={{
        flexShrink: 0,
        marginTop: '0.6rem',
        width: 5,
        height: 5,
        borderRadius: '50%',
        background: 'var(--color-coral)',
        opacity: 0.7,
        display: 'block',
      }}
    />
  );
}

export default function DeleteAccountModal({ onClose }) {
  const navigate = useNavigate();
  const { userProfile, firebaseUser, signOut } = useAuth();

  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [reauthWorking, setReauthWorking] = useState(false);
  const [error, setError] = useState(null);

  const username = userProfile?.username ?? '';
  const confirmed = confirmText === username;
  const busy = submitting || reauthWorking;

  const runDelete = async (fbUser) => {
    await deleteAccount(userProfile.id, fbUser);
    navigate('/');
    await signOut();
  };

  const handleSubmit = async () => {
    if (!confirmed || busy) return;
    setSubmitting(true);
    setError(null);
    try {
      await runDelete(firebaseUser);
    } catch (err) {
      console.error('[DeleteAccountModal] Deletion error:', err, err.code, err.message);
      if (err.code === 'auth/requires-recent-login') {
        setNeedsReauth(true);
        setSubmitting(false);
      } else {
        setError(err.message ?? 'Грешка. Обиди се повторно.');
        setSubmitting(false);
      }
    }
  };

  const handleReauth = async () => {
    setReauthWorking(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      await runDelete(auth.currentUser);
    } catch (err) {
      console.error('[DeleteAccountModal] Deletion error:', err, err.code, err.message);
      setError(err.message ?? 'Грешка при повторна најава.');
      setReauthWorking(false);
      setNeedsReauth(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v && !busy) onClose();
      }}
    >
      <DialogContent className="max-w-[460px] p-0 overflow-hidden">
        {/* Header */}
        <div
          style={{
            padding: '16px 20px 14px',
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
                border: '1px solid rgba(248,113,113,0.2)',
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>
            <h2
              style={{
                fontFamily: "'Outfit', system-ui, sans-serif",
                fontWeight: 700,
                fontSize: 15,
                color: 'var(--color-coral)',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Избриши сметка
            </h2>
          </div>
          {!busy && (
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
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px 20px' }}>
          {needsReauth ? (
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  background: 'rgba(245,158,11,0.06)',
                  border: '1px solid rgba(245,158,11,0.18)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  marginBottom: 14,
                }}
              >
                <p style={{ fontSize: 13, color: '#FCD34D', lineHeight: 1.6 }}>
                  Заради безбедност, треба повторно да се најавиш пред да ја избришеш сметката.
                  Кликни „Повторна најава" и продолжи.
                </p>
              </div>
              {error && <p style={{ fontSize: 12, color: 'var(--color-coral)', marginBottom: 12 }}>{error}</p>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={reauthWorking}
                  onClick={() => {
                    setNeedsReauth(false);
                    setError(null);
                  }}
                >
                  Откажи
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  loading={reauthWorking}
                  disabled={reauthWorking}
                  onClick={handleReauth}
                >
                  Повторна најава
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Consequences list */}
              <p style={{ fontSize: 11.5, color: 'var(--color-muted-dim)', marginBottom: 10 }}>
                Кога ќе ја избришеш сметката:
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 18 }}>
                {CONSEQUENCES.map((item, i) => (
                  <li
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      fontSize: 13,
                      color: 'var(--color-ink-dim)',
                      lineHeight: 1.55,
                    }}
                  >
                    <CoralDot />
                    {item}
                  </li>
                ))}
              </ul>

              {/* Confirm input */}
              <div style={{ marginBottom: 16 }}>
                <label
                  htmlFor="delete-account-confirm"
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--color-muted-dim)',
                    marginBottom: 6,
                  }}
                >
                  Потврди со внесување на псевдонимот
                </label>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--color-muted-dimmer)',
                    marginBottom: 8,
                    fontFamily: "'Geist Mono', monospace",
                  }}
                >
                  {username}
                </p>
                <input
                  id="delete-account-confirm"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={username}
                  disabled={busy}
                  className="input"
                  style={{
                    fontSize: 13,
                    borderColor:
                      confirmText && !confirmed
                        ? 'rgba(248,113,113,0.4)'
                        : confirmed
                          ? 'rgba(34,197,94,0.3)'
                          : undefined,
                  }}
                  autoComplete="off"
                />
              </div>

              {error && <p style={{ fontSize: 12, color: 'var(--color-coral)', marginBottom: 12 }}>{error}</p>}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button variant="secondary" size="sm" disabled={busy} onClick={onClose}>
                  Откажи
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  loading={submitting}
                  disabled={!confirmed || busy}
                  onClick={handleSubmit}
                >
                  Избриши трајно
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
