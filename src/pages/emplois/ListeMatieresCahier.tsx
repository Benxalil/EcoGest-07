import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BookText } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useSubjects } from "@/hooks/useSubjects";
import { useClasses } from "@/hooks/useClasses";

export default function ListeMatieresCahier() {
  const navigate = useNavigate();
  const { classeId } = useParams();
  const { classes, loading: classesLoading } = useClasses();
  const { subjects, loading: subjectsLoading } = useSubjects(classeId);

  const classe = classes.find(c => c.id === classeId);

  if (classesLoading || subjectsLoading) {
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
            <Button onClick={() => navigate('/emplois')}>
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
              onClick={() => navigate('/emplois')}
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
            subjects.map((subject) => (
              <Card key={subject.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BookText className="h-5 w-5 mr-2 text-blue-600" />
                    {subject.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      {subject.abbreviation && (
                        <span className="font-medium">Abréviation: {subject.abbreviation}</span>
                      )}
                    </p>
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
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}