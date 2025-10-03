import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedUserData } from './useUnifiedUserData';
import { multiLevelCache, CacheTTL } from '@/utils/multiLevelCache';
import { filterAnnouncementsByRole } from '@/utils/announcementFilters';

interface ParentDashboardData {
  todaySchedules: any[];
  announcements: any[];
  loading: boolean;
  error: string | null;
}

export const useParentDashboardData = (classId: string | null, schoolId: string | null) => {
  const { profile } = useUnifiedUserData();
  const [data, setData] = useState<ParentDashboardData>({
    todaySchedules: [],
    announcements: [],
    loading: false,
    error: null
  });

  const isFetchingRef = useRef(false);

  const fetchDashboardData = useCallback(async () => {
    // Empêcher les requêtes multiples simultanées
    if (isFetchingRef.current) {
      return;
    }
    if (!classId || !schoolId) {
      setData({ todaySchedules: [], announcements: [], loading: false, error: null });
      isFetchingRef.current = false;
      return;
    }

    const cacheKey = `parent-dashboard:${profile?.id}:${classId}:${schoolId}`;
    
    // Vérifier le cache multi-niveaux (stale-while-revalidate)
    const cached = multiLevelCache.get<ParentDashboardData>(cacheKey, 'memory-first');
    if (cached) {
      setData({ ...cached, loading: false });
      // Continuer en arrière-plan pour rafraîchir si nécessaire
    } else {
      setData(prev => ({ ...prev, loading: true, error: null }));
    }

    try {
      isFetchingRef.current = true;

      const dayOfWeek = new Date().getDay();

      // Charger les données en parallèle
      const [schedulesResult, announcementsResult] = await Promise.all([
        supabase
          .from('schedules')
          .select('id, start_time, end_time, room, subject, activity_name, day, subjects(name, color)')
          .eq('class_id', classId)
          .eq('day_of_week', dayOfWeek)
          .order('start_time', { ascending: true }),
        
        supabase
          .from('announcements')
          .select('id, title, content, created_at, priority, is_urgent, target_audience')
          .eq('school_id', schoolId)
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      // Filtrer les annonces pour les parents
      const filteredAnnouncements = filterAnnouncementsByRole(
        announcementsResult.data || [],
        'parent',
        false
      );

      const dashboardData: ParentDashboardData = {
        todaySchedules: schedulesResult.data || [],
        announcements: filteredAnnouncements,
        loading: false,
        error: null
      };

      // Mettre en cache pour 3 minutes dans la session
      multiLevelCache.set(cacheKey, dashboardData, CacheTTL.ANNOUNCEMENTS, 'session');

      setData(dashboardData);

    } catch (error) {
      console.error('Erreur lors du chargement du tableau de bord:', error);
      setData(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Erreur lors du chargement des données' 
      }));
    } finally {
      isFetchingRef.current = false;
    }
  }, [classId, schoolId, profile?.id]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const refetch = useCallback(() => {
    if (classId && schoolId && profile?.id) {
      multiLevelCache.delete(`parent-dashboard:${profile.id}:${classId}:${schoolId}`);
    }
    isFetchingRef.current = false;
    fetchDashboardData();
  }, [classId, schoolId, profile?.id, fetchDashboardData]);

  return { ...data, refetch };
};
