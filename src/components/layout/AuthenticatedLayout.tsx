import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

const AuthenticatedLayout: React.FC<AuthenticatedLayoutProps> = ({ children }) => {
  const { user, loading } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [checkingSchool, setCheckingSchool] = useState(true);

  // Don't check authentication for public routes
  const publicRoutes = ['/auth', '/inscription', '/complete-registration', '/auth/pending-confirmation'];
  const isPublicRoute = publicRoutes.includes(location.pathname);

  useEffect(() => {
    const checkSchoolRegistration = async () => {
      // Skip check for public routes or if user is not loaded
      if (isPublicRoute || !user || loading) {
        setCheckingSchool(false);
        return;
      }

      try {
        // Check if user has a school_id in their profile
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('school_id, role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Erreur lors de la vérification du profil:', error);
          setCheckingSchool(false);
          return;
        }

        // LOGIQUE AMÉLIORÉE : Vérifier si l'utilisateur est school_admin sans école
        if (profile?.role === 'school_admin' && !profile?.school_id) {
          const pendingRegistration = localStorage.getItem('pending_school_registration');
          
          if (pendingRegistration) {
            console.log('🔄 Redirection vers /complete-registration - École non finalisée');
            navigate('/complete-registration');
            return;
          } else {
            // Pas de données en attente, demander de recommencer
            console.warn('⚠️ Aucune donnée d\'inscription en attente trouvée');
            alert('Aucune inscription en attente détectée. Veuillez recommencer le processus d\'inscription.');
            navigate('/inscription');
            return;
          }
        }

        setCheckingSchool(false);
      } catch (error) {
        console.error('Erreur lors de la vérification:', error);
        setCheckingSchool(false);
      }
    };

    checkSchoolRegistration();
  }, [user, loading, isPublicRoute, navigate, location.pathname]);

  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Show loader while checking authentication or school registration
  if (loading || checkingSchool) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth page if not authenticated
  if (!user) {
    navigate("/auth");
    return null;
  }

  return <>{children}</>;
};

export default AuthenticatedLayout;