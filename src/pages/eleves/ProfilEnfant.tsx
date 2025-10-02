import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/layout/Layout";
import { useParentChildren } from "@/hooks/useParentChildren";
import { ParentChildSelector } from "@/components/parent/ParentChildSelector";

export default function ProfilEnfant() {
  const { children, selectedChild, setSelectedChildId, loading } = useParentChildren();

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

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Profil de votre enfant</h1>
        </div>

        {/* Sélecteur d'enfant */}
        <ParentChildSelector 
          children={children}
          selectedChildId={selectedChild.id}
          onChildSelect={setSelectedChildId}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Informations personnelles
              <Badge variant={selectedChild.is_active ? "default" : "secondary"}>
                {selectedChild.is_active ? "Actif" : "Inactif"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Prénom</label>
                <p className="text-lg">{selectedChild.first_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nom</label>
                <p className="text-lg">{selectedChild.last_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Numéro d'élève</label>
                <p className="text-lg">{selectedChild.student_number}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date de naissance</label>
                <p className="text-lg">
                  {selectedChild.date_of_birth ? new Date(selectedChild.date_of_birth).toLocaleDateString('fr-FR') : 'Non renseignée'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Lieu de naissance</label>
                <p className="text-lg">{selectedChild.place_of_birth || 'Non renseigné'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Genre</label>
                <p className="text-lg">
                  {selectedChild.gender === 'M' ? 'Masculin' : selectedChild.gender === 'F' ? 'Féminin' : 'Non renseigné'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date d'inscription</label>
                <p className="text-lg">
                  {selectedChild.enrollment_date ? new Date(selectedChild.enrollment_date).toLocaleDateString('fr-FR') : 'Non renseignée'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Téléphone</label>
                <p className="text-lg">{selectedChild.phone || 'Non renseigné'}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Adresse</label>
              <p className="text-lg">{selectedChild.address || 'Non renseignée'}</p>
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
                <p className="text-lg">{selectedChild.parent_phone || 'Non renseigné'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email des parents</label>
                <p className="text-lg">{selectedChild.parent_email || 'Non renseigné'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Contact d'urgence</label>
                <p className="text-lg">{selectedChild.emergency_contact || 'Non renseigné'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}