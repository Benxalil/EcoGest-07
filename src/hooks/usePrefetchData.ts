import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { QueryKeys } from '@/lib/queryClient';

/**
 * Hook pour précharger les données en arrière-plan
 * ✅ Améliore la perception de vitesse en chargeant les données avant qu'elles soient nécessaires
 * ✅ Utilise le cache React Query pour éviter les requêtes redondantes
 * 
 * @example
 * ```tsx
 * const { prefetchStudents, prefetchPayments } = usePrefetchData();
 * 
 * // Au login ou navigation
 * prefetchStudents(schoolId);
 * prefetchPayments(schoolId);
 * ```
 */
export function usePrefetchData() {
  const queryClient = useQueryClient();

  /**
   * Précharger les élèves d'une école
   */
  const prefetchStudents = useCallback(async (schoolId: string) => {
    await queryClient.prefetchQuery({
      queryKey: QueryKeys.students(schoolId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('students')
          .select(`
            *,
            classes!inner(
              id,
              name,
              level,
              section
            )
          `)
          .eq('school_id', schoolId)
          .order('first_name');

        if (error) throw error;
        return data || [];
      },
    });
  }, [queryClient]);

  /**
   * Précharger les paiements d'une école
   */
  const prefetchPayments = useCallback(async (schoolId: string) => {
    await queryClient.prefetchQuery({
      queryKey: QueryKeys.payments(schoolId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .eq('school_id', schoolId)
          .order('payment_date', { ascending: false });

        if (error) throw error;
        return data || [];
      },
    });
  }, [queryClient]);

  /**
   * Précharger les classes d'une école
   */
  const prefetchClasses = useCallback(async (schoolId: string) => {
    await queryClient.prefetchQuery({
      queryKey: QueryKeys.classes(schoolId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('classes')
          .select(`
            *,
            students:students(count)
          `)
          .eq('school_id', schoolId)
          .order('name');

        if (error) throw error;
        return (data || []).map((classe: any) => ({
          ...classe,
          enrollment_count: classe.students?.[0]?.count || 0,
          students: undefined
        }));
      },
    });
  }, [queryClient]);

  /**
   * Précharger les enseignants d'une école
   */
  const prefetchTeachers = useCallback(async (schoolId: string) => {
    await queryClient.prefetchQuery({
      queryKey: QueryKeys.teachers(schoolId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('teachers')
          .select('*')
          .eq('school_id', schoolId)
          .order('last_name');

        if (error) throw error;
        return data || [];
      },
    });
  }, [queryClient]);

  /**
   * Précharger les matières d'une école
   */
  const prefetchSubjects = useCallback(async (schoolId: string) => {
    await queryClient.prefetchQuery({
      queryKey: QueryKeys.subjects(schoolId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('subjects')
          .select('*')
          .eq('school_id', schoolId)
          .order('name');

        if (error) throw error;
        return data || [];
      },
    });
  }, [queryClient]);

  /**
   * Précharger toutes les données critiques d'une école
   * ✅ Utiliser au login pour améliorer l'expérience utilisateur
   */
  const prefetchAllSchoolData = useCallback(async (schoolId: string) => {
    await Promise.all([
      prefetchStudents(schoolId),
      prefetchClasses(schoolId),
      prefetchTeachers(schoolId),
      prefetchSubjects(schoolId),
      prefetchPayments(schoolId)
    ]);
  }, [prefetchStudents, prefetchClasses, prefetchTeachers, prefetchSubjects, prefetchPayments]);

  return {
    prefetchStudents,
    prefetchPayments,
    prefetchClasses,
    prefetchTeachers,
    prefetchSubjects,
    prefetchAllSchoolData
  };
}
