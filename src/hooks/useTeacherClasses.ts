import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import type { ClassData } from './useClasses';
import type { RealtimeChannel } from '@supabase/supabase-js';

export const useTeacherClasses = () => {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile, isTeacher } = useUserRole();
  
  // Guards contre les exécutions multiples
  const isFetchingRef = useRef(false);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 2;

  const fetchTeacherClasses = useCallback(async () => {
    // Guard: Empêcher les exécutions multiples
    if (isFetchingRef.current) {
      console.log('⚠️ Fetch déjà en cours, ignoré');
      return;
    }

    // Extraire les valeurs primitives pour stabilité
    const schoolId = userProfile?.schoolId;
    const userId = userProfile?.id;
    
    if (!schoolId || !userId) {
      console.log('⚠️ Pas de schoolId ou userId');
      setLoading(false);
      return;
    }

    // Si ce n'est pas un enseignant, ne rien charger
    if (!isTeacher()) {
      console.log('⚠️ Pas un enseignant');
      setClasses([]);
      setLoading(false);
      return;
    }

    // Marquer comme en cours
    isFetchingRef.current = true;
    console.log('🔄 Début fetch classes enseignant');

    try {
      setLoading(true);
      setError(null);

      // Vérification de session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('❌ Session invalide');
        
        // Tenter un refresh si on n'a pas dépassé le nombre de tentatives
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++;
          console.log(`🔄 Tentative de refresh session (${retryCountRef.current}/${MAX_RETRIES})`);
          
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError) {
            console.log('✅ Session rafraîchie avec succès');
            isFetchingRef.current = false;
            // Retry sera géré par le useEffect qui détecte le changement
            return;
          }
        }
        
        // Si échec après retries
        setError('Votre session a expiré. Veuillez vous reconnecter.');
        setTimeout(() => {
          window.location.href = '/auth';
        }, 1500);
        return;
      }

      console.log('✅ Session valide');

      // Trouver l'entrée teacher
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('id')
        .eq('school_id', schoolId)
        .eq('user_id', userId)
        .maybeSingle();

      if (teacherError) {
        console.error('❌ Erreur teacher:', teacherError);
        throw teacherError;
      }

      if (!teacherData) {
        console.log('⚠️ Aucune entrée teacher trouvée pour:', userId);
        setClasses([]);
        setLoading(false);
        isFetchingRef.current = false;
        return;
      }

      console.log('✅ Teacher trouvé:', teacherData.id);

      // Trouver les schedules
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('schedules')
        .select('class_id')
        .eq('school_id', schoolId)
        .eq('teacher_id', teacherData.id);

      if (scheduleError) {
        console.error('❌ Erreur schedules:', scheduleError);
        throw scheduleError;
      }

      console.log('✅ Schedules trouvés:', scheduleData?.length || 0);

      const classIds = [...new Set(scheduleData?.map(s => s.class_id) || [])];

      if (classIds.length === 0) {
        console.log('⚠️ Aucune classe dans les emplois du temps');
        setClasses([]);
        setLoading(false);
        isFetchingRef.current = false;
        return;
      }

      console.log('✅ Class IDs:', classIds);

      // Récupérer les classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .in('id', classIds)
        .order('name');

      if (classesError) {
        console.error('❌ Erreur classes:', classesError);
        throw classesError;
      }

      console.log('✅ Classes récupérées:', classesData?.length || 0);

      // Récupérer le nombre d'élèves pour chaque classe
      const classesWithEnrollment = await Promise.all(
        (classesData || []).map(async (classe: any) => {
          const { count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', classe.id);
          
          return {
            ...classe,
            enrollment_count: count || 0
          };
        })
      );

      console.log('✅ Classes avec effectif:', classesWithEnrollment);
      setClasses(classesWithEnrollment);
      retryCountRef.current = 0; // Reset retry count on success
      
    } catch (err: any) {
      console.error('❌ Erreur catch:', err);
      
      // Gérer les erreurs JWT avec retry
      if (err?.message?.includes('JWT') || err?.code === 'PGRST301' || err?.code === 'PGRST302' || err?.code === 'PGRST303') {
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++;
          console.log(`🔄 Retry JWT error (${retryCountRef.current}/${MAX_RETRIES})`);
          
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError) {
            isFetchingRef.current = false;
            return;
          }
        }
        
        setError('Votre session a expiré. Veuillez vous reconnecter.');
        setTimeout(() => {
          window.location.href = '/auth';
        }, 1500);
      } else {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
      console.log('✅ Fin fetch classes enseignant');
    }
  }, [userProfile?.schoolId, userProfile?.id, isTeacher]);

  useEffect(() => {
    fetchTeacherClasses();
  }, [fetchTeacherClasses]);

  // Surveillance en temps réel des changements dans les schedules
  useEffect(() => {
    if (!userProfile?.schoolId || !userProfile?.id || !isTeacher()) return;

    const channel: RealtimeChannel = supabase
      .channel('teacher-schedules-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedules',
          filter: `school_id=eq.${userProfile.schoolId}`
        },
        () => {
          // Rafraîchir les classes quand l'emploi du temps change
          fetchTeacherClasses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile?.schoolId, userProfile?.id, isTeacher, fetchTeacherClasses]);

  return {
    classes,
    loading,
    error,
    refreshClasses: fetchTeacherClasses,
    hasNoClasses: !loading && classes.length === 0
  };
};
