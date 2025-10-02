import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useParentChildren } from "@/hooks/useParentChildren";
import { ParentChildSelector } from "@/components/parent/ParentChildSelector";
import { Database } from "@/integrations/supabase/types";

type StudentGrade = Database['public']['Tables']['student_grades']['Row'];
type Subject = Database['public']['Tables']['subjects']['Row'];

interface GradeWithSubject extends StudentGrade {
  subject: Subject;
}

export default function ResultatsEnfant() {
  const [grades, setGrades] = useState<GradeWithSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const { children, selectedChild, setSelectedChildId, loading: childrenLoading } = useParentChildren();

  useEffect(() => {
    const fetchChildResults = async () => {
      if (!selectedChild?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Récupérer les notes de l'enfant
        const { data: gradesData, error } = await supabase
          .from('student_grades')
          .select(`
            *,
            class:class_id(id, name),
            subject:subject_id(*)
          `)
          .eq('student_id', selectedChild.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Erreur lors de la récupération des notes:', error);
          setGrades([]);
        } else if (gradesData) {
          // Pour l'instant, on affiche toutes les notes car student_grades n'a pas de lien direct avec exams
          // TODO: Ajouter une relation exam_id à student_grades si nécessaire
          
          // Récupérer les matières pour chaque note
          const subjectIds = [...new Set(gradesData.map(g => g.subject_id))];
          const { data: subjectsData } = await supabase
            .from('subjects')
            .select('*')
            .in('id', subjectIds);

          const subjectsMap = new Map(subjectsData?.map(s => [s.id, s]) || []);
          
          // Map the data to match our interface
          const mappedGrades = gradesData.map(grade => ({
            ...grade,
            subject: subjectsMap.get(grade.subject_id) || {
              id: grade.subject_id,
              name: 'Matière inconnue',
              code: '',
              color: '#3B82F6',
              coefficient: 1,
              created_at: '',
              school_id: ''
            }
          })) as GradeWithSubject[];
          setGrades(mappedGrades);
        }
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChildResults();
  }, [selectedChild?.id]);

  const getGradeColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 75) return "text-green-600";
    if (percentage >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const calculateAverage = (semester: number) => {
    const semesterGrades = grades.filter(g => g.semester === semester && g.score !== null);
    if (semesterGrades.length === 0) return null;
    
    const total = semesterGrades.reduce((sum, grade) => sum + (grade.score || 0), 0);
    return (total / semesterGrades.length).toFixed(2);
  };

  const gradesBySemester = grades.reduce((acc, grade) => {
    if (!acc[grade.semester]) acc[grade.semester] = [];
    acc[grade.semester].push(grade);
    return acc;
  }, {} as Record<number, GradeWithSubject[]>);

  if (childrenLoading || loading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (children.length === 0) {
    return (
      <Layout>
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>Résultats de votre enfant</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Aucun enfant associé à votre compte n'a été trouvé.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!selectedChild) {
    return null;
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Résultats - {selectedChild.first_name} {selectedChild.last_name}</h1>
        </div>

        {/* Sélecteur d'enfant */}
        <ParentChildSelector 
          children={children}
          selectedChildId={selectedChild.id}
          onChildSelect={setSelectedChildId}
        />

        {Object.entries(gradesBySemester).map(([semester, semesterGrades]) => {
          const average = calculateAverage(parseInt(semester));
          
          return (
            <Card key={semester}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Semestre {semester}</CardTitle>
                  {average && (
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      Moyenne: {average}/20
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {semesterGrades.map((grade) => (
                    <Card key={grade.id} className="border-l-4" style={{ borderLeftColor: grade.subject?.color }}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{grade.subject?.name}</CardTitle>
                        <Badge variant="outline" className="w-fit">
                          {grade.grade_type}
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Note:</span>
                          <span className={`text-xl font-bold ${getGradeColor(grade.score || 0, grade.max_score || 20)}`}>
                            {grade.score !== null ? `${grade.score}/${grade.max_score}` : 'Non noté'}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Évalué le {new Date(grade.created_at).toLocaleDateString('fr-FR')}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {grades.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                Aucune note disponible pour votre enfant.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}