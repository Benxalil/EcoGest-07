import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useMatriculeSettings } from './useMatriculeSettings';
import { useToast } from '@/hooks/use-toast';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Interface pour la réponse de l'Edge Function create-user-account
interface CreateUserAccountResponse {
  user: {
    id: string;
    email: string;
    role: string;
  } | null;
  error?: string;
}

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
  
  // ✅ Informations PÈRE (avec matricule)
  father_first_name?: string;
  father_last_name?: string;
  father_phone?: string;
  father_address?: string;
  father_status?: 'alive' | 'deceased';
  father_profession?: string;
  
  // ✅ Informations MÈRE (sans matricule)
  mother_first_name?: string;
  mother_last_name?: string;
  mother_phone?: string;
  mother_address?: string;
  mother_status?: 'alive' | 'deceased';
  mother_profession?: string;

  // ✅ Informations médicales
  has_medical_condition?: boolean;
  medical_condition_type?: string;
  medical_condition_description?: string;
  doctor_name?: string;
  doctor_phone?: string;
  
  // ✅ Matricule unique (père uniquement)
  parent_matricule?: string;
  
  // @deprecated - Conservés pour compatibilité
  parent_phone?: string;
  parent_first_name?: string;
  parent_last_name?: string;
  
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
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useUserRole();
  const { settings: schoolSettings } = useMatriculeSettings();
  const { toast } = useToast();

  const fetchStudents = useCallback(async (
    page: number = 1,
    pageSize: number = 50
  ) => {
    try {
      setLoading(true);
      setError(null);

      if (!userProfile?.schoolId) {
        setStudents([]);
        setTotalCount(0);
        return;
      }

      const startIndex = (page - 1) * pageSize;

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
        `, { count: 'exact' })
        .eq('school_id', userProfile.schoolId)
        .eq('is_active', true)
        .range(startIndex, startIndex + pageSize - 1)
        .order('first_name');

      // Si un classId est spécifié, filtrer par classe
      if (classId) {
        query = query.eq('class_id', classId);
      }

      const { data, error: fetchError, count } = await query;

      if (fetchError) {
        console.error('Erreur lors de la récupération des élèves:', fetchError);
        throw fetchError;
      }

      setStudents((data as Student[]) || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Erreur lors de la récupération des élèves:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setStudents([]);
      setTotalCount(0);
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
        async (payload: RealtimePostgresChangesPayload<Student>) => {
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
              const studentData = data as Student;
              setStudents(prev => {
                const exists = prev.some(s => s.id === studentData.id);
                if (exists) return prev;
                return [...prev, studentData].sort((a, b) => 
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
              const studentData = data as Student;
              setStudents(prev => prev.map(s => 
                s.id === studentData.id ? studentData : s
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
      // Construire l'email pour vérifier s'il existe déjà
      const normalizedSuffix = schoolSuffix.replace(/_/g, '-');
      const authEmail = `${studentNumber}@${normalizedSuffix}.ecogest.app`;
      
      // Vérifier si un compte auth existe déjà avec cet email
      const { data: existingProfiles } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', authEmail)
        .limit(1);
      
      // Si le compte existe déjà, pas besoin de le recréer
      if (existingProfiles && existingProfiles.length > 0) {
        console.log('✅ Compte auth existant trouvé, réutilisation:', authEmail);
        return { id: existingProfiles[0].id } as any;
      }
      
      // Pour les élèves et parents, on envoie seulement le matricule (pas d'email)
      // L'Edge Function va construire l'email valide pour Supabase
      
      // Créer le compte via Edge Function
      const { data, error } = await supabase.functions.invoke<CreateUserAccountResponse>('create-user-account', {
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
        const errorMessage = typeof data?.error === 'string' ? data.error : error.message || '';
        
        if (errorMessage.includes('email_exists') || 
            errorMessage.includes('already been registered') ||
            errorMessage.includes('A user with this email address has already been registered')) {
          console.log('ℹ️ Le compte auth existe déjà:', studentNumber);
          // ✅ Rechercher le user_id existant dans profiles
          const normalizedSuffix = schoolSuffix.replace(/_/g, '-');
          const authEmail = `${studentNumber}@${normalizedSuffix}.ecogest.app`;
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', authEmail)
            .limit(1)
            .maybeSingle();
          
          return existingProfile ? { id: existingProfile.id } as any : null;
        }
        console.error('❌ Erreur lors de la création du compte auth:', error);
        return null;
      }

      return data?.user || null;
    } catch (error: any) {
      // Extraire le message d'erreur
      const errorMessage = error?.message || error?.error || JSON.stringify(error);
      
      // Si l'erreur est "email_exists", ce n'est pas grave
      if (errorMessage.includes('email_exists') || 
          errorMessage.includes('already been registered') ||
          errorMessage.includes('A user with this email address has already been registered')) {
        console.log('ℹ️ Le compte auth existe déjà, ce qui est normal pour un 2ème enfant avec le même parent');
        return null;
      }
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
        // Nouveau parent - créer le compte
        await createStudentAuthAccount(
          parentMatricule, 
          schoolSuffix, 
          'Parent de ' + studentData.first_name, 
          studentData.last_name,
          parentPassword,
          'parent'
        );
      } else {
        // Parent existant - vérifier s'il y a déjà des élèves avec ce matricule
        const { data: existingStudentsWithParent } = await supabase
          .from('students')
          .select('id, parent_matricule')
          .eq('school_id', userProfile?.schoolId)
          .eq('parent_matricule', studentData.parent_matricule)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (existingStudentsWithParent) {
          // ✅ Un élève avec ce matricule parent existe déjà
          console.log('✅ Compte parent existant trouvé via élève:', studentData.parent_matricule);
        } else {
          // ⚠️ Le matricule est fourni mais aucun élève n'existe avec ce matricule
          // Vérifier quand même dans profiles avant de créer
          const parentEmail = `${studentData.parent_matricule}@${schoolSuffix.replace(/_/g, '-')}.ecogest.app`;
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id, email')
            .eq('email', parentEmail)
            .limit(1)
            .maybeSingle();

          if (!existingProfile) {
            // Créer le compte parent
            await createStudentAuthAccount(
              studentData.parent_matricule, 
              schoolSuffix, 
              'Parent de ' + studentData.first_name, 
              studentData.last_name,
              parentPassword,
              'parent'
            );
          } else {
            console.log('✅ Profil parent existant trouvé:', parentEmail);
          }
        }
      }

      // Créer l'élève avec l'ID utilisateur si le compte auth a été créé
      const { data, error } = await supabase
        .from('students')
        .insert([{
          ...studentData,
          student_number: studentNumber,
          parent_matricule: studentData.parent_matricule || parentMatricule,
          user_id: authUser?.id || null,
          password: studentPassword,
          
          // ✅ S'assurer que tous les champs du père sont inclus
          father_first_name: studentData.father_first_name,
          father_last_name: studentData.father_last_name,
          father_phone: studentData.father_phone,
          father_address: studentData.father_address,
          father_status: studentData.father_status,
          father_profession: studentData.father_profession,
          
          // ✅ Champs de la mère
          mother_first_name: studentData.mother_first_name,
          mother_last_name: studentData.mother_last_name,
          mother_phone: studentData.mother_phone,
          mother_address: studentData.mother_address,
          mother_status: studentData.mother_status,
          mother_profession: studentData.mother_profession,
          
          // ✅ Compatibilité - garder les anciens champs
          parent_first_name: studentData.father_first_name,
          parent_last_name: studentData.father_last_name,
          parent_phone: studentData.father_phone
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
      const newStudent = data as Student;
      setStudents(prev => prev.map(s => s.id === tempId ? newStudent : s));

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
      const updatedStudent = data as Student;
      setStudents(prev => prev.map(s => s.id === id ? updatedStudent : s));

      return updatedStudent;
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

      // Utiliser la fonction de suppression complète qui supprime aussi le compte auth
      const { error } = await supabase.rpc('delete_student_completely', {
        student_uuid: id
      });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Élève et compte supprimés avec succès.",
      });
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
    totalCount,
    loading,
    error,
    addStudent,
    updateStudent,
    deleteStudent,
    refreshStudents,
    fetchStudents
  };
}