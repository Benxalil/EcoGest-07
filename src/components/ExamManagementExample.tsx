import React, { useState } from 'react';
import { useExams } from '@/hooks/useExams';
import { useGrades } from '@/hooks/useGrades';
import { ConfirmDeleteExam } from './ConfirmDeleteExam';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ExamManagementExampleProps {
  classId?: string;
}

export const ExamManagementExample: React.FC<ExamManagementExampleProps> = ({ classId }) => {
  const { exams, loading, deleteExam } = useExams();
  const { grades } = useGrades();
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    examId: string;
    examTitle: string;
    notesCount: number;
  }>({
    isOpen: false,
    examId: '',
    examTitle: '',
    notesCount: 0
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtrer les examens par classe si classId est fourni
  const filteredExams = classId 
    ? exams.filter(exam => exam.class_id === classId)
    : exams;

  const handleDeleteClick = (examId: string, examTitle: string) => {
    // Compter les notes associées à cet examen
    const notesCount = grades.filter(grade => grade.exam_id === examId).length;
    
    setDeleteDialog({
      isOpen: true,
      examId,
      examTitle,
      notesCount
    });
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    
    try {
      const success = await deleteExam(deleteDialog.examId);
      
      if (success) {
        setDeleteDialog({
          isOpen: false,
          examId: '',
          examTitle: '',
          notesCount: 0
        });
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialog({
      isOpen: false,
      examId: '',
      examTitle: '',
      notesCount: 0
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement des examens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          Gestion des Examens
        </h2>
        <Badge variant="outline" className="text-sm">
          {filteredExams.length} examen{filteredExams.length > 1 ? 's' : ''}
        </Badge>
      </div>

      {filteredExams.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">Aucun examen trouvé.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredExams.map((exam) => {
            const notesCount = grades.filter(grade => grade.exam_id === exam.id).length;
            
            return (
              <Card key={exam.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2">
                      {exam.title}
                    </CardTitle>
                    <Badge 
                      variant={notesCount > 0 ? "destructive" : "secondary"}
                      className="ml-2 flex-shrink-0"
                    >
                      {notesCount} note{notesCount > 1 ? 's' : ''}
                    </Badge>
                  </div>
                  {exam.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {exam.description}
                    </p>
                  )}
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      Créé le {new Date(exam.created_at).toLocaleDateString('fr-FR')}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Logique pour voir les détails de l'examen
                          console.log('Voir détails:', exam.id);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Logique pour modifier l'examen
                          console.log('Modifier:', exam.id);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(exam.id, exam.title)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDeleteExam
        isOpen={deleteDialog.isOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        examTitle={deleteDialog.examTitle}
        notesCount={deleteDialog.notesCount}
        isLoading={isDeleting}
      />
    </div>
  );
};
