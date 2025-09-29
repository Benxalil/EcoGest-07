import { supabase } from '@/integrations/supabase/client';

/**
 * Utilitaire pour créer rétroactivement des comptes d'authentification
 * pour les élèves et enseignants existants
 */

interface MigrationResult {
  success: number;
  errors: number;
  details: string[];
}

// Fonction pour créer un compte via l'Edge Function
const createAuthUser = async (email: string, password: string, role: string, first_name: string, last_name: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('create-user-account', {
      body: { email, password, role, first_name, last_name }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erreur lors de la création du compte:', error);
    throw error;
  }
};

// Créer des comptes pour tous les élèves existants sans user_id
export const createStudentAuthAccounts = async (schoolId: string, defaultPassword: string = 'student123'): Promise<MigrationResult> => {
  const result: MigrationResult = { success: 0, errors: 0, details: [] };

  try {
    // Récupérer le suffixe de l'école
    const { data: schoolData } = await supabase
      .from('schools')
      .select('school_suffix')
      .eq('id', schoolId)
      .single();

    if (!schoolData?.school_suffix) {
      result.details.push('Suffixe d\'école non trouvé');
      result.errors++;
      return result;
    }

    const schoolSuffix = schoolData.school_suffix;

    // Récupérer tous les élèves sans user_id
    const { data: students, error } = await supabase
      .from('students')
      .select('id, student_number, first_name, last_name')
      .eq('school_id', schoolId)
      .is('user_id', null)
      .eq('is_active', true);

    if (error) throw error;

    if (!students || students.length === 0) {
      result.details.push('Aucun élève sans compte trouvé');
      return result;
    }

    // Créer un compte pour chaque élève
    for (const student of students) {
      try {
        const cleanSuffix = schoolSuffix.replace(/_/g, '-');
        const email = `${student.student_number}@${cleanSuffix}.ecogest.app`;
        
        // Créer le compte d'authentification via Edge Function
        const authResult = await createAuthUser(
          email,
          defaultPassword,
          'student',
          student.first_name,
          student.last_name
        );

        if (!authResult.success) throw new Error(authResult.error);

        // Mettre à jour l'élève avec l'ID utilisateur
        const { error: updateError } = await supabase
          .from('students')
          .update({ user_id: authResult.user.id })
          .eq('id', student.id);

        if (updateError) throw updateError;

        result.success++;
        result.details.push(`✅ ${student.first_name} ${student.last_name}: ${email}`);

      } catch (error) {
        result.errors++;
        result.details.push(`❌ ${student.first_name} ${student.last_name}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }
    }

    return result;
  } catch (error) {
    result.errors++;
    result.details.push(`Erreur générale: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    return result;
  }
};

// Créer des comptes pour tous les enseignants existants sans user_id
export const createTeacherAuthAccounts = async (schoolId: string, defaultPassword: string = 'teacher123'): Promise<MigrationResult> => {
  const result: MigrationResult = { success: 0, errors: 0, details: [] };

  try {
    // Récupérer le suffixe de l'école
    const { data: schoolData } = await supabase
      .from('schools')
      .select('school_suffix')
      .eq('id', schoolId)
      .single();

    if (!schoolData?.school_suffix) {
      result.details.push('Suffixe d\'école non trouvé');
      result.errors++;
      return result;
    }

    const schoolSuffix = schoolData.school_suffix;

    // Récupérer tous les enseignants sans user_id
    const { data: teachers, error } = await supabase
      .from('teachers')
      .select('id, employee_number, first_name, last_name')
      .eq('school_id', schoolId)
      .is('user_id', null)
      .eq('is_active', true);

    if (error) throw error;

    if (!teachers || teachers.length === 0) {
      result.details.push('Aucun enseignant sans compte trouvé');
      return result;
    }

    // Créer un compte pour chaque enseignant
    for (const teacher of teachers) {
      try {
        const cleanSuffix = schoolSuffix.replace(/_/g, '-');
        const email = `${teacher.employee_number}@${cleanSuffix}.ecogest.app`;
        
        // Créer le compte d'authentification via Edge Function
        const authResult = await createAuthUser(
          email,
          defaultPassword,
          'teacher',
          teacher.first_name,
          teacher.last_name
        );

        if (!authResult.success) throw new Error(authResult.error);

        // Mettre à jour l'enseignant avec l'ID utilisateur
        const { error: updateError } = await supabase
          .from('teachers')
          .update({ user_id: authResult.user.id })
          .eq('id', teacher.id);

        if (updateError) throw updateError;

        result.success++;
        result.details.push(`✅ ${teacher.first_name} ${teacher.last_name}: ${email}`);

      } catch (error) {
        result.errors++;
        result.details.push(`❌ ${teacher.first_name} ${teacher.last_name}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }
    }

    return result;
  } catch (error) {
    result.errors++;
    result.details.push(`Erreur générale: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    return result;
  }
};

// Migration complète pour une école
export const migrateSchoolUsers = async (schoolId: string): Promise<{ 
  students: MigrationResult, 
  teachers: MigrationResult 
}> => {
  console.log(`Début de la migration pour l'école ${schoolId}`);
  
  const studentResult = await createStudentAuthAccounts(schoolId);
  const teacherResult = await createTeacherAuthAccounts(schoolId);

  console.log('Migration terminée:', {
    students: `${studentResult.success} créés, ${studentResult.errors} erreurs`,
    teachers: `${teacherResult.success} créés, ${teacherResult.errors} erreurs`
  });

  return { students: studentResult, teachers: teacherResult };
};