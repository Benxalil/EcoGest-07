/**
 * 🚀 OPTIMISATION: Hook unifié pour charger les données dashboard selon le rôle
 * Évite les chargements redondants et centralise la logique
 */

import { useOptimizedUserData } from './useOptimizedUserData';
import { useTeacherData } from './useTeacherData';
import { useParentData } from './useParentData';
import { useStudentDashboardData } from './useStudentDashboardData';
import { useDashboardData } from './useDashboardData';
import { useEffect } from 'react';
import { preloadEssentialData } from '@/utils/dataPreloader';

interface DashboardHookReturn {
  data: any;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook unifié qui charge les bonnes données selon le rôle utilisateur
 */
export const useDashboard = (selectedChildId?: string | null): DashboardHookReturn => {
  const { profile, teacherId, loading: profileLoading } = useOptimizedUserData();
  const role = profile?.role;

  // Prefetch en arrière-plan dès que le profil est chargé
  useEffect(() => {
    if (profile && profile.schoolId && !profileLoading) {
      preloadEssentialData({
        id: profile.id,
        schoolId: profile.schoolId,
        role: profile.role,
        teacherId: teacherId || undefined
      } as any).catch(err => {
        console.error('[useDashboard] Prefetch error:', err);
      });
    }
  }, [profile, teacherId, profileLoading]);

  // Charger les données selon le rôle
  const teacherData = role === 'teacher' ? useTeacherData() : null;
  const parentData = role === 'parent' ? useParentData(selectedChildId) : null;
  const studentData = role === 'student' ? useStudentDashboardData() : null;
  const adminData = role === 'school_admin' ? useDashboardData() : null;

  // Déterminer quel hook est actif
  const activeHook = teacherData || parentData || studentData || adminData;

  // Retourner les données unifiées
  return {
    data: activeHook || {},
    loading: profileLoading || activeHook?.loading || false,
    error: activeHook?.error || null,
    refetch: activeHook?.refetch || (() => {})
  };
};
