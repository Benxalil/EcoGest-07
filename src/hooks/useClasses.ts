import { useState, useEffect, useCallback } from 'react';
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
  enrollment_count?: number;
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

  const fetchClasses = useCallback(async () => {
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
      
      // Calculer l'effectif pour chaque classe
      const classesWithEnrollment = await Promise.all(
        (classesData || []).map(async (classe) => {
          const { count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', classe.id)
            .eq('is_active', true);
          
          return {
            ...classe,
            enrollment_count: count || 0
          };
        })
      );
      
      setClasses(classesWithEnrollment);
    } catch (err) {
      console.error('Erreur lors de la récupération des classes:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [userProfile?.schoolId]);

  const createClass = async (classData: CreateClassData) => {
    if (!userProfile?.schoolId) return false;

    try {
      const { data: academicYears, error: academicError } = await supabase
        .from('academic_years')
        .select('id')
        .eq('school_id', userProfile.schoolId)
        .eq('is_current', true)
        .single();

      if (academicError) throw academicError;

      const { data, error } = await supabase
        .from('classes')
        .insert({
          ...classData,
          school_id: userProfile.schoolId,
          academic_year_id: academicYears.id,
        })
        .select()
        .single();

      if (error) throw error;

      setClasses(prev => [...prev, data]);
      toast({
        title: 'Succès',
        description: 'Classe créée avec succès',
      });
      return true;
    } catch (err) {
      console.error('Erreur lors de la création de la classe:', err);
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Erreur inconnue',
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateClass = async (id: string, classData: Partial<CreateClassData>) => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .update(classData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setClasses(prev => prev.map(cls => cls.id === id ? data : cls));
      toast({
        title: 'Succès',
        description: 'Classe mise à jour avec succès',
      });
      return true;
    } catch (err) {
      console.error('Erreur lors de la mise à jour de la classe:', err);
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Erreur inconnue',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteClass = async (id: string) => {
    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setClasses(prev => prev.filter(cls => cls.id !== id));
      toast({
        title: 'Succès',
        description: 'Classe supprimée avec succès',
      });
      return true;
    } catch (err) {
      console.error('Erreur lors de la suppression de la classe:', err);
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Erreur inconnue',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  return {
    classes,
    loading,
    error,
    fetchClasses,
    createClass,
    updateClass,
    deleteClass,
    refreshClasses: fetchClasses,
  };
};
