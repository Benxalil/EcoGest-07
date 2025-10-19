/**
 * 🚀 OPTIMISATION BUNDLE: Lazy loading des composants lourds
 * 
 * Ce fichier centralise les imports lazy des librairies lourdes
 * pour réduire le bundle initial et améliorer le temps de chargement.
 */

import { lazy } from 'react';

/**
 * 📄 PDF Generation (jsPDF ~300kb, pdf-lib ~500kb)
 * Lazy load uniquement quand l'utilisateur génère un PDF
 */
export const lazyPdfLib = {
  jsPDF: () => import('jspdf').then(m => m.default),
  PDFDocument: () => import('pdf-lib').then(m => m.PDFDocument),
  rgb: () => import('pdf-lib').then(m => m.rgb),
  StandardFonts: () => import('pdf-lib').then(m => m.StandardFonts),
  fontkit: () => import('@pdf-lib/fontkit').then(m => m.default),
};

/**
 * 🎨 Charts (recharts ~150kb + d3 ~200kb)
 * Lazy load uniquement sur les pages avec graphiques
 */
export const lazyChartComponents = {
  BarChart: lazy(() => import('recharts').then(m => ({ default: m.BarChart }))),
  Bar: lazy(() => import('recharts').then(m => ({ default: m.Bar }))),
  XAxis: lazy(() => import('recharts').then(m => ({ default: m.XAxis }))),
  YAxis: lazy(() => import('recharts').then(m => ({ default: m.YAxis }))),
  ResponsiveContainer: lazy(() => import('recharts').then(m => ({ default: m.ResponsiveContainer }))),
  PieChart: lazy(() => import('recharts').then(m => ({ default: m.PieChart }))),
  Pie: lazy(() => import('recharts').then(m => ({ default: m.Pie }))),
  Cell: lazy(() => import('recharts').then(m => ({ default: m.Cell }))),
  LineChart: lazy(() => import('recharts').then(m => ({ default: m.LineChart }))),
  Line: lazy(() => import('recharts').then(m => ({ default: m.Line }))),
};

/**
 * 📅 Date utilities
 * Import seulement les fonctions utilisées pour tree-shaking
 */
export { format, isAfter, isBefore, formatDistanceToNow } from 'date-fns';
export { fr } from 'date-fns/locale';

/**
 * Helper: Wrapper pour charger dynamiquement jsPDF
 */
export const loadJsPDF = async () => {
  const jsPDF = await lazyPdfLib.jsPDF();
  return new jsPDF();
};

/**
 * Helper: Wrapper pour charger dynamiquement pdf-lib
 */
export const loadPdfLib = async () => {
  const [PDFDocument, rgb, StandardFonts] = await Promise.all([
    import('pdf-lib'),
    import('pdf-lib'),
    import('pdf-lib'),
  ]);
  
  return { 
    PDFDocument: PDFDocument.PDFDocument, 
    rgb: rgb.rgb, 
    StandardFonts: StandardFonts.StandardFonts 
  };
};
