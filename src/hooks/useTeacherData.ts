import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedUserData } from './useOptimizedUserData';
import { unifiedCache, CacheTTL } from '@/utils/unifiedCache';
import { filterAnnouncementsByRole, type Announcement } from '@/utils/announcementFilters';
import type { ClassData } from './useClasses';

// Interfaces pour typage précis
interface ScheduleStudent {
  id: string;
  class_id: string | null;
  is_active: boolean;
}

interface ScheduleClass extends ClassData {
  students?: ScheduleStudent[];
}

interface TeacherSchedule {
  id: string;
  school_id: string;
  teacher_id: string | null;
  class_id: string;
  subject_id: string | null;
  day: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject: string;
  teacher?: string | null;
  room?: string | null;
  activity_name?: string | null;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  classes?: ScheduleClass;
}

export interface TeacherData {
  classes: ClassData[];
  totalStudents: number;
  todaySchedules: TeacherSchedule[];
  announcements: Announcement[];
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
  const isFetchingRef = useRef(false);
  const cacheKey = `teacher-data-${profile?.id}`;

  const fetchTeacherData = useCallback(async () => {
    if (isFetchingRef.current || !profile?.schoolId || !profile?.id || !teacherId) {
      return;
    }

    // Vérifier le cache
    const cachedData = unifiedCache.get(cacheKey) as TeacherData | null;
    if (cachedData) {
      setData({ ...cachedData, loading: false, error: null });
      return;
    }

    isFetchingRef.current = true;
    setData(prev => ({ ...prev, loading: true, error: null }));

    try {
      // ✅ Requêtes directes optimisées avec JOINs
      const [schedulesResult, announcementsResult] = await Promise.all([
        // Schedules avec classes et students
        supabase
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
          .limit(100),

        // Announcements
        supabase
          .from('announcements')
          .select('*')
          .eq('school_id', profile.schoolId)
          .eq('is_published', true)
          .order('published_at', { ascending: false })
          .limit(20)
      ]);

      const schedulesData = schedulesResult.data || [];

      // Extraire classes uniques avec enrollment
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

      // Finaliser les classes
      const classesWithEnrollment = Array.from(classesMap.values()).map(classe => ({
        ...classe,
        enrollment_count: enrollmentMap.get(classe.id) || 0,
        students: undefined
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

      // Total élèves
      const totalStudents = Array.from(enrollmentMap.values()).reduce((sum, count) => sum + count, 0);

      // Filtrer annonces pour enseignants
      const filteredAnnouncements = filterAnnouncementsByRole(
        announcementsResult.data || [],
        'teacher',
        false
      ).slice(0, 3) as Announcement[];

      const teacherData: TeacherData = {
        classes: classesWithEnrollment,
        totalStudents,
        todaySchedules,
        announcements: filteredAnnouncements,
        loading: false,
        error: null
      };

      // Cache pendant 5 minutes
      unifiedCache.set(cacheKey, teacherData, CacheTTL.SEMI_DYNAMIC);
      setData(teacherData);

    } catch (err: unknown) {
      console.error('[useTeacherData] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur de chargement';
      setData(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
    } finally {
      isFetchingRef.current = false;
    }
  }, [profile?.schoolId, profile?.id, teacherId, cacheKey]);

  // Fetch initial
  useEffect(() => {
    if (!profileLoading && profile?.schoolId) {
      void fetchTeacherData();
    }
  }, [profileLoading, profile?.schoolId, fetchTeacherData]);

  // Realtime optimisé avec debounce
  useEffect(() => {
    if (!profile?.schoolId) return;

    let timeoutId: NodeJS.Timeout;
    const handleUpdate = (table: string) => {
      console.log('[useTeacherData] Real-time update detected for:', table);
      unifiedCache.delete(cacheKey);
      // 🚀 OPTIMISATION: Debounce plus agressif pour réduire les refetch (1000ms)
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
      }, () => handleUpdate('schedules'))
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'students',
        filter: `school_id=eq.${profile.schoolId}`
      }, () => handleUpdate('students'))
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'classes',
        filter: `school_id=eq.${profile.schoolId}`
      }, () => handleUpdate('classes'))
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'announcements',
        filter: `school_id=eq.${profile.schoolId}`
      }, () => handleUpdate('announcements'))
      .subscribe();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [profile?.schoolId, fetchTeacherData, cacheKey]);

  // Listener global pour les mises à jour d'emploi du temps
  useEffect(() => {
    if (!teacherId) return;

    const handleScheduleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.teacherId === teacherId) {
        console.log('[useTeacherData] Schedule update event received for teacher:', teacherId);
        unifiedCache.delete(cacheKey);
        fetchTeacherData();
      }
    };

    window.addEventListener('schedule-updated', handleScheduleUpdate);
    return () => window.removeEventListener('schedule-updated', handleScheduleUpdate);
  }, [teacherId, fetchTeacherData, cacheKey]);

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
