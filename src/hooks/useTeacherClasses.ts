import { useTeacherData } from './useTeacherData';

/**
 * Hook simple qui expose uniquement les classes de l'enseignant
 * Compatible avec l'ancien useTeacherClasses pour éviter de casser le code existant
 */
export const useTeacherClasses = () => {
  const { classes, loading, error, refetch } = useTeacherData();
  
  return {
    classes,
    loading,
    error,
    refreshClasses: refetch,
    hasNoClasses: !loading && classes.length === 0
  };
};
