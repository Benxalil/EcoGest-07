import { useParentData } from './useParentData';

/**
 * Hook simple qui expose uniquement les enfants du parent
 * Compatible avec l'ancien useParentChildren pour éviter de casser le code existant
 */
export const useParentChildren = () => {
  const { children, selectedChild, loading, error, refetch } = useParentData();
  
  return {
    children,
    selectedChild,
    setSelectedChildId: () => {}, // Géré maintenant dans useParentData
    loading,
    error,
    refetch
  };
};
