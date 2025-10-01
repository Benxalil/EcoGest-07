/**
 * Configuration statique de l'école
 * Cette configuration est utilisée pour la page de connexion où l'utilisateur n'est pas encore authentifié
 */

export const SCHOOL_CONFIG = {
  // Suffix de l'école utilisé pour construire les emails d'authentification
  // Format: sans underscore, avec tirets (ex: "ecole-best")
  // Les emails seront au format: Matricule@school-suffix.ecogest.app
  schoolSuffix: 'ecole-best',
  
  // Nom complet de l'école (optionnel, pour affichage)
  schoolName: 'École Best',
  
  // Domaine de base pour l'authentification
  authDomain: 'ecogest.app'
} as const;

/**
 * Construit l'email d'authentification à partir d'un matricule
 * @param matricule - Le matricule de l'utilisateur (ex: "Prof03", "Eleve001")
 * @returns L'email formaté pour Supabase Auth (ex: "Prof03@ecole-best.ecogest.app")
 */
export function buildAuthEmailFromMatricule(matricule: string): string {
  return `${matricule}@${SCHOOL_CONFIG.schoolSuffix}.${SCHOOL_CONFIG.authDomain}`;
}

/**
 * Récupère le suffix de l'école configuré
 * Cette fonction remplace l'appel à useSchoolData pour la page de connexion
 */
export function getConfiguredSchoolSuffix(): string {
  return SCHOOL_CONFIG.schoolSuffix;
}
