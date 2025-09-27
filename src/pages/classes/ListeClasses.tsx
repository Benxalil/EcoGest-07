import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, ArrowLeft, Edit, Trash2, FileText, GraduationCap, Users, BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AjoutClasseModal } from "@/components/classes/AjoutClasseModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import jsPDF from 'jspdf';
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";
import { useNotifications } from "@/hooks/useNotifications";
import { useClasses, ClassData } from "@/hooks/useClasses";
import { DashboardSkeleton } from "@/components/ui/dashboard-skeleton";

// Fonction pour définir l'ordre académique des classes
const getClassOrder = (level: string, section: string): number => {
  const levelOrder: { [key: string]: number } = {
    'CI': 1, 'CP': 2, 'CE1': 3, 'CE2': 4, 'CM1': 5, 'CM2': 6,
    '6ème': 7, 'Sixième': 7,
    '5ème': 8, 'Cinquième': 8,
    '4ème': 9, 'Quatrième': 9,
    '3ème': 10, 'Troisième': 10,
    '2nde': 11, 'Seconde': 11,
    '1ère': 12, 'Première': 12,
    'Terminale': 13, 'Tle': 13
  };
  
  const sectionOrder: { [key: string]: number } = {
    'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8, 'I': 9, 'J': 10
  };
  
  const levelNum = levelOrder[level] || 999;
  const sectionNum = sectionOrder[section] || 999;
  
  return levelNum * 100 + sectionNum;
};

// Fonction pour trier les classes dans l'ordre académique
const sortClassesAcademically = (classes: ClassData[]): ClassData[] => {
  return classes.sort((a, b) => {
    const orderA = getClassOrder(a.level, a.section || '');
    const orderB = getClassOrder(b.level, b.section || '');
    return orderA - orderB;
  });
};

export default function ListeClasses() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { isFeatureLimited, getFeatureLimit, currentPlan } = useSubscriptionPlan();
  const { showError } = useNotifications();
  const { classes, loading, error, deleteClass, refreshClasses } = useClasses();

  const handleAddSuccess = () => {
    setIsAddDialogOpen(false);
    refreshClasses();
  };

  const handleOpenAddDialog = () => {
    const currentClassCount = classes.length;
    
    if (isFeatureLimited('classes', currentClassCount)) {
      const limit = getFeatureLimit('classes');
      const planName = currentPlan.includes('starter') ? 'Starter' : 
                      currentPlan.includes('pro') ? 'Pro' : 'Premium';
      
      showError({
        title: "Limite d'abonnement atteinte",
        description: `Vous avez atteint la limite de votre forfait ${planName} (${limit} classes). Pour continuer, veuillez souscrire à un plan supérieur.`,
      });
      return;
    }
    
    setIsAddDialogOpen(true);
  };

  // Trier les classes dans l'ordre académique
  const sortedClasses = sortClassesAcademically(classes);

  // Calculer les statistiques
  const totalClasses = classes.length;
  const classesActives = classes.length; // Toutes les classes sont considérées comme actives
  const totalEtudiants = classes.reduce((total, classe) => total + (classe.enrollment_count || 0), 0);

  const handleEditClass = (classe: ClassData) => {
    navigate(`/classes/modifier?id=${classe.id}`);
  };

  const handleDeleteClass = async (classe: ClassData) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la classe ${classe.name} ${classe.level} ?`)) {
      const success = await deleteClass(classe.id);
      if (success) {
        toast.success(`Classe ${classe.name} ${classe.level} supprimée avec succès`);
      }
    }
  };

  const handleDownloadPDF = (classe: ClassData) => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text(`Liste de la classe ${classe.name} ${classe.level}`, 20, 30);
    doc.setFontSize(12);
    doc.text(`Classe: ${classe.name}`, 20, 50);
    doc.text(`Niveau: ${classe.level}`, 20, 60);
    doc.text(`Section: ${classe.section || 'N/A'}`, 20, 70);
    doc.text(`Effectif: ${classe.enrollment_count || 0} élèves`, 20, 80);
    doc.text(`Date de génération: ${new Date().toLocaleDateString('fr-FR')}`, 20, 90);
    doc.line(20, 100, 190, 100);
    doc.setFontSize(14);
    doc.text('Informations de la classe:', 20, 120);
    
    doc.setFontSize(10);
    doc.text('(Fonctionnalité d\'élèves à implémenter)', 20, 140);
    
    doc.save(`liste_classe_${classe.name}_${classe.level}.pdf`);
    toast.success(`Liste PDF de la classe ${classe.name} ${classe.level} téléchargée`);
  };

  // Gestion des états de chargement et d'erreur
  if (loading) {
    return (
      <Layout>
        <DashboardSkeleton type="classes" />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <p className="text-red-500 text-lg mb-4">Erreur lors du chargement</p>
            <p className="text-gray-400 mb-6">{error}</p>
            <Button onClick={() => refreshClasses()}>
              Réessayer
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // Si aucune classe n'a été créée
  if (classes.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold">Liste des Classes</h1>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenAddDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter une Classe
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter une classe</DialogTitle>
                </DialogHeader>
                <AjoutClasseModal onSuccess={handleAddSuccess} />
              </DialogContent>
            </Dialog>
          </div>

          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">Aucune classe n'a été créée</p>
            <p className="text-gray-400 mb-6">Commencez par créer votre première classe</p>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenAddDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer une classe
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter une classe</DialogTitle>
                </DialogHeader>
                <AjoutClasseModal onSuccess={handleAddSuccess} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Liste des Classes</h1>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenAddDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter une Classe
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter une classe</DialogTitle>
              </DialogHeader>
              <AjoutClasseModal onSuccess={handleAddSuccess} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Cartes de statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Classes
              </CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{totalClasses}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Classes actives
              </CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{classesActives}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total des étudiants
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{totalEtudiants}</div>
            </CardContent>
          </Card>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/3 text-left">Classe</TableHead>
                <TableHead className="w-1/3 text-left">Effectif</TableHead>
                <TableHead className="w-1/3 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedClasses.map((classe) => (
                <TableRow key={classe.id}>
                  <TableCell className="font-medium">
                    {classe.name} {classe.level}
                    {classe.section && ` - ${classe.section}`}
                  </TableCell>
                  <TableCell>
                    {classe.enrollment_count || 0} élève{(classe.enrollment_count || 0) !== 1 ? "s" : ""}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClass(classe)}
                        className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        title="Modifier la classe"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClass(classe)}
                        className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-50"
                        title="Supprimer la classe"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownloadPDF(classe)}
                        className="h-8 w-8 text-green-600 hover:text-green-800 hover:bg-green-50"
                        title="Télécharger la liste des élèves en PDF"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}
