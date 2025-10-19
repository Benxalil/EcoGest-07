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
  day?: string;
  class_id?: string;
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
      // ✅ Requêtes directes optimisées
      const [studentResult, schedulesResult, announcementsResult] = await Promise.all([
        // Student avec class info
        supabase
          .from('students')
          .select(`
            id,
            first_name,
            last_name,
            student_number,
            class_id,
            classes:class_id (
              id,
              name,
              level,
              section
            )
          `)
          .eq('user_id', profile.id)
          .eq('school_id', profile.schoolId)
          .single(),

        // Emploi du temps d'aujourd'hui
        supabase
          .from('schedules')
          .select(`
            id,
            start_time,
            end_time,
            room,
            subject_id,
            activity_name,
            subject,
            day,
            class_id,
            subjects (
              name,
              color
            )
          `)
          .eq('school_id', profile.schoolId)
          .limit(50),

        // Annonces
        supabase
          .from('announcements')
          .select('*')
          .eq('school_id', profile.schoolId)
          .eq('is_published', true)
          .order('published_at', { ascending: false })
          .limit(20)
      ]);

      if (studentResult.error) throw studentResult.error;

      const student = studentResult.data;
      
      // Filtrer les emplois du temps pour la classe de l'élève et aujourd'hui
      const today = new Date().getDay();
      const dayMapping: { [key: number]: string } = {
        1: 'LUNDI', 2: 'MARDI', 3: 'MERCREDI', 
        4: 'JEUDI', 5: 'VENDREDI', 6: 'SAMEDI', 0: 'DIMANCHE'
      };
      
      const todaySchedules = (schedulesResult.data || []).filter(
        (s: any) => s.class_id === student.class_id && s.day?.toUpperCase() === dayMapping[today]
      );

      // Filtrer les annonces pour les élèves
      const filteredAnnouncements = filterAnnouncementsByRole(
        announcementsResult.data || [],
        'student',
        false
      ).slice(0, 3) as Announcement[];

      const result: StudentDashboardData = {
        student: {
          id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          student_number: student.student_number,
          class_id: student.class_id,
          classes: student.classes
        },
        classInfo: student.classes || null,
        todaySchedules,
        announcements: filteredAnnouncements,
        loading: false,
        error: null
      };

      // Cache pendant 5 minutes
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
