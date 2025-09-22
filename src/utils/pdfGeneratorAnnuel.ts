import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

// Fonction pour obtenir l'année académique de l'école
const getSchoolAcademicYear = async (): Promise<string> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return '2024/2025';

    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single();

    if (profile?.school_id) {
      const { data: school } = await supabase
        .from('schools')
        .select('academic_year')
        .eq('id', profile.school_id)
        .single();

      return school?.academic_year || '2024/2025';
    }
    return '2024/2025';
  } catch (error) {
    console.error('Error fetching academic year:', error);
    return '2024/2025';
  }
};

interface Classe {
  id: string;
  session: string;
  libelle: string;
  effectif: number;
}

interface StudentWithData {
  id: string;
  nom: string;
  prenom: string;
  classe: string;
  numero?: number;
  annualAverage: number;
  periodAverages: {
    period: number;
    average: number;
  }[];
}

interface Matiere {
  id: string;
  nom: string;
}

export const generateBulletinAnnuelPDF = async (
  classe: Classe,
  students: StudentWithData[],
  schoolSystem: string,
  matieres: Matiere[]
) => {
  const academicYear = await getSchoolAcademicYear();
  const doc = new jsPDF();
  
  // Configuration des couleurs
  const primaryColor = [0, 100, 200]; // Bleu
  const secondaryColor = [100, 100, 100]; // Gris
  
  // En-tête de l'école
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 35, 'F');
  
  // Nom de l'école
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('ÉCOLE CONNECTÉE', 105, 15, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('École primaire moderne', 105, 25, { align: 'center' });
  doc.text('Adresse: 123 Rue de l\'Education, Ville', 105, 31, { align: 'center' });
  
  // Titre du bulletin
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const systemLabel = schoolSystem === "trimestre" ? "TRIMESTRES" : "SEMESTRES";
  doc.text(`BULLETIN ANNUEL - TOUS LES ${systemLabel}`, 105, 50, { align: 'center' });
  
  // Informations de la classe
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Classe: ${classe.session} ${classe.libelle}`, 105, 60, { align: 'center' });
  
  // Année scolaire (vient de la base de données)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Année scolaire: ${academicYear}`, 105, 68, { align: 'center' });
  
  // Statistiques générales
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Statistiques de la classe:', 20, 80);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre d'élèves: ${students.length}`, 20, 88);
  doc.text(`Nombre de matières: ${matieres.length}`, 20, 95);
  doc.text(`Système d'évaluation: ${schoolSystem}`, 20, 102);
  
  // Nombre de périodes
  const numberOfPeriods = schoolSystem === "trimestre" ? 3 : 2;
  
  // Fonction pour obtenir le label de période
  const getPeriodLabel = (period: number) => {
    if (schoolSystem === "trimestre") {
      return period === 1 ? "1er T" : period === 2 ? "2e T" : "3e T";
    }
    return period === 1 ? "1er S" : "2e S";
  };
  
  // Calcul de la largeur des colonnes
  const startX = 15;
  const tableWidth = 180;
  const columnWidths = {
    numero: 15,
    nom: 35,
    prenom: 30,
    periods: (tableWidth - 15 - 35 - 30 - 25) / numberOfPeriods, // Répartir l'espace restant
    moyenne: 25
  };
  
  // Tableau des résultats
  let yPosition = 115;
  
  // En-tête du tableau
  doc.setFillColor(240, 240, 240);
  doc.rect(startX, yPosition, tableWidth, 10, 'F');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  
  let xPosition = startX + 2;
  doc.text('N°', xPosition, yPosition + 7);
  xPosition += columnWidths.numero;
  
  doc.text('Nom', xPosition, yPosition + 7);
  xPosition += columnWidths.nom;
  
  doc.text('Prénom', xPosition, yPosition + 7);
  xPosition += columnWidths.prenom;
  
  // Colonnes des périodes
  for (let i = 1; i <= numberOfPeriods; i++) {
    doc.text(getPeriodLabel(i), xPosition + columnWidths.periods/2 - 5, yPosition + 7);
    xPosition += columnWidths.periods;
  }
  
  doc.text('Moy. An.', xPosition + columnWidths.moyenne/2 - 8, yPosition + 7);
  
  yPosition += 12;
  
  // Données des élèves
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  students.forEach((student, index) => {
    // Alternance de couleur pour les lignes
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(startX, yPosition, tableWidth, 8, 'F');
    }
    
    let xPos = startX + 2;
    
    // Numéro
    doc.text((student.numero || index + 1).toString(), xPos, yPosition + 5);
    xPos += columnWidths.numero;
    
    // Nom (tronqué si trop long)
    const nom = student.nom.length > 12 ? student.nom.substring(0, 12) + '...' : student.nom;
    doc.text(nom, xPos, yPosition + 5);
    xPos += columnWidths.nom;
    
    // Prénom (tronqué si trop long)
    const prenom = student.prenom.length > 10 ? student.prenom.substring(0, 10) + '...' : student.prenom;
    doc.text(prenom, xPos, yPosition + 5);
    xPos += columnWidths.prenom;
    
    // Moyennes par période
    student.periodAverages.forEach(periodData => {
      const average = periodData.average > 0 ? periodData.average.toFixed(1) : '-';
      doc.text(average, xPos + columnWidths.periods/2 - 5, yPosition + 5);
      xPos += columnWidths.periods;
    });
    
    // Moyenne annuelle
    const annualAvg = student.annualAverage > 0 ? student.annualAverage.toFixed(2) : '-';
    doc.text(annualAvg, xPos + columnWidths.moyenne/2 - 8, yPosition + 5);
    
    yPosition += 8;
    
    // Nouvelle page si nécessaire
    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }
  });
  
  // Moyennes de classe
  yPosition += 10;
  
  if (yPosition > 260) {
    doc.addPage();
    yPosition = 20;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Moyennes de classe:', 20, yPosition);
  
  yPosition += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  // Calculer les moyennes par période
  for (let period = 1; period <= numberOfPeriods; period++) {
    const periodAverages = students
      .map(s => s.periodAverages.find(p => p.period === period)?.average || 0)
      .filter(avg => avg > 0);
    
    if (periodAverages.length > 0) {
      const classPeriodAverage = periodAverages.reduce((sum, avg) => sum + avg, 0) / periodAverages.length;
      doc.text(`${getPeriodLabel(period).replace(' T', ' Trimestre').replace(' S', ' Semestre')}: ${classPeriodAverage.toFixed(2)}`, 20, yPosition);
      yPosition += 7;
    }
  }
  
  // Moyenne annuelle de classe
  const annualAverages = students
    .map(s => s.annualAverage)
    .filter(avg => avg > 0);
  
  if (annualAverages.length > 0) {
    const classAnnualAverage = annualAverages.reduce((sum, avg) => sum + avg, 0) / annualAverages.length;
    doc.setFont('helvetica', 'bold');
    doc.text(`Moyenne annuelle de classe: ${classAnnualAverage.toFixed(2)}`, 20, yPosition + 5);
  }
  
  // Pied de page
  yPosition += 20;
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.text('Signatures:', 20, yPosition);
  yPosition += 15;
  
  doc.setFont('helvetica', 'normal');
  doc.text('Le Directeur:', 20, yPosition);
  doc.text('Le Président des Parents d\'Élèves:', 120, yPosition);
  
  // Date
  yPosition += 20;
  const today = new Date();
  const dateStr = today.toLocaleDateString('fr-FR');
  doc.text(`Fait le ${dateStr}`, 20, yPosition);
  
  // Télécharger le PDF
  const fileName = `bulletin_annuel_${classe.session}_${classe.libelle}_${academicYear.replace('/', '-')}.pdf`;
  doc.save(fileName);
};