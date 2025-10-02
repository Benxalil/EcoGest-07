import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useToast } from '@/hooks/use-toast';
import { useOptimizedCache } from './useOptimizedCache';

export interface Course {
  id?: string;
  subject: string;
  teacher?: string;
  start_time: string;
  end_time: string;
  day: string;
  class_id: string;
  school_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface DaySchedule {
  day: string;
  courses: Course[];
}

export interface CreateCourseData {
  subject: string;
  teacher?: string;
  teacher_id?: string;
  start_time: string;
  end_time: string;
  day: string;
  class_id: string;
}

export const useSchedules = (classId?: string) => {
  const [schedules, setSchedules] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useUserRole();
  const { toast } = useToast();
  const cache = useOptimizedCache();

  const fetchSchedules = async () => {
    if (!userProfile?.schoolId || !classId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('school_id', userProfile.schoolId)
        .eq('class_id', classId)
        .order('day, start_time');

      if (error) throw error;

      // Organiser les cours par jour - utiliser le format correct attendu par la DB
      const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      const organizedSchedules: DaySchedule[] = days.map(day => ({
        day,
        courses: (data || []).filter(course => course.day === day)
      }));

      setSchedules(organizedSchedules);
    } catch (err) {
      console.error('Erreur lors de la récupération des emplois du temps:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const createCourse = async (courseData: CreateCourseData) => {
    if (!userProfile?.schoolId) return false;

    try {
      // Convertir le format d'affichage vers le format DB si nécessaire
      const dayMapping: { [key: string]: string } = {
        'LUNDI': 'Lundi',
        'MARDI': 'Mardi',
        'MERCREDI': 'Mercredi',
        'JEUDI': 'Jeudi',
        'VENDREDI': 'Vendredi',
        'SAMEDI': 'Samedi'
      };

      const dbDay = dayMapping[courseData.day] || courseData.day;
      const dayOfWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].indexOf(dbDay) + 1;

      const { error } = await supabase
        .from('schedules')
        .insert({
          subject: courseData.subject,
          teacher: courseData.teacher || '',
          teacher_id: courseData.teacher_id || null,
          start_time: courseData.start_time,
          end_time: courseData.end_time,
          day: dbDay,
          day_of_week: dayOfWeek,
          class_id: courseData.class_id,
          school_id: userProfile.schoolId
        });

      if (error) throw error;

      // Invalider le cache de l'enseignant concerné
      if (courseData.teacher_id) {
        cache.invalidateByPrefixWithEvent(`teacher-dashboard-${courseData.teacher_id}`);
      }

      await fetchSchedules();

      toast({
        title: "Cours ajouté avec succès",
        description: `Le cours ${courseData.subject} a été ajouté.`,
      });

      return true;
    } catch (err) {
      console.error('Erreur lors de la création du cours:', err);
      toast({
        title: "Erreur lors de la création",
        description: err instanceof Error ? err.message : "Une erreur est survenue lors de la création du cours.",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateCourse = async (id: string, courseData: Partial<CreateCourseData>) => {
    if (!userProfile?.schoolId) return false;

    try {
      // Récupérer l'emploi du temps avant modification pour invalider le cache
      const { data: existingSchedule } = await supabase
        .from('schedules')
        .select('teacher_id')
        .eq('id', id)
        .single();

      // Convertir le format d'affichage vers le format DB si nécessaire
      const dayMapping: { [key: string]: string } = {
        'LUNDI': 'Lundi',
        'MARDI': 'Mardi', 
        'MERCREDI': 'Mercredi',
        'JEUDI': 'Jeudi',
        'VENDREDI': 'Vendredi',
        'SAMEDI': 'Samedi'
      };

      const updatedData: any = { ...courseData };
      if (courseData.day) {
        const dbDay = dayMapping[courseData.day] || courseData.day;
        const dayOfWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].indexOf(dbDay) + 1;
        updatedData.day = dbDay;
        updatedData.day_of_week = dayOfWeek;
      }

      const { error } = await supabase
        .from('schedules')
        .update(updatedData)
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;

      // Invalider les caches des enseignants concernés (ancien et nouveau)
      if (existingSchedule?.teacher_id) {
        cache.invalidateByPrefixWithEvent(`teacher-dashboard-${existingSchedule.teacher_id}`);
      }
      if (courseData.teacher_id && courseData.teacher_id !== existingSchedule?.teacher_id) {
        cache.invalidateByPrefixWithEvent(`teacher-dashboard-${courseData.teacher_id}`);
      }

      await fetchSchedules();

      toast({
        title: "Cours mis à jour",
        description: "Le cours a été mis à jour avec succès.",
      });

      return true;
    } catch (err) {
      console.error('Erreur lors de la mise à jour du cours:', err);
      toast({
        title: "Erreur lors de la mise à jour",
        description: err instanceof Error ? err.message : "Une erreur est survenue lors de la mise à jour.",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteCourse = async (id: string) => {
    if (!userProfile?.schoolId) return false;

    try {
      // Récupérer l'emploi du temps avant suppression pour invalider le cache
      const { data: existingSchedule } = await supabase
        .from('schedules')
        .select('teacher_id')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;

      // Invalider le cache de l'enseignant concerné
      if (existingSchedule?.teacher_id) {
        cache.invalidateByPrefixWithEvent(`teacher-dashboard-${existingSchedule.teacher_id}`);
      }

      await fetchSchedules();

      toast({
        title: "Cours supprimé",
        description: "Le cours a été supprimé avec succès.",
      });

      return true;
    } catch (err) {
      console.error('Erreur lors de la suppression du cours:', err);
      toast({
        title: "Erreur lors de la suppression",
        description: err instanceof Error ? err.message : "Une erreur est survenue lors de la suppression.",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [userProfile?.schoolId, classId]);

  return {
    schedules,
    loading,
    error,
    createCourse,
    updateCourse,
    deleteCourse,
    refreshSchedules: fetchSchedules
  };
};