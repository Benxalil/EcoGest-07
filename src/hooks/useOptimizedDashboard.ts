import { useState, useEffect } from 'react';
import { useUserRole } from './useUserRole';
import { useOptimizedSchoolData } from './useOptimizedSchoolData';

export interface OptimizedDashboardData {
  classes: any[];
  students: any[];
  teachers: any[];
  schoolData: any;
  announcements: any[];
  academicYear: string;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

export const useOptimizedDashboard = () => {
  const { userProfile, loading: userLoading } = useUserRole();
  const {
    classes,
    students,
    teachers,
    schoolInfo,
    announcements,
    academicYear,
    loading: dataLoading,
    error,
    refreshSchoolData
  } = useOptimizedSchoolData();

  // Don't wait for all data to load - return what we have
  const loading = userLoading || (!userProfile && !error);

  return {
    classes: classes || [],
    students: students || [],
    teachers: teachers || [],
    schoolData: schoolInfo || { name: 'École', academic_year: '2024/2025', system: 'semester' },
    announcements: announcements || [],
    academicYear: academicYear || '2024/2025',
    loading,
    error,
    refreshData: refreshSchoolData
  };
};