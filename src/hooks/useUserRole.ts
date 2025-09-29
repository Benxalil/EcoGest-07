import { useApp } from '@/contexts/AppContext';

type UserRole = "school_admin" | "teacher" | "student" | "parent" | "super_admin";

export const useUserRole = () => {
  const {
    user,
    session,
    userProfile,
    loading,
    isAdmin,
    isTeacher,
    isStudent,
    isParent,
    refreshUserProfile
  } = useApp();

  const simulateRole = (role: UserRole) => {
    // Development only - simulate role for testing
    console.log('Role simulation not available in optimized context');
  };
  
  const resetRoleSimulation = () => {
    // Reset to original role from database
    refreshUserProfile();
  };
  
  const isSimulating = () => false;

  return {
    user,
    session,
    userProfile,
    loading,
    isAdmin,
    isTeacher,
    isStudent,
    isParent,
    simulateRole,
    resetRoleSimulation,
    isSimulating,
  };
};