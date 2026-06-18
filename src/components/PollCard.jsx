import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { vote, hasPollEnded } from '../lib/firestore/polls';

function PollIcon({ size = 13, color = 'var(--color-muted-dim)' }) {
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

function CheckIcon({ size = 10 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function voteLabel(n) {
  return n === 1 ? '1 глас' : `${n} гласови`;
}

function timeUntil(ts) {
  const exp = ts?.toDate?.() ?? new Date(ts);
  const diffMs = exp - Date.now();
  if (diffMs <= 0) return null;
  const m = Math.floor(diffMs / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d} ${d === 1 ? 'ден' : 'дена'}`;
  if (h > 0) return `${h} ${h === 1 ? 'час' : 'часа'}`;
  return `${m || 1} ${m === 1 ? 'минута' : 'минути'}`;
}

/**
 * Poll display + voting for the thread page.
 *
 * Props:
 *   thread           — the thread object (has thread.poll)
 *   currentUserVote  — optionId | null (null = not voted / not loaded yet)
 *   onVoted          — ({ votedOptionId, poll }) callback to sync parent state
 */
export default function PollCard({ thread, currentUserVote, onVoted }) {
  const { userProfile } = useAuth();
  const requireAuth = useRequireAuth();

  const poll = thread.poll;

  // Local state for optimistic updates
  const [localOptions, setLocalOptions] = useState(() =>
    (poll?.options ?? []).map((o) => ({ ...o })),
  );
  const [localTotal, setLocalTotal] = useState(poll?.totalVotes ?? 0);
  const [localVote, setLocalVote] = useState(currentUserVote ?? null);
  const [voting, setVoting] = useState(false);

  // One-time sync when parent's vote loads (undefined → value)
  const voteSyncedRef = useRef(false);
  useEffect(() => {
    if (currentUserVote !== null && !voteSyncedRef.current) {
      voteSyncedRef.current = true;
      setLocalVote(currentUserVote);
    }
  }, [currentUserVote]);

  // Sync options when thread.poll updates from outside (e.g. after voting from another tab)
  useEffect(() => {
    if (poll?.options) setLocalOptions(poll.options.map((o) => ({ ...o })));
    if (poll?.totalVotes != null) setLocalTotal(poll.totalVotes);
  }, [poll]);

  if (!poll) return null;

  const ended = hasPollEnded(poll);
  const showResults = localVote !== null || !poll.hideResultsUntilVote;

  const getPercent = (opt) => {
    if (!localTotal || localTotal <= 0) return 0;
    const cnt = localOptions.find((o) => o.id === opt.id)?.voteCount ?? 0;
    return Math.round((cnt / localTotal) * 100);
  };

  const handleVote = (optionId) => {
    if (ended) return;
    requireAuth(async () => {
      if (voting || !userProfile?.id) return;

      // Optimistic update
      const prevVote = localVote;
      const prevOptions = localOptions.map((o) => ({ ...o }));
      const prevTotal = localTotal;

      const nextOpts = localOptions.map((o) => ({ ...o }));
      let nextTotal = localTotal;
      let nextVote;

      if (prevVote === optionId) {
        const idx = nextOpts.findIndex((o) => o.id === optionId);
        if (idx >= 0) nextOpts[idx].voteCount = Math.max(0, (nextOpts[idx].voteCount || 0) - 1);
        nextTotal = Math.max(0, nextTotal - 1);
        nextVote = null;
      } else {
        if (prevVote) {
          const oldIdx = nextOpts.findIndex((o) => o.id === prevVote);
          if (oldIdx >= 0)
            nextOpts[oldIdx].voteCount = Math.max(0, (nextOpts[oldIdx].voteCount || 0) - 1);
        } else {
          nextTotal += 1;
        }
        const newIdx = nextOpts.findIndex((o) => o.id === optionId);
        if (newIdx >= 0) nextOpts[newIdx].voteCount = (nextOpts[newIdx].voteCount || 0) + 1;
        nextVote = optionId;
      }

      setLocalVote(nextVote);
      setLocalOptions(nextOpts);
      setLocalTotal(nextTotal);

      setVoting(true);
      try {
        const result = await vote({ userId: userProfile.id, thread, optionId });
        voteSyncedRef.current = true;
        onVoted?.({
          votedOptionId: result.votedOptionId,
          poll: { ...poll, options: nextOpts, totalVotes: nextTotal },
        });
      } catch {
        setLocalVote(prevVote);
        setLocalOptions(prevOptions);
        setLocalTotal(prevTotal);
      } finally {
        setVoting(false);
      }
    });
  };

  const expiresLabel = (() => {
    if (!poll.expiresAt) return null;
    if (ended) return 'Затворена';
    const until = timeUntil(poll.expiresAt);
    return until ? `Затвора се за ${until}` : 'Затворена';
  })();

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 16,
        padding: '18px 20px',
        marginTop: 0,
        marginBottom: 20,
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <PollIcon size={12} color="var(--color-muted-dim)" />
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--color-muted-dim)',
            }}
          >
            Анкета
          </span>
        </div>
        <p
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--color-ink)',
            lineHeight: 1.35,
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          {poll.question}
        </p>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px 12px',
            marginTop: 7,
            fontSize: 11.5,
            color: 'var(--color-muted-dim)',
          }}
        >
          <span>{voteLabel(localTotal)}</span>
          {expiresLabel && <span>· {expiresLabel}</span>}
          {poll.hideResultsUntilVote && localVote === null && !ended && (
            <span>· Резултатите се скриени</span>
          )}
        </div>
      </div>

      {/* Options */}
      <div
        role="radiogroup"
        aria-label={poll.question}
        style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
      >
        {/* STATE 2: Not voted + results hidden → plain buttons */}
        {!showResults &&
          localOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={false}
              onClick={() => handleVote(opt.id)}
              disabled={voting || ended}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 14px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--color-ink-dim)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                cursor: voting || ended ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                opacity: voting ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!voting && !ended) {
                  e.currentTarget.style.background = 'var(--color-border)';
                  e.currentTarget.style.borderColor = 'var(--color-border-strong)';
                  e.currentTarget.style.color = 'var(--color-ink)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.color = 'var(--color-ink-dim)';
              }}
            >
              {opt.text}
            </button>
          ))}

        {/* STATE 1 & 3: Results visible */}
        {showResults &&
          localOptions.map((opt) => {
            const pct = getPercent(opt);
            const isMyVote = localVote === opt.id;
            const cnt = localOptions.find((o) => o.id === opt.id)?.voteCount ?? 0;

            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={isMyVote}
                onClick={() => (localVote === null || isMyVote ? handleVote(opt.id) : undefined)}
                disabled={voting || ended || (localVote !== null && !isMyVote)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: isMyVote ? 'rgba(124,92,255,0.07)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isMyVote ? 'rgba(124,92,255,0.22)' : 'var(--color-border)'}`,
                  cursor:
                    voting || ended || (localVote !== null && !isMyVote) ? 'default' : 'pointer',
                  transition: 'all 0.15s',
                  opacity: voting ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!voting && !ended && (localVote === null || isMyVote)) {
                    e.currentTarget.style.background = isMyVote
                      ? 'rgba(124,92,255,0.1)'
                      : 'var(--color-surface-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isMyVote
                    ? 'rgba(124,92,255,0.07)'
                    : 'rgba(255,255,255,0.02)';
                }}
              >
                {/* Option text row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
                  {/* Radio dot */}
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      flexShrink: 0,
                      border: `2px solid ${isMyVote ? 'var(--color-accent)' : 'rgba(255,255,255,0.2)'}`,
                      background: isMyVote ? 'var(--color-accent)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}
                  >
                    {isMyVote && (
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          background: '#fff',
                          display: 'block',
                        }}
                      />
                    )}
                  </span>

                  <span
                    style={{
                      flex: 1,
                      fontSize: 13,
                      fontWeight: isMyVote ? 600 : 400,
                      color: isMyVote ? 'var(--color-ink)' : 'var(--color-ink-dim)',
                      lineHeight: 1.3,
                    }}
                  >
                    {opt.text}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontFamily: 'monospace',
                        color: isMyVote ? 'var(--color-accent)' : 'var(--color-muted)',
                        fontWeight: isMyVote ? 700 : 400,
                      }}
                    >
                      {pct}%
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--color-muted-dimmer)', fontFamily: 'monospace' }}>
                      {cnt}
                    </span>

                    {isMyVote && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          padding: '2px 7px',
                          borderRadius: 999,
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--color-accent)',
                          background: 'rgba(124,92,255,0.1)',
                          border: '1px solid rgba(124,92,255,0.2)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <CheckIcon size={9} />
                        Твојот глас
                      </span>
                    )}
                  </div>
                </div>

                {/* Bar */}
                <div
                  style={{
                    height: 4,
                    borderRadius: 999,
                    background: 'var(--color-surface-hover)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      borderRadius: 999,
                      background: isMyVote ? 'var(--color-accent)' : 'rgba(255,255,255,0.18)',
                      transition: 'width 0.4s cubic-bezier(0.23,1,0.32,1)',
                      minWidth: pct > 0 ? 4 : 0,
                    }}
                  />
                </div>
              </button>
            );
          })}
      </div>

      {/* Footer: retract or closed note */}
      {showResults && localVote !== null && !ended && (
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => handleVote(localVote)}
            disabled={voting}
            style={{
              fontSize: 11.5,
              color: 'var(--color-muted-dim)',
              background: 'transparent',
              border: 'none',
              cursor: voting ? 'not-allowed' : 'pointer',
              padding: '4px 8px',
              borderRadius: 6,
              transition: 'color 0.15s',
              opacity: voting ? 0.5 : 1,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-coral)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-muted-dim)')}
          >
            Откажи глас
          </button>
        </div>
      )}

      {ended && (
        <p style={{ marginTop: 10, fontSize: 11.5, color: 'var(--color-muted-dim)', textAlign: 'right' }}>
          Анкетата е завршена
        </p>
      )}
    </div>
  );
}
