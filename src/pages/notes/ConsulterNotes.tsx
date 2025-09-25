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
import { useGrades } from "@/hooks/useGrades";
import { useExams } from "@/hooks/useExams";
import { useNotesSync } from "@/hooks/useNotesSync";

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

interface Note {
  eleveId: string;
  matiereId: string;
  note: string;
  coefficient: number;
  devoir?: string;
  composition?: string;
}

export default function ConsulterNotes() {
  const [classe, setClasse] = useState<Classe | null>(null);
  const [matiere, setMatiere] = useState<Matiere | null>(null);
  const [eleves, setEleves] = useState<Student[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isEditMode, setIsEditMode] = useState(true); // Mode édition activé par défaut
  const [searchTerm, setSearchTerm] = useState("");
  const [currentExam, setCurrentExam] = useState<any>(null);
  const [isComposition, setIsComposition] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const classeId = searchParams.get('classeId');
  const matiereId = searchParams.get('matiereId');
  const examId = searchParams.get('examId');

  // Hooks pour récupérer les données depuis la base
  const { classes, loading: classesLoading } = useClasses();
  const { students, loading: studentsLoading } = useStudents();
  const { subjects, loading: subjectsLoading } = useSubjects(classeId || '');
  const { grades, upsertGrade, getGradeForStudent, refetch: refetchGrades } = useGrades(undefined, matiereId || undefined, examId || undefined);
  
  // Hook de synchronisation des notes
  const {
    localNotes,
    hasUnsavedChanges: syncHasUnsavedChanges,
    getNote,
    getNotesForStudent,
    updateNote,
    saveAllNotes: syncSaveAllNotes,
    refreshNotes
  } = useNotesSync({
    classeId: classeId || undefined,
    matiereId: matiereId || undefined,
    examId: examId || undefined,
    isComposition: isComposition
  });
  const { exams, loading: examsLoading } = useExams();
  

  useEffect(() => {
    if (classeId && classes.length > 0) {
      // Récupérer les informations de la classe
      const classeFound = classes.find(c => c.id === classeId);
      if (classeFound) {
        setClasse({
          id: classeFound.id,
          session: classeFound.academic_year_id || '',
          libelle: `${classeFound.name} ${classeFound.level}${classeFound.section ? ` - ${classeFound.section}` : ''}`,
          effectif: classeFound.enrollment_count || 0
        });
      }
    }
  }, [classeId, classes]);

  useEffect(() => {
    if (matiereId && subjects.length > 0) {
      // Récupérer les informations de la matière
      const matiereFound = subjects.find(s => s.id === matiereId);
      if (matiereFound) {
        setMatiere({
          id: matiereFound.id,
          nom: matiereFound.name,
          abreviation: matiereFound.abbreviation || '',
          horaires: '1h/sem', // Valeur fixe pour l'affichage
          classeId: matiereFound.class_id,
          coefficient: matiereFound.coefficient || 1,
          maxScore: matiereFound.hours_per_week || 20 // Utiliser hours_per_week comme note maximale
        });
      }
    }
  }, [matiereId, subjects]);

  // Détecter le type d'examen si un examId est fourni
  useEffect(() => {
    console.log('ConsulterNotes: Détection du type d\'examen', { examId, examsCount: exams.length, classeId });
    
    if (examId && exams.length > 0) {
      const examFound = exams.find(e => e.id === examId);
      console.log('ConsulterNotes: Examen trouvé:', examFound);
      
      if (examFound) {
        setCurrentExam(examFound);
        // Détecter si c'est une composition basée sur le nom de l'examen
        const isCompositionExam = examFound.title.toLowerCase().includes('composition') || 
                                 examFound.title.toLowerCase().includes('première composition') ||
                                 examFound.title.toLowerCase().includes('deuxième composition');
        setIsComposition(isCompositionExam);
        console.log('ConsulterNotes: Détection d\'examen spécifique:', examFound.title, 'isComposition:', isCompositionExam);
      } else {
        console.log('ConsulterNotes: Examen non trouvé avec ID:', examId);
        setIsComposition(false);
      }
    } else {
      // Si pas d'examen spécifique, mode examen simple par défaut
      setIsComposition(false);
      console.log('ConsulterNotes: Aucun examen spécifique, mode examen simple par défaut');
    }
  }, [examId, exams, classeId]);

  useEffect(() => {
    if (classeId && students.length > 0) {
      // Récupérer les élèves de cette classe
      const elevesForClasse = students
        .filter(student => student.class_id === classeId)
        .map(student => ({
          id: student.id,
          nom: student.last_name,
          prenom: student.first_name,
          classe: classe?.libelle || ''
        }));
      setEleves(elevesForClasse);
    }
  }, [classeId, students, classe]);

  // Charger les notes quand les données nécessaires sont disponibles
  useEffect(() => {
    if (matiere && eleves.length > 0) {
      loadNotesFromDatabase();
    }
  }, [matiere, eleves, isComposition, localNotes]);

  const loadNotesFromDatabase = () => {
    if (!matiere || !eleves.length) {
      console.log('loadNotesFromDatabase: Données manquantes', {
        matiere: !!matiere,
        eleves: eleves.length
      });
      return;
    }

    console.log('loadNotesFromDatabase: Chargement des notes depuis la synchronisation', {
      matiere: matiere.nom,
      matiereId: matiere.id,
      elevesCount: eleves.length,
      localNotesCount: localNotes.length,
      isComposition,
      examId
    });

    // Si c'est un nouvel examen (pas d'exam_id), créer des notes vides
    if (!examId) {
      console.log('loadNotesFromDatabase: Nouvel examen détecté, création de notes vides');
      const emptyNotes: Note[] = eleves.map(eleve => ({
        eleveId: eleve.id,
        matiereId: matiere.id,
        note: '',
        coefficient: matiere.coefficient || 1,
        devoir: isComposition ? '' : undefined,
        composition: isComposition ? '' : undefined
      }));
      
      console.log('loadNotesFromDatabase: Notes vides créées:', emptyNotes);
      setNotes(emptyNotes);
      return;
    }

    // Utiliser le système de synchronisation pour les examens existants
    const notesFromSync = localNotes.filter(note => note.matiereId === matiere.id);
    console.log('loadNotesFromDatabase: Notes depuis la synchronisation:', notesFromSync);

    const notesFromDB: Note[] = [];
    
    eleves.forEach(eleve => {
      // Chercher la note dans les données synchronisées
      const syncNote = notesFromSync.find(n => n.eleveId === eleve.id);
      
      // Créer une note pour cet élève (vide ou avec les données existantes)
      const note: Note = {
        eleveId: eleve.id,
        matiereId: matiere.id,
        note: syncNote?.note || '',
        coefficient: matiere.coefficient || 1,
        devoir: isComposition ? (syncNote?.devoir || '') : undefined,
        composition: isComposition ? (syncNote?.composition || '') : undefined
      };
      
      console.log(`loadNotesFromDatabase: Note pour ${eleve.prenom} ${eleve.nom}:`, note);
      notesFromDB.push(note);
    });
    
    console.log('loadNotesFromDatabase: Notes finales chargées:', notesFromDB);
    setNotes(notesFromDB);
  };

  const handleNoteChange = (eleveId: string, value: string, type: 'note' | 'devoir' | 'composition' = 'note') => {
    // Valider la note selon le barème de la matière
    if (value && matiere) {
      const noteValue = parseFloat(value);
      if (noteValue > matiere.maxScore) {
        toast({
          title: "Note invalide",
          description: `La note ne peut pas dépasser ${matiere.maxScore} pour cette matière.`,
          variant: "destructive",
        });
        return;
      }
    }

    // Utiliser le système de synchronisation
    const updates: any = { [type]: value };
    updateNote(eleveId, matiere?.id || '', updates);

    // Mettre à jour l'état local pour l'affichage immédiat
    setNotes(prevNotes => {
      const existingNoteIndex = prevNotes.findIndex(note => note.eleveId === eleveId);
      
      if (existingNoteIndex >= 0) {
        const updatedNotes = [...prevNotes];
        if (type === 'note') {
          updatedNotes[existingNoteIndex] = {
            ...updatedNotes[existingNoteIndex],
            note: value,
            coefficient: matiere?.coefficient || 1
          };
        } else if (type === 'devoir') {
          updatedNotes[existingNoteIndex] = {
            ...updatedNotes[existingNoteIndex],
            devoir: value,
            coefficient: matiere?.coefficient || 1
          };
        } else if (type === 'composition') {
          updatedNotes[existingNoteIndex] = {
            ...updatedNotes[existingNoteIndex],
            composition: value,
            coefficient: matiere?.coefficient || 1
          };
        }
        return updatedNotes;
      } else {
        const newNote: Note = {
          eleveId,
          matiereId: matiereId || '',
          note: type === 'note' ? value : '',
          devoir: type === 'devoir' ? value : (isComposition ? '' : undefined),
          composition: type === 'composition' ? value : (isComposition ? '' : undefined),
          coefficient: matiere?.coefficient || 1
        };
        return [...prevNotes, newNote];
      }
    });
  };

  const handleSaveNotes = async () => {
    if (!matiere) {
      toast({
        title: "Erreur",
        description: "Aucune matière sélectionnée.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Utiliser le système de synchronisation pour sauvegarder
      await syncSaveAllNotes();

      toast({
        title: "Notes sauvegardées",
        description: "Les notes ont été sauvegardées avec succès dans la base de données.",
      });

      setIsEditMode(false);
      setHasUnsavedChanges(false);
      
      // Recharger les notes depuis la base de données
      await refetchGrades();
      loadNotesFromDatabase();
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des notes:', error);
      toast({
        title: "Erreur de sauvegarde",
        description: "Une erreur est survenue lors de la sauvegarde des notes.",
        variant: "destructive",
      });
    }
  };

  const elevesFiltered = eleves.filter(eleve =>
    `${eleve.prenom} ${eleve.nom}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  if (!classe) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <p className="text-gray-500">Classe non trouvée.</p>
            <Button onClick={() => navigate(-1)} className="mt-4">
              Retour
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // Si aucune matière n'est sélectionnée, afficher la sélection de matière
  if (!matiere) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Consulter les Notes
                </h1>
                <p className="text-gray-600">
                  {classe.libelle}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              Sélectionnez une matière pour consulter et saisir les notes des élèves.
            </p>
          </div>

          <div className="space-y-2">
            {subjects.map((subject) => (
              <div key={subject.id} className="flex items-center justify-between p-4 bg-card rounded-lg border hover:bg-muted/50 transition-colors">
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
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => navigate(`/notes/consulter?classeId=${classeId}&matiereId=${subject.id}`)}
                  >
                    Consulter les Notes
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {subjects.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Aucune matière disponible pour cette classe.</p>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Consulter les Notes
              </h1>
              <p className="text-gray-600">
                {classe.libelle} - {matiere.nom}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!isEditMode ? (
            <Button
                onClick={() => setIsEditMode(true)}
                variant="default"
                size="sm"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Modifier les Notes
            </Button>
            ) : (
              <Button
                onClick={handleSaveNotes}
                variant="default"
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                disabled={!syncHasUnsavedChanges}
              >
              <Save className="h-4 w-4 mr-2" />
                Sauvegarder
            </Button>
            )}
          </div>
        </div>

        {/* Informations de la matière */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {matiere.nom}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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
        <div className="mb-6">
          <div className="relative w-full max-w-md">
            <Input
              placeholder="Rechercher un élève..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          </div>
        </div>

        {/* Tableau des notes */}
        <Card>
          <CardHeader>
            <CardTitle>
              {currentExam ? `Saisie des Notes - ${currentExam.title}` : (isComposition ? 'Saisie des Notes - Composition' : 'Notes des élèves')}
            </CardTitle>
            {/* Debug info */}
            <div className="text-xs text-gray-500 mt-2">
              Debug: isComposition = {isComposition.toString()}, currentExam = {currentExam ? currentExam.title : 'null'}, examId = {examId || 'null'}
            </div>
            {isComposition && (
              <p className="text-sm text-muted-foreground">
                Saisissez les notes de chaque élève pour la matière {matiere?.nom} (sur {matiere?.maxScore || 20}). 
            Les modifications sont automatiquement prises en compte.
              </p>
            )}
          </CardHeader>
          <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Nom & Prénom</TableHead>
                  {isComposition ? (
                    <>
                      <TableHead className="w-32 text-center">Devoir</TableHead>
                      <TableHead className="w-32 text-center">Composition</TableHead>
                      <TableHead className="w-20 text-center">Coeff.</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="w-32 text-center">{currentExam ? currentExam.title : 'Note'}</TableHead>
                      <TableHead className="w-20 text-center">Coeff.</TableHead>
                    </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
                {elevesFiltered.map((eleve, index) => {
                  const note = notes.find(n => n.eleveId === eleve.id);
                return (
                  <TableRow key={eleve.id}>
                      <TableCell className="text-center font-medium">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {eleve.prenom} {eleve.nom}
                      </TableCell>
                      {isComposition ? (
                      <>
                        <TableCell className="text-center">
                          {isEditMode ? (
                            <Input
                              type="number"
                              min="0"
                              max={matiere?.maxScore || 20}
                              step="0.25"
                              value={note?.devoir || ''}
                              onChange={(e) => handleNoteChange(eleve.id, e.target.value, 'devoir')}
                              className="w-full text-center"
                              placeholder={`Note/${matiere?.maxScore || 20}`}
                            />
                          ) : (
                            <span className={note?.devoir ? 'font-medium' : 'text-gray-400'}>
                              {note?.devoir ? `${note.devoir}/${matiere?.maxScore || 20}` : 'Non noté'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditMode ? (
                            <Input
                              type="number"
                              min="0"
                              max={matiere?.maxScore || 20}
                              step="0.25"
                              value={note?.composition || ''}
                              onChange={(e) => handleNoteChange(eleve.id, e.target.value, 'composition')}
                              className="w-full text-center"
                              placeholder={`Note/${matiere?.maxScore || 20}`}
                            />
                          ) : (
                            <span className={note?.composition ? 'font-medium' : 'text-gray-400'}>
                              {note?.composition ? `${note.composition}/${matiere?.maxScore || 20}` : 'Non noté'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {matiere?.coefficient || 1}
                        </TableCell>
                      </>
                    ) : (
                        <>
                      <TableCell>
                            {isEditMode ? (
                              <Input
                                type="number"
                                min="0"
                                max={matiere?.maxScore || 20}
                                step="0.25"
                                value={note?.note || ''}
                                onChange={(e) => handleNoteChange(eleve.id, e.target.value, 'note')}
                          className="w-full"
                                placeholder={`Note/${matiere?.maxScore || 20}`}
                              />
                            ) : (
                              <span className={note?.note ? 'font-medium' : 'text-gray-400'}>
                                {note?.note ? `${note.note}/${matiere?.maxScore || 20}` : 'Non noté'}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {matiere?.coefficient || 1}
                      </TableCell>
                        </>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </CardContent>
        </Card>

        {elevesFiltered.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm ? "Aucun élève trouvé pour cette recherche." : "Aucun élève dans cette classe."}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
