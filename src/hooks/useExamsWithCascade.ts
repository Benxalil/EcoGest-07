import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useToast } from '@/hooks/use-toast';
import { useGrades } from './useGrades';

export interface Exam {
  id: string;
  title: string;
  description?: string;
  class_id: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  school_id: string;
}

export const useExamsWithCascade = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useUserRole();
  const { toast } = useToast();
  const { deleteGradesForExam } = useGrades();

  const fetchExams = async () => {
    if (!userProfile?.schoolId) {
      console.log('useExamsWithCascade: Pas de schoolId, arrêt du fetch');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('useExamsWithCascade: Récupération des examens pour schoolId:', userProfile.schoolId);

      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('school_id', userProfile.schoolId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('useExamsWithCascade: Erreur lors de la récupération des examens:', error);
        throw error;
      }

      console.log('useExamsWithCascade: Examens récupérés:', data?.length || 0);
      setExams(data || []);
      setError(null);
    } catch (err) {
      console.error('useExamsWithCascade: Erreur lors du fetch des examens:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      
      toast({
        title: "Erreur de chargement",
        description: `Impossible de charger les examens: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [userProfile?.schoolId]);

  const createExam = async (examData: Omit<Exam, 'id' | 'created_at' | 'updated_at' | 'school_id'>) => {
    if (!userProfile?.schoolId) {
      console.log('useExamsWithCascade: Pas de schoolId, impossible de créer l\'examen');
      return false;
    }

    try {
      console.log('useExamsWithCascade: Création de l\'examen:', examData.title);

      const { data, error } = await supabase
        .from('exams')
        .insert([{
          ...examData,
          school_id: userProfile.schoolId,
          created_by: userProfile.id
        }])
        .select()
        .single();

      if (error) {
        console.error('useExamsWithCascade: Erreur lors de la création de l\'examen:', error);
        throw error;
      }

      console.log('useExamsWithCascade: Examen créé avec succès:', data.id);
      
      // Recharger la liste des examens
      await fetchExams();
      
      toast({
        title: "Examen créé",
        description: `L'examen "${examData.title}" a été créé avec succès.`,
      });

      return data;
    } catch (err) {
      console.error('useExamsWithCascade: Erreur lors de la création de l\'examen:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      
      toast({
        title: "Erreur de création",
        description: `Impossible de créer l'examen: ${errorMessage}`,
        variant: "destructive",
      });
      
      return false;
    }
  };

  const updateExam = async (examId: string, examData: Partial<Omit<Exam, 'id' | 'created_at' | 'updated_at' | 'school_id'>>) => {
    if (!userProfile?.schoolId) {
      console.log('useExamsWithCascade: Pas de schoolId, impossible de modifier l\'examen');
      return false;
    }

    try {
      console.log('useExamsWithCascade: Modification de l\'examen:', examId);

      const { data, error } = await supabase
        .from('exams')
        .update({
          ...examData,
          updated_at: new Date().toISOString()
        })
        .eq('id', examId)
        .eq('school_id', userProfile.schoolId)
        .select()
        .single();

      if (error) {
        console.error('useExamsWithCascade: Erreur lors de la modification de l\'examen:', error);
        throw error;
      }

      console.log('useExamsWithCascade: Examen modifié avec succès:', data.id);
      
      // Recharger la liste des examens
      await fetchExams();
      
      toast({
        title: "Examen modifié",
        description: `L'examen "${data.title}" a été modifié avec succès.`,
      });

      return data;
    } catch (err) {
      console.error('useExamsWithCascade: Erreur lors de la modification de l\'examen:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      
      toast({
        title: "Erreur de modification",
        description: `Impossible de modifier l'examen: ${errorMessage}`,
        variant: "destructive",
      });
      
      return false;
    }
  };

  const deleteExam = async (examId: string) => {
    if (!userProfile?.schoolId) {
      console.log('useExamsWithCascade: Pas de schoolId, impossible de supprimer l\'examen');
      return false;
    }

    try {
      console.log('useExamsWithCascade: Suppression de l\'examen:', examId);

      // D'abord, supprimer toutes les notes associées à cet examen
      console.log('useExamsWithCascade: Suppression des notes associées à l\'examen...');
      const notesDeleted = await deleteGradesForExam(examId);
      
      if (!notesDeleted) {
        console.warn('useExamsWithCascade: Échec de la suppression des notes, mais on continue avec la suppression de l\'examen');
      }

      // Ensuite, supprimer l'examen
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', examId)
        .eq('school_id', userProfile.schoolId);

      if (error) {
        console.error('useExamsWithCascade: Erreur lors de la suppression de l\'examen:', error);
        throw error;
      }

      console.log('useExamsWithCascade: Examen supprimé avec succès:', examId);
      
      // Recharger la liste des examens
      await fetchExams();
      
      toast({
        title: "Examen supprimé",
        description: "L'examen et toutes ses notes associées ont été supprimés avec succès.",
      });

      return true;
    } catch (err) {
      console.error('useExamsWithCascade: Erreur lors de la suppression de l\'examen:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      
      toast({
        title: "Erreur de suppression",
        description: `Impossible de supprimer l'examen: ${errorMessage}`,
        variant: "destructive",
      });
      
      return false;
    }
  };

  const getExamById = (examId: string) => {
    return exams.find(exam => exam.id === examId);
  };

  const getExamsByClass = (classId: string) => {
    return exams.filter(exam => exam.class_id === classId);
  };

  return {
    exams,
    loading,
    error,
    createExam,
    updateExam,
    deleteExam,
    getExamById,
    getExamsByClass,
    refetch: fetchExams
  };
};
