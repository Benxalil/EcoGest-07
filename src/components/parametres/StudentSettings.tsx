import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Layout } from "@/components/layout/Layout";
import { User, LogOut, Phone, MapPin, Calendar } from "lucide-react";

interface StudentProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  studentNumber: string;
  className: string;
  parentPhone: string;
  parentEmail: string;
}

export const StudentSettings = () => {
  const { toast } = useToast();
  const { userProfile } = useUserRole();
  const [profile, setProfile] = useState<StudentProfile>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    studentNumber: '',
    className: '',
    parentPhone: '',
    parentEmail: ''
  });

  useEffect(() => {
    if (userProfile) {
      loadStudentProfile();
    }
  }, [userProfile]);

  const loadStudentProfile = async () => {
    try {
      if (!userProfile?.id) return;

      // Récupérer les informations de l'élève
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select(`
          *,
          classes (
            name,
            level
          )
        `)
        .eq('user_id', userProfile.id)
        .single();

      if (studentError) {
        console.error('Erreur lors du chargement du profil élève:', studentError);
        return;
      }

      if (studentData) {
        setProfile({
          firstName: studentData.first_name || '',
          lastName: studentData.last_name || '',
          email: userProfile.email || '',
          phone: studentData.phone || '',
          address: studentData.address || '',
          dateOfBirth: studentData.date_of_birth || '',
          studentNumber: studentData.student_number || '',
          className: studentData.classes ? `${studentData.classes.level} ${studentData.classes.name}` : 'Non assigné',
          parentPhone: studentData.parent_phone || '',
          parentEmail: studentData.parent_email || ''
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
      window.location.href = '/auth';
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      toast({
        title: "Erreur",
        description: "Impossible de se déconnecter",
        variant: "destructive"
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mon Profil</h1>
            <p className="text-muted-foreground">Consultez vos informations personnelles</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>

        {/* Informations personnelles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Informations Personnelles
            </CardTitle>
            <CardDescription>
              Vos informations d'identité et de contact (lecture seule)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  value={profile.firstName}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  value={profile.lastName}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Téléphone
                </Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div>
                <Label htmlFor="dateOfBirth">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date de naissance
                </Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={profile.dateOfBirth}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">
                <MapPin className="w-4 h-4 inline mr-1" />
                Adresse
              </Label>
              <Textarea
                id="address"
                value={profile.address}
                disabled
                className="bg-muted"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Informations scolaires */}
        <Card>
          <CardHeader>
            <CardTitle>Informations Scolaires</CardTitle>
            <CardDescription>
              Vos informations académiques (lecture seule)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="studentNumber">Numéro d'élève</Label>
                <Input
                  id="studentNumber"
                  value={profile.studentNumber}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div>
                <Label htmlFor="className">Classe</Label>
                <Input
                  id="className"
                  value={profile.className}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email (Identifiant de connexion)</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                disabled
                className="bg-muted"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Utilisez cet email pour vous connecter à votre compte
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Informations parents (lecture seule) */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Parent/Tuteur</CardTitle>
            <CardDescription>
              Informations de contact de votre parent ou tuteur (lecture seule)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="parentPhone">Téléphone Parent</Label>
                <Input
                  id="parentPhone"
                  value={profile.parentPhone}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div>
                <Label htmlFor="parentEmail">Email Parent</Label>
                <Input
                  id="parentEmail"
                  value={profile.parentEmail}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};
