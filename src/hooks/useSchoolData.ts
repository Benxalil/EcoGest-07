import { useApp } from '@/contexts/AppContext';

export const useSchoolData = () => {
  const { schoolData, refreshSchoolData } = useApp();

  const updateSchoolData = async (updates: any) => {
    // This would need to be implemented in the AppContext if needed
    console.log('Update school data:', updates);
    await refreshSchoolData();
    return { data: schoolData, error: null };
  };

  return {
    schoolData,
    loading: false,
    error: null,
    updateSchoolData,
    refreshSchoolData,
  };
};