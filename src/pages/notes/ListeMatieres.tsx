import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BookOpen, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Classe {
  id: string;
  session: string;
  libelle: string;
  effectif: number;
}

interface Matiere {
  id: number;
  nom: string;
  abreviation?: string;
  horaires: string;
  classeId: string;
}

export default function ListeMatieres() {
  const [classe, setClasse] = useState<Classe | null>(null);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { classeId } = useParams();

  useEffect(() => {
    // Récupérer les informations de la classe
    if (classeId) {
      // Remplacé par hook Supabase
      if (savedClasses) {
        try {
          const classes = JSON.parse(savedClasses);
          const classeFound = classes.find((c: Classe) => c.id === classeId);
          if (classeFound) {
            setClasse(classeFound);
          }
        } catch (error) {
          console.error('Erreur lors du chargement de la classe:', error);
        }
      }

      // Récupérer les matières spécifiques à cette classe
      // Remplacé par hook Supabase
      if (savedMatieres) {
        try {
          const allMatieres = JSON.parse(savedMatieres);
          const matieresForClasse = allMatieres.filter((m: Matiere) => m.classeId === classeId);
          setMatieres(matieresForClasse);
        } catch (error) {
          console.error('Erreur lors du chargement des matières:', error);
        }
      }
    }
  }, [classeId]);

  // Fonction supprimée - page ConsulterNotes supprimée


  const matieresFiltered = matieres.filter((matiere) =>
    matiere.nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              Retour aux Classes
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Notes - {classe?.session} {classe?.libelle || "Classe"}
              </h1>
              <p className="text-gray-600">
                Effectif: {classe?.effectif} élèves
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate(`/notes/eleves?classeId=${classeId}`)}
            variant="default"
            size="sm"
          >
            Notes par Élève
          </Button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Sélectionnez une matière pour consulter ou saisir les notes des élèves.
          </p>
          
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Rechercher une matière..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          {matieresFiltered.map((matiere) => (
            <div key={matiere.id} className="flex items-center justify-between p-4 bg-card rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4 flex-1">
                <BookOpen className="h-5 w-5 text-primary" />
                <div className="flex items-center gap-6 flex-1">
                  <h3 className="font-semibold text-base min-w-[200px]">{matiere.nom}</h3>
                  <span className="text-sm text-muted-foreground">
                    Classe: {classe?.session} {classe?.libelle}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => console.log("Fonction supprimée")}
                >
                  Consulter les Notes
                </Button>
              </div>
            </div>
          ))}
        </div>

        {matieresFiltered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchTerm ? "Aucune matière trouvée pour cette recherche." : "Aucune matière disponible."}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}