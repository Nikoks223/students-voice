import { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TipTapLink from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Mention from '@tiptap/extension-mention';
import { getSchoolById } from '../data/schools';
import { useAuth } from '../context/AuthContext';
import { createThread } from '../lib/firestore/threads';
import { fetchAllForums } from '../lib/firestore/forums';
import { uploadToCloudinary } from '../lib/cloudinary';
import { searchUsernames } from '../lib/firestore/users';
import { validatePoll } from '../lib/firestore/polls';
import PollEditor from '../components/PollEditor';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { getBanMessage } from '../utils/banMessage';

const TITLE_MAX = 200;

const EDITOR_CSS = `
.sg-prose-content { outline: none; min-height: 180px; padding: 14px 16px; color: var(--color-ink-dim); font-size: 14px; line-height: 1.65; }
.sg-prose-content > * + * { margin-top: 0.65em; }
.sg-prose-content p { margin: 0; }
.sg-prose-content strong { color: var(--color-ink); font-weight: 600; }
.sg-prose-content em { color: var(--color-ink-dim); font-style: italic; }
.sg-prose-content code { background: var(--code-bg); border: 1px solid var(--code-border); border-radius: 4px; padding: 1px 5px; font-size: 12.5px; color: var(--color-accent-bright); font-family: monospace; }
.sg-prose-content pre { background: var(--color-bg-elevated); border: 1px solid var(--code-border); border-radius: 10px; padding: 14px 16px; overflow-x: auto; }
.sg-prose-content pre code { background: none; border: none; padding: 0; font-size: 13px; color: var(--color-ink-dim); }
.sg-prose-content blockquote { border-left: 2px solid rgba(124,92,255,0.4); padding-left: 14px; color: var(--color-muted); font-style: italic; }
.sg-prose-content ul { padding-left: 20px; list-style-type: disc; }
.sg-prose-content ol { padding-left: 20px; list-style-type: decimal; }
.sg-prose-content li { margin: 0.2em 0; }
.sg-prose-content a { color: var(--color-accent); text-decoration: underline; text-underline-offset: 2px; }
.sg-prose-content p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: var(--color-muted-dim); pointer-events: none; float: left; height: 0; }
.sg-prose-content img { border-radius: 8px; max-width: 100%; margin: 8px 0; display: block; }
.sg-prose-content .sg-mention { color: var(--color-accent-bright); font-weight: 500; cursor: default; }
@keyframes sg-fade-up { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
.sg-fu-0 { animation: sg-fade-up 0.22s cubic-bezier(0.23,1,0.32,1) both; }
.sg-fu-1 { animation: sg-fade-up 0.22s 0.05s cubic-bezier(0.23,1,0.32,1) both; }
.sg-fu-2 { animation: sg-fade-up 0.22s 0.10s cubic-bezier(0.23,1,0.32,1) both; }
@keyframes sg-dropdown-in { from { opacity: 0; transform: translateY(4px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
.sg-dropdown-in { animation: sg-dropdown-in 0.14s cubic-bezier(0.23,1,0.32,1) both; }
`;

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function parseVideoUrl(raw) {
  const url = raw.trim();
  const yt = url.match(
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  if (yt) return { provider: 'youtube', embedId: yt[1] };

  const tt = url.match(/(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[^/]+\/video\/(\d+)/);
  if (tt) return { provider: 'tiktok', embedId: tt[1] };

  return null;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ToolbarBtn({ active, disabled, onClick, title, children }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="w-9 h-9 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center"
      style={{
        background: active ? 'rgba(124,92,255,0.12)' : 'transparent',
        color: active ? 'var(--color-accent)' : disabled ? '#2D2D30' : 'var(--color-muted)',
        border: active ? '1px solid rgba(124,92,255,0.2)' : '1px solid transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        if (!active && !disabled) e.currentTarget.style.color = 'var(--color-ink-dim)';
      }}
      onMouseLeave={(e) => {
        if (!active && !disabled) e.currentTarget.style.color = 'var(--color-muted)';
      }}
    >
      {children}
    </button>
  );
}

// Chip shown below editor for file attachments (before submit)
function FileChip({ att, onRemove }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '5px 10px',
        background: 'var(--color-surface-hover)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        fontSize: 12,
        color: 'var(--color-ink-dim)',
      }}
    >
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
      <span
        style={{
          maxWidth: 160,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {att.name}
      </span>
      {att.bytes > 0 && <span style={{ color: 'var(--color-muted-dim)', fontSize: 11 }}>{fmt(att.bytes)}</span>}
      <button
        type="button"
        onClick={onRemove}
        style={{
          color: 'var(--color-muted)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0 2px',
          fontSize: 12,
        }}
      >
        ✕
      </button>
    </div>
  );
}

// Chip shown below editor for video attachments (before submit)
function VideoChip({ att, onRemove }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '5px 10px',
        background: 'var(--color-surface-hover)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        fontSize: 12,
        color: 'var(--color-ink-dim)',
      }}
    >
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
      <span>
        {att.provider === 'youtube' ? 'YouTube' : 'TikTok'}: {att.embedId}
      </span>
      <button
        type="button"
        onClick={onRemove}
        style={{
          color: 'var(--color-muted)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0 2px',
          fontSize: 12,
        }}
      >
        ✕
      </button>
    </div>
  );
}

