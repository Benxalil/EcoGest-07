// Temporary fix for missing localStorage variables
// These should eventually be replaced with proper hook calls

export const savedClasses = '[]';
export const savedEleves = '[]';
export const savedEnseignants = '[]';
export const savedStudents = '[]';
export const savedMatieres = '[]';
export const savedSubjects = '[]';

export const getSchoolSettings = () => ({ system: 'semester' });
export const setSchoolSystem = (system: any) => {};

export const Classe = class {
  constructor(public id: string, public name: string) {}
};