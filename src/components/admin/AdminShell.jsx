import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { StatsCacheProvider } from '../../context/StatsCache';
import { fetchPendingCount } from '../../lib/firestore/reports';
import { fetchPendingSuggestionsCount } from '../../lib/firestore/forumSuggestions';
import Chip from '../ui/Chip';

// ── AdminShell ────────────────────────────────────────────────────────────────

function AdminShellInner() {
  const { isSuperAdmin } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [suggestionsCount, setSuggestionsCount] = useState(0);

  useEffect(() => {
    fetchPendingCount()
      .then(setPendingCount)
      .catch(() => {});
    fetchPendingSuggestionsCount()
      .then(setSuggestionsCount)
      .catch(() => {});
  }, []);

  const pills = [
    { to: '/admin', label: 'Преглед', end: true },
    { to: '/admin/reports', label: 'Чекаат', end: true, badge: pendingCount, badgeVariant: 'coral' },
    { to: '/admin/reports/resolved', label: 'Решени' },
    { to: '/admin/users', label: 'Корисници' },
    { to: '/admin/forums', label: 'Форуми' },
    { to: '/admin/suggestions', label: 'Предлози', badge: suggestionsCount, badgeVariant: 'blue' },
    { to: '/admin/stats', label: 'Статистика' },
    ...(isSuperAdmin ? [{ to: '/admin/admins', label: 'Админи' }] : []),
  ];

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Horizontal nav */}
      <div
        className="no-scrollbar"
        style={{
          overflowX: 'auto',
          display: 'flex',
          gap: 4,
          paddingBottom: 16,
          marginBottom: 4,
        }}
      >
        {pills.map((pill) => (
          <NavLink
            key={pill.to}
            to={pill.to}
            end={pill.end}
            style={({ isActive }) => ({
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: isActive ? 600 : 400,
              whiteSpace: 'nowrap',
              textDecoration: 'none',
              flexShrink: 0,
              transition: 'all 0.15s cubic-bezier(0.16,1,0.3,1)',
              ...(isActive
                ? {
                    background: 'rgba(124,92,255,0.1)',
                    color: 'var(--color-accent)',
                    border: '1px solid rgba(124,92,255,0.2)',
                  }
                : {
                    background: 'var(--color-surface-hover)',
                    color: 'var(--color-muted)',
                    border: '1px solid var(--color-border)',
                  }),
            })}
          >
            {pill.label}
            {pill.badge > 0 && (
              <Chip variant={pill.badgeVariant === 'coral' ? 'coral' : 'default'} size="xs">
                {pill.badge}
              </Chip>
            )}
          </NavLink>
        ))}
      </div>

      <Outlet />
    </div>
  );
}

export default function AdminShell() {
  return (
    <StatsCacheProvider>
      <AdminShellInner />
    </StatsCacheProvider>
  );
}
