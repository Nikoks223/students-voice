import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// adminOnly = true → само админ има пристап
// requireProfile = true → корисникот мора да има завршено onboarding
export default function ProtectedRoute({ children, adminOnly = false, requireProfile = true }) {
  const { isAuthenticated, needsOnboarding, isAdmin, loading, userProfile } = useAuth();

  // For routes that need a profile, also wait until the profile fetch resolves
  const profilePending = (requireProfile || adminOnly) && isAuthenticated && userProfile === undefined;

  if (loading || profilePending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted text-sm">Се вчитува...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireProfile && needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
