import React, { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, FileText, Printer, Calculator, Eye, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { generateBulletinPDF } from "@/utils/pdfGenerator";
import { BulletinClasse } from "@/components/resultats/BulletinClasse";
import { useResults } from "@/hooks/useResults";
import { useUserRole } from "@/hooks/useUserRole";

interface Classe {
  id: string;
  session: string;
  libelle: string;
  effectif: number;
}

interface Student {
  id: string;
  nom: string;
  prenom: string;
  classe: string;
  numero?: number;
}

interface StudentWithStats extends Student {
  moyenneGenerale: number;
  rang: number;
}

interface StudentWithNotes extends Student {
  notes?: { [key: string]: EleveNote };
  moyenneGenerale: number;
  rang: number;
}

interface EleveNote {
  eleveId: string;
  semestre1?: {
    devoir: string | number;
    composition: string | number;
  };
  semestre2?: {
    devoir: string | number;
    composition: string | number;
  };
  note?: string | number; // Pour les examens non-composition
}

export default function ResultatsSemestre() {
  const [selectedEleve, setSelectedEleve] = useState<Student | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [schoolSystem, setSchoolSystem] = useState<'semestre' | 'trimestre'>('semestre');
  const [showCalculatedRank, setShowCalculatedRank] = useState(false);
  const [showBulletinClasse, setShowBulletinClasse] = useState(false);
  const [examInfo, setExamInfo] = useState<any>(null);
  const navigate = useNavigate();
  const { classeId, semestre, examId } = useParams();
  
  // Determine if this is an exam or semester view
  const isExamView = !!examId;
  
  // Utiliser le nouveau hook useResults
  const { results, loading, error, getStudentExamStats, getClassResults, getExamResults } = useResults();
  const { userProfile } = useUserRole();
  
  // Récupérer les données de la classe et de l'examen
  const classData = getClassResults(classeId || '');
  const examData = isExamView ? getExamResults(classeId || '', examId || '') : null;
  
  // Adapter les données pour la compatibilité avec l'interface existante
  const classe = classData ? {
    id: classData.class_id,
    session: classData.class_level,
    libelle: classData.class_section,
    effectif: classData.effectif
  } : null;
  
  const eleves = examData ? examData.students.map(student => ({
    id: student.student_id,
    nom: student.last_name,
    prenom: student.first_name,
    classe: `${student.class_level} ${student.class_section}`,
    numero: student.numero
  })) : [];
  
  const matieresClasse = examData ? examData.subjects.map(subject => ({
    id: parseInt(subject.subject_id),
    nom: subject.subject_name
  })) : [];

  useEffect(() => {
    // Récupérer les paramètres du système scolaire depuis la base de données
    // Pour l'instant, on utilise 'semestre' par défaut
    setSchoolSystem('semestre');

    // Si c'est un examen, récupérer les informations depuis sessionStorage
    if (isExamView) {
      const currentExamInfo = sessionStorage.getItem('current_examen_notes');
      if (currentExamInfo) {
        const examData = JSON.parse(currentExamInfo);
        setExamInfo(examData);
      }
    }
  }, [classeId, semestre, isExamView, examId]);

  const handleCalculRang = () => {
    setShowCalculatedRank(!showCalculatedRank);
  };

  const handleBulletinClasse = () => {
    setShowBulletinClasse(true);
  };

  const getSemestreLabel = () => {
    if (isExamView) {
      return examInfo?.title || examInfo?.examTitle || "EXAMEN";
    }
    
    if (schoolSystem === 'trimestre') {
      switch(semestre) {
        case "1": return "PREMIER TRIMESTRE";
        case "2": return "DEUXIEME TRIMESTRE";  
        case "3": return "TROISIEME TRIMESTRE";
        default: return "PREMIER TRIMESTRE";
      } } else {
      switch(semestre) {
        case "1": return "PREMIER SEMESTRE";
        case "2": return "DEUXIEME SEMESTRE";
        default: return "PREMIER SEMESTRE";
      }
    }
  };

  const handleViewDetails = (eleve: Student) => {
    setSelectedEleve(eleve);
    setIsDialogOpen(true);
  };

  // Fonction pour récupérer les notes d'un élève pour les matières de la classe
  const getEleveNotesForAllMatieres = (eleveId: string) => {
    const notesParMatiere: { [key: string]: EleveNote } = {};
    
    matieresClasse.forEach(matiere => {
      let savedNotes = null;
      let foundKey = null;
      
      if (isExamView) {
        // Pour les examens, essayer différents formats de clés
        const examInfo = sessionStorage.getItem('current_examen_notes');
        let examIdToUse = examId; // de l'URL par défaut
        
        if (examInfo) {
          try {
            const examData = JSON.parse(examInfo);
            // Essayer différents noms de propriétés pour l'ID
            examIdToUse = examData.examId || examData.examenId || examData.id || examId;
          } catch (error) {
            console.error("Error parsing exam info:", error);
          }
        }
        
        // Essayer plusieurs variantes de clés
        const possibleKeys = [
          `notes_${classeId}_${examIdToUse}_${matiere.id}`,
          `notes_${classeId}_${examId}_${matiere.id}`,
          `notes_${classeId}_${matiere.id}_${examIdToUse}`,
          `notes_${classeId}_${matiere.id}_${examId}`,
        ];
        
        for (const key of possibleKeys) {
          const testNotes = localStorage.getItem(key);
          if (testNotes && testNotes !== 'null') {
            savedNotes = testNotes;
            foundKey = key;
            break;
          }
        }
        
        if (!savedNotes) {
          } } else {
        // Pour les semestres
        const semestreKey = `notes_${classeId}_${matiere.id}`;
        savedNotes = localStorage.getItem(semestreKey);
        foundKey = semestreKey;
        }
      
      // Traiter les notes trouvées
      if (savedNotes && savedNotes !== "null") {
        try {
          const allNotes = JSON.parse(savedNotes);
          const eleveNote = allNotes.find((note: any) => note.eleveId === eleveId);
          
          if (eleveNote) {
            notesParMatiere[matiere.nom] = eleveNote; } else {
            // Créer une note par défaut
            const defaultNote: EleveNote = {
              eleveId,
              semestre1: { devoir: 0, composition: 0 },
              semestre2: { devoir: 0, composition: 0 }
            };
            if (isExamView) {
              defaultNote.note = null;
            }
            notesParMatiere[matiere.nom] = defaultNote;
          }
        } catch (error) {
          console.error("Error parsing notes for key:", foundKey, error);
          // Créer une note par défaut en cas d'erreur
          const defaultNote: EleveNote = {
            eleveId,
            semestre1: { devoir: 0, composition: 0 },
            semestre2: { devoir: 0, composition: 0 }
          };
          if (isExamView) {
            defaultNote.note = null;
          }
          notesParMatiere[matiere.nom] = defaultNote;
        } } else {
        // Créer une note par défaut si aucune note trouvée
        const defaultNote: EleveNote = {
          eleveId,
          semestre1: { devoir: 0, composition: 0 },
          semestre2: { devoir: 0, composition: 0 }
        };
        if (isExamView) {
          defaultNote.note = null;
        }
        notesParMatiere[matiere.nom] = defaultNote;
      }
    });
    
    return notesParMatiere;
  };

  // Fonction pour calculer les notes et moyennes d'un élève
  const getEleveStatistics = (eleveId: string) => {
    const notesParMatiere = getEleveNotesForAllMatieres(eleveId);
    
    // Pour les examens non-Composition (notes simples)
    if (isExamView && examInfo?.type !== "Composition") {
      let totalNotes = 0;
      let countNotes = 0;
      const notesList: string[] = [];
      
      Object.entries(notesParMatiere).forEach(([matiere, notes]) => {
        if (notes.note !== undefined && notes.note !== null && notes.note !== -1) {
          const noteValue = typeof notes.note === 'string' ? parseFloat(notes.note) : Number(notes.note);
          if (!isNaN(noteValue) && noteValue >= 0) {
            totalNotes += noteValue;
            countNotes++;
            notesList.push(`${matiere}: ${noteValue}`);
          }
        }
      });

      const moyenneGenerale = countNotes > 0 ? totalNotes / countNotes : 0;
      const totalPossible = countNotes * 20;
      
      return {
        notesList: notesList.join(", ") || "Aucune note",
        totalNotesDevoir: "-",
        totalNotesComposition: countNotes > 0 ? `${totalNotes.toFixed(1)} / ${totalPossible}` : "-",
        moyenneDevoir: "-",
        moyenneComposition: countNotes > 0 ? `${moyenneGenerale.toFixed(1)} / 20` : "-",
        moyenneGenerale
      };
    }

    // Pour les examens de type "Composition", utiliser la logique semestre
    if (isExamView && examInfo?.type === "Composition") {
      const semestreKey = semestre === "1" ? "semestre1" : "semestre2";
      let totalDevoir = 0;
      let countDevoir = 0;
      let totalComposition = 0;
      let countComposition = 0;
      let totalNotesDevoir = 0;
      let totalNotesComposition = 0;
      const notesList: string[] = [];
      
      Object.entries(notesParMatiere).forEach(([matiere, notes]) => {
        const notesSemestre = notes[semestreKey as keyof typeof notes];

        if (notesSemestre && typeof notesSemestre === 'object' && 'devoir' in notesSemestre && 'composition' in notesSemestre) {
          const devoirValue = typeof notesSemestre.devoir === 'string' ? parseFloat(notesSemestre.devoir) : notesSemestre.devoir;
          const compositionValue = typeof notesSemestre.composition === 'string' ? parseFloat(notesSemestre.composition) : notesSemestre.composition;
          
          if (devoirValue !== -1 && !isNaN(devoirValue) && devoirValue > 0) {
            totalDevoir += devoirValue;
            totalNotesDevoir += devoirValue;
            countDevoir++;
            notesList.push(`${matiere} (D): ${devoirValue}`);
          }
          
          if (compositionValue !== -1 && !isNaN(compositionValue) && compositionValue > 0) {
            totalComposition += compositionValue;
            totalNotesComposition += compositionValue;
            countComposition++;
            notesList.push(`${matiere} (C): ${compositionValue}`);
          }
        }
      });

      const moyenneDevoir = countDevoir > 0 ? totalDevoir / countDevoir : 0;
      const moyenneComposition = countComposition > 0 ? totalComposition / countComposition : 0;
      const moyenneGenerale = countDevoir > 0 || countComposition > 0 ? (totalDevoir + totalComposition) / (countDevoir + countComposition) : 0;
      
      const totalNotesDevStr = countDevoir > 0 ? `${totalNotesDevoir} / ${countDevoir * 20}` : "-";
      const totalNotesCompStr = countComposition > 0 ? `${totalNotesComposition} / ${countComposition * 20}` : "-";
      const moyenneDevStr = countDevoir > 0 ? `${moyenneDevoir.toFixed(1)} / 20` : "-";
      const moyenneCompStr = countComposition > 0 ? `${moyenneComposition.toFixed(1)} / 20` : "-";
      
      return {
        notesList: notesList.join(", ") || "Aucune note",
        totalNotesDevoir: totalNotesDevStr,
        totalNotesComposition: totalNotesCompStr,
        moyenneDevoir: moyenneDevStr,
        moyenneComposition: moyenneCompStr,
        moyenneGenerale
      };
    }
    
    // Pour les semestres (logique standard)
    const semestreKey = semestre === "2" ? "semestre2" : "semestre1";
    let totalDevoir = 0;
    let countDevoir = 0;
    let totalComposition = 0;
    let countComposition = 0;
    let totalNotesDevoir = 0;
    let totalNotesComposition = 0;
    const notesList: string[] = [];
    
    Object.entries(notesParMatiere).forEach(([matiere, notes]) => {
      const notesSemestre = notes[semestreKey as keyof typeof notes];

      if (notesSemestre && typeof notesSemestre === 'object' && 'devoir' in notesSemestre && 'composition' in notesSemestre) {
        const devoirValue = typeof notesSemestre.devoir === 'string' ? parseFloat(notesSemestre.devoir) : notesSemestre.devoir;
        const compositionValue = typeof notesSemestre.composition === 'string' ? parseFloat(notesSemestre.composition) : notesSemestre.composition;
        
        if (devoirValue !== -1 && !isNaN(devoirValue) && devoirValue > 0) {
          totalDevoir += devoirValue;
          totalNotesDevoir += devoirValue;
          countDevoir++;
          notesList.push(`${matiere} (D): ${devoirValue}`);
        }
        
        if (compositionValue !== -1 && !isNaN(compositionValue) && compositionValue > 0) {
          totalComposition += compositionValue;
          totalNotesComposition += compositionValue;
          countComposition++;
          notesList.push(`${matiere} (C): ${compositionValue}`);
        }
      }
    });

    const moyenneDevoir = countDevoir > 0 ? totalDevoir / countDevoir : 0;
    const moyenneComposition = countComposition > 0 ? totalComposition / countComposition : 0;
    const moyenneGenerale = countDevoir > 0 || countComposition > 0 ? (totalDevoir + totalComposition) / (countDevoir + countComposition) : 0;
    
    const totalNotesDevStr = countDevoir > 0 ? `${totalNotesDevoir} / ${countDevoir * 20}` : "-";
    const totalNotesCompStr = countComposition > 0 ? `${totalNotesComposition} / ${countComposition * 20}` : "-";
    const moyenneDevStr = countDevoir > 0 ? `${moyenneDevoir.toFixed(1)} / 20` : "-";
    const moyenneCompStr = countComposition > 0 ? `${moyenneComposition.toFixed(1)} / 20` : "-";
    
    return {
      notesList: notesList.join(", ") || "Aucune note",
      totalNotesDevoir: totalNotesDevStr,
      totalNotesComposition: totalNotesCompStr,
      moyenneDevoir: moyenneDevStr,
      moyenneComposition: moyenneCompStr,
      moyenneGenerale
    };
  };

  const getElevesWithRank = () => {
    if (!showCalculatedRank) {
      return eleves;
    }
    const elevesWithStats = eleves.map(eleve => {
      const stats = getEleveStatistics(eleve.id);
      return {
        ...eleve,
        moyenneGenerale: stats.moyenneGenerale
      };
    });

    // Trier par moyenne décroissante
    const elevesTries = elevesWithStats.sort((a, b) => b.moyenneGenerale - a.moyenneGenerale);

    // Assigner les rangs
    return elevesTries.map((eleve, index) => ({
      ...eleve,
      rang: index + 1
    }));
  };

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/resultats')} className="hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-blue-600">
                Liste des élèves pour cette classe (Nombre d'élèves : {eleves.length})
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="bg-orange-500 text-white hover:bg-orange-600 border-orange-500" onClick={handleBulletinClasse}>
              Bulletin du Classe
            </Button>
            <Button variant="outline" size="sm" className="bg-blue-500 text-white hover:bg-blue-600 border-blue-500" onClick={handleCalculRang}>
              Calcul du Rang
            </Button>
          </div>
        </div>

        {/* En-tête du semestre */}
        <div className="bg-blue-600 text-white p-4 rounded-t-lg">
          <h2 className="text-lg font-bold text-center">{getSemestreLabel()}</h2>
        </div>

        {/* Section "Tous les bulletins" */}
        <div className="bg-black text-white p-3 flex justify-end">
          <span className="text-sm font-medium px-[87px] mx-[206px]">Tous les bulletins</span>
        </div>

        <div className="border rounded-b-lg bg-white shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">N°</TableHead>
                {showCalculatedRank && <TableHead className="w-16">Rang</TableHead>}
                <TableHead>Nom et Prénom</TableHead>
                {(isExamView && examInfo?.type !== "Composition") ? (
                  <TableHead colSpan={2} className="text-center bg-green-50">
                    Note
                  </TableHead>
                ) : (
                  <>
                    <TableHead colSpan={2} className="text-center bg-blue-50">
                      Devoir
                    </TableHead>
                    <TableHead colSpan={2} className="text-center bg-green-50">
                      Composition
                    </TableHead>
                  </>
                )}
                <TableHead className="w-20 text-center">Action</TableHead>
                <TableHead className="w-40">Bulletins de notes</TableHead>
              </TableRow>
              <TableRow>
                <TableHead></TableHead>
                {showCalculatedRank && <TableHead></TableHead>}
                <TableHead></TableHead>
                {(isExamView && examInfo?.type !== "Composition") ? (
                  <>
                    <TableHead className="text-center bg-green-50 text-xs">Notes</TableHead>
                    <TableHead className="text-center bg-green-50 text-xs">Moyenne</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="text-center bg-blue-50 text-xs">Notes</TableHead>
                    <TableHead className="text-center bg-blue-50 text-xs">Moyenne</TableHead>
                    <TableHead className="text-center bg-green-50 text-xs">Notes</TableHead>
                    <TableHead className="text-center bg-green-50 text-xs">Moyenne</TableHead>
                  </>
                )}
                <TableHead></TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getElevesWithRank().map((eleve, index) => {
                const stats = getEleveStatistics(eleve.id);
                return (
                  <TableRow key={eleve.id}>
                    <TableCell className="font-medium">{eleve.numero || index + 1}</TableCell>
                    {showCalculatedRank && <TableCell className="font-medium">{(eleve as any).rang}</TableCell>}
                    <TableCell className="font-medium">{eleve.prenom} {eleve.nom}</TableCell>
                    {(isExamView && examInfo?.type !== "Composition") ? (
                      <>
                        <TableCell className="text-center">{stats.notesList}</TableCell>
                        <TableCell className="text-center">{stats.moyenneComposition}</TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="text-center">{stats.totalNotesDevoir}</TableCell>
                        <TableCell className="text-center">{stats.moyenneDevoir}</TableCell>
                        <TableCell className="text-center">{stats.totalNotesComposition}</TableCell>
                        <TableCell className="text-center">{stats.moyenneComposition}</TableCell>
                      </>
                    )}
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(eleve)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-green-500 text-white hover:bg-green-600 border-green-500"
                        onClick={() => generateBulletinPDF(eleve, classe!, semestre || "1")}
                      >
                        Bulletin de notes
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {getElevesWithRank().length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Aucun élève trouvé pour cette classe.</p>
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Détails des notes - {selectedEleve?.prenom} {selectedEleve?.nom}</DialogTitle>
            </DialogHeader>
            {selectedEleve && (
              <BulletinClasse
                classe={classe!}
                eleves={[{
                  ...selectedEleve,
                  moyenneGenerale: getEleveStatistics(selectedEleve.id).moyenneGenerale,
                  rang: 1
                }]}
                matieresClasse={matieresClasse}
                semestre={semestre || "1"}
                schoolSystem={schoolSystem}
                classeId={classeId}
              />
            )}
          </DialogContent>
        </Dialog>

        {showBulletinClasse && (
          <Dialog open={showBulletinClasse} onOpenChange={setShowBulletinClasse}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Bulletin de la classe - {classe?.session} {classe?.libelle}</DialogTitle>
              </DialogHeader>
              <BulletinClasse
                classe={classe!}
                eleves={getElevesWithRank().map(eleve => ({
                  ...eleve,
                  moyenneGenerale: getEleveStatistics(eleve.id).moyenneGenerale,
                  rang: (eleve as any).rang || 0
                }))}
                matieresClasse={matieresClasse}
                semestre={semestre || "1"}
                schoolSystem={schoolSystem}
                classeId={classeId}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Layout>
  );
}