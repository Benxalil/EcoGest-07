import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useToast } from '@/hooks/use-toast';

export interface StudentResult {
  student_id: string;
  first_name: string;
  last_name: string;
  numero?: string;
  class_id: string;
  class_name: string;
  class_level: string;
  class_section: string;
}

export interface SubjectResult {
  subject_id: string;
  subject_name: string;
  subject_abbreviation: string;
  coefficient: number;
  max_score: number;
  hours_per_week: number;
}

export interface ExamResult {
  exam_id: string;
  exam_title: string;
  exam_description?: string;
  exam_date: string;
  class_id: string;
  class_name: string;
  class_level: string;
  class_section: string;
  subjects: SubjectResult[];
  students: StudentResult[];
  grades: {
    [studentId: string]: {
      [subjectId: string]: {
        devoir?: number;
        composition?: number;
        note?: number;
        moyenne?: number;
        coefficient: number;
        max_score: number;
      };
    };
  };
}

export interface ClassResults {
  class_id: string;
  class_name: string;
  class_level: string;
  class_section: string;
  effectif?: number; // Optionnel car la colonne n'existe peut-être pas
  exams: ExamResult[];
}

export const useResults = () => {
  const [results, setResults] = useState<ClassResults[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useUserRole();
  const { toast } = useToast();

  const fetchResults = useCallback(async () => {
    if (!userProfile?.schoolId) {
      console.log('useResults: Pas de schoolId, arrêt du fetch');
      setResults([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('useResults: Début du fetch des résultats pour schoolId:', userProfile.schoolId);

      // 1. Récupérer toutes les classes de l'école
      const { data: classes, error: classesError } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          level,
          section,
          academic_year_id
        `)
        .eq('school_id', userProfile.schoolId)
        .order('level', { ascending: true })
        .order('section', { ascending: true });

      if (classesError) {
        console.error('useResults: Erreur lors de la récupération des classes:', classesError);
        throw classesError;
      }

      console.log('useResults: Classes récupérées:', classes?.length);

      if (!classes || classes.length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }

      // 2. Pour chaque classe, récupérer les examens et les données associées
      const classResults: ClassResults[] = [];

      for (const classe of classes) {
        console.log(`useResults: Traitement de la classe ${classe.name}`);

        // Récupérer les examens de cette classe
        const { data: exams, error: examsError } = await supabase
          .from('exams')
          .select('*')
          .eq('class_id', classe.id)
          .eq('school_id', userProfile.schoolId)
          .order('exam_date', { ascending: false });

        if (examsError) {
          console.error(`useResults: Erreur lors de la récupération des examens pour la classe ${classe.name}:`, examsError);
          continue;
        }

        if (!exams || exams.length === 0) {
          console.log(`useResults: Aucun examen pour la classe ${classe.name}`);
          continue;
        }

        // Récupérer les matières de cette classe
        const { data: subjects, error: subjectsError } = await supabase
          .from('subjects')
          .select('*')
          .eq('class_id', classe.id)
          .eq('school_id', userProfile.schoolId)
          .order('name', { ascending: true });

        if (subjectsError) {
          console.error(`useResults: Erreur lors de la récupération des matières pour la classe ${classe.name}:`, subjectsError);
          continue;
        }

        // Récupérer les élèves de cette classe
        const { data: students, error: studentsError } = await supabase
          .from('students')
          .select('*')
          .eq('class_id', classe.id)
          .eq('school_id', userProfile.schoolId)
          .order('first_name', { ascending: true });

        if (studentsError) {
          console.error(`useResults: Erreur lors de la récupération des élèves pour la classe ${classe.name}:`, studentsError);
          continue;
        }

        // Récupérer toutes les notes pour cette classe (sans jointures complexes)
        const { data: grades, error: gradesError } = await supabase
          .from('grades')
          .select('*')
          .eq('school_id', userProfile.schoolId)
          .in('student_id', students?.map(s => s.id) || [])
          .in('subject_id', subjects?.map(s => s.id) || []);

        if (gradesError) {
          console.error(`useResults: Erreur lors de la récupération des notes pour la classe ${classe.name}:`, gradesError);
          continue;
        }

        // Organiser les données par examen
        const examResults: ExamResult[] = exams.map(exam => {
          const examGrades = grades?.filter(g => g.exam_id === exam.id) || [];
          
          // Organiser les notes par élève et matière
          const gradesByStudentAndSubject: {
            [studentId: string]: {
              [subjectId: string]: {
                devoir?: number;
                composition?: number;
                note?: number;
                moyenne?: number;
                coefficient: number;
                max_score: number;
              };
            };
          } = {};

          // Initialiser la structure pour tous les élèves et matières
          students?.forEach(student => {
            gradesByStudentAndSubject[student.id] = {};
            subjects?.forEach(subject => {
              gradesByStudentAndSubject[student.id][subject.id] = {
                coefficient: subject.coefficient,
                max_score: subject?.coefficient || 1,
              };
            });
          });

          // Remplir avec les notes existantes
          examGrades.forEach(grade => {
            const studentId = grade.student_id;
            const subjectId = grade.subject_id;
            
            // Trouver les informations de la matière
            const subject = subjects?.find(s => s.id === subjectId);
            
            if (!gradesByStudentAndSubject[studentId]) {
              gradesByStudentAndSubject[studentId] = {};
            }
            if (!gradesByStudentAndSubject[studentId][subjectId]) {
              gradesByStudentAndSubject[studentId][subjectId] = {
                coefficient: subject?.coefficient || 1,
                max_score: subject?.coefficient || 1
              };
            }

            // Détecter le type d'examen basé sur le titre
            const isCompositionExam = exam.title.toLowerCase().includes('composition') ||
                                   exam.title.toLowerCase().includes('première composition') ||
                                   exam.title.toLowerCase().includes('deuxième composition');

            if (isCompositionExam) {
              // Pour les compositions, séparer devoir et composition
              if (grade.exam_type === 'devoir') {
                gradesByStudentAndSubject[studentId][subjectId].devoir = grade.grade_value;
              } else if (grade.exam_type === 'composition') {
                gradesByStudentAndSubject[studentId][subjectId].composition = grade.grade_value;
              }
              
              // Calculer la moyenne pour les compositions
              const devoir = gradesByStudentAndSubject[studentId][subjectId].devoir;
              const composition = gradesByStudentAndSubject[studentId][subjectId].composition;
              if (devoir !== undefined && composition !== undefined) {
                gradesByStudentAndSubject[studentId][subjectId].moyenne = (devoir + composition) / 2;
              } else if (devoir !== undefined) {
                gradesByStudentAndSubject[studentId][subjectId].moyenne = devoir;
              } else if (composition !== undefined) {
                gradesByStudentAndSubject[studentId][subjectId].moyenne = composition;
              }
            } else {
              // Pour les autres examens, note simple
              gradesByStudentAndSubject[studentId][subjectId].note = grade.grade_value;
              gradesByStudentAndSubject[studentId][subjectId].moyenne = grade.grade_value;
            }
          });

          return {
            exam_id: exam.id,
            exam_title: exam.title,
            exam_description: exam.description,
            exam_date: exam.exam_date,
            class_id: classe.id,
            class_name: classe.name,
            class_level: classe.level,
            class_section: classe.section,
            subjects: subjects?.map(subject => ({
              subject_id: subject.id,
              subject_name: subject.name,
              subject_abbreviation: subject.abbreviation,
              coefficient: subject.coefficient,
              max_score: subject?.coefficient || 1,
              hours_per_week: subject.hours_per_week
            })) || [],
            students: students?.map(student => ({
              student_id: student.id,
              first_name: student.first_name,
              last_name: student.last_name,
              numero: student.student_number,
              class_id: classe.id,
              class_name: classe.name,
              class_level: classe.level,
              class_section: classe.section
            })) || [],
            grades: gradesByStudentAndSubject
          };
        });

        classResults.push({
          class_id: classe.id,
          class_name: classe.name,
          class_level: classe.level,
          class_section: classe.section,
          effectif: 0, // Valeur par défaut car la colonne n'existe pas
          exams: examResults
        });
      }

      console.log('useResults: Résultats finaux:', classResults);
      setResults(classResults);
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
  }, [fetchResults]);

  // Fonction pour calculer les statistiques d'un élève pour un examen
  const getStudentExamStats = useCallback((classId: string, examId: string, studentId: string) => {
    const classResult = results.find(c => c.class_id === classId);
    if (!classResult) return null;

    const exam = classResult.exams.find(e => e.exam_id === examId);
    if (!exam) return null;

    const studentGrades = exam.grades[studentId];
    if (!studentGrades) return null;

    const stats = {
      totalNotes: 0,
      totalCoefficient: 0,
      moyenneGenerale: 0,
      notesList: [] as { subject: string; note: number; coefficient: number; max_score: number }[],
      totalNotesDevoir: 0,
      moyenneDevoir: 0,
      totalNotesComposition: 0,
      moyenneComposition: 0,
      isComposition: exam.exam_title.toLowerCase().includes('composition')
    };

    // Calculer les statistiques pour chaque matière
    Object.entries(studentGrades).forEach(([subjectId, gradeData]) => {
      const subject = exam.subjects.find(s => s.subject_id === subjectId);
      if (!subject) return;

      if (stats.isComposition) {
        // Pour les compositions
        if (gradeData.devoir !== undefined) {
          stats.totalNotesDevoir += gradeData.devoir * gradeData.coefficient;
          stats.notesList.push({
            subject: subject.subject_name,
            note: gradeData.devoir,
            coefficient: gradeData.coefficient,
            max_score: gradeData.max_score
          });
        }
        if (gradeData.composition !== undefined) {
          stats.totalNotesComposition += gradeData.composition * gradeData.coefficient;
        }
        if (gradeData.moyenne !== undefined) {
          stats.totalNotes += gradeData.moyenne * gradeData.coefficient;
          stats.totalCoefficient += gradeData.coefficient;
        }
      } else {
        // Pour les autres examens
        if (gradeData.note !== undefined) {
          stats.totalNotes += gradeData.note * gradeData.coefficient;
          stats.totalCoefficient += gradeData.coefficient;
          stats.notesList.push({
            subject: subject.subject_name,
            note: gradeData.note,
            coefficient: gradeData.coefficient,
            max_score: gradeData.max_score
          });
        }
      }
    });

    // Calculer les moyennes
    if (stats.totalCoefficient > 0) {
      stats.moyenneGenerale = stats.totalNotes / stats.totalCoefficient;
    }

    if (stats.isComposition) {
      const devoirCoeff = exam.subjects.reduce((sum, s) => {
        const grade = studentGrades[s.subject_id];
        return sum + (grade?.devoir !== undefined ? grade.coefficient : 0);
      }, 0);
      
      const compositionCoeff = exam.subjects.reduce((sum, s) => {
        const grade = studentGrades[s.subject_id];
        return sum + (grade?.composition !== undefined ? grade.coefficient : 0);
      }, 0);

      if (devoirCoeff > 0) {
        stats.moyenneDevoir = stats.totalNotesDevoir / devoirCoeff;
      }
      if (compositionCoeff > 0) {
        stats.moyenneComposition = stats.totalNotesComposition / compositionCoeff;
      }
    }

    return stats;
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
