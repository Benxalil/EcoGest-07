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
  semester?: string;
  exam_type?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  school_id: string;
}

export interface CreateGradeData {
  student_id: string;
  subject_id: string;
  exam_id?: string;
  grade_value: number;
  max_grade: number;
  coefficient: number;
  semester?: string;
  exam_type?: string;
}

export interface UpdateGradeData {
  grade_value?: number;
  max_grade?: number;
  coefficient?: number;
  semester?: string;
  exam_type?: string;
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
      let query = supabase
        .from('grades')
        .select('*')
        .eq('school_id', userProfile.schoolId)
        .order('created_at', { ascending: false });

      if (studentId) {
        query = query.eq('student_id', studentId);
      }
      if (subjectId) {
        query = query.eq('subject_id', subjectId);
      }
      if (examId) {
        query = query.eq('exam_id', examId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setGrades(data || []);
    } catch (err) {
      console.error('Erreur lors de la récupération des notes:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrades();
  }, [userProfile?.schoolId, studentId, subjectId, examId]);

  const createGrade = async (gradeData: CreateGradeData) => {
    if (!userProfile?.schoolId) return false;

    try {
      const { error } = await supabase
        .from('grades')
        .insert({
          ...gradeData,
          school_id: userProfile.schoolId,
          created_by: userProfile.id
        });

      if (error) throw error;

      await fetchGrades();

      toast({
        title: "Note enregistrée",
        description: "La note a été enregistrée avec succès.",
      });

      return true;
    } catch (err: any) {
      console.error('Erreur lors de la création de la note:', err);
      
      let errorMessage = "Une erreur est survenue lors de l'enregistrement de la note.";
      
      if (err?.code === '23505') {
        errorMessage = "Cette note existe déjà pour cet élève et cette matière.";
      } else if (err?.code === '23503') {
        errorMessage = "Élève, matière ou examen introuvable.";
      } else if (err?.code === '23502') {
        errorMessage = "Données manquantes pour créer la note.";
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      toast({
        title: "Erreur lors de l'enregistrement",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  };

  const updateGrade = async (id: string, gradeData: UpdateGradeData) => {
    if (!userProfile?.schoolId) return false;

    try {
      const { error } = await supabase
        .from('grades')
        .update({
          ...gradeData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;

      await fetchGrades();

      toast({
        title: "Note mise à jour",
        description: "La note a été mise à jour avec succès.",
      });

      return true;
    } catch (err) {
      console.error('Erreur lors de la mise à jour de la note:', err);
      toast({
        title: "Erreur lors de la mise à jour",
        description: err instanceof Error ? err.message : "Une erreur est survenue lors de la mise à jour.",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteGrade = async (id: string) => {
    if (!userProfile?.schoolId) return false;

    try {
      const { error } = await supabase
        .from('grades')
        .delete()
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;

      await fetchGrades();

      toast({
        title: "Note supprimée",
        description: "La note a été supprimée avec succès.",
      });

      return true;
    } catch (err) {
      console.error('Erreur lors de la suppression de la note:', err);
      toast({
        title: "Erreur lors de la suppression",
        description: err instanceof Error ? err.message : "Une erreur est survenue lors de la suppression.",
        variant: "destructive",
      });
      return false;
    }
  };

  const upsertGrade = async (gradeData: CreateGradeData) => {
    if (!userProfile?.schoolId) return false;

    try {
      // Chercher une note existante
      const { data: existingGrade } = await supabase
        .from('grades')
        .select('id')
        .eq('student_id', gradeData.student_id)
        .eq('subject_id', gradeData.subject_id)
        .eq('school_id', userProfile.schoolId)
        .eq('exam_id', gradeData.exam_id || null)
        .eq('semester', gradeData.semester || null)
        .eq('exam_type', gradeData.exam_type || null)
        .single();

      if (existingGrade) {
        // Mettre à jour la note existante
        return await updateGrade(existingGrade.id, gradeData);
      } else {
        // Créer une nouvelle note
        return await createGrade(gradeData);
      }
    } catch (err) {
      console.error('Erreur lors de l\'upsert de la note:', err);
      return false;
    }
  };

  const getGradeForStudent = (studentId: string, subjectId: string, examId?: string, semester?: string, examType?: string) => {
    return grades.find(grade => 
      grade.student_id === studentId &&
      grade.subject_id === subjectId &&
      grade.exam_id === (examId || null) &&
      grade.semester === (semester || null) &&
      grade.exam_type === (examType || null)
    );
  };

  const getGradesForStudent = (studentId: string) => {
    return grades.filter(grade => grade.student_id === studentId);
  };

  const getGradesForSubject = (subjectId: string) => {
    return grades.filter(grade => grade.subject_id === subjectId);
  };

  return {
    grades,
    loading,
    error,
    createGrade,
    updateGrade,
    deleteGrade,
    upsertGrade,
    getGradeForStudent,
    getGradesForStudent,
    getGradesForSubject,
    refetch: fetchGrades
  };
};