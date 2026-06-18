import { useState, useMemo } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { doc, setDoc, serverTimestamp, runTransaction, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { getSchoolsByCity, getSchoolById } from '../data/schools';
import { checkAndIncrement } from '../lib/firestore/rateLimit';
import { OFFENSIVE_WORDS } from '../lib/offensiveWords';
import Button from '../components/ui/Button';

function isOffensiveUsername(username) {
  const lower = username.toLowerCase();
  if (OFFENSIVE_WORDS.has(lower)) return true;
  for (const word of OFFENSIVE_WORDS) {
    if (word.length >= 3 && lower.includes(word)) return true;
  }
  return false;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { firebaseUser, needsOnboarding, refreshUserProfile } = useAuth();

  const [username, setUsername] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [year, setYear] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const schoolsByCity = useMemo(() => getSchoolsByCity(), []);

  const validateUsername = (value) => {
    if (value.length < 3) return 'Псевдонимот мора да има најмалку 3 карактери.';
    if (value.length > 20) return 'Псевдонимот не смее да биде подолг од 20 карактери.';
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Дозволени се само латиници, бројки и _';
    if (isOffensiveUsername(value)) return 'Овој псевдоним не е дозволен. Избери друг.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const usernameError = validateUsername(username);
    if (usernameError) {
      setError(usernameError);
      return;
    }
    if (!schoolId) {
      setError('Избери го твоето училиште.');
      return;
    }
    if (!acceptTerms) {
      setError('Мора да ги прифатиш Условите за користење.');
      return;
    }

    setLoading(true);

    try {
      // Rate-limit onboarding completions (max 3 per day per UID).
      // Firebase Auth has built-in server-side rate limiting on login/signup attempts.
      await checkAndIncrement(firebaseUser.uid, 'onboarding', 3, 86400);

      const usernameLower = username.toLowerCase();
      const school = getSchoolById(schoolId);
      const today = new Date().toISOString().split('T')[0];

      await runTransaction(db, async (transaction) => {
        const usernameRef = doc(db, 'usernames', usernameLower);
        const userRef = doc(db, 'users', firebaseUser.uid);

        // ── All reads before all writes (Firestore transaction requirement) ──
        const usernameSnap = await transaction.get(usernameRef);

        // If a lock exists, peek at its owner so we can decide if it's stale.
        let staleLockOwnerSnap = null;
        if (usernameSnap.exists()) {
          const staleUserId = usernameSnap.data().userId;
          if (staleUserId) {
            staleLockOwnerSnap = await transaction.get(doc(db, 'users', staleUserId));
          }
        }

        // ── Writes ────────────────────────────────────────────────────────────
        if (usernameSnap.exists()) {
          const staleUserId = usernameSnap.data().userId;
          // Stale = lock has no owner, owner doc doesn't exist, or owner is deleted.
          const isStale =
            !staleUserId ||
            !staleLockOwnerSnap?.exists() ||
            staleLockOwnerSnap.data().isDeleted === true;

          if (!isStale) {
            throw new Error('Овој псевдоним веќе се користи. Избери друг.');
          }

          // Atomically free the orphaned lock so the set() below can claim it.
          // Requires the extended delete rule on usernames/ — see security rules
          // note in the codebase comments.
          transaction.delete(usernameRef);
        }

        transaction.set(usernameRef, {
          userId: firebaseUser.uid,
          createdAt: serverTimestamp(),
        });

        transaction.set(userRef, {
          username,
          usernameLower,
          school: schoolId,
          year: parseInt(year),
          avatarUrl: firebaseUser.photoURL || null,
          email: firebaseUser.email,
          role: 'user',
          isBanned: false,
          banUntil: null,
          warningCount: 0,
          createdAt: serverTimestamp(),
        });
      });

      // Stats increments run after the user doc is committed so the security
      // rule's isNotBanned() check can find users/{uid} in the database.
      await setDoc(
        doc(db, 'stats', 'global'),
        { totalUsers: increment(1), updatedAt: serverTimestamp() },
        { merge: true },
      );
      await setDoc(
        doc(db, 'stats', 'daily', 'entries', today),
        { date: today, newUsers: increment(1), updatedAt: serverTimestamp() },
        { merge: true },
      );
      await setDoc(
        doc(db, 'stats', 'schools', 'entries', schoolId),
        {
          schoolId,
          schoolName: school?.name ?? schoolId,
          city: school?.city ?? '',
          userCount: increment(1),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      await refreshUserProfile();
      navigate('/');
    } catch (err) {
      if (err?.code) {
        // Firestore/Firebase technical error — log real details, show friendly message.
        console.error('[Onboarding] Transaction error:', err.code, err.message);
        setError('Грешка при регистрација. Обиди се повторно.');
      } else {
        // Our own validation error (e.g. username taken) — message is already user-friendly.
        setError(err.message || 'Грешка. Обиди се повторно.');
      }
      setLoading(false);
    }
  };

  if (!firebaseUser) return <Navigate to="/login" replace />;
  if (!needsOnboarding) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Ambient glows */}
      <div
        className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(124,92,255,0.14), transparent 70%)' }}
      />
      <div
        className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.10), transparent 70%)' }}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md bg-surface border border-border rounded-3xl shadow-pop p-8">
        <h1 className="font-display text-2xl font-bold text-ink mb-1">Добредојде! 👋</h1>
        <p className="text-ink-dim text-sm mb-6">Само неколку детали пред да започнеш.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username */}
          <div>
            <label htmlFor="onboarding-username" className="block text-sm font-medium text-ink mb-1.5">
              Псевдоним <span className="text-coral">*</span>
            </label>
            <input
              id="onboarding-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="нпр. nikola_2024"
              className="input"
              maxLength={20}
            />
            <p className="text-xs text-muted mt-1.5">3–20 карактери. Само латиница, бројки и _</p>
          </div>

          {/* School */}
          <div>
            <label htmlFor="onboarding-school" className="block text-sm font-medium text-ink mb-1.5">
              Училиште <span className="text-coral">*</span>
            </label>
            <select
              id="onboarding-school"
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              className="input"
            >
              <option value="">— Избери училиште —</option>
              {Object.entries(schoolsByCity).map(([city, schools]) => (
                <optgroup key={city} label={city}>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Year */}
          <div>
            <p className="block text-sm font-medium text-ink mb-1.5">
              Година
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setYear(year === String(y) ? '' : String(y))}
                  className={`py-2.5 rounded-xl border font-medium text-sm transition-all duration-200 ${
                    year === String(y)
                      ? 'bg-iris border-iris text-white shadow-iris-glow'
                      : 'bg-surface-3 border-border text-ink-dim hover:border-iris/40 hover:text-ink'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted mt-1.5">Избери ја годината во која си сега</p>
          </div>

          {/* Terms */}
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-0.5 accent-iris"
            />
            <span className="text-sm text-ink-dim leading-snug">
              Ги прифаќам{' '}
              <Link
                to="/terms"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--color-accent)',
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px',
                }}
              >
                Условите за користење
              </Link>{' '}
              и{' '}
              <Link
                to="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--color-accent)',
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px',
                }}
              >
                Политиката за приватност
              </Link>
              .
            </span>
          </label>

          {error && (
            <div className="bg-coral-soft border border-coral/20 px-4 py-2.5 rounded-xl text-sm font-medium text-coral">
              {error}
            </div>
          )}

          <Button type="submit" variant="primary" loading={loading} disabled={loading} fullWidth>
            Заврши регистрација
          </Button>
        </form>
      </div>
    </div>
  );
}
