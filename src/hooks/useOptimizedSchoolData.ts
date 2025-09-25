import { useState, useEffect, useCallback } from 'react';
import { useOptimizedUserRole } from './useOptimizedUserRole';
import { useOptimizedClasses } from './useOptimizedClasses';
import { useCache } from './useCache';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export interface OptimizedSchoolData {
  classes: any[];
  students: any[];
  teachers: any[];
  subjects: any[];
  schoolInfo: any;
  announcements: any[];
  academicYear: string;
  loading: boolean;
  error: string | null;
}

export const useOptimizedSchoolData = () => {
  const [schoolData, setSchoolData] = useState<OptimizedSchoolData>({
    classes: [],
    students: [],
    teachers: [],
    subjects: [],
    schoolInfo: null,
    announcements: [],
    academicYear: '',
    loading: true,
    error: null
  });

  const { userProfile, loading: userLoading } = useOptimizedUserRole();
  const cache = useCache();
  const { toast } = useToast();

  const fetchAllSchoolData = useCallback(async () => {
    if (!userProfile?.schoolId || userLoading) {
      return;
    }

    const cacheKey = `school_data_${userProfile.schoolId}`;
    const cachedData = cache.get<OptimizedSchoolData>(cacheKey);
    
    if (cachedData) {
      console.log('Données école récupérées depuis le cache');
      setSchoolData({ ...cachedData, loading: false });
      return;
    }

    try {
      setSchoolData(prev => ({ ...prev, loading: true, error: null }));

      // Requête parallèle optimisée pour toutes les données essentielles
      const [
        classesResponse,
        studentsResponse,
        teachersResponse,
        subjectsResponse,
        schoolResponse,
        announcementsResponse,
        academicYearResponse
      ] = await Promise.all([
        // Classes avec effectifs
        supabase
          .from('classes')
          .select(`
            *,
            students!inner(count)
          `)
          .eq('school_id', userProfile.schoolId)
          .order('name'),

        // Étudiants actifs
        supabase
          .from('students')
          .select(`
            *,
            classes(name, level)
          `)
          .eq('school_id', userProfile.schoolId)
          .eq('is_active', true)
          .order('last_name'),

        // Enseignants actifs
        supabase
          .from('teachers')
          .select('*')
          .eq('school_id', userProfile.schoolId)
          .eq('is_active', true)
          .order('last_name'),

        // Matières avec classes
        supabase
          .from('subjects')
          .select(`
            *,
            classes(name, level)
          `)
          .eq('school_id', userProfile.schoolId)
          .order('name'),

        // Informations école
        supabase
          .from('schools')
          .select('*')
          .eq('id', userProfile.schoolId)
          .single(),

        // Annonces récentes
        supabase
          .from('announcements')
          .select('*')
          .eq('school_id', userProfile.schoolId)
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(10),

        // Année académique actuelle
        supabase
          .from('academic_years')
          .select('name')
          .eq('school_id', userProfile.schoolId)
          .eq('is_current', true)
          .single()
      ]);

      // Traitement des erreurs individuelles
      if (classesResponse.error) console.error('Classes error:', classesResponse.error);
      if (studentsResponse.error) console.error('Students error:', studentsResponse.error);
      if (teachersResponse.error) console.error('Teachers error:', teachersResponse.error);
      if (subjectsResponse.error) console.error('Subjects error:', subjectsResponse.error);
      if (schoolResponse.error) console.error('School error:', schoolResponse.error);
      if (announcementsResponse.error) console.error('Announcements error:', announcementsResponse.error);
      if (academicYearResponse.error) console.error('Academic year error:', academicYearResponse.error);

      // Traitement des classes avec effectifs
      const classesWithEnrollment = (classesResponse.data || []).map(classItem => ({
        ...classItem,
        enrollment_count: classItem.students?.length || 0,
        students: undefined
      }));

      const newSchoolData: OptimizedSchoolData = {
        classes: classesWithEnrollment,
        students: studentsResponse.data || [],
        teachers: teachersResponse.data || [],
        subjects: subjectsResponse.data || [],
        schoolInfo: schoolResponse.data,
        announcements: announcementsResponse.data || [],
        academicYear: academicYearResponse.data?.name || '2024/2025',
        loading: false,
        error: null
      };

      // Mettre en cache pour 3 minutes
      cache.set(cacheKey, newSchoolData, 3 * 60 * 1000);
      setSchoolData(newSchoolData);
      console.log('Données école récupérées depuis la DB et mises en cache');

    } catch (error) {
      console.error('Error fetching school data:', error);
      const errorMessage = 'Erreur lors du chargement des données';
      setSchoolData(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage 
      }));
      
      toast({
        title: "Erreur de chargement",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [userProfile?.schoolId, userLoading, cache, toast]);

  const refreshSchoolData = useCallback(() => {
    if (userProfile?.schoolId) {
      cache.delete(`school_data_${userProfile.schoolId}`);
      fetchAllSchoolData();
    }
  }, [userProfile?.schoolId, cache, fetchAllSchoolData]);

  useEffect(() => {
    fetchAllSchoolData();
  }, [fetchAllSchoolData]);

  return {
    ...schoolData,
    refreshSchoolData
  };
};