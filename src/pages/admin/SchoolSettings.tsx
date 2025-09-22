import { Layout } from "@/components/layout/Layout";
import { SchoolManagement } from "@/components/admin/SchoolManagement";
import { SchoolIdentifierManager } from "@/components/admin/SchoolIdentifierManager";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function SchoolSettings() {
  const { userProfile, loading } = useUserRole();

  // Vérifier que l'utilisateur est administrateur d'école
  const isSchoolAdmin = userProfile?.role === 'school_admin';

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!isSchoolAdmin) {
    return (
      <Layout>
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Accès non autorisé</h3>
                <p className="text-muted-foreground">
                  Vous devez être administrateur d'école pour accéder à cette page.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gestion de l'école</h1>
          <p className="text-muted-foreground mt-2">
            Configurez et gérez les paramètres de votre établissement scolaire
          </p>
        </div>
        
        <div className="space-y-8">
          <SchoolManagement />
          <SchoolIdentifierManager />
        </div>
      </div>
    </Layout>
  );
}