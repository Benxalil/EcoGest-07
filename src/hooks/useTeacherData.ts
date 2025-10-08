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
      // Récupérer TOUTES les données en parallèle avec Promise.all
      const [schedulesResult, announcementsResult] = await Promise.all([
        // Schedules par teacher_id
        supabase
          .from('schedules')
          .select('*, classes(*)')
          .eq('school_id', profile.schoolId)
          .eq('teacher_id', teacherId || ''),

        // Announcements (limité à 5)
        supabase
          .from('announcements')
          .select('*')
          .eq('school_id', profile.schoolId)
          .eq('is_published', true)
          .order('published_at', { ascending: false })
          .limit(5)
      ]);

      let schedulesData = schedulesResult.data || [];

      // Fallback par nom si aucun schedule trouvé avec teacher_id
      if (schedulesData.length === 0 && profile.firstName && profile.lastName) {
        const fallbackResult = await supabase
          .from('schedules')
          .select('*, classes(*)')
          .eq('school_id', profile.schoolId)
          .eq('teacher', `${profile.firstName} ${profile.lastName}`);
        
        schedulesData = fallbackResult.data || [];
      }

      // Extraire les class_ids uniques
      const classIds = [...new Set(schedulesData.map(s => s.class_id).filter(Boolean))];

      // Récupérer les classes et students en parallèle
      const [classesResult, studentsResult] = await Promise.all([
        classIds.length > 0
          ? supabase
              .from('classes')
              .select('*')
              .in('id', classIds)
              .order('name')
          : Promise.resolve({ data: [], error: null }),

        classIds.length > 0
          ? supabase
              .from('students')
              .select('class_id')
              .in('class_id', classIds)
              .eq('is_active', true)
          : Promise.resolve({ data: [], error: null })
      ]);

      // Compter les élèves par classe
      const enrollmentMap = new Map<string, number>();
      (studentsResult.data || []).forEach((student: any) => {
        const currentCount = enrollmentMap.get(student.class_id) || 0;
        enrollmentMap.set(student.class_id, currentCount + 1);
      });

      // Ajouter le nombre d'élèves aux classes
      const classesWithEnrollment = (classesResult.data || []).map((classe: any) => ({
        ...classe,
        enrollment_count: enrollmentMap.get(classe.id) || 0
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

      const teacherData: TeacherData = {
        classes: classesWithEnrollment,
        totalStudents: studentsResult.data?.length || 0,
        todaySchedules,
        announcements: announcementsResult.data || [],
        loading: false,
        error: null
      };

      // Mettre en cache pour 30 secondes
      cache.set(cacheKey, teacherData, 30 * 1000);
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
  }, [profile?.schoolId, profile?.id, profile?.firstName, profile?.lastName, teacherId, cache, cacheKey]);

  // Fetch initial
  useEffect(() => {
    if (!profileLoading && profile?.schoolId) {
      fetchTeacherData();
    }
  }, [profileLoading, profile?.schoolId, fetchTeacherData]);

  // Realtime - UN SEUL CHANNEL pour tout
  useEffect(() => {
    if (!profile?.schoolId) return;

    const handleUpdate = () => {
      cache.deleteWithEvent(cacheKey);
      setTimeout(fetchTeacherData, 300);
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
