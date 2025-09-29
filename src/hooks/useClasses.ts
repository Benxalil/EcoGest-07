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
  series_id?: string;
  label_id?: string;
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
      console.log('useClasses: Pas de schoolId, arrêt du chargement');
      setLoading(false);
      return;
    }

    try {
      console.log('useClasses: Début du chargement des classes pour schoolId:', userProfile.schoolId);
      setLoading(true);
      setError(null);
      
      const { data: classesData, error } = await supabase
        .from('classes')
        .select('*')
        .eq('school_id', userProfile.schoolId)
        .order('name');

      if (error) throw error;
      
      console.log('useClasses: Classes récupérées:', classesData?.length || 0);
      
      // Calculer l'effectif pour chaque classe de manière optimisée
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
      
      console.log('useClasses: Classes avec effectifs calculés');
      setClasses(classesWithEnrollment);
    } catch (err) {
      console.error('useClasses: Erreur lors de la récupération des classes:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setClasses([]);
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

      // Vérifier si une classe avec le même nom existe déjà
      const { data: existingClass } = await supabase
        .from('classes')
        .select('name')
        .eq('school_id', userProfile.schoolId)
        .eq('academic_year_id', academicYears.id)
        .eq('name', classData.name)
        .maybeSingle();

      if (existingClass) {
        toast({
          title: 'Classe existante',
          description: `Une classe nommée "${classData.name}" existe déjà pour cette année académique. Veuillez choisir un nom différent.`,
          variant: 'destructive',
        });
        return false;
      }

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
      
      // Gestion spécifique de l'erreur de contrainte d'unicité
      if (err instanceof Error && err.message.includes('duplicate key value violates unique constraint')) {
        toast({
          title: 'Classe déjà existante',
          description: 'Une classe avec ce nom existe déjà. Veuillez choisir un nom différent.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erreur',
          description: err instanceof Error ? err.message : 'Erreur inconnue',
          variant: 'destructive',
        });
      }
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
    console.log('useClasses: useEffect triggered, schoolId:', userProfile?.schoolId);
    if (userProfile?.schoolId) {
      fetchClasses();
    } else {
      setLoading(false);
      setClasses([]);
    }
  }, [userProfile?.schoolId]);

  return {
    classes,
    loading,
    error,
    fetchClasses,
    createClass,
    updateClass,
    deleteClass,
    refreshClasses: fetchClasses,
    checkClassExists: async (className: string) => {
      if (!userProfile?.schoolId) return false;
      
      try {
        const { data: academicYears } = await supabase
          .from('academic_years')
          .select('id')
          .eq('school_id', userProfile.schoolId)
          .eq('is_current', true)
          .single();

        if (!academicYears) return false;

        const { data } = await supabase
          .from('classes')
          .select('name')
          .eq('school_id', userProfile.schoolId)
          .eq('academic_year_id', academicYears.id)
          .eq('name', className)
          .maybeSingle();

        return !!data;
      } catch {
        return false;
      }
    }
  };
};
