
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
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
import { getSchoolSettings } from './schoolSettings';

interface Student {
  id: string;
  nom: string;
  prenom: string;
  classe: string;
  numero?: number;
  dateNaissance?: string;
  lieuNaissance?: string;
  matricule?: string;
  numeroPerso?: string;
  serie?: string;
}

interface Classe {
  id: string;
  session: string;
  libelle: string;
  effectif: number;
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

export const generateBulletinPDF = async (
  eleve: Student,
  classe: Classe,
  semestre: string
) => {
  const academicYear = await getSchoolAcademicYear();
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const page = pdfDoc.addPage([595, 842]); // A4 format
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const schoolSettings = getSchoolSettings();

  // Helper functions
  const getEleveInfo = async () => {
    // TODO: Remplacer par hook Supabase
    const savedEleves = null; // Temporaire - remplacer par useStudents
    let eleveComplet = eleve;
    
    // First check localStorage for existing data
    if (savedEleves) {
      const elevesData = JSON.parse(savedEleves);
      const eleveDetails = elevesData.find((e: any) => e.id === eleve.id);
      if (eleveDetails) {
        // Merge all eleve data, including numeroPerso as matricule
        eleveComplet = { 
          ...eleve, 
          ...eleveDetails,
          matricule: eleveDetails.numeroPerso || eleveDetails.matricule // Use numeroPerso as matricule
        };
      }
    }
    
    // Try to get additional data from Supabase (for newer students)
    try {
      const { data: student } = await supabase
        .from('students')
        .select('date_of_birth, place_of_birth, student_number')
        .eq('first_name', eleve.prenom)
        .eq('last_name', eleve.nom)
        .single();
        
      if (student) {
        if (student.date_of_birth) eleveComplet.dateNaissance = student.date_of_birth;
        if (student.place_of_birth) eleveComplet.lieuNaissance = student.place_of_birth;
        if (student.student_number) eleveComplet.matricule = student.student_number;
      }
    } catch (error) {
      // Debug remplacé par hook Supabase
    }
    
    // Get classe details for series information
    // TODO: Remplacer par hook Supabase
    const savedClasses = null; // Temporaire - remplacer par useClasses
    if (savedClasses) {
      const classesData = JSON.parse(savedClasses);
      const classeDetails = classesData.find((c: any) => c.id === classe.id);
      if (classeDetails && classeDetails.serie) {
        eleveComplet.serie = classeDetails.serie;
      }
    }
    
    return eleveComplet;
  };

  const getAbsencesRetards = () => {
    const absencesKey = `absences_${classe.id}`;
    const savedAbsences = localStorage.getItem(absencesKey);
    let retards = 0, absJustifiees = 0, absNonJustifiees = 0;
    
    if (savedAbsences) {
      const absencesData = JSON.parse(savedAbsences);
      const eleveAbsences = absencesData.filter((abs: any) => abs.eleveId === eleve.id);
      
      eleveAbsences.forEach((abs: any) => {
        if (abs.type === 'retard') {
          retards += parseFloat(abs.duree || '1');
        } else if (abs.type === 'absence') {
          if (abs.justifiee) absJustifiees++;
          else absNonJustifiees++;
        }
      });
    }
    return { retards, absJustifiees, absNonJustifiees };
  };

  // Get and merge data first
  const eleveInfo = await getEleveInfo();
  // Remplacé par hook Supabase
      // const savedMatieres = // localStorage.getItem("matieres") // Remplacé par hook Supabase;
  // TODO: Remplacer par hook Supabase
  const savedMatieres = null; // Temporaire - remplacer par useSubjects
  let matieresClasse: any[] = [];
  if (savedMatieres) {
    const allMatieres = JSON.parse(savedMatieres);
    matieresClasse = allMatieres.filter((matiere: any) => matiere.classeId === classe.id);
  }

  const getMoyenneSemestre = (semestreNum: string) => {
    let totalPoints = 0;
    let totalCoef = 0;
    
    matieresClasse.forEach((matiere) => {
      const notesKey = `notes_${classe.id}_${matiere.id}`;
      const savedNotes = localStorage.getItem(notesKey);
      
      if (savedNotes) {
        const notes = JSON.parse(savedNotes);
        const eleveNote = notes.find((note: EleveNote) => note.eleveId === eleve.id);
        if (eleveNote) {
          const semestreKey = semestreNum === "1" ? "semestre1" : "semestre2";
          const notesSemestre = eleveNote[semestreKey as keyof typeof eleveNote];
          
          if (notesSemestre && typeof notesSemestre === 'object' && 'devoir' in notesSemestre && 'composition' in notesSemestre) {
            const devoirValue = typeof notesSemestre.devoir === 'string' ? parseFloat(notesSemestre.devoir) : notesSemestre.devoir;
            const compositionValue = typeof notesSemestre.composition === 'string' ? parseFloat(notesSemestre.composition) : notesSemestre.composition;
            
            if (devoirValue !== -1 && !isNaN(devoirValue) && compositionValue !== -1 && !isNaN(compositionValue)) {
              const moyenne = (devoirValue + compositionValue) / 2;
              const coef = parseFloat(matiere.coefficient) || 1; // Utiliser le coefficient de la matière
              totalPoints += moyenne * coef;
              totalCoef += coef;
            }
          }
        }
      }
    });
    
    return totalCoef > 0 ? (totalPoints / totalCoef) : null;
  };

  const getRangSemestre = (semestreNum: string) => {
    // Get all students in the class
    // TODO: Remplacer par hook Supabase
    const savedEleves = null; // Temporaire - remplacer par useStudents
    if (!savedEleves) return { rang: null, total: 0 };
    
    const elevesData = JSON.parse(savedEleves);
    const elevesClasse = elevesData.filter((e: any) => e.classe === eleve.classe);
    
    // Calculate averages for all students
    const moyennesEleves: { eleveId: string, moyenne: number }[] = [];
    
    elevesClasse.forEach((etudiant: any) => {
      let totalPoints = 0;
      let totalCoef = 0;
      
      matieresClasse.forEach((matiere) => {
        const notesKey = `notes_${classe.id}_${matiere.id}`;
        const savedNotes = localStorage.getItem(notesKey);
        
        if (savedNotes) {
          const notes = JSON.parse(savedNotes);
          const eleveNote = notes.find((note: EleveNote) => note.eleveId === etudiant.id);
          if (eleveNote) {
            const semestreKey = semestreNum === "1" ? "semestre1" : "semestre2";
            const notesSemestre = eleveNote[semestreKey as keyof typeof eleveNote];
            
            if (notesSemestre && typeof notesSemestre === 'object' && 'devoir' in notesSemestre && 'composition' in notesSemestre) {
              const devoirValue = typeof notesSemestre.devoir === 'string' ? parseFloat(notesSemestre.devoir) : notesSemestre.devoir;
              const compositionValue = typeof notesSemestre.composition === 'string' ? parseFloat(notesSemestre.composition) : notesSemestre.composition;
              
              if (devoirValue !== -1 && !isNaN(devoirValue) && compositionValue !== -1 && !isNaN(compositionValue)) {
                const moyenne = (devoirValue + compositionValue) / 2;
                const coef = parseFloat(matiere.coefficient) || 1; // Utiliser le coefficient de la matière
                totalPoints += moyenne * coef;
                totalCoef += coef;
              }
            }
          }
        }
      });
      
      if (totalCoef > 0) {
        moyennesEleves.push({
          eleveId: etudiant.id,
          moyenne: totalPoints / totalCoef
        });
      }
    });
    
    // Sort by average (descending)
    moyennesEleves.sort((a, b) => b.moyenne - a.moyenne);
    
    // Find current student's rank
    const rangIndex = moyennesEleves.findIndex(e => e.eleveId === eleve.id);
    const rang = rangIndex !== -1 ? rangIndex + 1 : null;
    
    return { rang, total: moyennesEleves.length };
  };

  const drawTable = (x: number, y: number, cellWidth: number, cellHeight: number, rows: number, cols: number) => {
    // Horizontal lines
    for (let i = 0; i <= rows; i++) {
      page.drawLine({
        start: { x, y: y - i * cellHeight },
        end: { x: x + cols * cellWidth, y: y - i * cellHeight },
        color: rgb(0, 0, 0),
        thickness: 1,
      });
    }
    // Vertical lines
    for (let j = 0; j <= cols; j++) {
      page.drawLine({
        start: { x: x + j * cellWidth, y },
        end: { x: x + j * cellWidth, y: y - rows * cellHeight },
        color: rgb(0, 0, 0),
        thickness: 1,
      });
    }
  };

  const drawCheckbox = (x: number, y: number, checked: boolean) => {
    page.drawRectangle({
      x, y, width: 12, height: 12,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });
    if (checked) {
      page.drawText('X', { x: x + 3, y: y + 2, size: 8, font: boldFont });
    }
  };

  const semestreLabel = semestre === "1" ? "PREMIER SEMESTRE" : "DEUXIÈME SEMESTRE";
  const moyenneSemestre1 = getMoyenneSemestre("1");
  const moyenneSemestre2 = getMoyenneSemestre("2");
  let moyenneGeneraleAnnuelle = null;
  if (moyenneSemestre1 !== null && moyenneSemestre2 !== null) {
    moyenneGeneraleAnnuelle = (moyenneSemestre1 + moyenneSemestre2) / 2;
  }

  // Decision logic
  const moyenneReference = moyenneGeneraleAnnuelle !== null ? moyenneGeneraleAnnuelle : (semestre === "1" ? moyenneSemestre1 : moyenneSemestre2);
  let decision = { admis: false, redouble: false, exclusion: false };
  if (moyenneReference !== null) {
    if (moyenneReference >= 10) decision.admis = true;
    else if (moyenneReference >= 8) decision.redouble = true;
    else decision.exclusion = true;
  }

  const absencesData = getAbsencesRetards();

  // EXACT REPRODUCTION OF CANVA MODEL - Precise positioning
  let yPos = height - 45;

  // =============== HEADER SECTION ===============
  page.drawText('RÉPUBLIQUE DU SÉNÉGAL', {
    x: 40, y: yPos, size: 10, font: boldFont
  });
  page.drawText(schoolSettings.nom || 'École Connectée', {
    x: width - 180, y: yPos, size: 10, font: boldFont
  });

  yPos -= 12;
  page.drawText('Ministère de l\'Éducation nationale', {
    x: 40, y: yPos, size: 8, font
  });
  page.drawText(`Année scolaire ${academicYear}`, {
    x: width - 160, y: yPos, size: 8, font
  });

  // =============== TITLE WITH LINES ===============
  yPos -= 35;
  const titleText = `BULLETIN DE NOTES DU ${semestreLabel}`;
  const titleWidth = boldFont.widthOfTextAtSize(titleText, 12);
  const titleX = (width - titleWidth) / 2;
  
  // Lines above title
  page.drawLine({
    start: { x: titleX - 120, y: yPos + 14 }, 
    end: { x: titleX + titleWidth + 120, y: yPos + 14 },
    color: rgb(0, 0, 0), thickness: 0.5
  });
  page.drawLine({
    start: { x: titleX - 120, y: yPos + 12 }, 
    end: { x: titleX + titleWidth + 120, y: yPos + 12 },
    color: rgb(0, 0, 0), thickness: 0.5
  });
  
  page.drawText(titleText, {
    x: titleX, y: yPos, size: 12, font: boldFont
  });
  
  // Lines below title
  page.drawLine({
    start: { x: titleX - 120, y: yPos - 12 }, 
    end: { x: titleX + titleWidth + 120, y: yPos - 12 },
    color: rgb(0, 0, 0), thickness: 0.5
  });
  page.drawLine({
    start: { x: titleX - 120, y: yPos - 14 }, 
    end: { x: titleX + titleWidth + 120, y: yPos - 14 },
    color: rgb(0, 0, 0), thickness: 0.5
  });

  // =============== STUDENT INFO (RECTANGLE, NOT A TABLE) ===============
  yPos -= 30;
  const infoTableX = 20;
  const infoTableY = yPos;
  const infoTableWidth = 555;
  const infoTableHeight = 80;

  // Outer rectangle only
  page.drawRectangle({
    x: infoTableX, y: infoTableY - infoTableHeight,
    width: infoTableWidth, height: infoTableHeight,
    borderColor: rgb(0, 0, 0), borderWidth: 1
  });

  // Title inside the rectangle (centered)
  const infoTitleText = "INFORMATIONS DE L'ÉLÈVE";
  const infoTitleWidth = boldFont.widthOfTextAtSize(infoTitleText, 9);
  page.drawText(infoTitleText, {
    x: infoTableX + (infoTableWidth - infoTitleWidth) / 2, y: infoTableY - 12, size: 9, font: boldFont
  });

  // Content in two columns with strict alignment
  const leftColX = infoTableX + 8;
  const rightColX = infoTableX + infoTableWidth / 2 + 8;
  const rowSpacing = 16;
  let infoY = infoTableY - 28;

  // First row - strictly aligned
  page.drawText(`Prénom : ${eleveInfo.prenom}`, { x: leftColX, y: infoY, size: 8, font });
  page.drawText(`Nom : ${eleveInfo.nom}`, { x: rightColX, y: infoY, size: 8, font });

  infoY -= rowSpacing;
  // Second row - strictly aligned
  page.drawText(`Date de naissance : ${eleveInfo.dateNaissance || '__/__/____'}`, { x: leftColX, y: infoY, size: 8, font });
  page.drawText(`Lieu de naissance : ${eleveInfo.lieuNaissance || '____________'}`, { x: rightColX, y: infoY, size: 8, font });

  infoY -= rowSpacing;
  // Third row - strictly aligned  
  page.drawText(`Matricule : ${eleveInfo.matricule || eleveInfo.numeroPerso || '_______'}`, { x: leftColX, y: infoY, size: 8, font });
  page.drawText(`Classe : ${classe.session} ${classe.libelle}`, { x: rightColX, y: infoY, size: 8, font });

  infoY -= rowSpacing;
  // Fourth row - strictly aligned
  page.drawText(`Effectif de la classe : ${classe.effectif}`, { x: leftColX, y: infoY, size: 8, font });
  page.drawText(`Série : ${eleveInfo.serie || '__________'}`, { x: rightColX, y: infoY, size: 8, font });

  // =============== MAIN GRADES TABLE ===============
  yPos -= 105;
  const gradesTableX = 20;
  const gradesTableY = yPos;
  const gradesTableWidth = 555;
  
  // Table configuration - 7 columns matching Canva model exactly
  const columnWidths = [130, 60, 60, 50, 45, 85, 125]; // Total = 555
  const numRows = matieresClasse.length + 2; // +1 for header, +1 for total
  const gradeRowHeight = 18;

  // Draw complete table grid
  let currentX = gradesTableX;
  for (let col = 0; col <= columnWidths.length; col++) {
    page.drawLine({
      start: { x: currentX, y: gradesTableY },
      end: { x: currentX, y: gradesTableY - numRows * gradeRowHeight },
      color: rgb(0, 0, 0), thickness: 1
    });
    if (col < columnWidths.length) currentX += columnWidths[col];
  }

  for (let row = 0; row <= numRows; row++) {
    page.drawLine({
      start: { x: gradesTableX, y: gradesTableY - row * gradeRowHeight },
      end: { x: gradesTableX + gradesTableWidth, y: gradesTableY - row * gradeRowHeight },
      color: rgb(0, 0, 0), thickness: 1
    });
  }

  // Header row with gray background
  page.drawRectangle({
    x: gradesTableX, y: gradesTableY - gradeRowHeight,
    width: gradesTableWidth, height: gradeRowHeight,
    color: rgb(0.9, 0.9, 0.9)
  });

  // Header texts - exact positioning
  const headers = ['MATIÈRES', 'DEVOIR', 'COMPO', 'MOY', 'COEF', 'MOY×COEF', 'APPRÉ-CIATION'];
  let headerX = gradesTableX;
  headers.forEach((header, index) => {
    const textWidth = boldFont.widthOfTextAtSize(header, 7);
    const textX = index === 0 ? headerX + 5 : headerX + (columnWidths[index] - textWidth) / 2;
    page.drawText(header, { x: textX, y: gradesTableY - 12, size: 7, font: boldFont });
    headerX += columnWidths[index];
  });

  // Data rows
  let dataY = gradesTableY - gradeRowHeight;
  let totalPoints = 0, totalCoeff = 0;

  matieresClasse.forEach((matiere) => {
    dataY -= gradeRowHeight;
    const notesKey = `notes_${classe.id}_${matiere.id}`;
    const savedNotes = localStorage.getItem(notesKey);
    
    let devoir = '-', composition = '-', moyenne = '-', moyenneCoef = '-', appreciation = '-';
    
    if (savedNotes) {
      const notes = JSON.parse(savedNotes);
      const eleveNote = notes.find((note: EleveNote) => note.eleveId === eleve.id);
      if (eleveNote) {
        const semestreKey = semestre === "1" ? "semestre1" : "semestre2";
        const notesSemestre = eleveNote[semestreKey as keyof typeof eleveNote];
        
        if (notesSemestre && typeof notesSemestre === 'object' && 'devoir' in notesSemestre && 'composition' in notesSemestre) {
          const devoirValue = typeof notesSemestre.devoir === 'string' ? parseFloat(notesSemestre.devoir) : notesSemestre.devoir;
          const compositionValue = typeof notesSemestre.composition === 'string' ? parseFloat(notesSemestre.composition) : notesSemestre.composition;
          
          if (devoirValue !== -1 && !isNaN(devoirValue)) devoir = devoirValue.toFixed(1);
          if (compositionValue !== -1 && !isNaN(compositionValue)) composition = compositionValue.toFixed(1);
          
          if (devoirValue !== -1 && compositionValue !== -1 && !isNaN(devoirValue) && !isNaN(compositionValue)) {
            const moy = (devoirValue + compositionValue) / 2;
            moyenne = moy.toFixed(1);
            const coef = parseFloat(matiere.coefficient) || 1; // Utiliser le coefficient de la matière
            const moyCoef = moy * coef;
            moyenneCoef = moyCoef.toFixed(1);
            
            totalPoints += moyCoef;
            totalCoeff += coef;
            
            if (moy >= 16) appreciation = 'Très Bien';
            else if (moy >= 14) appreciation = 'Bien';
            else if (moy >= 12) appreciation = 'Assez Bien';
            else if (moy >= 10) appreciation = 'Passable';
            else appreciation = 'Insuffisant';
          }
        }
      }
    }

    // Draw data row
    const rowData = [matiere.nom, devoir, composition, moyenne, '2', moyenneCoef, appreciation];
    let cellX = gradesTableX;
    rowData.forEach((data, index) => {
      const textWidth = font.widthOfTextAtSize(data, 7);
      const textX = index === 0 ? cellX + 5 : cellX + (columnWidths[index] - textWidth) / 2;
      page.drawText(data, { x: textX, y: dataY + 5, size: 7, font });
      cellX += columnWidths[index];
    });
  });

  // Total row with gray background
  dataY -= gradeRowHeight;
  page.drawRectangle({
    x: gradesTableX, y: dataY,
    width: gradesTableWidth, height: gradeRowHeight,
    color: rgb(0.95, 0.95, 0.95)
  });

  const totalMoyenne = totalCoeff > 0 ? (totalPoints / totalCoeff) : 0;
  const totalRowData = ['TOTAL', '', '', totalMoyenne.toFixed(1), totalCoeff.toString(), totalPoints.toFixed(1), ''];
  let totalCellX = gradesTableX;
  totalRowData.forEach((data, index) => {
    if (data !== '') {
      const textWidth = boldFont.widthOfTextAtSize(data, 8);
      const textX = index === 0 ? totalCellX + 5 : totalCellX + (columnWidths[index] - textWidth) / 2;
      page.drawText(data, { x: textX, y: dataY + 5, size: 8, font: boldFont });
    }
    totalCellX += columnWidths[index];
  });

  // =============== BOTTOM SECTIONS ===============
  yPos = dataY - 40;

  const contentX = 20;
  const contentWidth = 555;
  const colGap = 15;
  const colWidth = (contentWidth - colGap) / 2; // Two columns
  const leftX = contentX;
  const rightX = contentX + colWidth + colGap;
  const boxHeight = 75;
  const rowGap = 15;

  // Row 1: SEMESTRES (left) + DÉCISION (right)
  const row1Y = yPos;

  // SEMESTRES - Two side-by-side blocks
  page.drawRectangle({ x: leftX, y: row1Y - boxHeight, width: colWidth, height: boxHeight, borderColor: rgb(0, 0, 0), borderWidth: 1 });
  page.drawText('SEMESTRES', { x: leftX + 8, y: row1Y - 15, size: 8, font: boldFont });
  
  // Two blocks side by side within the rectangle
  const semestreBlockWidth = (colWidth - 24) / 2; // Divide available width
  const leftBlockX = leftX + 8;
  const rightBlockX = leftX + 8 + semestreBlockWidth + 8;
  
  // Calculate ranks for both semesters
  const rangSemestre1 = getRangSemestre("1");
  const rangSemestre2 = getRangSemestre("2");

  // Semestre 1 block - always show
  page.drawText('Semestre 1:', { x: leftBlockX, y: row1Y - 28, size: 7, font: boldFont });
  page.drawText(`Moy: ${moyenneSemestre1 !== null ? moyenneSemestre1.toFixed(2) : '___'}`, { x: leftBlockX, y: row1Y - 40, size: 7, font });
  page.drawText(`Rang: ${rangSemestre1.rang !== null ? `${rangSemestre1.rang}/${rangSemestre1.total}` : '___/___'}`, { x: leftBlockX, y: row1Y - 52, size: 7, font });
  
  // Semestre 2 block - only show if current semester is 2
  page.drawText('Semestre 2:', { x: rightBlockX, y: row1Y - 28, size: 7, font: boldFont });
  if (semestre === "2") {
    page.drawText(`Moy: ${moyenneSemestre2 !== null ? moyenneSemestre2.toFixed(2) : '___'}`, { x: rightBlockX, y: row1Y - 40, size: 7, font });
    page.drawText(`Rang: ${rangSemestre2.rang !== null ? `${rangSemestre2.rang}/${rangSemestre2.total}` : '___/___'}`, { x: rightBlockX, y: row1Y - 52, size: 7, font }); } else {
    // Semestre 1 - leave empty
    page.drawText('Moy: ___', { x: rightBlockX, y: row1Y - 40, size: 7, font });
    page.drawText('Rang: ___/___', { x: rightBlockX, y: row1Y - 52, size: 7, font });
  }
  
  // Moyenne générale - only show if both semesters are available (semester 2)
  let moyGenText = '';
  if (semestre === "2" && moyenneGeneraleAnnuelle !== null) {
    moyGenText = `Moyenne générale : ${moyenneGeneraleAnnuelle.toFixed(2)}`;
  } else if (semestre === "1") {
    moyGenText = 'Moyenne générale : ___'; } else {
    moyGenText = `Moyenne générale : ${moyenneGeneraleAnnuelle !== null ? moyenneGeneraleAnnuelle.toFixed(2) : '___'}`;
  }
  const moyGenWidth = font.widthOfTextAtSize(moyGenText, 7);
  page.drawText(moyGenText, { x: leftX + (colWidth - moyGenWidth) / 2, y: row1Y - 67, size: 7, font: boldFont });

  // DÉCISION DU CONSEIL
  page.drawRectangle({ x: rightX, y: row1Y - boxHeight, width: colWidth, height: boxHeight, borderColor: rgb(0, 0, 0), borderWidth: 1 });
  page.drawText('DÉCISION DU CONSEIL', { x: rightX + 8, y: row1Y - 15, size: 8, font: boldFont });
  let decY = row1Y - 28;
  page.drawText('Admis(e)', { x: rightX + 12, y: decY, size: 7, font });
  drawCheckbox(rightX + 60, decY - 2, decision.admis);
  decY -= 12;
  page.drawText('Redouble', { x: rightX + 12, y: decY, size: 7, font });
  drawCheckbox(rightX + 60, decY - 2, decision.redouble);
  decY -= 12;
  page.drawText('Exclusion', { x: rightX + 12, y: decY, size: 7, font });
  drawCheckbox(rightX + 60, decY - 2, decision.exclusion);

  // Row 2: ABSENCES (left) + OBSERVATIONS (right)
  const row2Y = row1Y - boxHeight - rowGap;

  // ABSENCES & RETARDS
  page.drawRectangle({ x: leftX, y: row2Y - boxHeight, width: colWidth, height: boxHeight, borderColor: rgb(0, 0, 0), borderWidth: 1 });
  page.drawText('ABSENCES & RETARDS', { x: leftX + 8, y: row2Y - 15, size: 8, font: boldFont });
  page.drawText(`Retards: ${absencesData.retards}h`, { x: leftX + 8, y: row2Y - 30, size: 7, font });
  page.drawText(`Abs. just.: ${absencesData.absJustifiees}`, { x: leftX + 8, y: row2Y - 42, size: 7, font });
  page.drawText(`Abs. non just.: ${absencesData.absNonJustifiees}`, { x: leftX + 8, y: row2Y - 54, size: 7, font });

  // OBSERVATIONS DU CONSEIL DES PROFESSEURS
  page.drawRectangle({ x: rightX, y: row2Y - boxHeight, width: colWidth, height: boxHeight, borderColor: rgb(0, 0, 0), borderWidth: 1 });
  page.drawText('OBSERVATIONS DU CONSEIL', { x: rightX + 8, y: row2Y - 15, size: 8, font: boldFont });
  page.drawText('DES PROFESSEURS', { x: rightX + 8, y: row2Y - 27, size: 8, font: boldFont });

  // Prepare Y for signature section
  yPos = row2Y - boxHeight - 20;

  // =============== SIGNATURE AND DATE ===============
  yPos -= 80;
  const today = new Date();
  const dateStr = today.toLocaleDateString('fr-FR');
  
  page.drawText(`Fait le ${dateStr}`, { x: 40, y: yPos, size: 9, font });
  page.drawText('Le Chef d\'établissement', { x: width - 180, y: yPos, size: 9, font: boldFont });

  // Generate and download PDF
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  const fileName = `bulletin_${eleveInfo.prenom}_${eleveInfo.nom}_${semestreLabel.replace(/\s/g, '_')}.pdf`;
  link.download = fileName;
  link.click();
};
