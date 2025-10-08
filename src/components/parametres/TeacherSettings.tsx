import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { User, LogOut, Phone, MapPin, Lock } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TeacherProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  specialization?: string;
  employeeNumber?: string;
}

export function TeacherSettings() {
  const { toast } = useToast();
  const { userProfile } = useUserRole();
  const [profile, setProfile] = useState<TeacherProfile>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    specialization: '',
    employeeNumber: ''
  });

  useEffect(() => {
    loadTeacherProfile();
  }, [userProfile]);

  const loadTeacherProfile = async () => {
    if (!userProfile) return;

    try {
      // Récupérer les informations de l'enseignant depuis la table teachers
      const { data: teacherData, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('user_id', userProfile.id)
        .single();

      if (teacherData && !error) {
        setProfile({
          firstName: teacherData.first_name || userProfile.firstName,
          lastName: teacherData.last_name || userProfile.lastName,
          email: userProfile.email || '',
          phone: teacherData.phone || '',
          address: teacherData.address || '',
          specialization: teacherData.specialization || '',
          employeeNumber: teacherData.employee_number || ''
        }); } else {
        // Utiliser les données du profil utilisateur si pas de données enseignant
        setProfile({
          firstName: userProfile.firstName,
          lastName: userProfile.lastName,
          email: userProfile.email || '',
          phone: '',
          address: '',
          specialization: '',
          employeeNumber: ''
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger votre profil",
        variant: "destructive"
      });
    }
  };


  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Rediriger vers la page de connexion
      window.location.href = '/';
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      toast({
        title: "Erreur",
        description: "Impossible de vous déconnecter",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes Paramètres</h1>
          <p className="text-gray-600">Consultez vos informations personnelles</p>
        </div>
        <Button 
          onClick={handleLogout} 
          variant="destructive"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Se déconnecter
        </Button>
      </div>

      {/* Alert d'information */}
      <Alert className="bg-blue-50 border-blue-200">
        <Lock className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          Vos informations personnelles sont en lecture seule. Seul l'administrateur peut les modifier.
        </AlertDescription>
      </Alert>

      {/* Informations personnelles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>Informations Personnelles</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Prénom</Label>
              <Input 
                id="firstName" 
                value={profile.firstName} 
                disabled
                className="bg-muted cursor-not-allowed"
                placeholder="Votre prénom" 
              />
            </div>
            <div>
              <Label htmlFor="lastName">Nom de famille</Label>
              <Input 
                id="lastName" 
                value={profile.lastName} 
                disabled
                className="bg-muted cursor-not-allowed"
                placeholder="Votre nom de famille" 
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email"
              value={profile.email} 
              disabled
              className="bg-muted cursor-not-allowed"
              placeholder="votre.email@ecole.com" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="phone" 
                  value={profile.phone || ''} 
                  disabled
                  placeholder="+221 XX XXX XX XX"
                  className="pl-10 bg-muted cursor-not-allowed"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="employeeNumber">Matricule</Label>
              <Input 
                id="employeeNumber" 
                value={profile.employeeNumber || ''} 
                disabled
                className="bg-muted cursor-not-allowed"
                placeholder="Matricule généré automatiquement" 
              />
            </div>
          </div>

          <div>
            <Label htmlFor="specialization">Spécialisation</Label>
            <Input 
              id="specialization" 
              value={profile.specialization || ''} 
              disabled
              className="bg-muted cursor-not-allowed"
              placeholder="Ex: Mathématiques, Français, Sciences..." 
            />
          </div>

          <div>
            <Label htmlFor="address">Adresse</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Textarea 
                id="address" 
                value={profile.address || ''} 
                disabled
                placeholder="Votre adresse complète"
                className="pl-10 bg-muted cursor-not-allowed"
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informations de connexion */}
      <Card>
        <CardHeader>
          <CardTitle>Informations de Connexion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900">Votre matricule de connexion</h4>
            <p className="text-blue-700 font-mono text-lg mt-1">
              {profile.employeeNumber || 'Non défini'}
            </p>
            <p className="text-blue-600 text-sm mt-2">
              Utilisez ce matricule avec votre mot de passe pour vous connecter au système.
            </p>
          </div>
          
          <Separator />
          
          <div className="text-sm text-gray-600">
            <p>
              Pour modifier votre mot de passe ou d'autres paramètres de sécurité, 
              contactez l'administrateur de l'école.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}