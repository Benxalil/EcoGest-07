import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GradeInput } from "@/components/ui/grade-input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStudents } from "@/hooks/useStudents";
import { useGrades } from "@/hooks/useGrades";
import { useExams } from "@/hooks/useExams";
import { useSubjects } from "@/hooks/useSubjects";
import { useClasses } from "@/hooks/useClasses";
import { 
  MatiereWithCoefficient, 
  parseMaxScoreFromMoyenne, 
  loadMatieresFromStorage, 
  calculateSemesterAverage 
} from "@/utils/gradeUtils";

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

interface EleveNote {
  eleveId: string;
  semestre1: {
    devoir: number;
    composition: number;
  };
  semestre2: {
    devoir: number;
    composition: number;
  };
  // For non-composition exams
  note?: number;
}

// Aucune donnée de matières par défaut
const matieres = [
  // Les matières seront ajoutées par l'utilisateur
];

export default function EvaluerEleve() {
  const { classeId, matiereId, eleveId } = useParams();
  const [eleve, setEleve] = useState<Student | null>(null);
  const [classe, setClasse] = useState<Classe | null>(null);
  const [matiere, setMatiere] = useState<MatiereWithCoefficient | null>(null);
  const [examInfo, setExamInfo] = useState<{
    examType: string;
    examTitle: string;
    semestre: string | null;
  } | null>(null);
  const [notes, setNotes] = useState<EleveNote>({
    eleveId: eleveId || "",
    semestre1: { devoir: 0, composition: 0 },
    semestre2: { devoir: 0, composition: 0 },
    note: 0
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    loadNotes();
    loadExamInfo();
  }, [classeId, matiereId, eleveId]);

  const loadExamInfo = () => {
    try {
      const savedExamen = sessionStorage.getItem('current_examen_notes');
      if (savedExamen) {
        const examen = JSON.parse(savedExamen);
        setExamInfo({
          examType: examen.examType || 'Composition',
          examTitle: examen.examTitle || '',
          semestre: examen.semestre || null
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des informations d\'examen:', error);
    }
  };

  const { students } = useStudents();
  const { classes } = useClasses();
  
  const loadData = () => {
    // Charger les informations de l'élève
    if (eleveId && students.length > 0) {
      const eleveFound = students.find((e) => e.id === eleveId);
      if (eleveFound) {
        setEleve({
          id: eleveFound.id,
          nom: eleveFound.last_name,
          prenom: eleveFound.first_name,
          classe: eleveFound.class_id || ''
        });
      }
    }

    // Charger les informations de la classe
    if (classeId && classes.length > 0) {
      const classeFound = classes.find((c) => c.id === classeId);
      if (classeFound) {
        setClasse({
          id: classeFound.id,
          session: classeFound.level,
          libelle: classeFound.name,
          effectif: classeFound.capacity || 0
        });
      }
    }

    // Charger les informations de la matière
    if (matiereId && classeId) {
      const matieres = loadMatieresFromStorage(classeId);
      // Match by string ID (UUID)
      const matiereFound = matieres.find(m => 
        m.id === matiereId
      );
      
      if (matiereFound) {
        setMatiere(matiereFound);
        const maxScore = parseMaxScoreFromMoyenne(matiereFound.moyenne);
        } else {
        console.warn('Matiere not found for ID:', matiereId, 'Available IDs:', matieres.map(m => m.id));
      }
    }
  };

  const loadNotes = () => {
    // Déterminer si on est dans un contexte d'examen ou de semestre
    const currentExamInfo = sessionStorage.getItem('current_examen_notes');
    let notesKey;
    
    if (currentExamInfo) {
      // Contexte d'examen: utiliser examId pour créer une clé unique
      try {
        const examData = JSON.parse(currentExamInfo);
        // Utiliser examId ou examenId pour compatibilité
        const examIdToUse = examData.examId || examData.examenId;
        notesKey = `notes_${classeId}_${examIdToUse}_${matiereId}`;
        } catch (error) {
        console.error("Erreur parsing exam info:", error);
        notesKey = `notes_${classeId}_${matiereId}`;
      } } else {
      // Contexte de semestre: utiliser l'ancienne logique
      notesKey = `notes_${classeId}_${matiereId}`;
      }
    
    const savedNotes = localStorage.getItem(notesKey);
    // Toujours initialiser avec des notes vides pour éviter la confusion
    let initialNotes = {
      eleveId: eleveId || "",
      semestre1: { devoir: 0, composition: 0 },
      semestre2: { devoir: 0, composition: 0 },
      note: 0
    };
    
    if (savedNotes && eleveId) {
      try {
        const allNotes = JSON.parse(savedNotes);
        const eleveNote = allNotes.find((note: EleveNote) => note.eleveId === eleveId);
        if (eleveNote) {
          // Seulement charger les notes si elles correspondent exactement à cet examen/élève
          setNotes(eleveNote);
          return;
        }
      } catch (error) {
        console.error('Erreur lors du chargement des notes:', error);
      }
    }
    
    // Si aucune note spécifique trouvée, utiliser les notes vides
    setNotes(initialNotes);
  };

  const handleNoteChange = (semestre: "semestre1" | "semestre2", type: "devoir" | "composition", value: string) => {
    // Validate input if matiere is available
    if (matiere && value !== "") {
      const maxScore = parseMaxScoreFromMoyenne(matiere.moyenne);
      const numValue = parseFloat(value);
      if (numValue > maxScore) {
        toast({
          title: "Erreur de saisie",
          description: `La note ne peut pas dépasser ${maxScore} pour ${matiere.nom}`,
          variant: "destructive",
        });
        return;
      }
    }

    const noteValue = parseFloat(value) || 0;
    setNotes(prev => ({
      ...prev,
      [semestre]: {
        ...prev[semestre],
        [type]: noteValue
      }
    }));
  };

  const handleSingleNoteChange = (value: string) => {
    // Validate input if matiere is available
    if (matiere && value !== "") {
      const maxScore = parseMaxScoreFromMoyenne(matiere.moyenne);
      const numValue = parseFloat(value);
      if (numValue > maxScore) {
        toast({
          title: "Erreur de saisie",
          description: `La note ne peut pas dépasser ${maxScore} pour ${matiere.nom}`,
          variant: "destructive",
        });
        return;
      }
    }

    const noteValue = parseFloat(value) || 0;
    setNotes(prev => ({
      ...prev,
      note: noteValue
    }));
  };

  const saveNotes = () => {
    // Déterminer la clé de stockage selon le contexte
    const currentExamInfo = sessionStorage.getItem('current_examen_notes');
    let notesKey;
    
    if (currentExamInfo) {
      // Contexte d'examen: utiliser examId pour créer une clé unique
      try {
        const examData = JSON.parse(currentExamInfo);
        // Utiliser examId ou examenId pour compatibilité
        const examIdToUse = examData.examId || examData.examenId;
        notesKey = `notes_${classeId}_${examIdToUse}_${matiereId}`;
        } catch (error) {
        console.error("Erreur parsing exam info:", error);
        notesKey = `notes_${classeId}_${matiereId}`;
      } } else {
      // Contexte de semestre: utiliser l'ancienne logique
      notesKey = `notes_${classeId}_${matiereId}`;
      }
    
    try {
      // Récupérer toutes les notes existantes
      const savedNotes = localStorage.getItem(notesKey);
      let allNotes: EleveNote[] = [];
      
      if (savedNotes) {
        allNotes = JSON.parse(savedNotes);
      }

      // Mettre à jour ou ajouter les notes de cet élève
      const existingNoteIndex = allNotes.findIndex(note => note.eleveId === eleveId);
      
      if (existingNoteIndex >= 0) {
        allNotes[existingNoteIndex] = notes; } else {
        allNotes.push(notes);
      }

      // Remplacé par hooks Supabase);
      toast({
        title: "Succès",
        description: "Notes sauvegardées avec succès",
      });

      // Retourner à la liste des élèves
      navigate(`/notes/${classeId}/matiere/${matiereId}/eleves`);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la sauvegarde des notes",
        variant: "destructive",
      });
    }
  };

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
                Évaluer - {eleve?.prenom} {eleve?.nom}
              </h1>
              <p className="text-gray-600">
                Matière: {matiere?.nom} | Classe: {classe?.session} {classe?.libelle}
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Notes de {eleve?.prenom} {eleve?.nom} - {matiere?.nom}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {examInfo?.examType === "Composition" ? (
                <>
                  {/* Premier Semestre */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-blue-700">Premier Semestre</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="s1-devoir">Note de Devoir</Label>
                        <GradeInput
                          id="s1-devoir"
                          maxScore={matiere ? parseMaxScoreFromMoyenne(matiere.moyenne) : 20}
                          value={notes.semestre1.devoir.toString()}
                          onChange={(value) => handleNoteChange("semestre1", "devoir", value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="s1-composition">Note de Composition</Label>
                        <GradeInput
                          id="s1-composition"
                          maxScore={matiere ? parseMaxScoreFromMoyenne(matiere.moyenne) : 20}
                          value={notes.semestre1.composition.toString()}
                          onChange={(value) => handleNoteChange("semestre1", "composition", value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Deuxième Semestre */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-green-700">Deuxième Semestre</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="s2-devoir">Note de Devoir</Label>
                        <GradeInput
                          id="s2-devoir"
                          maxScore={matiere ? parseMaxScoreFromMoyenne(matiere.moyenne) : 20}
                          value={notes.semestre2.devoir.toString()}
                          onChange={(value) => handleNoteChange("semestre2", "devoir", value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="s2-composition">Note de Composition</Label>
                        <GradeInput
                          id="s2-composition"
                          maxScore={matiere ? parseMaxScoreFromMoyenne(matiere.moyenne) : 20}
                          value={notes.semestre2.composition.toString()}
                          onChange={(value) => handleNoteChange("semestre2", "composition", value)}
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* Single note field for non-Composition exams */
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">
                    {examInfo?.examTitle || "Note de l'examen"}
                  </h3>
                  <div className="max-w-sm">
                    <div className="space-y-2">
                      <Label htmlFor="single-note">Note/{matiere ? parseMaxScoreFromMoyenne(matiere.moyenne) : 20}</Label>
                      <GradeInput
                        id="single-note"
                        maxScore={matiere ? parseMaxScoreFromMoyenne(matiere.moyenne) : 20}
                        value={notes.note?.toString() || "0"}
                        onChange={handleSingleNoteChange}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-6">
                <Button onClick={saveNotes} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Sauvegarder les Notes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}