// Dropdown for TipTap @mention suggestion
const MentionDropdown = forwardRef(function MentionDropdown({ items, clientRect, command }, ref) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => setSelectedIndex(0), [items]);

  useImperativeHandle(
    ref,
    () => ({
      onKeyDown(event) {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((i) => (i - 1 + items.length) % items.length);
          return true;
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((i) => (i + 1) % items.length);
          return true;
        }
        if (event.key === 'Enter') {
          const item = items[selectedIndex];
          if (item) command({ id: item.id, label: item.username });
          return true;
        }
        return false;
      },
    }),
    [items, selectedIndex, command],
  );

  if (!items.length) return null;
  const rect = clientRect?.();
  if (!rect) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        zIndex: 200,
        background: 'var(--color-surface-hover)',
        border: '1px solid var(--color-border-strong)',
        borderRadius: 10,
        boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        minWidth: 180,
        maxWidth: 280,
        animation: 'sg-dropdown-in 0.14s cubic-bezier(0.23,1,0.32,1) both',
      }}
    >
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            command({ id: item.id, label: item.username });
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '8px 12px',
            textAlign: 'left',
            background: i === selectedIndex ? 'rgba(124,92,255,0.1)' : 'transparent',
            color: i === selectedIndex ? 'var(--color-ink)' : 'var(--color-ink-dim)',
            fontSize: 13,
            cursor: 'pointer',
            border: 'none',
            transition: 'background 0.1s',
          }}
        >
          <span style={{ fontWeight: 500, color: 'var(--color-accent-bright)' }}>@{item.username}</span>
          {item.school && (
            <span style={{ fontSize: 11, color: 'var(--color-muted-dim)', marginLeft: 'auto', flexShrink: 0 }}>
              {item.school}
            </span>
          )}
        </button>
      ))}
    </div>,
    document.body,
  );
});

