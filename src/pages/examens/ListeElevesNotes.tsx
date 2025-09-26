
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
import { useClasses } from "@/hooks/useClasses";
import { useStudents } from "@/hooks/useStudents";

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

  const { classes } = useClasses();
  const { students } = useStudents();

  useEffect(() => {
    // Récupérer les informations de la classe
    if (classeId && classes.length > 0) {
      const classeInfo = classes.find((c) => c.id === classeId);
      if (classeInfo) {
        setClasse({
          id: classeInfo.id,
          session: classeInfo.level,
          libelle: classeInfo.name,
          effectif: classeInfo.capacity || 0
        });
        
        // Récupérer les élèves de cette classe
        const elevesClasse = students.filter((student) => 
          student.class_id === classeId
        ).map(student => ({
          id: student.id,
          nom: student.last_name,
          prenom: student.first_name,
          classe: `${classeInfo.level} ${classeInfo.name}`
        }));
        setEleves(elevesClasse);
      }
    }
  }, [classeId, classes, students]);

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
