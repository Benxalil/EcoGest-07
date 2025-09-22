import { Layout } from "@/components/layout/Layout";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

interface Student {
  id: string;
  nom: string;
  prenom: string;
  sexe: string;
  classe: string;
  dateNaissance: string;
  adresse: string;
  telephone: string;
  email: string;
}

// Simulation d'une fonction pour récupérer les élèves
const fetchStudents = async (): Promise<Student[]> => {
  // Simulons des données pour l'exemple
  return [
    {
      id: "1",
      nom: "Dupont",
      prenom: "Jean",
      sexe: "Masculin",
      classe: "Terminale S",
      dateNaissance: "2005-05-15",
      adresse: "123 rue de la Paix",
      telephone: "0123456789",
      email: "jean.dupont@email.com"
    },
    // Ajoutez d'autres élèves ici
  ];
};

export default function ModifierEleve() {
  const { data: students, isLoading, error } = useQuery({
    queryKey: ['students'],
    queryFn: fetchStudents,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <h1 className="text-3xl font-bold mb-8">Chargement...</h1>
        </div>
      </Layout>
    );
  }

  if (error) {
    toast.error("Erreur lors du chargement des élèves");
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <h1 className="text-3xl font-bold mb-8">Erreur de chargement</h1>
        </div>
      </Layout>
    );
  }

  const handleEdit = (studentId: string) => {
    // Afficher les détails complets de l'élève pour modification
    const student = students?.find(s => s.id === studentId);
    if (student) {
      toast.success(`Détails de l'élève ${student.prenom} ${student.nom}`);
      // Ici vous pourrez ajouter la logique pour afficher un formulaire de modification
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Liste des élèves</h1>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prénom</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Sexe</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students?.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>{student.prenom}</TableCell>
                  <TableCell>{student.nom}</TableCell>
                  <TableCell>{student.sexe}</TableCell>
                  <TableCell>{student.classe}</TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEdit(student.id)}
                      className="h-8 w-8"
                    >
                      <Pencil className="h-4 w-4" />
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
