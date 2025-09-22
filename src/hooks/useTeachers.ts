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
      // Utiliser le matricule fourni ou générer un nouveau
      let employee_number = teacherData.employee_number;
      
      if (!employee_number) {
        // Générer le prochain numéro de matricule (logique similaire aux élèves)
        const { data: existingTeachers, error: countError } = await supabase
          .from('teachers')
          .select('employee_number')
          .eq('school_id', userProfile.schoolId)
          .eq('is_active', true)
          .order('employee_number', { ascending: true });

        if (!countError && existingTeachers) {
          const teacherNumbers = existingTeachers.map(t => t.employee_number);
          let nextNumber = 1;
          
          while (true) {
            const formattedNumber = nextNumber.toString().padStart(2, '0');
            const candidateNumber = `Prof${formattedNumber}`;
            
            if (!teacherNumbers.includes(candidateNumber)) {
              employee_number = candidateNumber;
              break;
            }
            nextNumber++;
            
            if (nextNumber > 999) {
              employee_number = `Prof${Date.now().toString().slice(-3)}`;
              break;
            }
          } } else {
          employee_number = `Prof01`;
        }
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
          school_id: userProfile.schoolId
        });

      if (error) throw error;
      
      await fetchTeachers();
      
      toast({
        title: "Enseignant ajouté avec succès",
        description: `L'enseignant ${teacherData.first_name} ${teacherData.last_name} a été ajouté.`,
      });
      
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