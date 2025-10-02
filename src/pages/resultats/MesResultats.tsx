import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronRight, ArrowLeft, Calendar, Book, Award, FileText, Loader2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useUserRole } from "@/hooks/useUserRole";
import { useStudents } from "@/hooks/useStudents";
import { supabase } from "@/integrations/supabase/client";

interface Examen {
  id: string;
  titre: string;
  type: string;
  dateExamen: string;
  is_published: boolean;
  statut: string;
  anneeAcademique: string;
  dateCreation: string;
}

interface StudentClass {
  id: string;
  name: string;
  level: string;
  section: string;
}

export default function MesResultats() {
  const navigate = useNavigate();
  const { userProfile } = useUserRole();
  const { students } = useStudents();
  const [studentClass, setStudentClass] = useState<StudentClass | null>(null);
  const [classExamens, setClassExamens] = useState<Examen[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    loadStudentData();
  }, [userProfile, students]);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      
      if (!students || !userProfile) return;
      
      const student = students.find((s) => 
        s.parent_email === userProfile.email || 
        `${s.first_name} ${s.last_name}`.toLowerCase() === `${userProfile.firstName} ${userProfile.lastName}`.toLowerCase()
      );
      
      if (!student || !student.class_id) {
        setLoading(false);
        return;
      }

      setStudentId(student.id);

      // Charger les informations de la classe
      const { data: classData, error } = await supabase
        .from('classes')
        .select('*')
        .eq('id', student.class_id)
        .single();

      if (error) throw error;

      if (classData) {
        setStudentClass({
          id: classData.id,
          name: classData.name,
          level: classData.level,
          section: classData.section || ''
        });
      }
    } catch (error) {
      console.error("Erreur lors du chargement des données de l'élève:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClassClick = async () => {
    if (!studentClass) return;

    try {
      // Charger les examens de la classe
      const { data: examsData, error } = await supabase
        .from('exams')
        .select('*')
        .eq('class_id', studentClass.id)
        .order('exam_date', { ascending: false });

      if (error) throw error;

      if (examsData) {
        const examensFormatted: Examen[] = examsData.map(exam => ({
          id: exam.id,
          titre: exam.title,
          type: exam.title.toLowerCase().includes('composition') ? 'Composition' : 'Examen',
          dateExamen: exam.exam_date,
          is_published: exam.is_published,
          statut: exam.is_published ? 'publié' : 'non publié',
          anneeAcademique: new Date().getFullYear().toString(),
          dateCreation: exam.created_at
        }));
        
        setClassExamens(examensFormatted);
        setIsDialogOpen(true);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des examens:", error);
      setClassExamens([]);
    }
  };

  const handleConsulterExamen = (examen: Examen) => {
    if (!examen.is_published) {
      // Afficher un message d'alerte pour examen non publié
      return;
    }

    if (studentClass && studentId) {
      // Naviguer vers la page de détails de l'examen pour cet élève
      navigate(`/resultats/eleve/${studentId}/examen/${examen.id}`);
      setIsDialogOpen(false);
    }
  };

  const getExamenIcon = (type: string) => {
    switch (type) {
      case 'Composition':
        return <Award className="h-4 w-4 text-purple-500" />;
      case 'Examen blanc':
        return <FileText className="h-4 w-4 text-blue-500" />;
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
      default:
        return 'bg-orange-100 text-orange-700 border-orange-200';
    }
  };

  const getGradeColor = (note: number) => {
    if (note >= 16) return "text-green-600 font-semibold";
    if (note >= 14) return "text-blue-600 font-semibold";
    if (note >= 12) return "text-yellow-600 font-semibold";
    if (note >= 10) return "text-orange-600 font-semibold";
    return "text-red-600 font-semibold";
  };

  if (loading) {
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

  if (!studentClass) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <AlertCircle className="h-16 w-16 text-orange-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">Aucune classe trouvée</h3>
            <p className="text-gray-500">
              Vous n'êtes pas encore inscrit dans une classe.
            </p>
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
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-primary">Résultats</h1>
          </div>
        </div>

        {/* Affichage de la classe de l'élève */}
        <div className="space-y-3">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <div
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
              onClick={handleClassClick}
            >
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-lg font-medium text-gray-700">
                  {studentClass.name} {studentClass.level}{studentClass.section ? ` - ${studentClass.section}` : ''}
                </span>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
            </div>
            
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-center">
                  Examens disponibles - {studentClass.name} {studentClass.level}{studentClass.section ? ` - ${studentClass.section}` : ''}
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                {classExamens.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg mb-2">Aucun examen créé pour cette classe</p>
                    <p className="text-gray-400 text-sm">
                      Aucun examen n'a encore été créé pour votre classe.
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
                              {!examen.is_published && (
                                <div className="mt-2 text-xs text-orange-600 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Les résultats ne sont pas encore disponibles
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="ml-4">
                            {examen.is_published ? (
                              <Button 
                                size="sm"
                                className="bg-blue-500 hover:bg-blue-600 text-white"
                                onClick={() => handleConsulterExamen(examen)}
                              >
                                Consulter
                              </Button>
                            ) : (
                              <Button 
                                size="sm"
                                variant="outline"
                                disabled
                                className="cursor-not-allowed"
                              >
                                Non publié
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
        </div>
      </div>
    </Layout>
  );
}