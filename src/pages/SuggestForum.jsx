import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createForumSuggestion } from '../lib/firestore/forumSuggestions';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const TITLE_MAX = 60;
const DESC_MAX = 200;
const REASON_MAX = 400;

export default function SuggestForum() {
  const navigate = useNavigate();
  const { userProfile, firebaseUser } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // 24-hour account age check
  const createdAt = userProfile?.createdAt?.toDate?.() ?? null;
  // eslint-disable-next-line react-hooks/purity -- Date.now() checked once on render to gate the suggest form
  const accountAgeMs = createdAt ? Date.now() - createdAt.getTime() : 0;
  const canSuggest = accountAgeMs >= 24 * 60 * 60 * 1000;
  const hoursLeft = Math.ceil((24 * 60 * 60 * 1000 - accountAgeMs) / (60 * 60 * 1000));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Внеси го името на форумот.');
      return;
    }
    if (!description.trim()) {
      setError('Внеси краток опис за форумот.');
      return;
    }
    if (!reason.trim()) {
      setError('Внеси зошто мислиш дека е потребен овој форум.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await createForumSuggestion({
        title: title.trim(),
        description: description.trim(),
        reason: reason.trim(),
        suggestedById: firebaseUser.uid,
        suggestedByUsername: userProfile.username,
        suggestedBySchool: userProfile.school ?? '',
      });
      setDone(true);
    } catch (err) {
      setError(err.message ?? 'Грешка. Обиди се повторно.');
      setLoading(false);
    }
  };

  /* ── Too-new account ──────────────────────────────────────────────── */
  if (!canSuggest) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <Card className="p-8 text-center">
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              margin: '0 auto 16px',
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              style={{ width: 22, height: 22, color: '#F59E0B' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2
            style={{
              fontFamily: "'Outfit', system-ui, sans-serif",
              fontWeight: 700,
              fontSize: 18,
              color: 'var(--color-ink)',
              letterSpacing: '-0.02em',
              margin: '0 0 8px',
            }}
          >
            Сметката е прекратка
          </h2>
          <p style={{ fontSize: 13.5, color: 'var(--color-muted)', margin: '0 0 6px', lineHeight: 1.6 }}>
            За да предложиш форум, твојата сметка мора да биде стара најмалку{' '}
            <strong style={{ color: 'var(--color-ink-dim)' }}>24 часа</strong>.
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-muted-dim)', margin: '0 0 24px' }}>
            Обиди се повторно за околу{' '}
            <strong style={{ color: '#F59E0B' }}>
              {hoursLeft} {hoursLeft === 1 ? 'час' : 'часа'}
            </strong>
            .
          </p>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Назад
          </Button>
        </Card>
      </div>
    );
  }

  /* ── Success state ────────────────────────────────────────────────── */
  if (done) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <Card className="p-10 text-center">
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 15,
              margin: '0 auto 18px',
              background: 'rgba(74,222,128,0.1)',
              border: '1px solid rgba(74,222,128,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              style={{ width: 24, height: 24, color: '#4ADE80' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2
            style={{
              fontFamily: "'Outfit', system-ui, sans-serif",
              fontWeight: 700,
              fontSize: 20,
              color: 'var(--color-ink)',
              letterSpacing: '-0.02em',
              margin: '0 0 10px',
            }}
          >
            Предлогот е испратен!
          </h2>
          <p style={{ fontSize: 13.5, color: 'var(--color-muted)', margin: '0 0 28px', lineHeight: 1.6 }}>
            Тимот ќе го разгледа твојот предлог и ќе одлучи дали форумот ќе биде додаден.
          </p>
          <Button variant="primary" onClick={() => navigate('/')}>
            Кон почетна
          </Button>
        </Card>
      </div>
    );
  }

  /* ── Form ─────────────────────────────────────────────────────────── */
  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      {/* Masthead */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            flexShrink: 0,
            background: 'rgba(124,92,255,0.1)',
            border: '1px solid rgba(124,92,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            style={{ width: 16, height: 16, color: 'var(--color-accent)' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <div>
          <p
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: 'var(--color-muted-dimmer)',
              margin: 0,
            }}
          >
            Средношколски Глас
          </p>
          <h1
            style={{
              fontFamily: "'Outfit', system-ui, sans-serif",
              fontWeight: 700,
              fontSize: 22,
              color: 'var(--color-ink)',
              letterSpacing: '-0.03em',
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            Предложи форум
          </h1>
        </div>
      </div>

      <div
        aria-hidden
        style={{ height: 1, background: 'var(--color-surface-hover)', marginBottom: 24 }}
      />

      <Card>
        <form onSubmit={handleSubmit} className="p-7">
          <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: '0 0 24px', lineHeight: 1.6 }}>
            Мислиш дека недостасува некоја тема? Предложи нов форум и тимот ќе го разгледа твојот
            предлог.
          </p>

          {/* Forum name */}
          <div style={{ marginBottom: 18 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 7,
              }}
            >
              <label htmlFor="suggest-forum-title" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-ink-dim)' }}>
                Име на форумот <span style={{ color: 'var(--color-coral)' }}>*</span>
              </label>
              <span
                style={{
                  fontSize: 11,
                  fontFamily: 'monospace',
                  color: title.length > TITLE_MAX * 0.9 ? 'var(--color-coral)' : 'var(--color-muted-dim)',
                }}
              >
                {title.length}/{TITLE_MAX}
              </span>
            </div>
            <input
              id="suggest-forum-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
              placeholder="нпр. Математика и физика"
              className="input"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
            <p style={{ fontSize: 11.5, color: 'var(--color-muted-dim)', margin: '5px 0 0' }}>
              Кратко и јасно — тоа ќе биде видливото ime на форумот.
            </p>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 18 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 7,
              }}
            >
              <label htmlFor="suggest-forum-desc" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-ink-dim)' }}>
                Краток опис <span style={{ color: 'var(--color-coral)' }}>*</span>
              </label>
              <span
                style={{
                  fontSize: 11,
                  fontFamily: 'monospace',
                  color: description.length > DESC_MAX * 0.9 ? 'var(--color-coral)' : 'var(--color-muted-dim)',
                }}
              >
                {description.length}/{DESC_MAX}
              </span>
            </div>
            <textarea
              id="suggest-forum-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, DESC_MAX))}
              placeholder="нпр. Помош со задачи, задачи за вежбање, дискусии за теореми…"
              rows={3}
              className="input"
              style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: 76 }}
            />
          </div>

          {/* Reason */}
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 7,
              }}
            >
              <label htmlFor="suggest-forum-reason" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-ink-dim)' }}>
                Зошто е потребен овој форум? <span style={{ color: 'var(--color-coral)' }}>*</span>
              </label>
              <span
                style={{
                  fontSize: 11,
                  fontFamily: 'monospace',
                  color: reason.length > REASON_MAX * 0.9 ? 'var(--color-coral)' : 'var(--color-muted-dim)',
                }}
              >
                {reason.length}/{REASON_MAX}
              </span>
            </div>
            <textarea
              id="suggest-forum-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, REASON_MAX))}
              placeholder="Објасни зошто мислиш дека овој форум би бил корисен за заедницата…"
              rows={4}
              className="input"
              style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: 96 }}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                marginBottom: 18,
                padding: '10px 14px',
                borderRadius: 10,
                background: 'rgba(248,113,113,0.08)',
                border: '1px solid rgba(248,113,113,0.18)',
                fontSize: 13,
                color: 'var(--color-coral)',
              }}
            >
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
              Откажи
            </Button>
            <Button type="submit" variant="primary" loading={loading} disabled={loading}>
              Испрати предлог
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
