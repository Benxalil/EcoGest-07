import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useOptimizedCache } from './useOptimizedCache';
import { useToast } from '@/hooks/use-toast';

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

export interface SubjectResult {
  subject_id: string;
  subject_name: string;
  coefficient: number;
}

export interface ExamResult {
  exam_id: string;
  exam_title: string;
  exam_date: string;
  exam_description?: string;
  is_published: boolean;
  students: StudentResult[];
  subjects: SubjectResult[];
}

export interface ClassResults {
  class_id: string;
  class_name: string;
  class_level: string;
  class_section: string;
  effectif: number;
  exams: ExamResult[];
}

/**
 * Hook optimisé pour récupérer les résultats
 * Utilise une seule requête optimisée avec JOINs au lieu de 5 requêtes séquentielles
 * Intègre le cache intelligent pour éviter les rechargements inutiles
 */
export const useOptimizedResults = () => {
  const [results, setResults] = useState<ClassResults[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useUserRole();
  const cache = useOptimizedCache();
  const { toast } = useToast();

  const fetchResults = useCallback(async () => {
    if (!userProfile?.schoolId) {
      setResults([]);
      setLoading(false);
      return;
    }

    const cacheKey = `results-${userProfile.schoolId}`;
    
    // Vérifier le cache
    const cachedResults = cache.get<ClassResults[]>(cacheKey);
    if (cachedResults) {
      console.log('useOptimizedResults: Chargé depuis le cache');
      setResults(cachedResults);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Requête optimisée 1: Récupérer classes + students + subjects en parallèle
      const [classesRes, gradesRes] = await Promise.all([
        // Classes avec comptage des élèves et informations complètes
        supabase
          .from('classes')
          .select(`
            id,
            name,
            level,
            section,
            students!inner(id, first_name, last_name, student_number),
            subjects(id, name, coefficient, max_score)
          `)
          .eq('school_id', userProfile.schoolId),
        
        // Toutes les notes avec informations d'examen et matière
        supabase
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
            exams!inner(id, title, description, exam_date, class_id, is_published),
            subjects!inner(id, name, coefficient, max_score)
          `)
          .eq('school_id', userProfile.schoolId)
      ]);

      if (classesRes.error) throw classesRes.error;
      if (gradesRes.error) throw gradesRes.error;

      console.log('useOptimizedResults: Données récupérées:', {
        classes: classesRes.data?.length || 0,
        grades: gradesRes.data?.length || 0
      });

      // Construire la structure des résultats de manière optimisée
      const resultsData: ClassResults[] = (classesRes.data || []).map((classe: any) => {
        const classStudents = classe.students || [];
        const classSubjects = classe.subjects || [];
        
        // Grouper les examens par ID
        const examsMap = new Map();
        
        (gradesRes.data || []).forEach((grade: any) => {
          if (grade.exams?.class_id === classe.id) {
            const examId = grade.exams.id;
            
            if (!examsMap.has(examId)) {
              examsMap.set(examId, {
                exam_id: examId,
                exam_title: grade.exams.title,
                exam_date: grade.exams.exam_date,
                exam_description: grade.exams.description || '',
                is_published: grade.exams.is_published,
                studentsMap: new Map()
              });
            }
            
            const exam = examsMap.get(examId);
            
            if (!exam.studentsMap.has(grade.student_id)) {
              const student = classStudents.find((s: any) => s.id === grade.student_id);
              if (student) {
                exam.studentsMap.set(grade.student_id, {
                  student_id: student.id,
                  first_name: student.first_name,
                  last_name: student.last_name,
                  numero: student.student_number,
                  class_level: classe.level,
                  class_section: classe.section || '',
                  grades: []
                });
              }
            }
            
            const studentData = exam.studentsMap.get(grade.student_id);
            if (studentData) {
              const subject = classSubjects.find((s: any) => s.id === grade.subject_id);
              const subjectMaxScore = subject?.max_score || 20;
              const validatedGrade = Math.min(grade.grade_value, subjectMaxScore);
              
              studentData.grades.push({
                subject_id: grade.subject_id,
                subject_name: grade.subjects?.name || 'Matière inconnue',
                grade_value: validatedGrade,
                max_grade: subjectMaxScore,
                coefficient: subject?.coefficient || 1,
                exam_type: grade.exam_type,
                semester: grade.semester
              });
            }
          }
        });

        // Convertir les examens en tableau
        const exams = Array.from(examsMap.values()).map(exam => ({
          ...exam,
          students: Array.from(exam.studentsMap.values()),
          subjects: classSubjects.map((s: any) => ({
            subject_id: s.id,
            subject_name: s.name,
            coefficient: s.coefficient || 1,
            max_score: s.max_score || 20
          })),
          studentsMap: undefined
        }));

        // Ajouter tous les étudiants même sans notes
        exams.forEach(exam => {
          classStudents.forEach((student: any) => {
            if (!exam.students.find((s: StudentResult) => s.student_id === student.id)) {
              exam.students.push({
                student_id: student.id,
                first_name: student.first_name,
                last_name: student.last_name,
                numero: student.student_number,
                class_level: classe.level,
                class_section: classe.section || '',
                grades: []
              });
            }
          });
        });

        return {
          class_id: classe.id,
          class_name: classe.name,
          class_level: classe.level,
          class_section: classe.section || '',
          effectif: classStudents.length,
          exams
        };
      });

      // Mettre en cache pour 10 minutes
      cache.set(cacheKey, resultsData, 10 * 60 * 1000);
      
      console.log('useOptimizedResults: Résultats structurés:', resultsData.length);
      setResults(resultsData);

    } catch (err) {
      console.error('useOptimizedResults: Erreur:', err);
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
  }, [userProfile?.schoolId, cache, toast]);

  useEffect(() => {
    fetchResults();
    
    const handleMatieresUpdate = () => {
      console.log('useOptimizedResults: Matières mises à jour, rechargement...');
      cache.invalidateByPrefix('results-');
      fetchResults();
    };
    
    window.addEventListener('matieresUpdated', handleMatieresUpdate);
    
    return () => {
      window.removeEventListener('matieresUpdated', handleMatieresUpdate);
    };
  }, [fetchResults, cache]);

  const getStudentExamStats = useCallback((classId: string, examId: string, studentId: string) => {
    const classData = results.find(c => c.class_id === classId);
    if (!classData) return null;

    const examData = classData.exams.find(e => e.exam_id === examId);
    if (!examData) return null;

    const studentData = examData.students.find(s => s.student_id === studentId);
    if (!studentData) return null;

    const isCompositionExam = examData.exam_title.toLowerCase().includes('composition');

    let totalNotes = 0;
    let totalCoefficient = 0;
    let totalNotesDevoir = 0;
    let totalNotesComposition = 0;
    let coeffDevoir = 0;
    let coeffComposition = 0;
    const notesList: Array<{
      note: number;
      coefficient: number;
      subject: string;
      devoirNote?: number;
      compositionNote?: number;
    }> = [];

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
          compositionNote: null,
          allNotes: []
        });
      }
      
      const subjectData = notesBySubject.get(subject);
      
      if (note && note > 0) {
        if (isCompositionExam) {
          subjectData.allNotes.push({ note, examType });
          totalNotes += note * coeff;
          totalCoefficient += coeff;
        } else {
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
      }
    });

    notesBySubject.forEach((subjectData) => {
      let finalNote = 0;
      
      if (isCompositionExam) {
        if (subjectData.allNotes.length > 0) {
          const sum = subjectData.allNotes.reduce((acc: number, n: any) => acc + n.note, 0);
          finalNote = sum / subjectData.allNotes.length;
          
          notesList.push({
            note: finalNote,
            coefficient: subjectData.coefficient,
            subject: subjectData.subject,
            devoirNote: subjectData.devoirNote,
            compositionNote: subjectData.compositionNote
          });
        }
      } else {
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
      }
    });

    const moyenneGenerale = totalCoefficient > 0 ? totalNotes / totalCoefficient : 0;
    const moyenneDevoir = coeffDevoir > 0 ? totalNotesDevoir / coeffDevoir : 0;
    const moyenneComposition = coeffComposition > 0 ? totalNotesComposition / coeffComposition : 0;

    return {
      totalNotes,
      totalCoefficient,
      moyenneGenerale,
      notesList,
      totalNotesDevoir,
      moyenneDevoir,
      totalNotesComposition,
      moyenneComposition,
      isComposition: isCompositionExam
    };
  }, [results]);

  const getClassResults = useCallback((classId: string) => {
    return results.find(c => c.class_id === classId);
  }, [results]);

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
