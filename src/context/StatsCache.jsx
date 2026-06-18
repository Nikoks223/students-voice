import { createContext, useContext, useRef, useState, useCallback } from 'react';
import {
  fetchGlobalStats,
  fetchDailyStats,
  fetchSchoolStats,
  fetchForumStats,
  fetchTopContributors,
} from '../lib/firestore/stats';

const Ctx = createContext(null);
const TTL = 5 * 60 * 1000;

const FETCHERS = {
  global: fetchGlobalStats,
  daily: fetchDailyStats,
  schools: fetchSchoolStats,
  forums: fetchForumStats,
  contributors: fetchTopContributors,
};

const KEYS = Object.keys(FETCHERS);

function initSlots() {
  return Object.fromEntries(KEYS.map((k) => [k, { data: null, loading: false, error: null }]));
}

export function StatsCacheProvider({ children }) {
  const [slots, setSlots] = useState(initSlots);
  const fetchedAt = useRef({});

  // Stable load function — uses functional setSlots so no slot data in deps
  const load = useCallback(async (key, force = false) => {
    const age = fetchedAt.current[key] ? Date.now() - fetchedAt.current[key] : Infinity;

    // Read current cached data to decide whether to skip
    // We intentionally check via a ref pattern to avoid stale-closure issues:
    // the setSlots functional form below always sees fresh state.
    if (!force && age < TTL) {
      // Check if data exists — peek via a temp read; setSlots callback handles the guard
      let hasData = false;
      setSlots((prev) => {
        hasData = prev[key].data !== null;
        return prev;
      });
      if (hasData) return;
    }

    setSlots((prev) => ({ ...prev, [key]: { ...prev[key], loading: true, error: null } }));
    try {
      const data = await FETCHERS[key]();
      fetchedAt.current[key] = Date.now();
      setSlots((prev) => ({ ...prev, [key]: { data, loading: false, error: null } }));
    } catch (err) {
      setSlots((prev) => ({
        ...prev,
        [key]: { ...prev[key], loading: false, error: err.message ?? String(err) },
      }));
    }
  }, []);

  const refresh = useCallback((key) => load(key, true), [load]);

  const refreshAll = useCallback(() => {
    KEYS.forEach((k) => load(k, true));
  }, [load]);

  // Returns how many minutes ago the slot was fetched, or null if never
  const ageMinutes = useCallback((key) => {
    const t = fetchedAt.current[key];
    return t ? Math.floor((Date.now() - t) / 60000) : null;
  }, []);

  return (
    <Ctx.Provider value={{ slots, load, refresh, refreshAll, ageMinutes }}>{children}</Ctx.Provider>
  );
}

export function useStatsCache() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStatsCache must be used inside StatsCacheProvider');
  return ctx;
}
