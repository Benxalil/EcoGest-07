import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import type { ClassData } from './useClasses';
import type { RealtimeChannel } from '@supabase/supabase-js';

export const useTeacherClasses = () => {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile, isTeacher } = useUserRole();

  const fetchTeacherClasses = useCallback(async () => {
    if (!userProfile?.schoolId || !userProfile?.id) {
      setLoading(false);
      return;
    }

    // Si ce n'est pas un enseignant, ne rien charger
    if (!isTeacher()) {
      setClasses([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Trouver les classes où l'enseignant apparaît dans l'emploi du temps
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('schedules')
        .select('class_id')
        .eq('school_id', userProfile.schoolId)
        .eq('teacher_id', userProfile.id);

      if (scheduleError) throw scheduleError;

      // Extraire les IDs uniques des classes
      const classIds = [...new Set(scheduleData?.map(s => s.class_id) || [])];

      if (classIds.length === 0) {
        setClasses([]);
        setLoading(false);
        return;
      }

      // Récupérer les détails des classes avec le nombre d'élèves
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select(`
          *,
          students:students(count)
        `)
        .in('id', classIds)
        .order('name');

      if (classesError) throw classesError;

      // Transformer les données pour inclure enrollment_count
      const classesWithEnrollment = (classesData || []).map((classe: any) => ({
        ...classe,
        enrollment_count: classe.students?.[0]?.count || 0,
        students: undefined
      }));

      setClasses(classesWithEnrollment);
    } catch (err) {
      console.error('Erreur lors de la récupération des classes enseignant:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
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
