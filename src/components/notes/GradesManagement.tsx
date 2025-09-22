import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '@/hooks/usePermissions';
import { useClasses } from '@/hooks/useClasses';
import { useSubjects } from '@/hooks/useSubjects';
import { useStudents } from '@/hooks/useStudents';
import { ExamsFilter } from '../examens/ExamsFilter';
import { GradesTable } from './GradesTable';
import { GradesStats } from './GradesStats';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export const GradesManagement: React.FC = () => {
  const [filters, setFilters] = useState<{
    classId?: string;
    subjectId?: string;
    examId?: string;
  }>({});

  const permissions = usePermissions();
  const { classes } = useClasses();
  const { subjects } = useSubjects();
  const { students } = useStudents();

  // Filtrer les données selon les permissions
  const filteredClasses = classes.filter(classe => 
    permissions.canViewClassGrades(classe.id) || permissions.canViewAllGrades
  );

  const filteredSubjects = subjects.filter(subject => 
    permissions.canViewSubjectGrades(subject.id) || permissions.canViewAllGrades
  );

  const filteredStudents = students.filter(student => 
    !filters.classId || student.class_id === filters.classId
  );

  const canEdit = permissions.canEditAllGrades || 
    (filters.subjectId && permissions.canEditSubjectGrades(filters.subjectId));

  return (
    <div className="space-y-6">
      {/* En-tête avec informations sur les permissions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion des notes</h2>
          <p className="text-gray-600">
            {permissions.isAdmin 
              ? "Accès complet à toutes les notes et matières"
              : permissions.isTeacher 
                ? "Accès limité aux matières que vous enseignez"
                : "Aucun accès aux notes"
            }
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Rôle</div>
          <div className="font-medium">
            {permissions.isAdmin ? "Administrateur" : permissions.isTeacher ? "Enseignant" : "Utilisateur"}
          </div>
        </div>
      </div>

      {/* Alerte si pas d'accès */}
      {!permissions.isAdmin && !permissions.isTeacher && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Vous n'avez pas l'autorisation de consulter les notes. Contactez un administrateur.
          </AlertDescription>
        </Alert>
      )}

      {/* Filtres */}
      <ExamsFilter onFilterChange={setFilters} />

      {/* Statistiques */}
      {filters.examId && (
        <GradesStats 
          examId={filters.examId}
          classId={filters.classId}
          subjectId={filters.subjectId}
        />
      )}

      {/* Onglets pour différentes vues */}
      <Tabs defaultValue="grades" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="grades">Notes par examen</TabsTrigger>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
        </TabsList>

        <TabsContent value="grades" className="space-y-4">
          {filters.examId && filters.classId ? (
            <Card>
              <CardHeader>
                <CardTitle>Notes des élèves</CardTitle>
              </CardHeader>
              <CardContent>
                <GradesTable
                  examId={filters.examId}
                  classId={filters.classId}
                  subjectId={filters.subjectId || ''}
                  students={filteredStudents}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">
                  Sélectionnez un examen et une classe pour voir les notes
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Classes accessibles */}
            <Card>
              <CardHeader>
                <CardTitle>Classes accessibles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredClasses.map((classe) => (
                    <div key={classe.id} className="flex items-center justify-between p-2 border rounded">
                      <span>{classe.name}</span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setFilters({ ...filters, classId: classe.id })}
                        >
                          Voir notes
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Matières accessibles */}
            <Card>
              <CardHeader>
                <CardTitle>Matières accessibles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredSubjects.map((subject) => (
                    <div key={subject.id} className="flex items-center justify-between p-2 border rounded">
                      <span>{subject.name}</span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setFilters({ ...filters, subjectId: subject.id })}
                        >
                          Voir notes
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

