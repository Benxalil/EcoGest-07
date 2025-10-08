import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOptimizedUserData } from './useOptimizedUserData';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedCache } from './useOptimizedCache';
import { filterAnnouncementsByRole } from '@/utils/announcementFilters';
import { retryWithBackoff } from '@/utils/retryWithBackoff';

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

      // Requête optimisée avec retry - schedules du professeur par teacher_id
      let schedulesData = await retryWithBackoff(async () => {
        const { data, error } = await supabase
          .from('schedules')
          .select('id, subject, start_time, end_time, day_of_week, class_id, classes(id, name)')
          .eq('teacher_id', teacherId)
          .eq('school_id', profile.schoolId);
        
        if (error) throw error;
        return data || [];
      });

      // Fallback: si aucun schedule avec teacher_id, chercher par nom
      if (schedulesData.length === 0) {
        const teacherFullName = `${profile.firstName} ${profile.lastName}`;
        schedulesData = await retryWithBackoff(async () => {
          const { data, error } = await supabase
            .from('schedules')
            .select('id, subject, start_time, end_time, day_of_week, class_id, classes(id, name)')
            .eq('teacher', teacherFullName)
            .eq('school_id', profile.schoolId);
          
          if (error) throw error;
          return data || [];
        });
      }

      // Extraire les class_ids uniques
      const classIds = [...new Set(schedulesData.map(s => s.class_id))];
      
      // Filtrer les emplois du temps d'aujourd'hui
      const todaySchedules = schedulesData.filter(s => s.day_of_week === dayOfWeek);

      // Récupérer étudiants et annonces en parallèle (si classes existent)
      const [studentsData, announcementsData] = await Promise.all([
        classIds.length > 0
          ? retryWithBackoff(async () => {
              const { data, error } = await supabase
                .from('students')
                .select('id, first_name, last_name, class_id')
                .eq('school_id', profile.schoolId)
                .eq('is_active', true)
                .in('class_id', classIds);
              if (error) throw error;
              return data || [];
            })
          : Promise.resolve([]),
        retryWithBackoff(async () => {
          const { data, error } = await supabase
            .from('announcements')
            .select('id, title, content, created_at, priority')
            .eq('school_id', profile.schoolId)
            .eq('is_published', true)
            .order('created_at', { ascending: false })
            .limit(5);
          if (error) throw error;
          return data || [];
        })
      ]);

      // Extraire les classes uniques depuis schedulesData
      const classesMap = new Map();
      schedulesData.forEach(schedule => {
        if (schedule.classes && !classesMap.has(schedule.class_id)) {
          classesMap.set(schedule.class_id, schedule.classes);
        }
      });
      const classes = Array.from(classesMap.values());

      // Filtrer les annonces pour les enseignants
      const filteredAnnouncements = filterAnnouncementsByRole(
        announcementsData,
        'teacher',
        false
      );

      const teacherData = {
        classes: classes,
        students: studentsData,
        todaySchedules: todaySchedules,
        announcements: filteredAnnouncements,
        stats: {
          totalClasses: classes.length,
          totalStudents: studentsData.length,
          todayCourses: todaySchedules.length,
          totalAnnouncements: filteredAnnouncements.length
        }
      };

      // Cache pour 30 secondes (mise à jour plus rapide)
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
        error: error instanceof Error ? error.message : 'Erreur de chargement'
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
          filter: `school_id=eq.${profile.schoolId}` // Écouter TOUS les schedules de l'école
        },
        (payload) => {
          // Filtrer côté client pour cet enseignant
          const teacherFullName = `${profile.firstName} ${profile.lastName}`;
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          const isForThisTeacher = 
            newRecord?.teacher_id === teacherId || 
            oldRecord?.teacher_id === teacherId ||
            newRecord?.teacher === teacherFullName ||
            oldRecord?.teacher === teacherFullName;
          
          if (isForThisTeacher) {
            cache.deleteWithEvent(cacheKey); // Invalider immédiatement
            debouncedFetch();
          }
        }
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
