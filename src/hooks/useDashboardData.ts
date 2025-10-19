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

  // 🚀 OPTIMISÉ: Une seule requête via la vue SQL
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
      // 🚀 UNE SEULE REQUÊTE via la vue optimisée
      const { data, error } = await supabase
        .from('admin_dashboard_view' as any)
        .select('*')
        .eq('school_id', profile.schoolId)
        .single();

      if (error) throw error;

      // Parser les données JSON de la vue
      const viewData = data as any;
      const classes = typeof viewData.classes === 'string' ? JSON.parse(viewData.classes) : viewData.classes;
      const students = typeof viewData.students === 'string' ? JSON.parse(viewData.students) : viewData.students;
      const teachers = typeof viewData.teachers === 'string' ? JSON.parse(viewData.teachers) : viewData.teachers;
      const announcements = typeof viewData.announcements === 'string' ? JSON.parse(viewData.announcements) : viewData.announcements;

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
        schoolData: {
          id: viewData.school_id,
          name: viewData.school_name,
          logo_url: viewData.logo_url,
          slogan: viewData.slogan
        },
        announcements: filteredAnnouncements,
        academicYear: viewData.academic_year || '2024/2025'
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
  }, [profile?.schoolId, profile?.role, profile?.id, isAdmin]);

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
