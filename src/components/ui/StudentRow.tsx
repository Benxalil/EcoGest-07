import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Trash2 } from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string;
  classes?: {
    name: string;
    level: string;
    section?: string;
  };
}

interface StudentRowProps {
  student: Student;
  onView: (student: Student) => void;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
}

/**
 * Composant mémoïsé pour afficher une ligne d'élève dans un tableau
 * ✅ Évite les re-renders inutiles avec React.memo
 */
export const StudentRow = React.memo<StudentRowProps>(
  ({ student, onView, onEdit, onDelete }) => {
    const className = student.classes 
      ? `${student.classes.name}${student.classes.section ? ' ' + student.classes.section : ''}`
      : 'Non assigné';

    return (
      <TableRow>
        <TableCell className="font-medium">{student.student_number}</TableCell>
        <TableCell>{student.first_name}</TableCell>
        <TableCell>{student.last_name}</TableCell>
        <TableCell>{className}</TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onView(student)}
              title="Voir détails"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(student)}
              title="Modifier"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(student)}
              title="Supprimer"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  },
  // Custom comparison function pour optimiser encore plus
  (prevProps, nextProps) => {
    return (
      prevProps.student.id === nextProps.student.id &&
      prevProps.student.first_name === nextProps.student.first_name &&
      prevProps.student.last_name === nextProps.student.last_name &&
      prevProps.student.student_number === nextProps.student.student_number
    );
  }
);

StudentRow.displayName = 'StudentRow';
