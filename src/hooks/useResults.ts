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
  student_number?: string;
  class_name: string;
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
  semester?: string;
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

export const useResults = (options?: { contextSemester?: string }) => {
  const contextSemester = options?.contextSemester;
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
      
      // 🔄 CACHE-BUSTING: Ajouter un timestamp unique pour forcer Supabase à ignorer le cache
      const timestamp = Date.now();
      console.log(`🔄 [${timestamp}] FORÇAGE du rafraîchissement - Récupération des données fraîches depuis la base...`);
      console.log(`📊 [${timestamp}] SchoolId:`, userProfile.schoolId);

      // 1. Récupérer les classes avec ordre pour éviter cache
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, name, level, section, academic_year_id')
        .eq('school_id', userProfile.schoolId)
        .order('created_at', { ascending: false });

      if (classesError) throw classesError;
      console.log(`✅ [${timestamp}] Classes récupérées:`, classesData?.length || 0);

      // 2. Récupérer les examens avec ordre pour éviter cache
      const { data: examsData, error: examsError } = await supabase
        .from('exams')
        .select('id, title, description, exam_date, class_id, is_published, semester')
        .eq('school_id', userProfile.schoolId)
        .order('exam_date', { ascending: false });

      if (examsError) throw examsError;
      console.log(`✅ [${timestamp}] Examens récupérés:`, examsData?.length || 0);

      // 3. Récupérer les matières avec ordre pour éviter cache
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name, abbreviation, coefficient, class_id, max_score')
        .eq('school_id', userProfile.schoolId)
        .order('name', { ascending: true });

      if (subjectsError) throw subjectsError;
      console.log(`✅ [${timestamp}] Matières récupérées:`, subjectsData?.length || 0);

      // 4. Récupérer les élèves avec ordre pour éviter cache
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_number, class_id')
        .eq('school_id', userProfile.schoolId)
        .order('last_name', { ascending: true });

      if (studentsError) throw studentsError;
      console.log(`✅ [${timestamp}] Élèves récupérés:`, studentsData?.length || 0);

      // 5. Récupérer TOUTES les notes FRAÎCHES depuis la table grades
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
          school_id,
          created_at
        `)
        .eq('school_id', userProfile.schoolId)
        .order('created_at', { ascending: false });

      if (gradesError) throw gradesError;
      console.log(`✅ [${timestamp}] Notes récupérées:`, gradesData?.length || 0);
      console.log(`📝 [${timestamp}] Échantillon de notes:`, gradesData?.slice(0, 3));

      console.log(`📊 [${timestamp}] RÉSUMÉ des données récupérées:`, {
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
            semester: exam.semester || undefined,
            
            // Récupérer les élèves avec leurs vraies notes pour cet examen
            students: classStudents.map(student => {
              // Fonction de normalisation du semester pour matcher différents formats
              const normalizeGradeSemester = (sem: string | undefined): string | undefined => {
                if (!sem) return undefined;
                const cleaned = sem.toLowerCase().trim().replace(/\s+/g, '_');
                
                if (cleaned.includes('1') || cleaned.includes('premier')) return '1er_semestre';
                if (cleaned.includes('2') || cleaned.includes('second') || cleaned.includes('deuxieme')) return '2eme_semestre';
                
                return cleaned;
              };

              // Filtrage adapté pour les examens de Composition avec contexte semestre
              const studentGrades = gradesData?.filter(grade => {
                // Vérifier que c'est bien l'élève
                if (grade.student_id !== student.id) return false;
                
                // Vérifier que la matière appartient à cette classe
                const gradeSubject = classSubjects.find(s => s.id === grade.subject_id);
                if (!gradeSubject) return false;
                
                // Pour les examens de Composition : filtrer par semester depuis grades
                const isCompositionExam = exam.title?.toLowerCase().includes('composition');
                
                if (isCompositionExam) {
                  // Déduire le semestre cible depuis plusieurs sources
                  let targetSemester = exam.semester; // Priorité 1: semester de l'examen
                  
                  // Priorité 2: contextSemester depuis l'URL (déjà normalisé par ResultatsSemestre)
                  if (!targetSemester && contextSemester) {
                    // Le contextSemester est déjà normalisé vers '1er_semestre' ou '2eme_semestre'
                    targetSemester = contextSemester;
                  }
                  
                  // Priorité 3: déduire du titre de l'examen
                  if (!targetSemester) {
                    if (exam.title?.match(/1er|premier|first/i)) {
                      targetSemester = '1er_semestre';
                    } else if (exam.title?.match(/2[eè]me|deuxi[eè]me|second/i)) {
                      targetSemester = '2eme_semestre';
                    }
                  }
                  
                  // Filtrer par exam_id ET semester (avec normalisation bidirectionnelle)
                  if (targetSemester) {
                    const normalizedGradeSemester = normalizeGradeSemester(grade.semester);
                    const normalizedTargetSemester = normalizeGradeSemester(targetSemester);
                    const matches = grade.exam_id === exam.id && normalizedGradeSemester === normalizedTargetSemester;
                    if (matches) {
                      console.log(`✅ Note Composition filtrée: ${grade.id} pour semester=${targetSemester}`);
                    }
                    return matches;
                  }
                  
                  // Fallback : accepter toutes les notes de cet exam_id (compatibilité anciennes données)
                  console.warn(`⚠️ Composition sans semester détecté, fallback sur exam_id uniquement`);
                  return grade.exam_id === exam.id;
                }
                
                // Pour les autres types d'examens : matcher uniquement par exam_id
                return grade.exam_id === exam.id;
              }) || [];

              return {
                student_id: student.id,
                first_name: student.first_name,
                last_name: student.last_name,
                numero: student.student_number,
                student_number: student.student_number,
                class_name: classe.name,
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
      if (e.key === 'matieresUpdated' || e.key === 'coefficientsUpdated' || e.key === 'notesUpdated') {
        console.log('useResults: Détection de changements, rechargement...');
        fetchResults();
      }
    };
    
    // Écouter les événements personnalisés pour la synchronisation
    const handleDataUpdate = () => {
      console.log('useResults: Données mises à jour, rechargement des résultats...');
      fetchResults();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('matieresUpdated', handleDataUpdate);
    window.addEventListener('notesUpdated', handleDataUpdate);
    
    // 🔄 SYNCHRONISATION EN TEMPS RÉEL via Supabase Realtime
    // Écouter les changements dans la table grades
    let gradesChannel: ReturnType<typeof supabase.channel> | null = null;
    
    if (userProfile?.schoolId) {
      gradesChannel = supabase
        .channel('grades-realtime-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'grades',
            filter: `school_id=eq.${userProfile.schoolId}`
          },
          (payload) => {
            console.log('🔄 Changement détecté dans la table grades:', payload);
            console.log('   - Type:', payload.eventType);
            console.log('   - Données:', payload.new || payload.old);
            // Recharger automatiquement les résultats
            fetchResults();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Abonné aux changements de la table grades en temps réel');
          }
        });
    }
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('matieresUpdated', handleDataUpdate);
      window.removeEventListener('notesUpdated', handleDataUpdate);
      
      // Nettoyer l'abonnement Realtime
      if (gradesChannel) {
        supabase.removeChannel(gradesChannel);
        console.log('🔌 Désinscrit des changements de la table grades');
      }
    };
  }, [fetchResults, userProfile?.schoolId]);

  // Fonction pour calculer les statistiques d'un élève pour un examen spécifique DEPUIS LES VRAIES NOTES
  const getStudentExamStats = useCallback((classId: string, examId: string, studentId: string) => {
    const debugTimestamp = Date.now();
    console.log(`🔍 [${debugTimestamp}] DEBUG getStudentExamStats appelé:`, { classId, examId, studentId });
    
    const classData = results.find(c => c.class_id === classId);
    if (!classData) {
      console.warn(`❌ [${debugTimestamp}] Classe non trouvée pour classId:`, classId);
      return null;
    }
    console.log(`✅ [${debugTimestamp}] Classe trouvée:`, classData.class_name);

    const examData = classData.exams.find(e => e.exam_id === examId);
    if (!examData) {
      console.warn(`❌ [${debugTimestamp}] Examen non trouvé pour examId:`, examId);
      console.log(`📋 [${debugTimestamp}] Examens disponibles:`, classData.exams.map(e => ({ id: e.exam_id, title: e.exam_title })));
      return null;
    }
    console.log(`✅ [${debugTimestamp}] Examen trouvé:`, examData.exam_title);

    const studentData = examData.students.find(s => s.student_id === studentId);
    if (!studentData) {
      console.warn(`❌ [${debugTimestamp}] Élève non trouvé pour studentId:`, studentId);
      return null;
    }
    console.log(`✅ [${debugTimestamp}] Élève trouvé:`, `${studentData.first_name} ${studentData.last_name}`);
    console.log(`📝 [${debugTimestamp}] Nombre de notes brutes pour cet élève:`, studentData.grades?.length || 0);
    console.log(`📝 [${debugTimestamp}] Notes brutes détaillées:`, studentData.grades);

    // Détecter si c'est un examen de type "Composition"
    const isCompositionExam = examData.exam_title.toLowerCase().includes('composition');
    console.log(`🎯 [${debugTimestamp}] Type d'examen - Composition:`, isCompositionExam);

    // LOGIQUE SIMPLIFIÉE : Utiliser un objet simple au lieu de Map
    let totalNotes = 0;
    let totalCoefficient = 0;
    let totalNotesDevoir = 0;
    let totalNotesComposition = 0;
    let totalNotesExamen = 0;
    let coeffDevoir = 0;
    let coeffComposition = 0;
    let coeffExamen = 0;
    const notesList: Array<{
      note: number, 
      coefficient: number, 
      subject: string,
      devoirNote?: number,
      compositionNote?: number,
      examenNote?: number,
      examType?: string
    }> = [];

    // Grouper les notes par matière - OBJET SIMPLE au lieu de Map
    const notesBySubject: Record<string, {
      subject: string;
      coefficient: number;
      devoirNote: number | null;
      compositionNote: number | null;
      examenNote: number | null;
    }> = {};
    
    let notesProcessed = 0;
    studentData.grades.forEach(grade => {
      const note = grade.grade_value;
      const coeff = grade.coefficient;
      const subject = grade.subject_name;
      const examType = grade.exam_type;
      
      console.log(`📊 [${debugTimestamp}] Traitement note #${++notesProcessed}:`, {
        subject,
        examType,
        note,
        coeff
      });
      
      if (!notesBySubject[subject]) {
        notesBySubject[subject] = {
          subject,
          coefficient: coeff,
          devoirNote: null,
          compositionNote: null,
          examenNote: null
        };
      }
      
      const subjectData = notesBySubject[subject];
      
      if (note && note > 0) {
        // Traiter TOUS les types d'examens : devoir, composition, ET examen
        if (examType === 'devoir') {
          subjectData.devoirNote = note;
          totalNotesDevoir += note * coeff;
          coeffDevoir += coeff;
          console.log(`  ➡️ Devoir enregistré: ${note}/${coeff}`);
        } else if (examType === 'composition') {
          subjectData.compositionNote = note;
          totalNotesComposition += note * coeff;
          coeffComposition += coeff;
          console.log(`  ➡️ Composition enregistrée: ${note}/${coeff}`);
        } else if (examType === 'examen') {
          subjectData.examenNote = note;
          totalNotesExamen += note * coeff;
          coeffExamen += coeff;
          console.log(`  ➡️ Examen enregistré: ${note}/${coeff}`);
        } else {
          // Pour tout autre type non reconnu, on l'enregistre quand même
          console.warn(`  ⚠️ Type d'examen non reconnu: ${examType}, note: ${note}/${coeff}`);
          subjectData.examenNote = note;
          totalNotesExamen += note * coeff;
          coeffExamen += coeff;
        }
      }
    });

    console.log(`📚 [${debugTimestamp}] Notes groupées par matière:`, notesBySubject);

    // Construire le notesList et calculer la moyenne générale
    Object.values(notesBySubject).forEach((subjectData) => {
      // Utiliser la meilleure note entre devoir, composition ET examen
      let finalNote = 0;
      
      // Vérifier chaque type de note et prendre le maximum
      const notes = [
        subjectData.devoirNote,
        subjectData.compositionNote,
        subjectData.examenNote
      ].filter(n => n && n > 0);
      
      if (notes.length > 0) {
        finalNote = Math.max(...notes);
        console.log(`  ✅ Note retenue pour ${subjectData.subject}: ${finalNote} (devoir: ${subjectData.devoirNote}, compo: ${subjectData.compositionNote}, examen: ${subjectData.examenNote})`);
        
        // Ajouter aux totaux
        totalNotes += finalNote * subjectData.coefficient;
        totalCoefficient += subjectData.coefficient;
        console.log(`  ➕ Ajouté aux totaux: ${finalNote} × ${subjectData.coefficient} = ${finalNote * subjectData.coefficient}`);
        
        notesList.push({
          note: finalNote,
          coefficient: subjectData.coefficient,
          subject: subjectData.subject,
          devoirNote: subjectData.devoirNote || undefined,
          compositionNote: subjectData.compositionNote || undefined,
          examenNote: subjectData.examenNote || undefined
        });
      } else {
        console.log(`  ⚠️ Aucune note valide pour ${subjectData.subject}`);
      }
    });

    const moyenneGenerale = totalCoefficient > 0 ? totalNotes / totalCoefficient : 0;
    const moyenneDevoir = coeffDevoir > 0 ? totalNotesDevoir / coeffDevoir : 0;
    const moyenneComposition = coeffComposition > 0 ? totalNotesComposition / coeffComposition : 0;
    const moyenneExamen = coeffExamen > 0 ? totalNotesExamen / coeffExamen : 0;

    console.log(`📈 [${debugTimestamp}] STATISTIQUES FINALES:`, {
      studentId,
      studentName: `${studentData.first_name} ${studentData.last_name}`,
      totalNotes,
      totalCoefficient,
      moyenneGenerale: moyenneGenerale.toFixed(2),
      moyenneDevoir: moyenneDevoir.toFixed(2),
      moyenneComposition: moyenneComposition.toFixed(2),
      moyenneExamen: moyenneExamen.toFixed(2),
      nombreMatieresAvecNotes: notesList.length
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
      moyenneExamen,
      isComposition: isCompositionExam
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