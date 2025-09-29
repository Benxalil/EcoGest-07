import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { migrateSchoolUsers, createStudentAuthAccounts, createTeacherAuthAccounts } from '@/utils/authMigration';
import { Users, GraduationCap, UserCheck } from 'lucide-react';

interface MigrationResult {
  success: number;
  errors: number;
  details: string[];
}

export function UserMigrationManager() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    students?: MigrationResult;
    teachers?: MigrationResult;
  }>({});
  const { toast } = useToast();
  const { userProfile } = useUserRole();

  const handleMigrateAll = async () => {
    if (!userProfile?.schoolId) return;

    setLoading(true);
    try {
      const migrationResults = await migrateSchoolUsers(userProfile.schoolId);
      setResults(migrationResults);

      toast({
        title: "Migration terminée",
        description: `${migrationResults.students.success + migrationResults.teachers.success} comptes créés avec succès`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Erreur lors de la migration",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMigrateStudents = async () => {
    if (!userProfile?.schoolId) return;

    setLoading(true);
    try {
      const studentResults = await createStudentAuthAccounts(userProfile.schoolId);
      setResults(prev => ({ ...prev, students: studentResults }));

      toast({
        title: "Migration des élèves terminée",
        description: `${studentResults.success} comptes élèves créés`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Erreur lors de la migration des élèves",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMigrateTeachers = async () => {
    if (!userProfile?.schoolId) return;

    setLoading(true);
    try {
      const teacherResults = await createTeacherAuthAccounts(userProfile.schoolId);
      setResults(prev => ({ ...prev, teachers: teacherResults }));

      toast({
        title: "Migration des enseignants terminée",
        description: `${teacherResults.success} comptes enseignants créés`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Erreur lors de la migration des enseignants",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const ResultsSection = ({ title, result, icon: Icon }: { 
    title: string; 
    result?: MigrationResult; 
    icon: any;
  }) => {
    if (!result) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        
        <div className="flex gap-2">
          <Badge variant="default" className="bg-green-100 text-green-800">
            ✅ {result.success} créés
          </Badge>
          {result.errors > 0 && (
            <Badge variant="destructive">
              ❌ {result.errors} erreurs
            </Badge>
          )}
        </div>

        {result.details.length > 0 && (
          <div className="bg-gray-50 p-3 rounded-md">
            <h4 className="font-medium mb-2">Détails:</h4>
            <div className="space-y-1 text-sm">
              {result.details.map((detail, index) => (
                <div key={index} className="font-mono">
                  {detail}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Migration des comptes utilisateurs</CardTitle>
        <CardDescription>
          Créer rétroactivement des comptes d'authentification pour les élèves et enseignants existants qui n'ont pas de compte de connexion.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={loading} className="h-20 flex-col gap-2">
                <Users className="h-6 w-6" />
                Migrer tous les utilisateurs
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer la migration complète</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action va créer des comptes d'authentification pour tous les élèves et enseignants qui n'en ont pas encore. 
                  Les mots de passe par défaut seront utilisés (student123 pour les élèves, teacher123 pour les enseignants).
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleMigrateAll}>
                  Migrer tous les utilisateurs
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={loading} className="h-20 flex-col gap-2">
                <GraduationCap className="h-6 w-6" />
                Migrer les élèves
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer la migration des élèves</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action va créer des comptes d'authentification pour tous les élèves qui n'en ont pas encore.
                  Le mot de passe par défaut "student123" sera utilisé.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleMigrateStudents}>
                  Migrer les élèves
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={loading} className="h-20 flex-col gap-2">
                <UserCheck className="h-6 w-6" />
                Migrer les enseignants
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer la migration des enseignants</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action va créer des comptes d'authentification pour tous les enseignants qui n'en ont pas encore.
                  Le mot de passe par défaut "teacher123" sera utilisé.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleMigrateTeachers}>
                  Migrer les enseignants
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {(results.students || results.teachers) && (
          <>
            <Separator />
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Résultats de la migration</h2>
              
              <ResultsSection 
                title="Élèves" 
                result={results.students} 
                icon={GraduationCap}
              />
              
              {results.students && results.teachers && <Separator />}
              
              <ResultsSection 
                title="Enseignants" 
                result={results.teachers} 
                icon={UserCheck}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}