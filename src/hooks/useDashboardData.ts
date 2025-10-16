import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUnifiedUserData } from './useUnifiedUserData';
import { supabase } from '@/integrations/supabase/client';
import { multiLevelCache, CacheTTL, CacheKeys } from '@/utils/multiLevelCache';
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

  // Optimized single data fetch function
  const fetchAllDashboardData = useCallback(async () => {
    if (!profile?.schoolId) return;
    
    // Ne charger les données que pour les administrateurs
    if (!isAdmin) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    const cacheKey = CacheKeys.dashboard(profile.id, profile.role);
    
    // Check cache first (stale-while-revalidate)
    const cached = multiLevelCache.get<Omit<DashboardData, 'loading' | 'error'>>(cacheKey, 'memory-first');
    if (cached) {
      setData(prev => ({ ...cached, loading: false, error: null }));
      // Continuer en arrière-plan pour rafraîchir si nécessaire
    } else {
      setData(prev => ({ ...prev, loading: true, error: null }));
    }

    try {
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
        supabase.from('students').select('id, first_name, last_name, class_id, is_active, created_at, classes:class_id(name)').eq('school_id', profile.schoolId).eq('is_active', true),
        supabase.from('teachers').select('id, first_name, last_name, is_active').eq('school_id', profile.schoolId).eq('is_active', true),
        supabase.from('schools').select('id, name, logo_url, slogan').eq('id', profile.schoolId).single(),
        supabase.from('announcements').select('id, title, content, created_at, priority, is_urgent, target_audience').eq('school_id', profile.schoolId).eq('is_published', true).order('created_at', { ascending: false }).limit(10),
        supabase.from('academic_years').select('name').eq('school_id', profile.schoolId).eq('is_current', true).limit(1)
      ]);

      // Handle errors
      if (classesError || studentsError || teachersError || schoolError || announcementsError || academicError) {
        const firstError = classesError || studentsError || teachersError || schoolError || announcementsError || academicError;
        throw new Error(firstError?.message || 'Error fetching dashboard data');
      }

      // Les admins et super-admins voient toutes les annonces
      const filteredAnnouncements = filterAnnouncementsByRole(
        announcements || [],
        profile.role,
        true // Les admins voient tout
      );

      const dashboardData = {
        classes: classes || [],
        students: students || [],
        teachers: teachers || [],
        schoolData: schoolData || null,
        announcements: filteredAnnouncements,
        academicYear: academicYears?.[0]?.name || '2024/2025'
      };

      // 🔒 Cache admin: séparer données sensibles et structures
      // Classes et structures → sessionStorage
      multiLevelCache.set(`classes-${profile.schoolId}`, classes || [], CacheTTL.CLASSES, 'session', false);
      
      // Élèves et enseignants → memory-only (données personnelles)
      multiLevelCache.set(`students-${profile.schoolId}`, students || [], CacheTTL.STUDENTS, 'memory', true);
      multiLevelCache.set(`teachers-${profile.schoolId}`, teachers || [], CacheTTL.TEACHERS, 'memory', true);
      
      // Dashboard complet → memory (contient données sensibles)
      multiLevelCache.set(cacheKey, dashboardData, CacheTTL.SCHEDULES, 'memory', true);
      
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
  }, [profile?.schoolId, profile?.role, profile?.id]);

  // Fetch data when user profile is ready
  useEffect(() => {
    if (profile) {
      fetchAllDashboardData();
    }
  }, [fetchAllDashboardData, profile]);

  const refetch = useCallback(() => {
    if (profile?.id) {
      multiLevelCache.delete(CacheKeys.dashboard(profile.id, profile.role));
      fetchAllDashboardData();
    }
  }, [fetchAllDashboardData, profile?.id, profile?.role]);

  // Memoized return to prevent unnecessary re-renders
  return useMemo(() => ({
    ...data,
    refetch
  }), [data, refetch]);
};
