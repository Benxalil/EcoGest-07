import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { User, Save, LogOut, Phone, Mail, MapPin } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";

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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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

  const handleInputChange = (field: keyof TeacherProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const saveProfile = async () => {
    if (!userProfile) return;

    try {
      // Mettre à jour le profil utilisateur
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: profile.firstName,
          last_name: profile.lastName
        })
        .eq('id', userProfile.id);

      if (profileError) throw profileError;

      // Mettre à jour ou créer les données enseignant
      const { error: teacherError } = await supabase
        .from('teachers')
        .upsert({
          user_id: userProfile.id,
          first_name: profile.firstName,
          last_name: profile.lastName,
          phone: profile.phone,
          address: profile.address,
          specialization: profile.specialization,
          employee_number: profile.employeeNumber || `PROF${Date.now()}`,
          school_id: userProfile.schoolId!
        });

      if (teacherError) throw teacherError;

      setHasUnsavedChanges(false);
      
      toast({
        title: "✅ Profil mis à jour !",
        description: "Vos informations personnelles ont été sauvegardées avec succès",
        className: "animate-fade-in bg-green-50 border-green-200 text-green-800",
        duration: 4000,
      });

      // Recharger les données
      loadTeacherProfile();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder vos informations. Veuillez réessayer.",
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
          <p className="text-gray-600">Gérez vos informations personnelles</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            onClick={saveProfile} 
            disabled={!hasUnsavedChanges}
            className={!hasUnsavedChanges ? "opacity-50 cursor-not-allowed" : ""}
          >
            <Save className="w-4 h-4 mr-2" />
            Sauvegarder
          </Button>
          <Button 
            onClick={handleLogout} 
            variant="destructive"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Se déconnecter
          </Button>
        </div>
      </div>

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
                onChange={e => handleInputChange('firstName', e.target.value)}
                placeholder="Votre prénom" 
              />
            </div>
            <div>
              <Label htmlFor="lastName">Nom de famille</Label>
              <Input 
                id="lastName" 
                value={profile.lastName} 
                onChange={e => handleInputChange('lastName', e.target.value)}
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
              className="bg-gray-50"
              placeholder="votre.email@ecole.com" 
            />
            <p className="text-xs text-gray-500 mt-1">
              L'email ne peut pas être modifié depuis cette interface
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input 
                  id="phone" 
                  value={profile.phone || ''} 
                  onChange={e => handleInputChange('phone', e.target.value)}
                  placeholder="+221 XX XXX XX XX"
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="employeeNumber">Matricule</Label>
              <Input 
                id="employeeNumber" 
                value={profile.employeeNumber || ''} 
                disabled
                className="bg-gray-50"
                placeholder="Matricule généré automatiquement" 
              />
            </div>
          </div>

          <div>
            <Label htmlFor="specialization">Spécialisation</Label>
            <Input 
              id="specialization" 
              value={profile.specialization || ''} 
              onChange={e => handleInputChange('specialization', e.target.value)}
              placeholder="Ex: Mathématiques, Français, Sciences..." 
            />
          </div>

          <div>
            <Label htmlFor="address">Adresse</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Textarea 
                id="address" 
                value={profile.address || ''} 
                onChange={e => handleInputChange('address', e.target.value)}
                placeholder="Votre adresse complète"
                className="pl-10"
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