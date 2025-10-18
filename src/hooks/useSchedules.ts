import { useState, useEffect, useCallback } from 'react';
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

  const fetchSchedules = useCallback(async () => {
    if (!userProfile?.schoolId || !classId) {
      setLoading(false);
      setSchedules([]);
      return;
    }

    // Vérifier le cache d'abord
    const cacheKey = `schedules-${classId}`;
    const cached = cache.get(cacheKey) as DaySchedule[] | null;
    if (cached) {
      setSchedules(cached);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // OPTIMISÉ: Sélection minimale + tri serveur
      const { data, error } = await supabase
        .from('schedules')
        .select('id, subject, teacher, start_time, end_time, day, day_of_week, class_id, school_id')
        .eq('school_id', userProfile.schoolId)
        .eq('class_id', classId)
        .order('day_of_week')
        .order('start_time')
        .limit(100);

      if (error) throw error;

      // Organiser par jour (côté client, rapide car déjà trié)
      const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      const organizedSchedules: DaySchedule[] = days.map(day => ({
        day,
        courses: (data || []).filter(course => course.day === day)
      }));

      // Mise en cache pour 2 minutes
      cache.set(cacheKey, organizedSchedules, 120000);
      
      setSchedules(organizedSchedules);
      setError(null);
    } catch (err) {
      console.error('Erreur lors de la récupération des emplois du temps:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [userProfile?.schoolId, classId, cache]);

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

      // Insertion en base de données AVANT toute mise à jour UI
      const { data: insertedCourse, error } = await supabase
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
        })
        .select()
        .single();

      if (error) {
        // Gestion des conflits d'horaires
        if (error.message.includes('schedules_no_time_conflict') || error.code === '23505') {
          toast({
            title: "⚠️ Conflit d'horaire",
            description: "Un cours existe déjà à ce créneau horaire.",
            variant: "destructive",
          });
          return false;
        }
        throw error;
      }

      // Créer le nouveau cours avec l'ID réel de la base de données
      const newCourse: Course = {
        id: insertedCourse.id,
        subject: courseData.subject,
        teacher: courseData.teacher || '',
        start_time: courseData.start_time,
        end_time: courseData.end_time,
        day: dbDay,
        class_id: courseData.class_id,
        school_id: userProfile.schoolId
      };

      // Mise à jour de l'état local APRÈS succès DB
      setSchedules(prevSchedules => {
        const updatedSchedules = prevSchedules.map(daySchedule => {
          if (daySchedule.day === dbDay) {
            return {
              ...daySchedule,
              courses: [...daySchedule.courses, newCourse].sort((a, b) => 
                a.start_time.localeCompare(b.start_time)
              )
            };
          }
          return daySchedule;
        });
        return updatedSchedules;
      });

      // Toast de succès APRÈS confirmation DB
      toast({
        title: "✅ Cours ajouté",
        description: `Le cours ${courseData.subject} a été ajouté avec succès.`,
      });

      // Invalidations de cache (en arrière-plan, délai de 100ms)
      if (courseData.teacher_id) {
        setTimeout(() => {
          cache.invalidateByPrefixWithEvent(`teacher-dashboard-${courseData.teacher_id}`);
          cache.deleteWithEvent('teacher-data-*');
          window.dispatchEvent(new CustomEvent('schedule-updated', { 
            detail: { teacherId: courseData.teacher_id, classId: courseData.class_id }
          }));
        }, 100);
      }

      return true;
    } catch (err) {
      console.error('Erreur lors de la création du cours:', err);
      
      const errorMessage = err instanceof Error ? err.message : "Une erreur est survenue lors de la création du cours.";
      
      toast({
        title: "❌ Erreur",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  };

  const updateCourse = async (id: string, courseData: Partial<CreateCourseData>) => {
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

      let dbDay: string | undefined;
      if (courseData.day) {
        dbDay = dayMapping[courseData.day] || courseData.day;
      }

      // Mise à jour en base de données AVANT toute mise à jour UI
      const updatedData: any = { ...courseData };
      if (dbDay) {
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

      // Mise à jour de l'état local APRÈS succès DB
      setSchedules(prevSchedules => 
        prevSchedules.map(daySchedule => ({
          ...daySchedule,
          courses: daySchedule.courses.map(course => 
            course.id === id 
              ? { 
                  ...course, 
                  subject: courseData.subject || course.subject,
                  teacher: courseData.teacher || course.teacher,
                  start_time: courseData.start_time || course.start_time,
                  end_time: courseData.end_time || course.end_time,
                  day: dbDay || course.day
                }
              : course
          )
        }))
      );

      // Toast de succès APRÈS confirmation DB
      toast({
        title: "✅ Cours mis à jour",
        description: "Le cours a été mis à jour avec succès.",
      });

      // Invalidations de cache (arrière-plan, délai de 100ms)
      setTimeout(() => {
        cache.deleteWithEvent('teacher-data-*');
      }, 100);

      return true;
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
      
      toast({
        title: "❌ Erreur",
        description: err instanceof Error ? err.message : "Erreur lors de la mise à jour.",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteCourse = async (id: string) => {
    if (!userProfile?.schoolId) return false;

    try {
      // Suppression en base de données AVANT toute mise à jour UI
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;

      // Suppression de l'état local APRÈS succès DB
      setSchedules(prevSchedules => 
        prevSchedules.map(daySchedule => ({
          ...daySchedule,
          courses: daySchedule.courses.filter(course => course.id !== id)
        }))
      );

      // Toast de succès APRÈS confirmation DB
      toast({
        title: "✅ Cours supprimé",
        description: "Le cours a été supprimé avec succès.",
      });

      // Invalidations de cache (arrière-plan, délai de 100ms)
      setTimeout(() => {
        cache.deleteWithEvent('teacher-data-*');
      }, 100);

      return true;
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      
      toast({
        title: "❌ Erreur",
        description: err instanceof Error ? err.message : "Erreur lors de la suppression.",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    void fetchSchedules();
  }, [fetchSchedules]);

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