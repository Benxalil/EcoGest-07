import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useToast } from '@/hooks/use-toast';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Student {
  id: string;
  student_number: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  place_of_birth?: string;
  gender: "M" | "F";
  address?: string;
  phone?: string;
  parent_phone?: string;
  parent_email?: string;
  emergency_contact?: string;
  school_id: string;
  class_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  classes?: {
    id: string;
    name: string;
    level: string;
    section?: string;
  };
}

export function useStudents(classId?: string) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useUserRole();
  const { toast } = useToast();

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!userProfile?.schoolId) {
        setStudents([]);
        return;
      }

      let query = supabase
        .from('students')
        .select(`
          *,
          classes (
            id,
            name,
            level,
            section
          )
        `)
        .eq('school_id', userProfile.schoolId)
        .eq('is_active', true)
        .order('first_name');

      // Si un classId est spécifié, filtrer par classe
      if (classId) {
        query = query.eq('class_id', classId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Erreur lors de la récupération des élèves:', fetchError);
        throw fetchError;
      }

      setStudents(data || []);
    } catch (err) {
      console.error('Erreur lors de la récupération des élèves:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [userProfile?.schoolId, classId]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Realtime synchronization
  useEffect(() => {
    if (!userProfile?.schoolId) return;

    const channel: RealtimeChannel = supabase
      .channel('students-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students',
          filter: `school_id=eq.${userProfile.schoolId}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Récupérer les données complètes avec la classe
            const { data } = await supabase
              .from('students')
              .select(`
                *,
                classes (
                  id,
                  name,
                  level,
                  section
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (data) {
              setStudents(prev => {
                const exists = prev.some(s => s.id === data.id);
                if (exists) return prev;
                return [...prev, data].sort((a, b) => 
                  a.first_name.localeCompare(b.first_name)
                );
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            // Récupérer les données complètes avec la classe
            const { data } = await supabase
              .from('students')
              .select(`
                *,
                classes (
                  id,
                  name,
                  level,
                  section
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (data) {
              setStudents(prev => prev.map(s => 
                s.id === data.id ? data : s
              ));
            }
          } else if (payload.eventType === 'DELETE') {
            setStudents(prev => prev.filter(s => s.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile?.schoolId]);

  // Créer un compte d'authentification pour l'élève
  const createStudentAuthAccount = async (studentNumber: string, schoolSuffix: string, firstName: string, lastName: string, defaultPassword: string = 'student123') => {
    try {
      const email = `${studentNumber}@${schoolSuffix}`;
      
      // Créer le compte via Edge Function
      const { data, error } = await supabase.functions.invoke('create-user-account', {
        body: { 
          email, 
          password: defaultPassword, 
          role: 'student', 
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

  const addStudent = async (studentData: Omit<Student, 'id' | 'created_at' | 'updated_at'>) => {
    const tempId = `temp-${Date.now()}`;
    let optimisticStudent: Student | null = null;

    try {
      // D'abord, récupérer le suffixe de l'école
      const { data: schoolData } = await supabase
        .from('schools')
        .select('school_suffix')
        .eq('id', userProfile?.schoolId)
        .single();

      const schoolSuffix = schoolData?.school_suffix || 'school';

      // Générer l'identifiant complet avec le suffixe de l'école
      const { data: fullIdentifier, error: identifierError } = await supabase.rpc('generate_user_identifier', {
        school_id_param: userProfile?.schoolId,
        role_param: 'student'
      });

      if (identifierError || !fullIdentifier) {
        throw new Error('Impossible de générer l\'identifiant');
      }

      // Extraire le numéro de l'identifiant généré pour créer le compte auth
      const studentNumber = fullIdentifier.split('@')[0];

      // Générer le matricule parent
      const parentMatricule = studentNumber.replace('ELEVE', 'PARENT').replace('Eleve', 'Parent');

      // Mise à jour optimiste
      optimisticStudent = {
        ...studentData,
        id: tempId,
        student_number: studentNumber,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setStudents(prev => [...prev, optimisticStudent!].sort((a, b) => 
        a.first_name.localeCompare(b.first_name)
      ));

      // Créer le compte d'authentification pour l'élève
      const authUser = await createStudentAuthAccount(studentNumber, schoolSuffix, studentData.first_name, studentData.last_name);
      
      if (!authUser) {
        toast({
          title: "Avertissement",
          description: "L'élève a été créé mais le compte de connexion n'a pas pu être généré. Contactez l'administrateur.",
          variant: "destructive",
        });
      }

      // Créer le compte d'authentification pour le parent
      await createStudentAuthAccount(
        parentMatricule, 
        schoolSuffix, 
        'Parent de ' + studentData.first_name, 
        studentData.last_name,
        'parent123'
      );

      // Créer l'élève avec l'ID utilisateur si le compte auth a été créé
      const { data, error } = await supabase
        .from('students')
        .insert([{
          ...studentData,
          student_number: studentNumber,
          parent_matricule: parentMatricule,
          user_id: authUser?.id || null
        }])
        .select(`
          *,
          classes (
            id,
            name,
            level,
            section
          )
        `)
        .single();

      if (error) throw error;

      // Remplacer l'élément optimiste par le réel
      setStudents(prev => prev.map(s => s.id === tempId ? data : s));

      if (authUser) {
        toast({
          title: "Succès",
          description: `Élève créé avec l'identifiant: ${fullIdentifier}`,
          variant: "default",
        });
      }

      return data;
    } catch (err) {
      // Rollback en cas d'erreur
      if (optimisticStudent) {
        setStudents(prev => prev.filter(s => s.id !== tempId));
      }

      console.error('Erreur lors de l\'ajout de l\'élève:', err);
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Une erreur est survenue.",
        variant: "destructive",
      });
      throw err;
    }
  };

  const updateStudent = async (id: string, studentData: Partial<Omit<Student, 'id' | 'created_at' | 'updated_at'>>) => {
    const previousState = students.find(s => s.id === id);

    try {
      // Mise à jour optimiste
      setStudents(prev => prev.map(s => 
        s.id === id ? { ...s, ...studentData, updated_at: new Date().toISOString() } : s
      ));

      const { data, error } = await supabase
        .from('students')
        .update(studentData)
        .eq('id', id)
        .select(`
          *,
          classes (
            id,
            name,
            level,
            section
          )
        `)
        .single();

      if (error) throw error;

      // Remplacer avec les données réelles
      setStudents(prev => prev.map(s => s.id === id ? data : s));

      return data;
    } catch (err) {
      // Rollback en cas d'erreur
      if (previousState) {
        setStudents(prev => prev.map(s => s.id === id ? previousState : s));
      }

      console.error('Erreur lors de la mise à jour de l\'élève:', err);
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Une erreur est survenue.",
        variant: "destructive",
      });
      throw err;
    }
  };

  const deleteStudent = async (id: string) => {
    const previousState = students.find(s => s.id === id);

    try {
      // Suppression optimiste
      setStudents(prev => prev.filter(s => s.id !== id));

      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      // Rollback en cas d'erreur
      if (previousState) {
        setStudents(prev => [...prev, previousState]);
      }

      console.error('Erreur lors de la suppression de l\'élève:', err);
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Une erreur est survenue.",
        variant: "destructive",
      });
      throw err;
    }
  };

  const refreshStudents = () => {
    fetchStudents();
  };

  return {
    students,
    loading,
    error,
    addStudent,
    updateStudent,
    deleteStudent,
    refreshStudents
  };
}