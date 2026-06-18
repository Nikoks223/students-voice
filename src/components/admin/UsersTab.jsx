import { useState, useEffect, useCallback } from 'react';
import { fetchUsersPage, searchUsernames } from '../../lib/firestore/users';
import {
  warnUser,
  banUser,
  unbanUser,
  fetchUserModerationLog,
} from '../../lib/firestore/moderation';
import Avatar from '../Avatar';
import { timeAgo } from '../../utils/timeAgo';
import Input from '../ui/Input';
import Tabs from '../ui/Tabs';
import Button from '../ui/Button';
import Card from '../ui/Card';

const ACTION_META = {
  ignored: { label: 'Игнорирано', color: 'var(--color-muted-dim)' },
  removed: { label: 'Отстрането', color: 'var(--color-ink-dim)' },
  warned: { label: 'Предупреден', color: '#F59E0B' },
  banned: { label: 'Бан 7 дена', color: 'var(--color-coral)' },
  banned_permanent: { label: 'Траен бан', color: 'var(--color-coral)' },
  unbanned: { label: 'Откажан бан', color: '#4ADE80' },
};

const FILTERS = [
  { key: 'all', label: 'Сите' },
  { key: 'warned', label: 'Со предупредување' },
  { key: 'banned', label: 'Банирани' },
];

function RoleChip({ role }) {
  if (!role || role === 'user') return null;
  const isSA = role === 'superadmin';
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        padding: '1px 6px',
        borderRadius: 999,
        background: isSA ? 'rgba(248,113,113,0.1)' : 'rgba(124,92,255,0.1)',
        color: isSA ? 'var(--color-coral)' : 'var(--color-accent)',
        border: isSA ? '1px solid rgba(248,113,113,0.2)' : '1px solid rgba(124,92,255,0.2)',
        flexShrink: 0,
      }}
    >
      {isSA ? 'SA' : 'Admin'}
    </span>
  );
}

