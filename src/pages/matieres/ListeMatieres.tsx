import React, { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AjoutMatiereModal } from "@/components/matieres/AjoutMatiereModal";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useSubjects } from "@/hooks/useSubjects";
import { useOptimizedClasses } from "@/hooks/useOptimizedClasses";

interface ClassType {
  id: string;
  name: string;
  level: string;
  section?: string;
}

export default function ListeMatieres() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("all");

  const { subjects, loading: subjectsLoading, deleteSubject } = useSubjects();
  const { classes, loading: classesLoading } = useOptimizedClasses();

  // Filtrage des matières
  const matieresFiltrees = subjects.filter(matiere => {
    const matchesSearch = matiere.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         matiere.code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClass = selectedClass === "all" || matiere.class_id === selectedClass;
    
    return matchesSearch && matchesClass;
  });

  const handleDeleteSubject = async (subjectId: string, subjectName: string) => {
    const success = await deleteSubject(subjectId);
    if (success) {
      toast.success(`Matière ${subjectName} supprimée avec succès`);
    } else {
      toast.error("Erreur lors de la suppression de la matière");
    }
  };

  const getClassName = (classId: string) => {
    const classObj = classes.find(c => c.id === classId);
    if (!classObj) return "Classe inconnue";
    return `${classObj.name} ${classObj.level}${classObj.section ? ` - ${classObj.section}` : ''}`;
  };

  if (subjectsLoading || classesLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement des matières...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestion des Matières</h1>
            <p className="text-gray-600 mt-1">
              {subjects.length} matière{subjects.length > 1 ? 's' : ''} configurée{subjects.length > 1 ? 's' : ''}
            </p>
          </div>
          <AjoutMatiereModal 
            trigger={
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une matière
              </Button>
            }
          />
        </div>

        {/* Filtres */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Rechercher par nom ou code de matière..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-full sm:w-[250px]">
                  <SelectValue placeholder="Filtrer par classe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les classes</SelectItem>
                  {classes.map((classe: ClassType) => (
                    <SelectItem key={classe.id} value={classe.id}>
                      {classe.name} {classe.level}{classe.section ? ` - ${classe.section}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Matières</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{subjects.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Classes Concernées</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {new Set(subjects.map(s => s.class_id)).size}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Coefficient Moyen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {subjects.length > 0 ? 
                  (subjects.reduce((sum, s) => sum + (s.coefficient || 1), 0) / subjects.length).toFixed(1) : 
                  '0'
                }
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Heures Totales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {subjects.reduce((sum, s) => sum + (s.hours_per_week || 0), 0)}h
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Liste des matières */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des Matières</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matière</TableHead>
                    <TableHead>Classe</TableHead>
                    <TableHead>Coefficient</TableHead>
                    <TableHead>Heures/semaine</TableHead>
                    <TableHead>Couleur</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matieresFiltrees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        {searchTerm || selectedClass !== "all" ? 
                          "Aucune matière trouvée pour ces critères" : 
                          "Aucune matière configurée"
                        }
                      </TableCell>
                    </TableRow>
                  ) : (
                    matieresFiltrees.map((matiere) => (
                      <TableRow key={matiere.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-semibold">{matiere.name}</div>
                            {matiere.code && (
                              <div className="text-sm text-gray-500">Code: {matiere.code}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getClassName(matiere.class_id)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {matiere.coefficient || 1}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {matiere.hours_per_week || 0}h
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-4 h-4 rounded-full border border-gray-300"
                              style={{ backgroundColor: matiere.color || '#3B82F6' }}
                            />
                            <span className="text-sm text-gray-600">
                              {matiere.color || '#3B82F6'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm">
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
                                    Êtes-vous sûr de vouloir supprimer la matière {matiere.name} ? Cette action supprimera également toutes les notes associées.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteSubject(matiere.id, matiere.name)}
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