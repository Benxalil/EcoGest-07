import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useTeacherId } from './useTeacherId';

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
  const { teacherId, loading: teacherIdLoading } = useTeacherId();
  
  const isTeacherRole = isTeacher();

  useEffect(() => {
    const fetchTeacherData = async () => {
      if (!userProfile?.schoolId || !isTeacherRole || teacherIdLoading) {
        if (!teacherIdLoading) {
          setData({ teacherClassIds: [], teacherSubjectIds: [], loading: false });
        }
        return;
      }

      if (!teacherId) {
        setData({ teacherClassIds: [], teacherSubjectIds: [], loading: false });
        return;
      }

      try {

        // Récupérer les schedules de l'enseignant pour avoir les classes et les noms des matières
        const { data: schedules } = await supabase
          .from('schedules')
          .select('class_id, subject')
          .eq('teacher_id', teacherId)
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

    // Souscription en temps réel pour les changements d'emploi du temps
    if (userProfile?.schoolId && isTeacherRole && teacherId) {
      const subscription = supabase
        .channel('schedules-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'schedules',
            filter: `school_id=eq.${userProfile.schoolId}`
          },
          () => {
            console.log('Changement détecté dans les schedules, rechargement...');
            fetchTeacherData();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [userProfile?.schoolId, isTeacherRole, teacherId, teacherIdLoading]);

  return data;
};
