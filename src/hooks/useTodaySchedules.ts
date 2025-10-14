import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedUserData } from './useOptimizedUserData';

interface TodayScheduleItem {
  id: string;
  className: string;
  classId: string;
  courses: {
    id: string;
    subject: string;
    teacher: string;
    startTime: string;
    endTime: string;
  }[];
}

export const useTodaySchedules = () => {
  const { profile } = useOptimizedUserData();
  const [schedules, setSchedules] = useState<TodayScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // OPTIMISÉ: useMemo pour le jour actuel
  const currentDay = useMemo(() => {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return days[new Date().getDay()];
  }, []);

  // OPTIMISÉ: Mémorisé avec les bonnes dépendances
  const fetchTodaySchedules = useMemo(() => async () => {
    if (!profile?.schoolId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // OPTIMISÉ: Requête simplifiée sans JOIN
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('schedules')
        .select('id, subject, teacher, start_time, end_time, class_id')
        .eq('school_id', profile.schoolId)
        .eq('day', currentDay)
        .order('start_time')
        .limit(50);

      if (schedulesError) throw schedulesError;

      // Récupérer les classes en parallèle
      const classIds = [...new Set(schedulesData?.map(s => s.class_id) || [])];
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, name, level, section')
        .in('id', classIds);

      const classesMap = new Map(
        classesData?.map(c => [c.id, c]) || []
      );

      // Grouper par classe
      const groupedSchedules: { [key: string]: TodayScheduleItem } = {};

      schedulesData?.forEach((schedule: any) => {
        const classId = schedule.class_id;
        const classInfo = classesMap.get(classId);
        const className = classInfo?.section 
          ? `${classInfo.name} ${classInfo.section}`
          : classInfo?.name || 'Classe inconnue';

        if (!groupedSchedules[classId]) {
          groupedSchedules[classId] = {
            id: classId,
            className,
            classId,
            courses: []
          };
        }

        groupedSchedules[classId].courses.push({
          id: schedule.id,
          subject: schedule.subject || 'Matière inconnue',
          teacher: schedule.teacher || 'Enseignant non assigné',
          startTime: schedule.start_time?.substring(0, 5) || '',
          endTime: schedule.end_time?.substring(0, 5) || ''
        });
      });

      setSchedules(Object.values(groupedSchedules));
      setError(null);
    } catch (err) {
      console.error('Erreur lors de la récupération des emplois du temps:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.schoolId, currentDay]);

  useEffect(() => {
    fetchTodaySchedules();
  }, [fetchTodaySchedules]);

  return {
    schedules,
    loading,
    error,
    currentDay,
    refetch: fetchTodaySchedules
  };
};
