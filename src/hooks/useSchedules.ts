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

    try {
      setLoading(true);
      // OPTIMISÉ: Limite raisonnable + tri côté serveur
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('school_id', userProfile.schoolId)
        .eq('class_id', classId)
        .order('day_of_week')
        .order('start_time')
        .limit(100);

      if (error) throw error;

      // Organiser les cours par jour
      const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      const organizedSchedules: DaySchedule[] = days.map(day => ({
        day,
        courses: (data || []).filter(course => course.day === day)
      }));

      setSchedules(organizedSchedules);
      setError(null);
    } catch (err) {
      console.error('Erreur lors de la récupération des emplois du temps:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [userProfile?.schoolId, classId]);

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

      // 1️⃣ Créer l'objet cours temporaire avec ID local
      const tempId = `temp-${Date.now()}`;
      const newCourse: Course = {
        id: tempId,
        subject: courseData.subject,
        teacher: courseData.teacher || '',
        start_time: courseData.start_time,
        end_time: courseData.end_time,
        day: dbDay,
        class_id: courseData.class_id,
        school_id: userProfile.schoolId
      };

      // 2️⃣ Mise à jour optimiste de l'état local IMMÉDIATEMENT
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

      // 3️⃣ Afficher le toast de succès IMMÉDIATEMENT
      toast({
        title: "✅ Cours ajouté",
        description: `Le cours ${courseData.subject} a été ajouté.`,
      });

      // 4️⃣ Insertion réelle en base (en arrière-plan)
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
          // Rollback : supprimer le cours temporaire
          setSchedules(prevSchedules => 
            prevSchedules.map(daySchedule => ({
              ...daySchedule,
              courses: daySchedule.courses.filter(c => c.id !== tempId)
            }))
          );
          
          toast({
            title: "⚠️ Conflit d'horaire",
            description: "Un cours existe déjà à ce créneau horaire.",
            variant: "destructive",
          });
          return false;
        }
        throw error;
      }

      // 5️⃣ Remplacer le cours temporaire par le vrai (avec l'ID de la DB)
      setSchedules(prevSchedules => 
        prevSchedules.map(daySchedule => ({
          ...daySchedule,
          courses: daySchedule.courses.map(c => 
            c.id === tempId ? { ...c, id: insertedCourse.id } : c
          )
        }))
      );

      // 6️⃣ Invalidations de cache (en arrière-plan, non bloquant)
      if (courseData.teacher_id) {
        setTimeout(() => {
          cache.invalidateByPrefixWithEvent(`teacher-dashboard-${courseData.teacher_id}`);
          cache.deleteWithEvent('teacher-data-*');
          window.dispatchEvent(new CustomEvent('schedule-updated', { 
            detail: { teacherId: courseData.teacher_id, classId: courseData.class_id }
          }));
        }, 0);
      }

      return true;
    } catch (err) {
      console.error('Erreur lors de la création du cours:', err);
      
      // Rollback en cas d'erreur
      await fetchSchedules();
      
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

      // 1️⃣ Sauvegarder l'ancien état pour rollback
      const previousSchedules = schedules;

      // 2️⃣ Mise à jour optimiste immédiate
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

      // 3️⃣ Toast immédiat
      toast({
        title: "✅ Cours mis à jour",
        description: "Le cours a été mis à jour avec succès.",
      });

      // 4️⃣ Récupérer l'emploi du temps avant modification pour invalider le cache
      const { data: existingSchedule } = await supabase
        .from('schedules')
        .select('teacher_id')
        .eq('id', id)
        .single();

      // 5️⃣ Mise à jour réelle en base (arrière-plan)
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

      // 6️⃣ Invalidations de cache (arrière-plan)
      setTimeout(() => {
        cache.deleteWithEvent('teacher-data-*');
        if (existingSchedule?.teacher_id) {
          cache.invalidateByPrefixWithEvent(`teacher-dashboard-${existingSchedule.teacher_id}`);
        }
        if (courseData.teacher_id && courseData.teacher_id !== existingSchedule?.teacher_id) {
          cache.invalidateByPrefixWithEvent(`teacher-dashboard-${courseData.teacher_id}`);
        }
      }, 0);

      return true;
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
      
      // Rollback
      await fetchSchedules();
      
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
      // 1️⃣ Sauvegarder pour rollback
      const previousSchedules = schedules;

      // 2️⃣ Suppression optimiste immédiate
      setSchedules(prevSchedules => 
        prevSchedules.map(daySchedule => ({
          ...daySchedule,
          courses: daySchedule.courses.filter(course => course.id !== id)
        }))
      );

      // 3️⃣ Toast immédiat
      toast({
        title: "✅ Cours supprimé",
        description: "Le cours a été supprimé avec succès.",
      });

      // 4️⃣ Récupérer l'emploi du temps avant suppression pour invalider le cache
      const { data: existingSchedule } = await supabase
        .from('schedules')
        .select('teacher_id')
        .eq('id', id)
        .single();

      // 5️⃣ Suppression réelle en base (arrière-plan)
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;

      // 6️⃣ Invalidations de cache (arrière-plan)
      setTimeout(() => {
        cache.deleteWithEvent('teacher-data-*');
        if (existingSchedule?.teacher_id) {
          cache.invalidateByPrefixWithEvent(`teacher-dashboard-${existingSchedule.teacher_id}`);
        }
      }, 0);

      return true;
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      
      // Rollback
      await fetchSchedules();
      
      toast({
        title: "❌ Erreur",
        description: err instanceof Error ? err.message : "Erreur lors de la suppression.",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchSchedules();
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