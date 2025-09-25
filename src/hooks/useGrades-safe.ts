import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useToast } from '@/hooks/use-toast';

export interface Grade {
  id: string;
  student_id: string;
  subject_id: string;
  exam_id?: string;
  grade_value: number;
  max_grade: number;
  coefficient: number;
  exam_type: string;
  semester?: string;
  school_id: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export const useGrades = () => {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useUserRole();
  const { toast } = useToast();

  const fetchGrades = async () => {
    if (!userProfile?.schoolId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Simple query to avoid deep type instantiation
      const result = await (supabase as any).from('grades').select('*').eq('school_id', userProfile.schoolId);
      if (result.error) throw result.error;
      setGrades(result.data || []);
    } catch (err) {
      console.error('Error fetching grades:', err);
      setError('Failed to fetch grades');
    } finally {
      setLoading(false);
    }
  };

  const createGrade = async (gradeData: any): Promise<boolean> => {
    try {
      const result = await (supabase as any).from('grades').insert({
        ...gradeData,
        school_id: userProfile?.schoolId,
        created_by: userProfile?.id
      });
      if (result.error) throw result.error;
      await fetchGrades();
      return true;
    } catch (err) {
      console.error('Error creating grade:', err);
      return false;
    }
  };

  const updateGrade = async (id: string, gradeData: any): Promise<boolean> => {
    try {
      const result = await (supabase as any).from('grades').update(gradeData).eq('id', id);
      if (result.error) throw result.error;
      await fetchGrades();
      return true;
    } catch (err) {
      console.error('Error updating grade:', err);
      return false;
    }
  };

  const deleteGrade = async (id: string): Promise<boolean> => {
    try {
      const result = await (supabase as any).from('grades').delete().eq('id', id);
      if (result.error) throw result.error;
      await fetchGrades();
      return true;
    } catch (err) {
      console.error('Error deleting grade:', err);
      return false;
    }
  };

  useEffect(() => {
    fetchGrades();
  }, [userProfile?.schoolId]);

  return {
    grades,
    loading,
    error,
    createGrade,
    updateGrade,
    deleteGrade,
    refetch: fetchGrades,
    getGradeForStudent: (studentId: string) => grades.find(g => g.student_id === studentId),
    getGradesForStudent: (studentId: string) => grades.filter(g => g.student_id === studentId),
    getGradesForSubject: (subjectId: string) => grades.filter(g => g.subject_id === subjectId)
  };
};