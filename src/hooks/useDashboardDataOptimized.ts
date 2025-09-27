import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUserRole } from './useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedCache } from './useOptimizedCache';

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

export const useDashboardDataOptimized = () => {
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
  const cache = useOptimizedCache();

  // Optimized single data fetch function with retry logic
  const fetchAllDashboardData = useCallback(async (retryCount = 0) => {
    const maxRetries = 2;
    
    // Don't fetch if user is not ready, but keep loading state
    if (userLoading) {
      return;
    }

    // If no school ID after user loading is done, stop loading
    if (!userProfile?.schoolId && !userLoading) {
      setData(prev => ({ ...prev, loading: false, error: 'User not properly configured' }));
      return;
    }

    const cacheKey = `dashboard-optimized-${userProfile.schoolId}`;
    
    // Check cache first
    const cached = cache.get<Omit<DashboardData, 'loading' | 'error'>>(cacheKey);
    if (cached) {
      setData(prev => ({ ...cached, loading: false, error: null }));
      return;
    }

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Execute queries sequentially to avoid timeout issues
      const { data: classes, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .eq('school_id', userProfile.schoolId)
        .order('name');

      if (classesError) throw classesError;

      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', userProfile.schoolId)
        .eq('is_active', true);

      if (studentsError) throw studentsError;

      const { data: teachers, error: teachersError } = await supabase
        .from('teachers')
        .select('*')
        .eq('school_id', userProfile.schoolId)
        .eq('is_active', true);

      if (teachersError) throw teachersError;

      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('*')
        .eq('id', userProfile.schoolId)
        .single();

      if (schoolError) throw schoolError;

      const { data: announcements, error: announcementsError } = await supabase
        .from('announcements')
        .select('*')
        .eq('school_id', userProfile.schoolId)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (announcementsError) throw announcementsError;

      const { data: academicYears, error: academicError } = await supabase
        .from('academic_years')
        .select('*')
        .eq('school_id', userProfile.schoolId)
        .eq('is_current', true);

      if (academicError) throw academicError;

      const dashboardData = {
        classes: classes || [],
        students: students || [],
        teachers: teachers || [],
        schoolData: schoolData || {},
        announcements: announcements || [],
        academicYear: academicYears?.[0]?.name || '2024/2025'
      };

      // Cache the results for 3 minutes
      cache.set(cacheKey, dashboardData, 3 * 60 * 1000);
      
      setData({
        ...dashboardData,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      
      // Retry logic with exponential backoff
      if (retryCount < maxRetries && error instanceof Error && error.message !== 'User not properly configured') {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s
        setTimeout(() => {
          fetchAllDashboardData(retryCount + 1);
        }, delay);
        return;
      }
      
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
