import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GradeInput } from "@/components/ui/grade-input";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ArrowLeft, User, Search, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSchoolData } from "@/hooks/useSchoolData";
import { MatiereWithCoefficient, parseMaxScoreFromMoyenne, calculateSemesterAverage } from "@/utils/gradeUtils";
import { useSubjects } from "@/hooks/useSubjects";
import { useClasses } from "@/hooks/useClasses";
import { useStudents } from "@/hooks/useStudents";
import { useNotesSync, UnifiedNote } from "@/hooks/useNotesSync";
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
export default function NotesParEleve() {
  const [eleves, setEleves] = useState<Student[]>([]);
  const [matieres, setMatieres] = useState<MatiereWithCoefficient[]>([]);
  const [selectedEleve, setSelectedEleve] = useState<Student | null>(null);
  const [selectedClasseFilter, setSelectedClasseFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSemestre, setSelectedSemestre] = useState<"semestre1" | "semestre2">("semestre1");
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

  // Hooks pour récupérer les données depuis la base
  const {
    schoolData: schoolSettings
  } = useSchoolData();
  const isTrimestreSystem = schoolSettings?.semester_type === 'trimester';
  const classeId = searchParams.get('classeId');
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

  // Hook de synchronisation des notes - CENTRALISÉ
  const {
    localNotes,
    hasUnsavedChanges,
    getNote,
    getNotesForStudent,
    updateNote,
    saveAllNotes,
    refreshNotes
  } = useNotesSync({
    classeId: classeId || undefined,
    studentId: selectedEleve?.id,
    isComposition: examInfo?.type === 'Composition'
  });
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
        const examTitle = examData.examTitle || examData.titre || 'Examen';
        const isCompositionExam = examTitle.toLowerCase().includes('composition') || examTitle.toLowerCase().includes('première composition') || examTitle.toLowerCase().includes('deuxième composition');
        setExamInfo({
          type: isCompositionExam ? 'Composition' : 'Examen',
          titre: examTitle
        });
      } else {
        setExamInfo({
          type: 'Composition',
          titre: 'Composition'
        });
      }
    } catch (error) {
      console.error('Error loading exam info:', error);
      setExamInfo({
        type: 'Composition',
        titre: 'Composition'
      });
    }
  };

  // Préfiltrer par classe via query string
  useEffect(() => {
    const cid = searchParams.get('classeId');
    const eleveId = searchParams.get('eleveId');
    if (cid) setSelectedClasseFilter(cid);
    if (eleveId && eleves.length > 0) {
      const eleve = eleves.find(e => e.id === eleveId);
      if (eleve) {
        setSelectedEleve(eleve);
      }
    } else if (cid && eleves.length > 0 && !selectedEleve) {
      const elevesClasse = eleves.filter(e => {
        const classeId = resolveClasseId(e.classe);
        return classeId === cid || e.classe === cid;
      });
      if (elevesClasse.length > 0) {
        setSelectedEleve(elevesClasse[0]);
      }
    }

    // Récupérer le semestre depuis sessionStorage
    const savedExamen = sessionStorage.getItem('current_examen_notes');
    if (savedExamen) {
      try {
        const examen = JSON.parse(savedExamen);
        if (examen.semestre) {
          setSelectedSemestre(examen.semestre);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération de l\'examen:', error);
      }
    }
  }, [searchParams, eleves, classes]);

  // Utilitaire: résout un identifiant de classe
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

  // Fonction utilitaire pour mapper les classes
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
    if (subjects && subjects.length > 0) {
      const matieresWithCoeff = subjects.map(subject => ({
        id: parseInt(subject.id.replace(/\D/g, '')) || Date.now(),
        nom: subject.name,
        coefficient: (subject.coefficient || 1).toString(),
        maxScore: subject.hours_per_week || 20,
        abbreviation: subject.abbreviation || subject.name.substring(0, 3).toUpperCase(),
        moyenne: (subject.hours_per_week || 20).toString(),
        classeId: subject.class_id
      }));
      setMatieres(matieresWithCoeff);
    }
  };
  const handleNoteChange = (matiereId: number, semestre: "semestre1" | "semestre2", type: "devoir" | "composition", value: string) => {
    if (!selectedEleve) return;

    // Validation
    const matiere = matieres.find(m => m.id === matiereId);
    if (matiere && value !== "") {
      const maxScore = parseMaxScoreFromMoyenne(matiere.moyenne);
      const numValue = parseFloat(value);
      if (numValue > maxScore) {
        toast({
          title: "Erreur de saisie",
          description: `La note ne peut pas dépasser ${maxScore} pour ${matiere.nom}`,
          variant: "destructive"
        });
        return;
      }
    }

    // Utiliser le système de synchronisation centralisé
    const updates: Partial<UnifiedNote> = {
      coefficient: parseFloat(matiere?.coefficient?.toString() || '1'),
      [type]: value
    };
    updateNote(selectedEleve.id, matiereId.toString(), updates);
    calculateAndUpdateAverage();
  };

  // Handle single note change for non-composition exams
  const handleSingleNoteChange = (matiereId: number, value: string) => {
    if (!selectedEleve) return;
    const matiere = matieres.find(m => m.id === matiereId);
    if (matiere && value !== "") {
      const maxScore = parseMaxScoreFromMoyenne(matiere.moyenne);
      const numValue = parseFloat(value);
      if (numValue > maxScore) {
        toast({
          title: "Erreur de saisie",
          description: `La note ne peut pas dépasser ${maxScore} pour ${matiere.nom}`,
          variant: "destructive"
        });
        return;
      }
    }

    // Utiliser le système de synchronisation centralisé
    const updates: Partial<UnifiedNote> = {
      coefficient: parseFloat(matiere?.coefficient?.toString() || '1'),
      note: value
    };
    updateNote(selectedEleve.id, matiereId.toString(), updates);
  };
  const calculateAndUpdateAverage = () => {
    if (!selectedEleve || matieres.length === 0) {
      setSemesterAverage(0);
      return;
    }
    const semesterNotes: {
      [matiereId: number]: {
        devoir: number;
        composition: number;
      };
    } = {};
    matieres.forEach(matiere => {
      const noteData = getNote(selectedEleve.id, matiere.id.toString());
      if (noteData) {
        semesterNotes[matiere.id] = {
          devoir: parseFloat(noteData.devoir || '0') || 0,
          composition: parseFloat(noteData.composition || '0') || 0
        };
      }
    });
    const average = calculateSemesterAverage(semesterNotes, matieres);
    setSemesterAverage(average.weighted);
  };

  // Update average when notes or selected student changes
  useEffect(() => {
    calculateAndUpdateAverage();
  }, [selectedEleve, selectedSemestre, matieres, localNotes]);
  const handleSaveAllNotes = async () => {
    if (!selectedEleve) {
      toast({
        title: "Erreur",
        description: "Aucun élève sélectionné.",
        variant: "destructive"
      });
      return;
    }
    try {
      await saveAllNotes();
      toast({
        title: "Succès",
        description: "Toutes les notes ont été sauvegardées avec succès."
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la sauvegarde des notes.",
        variant: "destructive"
      });
    }
  };
  const filteredEleves = eleves.filter(eleve => {
    const matchesSearch = searchTerm === "" || `${eleve.prenom} ${eleve.nom}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClasse = selectedClasseFilter === "all" || eleve.classe === selectedClasseFilter || resolveClasseId(eleve.classe) === selectedClasseFilter;
    return matchesSearch && matchesClasse;
  });

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
  return <Layout>
      <div className="container mx-auto p-6">
        {/* HEADER AVEC INFORMATIONS DE L'EXAMEN - STRUCTURE ORIGINALE */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-lg mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <div>
                <h1 className="text-2xl font-bold">
                  Notes par Élève
                </h1>
                <div className="flex items-center gap-4 mt-2">
                  <div className="text-lg">
                    <span className="font-medium">Examen:</span> {examInfo?.titre || 'Examen'}
                  </div>
                  
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveAllNotes} variant="secondary" size="sm" disabled={!hasUnsavedChanges}>
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder toutes les notes
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sélection de l'élève - INTERFACE IDENTIQUE IMAGE 2 */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Sélectionner un élève
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Recherche */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Rechercher un élève..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Liste des élèves */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredEleves.map((eleve, index) => (
                    <div
                      key={eleve.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedEleve?.id === eleve.id
                          ? 'bg-primary/10 border-primary text-primary font-medium'
                          : 'bg-card hover:bg-muted/50 border-border'
                      }`}
                      onClick={() => setSelectedEleve(eleve)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">
                            {eleve.prenom} {eleve.nom}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ID: {(index + 1).toString().padStart(2, '0')}
                          </div>
                        </div>
                        {selectedEleve?.id === eleve.id && (
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {filteredEleves.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">Aucun élève trouvé.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Notes de l'élève sélectionné */}
          <div className="lg:col-span-2">
            {selectedEleve ? <Card>
                <CardHeader>
                  <CardTitle>
                    Notes de {selectedEleve.prenom} {selectedEleve.nom}
                  </CardTitle>
                  
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">N°</TableHead>
                        <TableHead>Matière</TableHead>
                        {/* LOGIQUE CONDITIONNELLE UNIFIÉE SELON LE TYPE D'EXAMEN */}
                        {examInfo?.type === 'Composition' ? (
                          <>
                            <TableHead className="text-center">Devoir</TableHead>
                            <TableHead className="text-center">Composition</TableHead>
                          </>
                        ) : (
                          <TableHead className="text-center">{examInfo?.titre || 'Note'}</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matieres.map((matiere, index) => {
                        const noteData = getNote(selectedEleve.id, matiere.id.toString());
                        const maxScore = parseMaxScoreFromMoyenne(matiere.moyenne);
                        return (
                          <TableRow key={matiere.id}>
                            <TableCell className="font-mono text-sm">{(index + 1).toString().padStart(2, '0')}</TableCell>
                            <TableCell className="font-medium">
                              {matiere.nom}
                            </TableCell>
                            {/* AFFICHAGE CONDITIONNEL UNIFIÉ SELON LE TYPE D'EXAMEN */}
                            {examInfo?.type === 'Composition' ? (
                              <>
                                <TableCell className="text-center">
                                  <GradeInput 
                                    value={noteData?.devoir || ''} 
                                    onChange={value => handleNoteChange(matiere.id, selectedSemestre, 'devoir', value)} 
                                    maxScore={maxScore} 
                                    placeholder="" 
                                    className="w-20 text-center" 
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <GradeInput 
                                    value={noteData?.composition || ''} 
                                    onChange={value => handleNoteChange(matiere.id, selectedSemestre, 'composition', value)} 
                                    maxScore={maxScore} 
                                    placeholder="" 
                                    className="w-20 text-center" 
                                  />
                                </TableCell>
                              </>
                            ) : (
                              <TableCell className="text-center">
                                <GradeInput 
                                  value={noteData?.note || ''} 
                                  onChange={value => handleSingleNoteChange(matiere.id, value)} 
                                  maxScore={maxScore} 
                                  placeholder="" 
                                  className="w-20 text-center" 
                                />
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {matieres.length === 0 && <div className="text-center py-8">
                      <p className="text-gray-500">Aucune matière disponible.</p>
                    </div>}
                </CardContent>
              </Card> : <Card>
                <CardContent className="py-12">
                  <div className="text-center text-gray-500">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Sélectionnez un élève pour voir ses notes</p>
                  </div>
                </CardContent>
              </Card>}
          </div>
        </div>
      </div>
    </Layout>;
}