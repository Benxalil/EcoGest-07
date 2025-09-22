
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ArrowLeft, Save, UserCheck } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";

interface Eleve {
  id: string;
  nom: string;
  prenom: string;
  presence?: "present" | "absent" | "retard";
  heureArrivee?: string;
  commentaire?: string;
}

interface Classe {
  id: string;
  session: string;
  libelle: string;
}

interface AbsenceRetardData {
  date: Date;
  enseignant: string;
  matiere: string;
  heureDebut: string;
  heureFin: string;
  eleves: Eleve[];
}

interface AbsenceRetardFormData {
  heureArrivee: string;
  commentaire: string;
}

// Fonction pour récupérer la classe depuis le localStorage
const getClasseById = (classeId: string): Classe | null => {
  try {
    // Remplacé par hook Supabase
    if (savedClasses) {
      const classes = JSON.parse(savedClasses);
      const classe = classes.find((c: any) => c.id === classeId);
      return classe || null;
    }
    return null;
  } catch (error) {
    console.error("Erreur lors de la récupération de la classe:", error);
    return null;
  }
};

// Fonction pour récupérer les élèves d'une classe
const getElevesByClasse = (classeId: string): Eleve[] => {
  try {
    const classe = getClasseById(classeId);
    if (!classe) return [];

    const classeNom = `${classe.session} ${classe.libelle}`;
    
    // Remplacé par hook Supabase
    if (savedEleves) {
      const eleves = JSON.parse(savedEleves);
      return eleves
        .filter((eleve: any) => eleve.classe === classeNom)
        .map((eleve: any) => ({
          id: eleve.id,
          nom: eleve.nom,
          prenom: eleve.prenom,
          presence: "present" // Initialement, tous les élèves sont marqués présents
        }));
    }
    return [];
  } catch (error) {
    console.error("Erreur lors de la récupération des élèves:", error);
    return [];
  }
};

// Fonction pour récupérer les enseignants
const getEnseignants = (): string[] => {
  try {
    // Remplacé par hook Supabase
    if (savedEnseignants) {
      const enseignants = JSON.parse(savedEnseignants);
      return enseignants.map((ens: any) => `${ens.prenom} ${ens.nom}`);
    }
    return [];
  } catch (error) {
    console.error("Erreur lors de la récupération des enseignants:", error);
    return [];
  }
};

// Fonction pour sauvegarder les données d'absences et retards
const saveAbsenceRetardData = (classeId: string, data: AbsenceRetardData) => {
  try {
    const key = `absences_retards_${classeId}`;
    const savedData = localStorage.getItem(key);
    let absencesRetards = [];
    
    if (savedData) {
      absencesRetards = JSON.parse(savedData);
    }
    
    absencesRetards.push(data);
    // Remplacé par hooks Supabase);
    
    return true;
  } catch (error) {
    console.error("Erreur lors de l'enregistrement des données:", error);
    return false;
  }
};

