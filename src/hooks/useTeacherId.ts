import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';

// Cache global pour éviter les requêtes multiples
let cachedTeacherId: string | null = null;
let cachedUserId: string | null = null;
let pendingRequest: Promise<string | null> | null = null;

export const useTeacherId = () => {
  const [teacherId, setTeacherId] = useState<string | null>(cachedTeacherId);
  const [loading, setLoading] = useState(!cachedTeacherId);
  const { userProfile } = useUserRole();

  useEffect(() => {
    const fetchTeacherId = async () => {
      if (!userProfile?.id) {
        setLoading(false);
        return;
      }

      // Si on a déjà le teacher ID en cache pour cet utilisateur, on l'utilise
      if (cachedTeacherId && cachedUserId === userProfile.id) {
        setTeacherId(cachedTeacherId);
        setLoading(false);
        return;
      }

      // Si une requête est déjà en cours, on l'attend
      if (pendingRequest) {
        const id = await pendingRequest;
        setTeacherId(id);
        setLoading(false);
        return;
      }

      // Sinon, on fait la requête
      setLoading(true);
      pendingRequest = (async () => {
        const { data } = await supabase
          .from('teachers')
          .select('id')
          .eq('user_id', userProfile.id)
          .eq('school_id', userProfile.schoolId)
          .maybeSingle();
        
        const id = data?.id || null;
        cachedTeacherId = id;
        cachedUserId = userProfile.id;
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
