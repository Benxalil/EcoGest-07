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

interface Student {
  id: string;
  nom: string;
  prenom: string;
  classe: string;
  numero?: string;
}

interface StudentWithStats extends Student {
  moyenneGenerale: number;
  rang: number;
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
      return examData?.exam_title || examInfo?.title || examInfo?.examTitle || "EXAMEN";
    }
    
    if (schoolSystem === 'trimestre') {
      switch(semestre) {
        case "1": return "PREMIER TRIMESTRE";
        case "2": return "DEUXIEME TRIMESTRE";  
        case "3": return "TROISIEME TRIMESTRE";
        default: return "PREMIER TRIMESTRE";
      }
    } else {
      switch(semestre) {
        case "1": return "PREMIER SEMESTRE";
        case "2": return "DEUXIEME SEMESTRE";
        default: return "PREMIER SEMESTRE";
      }
    }
  };

  // Fonction pour calculer les statistiques d'un élève (utilise le nouveau hook)
  const getEleveStatistics = (eleveId: string) => {
    if (!classeId || !examId) {
      return {
        totalNotes: 0,
        totalCoefficient: 0,
        moyenneGenerale: 0,
        notesList: [],
        totalNotesDevoir: 0,
        moyenneDevoir: 0,
        totalNotesComposition: 0,
        moyenneComposition: 0,
        isComposition: false
      };
    }

    const stats = getStudentExamStats(classeId, examId, eleveId);
    return stats || {
      totalNotes: 0,
      totalCoefficient: 0,
      moyenneGenerale: 0,
      notesList: [],
      totalNotesDevoir: 0,
      moyenneDevoir: 0,
      totalNotesComposition: 0,
      moyenneComposition: 0,
      isComposition: false
    };
  };

  // Fonction pour calculer le rang d'un élève
  const getEleveRank = (eleveId: string) => {
    const eleveStats = getEleveStatistics(eleveId);
    const eleveMoyenne = eleveStats.moyenneGenerale;
    
    let rank = 1;
    eleves.forEach(otherEleve => {
      if (otherEleve.id !== eleveId) {
        const otherStats = getEleveStatistics(otherEleve.id);
        if (otherStats.moyenneGenerale > eleveMoyenne) {
          rank++;
        }
      }
    });
    
    return rank;
  };

  // Fonction pour obtenir les élèves avec leurs statistiques et rangs
  const getElevesWithRank = (): StudentWithStats[] => {
    return eleves.map(eleve => {
      const stats = getEleveStatistics(eleve.id);
      const rang = getEleveRank(eleve.id);
      
      return {
        ...eleve,
        numero: eleve.numero || '0',
        moyenneGenerale: stats.moyenneGenerale,
        rang: rang
      };
    }).sort((a, b) => b.moyenneGenerale - a.moyenneGenerale);
  };

  const handleViewDetails = (eleve: Student) => {
    setSelectedEleve(eleve);
    setIsDialogOpen(true);
  };

  const handleGeneratePDF = async () => {
    if (!classe || !eleves.length) return;
    
    try {
      const elevesWithStats = getElevesWithRank();
      await generateBulletinPDF(classe as any, elevesWithStats as any, getSemestreLabel());
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
    }
  };

  const getGradeColor = (note: number) => {
    if (note >= 16) return "text-green-600 font-semibold";
    if (note >= 14) return "text-blue-600 font-semibold";
    if (note >= 12) return "text-yellow-600 font-semibold";
    if (note >= 10) return "text-orange-600 font-semibold";
    return "text-red-600 font-semibold";
  };

  // Affichage de chargement
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Chargement des résultats...</span>
        </div>
      </Layout>
    );
  }

  // Affichage d'erreur
  if (error) {
    return (
      <Layout>
        <div className="text-center text-red-500 p-6">
          <p>Erreur lors du chargement des résultats: {error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Réessayer
          </Button>
        </div>
      </Layout>
    );
  }

  // Vérification des données
  if (!classe || !examData) {
    return (
      <Layout>
        <div className="text-center text-gray-500 p-6">
          <p>Aucune donnée trouvée pour cette classe ou cet examen.</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{getSemestreLabel()}</h1>
              <p className="text-gray-600">
                {classe.session} {classe.libelle} - {classe.effectif} élèves
              </p>
              {isExamView && examData && (
                <p className="text-sm text-gray-500">
                  Date: {new Date(examData.exam_date).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleCalculRang}
              className="flex items-center"
            >
              <Calculator className="h-4 w-4 mr-2" />
              {showCalculatedRank ? "Masquer" : "Calculer"} Rang
            </Button>
            
            <Button
              variant="outline"
              onClick={handleBulletinClasse}
              className="flex items-center"
            >
              <FileText className="h-4 w-4 mr-2" />
              Bulletin Classe
            </Button>
            
            <Button
              onClick={handleGeneratePDF}
              className="flex items-center"
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimer
            </Button>
          </div>
        </div>

        {/* Tableau des résultats */}
        <div className="bg-white rounded-lg shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                {showCalculatedRank && <TableHead className="w-16">Rang</TableHead>}
                <TableHead>Nom & Prénom</TableHead>
                {(isExamView && examData?.exam_title.toLowerCase().includes('composition')) ? (
                  <>
                    <TableHead className="w-32 text-center">Total Devoir</TableHead>
                    <TableHead className="w-32 text-center">Moy. Devoir</TableHead>
                    <TableHead className="w-32 text-center">Total Composition</TableHead>
                    <TableHead className="w-32 text-center">Moy. Composition</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="w-32 text-center">Notes</TableHead>
                    <TableHead className="w-32 text-center">Moyenne</TableHead>
                  </>
                )}
                <TableHead className="w-20 text-center">Actions</TableHead>
                <TableHead className="w-32 text-center">Moy. Générale</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getElevesWithRank().map((eleve, index) => {
                const stats = getEleveStatistics(eleve.id);
                return (
                  <TableRow key={eleve.id}>
                    <TableCell className="font-medium">{eleve.numero || index + 1}</TableCell>
                    {showCalculatedRank && <TableCell className="font-medium">{eleve.rang}</TableCell>}
                    <TableCell className="font-medium">{eleve.prenom} {eleve.nom}</TableCell>
                    {(isExamView && examData?.exam_title.toLowerCase().includes('composition')) ? (
                      <>
                        <TableCell className="text-center">{stats.totalNotesDevoir.toFixed(2)}</TableCell>
                        <TableCell className="text-center">{stats.moyenneDevoir.toFixed(2)}</TableCell>
                        <TableCell className="text-center">{stats.totalNotesComposition.toFixed(2)}</TableCell>
                        <TableCell className="text-center">{stats.moyenneComposition.toFixed(2)}</TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="text-center">{stats.notesList.map(n => n.note.toFixed(2)).join(', ')}</TableCell>
                        <TableCell className="text-center">{stats.moyenneGenerale.toFixed(2)}</TableCell>
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
                    <TableCell className="text-center">
                      <span className={getGradeColor(stats.moyenneGenerale)}>
                        {stats.moyenneGenerale.toFixed(2)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Dialog pour les détails d'un élève */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Détails - {selectedEleve?.prenom} {selectedEleve?.nom}
              </DialogTitle>
            </DialogHeader>
            
            {selectedEleve && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">Informations</h3>
                    <p><strong>Classe:</strong> {selectedEleve.classe}</p>
                    <p><strong>Numéro:</strong> {selectedEleve.numero || 'N/A'}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Statistiques</h3>
                    {(() => {
                      const stats = getEleveStatistics(selectedEleve.id);
                      return (
                        <>
                          <p><strong>Moyenne Générale:</strong> {stats.moyenneGenerale.toFixed(2)}/20</p>
                          <p><strong>Rang:</strong> {getEleveRank(selectedEleve.id)}</p>
                        </>
                      );
                    })()}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Notes par matière</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Matière</TableHead>
                        <TableHead className="text-center">Note</TableHead>
                        <TableHead className="text-center">Coefficient</TableHead>
                        <TableHead className="text-center">Moyenne</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matieresClasse.map(matiere => {
                        const stats = getEleveStatistics(selectedEleve.id);
                        const matiereNote = stats.notesList.find(n => n.subject === matiere.nom);
                        return (
                          <TableRow key={matiere.id}>
                            <TableCell className="font-medium">{matiere.nom}</TableCell>
                            <TableCell className="text-center">
                              {matiereNote ? matiereNote.note.toFixed(2) : '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              {matiereNote ? matiereNote.coefficient : '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              {matiereNote ? (
                                <span className={getGradeColor(matiereNote.note)}>
                                  {matiereNote.note.toFixed(2)}
                                </span>
                              ) : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Bulletin de classe */}
        {showBulletinClasse && classe && (
          <BulletinClasse
            classe={classe}
            eleves={getElevesWithRank()}
            semestre={getSemestreLabel()}
            onClose={() => setShowBulletinClasse(false)}
          />
        )}
      </div>
    </Layout>
  );
}
