import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Users, FileText } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useTeacherFilter } from "@/hooks/useTeacherFilter";

export default function NotesIndex() {
  const navigate = useNavigate();
  const { isAdmin, isTeacher } = useUserRole();
  const { teacherClassIds, loading } = useTeacherFilter();

  // Redirection automatique pour les enseignants vers la liste d'examens filtrée
  useEffect(() => {
    if (!loading && isTeacher()) {
      // Si l'enseignant n'a aucune classe assignée, afficher un message
      if (teacherClassIds.length === 0) {
        return;
      }
      // Sinon, rediriger vers la liste des examens (qui sera filtrée automatiquement)
      navigate('/notes/examens');
    }
  }, [loading, isTeacher, teacherClassIds, navigate]);

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Message pour les enseignants sans classes
  if (isTeacher() && teacherClassIds.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="p-8 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Aucune classe assignée</h2>
              <p className="text-muted-foreground mb-6">
                Vous n'avez pas encore de classe assignée dans votre emploi du temps.
                <br />
                Veuillez contacter l'administration pour qu'elle vous assigne des classes.
              </p>
              <Button onClick={() => navigate('/')}>
                Retour au tableau de bord
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Interface pour les administrateurs
  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Gestion des Notes</h1>
          <p className="text-muted-foreground">
            Choisissez le mode de gestion des notes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Par Examens */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/notes/examens')}>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Gérer par Examens</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Sélectionnez un examen et gérez les notes pour toutes les classes
                </p>
                <Button variant="outline" size="sm">
                  Accéder
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Par Classes */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/notes/classes')}>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Gérer par Classes</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Sélectionnez une classe puis la matière pour saisir les notes
                </p>
                <Button variant="outline" size="sm">
                  Accéder
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Par Matières */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/notes/matieres')}>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Gérer par Matières</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Sélectionnez une matière et gérez les notes pour toutes les classes
                </p>
                <Button variant="outline" size="sm">
                  Accéder
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
