// Constantes pour les séries (13 options)
export const DEFAULT_SERIES = [
  { code: 'E', name: 'Sciences de l\'éducation et pédagogie', description: 'Option éducation et pédagogie' },
  { code: 'G', name: 'Sciences de gestion et économie', description: 'Option gestion et économie' },
  { code: 'G1', name: 'Économie et gestion administrative', description: 'Option économie et gestion' },
  { code: 'G2', name: 'Économie et techniques quantitatives', description: 'Option économie et techniques' },
  { code: 'L', name: 'Littérature et sciences humaines', description: 'Série littéraire générale' },
  { code: 'L1', name: 'Langues et Philosophie', description: 'Option langues et philosophie' },
  { code: 'L2', name: 'Sciences humaines : Histoire, Géographie, Économie', description: 'Option sciences humaines' },
  { code: 'S1', name: 'Mathématiques et Sciences Physiques', description: 'Option mathématiques et physique' },
  { code: 'S2', name: 'Sciences expérimentales : Sciences de la Vie et de la Terre, Physique-Chimie', description: 'Option sciences expérimentales' },
  { code: 'S3', name: 'Mathématiques et Sciences Naturelles', description: 'Option mathématiques et sciences naturelles' },
  { code: 'T1', name: 'Techniques industrielles : mécanique, électrotechnique, etc.', description: 'Option techniques industrielles' },
  { code: 'T2', name: 'Techniques administratives et de gestion', description: 'Option techniques administratives' },
  { code: 'T3', name: 'Sciences et technologies : informatique, électronique, etc.', description: 'Option sciences et technologies' },
] as const;

// Constantes pour les libellés (5 options)
export const DEFAULT_LABELS = [
  { code: 'A', name: 'A' },
  { code: 'B', name: 'B' },
  { code: 'C', name: 'C' },
  { code: 'D', name: 'D' },
  { code: 'E', name: 'E' },
] as const;

// Types TypeScript pour l'autocomplétion
export type SeriesCode = typeof DEFAULT_SERIES[number]['code'];
export type LabelCode = typeof DEFAULT_LABELS[number]['code'];
