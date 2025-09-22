import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGrades } from '@/hooks/useGrades';
import { usePermissions } from '@/hooks/usePermissions';

interface GradesStatsProps {
  examId?: string;
  classId?: string;
  subjectId?: string;
}

export const GradesStats: React.FC<GradesStatsProps> = ({ examId, classId, subjectId }) => {
  const { grades, loading } = useGrades(examId, undefined, subjectId, classId);
  const permissions = usePermissions();

  if (loading) {
    return <div className="text-center py-4">Chargement des statistiques...</div>;
  }

  if (grades.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Aucune note disponible pour cette sélection
      </div>
    );
  }

  // Calculer les statistiques
  const totalStudents = grades.length;
  const totalMarks = grades.reduce((sum, grade) => sum + (grade.marks_obtained || 0), 0);
  const maxMarks = grades.reduce((sum, grade) => sum + (grade.max_marks || 0), 0);
  const average = maxMarks > 0 ? (totalMarks / maxMarks) * 100 : 0;

  // Calculer les mentions
  const excellent = grades.filter(grade => {
    const percentage = (grade.marks_obtained / grade.max_marks) * 100;
    return percentage >= 80;
  }).length;

  const good = grades.filter(grade => {
    const percentage = (grade.marks_obtained / grade.max_marks) * 100;
    return percentage >= 60 && percentage < 80;
  }).length;

  const average_grades = grades.filter(grade => {
    const percentage = (grade.marks_obtained / grade.max_marks) * 100;
    return percentage >= 40 && percentage < 60;
  }).length;

  const poor = grades.filter(grade => {
    const percentage = (grade.marks_obtained / grade.max_marks) * 100;
    return percentage < 40;
  }).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Moyenne générale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{average.toFixed(1)}%</div>
          <p className="text-xs text-gray-500">
            {totalMarks.toFixed(1)} / {maxMarks.toFixed(1)} points
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Nombre d'élèves</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalStudents}</div>
          <p className="text-xs text-gray-500">Total évalués</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Répartition</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs">Excellent (≥80%)</span>
              <Badge variant="outline" className="bg-green-50 text-green-700">
                {excellent}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs">Bien (60-79%)</span>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {good}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs">Moyen (40-59%)</span>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                {average_grades}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs">Insuffisant (&lt;40%)</span>
              <Badge variant="outline" className="bg-red-50 text-red-700">
                {poor}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Accès</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs">Lecture</span>
              <Badge variant={permissions.canViewAllGrades ? "default" : "secondary"}>
                {permissions.canViewAllGrades ? "Tout" : "Limité"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">Modification</span>
              <Badge variant={permissions.canEditAllGrades ? "default" : "secondary"}>
                {permissions.canEditAllGrades ? "Tout" : "Limité"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
