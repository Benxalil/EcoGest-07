import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { unifiedCache, CacheTTL } from '@/utils/unifiedCache';
import type { User } from '@supabase/supabase-js';

export type UserRole = 'school_admin' | 'teacher' | 'student' | 'parent' | 'super_admin';

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

export interface OptimizedUserData {
  user: User | null;
  profile: UserProfile | null;
  teacherId?: string | null;
  loading: boolean;
  error: string | null;
}

// Global cache pour éviter les requêtes multiples
let globalUserData: OptimizedUserData | null = null;
let globalDataPromise: Promise<OptimizedUserData> | null = null;

export const useOptimizedUserData = () => {
  const [data, setData] = useState<OptimizedUserData>(
    globalUserData || {
      user: null,
      profile: null,
      teacherId: null,
      loading: true,
      error: null
    }
  );

  const fetchUserData = useCallback(async () => {
    // Si une requête est déjà en cours, l'attendre
    if (globalDataPromise) {
      const result = await globalDataPromise;
      setData(result);
      return result;
    }

    // Vérifier le cache d'abord (15 minutes pour les données utilisateur)
    const cacheKey = 'optimized-user-data';
    const cached = unifiedCache.get<OptimizedUserData>(cacheKey);
    if (cached && cached.profile) {
      globalUserData = cached;
      setData(cached);
      return cached;
    }

    // Créer la promesse globale
    globalDataPromise = (async () => {
      try {
        // 1. Récupérer l'utilisateur et son profil en une seule fois
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          const errorData: OptimizedUserData = {
            user: null,
            profile: null,
            teacherId: null,
            loading: false,
            error: userError?.message || 'No user found'
          };
          globalUserData = errorData;
          return errorData;
        }

        // 2. Récupérer le profil utilisateur
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError || !profileData) {
          const errorData: OptimizedUserData = {
            user,
            profile: null,
            teacherId: null,
            loading: false,
            error: profileError?.message || 'Profile not found'
          };
          globalUserData = errorData;
          return errorData;
        }

        const profile: UserProfile = {
          id: profileData.id,
          schoolId: profileData.school_id,
          role: profileData.role,
          firstName: profileData.first_name,
          lastName: profileData.last_name,
          email: profileData.email,
          phone: profileData.phone,
          avatarUrl: profileData.avatar_url,
          isActive: profileData.is_active
        };

        // 3. Si c'est un enseignant, récupérer son teacher_id
        let teacherId: string | null = null;
        if (profile.role === 'teacher') {
          const teacherCacheKey = `teacher-id-${user.id}`;
          const cachedTeacherId = unifiedCache.get<string>(teacherCacheKey);
          
          if (cachedTeacherId) {
            teacherId = cachedTeacherId;
          } else {
            const { data: teacherData } = await supabase
              .from('teachers')
              .select('id')
              .eq('user_id', user.id)
              .eq('school_id', profile.schoolId)
              .maybeSingle();
            
            teacherId = teacherData?.id || null;
            if (teacherId) {
              unifiedCache.set(teacherCacheKey, teacherId, CacheTTL.STATIC); // 10 minutes
            }
          }
        }

        const userData: OptimizedUserData = {
          user,
          profile,
          teacherId,
          loading: false,
          error: null
        };

        // Mettre en cache pour 15 minutes (données utilisateur statiques)
        unifiedCache.set(cacheKey, userData, CacheTTL.STATIC);
        globalUserData = userData;
        
        return userData;
      } catch (error) {
        const errorData: OptimizedUserData = {
          user: null,
          profile: null,
          teacherId: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        globalUserData = errorData;
        return errorData;
      } finally {
        globalDataPromise = null;
      }
    })();

    const result = await globalDataPromise;
    setData(result);
    return result;
  }, []);

  useEffect(() => {
    fetchUserData();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await fetchUserData();
      } else if (event === 'SIGNED_OUT') {
        globalUserData = null;
        globalDataPromise = null;
        unifiedCache.clear();
        setData({
          user: null,
          profile: null,
          teacherId: null,
          loading: false,
          error: null
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  const refetch = useCallback(() => {
    unifiedCache.delete('optimized-user-data');
    globalUserData = null;
    return fetchUserData();
  }, [fetchUserData]);

  return {
    ...data,
    refetch
  };
};
