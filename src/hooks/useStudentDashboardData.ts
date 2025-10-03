import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedUserData } from './useUnifiedUserData';
import { multiLevelCache, CacheTTL, CacheKeys } from '@/utils/multiLevelCache';
import { filterAnnouncementsByRole } from '@/utils/announcementFilters';

interface StudentDashboardData {
  student: any;
  classInfo: any;
  todaySchedules: any[];
  announcements: any[];
  loading: boolean;
  error: string | null;
}

export const useStudentDashboardData = () => {
  const { profile } = useUnifiedUserData();
  
  const [data, setData] = useState<StudentDashboardData>({
    student: null,
    classInfo: null,
    todaySchedules: [],
    announcements: [],
    loading: false,
    error: null
  });

  const fetchDashboardData = useCallback(async () => {
    if (!profile?.id || !profile?.schoolId) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    // Vérifier le cache multi-niveaux (stale-while-revalidate)
    const cacheKey = CacheKeys.dashboard(profile.id, 'student');
    const cached = multiLevelCache.get<StudentDashboardData>(cacheKey, 'memory-first');
    
    if (cached && cached.student) {
      setData({ ...cached, loading: false });
      // Continuer en arrière-plan pour rafraîchir si nécessaire
    } else {
      setData(prev => ({ ...prev, loading: true }));
    }

    try {
      // Faire toutes les requêtes en parallèle
      const [studentResult, announcementsResult] = await Promise.all([
        // Récupérer l'élève avec sa classe
        supabase
          .from('students')
          .select('id, first_name, last_name, student_number, class_id, classes(id, name, level, section)')
          .eq('user_id', profile.id)
          .eq('school_id', profile.schoolId)
          .maybeSingle(),
        
        // Récupérer les annonces
        supabase
          .from('announcements')
          .select('id, title, content, created_at, priority, is_urgent, target_audience')
          .eq('school_id', profile.schoolId)
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      if (studentResult.error) throw studentResult.error;

      let schedules: any[] = [];
      
      // Si l'élève a une classe, récupérer l'emploi du temps du jour
      if (studentResult.data?.class_id) {
        const today = new Date().getDay();
        const { data: schedulesData, error: schedulesError } = await supabase
          .from('schedules')
          .select('id, start_time, end_time, room, subject_id, activity_name, subject, subjects(name, color)')
          .eq('class_id', studentResult.data.class_id)
          .eq('day_of_week', today)
          .order('start_time');

        if (!schedulesError && schedulesData) {
          schedules = schedulesData;
        }
      }

      // Filtrer les annonces pour les élèves
      const filteredAnnouncements = filterAnnouncementsByRole(
        announcementsResult.data || [],
        'student',
        false
      );

      const result: StudentDashboardData = {
        student: studentResult.data,
        classInfo: studentResult.data?.classes || null,
        todaySchedules: schedules,
        announcements: filteredAnnouncements,
        loading: false,
        error: null
      };

      // Mettre en cache pour 5 minutes dans la session
      multiLevelCache.set(cacheKey, result, CacheTTL.SCHEDULES, 'session');
      
      setData(result);
    } catch (error) {
      const errorResult: StudentDashboardData = {
        student: null,
        classInfo: null,
        todaySchedules: [],
        announcements: [],
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      setData(errorResult);
    }
  }, [profile]);

  useEffect(() => {
    if (profile) {
      fetchDashboardData();
    }
  }, [profile, fetchDashboardData]);

  const refetch = useCallback(() => {
    if (profile?.id) {
      multiLevelCache.delete(CacheKeys.dashboard(profile.id, 'student'));
      return fetchDashboardData();
    }
  }, [profile, fetchDashboardData]);

  return {
    ...data,
    refetch
  };
};
