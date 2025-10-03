import { useState, useEffect, useMemo, useCallback } from 'react';
import { useUnifiedUserData } from './useUnifiedUserData';
import { supabase } from '@/integrations/supabase/client';
import { filterAnnouncementsByRole } from '@/utils/announcementFilters';
import { multiLevelCache, CacheTTL, CacheKeys } from '@/utils/multiLevelCache';

export const useTeacherDashboardData = () => {
  const [teacherClasses, setTeacherClasses] = useState<any[]>([]);
  const [teacherStudents, setTeacherStudents] = useState<any[]>([]);
  const [todaySchedules, setTodaySchedules] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { profile, teacherId } = useUnifiedUserData();

  const fetchTeacherData = useCallback(async () => {
    if (!profile?.schoolId || !profile?.id) {
      return;
    }

    if (!teacherId) {
      setTeacherClasses([]);
      setTeacherStudents([]);
      setTodaySchedules([]);
      setAnnouncements([]);
      setLoading(false);
      return;
    }

    // Clé de cache pour les données du teacher
    const cacheKey = CacheKeys.dashboard(profile.id, 'teacher');
    
    // Vérifier le cache multi-niveaux d'abord (stale-while-revalidate)
    const cachedData = multiLevelCache.get<any>(cacheKey, 'memory-first');
    if (cachedData) {
      setTeacherClasses(cachedData.teacherClasses || []);
      setTeacherStudents(cachedData.teacherStudents || []);
      setTodaySchedules(cachedData.todaySchedules || []);
      setAnnouncements(cachedData.announcements || []);
      setLoading(false);
      // Continuer en arrière-plan pour rafraîchir si nécessaire
    } else {
      setLoading(true);
    }

    try {
      setError(null);

      // Optimisation: Récupérer le nom du jour une seule fois
      const today = new Date();
      const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      const todayName = dayNames[today.getDay()];

      // Exécuter toutes les requêtes en parallèle
      const [
        scheduleDataResult,
        todaySchedulesResult,
        announcementsResult
      ] = await Promise.all([
        // Récupérer les IDs des classes via schedules
        supabase
          .from('schedules')
          .select('class_id')
          .eq('school_id', profile.schoolId)
          .eq('teacher_id', teacherId),
        
        // Récupérer les cours d'aujourd'hui avec les classes
        supabase
          .from('schedules')
          .select('id, subject, day, start_time, end_time, room, class_id, classes:class_id(id, name, level)')
          .eq('school_id', profile.schoolId)
          .eq('teacher_id', teacherId)
          .eq('day', todayName)
          .order('start_time'),
        
        // Récupérer les annonces
        supabase
          .from('announcements')
          .select('id, title, content, created_at, target_audience, priority, is_urgent')
          .eq('school_id', profile.schoolId)
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      if (scheduleDataResult.error) throw scheduleDataResult.error;
      if (todaySchedulesResult.error) throw todaySchedulesResult.error;
      if (announcementsResult.error) throw announcementsResult.error;

      const classIds = [...new Set(scheduleDataResult.data?.map(s => s.class_id) || [])];

      if (classIds.length === 0) {
        const filteredAnnouncements = filterAnnouncementsByRole(
          announcementsResult.data || [],
          'teacher',
          false
        );
        
        const emptyData = {
          teacherClasses: [],
          teacherStudents: [],
          todaySchedules: todaySchedulesResult.data || [],
          announcements: filteredAnnouncements
        };
        
        setTeacherClasses([]);
        setTeacherStudents([]);
        setTodaySchedules(emptyData.todaySchedules);
        setAnnouncements(emptyData.announcements);
        setLoading(false);
        
        // 🔒 Cache en memory-only (même vide, pour cohérence)
        multiLevelCache.set(cacheKey, emptyData, CacheTTL.SCHEDULES, 'memory', true);
        return;
      }

      // Récupérer classes et élèves en parallèle
      const [classesResult, studentsResult] = await Promise.all([
        supabase
          .from('classes')
          .select('id, name, level, section, effectif')
          .in('id', classIds)
          .order('name'),
        
        supabase
          .from('students')
          .select('id, first_name, last_name, student_number, class_id, is_active')
          .in('class_id', classIds)
          .eq('is_active', true)
      ]);

      if (classesResult.error) throw classesResult.error;
      if (studentsResult.error) throw studentsResult.error;

      // Filtrer les annonces qui ciblent les enseignants
      const filteredAnnouncements = filterAnnouncementsByRole(
        announcementsResult.data || [],
        'teacher',
        false
      );

      const dashboardData = {
        teacherClasses: classesResult.data || [],
        teacherStudents: studentsResult.data || [],
        todaySchedules: todaySchedulesResult.data || [],
        announcements: filteredAnnouncements
      };

      setTeacherClasses(dashboardData.teacherClasses);
      setTeacherStudents(dashboardData.teacherStudents);
      setTodaySchedules(dashboardData.todaySchedules);
      setAnnouncements(dashboardData.announcements);

      // 🔒 SÉCURITÉ: Cache en memory-only (contient liste élèves)
      multiLevelCache.set(cacheKey, dashboardData, CacheTTL.SCHEDULES, 'memory', true);

    } catch (err: any) {
      console.error('Erreur lors de la récupération des données enseignant:', err);
      setError(err.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [profile?.schoolId, profile?.id, teacherId]);

  useEffect(() => {
    fetchTeacherData();

    // Écouter les changements en temps réel sur les horaires
    if (teacherId && profile?.id) {
      const channel = supabase
        .channel('teacher-schedules-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'schedules',
            filter: `teacher_id=eq.${teacherId}`
          },
          () => {
            // Invalider le cache et recharger
            multiLevelCache.delete(CacheKeys.dashboard(profile.id, 'teacher'));
            fetchTeacherData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchTeacherData, teacherId, profile?.id]);

  const stats = useMemo(() => ({
    totalClasses: teacherClasses.length,
    totalStudents: teacherStudents.length,
    todayCoursesCount: todaySchedules.length,
    announcementsCount: announcements.length
  }), [teacherClasses, teacherStudents, todaySchedules, announcements]);

  const refetch = useCallback(() => {
    if (profile?.id) {
      multiLevelCache.delete(CacheKeys.dashboard(profile.id, 'teacher'));
      fetchTeacherData();
    }
  }, [fetchTeacherData, profile?.id]);

  return {
    teacherClasses,
    teacherStudents,
    todaySchedules,
    announcements,
    stats,
    loading,
    error,
    refetch
  };
};
