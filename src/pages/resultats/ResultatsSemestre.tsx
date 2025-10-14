import React, { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, FileText, Printer, Calculator, Eye, Loader2, RefreshCw } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { generateBulletinPDF } from "@/utils/pdfGenerator";
import { BulletinClasse } from "@/components/resultats/BulletinClasse";
import { useResults } from "@/hooks/useResults";
import { useUserRole } from "@/hooks/useUserRole";
import { formatClassName } from "@/utils/classNameFormatter";

interface Student {
  id: string;
  nom: string;
  prenom: string;
  classe: string;
  numero?: number;
  matricule?: string;
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
  
  // Fonction utilitaire pour normaliser le semestre de l'URL au format DB
  const normalizeSemester = (sem: string | undefined): string | undefined => {
    if (!sem) return undefined;
    // Convertir vers le format utilisé dans la DB: '1er_semestre' ou '2eme_semestre'
    if (sem === '1' || sem === 'semestre1' || sem === '1er_semestre') return '1er_semestre';
    if (sem === '2' || sem === 'semestre2' || sem === '2eme_semestre') return '2eme_semestre';
    return sem;
  };

  // Normaliser le semestre depuis l'URL
  const normalizedSemestre = normalizeSemester(semestre);
  
  console.log(`🔄 Normalisation semestre: URL="${semestre}" → DB="${normalizedSemestre}"`);
  
  // Utiliser le nouveau hook useResults avec fonction refetch et contexte semestre normalisé
  const { results, loading, error, getStudentExamStats, getClassResults, getExamResults, refetch } = useResults({
    contextSemester: normalizedSemestre // Passer le semestre NORMALISÉ pour filtrer les notes de Composition
  });
  const { userProfile } = useUserRole();
  
  // Récupérer les données de la classe et de l'examen
  const classData = getClassResults(classeId || '');
  const examData = isExamView ? getExamResults(classeId || '', examId || '') : null;
  
  // Logique de sélection d'examen améliorée avec semestre normalisé
  const activeExamData = isExamView 
    ? examData
    : normalizedSemestre && classData?.exams 
      ? classData.exams.find(exam => {
          const isComposition = exam.exam_title?.toLowerCase().includes('composition');
          // Matcher par semester si disponible, sinon accepter toute Composition
          const matchesSemester = exam.semester 
            ? exam.semester === normalizedSemestre  // ✅ Comparaison avec semestre normalisé
            : isComposition; // Si semester est NULL, accepter si c'est une Composition
          
          console.log(`🔍 Vérification examen "${exam.exam_title}":`, {
            examSemester: exam.semester,
            normalizedSemestre,
            isComposition,
            matchesSemester
          });
          
          return isComposition && matchesSemester;
        }) || null
      : (classData?.exams && classData.exams.length > 0 ? classData.exams[0] : null);

  console.log(`📚 Examen sélectionné:`, activeExamData);

  // Détecter si c'est une vue Composition (basé sur le paramètre semestre normalisé)
  const isCompositionView = !isExamView && !!normalizedSemestre;
  
  // Adapter les données pour la compatibilité avec l'interface existante
  const classe = classData ? {
    id: classData.class_id,
    session: classData.class_level,
    libelle: classData.class_section,
    effectif: classData.effectif
  } : null;
  
  const eleves = activeExamData ? activeExamData.students.map(student => ({
    id: student.student_id,
    nom: student.last_name,
    prenom: student.first_name,
    classe: `${student.class_level} ${student.class_section}`,
    numero: typeof student.numero === 'number' ? student.numero : 0,
    matricule: student.student_number || 'N/A'
  })) : [];
  
