import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, ChevronRight, Calendar, Book, Award, FileText, Loader2, Eye, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useUserRole } from "@/hooks/useUserRole";
import { useStudents } from "@/hooks/useStudents";
import { useResults } from "@/hooks/useResults";
import { supabase } from "@/integrations/supabase/client";

interface Examen {
  id: string;
  titre: string;
  type: string;
  dateExamen: string;
  is_published: boolean;
  statut: string;
}

export default function MesResultats() {
  const navigate = useNavigate();
  const { userProfile } = useUserRole();
  const { students } = useStudents();
  const { results: resultsData, loading: resultsLoading, getStudentExamStats } = useResults();
  const [studentClassId, setStudentClassId] = useState<string | null>(null);
  const [classExamens, setClassExamens] = useState<Examen[]>([]);
  const [selectedExam, setSelectedExam] = useState<Examen | null>(null);
  const [examStats, setExamStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudentData();
  }, [userProfile, students]);

  useEffect(() => {
    if (studentClassId && resultsData.length > 0) {
      loadExamensForStudent();
    }
  }, [studentClassId, resultsData]);

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

      setStudentClassId(student.class_id);
    } catch (error) {
      console.error("Erreur lors du chargement des données de l'élève:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadExamensForStudent = async () => {
    try {
      if (!studentClassId) return;

      // Récupérer les examens de la classe depuis Supabase
      const { data: examsData, error } = await supabase
        .from('exams')
        .select('*')
        .eq('class_id', studentClassId)
        .order('exam_date', { ascending: false });

      if (error) throw error;

      if (examsData) {
        const examensFormatted: Examen[] = examsData.map(exam => ({
          id: exam.id,
          titre: exam.title,
          type: exam.title.toLowerCase().includes('composition') ? 'Composition' : 'Examen',
          dateExamen: exam.exam_date,
          is_published: exam.is_published,
          statut: exam.is_published ? 'publié' : 'non publié'
        }));
        
        setClassExamens(examensFormatted);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des examens:", error);
      setClassExamens([]);
    }
  };

  const handleExamClick = (exam: Examen) => {
    setSelectedExam(exam);
    
    if (exam.is_published && studentClassId) {
      // Récupérer les statistiques de l'élève pour cet examen
      const student = students.find((s) => 
        s.parent_email === userProfile.email || 
        `${s.first_name} ${s.last_name}`.toLowerCase() === `${userProfile.firstName} ${userProfile.lastName}`.toLowerCase()
      );
      
      if (student) {
        const stats = getStudentExamStats(studentClassId, exam.id, student.id);
        setExamStats(stats);
      }
    } else {
      setExamStats(null);
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

  if (loading || resultsLoading) {
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
            <h1 className="text-2xl font-bold text-primary">Mes Résultats</h1>
          </div>
        </div>

        {/* Liste des examens disponibles */}
        {classExamens.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">Aucun examen disponible</h3>
                <p className="text-gray-500">
                  Aucun examen n'a encore été créé pour votre classe.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {classExamens.map((examen) => (
              <div
                key={examen.id}
                className={`border rounded-lg p-4 transition-colors ${
                  selectedExam?.id === examen.id ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:bg-gray-50'
                } cursor-pointer`}
                onClick={() => handleExamClick(examen)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getExamenIcon(examen.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{examen.titre}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getExamenBadgeColor(examen.type)}`}>
                          {examen.type}
                        </span>
                        {examen.is_published ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                            Publié
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                            Non publié
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(examen.dateExamen), 'dd MMMM yyyy', { locale: fr })}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4">
                    {examen.is_published ? (
                      <Button 
                        size="sm"
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Voir mes notes
                      </Button>
                    ) : (
                      <Button 
                        size="sm"
                        variant="outline"
                        disabled
                        className="cursor-not-allowed"
                      >
                        En attente de publication
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Affichage des résultats si un examen publié est sélectionné */}
        {selectedExam && selectedExam.is_published && examStats && (
          <Card className="mt-6">
            <div className="bg-blue-600 text-white text-center py-3 rounded-t-lg">
              <h2 className="text-lg font-semibold">{selectedExam.titre}</h2>
            </div>
            
            <CardContent className="p-6">
              {/* Statistiques générales */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Award className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold text-blue-600">
                        {examStats.moyenneGenerale.toFixed(2)}/20
                      </p>
                      <p className="text-sm text-gray-600">Moyenne générale</p>
                    </div>
                  </div>
                </div>

                {examStats.isComposition && (
                  <>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-purple-600" />
                        <div>
                          <p className="text-2xl font-bold text-purple-600">
                            {examStats.moyenneDevoir > 0 ? examStats.moyenneDevoir.toFixed(2) : '-'}/20
                          </p>
                          <p className="text-sm text-gray-600">Moyenne Devoir</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Book className="h-8 w-8 text-green-600" />
                        <div>
                          <p className="text-2xl font-bold text-green-600">
                            {examStats.moyenneComposition > 0 ? examStats.moyenneComposition.toFixed(2) : '-'}/20
                          </p>
                          <p className="text-sm text-gray-600">Moyenne Composition</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Tableau des notes par matière */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matière</TableHead>
                    {examStats.isComposition ? (
                      <>
                        <TableHead className="text-center">Devoir</TableHead>
                        <TableHead className="text-center">Composition</TableHead>
                      </>
                    ) : (
                      <TableHead className="text-center">Note</TableHead>
                    )}
                    <TableHead className="text-center">Coefficient</TableHead>
                    <TableHead className="text-center">Moyenne</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {examStats.notesList.map((note: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{note.matiere}</TableCell>
                      {examStats.isComposition ? (
                        <>
                          <TableCell className="text-center">
                            <span className={note.devoirNote > 0 ? getGradeColor(note.devoirNote) : 'text-gray-400'}>
                              {note.devoirNote > 0 ? note.devoirNote.toFixed(2) : '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={note.compositionNote > 0 ? getGradeColor(note.compositionNote) : 'text-gray-400'}>
                              {note.compositionNote > 0 ? note.compositionNote.toFixed(2) : '-'}
                            </span>
                          </TableCell>
                        </>
                      ) : (
                        <TableCell className="text-center">
                          <span className={note.note > 0 ? getGradeColor(note.note) : 'text-gray-400'}>
                            {note.note > 0 ? note.note.toFixed(2) : '-'}
                          </span>
                        </TableCell>
                      )}
                      <TableCell className="text-center">{note.coefficient}</TableCell>
                      <TableCell className="text-center">
                        <span className={`font-semibold ${note.moyenne > 0 ? getGradeColor(note.moyenne) : 'text-gray-400'}`}>
                          {note.moyenne > 0 ? note.moyenne.toFixed(2) : '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Message si examen sélectionné mais non publié */}
        {selectedExam && !selectedExam.is_published && (
          <Card className="mt-6">
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="h-16 w-16 text-orange-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">Résultats non encore disponibles</h3>
                <p className="text-gray-500">
                  Les résultats de cet examen n'ont pas encore été publiés par l'administrateur.
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Vous serez notifié dès que les résultats seront disponibles.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}