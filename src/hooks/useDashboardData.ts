import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOptimizedUserData } from './useOptimizedUserData';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedCache } from './useOptimizedCache';
import { filterAnnouncementsByRole } from '@/utils/announcementFilters';

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
  const { profile, loading: userLoading } = useOptimizedUserData();
  const cache = useOptimizedCache();
  
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

  // Optimized single data fetch function
  const fetchAllDashboardData = useCallback(async () => {
    if (!profile?.schoolId || userLoading) return;
    
    // Ne charger les données que pour les administrateurs
    if (profile.role === 'student' || profile.role === 'teacher' || profile.role === 'parent') {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    const cacheKey = `dashboard-${profile.schoolId}-${profile.role}`;
    
    // Check cache first (5 minutes pour données dashboard)
    const cached = cache.get<Omit<DashboardData, 'loading' | 'error'>>(cacheKey);
    if (cached) {
      setData(prev => ({ ...cached, loading: false, error: null }));
      return;
    }

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Single optimized query - sélection minimale des colonnes nécessaires
      const [
        { data: classes, error: classesError },
        { data: students, error: studentsError },
        { data: teachers, error: teachersError },
        { data: schoolData, error: schoolError },
        { data: announcements, error: announcementsError },
        { data: academicYears, error: academicError }
      ] = await Promise.all([
        supabase.from('classes').select('id, name, level, section, effectif').eq('school_id', profile.schoolId).order('name'),
        supabase.from('students').select('id, first_name, last_name, class_id').eq('school_id', profile.schoolId).eq('is_active', true),
        supabase.from('teachers').select('id, first_name, last_name').eq('school_id', profile.schoolId).eq('is_active', true),
        supabase.from('schools').select('id, name, logo_url, slogan').eq('id', profile.schoolId).single(),
        supabase.from('announcements').select('id, title, content, created_at, priority').eq('school_id', profile.schoolId).eq('is_published', true).order('created_at', { ascending: false }).limit(10),
        supabase.from('academic_years').select('name').eq('school_id', profile.schoolId).eq('is_current', true).limit(1)
      ]);

      // Handle errors
      if (classesError || studentsError || teachersError || schoolError || announcementsError || academicError) {
        const firstError = classesError || studentsError || teachersError || schoolError || announcementsError || academicError;
        throw new Error(firstError?.message || 'Error fetching dashboard data');
      }

      // Les admins voient toutes les annonces sans filtrage
      const filteredAnnouncements = filterAnnouncementsByRole(
        announcements || [],
        profile.role,
        true // Les admins voient tout
      );

      const dashboardData = {
        classes: classes || [],
        students: students || [],
        teachers: teachers || [],
        schoolData: schoolData || {},
        announcements: filteredAnnouncements,
        academicYear: academicYears?.[0]?.name || '2024/2025'
      };

      // Cache the results for 5 minutes (données dashboard)
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
  }, [profile?.schoolId, profile?.role, userLoading, cache]);

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
