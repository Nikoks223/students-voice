import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchForumSuggestions,
  acceptForumSuggestion,
  rejectForumSuggestion,
} from '../../lib/firestore/forumSuggestions';
import { timeAgo } from '../../utils/timeAgo';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Button from '../../components/ui/Button';
import Tabs from '../../components/ui/Tabs';
import Card from '../../components/ui/Card';

// ── Constants ─────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#6366f1',
  'var(--color-accent)',
  '#0891b2',
  '#059669',
  '#16a34a',
  '#65a30d',
  '#f59e0b',
  '#ea580c',
  '#dc2626',
  '#db2777',
  '#9333ea',
  '#7c3aed',
  '#be185d',
  '#0d9488',
  '#1e40af',
  '#737373',
];

const PRESET_ICONS = [
  '💬',
  '🎓',
  '📚',
  '🤖',
  '🏛️',
  '🌍',
  '💼',
  '✈️',
  '🧠',
  '🎭',
  '💻',
  '🎬',
  '⚽',
  '🌱',
  '👋',
  '🎲',
  '🎨',
  '🎵',
  '📝',
  '🔬',
  '🌐',
  '💡',
  '🎮',
  '🏀',
  '🤝',
  '📊',
];

// ── SuggestionCard ────────────────────────────────────────────────────────────

