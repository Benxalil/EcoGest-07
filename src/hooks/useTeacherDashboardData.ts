import { useState, useEffect, useMemo, useCallback } from 'react';
import { useUserRole } from './useUserRole';
import { supabase } from '@/integrations/supabase/client';

export const useTeacherDashboardData = () => {
  const [teacherClasses, setTeacherClasses] = useState<any[]>([]);
  const [teacherStudents, setTeacherStudents] = useState<any[]>([]);
  const [todaySchedules, setTodaySchedules] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { userProfile } = useUserRole();

  const fetchTeacherData = useCallback(async () => {
    if (!userProfile?.schoolId || !userProfile?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Récupérer l'ID de l'enseignant depuis la table teachers
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('id')
        .eq('school_id', userProfile.schoolId)
        .eq('user_id', userProfile.id)
        .maybeSingle();

      if (teacherError) throw teacherError;
      
      if (!teacherData) {
        setTeacherClasses([]);
        setTeacherStudents([]);
        setTodaySchedules([]);
        setAnnouncements([]);
        setLoading(false);
        return;
      }

      const teacherId = teacherData.id;

      // Optimisation: Récupérer le nom du jour une seule fois
      const today = new Date();
      const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      const todayName = dayNames[today.getDay()];

      // 2-6. Exécuter toutes les requêtes en parallèle pour améliorer les performances
      const [
        scheduleDataResult,
        todaySchedulesResult,
        announcementsResult
      ] = await Promise.all([
        // Récupérer les IDs des classes via schedules
        supabase
          .from('schedules')
          .select('class_id')
          .eq('school_id', userProfile.schoolId)
          .eq('teacher_id', teacherId),
        
        // Récupérer les cours d'aujourd'hui
        supabase
          .from('schedules')
          .select(`
            *,
            classes:class_id (
              id,
              name,
              level
            )
          `)
          .eq('school_id', userProfile.schoolId)
          .eq('teacher_id', teacherId)
          .eq('day', todayName)
          .order('start_time'),
        
        // Récupérer les annonces
        supabase
          .from('announcements')
          .select('*')
          .eq('school_id', userProfile.schoolId)
          .eq('is_published', true)
          .order('created_at', { ascending: false })
      ]);

      if (scheduleDataResult.error) throw scheduleDataResult.error;
      if (todaySchedulesResult.error) throw todaySchedulesResult.error;
      if (announcementsResult.error) throw announcementsResult.error;

      const classIds = [...new Set(scheduleDataResult.data?.map(s => s.class_id) || [])];

      if (classIds.length === 0) {
        setTeacherClasses([]);
        setTeacherStudents([]);
        setTodaySchedules(todaySchedulesResult.data || []);
        // Filtrer les annonces même si pas de classes
        const filteredAnnouncements = (announcementsResult.data || []).filter((ann: any) => {
          if (!ann.target_audience || ann.target_audience.length === 0) return true;
          return ann.target_audience.some((audience: string) => 
            ['teacher', 'enseignant', 'tous', 'all'].includes(audience.toLowerCase())
          );
        });
        setAnnouncements(filteredAnnouncements);
        setLoading(false);
        return;
      }

      // 3-4. Récupérer classes et élèves en parallèle
      const [classesResult, studentsResult] = await Promise.all([
        supabase
          .from('classes')
          .select('*')
          .in('id', classIds)
          .order('name'),
        
        supabase
          .from('students')
          .select('*')
          .in('class_id', classIds)
          .eq('is_active', true)
      ]);

      if (classesResult.error) throw classesResult.error;
      if (studentsResult.error) throw studentsResult.error;

      // Filtrer les annonces qui ciblent les enseignants ou tous
      const filteredAnnouncements = (announcementsResult.data || []).filter((ann: any) => {
        if (!ann.target_audience || ann.target_audience.length === 0) {
          return true;
        }
        return ann.target_audience.some((audience: string) => 
          ['teacher', 'enseignant', 'tous', 'all'].includes(audience.toLowerCase())
        );
      });

      setTeacherClasses(classesResult.data || []);
      setTeacherStudents(studentsResult.data || []);
      setTodaySchedules(todaySchedulesResult.data || []);
      setAnnouncements(filteredAnnouncements);

    } catch (err: any) {
      console.error('Erreur lors de la récupération des données enseignant:', err);
      setError(err.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [userProfile?.schoolId, userProfile?.id]);

  useEffect(() => {
    fetchTeacherData();
  }, [fetchTeacherData]);

  const stats = useMemo(() => ({
    totalClasses: teacherClasses.length,
    totalStudents: teacherStudents.length,
    todayCoursesCount: todaySchedules.length,
    announcementsCount: announcements.length
  }), [teacherClasses, teacherStudents, todaySchedules, announcements]);

  return {
    teacherClasses,
    teacherStudents,
    todaySchedules,
    announcements,
    stats,
    loading,
    error,
    refetch: fetchTeacherData
  };
};