function UserRow({ user: initialUser, adminId, onUpdate }) {
  const [user, setUser] = useState(initialUser);
  const [expanded, setExpanded] = useState(false);
  const [log, setLog] = useState(null);
  const [logLoading, setLogLoading] = useState(false);
  const [acting, setActing] = useState(null); // null | 'warn' | 'ban7' | 'banPerm' | 'unban'
  const [confirming, setConfirming] = useState(null);
  const [actionErr, setActionErr] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const loadLog = useCallback(async () => {
    if (log !== null) return;
    setLogLoading(true);
    try {
      const entries = await fetchUserModerationLog(user.id);
      setLog(entries);
    } catch {
      /* intentional */
    }
    setLogLoading(false);
  }, [log, user.id]);

  const toggleExpand = () => {
    setExpanded((v) => !v);
    if (!expanded) loadLog();
  };

  const doAction = async (actionKey) => {
    setActing(actionKey);
    setActionErr('');
    setActionMsg('');
    try {
      let patch = {};
      if (actionKey === 'warn') {
        const res = await warnUser(user.id, adminId);
        patch = { warningCount: res.warningCount, isBanned: res.isBanned };
        if (res.autoBan === '7d') {
          setActionMsg(`Корисникот доби предупредување (${res.warningCount}/3). Автоматски бан: 7 дена.`);
        } else if (res.autoBan === 'permanent') {
          setActionMsg(`Корисникот доби траен бан (${res.warningCount}+ предупредувања).`);
        } else {
          setActionMsg(`Корисникот доби предупредување (${res.warningCount}/3).`);
        }
      } else if (actionKey === 'ban7') {
        await banUser(user.id, adminId, { permanent: false });
        patch = { isBanned: true };
      } else if (actionKey === 'banPerm') {
        await banUser(user.id, adminId, { permanent: true });
        patch = { isBanned: true, banUntil: null };
      } else if (actionKey === 'unban') {
        await unbanUser(user.id, adminId);
        patch = { isBanned: false, banUntil: null };
      }
      const updated = { ...user, ...patch };
      setUser(updated);
      onUpdate?.(updated);
      setLog(null); // force log refresh next expand
      setConfirming(null);
    } catch (err) {
      setActionErr(err.message ?? 'Грешка. Обиди се повторно.');
    }
    setActing(null);
  };

  const isBanned = user.isBanned;
  const warnCount = user.warningCount ?? 0;

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Summary row */}
      <div
        role="button"
        tabIndex={0}
        onClick={toggleExpand}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleExpand();
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: '10px 14px',
          cursor: 'pointer',
        }}
      >
        <Avatar username={user.username} avatarUrl={user.avatarUrl ?? null} size="sm" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>
              {user.username ?? '[—]'}
            </span>
            <RoleChip role={user.role} />
            {warnCount > 0 && (
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '1px 6px',
                  borderRadius: 999,
                  background: 'rgba(245,158,11,0.1)',
                  color: '#F59E0B',
                  border: '1px solid rgba(245,158,11,0.15)',
                  flexShrink: 0,
                }}
              >
                {warnCount} предупред.
              </span>
            )}
            {isBanned && (
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '1px 6px',
                  borderRadius: 999,
                  background: 'rgba(248,113,113,0.1)',
                  color: 'var(--color-coral)',
                  border: '1px solid rgba(248,113,113,0.15)',
                  flexShrink: 0,
                }}
              >
                {user.banUntil ? 'Привр. бан' : 'Траен бан'}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 1 }}>
            {user.school && <span style={{ fontSize: 10.5, color: 'var(--color-muted-dim)' }}>{user.school}</span>}
            {user.email && (
              <span
                style={{ fontSize: 10.5, color: 'var(--color-muted-dimmer)', display: 'none' }}
                className="md:block"
              >
                {user.email}
              </span>
            )}
          </div>
        </div>
        <svg
          style={{
            width: 12,
            height: 12,
            color: 'var(--color-muted-dim)',
            flexShrink: 0,
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.18s',
          }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Expanded: actions + log */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--color-border)', padding: '11px 14px 13px' }}>
          {/* Action buttons */}
          {confirming ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
                marginBottom: 10,
              }}
            >
              <span style={{ fontSize: 12, color: '#FCA5A5' }}>
                {confirming === 'banPerm'
                  ? 'Траен бан — сигурно?'
                  : confirming === 'ban7'
                    ? 'Бан 7 дена — сигурно?'
                    : confirming === 'warn'
                      ? 'Предупреди — сигурно?'
                      : 'Сигурно?'}
              </span>
              <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setConfirming(null);
                    setActionErr('');
                  }}
                  disabled={!!acting}
                >
                  Откажи
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={!!acting}
                  disabled={!!acting}
                  onClick={() => doAction(confirming)}
                  style={{
                    borderColor: ['ban7', 'banPerm'].includes(confirming)
                      ? 'rgba(248,113,113,0.3)'
                      : undefined,
                    color: ['ban7', 'banPerm'].includes(confirming) ? 'var(--color-coral)' : undefined,
                  }}
                >
                  Потврди
                </Button>
              </div>
              {actionErr && (
                <p style={{ fontSize: 11, color: 'var(--color-coral)', width: '100%', margin: '3px 0 0' }}>
                  {actionErr}
                </p>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
              {!isBanned && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirming('warn')}
                  disabled={!!acting}
                  style={{ borderColor: 'rgba(245,158,11,0.3)', color: '#F59E0B' }}
                >
                  Предупреди
                </Button>
              )}
              {!isBanned && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirming('ban7')}
                  disabled={!!acting}
                >
                  Бан 7 дена
                </Button>
              )}
              {!isBanned && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirming('banPerm')}
                  disabled={!!acting}
                  style={{ borderColor: 'rgba(248,113,113,0.3)', color: 'var(--color-coral)' }}
                >
                  Траен бан
                </Button>
              )}
              {isBanned && (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={acting === 'unban'}
                  disabled={!!acting}
                  onClick={() => doAction('unban')}
                  style={{ borderColor: 'rgba(74,222,128,0.3)', color: '#4ADE80' }}
                >
                  Откажи бан
                </Button>
              )}
              {actionErr && (
                <p style={{ fontSize: 11, color: 'var(--color-coral)', width: '100%', margin: '3px 0 0' }}>
                  {actionErr}
                </p>
              )}
              {actionMsg && (
                <p style={{ fontSize: 11, color: '#4ADE80', width: '100%', margin: '3px 0 0' }}>
                  {actionMsg}
                </p>
              )}
            </div>
          )}

          {/* Moderation log */}
          <p
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--color-muted-dimmer)',
              margin: '0 0 6px',
            }}
          >
            Историја
          </p>
          {logLoading ? (
            <div className="shimmer rounded-lg" style={{ height: 28 }} />
          ) : (log ?? []).length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--color-muted-dimmer)', margin: 0 }}>Нема запишани акции.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(log ?? []).map((entry) => {
                const am = ACTION_META[entry.action] ?? { label: entry.action, color: 'var(--color-muted-dim)' };
                return (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      fontSize: 11.5,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        padding: '1px 6px',
                        borderRadius: 999,
                        background: `${am.color}18`,
                        color: am.color,
                        border: `1px solid ${am.color}22`,
                        flexShrink: 0,
                      }}
                    >
                      {am.label}
                    </span>
                    <span style={{ color: 'var(--color-muted-dimmer)', fontFamily: 'monospace', fontSize: 10.5 }}>
                      {timeAgo(entry.createdAt?.toDate?.() ?? entry.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── UsersTab ──────────────────────────────────────────────────────────────────

export default function UsersTab({ adminId }) {
  const [filter, setFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isSearch, setIsSearch] = useState(false);

  // Initial load and filter change
  useEffect(() => {
    if (searchInput.trim()) return; // search mode handles its own loading
    let cancelled = false;
    setLoading(true);
    setUsers([]);
    setLastDoc(null);
    setHasMore(false);
    setIsSearch(false);
    fetchUsersPage({ filter })
      .then((res) => {
        if (cancelled) return;
        setUsers(res.users);
        setLastDoc(res.lastDoc);
        setHasMore(res.hasMore);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  useEffect(() => {
    const q = searchInput.trim();
    if (!q) {
      setIsSearch(false);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      setIsSearch(true);
      try {
        const results = await searchUsernames(q, 20);
        setUsers(results.map((u) => ({ ...u }))); // searchUsernames returns partial data
        setLastDoc(null);
        setHasMore(false);
      } catch {
        /* intentional */
      }
      setLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadMore = async () => {
    if (!lastDoc) return;
    setLoadingMore(true);
    try {
      const res = await fetchUsersPage({ filter, lastDoc });
      setUsers((prev) => [...prev, ...res.users]);
      setLastDoc(res.lastDoc);
      setHasMore(res.hasMore);
    } catch {
      /* intentional */
    }
    setLoadingMore(false);
  };

  const handleUpdate = useCallback((updated) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
  }, []);

  return (
    <div className="space-y-4">
      {/* Search */}
      <Input
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        style={{ width: '100%', boxSizing: 'border-box' }}
        placeholder="Пребарај по корисничко име…"
      />

      {/* Filter tabs */}
      {!searchInput.trim() && (
        <Tabs
          value={filter}
          onValueChange={setFilter}
          options={FILTERS.map((f) => ({ value: f.key, label: f.label }))}
        />
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="shimmer rounded-xl" style={{ height: 52 }} />
          ))}
        </div>
      ) : users.length === 0 ? (
        <Card
          className="p-10 text-center"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
        >
          <p style={{ fontSize: 18, lineHeight: 1, marginBottom: 4 }}>🔍</p>
          <p style={{ color: 'var(--color-ink-dim)', fontSize: 13.5, fontWeight: 600, margin: 0 }}>
            {isSearch ? 'Нема резултати' : 'Нема корисници'}
          </p>
          <p style={{ color: 'var(--color-muted-dim)', fontSize: 12.5, margin: 0 }}>
            {isSearch
              ? 'Обиди се со поинаков термин.'
              : filter === 'warned'
                ? 'Нема корисници со предупредувања.'
                : filter === 'banned'
                  ? 'Нема банирани корисници.'
                  : 'Нема регистрирани корисници.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <UserRow key={user.id} user={user} adminId={adminId} onUpdate={handleUpdate} />
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
