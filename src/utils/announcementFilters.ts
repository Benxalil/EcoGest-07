/**
 * Filtre les annonces selon le rôle de l'utilisateur
 * Centralise la logique de filtrage pour éviter les incohérences
 */

export type UserRole = 'school_admin' | 'teacher' | 'student' | 'parent' | 'super_admin';

export interface Announcement {
  target_audience?: string[];
  [key: string]: any;
}

// Mapping entre les audiences sélectionnées et les rôles de la base de données
const audienceToRoleMap: { [key: string]: string[] } = {
  'élèves': ['student'],
  'eleves': ['student'],
  'parents': ['parent'],
  'professeurs': ['teacher'],
  'enseignants': ['teacher'],
  'administration': ['school_admin'],
  'tous': ['student', 'parent', 'teacher', 'school_admin'],
  'all': ['student', 'parent', 'teacher', 'school_admin']
};

/**
 * Filtre les annonces en fonction du rôle de l'utilisateur
 * @param announcements - Liste des annonces à filtrer
 * @param userRole - Rôle de l'utilisateur connecté
 * @param isAdmin - Si l'utilisateur est administrateur (voit toutes les annonces)
 * @returns Liste des annonces filtrées
 */
export const filterAnnouncementsByRole = (
  announcements: Announcement[],
  userRole: string,
  isAdmin: boolean = false
): Announcement[] => {
  // Les admins voient toutes les annonces
  if (isAdmin) {
    return announcements;
  }

  const normalizedUserRole = userRole?.toLowerCase() || '';

  return announcements.filter((announcement) => {
    // Si pas de target_audience ou vide, afficher pour tous
    if (!announcement.target_audience || announcement.target_audience.length === 0) {
      return true;
    }

    // Vérifier si l'audience cible inclut le rôle de l'utilisateur
    return announcement.target_audience.some((audience: string) => {
      const normalizedAudience = audience.toLowerCase().trim();
      const allowedRoles = audienceToRoleMap[normalizedAudience] || [];
      return allowedRoles.includes(normalizedUserRole);
    });
  });
};
