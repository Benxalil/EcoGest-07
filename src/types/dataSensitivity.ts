/**
 * Classification des données par niveau de sensibilité
 * pour déterminer la stratégie de cache appropriée
 */

export enum DataSensitivity {
  PUBLIC = 'PUBLIC',           // Données publiques (localStorage OK)
  INTERNAL = 'INTERNAL',       // Données internes (sessionStorage OK)
  CONFIDENTIAL = 'CONFIDENTIAL', // Données confidentielles (memory only)
  SECRET = 'SECRET'            // Données secrètes (memory only)
}

/**
 * Classification de chaque type de donnée
 * Utilisé pour forcer la stratégie de cache appropriée
 */
export const DATA_CLASSIFICATION: Record<string, DataSensitivity> = {
  // PUBLIC - localStorage OK (persistant entre sessions)
  'ui-preferences': DataSensitivity.PUBLIC,
  'theme': DataSensitivity.PUBLIC,
  'language': DataSensitivity.PUBLIC,
  'school-identifier': DataSensitivity.PUBLIC,
  
  // INTERNAL - sessionStorage OK (session uniquement)
  'user-profile-own': DataSensitivity.INTERNAL,
  'classes-structure': DataSensitivity.INTERNAL,
  'subjects-structure': DataSensitivity.INTERNAL,
  'announcements-public': DataSensitivity.INTERNAL,
  'schedules-structure': DataSensitivity.INTERNAL,
  'academic-year': DataSensitivity.INTERNAL,
  
  // CONFIDENTIAL - memory only
  'students-list': DataSensitivity.CONFIDENTIAL,
  'teachers-list': DataSensitivity.CONFIDENTIAL,
  'student-details': DataSensitivity.CONFIDENTIAL,
  'teacher-details': DataSensitivity.CONFIDENTIAL,
  'parent-children': DataSensitivity.CONFIDENTIAL,
  'class-students': DataSensitivity.CONFIDENTIAL,
  
  // SECRET - memory only
  'grades': DataSensitivity.SECRET,
  'payments': DataSensitivity.SECRET,
  'payment-transactions': DataSensitivity.SECRET,
  'student-documents': DataSensitivity.SECRET,
  'personal-data': DataSensitivity.SECRET,
  'contact-information': DataSensitivity.SECRET
};

/**
 * Détermine si un type de donnée est sensible
 * (ne doit jamais être stocké en localStorage/sessionStorage)
 */
export function isSensitiveData(dataType: string): boolean {
  const classification = DATA_CLASSIFICATION[dataType];
  return classification === DataSensitivity.CONFIDENTIAL || 
         classification === DataSensitivity.SECRET;
}

/**
 * Retourne la stratégie de cache recommandée pour un type de donnée
 */
export function getRecommendedCacheStrategy(dataType: string): 'memory-first' | 'session-first' | 'local-first' {
  const classification = DATA_CLASSIFICATION[dataType] || DataSensitivity.CONFIDENTIAL;
  
  switch (classification) {
    case DataSensitivity.PUBLIC:
      return 'local-first';
    case DataSensitivity.INTERNAL:
      return 'session-first';
    case DataSensitivity.CONFIDENTIAL:
    case DataSensitivity.SECRET:
    default:
      return 'memory-first';
  }
}
