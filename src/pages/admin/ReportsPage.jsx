import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import { fetchReports, resolveReport } from '../../lib/firestore/reports';
import {
  ignoreReport,
  removeContent,
  removeAndWarn,
  banUser,
} from '../../lib/firestore/moderation';
import { fetchThreadById } from '../../lib/firestore/threads';
import { timeAgo } from '../../utils/timeAgo';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

// ── Constants ─────────────────────────────────────────────────────────────────

const REASON_META = {
  spam: { label: 'Спам', color: 'var(--color-muted-dim)', bg: 'rgba(82,82,91,0.14)' },
  offensive: { label: 'Навредливо', color: 'var(--color-coral)', bg: 'rgba(248,113,113,0.1)' },
  misinformation: { label: 'Дезинформ.', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  inappropriate_age: { label: 'Несоодветно', color: 'var(--color-coral)', bg: 'rgba(248,113,113,0.1)' },
  other: { label: 'Друго', color: 'var(--color-muted)', bg: 'rgba(113,113,122,0.1)' },
};

const ACTION_META = {
  ignored: { label: 'Игнорирано', color: 'var(--color-muted-dim)' },
  removed: { label: 'Отстрането', color: 'var(--color-ink-dim)' },
  warned: { label: 'Предупреден', color: '#F59E0B' },
  banned: { label: 'Бан 7 дена', color: 'var(--color-coral)' },
  banned_permanent: { label: 'Траен бан', color: 'var(--color-coral)' },
  unbanned: { label: 'Откажан бан', color: '#4ADE80' },
};

function stripHtml(html = '') {
  return html
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, 220);
}

// ── ReportCard ────────────────────────────────────────────────────────────────

