import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, User, Mail, Phone, MapPin, Hash } from "lucide-react";

interface ParentProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  parentMatricule: string;
}

export function ParentSettings() {
  const { toast } = useToast();
  const { userProfile } = useUserRole();
  const [profile, setProfile] = useState<ParentProfile>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    parentMatricule: ""
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile?.id) {
      loadParentProfile();
    }
  }, [userProfile]);

  const loadParentProfile = async () => {
    try {
      setLoading(true);
      
      // Récupérer les informations du profil
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userProfile?.id)
        .single();

      if (profileError) throw profileError;

      // Chercher dans la table students pour récupérer le parent_matricule
      const { data: studentData } = await supabase
        .from('students')
        .select('parent_matricule, parent_phone, parent_email')
        .eq('parent_matricule', profileData.email)
        .limit(1)
        .single();

      setProfile({
        firstName: profileData.first_name || "",
        lastName: profileData.last_name || "",
        email: profileData.email || "",
        phone: studentData?.parent_phone || profileData.phone || "",
        address: "",
        parentMatricule: studentData?.parent_matricule || profileData.email || ""
      });
    } catch (error) {
      console.error("Erreur lors du chargement du profil parent:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les informations du profil",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = "/auth";
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      toast({
        title: "Erreur",
        description: "Impossible de se déconnecter",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Mes Paramètres</h1>
            <p className="text-muted-foreground">
              Consultez vos informations personnelles
            </p>
          </div>
          <Button onClick={handleLogout} variant="destructive">
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>

        {/* Informations personnelles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Informations Personnelles</span>
            </CardTitle>
            <CardDescription>
              Ces informations sont en lecture seule. Pour toute modification, veuillez contacter l'administration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span>Prénom</span>
                </Label>
                <Input
                  id="firstName"
                  value={profile.firstName}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName" className="flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span>Nom</span>
                </Label>
                <Input
                  id="lastName"
                  value={profile.lastName}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>Email</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center space-x-2">
                  <Phone className="w-4 h-4" />
                  <span>Téléphone</span>
                </Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="parentMatricule" className="flex items-center space-x-2">
                  <Hash className="w-4 h-4" />
                  <span>Matricule Parent</span>
                </Label>
                <Input
                  id="parentMatricule"
                  value={profile.parentMatricule}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informations de connexion */}
        <Card>
          <CardHeader>
            <CardTitle>Informations de Connexion</CardTitle>
            <CardDescription>
              Votre identifiant de connexion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Identifiant (Matricule)</Label>
              <Input
                value={profile.parentMatricule}
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Pour modifier votre mot de passe ou toute autre information, veuillez contacter l'administration de l'école.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
