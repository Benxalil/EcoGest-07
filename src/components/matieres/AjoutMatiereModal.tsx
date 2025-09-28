import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNotifications } from "@/hooks/useNotifications";
import { generateUUID } from "@/utils/uuid";

interface Classe {
  id: string;
  session: string;
  libelle: string;
  effectif?: number;
}

interface Matiere {
  id: string;
  nom: string;
  abreviation?: string;
  moyenne: string;
  coefficient: string;
  classeId: string;
}

interface AjoutMatiereModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AjoutMatiereModal({ open, onOpenChange, onSuccess }: AjoutMatiereModalProps) {
  const { showSuccess, showError } = useNotifications();
  const [classes, setClasses] = useState<Classe[]>([]);
  const [newMatiere, setNewMatiere] = useState({ 
    nom: "", 
    abreviation: "", 
    moyenne: "", 
    coefficient: "", 
    classeId: "" 
  });

  useEffect(() => {
    // Charger les classes depuis le localStorage
    const savedClasses = localStorage.getItem('classes');
    if (savedClasses) {
      const classesData = JSON.parse(savedClasses);
      setClasses(classesData);
    }
  }, []);

  const handleAddMatiere = () => {
    if (newMatiere.nom && newMatiere.moyenne && newMatiere.coefficient && newMatiere.classeId) {
      const nouvelleMatiere: Matiere = {
        id: generateUUID(),
        nom: newMatiere.nom,
        abreviation: newMatiere.abreviation || undefined,
        moyenne: newMatiere.moyenne,
        coefficient: newMatiere.coefficient,
        classeId: newMatiere.classeId
      };
      
      // Récupérer les matières existantes
      const savedMatieres = localStorage.getItem('matieres');
      const matieres = savedMatieres ? JSON.parse(savedMatieres) : [];
      
      // Ajouter la nouvelle matière
      const newMatieres = [...matieres, nouvelleMatiere];
      localStorage.setItem('matieres', JSON.stringify(newMatieres));
      
      showSuccess({
        title: "Matière ajoutée avec succès",
        description: `La matière "${newMatiere.nom}" a été ajoutée.`,
      });
      
      // Réinitialiser le formulaire
      setNewMatiere({ nom: "", abreviation: "", moyenne: "", coefficient: "", classeId: "" });
      
      // Fermer le modal
      onOpenChange(false);
      
      // Appeler onSuccess si fourni
      if (onSuccess) {
        onSuccess();
      } } else {
      showError({
        title: "Champs manquants",
        description: "Veuillez remplir tous les champs obligatoires.",
      });
    }
  };

  const getClasseLabel = (classe: Classe) => {
    return `${classe.session} ${classe.libelle}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajouter une matière</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="classe">Classe</Label>
            <Select value={newMatiere.classeId} onValueChange={(value) => setNewMatiere({ ...newMatiere, classeId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une classe" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((classe) => (
                  <SelectItem key={classe.id} value={classe.id}>
                    {getClasseLabel(classe)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
            <Label htmlFor="moyenne">Moyenne de la matière</Label>
            <Input
              id="moyenne"
              value={newMatiere.moyenne}
              onChange={(e) => setNewMatiere({ ...newMatiere, moyenne: e.target.value })}
              placeholder="Ex: /20, /10, /5"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="coefficient">Coefficient de la matière</Label>
            <Input
              id="coefficient"
              type="number"
              min="1"
              value={newMatiere.coefficient}
              onChange={(e) => setNewMatiere({ ...newMatiere, coefficient: e.target.value })}
              placeholder="Ex: 2, 3, 4"
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Annuler
            </Button>
            <Button onClick={handleAddMatiere} className="flex-1">
              Enregistrer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}