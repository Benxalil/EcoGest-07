import { useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useToast } from '@/hooks/use-toast';
import { QueryKeys, CacheStaleTime } from '@/lib/queryClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface TeacherData {
  id: string;
  first_name: string;
  last_name: string;
  employee_number: string;
  phone?: string;
  address?: string;
  specialization?: string;
  hire_date?: string;
  is_active: boolean;
  school_id: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTeacherData {
  first_name: string;
  last_name: string;
  phone?: string;
  address?: string;
  specialization?: string;
  hire_date?: string;
  is_active?: boolean;
}

// Fonction de fetch séparée pour React Query
const fetchTeachersFromSupabase = async (schoolId: string): Promise<TeacherData[]> => {
  const { data, error } = await supabase
    .from('teachers')
    .select('*')
    .eq('school_id', schoolId)
    .order('last_name');

  if (error) throw error;
  return data || [];
};

// Créer un compte d'authentification pour l'enseignant
const createTeacherAuthAccount = async (
  supabase: any,
  employeeNumber: string,
  schoolSuffix: string,
  firstName: string,
  lastName: string,
  password: string,
  schoolId: string
) => {
  try {
    const { data, error } = await supabase.functions.invoke('create-user-account', {
      body: {
        email: employeeNumber,
        password: password,
        role: 'teacher',
        first_name: firstName,
        last_name: lastName,
        school_id: schoolId,
        school_suffix: schoolSuffix
      }
    });

    if (error) {
      console.error('Erreur lors de la création du compte auth:', error);
      return null;
    }

    return data.user;
  } catch (error) {
    console.error('Erreur lors de la création du compte auth:', error);
    return null;
  }
};

