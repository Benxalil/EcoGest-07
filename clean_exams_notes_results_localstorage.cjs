const fs = require('fs');
const path = require('path');

// Fonction pour nettoyer les références localStorage dans les fichiers
function cleanLocalStorageReferences(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Patterns à remplacer
    const patterns = [
      // Remplacer les appels localStorage.getItem
      {
        pattern: /const\s+(\w+)\s*=\s*localStorage\.getItem\(['"`]([^'"`]+)['"`]\);?/g,
        replacement: '// Remplacé par hook Supabase\n      // const $1 = localStorage.getItem("$2");'
      },
      {
        pattern: /localStorage\.getItem\(['"`]([^'"`]+)['"`]\)/g,
        replacement: '// localStorage.getItem("$1") // Remplacé par hook Supabase'
      },
      
      // Remplacer les appels localStorage.setItem
      {
        pattern: /localStorage\.setItem\(['"`]([^'"`]+)['"`],\s*([^)]+)\);?/g,
        replacement: '// localStorage.setItem("$1", $2); // Remplacé par hook Supabase'
      },
      
      // Remplacer les appels JSON.parse avec localStorage
      {
        pattern: /JSON\.parse\(localStorage\.getItem\(['"`]([^'"`]+)['"`]\)\)/g,
        replacement: '// JSON.parse(localStorage.getItem("$1")) // Remplacé par hook Supabase'
      },
      
      // Remplacer les appels JSON.stringify avec localStorage
      {
        pattern: /localStorage\.setItem\(['"`]([^'"`]+)['"`],\s*JSON\.stringify\(([^)]+)\)\)/g,
        replacement: '// localStorage.setItem("$1", JSON.stringify($2)); // Remplacé par hook Supabase'
      },
      
      // Commenter les fonctions qui utilisent localStorage
      {
        pattern: /const\s+(\w+)\s*=\s*\(\)\s*=>\s*\{[^}]*localStorage[^}]*\}/gs,
        replacement: '// Fonction $1 remplacée par hook Supabase\n      // const $1 = () => { ... localStorage ... }'
      }
    ];

    // Appliquer les patterns
    patterns.forEach(({ pattern, replacement }) => {
      const newContent = content.replace(pattern, replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });

    // Écrire le fichier modifié
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Nettoyé: ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Erreur lors du nettoyage de ${filePath}:`, error.message);
    return false;
  }
}

// Fonction pour parcourir récursivement les dossiers
function cleanDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  let cleanedCount = 0;

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Ignorer node_modules et .git
      if (file !== 'node_modules' && file !== '.git' && !file.startsWith('.')) {
        cleanedCount += cleanDirectory(filePath);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      if (cleanLocalStorageReferences(filePath)) {
        cleanedCount++;
      }
    }
  });

  return cleanedCount;
}

// Dossiers à nettoyer
const directoriesToClean = [
  'src/pages/examens',
  'src/pages/notes', 
  'src/pages/resultats',
  'src/components/examens',
  'src/components/notes',
  'src/components/resultats',
  'src/utils'
];

console.log('🧹 Nettoyage des références localStorage dans les sections Examens, Notes et Résultats...\n');

let totalCleaned = 0;

directoriesToClean.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`📁 Nettoyage du dossier: ${dir}`);
    const cleaned = cleanDirectory(dir);
    totalCleaned += cleaned;
    console.log(`   ${cleaned} fichiers nettoyés\n`);
  } else {
    console.log(`⚠️  Dossier non trouvé: ${dir}\n`);
  }
});

console.log(`🎉 Nettoyage terminé ! ${totalCleaned} fichiers modifiés.`);
console.log('\n📝 Prochaines étapes:');
console.log('1. Exécuter le script SQL: migrate_exams_notes_results.sql');
console.log('2. Vérifier que les hooks useExams, useGrades, useStudents fonctionnent');
console.log('3. Tester les fonctionnalités de création, modification et suppression');
console.log('4. Vérifier que les calculs de moyennes et résultats sont corrects');