function SuggestionCard({ suggestion, adminId, onResolved }) {
  const [action, setAction] = useState(null); // null | 'accept' | 'reject'
  const [submitting, setSubmitting] = useState(false);
  const [cardError, setCardError] = useState('');

  // Accept form fields — pre-filled from suggestion
  const [formName, setFormName] = useState(suggestion.title);
  const [formDesc, setFormDesc] = useState(suggestion.description);
  const [formIcon, setFormIcon] = useState('💬');
  const [formColor, setFormColor] = useState('var(--color-accent)');

  // Reject form
  const [rejectNote, setRejectNote] = useState('');

  const isPending = suggestion.status === 'pending';

  const handleAccept = async () => {
    if (!formName.trim()) {
      setCardError('Внеси го името на форумот.');
      return;
    }
    setSubmitting(true);
    setCardError('');
    try {
      await acceptForumSuggestion(suggestion.id, adminId, {
        name: formName.trim(),
        description: formDesc.trim(),
        icon: formIcon,
        color: formColor,
        suggestedById: suggestion.suggestedById,
      });
      onResolved(suggestion.id);
    } catch (err) {
      setCardError(err.message ?? 'Грешка. Обиди се повторно.');
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    setSubmitting(true);
    setCardError('');
    try {
      await rejectForumSuggestion(suggestion.id, adminId, { adminNote: rejectNote.trim() });
      onResolved(suggestion.id);
    } catch (err) {
      setCardError(err.message ?? 'Грешка. Обиди се повторно.');
      setSubmitting(false);
    }
  };

  const createdAt = suggestion.createdAt?.toDate?.() ?? suggestion.createdAt;

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Header */}
      <div style={{ padding: '14px 18px 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 10,
            flexWrap: 'wrap',
          }}
        >
          {/* Status badge */}
          {suggestion.status === 'pending' && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '2px 8px',
                borderRadius: 999,
                background: 'rgba(124,92,255,0.1)',
                color: 'var(--color-accent)',
                border: '1px solid rgba(124,92,255,0.2)',
              }}
            >
              Чека
            </span>
          )}
          {suggestion.status === 'accepted' && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '2px 8px',
                borderRadius: 999,
                background: 'rgba(74,222,128,0.1)',
                color: '#4ADE80',
                border: '1px solid rgba(74,222,128,0.2)',
              }}
            >
              Одобрено
            </span>
          )}
          {suggestion.status === 'rejected' && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '2px 8px',
                borderRadius: 999,
                background: 'rgba(248,113,113,0.1)',
                color: 'var(--color-coral)',
                border: '1px solid rgba(248,113,113,0.2)',
              }}
            >
              Одбиено
            </span>
          )}
          <span style={{ fontSize: 11.5, color: 'var(--color-muted-dim)' }}>
            Предложил:&nbsp;
            <span style={{ color: 'var(--color-muted)', fontWeight: 600 }}>
              {suggestion.suggestedByUsername}
            </span>
            {suggestion.suggestedBySchool && (
              <span style={{ color: 'var(--color-muted-dimmer)' }}> · {suggestion.suggestedBySchool}</span>
            )}
          </span>
          <span
            style={{ fontSize: 11, color: 'var(--color-muted-dimmer)', marginLeft: 'auto', fontFamily: 'monospace' }}
          >
            {timeAgo(createdAt)}
          </span>
        </div>

        {/* Title */}
        <p
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--color-ink)',
            margin: '0 0 5px',
            letterSpacing: '-0.01em',
          }}
        >
          {suggestion.title}
        </p>

        {/* Description */}
        <p style={{ fontSize: 13, color: 'var(--color-ink-dim)', margin: '0 0 8px', lineHeight: 1.5 }}>
          {suggestion.description}
        </p>

        {/* Reason */}
        <div
          style={{
            padding: '9px 12px',
            borderRadius: 9,
            marginBottom: 14,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--color-muted-dimmer)',
              margin: '0 0 4px',
            }}
          >
            Причина
          </p>
          <p style={{ fontSize: 12.5, color: 'var(--color-muted)', margin: 0, lineHeight: 1.55 }}>
            {suggestion.reason}
          </p>
        </div>

        {/* Resolved info (non-pending) */}
        {suggestion.status === 'accepted' && suggestion.acceptedForumId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: '#4ADE80' }}>Форум создаден:</span>
            <code
              style={{
                fontSize: 11.5,
                color: 'var(--color-muted)',
                background: 'var(--color-surface-hover)',
                padding: '2px 7px',
                borderRadius: 5,
              }}
            >
              /p/{suggestion.acceptedForumId}
            </code>
          </div>
        )}
        {suggestion.status === 'rejected' && suggestion.adminNote && (
          <div
            style={{
              marginBottom: 14,
              padding: '8px 12px',
              borderRadius: 9,
              background: 'rgba(248,113,113,0.05)',
              border: '1px solid rgba(248,113,113,0.12)',
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--color-coral)',
                margin: '0 0 3px',
              }}
            >
              Белешка
            </p>
            <p style={{ fontSize: 12.5, color: 'var(--color-coral)', margin: 0 }}>{suggestion.adminNote}</p>
          </div>
        )}
      </div>

      {/* Action area */}
      {isPending && (
        <div style={{ padding: '0 18px 14px' }}>
          {/* Accept form */}
          {action === 'accept' && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                marginBottom: 12,
                background: 'rgba(74,222,128,0.03)',
                border: '1px solid rgba(74,222,128,0.12)',
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#4ADE8080',
                  margin: '0 0 12px',
                }}
              >
                Уреди ги деталите на форумот
              </p>

              {/* Name */}
              <div style={{ marginBottom: 10 }}>
                <label
                  htmlFor="edit-forum-name"
                  style={{ fontSize: 11.5, color: 'var(--color-muted)', display: 'block', marginBottom: 5 }}
                >
                  Ime
                </label>
                <Input
                  id="edit-forum-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  placeholder="Ime на форумот"
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: 12 }}>
                <label
                  htmlFor="edit-forum-desc"
                  style={{ fontSize: 11.5, color: 'var(--color-muted)', display: 'block', marginBottom: 5 }}
                >
                  Опис
                </label>
                <Textarea
                  id="edit-forum-desc"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
                  placeholder="Краток опис"
                />
              </div>

              {/* Icon picker */}
              <div style={{ marginBottom: 12 }}>
                <label
                  style={{ fontSize: 11.5, color: 'var(--color-muted)', display: 'block', marginBottom: 6 }}
                >
                  Икона — избрано: <span style={{ fontSize: 16 }}>{formIcon}</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {PRESET_ICONS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setFormIcon(em)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 7,
                        fontSize: 16,
                        cursor: 'pointer',
                        border: 'none',
                        background:
                          formIcon === em ? 'rgba(124,92,255,0.2)' : 'var(--color-surface-hover)',
                        outline: formIcon === em ? '1.5px solid rgba(124,92,255,0.5)' : 'none',
                        transition: 'background 0.12s',
                      }}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color picker */}
              <div style={{ marginBottom: 14 }}>
                <label
                  style={{ fontSize: 11.5, color: 'var(--color-muted)', display: 'block', marginBottom: 6 }}
                >
                  Боја — избрано:{' '}
                  <span style={{ fontFamily: 'monospace', color: formColor }}>{formColor}</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormColor(c)}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: c,
                        border: 'none',
                        cursor: 'pointer',
                        outline: formColor === c ? `2px solid ${c}` : '2px solid transparent',
                        outlineOffset: 2,
                        transition: 'outline 0.1s',
                      }}
                    />
                  ))}
                </div>
              </div>

              {cardError && (
                <p style={{ fontSize: 12, color: 'var(--color-coral)', margin: '0 0 10px' }}>{cardError}</p>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAction(null);
                    setCardError('');
                  }}
                  disabled={submitting}
                >
                  Откажи
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  loading={submitting}
                  disabled={submitting}
                  onClick={handleAccept}
                >
                  ✓ Создај форум
                </Button>
              </div>
            </div>
          )}

          {/* Reject form */}
          {action === 'reject' && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                marginBottom: 12,
                background: 'rgba(248,113,113,0.03)',
                border: '1px solid rgba(248,113,113,0.12)',
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--color-coral)',
                  margin: '0 0 10px',
                }}
              >
                Одбиј предлог
              </p>
              <Textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  marginBottom: 10,
                }}
                placeholder="Белешка за корисникот (незадолжително)"
              />
              {cardError && (
                <p style={{ fontSize: 12, color: 'var(--color-coral)', margin: '0 0 8px' }}>{cardError}</p>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAction(null);
                    setCardError('');
                  }}
                  disabled={submitting}
                >
                  Откажи
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={submitting}
                  disabled={submitting}
                  onClick={handleReject}
                  style={{ borderColor: 'rgba(248,113,113,0.3)', color: 'var(--color-coral)' }}
                >
                  Одбиј
                </Button>
              </div>
            </div>
          )}

          {/* Default action buttons */}
          {action === null && (
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setAction('accept')}
                style={{ borderColor: 'rgba(74,222,128,0.25)', color: '#4ADE80' }}
              >
                Одобри
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setAction('reject')}
                style={{ borderColor: 'rgba(248,113,113,0.25)', color: 'var(--color-coral)' }}
              >
                Одбиј
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── ForumSuggestionsTab ───────────────────────────────────────────────────────

