import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useToast } from '@/hooks/use-toast';
import { QueryKeys, CacheStaleTime } from '@/lib/queryClient';

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

// ✅ Fonction optimisée pour récupérer les matières
const fetchSubjects = async (
  schoolId: string,
  classId?: string,
  teacherId?: string | null
): Promise<Subject[]> => {
  if (!schoolId) return [];

  console.log('🔍 fetchSubjects - Params:', { classId, teacherId, schoolId });

  // ✅ OPTIMISATION: Si teacherId fourni, une seule requête avec JOIN
  if (teacherId && classId) {
    console.log('👨‍🏫 Filtering by teacher with optimized query');

    // Une seule requête avec JOIN au lieu de 2 requêtes séquentielles
    const { data, error } = await supabase
      .from('subjects')
      .select(`
        *,
        schedules!inner(teacher_id, subject_id, subject)
      `)
      .eq('school_id', schoolId)
      .eq('class_id', classId)
      .eq('schedules.teacher_id', teacherId);

    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('relation "subjects" does not exist')) {
        return [];
      }
      throw error;
    }

    // Dédupliquer les matières (car JOIN peut créer des doublons)
    const uniqueSubjects = Array.from(
      new Map(data?.map(item => [item.id, item]) || []).values()
    );

    console.log('✅ Optimized subjects:', uniqueSubjects);
    return uniqueSubjects.map(({ schedules, ...subject }) => subject);
  }

  // Requête normale pour admin
  const query = supabase
    .from('subjects')
    .select('*')
    .eq('school_id', schoolId);

  if (classId) {
    query.eq('class_id', classId);
  }

  const { data, error } = await query.order('name');

  if (error) {
    if (error.code === 'PGRST116' || error.message.includes('relation "subjects" does not exist')) {
      return [];
    }
    throw error;
  }

  return data || [];
};

export const useSubjectsOptimized = (classId?: string, teacherId?: string | null) => {
  const { userProfile } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ✅ React Query avec cache de 5 minutes (matières changent rarement)
  const { 
    data: subjects = [], 
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: QueryKeys.subjects(userProfile?.schoolId, classId, teacherId),
    queryFn: () => fetchSubjects(userProfile?.schoolId || '', classId, teacherId),
    enabled: !!userProfile?.schoolId,
    staleTime: CacheStaleTime.SUBJECTS, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // ✅ Mutations avec invalidation automatique du cache
  const createMutation = useMutation({
    mutationFn: async (subjectData: CreateSubjectData) => {
      if (!userProfile?.schoolId) throw new Error('School ID required');

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

      if (error) throw error;
      return subjectData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: QueryKeys.subjects(userProfile?.schoolId) 
      });
      toast({
        title: "Matière ajoutée avec succès",
        description: `La matière ${data.name} a été ajoutée.`,
      });
    },
    onError: (err: any) => {
      let errorMessage = "Une erreur est survenue lors de la création de la matière.";
      if (err?.code === '23505') errorMessage = "Cette matière existe déjà dans cette classe.";
      else if (err?.code === '23503') errorMessage = "Classe ou école introuvable.";
      else if (err?.message) errorMessage = err.message;

      toast({
        title: "Erreur lors de la création",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateSubjectData> }) => {
      if (!userProfile?.schoolId) throw new Error('School ID required');

      const updateData = {
        ...data,
        code: data.abbreviation || (data.name ? data.name.substring(0, 3).toUpperCase() : undefined)
      };

      const { error } = await supabase
        .from('subjects')
        .update(updateData)
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: QueryKeys.subjects(userProfile?.schoolId) 
      });
      
      window.dispatchEvent(new CustomEvent('matieresUpdated'));
      localStorage.setItem('matieresUpdated', Date.now().toString());

      toast({
        title: "Matière mise à jour",
        description: "La matière a été mise à jour avec succès.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Erreur lors de la mise à jour",
        description: err.message || "Une erreur est survenue lors de la mise à jour.",
        variant: "destructive",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userProfile?.schoolId) throw new Error('School ID required');

      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: QueryKeys.subjects(userProfile?.schoolId) 
      });

      toast({
        title: "Matière supprimée",
        description: "La matière a été supprimée avec succès.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Erreur lors de la suppression",
        description: err.message || "Une erreur est survenue lors de la suppression.",
        variant: "destructive",
      });
    }
  });

  return {
    subjects,
    loading: isLoading,
    error: error?.message || null,
    createSubject: (data: CreateSubjectData) => createMutation.mutateAsync(data),
    updateSubject: (id: string, data: Partial<CreateSubjectData>) => 
      updateMutation.mutateAsync({ id, data }),
    deleteSubject: (id: string) => deleteMutation.mutateAsync(id),
    refreshSubjects: refetch
  };
};
