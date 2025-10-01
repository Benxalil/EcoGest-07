import { supabase } from "@/integrations/supabase/client";

/**
 * Construit l'email au format matricule@école
 */
export const buildUserEmail = (matricule: string, schoolSuffix: string): string => {
  // Si le matricule contient déjà @, le retourner tel quel
  if (matricule.includes('@')) {
    return matricule;
  }
  
  // Sinon, construire l'email au format matricule@école
  return `${matricule}@${schoolSuffix}`;
};

/**
 * Récupère le suffixe de l'école depuis la base de données
 */
export const getSchoolSuffix = async (schoolId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('schools')
      .select('school_suffix')
      .eq('id', schoolId)
      .single();
    
    if (error || !data?.school_suffix) {
      console.error('Erreur lors de la récupération du suffixe d\'école:', error);
      return null;
    }
    
    return data.school_suffix;
  } catch (error) {
    console.error('Erreur:', error);
    return null;
  }
};

/**
 * Crée un compte utilisateur avec le format email correct
 */
export const createUserAccount = async (
  matricule: string,
  password: string,
  schoolId: string,
  userData: {
    role: string;
    first_name: string;
    last_name: string;
  }
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Récupérer le suffixe de l'école
    const schoolSuffix = await getSchoolSuffix(schoolId);
    
    if (!schoolSuffix) {
      return {
        success: false,
        error: 'Impossible de récupérer le suffixe de l\'école'
      };
    }
    
    // Construire l'email au format matricule@école
    const email = buildUserEmail(matricule, schoolSuffix);
    
    // Appeler la fonction edge pour créer le compte
    const { data, error } = await supabase.functions.invoke('create-user-account', {
      body: {
        email,
        password,
        role: userData.role,
        first_name: userData.first_name,
        last_name: userData.last_name
      }
    });
    
    if (error) {
      console.error('Erreur lors de la création du compte:', error);
      return {
        success: false,
        error: error.message
      };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Erreur:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
};
