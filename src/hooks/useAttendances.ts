import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedCache } from './useOptimizedCache';

export interface AttendanceRecord {
  id: string;
  date: string;
  student_id: string;
  type: "absence" | "retard";
  reason?: string;
  period?: string;
  recorded_by?: string;
  teacher_id?: string;
  students: {
    first_name: string;
    last_name: string;
  };
  teachers?: {
    first_name: string;
    last_name: string;
  };
}

const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export const useAttendances = (classId?: string, teacherId?: string | null, schoolId?: string) => {
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const cache = useOptimizedCache();

  const fetchAttendances = useCallback(async () => {
    if (!classId || !schoolId) {
      setLoading(false);
      return;
    }

    const cacheKey = `attendances_${classId}_${teacherId || 'all'}`;
    
    // Vérifier le cache d'abord
    const cached = cache.get<AttendanceRecord[]>(cacheKey);
    if (cached) {
      setAttendances(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('attendances')
        .select(`
          id,
          date,
          student_id,
          type,
          reason,
          period,
          recorded_by,
          teacher_id,
          students!inner (
            first_name,
            last_name
          ),
          teachers (
            first_name,
            last_name
          )
        `)
        .eq('class_id', classId);

      // Filtrer par teacher_id si fourni
      if (teacherId) {
        query = query.eq('teacher_id', teacherId);
      }

      query = query.order('date', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Erreur lors du chargement des présences:', error);
      } else {
        // Trier par nom d'élève
        const sortedData = (data || []).sort((a, b) => {
          const nameA = `${a.students?.last_name} ${a.students?.first_name}`.toLowerCase();
          const nameB = `${b.students?.last_name} ${b.students?.first_name}`.toLowerCase();
          return nameA.localeCompare(nameB);
        });
        
        setAttendances(sortedData);
        cache.set(cacheKey, sortedData, CACHE_TTL);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  }, [classId, teacherId, schoolId, cache]);

  useEffect(() => {
    fetchAttendances();
  }, [fetchAttendances]);

  return {
    attendances,
    loading,
    refresh: fetchAttendances
  };
};
