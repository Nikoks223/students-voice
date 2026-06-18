import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  subscribeToUnreadCount,
  fetchNotifications,
  markAsRead,
  markAllAsRead,
} from '../lib/firestore/notifications';

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
    const unsub = subscribeToUnreadCount(firebaseUser.uid, setUnreadCount);
    return unsub;
  }, [firebaseUser]);

  // Load full list when panel opens
  useEffect(() => {
    if (!open || !firebaseUser) return;
    setLoading(true);
    fetchNotifications(firebaseUser.uid)
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, firebaseUser]);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleMarkRead = async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await markAsRead(id).catch(() => {});
  };

  const handleMarkAllRead = async () => {
    if (!firebaseUser) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllAsRead(firebaseUser.uid).catch(() => {});
  };

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
