import { useState, useEffect } from 'react';
import { fetchAllForums, adminCreateForum, deleteForumById } from '../../lib/firestore/forums';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Button from '../../components/ui/Button';
import Tabs from '../../components/ui/Tabs';
import Card from '../../components/ui/Card';

// ── Constants ─────────────────────────────────────────────────────────────────

const FORUM_PRESET_COLORS = [
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

const FORUM_PRESET_ICONS = [
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

// ── CreateForumForm ───────────────────────────────────────────────────────────

function CreateForumForm({ onCreated, onCancel }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [icon, setIcon] = useState('💬');
  const [color, setColor] = useState('var(--color-accent)');
  const [type, setType] = useState('topic');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Внеси го името на форумот.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const id = await adminCreateForum({
        name: name.trim(),
        description: desc.trim(),
        icon,
        color,
        type,
      });
      onCreated({
        id,
        name: name.trim(),
        description: desc.trim(),
        icon,
        color,
        type,
        isActive: true,
        threadCount: 0,
      });
    } catch (err) {
      setError(err.message ?? 'Грешка. Обиди се повторно.');
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        padding: '18px 20px',
        borderRadius: 14,
        marginBottom: 16,
        background: 'rgba(124,92,255,0.04)',
        border: '1px solid rgba(124,92,255,0.18)',
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'rgba(124,92,255,0.5)',
          margin: '0 0 14px',
        }}
      >
        Нов форум
      </p>

      {/* Name */}
      <div style={{ marginBottom: 10 }}>
        <label htmlFor="new-forum-name" style={{ fontSize: 11.5, color: 'var(--color-muted)', display: 'block', marginBottom: 5 }}>
          Име <span style={{ color: 'var(--color-coral)' }}>*</span>
        </label>
        <Input
          id="new-forum-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box' }}
          placeholder="нпр. Математика и физика"
        />
      </div>

      {/* Description */}
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="new-forum-desc" style={{ fontSize: 11.5, color: 'var(--color-muted)', display: 'block', marginBottom: 5 }}>
          Опис
        </label>
        <Textarea
          id="new-forum-desc"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={2}
          style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
          placeholder="Краток опис на форумот"
        />
      </div>

      {/* Type */}
      <div style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 11.5, color: 'var(--color-muted)', display: 'block', marginBottom: 6 }}>
          Тип
        </p>
        <div style={{ display: 'flex', gap: 6 }}>
          {['topic', 'school'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              style={{
                padding: '5px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                background: type === t ? 'rgba(124,92,255,0.15)' : 'var(--color-surface-hover)',
                color: type === t ? 'var(--color-accent)' : 'var(--color-muted)',
                outline: type === t ? '1px solid rgba(124,92,255,0.35)' : 'none',
              }}
            >
              {t === 'topic' ? 'Тема' : 'Училиште'}
            </button>
          ))}
        </div>
      </div>

      {/* Icon picker */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11.5, color: 'var(--color-muted)', display: 'block', marginBottom: 6 }}>
          Икона — <span style={{ fontSize: 16 }}>{icon}</span>
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {FORUM_PRESET_ICONS.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => setIcon(em)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 7,
                fontSize: 16,
                cursor: 'pointer',
                border: 'none',
                background: icon === em ? 'rgba(124,92,255,0.2)' : 'var(--color-surface-hover)',
                outline: icon === em ? '1.5px solid rgba(124,92,255,0.5)' : 'none',
              }}
            >
              {em}
            </button>
          ))}
        </div>
      </div>

      {/* Color picker */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11.5, color: 'var(--color-muted)', display: 'block', marginBottom: 6 }}>
          Боја — <span style={{ fontFamily: 'monospace', color: color }}>{color}</span>
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {FORUM_PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: c,
                border: 'none',
                cursor: 'pointer',
                outline: color === c ? `2px solid ${c}` : '2px solid transparent',
                outlineOffset: 2,
              }}
            />
          ))}
        </div>
      </div>

      {error && <p style={{ fontSize: 12, color: 'var(--color-coral)', margin: '0 0 10px' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          Откажи
        </Button>
        <Button
          variant="primary"
          size="sm"
          loading={saving}
          disabled={saving}
          onClick={handleCreate}
        >
          + Создај форум
        </Button>
      </div>
    </div>
  );
}

// ── ForumRow ──────────────────────────────────────────────────────────────────

function ForumRow({ forum, onDeleted }) {
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      await deleteForumById(forum.id);
      onDeleted(forum.id);
    } catch (err) {
      setError(err.message ?? 'Грешка.');
      setDeleting(false);
      setConfirm(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '11px 15px',
        borderRadius: 12,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
        flexWrap: 'wrap',
      }}
    >
      {/* Icon + color dot */}
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          flexShrink: 0,
          background: `${forum.color}18`,
          border: `1px solid ${forum.color}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 17,
        }}
      >
        {forum.icon ?? '💬'}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-ink)' }}>{forum.name}</span>
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              padding: '1px 6px',
              borderRadius: 999,
              background: forum.type === 'school' ? 'rgba(245,158,11,0.1)' : 'rgba(124,92,255,0.1)',
              color: forum.type === 'school' ? '#F59E0B' : 'var(--color-accent)',
              border: `1px solid ${forum.type === 'school' ? 'rgba(245,158,11,0.2)' : 'rgba(124,92,255,0.2)'}`,
            }}
          >
            {forum.type === 'school' ? 'Училиште' : 'Тема'}
          </span>
          {forum.isActive === false && (
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                padding: '1px 6px',
                borderRadius: 999,
                background: 'rgba(113,113,122,0.15)',
                color: 'var(--color-muted)',
                border: '1px solid rgba(113,113,122,0.2)',
              }}
            >
              Неактивен
            </span>
          )}
          <span style={{ fontSize: 10.5, fontFamily: 'monospace', color: 'var(--color-muted-dimmer)' }}>
            /{forum.id}
          </span>
        </div>
        {forum.description && (
          <p
            style={{
              fontSize: 12,
              color: 'var(--color-muted-dim)',
              margin: '2px 0 0',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}
          >
            {forum.description}
          </p>
        )}
      </div>

      {/* Thread count */}
      <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--color-muted-dimmer)', flexShrink: 0 }}>
        {forum.threadCount ?? 0} теми
      </span>

      {/* Delete */}
      {confirm ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: '#FCA5A5' }}>Избриши?</span>
          <Button variant="ghost" size="sm" onClick={() => setConfirm(false)} disabled={deleting}>
            Не
          </Button>
          <Button
            variant="secondary"
            size="sm"
            loading={deleting}
            disabled={deleting}
            onClick={handleDelete}
            style={{ borderColor: 'rgba(248,113,113,0.3)', color: 'var(--color-coral)' }}
          >
            Да
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirm(true)}
          style={{ color: 'var(--color-muted-dim)', flexShrink: 0 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-coral)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-muted-dim)')}
        >
          Избриши
        </Button>
      )}

      {error && (
        <p style={{ width: '100%', fontSize: 11, color: 'var(--color-coral)', margin: '4px 0 0' }}>{error}</p>
      )}
    </div>
  );
}

// ── ForumsTab ─────────────────────────────────────────────────────────────────

function ForumsTab() {
  const [forums, setForums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState('all'); // all | topic | school

  useEffect(() => {
    setLoading(true);
    setFetchError('');
    fetchAllForums()
      .then(setForums)
      .catch((err) => setFetchError(err.message ?? String(err)))
      .finally(() => setLoading(false));
  }, []);

  const handleCreated = (forum) => {
    setForums((prev) => [forum, ...prev].sort((a, b) => a.name.localeCompare(b.name, 'mk')));
    setShowCreate(false);
  };

  const handleDeleted = (id) => setForums((prev) => prev.filter((f) => f.id !== id));

  const filtered = filter === 'all' ? forums : forums.filter((f) => f.type === filter);

  return (
    <div>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 14,
          flexWrap: 'wrap',
        }}
      >
        <Tabs
          value={filter}
          onValueChange={setFilter}
          options={[
            { value: 'all', label: 'Сите' },
            { value: 'topic', label: 'Теми' },
            { value: 'school', label: 'Училишта' },
          ]}
        />

        <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--color-muted-dimmer)' }}>
          {filtered.length} форуми
        </span>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowCreate((v) => !v)}
          style={{ marginLeft: 'auto' }}
        >
          + Нов форум
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <CreateForumForm onCreated={handleCreated} onCancel={() => setShowCreate(false)} />
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="shimmer rounded-xl" style={{ height: 56 }} />
          ))}
        </div>
      ) : fetchError ? (
        <Card className="p-8 text-center">
          <p style={{ color: 'var(--color-coral)', fontSize: 13, marginBottom: 6 }}>Грешка при вчитување:</p>
          <p style={{ color: 'var(--color-muted)', fontSize: 11.5, fontFamily: 'monospace' }}>{fetchError}</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <p style={{ color: 'var(--color-muted-dim)', fontSize: 13.5 }}>Нема форуми.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((f) => (
            <ForumRow key={f.id} forum={f} onDeleted={handleDeleted} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page default export ───────────────────────────────────────────────────────

export default function ForumsPage() {
  return (
    <div style={{ padding: '0 24px 32px' }}>
      <AdminPageHeader title="Форуми" subtitle="Управувај со форуми" />
      <ForumsTab />
    </div>
  );
}