export default function AbsenceRetardClasse() {
  const navigate = useNavigate();
  const { classeId } = useParams();
  const [searchParams] = useSearchParams();
  const [classe, setClasse] = useState<Classe | null>(null);
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [date, setDate] = useState<Date>(new Date());
  const [enseignant, setEnseignant] = useState<string>("");
  const [matiere, setMatiere] = useState<string>("");
  const [heureDebut, setHeureDebut] = useState<string>("08:00");
  const [heureFin, setHeureFin] = useState<string>("09:00");
  const [enseignants, setEnseignants] = useState<string[]>([]);
  const [selectedEleveId, setSelectedEleveId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const form = useForm<AbsenceRetardFormData>({
    defaultValues: {
      heureArrivee: "",
      commentaire: ""
    }
  });

  useEffect(() => {
    if (!classeId) return;
    
    const classeInfo = getClasseById(classeId);
    setClasse(classeInfo);
    
    const listeEleves = getElevesByClasse(classeId);
    setEleves(listeEleves);
    
    const listeEnseignants = getEnseignants();
    setEnseignants(listeEnseignants);

    // Pré-remplir les champs si des paramètres URL sont fournis
    const dayParam = searchParams.get('day');
    const subjectParam = searchParams.get('subject');
    const startTimeParam = searchParams.get('startTime');
    const endTimeParam = searchParams.get('endTime');

    if (dayParam && subjectParam && startTimeParam && endTimeParam) {
      // Définir la date selon le jour de la semaine
      const today = new Date();
      const currentDay = today.getDay(); // 0 = dimanche, 1 = lundi, etc.
      const dayMapping: { [key: string]: number } = {
        'LUNDI': 1,
        'MARDI': 2,
        'MERCREDI': 3,
        'JEUDI': 4,
        'VENDREDI': 5,
        'SAMEDI': 6
      };
      
      const targetDay = dayMapping[dayParam.toUpperCase()];
      if (targetDay !== undefined) {
        const daysUntilTarget = (targetDay - currentDay + 7) % 7;
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + (daysUntilTarget === 0 ? 0 : daysUntilTarget));
        setDate(targetDate);
      }

      setMatiere(subjectParam);
      setHeureDebut(startTimeParam);
      setHeureFin(endTimeParam);
    }
  }, [classeId, searchParams]);

  const handleBack = () => {
    navigate(-1);
  };

  const handlePresenceChange = (eleveId: string, status: "present" | "absent" | "retard") => {
    setEleves(prev => 
      prev.map(eleve => 
        eleve.id === eleveId 
          ? { ...eleve, presence: status }
          : eleve
      )
    );
  };

  const handleOpenRetardDialog = (eleveId: string) => {
    setSelectedEleveId(eleveId);
    form.reset({
      heureArrivee: "",
      commentaire: ""
    });
    setIsDialogOpen(true);
  };

  const handleRetardSubmit = (data: AbsenceRetardFormData) => {
    if (!selectedEleveId) return;
    
    setEleves(prev => 
      prev.map(eleve => 
        eleve.id === selectedEleveId 
          ? { 
              ...eleve, 
              presence: "retard", 
              heureArrivee: data.heureArrivee,
              commentaire: data.commentaire
            }
          : eleve
      )
    );
    
    setIsDialogOpen(false);
    toast.success("Informations sur le retard enregistrées");
  };

  const handleSaveAll = () => {
    if (!classeId || !classe) {
      toast.error("Informations de la classe non disponibles");
      console.error("Classe ID ou informations de classe manquantes");
      return;
    }
    
    if (!date) {
      toast.error("Veuillez sélectionner une date");
      console.error("Date manquante");
      return;
    }
    
    if (!enseignant) {
      toast.error("Veuillez sélectionner un enseignant");
      console.error("Enseignant manquant");
      return;
    }
    
    if (!matiere) {
      toast.error("Veuillez saisir la matière");
      console.error("Matière manquante");
      return;
    }

    console.log("Données à sauvegarder:", {
      date: date.toISOString(),
      enseignant,
      matiere,
      heureDebut,
      heureFin,
      eleves: eleves.length
    });
    
    const data: AbsenceRetardData = {
      date,
      enseignant,
      matiere,
      heureDebut,
      heureFin,
      eleves
    };
    
    try {
      const success = saveAbsenceRetardData(classeId, data);
      
      if (success) {
        toast.success("Absences et retards enregistrés avec succès");
        
        // Petite pause avant la navigation pour permettre à l'utilisateur de voir le message
        setTimeout(() => {
          navigate("/emplois-du-temps");
        }, 1500); } else {
        console.error("Échec de la sauvegarde");
        toast.error("Erreur lors de l'enregistrement des données");
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast.error("Erreur lors de l'enregistrement des données");
    }
  };

  if (!classe) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">Classe non trouvée</p>
            <Button onClick={handleBack}>
              Retour
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="mr-4 p-2 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">
            Absence & Retard - {classe.session} {classe.libelle}
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-4">
            <div className="flex flex-col">
              <label className="text-sm font-medium mb-1">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "EEEE d MMMM yyyy", { locale: fr }) : "Sélectionner une date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(date) => date && setDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="flex flex-col">
              <label className="text-sm font-medium mb-1">Enseignant</label>
              <Select value={enseignant} onValueChange={setEnseignant}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un enseignant" />
                </SelectTrigger>
                <SelectContent>
                  {enseignants.map((ens, index) => (
                    <SelectItem key={index} value={ens}>
                      {ens}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col">
              <label className="text-sm font-medium mb-1">Matière</label>
              <Input
                type="text"
                placeholder="Nom de la matière"
                value={matiere}
                onChange={(e) => setMatiere(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">Heure de début</label>
                <Input
                  type="time"
                  value={heureDebut}
                  onChange={(e) => setHeureDebut(e.target.value)}
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">Heure de fin</label>
                <Input
                  type="time"
                  value={heureFin}
                  onChange={(e) => setHeureFin(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border shadow-sm p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">Liste des élèves ({eleves.length})</h2>
          <div className="space-y-3">
            {eleves.map((eleve) => (
              <div 
                key={eleve.id} 
                className={cn(
                  "flex items-center justify-between p-3 rounded-md",
                  eleve.presence === "present" ? "bg-green-50 border border-green-200" :
                  eleve.presence === "absent" ? "bg-red-50 border border-red-200" :
                  eleve.presence === "retard" ? "bg-yellow-50 border border-yellow-200" :
                  "bg-gray-50 border border-gray-200"
                )}
              >
                <div>
                  <p className="font-medium">{eleve.prenom} {eleve.nom}</p>
                  {eleve.presence === "retard" && eleve.heureArrivee && (
                    <p className="text-sm text-gray-600">
                      Arrivé(e) à {eleve.heureArrivee}
                      {eleve.commentaire && ` - ${eleve.commentaire}`}
                    </p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "border",
                      eleve.presence === "present" 
                        ? "bg-green-500 text-white hover:bg-green-600" 
                        : "bg-white text-green-600 hover:bg-green-50"
                    )}
                    onClick={() => handlePresenceChange(eleve.id, "present")}
                  >
                    <UserCheck className="h-4 w-4 mr-1" />
                    Présent
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "border",
                      eleve.presence === "retard" 
                        ? "bg-yellow-500 text-white hover:bg-yellow-600" 
                        : "bg-white text-yellow-600 hover:bg-yellow-50"
                    )}
                    onClick={() => handleOpenRetardDialog(eleve.id)}
                  >
                    Retard
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "border",
                      eleve.presence === "absent" 
                        ? "bg-red-500 text-white hover:bg-red-600" 
                        : "bg-white text-red-600 hover:bg-red-50"
                    )}
                    onClick={() => handlePresenceChange(eleve.id, "absent")}
                  >
                    Absent
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button 
            onClick={handleSaveAll}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            Enregistrer
          </Button>
        </div>

        {/* Dialog pour saisir les détails du retard */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Détails du retard</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleRetardSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="heureArrivee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Heure d'arrivée</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="commentaire"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motif du retard</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Motif du retard..."
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit">
                    Enregistrer
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
