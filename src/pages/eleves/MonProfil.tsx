import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, X } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Student = Database['public']['Tables']['students']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export default function MonProfil() {
  const { userProfile } = useUserRole();
  const [student, setStudent] = useState<Student & { classes: { name: string; level: string; section: string | null } } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStudentProfile = async () => {
      if (!userProfile?.id || !userProfile?.schoolId) return;

      try {
        setLoading(true);

        // Récupérer les données de l'élève avec sa classe
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select(`
            *,
            classes (
              name,
              level,
              section
            )
          `)
          .eq('user_id', userProfile.id)
          .eq('school_id', userProfile.schoolId)
          .maybeSingle();

        if (studentError) {
          console.error("Erreur lors du chargement de l'élève:", studentError);
          return;
        }

        if (!studentData) {
          console.warn("Aucun élève trouvé pour user_id:", userProfile.id);
          return;
        }

        setStudent(studentData as any);

        // Récupérer le profil utilisateur
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userProfile.id)
          .maybeSingle();

        if (profileError) {
          console.error("Erreur lors du chargement du profil:", profileError);
          return;
        }

        setProfile(profileData);
      } catch (error) {
        console.error("Erreur lors du chargement du profil:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStudentProfile();
  }, [userProfile]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!student || !profile) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Profil non trouvé</h3>
                <p className="text-muted-foreground">Vos informations de profil ne sont pas disponibles.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const className = student.classes 
    ? `${student.classes.name} ${student.classes.level}${student.classes.section ? ` - ${student.classes.section}` : ''}`
    : 'Non assigné';

  const genderDisplay = student.gender === 'M' ? 'Masculin' : student.gender === 'F' ? 'Féminin' : '';

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-4xl">
        <Card className="border-2">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold">Détails de l'élève</CardTitle>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            {/* En-tête avec photo et informations principales */}
            <div className="flex items-start gap-6 mb-8 pb-6 border-b">
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {student.is_active && (
                  <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-primary mb-2">
                  {student.first_name} {student.last_name}
                </h2>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p><span className="font-medium">Matricule:</span> {student.student_number}</p>
                  <p><span className="font-medium">Classe:</span> {className}</p>
                  <p>
                    <span className="font-medium">{genderDisplay}</span>
                    {student.date_of_birth && (
                      <> • Né(e) le {new Date(student.date_of_birth).toLocaleDateString('fr-FR')}</>
                    )}
                  </p>
                </div>
              </div>

              {student.is_active ? (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  Actif
                </Badge>
              ) : (
                <Badge variant="secondary">
                  Inactif
                </Badge>
              )}
            </div>

            {/* Contenu principal en deux colonnes */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Colonne gauche - Informations personnelles */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-4">Informations personnelles</h3>
                  <div className="space-y-3">
                    {student.place_of_birth && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Lieu de naissance:</label>
                        <p className="text-foreground">{student.place_of_birth}</p>
                      </div>
                    )}
                    {student.address && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Adresse:</label>
                        <p className="text-foreground">{student.address}</p>
                      </div>
                    )}
                    {student.phone && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Téléphone:</label>
                        <p className="text-foreground">{student.phone}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Informations du père */}
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-4">Informations du père</h3>
                  <div className="space-y-3">
                    {student.father_first_name || student.father_last_name ? (
                      <>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Nom complet:</label>
                          <p className="text-foreground">
                            {`${student.father_first_name || ''} ${student.father_last_name || ''}`.trim()}
                          </p>
                        </div>
                        {student.father_profession && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Profession:</label>
                            <p className="text-foreground">{student.father_profession}</p>
                          </div>
                        )}
                        {student.father_address && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Adresse:</label>
                            <p className="text-foreground">{student.father_address}</p>
                          </div>
                        )}
                        {student.father_phone && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Téléphone:</label>
                            <p className="text-foreground">{student.father_phone}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Non renseigné</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Colonne droite - Contact d'urgence et Informations de la mère */}
              <div className="space-y-6">
                {/* Contact d'urgence */}
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-4">Contact d'urgence</h3>
                  <div className="space-y-3">
                    {student.emergency_contact ? (
                      <>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Nom:</label>
                          <p className="text-foreground">{student.emergency_contact}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Téléphone:</label>
                          <p className="text-primary">Non renseigné</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Relation:</label>
                          <p className="text-primary">Non renseigné</p>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-primary">Non renseigné</p>
                    )}
                  </div>
                </div>

                {/* Informations de la mère */}
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-4">Informations de la mère</h3>
                  <div className="space-y-3">
                    {student.mother_first_name || student.mother_last_name ? (
                      <>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Nom complet:</label>
                          <p className="text-foreground">
                            {`${student.mother_first_name || ''} ${student.mother_last_name || ''}`.trim()}
                          </p>
                        </div>
                        {student.mother_profession && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Profession:</label>
                            <p className="text-foreground">{student.mother_profession}</p>
                          </div>
                        )}
                        {student.mother_address && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Adresse:</label>
                            <p className="text-foreground">{student.mother_address}</p>
                          </div>
                        )}
                        {student.mother_phone && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Téléphone:</label>
                            <p className="text-foreground">{student.mother_phone}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Non renseigné</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Documents de l'élève */}
            <div className="mt-8 pt-6 border-t">
              <h3 className="text-lg font-semibold text-primary mb-4">Documents de l'élève</h3>
              <p className="text-sm text-muted-foreground italic">Aucun document disponible</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}