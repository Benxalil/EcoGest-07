
import React, { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChevronRight, ArrowLeft, Calendar, Book, FileText, Award, Settings, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useClasses } from "@/hooks/useClasses";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useResults } from "@/hooks/useResults";
import { formatClassName } from "@/utils/classNameFormatter";

interface Examen {
  id: string;
  titre: string;
  type: string;
  semestre?: string | null;
  anneeAcademique: string;
  dateExamen: string;
  classes: string[];
  dateCreation: string;
  statut: string;
}

export default function ListeClassesResultats() {
  const { classes, loading } = useClasses();
  const { schoolData: schoolSettings } = useSchoolData();
  const { results, loading: resultsLoading } = useResults();
  const [selectedClasse, setSelectedClasse] = useState<any>(null);
  const [classExamens, setClassExamens] = useState<Examen[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [schoolSystem, setSchoolSystem] = useState<string>("semestre");
  const navigate = useNavigate();

  // Fonction pour normaliser le niveau (gérer les variations d'écriture)
  // Extrait le niveau de base du nom de la classe (enlève la section)
  const normalizeLevel = (name: string): string => {
    if (!name) return '';
    
    // Extraire uniquement le niveau sans la section (par exemple "CE2 B" -> "CE2")
    const nameParts = name.trim().split(/\s+/);
    const levelPart = nameParts[0]; // Prendre la première partie (le niveau)
    
    // Enlever les espaces et mettre en majuscules pour la comparaison
    const normalized = levelPart.toUpperCase();
    
    // Mapper les variations vers le format standard
    const levelMap: { [key: string]: string } = {
      'CI': 'CI', 'CP': 'CP', 
      'CE1': 'CE1', 'CE 1': 'CE1',
      'CE2': 'CE2', 'CE 2': 'CE2',
      'CM1': 'CM1', 'CM 1': 'CM1',
      'CM2': 'CM2', 'CM 2': 'CM2',
      '6EME': '6ème', '6ÈME': '6ème', '6': '6ème',
      '5EME': '5ème', '5ÈME': '5ème', '5': '5ème',
      '4EME': '4ème', '4ÈME': '4ème', '4': '4ème',
      '3EME': '3ème', '3ÈME': '3ème', '3': '3ème',
      '2NDE': '2nde', 'SECONDE': '2nde', '2': '2nde',
      '1ERE': '1ère', '1ÈRE': '1ère', 'PREMIERE': '1ère', '1': '1ère',
      'TERMINALE': 'Terminale', 'TERM': 'Terminale', 'TLE': 'Terminale'
    };
    
    return levelMap[normalized] || levelPart;
  };

  // Fonction pour définir l'ordre académique des classes
  // Utilise le nom de la classe (pas le level qui contient "Primaire", "Collège", etc.)
  const getClassOrder = (name: string, section?: string): number => {
    const normalizedLevel = normalizeLevel(name);
    
    const levelOrder: { [key: string]: number } = {
      'CI': 1, 'CP': 2, 'CE1': 3, 'CE2': 4, 'CM1': 5, 'CM2': 6,
      '6ème': 7, '5ème': 8, '4ème': 9, '3ème': 10,
      '2nde': 11, '1ère': 12, 'Terminale': 13
    };
    
    const sectionOrder: { [key: string]: number } = {
      'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8, 'I': 9, 'J': 10
    };
    
    const levelNum = levelOrder[normalizedLevel] || 999;
    const sectionNum = section ? (sectionOrder[section.toUpperCase()] || 999) : 0;
    
    return levelNum * 100 + sectionNum;
  };

  // Fonction pour trier les classes dans l'ordre académique
  const sortClassesAcademically = (classes: any[]): any[] => {
    return [...classes].sort((a, b) => {
      // Utiliser a.name et b.name qui contiennent le vrai niveau (CI, CP, CE2, etc.)
      // et non a.level qui contient "Primaire", "Collège", "Lycée"
      const orderA = getClassOrder(a.name, a.section);
      const orderB = getClassOrder(b.name, b.section);
      
      console.log('Tri classe:', a.name, '(section:', a.section, ') -> ordre:', orderA);
      console.log('Tri classe:', b.name, '(section:', b.section, ') -> ordre:', orderB);
      
      // Si les ordres sont égaux, trier par nom comme fallback
      if (orderA === orderB) {
        return (a.name || '').localeCompare(b.name || '');
      }
      
      return orderA - orderB;
    });
  };

  useEffect(() => {
    if (schoolSettings?.semester_type) {
      setSchoolSystem(schoolSettings.semester_type === 'trimester' ? 'trimestre' : 'semestre');
    }
  }, [schoolSettings]);

  // Recharger les examens quand les résultats changent
  useEffect(() => {
    if (selectedClasse && results.length > 0) {
      loadExamensForClasse(selectedClasse.id);
    }
  }, [results, selectedClasse]);

  const loadExamensForClasse = (classeId: string) => {
    try {
      console.log('loadExamensForClasse: Chargement des examens pour la classe:', classeId);
      
      // Utiliser les données du hook useResults
      const classData = results.find(c => c.class_id === classeId);
      
      if (classData && classData.exams) {
        // Convertir les examens du hook vers le format attendu
        const examensClasse: Examen[] = classData.exams.map(exam => ({
          id: exam.exam_id,
          titre: exam.exam_title,
          type: exam.exam_title.toLowerCase().includes('composition') ? 'Composition' : 'Examen',
          semestre: 'semestre1', // Par défaut, on peut l'adapter selon les besoins
          anneeAcademique: new Date().getFullYear().toString(),
          dateExamen: exam.exam_date,
          classes: [classeId],
          dateCreation: new Date().toISOString(),
          statut: 'actif'
        }));
        
        console.log('loadExamensForClasse: Examens trouvés:', examensClasse.length);
        setClassExamens(examensClasse);
      } else {
        console.log('loadExamensForClasse: Aucun examen trouvé pour cette classe');
        setClassExamens([]);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des examens:", error);
      setClassExamens([]);
    }
  };

  const handleClasseClick = (classe: any) => {
    setSelectedClasse(classe);
    loadExamensForClasse(classe.id);
    setIsDialogOpen(true);
  };

  const handleConsulterExamen = (examen: Examen, semestre?: number) => {
    if (selectedClasse) {
      // Préparer les informations de l'examen pour sessionStorage
      const examInfo = {
        examId: examen.id,
        titre: examen.titre,
        examType: examen.type,
        examDate: examen.dateExamen,
        semestre: semestre || null,
        classeId: selectedClasse.id,
        classeName: formatClassName(selectedClasse)
      };

      // Sauvegarder dans sessionStorage
      sessionStorage.setItem('current_examen_notes', JSON.stringify(examInfo));
      
      // Navigation vers la page de résultats (même interface que pour les semestres)
      navigate(`/resultats/classe/${selectedClasse.id}/examen/${examen.id}`);
      setIsDialogOpen(false);
    }
  };

  const handleConsulterCompositionSemestre = (examen: Examen, semestre: number) => {
    if (selectedClasse) {
      // Pour les compositions, naviguer vers la page de résultats par semestre
      if (semestre === 999) { // "tous" les semestres
        navigate(`/resultats/classe/${selectedClasse.id}/tous`); } else {
        navigate(`/resultats/classe/${selectedClasse.id}/semestre/${semestre}`);
      }
      setIsDialogOpen(false);
    }
  };

  const getPeriodLabel = (period: number) => {
    if (schoolSystem === "trimestre") {
      return period === 1 ? "1er trimestre" : period === 2 ? "2e trimestre" : "3e trimestre";
    }
    return period === 1 ? "1er semestre" : "2e semestre";
  };

  const getNumberOfPeriods = () => {
    return schoolSystem === "trimestre" ? 3 : 2;
  };

  const getExamenIcon = (type: string) => {
    switch (type) {
      case 'Composition':
        return <Award className="h-4 w-4 text-purple-500" />;
      case 'Examen blanc':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'Essai':
        return <Book className="h-4 w-4 text-green-500" />;
      default:
        return <Calendar className="h-4 w-4 text-orange-500" />;
    }
  };

  const getExamenBadgeColor = (type: string) => {
    switch (type) {
      case 'Composition':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Examen blanc':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Essai':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-orange-100 text-orange-700 border-orange-200';
    }
  };

  // Si aucune classe n'a été créée
  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">Chargement des classes...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (classes.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold text-primary">Résultats par classe</h1>
            </div>
            <Button
              onClick={() => navigate("/resultats/gestion-publication")}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Gestion Publication
            </Button>
          </div>

          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-4">Aucune classe n'a été créée</p>
            <p className="text-muted-foreground mb-6">Commencez par créer des classes pour consulter les résultats</p>
            <Button onClick={() => navigate("/classes/ajouter")}>
              Créer une classe
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
              onClick={() => navigate(-1)}
              className="hover:bg-accent"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-primary">Résultats par classe</h1>
          </div>
          <Button
            onClick={() => navigate("/resultats/gestion-publication")}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Gestion Publication
          </Button>
        </div>

        <div className="space-y-3">
          {sortClassesAcademically(classes).map((classe) => (
            <Dialog key={classe.id} open={isDialogOpen && selectedClasse?.id === classe.id} onOpenChange={(open) => {
              if (!open) {
                setIsDialogOpen(false);
                setSelectedClasse(null);
              }
            }}>
              <DialogTrigger asChild>
                <div
                  className="flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:bg-accent transition-colors cursor-pointer group"
                  onClick={() => handleClasseClick(classe)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    <span className="text-lg font-medium text-foreground">
                      {formatClassName(classe)}
                    </span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </DialogTrigger>
              
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-center">
                    Examens disponibles - {formatClassName(classe)}
                  </DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  {resultsLoading ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                      <p className="text-muted-foreground text-lg mb-2">Chargement des examens...</p>
                      <p className="text-muted-foreground text-sm">
                        Récupération des examens disponibles pour cette classe
                      </p>
                    </div>
                  ) : classExamens.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground text-lg mb-2">Aucun examen créé pour cette classe</p>
                      <p className="text-muted-foreground text-sm mb-4">
                        Commencez par créer des examens pour consulter les résultats
                      </p>
                      <Button 
                        onClick={() => {
                          setIsDialogOpen(false);
                          navigate("/examens");
                        }}
                        className="bg-primary text-white hover:bg-primary/90"
                      >
                        Créer un examen
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                        <div className="flex items-center gap-2 text-primary">
                          <Book className="h-4 w-4" />
                          <span className="font-medium text-sm">
                            {classExamens.length} examen{classExamens.length > 1 ? 's' : ''} disponible{classExamens.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <p className="text-primary/80 text-xs mt-1">
                          Cliquez sur un examen pour consulter les résultats des élèves
                        </p>
                      </div>
                      
                      {classExamens.map((examen) => (
                        <div key={examen.id} className="border border-border rounded-lg p-4 hover:bg-accent transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              {getExamenIcon(examen.type)}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-semibold text-foreground">{examen.titre}</h3>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getExamenBadgeColor(examen.type)}`}>
                                    {examen.type}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(examen.dateExamen), 'dd MMMM yyyy', { locale: fr })}
                                  </div>
                                  <span className="text-muted-foreground">•</span>
                                  <span>{examen.anneeAcademique}</span>
                                </div>
                                <div className="mt-2 text-xs text-muted-foreground">
                                  Cliquez sur "Consulter" pour voir les notes des élèves
                                </div>
                              </div>
                            </div>
                            <div className="ml-4">
                              {examen.type === 'Composition' && examen.semestre ? (
                                // Pour les compositions, afficher les options de semestre
                                <div className="space-y-2">
                                  <div className={`grid gap-2 ${schoolSystem === "trimestre" ? "grid-cols-1" : "grid-cols-2"}`}>
                                    {Array.from({ length: getNumberOfPeriods() }, (_, index) => {
                                      const period = index + 1;
                                      return (
                                        <Button 
                                          key={period}
                                          size="sm"
                                          className="bg-green-500 hover:bg-green-600 text-white text-xs"
                                          onClick={() => handleConsulterCompositionSemestre(examen, period)}
                                        >
                                          {getPeriodLabel(period)}
                                        </Button>
                                      );
                                    })}
                                  </div>
                                  <Button 
                                    size="sm"
                                    variant="outline"
                                    className="w-full text-xs"
                                    onClick={() => handleConsulterCompositionSemestre(examen, 999)}
                                  >
                                    Tous les {schoolSystem === "trimestre" ? "trimestres" : "semestres"}
                                  </Button>
                                </div>
                              ) : (
                                // Pour les autres types d'examens, bouton direct
                                <Button 
                                  size="sm"
                                  className="bg-blue-500 hover:bg-blue-600 text-white"
                                  onClick={() => handleConsulterExamen(examen)}
                                >
                                  Consulter les notes
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      </div>
    </Layout>
  );
}
