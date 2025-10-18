import { useState } from "react";
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

interface CreerAnnonceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const destinatairesOptions = [
  { id: "tous", label: "Tous" },
  { id: "parents", label: "Parents" },
  { id: "eleves", label: "Élèves" },
  { id: "professeurs", label: "Professeurs" },
];

// Options spécifiques (sans "Tous")
const specificOptions = destinatairesOptions.filter(opt => opt.id !== "tous");

export function CreerAnnonceModal({ open, onOpenChange }: CreerAnnonceModalProps) {
  const { showSuccess, showError } = useNotifications();
  const { createAnnouncement } = useAnnouncements();
  const [titre, setTitre] = useState("");
  const [contenu, setContenu] = useState("");
  const [dateExpiration, setDateExpiration] = useState<Date | undefined>(undefined);
  const [destinataires, setDestinataires] = useState<string[]>([]);
  const [priorite, setPriorite] = useState<'normal' | 'urgent'>('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDestinatairesChange = (destinataire: string, checked: boolean) => {
    if (destinataire === "Tous") {
      // Si "Tous" est coché, cocher toutes les cases spécifiques
      if (checked) {
        setDestinataires(specificOptions.map(opt => opt.label));
      } else {
        // Si "Tous" est décoché, tout décocher
        setDestinataires([]);
      }
    } else {
      // Gestion d'une case spécifique
      setDestinataires(prev => {
        const newDestinataires = checked 
          ? [...prev, destinataire]
          : prev.filter(d => d !== destinataire);
        
        return newDestinataires;
      });
    }
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
    
    // Validation des champs
    if (!titre?.trim()) {
      showError({
        title: "Champs manquants",
        description: "Le titre est obligatoire",
      });
      return;
    }

    if (!contenu?.trim()) {
      showError({
        title: "Champs manquants",
        description: "Le contenu est obligatoire",
      });
      return;
    }

    if (contenu.trim().length < 10) {
      showError({
        title: "Contenu trop court",
        description: "Le contenu doit contenir au moins 10 caractères",
      });
      return;
    }

    if (!dateExpiration) {
      showError({
        title: "Champs manquants",
        description: "La date d'expiration est obligatoire",
      });
      return;
    }

    if (destinataires.length === 0) {
      showError({
        title: "Champs manquants",
        description: "Veuillez sélectionner au moins un destinataire",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Créer l'annonce dans la base de données (le hook gère les toasts)
      const success = await createAnnouncement({
        title: titre.trim(),
        content: contenu.trim(),
        is_published: true,
        priority: priorite,
        target_audience: destinataires,
        expires_at: dateExpiration
      });

      if (success) {
        resetForm();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Erreur inattendue lors de la création:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer une nouvelle annonce</DialogTitle>
          <DialogDescription>
            Rédigez une annonce qui sera visible par les groupes sélectionnés.
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
                    aria-label="Sélectionner la date d'expiration"
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
              {destinatairesOptions.map((item) => {
                const isChecked = item.id === "tous" 
                  ? specificOptions.every(opt => destinataires.includes(opt.label))
                  : destinataires.includes(item.label);
                
                return (
                  <div key={item.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={item.id}
                      checked={isChecked}
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
                );
              })}
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
              <Button 
                type="submit"
                title="Créer cette annonce"
                disabled={isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? "Création..." : "Créer l'annonce"}
              </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}