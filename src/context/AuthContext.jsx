import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider, facebookProvider } from '../lib/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null); // Firebase Auth user
  const [userProfile, setUserProfile] = useState(undefined); // undefined=not fetched, null=new user, {...}=has profile
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUserProfile(undefined);
      setFirebaseUser(user);

      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          // Auto-lift expired temporary bans on profile load.
          // Reset warningCount to 1 so the user keeps one strike but can re-offend twice more.
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
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Најава со Google
  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged ќе се активира автоматски по успешна најава
    } catch (err) {
      console.error('Google sign-in грешка:', err);
      throw err;
    }
  };

  // Најава со Facebook
  const signInWithFacebook = async () => {
    try {
      await signInWithPopup(auth, facebookProvider);
    } catch (err) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        console.error('Facebook sign-in грешка:', err);
      }
      throw err;
    }
  };

  // Одјава
  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  // Помошна функција — освежи го профилот по onboarding
  const refreshUserProfile = async () => {
    if (!firebaseUser) return;
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      setUserProfile({ id: userSnap.id, ...userSnap.data() });
    }
  };

  const value = {
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook за лесен пристап
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth мора да се користи внатре во AuthProvider');
  }
  return context;
}
