import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedCache } from './useOptimizedCache';

interface ParentDashboardData {
  todaySchedules: any[];
  announcements: any[];
  loading: boolean;
  error: string | null;
}

export const useParentDashboardData = (classId: string | null, schoolId: string | null) => {
  const [data, setData] = useState<ParentDashboardData>({
    todaySchedules: [],
    announcements: [],
    loading: true,
    error: null
  });

  const cache = useOptimizedCache();

  const fetchDashboardData = useCallback(async () => {
    if (!classId || !schoolId) {
      setData({ todaySchedules: [], announcements: [], loading: false, error: null });
      return;
    }

    const cacheKey = `parent-dashboard-${classId}-${schoolId}`;
    const cached = cache.get(cacheKey) as { todaySchedules: any[], announcements: any[] } | null;
    
    if (cached) {
      setData({ 
        todaySchedules: cached.todaySchedules,
        announcements: cached.announcements,
        loading: false, 
        error: null 
      });
      return;
    }

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      const dayOfWeek = new Date().getDay();

      // Charger les données en parallèle
      const [schedulesResult, announcementsResult] = await Promise.all([
        supabase
          .from('schedules')
          .select(`
            *,
            subjects (
              name,
              color
            )
          `)
          .eq('class_id', classId)
          .eq('day_of_week', dayOfWeek)
          .order('start_time', { ascending: true }),
        
        supabase
          .from('announcements')
          .select('*')
          .eq('school_id', schoolId)
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(3)
      ]);

      const dashboardData = {
        todaySchedules: schedulesResult.data || [],
        announcements: announcementsResult.data || []
      };

      // Mettre en cache pour 2 minutes
      cache.set(cacheKey, dashboardData, 2 * 60 * 1000);

      setData({ ...dashboardData, loading: false, error: null });

    } catch (error) {
      console.error('Erreur lors du chargement du tableau de bord:', error);
      setData(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Erreur lors du chargement des données' 
      }));
    }
  }, [classId, schoolId, cache]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const refetch = useCallback(() => {
    if (classId && schoolId) {
      cache.delete(`parent-dashboard-${classId}-${schoolId}`);
    }
    fetchDashboardData();
  }, [classId, schoolId, cache, fetchDashboardData]);

  return { ...data, refetch };
};
