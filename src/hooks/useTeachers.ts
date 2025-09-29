import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useToast } from '@/hooks/use-toast';

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
      const cleanSuffix = schoolSuffix.replace(/_/g, '-');
      const email = `${employeeNumber}@${cleanSuffix}.ecogest.app`;
      
      // Créer le compte via Edge Function
      const { data, error } = await supabase.functions.invoke('create-user-account', {
        body: { 
          email, 
          password: defaultPassword, 
          role: 'teacher', 
          first_name: firstName, 
          last_name: lastName 
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

  const fetchTeachers = async () => {
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
  };

  const createTeacher = async (teacherData: CreateTeacherData & { employee_number?: string }) => {
    if (!userProfile?.schoolId) return false;

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
        // Extraire le numéro de l'identifiant généré (Prof001@ecole_best -> Prof001)
        employee_number = fullIdentifier.split('@')[0];
      }

      // Créer le compte d'authentification
      const authUser = await createTeacherAuthAccount(employee_number, schoolSuffix, teacherData.first_name, teacherData.last_name);
      
      if (!authUser) {
        toast({
          title: "Avertissement",
          description: "L'enseignant a été créé mais le compte de connexion n'a pas pu être généré. Contactez l'administrateur.",
          variant: "destructive",
        });
      }

      const { error } = await supabase
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
        });

      if (error) throw error;
      
      await fetchTeachers();
      
      if (authUser) {
        toast({
          title: "Succès",
          description: `Enseignant créé avec l'identifiant: ${fullIdentifier}`,
          variant: "default",
        });
      }
      
      return true;
    } catch (err) {
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

    try {
      const { error } = await supabase
        .from('teachers')
        .update(teacherData)
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;
      
      await fetchTeachers();
      
      toast({
        title: "Enseignant mis à jour",
        description: "L'enseignant a été mis à jour avec succès.",
      });
      
      return true;
    } catch (err) {
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

    try {
      const { error } = await supabase
        .from('teachers')
        .delete()
        .eq('id', id)
        .eq('school_id', userProfile.schoolId);

      if (error) throw error;
      
      await fetchTeachers();
      
      toast({
        title: "Enseignant supprimé",
        description: "L'enseignant a été supprimé avec succès.",
      });
      
      return true;
    } catch (err) {
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