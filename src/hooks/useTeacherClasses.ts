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
      setError(null);

      // Vérifier et rafraîchir la session si nécessaire
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Session expirée ou invalide, redirection vers la connexion...');
        setError('Votre session a expiré. Veuillez vous reconnecter.');
        window.location.href = '/auth';
        return;
      }

      // Trouver d'abord l'entrée teacher correspondant au user_id
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('id')
        .eq('school_id', userProfile.schoolId)
        .eq('user_id', userProfile.id)
        .maybeSingle();

      if (teacherError) {
        // Si c'est une erreur JWT, tenter de rafraîchir le token
        if (teacherError.message?.includes('JWT')) {
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.error('Impossible de rafraîchir la session:', refreshError);
            setError('Votre session a expiré. Veuillez vous reconnecter.');
            window.location.href = '/auth';
            return;
          }
          // Réessayer la requête après le rafraîchissement
          return fetchTeacherClasses();
        }
        throw teacherError;
      }

      // Si l'enseignant n'a pas d'entrée dans teachers, retourner vide
      if (!teacherData) {
        console.log('Aucune entrée teacher trouvée pour user_id:', userProfile.id);
        setClasses([]);
        setLoading(false);
        return;
      }

      console.log('Teacher ID trouvé:', teacherData.id);

      // Trouver les classes où l'enseignant apparaît dans l'emploi du temps
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('schedules')
        .select('class_id')
        .eq('school_id', userProfile.schoolId)
        .eq('teacher_id', teacherData.id);

      if (scheduleError) throw scheduleError;

      console.log('Schedules trouvés:', scheduleData?.length || 0);

      // Extraire les IDs uniques des classes
      const classIds = [...new Set(scheduleData?.map(s => s.class_id) || [])];

      if (classIds.length === 0) {
        console.log('Aucune classe trouvée dans les emplois du temps');
        setClasses([]);
        setLoading(false);
        return;
      }

      console.log('Class IDs à récupérer:', classIds);

      // Récupérer les détails des classes (sans la sous-requête students pour simplifier)
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .in('id', classIds)
        .order('name');

      if (classesError) throw classesError;

      console.log('Classes récupérées:', classesData?.length || 0);

      // Récupérer le nombre d'élèves pour chaque classe séparément
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

      console.log('Classes avec effectif:', classesWithEnrollment);
      setClasses(classesWithEnrollment);
    } catch (err: any) {
      console.error('Erreur lors de la récupération des classes enseignant:', err);
      
      // Gérer spécifiquement les erreurs JWT
      if (err?.message?.includes('JWT') || err?.code === 'PGRST301' || err?.code === 'PGRST302' || err?.code === 'PGRST303') {
        setError('Votre session a expiré. Veuillez vous reconnecter.');
        setTimeout(() => {
          window.location.href = '/auth';
        }, 2000);
      } else {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      }
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
