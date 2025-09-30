import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedCache } from '@/hooks/useOptimizedCache';

interface UserProfile {
  role: "school_admin" | "teacher" | "student" | "parent" | "super_admin";
  firstName: string;
  lastName: string;
  id: string;
  email?: string;
  schoolId?: string;
}

interface SchoolData {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  academic_year?: string;
  slogan?: string;
  logo_url?: string;
  school_suffix?: string;
  type?: 'public' | 'private' | 'primary' | 'secondary';
  semester_type?: 'semester' | 'trimester';
  language?: 'arabic' | 'french';
}

interface AppState {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  schoolData: SchoolData | null;
  loading: boolean;
  initialized: boolean;
}

type AppAction = 
  | { type: 'SET_AUTH'; payload: { user: User | null; session: Session | null } }
  | { type: 'SET_USER_PROFILE'; payload: UserProfile | null }
  | { type: 'SET_SCHOOL_DATA'; payload: SchoolData | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_INITIALIZED'; payload: boolean };

const initialState: AppState = {
  user: null,
  session: null,
  userProfile: null,
  schoolData: null,
  loading: true,
  initialized: false,
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_AUTH':
      return { ...state, user: action.payload.user, session: action.payload.session };
    case 'SET_USER_PROFILE':
      return { ...state, userProfile: action.payload };
    case 'SET_SCHOOL_DATA':
      return { ...state, schoolData: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_INITIALIZED':
      return { ...state, initialized: action.payload };
    default:
      return state;
  }
};

interface AppContextType extends AppState {
  refreshUserProfile: () => Promise<void>;
  refreshSchoolData: () => Promise<void>;
  isAdmin: () => boolean;
  isTeacher: () => boolean;
  isStudent: () => boolean;
  isParent: () => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const cache = useOptimizedCache();

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('AppContext: Récupération du profil pour userId:', userId);
      
      // Check cache first
      const cached = cache.get<UserProfile>(`profile-${userId}`);
      if (cached) {
        console.log('AppContext: Profil trouvé dans le cache');
        dispatch({ type: 'SET_USER_PROFILE', payload: cached });
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('AppContext: Erreur lors de la récupération du profil:', error);
        throw error;
      }

      if (!profile) {
        console.warn('AppContext: Aucun profil trouvé pour cet utilisateur');
        dispatch({ type: 'SET_USER_PROFILE', payload: null });
        return;
      }

      console.log('AppContext: Profil récupéré avec succès:', profile.id);
      const userProfile: UserProfile = {
        role: profile.role,
        firstName: profile.first_name,
        lastName: profile.last_name,
        id: profile.id,
        email: profile.email,
        schoolId: profile.school_id,
      };
      
      // Cache for 5 minutes
      cache.set(`profile-${userId}`, userProfile, 5 * 60 * 1000);
      dispatch({ type: 'SET_USER_PROFILE', payload: userProfile });
    } catch (error) {
      console.error('AppContext: Erreur critique lors de la récupération du profil:', error);
      dispatch({ type: 'SET_USER_PROFILE', payload: null });
    }
  };

  const fetchSchoolData = async (schoolId: string) => {
    try {
      console.log('AppContext: Récupération des données de l\'école pour schoolId:', schoolId);
      
      // Check cache first
      const cached = cache.get<SchoolData>(`school-${schoolId}`);
      if (cached) {
        console.log('AppContext: Données d\'école trouvées dans le cache');
        dispatch({ type: 'SET_SCHOOL_DATA', payload: cached });
        return;
      }

      const { data: school, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', schoolId)
        .maybeSingle();

      if (error) {
        console.error('AppContext: Erreur lors de la récupération des données d\'école:', error);
        throw error;
      }

      if (!school) {
        console.warn('AppContext: Aucune école trouvée pour ce schoolId');
        dispatch({ type: 'SET_SCHOOL_DATA', payload: null });
        return;
      }

      console.log('AppContext: Données d\'école récupérées avec succès:', school.id);
      // Map database schema to our interface
      const mappedSchoolData: SchoolData = {
        id: school.id,
        name: school.name,
        address: school.address || undefined,
        phone: school.phone || undefined,  
        email: school.email || undefined,
        academic_year: school.academic_year || undefined,
        slogan: school.slogan || undefined,
        logo_url: school.logo_url || undefined,
        school_suffix: school.school_suffix || undefined,
        type: school.school_type as any || undefined,
        semester_type: school.semester_type || undefined,
        language: school.language || undefined,
      };
      
      // Cache for 10 minutes
      cache.set(`school-${schoolId}`, mappedSchoolData, 10 * 60 * 1000);
      dispatch({ type: 'SET_SCHOOL_DATA', payload: mappedSchoolData });
    } catch (error) {
      console.error('AppContext: Erreur critique lors de la récupération des données d\'école:', error);
      dispatch({ type: 'SET_SCHOOL_DATA', payload: null });
    }
  };

  const refreshUserProfile = async () => {
    if (state.user) {
      cache.delete(`profile-${state.user.id}`);
      await fetchUserProfile(state.user.id);
    }
  };

  const refreshSchoolData = async () => {
    if (state.userProfile?.schoolId) {
      cache.delete(`school-${state.userProfile.schoolId}`);
      await fetchSchoolData(state.userProfile.schoolId);
    }
  };

  const isAdmin = () => state.userProfile?.role === "school_admin";
  const isTeacher = () => state.userProfile?.role === "teacher";
  const isStudent = () => state.userProfile?.role === "student";
  const isParent = () => state.userProfile?.role === "parent";

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('AppContext: Initialisation de l\'authentification...');
        
        // Check for existing session first
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('AppContext: Erreur lors de la récupération de la session:', sessionError);
          throw sessionError;
        }
        
        if (!mounted) return;

        console.log('AppContext: Session récupérée:', session ? 'Session active' : 'Pas de session');
        dispatch({ type: 'SET_AUTH', payload: { user: session?.user ?? null, session } });

        if (session?.user) {
          console.log('AppContext: Utilisateur connecté, récupération du profil...');
          await fetchUserProfile(session.user.id);
        } else {
          console.log('AppContext: Aucun utilisateur connecté');
        }

        dispatch({ type: 'SET_LOADING', payload: false });
        dispatch({ type: 'SET_INITIALIZED', payload: true });
        console.log('AppContext: Initialisation terminée');
      } catch (error) {
        console.error('AppContext: Erreur critique lors de l\'initialisation:', error);
        dispatch({ type: 'SET_LOADING', payload: false });
        dispatch({ type: 'SET_INITIALIZED', payload: true });
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        dispatch({ type: 'SET_AUTH', payload: { user: session?.user ?? null, session } });

        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          dispatch({ type: 'SET_USER_PROFILE', payload: null });
          dispatch({ type: 'SET_SCHOOL_DATA', payload: null });
        }

        if (state.initialized) {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      }
    );

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Fetch school data when user profile changes
  useEffect(() => {
    if (state.userProfile?.schoolId && !state.schoolData) {
      fetchSchoolData(state.userProfile.schoolId);
    }
  }, [state.userProfile?.schoolId]);

  return (
    <AppContext.Provider 
      value={{
        ...state,
        refreshUserProfile,
        refreshSchoolData,
        isAdmin,
        isTeacher,
        isStudent,
        isParent,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};