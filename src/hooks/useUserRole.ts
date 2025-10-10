import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = "school_admin" | "teacher" | "student" | "parent" | "super_admin";

interface UserProfile {
  role: UserRole;
  firstName: string;
  lastName: string;
  id: string;
  email?: string;
  schoolId?: string;
}

const CACHE_KEY = 'user_profile_cache';
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

interface CachedProfile {
  profile: UserProfile;
  timestamp: number;
}

// Charger le profil depuis le cache
const loadCachedProfile = (): UserProfile | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const { profile, timestamp }: CachedProfile = JSON.parse(cached);
    
    // Vérifier si le cache est encore valide
    if (Date.now() - timestamp < CACHE_DURATION) {
      return profile;
    }
    
    // Cache expiré, le supprimer
    localStorage.removeItem(CACHE_KEY);
    return null;
  } catch {
    return null;
  }
};

// Sauvegarder le profil dans le cache
const saveCachedProfile = (profile: UserProfile) => {
  try {
    const cached: CachedProfile = {
      profile,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch (error) {
    console.error('Error caching profile:', error);
  }
};

export const useUserRole = () => {
  // Charger immédiatement depuis le cache si disponible
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => loadCachedProfile());
  const [loading, setLoading] = useState(true); // Toujours commencer en loading pour vérifier la session

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile) {
        const userProfileData: UserProfile = {
          role: profile.role,
          firstName: profile.first_name,
          lastName: profile.last_name,
          id: profile.id,
          email: profile.email,
          schoolId: profile.school_id,
        };
        
        // Mettre à jour le state et le cache
        setUserProfile(userProfileData);
        saveCachedProfile(userProfileData);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Check for existing session immediately
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Si on a déjà le profil en cache, on le garde pendant le fetch
          const cachedProfile = loadCachedProfile();
          if (cachedProfile && cachedProfile.id === session.user.id) {
            setUserProfile(cachedProfile);
          }
          await fetchUserProfile(session.user.id);
        } else {
          setUserProfile(null);
          localStorage.removeItem(CACHE_KEY);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing session:', error);
        setLoading(false);
      }
    };

    initSession();

    // Then set up the listener - NO double fetch
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);

        // Only refetch on SIGNED_IN event to avoid duplicate calls
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(() => fetchUserProfile(session.user.id), 0);
        } else if (event === 'SIGNED_OUT' || !session) {
          setUserProfile(null);
          localStorage.removeItem(CACHE_KEY); // Nettoyer le cache
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isAdmin = () => userProfile?.role === "school_admin";
  const isTeacher = () => userProfile?.role === "teacher";
  const isStudent = () => userProfile?.role === "student";
  const isParent = () => userProfile?.role === "parent";
  
  const simulateRole = (role: UserRole) => {
    // Development only - simulate role for testing
    if (userProfile) {
      setUserProfile({ ...userProfile, role });
    }
  };
  
  const resetRoleSimulation = () => {
    // Reset to original role from database
    if (user) {
      setTimeout(async () => {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profile) {
            setUserProfile({
              role: profile.role,
              firstName: profile.first_name,
              lastName: profile.last_name,
              id: profile.id,
              email: profile.email,
              schoolId: profile.school_id,
            });
          }
        } catch (error) {
          console.error('Error resetting role:', error);
        }
      }, 0);
    }
  };
  
  const isSimulating = () => false; // Could be enhanced to track simulation state

  return {
    user,
    session,
    userProfile,
    loading,
    isAdmin,
    isTeacher,
    isStudent,
    isParent,
    simulateRole,
    resetRoleSimulation,
    isSimulating,
  };
};