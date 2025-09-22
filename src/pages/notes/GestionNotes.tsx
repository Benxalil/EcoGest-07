import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { GradesManagement } from '@/components/notes/GradesManagement';
import { usePermissions } from '@/hooks/usePermissions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default function GestionNotes() {
  const permissions = usePermissions();

  return (
    <Layout>
      <div className="container mx-auto p-6">
        {/* Vérification des permissions */}
        {!permissions.isAdmin && !permissions.isTeacher ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Vous n'avez pas l'autorisation d'accéder à cette section. 
              Contactez un administrateur pour obtenir les permissions nécessaires.
            </AlertDescription>
          </Alert>
        ) : (
          <GradesManagement />
        )}
      </div>
    </Layout>
  );
}
