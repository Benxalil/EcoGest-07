import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { TeacherAssignment } from '@/components/admin/TeacherAssignment';
import { usePermissions } from '@/hooks/usePermissions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default function AssignationEnseignants() {
  const permissions = usePermissions();

  return (
    <Layout>
      <div className="container mx-auto p-6">
        {/* Vérification des permissions administrateur */}
        {!permissions.isAdmin ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Cette section est réservée aux administrateurs. 
              Vous n'avez pas l'autorisation d'accéder à cette page.
            </AlertDescription>
          </Alert>
        ) : (
          <TeacherAssignment />
        )}
      </div>
    </Layout>
  );
}

