import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import { useAnnouncements } from "@/hooks/useAnnouncements";

interface AnnonceData {
  id: string;
  titre: string;
  contenu: string;
  dateExpiration: Date;
  destinataires: string[];
  priorite: 'normal' | 'urgent';
  dateCreation: Date;
}

interface ModifierAnnonceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  annonce: AnnonceData | null;
  onAnnouncementUpdated?: () => void;
}

const destinatairesOptions = [
  { id: "tous", label: "Tous" },
  { id: "parents", label: "Parents" },
  { id: "eleves", label: "Élèves" },
  { id: "professeurs", label: "Professeurs" },
  { id: "administration", label: "Administration" },
];

export function ModifierAnnonceModal({ open, onOpenChange, annonce, onAnnouncementUpdated }: ModifierAnnonceModalProps) {
  const { showSuccess, showError } = useNotifications();
  const { updateAnnouncement } = useAnnouncements();
  const [titre, setTitre] = useState("");
  const [contenu, setContenu] = useState("");
  const [dateExpiration, setDateExpiration] = useState<Date | undefined>(undefined);
  const [destinataires, setDestinataires] = useState<string[]>([]);
  const [priorite, setPriorite] = useState<'normal' | 'urgent'>('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Charger les données de l'annonce quand elle change
  useEffect(() => {
    if (annonce) {
      setTitre(annonce.titre);
      setContenu(annonce.contenu);
      setDateExpiration(annonce.dateExpiration);
      setDestinataires(annonce.destinataires);
      setPriorite(annonce.priorite);
    }
  }, [annonce]);

  const handleDestinatairesChange = (destinataire: string, checked: boolean) => {
    setDestinataires(prev => 
      checked 
        ? [...prev, destinataire]
        : prev.filter(d => d !== destinataire)
    );
  };

  const resetForm = () => {
    setTitre("");
    setContenu("");
    setDateExpiration(undefined);
    setDestinataires([]);
    setPriorite('normal');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!titre || !contenu || !dateExpiration || destinataires.length === 0 || !annonce) {
      showError({
        title: "Champs manquants",
        description: "Veuillez remplir tous les champs obligatoires",
      });
      return;
    }

    if (contenu.length < 10) {
      showError({
        title: "Contenu trop court",
        description: "Le contenu doit contenir au moins 10 caractères",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Mettre à jour l'annonce dans la base de données
      const success = await updateAnnouncement(annonce.id, {
        title: titre,
        content: contenu,
        priority: priorite,
        target_audience: destinataires
      });

      if (success) {
        showSuccess({
          title: "Annonce modifiée avec succès",
          description: `L'annonce "${titre}" a été mise à jour`,
        });
        onOpenChange(false);
        onAnnouncementUpdated?.();
      }
    } catch (error) {
      showError({
        title: "Erreur lors de la modification",
        description: "Une erreur est survenue lors de la modification de l'annonce",
      });
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier l'annonce</DialogTitle>
          <DialogDescription>
            Modifiez les informations de cette annonce.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="titre">Titre de l'annonce *</Label>
            <Input 
              id="titre"
              placeholder="Ex: Réunion parents-professeurs" 
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contenu">Contenu de l'annonce *</Label>
            <Textarea 
              id="contenu"
              placeholder="Décrivez les détails de votre annonce..."
              className="min-h-[120px] resize-none"
              value={contenu}
              onChange={(e) => setContenu(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Date d'expiration *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full pl-3 text-left font-normal",
                    !dateExpiration && "text-muted-foreground"
                  )}
                >
                  {dateExpiration ? (
                    format(dateExpiration, "PPP", { locale: fr })
                  ) : (
                    <span>Sélectionner une date</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateExpiration}
                  onSelect={setDateExpiration}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Priorité *</Label>
            <Select value={priorite} onValueChange={(value: 'normal' | 'urgent') => setPriorite(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez une priorité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="mb-4">
              <Label className="text-base">Destinataires *</Label>
              <p className="text-sm text-muted-foreground">
                Sélectionnez qui peut voir cette annonce
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {destinatairesOptions.map((item) => (
                <div key={item.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={item.id}
                    checked={destinataires.includes(item.label)}
                    onCheckedChange={(checked) => 
                      handleDestinatairesChange(item.label, checked as boolean)
                    }
                  />
                  <Label 
                    htmlFor={item.id} 
                    className="text-sm font-normal cursor-pointer"
                  >
                    {item.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="min-w-[120px]"
            >
              {isSubmitting ? "Modification..." : "Modifier l'annonce"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}