import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useToast } from '@/hooks/use-toast';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Optimisation: Une seule requête avec LEFT JOIN pour compter les élèves
      const { data: classesData, error } = await supabase
        .from('classes')
        .select(`
          *,
          students:students(count)
        `)
        .eq('school_id', userProfile.schoolId)
        .order('name');

      if (error) throw error;
      
      // Transformer les données pour inclure enrollment_count
      const classesWithEnrollment = (classesData || []).map((classe: any) => ({
        ...classe,
        enrollment_count: classe.students?.[0]?.count || 0,
        students: undefined // Supprimer la propriété temporaire
      }));
      
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

    const tempId = `temp-${Date.now()}`;
    let optimisticClass: ClassData | null = null;

    try {
      const { data: academicYears, error: academicError } = await supabase
        .from('academic_years')
        .select('id')
        .eq('school_id', userProfile.schoolId)
        .eq('is_current', true)
        .single();

      if (academicError) throw academicError;

      // Vérifier si une classe avec le même nom ET section existe déjà
      const { data: existingClass } = await supabase
        .from('classes')
        .select('name, section')
        .eq('school_id', userProfile.schoolId)
        .eq('academic_year_id', academicYears.id)
        .eq('name', classData.name)
        .eq('section', classData.section || null)
        .maybeSingle();

      if (existingClass) {
        // Extraire le libellé (dernière lettre) pour l'affichage
        const labelMatch = existingClass.section?.match(/[A-Z]$/);
        const label = labelMatch ? ` ${labelMatch[0]}` : '';
        
        toast({
          title: 'Classe existante',
          description: `Une classe "${classData.name}${label}" existe déjà pour cette année académique.`,
          variant: 'destructive',
        });
        return false;
      }

      // Mise à jour optimiste
      optimisticClass = {
        ...classData,
        id: tempId,
        school_id: userProfile.schoolId,
        academic_year_id: academicYears.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        enrollment_count: 0
      };

      setClasses(prev => [...prev, optimisticClass!].sort((a, b) => 
        a.name.localeCompare(b.name)
      ));

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

      // Remplacer l'élément optimiste par le réel
      setClasses(prev => prev.map(c => c.id === tempId ? { ...data, enrollment_count: 0 } : c));

      toast({
        title: 'Succès',
        description: 'Classe créée avec succès',
      });
      return true;
    } catch (err) {
      // Rollback en cas d'erreur
      if (optimisticClass) {
        setClasses(prev => prev.filter(c => c.id !== tempId));
      }

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
    const previousState = classes.find(c => c.id === id);

    try {
      // Mise à jour optimiste
      setClasses(prev => prev.map(c => 
        c.id === id ? { ...c, ...classData, updated_at: new Date().toISOString() } : c
      ));

      const { data, error } = await supabase
        .from('classes')
        .update(classData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Remplacer avec les données réelles
      setClasses(prev => prev.map(c => c.id === id ? { ...data, enrollment_count: c.enrollment_count } : c));

      toast({
        title: 'Succès',
        description: 'Classe mise à jour avec succès',
      });
      return true;
    } catch (err) {
      // Rollback en cas d'erreur
      if (previousState) {
        setClasses(prev => prev.map(c => c.id === id ? previousState : c));
      }

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
    const previousState = classes.find(c => c.id === id);

    try {
      // Suppression optimiste
      setClasses(prev => prev.filter(c => c.id !== id));

      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Classe supprimée avec succès',
      });
      return true;
    } catch (err) {
      // Rollback en cas d'erreur
      if (previousState) {
        setClasses(prev => [...prev, previousState]);
      }

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

  // Realtime synchronization
  useEffect(() => {
    if (!userProfile?.schoolId) return;

    const channel: RealtimeChannel = supabase
      .channel('classes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'classes',
          filter: `school_id=eq.${userProfile.schoolId}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newClass = payload.new as ClassData;
            setClasses(prev => {
              const exists = prev.some(c => c.id === newClass.id);
              if (exists) return prev;
              return [...prev, { ...newClass, enrollment_count: 0 }].sort((a, b) => 
                a.name.localeCompare(b.name)
              );
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedClass = payload.new as ClassData;
            setClasses(prev => prev.map(c => 
              c.id === updatedClass.id ? { ...updatedClass, enrollment_count: c.enrollment_count } : c
            ));
          } else if (payload.eventType === 'DELETE') {
            setClasses(prev => prev.filter(c => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
