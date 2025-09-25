// Script de débogage pour la détection du type d'examen
// Ce script simule la logique de détection utilisée dans ConsulterNotes.tsx

function detectExamType(examTitle) {
  console.log('Détection du type d\'examen pour:', examTitle);
  
  const isCompositionExam = examTitle.toLowerCase().includes('composition') || 
                           examTitle.toLowerCase().includes('première composition') ||
                           examTitle.toLowerCase().includes('deuxième composition');
  
  console.log('Résultat:', isCompositionExam ? 'COMPOSITION' : 'AUTRE');
  return isCompositionExam;
}

// Tests avec différents types d'examens
const testExams = [
  'Première Composition',
  'Deuxième Composition', 
  'Composition',
  'Séquence 1',
  'Séquence 2',
  'Devoir surveillé',
  'Test',
  'Examen blanc',
  'Contrôle',
  'Évaluation',
  'Bac blanc',
  'Oral',
  'Pratique'
];

console.log('=== Test de détection du type d\'examen ===\n');

testExams.forEach(exam => {
  const result = detectExamType(exam);
  console.log(`"${exam}" → ${result ? 'COMPOSITION (2 colonnes)' : 'AUTRE (1 colonne)'}`);
  console.log('---');
});

console.log('\n=== Résumé ===');
console.log('Les examens avec "composition" devraient afficher 2 colonnes (Devoir + Composition)');
console.log('Tous les autres examens devraient afficher 1 colonne avec le nom de l\'examen');

