import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedUserData } from './useUnifiedUserData';
import { multiLevelCache, CacheTTL, CacheKeys } from '@/utils/multiLevelCache';
import { filterAnnouncementsByRole, type Announcement } from '@/utils/announcementFilters';

// Interfaces pour typage précis
interface ClassInfo {
  id: string;
  name: string;
  level: string;
  section: string | null;
}

interface StudentData {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string;
  class_id: string | null;
  classes?: ClassInfo;
}

interface SubjectInfo {
  name: string;
  color: string | null;
}

interface ScheduleData {
  id: string;
  start_time: string;
  end_time: string;
  room: string | null;
  subject_id: string | null;
  activity_name: string | null;
  subject: string;
  subjects?: SubjectInfo;
}

interface StudentDashboardData {
  student: StudentData | null;
  classInfo: ClassInfo | null;
  todaySchedules: ScheduleData[];
  announcements: Announcement[];
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
      // 🚀 UNE SEULE REQUÊTE via la vue optimisée
      const { data, error } = await supabase
        .from('student_dashboard_view' as any)
        .select('*')
        .eq('user_id', profile.id)
        .single();

      if (error) throw error;

      // Parser les données JSON de la vue
      const viewData = data as any;
      const classInfo = typeof viewData.class_info === 'string' ? JSON.parse(viewData.class_info) : viewData.class_info;
      const todaySchedules = typeof viewData.today_schedules === 'string' ? JSON.parse(viewData.today_schedules) : viewData.today_schedules;
      const announcements = typeof viewData.announcements === 'string' ? JSON.parse(viewData.announcements) : viewData.announcements;

      // Filtrer les annonces pour les élèves
      const filteredAnnouncements = filterAnnouncementsByRole(
        announcements || [],
        'student',
        false
      ).slice(0, 3) as Announcement[];

      const result: StudentDashboardData = {
        student: {
          id: viewData.student_id,
          first_name: viewData.first_name,
          last_name: viewData.last_name,
          student_number: viewData.student_number,
          class_id: viewData.class_id,
          classes: classInfo
        },
        classInfo: classInfo || null,
        todaySchedules: todaySchedules || [],
        announcements: filteredAnnouncements,
        loading: false,
        error: null
      };

      // 🔒 Cache mixte: structure en session, pas d'autres données élèves
      multiLevelCache.set(cacheKey, result, CacheTTL.SCHEDULES, 'session', false);
      
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
      void fetchDashboardData();
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
