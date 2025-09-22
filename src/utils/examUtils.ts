// Utility functions for exam management and publication status

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
 * Get all exams from localStorage
 */
export const getExamensFromStorage = (): Examen[] => {
  try {
    // Remplacé par hook Supabase
      // const savedExamens = // localStorage.getItem("examens") // Remplacé par hook Supabase;
    if (savedExamens) {
      return JSON.parse(savedExamens);
    }
    return [];
  } catch (error) {
    console.error("Erreur lors de la récupération des examens:", error);
    return [];
  }
};

/**
 * Get only published exams from localStorage
 */
export const getPublishedExamens = (): Examen[] => {
  const allExamens = getExamensFromStorage();
  return allExamens.filter(examen => examen.isPublished === true);
};

/**
 * Check if an exam is published
 */
export const isExamPublished = (examId: string): boolean => {
  const examens = getExamensFromStorage();
  const examen = examens.find(e => e.id === examId);
  return examen?.isPublished === true;
};

/**
 * Get published exam IDs
 */
export const getPublishedExamIds = (): string[] => {
  const publishedExamens = getPublishedExamens();
  return publishedExamens.map(e => e.id);
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