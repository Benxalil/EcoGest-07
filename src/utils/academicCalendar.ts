// Utilitaire pour gérer le calendrier académique
export const getAcademicMonths = (startDate?: string, endDate?: string): { name: string; year: number; monthIndex: number }[] => {
  // Si pas de dates fournies, retourner un tableau vide
  if (!startDate || !endDate) {
    return [];
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const months: { name: string; year: number; monthIndex: number }[] = [];
  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];
  
  let currentDate = new Date(start.getFullYear(), start.getMonth(), 1);
  const finalDate = new Date(end.getFullYear(), end.getMonth(), 1);
  
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