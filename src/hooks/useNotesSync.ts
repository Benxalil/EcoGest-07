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
  const { grades, upsertGrade, refetch: refetchGrades } = useGrades(studentId, matiereId, examId);
  const { toast } = useToast();

  // Charger les notes depuis la base de données - LOGIQUE UNIFIÉE
  const loadNotesFromDatabase = useCallback(() => {
    console.log('useNotesSync: Début chargement notes', {
      gradesCount: grades.length,
      classeId,
      matiereId,
      examId,
      studentId,
      isComposition
    });

    // CORRECTION: Ne vider les notes que si explicitement demandé (nouveau contexte d'examen)
    // Si on a un studentId défini, c'est qu'on est dans un contexte de consultation/saisie
    // Dans ce cas, charger toutes les notes disponibles même sans examId spécifique
    
    // Si pas de notes en base, initialiser structure vide
    if (!grades.length) {
      console.log('useNotesSync: Aucune note en base de données');
      setLocalNotes([]);
      setHasUnsavedChanges(false);
      return;
    }

    // Afficher toutes les notes pour debug
    console.log('useNotesSync: Toutes les notes de la base:', grades.map(g => ({
      id: g.id,
      student_id: g.student_id,
      subject_id: g.subject_id,
      exam_id: g.exam_id,
      exam_type: g.exam_type,
      grade_value: g.grade_value
    })));

    // CORRECTION: Filtrer plus intelligemment
    // - Si examId défini: prendre uniquement les notes de cet examen
    // - Sinon: prendre les notes avec exam_id null/undefined (notes génériques)
    const filteredGrades = examId 
      ? grades.filter(grade => grade.exam_id === examId)
      : grades.filter(grade => !grade.exam_id);
    
    console.log('useNotesSync: Notes filtrées pour cet examen:', {
      totalGrades: grades.length,
      filteredGrades: filteredGrades.length,
      examId,
      filteredData: filteredGrades.map(g => ({
        id: g.id,
        student_id: g.student_id,
        subject_id: g.subject_id,
        exam_id: g.exam_id,
        exam_type: g.exam_type,
        grade_value: g.grade_value
      }))
    });

    // Grouper et traiter les notes par élève et matière
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
      
      // LOGIQUE UNIFIÉE : Remplir selon le type d'examen et exam_type
      if (isComposition) {
        // Pour les compositions : séparer devoir et composition
        if (grade.exam_type === 'devoir') {
          notesByStudentAndSubject[key].devoir = grade.grade_value?.toString() || '';
        } else if (grade.exam_type === 'composition') {
          notesByStudentAndSubject[key].composition = grade.grade_value?.toString() || '';
        }
      } else {
        // Pour les autres examens : note simple
        notesByStudentAndSubject[key].note = grade.grade_value?.toString() || '';
      }
    });
    
    const notes = Object.values(notesByStudentAndSubject);
    console.log('useNotesSync: Notes finales chargées:', notes);
    setLocalNotes(notes);
    setHasUnsavedChanges(false);
  }, [grades, classeId, matiereId, examId, studentId, isComposition]);

  // Charger les notes au démarrage et quand les grades changent
  useEffect(() => {
    loadNotesFromDatabase();
  }, [loadNotesFromDatabase]);

  // Obtenir une note pour un élève et une matière spécifiques
  const getNote = useCallback((eleveId: string, matiereId: string): UnifiedNote | null => {
    const note = localNotes.find(n => n.eleveId === eleveId && n.matiereId === matiereId);
    console.log('useNotesSync: getNote pour', eleveId, matiereId, ':', note || 'null');
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

  // Sauvegarder toutes les notes en base de données - LOGIQUE UNIFIÉE
  const saveAllNotes = useCallback(async () => {
    if (!localNotes.length) {
      console.log('useNotesSync: Aucune note à sauvegarder');
      return;
    }

    try {
      console.log('useNotesSync: Début sauvegarde', localNotes.length, 'notes');
      
      const savePromises = localNotes.flatMap((note) => {
        const promises = [];
        
        if (isComposition) {
          // COMPOSITION : Sauvegarder devoir et composition séparément
          if (note.devoir && note.devoir.trim() !== '') {
            promises.push(upsertGrade({
              student_id: note.eleveId,
              subject_id: note.matiereId,
              exam_id: examId || undefined,
              grade_value: parseFloat(note.devoir),
              max_grade: 20,
              coefficient: note.coefficient,
              semester: 'semestre1',
              exam_type: 'devoir'
            }));
          }
          
          if (note.composition && note.composition.trim() !== '') {
            promises.push(upsertGrade({
              student_id: note.eleveId,
              subject_id: note.matiereId,
              exam_id: examId || undefined,
              grade_value: parseFloat(note.composition),
              max_grade: 20,
              coefficient: note.coefficient,
              semester: 'semestre1',
              exam_type: 'composition'
            }));
          }
        } else {
          // EXAMEN SIMPLE : Sauvegarder note unique
          if (note.note && note.note.trim() !== '') {
            promises.push(upsertGrade({
              student_id: note.eleveId,
              subject_id: note.matiereId,
              exam_id: examId || undefined,
              grade_value: parseFloat(note.note),
              max_grade: 20,
              coefficient: note.coefficient,
              exam_type: 'examen'
            }));
          }
        }
        
        return promises;
      });

      await Promise.all(savePromises);
      
      console.log('useNotesSync: Sauvegarde terminée avec succès');
      
      toast({
        title: "Notes sauvegardées",
        description: "Toutes les notes ont été sauvegardées avec succès.",
      });

      // SYNCHRONISATION : Recharger depuis la base pour garantir la cohérence
      await refetchGrades();
      
      // Forcer la mise à jour immédiate des notes locales après refetch
      // On appelle loadNotesFromDatabase() immédiatement après refetchGrades()
      // car le useEffect qui écoute les grades va déclencher loadNotesFromDatabase()
      // mais on force un appel immédiat pour garantir la synchronisation
      loadNotesFromDatabase();
      
      setHasUnsavedChanges(false);
      
    } catch (error) {
      console.error('useNotesSync: Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur de sauvegarde",
        description: "Une erreur est survenue lors de la sauvegarde des notes.",
        variant: "destructive",
      });
    }
  }, [localNotes, examId, isComposition, upsertGrade, refetchGrades, toast]);

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
