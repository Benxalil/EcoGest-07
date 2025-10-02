import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Award, Book, FileText, Loader2, AlertCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ExamDetails {
  id: string;
  title: string;
  exam_date: string;
  is_published: boolean;
}

interface SubjectGrade {
  matiere: string;
  devoirNote: number;
  compositionNote: number;
  note: number;
  coefficient: number;
  moyenne: number;
}

interface StudentStats {
  moyenneGenerale: number;
  moyenneDevoir: number;
  moyenneComposition: number;
  isComposition: boolean;
  notesList: SubjectGrade[];
}

export default function DetailsResultatEleve() {
  const navigate = useNavigate();
  const { studentId, examId } = useParams();
  const [loading, setLoading] = useState(true);
  const [examDetails, setExamDetails] = useState<ExamDetails | null>(null);
  const [studentStats, setStudentStats] = useState<StudentStats | null>(null);
  const [studentName, setStudentName] = useState("");

  useEffect(() => {
    loadExamAndGrades();
  }, [studentId, examId]);

  const loadExamAndGrades = async () => {
    try {
      setLoading(true);

      // Charger les détails de l'examen
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single();

      if (examError) throw examError;

      setExamDetails(examData);

      // Vérifier si l'examen est publié
      if (!examData.is_published) {
        setLoading(false);
        return;
      }

      // Charger les informations de l'élève
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('first_name, last_name')
        .eq('id', studentId)
        .single();

      if (studentError) throw studentError;

      setStudentName(`${studentData.first_name} ${studentData.last_name}`);

      // Charger les notes de l'élève pour cet examen
      const { data: gradesData, error: gradesError } = await supabase
        .from('grades')
        .select(`
          *,
          subjects (
            name,
            coefficient
          )
        `)
        .eq('student_id', studentId)
        .eq('exam_id', examId);

      if (gradesError) throw gradesError;

      // Calculer les statistiques
      const isComposition = examData.title.toLowerCase().includes('composition');
      let totalWeightedGrades = 0;
      let totalCoefficients = 0;
      let totalWeightedDevoir = 0;
      let totalCoeffDevoir = 0;
      let totalWeightedComposition = 0;
      let totalCoeffComposition = 0;

      const notesList: SubjectGrade[] = gradesData.map((grade: any) => {
        const coefficient = grade.subjects?.coefficient || 1;
        const maxGrade = grade.max_grade || 20;
        
        let devoirNote = 0;
        let compositionNote = 0;
        let note = 0;
        let moyenne = 0;

        if (isComposition) {
          // Pour les compositions, gérer devoir et composition séparément
          if (grade.exam_type === 'devoir') {
            devoirNote = (grade.grade_value / maxGrade) * 20;
            totalWeightedDevoir += devoirNote * coefficient;
            totalCoeffDevoir += coefficient;
          } else if (grade.exam_type === 'composition') {
            compositionNote = (grade.grade_value / maxGrade) * 20;
            totalWeightedComposition += compositionNote * coefficient;
            totalCoeffComposition += coefficient;
          }
          
          // Calculer la moyenne de la matière (devoir + composition)
          if (devoirNote > 0 || compositionNote > 0) {
            moyenne = ((devoirNote + compositionNote) / (devoirNote > 0 && compositionNote > 0 ? 2 : 1));
            totalWeightedGrades += moyenne * coefficient;
            totalCoefficients += coefficient;
          }
        } else {
          // Pour les autres examens
          note = (grade.grade_value / maxGrade) * 20;
          moyenne = note;
          totalWeightedGrades += note * coefficient;
          totalCoefficients += coefficient;
        }

        return {
          matiere: grade.subjects?.name || 'Matière inconnue',
          devoirNote,
          compositionNote,
          note,
          coefficient,
          moyenne
        };
      });

      const stats: StudentStats = {
        moyenneGenerale: totalCoefficients > 0 ? totalWeightedGrades / totalCoefficients : 0,
        moyenneDevoir: totalCoeffDevoir > 0 ? totalWeightedDevoir / totalCoeffDevoir : 0,
        moyenneComposition: totalCoeffComposition > 0 ? totalWeightedComposition / totalCoeffComposition : 0,
        isComposition,
        notesList: notesList.filter(n => n.devoirNote > 0 || n.compositionNote > 0 || n.note > 0)
      };

      setStudentStats(stats);
    } catch (error) {
      console.error("Erreur lors du chargement des résultats:", error);
    } finally {
      setLoading(false);
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

  if (!examDetails || !examDetails.is_published) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center gap-4 mb-6">
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

          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="h-16 w-16 text-orange-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  Résultats non encore disponibles
                </h3>
                <p className="text-gray-500">
                  Les résultats de cet examen n'ont pas encore été publiés par l'administrateur.
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Vous serez notifié dès que les résultats seront disponibles.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!studentStats) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center gap-4 mb-6">
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

          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  Aucune note disponible
                </h3>
                <p className="text-gray-500">
                  Aucune note n'a été enregistrée pour cet examen.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-primary">{examDetails.title}</h1>
            <p className="text-gray-600">{studentName}</p>
          </div>
        </div>

        {/* Statistiques générales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Award className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {studentStats.moyenneGenerale.toFixed(2)}/20
                  </p>
                  <p className="text-sm text-gray-600">Moyenne générale</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {studentStats.isComposition && (
            <>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-purple-600" />
                    <div>
                      <p className="text-2xl font-bold text-purple-600">
                        {studentStats.moyenneDevoir > 0 ? studentStats.moyenneDevoir.toFixed(2) : '-'}/20
                      </p>
                      <p className="text-sm text-gray-600">Moyenne Devoir</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Book className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold text-green-600">
                        {studentStats.moyenneComposition > 0 ? studentStats.moyenneComposition.toFixed(2) : '-'}/20
                      </p>
                      <p className="text-sm text-gray-600">Moyenne Composition</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Tableau des notes */}
        <Card>
          <div className="bg-blue-600 text-white text-center py-3 rounded-t-lg">
            <h2 className="text-lg font-semibold">Notes par matière</h2>
          </div>

          <CardContent className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matière</TableHead>
                  {studentStats.isComposition ? (
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
                {studentStats.notesList.map((note, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{note.matiere}</TableCell>
                    {studentStats.isComposition ? (
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
      </div>
    </Layout>
  );
}
