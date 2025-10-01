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

        // Récupérer les schedules de l'enseignant pour avoir les classes et matières
        const { data: schedules } = await supabase
          .from('schedules')
          .select('class_id, subject_id')
          .eq('teacher_id', teacher.id)
          .eq('school_id', userProfile.schoolId);

        if (schedules) {
          const classIds = [...new Set(schedules.map(s => s.class_id).filter(Boolean))];
          const subjectIds = [...new Set(schedules.map(s => s.subject_id).filter(Boolean))];

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
