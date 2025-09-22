import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { usePermissions } from './usePermissions';
import { useToast } from '@/hooks/use-toast';

export interface Grade {
  id: string;
  student_id: string;
  exam_id: string;
  school_id: string;
  marks_obtained: number;
  max_marks: number;
  grade?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateGradeData {
  student_id: string;
  exam_id: string;
  marks_obtained: number;
  max_marks: number;
  grade?: string;
  remarks?: string;
}

export const useGrades = (examId?: string, studentId?: string, subjectId?: string, classId?: string) => {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useUserRole();
  const permissions = usePermissions();
  const { toast } = useToast();

  const fetchGrades = async () => {
    if (!userProfile?.schoolId) {
      setLoading(false);
      return;
    }

    // Vérifier les permissions
    if (subjectId && !permissions.canViewSubjectGrades(subjectId)) {
      setGrades([]);
      setLoading(false);
      return;
    }

    if (classId && !permissions.canViewClassGrades(classId)) {
      setGrades([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from('grades')
        .select(`
          *,
          exams!inner(
            id,
            title,
            subject_id,
            class_id,
            teacher_id,
            subjects!inner(id, name),
            classes!inner(id, name)
          )
        `)
        .eq('school_id', userProfile.schoolId);

      if (examId) {
        query = query.eq('exam_id', examId);
      }

      if (studentId) {
        query = query.eq('student_id', studentId);
      }

      // Si c'est un enseignant, filtrer par ses matières
      if (permissions.isTeacher && !permissions.canViewAllGrades) {
        const teacherSubjects = userProfile?.subjects?.map(s => s.id) || [];
        if (teacherSubjects.length > 0) {
          query = query.in('exams.subject_id', teacherSubjects);
        } else {
          // Si l'enseignant n'a pas de matières assignées, ne pas afficher de notes
          setGrades([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      
      setGrades(data || []);
    } catch (err) {
      console.error('Erreur lors de la récupération des notes:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const createGrade = async (gradeData: CreateGradeData) => {
    if (!userProfile?.schoolId) return false;

    // Vérifier les permissions avant de créer
    if (!permissions.canEditAllGrades) {
      // Pour un enseignant, vérifier qu'il peut modifier les notes de cet examen
      const exam = await supabase
        .from('exams')
        .select('subject_id, class_id')
        .eq('id', gradeData.exam_id)
        .single();

      if (exam.data) {
        if (!permissions.canEditSubjectGrades(exam.data.subject_id) || 
            !permissions.canEditClassGrades(exam.data.class_id)) {
          toast({
            title: "Accès refusé",
            description: "Vous n'avez pas l'autorisation de modifier les notes de cette matière.",
            variant: "destructive",
          });
          return false;
        }
      }
    }

    try {
      const { error } = await supabase
        .from('grades')
        .insert({
          student_id: gradeData.student_id,
          exam_id: gradeData.exam_id,
          marks_obtained: gradeData.marks_obtained,
          max_marks: gradeData.max_marks,
          grade: gradeData.grade,
          remarks: gradeData.remarks,
          school_id: userProfile.schoolId
        });

      if (error) throw error;

      await fetchGrades();

      toast({
        title: "Note enregistrée",
        description: "La note a été enregistrée avec succès.",
      });

      return true;
    } catch (err) {
      console.error('Erreur lors de la création de la note:', err);
      toast({
        title: "Erreur lors de l'enregistrement",
        description: err instanceof Error ? err.message : "Une erreur est survenue lors de l'enregistrement de la note.",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateGrade = async (id: string, gradeData: Partial<CreateGradeData>) => {
    if (!userProfile?.schoolId) return false;

    // Vérifier les permissions avant de modifier
    if (!permissions.canEditAllGrades) {
      // Récupérer l'examen associé à cette note
      const grade = await supabase
        .from('grades')
        .select(`
          exam_id,
          exams!inner(subject_id, class_id)
        `)
        .eq('id', id)
        .single();

      if (grade.data?.exams) {
        const exam = grade.data.exams as any;
        if (!permissions.canEditSubjectGrades(exam.subject_id) || 
            !permissions.canEditClassGrades(exam.class_id)) {
          toast({
            title: "Accès refusé",
            description: "Vous n'avez pas l'autorisation de modifier cette note.",
            variant: "destructive",
          });
          return false;
        }
      }
    }

    try {
      const { error } = await supabase
        .from('grades')
        .update(gradeData)
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

    // Vérifier les permissions avant de supprimer
    if (!permissions.canEditAllGrades) {
      // Récupérer l'examen associé à cette note
      const grade = await supabase
        .from('grades')
        .select(`
          exam_id,
          exams!inner(subject_id, class_id)
        `)
        .eq('id', id)
        .single();

      if (grade.data?.exams) {
        const exam = grade.data.exams as any;
        if (!permissions.canEditSubjectGrades(exam.subject_id) || 
            !permissions.canEditClassGrades(exam.class_id)) {
          toast({
            title: "Accès refusé",
            description: "Vous n'avez pas l'autorisation de supprimer cette note.",
            variant: "destructive",
          });
          return false;
        }
      }
    }

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

  useEffect(() => {
    fetchGrades();
  }, [userProfile?.schoolId, examId, studentId]);

  return {
    grades,
    loading,
    error,
    createGrade,
    updateGrade,
    deleteGrade,
    refreshGrades: fetchGrades
  };
};
