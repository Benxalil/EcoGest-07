import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useOptimizedCache } from './useOptimizedCache';

/**
 * Hook pour récupérer les informations de l'école
 * Utilise le cache intelligent pour éviter les requêtes redondantes
 */
export const useSchoolData = () => {
  const [schoolData, setSchoolData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const { userProfile } = useUserRole();
  const cache = useOptimizedCache();
  const schoolIdRef = useRef<string | null>(null);

  // Effet principal pour charger les données
  useEffect(() => {
    const fetchSchoolData = async () => {
      if (!userProfile?.schoolId) {
        setLoading(false);
        return;
      }

      const cacheKey = `school-info-${userProfile.schoolId}`;
      
      // Vérifier le cache d'abord
      const cachedData = cache.get<any>(cacheKey);
      if (cachedData) {
        setSchoolData(cachedData);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('schools')
          .select('*')
          .eq('id', userProfile.schoolId)
          .single();

        if (fetchError) throw fetchError;

        // Mettre en cache pour 30 minutes (données peu changeantes)
        cache.set(cacheKey, data, 30 * 60 * 1000);
        
        setSchoolData(data);
      } catch (err) {
        console.error('useSchoolData: Erreur:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };

    fetchSchoolData();
  }, [userProfile?.schoolId, refreshTrigger, cache]);

  // Fonction pour mettre à jour les données de l'école
  const updateSchoolData = async (updates: any) => {
    if (!userProfile?.schoolId) return false;

    try {
      const { data, error: updateError } = await supabase
        .from('schools')
        .update(updates)
        .eq('id', userProfile.schoolId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Invalider le cache et mettre à jour l'état
      cache.delete(`school-info-${userProfile.schoolId}`);
      setSchoolData(data);
      
      // Émettre un événement pour notifier les composants
      window.dispatchEvent(new CustomEvent('schoolSettingsUpdated'));
      
      return true;
    } catch (err) {
      console.error('useSchoolData: Erreur mise à jour:', err);
      return false;
    }
  };

  // Fonction pour forcer un rechargement
  const refreshSchoolData = () => {
    if (userProfile?.schoolId) {
      cache.delete(`school-info-${userProfile.schoolId}`);
      setRefreshTrigger(prev => prev + 1);
    }
  };

  return {
    schoolData,
    loading,
    error,
    updateSchoolData,
    refreshSchoolData
  };
};
