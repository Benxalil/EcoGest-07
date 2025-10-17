import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Layout } from "@/components/layout/Layout";
import { useParentData } from "@/hooks/useParentData";
import { ParentChildSelector } from "@/components/parent/ParentChildSelector";
import { User, Phone, Mail, MapPin, Calendar, School } from "lucide-react";

export default function ProfilEnfant() {
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const { children, selectedChild, loading } = useParentData(selectedChildId);

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

  if (children.length === 0) {
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

  if (!selectedChild) {
    return null;
  }

  const getInitials = () => {
    return `${selectedChild.first_name?.[0] || ''}${selectedChild.last_name?.[0] || ''}`.toUpperCase();
  };

  const avatarUrl = (selectedChild as any).profiles?.avatar_url;
  const classInfo = (selectedChild as any).classes;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Détails de l'élève</h1>
        </div>

        {/* Sélecteur d'enfant */}
        <ParentChildSelector 
          children={children}
          selectedChildId={selectedChildId || selectedChild.id}
          onChildSelect={setSelectedChildId}
        />

        {/* En-tête avec photo et infos principales */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl} alt={`${selectedChild.first_name} ${selectedChild.last_name}`} />
                <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-3">
                <div>
                  <h2 className="text-2xl font-bold text-primary">
                    {selectedChild.first_name} {selectedChild.last_name}
                  </h2>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline">
                      Matricule: {selectedChild.student_number}
                    </Badge>
                    <Badge variant={selectedChild.is_active ? "default" : "secondary"}>
                      {selectedChild.is_active ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {classInfo && (
                    <div className="flex items-center gap-2">
                      <School className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Classe:</span>
                      <span>{classInfo.name} {classInfo.section || ''}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Genre:</span>
                    <span>
                      {selectedChild.gender === 'M' ? 'Masculin' : selectedChild.gender === 'F' ? 'Féminin' : 'Non renseigné'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Né(e) le:</span>
                    <span>
                      {selectedChild.date_of_birth ? new Date(selectedChild.date_of_birth).toLocaleDateString('fr-FR') : 'Non renseignée'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Informations personnelles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-orange-600">Informations personnelles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Lieu de naissance</label>
                <p className="text-base mt-1">{selectedChild.place_of_birth || 'Non renseigné'}</p>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Adresse
                </label>
                <p className="text-base mt-1">{selectedChild.address || 'Non renseignée'}</p>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Téléphone
                </label>
                <p className="text-base mt-1">{selectedChild.phone || 'Non renseigné'}</p>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </label>
                <p className="text-base mt-1">{selectedChild.parent_email || 'Non renseigné'}</p>
              </div>

              <Separator />
              
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date d'inscription
                </label>
                <p className="text-base mt-1">
                  {selectedChild.enrollment_date ? new Date(selectedChild.enrollment_date).toLocaleDateString('fr-FR') : 'Non renseignée'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Contact d'urgence */}
          <Card>
            <CardHeader>
              <CardTitle className="text-orange-600">Contact d'urgence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nom</label>
                <p className="text-base mt-1">{selectedChild.emergency_contact || 'Non renseigné'}</p>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Téléphone
                </label>
                <p className="text-base mt-1">{selectedChild.parent_phone || 'Non renseigné'}</p>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Relation</label>
                <p className="text-base mt-1">Parent</p>
              </div>
            </CardContent>
          </Card>

          {/* Informations du père */}
          <Card>
            <CardHeader>
              <CardTitle className="text-orange-600">Informations du père</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nom complet</label>
                <p className="text-base mt-1">
                  {selectedChild.father_first_name || selectedChild.parent_first_name 
                    ? `${selectedChild.father_first_name || selectedChild.parent_first_name || ''} ${selectedChild.father_last_name || selectedChild.parent_last_name || ''}`
                    : 'Non renseigné'}
                </p>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Statut de vie</label>
                <p className="text-base mt-1">
                  {selectedChild.father_status === 'alive' ? '✅ En vie' : 
                   selectedChild.father_status === 'deceased' ? '⚫ Décédé' : 'Non renseigné'}
                </p>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Profession / Fonction</label>
                <p className="text-base mt-1">{selectedChild.father_profession || 'Non renseignée'}</p>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Adresse
                </label>
                <p className="text-base mt-1">{selectedChild.father_address || selectedChild.address || 'Non renseignée'}</p>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Téléphone
                </label>
                <p className="text-base mt-1">{selectedChild.father_phone || selectedChild.parent_phone || 'Non renseigné'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Informations de la mère */}
          <Card>
            <CardHeader>
              <CardTitle className="text-orange-600">Informations de la mère</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nom complet</label>
                <p className="text-base mt-1">
                  {selectedChild.mother_first_name 
                    ? `${selectedChild.mother_first_name || ''} ${selectedChild.mother_last_name || ''}`
                    : 'Non renseigné'}
                </p>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Statut de vie</label>
                <p className="text-base mt-1">
                  {selectedChild.mother_status === 'alive' ? '✅ En vie' : 
                   selectedChild.mother_status === 'deceased' ? '⚫ Décédée' : 'Non renseigné'}
                </p>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Profession / Fonction</label>
                <p className="text-base mt-1">{selectedChild.mother_profession || 'Non renseignée'}</p>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Adresse
                </label>
                <p className="text-base mt-1">{selectedChild.mother_address || 'Non renseignée'}</p>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Téléphone
                </label>
                <p className="text-base mt-1">{selectedChild.mother_phone || 'Non renseigné'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Documents de l'élève */}
        <Card>
          <CardHeader>
            <CardTitle className="text-orange-600">Documents de l'élève</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Aucun document disponible pour le moment.</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}