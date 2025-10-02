import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedCache } from './useOptimizedCache';
import { useOptimizedUserData } from './useOptimizedUserData';

interface StudentDashboardData {
  student: any;
  classInfo: any;
  todaySchedules: any[];
  announcements: any[];
  loading: boolean;
  error: string | null;
}

// Cache global pour éviter les requêtes multiples
let globalFetchPromise: Promise<StudentDashboardData> | null = null;

export const useStudentDashboardData = () => {
  const { profile, loading: userLoading } = useOptimizedUserData();
  const cache = useOptimizedCache();
  
  const [data, setData] = useState<StudentDashboardData>({
    student: null,
    classInfo: null,
    todaySchedules: [],
    announcements: [],
    loading: true,
    error: null
  });

  const fetchDashboardData = useCallback(async () => {
    if (!profile?.id || !profile?.schoolId) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    // Si une requête est déjà en cours, l'attendre
    if (globalFetchPromise) {
      const result = await globalFetchPromise;
      setData(result);
      return;
    }

    // Vérifier le cache (5 minutes pour le dashboard étudiant)
    const cacheKey = `student-dashboard-${profile.id}`;
    const cached = cache.get<StudentDashboardData>(cacheKey);
    
    if (cached && cached.student) {
      setData({ ...cached, loading: false });
      return;
    }

    // Créer la promesse globale pour éviter les requêtes dupliquées
    globalFetchPromise = (async () => {
      try {
        // Faire toutes les requêtes en parallèle
        const [studentResult, announcementsResult] = await Promise.all([
          // Récupérer l'élève avec sa classe
          supabase
            .from('students')
            .select('*, classes(id, name, level, section)')
            .eq('user_id', profile.id)
            .eq('school_id', profile.schoolId)
            .maybeSingle(),
          
          // Récupérer les 3 dernières annonces
          supabase
            .from('announcements')
            .select('id, title, content, created_at, priority, is_urgent')
            .eq('school_id', profile.schoolId)
            .eq('is_published', true)
            .order('created_at', { ascending: false })
            .limit(3)
        ]);

        if (studentResult.error) throw studentResult.error;

        let schedules: any[] = [];
        
        // Si l'élève a une classe, récupérer l'emploi du temps du jour
        if (studentResult.data?.class_id) {
          const today = new Date().getDay();
          const { data: schedulesData, error: schedulesError } = await supabase
            .from('schedules')
            .select('id, start_time, end_time, room, subject_id, subjects(name)')
            .eq('class_id', studentResult.data.class_id)
            .eq('day_of_week', today)
            .order('start_time');

          if (!schedulesError && schedulesData) {
            schedules = schedulesData;
          }
        }

        const result: StudentDashboardData = {
          student: studentResult.data,
          classInfo: studentResult.data?.classes || null,
          todaySchedules: schedules,
          announcements: announcementsResult.data || [],
          loading: false,
          error: null
        };

        // Mettre en cache pour 5 minutes
        cache.set(cacheKey, result, 5 * 60 * 1000);
        
        return result;
      } catch (error) {
        const errorResult: StudentDashboardData = {
          student: null,
          classInfo: null,
          todaySchedules: [],
          announcements: [],
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        return errorResult;
      } finally {
        globalFetchPromise = null;
      }
    })();

    const result = await globalFetchPromise;
    setData(result);
  }, [profile, cache]);

  useEffect(() => {
    if (!userLoading && profile) {
      fetchDashboardData();
    }
  }, [userLoading, profile, fetchDashboardData]);

  const refetch = useCallback(() => {
    if (profile?.id) {
      cache.delete(`student-dashboard-${profile.id}`);
      return fetchDashboardData();
    }
  }, [profile, cache, fetchDashboardData]);

  return {
    ...data,
    loading: userLoading || data.loading,
    refetch
  };
};
