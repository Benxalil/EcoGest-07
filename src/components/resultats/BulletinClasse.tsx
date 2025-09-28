import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";
import { generateBulletinClassePDF } from "@/utils/pdfGeneratorClasse";
import { useResults } from "@/hooks/useResults";
import { supabase } from "@/integrations/supabase/client";

interface Student {
  id: string;
  nom: string;
  prenom: string;
  classe: string;
  numero?: string;
  moyenneGenerale?: number;
  rang?: number;
}

interface Classe {
  id: string;
  session: string;
  libelle: string;
  effectif: number;
}

interface Matiere {
  id: number;
  nom: string;
}

interface EleveNote {
  eleveId: string;
  semestre1: {
    devoir: string | number;
    composition: string | number;
  };
  semestre2: {
    devoir: string | number;
    composition: string | number;
  };
}

interface StudentWithStats extends Student {
  moyenneGenerale: number;
  rang: number;
}

interface BulletinClasseProps {
  classe: Classe;
  eleves: StudentWithStats[];
  matieresClasse?: Matiere[];
  semestre: string;
  schoolSystem?: 'semestre' | 'trimestre';
  classeId?: string;
  examId?: string;
  examData?: any; // Données de l'examen pour déterminer le type
  onClose?: () => void;
}

export const BulletinClasse: React.FC<BulletinClasseProps> = ({
  classe,
  eleves,
  matieresClasse,
  semestre,
  schoolSystem,
  classeId,
  examId,
  examData
}) => {
  const [studentsData, setStudentsData] = useState<any[]>([]);
  const { getStudentExamStats } = useResults();

  // Récupérer les données des élèves depuis la base de données
  useEffect(() => {
    const fetchStudentsData = async () => {
      if (!classeId) return;
      
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, date_of_birth, student_number')
        .eq('class_id', classeId);
      
      if (error) {
        console.error('Erreur lors de la récupération des élèves:', error);
        return;
      }
      
      setStudentsData(data || []);
    };

    fetchStudentsData();
  }, [classeId]);

  // Fonction pour récupérer les statistiques d'un élève via le hook useResults
  const getEleveStatistics = (eleveId: string) => {
    if (!classeId || !examId) {
      return {
        moyenneGenerale: 0,
        moyenneDevoir: 0,
        moyenneComposition: 0
      };
    }

    const stats = getStudentExamStats(classeId, examId, eleveId);
    return {
      moyenneGenerale: stats?.moyenneGenerale || 0,
      moyenneDevoir: stats?.moyenneDevoir || 0,
      moyenneComposition: stats?.moyenneComposition || 0
    };
  };

  // Fonction pour générer l'appréciation basée sur la moyenne
  const getAppreciation = (moyenne: number) => {
    if (moyenne >= 16) return "Très Bien";
    if (moyenne >= 14) return "Bien";
    if (moyenne >= 12) return "Assez Bien";
    if (moyenne >= 10) return "Passable";
    if (moyenne >= 8) return "Insuffisant";
    return "Médiocre";
  };

  // Fonction pour obtenir la date de naissance d'un élève depuis la base de données
  const getDateNaissance = (eleveId: string) => {
    const student = studentsData.find(s => s.id === eleveId);
    if (student?.date_of_birth) {
      return new Date(student.date_of_birth).toLocaleDateString('fr-FR');
    }
    return "Non renseignée";
  };

  // Calculer le classement des élèves avec les vraies données
  const getElevesWithRank = () => {
    const elevesWithStats = eleves.map(eleve => {
      const stats = getEleveStatistics(eleve.id);
      return {
        ...eleve,
        moyenneGenerale: stats.moyenneGenerale
      };
    });

    // Trier par moyenne décroissante
    const elevesTries = elevesWithStats.sort((a, b) => b.moyenneGenerale - a.moyenneGenerale);

    // Assigner les rangs
    return elevesTries.map((eleve, index) => ({
      ...eleve,
      rang: index + 1
    }));
  };

  const getExamLabel = () => {
    // Si l'examen est de type Composition, afficher le semestre
    if (examData?.title?.toLowerCase().includes('composition') || examData?.exam_title?.toLowerCase().includes('composition')) {
      if (schoolSystem === 'trimestre') {
        switch(semestre) {
          case "1": return "1er TRIMESTRE";
          case "2": return "2e TRIMESTRE";
          case "3": return "3e TRIMESTRE";
          default: return "1er TRIMESTRE";
        }
      } else {
        switch(semestre) {
          case "1": return "1er SEMESTRE";
          case "2": return "2e SEMESTRE";
          default: return "1er SEMESTRE";
        }
      }
    }
    // Sinon, afficher le nom exact de l'examen
    return examData?.title || examData?.exam_title || 'Examen';
  };

  const handleExportPDF = () => {
    const elevesClasses = getElevesWithRank();
    generateBulletinClassePDF(classe, elevesClasses as any, matieresClasse || [], semestre, schoolSystem || 'semestre', classeId || "", examData);
  };

  const elevesClasses = getElevesWithRank();

  return (
    <div className="space-y-6">
      {/* En-tête avec informations de la classe */}
      <div className="bg-blue-50 p-6 rounded-lg border">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-blue-800">BULLETIN COLLECTIF DE LA CLASSE</h2>
          <div className="text-lg font-semibold text-blue-700">
            {classe.session} {classe.libelle}
          </div>
          <div className="text-base text-blue-600">
            {getExamLabel()} - Effectif: {eleves.length} élèves
          </div>
        </div>
        
        {/* Bouton d'export PDF */}
        <div className="flex justify-end mt-4">
          <Button 
            onClick={handleExportPDF}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Télécharger PDF
          </Button>
        </div>
      </div>

      {/* Tableau des élèves avec classement */}
      <div className="border rounded-lg bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-blue-600 text-white">
              <TableHead className="text-white font-bold text-center w-16">Rang</TableHead>
              <TableHead className="text-white font-bold">Prénom & Nom</TableHead>
              <TableHead className="text-white font-bold text-center">Date de Naissance</TableHead>
              {/* Affichage conditionnel selon le type d'examen */}
              {(examData?.exam_title?.toLowerCase().includes('composition') || examData?.title?.toLowerCase().includes('composition')) ? (
                <>
                  <TableHead className="text-white font-bold text-center">Moyenne Devoir</TableHead>
                  <TableHead className="text-white font-bold text-center">Moyenne Composition</TableHead>
                </>
              ) : (
                <TableHead className="text-white font-bold text-center">
                  {examData?.exam_title || examData?.title || 'Moyenne'}
                </TableHead>
              )}
              <TableHead className="text-white font-bold text-center">Appréciation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {elevesClasses.map((eleve, index) => {
              const stats = getEleveStatistics(eleve.id);
              const dateNaissance = getDateNaissance(eleve.id);
              const appreciation = getAppreciation(stats.moyenneGenerale);
              
              return (
                <TableRow key={eleve.id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                  <TableCell className="text-center font-bold text-blue-600">
                    {eleve.rang}
                  </TableCell>
                  <TableCell className="font-medium">
                    {eleve.prenom} {eleve.nom}
                  </TableCell>
                  <TableCell className="text-center">
                    {dateNaissance}
                  </TableCell>
                  {/* Affichage conditionnel selon le type d'examen */}
                  {(examData?.exam_title?.toLowerCase().includes('composition') || examData?.title?.toLowerCase().includes('composition')) ? (
                    <>
                      <TableCell className="text-center font-medium">
                        {stats.moyenneDevoir > 0 ? stats.moyenneDevoir.toFixed(2) : "-"}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {stats.moyenneComposition > 0 ? stats.moyenneComposition.toFixed(2) : "-"}
                      </TableCell>
                    </>
                  ) : (
                    <TableCell className="text-center font-medium">
                      {stats.moyenneGenerale > 0 ? stats.moyenneGenerale.toFixed(2) : "-"}
                    </TableCell>
                  )}
                  <TableCell className="text-center font-bold text-green-600">
                    {appreciation}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Légende */}
      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
        <strong>Légende:</strong> Les élèves sont classés par ordre décroissant de moyenne générale. 
        <br />
        <strong>Appréciations:</strong> Très Bien (≥16), Bien (≥14), Assez Bien (≥12), Passable (≥10), Insuffisant (≥8), Médiocre (&lt;8).
      </div>
    </div>
  );
};