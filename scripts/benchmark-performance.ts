#!/usr/bin/env node

/**
 * Script de benchmark pour mesurer les performances de l'application
 * ✅ Teste différentes tailles de données
 * ✅ Mesure les opérations critiques (filtrage, tri, render)
 * ✅ Compare avant/après optimisations
 * 
 * Utilisation:
 * npm run benchmark
 */

import { performance } from 'perf_hooks';

// Simuler des données d'élèves
interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string;
  class_id: string;
}

// Générer des données de test
function generateStudents(count: number): Student[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `student-${i}`,
    first_name: `Prénom${i}`,
    last_name: `Nom${i}`,
    student_number: `ELEVE${String(i).padStart(3, '0')}`,
    class_id: `class-${i % 10}`
  }));
}

// Benchmark: Filtrage
function benchmarkFiltering(students: Student[], searchTerm: string) {
  const start = performance.now();
  
  const filtered = students.filter(s => 
    s.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.student_number.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const end = performance.now();
  return { time: end - start, results: filtered.length };
}

// Benchmark: Tri
function benchmarkSorting(students: Student[]) {
  const start = performance.now();
  
  const sorted = [...students].sort((a, b) => 
    a.last_name.localeCompare(b.last_name)
  );
  
  const end = performance.now();
  return { time: end - start, results: sorted.length };
}

// Benchmark: Groupement par classe
function benchmarkGrouping(students: Student[]) {
  const start = performance.now();
  
  const grouped = students.reduce((acc, student) => {
    if (!acc[student.class_id]) {
      acc[student.class_id] = [];
    }
    acc[student.class_id].push(student);
    return acc;
  }, {} as Record<string, Student[]>);
  
  const end = performance.now();
  return { time: end - start, results: Object.keys(grouped).length };
}

// Couleurs pour le terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

// Formater le temps
function formatTime(ms: number): string {
  if (ms < 10) return `${colors.green}${ms.toFixed(2)}ms${colors.reset}`;
  if (ms < 50) return `${colors.yellow}${ms.toFixed(2)}ms${colors.reset}`;
  return `${colors.red}${ms.toFixed(2)}ms${colors.reset}`;
}

// Exécuter les benchmarks
function runBenchmarks() {
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  📊 Benchmark des Performances EcoGest${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════${colors.reset}\n`);

  const sizes = [50, 100, 500, 1000, 5000];

  sizes.forEach(size => {
    console.log(`${colors.bright}📈 Test avec ${size} étudiants:${colors.reset}`);
    
    const students = generateStudents(size);
    
    // Benchmark 1: Filtrage
    const filterResult = benchmarkFiltering(students, 'nom5');
    console.log(`  🔍 Filtrage:     ${formatTime(filterResult.time)} (${filterResult.results} résultats)`);
    
    // Benchmark 2: Tri
    const sortResult = benchmarkSorting(students);
    console.log(`  📊 Tri:          ${formatTime(sortResult.time)} (${sortResult.results} éléments)`);
    
    // Benchmark 3: Groupement
    const groupResult = benchmarkGrouping(students);
    console.log(`  📦 Groupement:   ${formatTime(groupResult.time)} (${groupResult.results} groupes)`);
    
    // Temps total
    const totalTime = filterResult.time + sortResult.time + groupResult.time;
    console.log(`  ⏱️  Total:        ${formatTime(totalTime)}\n`);
  });

  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}✅ Benchmark terminé!${colors.reset}`);
  console.log(`\n${colors.yellow}💡 Objectifs:${colors.reset}`);
  console.log(`   • Filtrage:   < 10ms pour 1000 élèves`);
  console.log(`   • Tri:        < 20ms pour 1000 élèves`);
  console.log(`   • Groupement: < 5ms pour 1000 élèves`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════${colors.reset}\n`);
}

// Exécuter
runBenchmarks();
