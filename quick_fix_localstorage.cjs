// Script rapide pour remplacer localStorage par des hooks Supabase
// À exécuter dans le terminal

const fs = require('fs');
const path = require('path');

// Fichiers à traiter
const filesToFix = [
  'src/pages/emplois/CahierDeTexte.tsx',
  'src/pages/emplois/ListeMatieresCahier.tsx',
  'src/pages/emplois/ListeCahiersClasse.tsx',
  'src/pages/emplois/EnregistrerAbsenceRetard.tsx',
  'src/pages/emplois/ConsulterAbsencesRetards.tsx',
  'src/pages/emplois/ConsultationCahier.tsx',
  'src/pages/emplois/AbsenceRetardClasse.tsx',
  'src/pages/annonces/ListeAnnonces.tsx',
  'src/pages/paiements/PaiementsClasse.tsx',
  'src/pages/paiements/MesPaiements.tsx',
  'src/pages/notes/NotesParEleve.tsx',
  'src/pages/notes/ListeMatieres.tsx',
  'src/pages/notes/ListeElevesClasse.tsx',
  'src/pages/notes/EvaluerEleve.tsx',
  'src/pages/notes/ConsulterNotes.tsx',
  'src/pages/examens/ListeExamens.tsx',
  'src/pages/examens/ListeElevesNotes.tsx',
  'src/pages/examens/ConsulterNotes.tsx',
  'src/pages/resultats/ListeClassesResultats.tsx',
  'src/pages/resultats/ResultatsSemestre.tsx',
  'src/pages/resultats/MesResultats.tsx',
  'src/pages/resultats/BulletinAnnuel.tsx'
];

// Remplacements à effectuer
const replacements = [
  // Imports
  {
    from: "import { useState, useEffect } from 'react';",
    to: "import { useState, useEffect } from 'react';\nimport { useSubjects } from '@/hooks/useSubjects';\nimport { useTeachers } from '@/hooks/useTeachers';\nimport { useAnnouncements } from '@/hooks/useAnnouncements';\nimport { usePayments } from '@/hooks/usePayments';\nimport { useExams } from '@/hooks/useExams';\nimport { useGrades } from '@/hooks/useGrades';"
  },
  
  // localStorage.getItem('matieres')
  {
    from: /localStorage\.getItem\('matieres'\)/g,
    to: "// Remplacé par useSubjects hook"
  },
  
  // localStorage.getItem('enseignants')
  {
    from: /localStorage\.getItem\('enseignants'\)/g,
    to: "// Remplacé par useTeachers hook"
  },
  
  // localStorage.getItem('classes')
  {
    from: /localStorage\.getItem\('classes'\)/g,
    to: "// Remplacé par useClasses hook"
  },
  
  // localStorage.getItem('eleves')
  {
    from: /localStorage\.getItem\('eleves'\)/g,
    to: "// Remplacé par useStudents hook"
  },
  
  // localStorage.getItem('annonces')
  {
    from: /localStorage\.getItem\('annonces'\)/g,
    to: "// Remplacé par useAnnouncements hook"
  },
  
  // localStorage.getItem('paiements')
  {
    from: /localStorage\.getItem\('paiements'\)/g,
    to: "// Remplacé par usePayments hook"
  },
  
  // localStorage.getItem('examens')
  {
    from: /localStorage\.getItem\('examens'\)/g,
    to: "// Remplacé par useExams hook"
  },
  
  // localStorage.getItem('notes')
  {
    from: /localStorage\.getItem\('notes'\)/g,
    to: "// Remplacé par useGrades hook"
  },
  
  // localStorage.setItem
  {
    from: /localStorage\.setItem\([^)]+\)/g,
    to: "// Remplacé par hooks Supabase"
  }
];

// Fonction pour traiter un fichier
function processFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`Fichier non trouvé: ${filePath}`);
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Appliquer les remplacements
    replacements.forEach(replacement => {
      if (replacement.from instanceof RegExp) {
        if (replacement.from.test(content)) {
          content = content.replace(replacement.from, replacement.to);
          modified = true;
        }
      } else {
        if (content.includes(replacement.from)) {
          content = content.replace(replacement.from, replacement.to);
          modified = true;
        }
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Traité: ${filePath}`);
    } else {
      console.log(`⏭️  Aucun changement: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Erreur avec ${filePath}:`, error.message);
  }
}

// Traiter tous les fichiers
console.log('🚀 Début du traitement des fichiers...\n');

filesToFix.forEach(file => {
  processFile(file);
});

console.log('\n✅ Traitement terminé !');
console.log('\n📋 Prochaines étapes:');
console.log('1. Exécuter fix_all_remaining_tables.sql dans Supabase');
console.log('2. Créer les hooks manquants (useAnnouncements, usePayments, etc.)');
console.log('3. Tester les fonctionnalités');
