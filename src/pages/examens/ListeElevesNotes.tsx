
import React, { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

interface Classe {
  id: string;
  session: string;
  libelle: string;
  effectif: number;
}

interface Student {
  id: string;
  nom: string;
  prenom: string;
  classe: string;
}

export default function ListeElevesNotes() {
  const [classe, setClasse] = useState<Classe | null>(null);
  const [eleves, setEleves] = useState<Student[]>([]);
  const navigate = useNavigate();
  const { classeId, activiteId } = useParams();

  useEffect(() => {
    // Récupérer les informations de la classe
    if (classeId) {
      // Remplacé par hook Supabase
      if (savedClasses) {
        const classes = JSON.parse(savedClasses);
        const classeInfo = classes.find((c: Classe) => c.id === classeId);
        setClasse(classeInfo || null);
        // Récupérer les élèves de cette classe
        if (classeInfo) {
          // Remplacé par hook Supabase
          if (savedStudents) {
            const students = JSON.parse(savedStudents);
            const classeNom = `${classeInfo.session} ${classeInfo.libelle}`;
            const elevesClasse = students.filter((student: Student) => 
              student.classe === classeNom
            );
            setEleves(elevesClasse);
            }
        }
      }
    }
  }, [classeId]);

  const handleEvaluerEleve = (eleveId: string) => {
    navigate(`/examens/${classeId}/activites/${activiteId}/eleve/${eleveId}/notes`);
  };

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/examens/classe/${classeId}`)}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-primary">
                Classe: {classe ? `${classe.session} ${classe.libelle}` : 'Chargement...'}
              </h1>
              <p className="text-gray-600 text-sm">
                Liste des élèves pour évaluation
              </p>
            </div>
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Elt</TableHead>
                <TableHead>Nom Complet</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eleves.map((eleve, index) => (
                <TableRow key={eleve.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{eleve.prenom} {eleve.nom}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      className="bg-green-500 text-white hover:bg-green-600"
                      onClick={() => handleEvaluerEleve(eleve.id)}
                    >
                      Évaluer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {eleves.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                    Aucun élève trouvé dans cette classe
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}
