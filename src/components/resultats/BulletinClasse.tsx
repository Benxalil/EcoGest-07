import React from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";
import { generateBulletinClassePDF } from "@/utils/pdfGeneratorClasse";

interface Student {
  id: string;
  nom: string;
  prenom: string;
  classe: string;
  numero?: number;
  moyenneGenerale: number;
  rang: number;
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

interface BulletinClasseProps {
  classe: Classe;
  eleves: Student[];
  matieresClasse: Matiere[];
  semestre: string;
  schoolSystem: 'semestre' | 'trimestre';
  classeId: string;
}

export const BulletinClasse: React.FC<BulletinClasseProps> = ({
  classe,
  eleves,
  matieresClasse,
  semestre,
  schoolSystem,
  classeId
}) => {
  // Fonction pour récupérer les notes d'un élève pour les matières de la classe
  const getEleveNotesForAllMatieres = (eleveId: string) => {
    const notesParMatiere: { [key: string]: EleveNote } = {};
    matieresClasse.forEach(matiere => {
      const notesKey = `notes_${classeId}_${matiere.id}`;
      const savedNotes = localStorage.getItem(notesKey);
      if (savedNotes) {
        const notes = JSON.parse(savedNotes);
        const eleveNote = notes.find((note: EleveNote) => note.eleveId === eleveId);
        if (eleveNote) {
          notesParMatiere[matiere.nom] = eleveNote;
        }
      }
    });
    return notesParMatiere;
  };

  // Fonction pour calculer les statistiques d'un élève
  const getEleveStatistics = (eleveId: string) => {
    const notesParMatiere = getEleveNotesForAllMatieres(eleveId);
    const semestreKey = semestre === "1" ? "semestre1" : "semestre2";
    let totalDevoir = 0;
    let countDevoir = 0;
    let totalComposition = 0;
    let countComposition = 0;

    Object.entries(notesParMatiere).forEach(([matiere, notes]) => {
      const notesSemestre = notes[semestreKey as keyof typeof notes];

      if (notesSemestre && typeof notesSemestre === 'object' && 'devoir' in notesSemestre && 'composition' in notesSemestre) {
        const devoirValue = typeof notesSemestre.devoir === 'string' ? parseFloat(notesSemestre.devoir) : notesSemestre.devoir;
        const compositionValue = typeof notesSemestre.composition === 'string' ? parseFloat(notesSemestre.composition) : notesSemestre.composition;
        
        if (devoirValue !== -1 && !isNaN(devoirValue) && devoirValue > 0) {
          totalDevoir += devoirValue;
          countDevoir++;
        }
        if (compositionValue !== -1 && !isNaN(compositionValue) && compositionValue > 0) {
          totalComposition += compositionValue;
          countComposition++;
        }
      }
    });

    const moyenneDevoir = countDevoir > 0 ? totalDevoir / countDevoir : 0;
    const moyenneComposition = countComposition > 0 ? totalComposition / countComposition : 0;
    const moyenneGenerale = countDevoir > 0 && countComposition > 0 
      ? (moyenneDevoir + moyenneComposition) / 2 
      : countDevoir > 0 
      ? moyenneDevoir 
      : countComposition > 0 
      ? moyenneComposition 
      : 0;

    return { 
      moyenneGenerale,
      moyenneDevoir,
      moyenneComposition
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

  // Fonction pour obtenir la date de naissance d'un élève
  const getDateNaissance = (eleveId: string) => {
    // Remplacé par hook Supabase
      // const savedStudents = // localStorage.getItem("eleves") // Remplacé par hook Supabase;
    if (savedStudents) {
      const students = JSON.parse(savedStudents);
      const student = students.find((s: any) => s.id === eleveId);
      return student?.dateNaissance || "Non renseignée";
    }
    return "Non renseignée";
  };

  // Calculer le classement des élèves
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

  const getSemestreLabel = () => {
    if (schoolSystem === 'trimestre') {
      return semestre === "1" ? "1er TRIMESTRE" : "2e TRIMESTRE"; } else {
      return semestre === "1" ? "1er SEMESTRE" : "2e SEMESTRE";
    }
  };

  const handleExportPDF = () => {
    const elevesClasses = getElevesWithRank();
    generateBulletinClassePDF(classe, elevesClasses, matieresClasse, semestre, schoolSystem, classeId);
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
            {getSemestreLabel()} - Effectif: {eleves.length} élèves
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
              <TableHead className="text-white font-bold text-center">Moyenne Devoir</TableHead>
              <TableHead className="text-white font-bold text-center">Moyenne Composition</TableHead>
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
                  <TableCell className="text-center font-medium">
                    {stats.moyenneDevoir > 0 ? stats.moyenneDevoir.toFixed(2) : "-"}
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {stats.moyenneComposition > 0 ? stats.moyenneComposition.toFixed(2) : "-"}
                  </TableCell>
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