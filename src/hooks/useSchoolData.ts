import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Hook simplifié pour récupérer les informations de l'école
 * Sans cache complexe pour éviter les boucles infinies
 */
export const useSchoolData = () => {
  const [schoolData, setSchoolData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastUpdateRef = useRef<number>(0);
  
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

    // 🔔 Ajouter une souscription Realtime seulement si schoolId existe
    if (!userProfile?.schoolId) {
      return () => {
        isMounted = false;
      };
    }

    // ✅ Éviter les souscriptions multiples
    if (channelRef.current) {
      if (import.meta.env.DEV) {
        console.log('🔌 [useSchoolData] Canal déjà ouvert, réutilisation');
      }
      return () => {
        isMounted = false;
      };
    }

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
          // ✅ Debounce de 1000ms pour éviter les mises à jour trop fréquentes
          const now = Date.now();
          if (now - lastUpdateRef.current < 1000) {
            return;
          }
          lastUpdateRef.current = now;

          if (import.meta.env.DEV) {
            console.log('🔔 [useSchoolData] Mise à jour Realtime détectée', payload);
          }
          
          if (isMounted) {
            setSchoolData(payload.new);
            window.dispatchEvent(new CustomEvent('schoolSettingsUpdated'));
          }
        }
      )
      .subscribe((status) => {
        if (import.meta.env.DEV) {
          console.log('📡 [useSchoolData] Statut souscription Realtime:', status);
        }
      });

    channelRef.current = channel;

    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        if (import.meta.env.DEV) {
          console.log('🔌 [useSchoolData] Désouscription Realtime');
        }
      }
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
