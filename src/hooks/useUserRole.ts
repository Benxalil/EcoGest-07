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

export const useUserRole = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string) => {
    try {
      setLoading(false); // Critical: Set loading to false immediately to prevent infinite loading
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      if (profile) {
        const userProfileData: UserProfile = {
          role: profile.role,
          firstName: profile.first_name,
          lastName: profile.last_name,
          id: profile.id,
          email: profile.email,
          schoolId: profile.school_id,
        };
        
        setUserProfile(userProfileData);
        return userProfileData;
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
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