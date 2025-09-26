import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedUserRole } from './useOptimizedUserRole';
import { useCache } from './useCache';
import { useToast } from './use-toast';

export interface Grade {
  id: string;
  student_id: string;
  subject_id: string;
  exam_id?: string;
  grade_value: number;
  max_grade: number;
  coefficient: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  exam_type: string;
  semester?: string;
  school_id: string;
}

export interface CreateGradeData {
  student_id: string;
  subject_id: string;
  exam_id?: string;
  grade_value: number;
  max_grade: number;
  coefficient: number;
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

export const useOptimizedGrades = (studentId?: string, subjectId?: string, examId?: string) => {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { userProfile } = useOptimizedUserRole();
  const cache = useCache();
  const { toast } = useToast();

  const fetchGrades = useCallback(async () => {
    if (!userProfile?.schoolId) {
      setLoading(false);
      return;
    }

    const cacheKey = `grades_${userProfile.schoolId}_${studentId || 'all'}_${subjectId || 'all'}_${examId || 'all'}`;
    const cachedGrades = cache.get<Grade[]>(cacheKey);
    
    if (cachedGrades) {
      console.log('Notes récupérées depuis le cache');
      setGrades(cachedGrades);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      let query = supabase
        .from('grades')
        .select('*')
        .eq('school_id', userProfile.schoolId);

      if (studentId) query = query.eq('student_id', studentId);
      if (subjectId) query = query.eq('subject_id', subjectId);
      if (examId) query = query.eq('exam_id', examId);

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      cache.set(cacheKey, data || [], 2 * 60 * 1000);
      setGrades((data as any) || []);
      console.log('Notes récupérées depuis la DB et mises en cache');
      
    } catch (error) {
      console.error('Error fetching grades:', error);
      setError('Erreur lors de la récupération des notes');
      toast({
        title: "Erreur",
        description: "Impossible de charger les notes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [userProfile?.schoolId, studentId, subjectId, examId, cache, toast]);

  const createGrade = async (gradeData: CreateGradeData): Promise<boolean> => {
    if (!userProfile?.schoolId) return false;

    try {
      const { error } = await (supabase as any)
        .from('grades')
        .insert({
          ...gradeData,
          school_id: userProfile.schoolId,
          created_by: userProfile.id
        });

      if (error) throw error;

      const cacheKey = `grades_${userProfile.schoolId}_${studentId || 'all'}_${subjectId || 'all'}_${examId || 'all'}`;
      cache.delete(cacheKey);
      await fetchGrades();
      
      toast({
        title: "Succès",
        description: "Note créée avec succès",
      });
      
      return true;
    } catch (error) {
      console.error('Error creating grade:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la création de la note",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateGrade = async (id: string, gradeData: UpdateGradeData): Promise<boolean> => {
    if (!userProfile?.schoolId) return false;

    try {
      const { error } = await (supabase as any)
        .from('grades')
        .update(gradeData)
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;

      const cacheKey = `grades_${userProfile.schoolId}_${studentId || 'all'}_${subjectId || 'all'}_${examId || 'all'}`;
      cache.delete(cacheKey);
      await fetchGrades();
      
      toast({
        title: "Succès",
        description: "Note modifiée avec succès",
      });
      
      return true;
    } catch (error) {
      console.error('Error updating grade:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la modification de la note",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteGrade = async (id: string): Promise<boolean> => {
    if (!userProfile?.schoolId) return false;

    try {
      const { error } = await supabase
        .from('grades')
        .delete()
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;

      const cacheKey = `grades_${userProfile.schoolId}_${studentId || 'all'}_${subjectId || 'all'}_${examId || 'all'}`;
      cache.delete(cacheKey);
      await fetchGrades();
      
      toast({
        title: "Succès",
        description: "Note supprimée avec succès",
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting grade:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression de la note",
        variant: "destructive",
      });
      return false;
    }
  };

  const getGradeForStudent = (studentId: string, subjectId: string, examId?: string, semester?: string, examType?: string): Grade | undefined => {
    return grades.find(grade => 
      grade.student_id === studentId &&
      grade.subject_id === subjectId &&
      (!examId || grade.exam_id === examId) &&
      (!semester || grade.semester === semester) &&
      (!examType || grade.exam_type === examType)
    );
  };

  const getGradesForStudent = (studentId: string): Grade[] => {
    return grades.filter(grade => grade.student_id === studentId);
  };

  const getGradesForSubject = (subjectId: string): Grade[] => {
    return grades.filter(grade => grade.subject_id === subjectId);
  };

  useEffect(() => {
    fetchGrades();
  }, [fetchGrades]);

  return {
    grades,
    loading,
    error,
    createGrade,
    updateGrade,
    deleteGrade,
    getGradeForStudent,
    getGradesForStudent,
    getGradesForSubject,
    refetch: fetchGrades
  };
};