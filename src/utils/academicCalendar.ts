// Utilitaire pour gérer le calendrier académique
export interface AcademicCalendarSettings {
  dateDebutAnnee: string;
  dateFinAnnee: string;
}

export const getAcademicCalendarSettings = (currentAcademicYear?: string): AcademicCalendarSettings => {
  try {
    // TODO: Remplacer par un vrai hook Supabase pour récupérer les paramètres de l'école
    // const settings = useSchoolData hook
    const settings = null; // Temporaire jusqu'à implémentation du hook
    if (settings) {
      const parsedSettings = JSON.parse(settings);
      if (parsedSettings.dateDebutAnnee && parsedSettings.dateFinAnnee) {
        return {
          dateDebutAnnee: parsedSettings.dateDebutAnnee,
          dateFinAnnee: parsedSettings.dateFinAnnee
        };
      }
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres du calendrier académique:', error);
  }
  
  // Générer des valeurs par défaut basées sur l'année scolaire courante
  const generateDefaultDates = (academicYear?: string): AcademicCalendarSettings => {
    if (academicYear) {
      // Format: "2025/2026"
      const [startYear, endYear] = academicYear.split('/').map(y => parseInt(y));
      return {
        dateDebutAnnee: `${startYear}-09-01`,
        dateFinAnnee: `${endYear}-07-31`
      };
    }
    
    // Valeurs par défaut absolues si aucune année n'est fournie
    return {
      dateDebutAnnee: '2024-09-01',
      dateFinAnnee: '2025-07-31'
    };
  };
  
  return generateDefaultDates(currentAcademicYear);
};

export const getAcademicMonths = (currentAcademicYear?: string): { name: string; year: number; monthIndex: number }[] => {
  const { dateDebutAnnee, dateFinAnnee } = getAcademicCalendarSettings(currentAcademicYear);
  
  const startDate = new Date(dateDebutAnnee);
  const endDate = new Date(dateFinAnnee);
  
  const months: { name: string; year: number; monthIndex: number }[] = [];
  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];
  
  let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const finalDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  
  while (currentDate <= finalDate) {
    months.push({
      name: monthNames[currentDate.getMonth()],
      year: currentDate.getFullYear(),
      monthIndex: currentDate.getMonth()
    });
    
    // Passer au mois suivant
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  
  return months;
};