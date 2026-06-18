import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchThreads, fetchThreadsByForum } from '../lib/firestore/threads';

/**
 * Paginated thread feed with load-more.
 * Resets and refetches whenever sortBy or forumId changes.
 *
 * @param {object} opts
 * @param {string} opts.sortBy      - 'new' | 'popular' | 'trending' | 'featured'
 * @param {string} [opts.forumId]   - if set, queries threads for that forum only
 * @param {number} [opts.pageSize]  - defaults to 10
 */
export function usePaginatedThreads({ sortBy, forumId = null, pageSize = 10 } = {}) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);

  // Store the last Firestore DocumentSnapshot for cursor-based pagination
  const lastDocRef = useRef(null);
  // Track the current "generation" so stale async results don't overwrite fresh state
  const genRef = useRef(0);

  const fetch = useCallback(
    async (opts = {}) => {
      const gen = ++genRef.current;
      const { append = false } = opts;

      if (!append) {
        setLoading(true);
        setThreads([]);
        setHasMore(false);
        setError(null);
        lastDocRef.current = null;
      } else {
        setLoadingMore(true);
      }

      try {
        const params = {
          sortBy,
          pageSize,
          lastDoc: append ? lastDocRef.current : null,
        };
        const result = forumId
          ? await fetchThreadsByForum({ forumId, ...params })
          : await fetchThreads(params);

        if (gen !== genRef.current) return; // stale — discard

        lastDocRef.current = result.lastDoc;
        setThreads((prev) => (append ? [...prev, ...result.threads] : result.threads));
        setHasMore(result.hasMore);
      } catch (err) {
        if (gen !== genRef.current) return;
        setError(err.message ?? 'Грешка при вчитување.');
      } finally {
        if (gen === genRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [sortBy, forumId, pageSize],
  );  

  // Reset + fetch on sortBy / forumId change
  useEffect(() => {
    fetch({ append: false });
  }, [fetch]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    fetch({ append: true });
  }, [fetch, loadingMore, hasMore]);

  return { threads, loading, loadingMore, hasMore, error, loadMore };
}
