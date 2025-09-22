import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useToast } from '@/hooks/use-toast';

export interface ClassData {
  id: string;
  name: string;
  level: string;
  section?: string;
  capacity?: number;
  school_id: string;
  academic_year_id: string;
  created_at: string;
  updated_at: string;
  enrollment_count?: number; // Nombre réel d'élèves inscrits
}

export interface CreateClassData {
  name: string;
  level: string;
  section?: string;
  capacity?: number;
}

export const useClasses = () => {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useUserRole();
  const { toast } = useToast();

  const fetchClasses = async () => {
    if (!userProfile?.schoolId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: classesData, error } = await supabase
        .from('classes')
        .select('*')
        .eq('school_id', userProfile.schoolId)
        .order('name');

      if (error) throw error;
      
      // Simplifier en ne calculant pas l'effectif à chaque chargement
      setClasses(classesData || []);
    } catch (err) {
      console.error('Erreur lors de la récupération des classes:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const createClass = async (classData: CreateClassData) => {
    if (!userProfile?.schoolId) return false;

    try {
      // Get current academic year
      const { data: academicYears, error: academicError } = await supabase
        .from('academic_years')
        .select('id')
        .eq('school_id', userProfile.schoolId)
        .eq('is_current', true)
        .single();

      if (academicError || !academicYears) {
        throw new Error('Aucune année académique active trouvée');
      }

      const { error } = await supabase
        .from('classes')
        .insert({
          name: classData.name,
          level: classData.level,
          section: classData.section,
          capacity: classData.capacity || 30,
          school_id: userProfile.schoolId,
          academic_year_id: academicYears.id
        });

      if (error) throw error;
      
      await fetchClasses();
      
      toast({
        title: "Classe créée avec succès",
        description: `La classe ${classData.name} ${classData.level} a été créée.`,
      });
      
      return true;
    } catch (err) {
      console.error('Erreur lors de la création de la classe:', err);
      toast({
        title: "Erreur lors de la création",
        description: err instanceof Error ? err.message : "Une erreur est survenue lors de la création de la classe.",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateClass = async (id: string, classData: Partial<CreateClassData>) => {
    if (!userProfile?.schoolId) return false;

    try {
      const { error } = await supabase
        .from('classes')
        .update(classData)
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;
      
      await fetchClasses();
      
      toast({
        title: "Classe mise à jour",
        description: "La classe a été mise à jour avec succès.",
      });
      
      return true;
    } catch (err) {
      console.error('Erreur lors de la mise à jour de la classe:', err);
      toast({
        title: "Erreur lors de la mise à jour",
        description: err instanceof Error ? err.message : "Une erreur est survenue lors de la mise à jour.",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteClass = async (id: string) => {
    if (!userProfile?.schoolId) return false;

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;
      
      await fetchClasses();
      
      toast({
        title: "Classe supprimée",
        description: "La classe a été supprimée avec succès.",
      });
      
      return true;
    } catch (err) {
      console.error('Erreur lors de la suppression de la classe:', err);
      toast({
        title: "Erreur lors de la suppression",
        description: err instanceof Error ? err.message : "Une erreur est survenue lors de la suppression.",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [userProfile?.schoolId]);

  return {
    classes,
    loading,
    error,
    createClass,
    updateClass,
    deleteClass,
    refreshClasses: fetchClasses
  };
};