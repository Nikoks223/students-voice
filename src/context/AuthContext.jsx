import { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  // undefined = auth not yet resolved, null = logged out, {...} = has profile
  const [userProfile, setUserProfile] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const authRef = useRef(null);
  const googleProviderRef = useRef(null);
  const facebookProviderRef = useRef(null);

  useEffect(() => {
    let unsubscribe;

    Promise.all([
      import('../lib/firebase'),
      import('firebase/auth'),
    ]).then(([{ default: app }, { getAuth, onAuthStateChanged, GoogleAuthProvider, FacebookAuthProvider }]) => {
      const auth = getAuth(app);
      authRef.current = auth;
      googleProviderRef.current = new GoogleAuthProvider();
      facebookProviderRef.current = new FacebookAuthProvider();

      unsubscribe = onAuthStateChanged(auth, async (user) => {
        setFirebaseUser(user);

        if (!user) {
          setUserProfile(null);
          setLoading(false);
          return;
        }

        // Unblock the UI immediately — profile arrives shortly after
        setLoading(false);

        // Lazy-load Firestore bundle only after auth resolves
        const [{ db }, { doc, getDoc, updateDoc }] = await Promise.all([
          import('../lib/db'),
          import('firebase/firestore'),
        ]);

        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          // Auto-lift expired temporary bans on profile load.
          if (data.isBanned && data.banUntil && data.banUntil.toMillis() < Date.now()) {
            await updateDoc(userRef, { isBanned: false, banUntil: null, warningCount: 1 });
            data.isBanned = false;
            data.banUntil = null;
            data.warningCount = 1;
          }
          setUserProfile({ id: userSnap.id, ...data });
        } else {
          setUserProfile(null);
        }
      });
    });

    return () => unsubscribe?.();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      const { signInWithPopup } = await import('firebase/auth');
      await signInWithPopup(authRef.current, googleProviderRef.current);
    } catch (err) {
      console.error('Google sign-in грешка:', err);
      throw err;
    }
  }, []);

  const signInWithFacebook = useCallback(async () => {
    try {
      const { signInWithPopup } = await import('firebase/auth');
      await signInWithPopup(authRef.current, facebookProviderRef.current);
    } catch (err) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        console.error('Facebook sign-in грешка:', err);
      }
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    const { signOut: firebaseSignOut } = await import('firebase/auth');
    await firebaseSignOut(authRef.current);
  }, []);

  const refreshUserProfile = useCallback(async () => {
    if (!firebaseUser) return;
    const [{ db }, { doc, getDoc }] = await Promise.all([
      import('../lib/db'),
      import('firebase/firestore'),
    ]);
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      setUserProfile({ id: userSnap.id, ...userSnap.data() });
    }
  }, [firebaseUser]);

  const value = useMemo(
    () => ({
      firebaseUser,
      userProfile,
      loading,
      isAuthenticated: !!firebaseUser,
      needsOnboarding: !!firebaseUser && (userProfile === null || userProfile?.isDeleted === true),
      isAdmin: userProfile?.role === 'admin' || userProfile?.role === 'superadmin',
      isSuperAdmin: userProfile?.role === 'superadmin',
      signInWithGoogle,
      signInWithFacebook,
      signOut,
      refreshUserProfile,
    }),
    [firebaseUser, userProfile, loading, signInWithGoogle, signInWithFacebook, signOut, refreshUserProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth мора да се користи внатре во AuthProvider');
  }
  return context;
}
