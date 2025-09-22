import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';

export interface Student {
  id: string;
  student_number: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  place_of_birth?: string;
  gender: "M" | "F";
  address?: string;
  phone?: string;
  parent_phone?: string;
  parent_email?: string;
  emergency_contact?: string;
  school_id: string;
  class_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  classes?: {
    id: string;
    name: string;
    level: string;
    section?: string;
  };
}

export function useStudents(classId?: string) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useUserRole();

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!userProfile?.schoolId) {
        setStudents([]);
        return;
      }

      let query = supabase
        .from('students')
        .select('*')
        .eq('school_id', userProfile.schoolId)
        .eq('is_active', true)
        .order('first_name');

      // Si un classId est spécifié, filtrer par classe
      if (classId) {
        query = query.eq('class_id', classId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Erreur lors de la récupération des élèves:', fetchError);
        throw fetchError;
      }

      setStudents(data || []);
    } catch (err) {
      console.error('Erreur lors de la récupération des élèves:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [userProfile?.schoolId, classId]);

  const addStudent = async (studentData: Omit<Student, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .insert([studentData])
        .select('*')
        .single();

      if (error) throw error;

      setStudents(prev => [...prev, data]);
      return data;
    } catch (err) {
      console.error('Erreur lors de l\'ajout de l\'élève:', err);
      throw err;
    }
  };

  const updateStudent = async (id: string, studentData: Partial<Omit<Student, 'id' | 'created_at' | 'updated_at'>>) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .update(studentData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      setStudents(prev => prev.map(student => 
        student.id === id ? data : student
      ));
      return data;
    } catch (err) {
      console.error('Erreur lors de la mise à jour de l\'élève:', err);
      throw err;
    }
  };

  const deleteStudent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setStudents(prev => prev.filter(student => student.id !== id));
    } catch (err) {
      console.error('Erreur lors de la suppression de l\'élève:', err);
      throw err;
    }
  };

  const refreshStudents = () => {
    fetchStudents();
  };

  return {
    students,
    loading,
    error,
    addStudent,
    updateStudent,
    deleteStudent,
    refreshStudents
  };
}