import { useParentData } from './useParentData';

/**
 * Hook simple qui expose les schedules et annonces pour un enfant sélectionné
 * Compatible avec l'ancien useParentDashboardData pour éviter de casser le code existant
 */
export const useParentDashboardData = (classId: string | null, schoolId: string | null) => {
  // On n'utilise plus les paramètres car useParentData gère tout automatiquement
  const { todaySchedules, announcements, loading, error, refetch } = useParentData();
  
  return {
    todaySchedules,
    announcements,
    loading,
    error,
    refetch
  };
};
