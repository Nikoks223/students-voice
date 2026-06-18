import { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Avatar from './Avatar';
import UpvoteButton from './UpvoteButton';
import { timeAgo } from '../utils/timeAgo';
import Card from './ui/Card';
import Chip from './ui/Chip';

function BubbleIcon() {
  return (
    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

function PollIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function SmileIcon() {
  return (
    <svg
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14.5c.5 1.5 1.8 2.5 3.5 2.5s3-1 3.5-2.5" />
      <circle cx="9" cy="10" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function Stat({ icon, value }) {
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        color: 'var(--color-muted-dim)',
        fontSize: 11.5,
        fontFamily: 'monospace',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {icon}
      {value ?? 0}
    </span>
  );
}

export default function PostCard({ thread, index = 0, initiallyVoted }) {
  const cardRef = useRef(null);
  const spotlightRef = useRef(null);
  const navigate = useNavigate();
  const isFeatured = thread.isFeatured;

  const handleMouseMove = (e) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect || !spotlightRef.current) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    spotlightRef.current.style.background = `radial-gradient(240px circle at ${x}px ${y}px, var(--spotlight-color), transparent 70%)`;
  };

  const handleMouseEnter = (e) => {
    if (spotlightRef.current) spotlightRef.current.style.opacity = '1';
    e.currentTarget.style.background = 'var(--color-surface-hover)';
    e.currentTarget.style.borderColor = isFeatured
      ? 'rgba(245,158,11,0.32)'
      : 'var(--color-border-strong)';
    e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)';
    e.currentTarget.style.transform = 'translateY(-1px)';
  };

  const handleMouseLeave = (e) => {
    if (spotlightRef.current) spotlightRef.current.style.opacity = '0';
    e.currentTarget.style.background = 'var(--color-surface)';
    e.currentTarget.style.borderColor = isFeatured
      ? 'rgba(245,158,11,0.18)'
      : 'var(--color-border)';
    e.currentTarget.style.boxShadow = 'var(--shadow-card)';
    e.currentTarget.style.transform = 'translateY(0)';
  };

  const threadUrl = `/p/${thread.forumId}/${thread.id}`;

  return (
    <Card
      ref={cardRef}
      className="group relative overflow-hidden cursor-pointer"
      onClick={() => navigate(threadUrl)}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        borderRadius: 14,
        border: `1px solid ${isFeatured ? 'rgba(245,158,11,0.18)' : 'var(--color-border)'}`,
        boxShadow: 'var(--shadow-card)',
        background: 'var(--color-surface)',
        animation: 'fadeUp 0.35s cubic-bezier(0.23,1,0.32,1) both',
        animationDelay: `${index * 48}ms`,
        transition: [
          'background 0.18s cubic-bezier(0.23,1,0.32,1)',
          'border-color 0.18s cubic-bezier(0.23,1,0.32,1)',
          'box-shadow 0.18s cubic-bezier(0.23,1,0.32,1)',
          'transform 0.18s cubic-bezier(0.23,1,0.32,1)',
        ].join(', '),
        willChange: 'transform',
      }}
    >
      {/* Full-card nav link for keyboard users */}
      <Link to={threadUrl} className="absolute inset-0 z-0" aria-hidden="true" tabIndex={-1} />

      {/* Mouse spotlight */}
      <div
        ref={spotlightRef}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0,
          pointerEvents: 'none',
          borderRadius: 'inherit',
          transition: 'opacity 0.18s',
          zIndex: 1,
        }}
      />

      {/* Featured accent line */}
      {isFeatured && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            zIndex: 2,
            background:
              'linear-gradient(90deg, transparent, rgba(245,158,11,0.65) 35%, rgba(245,158,11,0.65) 65%, transparent)',
          }}
        />
      )}

      <div className="relative px-5 pt-4 pb-4" style={{ zIndex: 10 }}>
        {/* Meta row — forum badge left · time right */}
        <div className="flex items-center justify-between gap-3 mb-3 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Forum pill */}
            <span
              className="min-w-0 inline-flex items-center gap-[5px] font-bold uppercase"
              style={{
                background: `${thread.forumColor}18`,
                border: `1px solid ${thread.forumColor}30`,
                borderRadius: 6,
                padding: '2px 8px 2px 6px',
                fontSize: 10,
                letterSpacing: '0.08em',
                color: thread.forumColor,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: thread.forumColor,
                  flexShrink: 0,
                  display: 'inline-block',
                }}
              />
              {thread.forumName}
            </span>

            {isFeatured && (
              <Chip
                variant="sun"
                size="sm"
                className="shrink-0 uppercase tracking-widest font-bold"
                style={{ fontSize: 9, padding: '2px 7px', borderRadius: 6 }}
              >
                Истакнато
              </Chip>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {thread.poll && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 7px',
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'var(--color-accent)',
                  background: 'var(--color-accent-soft)',
                  border: '1px solid var(--color-accent-border)',
                }}
              >
                <PollIcon />
                {thread.poll.totalVotes ?? 0}
              </span>
            )}
            <span className="font-mono" style={{ fontSize: 11, color: 'var(--color-muted-dimmer)' }}>
              {timeAgo(thread.createdAt?.toDate?.() ?? thread.createdAt)}
            </span>
          </div>
        </div>

        {/* Title */}
        <h2
          className="font-display font-bold line-clamp-2 leading-snug tracking-tight mb-1.5"
          style={{ fontSize: 16.5, color: 'var(--color-ink)' }}
        >
          <Link
            to={threadUrl}
            style={{ color: 'inherit', textDecoration: 'none' }}
            className="focus:outline-none focus-visible:underline"
          >
            {thread.title}
            {thread.isEdited && (
              <span
                className="font-sans"
                style={{ fontSize: 10, fontWeight: 400, color: 'var(--color-muted-dim)', marginLeft: 8 }}
              >
                (уредено)
              </span>
            )}
          </Link>
        </h2>

        {/* Body preview */}
        <p
          className="line-clamp-2 leading-relaxed mb-4"
          style={{ fontSize: 12.5, color: 'var(--color-muted)' }}
        >
          {thread.body
            ?.replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()}
        </p>

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-3"
          style={{ borderTop: '1px solid var(--color-border)', paddingTop: 11 }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Avatar username={thread.authorUsername} size="sm" />
            {thread.authorUsername === '[избришан корисник]' ? (
              <span className="italic truncate" style={{ fontSize: 12, color: 'var(--color-muted-dim)' }}>
                {thread.authorUsername}
              </span>
            ) : (
              <Link
                to={`/u/${thread.authorUsername?.toLowerCase()}`}
                onClick={(e) => e.stopPropagation()}
                className="truncate hover:!text-ink transition-colors"
                style={{
                  fontSize: 12,
                  color: 'var(--color-ink-dim)',
                  textDecoration: 'none',
                  position: 'relative',
                  zIndex: 20,
                }}
              >
                {thread.authorUsername}
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <UpvoteButton
              targetType="thread"
              targetId={thread.id}
              threadId={thread.id}
              forumId={thread.forumId}
              initialCount={thread.upvoteCount}
              initiallyVoted={initiallyVoted}
              size="sm"
            />
            <Stat icon={<BubbleIcon />} value={thread.commentCount} />
            <Stat icon={<EyeIcon />} value={thread.viewCount} />
            {(() => {
              const total = Object.values(thread.reactionCounts ?? {}).reduce(
                (s, v) => s + Math.max(0, v || 0),
                0,
              );
              return total > 0 ? <Stat icon={<SmileIcon />} value={total} /> : null;
            })()}
          </div>
        </div>
      </div>
    </Card>
  );
}
