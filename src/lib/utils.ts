import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Construit l'email d'authentification au format valide pour Supabase
 * Exemple: Prof03 + ecole_best -> Prof03@ecole-best.ecogest.app
 */
export function buildAuthEmail(matricule: string, schoolSuffix: string): string {
  const validDomain = schoolSuffix.replace(/_/g, '-') + '.ecogest.app'
  return `${matricule}@${validDomain}`
}

/**
 * Construit l'email d'affichage au format original
 * Exemple: Prof03 + ecole_best -> Prof03@ecole_best
 */
export function buildDisplayEmail(matricule: string, schoolSuffix: string): string {
  return `${matricule}@${schoolSuffix}`
}
