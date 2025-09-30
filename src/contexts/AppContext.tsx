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
      // Check cache first
      const cached = cache.get<UserProfile>(`profile-${userId}`);
      if (cached) {
        dispatch({ type: 'SET_USER_PROFILE', payload: cached });
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile) {
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
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchSchoolData = async (schoolId: string) => {
    try {
      // Check cache first
      const cached = cache.get<SchoolData>(`school-${schoolId}`);
      if (cached) {
        dispatch({ type: 'SET_SCHOOL_DATA', payload: cached });
        return;
      }

      const { data: school } = await supabase
        .from('schools')
        .select('*')
        .eq('id', schoolId)
        .single();

      if (school) {
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
      }
    } catch (error) {
      console.error('Error fetching school data:', error);
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
        // Check for existing session first
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        dispatch({ type: 'SET_AUTH', payload: { user: session?.user ?? null, session } });

        if (session?.user) {
          await fetchUserProfile(session.user.id);
        }

        dispatch({ type: 'SET_LOADING', payload: false });
        dispatch({ type: 'SET_INITIALIZED', payload: true });
      } catch (error) {
        console.error('Error initializing auth:', error);
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