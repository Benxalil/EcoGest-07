import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';

// Composant pour gérer la redirection des parents vers leurs pages spécifiques
export const ParentRouteHandler = ({ children }: { children: React.ReactNode }) => {
  const { isParent } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isParent()) {
      // Rediriger les parents vers leurs pages spécifiques
      switch (location.pathname) {
        case '/eleves':
          navigate('/eleves/profil-enfant');
          break;
        case '/paiements':
          navigate('/paiements/paiements-enfant');
          break;
        case '/resultats':
          navigate('/resultats/resultats-enfant');
          break;
        default:
          // Laisser passer les autres routes autorisées
          break;
      }
    }
  }, [isParent, location.pathname, navigate]);

  return <>{children}</>;
};