import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { multiLevelCache, CacheTTL, CacheKeys } from '@/utils/multiLevelCache';

// Variable pour éviter les requêtes multiples simultanées
let pendingRequest: Promise<string | null> | null = null;

export const useTeacherId = () => {
  const { userProfile } = useUserRole();
  
  // Essayer de charger depuis le cache immédiatement
  const cachedTeacherId = userProfile?.id 
    ? multiLevelCache.get<string>(CacheKeys.teacherId(userProfile.id), 'session-first')
    : null;
  
  const [teacherId, setTeacherId] = useState<string | null>(cachedTeacherId);
  const [loading, setLoading] = useState(!cachedTeacherId);

  useEffect(() => {
    const fetchTeacherId = async () => {
      if (!userProfile?.id) {
        setLoading(false);
        return;
      }

      // Vérifier le cache multi-niveaux d'abord
      const cached = multiLevelCache.get<string>(
        CacheKeys.teacherId(userProfile.id), 
        'session-first'
      );
      
      if (cached) {
        setTeacherId(cached);
        setLoading(false);
        return;
      }

      // Si une requête est déjà en cours, l'attendre
      if (pendingRequest) {
        const id = await pendingRequest;
        setTeacherId(id);
        setLoading(false);
        return;
      }

      // Faire la requête
      setLoading(true);
      pendingRequest = (async () => {
        const { data } = await supabase
          .from('teachers')
          .select('id')
          .eq('user_id', userProfile.id)
          .eq('school_id', userProfile.schoolId)
          .maybeSingle();
        
        const id = data?.id || null;
        
        // Sauvegarder dans le cache multi-niveaux avec TTL long
        if (id) {
          multiLevelCache.set(
            CacheKeys.teacherId(userProfile.id),
            id,
            CacheTTL.USER_PROFILE, // 1 heure
            'session' // sessionStorage uniquement
          );
        }
        
        pendingRequest = null;
        return id;
      })();

      const id = await pendingRequest;
      setTeacherId(id);
      setLoading(false);
    };

    fetchTeacherId();
  }, [userProfile?.id, userProfile?.schoolId]);

  return { teacherId, loading };
};
