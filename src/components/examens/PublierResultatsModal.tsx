import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Examen {
  id: string;
  titre: string;
  type: string;
  semestre: string;
  dateExamen: string;
  classes: string[];
  isPublished?: boolean;
}

interface PublierResultatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  examen: Examen | null;
  onUpdate: () => void;
}

export const PublierResultatsModal = ({ 
  isOpen, 
  onClose, 
  examen, 
  onUpdate 
}: PublierResultatsModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleTogglePublish = async () => {
    if (!examen) return;
    
    setIsLoading(true);
    
    try {
      // Récupérer tous les examens
      // Remplacé par hook Supabase
      // const savedExamens = // localStorage.getItem("examens") // Remplacé par hook Supabase;
      if (savedExamens) {
        const examens: Examen[] = JSON.parse(savedExamens);
        const updatedExamens = examens.map(e => 
          e.id === examen.id 
            ? { ...e, isPublished: !examen.isPublished }
            : e
        );
        
        // Sauvegarder les examens mis à jour
        // localStorage.setItem("examens", JSON.stringify(updatedExamens); // Remplacé par hook Supabase);
        
        // Déclencher l'événement de mise à jour
        window.dispatchEvent(new Event('examensUpdated'));
        
        toast({
          title: "Succès",
          description: examen.isPublished 
            ? "Les résultats ont été dépubliés. Les élèves et parents ne peuvent plus les voir."
            : "Les résultats ont été publiés. Les élèves et parents peuvent maintenant les voir.",
        });
        
        onUpdate();
        onClose();
      }
    } catch (error) {
      console.error('Erreur lors de la publication:', error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de la publication.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!examen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {examen.isPublished ? (
              <EyeOff className="h-5 w-5 text-red-600" />
            ) : (
              <Eye className="h-5 w-5 text-green-600" />
            )}
            {examen.isPublished ? "Dépublier" : "Publier"} les résultats
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">{examen.titre}</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div>Type: {examen.type}</div>
              <div>Semestre: {examen.semestre}</div>
              <div>Date: {new Date(examen.dateExamen).toLocaleDateString('fr-FR')}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Statut actuel:</span>
            <Badge variant={examen.isPublished ? "default" : "secondary"}>
              {examen.isPublished ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Publié
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  Non publié
                </>
              )}
            </Badge>
          </div>

          <div className="p-4 border-l-4 border-yellow-400 bg-yellow-50">
            <p className="text-sm text-yellow-800">
              {examen.isPublished ? (
                <>
                  <strong>Attention:</strong> Si vous dépubliez les résultats, les élèves et parents 
                  ne pourront plus voir les notes de cet examen jusqu'à ce que vous les republiiez.
                </>
              ) : (
                <>
                  <strong>Information:</strong> En publiant les résultats, vous autorisez les élèves 
                  et parents à consulter les notes de cet examen.
                </>
              )}
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button
              onClick={handleTogglePublish}
              disabled={isLoading}
              variant={examen.isPublished ? "destructive" : "default"}
              className="flex-1"
            >
              {isLoading ? "Traitement..." : (
                examen.isPublished ? "Dépublier" : "Publier"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};