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

        // Récupérer les matières et classes depuis teacher_subjects
        const { data: teacherSubjects, error } = await supabase
          .from('teacher_subjects')
          .select('class_id, subject_id')
          .eq('teacher_id', teacher.id)
          .eq('school_id', userProfile.schoolId);

        if (error) {
          console.error('Erreur lors de la récupération des matières enseignant:', error);
          setData({ teacherClassIds: [], teacherSubjectIds: [], loading: false });
          return;
        }

        if (teacherSubjects && teacherSubjects.length > 0) {
          const classIds = [...new Set(teacherSubjects.map(ts => ts.class_id).filter(Boolean))];
          const subjectIds = [...new Set(teacherSubjects.map(ts => ts.subject_id).filter(Boolean))];

          console.log('Teacher class IDs:', classIds);
          console.log('Teacher subject IDs:', subjectIds);

          setData({
            teacherClassIds: classIds as string[],
            teacherSubjectIds: subjectIds as string[],
            loading: false
          });
        } else {
          console.log('Aucune matière trouvée pour cet enseignant');
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
