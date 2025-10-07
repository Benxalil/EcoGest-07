import { useState, useEffect, useCallback, useMemo } from 'react';
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

  // Obtenir le jour actuel en français (Lundi, Mardi, etc.)
  const getCurrentDay = useCallback(() => {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const today = new Date().getDay();
    return days[today];
  }, []);

  const fetchTodaySchedules = useCallback(async () => {
    if (!profile?.schoolId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const currentDay = getCurrentDay();

      // Récupérer tous les emplois du temps pour aujourd'hui
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('schedules')
        .select(`
          id,
          subject,
          teacher,
          start_time,
          end_time,
          class_id,
          classes!inner(
            id,
            name,
            level,
            section
          )
        `)
        .eq('school_id', profile.schoolId)
        .eq('day', currentDay)
        .order('start_time');

      if (schedulesError) throw schedulesError;

      // Grouper les cours par classe
      const groupedSchedules: { [key: string]: TodayScheduleItem } = {};

      schedulesData?.forEach((schedule: any) => {
        const classId = schedule.class_id;
        const className = schedule.classes?.section 
          ? `${schedule.classes.name} ${schedule.classes.section}`
          : schedule.classes?.name || 'Classe inconnue';

        if (!groupedSchedules[classId]) {
          groupedSchedules[classId] = {
            id: classId,
            className: className,
            classId: classId,
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
  }, [profile?.schoolId, getCurrentDay]);

  useEffect(() => {
    fetchTodaySchedules();
  }, [fetchTodaySchedules]);

  return {
    schedules,
    loading,
    error,
    currentDay: getCurrentDay(),
    refetch: fetchTodaySchedules
  };
};
