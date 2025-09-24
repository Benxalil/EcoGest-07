// Utility functions for exam management and publication status
// Ces fonctions sont maintenant obsolètes car les examens sont gérés via useExams hook

interface Examen {
  id: string;
  titre: string;
  type: string;
  semestre: string;
  anneeAcademique: string;
  dateExamen: string;
  classes: string[];
  dateCreation: string;
  statut: string;
  isPublished?: boolean;
}

/**
 * @deprecated Utilisez useExams hook à la place
 * Get all exams from localStorage
 */
export const getExamensFromStorage = (): Examen[] => {
  console.warn('getExamensFromStorage est obsolète. Utilisez useExams hook à la place.');
  return [];
};

/**
 * @deprecated Utilisez useExams hook à la place
 * Get only published exams from localStorage
 */
export const getPublishedExamens = (): Examen[] => {
  console.warn('getPublishedExamens est obsolète. Utilisez useExams hook à la place.');
  return [];
};

/**
 * @deprecated Utilisez useExams hook à la place
 * Check if an exam is published
 */
export const isExamPublished = (examId: string): boolean => {
  console.warn('isExamPublished est obsolète. Utilisez useExams hook à la place.');
  return false;
};

/**
 * @deprecated Utilisez useExams hook à la place
 * Get published exam IDs
 */
export const getPublishedExamIds = (): string[] => {
  console.warn('getPublishedExamIds est obsolète. Utilisez useExams hook à la place.');
  return [];
};

/**
 * Filter notes by published exams
 * This function filters notes to only include those from published exams
 */
export const filterNotesByPublishedExams = (
  notes: any[], 
  examIdKey: string = 'examId'
): any[] => {
  const publishedExamIds = getPublishedExamIds();
  return notes.filter(note => {
    // If the note has an exam ID, check if it's published
    if (note[examIdKey]) {
      return publishedExamIds.includes(note[examIdKey]);
    }
    // If no exam ID (continuous assessment), include it
    return true;
  });
};

/**
 * Check if results should be visible to students/parents
 * Returns true only if the exam exists and is published
 */
export const canViewResults = (examId?: string): boolean => {
  if (!examId) {
    // For non-exam grades (continuous assessment), always visible
    return true;
  }
  return isExamPublished(examId);
};