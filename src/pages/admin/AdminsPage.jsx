import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchUsersByRole, searchUsernames } from '../../lib/firestore/users';
import { promoteToAdmin, demoteAdmin } from '../../lib/firestore/roles';
import Avatar from '../../components/Avatar';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

// ── RoleChip ──────────────────────────────────────────────────────────────────

function RoleChip({ role }) {
  const isSA = role === 'superadmin';
  return (
    <span
      style={{
        fontSize: 9.5,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        padding: '2px 8px',
        borderRadius: 999,
        background: isSA ? 'rgba(248,113,113,0.1)' : 'rgba(124,92,255,0.1)',
        color: isSA ? 'var(--color-coral)' : 'var(--color-accent)',
        border: isSA ? '1px solid rgba(248,113,113,0.2)' : '1px solid rgba(124,92,255,0.2)',
        flexShrink: 0,
      }}
    >
      {isSA ? 'SuperAdmin' : 'Админ'}
    </span>
  );
}

// ── AdminsTab ─────────────────────────────────────────────────────────────────

function AdminsTab({ currentUserId }) {
  const [admins, setAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [promoteTarget, setPromoteTarget] = useState(null);
  const [demoteTarget, setDemoteTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    setAdminsLoading(true);
    fetchUsersByRole(['admin', 'superadmin'])
      .then(setAdmins)
      .catch(() => {})
      .finally(() => setAdminsLoading(false));
  }, []);

  useEffect(() => {
    if (!searchInput.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchUsernames(searchInput.trim(), 8);
        setSearchResults(results);
      } catch { /* intentional */ }
      setSearching(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handlePromote = async () => {
    if (!promoteTarget || actionLoading) return;
    setActionLoading(true);
    setActionError('');
    try {
      await promoteToAdmin(promoteTarget.id, currentUserId);
      setAdmins((prev) =>
        [...prev, { ...promoteTarget, role: 'admin' }].sort((a, b) =>
          (a.username ?? '').localeCompare(b.username ?? '', 'mk'),
        ),
      );
      setSearchResults((prev) => prev.filter((u) => u.id !== promoteTarget.id));
      setPromoteTarget(null);
      setSearchInput('');
    } catch (err) {
      setActionError(err.message ?? 'Грешка. Обиди се повторно.');
    }
    setActionLoading(false);
  };

  const handleDemote = async () => {
    if (!demoteTarget || actionLoading) return;
    setActionLoading(true);
    setActionError('');
    try {
      await demoteAdmin(demoteTarget.id, currentUserId);
      setAdmins((prev) => prev.filter((u) => u.id !== demoteTarget.id));
      setDemoteTarget(null);
    } catch (err) {
      setActionError(err.message ?? 'Грешка. Обиди се повторно.');
    }
    setActionLoading(false);
  };

  const visibleResults = searchResults.filter((u) => !admins.some((a) => a.id === u.id));

  return (
    <div className="space-y-6">
      {/* Section: current admins */}
      <div>
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--color-muted-dimmer)',
            margin: '0 0 10px',
          }}
        >
          Тековни админи
        </p>

        {demoteTarget && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              marginBottom: 12,
              background: 'rgba(248,113,113,0.05)',
              border: '1px solid rgba(248,113,113,0.15)',
            }}
          >
            <p style={{ fontSize: 13, color: '#FCA5A5', margin: '0 0 10px' }}>
              Сигурно сакаш да го/ја симнеш{' '}
              <strong style={{ color: 'var(--color-ink)' }}>@{demoteTarget.username}</strong> на обичен
              корисник?
            </p>
            {actionError && (
              <p style={{ fontSize: 11.5, color: 'var(--color-coral)', margin: '0 0 8px' }}>{actionError}</p>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDemoteTarget(null);
                  setActionError('');
                }}
                disabled={actionLoading}
              >
                Откажи
              </Button>
              <Button
                variant="secondary"
                size="sm"
                loading={actionLoading}
                disabled={actionLoading}
                onClick={handleDemote}
                style={{ borderColor: 'rgba(248,113,113,0.3)', color: 'var(--color-coral)' }}
              >
                Потврди
              </Button>
            </div>
          </div>
        )}

        {adminsLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="shimmer rounded-xl" style={{ height: 52 }} />
            ))}
          </div>
        ) : admins.length === 0 ? (
          <Card className="p-8 text-center">
            <p style={{ color: 'var(--color-muted-dim)', fontSize: 13 }}>Нема администратори.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {admins.map((admin) => {
              const isSA = admin.role === 'superadmin';
              const isSelf = admin.id === currentUserId;
              return (
                <div
                  key={admin.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-card)',
                    flexWrap: 'wrap',
                  }}
                >
                  <Avatar username={admin.username} avatarUrl={admin.avatarUrl ?? null} size="sm" />
                  <span
                    style={{
                      flex: 1,
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: 'var(--color-ink)',
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {admin.username}
                  </span>
                  {admin.school && (
                    <span style={{ fontSize: 11, color: 'var(--color-muted-dim)' }}>{admin.school}</span>
                  )}
                  <RoleChip role={admin.role} />
                  {isSA ? (
                    <span
                      style={{ fontSize: 11, color: 'var(--color-muted-dimmer)', fontStyle: 'italic', flexShrink: 0 }}
                    >
                      само преку базата
                    </span>
                  ) : !isSelf ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setDemoteTarget(admin);
                        setActionError('');
                      }}
                      style={{ flexShrink: 0 }}
                    >
                      Симни на корисник
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div aria-hidden style={{ height: 1, background: 'var(--color-surface-hover)' }} />

      {/* Section: promote user */}
      <div>
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--color-muted-dimmer)',
            margin: '0 0 10px',
          }}
        >
          Промовирај корисник
        </p>

        {promoteTarget && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              marginBottom: 12,
              background: 'rgba(124,92,255,0.05)',
              border: '1px solid rgba(124,92,255,0.15)',
            }}
          >
            <p style={{ fontSize: 13, color: '#93C5FD', margin: '0 0 10px' }}>
              Сигурно сакаш да го/ја направиш{' '}
              <strong style={{ color: 'var(--color-ink)' }}>@{promoteTarget.username}</strong> админ?
            </p>
            {actionError && (
              <p style={{ fontSize: 11.5, color: 'var(--color-coral)', margin: '0 0 8px' }}>{actionError}</p>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPromoteTarget(null);
                  setActionError('');
                }}
                disabled={actionLoading}
              >
                Откажи
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={actionLoading}
                disabled={actionLoading}
                onClick={handlePromote}
              >
                Потврди
              </Button>
            </div>
          </div>
        )}

        <Input
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setActionError('');
          }}
          style={{ width: '100%', boxSizing: 'border-box', marginBottom: 10 }}
          placeholder="Пребарај корисник по корисничко име…"
        />

        {searching ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="shimmer rounded-xl" style={{ height: 46 }} />
            ))}
          </div>
        ) : searchInput.trim() && visibleResults.length === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--color-muted-dim)', margin: '6px 0 0', textAlign: 'center' }}>
            {searching ? '' : 'Нема резултати.'}
          </p>
        ) : visibleResults.length > 0 ? (
          <div className="space-y-2">
            {visibleResults.map((user) => (
              <div
                key={user.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 13px',
                  borderRadius: 11,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <Avatar username={user.username} avatarUrl={user.avatarUrl ?? null} size="sm" />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>
                  {user.username}
                </span>
                {user.school && (
                  <span style={{ fontSize: 11, color: 'var(--color-muted-dim)' }}>{user.school}</span>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setPromoteTarget(user);
                    setActionError('');
                  }}
                  style={{ flexShrink: 0 }}
                >
                  Промовирај во админ
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── Page default export ───────────────────────────────────────────────────────

export default function AdminsPage() {
  const { userProfile, isSuperAdmin } = useAuth();

  if (!isSuperAdmin) {
    return (
      <div style={{ padding: '0 24px 32px' }}>
        <Card className="p-12 text-center">
          <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>
            Само суперадмини можат да го гледаат ова.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 24px 32px' }}>
      <AdminPageHeader title="Администратори" subtitle="Управувај со улоги на корисници" />
      <AdminsTab currentUserId={userProfile?.id} />
    </div>
  );
}