export const useTeachers = () => {
  const queryClient = useQueryClient();
  const { userProfile } = useUserRole();
  const { toast } = useToast();

  // ✅ Query avec cache automatique
  const {
    data: teachers = [],
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: QueryKeys.teachers(userProfile?.schoolId),
    queryFn: () => fetchTeachersFromSupabase(userProfile!.schoolId),
    staleTime: CacheStaleTime.TEACHERS,
    gcTime: 10 * 60 * 1000,
    enabled: !!userProfile?.schoolId,
  });

  const error = queryError instanceof Error ? queryError.message : null;

  // ✅ Mutation optimiste pour createTeacher
  const createTeacherMutation = useMutation({
    mutationFn: async (teacherData: CreateTeacherData & { employee_number?: string; password?: string }) => {
      const { data: schoolData } = await supabase
        .from('schools')
        .select('school_suffix')
        .eq('id', userProfile!.schoolId)
        .single();

      const schoolSuffix = schoolData?.school_suffix || 'school';

      const { data: fullIdentifier, error: identifierError } = await supabase.rpc('generate_user_identifier', {
        school_id_param: userProfile!.schoolId,
        role_param: 'teacher'
      });

      if (identifierError || !fullIdentifier) {
        throw new Error('Impossible de générer l\'identifiant');
      }

      const employee_number = teacherData.employee_number || fullIdentifier.split('@')[0];
      const password = teacherData.password || 'teacher123';

      const authUser = await createTeacherAuthAccount(
        supabase,
        employee_number,
        schoolSuffix,
        teacherData.first_name,
        teacherData.last_name,
        password,
        userProfile!.schoolId
      );

      const { data, error } = await supabase
        .from('teachers')
        .insert({
          first_name: teacherData.first_name,
          last_name: teacherData.last_name,
          employee_number,
          phone: teacherData.phone,
          address: teacherData.address,
          specialization: teacherData.specialization,
          hire_date: teacherData.hire_date || new Date().toISOString().split('T')[0],
          is_active: teacherData.is_active ?? true,
          school_id: userProfile!.schoolId,
          user_id: authUser?.id || null
        })
        .select()
        .single();

      if (error) throw error;
      return { data, authUser };
    },
    onMutate: async (teacherData) => {
      await queryClient.cancelQueries({ queryKey: QueryKeys.teachers(userProfile?.schoolId) });
      const previousTeachers = queryClient.getQueryData(QueryKeys.teachers(userProfile?.schoolId));

      queryClient.setQueryData<TeacherData[]>(
        QueryKeys.teachers(userProfile?.schoolId),
        (old = []) => [...old, {
          ...teacherData,
          id: `temp-${Date.now()}`,
          employee_number: '',
          is_active: teacherData.is_active ?? true,
          school_id: userProfile!.schoolId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]
      );

      return { previousTeachers };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(QueryKeys.teachers(userProfile?.schoolId), context?.previousTeachers);
      toast({
        title: "Erreur lors de la création",
        description: err instanceof Error ? err.message : "Une erreur est survenue.",
        variant: "destructive",
      });
    },
    onSuccess: (result) => {
      const message = result.authUser
        ? `Enseignant créé avec le matricule: ${result.data.employee_number}`
        : "L'enseignant a été créé mais le compte de connexion n'a pas pu être généré.";

      toast({
        title: result.authUser ? "Succès" : "Avertissement",
        description: message,
        variant: result.authUser ? "default" : "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.teachers(userProfile?.schoolId) });
    }
  });

  const createTeacher = useCallback(async (teacherData: CreateTeacherData & { employee_number?: string; password?: string }) => {
    if (!userProfile?.schoolId) return false;
    try {
      await createTeacherMutation.mutateAsync(teacherData);
      return true;
    } catch {
      return false;
    }
  }, [userProfile?.schoolId, createTeacherMutation]);

  // ✅ Mutation pour updateTeacher
  const updateTeacherMutation = useMutation({
    mutationFn: async ({ id, teacherData }: { id: string; teacherData: Partial<CreateTeacherData> }) => {
      const { error } = await supabase
        .from('teachers')
        .update(teacherData)
        .eq('id', id)
        .eq('school_id', userProfile!.schoolId);

      if (error) throw error;
    },
    onMutate: async ({ id, teacherData }) => {
      await queryClient.cancelQueries({ queryKey: QueryKeys.teachers(userProfile?.schoolId) });
      const previousTeachers = queryClient.getQueryData(QueryKeys.teachers(userProfile?.schoolId));

      queryClient.setQueryData<TeacherData[]>(
        QueryKeys.teachers(userProfile?.schoolId),
        (old = []) => old.map(t => t.id === id ? { ...t, ...teacherData, updated_at: new Date().toISOString() } : t)
      );

      return { previousTeachers };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(QueryKeys.teachers(userProfile?.schoolId), context?.previousTeachers);
      toast({
        title: "Erreur lors de la mise à jour",
        description: err instanceof Error ? err.message : "Une erreur est survenue.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Enseignant mis à jour",
        description: "L'enseignant a été mis à jour avec succès.",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.teachers(userProfile?.schoolId) });
    }
  });

  const updateTeacher = useCallback(async (id: string, teacherData: Partial<CreateTeacherData>) => {
    if (!userProfile?.schoolId) return false;
    try {
      await updateTeacherMutation.mutateAsync({ id, teacherData });
      return true;
    } catch {
      return false;
    }
  }, [userProfile?.schoolId, updateTeacherMutation]);

  // ✅ Mutation pour deleteTeacher
  const deleteTeacherMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('teachers')
        .delete()
        .eq('id', id)
        .eq('school_id', userProfile!.schoolId);

      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QueryKeys.teachers(userProfile?.schoolId) });
      const previousTeachers = queryClient.getQueryData(QueryKeys.teachers(userProfile?.schoolId));

      queryClient.setQueryData<TeacherData[]>(
        QueryKeys.teachers(userProfile?.schoolId),
        (old = []) => old.filter(t => t.id !== id)
      );

      return { previousTeachers };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(QueryKeys.teachers(userProfile?.schoolId), context?.previousTeachers);
      toast({
        title: "Erreur lors de la suppression",
        description: err instanceof Error ? err.message : "Une erreur est survenue.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Enseignant supprimé",
        description: "L'enseignant a été supprimé avec succès.",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.teachers(userProfile?.schoolId) });
    }
  });

  const deleteTeacher = useCallback(async (id: string) => {
    if (!userProfile?.schoolId) return false;
    try {
      await deleteTeacherMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  }, [userProfile?.schoolId, deleteTeacherMutation]);

  // ✅ Realtime synchronization avec invalidation React Query
  useEffect(() => {
    if (!userProfile?.schoolId) return;

    const channel: RealtimeChannel = supabase
      .channel('teachers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teachers',
          filter: `school_id=eq.${userProfile.schoolId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: QueryKeys.teachers(userProfile.schoolId) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile?.schoolId, queryClient]);

  const refreshTeachers = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: QueryKeys.teachers(userProfile?.schoolId) });
  }, [queryClient, userProfile?.schoolId]);

  return {
    teachers,
    loading,
    error,
    createTeacher,
    updateTeacher,
    deleteTeacher,
    refreshTeachers
  };
};