function ForumSuggestionsTab({ adminId }) {
  const [status, setStatus] = useState('pending');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError('');
    setSuggestions([]);
    setLastDoc(null);
    setHasMore(false);
    fetchForumSuggestions({ status })
      .then((res) => {
        if (cancelled) return;
        setSuggestions(res.suggestions);
        setLastDoc(res.lastDoc);
        setHasMore(res.hasMore);
      })
      .catch((err) => {
        if (!cancelled) setFetchError(err.message ?? String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await fetchForumSuggestions({ status, lastDoc });
      setSuggestions((prev) => [...prev, ...res.suggestions]);
      setLastDoc(res.lastDoc);
      setHasMore(res.hasMore);
    } catch { /* intentional */ }
    setLoadingMore(false);
  };

  const handleResolved = (id) => setSuggestions((prev) => prev.filter((s) => s.id !== id));

  const SUB_TABS = [
    { key: 'pending', label: 'Чекаат' },
    { key: 'accepted', label: 'Одобрени' },
    { key: 'rejected', label: 'Одбиени' },
  ];

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ marginBottom: 16 }}>
        <Tabs
          value={status}
          onValueChange={setStatus}
          options={SUB_TABS.map((t) => ({ value: t.key, label: t.label }))}
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="shimmer rounded-xl" style={{ height: 140 }} />
          ))}
        </div>
      ) : fetchError ? (
        <Card className="p-8 text-center">
          <p style={{ color: 'var(--color-coral)', fontSize: 13, marginBottom: 6 }}>Грешка при вчитување:</p>
          <p
            style={{
              color: 'var(--color-muted)',
              fontSize: 11.5,
              fontFamily: 'monospace',
              wordBreak: 'break-all',
            }}
          >
            {fetchError}
          </p>
        </Card>
      ) : suggestions.length === 0 ? (
        <Card
          className="p-10 text-center"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
        >
          <p style={{ fontSize: 18, lineHeight: 1, marginBottom: 4 }}>
            {status === 'pending' ? '🌙' : '📋'}
          </p>
          <p style={{ color: 'var(--color-ink-dim)', fontSize: 13.5, fontWeight: 600, margin: 0 }}>
            {status === 'pending' ? 'Нема предлози во моментот' : 'Нема записи'}
          </p>
          <p style={{ color: 'var(--color-muted-dim)', fontSize: 12.5, margin: 0 }}>
            {status === 'pending'
              ? 'Ниту еден корисник не предложил нов форум.'
              : 'Нема предлози во оваа категорија.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {suggestions.map((s) => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              adminId={adminId}
              onResolved={handleResolved}
            />
          ))}
          {hasMore && (
            <Button
              variant="secondary"
              fullWidth
              loading={loadingMore}
              disabled={loadingMore}
              onClick={loadMore}
            >
              {loadingMore ? 'Вчитување…' : 'Вчитај повеќе'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page default export ───────────────────────────────────────────────────────

export default function SuggestionsPage() {
  const { userProfile } = useAuth();
  return (
    <div style={{ padding: '0 24px 32px' }}>
      <AdminPageHeader title="Предлози за форуми" subtitle="Прегледај и одобри предлози" />
      <ForumSuggestionsTab adminId={userProfile?.id} />
    </div>
  );
}
