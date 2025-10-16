import { useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useToast } from '@/hooks/use-toast';
import { QueryKeys, CacheStaleTime } from '@/lib/queryClient';
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

// Fonction de fetch séparée pour React Query
const fetchClassesFromSupabase = async (schoolId: string): Promise<ClassData[]> => {
  const { data: classesData, error } = await supabase
    .from('classes')
    .select(`
      *,
      students:students(count)
    `)
    .eq('school_id', schoolId)
    .order('name');

  if (error) throw error;
  
  // Transformer les données pour inclure enrollment_count
  return (classesData || []).map((classe: any) => ({
    ...classe,
    enrollment_count: classe.students?.[0]?.count || 0,
    students: undefined
  }));
};

export const useClasses = () => {
  const queryClient = useQueryClient();
  const { userProfile } = useUserRole();
  const { toast } = useToast();

  // ✅ Query avec cache automatique
  const {
    data: classes = [],
    isLoading: loading,
    error: queryError,
    refetch: fetchClasses
  } = useQuery({
    queryKey: QueryKeys.classes(userProfile?.schoolId),
    queryFn: () => fetchClassesFromSupabase(userProfile!.schoolId),
    staleTime: CacheStaleTime.CLASSES,
    gcTime: 10 * 60 * 1000,
    enabled: !!userProfile?.schoolId,
  });

  const error = queryError instanceof Error ? queryError.message : null;

  // ✅ Mutation optimiste pour createClass
  const createClassMutation = useMutation({
    mutationFn: async (classData: CreateClassData) => {
      // 1️⃣ Chercher l'année académique active
      let { data: academicYears, error: academicError } = await supabase
        .from('academic_years')
        .select('id, name')
        .eq('school_id', userProfile!.schoolId)
        .eq('is_current', true)
        .maybeSingle();

      // 2️⃣ Si aucune année académique active, la créer automatiquement
      if (!academicYears) {
        console.log('⚠️ Aucune année académique active trouvée, création automatique...');
        
        const currentYear = new Date().getFullYear();
        const nextYear = currentYear + 1;
        const academicYearName = `${currentYear}/${nextYear}`;
        
        const { data: newAcademicYear, error: createError } = await supabase
          .from('academic_years')
          .insert({
            school_id: userProfile!.schoolId,
            name: academicYearName,
            start_date: `${currentYear}-09-01`,
            end_date: `${nextYear}-07-31`,
            is_current: true
          })
          .select('id, name')
          .single();

        if (createError) {
          console.error('❌ Erreur création année académique:', createError);
          throw new Error(`Impossible de créer l'année académique : ${createError.message}`);
        }

        academicYears = newAcademicYear;
        console.log('✅ Année académique créée:', academicYears);
      }

      // 3️⃣ Vérifier si une classe identique existe déjà
      const { data: existingClass } = await supabase
        .from('classes')
        .select('name, section')
        .eq('school_id', userProfile!.schoolId)
        .eq('academic_year_id', academicYears.id)
        .eq('name', classData.name)
        .eq('section', classData.section || null)
        .maybeSingle();

      if (existingClass) {
        const labelMatch = existingClass.section?.match(/[A-Z]$/);
        const label = labelMatch ? ` ${labelMatch[0]}` : '';
        throw new Error(`Une classe "${classData.name}${label}" existe déjà pour cette année académique.`);
      }

      // 4️⃣ Insérer la classe
      const { data, error } = await supabase
        .from('classes')
        .insert({
          ...classData,
          school_id: userProfile!.schoolId,
          academic_year_id: academicYears.id,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur insertion classe:', error);
        throw error;
      }

      console.log('✅ Classe créée avec succès:', data);
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.classes(userProfile?.schoolId) });
    }
  });

  const createClass = useCallback(async (classData: CreateClassData) => {
    if (!userProfile?.schoolId) return false;

    // 1️⃣ Créer un objet classe temporaire avec ID local
    const tempId = `temp-${Date.now()}`;
    const tempClass: ClassData = {
      ...classData,
      id: tempId,
      school_id: userProfile.schoolId,
      academic_year_id: '', // Sera rempli après
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      enrollment_count: 0
    };

    // 2️⃣ Mise à jour optimiste IMMÉDIATE du cache React Query
    queryClient.setQueryData<ClassData[]>(
      QueryKeys.classes(userProfile.schoolId),
      (old = []) => [...old, tempClass]
    );

    // 3️⃣ Afficher le toast de succès IMMÉDIATEMENT
    toast({ 
      title: 'Succès', 
      description: 'Classe créée avec succès' 
    });

    try {
      // 4️⃣ Insertion réelle en base EN ARRIÈRE-PLAN
      await createClassMutation.mutateAsync(classData);
      return true;
    } catch (error) {
      // 5️⃣ ROLLBACK : Supprimer la classe temporaire
      queryClient.setQueryData<ClassData[]>(
        QueryKeys.classes(userProfile.schoolId),
        (old = []) => old.filter(c => c.id !== tempId)
      );

      // 6️⃣ Afficher l'erreur
      const errorMessage = error instanceof Error && error.message.includes('existe déjà')
        ? error.message
        : 'Erreur lors de la création de la classe';

      toast({ 
        title: 'Erreur', 
        description: errorMessage, 
        variant: 'destructive' 
      });
      
      return false;
    }
  }, [userProfile?.schoolId, createClassMutation, queryClient, toast]);

  // ✅ Mutation pour updateClass
  const updateClassMutation = useMutation({
    mutationFn: async ({ id, classData }: { id: string; classData: Partial<CreateClassData> }) => {
      const { data, error } = await supabase
        .from('classes')
        .update(classData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, classData }) => {
      await queryClient.cancelQueries({ queryKey: QueryKeys.classes(userProfile?.schoolId) });
      const previousClasses = queryClient.getQueryData(QueryKeys.classes(userProfile?.schoolId));
      
      queryClient.setQueryData<ClassData[]>(
        QueryKeys.classes(userProfile?.schoolId),
        (old = []) => old.map(c => c.id === id ? { ...c, ...classData, updated_at: new Date().toISOString() } : c)
      );
      
      return { previousClasses };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(QueryKeys.classes(userProfile?.schoolId), context?.previousClasses);
      toast({ title: 'Erreur', description: err instanceof Error ? err.message : 'Erreur inconnue', variant: 'destructive' });
    },
    onSuccess: () => {
      toast({ title: 'Succès', description: 'Classe mise à jour avec succès' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.classes(userProfile?.schoolId) });
    }
  });

  const updateClass = useCallback(async (id: string, classData: Partial<CreateClassData>) => {
    if (!userProfile?.schoolId) return false;
    try {
      await updateClassMutation.mutateAsync({ id, classData });
      return true;
    } catch {
      return false;
    }
  }, [userProfile?.schoolId, updateClassMutation]);

  // ✅ Mutation pour deleteClass
  const deleteClassMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('classes').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QueryKeys.classes(userProfile?.schoolId) });
      const previousClasses = queryClient.getQueryData(QueryKeys.classes(userProfile?.schoolId));
      
      queryClient.setQueryData<ClassData[]>(
        QueryKeys.classes(userProfile?.schoolId),
        (old = []) => old.filter(c => c.id !== id)
      );
      
      return { previousClasses };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(QueryKeys.classes(userProfile?.schoolId), context?.previousClasses);
      toast({ title: 'Erreur', description: err instanceof Error ? err.message : 'Erreur inconnue', variant: 'destructive' });
    },
    onSuccess: () => {
      toast({ title: 'Succès', description: 'Classe supprimée avec succès' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.classes(userProfile?.schoolId) });
    }
  });

  const deleteClass = useCallback(async (id: string) => {
    if (!userProfile?.schoolId) return false;
    try {
      await deleteClassMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  }, [userProfile?.schoolId, deleteClassMutation]);

  // ✅ Realtime synchronization avec invalidation React Query
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
        () => {
          // Invalider le cache React Query au lieu de gérer l'état manuellement
          queryClient.invalidateQueries({ queryKey: QueryKeys.classes(userProfile.schoolId) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile?.schoolId, queryClient]);

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
