/**
 * Utilitaires pour l'authentification multi-écoles
 * Format attendu: matricule@suffixe_école (ex: Prof04@ecole-best)
 */

const AUTH_DOMAIN = 'ecogest.app';

/**
 * Parse un identifiant au format matricule@suffixe_école
 * @param identifier - L'identifiant saisi (ex: "Prof04@ecole-best")
 * @returns { matricule, schoolSuffix } ou null si le format est invalide
 */
export function parseUserIdentifier(identifier: string): { matricule: string; schoolSuffix: string } | null {
  const trimmed = identifier.trim();
  
  // Vérifier le format matricule@suffixe
  if (!trimmed.includes('@')) {
    return null;
  }
  
  const [matricule, schoolSuffix] = trimmed.split('@');
  
  // Valider que les deux parties existent
  if (!matricule || !schoolSuffix) {
    return null;
  }
  
  return { matricule, schoolSuffix };
}

/**
 * Construit l'email d'authentification technique pour Supabase
 * @param matricule - Le matricule de l'utilisateur (ex: "Prof04")
 * @param schoolSuffix - Le suffixe de l'école (ex: "ecole-best" ou "ecole_best")
 * @returns L'email formaté pour Supabase Auth (ex: "Prof04@ecole-best.ecogest.app")
 */
export function buildAuthEmail(matricule: string, schoolSuffix: string): string {
  // Normaliser le suffixe (remplacer underscore par tiret)
  const normalizedSuffix = schoolSuffix.replace(/_/g, '-');
  return `${matricule}@${normalizedSuffix}.${AUTH_DOMAIN}`;
}
