import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TipTapLink from '@tiptap/extension-link';
import { useAuth } from '../context/AuthContext';
import { getSchoolById } from '../data/schools';
import { useRequireAuth } from '../hooks/useRequireAuth';
import {
  fetchThreadById,
  incrementThreadViews,
  updateThread,
  deleteThreadByUser,
} from '../lib/firestore/threads';
import { fetchComments, createComment } from '../lib/firestore/comments';
import { getUserUpvotesForTargets } from '../lib/firestore/upvotes';
import { getUserReactionsForTargets } from '../lib/firestore/reactions';
import Avatar from '../components/Avatar';
import UpvoteButton from '../components/UpvoteButton';
import CommentItem from '../components/CommentItem';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Tabs from '../components/ui/Tabs';
import VideoEmbed from '../components/VideoEmbed';
import MentionTextarea from '../components/MentionTextarea';
import ReportModal from '../components/ReportModal';
import EmptyState from '../components/EmptyState';
import { proactiveRemove } from '../lib/firestore/moderation';
import { followThread, unfollowThread, isFollowingThread } from '../lib/firestore/follows';
import { markThreadNotificationsRead } from '../lib/firestore/notifications';
import { timeAgo, formatFullDate } from '../utils/timeAgo';
import { getBanMessage } from '../utils/banMessage';
import SaveButton from '../components/SaveButton';
import ReactionPicker from '../components/ReactionPicker';
import PollCard from '../components/PollCard';
import { fetchUserPollVote } from '../lib/firestore/polls';
import { cloudinaryThumb } from '../lib/cloudinary';
import AttachmentDownloadConfirm from '../components/AttachmentDownloadConfirm';
import { removeThreadAttachment, setThreadFeatured } from '../lib/firestore/threads';
import LinkPreviewCard from '../components/LinkPreviewCard';

const COMMENT_SORTS = [
  { key: 'best', label: 'Најдобри' },
  { key: 'new', label: 'Нови' },
  { key: 'old', label: 'Стари' },
];

const PROSE_CSS = `
.thread-prose { color: var(--color-ink-dim); font-size: 14px; line-height: 1.65; }
.thread-prose > * + * { margin-top: 0.65em; }
.thread-prose p { margin: 0; }
.thread-prose strong { color: var(--color-ink); font-weight: 600; }
.thread-prose em { color: var(--color-ink-dim); }
.thread-prose code { background: var(--code-bg); border: 1px solid var(--code-border); border-radius: 4px; padding: 1px 5px; font-size: 12.5px; color: var(--color-accent-bright); font-family: monospace; }
.thread-prose pre { background: var(--color-bg-elevated); border: 1px solid var(--code-border); border-radius: 10px; padding: 14px 16px; overflow-x: auto; }
.thread-prose pre code { background: none; border: none; padding: 0; font-size: 13px; color: var(--color-ink-dim); }
.thread-prose blockquote { border-left: 2px solid rgba(124,92,255,0.4); padding-left: 14px; color: var(--color-muted); font-style: italic; }
.thread-prose ul { padding-left: 20px; list-style-type: disc; }
.thread-prose ol { padding-left: 20px; list-style-type: decimal; }
.thread-prose li { margin: 0.2em 0; }
.thread-prose a { color: var(--color-accent); text-decoration: underline; text-underline-offset: 2px; }
.thread-prose img { border-radius: 8px; max-width: 100%; margin: 8px 0; display: block; }
.thread-prose .sg-mention { color: var(--color-accent-bright); font-weight: 500; text-decoration: none; }
.thread-prose a.sg-mention:hover { text-decoration: underline; }
.thread-edit-prose { outline: none; min-height: 140px; padding: 12px 14px; color: var(--color-ink-dim); font-size: 14px; line-height: 1.65; }
.thread-edit-prose > * + * { margin-top: 0.65em; }
.thread-edit-prose p { margin: 0; }
.thread-edit-prose p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: var(--color-muted-dim); pointer-events: none; float: left; height: 0; }
`;

