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
      setGrades(data || []);
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
    if (!userProfile?.schoolId) {
      console.error('useGrades: Pas de schoolId pour upsertGrade');
      return false;
    }

    try {
      console.log('useGrades: Upsert grade avec:', gradeData);

      // Chercher une note existante
      let query = supabase
        .from('grades')
        .select('id')
        .eq('student_id', gradeData.student_id)
        .eq('subject_id', gradeData.subject_id)
        .eq('school_id', userProfile.schoolId);
      
      // Ajouter les conditions seulement si les valeurs ne sont pas null/undefined
      if (gradeData.exam_id && gradeData.exam_id !== 'null') {
        query = query.eq('exam_id', gradeData.exam_id);
      } else {
        query = query.is('exam_id', null);
      }
      
      if (gradeData.semester && gradeData.semester !== 'null') {
        query = query.eq('semester', gradeData.semester);
      } else {
        query = query.is('semester', null);
      }
      
      if (gradeData.exam_type && gradeData.exam_type !== 'null') {
        query = query.eq('exam_type', gradeData.exam_type);
      } else {
        query = query.is('exam_type', null);
      }
      
      const { data: existingGrade, error: searchError } = await query.single();

      if (searchError && searchError.code !== 'PGRST116') {
        // PGRST116 = "No rows found", ce qui est normal
        console.error('useGrades: Erreur lors de la recherche:', searchError);
        throw searchError;
      }

      if (existingGrade) {
        console.log('useGrades: Note existante trouvée, mise à jour:', existingGrade.id);
        // Mettre à jour la note existante
        return await updateGrade(existingGrade.id, gradeData);
      } else {
        console.log('useGrades: Aucune note existante, création d\'une nouvelle');
        // Créer une nouvelle note
        return await createGrade(gradeData);
      }
    } catch (err) {
      console.error('useGrades: Erreur lors de l\'upsert de la note:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      
      toast({
        title: "Erreur de sauvegarde",
        description: `Impossible de sauvegarder la note: ${errorMessage}`,
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

  const deleteGradesForExam = async (examId: string) => {
    if (!userProfile?.schoolId) {
      console.log('useGrades: Pas de schoolId, impossible de supprimer les notes');
      return false;
    }

    try {
      console.log('useGrades: Suppression des notes pour l\'examen:', examId);
      
      const { error } = await supabase
        .from('grades')
        .delete()
        .eq('exam_id', examId)
        .eq('school_id', userProfile.schoolId);

      if (error) {
        console.error('useGrades: Erreur lors de la suppression des notes:', error);
        throw error;
      }

      console.log('useGrades: Notes supprimées avec succès pour l\'examen:', examId);
      
      // Recharger les notes après suppression
      await fetchGrades();
      
      toast({
        title: "Notes supprimées",
        description: "Toutes les notes de cet examen ont été supprimées.",
      });

      return true;
    } catch (err) {
      console.error('useGrades: Erreur lors de la suppression des notes:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      
      toast({
        title: "Erreur de suppression",
        description: `Impossible de supprimer les notes: ${errorMessage}`,
        variant: "destructive",
      });
      
      return false;
    }
  };

  const deleteGradesForStudent = async (studentId: string) => {
    if (!userProfile?.schoolId) {
      console.log('useGrades: Pas de schoolId, impossible de supprimer les notes');
      return false;
    }

    try {
      console.log('useGrades: Suppression des notes pour l\'élève:', studentId);
      
      const { error } = await supabase
        .from('grades')
        .delete()
        .eq('student_id', studentId)
        .eq('school_id', userProfile.schoolId);

      if (error) {
        console.error('useGrades: Erreur lors de la suppression des notes:', error);
        throw error;
      }

      console.log('useGrades: Notes supprimées avec succès pour l\'élève:', studentId);
      
      // Recharger les notes après suppression
      await fetchGrades();
      
      toast({
        title: "Notes supprimées",
        description: "Toutes les notes de cet élève ont été supprimées.",
      });

      return true;
    } catch (err) {
      console.error('useGrades: Erreur lors de la suppression des notes:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      
      toast({
        title: "Erreur de suppression",
        description: `Impossible de supprimer les notes: ${errorMessage}`,
        variant: "destructive",
      });
      
      return false;
    }
  };

  const deleteGradesForSubject = async (subjectId: string) => {
    if (!userProfile?.schoolId) {
      console.log('useGrades: Pas de schoolId, impossible de supprimer les notes');
      return false;
    }

    try {
      console.log('useGrades: Suppression des notes pour la matière:', subjectId);
      
      const { error } = await supabase
        .from('grades')
        .delete()
        .eq('subject_id', subjectId)
        .eq('school_id', userProfile.schoolId);

      if (error) {
        console.error('useGrades: Erreur lors de la suppression des notes:', error);
        throw error;
      }

      console.log('useGrades: Notes supprimées avec succès pour la matière:', subjectId);
      
      // Recharger les notes après suppression
      await fetchGrades();
      
      toast({
        title: "Notes supprimées",
        description: "Toutes les notes de cette matière ont été supprimées.",
      });

      return true;
    } catch (err) {
      console.error('useGrades: Erreur lors de la suppression des notes:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      
      toast({
        title: "Erreur de suppression",
        description: `Impossible de supprimer les notes: ${errorMessage}`,
        variant: "destructive",
      });
      
      return false;
    }
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
    deleteGradesForExam,
    deleteGradesForStudent,
    deleteGradesForSubject,
    refetch: fetchGrades
  };
};