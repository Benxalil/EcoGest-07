
import { Layout } from "@/components/layout/Layout";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, AlertTriangle } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";

export default function ListeEmplois() {
  const navigate = useNavigate();
  const { classes, loading } = useClasses();

  // Si aucune classe n'a été enregistrée
  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Chargement des classes...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (classes.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Liste des classes du Primaire</h1>
          </div>

          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">Aucune classe n'a été enregistrée</p>
            <p className="text-gray-400 mb-6">Veuillez d'abord créer des classes avant de gérer les emplois du temps</p>
            <Button onClick={() => navigate("/classes")}>
              Aller à la gestion des classes
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Liste des classes du Primaire</h1>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/4">Classe</TableHead>
                <TableHead className="w-1/4 text-center">Emploi du Temps</TableHead>
                <TableHead className="w-1/4 text-center">Absence & Retard</TableHead>
                <TableHead className="w-1/4 text-center">Cahier de Texte</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((classe) => (
                <TableRow key={classe.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{classe.name} {classe.level}{classe.section ? ` - ${classe.section}` : ''}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="bg-blue-500 text-white hover:bg-blue-600"
                      onClick={() => { 
                        localStorage.setItem(`classe-name-${classe.id}`, `${classe.name} ${classe.level}${classe.section ? ` - ${classe.section}` : ''}`);
                        navigate(`/emplois-du-temps/${classe.id}`);
                      }}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Emploi du temps
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-yellow-500 text-white hover:bg-yellow-600"
                    onClick={() => navigate(`/consulter-absences-retards/${classe.id}`)}
                  >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Absence & retard
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="bg-red-500 text-white hover:bg-red-600"
                      onClick={() => navigate(`/matieres-cahier/${classe.id}`)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Cahier de texte
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}