  const matieresClasse = activeExamData ? activeExamData.subjects.map(subject => ({
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
      // Pour les examens, afficher le nom exact de l'examen
      return activeExamData?.exam_title || examInfo?.title || examInfo?.examTitle || "EXAMEN";
    }
    
    // Pour les vues Composition, afficher "Composition - Xème Semestre"
    if (isCompositionView) {
      if (schoolSystem === 'trimestre') {
        switch(semestre) {
          case "1": return "COMPOSITION - PREMIER TRIMESTRE";
          case "2": return "COMPOSITION - DEUXIEME TRIMESTRE";  
          case "3": return "COMPOSITION - TROISIEME TRIMESTRE";
          default: return "COMPOSITION - PREMIER TRIMESTRE";
        }
      } else {
        switch(semestre) {
          case "1": return "COMPOSITION - PREMIER SEMESTRE";
          case "2": return "COMPOSITION - DEUXIEME SEMESTRE";
          default: return "COMPOSITION - PREMIER SEMESTRE";
        }
      }
    }
    
    // Pour les autres vues (normalement ne devrait pas arriver)
    return "RESULTATS";
  };

  // Fonction pour calculer les statistiques d'un élève (utilise le nouveau hook)
  const getEleveStatistics = (eleveId: string) => {
    if (!classeId || !activeExamData?.exam_id) {
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

    const stats = getStudentExamStats(classeId, activeExamData.exam_id, eleveId);
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
      // Créer un objet classe compatible pour generateBulletinPDF
      const classeForPDF = {
        id: classe.id,
        session: classe.session,
        libelle: classe.libelle,
        effectif: classe.effectif
      };
      
      // Générer un PDF pour chaque élève
      for (const eleve of elevesWithStats) {
        const eleveForPDF: Student = {
          id: eleve.id,
          nom: eleve.nom,
          prenom: eleve.prenom,
          classe: eleve.classe,
          numero: eleve.numero
        };
        await generateBulletinPDF(eleveForPDF, classeForPDF, getSemestreLabel());
      }
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
    }
  };

  const handleGeneratePDFForStudent = async (eleve: Student) => {
    if (!classe) return;
    
    try {
      // Créer un objet classe compatible pour generateBulletinPDF
      const classeForPDF = {
        id: classe.id,
        session: classe.session,
        libelle: classe.libelle,
        effectif: classe.effectif
      };
      
      // Générer le PDF pour l'élève spécifique
      await generateBulletinPDF(eleve, classeForPDF, getSemestreLabel());
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
  if (!classe || !activeExamData) {
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
              <h1 className="text-2xl font-bold">{formatClassName({ name: classe.session, section: classe.libelle })}</h1>
              <p className="text-muted-foreground">
                Liste des élèves pour cette classe (Nombre d'élèves : {eleves.length})
              </p>
              {isExamView && activeExamData && (
                <p className="text-sm text-muted-foreground">
                  Date: {new Date(activeExamData.exam_date).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                console.log('🔄 Rafraîchissement manuel déclenché par l\'utilisateur');
                refetch();
              }}
              className="flex items-center bg-green-500 hover:bg-green-600 text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
            
            <Button
              variant="outline"
              onClick={handleBulletinClasse}
              className="flex items-center bg-orange-500 hover:bg-orange-600 text-white"
            >
              <FileText className="h-4 w-4 mr-2" />
              Bulletin du Classe
            </Button>
            
            <Button
              variant="outline"
              onClick={handleCalculRang}
              className="flex items-center bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Calcul du Rang
            </Button>
          </div>
        </div>

        {/* Tableau des résultats avec format original */}
        <div className="bg-card rounded-lg shadow border border-border">
          {/* Barre bleue avec titre du semestre/examen */}
          <div className="bg-primary text-primary-foreground text-center py-3 rounded-t-lg">
            <h2 className="text-lg font-semibold uppercase">{getSemestreLabel()}</h2>
          </div>
          
          {/* Barre noire avec "Tous les bulletins" */}
          <div className="bg-foreground text-background text-center py-2">
            <span className="text-sm font-medium">Tous les bulletins</span>
          </div>
          
          <Table>
            <TableHeader>
              {/* Première ligne d'en-tête */}
              <TableRow className="bg-muted">
                <TableHead className="w-12 text-center font-bold">N°</TableHead>
                {showCalculatedRank && <TableHead className="w-16 text-center font-bold">Rang</TableHead>}
                <TableHead className="font-bold">Nom et Prénom</TableHead>
                
                {isCompositionView ? (
                  <>
                    <TableHead className="text-center font-bold bg-primary/10 border-r-2 border-border">Devoir</TableHead>
                    <TableHead className="text-center font-bold bg-secondary/10">Composition</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="text-center font-bold">
                      {activeExamData?.exam_title || 'Note'}
                    </TableHead>
                  </>
                )}
                
                <TableHead className="w-20 text-center font-bold">Action</TableHead>
                <TableHead className="w-48 text-center font-bold">Bulletins de notes</TableHead>
              </TableRow>
              
              {/* Deuxième ligne d'en-tête pour les examens de composition */}
              {isCompositionView && (
                <TableRow className="bg-muted/50">
                  <TableHead className="border-b"></TableHead>
                  {showCalculatedRank && <TableHead className="border-b"></TableHead>}
                  <TableHead className="border-b"></TableHead>
                  <TableHead className="text-center bg-primary/10 border-r-2 border-b border-border">
                    <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                      <span>Notes</span>
                      <span>Moyenne</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center bg-secondary/10 border-b">
                    <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                      <span>Notes</span>
                      <span>Moyenne</span>
                    </div>
                  </TableHead>
                  <TableHead className="border-b"></TableHead>
                  <TableHead className="border-b"></TableHead>
                </TableRow>
              )}
            </TableHeader>
            <TableBody>
              {getElevesWithRank().map((eleve, index) => {
                const stats = getEleveStatistics(eleve.id);
                const hasNotes = stats.notesList.length > 0;
                
                console.log(`📊 Affichage élève ${eleve.prenom} ${eleve.nom}:`, {
                  moyenneDevoir: stats.moyenneDevoir,
                  moyenneComposition: stats.moyenneComposition,
                  moyenneGenerale: stats.moyenneGenerale,
                  isComposition: stats.isComposition,
                  notesCount: stats.notesList.length
                });
                
                return (
                  <TableRow key={eleve.id} className="hover:bg-accent/50">
                    <TableCell className="text-center font-medium">{eleve.numero || index + 1}</TableCell>
                    {showCalculatedRank && (
                      <TableCell className="text-center font-bold text-primary">
                        {eleve.rang}
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{eleve.prenom} {eleve.nom}</TableCell>
                    
                    {isCompositionView ? (
                      <>
                        {/* Colonne Devoir */}
                        <TableCell className="text-center bg-blue-50 border-r-2 border-gray-300">
                          <div className="grid grid-cols-2 gap-2">
                            {/* Total des notes devoir */}
                            <div className="text-sm font-semibold text-gray-700">
                              {(() => {
                                const devoirNotesSum = stats.notesList
                                  .filter(note => note.devoirNote && note.devoirNote > 0)
                                  .reduce((sum, note) => sum + (note.devoirNote || 0), 0);
                                const maxTotal = 20 * stats.notesList.filter(n => n.devoirNote).length;
                                return devoirNotesSum > 0 ? `${devoirNotesSum.toFixed(1)} / ${maxTotal}` : "-";
                              })()}
                            </div>
                            {/* Moyenne devoir */}
                            <div className={`text-sm font-bold ${stats.moyenneDevoir > 0 ? getGradeColor(stats.moyenneDevoir) : "text-gray-400"}`}>
                              {stats.moyenneDevoir > 0 ? `${stats.moyenneDevoir.toFixed(2)} / 20` : "-"}
                            </div>
                          </div>
                        </TableCell>
                        
                        {/* Colonne Composition */}
                        <TableCell className="text-center bg-green-50">
                          <div className="grid grid-cols-2 gap-2">
                            {/* Total des notes composition */}
                            <div className="text-sm font-semibold text-gray-700">
                              {(() => {
                                const compositionNotesSum = stats.notesList
                                  .filter(note => note.compositionNote && note.compositionNote > 0)
                                  .reduce((sum, note) => sum + (note.compositionNote || 0), 0);
                                const maxTotal = 20 * stats.notesList.filter(n => n.compositionNote).length;
                                return compositionNotesSum > 0 ? `${compositionNotesSum.toFixed(1)} / ${maxTotal}` : "-";
                              })()}
                            </div>
                            {/* Moyenne composition */}
                            <div className={`text-sm font-bold ${stats.moyenneComposition > 0 ? getGradeColor(stats.moyenneComposition) : "text-gray-400"}`}>
                              {stats.moyenneComposition > 0 ? `${stats.moyenneComposition.toFixed(2)} / 20` : "-"}
                            </div>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        {/* Pour les examens non-composition : afficher seulement la moyenne générale */}
                        <TableCell className="text-center">
                          {hasNotes ? (
                            <div className="flex flex-col items-center py-2">
                              <span className={`text-lg font-bold ${getGradeColor(stats.moyenneGenerale)}`}>
                                {stats.moyenneGenerale.toFixed(2)} / 20
                              </span>
                              <span className="text-xs text-gray-500 mt-1">
                                ({stats.notesList.length} matière{stats.notesList.length > 1 ? 's' : ''})
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Aucune note</span>
                          )}
                        </TableCell>
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
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleGeneratePDFForStudent(eleve)}
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
                    <p><strong>Matricule:</strong> {selectedEleve.matricule || 'N/A'}</p>
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
                      <TableRow className="bg-blue-600 text-white">
                        <TableHead className="text-white font-bold">Matière</TableHead>
                        {(activeExamData?.exam_title?.toLowerCase().includes('composition')) ? (
                          <>
                            <TableHead className="text-white font-bold text-center">Note Devoir</TableHead>
                            <TableHead className="text-white font-bold text-center">Note Composition</TableHead>
                          </>
                        ) : (
                          <TableHead className="text-white font-bold text-center">Note</TableHead>
                        )}
                        <TableHead className="text-white font-bold text-center">Coefficient</TableHead>
                        <TableHead className="text-white font-bold text-center">Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matieresClasse.map(matiere => {
                        const stats = getEleveStatistics(selectedEleve.id);
                        const matiereNote = stats.notesList.find(n => n.subject === matiere.nom);
                        return (
                          <TableRow key={matiere.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium">{matiere.nom}</TableCell>
                            
                            {(activeExamData?.exam_title?.toLowerCase().includes('composition')) ? (
                              <>
                                <TableCell className="text-center">
                                  <span className={matiereNote?.devoirNote ? getGradeColor(matiereNote.devoirNote) : "text-gray-400"}>
                                    {matiereNote?.devoirNote ? matiereNote.devoirNote.toFixed(2) : '-'}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className={matiereNote?.compositionNote ? getGradeColor(matiereNote.compositionNote) : "text-gray-400"}>
                                    {matiereNote?.compositionNote ? matiereNote.compositionNote.toFixed(2) : '-'}
                                  </span>
                                </TableCell>
                              </>
                            ) : (
                              <TableCell className="text-center">
                                <span className={matiereNote ? getGradeColor(matiereNote.note) : "text-gray-400"}>
                                  {matiereNote ? matiereNote.note.toFixed(2) : '-'}
                                </span>
                              </TableCell>
                            )}
                            
                            <TableCell className="text-center">
                              {matiereNote ? matiereNote.coefficient : '-'}
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {matiereNote ? (
                                (matiereNote.note * matiereNote.coefficient).toFixed(2)
                              ) : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {/* Résumé des calculs */}
                  <div className="bg-gray-50 p-4 border rounded-lg mt-4">
                    {(() => {
                      const stats = getEleveStatistics(selectedEleve.id);
                      return (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                          {(activeExamData?.exam_title?.toLowerCase().includes('composition')) && (
                            <>
                              <div>
                                <p className="text-sm text-gray-600">Moyenne Devoir</p>
                                <p className={`text-lg font-bold ${stats.moyenneDevoir > 0 ? getGradeColor(stats.moyenneDevoir) : "text-gray-400"}`}>
                                  {stats.moyenneDevoir > 0 ? stats.moyenneDevoir.toFixed(2) : "-"}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Moyenne Composition</p>
                                <p className={`text-lg font-bold ${stats.moyenneComposition > 0 ? getGradeColor(stats.moyenneComposition) : "text-gray-400"}`}>
                                  {stats.moyenneComposition > 0 ? stats.moyenneComposition.toFixed(2) : "-"}
                                </p>
                              </div>
                            </>
                          )}
                          <div>
                            <p className="text-sm text-gray-600">Total Points</p>
                            <p className="text-lg font-bold">{stats.totalNotes.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Moyenne Générale</p>
                            <p className={`text-xl font-bold ${getGradeColor(stats.moyenneGenerale)}`}>
                              {stats.moyenneGenerale.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Bulletin de classe dans un modal */}
        <Dialog open={showBulletinClasse} onOpenChange={setShowBulletinClasse}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Bulletin de la classe - {classe?.session} {classe?.libelle}
              </DialogTitle>
            </DialogHeader>
            
            {classe && (
              <BulletinClasse
                classe={classe}
                eleves={getElevesWithRank() as any}
                semestre={getSemestreLabel()}
                matieresClasse={matieresClasse}
                schoolSystem={schoolSystem}
                classeId={classe.id}
                examId={activeExamData?.exam_id}
                examData={activeExamData}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
