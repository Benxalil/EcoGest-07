// DÉPRÉCIÉ: Ce fichier est remplacé par useSchoolData hook et ParametresModernes.tsx
// Utiliser useSchoolData hook à la place de ces fonctions

export interface SchoolSettings {
  nom: string;
  adresse: string;
  telephone: string;
  slogan?: string;
  logo?: string;
}

// DÉPRÉCIÉ: Utiliser useSchoolData hook à la place
export const getSchoolSettings = (): SchoolSettings => {
  // Valeurs par défaut pour la compatibilité
  return {
    nom: 'École Connectée',
    adresse: 'Adresse de l\'école',
    telephone: 'Numéro de téléphone',
    slogan: 'Excellence et Innovation'
  };
};

// DÉPRÉCIÉ: Utiliser useSchoolData.updateSchoolData à la place
export const saveSchoolSettings = (settings: SchoolSettings): void => {
  };