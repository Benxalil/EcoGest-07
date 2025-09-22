import { useUserRole } from './useUserRole';

export interface UserPermissions {
  canViewAllGrades: boolean;
  canEditAllGrades: boolean;
  canViewSubjectGrades: (subjectId: string) => boolean;
  canEditSubjectGrades: (subjectId: string) => boolean;
  canViewClassGrades: (classId: string) => boolean;
  canEditClassGrades: (classId: string) => boolean;
  isAdmin: boolean;
  isTeacher: boolean;
}

export const usePermissions = (): UserPermissions => {
  const { userProfile } = useUserRole();

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'director';
  const isTeacher = userProfile?.role === 'teacher';

  return {
    canViewAllGrades: isAdmin,
    canEditAllGrades: isAdmin,
    canViewSubjectGrades: (subjectId: string) => {
      if (isAdmin) return true;
      if (isTeacher) {
        // Un enseignant peut voir les notes des matières qu'il enseigne
        return userProfile?.subjects?.some(subject => subject.id === subjectId) || false;
      }
      return false;
    },
    canEditSubjectGrades: (subjectId: string) => {
      if (isAdmin) return true;
      if (isTeacher) {
        // Un enseignant peut modifier les notes des matières qu'il enseigne
        return userProfile?.subjects?.some(subject => subject.id === subjectId) || false;
      }
      return false;
    },
    canViewClassGrades: (classId: string) => {
      if (isAdmin) return true;
      if (isTeacher) {
        // Un enseignant peut voir les notes des classes où il enseigne
        return userProfile?.classes?.some(classe => classe.id === classId) || false;
      }
      return false;
    },
    canEditClassGrades: (classId: string) => {
      if (isAdmin) return true;
      if (isTeacher) {
        // Un enseignant peut modifier les notes des classes où il enseigne
        return userProfile?.classes?.some(classe => classe.id === classId) || false;
      }
      return false;
    },
    isAdmin,
    isTeacher
  };
};
