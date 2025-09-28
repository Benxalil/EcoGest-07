import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useToast } from '@/hooks/use-toast';

// Interface simplifiée pour les résultats d'élèves
export interface StudentResult {
  student_id: string;
  first_name: string;
  last_name: string;
  numero?: string;
  class_level: string;
  class_section: string;
  grades: Array<{
    subject_id: string;
    subject_name: string;
    grade_value: number;
    max_grade: number;
    coefficient: number;
    exam_type: string;
    semester?: string;
  }>;
}

// Interface pour les matières
export interface SubjectResult {
  subject_id: string;
  subject_name: string;
  coefficient: number;
}

// Interface pour les examens avec structure simplifiée
export interface ExamResult {
  exam_id: string;
  exam_title: string;
  exam_date: string;
  exam_description?: string;
  is_published: boolean;
  students: StudentResult[];
  subjects: SubjectResult[];
}

// Interface pour les résultats par classe
export interface ClassResults {
  class_id: string;
  class_name: string;
  class_level: string;
  class_section: string;
  effectif: number;
  exams: ExamResult[];
}

export const useResults = () => {
  const [results, setResults] = useState<ClassResults[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useUserRole();
  const { toast } = useToast();

  // Fonction pour récupérer DIRECTEMENT les vraies données de la base de données
  const fetchResults = useCallback(async () => {
    if (!userProfile?.schoolId) {
      console.log('useResults: Pas de schoolId trouvé');
      setResults([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Forcer une nouvelle récupération des données en invalidant le cache
      console.log('useResults: Récupération des données fraîches...');
      setError(null);
      
      console.log('useResults: Récupération des VRAIES données depuis la base pour schoolId:', userProfile.schoolId);

      // 1. Récupérer les classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, name, level, section, academic_year_id')
        .eq('school_id', userProfile.schoolId);

      if (classesError) throw classesError;

      // 2. Récupérer les examens  
      const { data: examsData, error: examsError } = await supabase
        .from('exams')
        .select('id, title, description, exam_date, class_id, is_published')
        .eq('school_id', userProfile.schoolId);

      if (examsError) throw examsError;

      // 3. Récupérer les matières
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name, abbreviation, coefficient, class_id, max_score')
        .eq('school_id', userProfile.schoolId);

      if (subjectsError) throw subjectsError;

      // 4. Récupérer les élèves
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_number, class_id')
        .eq('school_id', userProfile.schoolId);

      if (studentsError) throw studentsError;

      // 5. Récupérer TOUTES les vraies notes depuis la table grades
      const { data: gradesData, error: gradesError } = await supabase
        .from('grades')
        .select(`
          id,
          student_id,
          subject_id,
          exam_id,
          grade_value,
          max_grade,
          coefficient,
          semester,
          exam_type,
          school_id
        `)
        .eq('school_id', userProfile.schoolId);

      if (gradesError) throw gradesError;

      console.log('useResults: Données récupérées depuis la base:', {
        classes: classesData?.length || 0,
        exams: examsData?.length || 0,
        subjects: subjectsData?.length || 0,
        students: studentsData?.length || 0,
        grades: gradesData?.length || 0
      });

      // Construire les résultats avec les VRAIES notes
      const resultsData: ClassResults[] = classesData?.map(classe => {
        const classExams = examsData?.filter(exam => exam.class_id === classe.id) || [];
        const classStudents = studentsData?.filter(student => student.class_id === classe.id) || [];
        const classSubjects = subjectsData?.filter(subject => subject.class_id === classe.id) || [];
        
        return {
          class_id: classe.id,
          class_name: classe.name,
          class_level: classe.level,
          class_section: classe.section || '',
          effectif: classStudents.length,
          exams: classExams.map(exam => ({
            exam_id: exam.id,
            exam_title: exam.title,
            exam_date: exam.exam_date,
            exam_description: exam.description || '',
            is_published: exam.is_published,
            
            // Récupérer les élèves avec leurs vraies notes pour cet examen
            students: classStudents.map(student => {
              const studentGrades = gradesData?.filter(grade => 
                grade.student_id === student.id && 
                grade.exam_id === exam.id
              ) || [];

              return {
                student_id: student.id,
                first_name: student.first_name,
                last_name: student.last_name,
                numero: student.student_number,
                class_level: classe.level,
                class_section: classe.section || '',
                grades: studentGrades.map(grade => {
                  const subject = classSubjects.find(s => s.id === grade.subject_id);
                  const subjectMaxScore = subject?.max_score || 20; // Valeur par défaut de 20
                  const validatedGrade = Math.min(grade.grade_value, subjectMaxScore); // S'assurer que la note ne dépasse pas le barème
                  
                  // Log pour debug si la note dépasse le barème
                  if (grade.grade_value > subjectMaxScore) {
                    console.warn(`Note ${grade.grade_value} dépasse le barème ${subjectMaxScore} pour ${subject?.name}`);
                  }
                  
                  return {
                    subject_id: grade.subject_id,
                    subject_name: subject?.name || 'Matière inconnue',
                    grade_value: validatedGrade, // Utiliser la note validée
                    max_grade: subjectMaxScore, // Utiliser le barème de la matière, pas celui stocké en grade
                    coefficient: subject?.coefficient || 1, // Utiliser le coefficient actuel de la matière
                    exam_type: grade.exam_type,
                    semester: grade.semester
                  };
                })
              };
            }),
            
            // Matières pour cet examen
            subjects: classSubjects.map(subject => ({
              subject_id: subject.id,
              subject_name: subject.name,
              coefficient: subject.coefficient || 1,
              max_score: subject.max_score || 20
            }))
          }))
        };
      }) || [];

      console.log('useResults: Données finales structurées avec VRAIES notes:', resultsData);
      setResults(resultsData);

    } catch (err) {
      console.error('useResults: Erreur lors de la récupération des résultats:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      
      toast({
        title: "Erreur de chargement",
        description: `Impossible de charger les résultats: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [userProfile?.schoolId, toast]);

  useEffect(() => {
    fetchResults();
    
    // Écouter les changements dans la section Matières pour synchroniser
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'matieresUpdated' || e.key === 'coefficientsUpdated') {
        console.log('useResults: Détection de changements dans les matières, rechargement...');
        fetchResults();
      }
    };
    
    // Écouter les événements personnalisés pour la synchronisation
    const handleMatieresUpdate = () => {
      console.log('useResults: Matières mises à jour, rechargement des résultats...');
      fetchResults();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('matieresUpdated', handleMatieresUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('matieresUpdated', handleMatieresUpdate);
    };
  }, [fetchResults]);

  // Fonction pour calculer les statistiques d'un élève pour un examen spécifique DEPUIS LES VRAIES NOTES
  const getStudentExamStats = useCallback((classId: string, examId: string, studentId: string) => {
    console.log('useResults: getStudentExamStats pour:', { classId, examId, studentId });
    
    const classData = results.find(c => c.class_id === classId);
    if (!classData) {
      console.log('useResults: Classe non trouvée');
      return null;
    }

    const examData = classData.exams.find(e => e.exam_id === examId);
    if (!examData) {
      console.log('useResults: Examen non trouvé');
      return null;
    }

    const studentData = examData.students.find(s => s.student_id === studentId);
    if (!studentData) {
      console.log('useResults: Élève non trouvé');
      return null;
    }

    // Calculer les statistiques à partir des vraies notes récupérées de la base
    let totalNotes = 0;
    let totalCoefficient = 0;
    let totalNotesDevoir = 0;
    let totalNotesComposition = 0;
    let coeffDevoir = 0;
    let coeffComposition = 0;
    const notesList: Array<{
      note: number, 
      coefficient: number, 
      subject: string,
      devoirNote?: number,
      compositionNote?: number
    }> = [];

    console.log('useResults: Notes de cet élève depuis la base:', studentData.grades);

    // Grouper les notes par matière
    const notesBySubject = new Map();
    
    studentData.grades.forEach(grade => {
      const note = grade.grade_value;
      const coeff = grade.coefficient;
      const subject = grade.subject_name;
      const examType = grade.exam_type;
      
      if (!notesBySubject.has(subject)) {
        notesBySubject.set(subject, {
          subject,
          coefficient: coeff,
          devoirNote: null,
          compositionNote: null
        });
      }
      
      const subjectData = notesBySubject.get(subject);
      
      if (note && note > 0) {
        if (examType === 'devoir') {
          subjectData.devoirNote = note;
          totalNotesDevoir += note * coeff;
          coeffDevoir += coeff;
        } else if (examType === 'composition') {
          subjectData.compositionNote = note;
          totalNotesComposition += note * coeff;
          coeffComposition += coeff;
        }
      }
    });

    // Construire le notesList et calculer la moyenne générale
    notesBySubject.forEach((subjectData) => {
      let finalNote = 0;
      
      // Pour la moyenne générale, utiliser la meilleure note disponible
      if (subjectData.devoirNote && subjectData.compositionNote) {
        finalNote = Math.max(subjectData.devoirNote, subjectData.compositionNote);
      } else if (subjectData.devoirNote) {
        finalNote = subjectData.devoirNote;
      } else if (subjectData.compositionNote) {
        finalNote = subjectData.compositionNote;
      }
      
      if (finalNote > 0) {
        totalNotes += finalNote * subjectData.coefficient;
        totalCoefficient += subjectData.coefficient;
        
        notesList.push({
          note: finalNote,
          coefficient: subjectData.coefficient,
          subject: subjectData.subject,
          devoirNote: subjectData.devoirNote,
          compositionNote: subjectData.compositionNote
        });
      }
    });

    const moyenneGenerale = totalCoefficient > 0 ? totalNotes / totalCoefficient : 0;
    const moyenneDevoir = coeffDevoir > 0 ? totalNotesDevoir / coeffDevoir : 0;
    const moyenneComposition = coeffComposition > 0 ? totalNotesComposition / coeffComposition : 0;

    console.log('useResults: Statistiques calculées depuis la vraie base:', {
      studentId,
      totalNotes,
      totalCoefficient,
      moyenneGenerale,
      notesList: notesList.length
    });

    return {
      totalNotes,
      totalCoefficient,
      moyenneGenerale,
      notesList,
      totalNotesDevoir,
      moyenneDevoir,
      totalNotesComposition,
      moyenneComposition,
      isComposition: examData.exam_title.toLowerCase().includes('composition')
    };
  }, [results]);

  // Fonction pour obtenir les résultats d'une classe spécifique
  const getClassResults = useCallback((classId: string) => {
    return results.find(c => c.class_id === classId);
  }, [results]);

  // Fonction pour obtenir les résultats d'un examen spécifique
  const getExamResults = useCallback((classId: string, examId: string) => {
    const classResult = getClassResults(classId);
    return classResult?.exams.find(e => e.exam_id === examId);
  }, [getClassResults]);

  return {
    results,
    loading,
    error,
    refetch: fetchResults,
    getStudentExamStats,
    getClassResults,
    getExamResults
  };
};