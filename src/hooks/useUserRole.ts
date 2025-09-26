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

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch user profile after authentication state changes
          setTimeout(async () => {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
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
              console.error('Error fetching user profile:', error);
            } finally {
              setLoading(false);
            }
          }, 0); } else {
          setUserProfile(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Fetch profile for existing session
        setTimeout(async () => {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
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
            console.error('Error fetching user profile:', error);
          } finally {
            setLoading(false);
          }
        }, 0); } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
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