function ReportCard({ report, adminId, onResolved }) {
  const [target, setTarget] = useState(null);
  const [authorId, setAuthorId] = useState(null);
  const [targetLoading, setTargetLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actioning, setActioning] = useState(false);
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setTargetLoading(true);
    (async () => {
      try {
        if (report.targetType === 'thread') {
          const t = await fetchThreadById(report.targetId);
          if (!cancelled) {
            setTarget(t);
            setAuthorId(t?.authorId ?? null);
          }
        } else {
          const snap = await getDoc(
            doc(db, 'threads', report.threadId, 'comments', report.targetId),
          );
          if (!cancelled) {
            if (snap.exists()) {
              setTarget({ id: snap.id, ...snap.data() });
              setAuthorId(snap.data()?.authorId ?? null);
            }
          }
        }
      } catch { /* intentional */ }
      if (!cancelled) setTargetLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [report]);

  const doAction = async (actionKey) => {
    setActioning(true);
    setActionError(null);
    try {
      switch (actionKey) {
        case 'ignore':
          await ignoreReport(report, adminId);
          break;
        case 'remove':
          await removeContent(report, adminId);
          break;
        case 'removeWarn':
          await removeAndWarn(report, adminId);
          break;
        case 'ban':
          await banUser(authorId, adminId, { permanent: false });
          await resolveReport(report.id, { action: 'banned', moderatorId: adminId });
          break;
        case 'banPerm':
          await banUser(authorId, adminId, { permanent: true });
          await resolveReport(report.id, { action: 'banned_permanent', moderatorId: adminId });
          break;
        default:
          break;
      }
      onResolved(report.id);
    } catch (err) {
      setActionError(err.message ?? 'Грешка. Обиди се повторно.');
      setActioning(false);
      setConfirmAction(null);
    }
  };

  const meta = REASON_META[report.reason] ?? REASON_META.other;
  const isPending = report.status === 'pending';
  const threadLink =
    report.targetType === 'thread'
      ? `/p/${target?.forumId ?? ''}/${report.targetId}`
      : `/p/${target?.forumId ?? ''}/${report.threadId}`;

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 14,
        padding: '15px 18px',
        boxShadow: 'var(--shadow-card)',
        animation: 'fadeUp 0.18s cubic-bezier(0.16,1,0.3,1) both',
      }}
    >
      {/* Top row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 11,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            padding: '2px 8px',
            borderRadius: 999,
            background: meta.bg,
            color: meta.color,
            border: `1px solid ${meta.color}25`,
          }}
        >
          {meta.label}
        </span>
        <span style={{ fontSize: 11.5, color: 'var(--color-muted-dim)' }}>
          Пријавил:&nbsp;<span style={{ color: 'var(--color-muted)' }}>{report.reporterUsername}</span>
        </span>
        <span
          style={{ fontSize: 11, color: 'var(--color-muted-dimmer)', marginLeft: 'auto', fontFamily: 'monospace' }}
        >
          {timeAgo(report.createdAt?.toDate?.() ?? report.createdAt)}
        </span>
      </div>

      {/* Content preview */}
      {targetLoading ? (
        <div className="shimmer" style={{ height: 64, borderRadius: 9, marginBottom: 11 }} />
      ) : target ? (
        <div
          style={{
            padding: '10px 13px',
            borderRadius: 10,
            marginBottom: 11,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              marginBottom: 6,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '2px 7px',
                borderRadius: 999,
                background: 'rgba(124,92,255,0.1)',
                color: 'var(--color-accent)',
                border: '1px solid rgba(124,92,255,0.15)',
              }}
            >
              {report.targetType === 'thread' ? 'Тема' : 'Коментар'}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-ink)' }}>
              {target.authorUsername}
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-muted-dimmer)' }}>
              {timeAgo(target.createdAt?.toDate?.() ?? target.createdAt)}
            </span>
            <Link
              to={threadLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                marginLeft: 'auto',
                fontSize: 11,
                color: 'var(--color-accent)',
                textDecoration: 'underline',
                textUnderlineOffset: 2,
              }}
            >
              Прегледај →
            </Link>
          </div>
          {report.targetType === 'thread' && target.title && (
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)', margin: '0 0 3px' }}>
              {target.title}
            </p>
          )}
          <p
            style={{
              fontSize: 12.5,
              color: 'var(--color-muted)',
              margin: 0,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {stripHtml(target.body ?? '')}
          </p>
        </div>
      ) : (
        <div
          style={{
            padding: '9px 13px',
            borderRadius: 10,
            marginBottom: 11,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p style={{ fontSize: 12, color: 'var(--color-muted-dimmer)', margin: 0 }}>
            Содржината веќе е отстранета или не постои.
          </p>
        </div>
      )}

      {/* Reporter details */}
      {report.details && (
        <p style={{ fontSize: 12, color: 'var(--color-muted)', fontStyle: 'italic', margin: '0 0 11px' }}>
          „{report.details}“
        </p>
      )}

      {/* Footer: action area or resolved status */}
      {!isPending ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {(() => {
            const am = ACTION_META[report.action] ?? { label: report.action, color: 'var(--color-muted-dim)' };
            return (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: `${am.color}18`,
                  color: am.color,
                  border: `1px solid ${am.color}22`,
                }}
              >
                {am.label}
              </span>
            );
          })()}
          <span style={{ fontSize: 11, color: 'var(--color-muted-dimmer)' }}>
            Решено {timeAgo(report.resolvedAt?.toDate?.() ?? report.resolvedAt)}
          </span>
        </div>
      ) : confirmAction ? (
        /* Inline confirm */
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, color: '#FCA5A5' }}>
            {confirmAction === 'banPerm'
              ? 'Траен бан — сигурно?'
              : confirmAction === 'ban'
                ? 'Бан 7 дена — сигурно?'
                : 'Сигурно?'}
          </span>
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setConfirmAction(null);
                setActionError(null);
              }}
              disabled={actioning}
            >
              Откажи
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={actioning}
              disabled={actioning}
              onClick={() => doAction(confirmAction)}
              style={{
                borderColor: ['ban', 'banPerm'].includes(confirmAction)
                  ? 'rgba(248,113,113,0.3)'
                  : undefined,
                color: ['ban', 'banPerm'].includes(confirmAction) ? 'var(--color-coral)' : undefined,
              }}
            >
              Потврди
            </Button>
          </div>
          {actionError && (
            <p style={{ fontSize: 11, color: 'var(--color-coral)', width: '100%', margin: '4px 0 0' }}>
              {actionError}
            </p>
          )}
        </div>
      ) : (
        /* Action buttons */
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          <Button variant="ghost" size="sm" onClick={() => doAction('ignore')} disabled={actioning}>
            Игнорирај
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setConfirmAction('remove')}
            disabled={actioning || !target}
          >
            Отстрани
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setConfirmAction('removeWarn')}
            disabled={actioning || !target}
            style={{ borderColor: 'rgba(245,158,11,0.3)', color: '#F59E0B' }}
          >
            Отстрани + предупреди
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setConfirmAction('ban')}
            disabled={actioning || !authorId}
          >
            Бан 7 дена
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setConfirmAction('banPerm')}
            disabled={actioning || !authorId}
            style={{ borderColor: 'rgba(248,113,113,0.3)', color: 'var(--color-coral)' }}
          >
            Траен бан
          </Button>
          {actionError && (
            <p style={{ fontSize: 11, color: 'var(--color-coral)', width: '100%', margin: '4px 0 0' }}>
              {actionError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── ReportsTab ────────────────────────────────────────────────────────────────

export function ReportsTab({ status, adminId }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setReports([]);
    setLastDoc(null);
    setHasMore(false);
    fetchReports({ status })
      .then((res) => {
        if (cancelled) return;
        setReports(res.reports);
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
  }, [status]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await fetchReports({ status, lastDoc });
      setReports((prev) => [...prev, ...res.reports]);
      setLastDoc(res.lastDoc);
      setHasMore(res.hasMore);
    } catch { /* intentional */ }
    setLoadingMore(false);
  };

  const handleResolved = (reportId) => setReports((prev) => prev.filter((r) => r.id !== reportId));

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="shimmer rounded-xl" style={{ height: 130 }} />
        ))}
      </div>
    );
  }

  if (!reports.length) {
    return (
      <Card
        className="p-10 text-center"
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
      >
        <p style={{ fontSize: 18, lineHeight: 1, marginBottom: 4 }}>
          {status === 'pending' ? '✨' : '📋'}
        </p>
        <p style={{ color: 'var(--color-ink-dim)', fontSize: 13.5, fontWeight: 600, margin: 0 }}>
          {status === 'pending' ? 'Сè е чисто овде' : 'Нема решени пријави'}
        </p>
        <p style={{ color: 'var(--color-muted-dim)', fontSize: 12.5, margin: 0 }}>
          {status === 'pending'
            ? 'Нема пријави кои чекаат.'
            : 'Сè уште нема решени пријави во оваа категорија.'}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <ReportCard key={r.id} report={r} adminId={adminId} onResolved={handleResolved} />
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
  );
}

// ── Page default export ───────────────────────────────────────────────────────

export default function ReportsPage() {
  const { userProfile } = useAuth();
  const adminId = userProfile?.id;
  return (
    <div style={{ padding: '0 24px 32px' }}>
      <AdminPageHeader title="Чекаат пријави" subtitle="Пријави кои чекаат модерација" />
      <ReportsTab status="pending" adminId={adminId} />
    </div>
  );
}
