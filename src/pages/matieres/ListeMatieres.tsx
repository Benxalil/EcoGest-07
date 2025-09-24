
import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useClasses } from "@/hooks/useClasses";
import { useSubjects } from "@/hooks/useSubjects";

interface Matiere {
  id: number;
  nom: string;
  abreviation?: string;
  moyenne: string;
  coefficient: string;
  classeId: string;
}

export default function ListeMatieres() {
  const { classes, loading: classesLoading } = useClasses();
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [newMatiere, setNewMatiere] = useState({ nom: "", abreviation: "", moyenne: "", coefficient: "", classeId: "" });
  const [editingMatiere, setEditingMatiere] = useState<Matiere | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  // Récupérer toutes les matières depuis la base de données
  const { subjects, loading: subjectsLoading, createSubject, updateSubject, deleteSubject } = useSubjects();

  useEffect(() => {
    // Convertir les subjects de la base vers le format local
    if (subjects.length > 0) {
      const matieresFromDB = subjects.map(subject => ({
        id: parseInt(subject.id.replace(/\D/g, '')) || Date.now(), // Convertir UUID en nombre
        nom: subject.name,
        abreviation: subject.abbreviation || '',
        moyenne: (subject.hours_per_week || 20).toString(), // Utiliser hours_per_week comme note maximale
        coefficient: (subject.coefficient || 1).toString(),
        classeId: subject.class_id
      }));
      setMatieres(matieresFromDB);
    }
  }, [subjects]);

  const handleAddMatiere = async () => {
    if (newMatiere.nom && newMatiere.classeId && newMatiere.moyenne && newMatiere.coefficient) {
      const success = await createSubject({
        name: newMatiere.nom,
        abbreviation: newMatiere.abreviation || '',
        class_id: newMatiere.classeId,
        coefficient: parseFloat(newMatiere.coefficient) || 1,
        hours_per_week: parseInt(newMatiere.moyenne) || 20 // Utiliser hours_per_week pour stocker la note maximale
      });
      
      if (success) {
        setNewMatiere({ nom: "", abreviation: "", moyenne: "", coefficient: "", classeId: "" });
        setDialogOpen(false);
      }
    } else {
      toast.error("Veuillez remplir tous les champs obligatoires");
    }
  };

  const handleEditMatiere = (matiere: Matiere) => {
    setEditingMatiere(matiere);
    setEditDialogOpen(true);
  };

  const handleUpdateMatiere = async () => {
    if (editingMatiere && editingMatiere.nom && editingMatiere.moyenne && editingMatiere.coefficient) {
      // Trouver le subject correspondant
      const subject = subjects.find(s => s.class_id === editingMatiere.classeId && s.name === editingMatiere.nom);
      if (subject) {
        const success = await updateSubject(subject.id, {
          name: editingMatiere.nom,
          abbreviation: editingMatiere.abreviation || '',
          class_id: editingMatiere.classeId,
          coefficient: parseFloat(editingMatiere.coefficient) || 1,
          hours_per_week: parseInt(editingMatiere.moyenne) || 20 // Utiliser hours_per_week pour stocker la note maximale
        });
        
        if (success) {
          setEditingMatiere(null);
          setEditDialogOpen(false);
        }
      }
    } else {
      toast.error("Veuillez remplir tous les champs obligatoires");
    }
  };

  const handleDeleteMatiere = async (id: number) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette matière ?")) {
      // Trouver le subject correspondant
      const matiere = matieres.find(m => m.id === id);
      if (matiere) {
        const subject = subjects.find(s => s.class_id === matiere.classeId && s.name === matiere.nom);
        if (subject) {
          const success = await deleteSubject(subject.id);
          if (success) {
            toast.success("Matière supprimée avec succès");
          }
        }
      }
    }
  };

  const toggleClasseExpansion = (classeId: string) => {
    const newExpanded = new Set(expandedClasses);
    if (newExpanded.has(classeId)) {
      newExpanded.delete(classeId); } else {
      newExpanded.add(classeId);
    }
    setExpandedClasses(newExpanded);
  };

  const getMatieresForClasse = (classeId: string) => {
    return matieres.filter(matiere => matiere.classeId === classeId);
  };

  const getClasseLabel = (classe: Classe) => {
    return `${classe.name} ${classe.level}${classe.section ? ` - ${classe.section}` : ''}`;
  };

  if (classesLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <div className="text-center">
            <p className="text-gray-500 text-lg">Chargement des classes...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (classesLoading || subjectsLoading) {
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
              <h1 className="text-2xl font-bold">Gestion des Matières par Classe</h1>
            </div>
          </div>

          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-500 text-lg">Chargement des matières...</p>
          </div>
        </div>
      </Layout>
    );
  }

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
              <h1 className="text-2xl font-bold">Gestion des Matières par Classe</h1>
            </div>
          </div>

          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">Aucune classe n'a été créée</p>
            <p className="text-gray-400 mb-6">Commencez par créer des classes pour gérer les matières</p>
            <Button onClick={() => navigate("/classes/ajouter")}>
              Créer une classe
            </Button>
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
            <h1 className="text-2xl font-bold">Gestion des Matières par Classe</h1>
          </div>
        </div>

        <div className="space-y-4">
          {classes.map((classe) => {
            const matieresClasse = getMatieresForClasse(classe.id);
            const isExpanded = expandedClasses.has(classe.id);
            
            return (
              <Collapsible key={classe.id} open={isExpanded} onOpenChange={() => toggleClasseExpansion(classe.id)}>
                <div className="border rounded-lg bg-white shadow">
                  <div className="flex items-center justify-between p-4">
                    <CollapsibleTrigger className="flex-1">
                      <div className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-600" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-600" />
                        )}
                        <div className="text-left">
                          <h3 className="text-lg font-semibold text-blue-600">
                            {getClasseLabel(classe)}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {matieresClasse.length} matière{matieresClasse.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewMatiere({ ...newMatiere, classeId: classe.id });
                        setDialogOpen(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter une Matière
                    </Button>
                  </div>
                  
                  <CollapsibleContent>
                    <div className="border-t bg-gray-50">
                      {matieresClasse.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">
                          Aucune matière enregistrée pour cette classe
                        </div>
                      ) : (
                        <div className="p-4">
                          <div className="grid gap-3">
                            {matieresClasse.map((matiere) => (
                              <div key={matiere.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                                <div>
                                  <h4 className="font-medium">
                                    {matiere.nom}
                                    {matiere.abreviation && (
                                      <span className="text-gray-500 ml-2">({matiere.abreviation})</span>
                                    )}
                                  </h4>
                                  <p className="text-sm text-gray-500">Moyenne: {matiere.moyenne} | Coefficient: {matiere.coefficient}</p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleEditMatiere(matiere)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleDeleteMatiere(matiere.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>

        {/* Dialog pour modifier une matière */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Modifier la matière</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-nom">Nom de la matière</Label>
                <Input
                  id="edit-nom"
                  value={editingMatiere?.nom || ""}
                  onChange={(e) => setEditingMatiere(prev => 
                    prev ? { ...prev, nom: e.target.value } : null
                  )}
                  placeholder="Ex: Mathématiques"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-abreviation">Abréviation (optionnel)</Label>
                <Input
                  id="edit-abreviation"
                  value={editingMatiere?.abreviation || ""}
                  onChange={(e) => setEditingMatiere(prev => 
                    prev ? { ...prev, abreviation: e.target.value } : null
                  )}
                  placeholder="Ex: Math"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-moyenne">Moyenne de la matière *</Label>
                <Input
                  id="edit-moyenne"
                  value={editingMatiere?.moyenne || ""}
                  onChange={(e) => setEditingMatiere(prev => 
                    prev ? { ...prev, moyenne: e.target.value } : null
                  )}
                  placeholder="Ex: 20, 10, 5"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-coefficient">Coefficient de la matière *</Label>
                <Input
                  id="edit-coefficient"
                  type="number"
                  min="1"
                  value={editingMatiere?.coefficient || ""}
                  onChange={(e) => setEditingMatiere(prev => 
                    prev ? { ...prev, coefficient: e.target.value } : null
                  )}
                  placeholder="Ex: 2, 3, 4"
                  required
                />
              </div>
              <Button onClick={handleUpdateMatiere} className="mt-4">
                Modifier
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog pour ajouter une matière */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Ajouter une matière à {newMatiere.classeId ? getClasseLabel(classes.find(c => c.id === newMatiere.classeId)!) : 'la classe'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nom">Nom de la matière</Label>
                <Input
                  id="nom"
                  value={newMatiere.nom}
                  onChange={(e) => setNewMatiere({ ...newMatiere, nom: e.target.value })}
                  placeholder="Ex: Mathématiques"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="abreviation">Abréviation (optionnel)</Label>
                <Input
                  id="abreviation"
                  value={newMatiere.abreviation}
                  onChange={(e) => setNewMatiere({ ...newMatiere, abreviation: e.target.value })}
                  placeholder="Ex: Math"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="moyenne">Moyenne de la matière *</Label>
                <Input
                  id="moyenne"
                  value={newMatiere.moyenne}
                  onChange={(e) => setNewMatiere({ ...newMatiere, moyenne: e.target.value })}
                  placeholder="Ex: 20, 10, 5"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="coefficient">Coefficient de la matière *</Label>
                <Input
                  id="coefficient"
                  type="number"
                  min="1"
                  value={newMatiere.coefficient}
                  onChange={(e) => setNewMatiere({ ...newMatiere, coefficient: e.target.value })}
                  placeholder="Ex: 2, 3, 4"
                  required
                />
              </div>
              <Button onClick={handleAddMatiere} className="mt-4">
                Enregistrer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
