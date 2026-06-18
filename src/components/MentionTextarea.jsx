import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { searchUsernames } from '../lib/firestore/users';

// MVP: comment/reply textareas support @mention autocomplete.
// Comment attachments (file uploads) are out of scope for MVP — threads only.

function getMentionQuery(text, cursor) {
  const before = text.slice(0, cursor);
  const match = before.match(/@(\w*)$/);
  if (!match) return null;
  return { query: match[1], mentionStart: match.index };
}

function MentionDropdownUI({ items, selectedIndex, onSelect, anchorRef }) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, [anchorRef]);

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: Math.min(pos.width, 320),
        zIndex: 200,
        background: 'var(--color-surface-hover)',
        border: '1px solid var(--color-border-strong)',
        borderRadius: 10,
        boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}
    >
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(item);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '8px 12px',
            background: i === selectedIndex ? 'rgba(124,92,255,0.1)' : 'transparent',
            color: i === selectedIndex ? 'var(--color-ink)' : 'var(--color-ink-dim)',
            fontSize: 13,
            cursor: 'pointer',
            border: 'none',
            textAlign: 'left',
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
}

/**
 * Drop-in textarea replacement with @mention autocomplete.
 * Forwards all standard textarea props; add textareaRef for external ref access.
 */
export default function MentionTextarea({
  value,
  onChange,
  placeholder,
  rows,
  className,
  style,
  autoFocus,
  onKeyDown: externalKeyDown,
  onPaste: externalPaste,
  textareaRef: externalRef,
}) {
  const [dropdown, setDropdown] = useState(null);
  // { items: [], selectedIndex: 0, mentionStart: number }
  const [selectedIndex, setSelectedIndex] = useState(0);
  const internalRef = useRef(null);
  const ref = externalRef ?? internalRef;
  const debounceRef = useRef(null);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const insertMention = (username) => {
    const el = ref.current;
    if (!el || !dropdown) return;
    const cursor = el.selectionStart;
    const before = value.slice(0, dropdown.mentionStart);
    const after = value.slice(cursor);
    const next = `${before}@${username} ${after}`;
    onChange({ target: { value: next } });
    setDropdown(null);
    const newPos = dropdown.mentionStart + username.length + 2;
    requestAnimationFrame(() => {
      el.setSelectionRange(newPos, newPos);
      el.focus();
    });
  };

  const handleChange = (e) => {
    onChange(e);
    const text = e.target.value;
    const cursor = e.target.selectionStart;
    const found = getMentionQuery(text, cursor);

    clearTimeout(debounceRef.current);
    if (!found || !found.query) {
      setDropdown(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const items = await searchUsernames(found.query, 6);
        if (items.length) {
          setDropdown({ items, mentionStart: found.mentionStart });
          setSelectedIndex(0);
        } else {
          setDropdown(null);
        }
      } catch {
        setDropdown(null);
      }
    }, 200);
  };

  const handleKeyDown = (e) => {
    if (dropdown?.items?.length) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % dropdown.items.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + dropdown.items.length) % dropdown.items.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const item = dropdown.items[selectedIndex];
        if (item) insertMention(item.username);
        return;
      }
      if (e.key === 'Escape') {
        setDropdown(null);
        return;
      }
    }
    externalKeyDown?.(e);
  };

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={externalPaste}
        onBlur={() => setTimeout(() => setDropdown(null), 150)}
        placeholder={placeholder}
        rows={rows}
        className={className}
        style={style}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- prop forwarded from caller; caller is responsible for intentional use
        autoFocus={autoFocus}
      />
      {dropdown?.items?.length > 0 && (
        <MentionDropdownUI
          items={dropdown.items}
          selectedIndex={selectedIndex}
          onSelect={(item) => insertMention(item.username)}
          anchorRef={ref}
        />
      )}
    </div>
  );
}
