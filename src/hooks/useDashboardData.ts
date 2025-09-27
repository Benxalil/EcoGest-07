import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUserRole } from './useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useCache } from './useCache';

export interface DashboardData {
  classes: any[];
  students: any[];
  teachers: any[];
  schoolData: any;
  announcements: any[];
  academicYear: string;
  loading: boolean;
  error: string | null;
}

export const useDashboardData = () => {
  const [data, setData] = useState<DashboardData>({
    classes: [],
    students: [],
    teachers: [],
    schoolData: {},
    announcements: [],
    academicYear: '2024/2025',
    loading: true,
    error: null
  });
  
  const { userProfile, loading: userLoading } = useUserRole();
  const cache = useCache();

  // Optimized single data fetch function
  const fetchAllDashboardData = useCallback(async () => {
    if (!userProfile?.schoolId || userLoading) return;

    const cacheKey = `dashboard-${userProfile.schoolId}`;
    
    // Check cache first
    const cached = cache.get<Omit<DashboardData, 'loading' | 'error'>>(cacheKey);
    if (cached) {
      setData(prev => ({ ...cached, loading: false, error: null }));
      return;
    }

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Single optimized query for all data
      const [
        { data: classes, error: classesError },
        { data: students, error: studentsError },
        { data: teachers, error: teachersError },
        { data: schoolData, error: schoolError },
        { data: announcements, error: announcementsError },
        { data: academicYears, error: academicError }
      ] = await Promise.all([
        supabase.from('classes').select('*').eq('school_id', userProfile.schoolId).order('name'),
        supabase.from('students').select('*').eq('school_id', userProfile.schoolId).eq('is_active', true),
        supabase.from('teachers').select('*').eq('school_id', userProfile.schoolId).eq('is_active', true),
        supabase.from('schools').select('*').eq('id', userProfile.schoolId).single(),
        supabase.from('announcements').select('*').eq('school_id', userProfile.schoolId).eq('is_published', true).order('created_at', { ascending: false }).limit(10),
        supabase.from('academic_years').select('*').eq('school_id', userProfile.schoolId).eq('is_current', true)
      ]);

      // Handle errors
      if (classesError || studentsError || teachersError || schoolError || announcementsError || academicError) {
        const firstError = classesError || studentsError || teachersError || schoolError || announcementsError || academicError;
        throw new Error(firstError?.message || 'Error fetching dashboard data');
      }

      const dashboardData = {
        classes: classes || [],
        students: students || [],
        teachers: teachers || [],
        schoolData: schoolData || {},
        announcements: announcements || [],
        academicYear: academicYears?.[0]?.name || '2024/2025'
      };

      // Cache the results for 5 minutes
      cache.set(cacheKey, dashboardData, 5 * 60 * 1000);
      
      setData({
        ...dashboardData,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Error loading dashboard data'
      }));
    }
  }, [userProfile?.schoolId, userLoading, cache]);

  // Fetch data when user profile is ready
  useEffect(() => {
    fetchAllDashboardData();
  }, [fetchAllDashboardData]);

  // Memoized return to prevent unnecessary re-renders
  return useMemo(() => ({
    ...data,
    refetch: fetchAllDashboardData
  }), [data, fetchAllDashboardData]);
};
