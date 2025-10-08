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
  
  // Extraire les valeurs primitives pour éviter les re-renders
  const schoolId = userProfile?.schoolId;
  const userId = userProfile?.id;
  const isTeacherRole = isTeacher();

  const fetchTeacherClasses = useCallback(async () => {
    // Guard: Empêcher les exécutions multiples
    if (isFetchingRef.current) {
      return;
    }
    
    if (!schoolId || !userId) {
      setLoading(false);
      return;
    }

    // Si ce n'est pas un enseignant, ne rien charger
    if (!isTeacherRole) {
      setClasses([]);
      setLoading(false);
      return;
    }

    // Marquer comme en cours
    isFetchingRef.current = true;

    try {
      setLoading(true);
      setError(null);

      // Vérification de session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        // Tenter un refresh si on n'a pas dépassé le nombre de tentatives
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++;
          
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError) {
            isFetchingRef.current = false;
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

      // Trouver l'entrée teacher
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('id')
        .eq('school_id', schoolId)
        .eq('user_id', userId)
        .maybeSingle();

      if (teacherError) {
        throw teacherError;
      }

      if (!teacherData) {
        setClasses([]);
        setLoading(false);
        isFetchingRef.current = false;
        return;
      }

      // Trouver les schedules
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('schedules')
        .select('class_id')
        .eq('school_id', schoolId)
        .eq('teacher_id', teacherData.id);

      if (scheduleError) {
        throw scheduleError;
      }

      const classIds = [...new Set(scheduleData?.map(s => s.class_id) || [])];

      if (classIds.length === 0) {
        setClasses([]);
        setLoading(false);
        isFetchingRef.current = false;
        return;
      }

      // Récupérer les classes ET le nombre d'élèves en une seule requête optimisée
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .in('id', classIds)
        .order('name');

      if (classesError) {
        throw classesError;
      }

      // Récupérer le nombre d'élèves pour TOUTES les classes en UNE SEULE requête groupée
      const { data: studentCounts } = await supabase
        .from('students')
        .select('class_id')
        .in('class_id', classIds)
        .eq('is_active', true);

      // Créer un Map pour compter rapidement les élèves par classe
      const enrollmentMap = new Map<string, number>();
      (studentCounts || []).forEach((student: any) => {
        const currentCount = enrollmentMap.get(student.class_id) || 0;
        enrollmentMap.set(student.class_id, currentCount + 1);
      });

      // Ajouter le comptage aux classes
      const classesWithEnrollment = (classesData || []).map((classe: any) => ({
        ...classe,
        enrollment_count: enrollmentMap.get(classe.id) || 0
      }));

      setClasses(classesWithEnrollment);
      retryCountRef.current = 0;
      
    } catch (err: any) {
      // Gérer les erreurs JWT avec retry
      if (err?.message?.includes('JWT') || err?.code === 'PGRST301' || err?.code === 'PGRST302' || err?.code === 'PGRST303') {
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++;
          
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
    }
  }, [schoolId, userId, isTeacherRole]);

  useEffect(() => {
    if (schoolId && userId && isTeacherRole) {
      fetchTeacherClasses();
    }
  }, [schoolId, userId, isTeacherRole, fetchTeacherClasses]);

  // Synchronisation en temps réel
  useEffect(() => {
    if (!schoolId || !userId || !isTeacherRole) {
      return;
    }

    // Écouter les changements sur les schedules
    const channel = supabase
      .channel('teacher-classes-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedules',
          filter: `school_id=eq.${schoolId}`
        },
        () => {
          // Rafraîchir après 500ms pour éviter trop de requêtes
          setTimeout(() => {
            fetchTeacherClasses();
          }, 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [schoolId, userId, isTeacherRole, fetchTeacherClasses]);

  return {
    classes,
    loading,
    error,
    refreshClasses: fetchTeacherClasses,
    hasNoClasses: !loading && classes.length === 0
  };
};
