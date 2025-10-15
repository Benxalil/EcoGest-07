import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedUserData } from './useOptimizedUserData';
import { filterAnnouncementsByRole } from '@/utils/announcementFilters';
import { QueryKeys, CacheStaleTime } from '@/lib/queryClient';
import type { ClassData } from './useClasses';
import { useEffect } from 'react';

export interface TeacherData {
  classes: ClassData[];
  totalStudents: number;
  todaySchedules: any[];
  announcements: any[];
}

// ✅ Fonction optimisée pour récupérer toutes les données enseignant
const fetchTeacherData = async (
  schoolId: string,
  teacherId: string | null
): Promise<TeacherData> => {
  if (!schoolId || !teacherId) {
    return {
      classes: [],
      totalStudents: 0,
      todaySchedules: [],
      announcements: []
    };
  }

  console.log('🔍 fetchTeacherData - START', { schoolId, teacherId });
  const startTime = performance.now();

  // ✅ OPTIMISATION: Une seule requête combinée avec JOIN
  const [schedulesResult, announcementsResult] = await Promise.all([
    // Schedules avec classes et students en une seule requête optimisée
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
      .eq('school_id', schoolId)
      .eq('teacher_id', teacherId)
      .limit(100), // Limite raisonnable pour éviter surcharge

    // Announcements filtrées
    supabase
      .from('announcements')
      .select('*')
      .eq('school_id', schoolId)
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
    students: undefined // Nettoyer
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
  ).slice(0, 3);

  const endTime = performance.now();
  console.log(`✅ fetchTeacherData - DONE in ${(endTime - startTime).toFixed(2)}ms`, {
    classes: classesWithEnrollment.length,
    totalStudents,
    todaySchedules: todaySchedules.length,
    announcements: filteredAnnouncements.length
  });

  return {
    classes: classesWithEnrollment,
    totalStudents,
    todaySchedules,
    announcements: filteredAnnouncements
  };
};

export const useTeacherDataOptimized = () => {
  const { profile, teacherId, loading: profileLoading } = useOptimizedUserData();
  const queryClient = useQueryClient();

  // ✅ React Query avec cache de 2 minutes
  const { 
    data = {
      classes: [],
      totalStudents: 0,
      todaySchedules: [],
      announcements: []
    },
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: QueryKeys.teacherData(teacherId),
    queryFn: () => fetchTeacherData(profile?.schoolId || '', teacherId),
    enabled: !profileLoading && !!profile?.schoolId && !!teacherId,
    staleTime: CacheStaleTime.TEACHERS, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  // ✅ Realtime optimisé avec debounce de 2 secondes
  useEffect(() => {
    if (!profile?.schoolId) return;

    let timeoutId: NodeJS.Timeout;
    const handleUpdate = () => {
      // Debounce augmenté à 2 secondes
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        queryClient.invalidateQueries({ 
          queryKey: QueryKeys.teacherData(teacherId) 
        });
      }, 2000);
    };

    // Un seul channel pour toutes les tables
    const channel = supabase
      .channel('teacher-data-updates')
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
  }, [profile?.schoolId, teacherId, queryClient]);

  return {
    classes: data.classes,
    totalStudents: data.totalStudents,
    todaySchedules: data.todaySchedules,
    announcements: data.announcements,
    loading: isLoading || profileLoading,
    error: error?.message || null,
    refetch
  };
};
