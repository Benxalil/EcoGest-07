import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookText, Calendar, Clock } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useSubjects } from "@/hooks/useSubjects";
import { useClasses } from "@/hooks/useClasses";
import { useLessonLogs } from "@/hooks/useLessonLogs";

export default function ListeMatieresCahier() {
  const navigate = useNavigate();
  const { classeId } = useParams();
  const { classes, loading: classesLoading } = useClasses();
  const { subjects, loading: subjectsLoading } = useSubjects(classeId);
  const { lessonLogs, loading: lessonLogsLoading } = useLessonLogs(classeId);

  const classe = classes.find(c => c.id === classeId);

  // Fonction pour obtenir les lesson logs d'une matière
  const getSubjectLessonLogs = (subjectId: string) => {
    return lessonLogs.filter(log => log.subject_id === subjectId);
  };

  // Fonction pour formater la date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (classesLoading || subjectsLoading || lessonLogsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Chargement des matières...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!classe) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Classe non trouvée</h1>
            <Button onClick={() => navigate('/emplois-du-temps')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux emplois du temps
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
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/emplois-du-temps')}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Matières - {classe.name}
              </h1>
              <p className="text-gray-600">
                Gestion des matières pour cette classe
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {subjects.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookText className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Aucune matière
                </h3>
                <p className="text-gray-500 text-center mb-4">
                  Aucune matière n'a été configurée pour cette classe.
                </p>
                <Button onClick={() => navigate('/matieres')}>
                  Gérer les matières
                </Button>
              </CardContent>
            </Card>
          ) : (
            subjects.map((subject) => {
              const subjectLogs = getSubjectLessonLogs(subject.id);
              const latestLog = subjectLogs.length > 0 ? subjectLogs[0] : null;
              
              return (
                <Card key={subject.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <BookText className="h-5 w-5 mr-2 text-primary" />
                        {subject.name}
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {subjectLogs.length} entrée{subjectLogs.length !== 1 ? 's' : ''}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {subject.abbreviation && (
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Abréviation: {subject.abbreviation}</span>
                        </p>
                      )}
                      
                      {latestLog ? (
                        <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                          <h4 className="font-medium text-sm line-clamp-1">
                            Dernière entrée: {latestLog.topic}
                          </h4>
                          <div className="flex items-center text-xs text-muted-foreground space-x-3">
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {formatDate(latestLog.lesson_date)}
                            </div>
                            {latestLog.start_time && (
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {latestLog.start_time.slice(0, 5)}
                              </div>
                            )}
                          </div>
                          {latestLog.content && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {latestLog.content}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="bg-muted/30 p-3 rounded-lg text-center">
                          <p className="text-sm text-muted-foreground">
                            Aucune entrée de cahier de texte
                          </p>
                        </div>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => navigate(`/emplois/cahier/${classeId}/${subject.id}`)}
                      >
                        Voir le cahier de texte
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}