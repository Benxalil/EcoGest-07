import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Database } from "@/integrations/supabase/types";

type Student = Database['public']['Tables']['students']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export default function ProfilEnfant() {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const { userProfile } = useUserRole();

  useEffect(() => {
    const fetchChildProfile = async () => {
      if (!userProfile?.id) return;

      try {
        // Trouver l'enfant lié au parent via l'email parent
        const { data: childData, error } = await supabase
          .from('students')
          .select('*')
          .eq('parent_email', userProfile.email)
          .single();

        if (error) {
          console.error('Erreur lors de la récupération du profil de l\'enfant:', error); } else {
          setStudent(childData);
        }
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChildProfile();
  }, [userProfile]);

  if (loading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!student) {
    return (
      <Layout>
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>Profil de votre enfant</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Aucun enfant associé à votre compte n'a été trouvé. 
                Veuillez contacter l'administration de l'école.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Profil de votre enfant</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Informations personnelles
              <Badge variant={student.is_active ? "default" : "secondary"}>
                {student.is_active ? "Actif" : "Inactif"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Prénom</label>
                <p className="text-lg">{student.first_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nom</label>
                <p className="text-lg">{student.last_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Numéro d'élève</label>
                <p className="text-lg">{student.student_number}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date de naissance</label>
                <p className="text-lg">
                  {student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('fr-FR') : 'Non renseignée'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Lieu de naissance</label>
                <p className="text-lg">{student.place_of_birth || 'Non renseigné'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Genre</label>
                <p className="text-lg">
                  {student.gender === 'M' ? 'Masculin' : student.gender === 'F' ? 'Féminin' : 'Non renseigné'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date d'inscription</label>
                <p className="text-lg">
                  {student.enrollment_date ? new Date(student.enrollment_date).toLocaleDateString('fr-FR') : 'Non renseignée'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Téléphone</label>
                <p className="text-lg">{student.phone || 'Non renseigné'}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Adresse</label>
              <p className="text-lg">{student.address || 'Non renseignée'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact d'urgence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Téléphone des parents</label>
                <p className="text-lg">{student.parent_phone || 'Non renseigné'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email des parents</label>
                <p className="text-lg">{student.parent_email || 'Non renseigné'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Contact d'urgence</label>
                <p className="text-lg">{student.emergency_contact || 'Non renseigné'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}