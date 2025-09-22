// Utility functions for grade management with coefficients and dynamic max scores

export interface MatiereWithCoefficient {
  id: number;
  nom: string;
  abreviation?: string;
  moyenne: string; // Format: "/20", "/10", etc.
  coefficient: string; // Numeric coefficient as string
  classeId: string;
  horaires?: string;
}

export interface GradeInput {
  value: number;
  maxScore: number;
  coefficient: number;
}

export interface WeightedAverage {
  total: number;
  weighted: number;
  coefficient: number;
}

/**
 * Parse max score from moyenne field (e.g., "/20" -> 20, "/10" -> 10, "10" -> 10)
 */
export const parseMaxScoreFromMoyenne = (moyenne: string): number => {
  if (!moyenne || typeof moyenne !== 'string') return 20; // Default to 20
  
  // First try to match format with "/" like "/20"
  const slashMatch = moyenne.match(/\/(\d+(?:\.\d+)?)/);
  if (slashMatch && slashMatch[1]) {
    const parsed = parseFloat(slashMatch[1]);
    return isNaN(parsed) ? 20 : parsed;
  }
  
  // Then try to parse as direct number like "10"
  const directNumber = parseFloat(moyenne.trim());
  if (!isNaN(directNumber) && directNumber > 0) {
    return directNumber;
  }
  
  return 20; // Default fallback
};

/**
 * Parse coefficient from string to number
 */
export const parseCoefficient = (coefficient: string | number): number => {
  if (typeof coefficient === 'number') return coefficient;
  if (!coefficient || typeof coefficient !== 'string') return 1; // Default coefficient
  
  const parsed = parseFloat(coefficient);
  return isNaN(parsed) ? 1 : parsed;
};

/**
 * Validate grade input against max score
 */
export const validateGradeInput = (value: string | number, maxScore: number): {
  isValid: boolean;
  errorMessage?: string;
  sanitizedValue: number;
} => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue) || numValue < 0) {
    return {
      isValid: false,
      errorMessage: "La note doit être un nombre positif",
      sanitizedValue: 0
    };
  }
  
  if (numValue > maxScore) {
    return {
      isValid: false,
      errorMessage: `La note ne peut pas dépasser ${maxScore}`,
      sanitizedValue: maxScore
    };
  }
  
  return {
    isValid: true,
    sanitizedValue: numValue
  };
};

/**
 * Calculate weighted average from multiple grades
 */
export const calculateWeightedAverage = (grades: GradeInput[]): WeightedAverage => {
  if (!grades || grades.length === 0) {
    return { total: 0, weighted: 0, coefficient: 0 };
  }
  
  let totalWeightedScore = 0;
  let totalCoefficient = 0;
  
  grades.forEach(grade => {
    if (grade.value >= 0 && !isNaN(grade.value)) {
      // Normalize grade to base 20 for calculation
      const normalizedGrade = (grade.value / grade.maxScore) * 20;
      totalWeightedScore += normalizedGrade * grade.coefficient;
      totalCoefficient += grade.coefficient;
    }
  });
  
  const weightedAverage = totalCoefficient > 0 ? totalWeightedScore / totalCoefficient : 0;
  
  return {
    total: totalWeightedScore,
    weighted: Math.round(weightedAverage * 100) / 100, // Round to 2 decimals
    coefficient: totalCoefficient
  };
};

/**
 * Calculate semester average for a student across all subjects
 */
export const calculateSemesterAverage = (
  notes: { [matiereId: number]: { devoir: number; composition: number } },
  matieres: MatiereWithCoefficient[]
): WeightedAverage => {
  const grades: GradeInput[] = [];
  
  matieres.forEach(matiere => {
    const matiereNotes = notes[matiere.id];
    if (matiereNotes) {
      const maxScore = parseMaxScoreFromMoyenne(matiere.moyenne);
      const coefficient = parseCoefficient(matiere.coefficient);
      
      // Add devoir and composition as individual grades
      if (matiereNotes.devoir >= 0) {
        grades.push({
          value: matiereNotes.devoir,
          maxScore,
          coefficient: coefficient * 0.4 // Devoir weight (40%)
        });
      }
      
      if (matiereNotes.composition >= 0) {
        grades.push({
          value: matiereNotes.composition,
          maxScore,
          coefficient: coefficient * 0.6 // Composition weight (60%)
        });
      }
    }
  });
  
  return calculateWeightedAverage(grades);
};

/**
 * Get matiere by ID with proper typing
 */
export const getMatiereById = (
  matiereId: number, 
  matieres: MatiereWithCoefficient[]
): MatiereWithCoefficient | null => {
  return matieres.find(m => m.id === matiereId) || null;
};

/**
 * Load subjects from Supabase with proper typing
 * DÉPRÉCIÉ: Utilisez le hook useSubjects à la place
 */
export const loadMatieresFromStorage = (classeId?: string): MatiereWithCoefficient[] => {
  // Retourner un tableau vide pour la compatibilité
  return [];
};

/**
 * Format grade display with proper decimal places
 */
export const formatGrade = (value: number, decimals: number = 2): string => {
  if (isNaN(value) || value < 0) return '';
  return value.toFixed(decimals);
};