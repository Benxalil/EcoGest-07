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
      console.log('useGrades: Pas de schoolId, arrêt du fetch');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('useGrades: Début du fetch avec:', {
        schoolId: userProfile.schoolId,
        studentId,
        subjectId,
        examId
      });

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
      if (examId && examId !== 'null') {
        query = query.eq('exam_id', examId);
      } else if (examId === 'null') {
        query = query.is('exam_id', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('useGrades: Erreur Supabase:', error);
        throw error;
      }
      
      console.log('useGrades: Données récupérées:', data);
      // Utiliser les données directement telles qu'elles arrivent de Supabase
      // Mapper les données de la DB vers notre interface Grade
      const grades = (data || []).map(grade => ({
        id: grade.id,
        student_id: grade.student_id,
        subject_id: grade.subject_id,
        exam_id: grade.exam_id,
        grade_value: grade.grade_value,
        max_grade: grade.max_grade,
        coefficient: grade.coefficient,
        created_at: grade.created_at,
        updated_at: grade.updated_at,
        created_by: grade.created_by,
        exam_type: grade.exam_type,
        semester: grade.semester,
        school_id: grade.school_id
      }));
      
      setGrades(grades);
    } catch (err) {
      console.error('useGrades: Erreur lors de la récupération des notes:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      
      // Afficher un toast d'erreur pour l'utilisateur
      toast({
        title: "Erreur de chargement",
        description: `Impossible de charger les notes: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrades();
  }, [userProfile?.schoolId, studentId, subjectId, examId]);

  const createGrade = async (gradeData: CreateGradeData) => {
    if (!userProfile?.schoolId) {
      console.error('useGrades: Pas de schoolId pour createGrade');
      return false;
    }

    try {
      console.log('useGrades: Création de note avec:', gradeData);
      
      // Nettoyer les données avant insertion
      const cleanGradeData = {
        ...gradeData,
        school_id: userProfile.schoolId,
        created_by: userProfile.id,
        exam_id: gradeData.exam_id && gradeData.exam_id !== 'null' ? gradeData.exam_id : null,
        semester: gradeData.semester && gradeData.semester !== 'null' ? gradeData.semester : null,
        exam_type: gradeData.exam_type && gradeData.exam_type !== 'null' ? gradeData.exam_type : null
      };
      
      console.log('useGrades: Données nettoyées pour insertion:', cleanGradeData);
      
      const { data, error } = await supabase
        .from('grades')
        .insert(cleanGradeData)
        .select();

      if (error) {
        console.error('useGrades: Erreur Supabase lors de la création:', error);
        throw error;
      }

      console.log('useGrades: Note créée avec succès:', data);
      await fetchGrades();

      toast({
        title: "Note enregistrée",
        description: "La note a été enregistrée avec succès.",
      });

      return true;
    } catch (err: any) {
      console.error('useGrades: Erreur lors de la création de la note:', err);
      
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
          grade_value: gradeData.grade_value,
          max_grade: gradeData.max_grade,
          coefficient: gradeData.coefficient,
          exam_type: gradeData.exam_type,
          semester: gradeData.semester
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
    getGradeForStudent,
    getGradesForStudent,
    getGradesForSubject,
    refetch: fetchGrades
  };
};