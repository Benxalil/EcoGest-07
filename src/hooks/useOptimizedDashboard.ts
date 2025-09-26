import { useState, useEffect } from 'react';
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
}

export const useOptimizedDashboard = () => {
  const {
    classes,
    students,
    teachers,
    schoolInfo,
    announcements,
    academicYear,
    loading,
    error,
    refreshSchoolData
  } = useOptimizedSchoolData();

  return {
    classes,
    students,
    teachers,
    schoolData: schoolInfo,
    announcements,
    academicYear,
    loading,
    error,
    refreshData: refreshSchoolData
  };
};