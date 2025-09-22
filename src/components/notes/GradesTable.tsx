import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Save, X } from 'lucide-react';
import { useGrades } from '@/hooks/useGrades';
import { usePermissions } from '@/hooks/usePermissions';
import { Grade } from '@/hooks/useGrades';

interface GradesTableProps {
  examId: string;
  classId: string;
  subjectId: string;
  students: any[];
}

export const GradesTable: React.FC<GradesTableProps> = ({ examId, classId, subjectId, students }) => {
  const { grades, loading, createGrade, updateGrade, deleteGrade } = useGrades(examId, undefined, subjectId, classId);
  const permissions = usePermissions();
  const [editingGrade, setEditingGrade] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Grade>>({});

  const handleEdit = (grade: Grade) => {
    if (!permissions.canEditSubjectGrades(subjectId) && !permissions.canEditAllGrades) {
      return;
    }
    setEditingGrade(grade.id);
    setEditData({
      marks_obtained: grade.marks_obtained,
      max_marks: grade.max_marks,
      remarks: grade.remarks
    });
  };

  const handleSave = async (gradeId: string) => {
    if (gradeId) {
      await updateGrade(gradeId, editData);
    } else {
      // Créer une nouvelle note
      const studentId = editData.student_id;
      if (studentId) {
        await createGrade({
          student_id: studentId,
          exam_id: examId,
          marks_obtained: editData.marks_obtained || 0,
          max_marks: editData.max_marks || 20,
          remarks: editData.remarks
        });
      }
    }
    setEditingGrade(null);
    setEditData({});
  };

  const handleCancel = () => {
    setEditingGrade(null);
    setEditData({});
  };

  const handleDelete = async (gradeId: string) => {
    if (!permissions.canEditSubjectGrades(subjectId) && !permissions.canEditAllGrades) {
      return;
    }
    await deleteGrade(gradeId);
  };

  const getGradeForStudent = (studentId: string) => {
    return grades.find(grade => grade.student_id === studentId);
  };

  const canEdit = permissions.canEditSubjectGrades(subjectId) || permissions.canEditAllGrades;

  if (loading) {
    return <div className="text-center py-4">Chargement des notes...</div>;
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Élève</TableHead>
            <TableHead>Note obtenue</TableHead>
            <TableHead>Note maximale</TableHead>
            <TableHead>Remarques</TableHead>
            {canEdit && <TableHead className="w-32">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => {
            const grade = getGradeForStudent(student.id);
            const isEditing = editingGrade === grade?.id;

            return (
              <TableRow key={student.id}>
                <TableCell>
                  {student.first_name} {student.last_name}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editData.marks_obtained || ''}
                      onChange={(e) => setEditData({
                        ...editData,
                        marks_obtained: parseFloat(e.target.value) || 0
                      })}
                      className="w-20"
                    />
                  ) : (
                    <span className="font-medium">
                      {grade?.marks_obtained || '-'}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editData.max_marks || ''}
                      onChange={(e) => setEditData({
                        ...editData,
                        max_marks: parseFloat(e.target.value) || 20
                      })}
                      className="w-20"
                    />
                  ) : (
                    <span>{grade?.max_marks || '-'}</span>
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input
                      value={editData.remarks || ''}
                      onChange={(e) => setEditData({
                        ...editData,
                        remarks: e.target.value
                      })}
                      placeholder="Remarques..."
                    />
                  ) : (
                    <span className="text-sm text-gray-600">
                      {grade?.remarks || '-'}
                    </span>
                  )}
                </TableCell>
                {canEdit && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSave(grade?.id || '')}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancel}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(grade || { id: '', student_id: student.id } as Grade)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {grade && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(grade.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

