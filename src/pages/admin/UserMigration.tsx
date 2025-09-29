import { Layout } from '@/components/layout/Layout';
import { UserMigrationManager } from '@/components/admin/UserMigrationManager';

export default function UserMigration() {
  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Migration des comptes utilisateurs</h1>
            <p className="text-muted-foreground mt-2">
              Gérez la création automatique des comptes d'authentification pour vos utilisateurs existants.
            </p>
          </div>
          
          <UserMigrationManager />
        </div>
      </div>
    </Layout>
  );
}