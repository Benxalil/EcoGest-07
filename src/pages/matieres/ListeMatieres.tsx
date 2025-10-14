
import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
import { useUserRole } from "@/hooks/useUserRole";
import { formatClassName } from "@/utils/classNameFormatter";

// Helper function to define academic order
const getClassOrder = (name: string, section: string): number => {
  // Ordre des niveaux académiques
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
  
  // Extraire le libellé (dernière lettre de section)
  const labelMatch = section?.match(/[A-Z]$/);
  const label = labelMatch ? labelMatch[0] : '';
  
  // Ordre des libellés (A=1, B=2, etc.)
  const labelOrder: { [key: string]: number } = {
    'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 
    'F': 6, 'G': 7, 'H': 8, 'I': 9, 'J': 10
  };
  
  const levelNum = levelOrder[name] || 999;
  const labelNum = labelOrder[label] || 0;
  
  // Formule : niveau * 100 + libellé
  // Exemple : CM1 A = 501, CM1 B = 502, CM2 A = 601
  return levelNum * 100 + labelNum;
};

// Fonction pour trier les classes dans l'ordre académique
const sortClassesAcademically = (classes: any[]): any[] => {
  return classes.sort((a, b) => {
    const orderA = getClassOrder(a.name, a.section || '');
    const orderB = getClassOrder(b.name, b.section || '');
    return orderA - orderB;
  });
};

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
  const { userProfile } = useUserRole();
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [newMatiere, setNewMatiere] = useState({ nom: "", abreviation: "", moyenne: "", coefficient: "", classeId: "" });
  const [editingMatiere, setEditingMatiere] = useState<Matiere | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const [studentClassId, setStudentClassId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Récupérer toutes les matières depuis la base de données
  const { subjects, loading: subjectsLoading, createSubject, updateSubject, deleteSubject } = useSubjects();

  // Récupérer la classe de l'élève si c'est un élève
  useEffect(() => {
    const loadStudentClass = async () => {
      if (userProfile?.role === 'student' && userProfile?.id && userProfile?.schoolId) {
        try {
          const { data: student, error } = await supabase
            .from('students')
            .select('class_id')
            .eq('user_id', userProfile.id)
            .eq('school_id', userProfile.schoolId)
            .single();

          if (!error && student) {
            setStudentClassId(student.class_id);
          }
        } catch (err) {
          console.error("Erreur lors du chargement de la classe de l'élève:", err);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadStudentClass();
  }, [userProfile]);

  useEffect(() => {
    // Convertir les subjects de la base vers le format local
    if (subjects.length > 0) {
      let filteredSubjects = subjects;
      
      // Si c'est un élève, filtrer uniquement les matières de sa classe
      if (userProfile?.role === 'student' && studentClassId) {
        filteredSubjects = subjects.filter(subject => subject.class_id === studentClassId);
      }
      
      const matieresFromDB = filteredSubjects.map(subject => ({
        id: parseInt(subject.id.replace(/\D/g, '')) || Date.now(),
        nom: subject.name,
        abreviation: subject.abbreviation || '',
        moyenne: (subject.hours_per_week || 20).toString(),
        coefficient: (subject.coefficient || 1).toString(),
        classeId: subject.class_id
      }));
      setMatieres(matieresFromDB);
    }
  }, [subjects, studentClassId, userProfile]);

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

  const getClasseLabel = (classe: any) => {
    return formatClassName(classe);
  };

  if (classesLoading || subjectsLoading || loading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold">Gestion des Matières par Classe</h1>
            </div>
          </div>

          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground text-lg">Chargement des matières...</p>
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
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold">Gestion des Matières par Classe</h1>
            </div>
          </div>

          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-4">Aucune classe n'a été créée</p>
            <p className="text-muted-foreground/70 mb-6">Commencez par créer des classes pour gérer les matières</p>
            <Button onClick={() => navigate("/classes/ajouter")}>
              Créer une classe
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // Filtrer les classes pour les élèves
  const displayedClasses = userProfile?.role === 'student' && studentClassId
    ? classes.filter(c => c.id === studentClassId)
    : classes;

  // Trier les classes dans l'ordre académique
  const sortedClasses = sortClassesAcademically(displayedClasses);

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">
              {userProfile?.role === 'student' ? 'Mes Matières' : 'Gestion des Matières par Classe'}
            </h1>
          </div>
        </div>

        <div className="space-y-4">
          {sortedClasses.map((classe) => {
            const matieresClasse = getMatieresForClasse(classe.id);
            const isExpanded = expandedClasses.has(classe.id);
            
            return (
              <Collapsible key={classe.id} open={isExpanded} onOpenChange={() => toggleClasseExpansion(classe.id)}>
                <div className="border rounded-lg bg-card shadow">
                  <div className="flex items-center justify-between p-4">
                    <CollapsibleTrigger className="flex-1">
                      <div className="flex items-center gap-3 hover:bg-accent p-2 rounded">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div className="text-left">
                          <h3 className="text-lg font-semibold text-primary">
                            {getClasseLabel(classe)}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {matieresClasse.length} matière{matieresClasse.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                      
                          {userProfile?.role !== 'student' && (
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
                          )}
                    </div>
                  
                  <CollapsibleContent>
                    <div className="border-t bg-muted/30">
                      {matieresClasse.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground">
                          Aucune matière enregistrée pour cette classe
                        </div>
                      ) : (
                        <div className="p-4">
                          <div className="grid gap-3">
                            {matieresClasse.map((matiere) => (
                              <div key={matiere.id} className="flex items-center justify-between p-3 bg-card border rounded-lg">
                                <div>
                                  <h4 className="font-medium">
                                    {matiere.nom}
                                    {matiere.abreviation && (
                                      <span className="text-muted-foreground ml-2">({matiere.abreviation})</span>
                                    )}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">Moyenne: {matiere.moyenne} | Coefficient: {matiere.coefficient}</p>
                                </div>
                                {userProfile?.role !== 'student' && (
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
                                )}
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
