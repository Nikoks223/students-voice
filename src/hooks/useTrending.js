import { useState, useEffect, useCallback } from 'react';
import { fetchTrendingThreads } from '../lib/trendingScore';

const CACHE_TTL = 5 * 60 * 1000;
let _cache = { threads: null, fetchedAt: 0 };

export function useTrending() {
  const [threads, setThreads] = useState(_cache.threads ?? []);
  const [loading, setLoading] = useState(!_cache.threads);

  const load = useCallback(async (bypass = false) => {
    const now = Date.now();
    if (!bypass && _cache.threads && now - _cache.fetchedAt < CACHE_TTL) {
      setThreads(_cache.threads);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await fetchTrendingThreads();
      _cache = { threads: result, fetchedAt: Date.now() };
      setThreads(result);
    } catch {
      // non-fatal — keep previous data if any
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { threads, loading, refresh };
}
