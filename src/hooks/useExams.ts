import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useToast } from '@/hooks/use-toast';

export interface Exam {
  id: string;
  school_id: string;
  class_id: string;
  subject_id?: string;
  title: string;
  exam_date: string;
  start_time?: string;
  end_time?: string;
  total_marks?: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateExamData {
  class_id: string;
  subject_id?: string;
  title: string;
  exam_date: string;
  start_time?: string;
  end_time?: string;
  total_marks?: number;
  is_published?: boolean;
}

export const useExams = (classId?: string) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useUserRole();
  const { toast } = useToast();

  const fetchExams = async () => {
    if (!userProfile?.schoolId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const query = supabase
        .from('exams')
        .select('*')
        .eq('school_id', userProfile.schoolId);

      if (classId) {
        query.eq('class_id', classId);
      }

      const { data, error } = await query.order('exam_date', { ascending: false });

      if (error) throw error;
      
      setExams(data || []);
    } catch (err) {
      console.error('Erreur lors de la récupération des examens:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const createExam = async (examData: CreateExamData) => {
    if (!userProfile?.schoolId) return false;

    try {
      const { error } = await supabase
        .from('exams')
        .insert({
          class_id: examData.class_id,
          subject_id: examData.subject_id,
          // teacher_id omis temporairement pour éviter l'erreur 400
          title: examData.title,
          exam_date: examData.exam_date,
          start_time: examData.start_time,
          end_time: examData.end_time,
          total_points: examData.total_marks,
          is_published: examData.is_published ?? false,
          school_id: userProfile.schoolId
        });

      if (error) throw error;

      await fetchExams();

      toast({
        title: "Examen créé avec succès",
        description: "L'examen a été créé et sauvegardé.",
      });

      return true;
    } catch (err) {
      console.error('Erreur lors de la création de l\'examen:', err);
      toast({
        title: "Erreur lors de la création",
        description: err instanceof Error ? err.message : "Une erreur est survenue lors de la création de l'examen.",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateExam = async (id: string, examData: Partial<CreateExamData>) => {
    if (!userProfile?.schoolId) return false;

    try {
      const { error } = await supabase
        .from('exams')
        .update(examData)
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;

      await fetchExams();

      toast({
        title: "Examen mis à jour",
        description: "L'examen a été mis à jour avec succès.",
      });

      return true;
    } catch (err) {
      console.error('Erreur lors de la mise à jour de l\'examen:', err);
      toast({
        title: "Erreur lors de la mise à jour",
        description: err instanceof Error ? err.message : "Une erreur est survenue lors de la mise à jour.",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteExam = async (id: string) => {
    if (!userProfile?.schoolId) return false;

    try {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;

      await fetchExams();

      toast({
        title: "Examen supprimé",
        description: "L'examen a été supprimé avec succès.",
      });

      return true;
    } catch (err) {
      console.error('Erreur lors de la suppression de l\'examen:', err);
      toast({
        title: "Erreur lors de la suppression",
        description: err instanceof Error ? err.message : "Une erreur est survenue lors de la suppression.",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchExams();
  }, [userProfile?.schoolId, classId]);

  return {
    exams,
    loading,
    error,
    createExam,
    updateExam,
    deleteExam,
    refreshExams: fetchExams
  };
};
