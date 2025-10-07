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
    
    // Vérifier le cache (2 minutes pour réduire les requêtes)
    const cached = cache.get<Omit<TeacherDashboardData, 'loading' | 'error'>>(cacheKey);
    if (cached) {
      setData({ ...cached, loading: false, error: null });
      return;
    }

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      const today = new Date();
      const dayOfWeek = today.getDay();

      // Requête optimisée - seulement les schedules du professeur
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('schedules')
        .select('id, subject, start_time, end_time, day_of_week, class_id')
        .eq('teacher_id', teacherId)
        .eq('school_id', profile.schoolId);

      if (schedulesError) {
        throw new Error(schedulesError.message);
      }

      // Extraire les class_ids uniques
      const classIds = [...new Set((schedulesData || []).map(s => s.class_id))];
      
      // Filtrer les emplois du temps d'aujourd'hui
      const todaySchedules = (schedulesData || []).filter(s => s.day_of_week === dayOfWeek);

      // Récupérer classes, étudiants et annonces en parallèle
      const [classesResult, studentsResult, announcementsResult] = await Promise.all([
        classIds.length > 0
          ? supabase
              .from('classes')
              .select('id, name, effectif')
              .in('id', classIds)
          : Promise.resolve({ data: [] }),
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
        classes: classesResult.data || [],
        students: studentsResult.data || [],
        todaySchedules: todaySchedules,
        announcements: filteredAnnouncements,
        stats: {
          totalClasses: (classesResult.data || []).length,
          totalStudents: (studentsResult.data || []).length,
          todayCourses: todaySchedules.length,
          totalAnnouncements: filteredAnnouncements.length
        }
      };

      // Cache pour 2 minutes (réduire la charge serveur)
      cache.set(cacheKey, teacherData, 120 * 1000);
      
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

    // Supabase Realtime - Seulement 2 canaux essentiels pour éviter surcharge
    if (!profile?.schoolId || !teacherId || profile.role !== 'teacher') {
      return;
    }

    const cacheKey = `teacher-dashboard-${teacherId}`;
    let debounceTimer: NodeJS.Timeout;
    
    // Fonction debounced pour éviter trop de requêtes simultanées
    const debouncedFetch = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        cache.deleteWithEvent(cacheKey);
        fetchTeacherData();
      }, 500);
    };
    
    // Canal unique pour toutes les tables importantes
    const realtimeChannel = supabase
      .channel('teacher-dashboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedules',
          filter: `teacher_id=eq.${teacherId}`
        },
        () => debouncedFetch()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'announcements',
          filter: `school_id=eq.${profile.schoolId}`
        },
        () => debouncedFetch()
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(realtimeChannel);
    };
  }, [fetchTeacherData, profile?.schoolId, teacherId, profile?.role, cache]);

  return useMemo(() => ({
    ...data,
    refetch: fetchTeacherData
  }), [data, fetchTeacherData]);
};
