export function getBanMessage(userProfile) {
  if (!userProfile?.isBanned) return null;
  const banUntil = userProfile.banUntil;
  if (!banUntil) return 'Сте трајно банирани и не можете да објавувате.';
  const ms = (banUntil.toMillis ? banUntil.toMillis() : new Date(banUntil).getTime()) - Date.now();
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return null; // Ban expired but not yet auto-lifted
  return `Банирани сте и не можете да објавувате уште ${days} ${days === 1 ? 'ден' : 'дена'}.`;
}
