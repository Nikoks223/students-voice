import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRequireAuth } from './useRequireAuth';
import { toggleUpvote } from '../lib/firestore/upvotes';

export function useUpvote({ targetType, targetId, threadId, forumId, initialCount, initiallyVoted }) {
  const [count, setCount] = useState(initialCount ?? 0);
  const [voted, setVoted] = useState(false);
  const [pending, setPending] = useState(false);
  const { userProfile } = useAuth();
  const requireAuth = useRequireAuth();
  const serverSynced = useRef(false);

  // Sync once when server vote state arrives (undefined → true/false)
  useEffect(() => {
    if (initiallyVoted !== undefined && !serverSynced.current) {
      setVoted(initiallyVoted);
      serverSynced.current = true;
    }
  }, [initiallyVoted]);

  const toggle = () => {
    requireAuth(async () => {
      if (pending || !userProfile) return;
      setPending(true);
      const wasVoted = voted;
      setVoted(!wasVoted);
      setCount((c) => (wasVoted ? c - 1 : c + 1));
      try {
        const result = await toggleUpvote({
          userId: userProfile.id,
          targetType,
          targetId,
          threadId: threadId ?? targetId,
          actorUsername: userProfile.username ?? null,
          forumId: forumId ?? null,
        });
        setVoted(result.voted);
      } catch {
        setVoted(wasVoted);
        setCount((c) => (wasVoted ? c + 1 : c - 1));
      } finally {
        setPending(false);
      }
    });
  };

  return { count, voted, pending, toggle };
}
