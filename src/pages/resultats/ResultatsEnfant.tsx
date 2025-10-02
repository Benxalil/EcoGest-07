import React, { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChevronRight, ArrowLeft, Calendar, Book, Award, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useParentChildren } from "@/hooks/useParentChildren";
import { ParentChildSelector } from "@/components/parent/ParentChildSelector";
import { useResults } from "@/hooks/useResults";

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

export default function ResultatsEnfant() {
  const navigate = useNavigate();
  const { children, selectedChild, setSelectedChildId, loading: childrenLoading } = useParentChildren();
  const { results, loading: resultsLoading } = useResults();
  const [selectedClasse, setSelectedClasse] = useState<any>(null);
  const [classExamens, setClassExamens] = useState<Examen[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Obtenir les classes uniques des enfants du parent
  const childrenClasses = React.useMemo(() => {
    const uniqueClasses = new Map();
    children.forEach(child => {
      if (child.classes) {
        const classId = child.classes.id;
        if (!uniqueClasses.has(classId)) {
          uniqueClasses.set(classId, {
            id: classId,
            name: child.classes.name,
            level: child.classes.level,
            section: child.classes.section
          });
        }
      }
    });
    return Array.from(uniqueClasses.values());
  }, [children]);

  // Charger les examens quand les résultats changent
  useEffect(() => {
    if (selectedClasse && results.length > 0) {
      loadExamensForClasse(selectedClasse.id);
    }
  }, [results, selectedClasse]);

  const loadExamensForClasse = (classeId: string) => {
    try {
      // Utiliser les données du hook useResults
      const classData = results.find(c => c.class_id === classeId);
      
      if (classData && classData.exams) {
        // Convertir les examens du hook vers le format attendu
        // Filtrer uniquement les examens publiés
        const examensClasse: Examen[] = classData.exams
          .filter(exam => exam.is_published) // Filtrer les examens publiés
          .map(exam => ({
            id: exam.exam_id,
            titre: exam.exam_title,
            type: exam.exam_title.toLowerCase().includes('composition') ? 'Composition' : 'Examen',
            semestre: 'semestre1',
            anneeAcademique: new Date().getFullYear().toString(),
            dateExamen: exam.exam_date,
            classes: [classeId],
            dateCreation: new Date().toISOString(),
            statut: 'actif'
          }));
        
        setClassExamens(examensClasse);
      } else {
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

  const handleConsulterExamen = (examen: Examen) => {
    if (selectedClasse && selectedChild) {
      // Navigation vers les détails de l'élève pour cet examen
      navigate(`/resultats/eleve/${selectedChild.id}/examen/${examen.id}`);
      setIsDialogOpen(false);
    }
  };

  const getExamenIcon = (type: string) => {
    switch (type) {
      case 'Composition':
        return <Award className="h-4 w-4 text-purple-500" />;
      default:
        return <Calendar className="h-4 w-4 text-orange-500" />;
    }
  };

  const getExamenBadgeColor = (type: string) => {
    switch (type) {
      case 'Composition':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-orange-100 text-orange-700 border-orange-200';
    }
  };

  // Chargement
  if (childrenLoading || resultsLoading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Chargement des résultats...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Aucun enfant trouvé
  if (children.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Aucun enfant trouvé</p>
            </div>
          </Card>
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
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-primary">Résultats de mes enfants</h1>
          </div>
        </div>

        {/* Sélecteur d'enfant si plusieurs enfants */}
        <ParentChildSelector 
          children={children} 
          selectedChildId={selectedChild?.id || null} 
          onChildSelect={setSelectedChildId}
        />

        {/* Affichage du nom de l'enfant sélectionné */}
        {selectedChild && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-700">
              <Book className="h-4 w-4" />
              <span className="font-medium">
                Consultation des résultats de {selectedChild.first_name} {selectedChild.last_name}
                {selectedChild.classes && ` - ${selectedChild.classes.name} ${selectedChild.classes.level}`}
              </span>
            </div>
          </div>
        )}

        {/* Liste des classes des enfants */}
        {childrenClasses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">Aucune classe assignée à vos enfants</p>
          </div>
        ) : (
          <div className="space-y-3">
            {childrenClasses.map((classe) => (
              <Dialog key={classe.id} open={isDialogOpen && selectedClasse?.id === classe.id} onOpenChange={(open) => {
                if (!open) {
                  setIsDialogOpen(false);
                  setSelectedClasse(null);
                }
              }}>
                <DialogTrigger asChild>
                  <div
                    className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
                    onClick={() => handleClasseClick(classe)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-lg font-medium text-gray-700">
                        {classe.name} {classe.level}{classe.section ? ` - ${classe.section}` : ''}
                      </span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                </DialogTrigger>
                
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-center">
                      Examens disponibles - {classe.name} {classe.level}{classe.section ? ` - ${classe.section}` : ''}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    {resultsLoading ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg mb-2">Chargement des examens...</p>
                      </div>
                    ) : classExamens.length === 0 ? (
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg mb-2">Aucun examen publié pour cette classe</p>
                        <p className="text-gray-400 text-sm">
                          Les résultats seront disponibles une fois que l'administrateur les aura publiés
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-2 text-blue-700">
                            <Book className="h-4 w-4" />
                            <span className="font-medium text-sm">
                              {classExamens.length} examen{classExamens.length > 1 ? 's' : ''} disponible{classExamens.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          <p className="text-blue-600 text-xs mt-1">
                            Cliquez sur un examen pour consulter les résultats
                          </p>
                        </div>
                        
                        {classExamens.map((examen) => (
                          <div key={examen.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                {getExamenIcon(examen.type)}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h3 className="font-semibold text-gray-900">{examen.titre}</h3>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getExamenBadgeColor(examen.type)}`}>
                                      {examen.type}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-gray-600">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {format(new Date(examen.dateExamen), 'dd MMMM yyyy', { locale: fr })}
                                    </div>
                                    <span className="text-gray-400">•</span>
                                    <span>{examen.anneeAcademique}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="ml-4">
                                <Button 
                                  size="sm"
                                  className="bg-blue-500 hover:bg-blue-600 text-white"
                                  onClick={() => handleConsulterExamen(examen)}
                                >
                                  Consulter les notes
                                </Button>
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
        )}
      </div>
    </Layout>
  );
}
