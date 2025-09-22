import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';

// Composant pour gérer la redirection des élèves et parents vers leurs pages spécifiques
export const StudentRouteHandler = ({ children }: { children: React.ReactNode }) => {
  const { isStudent, isParent } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isStudent()) {
      // Rediriger les élèves vers leurs pages spécifiques
      switch (location.pathname) {
        case '/eleves':
          navigate('/eleves/mon-profil');
          break;
        case '/paiements':
          navigate('/paiements/mes-paiements');
          break;
        case '/resultats':
          navigate('/resultats/mes-resultats');
          break;
        default:
          // Laisser passer les autres routes autorisées
          break;
      }
    } else if (isParent()) {
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
  }, [isStudent, isParent, location.pathname, navigate]);

  return <>{children}</>;
};