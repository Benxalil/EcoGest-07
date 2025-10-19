import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUnifiedUserData } from './useUnifiedUserData';
import { supabase } from '@/integrations/supabase/client';
import { filterAnnouncementsByRole, type Announcement } from '@/utils/announcementFilters';

// Interfaces pour typage précis (préfixées pour éviter conflits)
interface DashboardClassData {
  id: string;
  name: string;
  level: string;
  section: string | null;
  effectif: number | null;
}

interface DashboardClassInfo {
  name: string;
}

interface DashboardStudentData {
  id: string;
  first_name: string;
  last_name: string;
  class_id: string | null;
  is_active: boolean;
  created_at?: string;
  classes?: DashboardClassInfo;
}

interface DashboardTeacherData {
  id: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
}

interface DashboardSchoolData {
  id: string;
  name: string;
  logo_url: string | null;
  slogan: string | null;
}

export interface DashboardData {
  classes: DashboardClassData[];
  students: DashboardStudentData[];
  teachers: DashboardTeacherData[];
  schoolData: DashboardSchoolData | null;
  announcements: Announcement[];
  academicYear: string;
  loading: boolean;
  error: string | null;
}

export const useDashboardData = () => {
  const { profile, isAdmin } = useUnifiedUserData();
  
  const [data, setData] = useState<DashboardData>({
    classes: [],
    students: [],
    teachers: [],
    schoolData: null,
    announcements: [],
    academicYear: '2024/2025',
    loading: false,
    error: null
  });

  // Fetch dashboard data with separate queries
  const fetchAllDashboardData = useCallback(async () => {
    if (!profile?.schoolId) return;
    
    // Ne charger les données que pour les administrateurs
    if (!isAdmin) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    setData(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Fetch all data in parallel
      const [classesResult, studentsResult, teachersResult, schoolResult, announcementsResult] = await Promise.all([
        supabase
          .from('classes')
          .select('id, name, level, section, effectif')
          .eq('school_id', profile.schoolId),
        supabase
          .from('students')
          .select('id, first_name, last_name, class_id, is_active, created_at, classes(name)')
          .eq('school_id', profile.schoolId)
          .eq('is_active', true),
        supabase
          .from('teachers')
          .select('id, first_name, last_name, is_active')
          .eq('school_id', profile.schoolId)
          .eq('is_active', true),
        supabase
          .from('schools')
          .select('id, name, logo_url, slogan')
          .eq('id', profile.schoolId)
          .single(),
        supabase
          .from('announcements')
          .select('*')
          .eq('school_id', profile.schoolId)
          .eq('is_published', true)
          .order('created_at', { ascending: false })
      ]);

      // Check for errors
      if (classesResult.error) throw classesResult.error;
      if (studentsResult.error) throw studentsResult.error;
      if (teachersResult.error) throw teachersResult.error;
      if (schoolResult.error) throw schoolResult.error;
      if (announcementsResult.error) throw announcementsResult.error;

      // Les admins et super-admins voient toutes les annonces
      const filteredAnnouncements = filterAnnouncementsByRole(
        announcementsResult.data || [],
        profile.role,
        true // Les admins voient tout
      );

      const dashboardData = {
        classes: classesResult.data || [],
        students: studentsResult.data || [],
        teachers: teachersResult.data || [],
        schoolData: schoolResult.data,
        announcements: filteredAnnouncements,
        academicYear: '2024/2025'
      };
      
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
  }, [profile?.schoolId, profile?.role, profile?.id, isAdmin]);

  // Fetch data when user profile is ready
  useEffect(() => {
    if (profile) {
      fetchAllDashboardData();
    }
  }, [fetchAllDashboardData, profile]);

  const refetch = useCallback(() => {
    fetchAllDashboardData();
  }, [fetchAllDashboardData]);

  // Memoized return to prevent unnecessary re-renders
  return useMemo(() => ({
    ...data,
    refetch
  }), [data, refetch]);
};
