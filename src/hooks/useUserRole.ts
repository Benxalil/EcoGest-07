import { useMemo } from 'react';
import { useOptimizedUserData } from './useOptimizedUserData';
import type { User, Session } from '@supabase/supabase-js';

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
  // Utiliser useOptimizedUserData qui a un meilleur système de cache
  const { user, profile, loading } = useOptimizedUserData();

  // Convertir le profil au format attendu
  const userProfile = useMemo<UserProfile | null>(() => {
    if (!profile) return null;
    
    return {
      role: profile.role,
      firstName: profile.firstName,
      lastName: profile.lastName,
      id: profile.id,
      email: profile.email,
      schoolId: profile.schoolId,
    };
  }, [profile]);

  // Session simulée pour compatibilité
  const session = useMemo<Session | null>(() => {
    if (!user) return null;
    
    return {
      user,
      access_token: '',
      refresh_token: '',
      expires_in: 3600,
      expires_at: 0,
      token_type: 'bearer',
    } as Session;
  }, [user]);

  const isAdmin = () => userProfile?.role === "school_admin";
  const isTeacher = () => userProfile?.role === "teacher";
  const isStudent = () => userProfile?.role === "student";
  const isParent = () => userProfile?.role === "parent";
  
  // Fonctions de simulation désactivées car non compatibles avec le cache optimisé
  const simulateRole = (_role: UserRole) => {
    console.warn('simulateRole is disabled when using optimized user data');
  };
  
  const resetRoleSimulation = () => {
    console.warn('resetRoleSimulation is disabled when using optimized user data');
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