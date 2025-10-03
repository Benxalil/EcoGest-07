import { ClassData } from '@/hooks/useClasses';

/**
 * Formate le nom d'une classe pour l'affichage général
 * Règle : Nom + Libellé uniquement
 * Exemple : "CM1 A", "Terminale B", "CI" (si pas de libellé)
 */
export const formatClassName = (classe: ClassData | { name: string; section?: string | null }): string => {
  if (!classe.section) {
    return classe.name; // Ex: "CI", "CP"
  }
  
  // Extraire le libellé (dernière lettre majuscule de section)
  const labelMatch = classe.section.match(/[A-Z]$/);
  const label = labelMatch ? labelMatch[0] : '';
  
  if (label) {
    return `${classe.name} ${label}`; // Ex: "CM1 A", "Terminale B"
  }
  
  return classe.name; // Fallback si pas de libellé détecté
};

/**
 * Formate le nom complet d'une classe pour les documents officiels
 * Inclut : Nom, Niveau, Série, Libellé
 * Exemple : "CM1 - Primaire - LAA"
 */
export const formatFullClassName = (classe: ClassData): string => {
  let fullName = `${classe.name} - ${classe.level}`;
  
  if (classe.section) {
    fullName += ` - ${classe.section}`;
  }
  
  return fullName;
};
