import { supabase } from '@/integrations/supabase/client';
import { queryClient, QueryKeys, CacheStaleTime } from '@/lib/queryClient';
import type { UserProfile } from '@/hooks/useUnifiedUserData';

/**
 * Configuration du préchargement de données au login
 */
interface PreloadConfig {
  userProfile?: boolean;
  todaySchedules?: boolean;
  recentAnnouncements?: boolean;
  userClasses?: boolean;
  subjects?: boolean;
}

/**
 * Précharge les données essentielles immédiatement après le login
 * pour optimiser la navigation initiale
 */
export async function preloadEssentialData(
  userProfile: UserProfile,
  config: PreloadConfig = {
    userProfile: true,
    todaySchedules: true,
    recentAnnouncements: true,
    userClasses: true,
    subjects: true
  }
): Promise<void> {
  console.log('[DataPreloader] Starting essential data preload...');
  
  const preloadPromises: Promise<any>[] = [];
  
  try {
    // Précharger l'emploi du temps du jour
    if (config.todaySchedules && userProfile.schoolId) {
      preloadPromises.push(preloadTodaySchedules(userProfile.schoolId, userProfile.role));
    }
    
    // Précharger les annonces récentes
    if (config.recentAnnouncements && userProfile.schoolId) {
      preloadPromises.push(preloadRecentAnnouncements(userProfile.schoolId, userProfile.role));
    }
    
    // Précharger les classes de l'utilisateur
    if (config.userClasses && userProfile.schoolId) {
      preloadPromises.push(preloadUserClasses(userProfile.schoolId, userProfile.role, userProfile.id));
    }
    
    // Précharger les matières
    if (config.subjects && userProfile.schoolId) {
      preloadPromises.push(preloadSubjects(userProfile.schoolId));
    }
    
    // Exécuter tous les préchargements en parallèle
    await Promise.allSettled(preloadPromises);
    
    console.log('[DataPreloader] ✅ Essential data preloaded successfully');
  } catch (error) {
    console.error('[DataPreloader] ❌ Error during preload:', error);
    // Ne pas bloquer le login en cas d'erreur de préchargement
  }
}

/**
 * Précharge l'emploi du temps du jour
 */
async function preloadTodaySchedules(schoolId: string, userRole: string): Promise<void> {
  try {
    const today = new Date().getDay();
    
    await queryClient.prefetchQuery({
      queryKey: QueryKeys.schedules(schoolId, undefined, undefined),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('schedules')
          .select('id, day_of_week, start_time, end_time, subject, teacher, room, class_id')
          .eq('school_id', schoolId)
          .eq('day_of_week', today);
        
        if (error) throw error;
        return data;
      },
      staleTime: CacheStaleTime.SCHEDULES,
    });
  } catch (error) {
    console.error('[DataPreloader] Error preloading schedules:', error);
  }
}

/**
 * Précharge les annonces récentes
 */
async function preloadRecentAnnouncements(schoolId: string, userRole: string): Promise<void> {
  try {
    await queryClient.prefetchQuery({
      queryKey: QueryKeys.announcements(schoolId, userRole),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('announcements')
          .select('id, title, content, priority, is_urgent, published_at, target_audience')
          .eq('school_id', schoolId)
          .eq('is_published', true)
          .order('published_at', { ascending: false })
          .limit(10);
        
        if (error) throw error;
        
        // Filtrer selon le rôle
        return (data || []).filter(announcement => 
          !announcement.target_audience || 
          announcement.target_audience.length === 0 ||
          announcement.target_audience.includes('tous') ||
          announcement.target_audience.includes(userRole)
        );
      },
      staleTime: CacheStaleTime.ANNOUNCEMENTS,
    });
  } catch (error) {
    console.error('[DataPreloader] Error preloading announcements:', error);
  }
}

/**
 * Précharge les classes de l'utilisateur
 */
async function preloadUserClasses(schoolId: string, userRole: string, userId: string): Promise<void> {
  try {
    await queryClient.prefetchQuery({
      queryKey: QueryKeys.classes(schoolId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('classes')
          .select('id, name, level, section, capacity, effectif')
          .eq('school_id', schoolId)
          .order('level');
        
        if (error) throw error;
        return data;
      },
      staleTime: CacheStaleTime.CLASSES,
    });
  } catch (error) {
    console.error('[DataPreloader] Error preloading classes:', error);
  }
}

/**
 * Précharge les matières
 */
async function preloadSubjects(schoolId: string): Promise<void> {
  try {
    await queryClient.prefetchQuery({
      queryKey: QueryKeys.subjects(schoolId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('subjects')
          .select('id, name, code, coefficient, color, class_id')
          .eq('school_id', schoolId)
          .order('name');
        
        if (error) throw error;
        return data;
      },
      staleTime: CacheStaleTime.SUBJECTS,
    });
  } catch (error) {
    console.error('[DataPreloader] Error preloading subjects:', error);
  }
}

/**
 * Précharge les données spécifiques à un rôle enseignant
 */
export async function preloadTeacherData(teacherId: string, schoolId: string): Promise<void> {
  console.log('[DataPreloader] Preloading teacher-specific data...');
  
  try {
    await queryClient.prefetchQuery({
      queryKey: ['teacher-classes', teacherId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('teacher_subjects')
          .select('class_id, subject_id, classes(id, name, level, section)')
          .eq('teacher_id', teacherId)
          .eq('school_id', schoolId);
        
        if (error) throw error;
        return data;
      },
      staleTime: CacheStaleTime.CLASSES,
    });
    
    console.log('[DataPreloader] ✅ Teacher data preloaded');
  } catch (error) {
    console.error('[DataPreloader] Error preloading teacher data:', error);
  }
}

/**
 * Précharge les données spécifiques à un étudiant
 */
export async function preloadStudentData(studentId: string, schoolId: string): Promise<void> {
  console.log('[DataPreloader] Preloading student-specific data...');
  
  try {
    await queryClient.prefetchQuery({
      queryKey: ['student-class-info', studentId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('students')
          .select('id, class_id, classes(id, name, level, section)')
          .eq('id', studentId)
          .eq('school_id', schoolId)
          .single();
        
        if (error) throw error;
        return data;
      },
      staleTime: CacheStaleTime.CLASSES,
    });
    
    console.log('[DataPreloader] ✅ Student data preloaded');
  } catch (error) {
    console.error('[DataPreloader] Error preloading student data:', error);
  }
}
