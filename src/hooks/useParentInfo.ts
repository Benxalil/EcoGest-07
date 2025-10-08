import { useParentData } from './useParentData';

/**
 * Hook simple qui expose uniquement les infos du parent
 * Compatible avec l'ancien useParentInfo pour éviter de casser le code existant
 */
export const useParentInfo = () => {
  const { parentInfo, loading, error, refetch } = useParentData();
  
  return {
    parentInfo,
    loading,
    error,
    refetch
  };
};
