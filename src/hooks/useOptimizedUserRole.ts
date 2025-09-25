import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useCache } from './useCache';

type UserRole = "school_admin" | "teacher" | "student" | "parent" | "super_admin";

interface UserProfile {
  role: UserRole;
  firstName: string;
  lastName: string;
  id: string;
  email?: string;
  schoolId?: string;
}

export const useOptimizedUserRole = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const cache = useCache();

  const fetchUserProfile = async (userId: string) => {
    // Vérifier le cache d'abord
    const cacheKey = `user_profile_${userId}`;
    const cachedProfile = cache.get<UserProfile>(cacheKey);
    
    if (cachedProfile) {
      console.log('Profil utilisateur récupéré depuis le cache');
      setUserProfile(cachedProfile);
      setLoading(false);
      return cachedProfile;
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (profile) {
        const userProfileData: UserProfile = {
          role: profile.role,
          firstName: profile.first_name,
          lastName: profile.last_name,
          id: profile.id,
          email: profile.email,
          schoolId: profile.school_id,
        };
        
        // Mettre en cache pour 10 minutes
        cache.set(cacheKey, userProfileData, 10 * 60 * 1000);
        setUserProfile(userProfileData);
        console.log('Profil utilisateur récupéré depuis la DB et mis en cache');
        return userProfileData;
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
    
    return null;
  };

  useEffect(() => {
    let isMounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setUserProfile(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session immediately
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

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
    if (userProfile) {
      setUserProfile({ ...userProfile, role });
    }
  };
  
  const resetRoleSimulation = async () => {
    if (user) {
      // Effacer le cache et recharger
      cache.delete(`user_profile_${user.id}`);
      await fetchUserProfile(user.id);
    }
  };
  
  const isSimulating = () => false;

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