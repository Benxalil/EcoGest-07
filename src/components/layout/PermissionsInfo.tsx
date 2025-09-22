import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/usePermissions';
import { useUserRole } from '@/hooks/useUserRole';
import { Shield, BookOpen, Users, Edit } from 'lucide-react';

export const PermissionsInfo: React.FC = () => {
  const permissions = usePermissions();
  const { userProfile } = useUserRole();

  if (!userProfile) return null;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Permissions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Rôle */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Rôle</span>
          <Badge variant={permissions.isAdmin ? "default" : "secondary"}>
            {permissions.isAdmin ? "Administrateur" : permissions.isTeacher ? "Enseignant" : "Utilisateur"}
          </Badge>
        </div>

        {/* Accès aux notes */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Notes</span>
          <div className="flex gap-1">
            <Badge variant={permissions.canViewAllGrades ? "default" : "outline"} className="text-xs">
              <BookOpen className="h-3 w-3 mr-1" />
              Lecture
            </Badge>
            <Badge variant={permissions.canEditAllGrades ? "default" : "outline"} className="text-xs">
              <Edit className="h-3 w-3 mr-1" />
              Édition
            </Badge>
          </div>
        </div>

        {/* Matières assignées */}
        {permissions.isTeacher && userProfile.subjects && userProfile.subjects.length > 0 && (
          <div>
            <span className="text-xs text-gray-600 block mb-1">Matières</span>
            <div className="flex flex-wrap gap-1">
              {userProfile.subjects.slice(0, 3).map((subject) => (
                <Badge key={subject.id} variant="outline" className="text-xs">
                  {subject.name}
                </Badge>
              ))}
              {userProfile.subjects.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{userProfile.subjects.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Classes assignées */}
        {permissions.isTeacher && userProfile.classes && userProfile.classes.length > 0 && (
          <div>
            <span className="text-xs text-gray-600 block mb-1">Classes</span>
            <div className="flex flex-wrap gap-1">
              {userProfile.classes.slice(0, 3).map((classe) => (
                <Badge key={classe.id} variant="secondary" className="text-xs">
                  {classe.name}
                </Badge>
              ))}
              {userProfile.classes.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{userProfile.classes.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Message d'information */}
        {permissions.isTeacher && (
          <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
            Vous pouvez consulter et modifier les notes uniquement pour vos matières et classes assignées.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
