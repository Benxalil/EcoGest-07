import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOptimizedUserData } from './useOptimizedUserData';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedCache } from './useOptimizedCache';
import { filterAnnouncementsByRole } from '@/utils/announcementFilters';

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
    
    // Vérifier le cache (30 secondes pour emplois du temps - données dynamiques)
    const cached = cache.get<Omit<TeacherDashboardData, 'loading' | 'error'>>(cacheKey);
    if (cached) {
      setData({ ...cached, loading: false, error: null });
      return;
    }

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      const today = new Date();
      const dayOfWeek = today.getDay();

      // Une seule requête optimisée pour récupérer classes + emplois du temps
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('schedules')
        .select(`
          id,
          subject,
          start_time,
          end_time,
          day_of_week,
          class_id,
          classes(id, name, effectif)
        `)
        .eq('teacher_id', teacherId)
        .eq('school_id', profile.schoolId);

      if (schedulesError) {
        throw new Error(schedulesError.message);
      }

      // Extraire les classes uniques depuis les schedules
      const uniqueClassesMap = new Map();
      (schedulesData || []).forEach(schedule => {
        if (schedule.classes && !uniqueClassesMap.has(schedule.classes.id)) {
          uniqueClassesMap.set(schedule.classes.id, schedule.classes);
        }
      });
      const uniqueClasses = Array.from(uniqueClassesMap.values());

      // Filtrer les emplois du temps d'aujourd'hui
      const todaySchedules = (schedulesData || []).filter(s => s.day_of_week === dayOfWeek);

      // Récupérer les étudiants et annonces en parallèle
      const classIds = uniqueClasses.map(c => c.id);
      const [studentsResult, announcementsResult] = await Promise.all([
        classIds.length > 0
          ? supabase
              .from('students')
              .select('id, first_name, last_name, class_id')
              .eq('school_id', profile.schoolId)
              .eq('is_active', true)
              .in('class_id', classIds)
          : Promise.resolve({ data: [] }),
        supabase
          .from('announcements')
          .select('id, title, content, created_at, priority')
          .eq('school_id', profile.schoolId)
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      // Filtrer les annonces pour les enseignants
      const filteredAnnouncements = filterAnnouncementsByRole(
        announcementsResult.data || [],
        'teacher',
        false
      );

      const teacherData = {
        classes: uniqueClasses,
        students: studentsResult.data || [],
        todaySchedules: todaySchedules,
        announcements: filteredAnnouncements,
        stats: {
          totalClasses: uniqueClasses.length,
          totalStudents: (studentsResult.data || []).length,
          todayCourses: todaySchedules.length,
          totalAnnouncements: filteredAnnouncements.length
        }
      };

      // Cache pour 30 secondes (données d'emploi du temps dynamiques)
      cache.set(cacheKey, teacherData, 30 * 1000);
      
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

    // Supabase Realtime - Écoute des changements multiples
    if (!profile?.schoolId || !teacherId || profile.role !== 'teacher') {
      return;
    }

    const cacheKey = `teacher-dashboard-${teacherId}`;
    
    // Canal pour les emplois du temps
    const schedulesChannel = supabase
      .channel('teacher-schedules-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedules',
          filter: `school_id=eq.${profile.schoolId}`
        },
        (payload) => {
          console.log('Schedule change detected:', payload);
          cache.deleteWithEvent(cacheKey);
          fetchTeacherData();
        }
      )
      .subscribe();

    // Canal pour les classes
    const classesChannel = supabase
      .channel('teacher-classes-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'classes',
          filter: `school_id=eq.${profile.schoolId}`
        },
        (payload) => {
          console.log('Class change detected:', payload);
          cache.deleteWithEvent(cacheKey);
          fetchTeacherData();
        }
      )
      .subscribe();

    // Canal pour les étudiants
    const studentsChannel = supabase
      .channel('teacher-students-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students',
          filter: `school_id=eq.${profile.schoolId}`
        },
        (payload) => {
          console.log('Student change detected:', payload);
          cache.deleteWithEvent(cacheKey);
          fetchTeacherData();
        }
      )
      .subscribe();

    // Canal pour les annonces
    const announcementsChannel = supabase
      .channel('teacher-announcements-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements',
          filter: `school_id=eq.${profile.schoolId}`
        },
        (payload) => {
          console.log('Announcement change detected:', payload);
          cache.deleteWithEvent(cacheKey);
          fetchTeacherData();
        }
      )
      .subscribe();

    // Canal pour les examens
    const examsChannel = supabase
      .channel('teacher-exams-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exams',
          filter: `school_id=eq.${profile.schoolId}`
        },
        (payload) => {
          console.log('Exam change detected:', payload);
          cache.deleteWithEvent(cacheKey);
          fetchTeacherData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(schedulesChannel);
      supabase.removeChannel(classesChannel);
      supabase.removeChannel(studentsChannel);
      supabase.removeChannel(announcementsChannel);
      supabase.removeChannel(examsChannel);
    };
  }, [fetchTeacherData, profile?.schoolId, teacherId, profile?.role, cache]);

  return useMemo(() => ({
    ...data,
    refetch: fetchTeacherData
  }), [data, fetchTeacherData]);
};
