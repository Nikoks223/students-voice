import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import SchoolBadge from '../components/SchoolBadge';
import PostCard from '../components/PostCard';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { fetchUserByUsername, fetchUserThreads, fetchUserComments } from '../lib/firestore/users';
import {
  followUser,
  unfollowUser,
  isFollowing as checkIsFollowing,
} from '../lib/firestore/userFollows';
import { uploadBanner } from '../lib/cloudinary';
import { cloudinaryThumb } from '../lib/cloudinary';
import { getAvatarGradient } from '../lib/avatarGradient';
import { getForumById } from '../data/forums';
import { timeAgo } from '../utils/timeAgo';

// ── Icons (no external dep) ────────────────────────────────────────────────────

function IconCamera() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function IconPencil() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconUserOutline() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ color: 'var(--color-muted-dimmer)' }}
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ color: 'var(--color-muted-dim)', flexShrink: 0 }}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block rounded-full border-2 animate-spin"
      style={{
        width: 13,
        height: 13,
        borderColor: 'rgba(255,255,255,0.15)',
        borderTopColor: 'var(--color-ink)',
      }}
    />
  );
}

// ── BioModal ──────────────────────────────────────────────────────────────────

function BioModal({ current, onSave, onClose }) {
  const [text, setText] = useState(current ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(text.trim());
      onClose();
    } catch {
      setSaving(false);
    }
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border-strong)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
          animation: 'fadeUp 0.22s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        <h3 className="font-display font-bold text-[15px] text-ink tracking-tight mb-4">
          Уреди bio
        </h3>
        <textarea
          // eslint-disable-next-line jsx-a11y/no-autofocus -- intentional focus management: bio textarea activates when edit panel opens
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 280))}
          rows={4}
          className="input w-full resize-none text-[13px]"
          style={{ borderRadius: 10, lineHeight: 1.65 }}
          placeholder="Раскажи нешто за себе�"
        />
        <p
          className="text-right font-mono mt-1.5"
          style={{ fontSize: 11, color: text.length >= 260 ? 'var(--color-coral)' : 'var(--color-muted-dim)' }}
        >
          {text.length}/280
        </p>
        <div className="flex gap-2 mt-4 justify-end">
          <Button variant="secondary" onClick={onClose}>
            Откажи
          </Button>
          <Button variant="primary" loading={saving} disabled={saving} onClick={handleSave}>
            {saving ? 'Зачувување�' : 'Зачувај'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Profile ───────────────────────────────────────────────────────────────────

export default function Profile() {
  const { username: usernameParam, uid: uidParam } = useParams();
  const { userProfile: currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [profileUser, setProfileUser] = useState(null);
  const [profileStats, setProfileStats] = useState(null);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [activeTab, setActiveTab] = useState('threads');
  const [threads, setThreads] = useState([]);
  const [threadLastDoc, setThreadLastDoc] = useState(null);
  const [threadHasMore, setThreadHasMore] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadsFetched, setThreadsFetched] = useState(false);

  const [comments, setComments] = useState([]);
  const [commentLastDoc, setCommentLastDoc] = useState(null);
  const [commentHasMore, setCommentHasMore] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentsFetched, setCommentsFetched] = useState(false);
  const [threadCache, setThreadCache] = useState({});

  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerPreview, setBannerPreview] = useState(null);
  const bannerInputRef = useRef(null);

  const [bioModalOpen, setBioModalOpen] = useState(false);
  const [modLog, setModLog] = useState([]);
  const [loadError, setLoadError] = useState(null);

  // ── Load profile ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setBannerPreview(null);
    setThreadsFetched(false);
    setCommentsFetched(false);
    setThreads([]);
    setComments([]);
    setModLog([]);
    setLoadError(null);

    async function load() {
      setLoading(true);
      setNotFound(false);
      setLoadError(null);
      try {
        let user = null;
        if (usernameParam) {
          user = await fetchUserByUsername(usernameParam.toLowerCase());
        } else if (uidParam) {
          const snap = await getDoc(doc(db, 'users', uidParam));
          if (snap.exists()) user = { id: snap.id, ...snap.data() };
        }
        // Treat deleted accounts the same as not-found � the /u/:username path
        // already returns null from fetchUserByUsername for deleted users; this
        // guard covers the /profile/:uid path which fetches by doc ID directly.
        if (!user || user.isDeleted) {
          if (!cancelled) setNotFound(true);
          return;
        }

        // ── Secondary reads � each is independent and non-fatal ─────────────
        let statsData = {};
        try {
          const statsSnap = await getDoc(doc(db, 'stats', 'users', 'entries', user.id));
          if (statsSnap.exists()) statsData = statsSnap.data();
        } catch {
          // stats are display-only � missing or inaccessible stats don't break the profile
        }

        let isFollowingUser = false;
        try {
          if (isAuthenticated && currentUser && currentUser.id !== user.id) {
            isFollowingUser = await checkIsFollowing(currentUser.id, user.id);
          }
        } catch {
          // non-fatal � follow button defaults to unfollowed
        }

        if (!cancelled) {
          setProfileUser(user);
          setProfileStats(statsData);
          setFollowing(isFollowingUser);
        }
      } catch (err) {
        if (!cancelled) setLoadError(err.code || err.message || 'unknown-error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usernameParam, uidParam, currentUser?.id, isAuthenticated]);

  // Moderation log � own profile only
  useEffect(() => {
    if (!profileUser || !currentUser || profileUser.id !== currentUser.id) return;
    if (!profileUser.warningCount && !profileUser.isBanned) return;
    getDocs(
      query(
        collection(db, 'moderationLog'),
        where('targetUserId', '==', profileUser.id),
        orderBy('createdAt', 'desc'),
        limit(20),
      ),
    )
      .then((snap) => {
        setModLog(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps -- partial deps are intentional: warningCount/isBanned re-trigger the query when moderation state changes; currentUser?.id is sufficient (full object would re-run on every profile property change)
  }, [profileUser?.id, profileUser?.warningCount, profileUser?.isBanned, currentUser?.id]);

  // ── Load threads ──────────────────────────────────────────────────────────────
  const loadThreads = async ({ append = false } = {}) => {
    if (!profileUser) return;
    setThreadLoading(true);
    try {
      const res = await fetchUserThreads(profileUser.id, {
        lastDoc: append ? threadLastDoc : null,
      });
      const enriched = res.threads.map((t) => {
        const forum = getForumById(t.forumId);
        return {
          ...t,
          forumName: t.forumName ?? forum?.name ?? t.forumId,
          forumColor: t.forumColor ?? forum?.color ?? 'var(--color-muted)',
          forumIcon: t.forumIcon ?? forum?.icon ?? null,
        };
      });
      setThreads((prev) => (append ? [...prev, ...enriched] : enriched));
      setThreadLastDoc(res.lastDoc);
      setThreadHasMore(res.hasMore);
      setThreadsFetched(true);
    } catch { /* intentional */ }
    setThreadLoading(false);
  };

  // ── Load comments ─────────────────────────────────────────────────────────────
  const loadComments = async ({ append = false } = {}) => {
    if (!profileUser) return;
    setCommentLoading(true);
    try {
      const res = await fetchUserComments(profileUser.id, {
        lastDoc: append ? commentLastDoc : null,
      });
      const currentCache = threadCache;
      const neededIds = [...new Set(res.comments.map((c) => c.threadId))].filter(
        (id) => id && !currentCache[id],
      );
      if (neededIds.length > 0) {
        const fetched = await Promise.all(
          neededIds.map((id) =>
            getDoc(doc(db, 'threads', id))
              .then((s) => (s.exists() ? { id: s.id, ...s.data() } : null))
              .catch(() => null),
          ),
        );
        const additions = Object.fromEntries(fetched.filter(Boolean).map((t) => [t.id, t]));
        setThreadCache((prev) => ({ ...prev, ...additions }));
      }
      setComments((prev) => (append ? [...prev, ...res.comments] : res.comments));
      setCommentLastDoc(res.lastDoc);
      setCommentHasMore(res.hasMore);
      setCommentsFetched(true);
    } catch { /* intentional */ }
    setCommentLoading(false);
  };

  useEffect(() => {
    if (!profileUser) return;
    if (!threadsFetched) loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileUser?.id]);

  useEffect(() => {
    if (!profileUser) return;
    if (activeTab === 'comments' && !commentsFetched) loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, profileUser?.id]);

  // ── Follow / Unfollow ─────────────────────────────────────────────────────────
  const handleFollow = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!currentUser || !profileUser) return;
    const wasFollowing = following;
    setFollowing((f) => !f);
    setProfileStats((s) => ({
      ...s,
      followerCount: Math.max(0, (s?.followerCount ?? 0) + (wasFollowing ? -1 : 1)),
    }));
    setFollowLoading(true);
    try {
      if (wasFollowing) {
        await unfollowUser({ followerId: currentUser.id, followingId: profileUser.id });
      } else {
        await followUser({
          followerId: currentUser.id,
          followingId: profileUser.id,
          followerUsername: currentUser.username,
          followingUsername: profileUser.username,
        });
      }
    } catch {
      setFollowing(wasFollowing);
      setProfileStats((s) => ({
        ...s,
        followerCount: Math.max(0, (s?.followerCount ?? 0) + (wasFollowing ? 1 : -1)),
      }));
    } finally {
      setFollowLoading(false);
    }
  };

  // ── Banner upload ─────────────────────────────────────────────────────────────
  const handleBannerChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !profileUser) return;
    setBannerUploading(true);
    setBannerPreview(URL.createObjectURL(file));
    try {
      const { url, publicId } = await uploadBanner(file);
      await updateDoc(doc(db, 'users', profileUser.id), {
        bannerUrl: url,
        bannerPublicId: publicId,
        updatedAt: serverTimestamp(),
      });
      setProfileUser((u) => ({ ...u, bannerUrl: url, bannerPublicId: publicId }));
    } catch (err) {
      setBannerPreview(null);
      console.error('[Profile] banner upload:', err.message);
    } finally {
      setBannerUploading(false);
      e.target.value = '';
    }
  };

  // ── Bio save ──────────────────────────────────────────────────────────────────
  const handleBioSave = async (bio) => {
    await updateDoc(doc(db, 'users', profileUser.id), { bio, updatedAt: serverTimestamp() });
    setProfileUser((u) => ({ ...u, bio }));
  };

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div>
        <div className="shimmer rounded-2xl" style={{ height: 260 }} />
        <div className="px-1 -mt-14 relative z-10">
          <div className="flex items-end justify-between gap-4">
            <div
              className="shimmer"
              style={{
                width: 80,
                height: 80,
                borderRadius: 26,
                border: '4px solid var(--color-bg)',
                flexShrink: 0,
              }}
            />
            <div className="shimmer rounded-lg mb-2" style={{ width: 108, height: 36 }} />
          </div>
          <div className="mt-4 space-y-2">
            <div className="shimmer rounded" style={{ height: 26, width: '42%' }} />
            <div className="shimmer rounded" style={{ height: 11, width: '22%' }} />
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="shimmer rounded" style={{ height: 13, width: '68%' }} />
            <div className="shimmer rounded" style={{ height: 13, width: '50%' }} />
          </div>
        </div>
        <div
          className="grid grid-cols-4 mt-7"
          style={{
            borderTop: '1px solid var(--color-border)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="py-5 text-center"
              style={{ borderRight: i < 4 ? '1px solid var(--color-border)' : 'none' }}
            >
              <div
                className="shimmer rounded mx-auto"
                style={{ height: 22, width: 44, marginBottom: 8 }}
              />
              <div className="shimmer rounded mx-auto" style={{ height: 9, width: 34 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Load error (permission-denied or unexpected throw on user doc fetch) ─────
  if (loadError) {
    return (
      <div
        className="flex flex-col items-center justify-center text-center"
        style={{
          paddingTop: 100,
          paddingBottom: 100,
          animation: 'fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'rgba(248,113,113,0.06)',
            border: '1px solid rgba(248,113,113,0.14)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-coral)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2
          className="font-display font-bold tracking-tight mb-2"
          style={{ fontSize: 18, color: 'var(--color-coral)' }}
        >
          Грешка при вчитување
        </h2>
        <p style={{ fontSize: 13, color: 'var(--color-muted)', maxWidth: 280 }}>
          Профилот не може да се вчита во моментов.
        </p>
        <p className="font-mono" style={{ fontSize: 10.5, color: 'var(--color-muted-dimmer)', marginTop: 8 }}>
          {loadError}
        </p>
      </div>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────────
  if (notFound) {
    return (
      <div
        className="flex flex-col items-center justify-center text-center"
        style={{
          paddingTop: 100,
          paddingBottom: 100,
          animation: 'fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <IconUserOutline />
        </div>
        <h2
          className="font-display font-bold text-ink tracking-tight mb-2"
          style={{ fontSize: 18 }}
        >
          Корисникот не постои
        </h2>
        <p style={{ fontSize: 13, color: 'var(--color-muted)', maxWidth: 280 }}>
          Оваа сметка не постои или е трајно избришана.
        </p>
      </div>
    );
  }

  if (!profileUser) return null;

  const isOwnProfile = currentUser?.id === profileUser.id;
  const { from: gradFrom, to: gradTo } = getAvatarGradient(profileUser.username ?? '');
  const bannerUrl = bannerPreview ?? profileUser.bannerUrl;
  const bannerDisplay = bannerUrl
    ? cloudinaryThumb(bannerUrl, { width: 1600, height: 520, crop: 'fill', gravity: 'auto' })
    : null;

  const joinedDate = profileUser.createdAt?.toDate?.() ?? null;
  const joinedStr = joinedDate
    ? joinedDate.toLocaleDateString('mk-MK', { month: 'long', year: 'numeric' })
    : null;

  const showModLog = isOwnProfile && (profileUser.warningCount > 0 || profileUser.isBanned);
  const stats = {
    threadCount: profileStats?.threadCount ?? 0,
    commentCount: profileStats?.commentCount ?? 0,
    followerCount: profileStats?.followerCount ?? 0,
    followingCount: profileStats?.followingCount ?? 0,
  };
  const usernameSlug = profileUser.username?.toLowerCase() ?? '';

  return (
    <div style={{ animation: 'fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) both' }}>
      {/* ── Banner ─────────────────────────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden" style={{ height: 260 }}>
        {bannerDisplay ? (
          <img
            src={bannerDisplay}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
          />
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(145deg, ${gradFrom}55 0%, ${gradTo}28 55%, var(--color-bg) 100%)`,
              }}
            />
            {/* Radial spotlight over the gradient fallback */}
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(ellipse 80% 65% at 25% 35%, ${gradFrom}24 0%, transparent 68%)`,
              }}
            />
          </>
        )}
        {/* Cinematic bottom fade */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: 144,
            background:
              'linear-gradient(to top, var(--color-bg) 0%, color-mix(in srgb, var(--color-bg) 50%, transparent) 55%, transparent 100%)',
          }}
        />

        {isOwnProfile && (
          <>
            <button
              onClick={() => bannerInputRef.current?.click()}
              disabled={bannerUploading}
              className="glass absolute top-3 right-3 flex items-center gap-1.5"
              style={{
                fontSize: 11.5,
                fontWeight: 500,
                padding: '6px 12px',
                borderRadius: 8,
                color: 'var(--color-ink)',
                cursor: 'pointer',
                transition: 'opacity 0.2s cubic-bezier(0.16,1,0.3,1)',
                opacity: bannerUploading ? 0.7 : 1,
              }}
            >
              {bannerUploading ? <Spinner /> : <IconCamera />}
              {bannerUploading ? 'Прикачување�' : 'Промени банер'}
            </button>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleBannerChange}
              className="hidden"
            />
          </>
        )}
      </div>

      {/* ── Masthead ──────────────────────────────────────────────────────────── */}
      <div className="px-1 -mt-14 relative z-10">
        {/* Avatar + CTA */}
        <div className="flex items-end justify-between gap-4">
          <div
            style={{
              borderRadius: 26,
              padding: 4,
              background: 'var(--color-bg)',
              flexShrink: 0,
              display: 'inline-block',
              border: '1px solid var(--color-border)',
            }}
          >
            <Avatar
              username={profileUser.username}
              avatarUrl={profileUser.avatarUrl}
              size="xl"
              eager
            />
          </div>

          <div className="pb-1 flex-shrink-0">
            {!isAuthenticated ? (
              <Button variant="primary" onClick={() => navigate('/login')} style={{ fontSize: 13 }}>
                Најави се за да следиш
              </Button>
            ) : isOwnProfile ? (
              <Button
                variant="secondary"
                onClick={() => setBioModalOpen(true)}
                className="flex items-center gap-1.5"
                leftIcon={<IconPencil />}
                style={{ fontSize: 13 }}
              >
                Уреди профил
              </Button>
            ) : (
              <Button
                variant={following ? 'secondary' : 'primary'}
                loading={followLoading}
                disabled={followLoading}
                onClick={handleFollow}
                style={{ fontSize: 13, minWidth: 116 }}
              >
                {following ? 'Откажи следење' : 'Следи'}
              </Button>
            )}
          </div>
        </div>

        {/* Name + metadata */}
        <div
          className="mt-4"
          style={{ animation: 'fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) 60ms both' }}
        >
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1
              className="font-display font-bold tracking-tight leading-none text-ink"
              style={{ fontSize: 26 }}
            >
              {profileUser.username}
            </h1>
            {profileUser.school && <SchoolBadge school={profileUser.school} size="sm" />}
            {profileUser.year && (
              <span
                className="text-[11.5px] font-mono"
                style={{ color: 'var(--color-muted-dim)' }}
              >
                Година {profileUser.year}
              </span>
            )}
          </div>

          {joinedStr && (
            <div className="flex items-center gap-1.5 mt-2">
              <IconCalendar />
              <span className="font-mono" style={{ fontSize: 11, color: 'var(--color-muted-dim)' }}>
                {joinedStr}
              </span>
            </div>
          )}
        </div>

        {/* Bio */}
        <div
          className="mt-3"
          style={{ animation: 'fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) 100ms both' }}
        >
          {profileUser.bio ? (
            isOwnProfile ? (
              <button
                type="button"
                onClick={() => setBioModalOpen(true)}
                title="Кликни за да уредиш"
                style={{
                  fontSize: 13.5,
                  lineHeight: '1.72',
                  color: 'var(--color-ink-dim)',
                  maxWidth: '58ch',
                  cursor: 'pointer',
                  background: 'none',
                  border: 0,
                  padding: 0,
                  textAlign: 'left',
                  display: 'block',
                  font: 'inherit',
                }}
              >
                {profileUser.bio}
              </button>
            ) : (
              <p
                style={{
                  fontSize: 13.5,
                  lineHeight: '1.72',
                  color: 'var(--color-ink-dim)',
                  maxWidth: '58ch',
                }}
              >
                {profileUser.bio}
              </p>
            )
          ) : isOwnProfile ? (
            <button
              onClick={() => setBioModalOpen(true)}
              style={{
                fontSize: 12.5,
                fontStyle: 'italic',
                color: 'var(--color-muted-dimmer)',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                transition: 'color 0.15s cubic-bezier(0.16,1,0.3,1)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-muted)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-muted-dimmer)')}
            >
              + Додај bio
            </button>
          ) : null}
        </div>

        {/* ── Stats row � no card box, just hairlines ─────────────────────────── */}
        <div
          className="grid grid-cols-4 mt-7"
          style={{
            borderTop: '1px solid var(--color-border)',
            borderBottom: '1px solid var(--color-border)',
            animation: 'fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) 130ms both',
          }}
        >
          <div
            className="py-5 text-center"
            style={{ borderRight: '1px solid var(--color-border)' }}
          >
            <div
              className="font-display font-bold tracking-tight leading-none text-ink"
              style={{ fontSize: 21, marginBottom: 6 }}
            >
              {stats.threadCount.toLocaleString('mk-MK')}
            </div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--color-muted-dim)',
              }}
            >
              Дискусии
            </div>
          </div>

          <div
            className="py-5 text-center"
            style={{ borderRight: '1px solid var(--color-border)' }}
          >
            <div
              className="font-display font-bold tracking-tight leading-none text-ink"
              style={{ fontSize: 21, marginBottom: 6 }}
            >
              {stats.commentCount.toLocaleString('mk-MK')}
            </div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--color-muted-dim)',
              }}
            >
              Коментари
            </div>
          </div>

          <Link
            to={`/u/${usernameSlug}/followers`}
            style={{ textDecoration: 'none' }}
            className="group"
          >
            <div
              className="py-5 text-center"
              style={{ borderRight: '1px solid var(--color-border)' }}
            >
              <div
                className="font-display font-bold tracking-tight leading-none text-ink group-hover:text-accent transition-colors"
                style={{ fontSize: 21, marginBottom: 6 }}
              >
                {stats.followerCount.toLocaleString('mk-MK')}
              </div>
              <div
                className="transition-colors"
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--color-muted-dim)',
                }}
              >
                Следачи
              </div>
            </div>
          </Link>

          <Link
            to={`/u/${usernameSlug}/following`}
            style={{ textDecoration: 'none' }}
            className="group"
          >
            <div className="py-5 text-center">
              <div
                className="font-display font-bold tracking-tight leading-none text-ink group-hover:text-accent transition-colors"
                style={{ fontSize: 21, marginBottom: 6 }}
              >
                {stats.followingCount.toLocaleString('mk-MK')}
              </div>
              <div
                className="transition-colors"
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--color-muted-dim)',
                }}
              >
                Следи
              </div>
            </div>
          </Link>
        </div>

        {/* ── Moderation panel (own profile, warnings/ban only) ────────────────── */}
        {showModLog && (
          <div
            className="mt-5 rounded-xl overflow-hidden"
            style={{
              background: 'rgba(248,113,113,0.04)',
              border: '1px solid rgba(248,113,113,0.12)',
              animation: 'fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) 160ms both',
            }}
          >
            {profileUser.isBanned && (
              <div
                style={{
                  padding: '10px 16px',
                  background: 'rgba(248,113,113,0.07)',
                  borderBottom: '1px solid rgba(248,113,113,0.1)',
                }}
              >
                <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-coral)' }}>
                  Твојата сметка е банирана
                  {profileUser.banUntil
                    ? ` до ${(profileUser.banUntil.toDate ? profileUser.banUntil.toDate() : new Date(profileUser.banUntil)).toLocaleDateString('mk-MK')}`
                    : ' (трајно)'}
                </p>
              </div>
            )}
            <div style={{ padding: '14px 16px' }}>
              <p
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: 'var(--color-muted)',
                  marginBottom: 12,
                }}
              >
                Предупредувања � {profileUser.warningCount ?? 0}
              </p>
              {modLog.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--color-muted-dim)' }}>Нема записи.</p>
              ) : (
                <div>
                  {modLog.map((entry, i) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 py-2.5"
                      style={{
                        borderBottom:
                          i < modLog.length - 1 ? '1px solid var(--color-border)' : 'none',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 9.5,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 9999,
                          flexShrink: 0,
                          marginTop: 2,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          background:
                            entry.action === 'permanent_ban'
                              ? 'rgba(248,113,113,0.12)'
                              : entry.action === 'ban'
                                ? 'rgba(251,146,60,0.1)'
                                : 'rgba(251,191,36,0.1)',
                          color:
                            entry.action === 'permanent_ban'
                              ? 'var(--color-coral)'
                              : entry.action === 'ban'
                                ? '#FB923C'
                                : '#FBBF24',
                        }}
                      >
                        {entry.action === 'permanent_ban'
                          ? 'Трајна забрана'
                          : entry.action === 'ban'
                            ? 'Бан'
                            : 'Предупредување'}
                      </span>
                      <div className="flex-1 min-w-0">
                        {entry.reason && (
                          <p style={{ fontSize: 12, color: 'var(--color-ink-dim)', marginBottom: 2 }}>
                            {entry.reason}
                          </p>
                        )}
                        <p className="font-mono" style={{ fontSize: 10.5, color: 'var(--color-muted-dim)' }}>
                          {timeAgo(entry.createdAt?.toDate?.() ?? entry.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Content tabs � underline style ──────────────────────────────────── */}
        <div
          className="mt-8"
          style={{ animation: 'fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) 180ms both' }}
        >
          {/* Tab headers */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--color-border)',
              marginBottom: 24,
            }}
          >
            {[
              { key: 'threads', label: 'Дискусии' },
              { key: 'comments', label: 'Коментари' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  paddingTop: 10,
                  paddingBottom: 12,
                  paddingLeft: 0,
                  paddingRight: 0,
                  marginRight: 28,
                  marginBottom: -1,
                  fontSize: 13,
                  fontWeight: activeTab === tab.key ? 600 : 400,
                  color: activeTab === tab.key ? 'var(--color-ink)' : 'var(--color-muted)',
                  background: 'none',
                  border: 'none',
                  borderBottom:
                    activeTab === tab.key ? '2px solid var(--color-accent)' : '2px solid transparent',
                  cursor: 'pointer',
                  transition:
                    'color 0.2s cubic-bezier(0.16,1,0.3,1), border-color 0.2s cubic-bezier(0.16,1,0.3,1)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Threads tab ────────────────────────────────────────────────────── */}
          {activeTab === 'threads' && (
            <div>
              {threadLoading && !threadsFetched ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="shimmer rounded-2xl" style={{ height: 100 }} />
                  ))}
                </div>
              ) : threads.length === 0 && threadsFetched ? (
                <div className="text-center" style={{ paddingTop: 56, paddingBottom: 56 }}>
                  <p style={{ fontSize: 13, color: 'var(--color-muted-dim)' }}>С� уште нема објавени дискусии.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {threads.map((t, i) => (
                      <PostCard key={t.id} thread={t} index={i} />
                    ))}
                  </div>
                  {threadHasMore && (
                    <div className="flex justify-center mt-5">
                      <Button
                        variant="secondary"
                        loading={threadLoading}
                        disabled={threadLoading}
                        onClick={() => loadThreads({ append: true })}
                      >
                        {threadLoading ? 'Вчитување�' : 'Вчитај повеќе'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Comments tab ───────────────────────────────────────────────────── */}
          {activeTab === 'comments' && (
            <div>
              {commentLoading && !commentsFetched ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="shimmer rounded-2xl" style={{ height: 80 }} />
                  ))}
                </div>
              ) : comments.length === 0 && commentsFetched ? (
                <div className="text-center" style={{ paddingTop: 56, paddingBottom: 56 }}>
                  <p style={{ fontSize: 13, color: 'var(--color-muted-dim)' }}>С� уште нема коментари.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {comments.map((c, i) => {
                      const thread = threadCache[c.threadId];
                      const forum = thread ? getForumById(thread.forumId) : null;
                      const forumColor = thread?.forumColor ?? forum?.color ?? 'var(--color-muted)';
                      const forumName = thread?.forumName ?? forum?.name ?? thread?.forumId ?? '';
                      return (
                        <Card
                          key={c.id}
                          style={{
                            padding: '15px 18px',
                            position: 'relative',
                            overflow: 'hidden',
                            animation: `fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) ${Math.min(i * 40, 240)}ms both`,
                          }}
                        >
                          {/* Spotlight overlay */}
                          <div
                            aria-hidden="true"
                            style={{
                              position: 'absolute',
                              inset: 0,
                              pointerEvents: 'none',
                              background:
                                'radial-gradient(ellipse 55% 45% at 50% 0%, rgba(255,255,255,0.022) 0%, transparent 100%)',
                            }}
                          />
                          {thread && (
                            <Link
                              to={`/p/${thread.forumId}/${thread.id}`}
                              className="flex items-center gap-1.5 mb-2.5 w-fit"
                              style={{ textDecoration: 'none' }}
                            >
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  background: forumColor,
                                  flexShrink: 0,
                                  display: 'inline-block',
                                }}
                              />
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.1em',
                                  color: forumColor,
                                  flexShrink: 0,
                                }}
                              >
                                {forumName}
                              </span>
                              <span style={{ color: 'var(--color-muted-dimmer)', fontSize: 10, flexShrink: 0 }}>
                                �
                              </span>
                              <span
                                className="truncate max-w-[200px] sm:max-w-xs"
                                style={{ fontSize: 11.5, color: 'var(--color-muted)' }}
                              >
                                {thread.title}
                              </span>
                            </Link>
                          )}
                          <p
                            style={{
                              fontSize: 13,
                              lineHeight: '1.65',
                              color: 'var(--color-ink-dim)',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {c.body
                              ?.replace(/<[^>]*>/g, ' ')
                              .replace(/\s+/g, ' ')
                              .trim()}
                          </p>
                          <div className="flex items-center justify-between mt-2.5">
                            <span
                              className="font-mono"
                              style={{ fontSize: 10.5, color: 'var(--color-muted-dimmer)' }}
                            >
                              {timeAgo(c.createdAt?.toDate?.() ?? c.createdAt)}
                            </span>
                            {thread && (
                              <Link
                                to={`/p/${thread.forumId}/${thread.id}`}
                                style={{
                                  fontSize: 11.5,
                                  color: 'var(--color-muted-dim)',
                                  textDecoration: 'none',
                                  transition: 'color 0.15s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-ink-dim)')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-muted-dim)')}
                              >
                                Прикажи нишка →
                              </Link>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                  {commentHasMore && (
                    <div className="flex justify-center mt-5">
                      <Button
                        variant="secondary"
                        loading={commentLoading}
                        disabled={commentLoading}
                        onClick={() => loadComments({ append: true })}
                      >
                        {commentLoading ? 'Вчитување�' : 'Вчитај повеќе'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {bioModalOpen && (
        <BioModal
          current={profileUser.bio}
          onSave={handleBioSave}
          onClose={() => setBioModalOpen(false)}
        />
      )}
    </div>
  );
}
