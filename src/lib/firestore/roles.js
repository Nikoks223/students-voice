import { collection, doc, getDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../db';

async function getUserData(userId) {
  const ref = doc(db, 'users', userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Корисникот не постои.');
  return { role: snap.data().role ?? 'user', ref };
}

async function logRoleChange(adminId, action, targetUserId) {
  await addDoc(collection(db, 'moderationLog'), {
    adminId,
    action,
    targetUserId,
    createdAt: serverTimestamp(),
  });
}

export async function promoteToAdmin(targetUserId, currentUserId) {
  const { role: callerRole } = await getUserData(currentUserId);
  if (callerRole !== 'superadmin') {
    throw new Error('Само SuperAdmin може да промовира админи.');
  }

  const { role: targetRole, ref } = await getUserData(targetUserId);
  if (targetRole === 'admin' || targetRole === 'superadmin') {
    throw new Error('Корисникот веќе е админ.');
  }

  await updateDoc(ref, { role: 'admin', updatedAt: serverTimestamp() });
  await logRoleChange(currentUserId, 'promoted_to_admin', targetUserId);
}

export async function demoteAdmin(targetUserId, currentUserId) {
  const { role: callerRole } = await getUserData(currentUserId);
  if (callerRole !== 'superadmin') {
    throw new Error('Само SuperAdmin може да симнува админи.');
  }

  const { role: targetRole, ref } = await getUserData(targetUserId);
  if (targetRole === 'superadmin') {
    throw new Error('SuperAdmin не може да биде сменет преку UI.');
  }
  if (targetRole !== 'admin') {
    throw new Error('Корисникот не е админ.');
  }

  await updateDoc(ref, { role: 'user', updatedAt: serverTimestamp() });
  await logRoleChange(currentUserId, 'demoted_admin', targetUserId);
}
