import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedUserData } from './useOptimizedUserData';
import { useOptimizedCache } from './useOptimizedCache';
import type { ClassData } from './useClasses';

export interface TeacherData {
  classes: ClassData[];
  totalStudents: number;
  todaySchedules: any[];
  announcements: any[];
  loading: boolean;
  error: string | null;
}

export const useTeacherData = () => {
  const [data, setData] = useState<TeacherData>({
    classes: [],
    totalStudents: 0,
    todaySchedules: [],
    announcements: [],
    loading: true,
    error: null
  });

  const { profile, teacherId, loading: profileLoading } = useOptimizedUserData();
  const cache = useOptimizedCache();
  const isFetchingRef = useRef(false);
  const cacheKey = `teacher-data-${profile?.id}`;

  const fetchTeacherData = useCallback(async () => {
    if (isFetchingRef.current || !profile?.schoolId || !profile?.id) {
      return;
    }

    // Vérifier le cache
    const cachedData = cache.get(cacheKey) as TeacherData | null;
    if (cachedData) {
      setData({ ...cachedData, loading: false, error: null });
      return;
    }

    isFetchingRef.current = true;
    setData(prev => ({ ...prev, loading: true, error: null }));

    try {
      // OPTIMISÉ: Une seule requête combinée avec JOIN pour tout récupérer
      const [schedulesResult, announcementsResult] = await Promise.all([
        // Schedules avec classes et students en une seule requête
        teacherId
          ? supabase
              .from('schedules')
              .select(`
                *,
                classes!inner (
                  *,
                  students!students_class_id_fkey (
                    id,
                    class_id,
                    is_active
                  )
                )
              `)
              .eq('school_id', profile.schoolId)
              .eq('teacher_id', teacherId)
              .limit(50) // Limite raisonnable
          : Promise.resolve({ data: [], error: null }),

        // Announcements (limité à 5)
        supabase
          .from('announcements')
          .select('*')
          .eq('school_id', profile.schoolId)
          .eq('is_published', true)
          .order('published_at', { ascending: false })
          .limit(5)
      ]);

      const schedulesData = schedulesResult.data || [];

      // Extraire classes uniques avec leurs élèves
      const classesMap = new Map<string, any>();
      const enrollmentMap = new Map<string, number>();

      schedulesData.forEach((schedule: any) => {
        if (schedule.classes) {
          const classId = schedule.classes.id;
          
          if (!classesMap.has(classId)) {
            classesMap.set(classId, {
              ...schedule.classes,
              enrollment_count: 0
            });
          }

          // Compter les élèves actifs
          const activeStudents = (schedule.classes.students || []).filter(
            (s: any) => s.is_active
          );
          enrollmentMap.set(classId, activeStudents.length);
        }
      });

      // Finaliser les classes avec enrollment
      const classesWithEnrollment = Array.from(classesMap.values()).map(classe => ({
        ...classe,
        enrollment_count: enrollmentMap.get(classe.id) || 0,
        students: undefined // Nettoyer les données imbriquées
      }));

      // Filtrer les cours d'aujourd'hui
      const today = new Date().getDay();
      const dayMapping: { [key: number]: string } = {
        1: 'LUNDI', 2: 'MARDI', 3: 'MERCREDI', 
        4: 'JEUDI', 5: 'VENDREDI', 6: 'SAMEDI', 0: 'DIMANCHE'
      };
      const todaySchedules = schedulesData.filter(
        s => s.day?.toUpperCase() === dayMapping[today]
      );

      // Compter le total d'élèves
      const totalStudents = Array.from(enrollmentMap.values()).reduce((sum, count) => sum + count, 0);

      const teacherData: TeacherData = {
        classes: classesWithEnrollment,
        totalStudents,
        todaySchedules,
        announcements: announcementsResult.data || [],
        loading: false,
        error: null
      };

      // Cache plus agressif: 5 minutes
      cache.set(cacheKey, teacherData, 5 * 60 * 1000);
      setData(teacherData);

    } catch (err: any) {
      console.error('[useTeacherData] Error:', err);
      setData(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Erreur de chargement'
      }));
    } finally {
      isFetchingRef.current = false;
    }
  }, [profile?.schoolId, profile?.id, teacherId, cache, cacheKey]);

  // Fetch initial
  useEffect(() => {
    if (!profileLoading && profile?.schoolId) {
      fetchTeacherData();
    }
  }, [profileLoading, profile?.schoolId, fetchTeacherData]);

  // Realtime optimisé avec debounce
  useEffect(() => {
    if (!profile?.schoolId) return;

    let timeoutId: NodeJS.Timeout;
    const handleUpdate = () => {
      cache.deleteWithEvent(cacheKey);
      // Debounce augmenté à 1 seconde pour éviter les refetch multiples
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(fetchTeacherData, 1000);
    };

    const channel = supabase
      .channel('teacher-all-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'schedules',
        filter: `school_id=eq.${profile.schoolId}`
      }, handleUpdate)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'students',
        filter: `school_id=eq.${profile.schoolId}`
      }, handleUpdate)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'announcements',
        filter: `school_id=eq.${profile.schoolId}`
      }, handleUpdate)
      .subscribe();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [profile?.schoolId, fetchTeacherData, cache, cacheKey]);

  return {
    classes: data.classes,
    totalStudents: data.totalStudents,
    todaySchedules: data.todaySchedules,
    announcements: data.announcements,
    loading: data.loading,
    error: data.error,
    refetch: fetchTeacherData
  };
};
