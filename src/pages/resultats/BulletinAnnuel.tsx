import React, { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Download, Eye } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { generateBulletinAnnuelPDF } from "@/utils/pdfGeneratorAnnuel";
import { generateBulletinPDF } from "@/utils/pdfGenerator";
import { useSchoolData } from "@/hooks/useSchoolData";

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

interface EleveNote {
  eleveId: string;
  matiereId?: number;
  semestre1: {
    devoir: string;
    composition: string;
  };
  semestre2: {
    devoir: string;
    composition: string;
  };
}

interface Matiere {
  id: number;
  nom: string;
  abreviation?: string;
  horaires: string;
  classeId: string;
}

interface MatierePDF {
  id: string;
  nom: string;
}

export default function BulletinAnnuel() {
  const [classe, setClasse] = useState<Classe | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [notes, setNotes] = useState<EleveNote[]>([]);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showStudentDetails, setShowStudentDetails] = useState(false);
  const navigate = useNavigate();
  const { classeId } = useParams();

  // Remplacé par hook Supabase
  const { schoolData: schoolSettings } = useSchoolData();
  const schoolSystem = schoolSettings?.system || "semestre";

  const getNumberOfPeriods = () => {
    return schoolSystem === "trimestre" ? 3 : 2;
  };

  const getPeriodLabel = (period: number) => {
    if (schoolSystem === "trimestre") {
      return period === 1 ? "1er trimestre" : period === 2 ? "2e trimestre" : "3e trimestre";
    }
    return period === 1 ? "1er semestre" : "2e semestre";
  };

  useEffect(() => {
    const loadData = () => {
      try {
        // Charger les informations de la classe
        // Remplacé par hook Supabase
        let foundClasse = null;
        if (savedClasses) {
          const classes = JSON.parse(savedClasses);
          foundClasse = classes.find((c: Classe) => c.id === classeId);
          setClasse(foundClasse || null);
        }

        // Charger les élèves
        // Remplacé par hook Supabase
        if (savedStudents && foundClasse) {
          const allStudents = JSON.parse(savedStudents);
          // Construire le nom de la classe pour la comparaison (session + libelle)
          const classeFullName = `${foundClasse.session} ${foundClasse.libelle}`;
          const classeStudents = allStudents.filter((student: Student) => student.classe === classeFullName);
          setStudents(classeStudents);
        }

        // Charger les matières
        // Remplacé par hook Supabase
        if (savedMatieres) {
          setMatieres(JSON.parse(savedMatieres));
        }

        // Charger les notes depuis tous les fichiers notes_classeId_matiereId
        const allNotesForClass: EleveNote[] = [];
        if (savedMatieres) {
          const matieresData = JSON.parse(savedMatieres);
          matieresData.forEach((matiere: any) => {
            if (matiere.classeId === classeId) {
              const notesKey = `notes_${classeId}_${matiere.id}`;
              const savedNotesForMatiere = localStorage.getItem(notesKey);
              if (savedNotesForMatiere) {
                try {
                  const notesForMatiere = JSON.parse(savedNotesForMatiere);
                  notesForMatiere.forEach((note: EleveNote) => {
                    allNotesForClass.push({
                      ...note,
                      matiereId: matiere.id
                    });
                  });
                } catch (error) {
                  console.error(`Erreur lors du chargement des notes pour la matière ${matiere.id}:`, error);
                }
              }
            }
          });
        }
        setNotes(allNotesForClass);

        // Charger le système scolaire
        const system = getSchoolSettings();
        setSchoolSystem(system);
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
      }
    };

    loadData();
  }, [classeId]);

  const calculateAnnualAverage = (eleveId: string) => {
    const eleveNotes = notes.filter(note => note.eleveId === eleveId);
    
    if (eleveNotes.length === 0) return 0;

    let totalPoints = 0;
    let totalSubjects = 0;
    const numberOfPeriods = getNumberOfPeriods();

    // Grouper par matière
    const notesByMatiere = eleveNotes.reduce((acc, note) => {
      const matiereId = note.matiereId?.toString() || 'unknown';
      if (!acc[matiereId]) {
        acc[matiereId] = [];
      }
      acc[matiereId].push(note);
      return acc;
    }, {} as Record<string, EleveNote[]>);

    // Calculer la moyenne par matière sur toutes les périodes
    Object.values(notesByMatiere).forEach(matiereNotes => {
      if (matiereNotes.length > 0) {
        let periodAverages: number[] = [];
        
        // Calculer moyenne pour chaque période (semestre1 et semestre2)
        ['semestre1', 'semestre2'].forEach((periode) => {
          const noteForPeriod = matiereNotes[0]; // Une seule note par matière car structure plate
          if (noteForPeriod && noteForPeriod[periode as keyof EleveNote]) {
            const periodData = noteForPeriod[periode as 'semestre1' | 'semestre2'];
            const devoir = parseFloat(periodData.devoir) || 0;
            const composition = parseFloat(periodData.composition) || 0;
            
            if (devoir > 0 || composition > 0) {
              // Calcul moyenne période : (devoir + composition*2) / 3
              const moyenne = (devoir + composition * 2) / 3;
              periodAverages.push(moyenne);
            }
          }
        });
        
        if (periodAverages.length > 0) {
          const sum = periodAverages.reduce((sum, avg) => sum + avg, 0);
          const average = sum / periodAverages.length;
          totalPoints += average;
          totalSubjects++;
        }
      }
    });

    return totalSubjects > 0 ? Math.round((totalPoints / totalSubjects) * 100) / 100 : 0;
  };

  const calculatePeriodAverage = (eleveId: string, period: number) => {
    const eleveNotes = notes.filter(note => note.eleveId === eleveId);
    
    if (eleveNotes.length === 0) return 0;

    let totalPoints = 0;
    let totalSubjects = 0;
    const periodKey = period === 1 ? 'semestre1' : 'semestre2';

    // Grouper par matière
    const notesByMatiere = eleveNotes.reduce((acc, note) => {
      const matiereId = note.matiereId?.toString() || 'unknown';
      if (!acc[matiereId]) {
        acc[matiereId] = [];
      }
      acc[matiereId].push(note);
      return acc;
    }, {} as Record<string, EleveNote[]>);

    // Calculer la moyenne par matière pour cette période
    Object.values(notesByMatiere).forEach(matiereNotes => {
      if (matiereNotes.length > 0) {
        const noteForPeriod = matiereNotes[0];
        if (noteForPeriod && noteForPeriod[periodKey]) {
          const periodData = noteForPeriod[periodKey];
          const devoir = parseFloat(periodData.devoir) || 0;
          const composition = parseFloat(periodData.composition) || 0;
          
          if (devoir > 0 || composition > 0) {
            // Calcul moyenne période : (devoir + composition*2) / 3
            const moyenne = (devoir + composition * 2) / 3;
            totalPoints += moyenne;
            totalSubjects++;
          }
        }
      }
    });

    return totalSubjects > 0 ? Math.round((totalPoints / totalSubjects) * 100) / 100 : 0;
  };

  const handleDownloadAnnualBulletin = async () => {
    if (!classe) return;

    // Préparer les données pour le PDF
    const studentsWithData = students.map(student => ({
      ...student,
      annualAverage: calculateAnnualAverage(student.id),
      periodAverages: Array.from({ length: getNumberOfPeriods() }, (_, i) => ({
        period: i + 1,
        average: calculatePeriodAverage(student.id, i + 1)
      }))
    }));

    // Convertir les matières au format attendu par le PDF
    const matieresForPDF: MatierePDF[] = matieres.map(matiere => ({
      id: matiere.id.toString(),
      nom: matiere.nom
    }));
    
    await generateBulletinAnnuelPDF(classe, studentsWithData, schoolSystem, matieresForPDF);
  };

  const handleViewStudentDetails = (student: Student) => {
    setSelectedStudent(student);
    setShowStudentDetails(true);
  };

  const handleDownloadStudentBulletin = () => {
    if (!selectedStudent || !classe) return;

    // Utiliser la fonction PDF existante avec le format attendu
    generateBulletinPDF(
      selectedStudent,
      classe,
      "1" // semestre par défaut
    );
  };

  const getStudentNotesForAllMatieres = (studentId: string) => {
    const studentNotes = notes.filter(note => note.eleveId === studentId);
    const matieresForClass = matieres.filter(matiere => matiere.classeId === classeId);
    
    return matieresForClass.map(matiere => {
      const noteForMatiere = studentNotes.find(note => note.matiereId === matiere.id);
      return {
        matiere,
        notes: noteForMatiere || {
          eleveId: studentId,
          matiereId: matiere.id,
          semestre1: { devoir: "", composition: "" },
          semestre2: { devoir: "", composition: "" }
        }
      };
    });
  };

  if (!classe) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <p className="text-destructive text-lg">Classe non trouvée</p>
            <Button onClick={() => navigate("/resultats")} className="mt-4">
              Retour aux résultats
            </Button>
          </div>
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
              variant="ghost"
              size="icon"
              onClick={() => navigate("/resultats")}
              className="hover:bg-accent"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-primary">
              Bulletin Annuel - {classe.session} {classe.libelle}
            </h1>
          </div>
          <Button onClick={handleDownloadAnnualBulletin} className="bg-primary hover:bg-primary/90">
            <Download className="h-4 w-4 mr-2" />
            Télécharger PDF
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Résumé de la classe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{students.length}</p>
                <p className="text-sm text-muted-foreground">Élèves inscrits</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{getNumberOfPeriods()}</p>
                <p className="text-sm text-muted-foreground">
                  {schoolSystem === "trimestre" ? "Trimestres" : "Semestres"}
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{matieres.length}</p>
                <p className="text-sm text-muted-foreground">Matières enseignées</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bulletin annuel - Résultats de tous les {schoolSystem === "trimestre" ? "trimestres" : "semestres"}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Prénom</TableHead>
                  {Array.from({ length: getNumberOfPeriods() }, (_, i) => (
                    <TableHead key={i} className="text-center">
                      {getPeriodLabel(i + 1)}
                    </TableHead>
                  ))}
                  <TableHead className="text-center">Actions</TableHead>
                  <TableHead className="text-center font-bold">Moyenne Annuelle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6 + getNumberOfPeriods()} className="text-center text-muted-foreground">
                      Aucun élève trouvé pour cette classe
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student, index) => {
                    const annualAverage = calculateAnnualAverage(student.id);
                    return (
                      <TableRow key={student.id}>
                        <TableCell>{student.numero || index + 1}</TableCell>
                        <TableCell className="font-medium">{student.nom}</TableCell>
                        <TableCell>{student.prenom}</TableCell>
                        {Array.from({ length: getNumberOfPeriods() }, (_, i) => {
                          const periodAverage = calculatePeriodAverage(student.id, i + 1);
                          return (
                            <TableCell key={i} className="text-center">
                              <span className={`px-2 py-1 rounded text-sm ${
                                periodAverage >= 16 ? 'bg-green-100 text-green-800' :
                                periodAverage >= 14 ? 'bg-blue-100 text-blue-800' :
                                periodAverage >= 12 ? 'bg-yellow-100 text-yellow-800' :
                                periodAverage >= 10 ? 'bg-orange-100 text-orange-800' :
                                periodAverage > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {periodAverage > 0 ? periodAverage.toFixed(2) : '-'}
                              </span>
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewStudentDetails(student)}
                            className="hover:bg-accent"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`px-3 py-1 rounded font-bold ${
                            annualAverage >= 16 ? 'bg-green-100 text-green-800' :
                            annualAverage >= 14 ? 'bg-blue-100 text-blue-800' :
                            annualAverage >= 12 ? 'bg-yellow-100 text-yellow-800' :
                            annualAverage >= 10 ? 'bg-orange-100 text-orange-800' :
                            annualAverage > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {annualAverage > 0 ? annualAverage.toFixed(2) : '-'}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Modal pour les détails de l'élève */}
        <Dialog open={showStudentDetails} onOpenChange={setShowStudentDetails}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>
                  Détails - {selectedStudent?.nom} {selectedStudent?.prenom}
                </DialogTitle>
                <Button onClick={handleDownloadStudentBulletin} className="bg-primary hover:bg-primary/90">
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </Button>
              </div>
            </DialogHeader>
            
            {selectedStudent && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Notes par matière</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Matière</TableHead>
                          <TableHead className="text-center">1er {schoolSystem === "trimestre" ? "Trimestre" : "Semestre"}</TableHead>
                          <TableHead className="text-center">2e {schoolSystem === "trimestre" ? "Trimestre" : "Semestre"}</TableHead>
                          <TableHead className="text-center">Moyenne Annuelle</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getStudentNotesForAllMatieres(selectedStudent.id).map(({ matiere, notes }) => {
                          const sem1Devoir = parseFloat(notes.semestre1.devoir) || 0;
                          const sem1Composition = parseFloat(notes.semestre1.composition) || 0;
                          const sem1Moyenne = sem1Devoir > 0 || sem1Composition > 0 ? (sem1Devoir + sem1Composition * 2) / 3 : 0;
                          
                          const sem2Devoir = parseFloat(notes.semestre2.devoir) || 0;
                          const sem2Composition = parseFloat(notes.semestre2.composition) || 0;
                          const sem2Moyenne = sem2Devoir > 0 || sem2Composition > 0 ? (sem2Devoir + sem2Composition * 2) / 3 : 0;
                          
                          const moyenneAnnuelle = sem1Moyenne > 0 && sem2Moyenne > 0 ? (sem1Moyenne + sem2Moyenne) / 2 : sem1Moyenne > 0 ? sem1Moyenne : sem2Moyenne;
                          
                          return (
                            <TableRow key={matiere.id}>
                              <TableCell className="font-medium">{matiere.nom}</TableCell>
                              <TableCell className="text-center">
                                <div className="space-y-1">
                                  <div className="text-xs text-muted-foreground">
                                    Devoir: {notes.semestre1.devoir || '-'} | Composition: {notes.semestre1.composition || '-'}
                                  </div>
                                  <div className={`px-2 py-1 rounded text-sm ${
                                    sem1Moyenne >= 16 ? 'bg-green-100 text-green-800' :
                                    sem1Moyenne >= 14 ? 'bg-blue-100 text-blue-800' :
                                    sem1Moyenne >= 12 ? 'bg-yellow-100 text-yellow-800' :
                                    sem1Moyenne >= 10 ? 'bg-orange-100 text-orange-800' :
                                    sem1Moyenne > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {sem1Moyenne > 0 ? sem1Moyenne.toFixed(2) : '-'}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="space-y-1">
                                  <div className="text-xs text-muted-foreground">
                                    Devoir: {notes.semestre2.devoir || '-'} | Composition: {notes.semestre2.composition || '-'}
                                  </div>
                                  <div className={`px-2 py-1 rounded text-sm ${
                                    sem2Moyenne >= 16 ? 'bg-green-100 text-green-800' :
                                    sem2Moyenne >= 14 ? 'bg-blue-100 text-blue-800' :
                                    sem2Moyenne >= 12 ? 'bg-yellow-100 text-yellow-800' :
                                    sem2Moyenne >= 10 ? 'bg-orange-100 text-orange-800' :
                                    sem2Moyenne > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {sem2Moyenne > 0 ? sem2Moyenne.toFixed(2) : '-'}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={`px-3 py-1 rounded font-bold ${
                                  moyenneAnnuelle >= 16 ? 'bg-green-100 text-green-800' :
                                  moyenneAnnuelle >= 14 ? 'bg-blue-100 text-blue-800' :
                                  moyenneAnnuelle >= 12 ? 'bg-yellow-100 text-yellow-800' :
                                  moyenneAnnuelle >= 10 ? 'bg-orange-100 text-orange-800' :
                                  moyenneAnnuelle > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {moyenneAnnuelle > 0 ? moyenneAnnuelle.toFixed(2) : '-'}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}