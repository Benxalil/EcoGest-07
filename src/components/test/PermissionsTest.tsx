import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/usePermissions';
import { useUserRole } from '@/hooks/useUserRole';
import { useGrades } from '@/hooks/useGrades';
import { useClasses } from '@/hooks/useClasses';
import { useSubjects } from '@/hooks/useSubjects';

export const PermissionsTest: React.FC = () => {
  const permissions = usePermissions();
  const { userProfile } = useUserRole();
  const { grades } = useGrades();
  const { classes } = useClasses();
  const { subjects } = useSubjects();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Test des Permissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Informations utilisateur */}
          <div>
            <h3 className="font-medium mb-2">Profil utilisateur</h3>
            <div className="text-sm space-y-1">
              <div><strong>Nom:</strong> {userProfile?.firstName} {userProfile?.lastName}</div>
              <div><strong>Email:</strong> {userProfile?.email}</div>
              <div><strong>Rôle:</strong> {userProfile?.role}</div>
              <div><strong>École ID:</strong> {userProfile?.schoolId}</div>
            </div>
          </div>

          {/* Permissions */}
          <div>
            <h3 className="font-medium mb-2">Permissions</h3>
            <div className="text-sm space-y-1">
              <div><strong>Admin:</strong> {permissions.isAdmin ? 'Oui' : 'Non'}</div>
              <div><strong>Enseignant:</strong> {permissions.isTeacher ? 'Oui' : 'Non'}</div>
              <div><strong>Peut voir toutes les notes:</strong> {permissions.canViewAllGrades ? 'Oui' : 'Non'}</div>
              <div><strong>Peut modifier toutes les notes:</strong> {permissions.canEditAllGrades ? 'Oui' : 'Non'}</div>
            </div>
          </div>

          {/* Matières assignées */}
          {userProfile?.subjects && userProfile.subjects.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Matières assignées</h3>
              <div className="text-sm space-y-1">
                {userProfile.subjects.map((subject) => (
                  <div key={subject.id}>
                    {subject.name} - Peut voir: {permissions.canViewSubjectGrades(subject.id) ? 'Oui' : 'Non'} - Peut modifier: {permissions.canEditSubjectGrades(subject.id) ? 'Oui' : 'Non'}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Classes assignées */}
          {userProfile?.classes && userProfile.classes.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Classes assignées</h3>
              <div className="text-sm space-y-1">
                {userProfile.classes.map((classe) => (
                  <div key={classe.id}>
                    {classe.name} - Peut voir: {permissions.canViewClassGrades(classe.id) ? 'Oui' : 'Non'} - Peut modifier: {permissions.canEditClassGrades(classe.id) ? 'Oui' : 'Non'}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Données disponibles */}
          <div>
            <h3 className="font-medium mb-2">Données disponibles</h3>
            <div className="text-sm space-y-1">
              <div><strong>Classes:</strong> {classes.length}</div>
              <div><strong>Matières:</strong> {subjects.length}</div>
              <div><strong>Notes:</strong> {grades.length}</div>
            </div>
          </div>

          {/* Test des permissions sur des matières spécifiques */}
          <div>
            <h3 className="font-medium mb-2">Test des permissions par matière</h3>
            <div className="text-sm space-y-1">
              {subjects.slice(0, 5).map((subject) => (
                <div key={subject.id} className="flex items-center gap-2">
                  <span>{subject.name}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    permissions.canViewSubjectGrades(subject.id) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {permissions.canViewSubjectGrades(subject.id) ? 'Peut voir' : 'Ne peut pas voir'}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    permissions.canEditSubjectGrades(subject.id) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {permissions.canEditSubjectGrades(subject.id) ? 'Peut modifier' : 'Ne peut pas modifier'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
