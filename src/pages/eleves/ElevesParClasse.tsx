import React, { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Search, Edit, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { AjoutEleveModal } from "@/components/eleves/AjoutEleveModal";
import { useOptimizedClasses } from "@/hooks/useOptimizedClasses";
import { useStudents } from "@/hooks/useStudents";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function ElevesParClasse() {
  const navigate = useNavigate();
  const { classeId } = useParams();
  const [searchTerm, setSearchTerm] = useState("");
  
  const { classes, loading: classesLoading } = useOptimizedClasses();
  const { students, loading: studentsLoading, deleteStudent } = useStudents();
  
  const classe = classes.find(c => c.id === classeId);
  const elevesClasse = students.filter(student => student.class_id === classeId);
  
  // Filtrage des élèves selon le terme de recherche
  const elevesFiltres = elevesClasse.filter(eleve => {
    const searchLower = searchTerm.toLowerCase();
    return (
      eleve.first_name?.toLowerCase().includes(searchLower) ||
      eleve.last_name?.toLowerCase().includes(searchLower) ||
      eleve.student_number?.toLowerCase().includes(searchLower)
    );
  });

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    try {
      await deleteStudent(studentId);
      toast.success(`Élève ${studentName} supprimé avec succès`);
    } catch (error) {
      toast.error("Erreur lors de la suppression de l'élève");
    }
  };

  if (classesLoading || studentsLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement des données...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!classe) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <div className="text-center">
            <p className="text-gray-600 text-lg mb-4">Classe non trouvée</p>
            <Button onClick={() => navigate("/classes")}>
              Retour aux classes
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const nomClasse = `${classe.name} ${classe.level}${classe.section ? ` - ${classe.section}` : ''}`;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/eleves")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Élèves - {nomClasse}
            </h1>
            <p className="text-gray-600 mt-1">
              {elevesClasse.length} élève{elevesClasse.length > 1 ? 's' : ''} inscrit{elevesClasse.length > 1 ? 's' : ''}
            </p>
          </div>
          <div className="ml-auto">
            <AjoutEleveModal open={false} onOpenChange={() => {}} />
          </div>
        </div>

        {/* Champ de recherche */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher un élève par prénom, nom ou matricule..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Statistiques de la classe */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Élèves</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{elevesClasse.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Garçons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {elevesClasse.filter(e => e.gender === 'M').length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Filles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-pink-600">
                {elevesClasse.filter(e => e.gender === 'F').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Liste des élèves */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des Élèves - {nomClasse}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Élève</TableHead>
                    <TableHead>Genre</TableHead>
                    <TableHead>Date de naissance</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {elevesFiltres.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        {searchTerm ? "Aucun élève trouvé pour cette recherche" : "Aucun élève dans cette classe"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    elevesFiltres.map((eleve) => (
                      <TableRow key={eleve.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-semibold">{eleve.first_name} {eleve.last_name}</div>
                            <div className="text-sm text-gray-500">Matricule: {eleve.student_number}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={eleve.gender === 'M' ? 'default' : 'secondary'}>
                            {eleve.gender === 'M' ? 'Garçon' : 'Fille'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {eleve.date_of_birth ? 
                            new Date(eleve.date_of_birth).toLocaleDateString('fr-FR') : 
                            <span className="text-gray-400">Non définie</span>
                          }
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{eleve.phone || eleve.parent_phone || <span className="text-gray-400">N/A</span>}</div>
                            {eleve.parent_email && (
                              <div className="text-gray-500">{eleve.parent_email}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/eleves/modifier/${eleve.id}`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Êtes-vous sûr de vouloir supprimer l'élève {eleve.first_name} {eleve.last_name} ? Cette action est irréversible.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteStudent(eleve.id, `${eleve.first_name} ${eleve.last_name}`)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}