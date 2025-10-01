import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';

interface TeacherFilterData {
  teacherClassIds: string[];
  teacherSubjectIds: string[];
  loading: boolean;
}

export const useTeacherFilter = () => {
  const [data, setData] = useState<TeacherFilterData>({
    teacherClassIds: [],
    teacherSubjectIds: [],
    loading: true
  });
  const { userProfile, isTeacher } = useUserRole();

  useEffect(() => {
    const fetchTeacherData = async () => {
      if (!userProfile?.schoolId || !isTeacher()) {
        setData({ teacherClassIds: [], teacherSubjectIds: [], loading: false });
        return;
      }

      try {
        // Récupérer l'enseignant
        const { data: teacher } = await supabase
          .from('teachers')
          .select('id')
          .eq('user_id', userProfile.id)
          .single();

        if (!teacher) {
          setData({ teacherClassIds: [], teacherSubjectIds: [], loading: false });
          return;
        }

        // Récupérer les schedules de l'enseignant pour avoir les classes et les noms des matières
        const { data: schedules } = await supabase
          .from('schedules')
          .select('class_id, subject')
          .eq('teacher_id', teacher.id)
          .eq('school_id', userProfile.schoolId);

        if (schedules) {
          const classIds = [...new Set(schedules.map(s => s.class_id).filter(Boolean))];
          
          // Récupérer les noms uniques des matières depuis les schedules
          const subjectNames = [...new Set(schedules.map(s => s.subject).filter(Boolean))];
          
          // Récupérer tous les subjects de l'école pour faire la correspondance nom -> ID
          const { data: subjects } = await supabase
            .from('subjects')
            .select('id, name')
            .eq('school_id', userProfile.schoolId)
            .in('name', subjectNames);

          // Extraire les IDs des matières correspondantes
          const subjectIds = subjects ? subjects.map(s => s.id) : [];

          console.log('Schedules enseignant:', schedules);
          console.log('Noms des matières:', subjectNames);
          console.log('IDs des matières correspondants:', subjectIds);

          setData({
            teacherClassIds: classIds as string[],
            teacherSubjectIds: subjectIds as string[],
            loading: false
          });
        } else {
          setData({ teacherClassIds: [], teacherSubjectIds: [], loading: false });
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des données enseignant:', error);
        setData({ teacherClassIds: [], teacherSubjectIds: [], loading: false });
      }
    };

    fetchTeacherData();
  }, [userProfile?.schoolId, userProfile?.id, isTeacher]);

  return data;
};
