import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOptimizedUserData } from './useOptimizedUserData';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedCache } from './useOptimizedCache';

export interface TeacherDashboardData {
  classes: any[];
  students: any[];
  todaySchedules: any[];
  announcements: any[];
  stats: {
    totalClasses: number;
    totalStudents: number;
    todayCourses: number;
    totalAnnouncements: number;
  };
  loading: boolean;
  error: string | null;
}

export const useOptimizedTeacherData = () => {
  const { profile, teacherId, loading: userLoading } = useOptimizedUserData();
  const cache = useOptimizedCache();
  
  const [data, setData] = useState<TeacherDashboardData>({
    classes: [],
    students: [],
    todaySchedules: [],
    announcements: [],
    stats: {
      totalClasses: 0,
      totalStudents: 0,
      todayCourses: 0,
      totalAnnouncements: 0
    },
    loading: true,
    error: null
  });

  const fetchTeacherData = useCallback(async () => {
    if (!profile?.schoolId || !teacherId || userLoading || profile.role !== 'teacher') {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    const cacheKey = `teacher-dashboard-${teacherId}`;
    
    // Vérifier le cache (2 minutes pour données enseignant)
    const cached = cache.get<Omit<TeacherDashboardData, 'loading' | 'error'>>(cacheKey);
    if (cached) {
      setData({ ...cached, loading: false, error: null });
      return;
    }

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      const today = new Date();
      const dayOfWeek = today.getDay();

      // Requêtes optimisées en parallèle avec sélection minimale
      const [
        { data: schedulesData, error: schedulesError },
        { data: teacherSubjectsData, error: teacherSubjectsError },
        { data: announcementsData, error: announcementsError }
      ] = await Promise.all([
        supabase
          .from('schedules')
          .select('id, subject, start_time, end_time, class_id, classes(name)')
          .eq('teacher_id', teacherId)
          .eq('school_id', profile.schoolId)
          .eq('day_of_week', dayOfWeek),
        supabase
          .from('teacher_subjects')
          .select(`
            class_id,
            classes(id, name, effectif),
            subjects(id, name)
          `)
          .eq('teacher_id', teacherId)
          .eq('school_id', profile.schoolId),
        supabase
          .from('announcements')
          .select('id, title, content, created_at, priority')
          .eq('school_id', profile.schoolId)
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      if (schedulesError || teacherSubjectsError || announcementsError) {
        throw new Error(schedulesError?.message || teacherSubjectsError?.message || announcementsError?.message);
      }

      // Extraire les classes uniques
      const uniqueClasses = Array.from(
        new Map(
          (teacherSubjectsData || [])
            .filter(ts => ts.classes)
            .map(ts => [ts.classes.id, ts.classes])
        ).values()
      );

      // Récupérer les étudiants uniquement pour les classes de l'enseignant
      const classIds = uniqueClasses.map(c => c.id);
      let studentsData: any[] = [];
      
      if (classIds.length > 0) {
        const { data: students } = await supabase
          .from('students')
          .select('id, first_name, last_name, class_id')
          .eq('school_id', profile.schoolId)
          .eq('is_active', true)
          .in('class_id', classIds);
        
        studentsData = students || [];
      }

      const teacherData = {
        classes: uniqueClasses,
        students: studentsData,
        todaySchedules: schedulesData || [],
        announcements: announcementsData || [],
        stats: {
          totalClasses: uniqueClasses.length,
          totalStudents: studentsData.length,
          todayCourses: (schedulesData || []).length,
          totalAnnouncements: (announcementsData || []).length
        }
      };

      // Cache pour 2 minutes (données plus dynamiques)
      cache.set(cacheKey, teacherData, 2 * 60 * 1000);
      
      setData({
        ...teacherData,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Teacher data fetch error:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Error loading teacher data'
      }));
    }
  }, [profile?.schoolId, teacherId, userLoading, profile?.role, cache]);

  useEffect(() => {
    fetchTeacherData();
  }, [fetchTeacherData]);

  return useMemo(() => ({
    ...data,
    refetch: fetchTeacherData
  }), [data, fetchTeacherData]);
};
