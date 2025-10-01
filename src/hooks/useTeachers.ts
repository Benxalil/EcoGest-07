import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useToast } from '@/hooks/use-toast';
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

export const useTeachers = () => {
  const [teachers, setTeachers] = useState<TeacherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useUserRole();
  const { toast } = useToast();

  // Créer un compte d'authentification pour l'enseignant
  const createTeacherAuthAccount = async (employeeNumber: string, schoolSuffix: string, firstName: string, lastName: string, defaultPassword: string = 'teacher123') => {
    try {
      // Pour les enseignants, on envoie seulement le matricule (pas d'email)
      // L'Edge Function va construire l'email valide pour Supabase
      
      // Créer le compte via Edge Function
      const { data, error } = await supabase.functions.invoke('create-user-account', {
        body: { 
          email: employeeNumber, // Juste le matricule (ex: Prof03)
          password: defaultPassword, 
          role: 'teacher', 
          first_name: firstName, 
          last_name: lastName,
          school_id: userProfile?.schoolId,
          school_suffix: schoolSuffix // Nécessaire pour générer l'email valide
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

  const fetchTeachers = useCallback(async () => {
    if (!userProfile?.schoolId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('school_id', userProfile.schoolId)
        .order('last_name');

      if (error) throw error;
      
      setTeachers(data || []);
    } catch (err) {
      console.error('Erreur lors de la récupération des enseignants:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [userProfile?.schoolId]);

  const createTeacher = async (teacherData: CreateTeacherData & { employee_number?: string }) => {
    if (!userProfile?.schoolId) return false;

    const tempId = `temp-${Date.now()}`;
    let optimisticTeacher: TeacherData | null = null;

    try {
      // D'abord, récupérer le suffixe de l'école
      const { data: schoolData } = await supabase
        .from('schools')
        .select('school_suffix')
        .eq('id', userProfile.schoolId)
        .single();

      const schoolSuffix = schoolData?.school_suffix || 'school';

      // Générer l'identifiant complet avec le suffixe de l'école
      const { data: fullIdentifier, error: identifierError } = await supabase.rpc('generate_user_identifier', {
        school_id_param: userProfile.schoolId,
        role_param: 'teacher'
      });

      if (identifierError || !fullIdentifier) {
        throw new Error('Impossible de générer l\'identifiant');
      }

      // Utiliser le matricule fourni ou extraire de l'identifiant généré
      let employee_number = teacherData.employee_number;
      
      if (!employee_number) {
        employee_number = fullIdentifier.split('@')[0];
      }

      // Mise à jour optimiste
      optimisticTeacher = {
        id: tempId,
        first_name: teacherData.first_name,
        last_name: teacherData.last_name,
        employee_number,
        phone: teacherData.phone,
        address: teacherData.address,
        specialization: teacherData.specialization,
        hire_date: teacherData.hire_date || new Date().toISOString().split('T')[0],
        is_active: teacherData.is_active ?? true,
        school_id: userProfile.schoolId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setTeachers(prev => [...prev, optimisticTeacher!]);

      // Créer le compte d'authentification
      const authUser = await createTeacherAuthAccount(employee_number, schoolSuffix, teacherData.first_name, teacherData.last_name);
      
      if (!authUser) {
        toast({
          title: "Avertissement",
          description: "L'enseignant a été créé mais le compte de connexion n'a pas pu être généré. Contactez l'administrateur.",
          variant: "destructive",
        });
      }

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
          school_id: userProfile.schoolId,
          user_id: authUser?.id || null
        })
        .select()
        .single();

      if (error) throw error;

      // Remplacer l'élément optimiste par le réel
      setTeachers(prev => prev.map(t => t.id === tempId ? data : t));
      
      if (authUser) {
        toast({
          title: "Succès",
          description: `Enseignant créé avec le matricule: ${employee_number}`,
          variant: "default",
        });
      }
      
      return true;
    } catch (err) {
      // Rollback en cas d'erreur
      if (optimisticTeacher) {
        setTeachers(prev => prev.filter(t => t.id !== tempId));
      }
      
      console.error('Erreur lors de la création de l\'enseignant:', err);
      toast({
        title: "Erreur lors de la création",
        description: err instanceof Error ? err.message : "Une erreur est survenue lors de la création de l'enseignant.",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateTeacher = async (id: string, teacherData: Partial<CreateTeacherData>) => {
    if (!userProfile?.schoolId) return false;

    const previousState = teachers.find(t => t.id === id);

    try {
      // Mise à jour optimiste
      setTeachers(prev => prev.map(t => 
        t.id === id ? { ...t, ...teacherData, updated_at: new Date().toISOString() } : t
      ));

      const { error } = await supabase
        .from('teachers')
        .update(teacherData)
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;
      
      toast({
        title: "Enseignant mis à jour",
        description: "L'enseignant a été mis à jour avec succès.",
      });
      
      return true;
    } catch (err) {
      // Rollback en cas d'erreur
      if (previousState) {
        setTeachers(prev => prev.map(t => t.id === id ? previousState : t));
      }
      
      console.error('Erreur lors de la mise à jour de l\'enseignant:', err);
      toast({
        title: "Erreur lors de la mise à jour",
        description: err instanceof Error ? err.message : "Une erreur est survenue lors de la mise à jour.",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteTeacher = async (id: string) => {
    if (!userProfile?.schoolId) return false;

    const previousState = teachers.find(t => t.id === id);

    try {
      // Suppression optimiste
      setTeachers(prev => prev.filter(t => t.id !== id));

      const { error } = await supabase
        .from('teachers')
        .delete()
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;
      
      toast({
        title: "Enseignant supprimé",
        description: "L'enseignant a été supprimé avec succès.",
      });
      
      return true;
    } catch (err) {
      // Rollback en cas d'erreur
      if (previousState) {
        setTeachers(prev => [...prev, previousState]);
      }
      
      console.error('Erreur lors de la suppression de l\'enseignant:', err);
      toast({
        title: "Erreur lors de la suppression",
        description: err instanceof Error ? err.message : "Une erreur est survenue lors de la suppression.",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  // Realtime synchronization
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
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTeachers(prev => {
              const exists = prev.some(t => t.id === payload.new.id);
              if (exists) return prev;
              return [...prev, payload.new as TeacherData].sort((a, b) => 
                a.last_name.localeCompare(b.last_name)
              );
            });
          } else if (payload.eventType === 'UPDATE') {
            setTeachers(prev => prev.map(t => 
              t.id === payload.new.id ? payload.new as TeacherData : t
            ));
          } else if (payload.eventType === 'DELETE') {
            setTeachers(prev => prev.filter(t => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile?.schoolId]);

  return {
    teachers,
    loading,
    error,
    createTeacher,
    updateTeacher,
    deleteTeacher,
    refreshTeachers: fetchTeachers
  };
};