function fmt(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function AttachmentsDisplay({ attachments, body, onFileClick }) {
  if (!attachments?.length) return null;

  // Images already embedded inline as <img> in the body HTML — skip them to avoid duplicates.
  // Orphan images (e.g. from old data without inline embedding) are shown here.
  const orphanImages = attachments.filter((a) => a.type === 'image' && !body?.includes(a.url));
  const files = attachments.filter((a) => a.type === 'file');
  const videos = attachments.filter((a) => a.type === 'video');

  if (!orphanImages.length && !files.length && !videos.length) return null;

  return (
    <div className="mt-5 space-y-3">
      {orphanImages.map((att, i) => (
        <img
          key={i}
          src={cloudinaryThumb(att.url, { width: 1200 })}
          alt={att.name ?? ''}
          loading="lazy"
          decoding="async"
          style={{ borderRadius: 8, maxWidth: '100%', display: 'block' }}
        />
      ))}

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((att, i) => (
            <button
              key={i}
              type="button"
              title="Прегледај пред да преземеш"
              onClick={() => onFileClick?.(att)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 12px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                fontSize: 12,
                color: 'var(--color-ink-dim)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-surface-hover)';
                e.currentTarget.style.color = 'var(--color-ink)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--color-surface)';
                e.currentTarget.style.color = 'var(--color-ink-dim)';
              }}
            >
              <svg
                style={{ width: 14, height: 14, color: 'var(--color-muted)', flexShrink: 0 }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
              <span
                style={{
                  maxWidth: 200,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {att.name}
              </span>
              {att.bytes > 0 && (
                <span style={{ color: 'var(--color-muted-dim)', fontSize: 11 }}>{fmt(att.bytes)}</span>
              )}
              <svg
                style={{ width: 12, height: 12, color: 'var(--color-muted-dim)', flexShrink: 0 }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </button>
          ))}
        </div>
      )}

      {videos.map((att, i) => (
        <VideoEmbed key={i} provider={att.provider} embedId={att.embedId} url={att.url} />
      ))}
    </div>
  );
}

function EditAttachmentChip({ att, onRemove }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '5px 10px',
        background: 'var(--color-surface)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        fontSize: 12,
        color: 'var(--color-ink-dim)',
      }}
    >
      {att.type === 'video' ? (
        <svg
          style={{ color: 'var(--color-muted)', flexShrink: 0, width: 14, height: 14 }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      ) : (
        <svg
          style={{ color: 'var(--color-muted)', flexShrink: 0, width: 14, height: 14 }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
          />
        </svg>
      )}
      <span
        style={{
          maxWidth: 200,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {att.type === 'video'
          ? `${att.provider === 'youtube' ? 'YouTube' : 'TikTok'}: ${att.embedId}`
          : att.name}
      </span>
      {att.type === 'file' && att.bytes > 0 && (
        <span style={{ color: 'var(--color-muted-dim)', fontSize: 11 }}>{fmt(att.bytes)}</span>
      )}
      <button
        type="button"
        onClick={onRemove}
        style={{
          color: 'var(--color-muted)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0 2px',
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}

function parseMentions(body) {
  const matches = body.match(/@(\w+)/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(1)))];
}

function sortRootComments(comments, sort) {
  const list = [...comments];
  if (sort === 'best') return list.sort((a, b) => b.upvoteCount - a.upvoteCount);
  const getMs = (c) =>
    c.createdAt?.toDate?.()?.getTime() ?? (c.createdAt instanceof Date ? c.createdAt.getTime() : 0);
  if (sort === 'new') return list.sort((a, b) => getMs(b) - getMs(a));
  return list.sort((a, b) => getMs(a) - getMs(b));
}

function StatItem({ icon, value }) {
  return (
    <span className="flex items-center gap-1.5 text-[12px] font-mono tabular-nums" style={{ color: 'var(--color-muted)' }}>
      {icon}
      {value}
    </span>
  );
}

// Three-dots options menu
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
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-7 h-7 rounded-lg flex items-center justify-center"
        style={{
          color: open ? 'var(--color-ink-dim)' : 'var(--color-muted-dim)',
          background: open ? 'rgba(255,255,255,0.06)' : 'transparent',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.color = 'var(--color-ink-dim)';
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.color = 'var(--color-muted-dim)';
        }}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-8 z-20 rounded-xl overflow-hidden py-1 min-w-[130px]"
          style={{
            background: 'var(--color-surface-hover)',
            border: '1px solid rgba(255,255,255,0.09)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
            animation: 'fadeUp 0.14s cubic-bezier(0.23,1,0.32,1) both',
          }}
        >
          {items.map(({ label, onClick, danger }) => (
            <button
              key={label}
              onClick={() => {
                onClick();
                setOpen(false);
              }}
              className="w-full px-3.5 py-2 text-left text-[12.5px] font-medium"
              style={{
                color: danger ? 'var(--color-coral)' : 'var(--color-ink-dim)',
                transition: 'background 0.12s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface)')}
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

// Inline TipTap editor used only during thread-body editing
function ThreadBodyEditor({ initialContent, onSave, onCancel, saving, attachmentSlot }) {
  const editor = useEditor({
    extensions: [StarterKit, TipTapLink.configure({ openOnClick: false })],
    content: initialContent,
    editorProps: { attributes: { class: 'thread-edit-prose' } },
  });

  return (
    <div>
      <div
        style={{
          background: 'var(--color-bg-elevated)',
          border: '1px solid rgba(124,92,255,0.3)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <EditorContent editor={editor} />
      </div>
      {attachmentSlot}
      <div className="flex gap-2 mt-3">
        <button
          disabled={saving}
          onClick={() => onSave(editor?.getHTML() ?? '')}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-[12.5px] font-semibold"
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-ink)',
            opacity: saving ? 0.6 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {saving && (
            <span
              className="w-3 h-3 rounded-full border-2 animate-spin"
              style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff' }}
            />
          )}
          {saving ? 'Зачувување…' : 'Зачувај'}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-[12.5px] font-medium"
          style={{
            color: 'var(--color-muted)',
            border: '1px solid var(--color-border)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-ink-dim)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-muted)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
          }}
        >
          Откажи
        </button>
      </div>
    </div>
  );
}

function processBodyHtml(html) {
  // Convert TipTap mention spans to clickable anchor tags
  return html.replace(/<span[^>]*class="sg-mention"[^>]*>(@\w+)<\/span>/g, (match, text) => {
    const m = match.match(/data-id="([^"]*)"/);
    const username = m ? m[1] : text.slice(1).toLowerCase();
    return `<a href="/u/${username}" class="sg-mention">${text}</a>`;
  });
}

function ThreadBodyDisplay({ body, isDeleted }) {
  if (isDeleted === 'by_user') {
    return (
      <p className="text-[14px] italic" style={{ color: 'var(--color-muted-dim)' }}>
        Постот е избришан од корисникот.
      </p>
    );
  }
  if (isDeleted === 'by_moderator') {
    return (
      <p className="text-[14px] italic" style={{ color: 'var(--color-muted-dim)' }}>
        Постот е отстранет од модератор.
      </p>
    );
  }
  if (!body) return null;
  const isHtml = body.trimStart().startsWith('<');
  if (isHtml) {
    return <div className="thread-prose" dangerouslySetInnerHTML={{ __html: processBodyHtml(body) }} />;
  }
  return (
    <div className="space-y-3">
      {body.split('\n\n').map((para, i) => (
        <p key={i} className="text-[14px] text-ink-dim leading-relaxed">
          {para}
        </p>
      ))}
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        padding: '20px 24px',
      }}
    >
      <div className="flex items-center gap-2.5 mb-5">
        <div className="shimmer w-8 h-8 rounded-xl shrink-0" />
        <div className="shimmer h-3 w-28 rounded" />
        <div className="shimmer h-2.5 w-16 rounded ml-2" />
      </div>
      <div className="shimmer h-2.5 w-20 rounded mb-4" />
      <div className="shimmer h-6 w-3/4 rounded mb-2" />
      <div className="shimmer h-6 w-1/2 rounded mb-5" />
      <div className="space-y-2 mb-5">
        {[1, 0.8, 0.9, 0.65].map((w, i) => (
          <div key={i} className="shimmer h-3.5 rounded" style={{ width: `${w * 100}%` }} />
        ))}
      </div>
      <div
        className="flex items-center gap-3 pt-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="shimmer h-8 w-20 rounded-xl" />
        <div className="shimmer h-5 w-12 rounded" />
        <div className="shimmer h-5 w-12 rounded" />
      </div>
    </div>
  );
}

function CommentsSkeleton() {
  return (
    <div
      className="rounded-2xl overflow-hidden p-5 space-y-5"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      {[0, 1, 2].map((i) => (
        <div key={i}>
          <div className="flex items-start gap-3">
            <div className="shimmer w-8 h-8 rounded-xl shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="shimmer h-3 w-24 rounded" />
                <div className="shimmer h-2.5 w-10 rounded ml-auto" />
              </div>
              <div className="shimmer h-3.5 w-full rounded mb-1.5" />
              <div className="shimmer h-3.5 w-3/4 rounded mb-3" />
              <div className="flex gap-4">
                <div className="shimmer h-3 w-12 rounded" />
                <div className="shimmer h-3 w-16 rounded" />
              </div>
            </div>
          </div>
          {i < 2 && (
            <div className="mt-5" style={{ borderBottom: '1px solid var(--color-border)' }} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function Thread() {
  const { threadId } = useParams();
  const { isAuthenticated, userProfile, isAdmin } = useAuth();
  const authorSchool = userProfile
    ? (getSchoolById(userProfile.school)?.name ?? userProfile.school ?? '')
    : '';
  const navigate = useNavigate();
  const location = useLocation();
  const requireAuth = useRequireAuth();
  const viewFired = useRef(false);

  // Thread state
  const [thread, setThread] = useState(null);
  const [threadLoading, setThreadLoading] = useState(true);
  const [threadError, setThreadError] = useState(null);

  // Comment state
  const [allComments, setAllComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentSort, setCommentSort] = useState('best');

  // Votes
  const [votedSet, setVotedSet] = useState(null);
  const votesFetched = useRef(false);

  // Reactions
  const [userReactionsMap, setUserReactionsMap] = useState(null); // null = not loaded
  const reactionsFetched = useRef(false);

  // Poll
  const [userPollVote, setUserPollVote] = useState(null);
  const pollVoteFetched = useRef(false);

  const [followed, setFollowed] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Main composer
  const [composerText, setComposerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState(null);
  // Thread edit state
  const [editingThread, setEditingThread] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editAttachments, setEditAttachments] = useState([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  // Thread delete state
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Report modal state
  const [reportTarget, setReportTarget] = useState(null);
  // Admin proactive remove state
  const [adminRemoveConfirm, setAdminRemoveConfirm] = useState(false);
  const [adminRemoving, setAdminRemoving] = useState(false);
  // Admin attachment remove state
  const [attachRemoveConfirm, setAttachRemoveConfirm] = useState(false);
  const [attachRemoving, setAttachRemoving] = useState(false);
  // Download confirmation modal
  const [downloadConfirmAtt, setDownloadConfirmAtt] = useState(null);
  // Share toast
  const [shareToast, setShareToast] = useState(false);
  // Link preview
  const [linkPreview, setLinkPreview] = useState(null);
  const [linkPreviewLoading, setLinkPreviewLoading] = useState(false);

  // ── Fetch thread ──
  useEffect(() => {
    setThreadLoading(true);
    setThreadError(null);
    fetchThreadById(threadId)
      .then((t) => setThread(t))
      .catch((err) => setThreadError(err.message ?? 'Грешка при вчитување.'))
      .finally(() => setThreadLoading(false));
  }, [threadId]);

  useEffect(() => {
    if (thread && !viewFired.current) {
      viewFired.current = true;
      incrementThreadViews(threadId);
    }
  }, [thread, threadId]);

  useEffect(() => {
    if (!userProfile || !threadId) return;
    isFollowingThread(userProfile.id, threadId)
      .then(setFollowed)
      .catch(() => {});
  }, [userProfile, threadId]);

  useEffect(() => {
    if (!userProfile || !threadId) return;
    markThreadNotificationsRead(userProfile.id, threadId).catch(() => {});
  }, [userProfile, threadId]);

  // ── Fetch comments ──
  useEffect(() => {
    setCommentsLoading(true);
    fetchComments(threadId, { sortBy: commentSort })
      .then((c) => setAllComments(c))
      .catch(() => setAllComments([]))
      .finally(() => setCommentsLoading(false));
  }, [threadId, commentSort]);

  // ── Scroll to a specific comment if URL contains #comment-{id} ──
  useEffect(() => {
    if (commentsLoading || !location.hash.startsWith('#comment-')) return;
    const el = document.getElementById(location.hash.slice(1));
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [commentsLoading, location.hash]);

  // ── Load vote state once thread + comments are both ready ──
  useEffect(() => {
    if (votesFetched.current || !isAuthenticated || !userProfile || !thread || commentsLoading)
      return;
    votesFetched.current = true;
    const targets = [
      { targetType: 'thread', targetId: threadId },
      ...allComments.map((c) => ({ targetType: 'comment', targetId: c.id })),
    ];
    getUserUpvotesForTargets(userProfile.id, targets)
      .then(setVotedSet)
      .catch(() => setVotedSet(new Set()));
  }, [isAuthenticated, userProfile, thread, commentsLoading, allComments, threadId]);

  // ── Load poll vote once thread is ready ──
  useEffect(() => {
    if (pollVoteFetched.current || !isAuthenticated || !userProfile || !thread?.poll) return;
    pollVoteFetched.current = true;
    fetchUserPollVote(userProfile.id, threadId)
      .then((optionId) => setUserPollVote(optionId))
      .catch(() => {});
  }, [isAuthenticated, userProfile, thread, threadId]);

  // ── Load reactions once thread + comments are both ready ──
  useEffect(() => {
    if (reactionsFetched.current || !isAuthenticated || !userProfile || !thread || commentsLoading)
      return;
    reactionsFetched.current = true;
    const targets = [
      { targetType: 'thread', targetId: threadId },
      ...allComments.map((c) => ({ targetType: 'comment', targetId: c.id })),
    ];
    getUserReactionsForTargets(userProfile.id, targets)
      .then((map) => setUserReactionsMap(map))
      .catch(() => setUserReactionsMap(new Map()));
  }, [isAuthenticated, userProfile, thread, commentsLoading, allComments, threadId]);

  // ── Poll voted callback ──
  const handlePollVoted = useCallback(({ votedOptionId, poll: updatedPoll }) => {
    setUserPollVote(votedOptionId);
    setThread((t) => (t?.poll ? { ...t, poll: updatedPoll } : t));
  }, []);

  // ── Link preview — fetch for first external URL in thread body ──
  useEffect(() => {
    if (!thread?.body) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = thread.body;
    let url = null;
    for (const a of tmp.querySelectorAll('a')) {
      const href = a.getAttribute('href') ?? '';
      if (
        href.startsWith('http') &&
        !a.classList.contains('sg-mention') &&
        !href.includes('res.cloudinary.com')
      ) {
        url = href;
        break;
      }
    }
    if (!url) return;
    setLinkPreviewLoading(true);
    setLinkPreview(null);
    fetch(`/.netlify/functions/link-preview?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error && (data.title || data.description)) setLinkPreview(data);
      })
      .catch(() => {})
      .finally(() => setLinkPreviewLoading(false));
  }, [thread?.body]);

  // ── Comment callbacks (passed to CommentItem) ──
  const handleCommentAdded = useCallback((comment) => {
    setAllComments((prev) => [...prev, comment]);
    setThread((t) => (t ? { ...t, commentCount: (t.commentCount ?? 0) + 1 } : t));
  }, []);

  const handleCommentUpdated = useCallback((commentId, updates) => {
    setAllComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, ...updates } : c)));
  }, []);

  const handleCommentDeleted = useCallback((commentId) => {
    setAllComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, isDeleted: 'by_user', body: '' } : c)),
    );
  }, []);

  // ── Main composer submit ──
  const handleCommentSubmit = async () => {
    if (!composerText.trim() || submitting) return;
    const banMsg = getBanMessage(userProfile);
    if (banMsg) {
      setCommentError(banMsg);
      return;
    }
    setSubmitting(true);
    setCommentError(null);
    const body = composerText.trim();
    const mentions = parseMentions(body);
    const tempId = `temp-${Date.now()}`;

    const optimistic = {
      id: tempId,
      authorId: userProfile.id,
      authorUsername: userProfile.username,
      authorSchool,
      schoolId: userProfile.school ?? '',
      parentCommentId: null,
      body,
      mentions,
      upvoteCount: 0,
      isEdited: false,
      isDeleted: 'no',
      createdAt: new Date(),
    };
    setAllComments((prev) => [...prev, optimistic]);
    setThread((t) => (t ? { ...t, commentCount: (t.commentCount ?? 0) + 1 } : t));
    setComposerText('');

    try {
      const realId = await createComment(threadId, {
        body,
        mentions,
        parentCommentId: null,
        authorId: userProfile.id ?? null,
        authorUsername: userProfile.username ?? null,
        authorSchool: authorSchool || null,
        schoolId: userProfile.school ?? '',
      });
      setAllComments((prev) => prev.map((c) => (c.id === tempId ? { ...c, id: realId } : c)));
      // Comments don't carry file attachments (MVP) — no scan needed here.
    } catch (err) {
      setAllComments((prev) => prev.filter((c) => c.id !== tempId));
      setThread((t) => (t ? { ...t, commentCount: Math.max(0, (t.commentCount ?? 0) - 1) } : t));
      setComposerText(body);
      setCommentError(err.message ?? 'Грешка при испраќање.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Thread edit ──
  const startEditThread = () => {
    setEditTitle(thread.title);
    setEditAttachments((thread.attachments ?? []).filter((a) => a.type !== 'image'));
    setEditError(null);
    setEditingThread(true);
  };

  const handleThreadSave = async (newBodyHtml) => {
    if (!editTitle.trim()) return;
    setEditSaving(true);
    setEditError(null);
    try {
      // Keep image attachments that are still referenced inline in the edited body HTML.
      const imageAtts = (thread.attachments ?? []).filter(
        (a) => a.type === 'image' && newBodyHtml.includes(a.url),
      );
      const updatedAttachments = [...imageAtts, ...editAttachments];

      await updateThread(threadId, {
        title: editTitle.trim(),
        body: newBodyHtml,
        attachments: updatedAttachments,
      });
      setThread((t) => ({
        ...t,
        title: editTitle.trim(),
        body: newBodyHtml,
        attachments: updatedAttachments,
        isEdited: true,
        editedAt: new Date(),
      }));
      setEditingThread(false);
    } catch (err) {
      setEditError(err.message ?? 'Грешка при зачувување.');
    } finally {
      setEditSaving(false);
    }
  };

  // ── Admin proactive remove ──
  const handleAdminRemove = async () => {
    setAdminRemoving(true);
    try {
      await proactiveRemove({
        targetType: 'thread',
        targetId: threadId,
        threadId,
        authorId: thread.authorId,
        adminId: userProfile.id,
      });
      navigate(`/p/${thread.forumId}`);
    } catch {
      setAdminRemoving(false);
      setAdminRemoveConfirm(false);
    }
  };

  // ── Admin attachment removal ──
  const handleRemoveAttachment = async () => {
    setAttachRemoving(true);
    try {
      await removeThreadAttachment(threadId, userProfile.id);
      setThread((t) => (t ? { ...t, attachmentsRemoved: true } : t));
      setAttachRemoveConfirm(false);
    } catch {
      setAttachRemoving(false);
    }
  };

  // ── Admin feature toggle ──
  const handleToggleFeatured = async () => {
    const next = !thread.isFeatured;
    try {
      await setThreadFeatured(threadId, next);
      setThread((t) => (t ? { ...t, isFeatured: next } : t));
    } catch { /* non-fatal */ }
  };

  // ── Thread delete ──
  const handleThreadDelete = async () => {
    setDeleting(true);
    try {
      await deleteThreadByUser(threadId);
      navigate(`/p/${thread.forumId}`);
    } catch {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  const rootComments = useMemo(() => {
    const roots = allComments.filter((c) => c.parentCommentId === null);
    return sortRootComments(roots, commentSort);
  }, [allComments, commentSort]);

  // ── States ──
  if (threadLoading) {
    return (
      <div className="space-y-4">
        <ThreadSkeleton />
        <div
          className="rounded-2xl p-5"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <div className="shimmer h-24 w-full rounded-xl mb-3" />
          <div className="flex justify-end">
            <div className="shimmer h-9 w-28 rounded-xl" />
          </div>
        </div>
        <CommentsSkeleton />
      </div>
    );
  }

  if (threadError) {
    return (
      <Card className="p-12 flex flex-col items-start gap-4">
        <p className="font-display font-bold text-ink text-lg">Грешка</p>
        <p className="text-[13.5px]" style={{ color: 'var(--color-coral)' }}>
          {threadError}
        </p>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          ← Назад
        </Button>
      </Card>
    );
  }

  if (!thread) {
    return (
      <Card>
        <EmptyState
          icon="🔍"
          title="Дискусијата не постои"
          message="Можеби е избришана или линкот е стар. Врати се назад и пробај друга тема."
          action={{ label: 'Назад', onClick: () => navigate(-1) }}
        />
      </Card>
    );
  }

  const isOwner = !!userProfile && userProfile.id === thread.authorId;
  const isDeleted = thread.isDeleted && thread.isDeleted !== 'no';

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    } catch {}
  };

  const featuredMenuItem = isAdmin
    ? [{ label: thread.isFeatured ? 'Откажи истакнување' : 'Истакни', onClick: handleToggleFeatured }]
    : [];

  const threadMenuItems =
    isOwner && !isDeleted
      ? [
          { label: 'Уреди', onClick: startEditThread },
          { label: 'Избриши', onClick: () => setDeleteConfirm(true), danger: true },
          ...featuredMenuItem,
        ]
      : !isDeleted
        ? [
            {
              label: 'Пријави',
              onClick: () =>
                setReportTarget({ targetType: 'thread', targetId: threadId, threadId }),
            },
            ...featuredMenuItem,
            ...(isAdmin
              ? [
                  {
                    label: 'Отстрани (мод.)',
                    onClick: () => setAdminRemoveConfirm(true),
                    danger: true,
                  },
                ]
              : []),
            ...(isAdmin && thread.attachments?.length > 0 && !thread.attachmentsRemoved
              ? [
                  {
                    label: 'Отстрани прилог',
                    onClick: () => setAttachRemoveConfirm(true),
                    danger: true,
                  },
                ]
              : []),
          ]
        : [];

  return (
    <>
      <style>{PROSE_CSS}</style>
      <div className="space-y-4">
        {/* ── Breadcrumb ── */}
        <nav className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--color-muted-dim)' }}>
          <Link
            to="/"
            className="hover:text-muted transition-colors"
            style={{ transition: 'color 0.15s' }}
          >
            Дома
          </Link>
          <span>/</span>
          <Link
            to={`/p/${thread.forumId}`}
            className="hover:text-muted transition-colors truncate max-w-[120px]"
            style={{ color: thread.forumColor ?? 'var(--color-muted-dim)', transition: 'color 0.15s' }}
          >
            {thread.forumName}
          </Link>
          <span>/</span>
          <span className="text-muted truncate max-w-[240px]">{thread.title}</span>
        </nav>

        {/* ── Main post card ── */}
        <article
          className="relative overflow-hidden rounded-2xl"
          style={{
            background: 'var(--color-surface)',
            border: `1px solid ${thread.isFeatured ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.07)'}`,
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 55% 65% at 105% 45%, ${thread.forumColor}12, transparent)`,
            }}
          />

          <div className="relative px-4 sm:px-6 pt-5 pb-5">
            {/* Author row */}
            <div className="flex items-center gap-2.5 mb-4">
              <Avatar username={thread.authorUsername} avatarUrl={null} size="sm" />
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 flex-1 min-w-0">
                {thread.authorUsername === '[избришан корисник]' ? (
                  <span className="text-[13px] italic" style={{ color: 'var(--color-muted-dim)' }}>
                    {thread.authorUsername}
                  </span>
                ) : (
                  <>
                    <Link
                      to={`/u/${thread.authorUsername?.toLowerCase()}`}
                      className="text-[13px] font-semibold transition-colors"
                      style={{ textDecoration: 'none', color: 'var(--color-ink)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-accent)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-ink)')}
                    >
                      {thread.authorUsername}
                    </Link>
                    {thread.authorSchool && (
                      <span className="text-[11px]" style={{ color: 'var(--color-muted)' }}>{thread.authorSchool}</span>
                    )}
                  </>
                )}
                <span className="text-[10px]" style={{ color: 'var(--color-muted-dimmer)' }}>
                  ·
                </span>
                <span className="text-[11px] font-mono" style={{ color: 'var(--color-muted)' }}>
                  {timeAgo(thread.createdAt?.toDate?.() ?? thread.createdAt)}
                </span>
                {thread.isEdited && (
                  <span
                    className="text-[10px]"
                    style={{ color: 'var(--color-muted-dim)', cursor: 'default' }}
                    title={formatFullDate(thread.editedAt ?? thread.updatedAt)}
                  >
                    (уредено {timeAgo(thread.editedAt ?? thread.updatedAt)})
                  </span>
                )}
              </div>
              {thread.isFeatured && (
                <span
                  className="shrink-0 text-[9px] font-bold tracking-widest uppercase px-2 py-[3px] rounded-full"
                  style={{
                    color: '#F59E0B',
                    background: 'rgba(245,158,11,0.08)',
                    border: '1px solid rgba(245,158,11,0.18)',
                  }}
                >
                  Истакнато
                </span>
              )}
              <OptionsMenu items={threadMenuItems} />
            </div>

            {/* Forum tag */}
            <div className="flex items-center gap-1.5 mb-3">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: thread.forumColor }}
              />
              <Link
                to={`/p/${thread.forumId}`}
                className="text-[11px] font-semibold uppercase tracking-[0.06em]"
                style={{ color: thread.forumColor, transition: 'opacity 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.75')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                {thread.forumName}
              </Link>
            </div>

            {/* Title — editable or static */}
            {editingThread ? (
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value.slice(0, 200))}
                className="w-full px-4 py-2.5 rounded-xl font-display font-bold text-[20px] text-ink tracking-tight mb-4"
                style={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid rgba(124,92,255,0.3)',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            ) : (
              <h1 className="font-display font-bold text-[19px] sm:text-[22px] leading-snug tracking-tight mb-4" style={{ color: 'var(--color-ink)' }}>
                {thread.title}
              </h1>
            )}

            {/* Body — editable or display */}
            <div className="mb-5">
              {editingThread ? (
                <>
                  <ThreadBodyEditor
                    key="thread-editor"
                    initialContent={thread.body}
                    onSave={handleThreadSave}
                    onCancel={() => {
                      setEditingThread(false);
                      setEditError(null);
                    }}
                    saving={editSaving}
                    attachmentSlot={
                      editAttachments.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {editAttachments.map((att, i) => (
                            <EditAttachmentChip
                              key={i}
                              att={att}
                              onRemove={() =>
                                setEditAttachments((prev) => prev.filter((_, j) => j !== i))
                              }
                            />
                          ))}
                        </div>
                      ) : null
                    }
                  />
                  {editError && (
                    <p className="mt-2 text-[11.5px]" style={{ color: 'var(--color-coral)' }}>
                      {editError}
                    </p>
                  )}
                </>
              ) : deleteConfirm ? (
                <div
                  className="rounded-xl p-4 flex items-center justify-between gap-4"
                  style={{
                    background: 'rgba(248,113,113,0.06)',
                    border: '1px solid rgba(248,113,113,0.18)',
                  }}
                >
                  <p className="text-[13px]" style={{ color: '#FCA5A5' }}>
                    Сигурно? Постот ќе биде означен како избришан.
                  </p>
                  <div className="flex gap-2 shrink-0">
                    <button
                      disabled={deleting}
                      onClick={handleThreadDelete}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold"
                      style={{
                        background: 'rgba(248,113,113,0.15)',
                        color: 'var(--color-coral)',
                        border: '1px solid rgba(248,113,113,0.25)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {deleting && (
                        <span
                          className="w-3 h-3 rounded-full border-2 animate-spin"
                          style={{
                            borderColor: 'rgba(248,113,113,0.3)',
                            borderTopColor: 'var(--color-coral)',
                          }}
                        />
                      )}
                      {deleting ? 'Бришење…' : 'Потврди'}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      className="px-3 py-1.5 rounded-lg text-[12.5px] font-medium"
                      style={{
                        color: 'var(--color-muted)',
                        border: '1px solid var(--color-border)',
                        transition: 'all 0.15s',
                      }}
                    >
                      Откажи
                    </button>
                  </div>
                </div>
              ) : adminRemoveConfirm ? (
                <div
                  className="rounded-xl p-4 flex items-center justify-between gap-4"
                  style={{
                    background: 'rgba(248,113,113,0.06)',
                    border: '1px solid rgba(248,113,113,0.18)',
                  }}
                >
                  <p className="text-[13px]" style={{ color: '#FCA5A5' }}>
                    Отстрани ја темата (модераторска акција)?
                  </p>
                  <div className="flex gap-2 shrink-0">
                    <button
                      disabled={adminRemoving}
                      onClick={handleAdminRemove}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold"
                      style={{
                        background: 'rgba(248,113,113,0.15)',
                        color: 'var(--color-coral)',
                        border: '1px solid rgba(248,113,113,0.25)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {adminRemoving && (
                        <span
                          className="w-3 h-3 rounded-full border-2 animate-spin"
                          style={{
                            borderColor: 'rgba(248,113,113,0.3)',
                            borderTopColor: 'var(--color-coral)',
                          }}
                        />
                      )}
                      {adminRemoving ? 'Отстранување…' : 'Потврди'}
                    </button>
                    <button
                      onClick={() => setAdminRemoveConfirm(false)}
                      className="px-3 py-1.5 rounded-lg text-[12.5px] font-medium"
                      style={{
                        color: 'var(--color-muted)',
                        border: '1px solid var(--color-border)',
                        transition: 'all 0.15s',
                      }}
                    >
                      Откажи
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <ThreadBodyDisplay body={thread.body} isDeleted={thread.isDeleted} />
                  {!isDeleted && (linkPreviewLoading || linkPreview) && (
                    <div className="mt-4">
                      <LinkPreviewCard preview={linkPreview} loading={linkPreviewLoading} />
                    </div>
                  )}
                  {!isDeleted && (
                    <>
                      {thread.attachmentsRemoved ? (
                        <div
                          className="mt-5 flex items-center gap-2"
                          style={{ fontSize: 12.5, color: 'var(--color-muted-dim)' }}
                        >
                          <svg
                            style={{ width: 14, height: 14, flexShrink: 0 }}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                            />
                          </svg>
                          Прилогот е отстранет од модератор.
                        </div>
                      ) : attachRemoveConfirm ? (
                        <div
                          className="mt-5 p-3 rounded-xl flex items-center justify-between gap-3"
                          style={{
                            background: 'rgba(248,113,113,0.06)',
                            border: '1px solid rgba(248,113,113,0.15)',
                          }}
                        >
                          <p style={{ fontSize: 12.5, color: 'var(--color-ink-dim)' }}>
                            Сигурно ја отстрануваш приложената датотека?
                          </p>
                          <div className="flex gap-2 shrink-0">
                            <button
                              disabled={attachRemoving}
                              onClick={handleRemoveAttachment}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold"
                              style={{
                                background: 'rgba(248,113,113,0.15)',
                                color: 'var(--color-coral)',
                                border: '1px solid rgba(248,113,113,0.25)',
                                transition: 'all 0.15s',
                              }}
                            >
                              {attachRemoving && (
                                <span
                                  className="w-3 h-3 rounded-full border-2 animate-spin"
                                  style={{
                                    borderColor: 'rgba(248,113,113,0.3)',
                                    borderTopColor: 'var(--color-coral)',
                                  }}
                                />
                              )}
                              {attachRemoving ? 'Отстранување…' : 'Потврди'}
                            </button>
                            <button
                              onClick={() => setAttachRemoveConfirm(false)}
                              className="px-3 py-1.5 rounded-lg text-[12.5px] font-medium"
                              style={{
                                color: 'var(--color-muted)',
                                border: '1px solid var(--color-border)',
                                transition: 'all 0.15s',
                              }}
                            >
                              Откажи
                            </button>
                          </div>
                        </div>
                      ) : (
                        <AttachmentsDisplay
                          attachments={thread.attachments}
                          body={thread.body}
                          onFileClick={(att) => setDownloadConfirmAtt(att)}
                        />
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Poll — shown between body and footer, hidden during delete/admin confirm */}
            {thread.poll && !deleteConfirm && !adminRemoveConfirm && (
              <>
                <PollCard
                  thread={thread}
                  currentUserVote={userPollVote}
                  onVoted={handlePollVoted}
                />
                {editingThread && isOwner && (
                  <p style={{ fontSize: 11.5, color: 'var(--color-muted-dim)', marginBottom: 16 }}>
                    Анкетата не може да се менува откако ќе се создаде.
                  </p>
                )}
              </>
            )}

            {/* Footer — stats + actions */}
            <div
              className="flex flex-wrap items-center justify-between gap-3 pt-4"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-3">
                <UpvoteButton
                  targetType="thread"
                  targetId={threadId}
                  threadId={threadId}
                  forumId={thread.forumId}
                  initialCount={thread.upvoteCount}
                  initiallyVoted={votedSet?.has(`thread_${threadId}`)}
                  size="md"
                />

                <StatItem
                  icon={
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  }
                  value={thread.commentCount}
                />
                <StatItem
                  icon={
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  }
                  value={thread.viewCount}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    requireAuth(async () => {
                      if (followLoading) return;
                      const next = !followed;
                      setFollowed(next);
                      setFollowLoading(true);
                      try {
                        if (next) {
                          await followThread(userProfile.id, threadId);
                        } else {
                          await unfollowThread(userProfile.id, threadId);
                        }
                      } catch (err) {
                        console.error('[followThread] error:', err?.code, err?.message);
                        setFollowed(!next);
                      } finally {
                        setFollowLoading(false);
                      }
                    })
                  }
                  disabled={followLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12.5px] font-medium"
                  style={{
                    background: followed ? 'rgba(124,92,255,0.08)' : 'transparent',
                    border: `1px solid ${followed ? 'rgba(124,92,255,0.2)' : 'rgba(255,255,255,0.07)'}`,
                    color: followed ? 'var(--color-accent)' : 'var(--color-muted)',
                    transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
                  }}
                  onMouseEnter={(e) => {
                    if (!followed) {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                      e.currentTarget.style.color = 'var(--color-ink-dim)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!followed) {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                      e.currentTarget.style.color = 'var(--color-muted)';
                    }
                  }}
                >
                  {followLoading ? (
                    <span
                      className="w-3.5 h-3.5 rounded-full border-2 animate-spin"
                      style={{
                        borderColor: 'rgba(255,255,255,0.15)',
                        borderTopColor: 'currentColor',
                      }}
                    />
                  ) : (
                    <svg
                      className="w-3.5 h-3.5"
                      fill={followed ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.75}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                  )}
                  {followed ? 'Следиш' : 'Следи'}
                </button>

                <SaveButton thread={thread} size="md" />

                <button
                  onClick={handleShare}
                  title="Копирај линк"
                  aria-label="Копирај линк до дискусијата"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--color-border)',
                    background: 'transparent',
                    color: 'var(--color-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.18s cubic-bezier(0.16,1,0.3,1)',
                    fontSize: 12.5,
                    fontWeight: 500,
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border-strong)';
                    e.currentTarget.style.color = 'var(--color-ink-dim)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.color = 'var(--color-muted)';
                  }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Сподели
                </button>
              </div>
            </div>

            {/* Reactions row */}
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
              <ReactionPicker
                targetType="thread"
                targetId={threadId}
                threadId={threadId}
                reactionCounts={thread.reactionCounts}
                initialUserReaction={
                  userReactionsMap
                    ? (userReactionsMap.get(`thread_${threadId}`) ?? null)
                    : undefined
                }
                size="md"
              />
            </div>
          </div>
        </article>

        {/* ── Comment composer ── */}
        {isAuthenticated ? (
          <div
            className="rounded-2xl p-4"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <MentionTextarea
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              placeholder="Напиши коментар… (@корисник за споменување)"
              rows={4}
              className="input text-[13.5px] resize-none w-full"
              style={{ borderRadius: 10, background: 'var(--color-bg-elevated)' }}
            />
            {commentError && (
              <p className="mt-1.5 text-[11.5px]" style={{ color: 'var(--color-coral)' }}>
                {commentError}
              </p>
            )}
            <div className="flex items-center justify-between mt-3">
              <span className="text-[11px]" style={{ color: 'var(--color-muted)' }}>@споменување поддржано</span>
              <Button
                variant="primary"
                loading={submitting}
                disabled={!composerText.trim() || submitting}
                onClick={handleCommentSubmit}
              >
                {submitting ? 'Испраќање…' : 'Коментирај'}
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="rounded-2xl p-5 flex items-center justify-between gap-4"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <p className="text-[13.5px]" style={{ color: 'var(--color-ink-dim)' }}>Пријавете се за да коментирате.</p>
            <Button variant="primary" className="shrink-0" onClick={() => navigate('/login')}>
              Најава
            </Button>
          </div>
        )}

        {/* ── Comments section ── */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="font-display font-bold text-[16px] tracking-tight" style={{ color: 'var(--color-ink)' }}>
              Коментари
              <span className="ml-2 text-[12px] font-normal font-mono" style={{ color: 'var(--color-muted)' }}>
                ({commentsLoading ? '…' : rootComments.length})
              </span>
            </h2>
            <div className="overflow-x-auto no-scrollbar shrink-0">
              <Tabs
                value={commentSort}
                onValueChange={setCommentSort}
                options={COMMENT_SORTS.map(({ key, label }) => ({ value: key, label }))}
                size="sm"
              />
            </div>
          </div>

          {commentsLoading ? (
            <CommentsSkeleton />
          ) : rootComments.length === 0 ? (
            <Card>
              <EmptyState
                icon="💬"
                title="Сè уште нема коментари"
                message={
                  isAuthenticated
                    ? 'Биди прв што ќе одговори на оваа тема.'
                    : 'Најави се за да оставиш коментар и да бидеш прв.'
                }
                action={!isAuthenticated ? { label: 'Најави се', to: '/login' } : undefined}
              />
            </Card>
          ) : (
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div className="p-5 space-y-5">
                {rootComments.map((comment, i) => (
                  <div key={comment.id}>
                    <CommentItem
                      comment={comment}
                      allComments={allComments}
                      depth={0}
                      threadId={threadId}
                      forumId={thread?.forumId}
                      currentUser={userProfile}
                      votedSet={votedSet}
                      userReactionsMap={userReactionsMap}
                      onCommentAdded={handleCommentAdded}
                      onCommentUpdated={handleCommentUpdated}
                      onCommentDeleted={handleCommentDeleted}
                    />
                    {i < rootComments.length - 1 && (
                      <div
                        className="mt-5"
                        style={{ borderBottom: '1px solid var(--color-border)' }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {reportTarget && (
        <ReportModal
          targetType={reportTarget.targetType}
          targetId={reportTarget.targetId}
          threadId={reportTarget.threadId}
          onClose={() => setReportTarget(null)}
        />
      )}

      {downloadConfirmAtt && (
        <AttachmentDownloadConfirm
          attachment={downloadConfirmAtt}
          authorUsername={thread?.authorUsername}
          postedAt={thread?.createdAt?.toDate?.() ?? thread?.createdAt}
          open={!!downloadConfirmAtt}
          onClose={() => setDownloadConfirmAtt(null)}
          onReport={() => {
            setDownloadConfirmAtt(null);
            setReportTarget({ targetType: 'thread', targetId: threadId, threadId });
          }}
        />
      )}

      {shareToast && (
        <div
          style={{
            position: 'fixed',
            bottom: 28,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--color-surface-hover)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: '10px 20px',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--color-ink)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
            zIndex: 9999,
            whiteSpace: 'nowrap',
            animation: 'fadeUp 0.18s cubic-bezier(0.23,1,0.32,1) both',
          }}
        >
          Линкот е копиран
        </div>
      )}
    </>
  );
}
