import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function useRequireAuth() {
  const navigate = useNavigate();
  const { isAuthenticated, needsOnboarding } = useAuth();

  return (callback) => {
    if (isAuthenticated && !needsOnboarding) {
      callback();
    } else {
      navigate('/login');
    }
  };
}
