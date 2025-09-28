import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { getSchoolSettings } from './schoolSettings';
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

interface Student {
  id: string;
  nom: string;
  prenom: string;
  classe: string;
  numero?: number;
  dateNaissance?: string;
  lieuNaissance?: string;
  matricule?: string;
  serie?: string;
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
  rang: number;
  moyenneDevoir: number;
  moyenneComposition: number;
  moyenneGenerale: number;
  appreciation: string;
  dateNaissance: string;
  lieuNaissance?: string;
}

export const generateBulletinClassePDF = async (
  classe: Classe,
  eleves: Student[],
  matieresClasse: Matiere[],
  semestre: string,
  schoolSystem: 'semestre' | 'trimestre',
  classeId: string,
  examData?: any
) => {
  try {
    const academicYear = await getSchoolAcademicYear();
    
    // Créer un nouveau document PDF
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const schoolSettings = getSchoolSettings();

    // Ajouter une page en format A4 portrait
    const page = pdfDoc.addPage([595, 842]); // Format A4 portrait
    const { width, height } = page.getSize();

    // Helper functions - same logic as web component
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

    const getEleveStatistics = (eleveId: string) => {
      const notesParMatiere = getEleveNotesForAllMatieres(eleveId);
      const semestreKey = semestre === "1" ? "semestre1" : "semestre2";
      
      let totalNotesDevoir = 0;
      let totalNotesComposition = 0;
      let countDevoir = 0;
      let countComposition = 0;
      
      Object.values(notesParMatiere).forEach((notes) => {
        const notesSemestre = notes[semestreKey as keyof typeof notes];
        if (notesSemestre && typeof notesSemestre === 'object' && 'devoir' in notesSemestre && 'composition' in notesSemestre) {
          const devoirValue = typeof notesSemestre.devoir === 'string' ? parseFloat(notesSemestre.devoir) : notesSemestre.devoir;
          const compositionValue = typeof notesSemestre.composition === 'string' ? parseFloat(notesSemestre.composition) : notesSemestre.composition;
          
          if (devoirValue !== -1 && !isNaN(devoirValue)) {
            totalNotesDevoir += devoirValue;
            countDevoir++;
          }
          if (compositionValue !== -1 && !isNaN(compositionValue)) {
            totalNotesComposition += compositionValue;
            countComposition++;
          }
        }
      });
      
      const moyenneDevoir = countDevoir > 0 ? totalNotesDevoir / countDevoir : 0;
      const moyenneComposition = countComposition > 0 ? totalNotesComposition / countComposition : 0;
      const moyenneGenerale = (countDevoir > 0 && countComposition > 0) ? (moyenneDevoir + moyenneComposition) / 2 : 0;
      
      return { moyenneDevoir, moyenneComposition, moyenneGenerale };
    };

    const getAppreciation = (moyenne: number): string => {
      if (moyenne >= 16) return "Très Bien";
      if (moyenne >= 14) return "Bien";
      if (moyenne >= 12) return "Assez Bien";
      if (moyenne >= 10) return "Passable";
      return "Insuffisant";
    };

    const getDateNaissance = async (eleveId: string): Promise<string> => {
      // First check localStorage
      const savedEleves = null; // Temporaire - remplacer par useStudents
      if (savedEleves) {
        const elevesData = JSON.parse(savedEleves);
        const eleve = elevesData.find((e: any) => e.id === eleveId);
        if (eleve?.dateNaissance) {
          return new Date(eleve.dateNaissance).toLocaleDateString('fr-FR');
        }
      }
      
      // Try Supabase if not found in localStorage
      try {
        const student = eleves.find(e => e.id === eleveId);
        if (student) {
          const { data: supabaseStudent } = await supabase
            .from('students')
            .select('date_of_birth')
            .eq('first_name', student.prenom)
            .eq('last_name', student.nom)
            .single();
            
          if (supabaseStudent?.date_of_birth) {
            return new Date(supabaseStudent.date_of_birth).toLocaleDateString('fr-FR');
          }
        }
      } catch (error) {
        }
      
      return '-';
    };

    const getLieuNaissance = async (eleveId: string): Promise<string> => {
      // First check localStorage  
      const savedEleves = null; // Temporaire - remplacer par useStudents
      if (savedEleves) {
        const elevesData = JSON.parse(savedEleves);
        const eleve = elevesData.find((e: any) => e.id === eleveId);
        if (eleve?.lieuNaissance) {
          return eleve.lieuNaissance;
        }
      }
      
      // Try Supabase if not found in localStorage
      try {
        const student = eleves.find(e => e.id === eleveId);
        if (student) {
          const { data: supabaseStudent } = await supabase
            .from('students')
            .select('place_of_birth')
            .eq('first_name', student.prenom)
            .eq('last_name', student.nom)
            .single();
            
          if (supabaseStudent?.place_of_birth) {
            return supabaseStudent.place_of_birth;
          }
        }
      } catch (error) {
        }
      
      return '-';
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

    // Calculate student statistics and ranking
    const elevesWithStats: StudentWithStats[] = [];
    
    for (const eleve of eleves) {
      const stats = getEleveStatistics(eleve.id);
      const dateNaissance = await getDateNaissance(eleve.id);
      const lieuNaissance = await getLieuNaissance(eleve.id);
      const appreciation = getAppreciation(stats.moyenneGenerale);
      
      elevesWithStats.push({
        ...eleve,
        moyenneDevoir: stats.moyenneDevoir,
        moyenneComposition: stats.moyenneComposition,
        moyenneGenerale: stats.moyenneGenerale,
        appreciation,
        dateNaissance,
        lieuNaissance,
        rang: 0 // Will be set after sorting
      });
    }

    // Sort by moyenne générale (descending) and assign ranks
    elevesWithStats.sort((a, b) => b.moyenneGenerale - a.moyenneGenerale);
    elevesWithStats.forEach((eleve, index) => {
      eleve.rang = index + 1;
    });

    // =============== HEADER SECTION (same style as individual bulletin) ===============
    let yPos = height - 45;

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
    const titleText = `BULLETIN DE LA CLASSE - ${getExamLabel()}`;
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

    // =============== CLASS INFO RECTANGLE ===============
    yPos -= 30;
    const infoTableX = 20;
    const infoTableY = yPos;
    const infoTableWidth = 555;
    const infoTableHeight = 50;

    // Outer rectangle
    page.drawRectangle({
      x: infoTableX, y: infoTableY - infoTableHeight,
      width: infoTableWidth, height: infoTableHeight,
      borderColor: rgb(0, 0, 0), borderWidth: 1
    });

    // Class information inside rectangle
    const leftColX = infoTableX + 8;
    const rightColX = infoTableX + infoTableWidth / 2 + 8;
    let infoY = infoTableY - 18;

    page.drawText(`Classe : ${classe.session} ${classe.libelle}`, { x: leftColX, y: infoY, size: 10, font: boldFont });
    page.drawText(`Effectif : ${elevesWithStats.length} élèves`, { x: rightColX, y: infoY, size: 10, font: boldFont });

    infoY -= 16;
    const currentDate = new Date().toLocaleDateString('fr-FR');
    page.drawText(`Date : ${currentDate}`, { x: leftColX, y: infoY, size: 9, font });
    page.drawText(`Période : ${getExamLabel()}`, { x: rightColX, y: infoY, size: 9, font });

    // =============== MAIN TABLE ===============
    yPos -= 75;
    const tableX = 20;
    const tableY = yPos;
    const tableWidth = 555;
    
    // Column configuration - Conditional based on exam type
    const isCompositionExam = examData?.title?.toLowerCase().includes('composition') || examData?.exam_title?.toLowerCase().includes('composition');
    const columnWidths = isCompositionExam ? 
      [35, 120, 80, 80, 70, 75, 95] : // Rang, Nom, Date Naiss, Lieu Naiss, Moy Dev, Moy Comp, Appréciation
      [35, 140, 100, 100, 90, 90];    // Rang, Nom, Date Naiss, Lieu Naiss, Moyenne, Appréciation
    
    const numRows = elevesWithStats.length + 1; // +1 for header
    const rowHeight = 20;

    // Draw complete table grid
    let currentX = tableX;
    for (let col = 0; col <= columnWidths.length; col++) {
      page.drawLine({
        start: { x: currentX, y: tableY },
        end: { x: currentX, y: tableY - numRows * rowHeight },
        color: rgb(0, 0, 0), thickness: 1
      });
      if (col < columnWidths.length) currentX += columnWidths[col];
    }

    for (let row = 0; row <= numRows; row++) {
      page.drawLine({
        start: { x: tableX, y: tableY - row * rowHeight },
        end: { x: tableX + tableWidth, y: tableY - row * rowHeight },
        color: rgb(0, 0, 0), thickness: 1
      });
    }

    // Header row with gray background
    page.drawRectangle({
      x: tableX, y: tableY - rowHeight,
      width: tableWidth, height: rowHeight,
      color: rgb(0.9, 0.9, 0.9)
    });

    // Header texts - conditional based on exam type
    const headers = isCompositionExam ? 
      ['Rang', 'Prénom & Nom', 'Date Naiss.', 'Lieu Naiss.', 'Moy. Dev', 'Moy. Comp', 'Appréciation'] :
      ['Rang', 'Prénom & Nom', 'Date Naiss.', 'Lieu Naiss.', 'Moyenne', 'Appréciation'];
    
    // Adjust column widths based on exam type - removed duplicate declaration
    let headerX = tableX;
    headers.forEach((header, index) => {
      const textWidth = boldFont.widthOfTextAtSize(header, 8);
      const textX = index <= 1 ? headerX + 5 : headerX + (columnWidths[index] - textWidth) / 2;
      page.drawText(header, { x: textX, y: tableY - 13, size: 8, font: boldFont });
      headerX += columnWidths[index];
    });

    // Data rows
    let dataY = tableY - rowHeight;
    elevesWithStats.forEach((eleve, index) => {
      dataY -= rowHeight;

      // Alternating row colors
      if (index % 2 === 0) {
        page.drawRectangle({
          x: tableX, y: dataY,
          width: tableWidth, height: rowHeight,
          color: rgb(0.97, 0.97, 0.97)
        });
      }

      // Row data
      const nomComplet = `${eleve.prenom} ${eleve.nom}`;
      const nomTronque = nomComplet.length > 18 ? nomComplet.substring(0, 18) + '...' : nomComplet;
      
      // Row data - conditional based on exam type
      const rowData = isCompositionExam ? [
        eleve.rang.toString(),
        nomTronque,
        eleve.dateNaissance,
        eleve.lieuNaissance || '-',
        eleve.moyenneDevoir.toFixed(1),
        eleve.moyenneComposition.toFixed(1),
        eleve.appreciation
      ] : [
        eleve.rang.toString(),
        nomTronque,
        eleve.dateNaissance,
        eleve.lieuNaissance || '-',
        eleve.moyenneGenerale.toFixed(1),
        eleve.appreciation
      ];

      let cellX = tableX;
      rowData.forEach((data, index) => {
        const textSize = index === 1 ? 7 : 8; // Smaller font for names
        const textWidth = font.widthOfTextAtSize(data, textSize);
        let textX: number;
        
        if (index === 0) { // Rang - centered
          textX = cellX + (columnWidths[index] - textWidth) / 2;
        } else if (index === 1) { // Name - left aligned with padding
          textX = cellX + 5; } else { // Others - centered
          textX = cellX + (columnWidths[index] - textWidth) / 2;
        }
        
        // Color coding for rank
        const textColor = index === 0 ? rgb(0.8, 0.2, 0.2) : rgb(0, 0, 0);
        const textFont = index === 0 ? boldFont : font;
        
        page.drawText(data, { 
          x: textX, 
          y: dataY + 6, 
          size: textSize, 
          font: textFont,
          color: textColor
        });
        cellX += columnWidths[index];
      });
    });

    // =============== LEGEND AND FOOTER ===============
    const finalY = dataY - 40;
    
    // Legend section
    page.drawText('Légende des appréciations:', {
      x: 20, y: finalY, size: 9, font: boldFont,
      color: rgb(0.2, 0.2, 0.2)
    });
    
    const legendItems = [
      '• Très Bien (16-20)', '• Bien (14-16)', '• Assez Bien (12-14)',
      '• Passable (10-12)', '• Insuffisant (0-10)'
    ];
    
    let legendY = finalY - 15;
    legendItems.forEach((item, index) => {
      const xPos = 20 + (index % 3) * 180;
      if (index % 3 === 0 && index > 0) legendY -= 12;
      
      page.drawText(item, {
        x: xPos, y: legendY, size: 8, font,
        color: rgb(0.4, 0.4, 0.4)
      });
    });

    page.drawText('Les élèves sont classés par ordre décroissant de moyenne générale.', {
      x: 20, y: legendY - 20, size: 8, font,
      color: rgb(0.4, 0.4, 0.4)
    });

    // Sauvegarder le PDF
    const pdfBytes = await pdfDoc.save();

    // Télécharger le fichier
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bulletin_Classe_${classe.libelle}_${getExamLabel()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
  }
};