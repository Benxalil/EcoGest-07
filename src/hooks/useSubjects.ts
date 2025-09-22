import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useToast } from '@/hooks/use-toast';

export interface Subject {
  id: string;
  name: string;
  abbreviation?: string;
  class_id: string;
  school_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateSubjectData {
  name: string;
  abbreviation?: string;
  class_id: string;
}

export const useSubjects = (classId?: string) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useUserRole();
  const { toast } = useToast();

  const fetchSubjects = async () => {
    if (!userProfile?.schoolId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const query = supabase
        .from('subjects')
        .select('*')
        .eq('school_id', userProfile.schoolId);

      if (classId) {
        query.eq('class_id', classId);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;
      
      setSubjects(data || []);
    } catch (err) {
      console.error('Erreur lors de la récupération des matières:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const createSubject = async (subjectData: CreateSubjectData) => {
    if (!userProfile?.schoolId) return false;

    try {
      const { error } = await supabase
        .from('subjects')
        .insert({
          name: subjectData.name,
          abbreviation: subjectData.abbreviation,
          class_id: subjectData.class_id,
          school_id: userProfile.schoolId
        });

      if (error) throw error;

      await fetchSubjects();

      toast({
        title: "Matière ajoutée avec succès",
        description: `La matière ${subjectData.name} a été ajoutée.`,
      });

      return true;
    } catch (err) {
      console.error('Erreur lors de la création de la matière:', err);
      toast({
        title: "Erreur lors de la création",
        description: err instanceof Error ? err.message : "Une erreur est survenue lors de la création de la matière.",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateSubject = async (id: string, subjectData: Partial<CreateSubjectData>) => {
    if (!userProfile?.schoolId) return false;

    try {
      const { error } = await supabase
        .from('subjects')
        .update(subjectData)
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;

      await fetchSubjects();

      toast({
        title: "Matière mise à jour",
        description: "La matière a été mise à jour avec succès.",
      });

      return true;
    } catch (err) {
      console.error('Erreur lors de la mise à jour de la matière:', err);
      toast({
        title: "Erreur lors de la mise à jour",
        description: err instanceof Error ? err.message : "Une erreur est survenue lors de la mise à jour.",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteSubject = async (id: string) => {
    if (!userProfile?.schoolId) return false;

    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;

      await fetchSubjects();

      toast({
        title: "Matière supprimée",
        description: "La matière a été supprimée avec succès.",
      });

      return true;
    } catch (err) {
      console.error('Erreur lors de la suppression de la matière:', err);
      toast({
        title: "Erreur lors de la suppression",
        description: err instanceof Error ? err.message : "Une erreur est survenue lors de la suppression.",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [userProfile?.schoolId, classId]);

  return {
    subjects,
    loading,
    error,
    createSubject,
    updateSubject,
    deleteSubject,
    refreshSubjects: fetchSubjects
  };
};


