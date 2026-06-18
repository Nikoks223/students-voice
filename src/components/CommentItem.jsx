import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getBanMessage } from '../utils/banMessage';
import Avatar from './Avatar';
import UpvoteButton from './UpvoteButton';
import Button from './ui/Button';
import MentionTextarea from './MentionTextarea';
import { timeAgo, formatFullDate } from '../utils/timeAgo';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { createComment, updateComment, deleteCommentByUser } from '../lib/firestore/comments';
import { proactiveRemove } from '../lib/firestore/moderation';
import { getSchoolById } from '../data/schools';
import ReportModal from './ReportModal';
import ReactionPicker from './ReactionPicker';

function parseMentions(body) {
  const matches = body.match(/@(\w+)/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(1)))];
}

function renderBody(text) {
  return text.split(/(@\w+)/g).map((part, i) =>
    /^@\w+$/.test(part) ? (
      <Link
        key={i}
        to={`/u/${part.slice(1).toLowerCase()}`}
        className="font-medium hover:underline"
        style={{ color: 'var(--color-accent-bright)', textDecoration: 'none' }}
      >
        {part}
      </Link>
    ) : (
      part
    ),
  );
}

function OptionsMenu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-6 h-6 rounded-md flex items-center justify-center"
        style={{
          color: open ? 'var(--color-ink-dim)' : 'var(--color-muted-dimmer)',
          background: open ? 'var(--color-surface-hover)' : 'transparent',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.color = 'var(--color-muted)';
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.color = 'var(--color-muted-dimmer)';
        }}
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-7 z-20 rounded-xl overflow-hidden py-1 min-w-[110px]"
          style={{
            background: 'var(--color-surface-hover)',
            border: '1px solid var(--color-border-strong)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
            animation: 'fadeUp 0.12s cubic-bezier(0.23,1,0.32,1) both',
          }}
        >
          {items.map(({ label, onClick, danger }) => (
            <button
              key={label}
              onClick={() => {
                onClick();
                setOpen(false);
              }}
              className="w-full px-3 py-1.5 text-left text-[12px] font-medium"
              style={{ color: danger ? 'var(--color-coral)' : 'var(--color-ink-dim)', transition: 'background 0.12s' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const MAX_DEPTH = 4;

export default function CommentItem({
  comment,
  allComments,
  depth = 0,
  threadId,
  forumId,
  currentUser,
  votedSet,
  userReactionsMap,
  onCommentAdded,
  onCommentUpdated,
  onCommentDeleted,
}) {
  const requireAuth = useRequireAuth();
  const [collapsed, setCollapsed] = useState(false);

  // Reply
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyError, setReplyError] = useState(null);

  // Edit
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Report modal
  const [reportOpen, setReportOpen] = useState(false);
  // Admin proactive remove
  const [adminRemoveConfirm, setAdminRemoveConfirm] = useState(false);
  const [adminRemoving, setAdminRemoving] = useState(false);

  const isCommentAdmin = currentUser?.role === 'admin';

  const children = allComments.filter((c) => c.parentCommentId === comment.id);
  const hasChildren = children.length > 0;
  const isDeleted = comment.isDeleted && comment.isDeleted !== 'no';
  const isOwner = !!currentUser && currentUser.id === comment.authorId;

  const createdAt = comment.createdAt?.toDate?.() ?? comment.createdAt;
  const authorSchool = currentUser
    ? (getSchoolById(currentUser.school)?.name ?? currentUser.school ?? '')
    : '';

  // ── Reply submit ──
  const handleReplySubmit = async () => {
    if (!replyText.trim() || replySubmitting) return;
    const banMsg = getBanMessage(currentUser);
    if (banMsg) {
      setReplyError(banMsg);
      return;
    }
    setReplySubmitting(true);
    setReplyError(null);
    const body = replyText.trim();
    const mentions = parseMentions(body);
    const tempId = `temp-${Date.now()}`;

    const optimistic = {
      id: tempId,
      authorId: currentUser.id,
      authorUsername: currentUser.username,
      authorSchool,
      parentCommentId: comment.id,
      body,
      mentions,
      upvoteCount: 0,
      isEdited: false,
      isDeleted: 'no',
      createdAt: new Date(),
    };
    onCommentAdded?.(optimistic);
    setReplyText('');
    setReplying(false);

    try {
      const realId = await createComment(threadId, {
        body,
        mentions,
        parentCommentId: comment.id,
        authorId: currentUser.id ?? null,
        authorUsername: currentUser.username ?? null,
        authorSchool: authorSchool || null,
        schoolId: currentUser.school ?? '',
      });
      // Patch temp ID with real ID
      onCommentUpdated?.(tempId, { id: realId });
    } catch (err) {
      // Revert optimistic reply
      onCommentDeleted?.(tempId);
      setReplyText(body);
      setReplying(true);
      setReplyError(err.message ?? 'Грешка при испраќање.');
    } finally {
      setReplySubmitting(false);
    }
  };

  // ── Edit save ──
  const handleEditSave = async () => {
    if (!editText.trim() || editSaving) return;
    setEditSaving(true);
    setEditError(null);
    const body = editText.trim();
    const mentions = parseMentions(body);
    try {
      await updateComment(threadId, comment.id, { body, mentions });
      onCommentUpdated?.(comment.id, { body, mentions, isEdited: true, editedAt: new Date() });
      setEditing(false);
    } catch (err) {
      setEditError(err.message ?? 'Грешка при зачувување.');
    } finally {
      setEditSaving(false);
    }
  };

  // ── Delete ──
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteCommentByUser(threadId, comment.id);
      onCommentDeleted?.(comment.id);
      setDeleteConfirm(false);
    } catch {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  const menuItems =
    isOwner && !isDeleted
      ? [
          {
            label: 'Уреди',
            onClick: () => {
              setEditText(comment.body);
              setEditing(true);
              setDeleteConfirm(false);
            },
          },
          {
            label: 'Избриши',
            onClick: () => {
              setDeleteConfirm(true);
              setEditing(false);
            },
            danger: true,
          },
        ]
      : !isDeleted
        ? [
            { label: 'Пријави', onClick: () => setReportOpen(true) },
            ...(isCommentAdmin
              ? [
                  {
                    label: 'Отстрани (мод.)',
                    onClick: () => setAdminRemoveConfirm(true),
                    danger: true,
                  },
                ]
              : []),
          ]
        : [];

  const handleAdminRemove = async () => {
    setAdminRemoving(true);
    try {
      await proactiveRemove({
        targetType: 'comment',
        targetId: comment.id,
        threadId,
        authorId: comment.authorId,
        adminId: currentUser.id,
      });
      onCommentUpdated?.(comment.id, { isDeleted: 'by_moderator', body: '' });
      setAdminRemoveConfirm(false);
    } catch {
      setAdminRemoving(false);
      setAdminRemoveConfirm(false);
    }
  };

  return (
    <div id={`comment-${comment.id}`}>
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="shrink-0" style={{ width: 28 }}>
          <Avatar username={comment.authorUsername} avatarUrl={null} size="sm" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1.5">
            {comment.authorUsername === '[избришан корисник]' ? (
              <span className="text-[13px] italic" style={{ color: 'var(--color-muted-dim)' }}>
                {comment.authorUsername}
              </span>
            ) : (
              <Link
                to={`/u/${comment.authorUsername?.toLowerCase()}`}
                className="text-[13px] font-semibold transition-colors"
                style={{ textDecoration: 'none', color: 'var(--color-ink)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-accent)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-ink)')}
              >
                {comment.authorUsername}
              </Link>
            )}
            <span className="text-[11px] font-mono" style={{ color: 'var(--color-muted)' }}>{timeAgo(createdAt)}</span>
            {comment.isEdited && !isDeleted && (
              <span
                className="text-[10px]"
                style={{ color: 'var(--color-muted-dim)', cursor: 'default' }}
                title={formatFullDate(comment.editedAt ?? comment.updatedAt)}
              >
                (уредено {timeAgo(comment.editedAt ?? comment.updatedAt)})
              </span>
            )}
            {menuItems.length > 0 && (
              <span className="ml-auto">
                <OptionsMenu items={menuItems} />
              </span>
            )}
          </div>

          {/* Body — deleted / edit mode / normal */}
          {isDeleted ? (
            <p className="text-[12.5px] italic mb-2" style={{ color: 'var(--color-muted-dimmer)' }}>
              {comment.isDeleted === 'by_moderator'
                ? 'Коментарот е отстранет од модератор.'
                : 'Коментарот е избришан.'}
            </p>
          ) : editing ? (
            <div className="mb-2">
              <textarea
                // eslint-disable-next-line jsx-a11y/no-autofocus -- intentional focus management: textarea activates when edit mode opens
                autoFocus
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                className="input text-[13px] resize-none w-full"
                style={{
                  borderRadius: 8,
                  background: 'var(--color-bg-elevated)',
                  borderColor: 'rgba(124,92,255,0.3)',
                }}
              />
              {editError && (
                <p className="mt-1 text-[11px]" style={{ color: 'var(--color-coral)' }}>
                  {editError}
                </p>
              )}
              <div className="flex gap-2 mt-2">
                <Button
                  variant="primary"
                  size="sm"
                  loading={editSaving}
                  disabled={editSaving || !editText.trim()}
                  onClick={handleEditSave}
                >
                  Зачувај
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditing(false);
                    setEditError(null);
                  }}
                >
                  Откажи
                </Button>
              </div>
            </div>
          ) : deleteConfirm ? (
            <div
              className="rounded-lg p-3 mb-2 flex items-center justify-between gap-3"
              style={{
                background: 'rgba(248,113,113,0.05)',
                border: '1px solid rgba(248,113,113,0.15)',
              }}
            >
              <p className="text-[12px]" style={{ color: '#FCA5A5' }}>
                Сигурно?
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  loading={deleting}
                  disabled={deleting}
                  onClick={handleDelete}
                >
                  Потврди
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(false)}>
                  Откажи
                </Button>
              </div>
            </div>
          ) : adminRemoveConfirm ? (
            <div
              className="rounded-lg p-3 mb-2 flex items-center justify-between gap-3"
              style={{
                background: 'rgba(251,191,36,0.05)',
                border: '1px solid rgba(251,191,36,0.15)',
              }}
            >
              <p className="text-[12px]" style={{ color: '#FCD34D' }}>
                Отстрани (мод.)?
              </p>
              <div className="flex gap-2">
                <button
                  disabled={adminRemoving}
                  onClick={handleAdminRemove}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11.5px] font-semibold"
                  style={{
                    background: 'rgba(251,191,36,0.12)',
                    color: '#FBBF24',
                    transition: 'all 0.15s',
                  }}
                >
                  {adminRemoving && (
                    <span
                      className="w-2.5 h-2.5 rounded-full border-2 animate-spin"
                      style={{ borderColor: 'rgba(251,191,36,0.2)', borderTopColor: '#FBBF24' }}
                    />
                  )}
                  {adminRemoving ? '…' : 'Потврди'}
                </button>
                <Button variant="ghost" size="sm" onClick={() => setAdminRemoveConfirm(false)}>
                  Откажи
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-[13.5px] leading-relaxed mb-2.5" style={{ color: 'var(--color-ink-dim)' }}>
              {renderBody(comment.body)}
            </p>
          )}


          {/* Actions — hidden when deleted */}
          {!isDeleted && !editing && !deleteConfirm && (
            <>
              <div className="flex items-center gap-0.5">
                <UpvoteButton
                  targetType="comment"
                  targetId={comment.id}
                  threadId={threadId}
                  forumId={forumId}
                  initialCount={comment.upvoteCount ?? 0}
                  initiallyVoted={votedSet?.has(`comment_${comment.id}`)}
                  size="sm"
                />

                {depth < MAX_DEPTH && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => requireAuth(() => setReplying((v) => !v))}
                    style={replying ? { color: 'var(--color-accent)' } : undefined}
                  >
                    Одговори
                  </Button>
                )}

                {hasChildren && (
                  <Button variant="ghost" size="sm" onClick={() => setCollapsed((v) => !v)}>
                    {collapsed ? `Прикажи (${children.length})` : '—'}
                  </Button>
                )}
              </div>

              <div className="mt-1.5">
                <ReactionPicker
                  targetType="comment"
                  targetId={comment.id}
                  threadId={threadId}
                  reactionCounts={comment.reactionCounts}
                  initialUserReaction={
                    userReactionsMap
                      ? (userReactionsMap.get(`comment_${comment.id}`) ?? null)
                      : undefined
                  }
                  size="sm"
                />
              </div>
            </>
          )}

          {/* Inline reply box */}
          {replying && (
            <div className="mt-3 mb-1">
              <MentionTextarea
                // eslint-disable-next-line jsx-a11y/no-autofocus -- intentional focus management: reply box activates when reply mode opens
                autoFocus
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`@${comment.authorUsername} `}
                rows={3}
                className="input text-[13px] resize-none w-full"
                style={{ borderRadius: 10 }}
              />
              {replyError && (
                <p className="mt-1 text-[11px]" style={{ color: 'var(--color-coral)' }}>
                  {replyError}
                </p>
              )}
              <div className="flex gap-2 mt-2">
                <Button
                  variant="primary"
                  size="sm"
                  loading={replySubmitting}
                  disabled={!replyText.trim() || replySubmitting}
                  onClick={handleReplySubmit}
                >
                  Одговори
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReplying(false);
                    setReplyText('');
                    setReplyError(null);
                  }}
                >
                  Откажи
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {reportOpen && (
        <ReportModal
          targetType="comment"
          targetId={comment.id}
          threadId={threadId}
          onClose={() => setReportOpen(false)}
        />
      )}

      {/* Nested children with thread rail */}
      {hasChildren && !collapsed && (
        <div
          className="mt-2"
          style={{
            marginLeft: 14,
            paddingLeft: 16,
            borderLeft: '1px solid var(--color-border)',
          }}
        >
          <div className="space-y-4 pt-2">
            {children.map((child) => (
              <CommentItem
                key={child.id}
                comment={child}
                allComments={allComments}
                depth={depth + 1}
                threadId={threadId}
                forumId={forumId}
                currentUser={currentUser}
                votedSet={votedSet}
                userReactionsMap={userReactionsMap}
                onCommentAdded={onCommentAdded}
                onCommentUpdated={onCommentUpdated}
                onCommentDeleted={onCommentDeleted}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
