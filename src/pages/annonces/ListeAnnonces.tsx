import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Users, Clock, Loader2, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CreerAnnonceModal } from "@/components/annonces/CreerAnnonceModal";
import { ModifierAnnonceModal } from "@/components/annonces/ModifierAnnonceModal";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AnnonceData {
  id: string;
  titre: string;
  contenu: string;
  dateExpiration: Date;
  destinataires: string[];
  priorite: 'normal' | 'urgent';
  dateCreation: Date;
}

export default function ListeAnnonces() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAnnonce, setSelectedAnnonce] = useState<AnnonceData | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const { announcements, loading, createAnnouncement, updateAnnouncement, deleteAnnouncement } = useAnnouncements();

  const handleCreateAnnonce = async (annonceData: Omit<AnnonceData, 'id' | 'dateCreation'>) => {
    const success = await createAnnouncement({
      title: annonceData.titre,
      content: annonceData.contenu,
      is_published: true
    });

    if (success) {
      setIsModalOpen(false);
    }
  };

  const handleEditAnnonce = async (id: string, annonceData: Partial<AnnonceData>) => {
    const success = await updateAnnouncement(id, {
      title: annonceData.titre,
      content: annonceData.contenu,
      is_published: true
    });

    if (success) {
      setIsEditModalOpen(false);
      setSelectedAnnonce(null);
    }
  };

  const handleDeleteAnnonce = async (id: string) => {
    const success = await deleteAnnouncement(id);
    if (success) {
      setIsDeleteDialogOpen(false);
      setSelectedAnnonce(null);
    }
  };

  const openEditModal = (annonce: AnnonceData) => {
    setSelectedAnnonce(annonce);
    setIsEditModalOpen(true);
  };

  const openDeleteDialog = (annonce: AnnonceData) => {
    setSelectedAnnonce(annonce);
    setIsDeleteDialogOpen(true);
  };

  // Convertir les données Supabase vers le format attendu
  const convertedAnnonces: AnnonceData[] = announcements.map(announcement => ({
    id: announcement.id,
    titre: announcement.title,
    contenu: announcement.content,
    dateExpiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
    destinataires: announcement.target_audience || ['tous'],
    priorite: announcement.priority || 'normal',
    dateCreation: new Date(announcement.created_at)
  }));

  // Séparer en annonces à venir et passées (basé sur 7 jours)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

  const separateAnnouncements = (annonces: AnnonceData[]) => {
    const aVenir = annonces.filter(annonce => annonce.dateCreation >= sevenDaysAgo);
    const passees = annonces.filter(annonce => annonce.dateCreation < sevenDaysAgo);
    return { aVenir, passees };
  };

  const { aVenir: toutesAVenir, passees: toutesPassees } = separateAnnouncements(convertedAnnonces);
  const { aVenir: urgentesAVenir, passees: urgentesPassees } = separateAnnouncements(convertedAnnonces.filter(a => a.priorite === 'urgent'));
  const { aVenir: normalesAVenir, passees: normalesPassees } = separateAnnouncements(convertedAnnonces.filter(a => a.priorite === 'normal'));

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Chargement des annonces...</span>
          </div>
            </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Annonces</h1>
            <p className="text-gray-600 mt-2">Gérez les annonces de votre école</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Créer une annonce
          </Button>
        </div>

        <Tabs defaultValue="toutes" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="toutes">Toutes ({convertedAnnonces.length})</TabsTrigger>
            <TabsTrigger value="urgentes">Urgentes ({urgentesAVenir.length + urgentesPassees.length})</TabsTrigger>
            <TabsTrigger value="normales">Normales ({normalesAVenir.length + normalesPassees.length})</TabsTrigger>
            </TabsList>

          <TabsContent value="toutes" className="space-y-4">
            {convertedAnnonces.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune annonce</h3>
                  <p className="text-gray-500 text-center mb-4">
                    Commencez par créer votre première annonce pour informer votre communauté.
                  </p>
                  <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                      Créer une annonce
                    </Button>
                  </CardContent>
                </Card>
              ) : (
              <>
                {/* Annonces à venir/en cours */}
                {toutesAVenir.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-green-700 border-b pb-2">📍 À venir / En cours</h4>
                    <div className="grid gap-4">
                      {toutesAVenir.map((annonce) => (
                        <Card key={annonce.id} className="hover:shadow-md transition-shadow">
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <CardTitle className="text-lg">{annonce.titre}</CardTitle>
                                <CardDescription className="mt-2">
                                  {annonce.contenu}
                                </CardDescription>
                              </div>
                              <div className="flex items-center space-x-2 ml-4">
                                <Badge variant={annonce.priorite === 'urgent' ? 'destructive' : 'secondary'}>
                                  {annonce.priorite}
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between text-sm text-gray-500">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  {annonce.dateCreation.toLocaleDateString()}
                                </div>
                                <div className="flex items-center">
                                  <Users className="h-4 w-4 mr-1" />
                                  {annonce.destinataires.join(', ')}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditModal(annonce)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openDeleteDialog(annonce)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Annonces passées */}
                {toutesPassees.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-muted-foreground border-b pb-2">🗂️ Passées</h4>
                    <div className="grid gap-4">
                      {toutesPassees.map((annonce) => (
                        <Card key={annonce.id} className="hover:shadow-md transition-shadow opacity-60 bg-muted/20">
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <CardTitle className="text-lg text-muted-foreground">{annonce.titre}</CardTitle>
                                <CardDescription className="mt-2 text-muted-foreground">
                                  {annonce.contenu}
                                </CardDescription>
                              </div>
                              <div className="flex items-center space-x-2 ml-4">
                                <Badge variant="outline" className="opacity-60">
                                  {annonce.priorite}
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  {annonce.dateCreation.toLocaleDateString()}
                                </div>
                                <div className="flex items-center">
                                  <Users className="h-4 w-4 mr-1" />
                                  {annonce.destinataires.join(', ')}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditModal(annonce)}
                                  className="opacity-60"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openDeleteDialog(annonce)}
                                  className="text-red-600 hover:text-red-700 opacity-60"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="urgentes" className="space-y-4">
            {urgentesAVenir.length === 0 && urgentesPassees.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune annonce urgente</h3>
                  <p className="text-gray-500 text-center">
                    Aucune annonce urgente pour le moment.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Annonces urgentes à venir */}
                {urgentesAVenir.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-red-700 border-b pb-2">🚨 Urgentes - À venir / En cours</h4>
                    <div className="grid gap-4">
                      {urgentesAVenir.map((annonce) => (
                        <Card key={annonce.id} className="hover:shadow-md transition-shadow border-red-200">
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <CardTitle className="text-lg text-red-900">{annonce.titre}</CardTitle>
                                <CardDescription className="mt-2">
                                  {annonce.contenu}
                                </CardDescription>
                              </div>
                              <Badge variant="destructive">Urgent</Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between text-sm text-gray-500">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  {annonce.dateCreation.toLocaleDateString()}
                                </div>
                                <div className="flex items-center">
                                  <Users className="h-4 w-4 mr-1" />
                                  {annonce.destinataires.join(', ')}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditModal(annonce)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openDeleteDialog(annonce)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Annonces urgentes passées */}
                {urgentesPassees.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-muted-foreground border-b pb-2">🗂️ Urgentes - Passées</h4>
                    <div className="grid gap-4">
                      {urgentesPassees.map((annonce) => (
                        <Card key={annonce.id} className="hover:shadow-md transition-shadow opacity-60 bg-muted/20 border-red-200">
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <CardTitle className="text-lg text-muted-foreground">{annonce.titre}</CardTitle>
                                <CardDescription className="mt-2 text-muted-foreground">
                                  {annonce.contenu}
                                </CardDescription>
                              </div>
                              <Badge variant="outline" className="opacity-60">Urgent</Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  {annonce.dateCreation.toLocaleDateString()}
                                </div>
                                <div className="flex items-center">
                                  <Users className="h-4 w-4 mr-1" />
                                  {annonce.destinataires.join(', ')}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditModal(annonce)}
                                  className="opacity-60"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openDeleteDialog(annonce)}
                                  className="text-red-600 hover:text-red-700 opacity-60"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                        </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="normales" className="space-y-4">
            {normalesAVenir.length === 0 && normalesPassees.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune annonce normale</h3>
                  <p className="text-gray-500 text-center">
                    Aucune annonce normale pour le moment.
                    </p>
                  </CardContent>
                </Card>
              ) : (
              <>
                {/* Annonces normales à venir */}
                {normalesAVenir.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-blue-700 border-b pb-2">📢 Normales - À venir / En cours</h4>
                    <div className="grid gap-4">
                      {normalesAVenir.map((annonce) => (
                        <Card key={annonce.id} className="hover:shadow-md transition-shadow">
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <CardTitle className="text-lg">{annonce.titre}</CardTitle>
                                <CardDescription className="mt-2">
                                  {annonce.contenu}
                                </CardDescription>
                              </div>
                              <Badge variant="secondary">Normal</Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between text-sm text-gray-500">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  {annonce.dateCreation.toLocaleDateString()}
                                </div>
                                <div className="flex items-center">
                                  <Users className="h-4 w-4 mr-1" />
                                  {annonce.destinataires.join(', ')}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditModal(annonce)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openDeleteDialog(annonce)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Annonces normales passées */}
                {normalesPassees.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-muted-foreground border-b pb-2">🗂️ Normales - Passées</h4>
                    <div className="grid gap-4">
                      {normalesPassees.map((annonce) => (
                        <Card key={annonce.id} className="hover:shadow-md transition-shadow opacity-60 bg-muted/20">
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <CardTitle className="text-lg text-muted-foreground">{annonce.titre}</CardTitle>
                                <CardDescription className="mt-2 text-muted-foreground">
                                  {annonce.contenu}
                                </CardDescription>
                              </div>
                              <Badge variant="outline" className="opacity-60">Normal</Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  {annonce.dateCreation.toLocaleDateString()}
                                </div>
                                <div className="flex items-center">
                                  <Users className="h-4 w-4 mr-1" />
                                  {annonce.destinataires.join(', ')}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditModal(annonce)}
                                  className="opacity-60"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openDeleteDialog(annonce)}
                                  className="text-red-600 hover:text-red-700 opacity-60"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                        </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>
          </Tabs>
        
        {/* Modals */}
        <CreerAnnonceModal 
          open={isModalOpen} 
          onOpenChange={setIsModalOpen}
          onAnnouncementCreated={handleCreateAnnonce}
        />

        {selectedAnnonce && (
        <ModifierAnnonceModal
          open={isEditModalOpen}
            onOpenChange={(open) => {
              if (!open) {
                setIsEditModalOpen(false);
                setSelectedAnnonce(null);
              } else {
                setIsEditModalOpen(true);
              }
            }}
          annonce={selectedAnnonce}
            onAnnouncementUpdated={() => handleEditAnnonce(selectedAnnonce.id, selectedAnnonce)}
        />
        )}

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer l'annonce</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer cette annonce ? Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => selectedAnnonce && handleDeleteAnnonce(selectedAnnonce.id)}
                className="bg-red-600 hover:bg-red-700"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}