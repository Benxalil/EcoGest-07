import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Users, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClasses } from "@/hooks/useClasses";
import { useStudents } from "@/hooks/useStudents";
import { formatClassName } from "@/utils/classNameFormatter";

interface Classe {
  id: string;
  session: string;
  libelle: string;
  effectif: number;
}

interface Eleve {
  id: string;
  nom: string;
  prenom: string;
  classe: string;
}

export default function ListeElevesClasse() {
  const [classe, setClasse] = useState<Classe | null>(null);
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const classeId = searchParams.get('classeId');

  // Hooks pour récupérer les données depuis la base
  const { classes, loading: classesLoading } = useClasses();
  const { students, loading: studentsLoading } = useStudents();

  useEffect(() => {
    if (classeId && classes.length > 0) {
      // Récupérer les informations de la classe
      const classeFound = classes.find(c => c.id === classeId);
      if (classeFound) {
        setClasse({
          id: classeFound.id,
          session: classeFound.academic_year_id || '',
          libelle: formatClassName(classeFound),
          effectif: classeFound.enrollment_count || 0
        });
      }
    }
  }, [classeId, classes]);

  useEffect(() => {
    if (classeId && students.length > 0) {
      // Récupérer les élèves de cette classe
      const elevesForClasse = students
        .filter(student => student.class_id === classeId)
        .map(student => ({
          id: student.id,
          nom: student.last_name,
          prenom: student.first_name,
          classe: classe?.libelle || ''
        }));
      setEleves(elevesForClasse);
    }
  }, [classeId, students, classe]);

  const handleConsulterEleve = (eleveId: string) => {
    navigate(`/notes/eleves-notes?classeId=${classeId}&eleveId=${eleveId}`);
  };

  const elevesFiltered = eleves.filter((eleve) =>
    `${eleve.prenom} ${eleve.nom}`.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => a.prenom.toLowerCase().localeCompare(b.prenom.toLowerCase()));

  if (classesLoading || studentsLoading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Chargement des données...</p>
            </div>
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
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux Matières
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                Notes par Élève de la classe : {classe?.libelle}
              </h1>
              <p className="text-muted-foreground">
                Consultez et modifiez les notes de chaque élève individuellement
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Rechercher un élève..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Matricule</TableHead>
                  <TableHead>Prénom & Nom</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {elevesFiltered.map((eleve) => {
                  const studentData = students.find(s => s.id === eleve.id);
                  return (
                    <TableRow key={eleve.id}>
                      <TableCell className="font-medium font-mono">
                        {studentData?.student_number || '-'}
                      </TableCell>
                      <TableCell>{eleve.prenom} {eleve.nom}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => handleConsulterEleve(eleve.id)}
                          size="sm"
                        >
                          Consulter
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {elevesFiltered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchTerm ? "Aucun élève trouvé pour cette recherche." : "Aucun élève disponible pour cette classe."}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}