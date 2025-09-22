
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
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

// Aucune donnée de test - système vide pour nouvel utilisateur
const matieres = [
  // Les matières seront ajoutées par l'utilisateur
];

interface Classe {
  id: string;
  session: string;
  libelle: string;
  effectif: number;
}

export default function ListeExamens() {
  const [searchTerm, setSearchTerm] = useState("");
  const [classe, setClasse] = useState<Classe | null>(null);
  const navigate = useNavigate();
  const { classeId } = useParams();

  useEffect(() => {
    // Récupérer les informations de la classe
    if (classeId) {
      // Remplacé par hook Supabase - plus de localStorage
      // Les classes sont maintenant gérées par useClasses hook
      // TODO: Implémenter la récupération de classe par ID
    }
  }, [classeId]);

  const matieresFiltered = matieres.filter((matiere) =>
    matiere.nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewStudentNotes = (matiereId: number) => {
    navigate(`/examens/${classeId}/activites/${matiereId}/notes-eleve`);
  };

  // Fonction supprimée - page ConsulterNotes supprimée

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
                {classe ? `${classe.session} ${classe.libelle}` : 'Matières'}
              </h1>
              {classe && (
                <p className="text-gray-600 text-sm">
                  Gestion des activités et examens
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
              {matieresFiltered.map((matiere) => (
                <TableRow key={matiere.id}>
                  <TableCell>{matiere.nom}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="bg-blue-500 text-white hover:bg-blue-600"
                        onClick={() => console.log("Fonction supprimée")}
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
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}
