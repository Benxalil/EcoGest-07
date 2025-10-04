import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Users, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useClasses } from "@/hooks/useClasses";
import { useUserRole } from "@/hooks/useUserRole";
import { useTeacherFilter } from "@/hooks/useTeacherFilter";
import { formatClassName } from "@/utils/classNameFormatter";

// Helper function to define academic order
const getClassOrder = (name: string, section: string): number => {
  const levelOrder: { [key: string]: number } = {
    'CI': 1, 'CP': 2, 'CE1': 3, 'CE2': 4, 'CM1': 5, 'CM2': 6,
    '6ème': 7, 'Sixième': 7,
    '5ème': 8, 'Cinquième': 8,
    '4ème': 9, 'Quatrième': 9,
    '3ème': 10, 'Troisième': 10,
    '2nde': 11, 'Seconde': 11,
    '1ère': 12, 'Première': 12,
    'Terminale': 13, 'Tle': 13
  };
  
  const labelMatch = section?.match(/[A-Z]$/);
  const label = labelMatch ? labelMatch[0] : '';
  
  const labelOrder: { [key: string]: number } = {
    'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 
    'F': 6, 'G': 7, 'H': 8, 'I': 9, 'J': 10
  };
  
  const levelNum = levelOrder[name] || 999;
  const labelNum = labelOrder[label] || 0;
  
  return levelNum * 100 + labelNum;
};

// Fonction pour trier les classes dans l'ordre académique
const sortClassesAcademically = (classes: any[]): any[] => {
  return classes.sort((a, b) => {
    const orderA = getClassOrder(a.name, a.section || '');
    const orderB = getClassOrder(b.name, b.section || '');
    return orderA - orderB;
  });
};

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
  const { isTeacher } = useUserRole();
  const { teacherClassIds, loading: filterLoading } = useTeacherFilter();

  const handleViewNotes = (classeId: string) => {
    navigate(`/notes/classe/${classeId}`);
  };

  // Filtrer les classes pour les enseignants
  const filteredClasses = isTeacher() 
    ? classes.filter(classe => teacherClassIds.includes(classe.id))
    : classes;

  const classesFiltered = filteredClasses.filter((classe) =>
    classe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classe.level.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Trier les classes dans l'ordre académique
  const sortedClasses = sortClassesAcademically(classesFiltered);

  if (loading || filterLoading) {
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
          {sortedClasses.map((classe) => (
            <div key={classe.id} className="flex items-center justify-between p-4 bg-card rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4 flex-1">
                <Users className="h-5 w-5 text-primary" />
                <div className="flex items-center gap-6 flex-1">
                  <h3 className="font-semibold text-base min-w-[200px]">{formatClassName(classe)}</h3>
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

        {sortedClasses.length === 0 && (
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