import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';

export interface StudentAccount {
  id: string;
  student_number: string;
  parent_matricule: string | null;
  first_name: string;
  last_name: string;
  class_id: string;
  class_name: string;
  defaultPassword: string;
  parentPassword: string;
}

export interface TeacherAccount {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  defaultPassword: string;
}

export const useUserAccounts = (classId?: string) => {
  const { userProfile } = useUserRole();
  const [students, setStudents] = useState<StudentAccount[]>([]);
  const [teachers, setTeachers] = useState<TeacherAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.schoolId) return;
    
    fetchAccounts();
  }, [userProfile?.schoolId, classId]);

  const fetchAccounts = async () => {
    if (!userProfile?.schoolId) return;

    setLoading(true);
    try {
      // Récupérer les élèves avec leurs classes
      let studentsQuery = supabase
        .from('students')
        .select(`
          id,
          student_number,
          parent_matricule,
          first_name,
          last_name,
          class_id,
          classes (
            id,
            name,
            level,
            section
          )
        `)
        .eq('school_id', userProfile.schoolId)
        .eq('is_active', true);

      if (classId) {
        studentsQuery = studentsQuery.eq('class_id', classId);
      }

      const { data: studentsData, error: studentsError } = await studentsQuery;

      if (studentsError) throw studentsError;

      const formattedStudents: StudentAccount[] = (studentsData || []).map((student: any) => ({
        id: student.id,
        student_number: student.student_number,
        parent_matricule: student.parent_matricule,
        first_name: student.first_name,
        last_name: student.last_name,
        class_id: student.class_id,
        class_name: student.classes 
          ? `${student.classes.name} ${student.classes.level}${student.classes.section ? ' - ' + student.classes.section : ''}`
          : 'Sans classe',
        defaultPassword: 'student123',
        parentPassword: 'parent123'
      }));

      setStudents(formattedStudents);

      // Récupérer les enseignants
      const { data: teachersData, error: teachersError } = await supabase
        .from('teachers')
        .select('id, employee_number, first_name, last_name')
        .eq('school_id', userProfile.schoolId)
        .eq('is_active', true);

      if (teachersError) throw teachersError;

      const formattedTeachers: TeacherAccount[] = (teachersData || []).map((teacher: any) => ({
        id: teacher.id,
        employee_number: teacher.employee_number,
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        defaultPassword: 'teacher123'
      }));

      setTeachers(formattedTeachers);

    } catch (error) {
      console.error('Erreur lors de la récupération des comptes:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    students,
    teachers,
    loading,
    refreshAccounts: fetchAccounts
  };
};
