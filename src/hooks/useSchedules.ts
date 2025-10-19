import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useToast } from '@/hooks/use-toast';
import { unifiedCache, CacheTTL } from '@/utils/unifiedCache';

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
  const isFetchingRef = useRef(false);

  const fetchSchedules = useCallback(async () => {
    if (!userProfile?.schoolId || !classId || isFetchingRef.current) {
      setLoading(false);
      setSchedules([]);
      return;
    }

    isFetchingRef.current = true;

    // Vérifier le cache d'abord
    const cacheKey = `schedules-${classId}`;
    const cached = unifiedCache.get(cacheKey) as DaySchedule[] | null;
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
      unifiedCache.set(cacheKey, organizedSchedules, CacheTTL.DYNAMIC);
      
      setSchedules(organizedSchedules);
      setError(null);
    } catch (err) {
      console.error('Erreur lors de la récupération des emplois du temps:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setSchedules([]);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [userProfile?.schoolId, classId]);

  const createCourse = async (courseData: CreateCourseData) => {
    console.log('🔵 [createCourse] START:', courseData);
    
    if (!userProfile?.schoolId) {
      toast({
        title: "❌ Erreur",
        description: "École non identifiée",
        variant: "destructive"
      });
      return false;
    }

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

    // Créer un ID temporaire pour l'UI optimiste
    const tempId = `temp-${Date.now()}`;
    const optimisticCourse: Course = {
      id: tempId,
      subject: courseData.subject,
      teacher: courseData.teacher || '',
      start_time: courseData.start_time,
      end_time: courseData.end_time,
      day: dbDay,
      class_id: courseData.class_id,
      school_id: userProfile.schoolId
    };

    // Invalider le cache immédiatement
    const cacheKey = `schedules-${classId}`;
    unifiedCache.delete(cacheKey);

    // Mise à jour optimiste de l'UI immédiatement
    setSchedules(prevSchedules => {
      const updatedSchedules = prevSchedules.map(daySchedule => {
        if (daySchedule.day === dbDay) {
          return {
            ...daySchedule,
            courses: [...daySchedule.courses, optimisticCourse].sort((a, b) => 
              a.start_time.localeCompare(b.start_time)
            )
          };
        }
        return daySchedule;
      });
      // Mettre à jour le cache avec les nouvelles données
      unifiedCache.set(cacheKey, updatedSchedules, CacheTTL.DYNAMIC);
      return updatedSchedules;
    });
    
    console.log('🟡 [createCourse] Optimistic update done');

    // Insertion DB - directement sans timeout
    try {
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
        console.error('🔴 [createCourse] DB insert failed:', error);
        // Rollback en cas d'erreur
        setSchedules(prevSchedules => 
          prevSchedules.map(daySchedule => ({
            ...daySchedule,
            courses: daySchedule.courses.filter(course => course.id !== tempId)
          }))
        );
        unifiedCache.delete(cacheKey);

        if (error.message.includes('schedules_no_time_conflict') || error.code === '23505') {
          toast({
            title: "⚠️ Conflit d'horaire",
            description: "Un cours existe déjà à ce créneau horaire. Changement annulé.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "❌ Erreur de sauvegarde",
            description: `Impossible d'enregistrer le cours: ${error.message}`,
            variant: "destructive",
          });
        }
        return false;
      }
      
      console.log('🟢 [createCourse] DB insert success:', insertedCourse);

      // Remplacer l'ID temporaire par l'ID réel de la DB
      setSchedules(prevSchedules => {
        const updatedSchedules = prevSchedules.map(daySchedule => ({
          ...daySchedule,
          courses: daySchedule.courses.map(course => 
            course.id === tempId ? { ...course, id: insertedCourse.id } : course
          )
        }));
        unifiedCache.set(cacheKey, updatedSchedules, CacheTTL.DYNAMIC);
        return updatedSchedules;
      });

      // Toast de succès après confirmation DB
      toast({
        title: "✅ Cours ajouté",
        description: `Le cours ${courseData.subject} a été enregistré avec succès.`,
      });

      // Invalidations de cache
      if (courseData.teacher_id) {
        unifiedCache.deleteByPrefix(`teacher-dashboard-${courseData.teacher_id}`);
        unifiedCache.delete('teacher-data-*');
        window.dispatchEvent(new CustomEvent('schedule-updated', { 
          detail: { teacherId: courseData.teacher_id, classId: courseData.class_id }
        }));
      }

      return true;
    } catch (err) {
      console.error('🔴 [createCourse] Exception caught:', err);
      // Rollback
      setSchedules(prevSchedules => 
        prevSchedules.map(daySchedule => ({
          ...daySchedule,
          courses: daySchedule.courses.filter(course => course.id !== tempId)
        }))
      );
      unifiedCache.delete(cacheKey);
      
      if (err instanceof Error && err.message.includes('Timeout')) {
        toast({
          title: "⏳ Timeout",
          description: "Le serveur ne répond pas. Veuillez réessayer.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "❌ Erreur de connexion",
          description: "Impossible de communiquer avec le serveur. Vérifiez votre connexion.",
          variant: "destructive",
        });
      }
      return false;
    }
  };

  const updateCourse = async (id: string, courseData: Partial<CreateCourseData>) => {
    if (!userProfile?.schoolId) return false;

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

    // Sauvegarder l'ancien état pour rollback
    const previousSchedules = schedules;

    // Invalider le cache immédiatement
    const cacheKey = `schedules-${classId}`;
    unifiedCache.delete(cacheKey);

    // Mise à jour optimiste de l'UI immédiatement
    setSchedules(prevSchedules => {
      const updatedSchedules = prevSchedules.map(daySchedule => ({
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
      }));
      // Mettre à jour le cache avec les nouvelles données
      unifiedCache.set(cacheKey, updatedSchedules, CacheTTL.DYNAMIC);
      return updatedSchedules;
    });

    // Mise à jour DB - ATTENDRE la confirmation
    try {
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

      if (error) {
        console.error('❌ Erreur DB lors de la mise à jour:', error);
        // Rollback en cas d'erreur
        setSchedules(previousSchedules);
        unifiedCache.delete(cacheKey);
        toast({
          title: "❌ Erreur de sauvegarde",
          description: `Impossible de mettre à jour le cours: ${error.message}`,
          variant: "destructive",
        });
        return false;
      }

      // Toast de succès après confirmation DB
      toast({
        title: "✅ Cours mis à jour",
        description: "Le cours a été enregistré avec succès.",
      });

      // Invalidations de cache
      unifiedCache.delete('teacher-data-*');
      
      return true;
    } catch (err) {
      console.error('❌ Exception lors de la mise à jour:', err);
      // Rollback
      setSchedules(previousSchedules);
      unifiedCache.delete(cacheKey);
      toast({
        title: "❌ Erreur de connexion",
        description: "Impossible de communiquer avec le serveur. Vérifiez votre connexion.",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteCourse = async (id: string) => {
    if (!userProfile?.schoolId) return false;

    // Sauvegarder l'ancien état pour rollback
    const previousSchedules = schedules;

    // Invalider le cache immédiatement
    const cacheKey = `schedules-${classId}`;
    unifiedCache.delete(cacheKey);

    // Suppression optimiste de l'UI immédiatement
    setSchedules(prevSchedules => {
      const updatedSchedules = prevSchedules.map(daySchedule => ({
        ...daySchedule,
        courses: daySchedule.courses.filter(course => course.id !== id)
      }));
      // Mettre à jour le cache avec les nouvelles données
      unifiedCache.set(cacheKey, updatedSchedules, CacheTTL.DYNAMIC);
      return updatedSchedules;
    });

    // Suppression DB - ATTENDRE la confirmation
    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) {
        console.error('❌ Erreur DB lors de la suppression:', error);
        // Rollback en cas d'erreur
        setSchedules(previousSchedules);
        unifiedCache.delete(cacheKey);
        toast({
          title: "❌ Erreur de sauvegarde",
          description: `Impossible de supprimer le cours: ${error.message}`,
          variant: "destructive",
        });
        return false;
      }

      // Toast de succès après confirmation DB
      toast({
        title: "✅ Cours supprimé",
        description: "Le cours a été supprimé définitivement.",
      });

      // Invalidations de cache
      unifiedCache.delete('teacher-data-*');
      
      return true;
    } catch (err) {
      console.error('❌ Exception lors de la suppression:', err);
      // Rollback
      setSchedules(previousSchedules);
      unifiedCache.delete(cacheKey);
      toast({
        title: "❌ Erreur de connexion",
        description: "Impossible de communiquer avec le serveur. Vérifiez votre connexion.",
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