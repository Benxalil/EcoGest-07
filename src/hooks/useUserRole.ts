import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { httpCache } from '@/utils/httpCache';

type UserRole = "school_admin" | "teacher" | "student" | "parent" | "super_admin";

interface UserProfile {
  role: UserRole;
  firstName: string;
  lastName: string;
  id: string;
  email?: string;
  schoolId?: string;
}

export const useUserRole = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string) => {
    const cacheKey = `profile:${userId}`;
    
    try {
      // Use HTTP cache with stale-while-revalidate strategy
      const profile = await httpCache.get(
        cacheKey,
        async () => {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          return data;
        },
        { ttl: 5 * 60 * 1000, strategy: 'stale-while-revalidate' }
      );

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
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Check for existing session immediately
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!isMounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
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
        } else if (!session) {
          setUserProfile(null);
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