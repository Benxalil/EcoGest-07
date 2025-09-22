import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useExams } from '@/hooks/useExams';
import { useClasses } from '@/hooks/useClasses';
import { useSubjects } from '@/hooks/useSubjects';
import { usePermissions } from '@/hooks/usePermissions';

interface ExamsFilterProps {
  onFilterChange: (filters: {
    classId?: string;
    subjectId?: string;
    examId?: string;
  }) => void;
}

export const ExamsFilter: React.FC<ExamsFilterProps> = ({ onFilterChange }) => {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedExam, setSelectedExam] = useState<string>('');
  
  const { classes } = useClasses();
  const { subjects } = useSubjects();
  const { exams } = useExams();
  const permissions = usePermissions();

  // Filtrer les classes selon les permissions
  const filteredClasses = classes.filter(classe => 
    permissions.canViewClassGrades(classe.id) || permissions.canViewAllGrades
  );

  // Filtrer les matières selon les permissions
  const filteredSubjects = subjects.filter(subject => 
    permissions.canViewSubjectGrades(subject.id) || permissions.canViewAllGrades
  );

  // Filtrer les examens selon les matières et classes sélectionnées
  const filteredExams = exams.filter(exam => {
    const classMatch = !selectedClass || exam.class_id === selectedClass;
    const subjectMatch = !selectedSubject || exam.subject_id === selectedSubject;
    return classMatch && subjectMatch;
  });

  useEffect(() => {
    onFilterChange({
      classId: selectedClass || undefined,
      subjectId: selectedSubject || undefined,
      examId: selectedExam || undefined
    });
  }, [selectedClass, selectedSubject, selectedExam, onFilterChange]);

  return (
    <div className="flex gap-4 mb-6">
      <div className="flex-1">
        <label className="text-sm font-medium mb-2 block">Classe</label>
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner une classe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Toutes les classes</SelectItem>
            {filteredClasses.map((classe) => (
              <SelectItem key={classe.id} value={classe.id}>
                {classe.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1">
        <label className="text-sm font-medium mb-2 block">Matière</label>
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner une matière" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Toutes les matières</SelectItem>
            {filteredSubjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1">
        <label className="text-sm font-medium mb-2 block">Examen</label>
        <Select value={selectedExam} onValueChange={setSelectedExam}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un examen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tous les examens</SelectItem>
            {filteredExams.map((exam) => (
              <SelectItem key={exam.id} value={exam.id}>
                {exam.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
