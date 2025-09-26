import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, Award, BookOpen } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useStudents } from "@/hooks/useStudents";
import { useGrades } from "@/hooks/useGrades";
import { useExams } from "@/hooks/useExams";
import { getPublishedExamens, filterNotesByPublishedExams } from "@/utils/examUtils";

interface Grade {
  subject: string;
  devoir: number | null;
  composition: number | null;
  moyenne: number | null;
  coefficient: number;
}

interface SemesterResults {
  semester: string;
  grades: Grade[];
  average: number;
  rank?: number;
  totalStudents?: number;
}

export default function MesResultats() {
  const { userProfile } = useUserRole();
  const { students } = useStudents();
  const { grades } = useGrades();
  const { exams } = useExams();
  const [results, setResults] = useState<SemesterResults[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>("semestre1");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudentResults();
  }, [userProfile]);

  const loadStudentResults = async () => {
    try {
      setLoading(true);
      
      if (!students || !userProfile) return;
      
      const student = students.find((s) => 
        s.parent_email === userProfile.email || 
        `${s.first_name} ${s.last_name}`.toLowerCase() === `${userProfile.firstName} ${userProfile.lastName}`.toLowerCase()
      );
      
      if (!student) return;

      // Récupérer les matières de la classe (simulé pour l'instant)
      const classSubjects: any[] = [];

      // Récupérer les notes pour chaque semestre
      const semesterResults: SemesterResults[] = [];
      
      for (const semester of ['semestre1', 'semestre2']) {
        const grades: Grade[] = [];
        
        for (const subject of classSubjects) {
          // La logique de chargement des notes sera adaptée quand les hooks seront prêts
          const notesKey = `notes_simulé`;
          
          grades.push({
            subject: subject.nom || 'Matière',
            devoir: null,
            composition: null,
            moyenne: null,
            coefficient: subject.coefficient || 1
          });
        }
        
        // Calculer la moyenne générale du semestre
        const validGrades = grades.filter(g => g.moyenne !== null);
        const totalPoints = validGrades.reduce((sum, g) => sum + (g.moyenne! * g.coefficient), 0);
        const totalCoefficients = validGrades.reduce((sum, g) => sum + g.coefficient, 0);
        const average = totalCoefficients > 0 ? Math.round((totalPoints / totalCoefficients) * 100) / 100 : 0;
        
        semesterResults.push({
          semester: semester,
          grades,
          average
        });
      }
      
      setResults(semesterResults);
    } catch (error) {
      console.error("Erreur lors du chargement des résultats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentResults = () => {
    return results.find(r => r.semester === selectedSemester);
  };

  const getGradeColor = (moyenne: number | null) => {
    if (moyenne === null) return 'text-gray-400';
    if (moyenne >= 16) return 'text-green-600';
    if (moyenne >= 14) return 'text-blue-600';
    if (moyenne >= 12) return 'text-orange-600';
    if (moyenne >= 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAppreciation = (moyenne: number) => {
    if (moyenne >= 16) return 'Très bien';
    if (moyenne >= 14) return 'Bien';
    if (moyenne >= 12) return 'Assez bien';
    if (moyenne >= 10) return 'Passable';
    return 'Insuffisant';
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  const currentResults = getCurrentResults();

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center gap-4">
          <BarChart3 className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Mes Résultats</h1>
        </div>

        {/* Sélection du semestre */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Sélection de la période</CardTitle>
              <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semestre1">1er Semestre</SelectItem>
                  <SelectItem value="semestre2">2e Semestre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
        </Card>

        {currentResults ? (
          <>
            {/* Moyenne générale */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Award className="h-8 w-8 text-yellow-600" />
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {currentResults.average.toFixed(2)}/20
                      </h3>
                      <p className="text-lg text-gray-600">Moyenne générale</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      className={`text-lg px-4 py-2 ${
                        currentResults.average >= 10 
                          ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                          : 'bg-red-100 text-red-800 hover:bg-red-100'
                      }`}
                    >
                      {getAppreciation(currentResults.average)}
                    </Badge>
                    {currentResults.rank && (
                      <p className="text-sm text-gray-500 mt-2">
                        Rang: {currentResults.rank}/{currentResults.totalStudents}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Détail des notes par matière */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Détail des notes - {selectedSemester === 'semestre1' ? '1er Semestre' : '2e Semestre'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Matière</TableHead>
                      <TableHead className="text-center">Devoir</TableHead>
                      <TableHead className="text-center">Composition</TableHead>
                      <TableHead className="text-center">Moyenne</TableHead>
                      <TableHead className="text-center">Coefficient</TableHead>
                      <TableHead className="text-center">Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentResults.grades.map((grade, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{grade.subject}</TableCell>
                        <TableCell className="text-center">
                          {grade.devoir !== null ? (
                            <span className={getGradeColor(grade.devoir)}>
                              {grade.devoir.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {grade.composition !== null ? (
                            <span className={getGradeColor(grade.composition)}>
                              {grade.composition.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {grade.moyenne !== null ? (
                            <span className={`font-semibold ${getGradeColor(grade.moyenne)}`}>
                              {grade.moyenne.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">{grade.coefficient}</TableCell>
                        <TableCell className="text-center">
                          {grade.moyenne !== null ? (
                            <span className="font-medium">
                              {(grade.moyenne * grade.coefficient).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Statistiques */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold text-green-600">
                        {currentResults.grades.filter(g => g.moyenne !== null && g.moyenne >= 10).length}
                      </p>
                      <p className="text-sm text-gray-500">Matières réussies</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Award className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold text-blue-600">
                        {Math.max(...currentResults.grades.map(g => g.moyenne || 0)).toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">Meilleure note</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-8 w-8 text-purple-600" />
                    <div>
                      <p className="text-2xl font-bold text-purple-600">
                        {currentResults.grades.filter(g => g.moyenne !== null).length}
                      </p>
                      <p className="text-sm text-gray-500">Matières évaluées</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">Aucun résultat disponible</h3>
                <p className="text-gray-500">
                  Aucun résultat publié n'est encore disponible pour ce semestre.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}