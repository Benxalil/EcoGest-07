import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, CacheStaleTime } from '@/lib/queryClient';

export type UserRole = 'super_admin' | 'school_admin' | 'teacher' | 'student' | 'parent';

export interface UserProfile {
  id: string;
  schoolId: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
}

export interface UnifiedUserData {
  user: any | null;
  profile: UserProfile | null;
  teacherId?: string | null;
  loading: boolean;
  error: string | null;
  isAdmin: () => boolean;
  isTeacher: () => boolean;
  isStudent: () => boolean;
  isParent: () => boolean;
}

/**
 * Hook unifié pour gérer toutes les données utilisateur
 * Utilise React Query pour le cache et la gestion des données
 */
export function useUnifiedUserData(): UnifiedUserData & { refetch: () => Promise<void> } {
  const queryClient = useQueryClient();

  // Query pour l'utilisateur et son profil
  const { data, isLoading, error: queryError, refetch: refetchQuery } = useQuery({
    queryKey: QueryKeys.teacher('current'),
    queryFn: async () => {
      // Récupérer l'utilisateur authentifié
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error(userError?.message || 'Non authentifié');
      }

      // Récupérer le profil utilisateur
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, school_id, role, first_name, last_name, email, phone, avatar_url, is_active')
        .eq('id', user.id)
        .single();

      if (profileError || !profileData) {
        throw new Error(profileError?.message || 'Profil non trouvé');
      }

      const userProfile: UserProfile = {
        id: profileData.id,
        schoolId: profileData.school_id,
        role: profileData.role as UserRole,
        firstName: profileData.first_name,
        lastName: profileData.last_name,
        email: profileData.email,
        phone: profileData.phone || undefined,
        avatarUrl: profileData.avatar_url || undefined,
        isActive: profileData.is_active,
      };

      // Récupérer le teacherId si c'est un enseignant
      let teacherId: string | null = null;
      if (userProfile.role === 'teacher') {
        const { data: teacherData } = await supabase
          .from('teachers')
          .select('id')
          .eq('user_id', user.id)
          .eq('school_id', userProfile.schoolId)
          .maybeSingle();

        teacherId = teacherData?.id || null;
      }

      return {
        user,
        profile: userProfile,
        teacherId,
      };
    },
    staleTime: CacheStaleTime.TEACHERS,
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 1,
  });

  // Construire l'objet de retour
  const userData: UnifiedUserData = {
    user: data?.user || null,
    profile: data?.profile || null,
    teacherId: data?.teacherId || null,
    loading: isLoading,
    error: queryError ? (queryError as Error).message : null,
    isAdmin: () => data?.profile?.role === 'school_admin' || data?.profile?.role === 'super_admin',
    isTeacher: () => data?.profile?.role === 'teacher',
    isStudent: () => data?.profile?.role === 'student',
    isParent: () => data?.profile?.role === 'parent',
  };

  // Écouter les changements d'authentification
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await refetchQuery();
      } else if (event === 'SIGNED_OUT') {
        queryClient.clear();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refetchQuery, queryClient]);

  const refetch = useCallback(async () => {
    await refetchQuery();
  }, [refetchQuery]);

  return { ...userData, refetch };
}
