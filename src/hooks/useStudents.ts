import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useSchoolSettings } from './useSchoolSettings';
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
  parent_first_name?: string;
  parent_last_name?: string;
  parent_matricule?: string;
  emergency_contact?: string;
  school_id: string;
  class_id?: string;
  user_id?: string;
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
  const { settings: schoolSettings } = useSchoolSettings();
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

  // Créer un compte d'authentification pour l'élève ou le parent
  const createStudentAuthAccount = async (
    studentNumber: string, 
    schoolSuffix: string, 
    firstName: string, 
    lastName: string, 
    password: string,
    role: 'student' | 'parent' | 'teacher'
  ) => {
    try {
      // Pour les élèves et parents, on envoie seulement le matricule (pas d'email)
      // L'Edge Function va construire l'email valide pour Supabase
      
      // Créer le compte via Edge Function
      const { data, error } = await supabase.functions.invoke('create-user-account', {
        body: { 
          email: studentNumber, // Juste le matricule (ex: Eleve001)
          password: password, 
          role: role, 
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

  const addStudent = async (studentData: Omit<Student, 'id' | 'created_at' | 'updated_at'>, customSettings?: {
    studentMatriculeFormat?: string;
    parentMatriculeFormat?: string;
    defaultStudentPassword?: string;
    defaultParentPassword?: string;
  }) => {
    const tempId = `temp-${Date.now()}`;
    let optimisticStudent: Student | null = null;

    try {
      // Récupérer les paramètres personnalisés depuis localStorage ou utiliser les valeurs par défaut
      const studentSettings = customSettings?.studentMatriculeFormat 
        ? customSettings.studentMatriculeFormat 
        : schoolSettings.studentMatriculeFormat;
      const parentSettings = customSettings?.parentMatriculeFormat 
        ? customSettings.parentMatriculeFormat 
        : schoolSettings.parentMatriculeFormat;
      const studentPassword = customSettings?.defaultStudentPassword 
        ? customSettings.defaultStudentPassword 
        : schoolSettings.defaultStudentPassword;
      const parentPassword = customSettings?.defaultParentPassword 
        ? customSettings.defaultParentPassword 
        : schoolSettings.defaultParentPassword;

      console.log('🔐 Mots de passe utilisés:', {
        studentPassword: studentPassword ? '***' + studentPassword.slice(-3) : 'non défini',
        parentPassword: parentPassword ? '***' + parentPassword.slice(-3) : 'non défini',
        customSettings: customSettings ? 'Fourni' : 'Non fourni'
      });

      // D'abord, récupérer le suffixe de l'école
      const { data: schoolData } = await supabase
        .from('schools')
        .select('school_suffix')
        .eq('id', userProfile?.schoolId)
        .single();

      const schoolSuffix = schoolData?.school_suffix || 'school';

      // Utiliser le student_number fourni (déjà généré avec le bon format dans AjoutEleveForm)
      // ou générer un nouveau si non fourni
      let studentNumber = studentData.student_number;
      
      if (!studentNumber) {
        // Fallback: générer un identifiant si non fourni
        const { data: fullIdentifier, error: identifierError } = await supabase.rpc('generate_user_identifier', {
          school_id_param: userProfile?.schoolId,
          role_param: 'student'
        });

        if (identifierError || !fullIdentifier) {
          throw new Error('Impossible de générer l\'identifiant');
        }

        studentNumber = fullIdentifier.split('@')[0];
      }

      // Générer le matricule parent en utilisant le format personnalisé
      let parentMatricule = studentData.parent_matricule;
      
      if (!parentMatricule) {
        // Extraire le numéro du matricule élève et créer le matricule parent
        const numberPart = studentNumber.replace(studentSettings, '');
        parentMatricule = `${parentSettings}${numberPart}`;
      }

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

      // Créer le compte d'authentification pour l'élève avec le mot de passe personnalisé
      const authUser = await createStudentAuthAccount(
        studentNumber, 
        schoolSuffix, 
        studentData.first_name, 
        studentData.last_name,
        studentPassword,
        'student'
      );
      
      if (!authUser) {
        toast({
          title: "Avertissement",
          description: "L'élève a été créé mais le compte de connexion n'a pas pu être généré. Contactez l'administrateur.",
          variant: "destructive",
        });
      }

      // Créer le compte parent avec le mot de passe personnalisé
      if (!studentData.parent_matricule) {
        await createStudentAuthAccount(
          parentMatricule, 
          schoolSuffix, 
          'Parent de ' + studentData.first_name, 
          studentData.last_name,
          parentPassword,
          'parent'
        );
      } else {
        // Si parent existant, on vérifie qu'il existe bien dans la base
        const { data: existingParent } = await supabase
          .from('students')
          .select('parent_matricule')
          .eq('school_id', userProfile?.schoolId)
          .eq('parent_matricule', studentData.parent_matricule)
          .limit(1)
          .maybeSingle();

        if (!existingParent) {
          throw new Error('Le matricule parent spécifié n\'existe pas dans le système');
        }
      }

      // Créer l'élève avec l'ID utilisateur si le compte auth a été créé
      const { data, error } = await supabase
        .from('students')
        .insert([{
          ...studentData,
          student_number: studentNumber,
          parent_matricule: studentData.parent_matricule || parentMatricule, // Utiliser parent_matricule fourni ou généré
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
          description: `Élève créé avec le matricule: ${studentNumber}\nMatricule parent: ${parentMatricule}`,
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