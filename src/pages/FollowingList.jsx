import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import SchoolBadge from '../components/SchoolBadge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { fetchUserByUsername } from '../lib/firestore/users';
import {
  fetchFollowing,
  followUser,
  unfollowUser,
  isFollowing as checkIsFollowing,
} from '../lib/firestore/userFollows';

function UserRow({ userId, currentUser }) {
  const [user, setUser] = useState(null);
  const [following, setFollowing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const snap = await getDoc(doc(db, 'users', userId));
        if (!snap.exists() || cancelled) return;
        const userData = { id: snap.id, ...snap.data() };
        let isFollow = false;
        if (currentUser && currentUser.id !== userId) {
          isFollow = await checkIsFollowing(currentUser.id, userId);
        }
        if (!cancelled) {
          setUser(userData);
          setFollowing(isFollow);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- currentUser?.id is sufficient; the full object would re-fetch follow status on every profile property change (bio, avatar, etc.) which is wrong
  }, [userId, currentUser?.id]);

  const handleToggle = async () => {
    if (!currentUser || !user) return;
    const was = following;
    setFollowing((f) => !f);
    setActionLoading(true);
    try {
      if (was) {
        await unfollowUser({ followerId: currentUser.id, followingId: userId });
      } else {
        await followUser({
          followerId: currentUser.id,
          followingId: userId,
          followerUsername: currentUser.username,
          followingUsername: user.username,
        });
      }
    } catch {
      setFollowing(was);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        className="flex items-center gap-3 py-3 px-4"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="shimmer rounded-2xl" style={{ width: 36, height: 36, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="shimmer rounded" style={{ height: 11, width: '42%', marginBottom: 5 }} />
          <div className="shimmer rounded" style={{ height: 9, width: '26%' }} />
        </div>
      </div>
    );
  }
  if (!user) return null;

  const isOwnRow = currentUser?.id === userId;
  const isDeleted = !!user.isDeleted;

  return (
    <div
      className="flex items-center gap-3 py-3 px-4"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      <Link
        to={isDeleted ? '#' : `/u/${user.username?.toLowerCase()}`}
        style={{ textDecoration: 'none', flexShrink: 0 }}
      >
        <Avatar username={user.username} avatarUrl={user.avatarUrl} size="md" />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {isDeleted ? (
            <span className="text-[13.5px] italic" style={{ color: 'var(--color-muted-dim)' }}>
              [избришан корисник]
            </span>
          ) : (
            <Link
              to={`/u/${user.username?.toLowerCase()}`}
              className="text-[13.5px] font-semibold text-ink hover:text-iris transition-colors"
              style={{ textDecoration: 'none' }}
            >
              {user.username}
            </Link>
          )}
          {!isDeleted && user.school && <SchoolBadge school={user.school} size="xs" />}
        </div>
      </div>
      {!isOwnRow && !isDeleted && currentUser && following !== null && (
        <Button
          variant={following ? 'secondary' : 'primary'}
          size="sm"
          loading={actionLoading}
          disabled={actionLoading}
          onClick={handleToggle}
          className="shrink-0"
        >
          {following ? 'Откажи' : 'Следи'}
        </Button>
      )}
    </div>
  );
}

export default function FollowingList() {
  const { username } = useParams();
  const { userProfile: currentUser } = useAuth();

  const [profileUser, setProfileUser] = useState(null);
  const [following, setFollowing] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      setNotFound(false);
      try {
        const user = await fetchUserByUsername(username.toLowerCase());
        if (!user) {
          if (!cancelled) setNotFound(true);
          return;
        }
        const res = await fetchFollowing(user.id, { pageSize: 20 });
        if (!cancelled) {
          setProfileUser(user);
          setFollowing(res.following);
          setLastDoc(res.lastDoc);
          setHasMore(res.hasMore);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [username]);

  const loadMore = async () => {
    if (!profileUser || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetchFollowing(profileUser.id, { pageSize: 20, lastDoc });
      setFollowing((prev) => [...prev, ...res.following]);
      setLastDoc(res.lastDoc);
      setHasMore(res.hasMore);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <div className="mb-5">
        <Link
          to={profileUser ? `/u/${username}` : '/'}
          className="text-[11px] font-bold uppercase tracking-[0.14em] hover:text-ink transition-colors"
          style={{ color: 'var(--color-muted-dim)', textDecoration: 'none' }}
        >
          ← Назад
        </Link>
        <h1 className="font-display font-bold text-[20px] text-ink tracking-tight mt-1">
          {profileUser ? `${profileUser.username} следи` : 'Следи'}
        </h1>
      </div>

      {notFound ? (
        <Card className="p-10 text-center">
          <p className="text-[13px]" style={{ color: 'var(--color-muted-dim)' }}>
            Корисникот не постои.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          {loading ? (
            [1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-3 px-4"
                style={{ borderBottom: '1px solid var(--color-border)' }}
              >
                <div className="shimmer rounded-2xl" style={{ width: 36, height: 36 }} />
                <div style={{ flex: 1 }}>
                  <div
                    className="shimmer rounded"
                    style={{ height: 11, width: '42%', marginBottom: 5 }}
                  />
                  <div className="shimmer rounded" style={{ height: 9, width: '26%' }} />
                </div>
              </div>
            ))
          ) : following.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-[13px]" style={{ color: 'var(--color-muted-dim)' }}>
                Не следи никого.
              </p>
            </div>
          ) : (
            following.map((f) => (
              <UserRow key={f.followingId} userId={f.followingId} currentUser={currentUser} />
            ))
          )}
        </Card>
      )}

      {hasMore && (
        <div className="flex justify-center mt-4">
          <Button
            variant="secondary"
            loading={loadingMore}
            disabled={loadingMore}
            onClick={loadMore}
          >
            {loadingMore ? 'Вчитување…' : 'Вчитај повеќе'}
          </Button>
        </div>
      )}
    </div>
  );
}
