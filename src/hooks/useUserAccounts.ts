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
      // Récupérer d'abord les paramètres de l'école pour les mots de passe
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('default_student_password, default_parent_password')
        .eq('id', userProfile.schoolId)
        .single();

      if (schoolError) throw schoolError;

      const studentPassword = schoolData?.default_student_password || 'student123';
      const parentPassword = schoolData?.default_parent_password || 'parent123';
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

      const formattedStudents: StudentAccount[] = (studentsData || []).map((student: any) => {
        // Générer le matricule parent si manquant
        const generateParentMatricule = (studentMatricule: string): string => {
          // Remplacer ELEVE ou Eleve par PARENT ou Parent
          return studentMatricule
            .replace(/ELEVE/g, 'PARENT')
            .replace(/Eleve/g, 'Parent');
        };

        return {
          id: student.id,
          student_number: student.student_number,
          parent_matricule: student.parent_matricule || generateParentMatricule(student.student_number),
          first_name: student.first_name,
          last_name: student.last_name,
          class_id: student.class_id,
          class_name: student.classes 
            ? `${student.classes.name} ${student.classes.level}${student.classes.section ? ' - ' + student.classes.section : ''}`
            : 'Sans classe',
          defaultPassword: studentPassword,
          parentPassword: parentPassword
        };
      });

      setStudents(formattedStudents);

      // Récupérer les enseignants
      const { data: teachersData, error: teachersError } = await supabase
        .from('teachers')
        .select('id, employee_number, first_name, last_name')
        .eq('school_id', userProfile.schoolId)
        .eq('is_active', true);

      if (teachersError) throw teachersError;

      // Récupérer le mot de passe par défaut pour les enseignants depuis schools
      const { data: teacherSchoolData } = await supabase
        .from('schools')
        .select('default_student_password')
        .eq('id', userProfile.schoolId)
        .single();

      const teacherPassword = teacherSchoolData?.default_student_password || 'teacher123';

      const formattedTeachers: TeacherAccount[] = (teachersData || []).map((teacher: any) => ({
        id: teacher.id,
        employee_number: teacher.employee_number,
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        defaultPassword: teacherPassword
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
