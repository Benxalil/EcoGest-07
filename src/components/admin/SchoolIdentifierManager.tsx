import { useState, useEffect } from 'react';
import { useSchoolIdentifiers } from '@/hooks/useSchoolIdentifiers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Copy, UserPlus, Users, GraduationCap, User, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type UserRole = 'student' | 'teacher' | 'parent' | 'school_admin';

interface IdentifierStats {
  student: number;
  teacher: number;  
  parent: number;
  school_admin: number;
}

export function SchoolIdentifierManager() {
  const [schoolInfo, setSchoolInfo] = useState<{ schoolSuffix: string; schoolName: string } | null>(null);
  const [identifierStats, setIdentifierStats] = useState<IdentifierStats | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [generatedIdentifier, setGeneratedIdentifier] = useState<string>('');
  
  const { 
    loading, 
    getSchoolSuffix, 
    generateUserIdentifier, 
    getIdentifierStats 
  } = useSchoolIdentifiers();
  
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [suffix, stats] = await Promise.all([
      getSchoolSuffix(),
      getIdentifierStats()
    ]);
    
    setSchoolInfo(suffix);
    setIdentifierStats(stats);
  };

  const handleGenerateIdentifier = async () => {
    const identifier = await generateUserIdentifier(selectedRole);
    if (identifier) {
      setGeneratedIdentifier(identifier);
      // Recharger les statistiques après génération
      const stats = await getIdentifierStats();
      setIdentifierStats(stats);
      
      toast({
        title: "Identifiant généré",
        description: `Nouvel identifiant créé : ${identifier}`,
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copié",
      description: "Identifiant copié dans le presse-papier",
    });
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'student': return <GraduationCap className="h-4 w-4" />;
      case 'teacher': return <Users className="h-4 w-4" />;
      case 'parent': return <User className="h-4 w-4" />;
      case 'school_admin': return <Shield className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'student': return 'Élève';
      case 'teacher': return 'Professeur';
      case 'parent': return 'Parent';
      case 'school_admin': return 'Administrateur';
      default: return role;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'student': return 'bg-blue-500';
      case 'teacher': return 'bg-green-500';
      case 'parent': return 'bg-purple-500';
      case 'school_admin': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (!schoolInfo) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Chargement des informations de l'école...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Informations de l'école */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Identifiant unique de l'école
          </CardTitle>
          <CardDescription>
            Suffixe utilisé pour tous les identifiants utilisateurs de votre établissement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-medium">{schoolInfo.schoolName}</p>
              <p className="text-sm text-muted-foreground">
                Suffixe : <code className="px-2 py-1 bg-background rounded text-foreground">@{schoolInfo.schoolSuffix}</code>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(`@${schoolInfo.schoolSuffix}`)}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copier
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques des identifiants */}
      <Card>
        <CardHeader>
          <CardTitle>Statistiques des identifiants</CardTitle>
          <CardDescription>
            Nombre d'identifiants générés par rôle dans votre école
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 rounded-full bg-blue-500 text-white">
                  <GraduationCap className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-bold">{identifierStats?.student || 0}</p>
              <p className="text-sm text-muted-foreground">Élèves</p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 rounded-full bg-green-500 text-white">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-bold">{identifierStats?.teacher || 0}</p>
              <p className="text-sm text-muted-foreground">Professeurs</p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 rounded-full bg-purple-500 text-white">
                  <User className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-bold">{identifierStats?.parent || 0}</p>
              <p className="text-sm text-muted-foreground">Parents</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Générateur d'identifiants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Générateur d'identifiants
          </CardTitle>
          <CardDescription>
            Générez des identifiants uniques pour les élèves, professeurs et parents.
            Les administrateurs utilisent leur adresse email pour se connecter.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-2">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Note pour les administrateurs
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Les administrateurs se connectent directement avec leur adresse email et mot de passe.
                  Pas besoin de générer d'identifiant pour ce rôle.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Rôle de l'utilisateur</label>
              <Select value={selectedRole} onValueChange={(value: UserRole) => setSelectedRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Élève
                    </div>
                  </SelectItem>
                  <SelectItem value="teacher">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Professeur
                    </div>
                  </SelectItem>
                  <SelectItem value="parent">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Parent
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="pt-6">
              <Button 
                onClick={handleGenerateIdentifier}
                disabled={loading}
              >
                {loading ? "Génération..." : "Générer"}
              </Button>
            </div>
          </div>

          {generatedIdentifier && (
            <>
              <Separator />
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200 mb-1">
                      Identifiant généré avec succès
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {generatedIdentifier}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(generatedIdentifier)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-green-600 dark:text-green-300 mt-2">
                  Cet identifiant peut maintenant être utilisé pour créer un compte utilisateur.
                </p>
              </div>
            </>
          )}

          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>Format des identifiants :</strong></p>
            <ul className="space-y-1 ml-4">
              <li>• Élève : <code>EleveXXX@{schoolInfo.schoolSuffix}</code></li>
              <li>• Professeur : <code>ProfXXX@{schoolInfo.schoolSuffix}</code></li>
              <li>• Parent : <code>ParentXXX@{schoolInfo.schoolSuffix}</code></li>
            </ul>
            <p className="mt-2 text-xs">
              XXX = numéro séquentiel unique à 3 chiffres (ex: 001, 002, 003...)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}