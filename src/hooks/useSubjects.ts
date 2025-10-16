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
  coefficient?: number;
  hours_per_week?: number;
  color?: string;
  max_score?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateSubjectData {
  name: string;
  abbreviation?: string;
  class_id: string;
  coefficient?: number;
  hours_per_week?: number;
  color?: string;
  max_score?: number;
}

export const useSubjects = (classId?: string, teacherId?: string | null) => {
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
      
      console.log('🔍 useSubjects - Params:', { classId, teacherId, schoolId: userProfile.schoolId });
      
      // Si teacherId est fourni, filtrer par les matières de l'enseignant
      if (teacherId) {
        console.log('👨‍🏫 Filtering by teacher:', teacherId);
        
        // TOUJOURS filtrer par classe pour un enseignant
        if (!classId) {
          console.log('⚠️ classId is required when filtering by teacher');
          setSubjects([]);
          setLoading(false);
          return;
        }
        
        // Récupérer les matières via les emplois du temps (schedules)
        // Utiliser à la fois subject (nom) et subject_id
        const { data: schedules, error: schedError } = await supabase
          .from('schedules')
          .select('subject, subject_id')
          .eq('teacher_id', teacherId)
          .eq('school_id', userProfile.schoolId)
          .eq('class_id', classId);  // TOUJOURS filtrer par classe
        
        console.log('📅 Schedules found:', schedules);

        if (schedError) throw schedError;

        // Extraire les IDs uniques ET les noms de matières
        const subjectIds = Array.from(
          new Set(schedules?.map(s => s.subject_id).filter(Boolean))
        ) || [];
        const subjectNames = Array.from(
          new Set(schedules?.map(s => s.subject).filter(Boolean))
        ) || [];
        
        console.log('🔑 Subject IDs:', subjectIds);
        console.log('📝 Subject Names:', subjectNames);
        
        if (subjectIds.length === 0 && subjectNames.length === 0) {
          console.log('⚠️ No subjects found for this teacher in this class');
          setSubjects([]);
          setLoading(false);
          return;
        }

        // Construire la requête combinée pour chercher par ID OU par nom
        let query = supabase
          .from('subjects')
          .select('*')
          .eq('school_id', userProfile.schoolId)
          .eq('class_id', classId);

        // Construire la clause OR pour chercher soit par ID soit par nom
        const orConditions: string[] = [];
        
        if (subjectIds.length > 0) {
          orConditions.push(`id.in.(${subjectIds.join(',')})`);
        }
        
        if (subjectNames.length > 0) {
          const escapedNames = subjectNames.map(name => `"${name}"`);
          orConditions.push(`name.in.(${escapedNames.join(',')})`);
        }
        
        if (orConditions.length > 0) {
          query = query.or(orConditions.join(','));
        }

        const { data, error } = await query.order('name');
        
        console.log('✅ Final subjects:', data);
        
        if (error) {
          if (error.code === 'PGRST116' || error.message.includes('relation "subjects" does not exist')) {
            setSubjects([]);
            return;
          }
          throw error;
        }
        
        setSubjects(data || []);
      } else {
        // Requête normale sans filtre enseignant
        const query = supabase
          .from('subjects')
          .select('*')
          .eq('school_id', userProfile.schoolId);

        if (classId) {
          query.eq('class_id', classId);
        }

        const { data, error } = await query.order('name');

        if (error) {
          // Si la table n'existe pas, retourner un tableau vide
          if (error.code === 'PGRST116' || error.message.includes('relation "subjects" does not exist')) {
            setSubjects([]);
            return;
          }
          throw error;
        }
        
        setSubjects(data || []);
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des matières:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la récupération des matières');
      // En cas d'erreur, retourner un tableau vide pour éviter de casser l'interface
      setSubjects([]);
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
          abbreviation: subjectData.abbreviation || '',
          code: subjectData.abbreviation || subjectData.name.substring(0, 3).toUpperCase(),
          class_id: subjectData.class_id,
          school_id: userProfile.schoolId,
          coefficient: subjectData.coefficient || 1,
          hours_per_week: subjectData.hours_per_week || 1,
          color: subjectData.color || '#3B82F6',
          max_score: subjectData.max_score || 20
        });

      if (error) {
        console.error('Erreur lors de la création de la matière:', error);
        throw error;
      }

      await fetchSubjects();

      toast({
        title: "Matière ajoutée avec succès",
        description: `La matière ${subjectData.name} a été ajoutée.`,
      });

      return true;
    } catch (err: any) {
      console.error('Erreur lors de la création de la matière:', err);
      
      let errorMessage = "Une erreur est survenue lors de la création de la matière.";
      
      if (err?.code === '23505') {
        errorMessage = "Cette matière existe déjà dans cette classe.";
      } else if (err?.code === '23503') {
        errorMessage = "Classe ou école introuvable.";
      } else if (err?.code === '23502') {
        errorMessage = "Données manquantes pour créer la matière.";
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      toast({
        title: "Erreur lors de la création",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  };

  const updateSubject = async (id: string, subjectData: Partial<CreateSubjectData>) => {
    if (!userProfile?.schoolId) return false;

    try {
      // Préparer les données de mise à jour avec le code
      const updateData = {
        ...subjectData,
        code: subjectData.abbreviation || (subjectData.name ? subjectData.name.substring(0, 3).toUpperCase() : undefined)
      };

      const { error } = await supabase
        .from('subjects')
        .update(updateData)
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;

      await fetchSubjects();

      // Émettre un événement pour notifier que les matières ont été mises à jour
      window.dispatchEvent(new CustomEvent('matieresUpdated'));
      localStorage.setItem('matieresUpdated', Date.now().toString());

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
    void fetchSubjects();
  }, [userProfile?.schoolId, classId, teacherId]);

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


