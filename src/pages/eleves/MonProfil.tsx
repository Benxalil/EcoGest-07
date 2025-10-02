import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, MapPin, Phone, Mail, Users, FileText } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";

interface StudentProfile {
  id: string;
  nom: string;
  prenom: string;
  classe: string;
  dateNaissance?: string;
  lieuNaissance?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  numeroPerso?: string;
  sexe?: string;
  photo?: string;
  perePrenom?: string;
  pereNom?: string;
  pereAdresse?: string;
  pereTelephone?: string;
  merePrenom?: string;
  mereNom?: string;
  mereAdresse?: string;
  mereTelephone?: string;
  contactUrgenceNom?: string;
  contactUrgenceTelephone?: string;
  contactUrgenceRelation?: string;
}

export default function MonProfil() {
  const { userProfile } = useUserRole();
  const [studentData, setStudentData] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudentProfile();
  }, [userProfile]);

  const loadStudentProfile = async () => {
    try {
      setLoading(true);
      
      if (!userProfile?.id || !userProfile?.schoolId) return;
      
      // Récupérer les données de l'élève depuis Supabase
      const { data: student, error } = await supabase
        .from('students')
        .select('*, classes(id, name, level, section)')
        .eq('user_id', userProfile.id)
        .eq('school_id', userProfile.schoolId)
        .single();

      if (error) {
        console.error("Erreur lors du chargement du profil élève:", error);
        return;
      }
      
      if (student) {
        const className = `${student.classes.name} ${student.classes.level}${student.classes.section ? ` - ${student.classes.section}` : ''}`;
        
        setStudentData({
          id: student.id,
          nom: student.last_name,
          prenom: student.first_name,
          classe: className,
          dateNaissance: student.date_of_birth,
          lieuNaissance: student.place_of_birth,
          adresse: student.address,
          telephone: student.phone,
          email: student.parent_email,
          numeroPerso: student.student_number,
          sexe: student.gender,
          photo: null,
          perePrenom: null,
          pereNom: null,
          pereAdresse: null,
          pereTelephone: student.parent_phone,
          merePrenom: null,
          mereNom: null,
          mereAdresse: null,
          mereTelephone: null,
          contactUrgenceNom: null,
          contactUrgenceTelephone: student.emergency_contact,
          contactUrgenceRelation: null,
        });
      }
    } catch (error) {
      console.error("Erreur lors du chargement du profil élève:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!studentData) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Profil non trouvé</h3>
                <p className="text-gray-500">Vos informations de profil ne sont pas disponibles.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center gap-4">
          <User className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Mon Profil</h1>
        </div>

        {/* Informations principales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informations personnelles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 mb-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={studentData.photo} alt={`${studentData.prenom} ${studentData.nom}`} />
                <AvatarFallback className="text-lg">
                  {studentData.prenom.charAt(0)}{studentData.nom.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {studentData.prenom} {studentData.nom}
                </h2>
                <Badge variant="secondary" className="mt-2">
                  <Users className="h-4 w-4 mr-1" />
                  Classe {studentData.classe}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {studentData.numeroPerso && (
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Numéro d'élève</p>
                    <p className="font-medium">{studentData.numeroPerso}</p>
                  </div>
                </div>
              )}

              {studentData.dateNaissance && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Date de naissance</p>
                    <p className="font-medium">{new Date(studentData.dateNaissance).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
              )}

              {studentData.lieuNaissance && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Lieu de naissance</p>
                    <p className="font-medium">{studentData.lieuNaissance}</p>
                  </div>
                </div>
              )}

              {studentData.sexe && (
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Sexe</p>
                    <p className="font-medium">{studentData.sexe}</p>
                  </div>
                </div>
              )}

              {studentData.adresse && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Adresse</p>
                    <p className="font-medium">{studentData.adresse}</p>
                  </div>
                </div>
              )}

              {studentData.telephone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Téléphone</p>
                    <p className="font-medium">{studentData.telephone}</p>
                  </div>
                </div>
              )}

              {studentData.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{studentData.email}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Informations familiales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Père */}
          {(studentData.perePrenom || studentData.pereNom) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informations du père</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(studentData.perePrenom || studentData.pereNom) && (
                  <div>
                    <p className="text-sm text-gray-500">Nom complet</p>
                    <p className="font-medium">{studentData.perePrenom} {studentData.pereNom}</p>
                  </div>
                )}
                {studentData.pereTelephone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Téléphone</p>
                      <p className="font-medium">{studentData.pereTelephone}</p>
                    </div>
                  </div>
                )}
                {studentData.pereAdresse && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Adresse</p>
                      <p className="font-medium">{studentData.pereAdresse}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Mère */}
          {(studentData.merePrenom || studentData.mereNom) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informations de la mère</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(studentData.merePrenom || studentData.mereNom) && (
                  <div>
                    <p className="text-sm text-gray-500">Nom complet</p>
                    <p className="font-medium">{studentData.merePrenom} {studentData.mereNom}</p>
                  </div>
                )}
                {studentData.mereTelephone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Téléphone</p>
                      <p className="font-medium">{studentData.mereTelephone}</p>
                    </div>
                  </div>
                )}
                {studentData.mereAdresse && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Adresse</p>
                      <p className="font-medium">{studentData.mereAdresse}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Contact d'urgence */}
        {studentData.contactUrgenceNom && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-red-600">Contact d'urgence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Nom</p>
                  <p className="font-medium">{studentData.contactUrgenceNom}</p>
                </div>
                {studentData.contactUrgenceTelephone && (
                  <div>
                    <p className="text-sm text-gray-500">Téléphone</p>
                    <p className="font-medium">{studentData.contactUrgenceTelephone}</p>
                  </div>
                )}
                {studentData.contactUrgenceRelation && (
                  <div>
                    <p className="text-sm text-gray-500">Relation</p>
                    <p className="font-medium">{studentData.contactUrgenceRelation}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}