
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { supabase } from '@/integrations/supabase/client';
import { parseMaxScoreFromMoyenne, parseCoefficient, getAppreciation } from './gradeUtils';
import { formatClassName } from './classNameFormatter';

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
  semestre: string,
  examData?: { exam_id: string; exam_title: string; exam_date: string; semester?: string }
) => {
  // Déterminer si c'est un examen de composition
  const isCompositionExam = examData?.exam_title?.toLowerCase().includes('composition') || false;
  const academicYear = await getSchoolAcademicYear();
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const page = pdfDoc.addPage([595, 842]); // A4 format
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Récupérer les vraies données de l'école
  const getSchoolData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { nom: 'École Connectée', academic_year: '2024/2025', id: null };

      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single();

      if (profile?.school_id) {
        const { data: school } = await supabase
          .from('schools')
          .select('name, academic_year')
          .eq('id', profile.school_id)
          .single();

        return {
          nom: school?.name || 'École Connectée',
          academic_year: school?.academic_year || '2024/2025',
          id: profile.school_id
        };
      }
      return { nom: 'École Connectée', academic_year: '2024/2025', id: null };
    } catch (error) {
      console.error('Erreur récupération école:', error);
      return { nom: 'École Connectée', academic_year: '2024/2025', id: null };
    }
  };

  const schoolData = await getSchoolData();

  // Helper functions - Récupération des vraies données
  const getEleveInfo = async () => {
    let eleveComplet = eleve;
    
    // Récupérer les données de l'élève depuis Supabase
    try {
      const { data: student } = await supabase
        .from('students')
        .select('date_of_birth, place_of_birth, student_number, class_id')
        .eq('id', eleve.id)
        .single();
        
      if (student) {
        if (student.date_of_birth) {
          eleveComplet.dateNaissance = new Date(student.date_of_birth).toLocaleDateString('fr-FR');
        }
        if (student.place_of_birth) eleveComplet.lieuNaissance = student.place_of_birth;
        if (student.student_number) eleveComplet.matricule = student.student_number;
      }
    } catch (error) {
      console.error('Erreur récupération données élève:', error);
    }
    
    // Récupérer la série et les données de la classe depuis Supabase
    try {
      const { data: classData } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classe.id)
        .single();
        
      // Stocker le nom formaté de la classe
      if (classData) {
        eleveComplet.classe = formatClassName({ name: classData.name, section: classData.section });
        
        // Récupérer la série séparément si elle existe
        const { data: seriesData } = await supabase
          .from('series')
          .select('name, code')
          .eq('school_id', classData.school_id)
          .limit(1)
          .single();
          
        if (seriesData) {
          eleveComplet.serie = seriesData.name || seriesData.code;
        }
      }
    } catch (error) {
      console.error('Erreur récupération série classe:', error);
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

  // Récupérer les vraies données
  const eleveInfo = await getEleveInfo();
  
  // Récupérer les matières de la classe depuis Supabase
  let matieresClasse: any[] = [];
  try {
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, name, coefficient, code, max_score')
      .eq('class_id', classe.id);
      
    if (subjects) {
      matieresClasse = subjects.map(subject => ({
        id: subject.id,
        nom: subject.name,
        coefficient: subject.coefficient || 1,
        code: subject.code,
        maxScore: subject.max_score || 20
      }));
    }
  } catch (error) {
    console.error('Erreur récupération matières:', error);
  }

  // Récupérer les notes depuis Supabase (même requête que useResults)
  const getNotesEleve = async () => {
    try {
      // Requête sans filtrage par school_id si non disponible
      let query = supabase
        .from('grades')
        .select(`
          id,
          student_id,
          subject_id,
          exam_id,
          grade_value,
          max_grade,
          coefficient,
          semester,
          exam_type,
          school_id,
          created_at
        `)
        .eq('student_id', eleve.id);
      
      // Ajouter le filtre school_id si disponible
      if (schoolData.id) {
        query = query.eq('school_id', schoolData.id);
      }

      const { data: grades, error } = await query;

      if (error) {
        console.error('Erreur récupération notes:', error);
        return [];
      }
      
      // Filtrer par les matières de la classe
      const filteredGrades = grades?.filter(g => 
        matieresClasse.some(m => String(m.id) === String(g.subject_id))
      ) || [];
      
      return filteredGrades;
    } catch (error) {
      console.error('Erreur récupération notes:', error);
      return [];
    }
  };

  const notesEleve = await getNotesEleve();
  
  // Debug logs
  console.log('=== DEBUG NOTES PDF ===');
  console.log('Élève ID:', eleve.id);
  console.log('Matières classe:', matieresClasse.map(m => ({ id: m.id, nom: m.nom })));
  console.log('Notes récupérées:', notesEleve.length);
  console.log('Détail notes:', notesEleve.map(n => ({
    subject_id: n.subject_id,
    exam_type: n.exam_type,
    semester: n.semester,
    grade_value: n.grade_value
  })));
  console.log('Semestre recherché:', semestre);
  console.log('=== FIN DEBUG ===');

  const getMoyenneSemestre = (semestreNum: string) => {
    // Normaliser les formats de semestre pour la recherche
    const semestreFormats = [
      semestreNum === "1" ? "1er_semestre" : "2eme_semestre",
      semestreNum === "1" ? "semestre1" : "semestre2",
      semestreNum
    ];
    
    let totalPoints = 0;
    let totalCoef = 0;
    
    matieresClasse.forEach((matiere) => {
    // Trouver les notes de cette matière pour l'élève avec normalisation du semestre
    const notesMatiere = notesEleve.filter(note => 
      note.subject_id === matiere.id && 
      (semestreFormats.includes(note.semester) || !note.semester)
    );
      
      if (notesMatiere.length > 0) {
        // Calculer la moyenne des notes de cette matière
        let totalNotesMatiere = 0;
        let countNotes = 0;
        
        notesMatiere.forEach(note => {
          if (note.grade_value && !isNaN(parseFloat(String(note.grade_value)))) {
            totalNotesMatiere += parseFloat(String(note.grade_value));
            countNotes++;
          }
        });
        
        if (countNotes > 0) {
          const moyenneMatiere = totalNotesMatiere / countNotes;
          const coef = parseFloat(matiere.coefficient) || 1;
          totalPoints += moyenneMatiere * coef;
          totalCoef += coef;
        }
      }
    });
    
    return totalCoef > 0 ? (totalPoints / totalCoef) : null;
  };

  const getRangSemestre = async (semestreNum: string) => {
    try {
      // Récupérer tous les élèves de la classe
      const { data: elevesClasse } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('class_id', classe.id);
      
      if (!elevesClasse) return { rang: null, total: 0 };
      
      // Calculer les moyennes de tous les élèves
      const moyennesEleves: { eleveId: string, moyenne: number }[] = [];
      
      for (const etudiant of elevesClasse) {
        // Récupérer les notes de cet élève
        const { data: notesEtudiant } = await supabase
          .from('grades')
          .select('*')
          .eq('student_id', etudiant.id)
          .eq('semester', semestreNum)
          .in('subject_id', matieresClasse.map(m => m.id));
          
        if (notesEtudiant && notesEtudiant.length > 0) {
          let totalPoints = 0;
          let totalCoef = 0;
          
          matieresClasse.forEach((matiere) => {
            const notesMatiere = notesEtudiant.filter(note => note.subject_id === matiere.id);
            
            if (notesMatiere.length > 0) {
              let totalNotesMatiere = 0;
              let countNotes = 0;
              
              notesMatiere.forEach(note => {
                if (note.grade_value && !isNaN(parseFloat(String(note.grade_value)))) {
                  totalNotesMatiere += parseFloat(String(note.grade_value));
                  countNotes++;
                }
              });
              
              if (countNotes > 0) {
                const moyenneMatiere = totalNotesMatiere / countNotes;
                const coef = parseFloat(matiere.coefficient) || 1;
                totalPoints += moyenneMatiere * coef;
                totalCoef += coef;
              }
            }
          });
          
          if (totalCoef > 0) {
            moyennesEleves.push({
              eleveId: etudiant.id,
              moyenne: totalPoints / totalCoef
            });
          }
        }
      }
      
      // Trier par moyenne décroissante
      moyennesEleves.sort((a, b) => b.moyenne - a.moyenne);
      
      // Trouver le rang de l'élève actuel
      const rangIndex = moyennesEleves.findIndex(e => e.eleveId === eleve.id);
      const rang = rangIndex !== -1 ? rangIndex + 1 : null;
      
      return { rang, total: moyennesEleves.length };
    } catch (error) {
      console.error('Erreur calcul rang:', error);
      return { rang: null, total: 0 };
    }
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

  // Adapter le titre selon le type d'examen
  let semestreLabel: string;
  if (examData && !isCompositionExam) {
    // Pour les examens normaux (Devoir, Contrôle, etc.), afficher juste le nom de l'examen
    semestreLabel = examData.exam_title.toUpperCase();
  } else {
    // Pour les compositions, déterminer le semestre depuis examData en priorité
    let semestreNum = semestre; // Par défaut, utiliser le paramètre
    
    // Si examData contient le semester, l'utiliser en priorité
    if (examData?.semester) {
      // Normaliser le format: "1er semestre" -> "1", "2eme semestre" -> "2"
      if (examData.semester.includes('1') || examData.semester.toLowerCase().includes('premier')) {
        semestreNum = "1";
      } else if (examData.semester.includes('2') || examData.semester.toLowerCase().includes('deuxième') || examData.semester.toLowerCase().includes('deuxieme')) {
        semestreNum = "2";
      }
    }
    
    // Générer le label final
    semestreLabel = semestreNum === "1" ? "PREMIER SEMESTRE" : "DEUXIÈME SEMESTRE";
  }
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
  
  // Calculer l'effectif réel de la classe
  let effectifReel = classe.effectif;
  try {
    const { data: studentsCount } = await supabase
      .from('students')
      .select('id', { count: 'exact' })
      .eq('class_id', classe.id)
      .eq('is_active', true);
    
    if (studentsCount) {
      effectifReel = studentsCount.length;
    }
  } catch (error) {
    console.error('Erreur calcul effectif:', error);
  }

  // EXACT REPRODUCTION OF CANVA MODEL - Precise positioning
  let yPos = height - 45;

  // =============== HEADER SECTION ===============
  page.drawText('RÉPUBLIQUE DU SÉNÉGAL', {
    x: 40, y: yPos, size: 10, font: boldFont
  });
  page.drawText(schoolData.nom, {
    x: width - 180, y: yPos, size: 10, font: boldFont
  });

  yPos -= 12;
  page.drawText('Ministère de l\'Éducation nationale', {
    x: 40, y: yPos, size: 8, font
  });
  page.drawText(`Année scolaire ${schoolData.academic_year}`, {
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
  page.drawText(`Classe : ${eleveInfo.classe}`, { x: rightColX, y: infoY, size: 8, font });

  infoY -= rowSpacing;
  // Fourth row - strictly aligned
  page.drawText(`Effectif de la classe : ${effectifReel}`, { x: leftColX, y: infoY, size: 8, font });
  page.drawText(`Série : ${eleveInfo.serie || '__________'}`, { x: rightColX, y: infoY, size: 8, font });

  // =============== MAIN GRADES TABLE ===============
  yPos -= 105;
  const gradesTableX = 20;
  const gradesTableY = yPos;
  const gradesTableWidth = 555;
  
  // Table configuration - adapter selon le type d'examen (largeurs ajustées selon modèle Canva)
  const columnWidths = isCompositionExam 
    ? [150, 50, 50, 45, 40, 75, 145] // Composition: MATIÈRES, DEVOIR, COMPO, MOY, COEF, MOY×COEF, APPRÉCIATION
    : [180, 80, 60, 90, 145]; // Examen normal: MATIÈRES, NOTE, COEF, MOY×COEF, APPRÉCIATION
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

  // Header texts - adapter selon le type d'examen
  const headers = isCompositionExam 
    ? ['MATIÈRES', 'DEVOIR', 'COMPO', 'MOY', 'COEF', 'MOY×COEF', 'APPRÉ-CIATION']
    : ['MATIÈRES', 'NOTE', 'COEF', 'MOY×COEF', 'APPRÉ-CIATION'];
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
    
    let devoir = '-', composition = '-', note = '-', moyenne = '-', moyenneCoef = '-', appreciation = '-';
    
    // Récupérer les notes depuis notesEleve (déjà chargées depuis Supabase)
    if (isCompositionExam) {
      // Pour les compositions, chercher les notes de type "Devoir" et "Composition"
      // Déterminer le format du semestre pour la recherche
      const semestreFormats = [
        semestre === "1" ? "1er_semestre" : "2eme_semestre",
        semestre === "1" ? "semestre1" : "semestre2",
        semestre
      ];
      
      const notesMatiere = notesEleve.filter(n => {
        const subjectMatch = String(n.subject_id) === String(matiere.id);
        const semesterMatch = semestreFormats.includes(n.semester) || !n.semester;
        
        // Log de debug
        if (subjectMatch) {
          console.log(`Note trouvée pour ${matiere.nom}:`, {
            exam_type: n.exam_type,
            semester: n.semester,
            grade_value: n.grade_value,
            semesterMatch
          });
        }
        
        return subjectMatch && semesterMatch;
      });
      
      const devoirNote = notesMatiere.find(n => n.exam_type?.toLowerCase() === 'devoir');
      const compoNote = notesMatiere.find(n => n.exam_type?.toLowerCase() === 'composition');
      
      const devoirValue = devoirNote ? parseFloat(String(devoirNote.grade_value)) : null;
      const compositionValue = compoNote ? parseFloat(String(compoNote.grade_value)) : null;
      
      if (devoirValue !== null && !isNaN(devoirValue)) devoir = devoirValue.toFixed(1);
      if (compositionValue !== null && !isNaN(compositionValue)) composition = compositionValue.toFixed(1);
      
      // Calculer la moyenne même si une seule note est présente
      if (devoirValue !== null && !isNaN(devoirValue) && compositionValue !== null && !isNaN(compositionValue)) {
        const moy = (devoirValue + compositionValue) / 2;
        moyenne = moy.toFixed(1);
        const coef = parseFloat(String(matiere.coefficient)) || 1;
        const moyCoef = moy * coef;
        moyenneCoef = moyCoef.toFixed(1);
        
        totalPoints += moyCoef;
        totalCoeff += coef;
        
        // Utiliser le barème de la matière pour calculer l'appréciation
        const maxScore = matiere.maxScore || 20;
        appreciation = getAppreciation(moy, maxScore);
      } else if (devoirValue !== null && !isNaN(devoirValue)) {
        // Si seulement le devoir est présent
        const moy = devoirValue;
        moyenne = moy.toFixed(1);
        const coef = parseFloat(String(matiere.coefficient)) || 1;
        const moyCoef = moy * coef;
        moyenneCoef = moyCoef.toFixed(1);
        
        totalPoints += moyCoef;
        totalCoeff += coef;
        
        const maxScore = matiere.maxScore || 20;
        appreciation = getAppreciation(moy, maxScore);
      } else if (compositionValue !== null && !isNaN(compositionValue)) {
        // Si seulement la composition est présente
        const moy = compositionValue;
        moyenne = moy.toFixed(1);
        const coef = parseFloat(String(matiere.coefficient)) || 1;
        const moyCoef = moy * coef;
        moyenneCoef = moyCoef.toFixed(1);
        
        totalPoints += moyCoef;
        totalCoeff += coef;
        
        const maxScore = matiere.maxScore || 20;
        appreciation = getAppreciation(moy, maxScore);
      }
    } else if (examData) {
      // Pour les examens normaux, chercher la note de cet examen spécifique
      const noteExamen = notesEleve.find(n => {
        const subjectMatch = String(n.subject_id) === String(matiere.id);
        const examMatch = String(n.exam_id) === String(examData.exam_id);
        return subjectMatch && examMatch;
      });
      
      if (noteExamen) {
        const noteValue = parseFloat(String(noteExamen.grade_value));
        if (!isNaN(noteValue)) {
          note = noteValue.toFixed(1);
          const coef = parseFloat(String(matiere.coefficient)) || 1;
          const moyCoef = noteValue * coef;
          moyenneCoef = moyCoef.toFixed(1);
          
          totalPoints += moyCoef;
          totalCoeff += coef;
          
          // Utiliser le barème de la matière pour calculer l'appréciation
          const maxScore = matiere.maxScore || 20;
          appreciation = getAppreciation(noteValue, maxScore);
        }
      }
    }

    // Draw data row - adapter selon le type d'examen
    const coefStr = String(parseFloat(String(matiere.coefficient)) || 1);
    const rowData = isCompositionExam 
      ? [matiere.nom, devoir, composition, moyenne, coefStr, moyenneCoef, appreciation]
      : [matiere.nom, note, coefStr, moyenneCoef, appreciation];
    
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
  const totalRowData = isCompositionExam
    ? ['TOTAL', '', '', totalMoyenne.toFixed(1), totalCoeff.toString(), totalPoints.toFixed(1), '']
    : ['TOTAL', '', totalCoeff.toString(), totalPoints.toFixed(1), ''];
  
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
  const boxHeight = 90; // Augmenté pour mieux correspondre au modèle

  // SEMESTRES (left) + DÉCISION DU CONSEIL (right) - une seule ligne comme dans le modèle
  const rowY = yPos;

  // SEMESTRES - Two side-by-side blocks
  page.drawRectangle({ x: leftX, y: rowY - boxHeight, width: colWidth, height: boxHeight, borderColor: rgb(0, 0, 0), borderWidth: 1 });
  page.drawText('SEMESTRES', { x: leftX + 8, y: rowY - 15, size: 8, font: boldFont });
  
  // Two blocks side by side within the rectangle
  const semestreBlockWidth = (colWidth - 24) / 2; // Divide available width
  const leftBlockX = leftX + 8;
  const rightBlockX = leftX + 8 + semestreBlockWidth + 8;
  
  // Calculate ranks for both semesters
  const rangSemestre1 = await getRangSemestre("1");
  const rangSemestre2 = await getRangSemestre("2");

  // Semestre 1 block - always show
  page.drawText('Semestre 1:', { x: leftBlockX, y: rowY - 30, size: 8, font: boldFont });
  page.drawText(`Moy: ${moyenneSemestre1 !== null ? moyenneSemestre1.toFixed(2) : '___'}`, { x: leftBlockX, y: rowY - 44, size: 8, font });
  page.drawText(`Rang: ${rangSemestre1.rang !== null ? `${rangSemestre1.rang}/${rangSemestre1.total}` : '___/___'}`, { x: leftBlockX, y: rowY - 58, size: 8, font });
  
  // Semestre 2 block - only show if current semester is 2
  page.drawText('Semestre 2:', { x: rightBlockX, y: rowY - 30, size: 8, font: boldFont });
  if (semestre === "2") {
    page.drawText(`Moy: ${moyenneSemestre2 !== null ? moyenneSemestre2.toFixed(2) : '___'}`, { x: rightBlockX, y: rowY - 44, size: 8, font });
    page.drawText(`Rang: ${rangSemestre2.rang !== null ? `${rangSemestre2.rang}/${rangSemestre2.total}` : '___/___'}`, { x: rightBlockX, y: rowY - 58, size: 8, font });
  } else {
    // Semestre 1 - leave empty
    page.drawText('Moy: ___', { x: rightBlockX, y: rowY - 44, size: 8, font });
    page.drawText('Rang: ___/___', { x: rightBlockX, y: rowY - 58, size: 8, font });
  }
  
  // Moyenne générale - only show if both semesters are available (semester 2)
  let moyGenText = '';
  if (semestre === "2" && moyenneGeneraleAnnuelle !== null) {
    moyGenText = `Moyenne générale : ${moyenneGeneraleAnnuelle.toFixed(2)}`;
  } else if (semestre === "1") {
    moyGenText = 'Moyenne générale : ___';
  } else {
    moyGenText = `Moyenne générale : ${moyenneGeneraleAnnuelle !== null ? moyenneGeneraleAnnuelle.toFixed(2) : '___'}`;
  }
  const moyGenWidth = font.widthOfTextAtSize(moyGenText, 8);
  page.drawText(moyGenText, { x: leftX + (colWidth - moyGenWidth) / 2, y: rowY - 75, size: 8, font: boldFont });

  // DÉCISION DU CONSEIL
  page.drawRectangle({ x: rightX, y: rowY - boxHeight, width: colWidth, height: boxHeight, borderColor: rgb(0, 0, 0), borderWidth: 1 });
  page.drawText('DÉCISION DU CONSEIL', { x: rightX + 8, y: rowY - 15, size: 8, font: boldFont });
  let decY = rowY - 35;
  page.drawText('Admis(e)', { x: rightX + 15, y: decY, size: 8, font });
  drawCheckbox(rightX + 70, decY - 2, decision.admis);
  decY -= 18;
  page.drawText('Redouble', { x: rightX + 15, y: decY, size: 8, font });
  drawCheckbox(rightX + 70, decY - 2, decision.redouble);
  decY -= 18;
  page.drawText('Exclusion', { x: rightX + 15, y: decY, size: 8, font });
  drawCheckbox(rightX + 70, decY - 2, decision.exclusion);

  // Prepare Y for signature section
  yPos = rowY - boxHeight - 20;

  // =============== SIGNATURE AND DATE ===============
  yPos -= 80;
  const today = new Date();
  const dateStr = today.toLocaleDateString('fr-FR');
  
  page.drawText(`Fait le ${dateStr}`, { x: 40, y: yPos, size: 9, font });
  page.drawText('Le Chef d\'établissement', { x: width - 180, y: yPos, size: 9, font: boldFont });

  // Generate and download PDF
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  const fileName = `bulletin_${eleveInfo.prenom}_${eleveInfo.nom}_${semestreLabel.replace(/\s/g, '_')}.pdf`;
  link.download = fileName;
  link.click();
};
