// Global variable initialization for legacy code compatibility

// Initialize on window object for browser compatibility
if (typeof window !== 'undefined') {
  (window as any).savedClasses = '[]';
  (window as any).savedEleves = '[]';
  (window as any).savedEnseignants = '[]';
  (window as any).savedStudents = '[]';
  (window as any).savedMatieres = '[]';
  (window as any).savedSubjects = '[]';
  (window as any).getSchoolSettings = () => ({ system: 'semester' });
  (window as any).setSchoolSystem = (system: any) => {};
  (window as any).Classe = class { constructor(public id: string, public name: string) {} };
}

// Export for module usage
export const savedClasses = '[]';
export const savedEleves = '[]';
export const savedEnseignants = '[]';
export const savedStudents = '[]';
export const savedMatieres = '[]';
export const savedSubjects = '[]';
export const getSchoolSettings = () => ({ system: 'semester' });
export const setSchoolSystem = (system: any) => {};
export const Classe = class { constructor(public id: string, public name: string) {} };