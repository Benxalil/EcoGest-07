import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, User, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useStudents } from "@/hooks/useStudents";
import { useClasses } from "@/hooks/useClasses";

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

// Aucune donnée de matières par défaut
const matieres = [
  // Les matières seront ajoutées par l'utilisateur
];

export default function ListeElevesNotes() {
  const [matiere, setMatiere] = useState<{id: number, nom: string} | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { classeId, matiereId } = useParams();
  const { students } = useStudents();
  const { classes } = useClasses();

  const classe = classes.find(c => c.id === classeId) || null;
  const eleves = students.filter(student => student.class_id === classeId);

  useEffect(() => {
    // Récupérer les informations de la matière
    if (matiereId) {
      const matiereFound = matieres.find(m => m.id === parseInt(matiereId));
      if (matiereFound) {
        setMatiere(matiereFound);
      }
    }
  }, [matiereId]);

  const handleEvaluerEleve = (eleveId: string) => {
    navigate(`/notes/${classeId}/matiere/${matiereId}/eleve/${eleveId}`);
  };

  const elevesFiltered = eleves.filter((eleve) =>
    eleve.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eleve.first_name.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => a.first_name.toLowerCase().localeCompare(b.first_name.toLowerCase()));

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/notes/classe/${classeId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux Matières
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Évaluer les Élèves - {matiere?.nom}
              </h1>
              <p className="text-gray-600">
                Classe: {classe?.name} {classe?.level}{classe?.section ? ` - ${classe?.section}` : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Sélectionnez un élève pour saisir ses notes individuellement.
          </p>
          
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Rechercher un élève..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {elevesFiltered.map((eleve) => (
            <Card key={eleve.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  {eleve.first_name} {eleve.last_name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Matière:</span> {matiere?.nom}
                  </p>
                  <Button
                    onClick={() => handleEvaluerEleve(eleve.id)}
                    className="w-full mt-4"
                    variant="default"
                  >
                    Évaluer cet Élève
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {elevesFiltered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchTerm ? "Aucun élève trouvé pour cette recherche." : "Aucun élève dans cette classe."}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}