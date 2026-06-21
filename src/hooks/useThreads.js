import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../lib/db';

export function useThreads({ forumId, limitCount = 20 } = {}) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let q = query(collection(db, 'threads'), orderBy('createdAt', 'desc'), limit(limitCount));

    if (forumId) {
      q = query(
        collection(db, 'threads'),
        where('forumId', '==', forumId),
        orderBy('createdAt', 'desc'),
        limit(limitCount),
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setThreads(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [forumId, limitCount]);

  return { threads, loading, error };
}
