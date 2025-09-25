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
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  exam_type: string;
  semester?: string;
  school_id: string;
}

export interface CreateGradeData {
  student_id: string;
  subject_id: string;
  grade_value: number;
  max_grade: number;
  coefficient?: number;
  exam_id?: string;
  exam_type: string;
  semester?: string;
}

export interface UpdateGradeData {
  grade_value?: number;
  max_grade?: number;
  coefficient?: number;
  exam_type?: string;
  semester?: string;
}

export const useGrades = (studentId?: string, subjectId?: string, examId?: string) => {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
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
      let query = (supabase as any).from('grades').select('*').eq('school_id', userProfile.schoolId);

      if (studentId) query = query.eq('student_id', studentId);
      if (subjectId) query = query.eq('subject_id', subjectId);
      if (examId) query = query.eq('exam_id', examId);

      const { data, error } = await query;

      if (error) throw error;
      setGrades(data || []);
    } catch (err) {
      console.error('Error fetching grades:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const createGrade = async (gradeData: CreateGradeData): Promise<boolean> => {
    if (!userProfile?.schoolId) return false;

    try {
      const { error } = await (supabase as any).from('grades').insert({
        ...gradeData,
        school_id: userProfile.schoolId,
        created_by: userProfile.id
      });

      if (error) throw error;
      await fetchGrades();
      return true;
    } catch (err) {
      console.error('Error creating grade:', err);
      toast({
        title: "Erreur",
        description: "Impossible de créer la note",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateGrade = async (id: string, gradeData: UpdateGradeData): Promise<boolean> => {
    try {
      const { error } = await (supabase as any).from('grades').update(gradeData).eq('id', id);
      if (error) throw error;
      await fetchGrades();
      return true;
    } catch (err) {
      console.error('Error updating grade:', err);
      return false;
    }
  };

  const deleteGrade = async (id: string): Promise<boolean> => {
    try {
      const { error } = await (supabase as any).from('grades').delete().eq('id', id);
      if (error) throw error;
      await fetchGrades();
      return true;
    } catch (err) {
      console.error('Error deleting grade:', err);
      return false;
    }
  };

  useEffect(() => {
    fetchGrades();
  }, [userProfile?.schoolId, studentId, subjectId, examId]);

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