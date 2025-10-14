import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, BookOpen, Users, Save, Edit3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useClasses } from "@/hooks/useClasses";
import { useStudents } from "@/hooks/useStudents";
import { useSubjects } from "@/hooks/useSubjects";
import { useExams } from "@/hooks/useExams";
import { useNotesSync, UnifiedNote } from "@/hooks/useNotesSync";
import { formatClassName } from "@/utils/classNameFormatter";
import { ConfirmDeleteNotesDialog } from "@/components/notes/ConfirmDeleteNotesDialog";
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
interface Matiere {
  id: string;
  nom: string;
  abreviation?: string;
  horaires: string;
  classeId: string;
  coefficient: number;
  maxScore: number;
}
export default function ConsulterNotes() {
  const [classe, setClasse] = useState<Classe | null>(null);
  const [matiere, setMatiere] = useState<Matiere | null>(null);
  const [eleves, setEleves] = useState<Student[]>([]);
  const [isEditMode, setIsEditMode] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentExam, setCurrentExam] = useState<any>(null);
  const [isComposition, setIsComposition] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState<{ deleteCount: number } | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    toast
  } = useToast();
  const classeId = searchParams.get('classeId');
  const matiereId = searchParams.get('matiereId');
  const examId = searchParams.get('examId');

  // Hooks pour récupérer les données depuis la base
  const {
    classes,
    loading: classesLoading
  } = useClasses();
  const {
    students,
    loading: studentsLoading
  } = useStudents();
  const {
    subjects,
    loading: subjectsLoading
  } = useSubjects(classeId || '');
  const {
    exams,
    loading: examsLoading
  } = useExams();

  // Hook de synchronisation des notes - CENTRALISÉ
  // RÉCUPÉRER L'EXAMID DEPUIS SESSIONSTORAGE SI MANQUANT
  const getExamIdFromStorage = () => {
    try {
      const savedExamInfo = sessionStorage.getItem('current_examen_notes');
      if (savedExamInfo) {
        const examData = JSON.parse(savedExamInfo);
        return examData.examId;
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'examId:', error);
    }
    return null;
  };

  const finalExamId = examId || getExamIdFromStorage();

  const {
    localNotes,
    hasUnsavedChanges,
    getNote,
    updateNote,
    saveAllNotes,
    refreshNotes
  } = useNotesSync({
    classeId: classeId || undefined,
    matiereId: matiereId || undefined,
    examId: finalExamId, // Utiliser l'examId depuis URL ou sessionStorage
    isComposition: isComposition
  });
  useEffect(() => {
    if (classeId && classes.length > 0) {
      const classeFound = classes.find(c => c.id === classeId);
      if (classeFound) {
        setClasse({
          id: classeFound.id,
          session: classeFound.academic_year_id || '',
          libelle: formatClassName(classeFound),
          effectif: classeFound.enrollment_count || 0
        });
      }
    }
  }, [classeId, classes]);
  useEffect(() => {
    if (matiereId && subjects.length > 0) {
      const matiereFound = subjects.find(s => s.id === matiereId);
      if (matiereFound) {
        setMatiere({
          id: matiereFound.id,
          nom: matiereFound.name,
          abreviation: matiereFound.abbreviation || '',
          horaires: '1h/sem',
          classeId: matiereFound.class_id,
          coefficient: matiereFound.coefficient || 1,
          maxScore: matiereFound.hours_per_week || 20
        });
      }
    }
  }, [matiereId, subjects]);

  // Détecter le type d'examen depuis sessionStorage - LOGIQUE UNIFIÉE
  useEffect(() => {
    try {
      const savedExamInfo = sessionStorage.getItem('current_examen_notes');
      if (savedExamInfo) {
        const examData = JSON.parse(savedExamInfo);
        const examTitle = examData.examTitle || examData.titre || 'Examen';
        // Règle unifiée : détection par le nom de l'examen
        const isCompositionExam = examTitle.toLowerCase().includes('composition');
        setIsComposition(isCompositionExam);
        setCurrentExam({
          ...examData,
          title: examTitle
        });
        console.log('ConsulterNotes: Type d\'examen détecté:', examTitle, 'isComposition:', isCompositionExam);
      } else {
        setIsComposition(false);
        console.log('ConsulterNotes: Nouvel examen, mode examen simple');
      }
    } catch (error) {
      console.error('ConsulterNotes: Erreur détection type examen:', error);
      setIsComposition(false);
    }
  }, []);
  useEffect(() => {
    if (classeId && students.length > 0) {
      const elevesForClasse = students.filter(student => student.class_id === classeId).map(student => ({
        id: student.id,
        nom: student.last_name,
        prenom: student.first_name,
        classe: classe?.libelle || ''
      }));
      setEleves(elevesForClasse);
    }
  }, [classeId, students, classe]);
  const handleNoteChange = (eleveId: string, value: string, type: 'note' | 'devoir' | 'composition' = 'note') => {
    // Validation de la note
    if (value && matiere) {
      const noteValue = parseFloat(value);
      if (noteValue > matiere.maxScore) {
        toast({
          title: "Note invalide",
          description: `La note ne peut pas dépasser ${matiere.maxScore} pour cette matière.`,
          variant: "destructive"
        });
        return;
      }
    }

    // Utiliser le système de synchronisation centralisé
    const updates: Partial<UnifiedNote> = {
      coefficient: matiere?.coefficient || 1,
      [type]: value
    };
    updateNote(eleveId, matiere?.id || '', updates);
  };
  const handleSaveNotes = async () => {
    if (!matiere) {
      toast({
        title: "Erreur",
        description: "Aucune matière sélectionnée.",
        variant: "destructive"
      });
      return;
    }
    
    console.log('ConsulterNotes: Début de la sauvegarde des notes');
    
    try {
      const result = await saveAllNotes();
      
      // Si la sauvegarde nécessite une confirmation de suppression
      if (result && 'needsConfirmation' in result && result.needsConfirmation) {
        setPendingDeletion({ deleteCount: result.deleteCount });
        setShowDeleteConfirm(true);
        return;
      }
      
      // Si sauvegarde réussie
      if (result && 'success' in result) {
        console.log('ConsulterNotes: Notes sauvegardées avec succès');
        setIsEditMode(false);
      }
    } catch (error) {
      console.error('ConsulterNotes: Erreur lors de la sauvegarde des notes:', error);
      toast({
        title: "Erreur de sauvegarde",
        description: "Une erreur est survenue lors de la sauvegarde des notes.",
        variant: "destructive"
      });
    }
  };

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false);
    
    try {
      // Sauvegarder en skippant la confirmation
      await saveAllNotes(true);
      console.log('ConsulterNotes: Notes sauvegardées avec suppressions confirmées');
      setIsEditMode(false);
      setPendingDeletion(null);
    } catch (error) {
      console.error('ConsulterNotes: Erreur lors de la sauvegarde avec suppression:', error);
      toast({
        title: "Erreur de sauvegarde",
        description: "Une erreur est survenue lors de la sauvegarde des notes.",
        variant: "destructive"
      });
    }
  };
  const elevesFiltered = eleves.filter(eleve => `${eleve.prenom} ${eleve.nom}`.toLowerCase().includes(searchTerm.toLowerCase()));

  // État de chargement
  if (classesLoading || studentsLoading || subjectsLoading) {
    return <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Chargement des données...</p>
            </div>
          </div>
        </div>
      </Layout>;
  }
  if (!classe) {
    return <Layout>
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Classe non trouvée.</p>
            <Button onClick={() => navigate(-1)} className="mt-4">
              Retour
            </Button>
          </div>
        </div>
      </Layout>;
  }

  // Si aucune matière n'est sélectionnée, afficher la sélection de matière
  if (!matiere) {
    return <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Consulter les Notes
                </h1>
                <p className="text-muted-foreground">
                  {classe.libelle}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-muted-foreground mb-4">
              Sélectionnez une matière pour consulter et saisir les notes des élèves.
            </p>
          </div>

          <div className="space-y-2">
            {subjects.map(subject => <div key={subject.id} className="flex items-center justify-between p-4 bg-card rounded-lg border hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4 flex-1">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <div className="flex items-center gap-6 flex-1">
                    <h3 className="font-semibold text-base min-w-[200px]">{subject.name}</h3>
                    <span className="text-sm text-muted-foreground">
                      {subject.hours_per_week ? `${subject.hours_per_week}h/sem` : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="default" size="sm" onClick={() => navigate(`/notes/consulter?classeId=${classeId}&matiereId=${subject.id}`)}>
                    Consulter les Notes
                  </Button>
                </div>
              </div>)}
          </div>

          {subjects.length === 0 && <div className="text-center py-12">
              <p className="text-muted-foreground">Aucune matière disponible pour cette classe.</p>
            </div>}
        </div>
      </Layout>;
  }
  return <Layout>
      <div className="container mx-auto p-6">
        {/* Dialog de confirmation de suppression */}
        <ConfirmDeleteNotesDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          onConfirm={handleConfirmDelete}
          deleteCount={pendingDeletion?.deleteCount || 0}
        />

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Consulter les Notes
              </h1>
              <p className="text-muted-foreground">
                {classe.libelle} - {matiere.nom}
                {currentExam && ` - ${currentExam.title}`}
                {currentExam?.semester && ` - ${currentExam.semester}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!isEditMode ? <Button onClick={() => setIsEditMode(true)} variant="default" size="sm">
                <Edit3 className="h-4 w-4 mr-2" />
                Modifier les Notes
              </Button> : <Button onClick={handleSaveNotes} variant="default" size="sm" className="bg-green-600 hover:bg-green-700" disabled={!hasUnsavedChanges}>
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder
              </Button>}
          </div>
        </div>

        {/* Informations de la matière */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {matiere.nom}
              {isComposition && currentExam?.semester && (
                <span className="text-sm text-muted-foreground">
                  (Composition - {currentExam.semester})
                </span>
              )}
              {isComposition && !currentExam?.semester && (
                <span className="text-sm text-muted-foreground">(Composition)</span>
              )}
              {!isComposition && (
                <span className="text-sm text-muted-foreground">
                  ({currentExam?.title || 'Examen'})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Classe:</span> {classe.libelle}
              </div>
              <div>
                <span className="font-medium">Effectif:</span> {classe.effectif} élèves
              </div>
              
            </div>
          </CardContent>
        </Card>

        {/* Recherche d'élèves */}
        <div className="mb-4">
          <Input placeholder="Rechercher un élève..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="max-w-sm" />
        </div>

        {/* Tableau des notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Notes des élèves ({elevesFiltered.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Matricule</TableHead>
                  <TableHead>Prénom & Nom</TableHead>
                  {isComposition ? <>
                      <TableHead className="text-center">Devoir /{matiere.maxScore}</TableHead>
                      <TableHead className="text-center">Composition /{matiere.maxScore}</TableHead>
                    </> : <TableHead className="text-center">{currentExam?.title || 'Note'} /{matiere.maxScore}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {elevesFiltered.map((eleve, index) => {
                const noteData = getNote(eleve.id, matiere.id);
                const studentDetails = students.find(s => s.id === eleve.id);
                console.log('ConsulterNotes: Rendu note pour', eleve.prenom, eleve.nom, ':', noteData);
                return <TableRow key={eleve.id}>
                      <TableCell className="font-mono text-sm">{studentDetails?.student_number || '-'}</TableCell>
                      <TableCell className="font-medium">{eleve.prenom} {eleve.nom}</TableCell>
                      {isComposition ? <>
                          <TableCell className="text-center">
                            <Input type="number" min="0" max={matiere.maxScore} step="0.25" value={noteData?.devoir || ''} onChange={e => handleNoteChange(eleve.id, e.target.value, 'devoir')} disabled={!isEditMode} className="w-20 text-center" placeholder="" />
                          </TableCell>
                          <TableCell className="text-center">
                            <Input type="number" min="0" max={matiere.maxScore} step="0.25" value={noteData?.composition || ''} onChange={e => handleNoteChange(eleve.id, e.target.value, 'composition')} disabled={!isEditMode} className="w-20 text-center" placeholder="" />
                          </TableCell>
                        </> : <TableCell className="text-center">
                          <Input type="number" min="0" max={matiere.maxScore} step="0.25" value={noteData?.note || ''} onChange={e => handleNoteChange(eleve.id, e.target.value, 'note')} disabled={!isEditMode} className="w-20 text-center" placeholder="" />
                        </TableCell>}
                    </TableRow>;
              })}
              </TableBody>
            </Table>
            
            {elevesFiltered.length === 0 && <div className="text-center py-8">
                <p className="text-muted-foreground">Aucun élève trouvé.</p>
              </div>}
          </CardContent>
        </Card>
      </div>
    </Layout>;
}