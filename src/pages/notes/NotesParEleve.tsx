import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GradeInput } from "@/components/ui/grade-input";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ArrowLeft, User, BookOpen, Search, Save, Edit3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSchoolData } from "@/hooks/useSchoolData";
import { MatiereWithCoefficient, parseMaxScoreFromMoyenne, calculateSemesterAverage } from "@/utils/gradeUtils";
import { useSubjects } from "@/hooks/useSubjects";
import { useClasses } from "@/hooks/useClasses";
import { useStudents } from "@/hooks/useStudents";
import { useGrades } from "@/hooks/useGrades";
interface Student {
  id: string;
  nom: string;
  prenom: string;
  classe: string;
}
interface Classe {
  id: string;
  session: string;
  libelle: string;
  effectif: number;
}

// Use the unified Matiere interface from gradeUtils

interface EleveNote {
  eleveId: string;
  matiereId: number;
  semestre1: {
    devoir: string;
    composition: string;
  };
  semestre2: {
    devoir: string;
    composition: string;
  };
  // For non-composition exams
  note?: string;
}
export default function NotesParEleve() {
  const [eleves, setEleves] = useState<Student[]>([]);
  const [matieres, setMatieres] = useState<MatiereWithCoefficient[]>([]);
  const [selectedEleve, setSelectedEleve] = useState<Student | null>(null);
  const [selectedClasseFilter, setSelectedClasseFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [notes, setNotes] = useState<{
    [key: string]: EleveNote[];
  }>({});
  const [selectedSemestre, setSelectedSemestre] = useState<"semestre1" | "semestre2">("semestre1");
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [semesterAverage, setSemesterAverage] = useState<number>(0);
  const [examInfo, setExamInfo] = useState<{
    type: string;
    titre: string;
  } | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    toast
  } = useToast();

  // Remplacé par hook Supabase
  const { schoolData: schoolSettings } = useSchoolData();
  const isTrimestreSystem = schoolSettings?.system === 'trimestre';
  
  // Hooks pour récupérer les données depuis la base
  const classeId = searchParams.get('classeId');
  const { classes, loading: classesLoading } = useClasses();
  const { students, loading: studentsLoading } = useStudents();
  const { subjects, loading: subjectsLoading } = useSubjects(classeId || '');
  const { grades, upsertGrade, getGradeForStudent, refetch: refetchGrades } = useGrades();
  useEffect(() => {
    loadData();
    loadExamInfo();
  }, [classes, students, subjects]);

  // Charger les matières quand la classe change
  useEffect(() => {
    if (classeId) {
      loadMatieresForEleve(classeId);
    }
  }, [classeId, subjects]);
  const loadExamInfo = () => {
    try {
      const savedExamInfo = sessionStorage.getItem('current_examen_notes');
      if (savedExamInfo) {
        const examData = JSON.parse(savedExamInfo);
        setExamInfo({
          type: examData.examType || examData.type || 'Composition',
          titre: examData.examTitle || examData.titre || 'Examen'
        });
      }
    } catch (error) {
      console.error('Error loading exam info:', error);
      // Default to Composition type
      setExamInfo({
        type: 'Composition',
        titre: 'Composition'
      });
    }
  };

  // Préfiltrer par classe via query string (classeId) et récupérer le semestre de l'examen
  useEffect(() => {
    const cid = searchParams.get('classeId');
    const eleveId = searchParams.get('eleveId');
    if (cid) setSelectedClasseFilter(cid);

    // Si eleveId est fourni dans l'URL, sélectionner automatiquement cet élève
    if (eleveId && eleves.length > 0) {
      const eleve = eleves.find(e => e.id === eleveId);
      if (eleve) {
        setSelectedEleve(eleve);
      }
    } else if (cid && eleves.length > 0 && !selectedEleve) {
      // Si pas d'eleveId mais classeId fourni, on cherche les élèves de cette classe
      const elevesClasse = eleves.filter(e => {
        // Vérifier si l'élève appartient à cette classe
        const classeId = resolveClasseId(e.classe);
        return classeId === cid || e.classe === cid;
      });

      // Prendre le premier élève de la classe si aucun élève n'est sélectionné
      if (elevesClasse.length > 0) {
        setSelectedEleve(elevesClasse[0]);
      }
    }

    // Récupérer le semestre depuis sessionStorage (défini lors de la sélection de l'examen)
    const savedExamen = sessionStorage.getItem('current_examen_notes');
    if (savedExamen) {
      try {
        const examen = JSON.parse(savedExamen);
        // Utiliser directement la clé semestre qui contient 'semestre1' ou 'semestre2'
        if (examen.semestre) {
          setSelectedSemestre(examen.semestre);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération de l\'examen:', error);
      }
    }
  }, [searchParams, eleves, classes]);

  // Utilitaire: résout un identifiant de classe à partir d'une référence (id, libellé, ou "session libellé")
  const resolveClasseId = (classeRef: string): string | null => {
    if (!classeRef) return null;
    const classesData = getClassesData();
    const byId = classesData.find(c => c.id === classeRef);
    if (byId) return byId.id;
    const byFull = classesData.find(c => `${c.session} ${c.libelle}` === classeRef || `${c.libelle} ${c.session}` === classeRef || c.libelle === classeRef);
    return byFull?.id || null;
  };
  const getCurrentClasseIdForSelectedEleve = (): string => {
    if (!selectedEleve) return '';
    return resolveClasseId(selectedEleve.classe) ?? selectedEleve.classe;
  };
  useEffect(() => {
    if (selectedEleve) {
      const cid = getCurrentClasseIdForSelectedEleve();
      loadMatieresForEleve(cid);
    }
  }, [selectedEleve]);

  // Load notes AFTER matieres are loaded
  useEffect(() => {
    if (selectedEleve && matieres.length > 0) {
      const cid = getCurrentClasseIdForSelectedEleve();
      loadNotesForEleve(selectedEleve.id, cid);
    }
  }, [selectedEleve, matieres]);
  // Fonction utilitaire pour mapper les classes du hook vers le format attendu
  const getClassesData = (): Classe[] => {
    if (classes && classes.length > 0) {
      return classes.map(classe => ({
        id: classe.id,
        session: classe.academic_year_id || '',
        libelle: `${classe.name} ${classe.level}${classe.section ? ` - ${classe.section}` : ''}`,
        effectif: classe.enrollment_count || 0
      }));
    }
    return [];
  };

  const loadData = () => {
    // Mapping des élèves depuis useStudents
    if (students && students.length > 0) {
      const elevesData = students.map(student => ({
        id: student.id,
        nom: student.last_name,
        prenom: student.first_name,
        classe: student.classes?.name || ''
      }));
      setEleves(elevesData);
    }
  };
  const loadMatieresForEleve = (classeId: string) => {
    // Utiliser les matières depuis useSubjects
    if (subjects && subjects.length > 0) {
      const matieresWithCoeff = subjects.map(subject => ({
        id: subject.id,
        nom: subject.name,
        coefficient: subject.coefficient || 1,
        maxScore: subject.hours_per_week || 20, // Utiliser hours_per_week comme note maximale
        abbreviation: subject.abbreviation || subject.name.substring(0, 3).toUpperCase(),
        moyenne: (subject.hours_per_week || 20).toString() // Ajouter pour compatibilité
      }));
      setMatieres(matieresWithCoeff);
    }
  };
  const loadNotesForEleve = async (eleveId: string, classeIdForKey: string) => {
    const allNotes: {
      [key: string]: EleveNote[];
    } = {};

    // Charger les notes depuis la base de données
    const studentGrades = getGradesForStudent(eleveId);
    
    // Grouper les notes par matière
    const notesBySubject: { [subjectId: string]: EleveNote } = {};
    
    studentGrades.forEach(grade => {
      const subjectId = grade.subject_id;
      if (!notesBySubject[subjectId]) {
        notesBySubject[subjectId] = {
          eleveId: grade.student_id,
          matiereId: parseInt(subjectId),
          semestre1: { devoir: "", composition: "" },
          semestre2: { devoir: "", composition: "" },
          note: ""
        };
      }
      
      // Remplir les notes selon le type
      if (grade.semester && grade.exam_type) {
        if (grade.semester === 'semestre1') {
          if (grade.exam_type === 'devoir') {
            notesBySubject[subjectId].semestre1.devoir = grade.grade_value.toString();
          } else if (grade.exam_type === 'composition') {
            notesBySubject[subjectId].semestre1.composition = grade.grade_value.toString();
          }
        } else if (grade.semester === 'semestre2') {
          if (grade.exam_type === 'devoir') {
            notesBySubject[subjectId].semestre2.devoir = grade.grade_value.toString();
          } else if (grade.exam_type === 'composition') {
            notesBySubject[subjectId].semestre2.composition = grade.grade_value.toString();
          }
        }
      } else {
        // Note simple (sans semestre)
        notesBySubject[subjectId].note = grade.grade_value.toString();
      }
    });
    
    // Convertir en format attendu
    const notesKey = `notes_${classeIdForKey}_${eleveId}`;
    allNotes[notesKey] = Object.values(notesBySubject);
    
    console.log('Loaded notes from database for student', eleveId, ':', allNotes[notesKey]);
    setNotes(allNotes);
  };
  const handleNoteChange = async (matiereId: number, semestre: "semestre1" | "semestre2", type: "devoir" | "composition", value: string) => {
    if (!selectedEleve) return;

    // Validate input if matiere is available
    const matiere = matieres.find(m => m.id === matiereId);
    if (matiere && value !== "") {
      const maxScore = parseMaxScoreFromMoyenne(matiere.moyenne);
      const numValue = parseFloat(value);
      if (numValue > maxScore) {
        toast({
          title: "Erreur de saisie",
          description: `La note ne peut pas dépasser ${maxScore} pour ${matiere.nom}`,
          variant: "destructive",
          className: "animate-fade-in animate-scale-in"
        });
        return;
      }
    }

    // Sauvegarder dans la base de données
    if (value !== "" && matiere) {
      const examInfo = sessionStorage.getItem('current_examen_notes');
      let examId = undefined;
      let examType = type;
      
      if (examInfo) {
        try {
          const examData = JSON.parse(examInfo);
          examId = examData.activiteId;
        } catch (error) {
          console.error('Error parsing exam info:', error);
        }
      }

      await upsertGrade({
        student_id: selectedEleve.id,
        subject_id: matiereId.toString(),
        exam_id: examId,
        grade_value: parseFloat(value) || 0,
        max_grade: parseMaxScoreFromMoyenne(matiere.moyenne),
        coefficient: matiere.coefficient,
        semester: semestre,
        exam_type: examType
      });
    }
    
    const classeIdForKey = getCurrentClasseIdForSelectedEleve();
    
    // Check if we're in exam context to use correct key pattern
    const examInfo = sessionStorage.getItem('current_examen_notes');
    let notesKey = `notes_${classeIdForKey}_${matiereId}`;
    
    if (examInfo) {
      try {
        const examData = JSON.parse(examInfo);
        if (examData.activiteId) {
          notesKey = `notes_${classeIdForKey}_${examData.activiteId}`;
        }
      } catch (error) {
        console.error('Error parsing exam info for note change:', error);
      }
    }
    
    setNotes(prevNotes => {
      const currentNotes = prevNotes[notesKey] || [];
      const existingNoteIndex = currentNotes.findIndex(note => note.eleveId === selectedEleve.id);
      let updatedNotes;
      if (existingNoteIndex >= 0) {
        updatedNotes = [...currentNotes];
        updatedNotes[existingNoteIndex] = {
          ...updatedNotes[existingNoteIndex],
          [semestre]: {
            ...updatedNotes[existingNoteIndex][semestre],
            [type]: value
          }
        };
      } else {
        const newNote: EleveNote = {
          eleveId: selectedEleve.id,
          matiereId,
          semestre1: {
            devoir: "",
            composition: ""
          },
          semestre2: {
            devoir: "",
            composition: ""
          },
          note: ""
        };
        newNote[semestre][type] = value;
        updatedNotes = [...currentNotes, newNote];
      }
      return {
        ...prevNotes,
        [notesKey]: updatedNotes
      };
    });

    // Recalculate average
    calculateAndUpdateAverage();
  };

  // Handle single note change for non-composition exams
  const handleSingleNoteChange = async (matiereId: number, value: string) => {
    if (!selectedEleve) return;

    // Validate input if matiere is available
    const matiere = matieres.find(m => m.id === matiereId);
    if (matiere && value !== "") {
      const maxScore = parseMaxScoreFromMoyenne(matiere.moyenne);
      const numValue = parseFloat(value);
      if (numValue > maxScore) {
        toast({
          title: "Erreur de saisie",
          description: `La note ne peut pas dépasser ${maxScore} pour ${matiere.nom}`,
          variant: "destructive",
          className: "animate-fade-in animate-scale-in"
        });
        return;
      }
    }

    // Sauvegarder dans la base de données
    if (value !== "" && matiere) {
      const examInfo = sessionStorage.getItem('current_examen_notes');
      let examId = undefined;
      let examType = 'examen';
      
      if (examInfo) {
        try {
          const examData = JSON.parse(examInfo);
          examId = examData.activiteId;
          examType = examData.type || 'examen';
        } catch (error) {
          console.error('Error parsing exam info:', error);
        }
      }

      await upsertGrade({
        student_id: selectedEleve.id,
        subject_id: matiereId.toString(),
        exam_id: examId,
        grade_value: parseFloat(value) || 0,
        max_grade: parseMaxScoreFromMoyenne(matiere.moyenne),
        coefficient: matiere.coefficient,
        exam_type: examType
      });
    }
    
    const classeIdForKey = getCurrentClasseIdForSelectedEleve();
    
    // Check if we're in exam context to use correct key pattern
    const examInfo = sessionStorage.getItem('current_examen_notes');
    let notesKey = `notes_${classeIdForKey}_${matiereId}`;
    
    if (examInfo) {
      try {
        const examData = JSON.parse(examInfo);
        if (examData.activiteId) {
          notesKey = `notes_${classeIdForKey}_${examData.activiteId}`;
        }
      } catch (error) {
        console.error('Error parsing exam info for single note change:', error);
      }
    }
    
    setNotes(prevNotes => {
      const currentNotes = prevNotes[notesKey] || [];
      const existingNoteIndex = currentNotes.findIndex(note => note.eleveId === selectedEleve.id);
      let updatedNotes;
      if (existingNoteIndex >= 0) {
        updatedNotes = [...currentNotes];
        updatedNotes[existingNoteIndex] = {
          ...updatedNotes[existingNoteIndex],
          note: value
        };
      } else {
        const newNote: EleveNote = {
          eleveId: selectedEleve.id,
          matiereId,
          semestre1: {
            devoir: "",
            composition: ""
          },
          semestre2: {
            devoir: "",
            composition: ""
          },
          note: value
        };
        updatedNotes = [...currentNotes, newNote];
      }
      return {
        ...prevNotes,
        [notesKey]: updatedNotes
      };
    });
  };
  const calculateAndUpdateAverage = () => {
    if (!selectedEleve || matieres.length === 0) {
      setSemesterAverage(0);
      return;
    }
    const classeIdForKey = getCurrentClasseIdForSelectedEleve();
    const semesterNotes: {
      [matiereId: number]: {
        devoir: number;
        composition: number;
      };
    } = {};
    matieres.forEach(matiere => {
      const notesKey = `notes_${classeIdForKey}_${matiere.id}`;
      const notesForMatiere = notes[notesKey] || [];
      const eleveNote = notesForMatiere.find(note => note.eleveId === selectedEleve.id);
      if (eleveNote) {
        const semestre = selectedSemestre;
        semesterNotes[matiere.id] = {
          devoir: parseFloat(eleveNote[semestre].devoir) || 0,
          composition: parseFloat(eleveNote[semestre].composition) || 0
        };
      }
    });
    const average = calculateSemesterAverage(semesterNotes, matieres);
    setSemesterAverage(average.weighted);
  };

  // Update average when notes, selected student, or semester changes
  useEffect(() => {
    calculateAndUpdateAverage();
  }, [notes, selectedEleve, selectedSemestre, matieres]);
  const saveNotesForMatiere = (matiereId: number) => {
    if (!selectedEleve) return;
    
    const classeIdForKey = getCurrentClasseIdForSelectedEleve();
    
    // Check if we're in exam context to use correct key pattern
    const examInfo = sessionStorage.getItem('current_examen_notes');
    let notesKey = `notes_${classeIdForKey}_${matiereId}`;
    
    if (examInfo) {
      try {
        const examData = JSON.parse(examInfo);
        if (examData.activiteId) {
          notesKey = `notes_${classeIdForKey}_${examData.activiteId}`;
        }
      } catch (error) {
        console.error('Error parsing exam info for save:', error);
      }
    }
    
    const notesToSave = notes[notesKey] || [];
    try {
      // Remplacé par hooks Supabase);
      toast({
        title: "Succès",
        description: "Notes sauvegardées avec succès",
        className: "animate-fade-in animate-scale-in"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la sauvegarde des notes",
        variant: "destructive",
        className: "animate-fade-in animate-scale-in"
      });
    }
  };
  const saveAllNotes = () => {
    if (!selectedEleve) return;
    
    const classeIdForKey = getCurrentClasseIdForSelectedEleve();
    
    // Check if we're in exam context to use correct key pattern
    const examInfo = sessionStorage.getItem('current_examen_notes');
    let isExamContext = false;
    let activiteId = '';
    
    if (examInfo) {
      try {
        const examData = JSON.parse(examInfo);
        if (examData.activiteId) {
          isExamContext = true;
          activiteId = examData.activiteId;
        }
      } catch (error) {
        console.error('Error parsing exam info for save all:', error);
      }
    }
    
    try {
      if (isExamContext) {
        // Save notes for exam context (single key)
        const notesKey = `notes_${classeIdForKey}_${activiteId}`;
        const notesToSave = notes[notesKey] || [];
        // Remplacé par hooks Supabase); } else {
        // Save notes for each matiere
        matieres.forEach(m => {
          const notesKey = `notes_${classeIdForKey}_${m.id}`;
          const notesToSave = notes[notesKey] || [];
          // Remplacé par hooks Supabase);
        });
      }
      
      toast({
        title: "Succès",
        description: "Toutes les notes ont été sauvegardées",
        className: "animate-fade-in animate-scale-in"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la sauvegarde",
        variant: "destructive",
        className: "animate-fade-in animate-scale-in"
      });
    }
  };
  const getEleveNoteForMatiere = (matiereId: number): EleveNote => {
    if (!selectedEleve) {
      return {
        eleveId: "",
        matiereId,
        semestre1: {
          devoir: "",
          composition: ""
        },
        semestre2: {
          devoir: "",
          composition: ""
        },
        note: ""
      };
    }
    
    const classeIdForKey = getCurrentClasseIdForSelectedEleve();
    
    // Check if we're in exam context to use correct key pattern
    const examInfo = sessionStorage.getItem('current_examen_notes');
    let notesKey = `notes_${classeIdForKey}_${matiereId}`;
    
    if (examInfo) {
      try {
        const examData = JSON.parse(examInfo);
        if (examData.activiteId) {
          notesKey = `notes_${classeIdForKey}_${examData.activiteId}`;
        }
      } catch (error) {
        console.error('Error parsing exam info for get note:', error);
      }
    }
    
    const notesForMatiere = notes[notesKey] || [];
    return notesForMatiere.find(note => note.eleveId === selectedEleve.id) || {
      eleveId: selectedEleve.id,
      matiereId,
      semestre1: {
        devoir: "",
        composition: ""
      },
      semestre2: {
        devoir: "",
        composition: ""
      },
      note: ""
    };
  };
  const getClasseById = (classeId: string) => {
    const classesData = getClassesData();
    return classesData.find(c => c.id === classeId);
  };
  const filteredEleves = eleves.filter(eleve => {
    const matchesSearch = eleve.nom.toLowerCase().includes(searchTerm.toLowerCase()) || eleve.prenom.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClasse = selectedClasseFilter === "all" || eleve.classe === selectedClasseFilter || resolveClasseId(eleve.classe) === selectedClasseFilter;
    return matchesSearch && matchesClasse;
  });

  // État de chargement
  if (classesLoading || studentsLoading || subjectsLoading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Chargement des données...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return <Layout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux Classes
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {selectedEleve ? `Notes de ${selectedEleve.prenom} ${selectedEleve.nom}` : "Notes par Élève"}
              </h1>
              <p className="text-gray-600">
                {selectedEleve ? `Classe: ${getClasseById(getCurrentClasseIdForSelectedEleve())?.libelle} - Session: ${getClasseById(getCurrentClasseIdForSelectedEleve())?.session}` : "Consultez et modifiez les notes de chaque élève individuellement"}
              </p>
            </div>
          </div>
          {selectedEleve && matieres.length > 0 && <div className="flex items-center gap-2">
              <Button onClick={() => setIsEditMode(!isEditMode)} size="sm" variant="outline">
                <Edit3 className="h-4 w-4 mr-2" />
                {isEditMode ? "Désactiver" : "Modifier"}
              </Button>
              <Button onClick={saveAllNotes} size="sm" variant="default">
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder toutes les notes
              </Button>
              {semesterAverage > 0}
            </div>}
        </div>

        {/* Interface de notation pour l'élève sélectionné */}
        <div className="space-y-6">
          {selectedEleve ? <>
              {/* Tableau des matières et notes */}
              <Card>
                <CardContent className="pt-6">
                  <div className="overflow-x-auto">
                    <Table className="min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead rowSpan={2} className="text-center align-middle font-bold">N°</TableHead>
                          <TableHead rowSpan={2} className="text-center align-middle font-bold">Matière</TableHead>
                          {examInfo?.type === 'Composition' ? <TableHead colSpan={2} className="text-center font-bold">
                              {selectedSemestre === "semestre1" ? isTrimestreSystem ? "1er Trimestre" : "1er Semestre" : isTrimestreSystem ? "2e Trimestre" : "2e Semestre"}
                            </TableHead> : <TableHead className="text-center font-bold">
                              {examInfo?.titre || 'Note'}
                            </TableHead>}
                        </TableRow>
                        {examInfo?.type === 'Composition' && <TableRow>
                            <TableHead className="text-center font-medium">Devoir</TableHead>
                            <TableHead className="text-center font-medium">Composition</TableHead>
                          </TableRow>}
                      </TableHeader>
                      <TableBody>
                        {matieres.map((matiere, index) => {
                      const eleveNote = getEleveNoteForMatiere(matiere.id);
                      return <TableRow key={matiere.id} className="hover:bg-gray-50">
                              <TableCell className="text-center font-medium">{index + 1}</TableCell>
                              <TableCell className="font-medium">
                                <div className="flex flex-col">
                                  <span>{matiere.nom}</span>
                                  <div className="flex gap-2 text-xs text-gray-500 mt-1">
                                    <span>Coeff: {matiere.coefficient}</span>
                                    <span>Barème: /{matiere.maxScore}</span>
                                  </div>
                                </div>
                              </TableCell>
                              {examInfo?.type === 'Composition' ? <>
                                  <TableCell className="text-center">
                                    <GradeInput maxScore={parseMaxScoreFromMoyenne(matiere.moyenne)} value={eleveNote[selectedSemestre].devoir || "0"} onChange={value => handleNoteChange(matiere.id, selectedSemestre, "devoir", value)} disabled={!isEditMode} className="w-16 text-center mx-auto" />
                                  </TableCell>
                                   <TableCell className="text-center">
                                     <GradeInput maxScore={parseMaxScoreFromMoyenne(matiere.moyenne)} value={eleveNote[selectedSemestre].composition || "0"} onChange={value => handleNoteChange(matiere.id, selectedSemestre, "composition", value)} disabled={!isEditMode} className="w-16 text-center mx-auto" />
                                   </TableCell>
                                </> : <TableCell className="text-center">
                                  <GradeInput maxScore={parseMaxScoreFromMoyenne(matiere.moyenne)} value={eleveNote.note || "0"} onChange={value => handleSingleNoteChange(matiere.id, value)} disabled={!isEditMode} className="w-16 text-center mx-auto" />
                                </TableCell>}
                            </TableRow>;
                    })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {matieres.length === 0 && <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-gray-500">
                      Aucune matière trouvée pour cette classe.
                    </p>
                  </CardContent>
                </Card>}
            </> : <Card>
              <CardHeader>
                <CardTitle className="text-center">Sélectionner un Élève</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative w-full max-w-md mx-auto">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input placeholder="Rechercher un élève..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                  </div>
                  
                  {filteredEleves.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                      {filteredEleves.map(eleve => <Card key={eleve.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedEleve(eleve)}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                              <User className="h-5 w-5 text-blue-600" />
                              <div>
                                <p className="font-medium">{eleve.prenom} {eleve.nom}</p>
                                <p className="text-sm text-gray-500">{eleve.classe}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>)}
                    </div> : <div className="text-center py-8">
                      <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">
                        {searchTerm ? "Aucun élève trouvé pour cette recherche." : "Aucun élève trouvé pour cette classe."}
                      </p>
                    </div>}
                </div>
              </CardContent>
            </Card>}
        </div>
      </div>
    </Layout>;
}