import { useState, useEffect } from 'react';
import { useUserRole } from './useUserRole';
import { useClasses } from './useClasses';
import { useStudents } from './useStudents';
import { useTeachers } from './useTeachers';
import { useSchoolData } from './useSchoolData';
import { useAnnouncements } from './useAnnouncements';
import { useAcademicYear } from './useAcademicYear';
import { useCache } from './useCache';

export interface DashboardData {
  classes: any[];
  students: any[];
  teachers: any[];
  schoolData: any;
  announcements: any[];
  academicYear: string;
  loading: boolean;
  error: string | null;
}

export const useDashboardData = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useUserRole();

  // Hooks individuels
  const { classes, loading: classesLoading } = useClasses();
  const { students, loading: studentsLoading } = useStudents();
  const { teachers, loading: teachersLoading } = useTeachers();
  const { schoolData, loading: schoolDataLoading } = useSchoolData();
  const { announcements, loading: announcementsLoading } = useAnnouncements();
  const { academicYear, loading: academicYearLoading } = useAcademicYear();

  useEffect(() => {
    const allLoading = [
      classesLoading,
      studentsLoading,
      teachersLoading,
      schoolDataLoading,
      announcementsLoading,
      academicYearLoading
    ];

    const isLoading = allLoading.some(loading => loading);
    setLoading(isLoading);

    if (!isLoading && !userProfile?.schoolId) {
      setError('Aucun profil utilisateur trouvé');
    }
  }, [
    classesLoading,
    studentsLoading,
    teachersLoading,
    schoolDataLoading,
    announcementsLoading,
    academicYearLoading,
    userProfile?.schoolId
  ]);

  return {
    classes,
    students,
    teachers,
    schoolData,
    announcements,
    academicYear,
    loading,
    error
  };
};
