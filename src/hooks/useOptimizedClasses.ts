import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedUserRole } from './useOptimizedUserRole';
import { useCache } from './useCache';
import { useToast } from './use-toast';

export interface ClassData {
  id: string;
  name: string;
  level: string;
  section?: string;
  capacity?: number;
  effectif?: number;
  academic_year_id: string;
  school_id: string;
  created_at: string;
  updated_at: string;
  series_id?: string;
  label_id?: string;
  enrollment_count?: number;
}

export interface CreateClassData {
  name: string;
  level: string;
  section?: string;
  capacity?: number;
}

export const useOptimizedClasses = () => {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { userProfile } = useOptimizedUserRole();
  const cache = useCache();
  const { toast } = useToast();

  const fetchClasses = useCallback(async () => {
    if (!userProfile?.schoolId) {
      setLoading(false);
      return;
    }

    const cacheKey = `classes_${userProfile.schoolId}`;
    const cachedClasses = cache.get<ClassData[]>(cacheKey);
    
    if (cachedClasses) {
      console.log('Classes récupérées depuis le cache');
      setClasses(cachedClasses);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Requête optimisée avec JOIN pour récupérer classes + effectifs en une seule requête
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          students!inner(count)
        `)
        .eq('school_id', userProfile.schoolId)
        .order('name');

      if (error) throw error;

      // Traiter les données pour calculer l'effectif
      const classesWithEnrollment = (data || []).map(classItem => {
        // Compter les étudiants actifs
        const enrollmentCount = classItem.students?.length || 0;
        
        return {
          ...classItem,
          enrollment_count: enrollmentCount,
          students: undefined // Nettoyer les données students pour éviter la duplication
        };
      });

      // Mettre en cache pour 5 minutes
      cache.set(cacheKey, classesWithEnrollment, 5 * 60 * 1000);
      setClasses(classesWithEnrollment);
      console.log('Classes récupérées depuis la DB et mises en cache');
      
    } catch (error) {
      console.error('Error fetching classes:', error);
      setError('Erreur lors de la récupération des classes');
      toast({
        title: "Erreur",
        description: "Impossible de charger les classes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [userProfile?.schoolId, cache, toast]);

  const createClass = async (classData: CreateClassData): Promise<boolean> => {
    if (!userProfile?.schoolId) return false;

    try {
      // Récupérer l'année académique actuelle
      const { data: academicYears } = await supabase
        .from('academic_years')
        .select('id')
        .eq('school_id', userProfile.schoolId)
        .eq('is_current', true)
        .single();

      if (!academicYears) {
        throw new Error('Aucune année académique active trouvée');
      }

      const { error } = await supabase
        .from('classes')
        .insert({
          ...classData,
          school_id: userProfile.schoolId,
          academic_year_id: academicYears.id,
        });

      if (error) throw error;

      // Invalider le cache et recharger
      cache.delete(`classes_${userProfile.schoolId}`);
      await fetchClasses();
      
      toast({
        title: "Succès",
        description: "Classe créée avec succès",
      });
      
      return true;
    } catch (error) {
      console.error('Error creating class:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la création de la classe",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateClass = async (id: string, classData: Partial<CreateClassData>): Promise<boolean> => {
    if (!userProfile?.schoolId) return false;

    try {
      const { error } = await supabase
        .from('classes')
        .update(classData)
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;

      // Invalider le cache et recharger
      cache.delete(`classes_${userProfile.schoolId}`);
      await fetchClasses();
      
      toast({
        title: "Succès",
        description: "Classe modifiée avec succès",
      });
      
      return true;
    } catch (error) {
      console.error('Error updating class:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la modification de la classe",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteClass = async (id: string): Promise<boolean> => {
    if (!userProfile?.schoolId) return false;

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;

      // Invalider le cache et recharger
      cache.delete(`classes_${userProfile.schoolId}`);
      await fetchClasses();
      
      toast({
        title: "Succès",
        description: "Classe supprimée avec succès",
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting class:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression de la classe",
        variant: "destructive",
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
    createClass,
    updateClass,
    deleteClass,
    refreshClasses: fetchClasses,
  };
};