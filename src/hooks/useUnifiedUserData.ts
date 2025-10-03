import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { multiLevelCache, CacheTTL, CacheKeys } from '@/utils/multiLevelCache';

export type UserRole = 'school_admin' | 'teacher' | 'student' | 'parent';

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

// Cache global pour éviter les requêtes multiples
let globalCache: UnifiedUserData | null = null;
let pendingFetch: Promise<void> | null = null;

/**
 * Hook unifié pour gérer toutes les données utilisateur
 * Remplace useUserRole et useOptimizedUserData
 * Utilise le cache multi-niveaux pour des performances optimales
 */
export function useUnifiedUserData(): UnifiedUserData & { refetch: () => Promise<void> } {
  const [data, setData] = useState<UnifiedUserData>(() => {
    // Essayer de charger depuis le cache au premier rendu
    const user = supabase.auth.getUser();
    
    if (user) {
      const cachedProfile = multiLevelCache.get<UserProfile>(
        CacheKeys.userProfile('current'),
        'local-first' // Chercher d'abord dans localStorage
      );

      if (cachedProfile) {
        const cachedTeacherId = multiLevelCache.get<string>(
          CacheKeys.teacherId(cachedProfile.id),
          'local-first'
        );

        globalCache = {
          user: null, // Sera chargé de manière asynchrone
          profile: cachedProfile,
          teacherId: cachedTeacherId,
          loading: false,
          error: null,
          isAdmin: () => cachedProfile.role === 'school_admin',
          isTeacher: () => cachedProfile.role === 'teacher',
          isStudent: () => cachedProfile.role === 'student',
          isParent: () => cachedProfile.role === 'parent',
        };

        return globalCache;
      }
    }

    // État de chargement initial
    return {
      user: null,
      profile: null,
      teacherId: null,
      loading: true,
      error: null,
      isAdmin: () => false,
      isTeacher: () => false,
      isStudent: () => false,
      isParent: () => false,
    };
  });

  const fetchUserData = useCallback(async (force: boolean = false) => {
    // Éviter les requêtes multiples simultanées
    if (pendingFetch && !force) {
      await pendingFetch;
      return;
    }

    pendingFetch = (async () => {
      try {
        // Récupérer l'utilisateur authentifié
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          setData({
            user: null,
            profile: null,
            teacherId: null,
            loading: false,
            error: userError?.message || 'Non authentifié',
            isAdmin: () => false,
            isTeacher: () => false,
            isStudent: () => false,
            isParent: () => false,
          });
          globalCache = null;
          return;
        }

        // Vérifier le cache local d'abord
        if (!force) {
          const cachedProfile = multiLevelCache.get<UserProfile>(
            CacheKeys.userProfile(user.id),
            'local-first'
          );

          if (cachedProfile) {
            const cachedTeacherId = multiLevelCache.get<string>(
              CacheKeys.teacherId(user.id),
              'local-first'
            );

            const cachedData: UnifiedUserData = {
              user,
              profile: cachedProfile,
              teacherId: cachedTeacherId,
              loading: false,
              error: null,
              isAdmin: () => cachedProfile.role === 'school_admin',
              isTeacher: () => cachedProfile.role === 'teacher',
              isStudent: () => cachedProfile.role === 'student',
              isParent: () => cachedProfile.role === 'parent',
            };

            setData(cachedData);
            globalCache = cachedData;
            return;
          }
        }

        // Récupérer le profil depuis la base de données
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, school_id, role, first_name, last_name, email, phone, avatar_url, is_active')
          .eq('id', user.id)
          .single();

        if (profileError || !profile) {
          setData({
            user,
            profile: null,
            teacherId: null,
            loading: false,
            error: profileError?.message || 'Profil non trouvé',
            isAdmin: () => false,
            isTeacher: () => false,
            isStudent: () => false,
            isParent: () => false,
          });
          globalCache = null;
          return;
        }

        const userProfile: UserProfile = {
          id: profile.id,
          schoolId: profile.school_id,
          role: profile.role as UserRole,
          firstName: profile.first_name,
          lastName: profile.last_name,
          email: profile.email,
          phone: profile.phone || undefined,
          avatarUrl: profile.avatar_url || undefined,
          isActive: profile.is_active,
        };

        // Récupérer le teacherId si c'est un enseignant
        let teacherId: string | null = null;
        if (userProfile.role === 'teacher') {
          const cachedTeacherId = multiLevelCache.get<string>(
            CacheKeys.teacherId(user.id),
            'session-first'
          );

          if (cachedTeacherId) {
            teacherId = cachedTeacherId;
          } else {
            const { data: teacherData } = await supabase
              .from('teachers')
              .select('id')
              .eq('user_id', user.id)
              .eq('school_id', userProfile.schoolId)
              .maybeSingle();

            teacherId = teacherData?.id || null;

            if (teacherId) {
              // Sauvegarder dans le cache avec TTL long
              multiLevelCache.set(
                CacheKeys.teacherId(user.id),
                teacherId,
                CacheTTL.USER_PROFILE,
                'session'
              );
            }
          }
        }

        // Sauvegarder le profil dans le cache multi-niveaux
        multiLevelCache.set(
          CacheKeys.userProfile(user.id),
          userProfile,
          CacheTTL.USER_PROFILE,
          'local' // Persistant entre sessions
        );

        // Sauvegarder aussi avec la clé 'current' pour un accès rapide
        multiLevelCache.set(
          CacheKeys.userProfile('current'),
          userProfile,
          CacheTTL.USER_PROFILE,
          'local'
        );

        const newData: UnifiedUserData = {
          user,
          profile: userProfile,
          teacherId,
          loading: false,
          error: null,
          isAdmin: () => userProfile.role === 'school_admin',
          isTeacher: () => userProfile.role === 'teacher',
          isStudent: () => userProfile.role === 'student',
          isParent: () => userProfile.role === 'parent',
        };

        setData(newData);
        globalCache = newData;
      } catch (error: any) {
        console.error('Erreur lors du chargement des données utilisateur:', error);
        setData({
          user: null,
          profile: null,
          teacherId: null,
          loading: false,
          error: error.message,
          isAdmin: () => false,
          isTeacher: () => false,
          isStudent: () => false,
          isParent: () => false,
        });
        globalCache = null;
      } finally {
        pendingFetch = null;
      }
    })();

    await pendingFetch;
  }, []);

  const refetch = useCallback(async () => {
    // Vider le cache pour forcer un rechargement
    const user = await supabase.auth.getUser();
    if (user.data.user) {
      multiLevelCache.delete(CacheKeys.userProfile(user.data.user.id));
      multiLevelCache.delete(CacheKeys.userProfile('current'));
      multiLevelCache.delete(CacheKeys.teacherId(user.data.user.id));
    }
    
    globalCache = null;
    await fetchUserData(true);
  }, [fetchUserData]);

  useEffect(() => {
    // Charger les données au montage
    fetchUserData();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await fetchUserData(true);
        } else if (event === 'SIGNED_OUT') {
          // Vider tout le cache utilisateur
          multiLevelCache.deleteByPrefix('user_profile:');
          multiLevelCache.deleteByPrefix('teacher_id:');
          multiLevelCache.deleteByPrefix('dashboard:');
          
          setData({
            user: null,
            profile: null,
            teacherId: null,
            loading: false,
            error: null,
            isAdmin: () => false,
            isTeacher: () => false,
            isStudent: () => false,
            isParent: () => false,
          });
          globalCache = null;
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  return { ...data, refetch };
}
