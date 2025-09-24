
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { ArrowLeft, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useClasses } from "@/hooks/useClasses";
import { useSubjects } from "@/hooks/useSubjects";

interface Classe {
  id: string;
  name: string;
  level: string;
  section?: string;
  capacity: number;
}

interface Matiere {
  id: string;
  nom: string;
  abbreviation: string;
  horaires: string;
  classeId: string;
}

export default function ListeExamens() {
  const [searchTerm, setSearchTerm] = useState("");
  const [classe, setClasse] = useState<Classe | null>(null);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const navigate = useNavigate();
  const { classeId } = useParams();
  
  // Hooks pour récupérer les données depuis la base
  const { classes, loading: classesLoading } = useClasses();
  const { subjects, loading: subjectsLoading } = useSubjects(classeId || '');

  useEffect(() => {
    // Récupérer les informations de la classe
    if (classeId && classes.length > 0) {
      const foundClasse = classes.find(c => c.id === classeId);
      if (foundClasse) {
        setClasse({
          id: foundClasse.id,
          name: foundClasse.name,
          level: foundClasse.level,
          section: foundClasse.section,
          capacity: foundClasse.capacity
        });
      }
    }
  }, [classeId, classes]);

  useEffect(() => {
    // Récupérer les matières pour la classe
    if (subjects.length > 0) {
      const matieresForClasse = subjects.map(s => ({
        id: s.id,
        nom: s.name,
        abbreviation: s.abbreviation || '',
        horaires: s.hours_per_week ? `${s.hours_per_week}h/sem` : '',
        classeId: s.class_id
      }));
      setMatieres(matieresForClasse);
    }
  }, [subjects]);

  const matieresFiltered = matieres.filter((matiere) =>
    matiere.nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewStudentNotes = (matiereId: string) => {
    navigate(`/notes/eleves?classeId=${classeId}&matiereId=${matiereId}`);
  };

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/examens')}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-primary">
                {classe ? `${classe.level} ${classe.name}${classe.section ? ` - ${classe.section}` : ''}` : 'Matières'}
              </h1>
              {classe && (
                <p className="text-gray-600 text-sm">
                  Effectif: {classe.capacity} élèves
                </p>
              )}
            </div>
          </div>
          <div className="relative w-64">
            <Input
              type="text"
              placeholder="Rechercher une matière..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matières</TableHead>
                <TableHead className="w-64">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classesLoading || subjectsLoading ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <span className="ml-2">Chargement des matières...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : matieresFiltered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-8">
                    <p className="text-gray-500">
                      {searchTerm ? "Aucune matière trouvée pour cette recherche." : "Aucune matière disponible pour cette classe."}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                matieresFiltered.map((matiere) => (
                  <TableRow key={matiere.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{matiere.nom}</div>
                        {matiere.abbreviation && (
                          <div className="text-sm text-gray-500">{matiere.abbreviation}</div>
                        )}
                        {matiere.horaires && (
                          <div className="text-sm text-gray-500">{matiere.horaires}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="bg-blue-500 text-white hover:bg-blue-600"
                          onClick={() => navigate(`/notes/eleves?classeId=${classeId}&matiereId=${matiere.id}`)}
                        >
                          Consulter les Notes
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="bg-green-500 text-white hover:bg-green-600"
                          onClick={() => handleViewStudentNotes(matiere.id)}
                        >
                          Note par élève
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}

