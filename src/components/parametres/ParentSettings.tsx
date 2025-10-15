import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useParentInfo } from "@/hooks/useParentInfo";
import { LogOut, User, Mail, Phone, Hash } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { clearAllCacheOnLogout } from "@/utils/securityCleanup";

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
  const navigate = useNavigate();
  const { parentInfo, loading } = useParentInfo();
  const [profile, setProfile] = useState<ParentProfile>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    parentMatricule: ""
  });

  useEffect(() => {
    if (parentInfo) {
      setProfile({
        firstName: parentInfo.firstName,
        lastName: parentInfo.lastName,
        email: parentInfo.email,
        phone: parentInfo.phone,
        address: "",
        parentMatricule: parentInfo.matricule
      });
    }
  }, [parentInfo]);

  const handleLogout = async () => {
    try {
      await clearAllCacheOnLogout();
      toast({
        title: "Déconnexion réussie",
        description: "À bientôt !",
      });
      navigate("/auth");
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      navigate("/auth");
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
