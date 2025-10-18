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
                  <Calendar className="h-4 w-4" />
                  Date d'inscription
                </label>
                <p className="text-base mt-1">
                  {selectedChild.enrollment_date ? new Date(selectedChild.enrollment_date).toLocaleDateString('fr-FR') : 'Non renseignée'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Informations médicales */}
          {selectedChild.has_medical_condition && (
            <Card className="border-red-200 bg-red-50/30">
              <CardHeader className="bg-red-100/50 border-b border-red-200">
                <CardTitle className="text-red-700 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Informations médicales
                  <Badge variant="destructive" className="ml-2">Confidentiel</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type de maladie</label>
                  <p className="text-base mt-1 font-semibold text-red-700">
                    {selectedChild.medical_condition_type || 'Non renseigné'}
                  </p>
                </div>
                
                {selectedChild.medical_condition_description && (
                  <>
                    <Separator className="bg-red-200" />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Description</label>
                      <p className="text-base mt-1 whitespace-pre-wrap">
                        {selectedChild.medical_condition_description}
                      </p>
                    </div>
                  </>
                )}
                
                {(selectedChild.doctor_name || selectedChild.doctor_phone) && (
                  <>
                    <Separator className="bg-red-200" />
                    <div className="bg-white rounded-md p-3 border border-red-200">
                      <label className="text-sm font-medium text-muted-foreground block mb-2">
                        Médecin traitant
                      </label>
                      {selectedChild.doctor_name && (
                        <p className="text-base mb-1">
                          <span className="font-medium">Dr.</span> {selectedChild.doctor_name}
                        </p>
                      )}
                      {selectedChild.doctor_phone && (
                        <p className="text-base flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          {selectedChild.doctor_phone}
                        </p>
                      )}
                    </div>
                  </>
                )}
                
                <div className="bg-amber-50 border border-amber-300 rounded-md p-3 text-xs text-amber-800 mt-4">
                  <p className="flex items-start gap-2">
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>
                      Ces informations sont strictement confidentielles et protégées.
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {!selectedChild.has_medical_condition && (
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-600 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Santé
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Aucune condition médicale signalée pour cet élève.
                </p>
              </CardContent>
            </Card>
          )}

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