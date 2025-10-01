import { useState, useEffect, useMemo } from 'react';
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

  const fetchTeacherData = async () => {
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
        setLoading(false);
        return;
      }

      const teacherId = teacherData.id;

      // 2. Récupérer les IDs des classes que l'enseignant enseigne via schedules
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('schedules')
        .select('class_id')
        .eq('school_id', userProfile.schoolId)
        .eq('teacher_id', teacherId);

      if (scheduleError) throw scheduleError;

      const classIds = [...new Set(scheduleData?.map(s => s.class_id) || [])];

      if (classIds.length === 0) {
        setTeacherClasses([]);
        setTeacherStudents([]);
        setTodaySchedules([]);
        setLoading(false);
        return;
      }

      // 3. Récupérer les détails des classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .in('id', classIds)
        .order('name');

      if (classesError) throw classesError;

      // 4. Récupérer les élèves de ces classes
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .in('class_id', classIds)
        .eq('is_active', true);

      if (studentsError) throw studentsError;

      // 5. Récupérer les cours d'aujourd'hui pour cet enseignant
      const today = new Date();
      const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      const todayName = dayNames[today.getDay()];

      const { data: todaySchedulesData, error: todaySchedulesError } = await supabase
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
        .order('start_time');

      if (todaySchedulesError) throw todaySchedulesError;

      // 6. Récupérer les annonces pour enseignants
      const { data: announcementsData, error: announcementsError } = await supabase
        .from('announcements')
        .select('*')
        .eq('school_id', userProfile.schoolId)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (announcementsError) throw announcementsError;

      // Filtrer les annonces qui ciblent les enseignants ou tous
      const filteredAnnouncements = (announcementsData || []).filter((ann: any) => {
        if (!ann.target_audience || ann.target_audience.length === 0) {
          return true; // Si pas de cible spécifiée, afficher pour tous
        }
        // Vérifier si l'audience cible contient 'teacher', 'enseignant' ou 'tous'
        return ann.target_audience.some((audience: string) => 
          ['teacher', 'enseignant', 'tous', 'all'].includes(audience.toLowerCase())
        );
      });

      setTeacherClasses(classesData || []);
      setTeacherStudents(studentsData || []);
      setTodaySchedules(todaySchedulesData || []);
      setAnnouncements(filteredAnnouncements);

    } catch (err: any) {
      console.error('Erreur lors de la récupération des données enseignant:', err);
      setError(err.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacherData();
  }, [userProfile?.schoolId, userProfile?.id]);

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
