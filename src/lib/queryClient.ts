import { QueryClient } from '@tanstack/react-query';

/**
 * Configuration centralisée de React Query pour le cache et les performances
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stratégies de cache par défaut
      staleTime: 2 * 60 * 1000, // 2 minutes - données considérées fraîches
      gcTime: 5 * 60 * 1000, // 5 minutes - garbage collection (anciennement cacheTime)
      
      // Retry strategy
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch automatique
      refetchOnWindowFocus: false, // Évite les refetch inutiles
      refetchOnReconnect: true,
      refetchOnMount: false, // Utilise le cache si disponible
      
      // Network mode
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});

/**
 * Durées de cache recommandées par type de données
 */
export const CacheStaleTime = {
  // Données statiques (changent rarement)
  CLASSES: 5 * 60 * 1000, // 5 minutes
  SUBJECTS: 5 * 60 * 1000, // 5 minutes
  SCHOOL_CONFIG: 10 * 60 * 1000, // 10 minutes
  
  // Données semi-dynamiques
  STUDENTS: 2 * 60 * 1000, // 2 minutes
  TEACHERS: 2 * 60 * 1000, // 2 minutes
  EXAMS: 3 * 60 * 1000, // 3 minutes
  ANNOUNCEMENTS: 3 * 60 * 1000, // 3 minutes
  PAYMENTS: 2 * 60 * 1000, // 2 minutes
  SCHEDULES: 3 * 60 * 1000, // 3 minutes
  
  // Données dynamiques (changent fréquemment)
  GRADES: 1 * 60 * 1000, // 1 minute
  RESULTS: 2 * 60 * 1000, // 2 minutes
  NOTIFICATIONS: 30 * 1000, // 30 secondes
} as const;

/**
 * Générateurs de clés de cache standardisées
 */
export const QueryKeys = {
  // Classes
  classes: (schoolId?: string) => ['classes', schoolId].filter(Boolean),
  class: (classId: string) => ['class', classId],
  
  // Students
  students: (schoolId?: string, classId?: string) => 
    ['students', schoolId, classId].filter(Boolean),
  student: (studentId: string) => ['student', studentId],
  
  // Teachers
  teachers: (schoolId?: string) => ['teachers', schoolId].filter(Boolean),
  teacher: (teacherId: string) => ['teacher', teacherId],
  
  // Subjects
  subjects: (schoolId?: string, classId?: string) => 
    ['subjects', schoolId, classId].filter(Boolean),
  subject: (subjectId: string) => ['subject', subjectId],
  
  // Exams
  exams: (schoolId?: string, classId?: string) => 
    ['exams', schoolId, classId].filter(Boolean),
  exam: (examId: string) => ['exam', examId],
  
  // Grades
  grades: (filters: { 
    schoolId?: string; 
    studentId?: string; 
    subjectId?: string; 
    examId?: string;
    classId?: string;
  }) => ['grades', filters].filter(v => v !== undefined),
  
  // Payments
  payments: (schoolId?: string, studentId?: string) => 
    ['payments', schoolId, studentId].filter(Boolean),
  
  // Announcements
  announcements: (schoolId?: string, targetRole?: string) => 
    ['announcements', schoolId, targetRole].filter(Boolean),
  
  // Results
  results: (schoolId?: string, semester?: string) => 
    ['results', schoolId, semester].filter(Boolean),
  
  // Schedules
  schedules: (schoolId?: string, teacherId?: string, classId?: string) => 
    ['schedules', schoolId, teacherId, classId].filter(Boolean),
} as const;

/**
 * Configuration avancée du cache par type de query
 * ✅ TTL adaptés selon la fréquence de changement des données
 * ✅ Stratégies de refetch intelligentes
 */
export const QueryConfigs = {
  // Données statiques - Cache long, pas de refetch automatique
  classes: {
    staleTime: CacheStaleTime.CLASSES,
    gcTime: 15 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },
  
  subjects: {
    staleTime: CacheStaleTime.SUBJECTS,
    gcTime: 15 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  },
  
  // Données semi-dynamiques - Cache moyen, refetch sur reconnect
  students: {
    staleTime: CacheStaleTime.STUDENTS,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },
  
  teachers: {
    staleTime: CacheStaleTime.TEACHERS,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  },
  
  // Données critiques - Cache court, refetch sur focus
  payments: {
    staleTime: CacheStaleTime.PAYMENTS,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },
  
  grades: {
    staleTime: CacheStaleTime.GRADES,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  },
  
  // Notifications - Cache très court, refetch fréquent
  notifications: {
    staleTime: CacheStaleTime.NOTIFICATIONS,
    gcTime: 2 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000, // Refetch toutes les minutes
  },
} as const;
