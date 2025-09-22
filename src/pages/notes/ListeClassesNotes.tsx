import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Users, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useClasses } from "@/hooks/useClasses";

interface Classe {
  id: string;
  session: string;
  libelle: string;
  effectif: number;
}

export default function ListeClassesNotes() {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { classes, loading } = useClasses();

  const handleViewNotes = (classeId: string) => {
    navigate(`/notes/classe/${classeId}`);
  };

  const classesFiltered = classes.filter((classe) =>
    classe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classe.level.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Chargement des classes...</p>
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
              Retour
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des Notes</h1>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Sélectionnez une classe pour consulter et saisir les notes des élèves.
          </p>
          
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Rechercher une classe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          {classesFiltered.map((classe) => (
            <div key={classe.id} className="flex items-center justify-between p-4 bg-card rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4 flex-1">
                <Users className="h-5 w-5 text-primary" />
                <div className="flex items-center gap-6 flex-1">
                  <h3 className="font-semibold text-base min-w-[200px]">{classe.name} {classe.level}{classe.section ? ` - ${classe.section}` : ''}</h3>
                  <span className="text-sm text-muted-foreground">
                    Niveau: {classe.level}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Effectif: {classe.capacity || 0} élèves
                  </span>
                </div>
              </div>
              <Button
                onClick={() => handleViewNotes(classe.id)}
                variant="default"
                size="sm"
              >
                Gérer les Notes
              </Button>
            </div>
          ))}
        </div>

        {classesFiltered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchTerm ? "Aucune classe trouvée pour cette recherche." : "Aucune classe disponible."}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}