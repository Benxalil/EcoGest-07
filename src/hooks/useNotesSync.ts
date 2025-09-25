import { useState, useEffect, useCallback } from 'react';
import { useGrades } from './useGrades';
import { useToast } from './use-toast';

// Interface unifiée pour les notes - utilisée par les deux interfaces
export interface UnifiedNote {
  eleveId: string;
  matiereId: string;
  coefficient: number;
  // Pour les examens simples
  note?: string;
  // Pour les compositions (devoir + composition par semestre)
  devoir?: string;
  composition?: string;
  // Métadonnées
  examType?: 'devoir' | 'composition' | 'examen' | 'controle' | 'tp';
  semester?: 'semestre1' | 'semestre2';
}

interface UseNotesSyncProps {
  classeId?: string;
  matiereId?: string;
  examId?: string;
  studentId?: string;
  isComposition?: boolean;
}

export const useNotesSync = ({ classeId, matiereId, examId, studentId, isComposition }: UseNotesSyncProps) => {
  const [localNotes, setLocalNotes] = useState<UnifiedNote[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { grades, createGrade, updateGrade, refetch: refetchGrades } = useGrades();
  const { toast } = useToast();

  // Charger les notes depuis la base de données
  const loadNotesFromDatabase = useCallback(() => {
    if (!grades.length) {
      console.log('useNotesSync: Aucune note disponible');
      return;
    }

    // Filtrer les notes par exam_id si spécifié
    const filteredGrades = examId ? grades.filter(grade => grade.exam_id === examId) : grades;
    
    console.log('useNotesSync: Chargement des notes depuis la DB', {
      gradesCount: grades.length,
      filteredGradesCount: filteredGrades.length,
      classeId,
      matiereId,
      examId,
      studentId
    });

    // Si c'est un nouvel examen (pas d'exam_id), ne pas charger de notes existantes
    if (!examId) {
      console.log('useNotesSync: Nouvel examen détecté, pas de notes à charger');
      setLocalNotes([]);
      setHasUnsavedChanges(false);
      return;
    }

    const notesFromDB: UnifiedNote[] = [];
    
    // Grouper les notes par élève et matière
    const notesByStudentAndSubject: { [key: string]: UnifiedNote } = {};
    
    filteredGrades.forEach(grade => {
      const key = `${grade.student_id}_${grade.subject_id}`;
      
      if (!notesByStudentAndSubject[key]) {
        notesByStudentAndSubject[key] = {
          eleveId: grade.student_id,
          matiereId: grade.subject_id,
          coefficient: grade.coefficient || 1,
          note: '',
          devoir: '',
          composition: ''
        };
      }
      
      // Remplir les notes selon le type d'examen
      if (isComposition) {
        // Pour les compositions, séparer devoir et composition
        if (grade.semester && grade.exam_type) {
          if (grade.semester === 'semestre1') {
            if (grade.exam_type === 'devoir') {
              notesByStudentAndSubject[key].devoir = grade.grade_value.toString();
            } else if (grade.exam_type === 'composition') {
              notesByStudentAndSubject[key].composition = grade.grade_value.toString();
            }
          } else if (grade.semester === 'semestre2') {
            // Pour le semestre 2, on pourrait étendre la structure si nécessaire
            if (grade.exam_type === 'devoir') {
              notesByStudentAndSubject[key].devoir = grade.grade_value.toString();
            } else if (grade.exam_type === 'composition') {
              notesByStudentAndSubject[key].composition = grade.grade_value.toString();
            }
          }
        }
      } else {
        // Pour les autres examens, note simple
        notesByStudentAndSubject[key].note = grade.grade_value.toString();
      }
    });
    
    const notes = Object.values(notesByStudentAndSubject);
    console.log('useNotesSync: Notes chargées:', notes);
    setLocalNotes(notes);
    setHasUnsavedChanges(false);
  }, [grades, classeId, matiereId, examId, studentId]);

  // Charger les notes au démarrage et quand les grades changent
  useEffect(() => {
    loadNotesFromDatabase();
  }, [loadNotesFromDatabase]);

  // Obtenir une note pour un élève et une matière spécifiques
  const getNote = useCallback((eleveId: string, matiereId: string): UnifiedNote | null => {
    const note = localNotes.find(n => n.eleveId === eleveId && n.matiereId === matiereId);
    console.log('useNotesSync: getNote pour', eleveId, matiereId, ':', note);
    return note || null;
  }, [localNotes]);

  // Obtenir toutes les notes pour un élève
  const getNotesForStudent = useCallback((eleveId: string): UnifiedNote[] => {
    const studentNotes = localNotes.filter(n => n.eleveId === eleveId);
    console.log('useNotesSync: getNotesForStudent pour', eleveId, ':', studentNotes);
    return studentNotes;
  }, [localNotes]);

  // Obtenir toutes les notes pour une matière
  const getNotesForSubject = useCallback((matiereId: string): UnifiedNote[] => {
    const subjectNotes = localNotes.filter(n => n.matiereId === matiereId);
    console.log('useNotesSync: getNotesForSubject pour', matiereId, ':', subjectNotes);
    return subjectNotes;
  }, [localNotes]);

  // Mettre à jour une note localement
  const updateNote = useCallback((eleveId: string, matiereId: string, updates: Partial<UnifiedNote>) => {
    console.log('useNotesSync: updateNote pour', eleveId, matiereId, 'avec', updates);
    
    setLocalNotes(prevNotes => {
      const existingIndex = prevNotes.findIndex(n => n.eleveId === eleveId && n.matiereId === matiereId);
      
      if (existingIndex >= 0) {
        // Mettre à jour la note existante
        const updatedNotes = [...prevNotes];
        updatedNotes[existingIndex] = { ...updatedNotes[existingIndex], ...updates };
        return updatedNotes;
      } else {
        // Créer une nouvelle note
        const newNote: UnifiedNote = {
          eleveId,
          matiereId,
          coefficient: 1,
          note: '',
          devoir: '',
          composition: '',
          ...updates
        };
        return [...prevNotes, newNote];
      }
    });
    
    setHasUnsavedChanges(true);
  }, []);

  // Sauvegarder toutes les notes en base de données
  const saveAllNotes = useCallback(async () => {
    if (!localNotes.length) {
      console.log('useNotesSync: Aucune note à sauvegarder');
      return;
    }

    try {
      console.log('useNotesSync: Sauvegarde de', localNotes.length, 'notes');
      
      const savePromises = localNotes.map(async (note) => {
        const promises = [];
        
        if (isComposition) {
          // Pour les compositions, sauvegarder devoir et composition séparément
          if (note.devoir && note.devoir !== '') {
            promises.push(createGrade({
              student_id: note.eleveId,
              subject_id: note.matiereId,
              exam_id: examId || undefined,
              grade_value: parseFloat(note.devoir),
              max_grade: 20, // Valeur par défaut
              coefficient: note.coefficient,
              semester: 'semestre1',
              exam_type: 'devoir'
            }));
          }
          
          if (note.composition && note.composition !== '') {
            promises.push(createGrade({
              student_id: note.eleveId,
              subject_id: note.matiereId,
              exam_id: examId || undefined,
              grade_value: parseFloat(note.composition),
              max_grade: 20, // Valeur par défaut
              coefficient: note.coefficient,
              semester: 'semestre1',
              exam_type: 'composition'
            }));
          }
        } else {
          // Pour les autres examens, sauvegarder note simple
          if (note.note && note.note !== '') {
            promises.push(createGrade({
              student_id: note.eleveId,
              subject_id: note.matiereId,
              exam_id: examId || undefined,
              grade_value: parseFloat(note.note),
              max_grade: 20, // Valeur par défaut
              coefficient: note.coefficient,
              exam_type: 'examen'
            }));
          }
        }
        
        return Promise.all(promises);
      });

      await Promise.all(savePromises);
      
      console.log('useNotesSync: Toutes les notes sauvegardées avec succès');
      
      toast({
        title: "Notes sauvegardées",
        description: "Toutes les notes ont été sauvegardées avec succès.",
      });

      // Recharger les notes depuis la base de données
      await refetchGrades();
      setHasUnsavedChanges(false);
      
    } catch (error) {
      console.error('useNotesSync: Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur de sauvegarde",
        description: "Une erreur est survenue lors de la sauvegarde des notes.",
        variant: "destructive",
      });
    }
  }, [localNotes, examId, createGrade, refetchGrades, toast]);

  // Forcer le rechargement des notes
  const refreshNotes = useCallback(async () => {
    console.log('useNotesSync: Rechargement forcé des notes');
    await refetchGrades();
  }, [refetchGrades]);

  return {
    localNotes,
    hasUnsavedChanges,
    getNote,
    getNotesForStudent,
    getNotesForSubject,
    updateNote,
    saveAllNotes,
    refreshNotes,
    loadNotesFromDatabase
  };
};