function ForumPicker({ value, onChange, forums = [], loading = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 30);
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const q = search.toLowerCase();
  const filteredTopic = forums.filter(
    (f) => f.type === 'topic' && (!q || f.name.toLowerCase().includes(q)),
  );
  const filteredSchool = forums.filter(
    (f) => f.type === 'school' && (!q || f.name.toLowerCase().includes(q)),
  );
  const selected = value ? forums.find((f) => f.id === value) : null;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-[13.5px] font-medium"
        style={{
          background: 'var(--color-bg-elevated)',
          border: `1px solid ${open ? 'rgba(124,92,255,0.35)' : 'var(--color-border)'}`,
          color: selected ? 'var(--color-ink)' : 'var(--color-muted-dim)',
          transition: 'border-color 0.18s',
        }}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          {selected ? (
            <>
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: selected.color }}
              />
              <span className="truncate">{selected.name}</span>
              <span
                className="shrink-0 text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-full"
                style={{
                  background: 'var(--color-surface-2)',
                  color: 'var(--color-muted-dim)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {selected.type === 'school' ? 'Училиште' : 'Тема'}
              </span>
            </>
          ) : (
            'Избери форум…'
          )}
        </span>
        <svg
          className="w-4 h-4 shrink-0"
          style={{
            color: 'var(--color-muted-dim)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.18s',
          }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="sg-dropdown-in absolute top-full mt-1.5 left-0 right-0 z-50 rounded-xl overflow-hidden"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border-strong)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          }}
        >
          <div
            className="sticky top-0 p-2"
            style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
          >
            <div className="relative">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                style={{ color: 'var(--color-muted-dim)' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Пребарај форум…"
                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-[12.5px]"
                style={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-ink)',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: 260 }}>
            {loading && (
              <div className="px-3 py-4 space-y-2">
                {[1, 0.7, 0.85, 0.6].map((w, i) => (
                  <div key={i} className="shimmer h-3 rounded" style={{ width: `${w * 100}%` }} />
                ))}
              </div>
            )}
            {!loading && filteredTopic.length > 0 && (
              <>
                <div
                  className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: 'var(--color-muted-dimmer)' }}
                >
                  Теми
                </div>
                {filteredTopic.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      onChange(f.id);
                      setOpen(false);
                      setSearch('');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px]"
                    style={{
                      background: value === f.id ? 'rgba(124,92,255,0.08)' : 'transparent',
                      color: value === f.id ? 'var(--color-ink)' : 'var(--color-ink-dim)',
                    }}
                    onMouseEnter={(e) => {
                      if (value !== f.id)
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    }}
                    onMouseLeave={(e) => {
                      if (value !== f.id) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: f.color }}
                    />
                    <span className="font-medium">{f.name}</span>
                  </button>
                ))}
              </>
            )}
            {!loading && filteredSchool.length > 0 && (
              <>
                <div
                  className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest"
                  style={{
                    color: 'var(--color-muted-dimmer)',
                    borderTop:
                      filteredTopic.length > 0 ? '1px solid var(--color-border)' : 'none',
                    marginTop: filteredTopic.length > 0 ? 4 : 0,
                  }}
                >
                  Училишта
                </div>
                {filteredSchool.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      onChange(f.id);
                      setOpen(false);
                      setSearch('');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px]"
                    style={{
                      background: value === f.id ? 'rgba(124,92,255,0.08)' : 'transparent',
                      color: value === f.id ? 'var(--color-ink)' : 'var(--color-ink-dim)',
                    }}
                    onMouseEnter={(e) => {
                      if (value !== f.id)
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    }}
                    onMouseLeave={(e) => {
                      if (value !== f.id) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: f.color }}
                    />
                    <span className="font-medium">{f.name}</span>
                  </button>
                ))}
              </>
            )}
            {!loading && filteredTopic.length === 0 && filteredSchool.length === 0 && (
              <div className="py-8 text-center text-[12.5px]" style={{ color: 'var(--color-muted-dim)' }}>
                {search ? `Нема резултати за „${search}"` : 'Нема достапни форуми'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function NewThread() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userProfile } = useAuth();

  // Forums from Firestore
  const [forums, setForums] = useState([]);
  const [forumsLoading, setForumsLoading] = useState(true);

  useEffect(() => {
    fetchAllForums()
      .then(setForums)
      .catch(() => setForums([]))
      .finally(() => setForumsLoading(false));
  }, []);

  // Form — pre-select forum from ?forum= URL param
  const [forumId, setForumId] = useState(searchParams.get('forum') ?? '');
  const [title, setTitle] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Attachments
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoInputError, setVideoInputError] = useState(null);

  // Poll
  const [pollState, setPollState] = useState(null); // null = disabled

  // Mention popup (for TipTap suggestion)
  const [mentionPopup, setMentionPopup] = useState(null);
  const mentionDropdownRef = useRef(null);

  // File input refs
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // setMentionPopup is a stable React state setter — safe to capture in suggestion closure
  const editor = useEditor({
    extensions: [
      StarterKit,
      TipTapLink.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Напиши ја дискусијата тука…' }),
      Image.configure({ inline: false, allowBase64: false }),
      Mention.configure({
        HTMLAttributes: { class: 'sg-mention' },
        suggestion: {
          items: async ({ query }) => {
            if (!query) return [];
            try {
              return await searchUsernames(query, 6);
            } catch {
              return [];
            }
          },
          render: () => ({
            onStart: (props) =>
              setMentionPopup({
                items: props.items,
                clientRect: props.clientRect,
                command: props.command,
              }),
            onUpdate: (props) =>
              setMentionPopup({
                items: props.items,
                clientRect: props.clientRect,
                command: props.command,
              }),
            onKeyDown: ({ event }) => mentionDropdownRef.current?.onKeyDown(event) ?? false,
            onExit: () => setMentionPopup(null),
          }),
        },
      }),
    ],
    editorProps: { attributes: { class: 'sg-prose-content' } },
  });

  const isEmpty = !editor || editor.isEmpty;
  const titleRemaining = TITLE_MAX - title.length;
  const pollInvalid = pollState !== null && !pollState._valid;
  const canSubmit =
    !!forumId && title.trim().length >= 3 && !isEmpty && !submitting && !uploading && !pollInvalid;

  // ── Upload handlers ──

  const handleImageUpload = async (file) => {
    setUploadError(null);
    setUploading(true);
    setUploadProgress(0);
    try {
      const result = await uploadToCloudinary(file, { onProgress: setUploadProgress });
      editor?.chain().focus().setImage({ src: result.url, alt: result.name }).run();
      setAttachments((prev) => [
        ...prev,
        {
          type: 'image',
          url: result.url,
          publicId: result.publicId,
          name: result.name,
        },
      ]);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (file) => {
    setUploadError(null);
    setUploading(true);
    setUploadProgress(0);
    try {
      const result = await uploadToCloudinary(file, { onProgress: setUploadProgress });
      setAttachments((prev) => [
        ...prev,
        {
          type: 'file',
          url: result.url,
          publicId: result.publicId,
          name: result.name,
          bytes: result.bytes,
          format: result.format,
        },
      ]);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleVideoAdd = () => {
    const parsed = parseVideoUrl(videoUrl);
    if (!parsed) {
      setVideoInputError('Невалиден URL. Поддржани: YouTube и TikTok.');
      return;
    }
    setAttachments((prev) => [
      ...prev,
      {
        type: 'video',
        provider: parsed.provider,
        embedId: parsed.embedId,
        url: videoUrl.trim(),
      },
    ]);
    setVideoUrl('');
    setVideoInputError(null);
    setShowVideoInput(false);
  };

  const removeAttachment = (idx) => setAttachments((prev) => prev.filter((_, i) => i !== idx));

  // ── Submit ──

  const addLink = () => {
    const url = window.prompt('URL:');
    if (url) editor?.chain().focus().setLink({ href: url }).run();
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    if (!canSubmit) return;
    const banMsg = getBanMessage(userProfile);
    if (banMsg) {
      setSubmitError(banMsg);
      return;
    }

    // Build poll payload if a poll was created
    let pollPayload = null;
    if (pollState !== null) {
      const { valid, error } = validatePoll({
        question: pollState.question,
        options: pollState.options,
        expiresAt: pollState.expiresAt ? new Date(pollState.expiresAt) : null,
      });
      if (!valid) {
        setSubmitError(`Анкета: ${error}`);
        return;
      }
      pollPayload = {
        question: pollState.question.trim(),
        options: pollState.options.map((o) => ({ text: o.text.trim() })),
        hideResultsUntilVote: pollState.hideResultsUntilVote ?? false,
        expiresAt: pollState.expiresAt ? new Date(pollState.expiresAt) : null,
      };
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const newId = await createThread({
        forumId,
        title: title.trim(),
        body: editor.getHTML(),
        attachments,
        authorId: userProfile.id ?? null,
        authorUsername: userProfile.username ?? null,
        authorSchool: getSchoolById(userProfile.school)?.name ?? userProfile.school ?? null,
        schoolId: userProfile.school ?? '',
        poll: pollPayload,
      });

      navigate(`/p/${forumId}/${newId}`);
    } catch (err) {
      setSubmitError(err.message ?? 'Грешка при објавување. Обиди се повторно.');
      setSubmitting(false);
    }
  };

  // Non-image/video attachments (chips shown below editor)
  const chipAttachments = attachments.filter((a) => a.type !== 'image');

  return (
    <>
      <style>{EDITOR_CSS}</style>

      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImageUpload(f);
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFileUpload(f);
        }}
      />

      {/* TipTap mention dropdown portal */}
      {mentionPopup && (
        <MentionDropdown
          ref={mentionDropdownRef}
          items={mentionPopup.items}
          clientRect={mentionPopup.clientRect}
          command={mentionPopup.command}
        />
      )}

      <div className="max-w-2xl mx-auto space-y-5">
        {/* ── Masthead ── */}
        <div className="sg-fu-0 flex items-end justify-between gap-6 pb-1">
          <div className="flex items-center gap-3.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(124,92,255,0.1)',
                border: '1px solid rgba(124,92,255,0.2)',
              }}
            >
              <svg
                className="w-4 h-4"
                style={{ color: 'var(--color-accent)' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <div>
              <p
                className="text-[9px] font-bold uppercase tracking-[0.18em] mb-0.5"
                style={{ color: 'var(--color-muted-dimmer)' }}
              >
                Средношколски Глас
              </p>
              <h1 className="font-display font-bold text-[22px] text-ink tracking-tight leading-none">
                Нова дискусија
              </h1>
            </div>
          </div>
          <Link
            to="/"
            className="text-[12.5px] font-medium"
            style={{ color: 'var(--color-muted)', transition: 'color 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-ink-dim)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-muted)')}
          >
            ← Откажи
          </Link>
        </div>

        <div
          aria-hidden
          className="sg-fu-0"
          style={{ height: 1, background: 'var(--color-surface-hover)' }}
        />

        {/* ── Form card ── */}
        <Card className="sg-fu-1 overflow-hidden">
          <div className="p-5 space-y-5">
            {/* Forum */}
            <div>
              <p
                className="block text-[11px] font-bold uppercase tracking-widest mb-2"
                style={{ color: 'var(--color-muted-dim)' }}
              >
                Форум
              </p>
              <ForumPicker
                value={forumId}
                onChange={setForumId}
                forums={forums}
                loading={forumsLoading}
              />
              {submitted && !forumId && (
                <p className="mt-1.5 text-[11.5px]" style={{ color: 'var(--color-coral)' }}>
                  Изберете форум.
                </p>
              )}
            </div>

            {/* Title */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="thread-title"
                  className="text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: 'var(--color-muted-dim)' }}
                >
                  Наслов
                </label>
                <span
                  className="text-[11px] font-mono tabular-nums"
                  style={{
                    color:
                      titleRemaining <= 0
                        ? 'var(--color-coral)'
                        : titleRemaining <= 20
                          ? '#F59E0B'
                          : 'var(--color-muted-dimmer)',
                  }}
                >
                  {titleRemaining}
                </span>
              </div>
              <Input
                id="thread-title"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
                placeholder="Напиши наслов…"
                error={submitted && !title.trim() ? 'Внесете наслов.' : undefined}
                className="text-[14px]"
              />
            </div>

            {/* Body */}
            <div>
              <p
                className="block text-[11px] font-bold uppercase tracking-widest mb-2"
                style={{ color: 'var(--color-muted-dim)' }}
              >
                Содржина
              </p>

              <div
                className="rounded-xl overflow-hidden"
                style={{
                  background: 'var(--color-bg-elevated)',
                  border: `1px solid ${submitted && isEmpty ? 'rgba(248,113,113,0.4)' : 'var(--color-border)'}`,
                  transition: 'border-color 0.18s',
                }}
              >
                {/* Toolbar */}
                <div
                  className="flex flex-wrap items-center gap-0.5 px-2.5 py-2"
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  <ToolbarBtn
                    active={editor?.isActive('bold')}
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                    title="Задебелено"
                  >
                    <strong style={{ fontSize: 12 }}>B</strong>
                  </ToolbarBtn>
                  <ToolbarBtn
                    active={editor?.isActive('italic')}
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                    title="Косо"
                  >
                    <em style={{ fontSize: 12 }}>I</em>
                  </ToolbarBtn>

                  <span
                    className="w-px h-4 mx-1"
                    style={{ background: 'var(--color-border)' }}
                  />

                  <ToolbarBtn
                    active={editor?.isActive('bulletList')}
                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    title="Список"
                  >
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
                        d="M4 6h16M4 10h16M4 14h16M4 18h16"
                      />
                    </svg>
                  </ToolbarBtn>
                  <ToolbarBtn
                    active={editor?.isActive('orderedList')}
                    onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                    title="Нумериран список"
                  >
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
                        d="M7 8h10M7 12h10M7 16h10M3 8h.01M3 12h.01M3 16h.01"
                      />
                    </svg>
                  </ToolbarBtn>

                  <span
                    className="w-px h-4 mx-1"
                    style={{ background: 'var(--color-border)' }}
                  />

                  <ToolbarBtn
                    active={editor?.isActive('link')}
                    onClick={
                      editor?.isActive('link')
                        ? () => editor?.chain().focus().unsetLink().run()
                        : addLink
                    }
                    title={editor?.isActive('link') ? 'Отстрани линк' : 'Додади линк'}
                  >
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
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                      />
                    </svg>
                  </ToolbarBtn>
                  <ToolbarBtn
                    active={editor?.isActive('codeBlock')}
                    onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                    title="Блок код"
                  >
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
                        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                      />
                    </svg>
                  </ToolbarBtn>
                  <ToolbarBtn
                    active={editor?.isActive('blockquote')}
                    onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                    title="Цитат"
                  >
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
                        d="M7 8h10M7 12h10M7 16h7"
                      />
                    </svg>
                  </ToolbarBtn>

                  <span
                    className="w-px h-4 mx-1"
                    style={{ background: 'var(--color-border)' }}
                  />

                  {/* @mention — inserts @ to trigger suggestion */}
                  <ToolbarBtn
                    onClick={() => editor?.chain().focus().insertContent('@').run()}
                    title="@споменување"
                    disabled={uploading}
                  >
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
                        d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                      />
                    </svg>
                  </ToolbarBtn>

                  {/* Image upload */}
                  <ToolbarBtn
                    onClick={() => imageInputRef.current?.click()}
                    title="Додади слика"
                    disabled={uploading}
                  >
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
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </ToolbarBtn>

                  {/* File upload */}
                  <ToolbarBtn
                    onClick={() => fileInputRef.current?.click()}
                    title="Прикачи датотека (PDF/DOC)"
                    disabled={uploading}
                  >
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
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                      />
                    </svg>
                  </ToolbarBtn>

                  {/* Video embed */}
                  <ToolbarBtn
                    active={showVideoInput}
                    onClick={() => {
                      setShowVideoInput((v) => !v);
                      setVideoUrl('');
                      setVideoInputError(null);
                    }}
                    title="Додади видео (YouTube / TikTok)"
                    disabled={uploading}
                  >
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
                        d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </ToolbarBtn>
                </div>

                {/* Upload progress bar */}
                {uploading && (
                  <div
                    style={{
                      padding: '8px 14px',
                      borderBottom: '1px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 11.5, color: 'var(--color-muted)', flexShrink: 0 }}>
                      Прикачување… {uploadProgress}%
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: 2,
                        background: 'var(--color-border)',
                        borderRadius: 1,
                      }}
                    >
                      <div
                        style={{
                          width: `${uploadProgress}%`,
                          height: '100%',
                          background: 'var(--color-accent)',
                          borderRadius: 1,
                          transition: 'width 0.2s',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Video URL input */}
                {showVideoInput && !uploading && (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        // eslint-disable-next-line jsx-a11y/no-autofocus -- intentional focus management: video URL input activates when embed modal opens
                        autoFocus
                        value={videoUrl}
                        onChange={(e) => {
                          setVideoUrl(e.target.value);
                          setVideoInputError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleVideoAdd();
                          }
                          if (e.key === 'Escape') {
                            setShowVideoInput(false);
                            setVideoUrl('');
                            setVideoInputError(null);
                          }
                        }}
                        placeholder="YouTube или TikTok URL…"
                        style={{
                          flex: 1,
                          background: 'var(--color-bg-elevated)',
                          border: `1px solid ${videoInputError ? 'rgba(248,113,113,0.4)' : 'var(--color-border)'}`,
                          borderRadius: 6,
                          padding: '5px 10px',
                          fontSize: 12,
                          color: 'var(--color-ink)',
                          outline: 'none',
                          fontFamily: 'inherit',
                        }}
                      />
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={handleVideoAdd}
                        className="shrink-0"
                      >
                        Додади
                      </Button>
                    </div>
                    {videoInputError && (
                      <p style={{ fontSize: 11, color: 'var(--color-coral)', marginTop: 4 }}>
                        {videoInputError}
                      </p>
                    )}
                  </div>
                )}

                <EditorContent editor={editor} />
              </div>

              {/* Upload error */}
              {uploadError && (
                <p className="mt-1.5 text-[11.5px]" style={{ color: 'var(--color-coral)' }}>
                  {uploadError}
                </p>
              )}

              {submitted && isEmpty && (
                <p className="mt-1.5 text-[11.5px]" style={{ color: 'var(--color-coral)' }}>
                  Внесете содржина.
                </p>
              )}

              {/* Non-image attachment chips */}
              {chipAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {chipAttachments.map((att, i) => {
                    const realIdx = attachments.indexOf(att);
                    if (att.type === 'file') {
                      return (
                        <FileChip key={i} att={att} onRemove={() => removeAttachment(realIdx)} />
                      );
                    }
                    if (att.type === 'video') {
                      return (
                        <VideoChip key={i} att={att} onRemove={() => removeAttachment(realIdx)} />
                      );
                    }
                    return null;
                  })}
                </div>
              )}

            </div>

            {/* Poll */}
            <div style={{ paddingTop: 4 }}>
              <PollEditor onChange={setPollState} />
              {pollInvalid && submitted && (
                <p className="mt-1.5 text-[11.5px]" style={{ color: 'var(--color-coral)' }}>
                  Анкетата е нецелосна. Пополнете ги сите полиња.
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div
            className="px-5 py-4 space-y-3"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center justify-between gap-3">
              {submitError ? (
                <p className="text-[11.5px]" style={{ color: 'var(--color-coral)' }}>
                  {submitError}
                </p>
              ) : (
                <p className="text-[11px]" style={{ color: 'var(--color-muted-dim)' }}>
                  Markdown поддржан · @споменување активно · Биди почитуван
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => navigate('/')} className="flex-1 sm:flex-none">
                Откажи
              </Button>
              <Button
                variant="primary"
                type="button"
                onClick={handleSubmit}
                loading={submitting || uploading}
                disabled={submitting || uploading}
                className="flex-1 sm:flex-none"
                style={
                  !canSubmit && !(submitting || uploading)
                    ? {
                        background: 'rgba(124,92,255,0.18)',
                        color: 'rgba(255,255,255,0.22)',
                        boxShadow: 'none',
                      }
                    : undefined
                }
              >
                {uploading ? 'Прикачување…' : 'Објави'}
              </Button>
            </div>
          </div>
        </Card>

        {/* ── Tips ── */}
        <div
          className="sg-fu-2 rounded-2xl p-4"
          style={{ background: 'rgba(124,92,255,0.04)', border: '1px solid rgba(124,92,255,0.09)' }}
        >
          <p className="text-[11.5px] font-semibold mb-1.5" style={{ color: 'var(--color-accent)' }}>
            Совети за добра дискусија
          </p>
          <ul className="space-y-0.5 text-[12px]" style={{ color: 'var(--color-muted-dim)' }}>
            <li>· Биди специфичен — добри прашања добиваат подобри одговори</li>
            <li>· Провери дали темата веќе постои пред да отвориш нова</li>
            <li>· Пишувај @корисник за да поканиш некого во дискусијата</li>
          </ul>
        </div>
      </div>
    </>
  );
}
