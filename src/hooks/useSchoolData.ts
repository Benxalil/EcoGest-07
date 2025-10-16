import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';

/**
 * Hook simplifié pour récupérer les informations de l'école
 * Sans cache complexe pour éviter les boucles infinies
 */
export const useSchoolData = () => {
  const [schoolData, setSchoolData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { userProfile } = useUserRole();

  useEffect(() => {
    let isMounted = true;

    const fetchSchoolData = async () => {
      if (!userProfile?.schoolId) {
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

        if (isMounted) {
          setSchoolData(data);
        }
      } catch (err) {
        if (isMounted) {
          console.error('useSchoolData: Erreur:', err);
          setError(err instanceof Error ? err.message : 'Erreur inconnue');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSchoolData();

    // 🔔 Ajouter une souscription Realtime pour synchroniser entre fenêtres
    const channel = supabase
      .channel('school-data-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'schools',
          filter: `id=eq.${userProfile.schoolId}`
        },
        (payload) => {
          console.log('🔔 [useSchoolData] Mise à jour Realtime détectée', payload);
          
          if (isMounted) {
            setSchoolData(payload.new);
            window.dispatchEvent(new CustomEvent('schoolSettingsUpdated'));
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 [useSchoolData] Statut souscription Realtime:', status);
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      console.log('🔌 [useSchoolData] Désouscription Realtime');
    };
  }, [userProfile?.schoolId]);

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

      setSchoolData(data);
      window.dispatchEvent(new CustomEvent('schoolSettingsUpdated'));
      
      return true;
    } catch (err) {
      console.error('useSchoolData: Erreur mise à jour:', err);
      return false;
    }
  };

  const refreshSchoolData = async () => {
    if (!userProfile?.schoolId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('schools')
        .select('*')
        .eq('id', userProfile.schoolId)
        .single();

      if (fetchError) throw fetchError;
      setSchoolData(data);
    } catch (err) {
      console.error('useSchoolData: Erreur refresh:', err);
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
