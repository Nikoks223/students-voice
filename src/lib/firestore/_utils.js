/**
 * Recursively converts undefined fields to null, or strips them entirely.
 * Firestore rejects writes containing undefined; this is a permanent safety net.
 */
export function sanitizeForFirestore(data, path = '', { stripUndefined = false } = {}) {
  if (data === undefined) {
    return stripUndefined ? undefined : null;
  }
  if (data === null) return null;
  if (Array.isArray(data)) {
    return data.map((v, i) => sanitizeForFirestore(v, `${path}[${i}]`, { stripUndefined }));
  }
  if (typeof data === 'object' && data.constructor === Object) {
    const cleaned = {};
    for (const [k, v] of Object.entries(data)) {
      const sub = sanitizeForFirestore(v, path ? `${path}.${k}` : k, { stripUndefined });
      if (stripUndefined && sub === undefined) continue;
      cleaned[k] = sub;
    }
    return cleaned;
  }
  // Firestore Timestamp, Date, FieldValue (increment/serverTimestamp), primitives — pass through.
  return data;
}
