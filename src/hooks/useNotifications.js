import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export function useNotifications() {
  const { firebaseUser } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Real-time unread badge
  useEffect(() => {
    if (!firebaseUser) {
      setUnreadCount(0);
      return;
    }
    let unsub;
    import('../lib/firestore/notifications').then(({ subscribeToUnreadCount }) => {
      unsub = subscribeToUnreadCount(firebaseUser.uid, setUnreadCount);
    });
    return () => unsub?.();
  }, [firebaseUser]);

  // Load full list when panel opens
  useEffect(() => {
    if (!open || !firebaseUser) return;
    setLoading(true);
    import('../lib/firestore/notifications')
      .then(({ fetchNotifications }) => fetchNotifications(firebaseUser.uid))
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, firebaseUser]);

  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);

  const handleMarkRead = async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    const { markAsRead } = await import('../lib/firestore/notifications');
    await markAsRead(id).catch(() => {});
  };

  const handleMarkAllRead = useCallback(async () => {
    if (!firebaseUser) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    const { markAllAsRead } = await import('../lib/firestore/notifications');
    await markAllAsRead(firebaseUser.uid).catch(() => {});
  }, [firebaseUser]);

  return {
    unreadCount,
    notifications,
    loading,
    open,
    handleOpen,
    handleClose,
    handleMarkRead,
    handleMarkAllRead,
  };
}
