import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { useAcademicYear } from "@/hooks/useAcademicYear";
import { useClasses } from "@/hooks/useClasses";
import { useSchoolData } from "@/hooks/useSchoolData";
import { CreateExamData } from "@/hooks/useExams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface CreerExamenModalProps {
  createExam: (examData: CreateExamData) => Promise<boolean>;
  onExamenCreated?: () => void;
}

export const CreerExamenModal: React.FC<CreerExamenModalProps> = ({ createExam, onExamenCreated }) => {
  const { academicYear } = useAcademicYear();
  const { classes, loading: classesLoading } = useClasses();
  const { schoolData: schoolSettings } = useSchoolData();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [typeExamen, setTypeExamen] = useState("");
  const [titrePersonnalise, setTitrePersonnalise] = useState("");
  const [semestre, setSemestre] = useState("");
  const [anneeAcademique, setAnneeAcademique] = useState("");
  const [dateExamen, setDateExamen] = useState<Date>();
  const [toutesClasses, setToutesClasses] = useState(true);
  const [classesSelectionnees, setClassesSelectionnees] = useState<string[]>([]);

  const isTrimestreSystem = schoolSettings?.semester_type === 'trimester';

  // Synchroniser l'année académique avec l'année active
  useEffect(() => {
    setAnneeAcademique(academicYear);
  }, [academicYear]);

  // Réinitialiser le formulaire quand le modal s'ouvre
  useEffect(() => {
    if (open) {
      setToutesClasses(false); // Commencer avec "Toutes les classes" décoché
      setClassesSelectionnees([]); // Aucune classe sélectionnée par défaut
    }
  }, [open, classes]);

  const typesExamen = [
    "Composition", 
    "Examen blanc",
    "Essai",
    "Autre"
  ];

  const semestres = isTrimestreSystem 
    ? ["1er trimestre", "2e trimestre", "3e trimestre"]
    : ["1er semestre", "2e semestre"];

  const handleClasseToggle = (classeId: string) => {
    setClassesSelectionnees(prev => 
      prev.includes(classeId)
        ? prev.filter(id => id !== classeId)
        : [...prev, classeId]
    );
  };

  // S'assurer que toutes les classes sont sélectionnées quand "Toutes les classes" est coché
  useEffect(() => {
    if (toutesClasses && classes.length > 0) {
      setClassesSelectionnees(classes.map(c => c.id));
    }
  }, [toutesClasses, classes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (classesLoading) {
      toast({
        title: "Erreur",
        description: "Veuillez patienter, les classes sont en cours de chargement",
        variant: "destructive"
      });
      return;
    }

    if (!typeExamen) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un type d'examen",
        variant: "destructive"
      });
      return;
    }

    if (typeExamen === "Autre" && !titrePersonnalise.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un titre personnalisé",
        variant: "destructive"
      });
      return;
    }

    if (typeExamen === "Composition" && !semestre) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un semestre pour la composition",
        variant: "destructive"
      });
      return;
    }

    if (!dateExamen) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une date d'examen",
        variant: "destructive"
      });
      return;
    }

    if (!toutesClasses && classesSelectionnees.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins une classe",
        variant: "destructive"
      });
      return;
    }

    try {
      let successCount = 0;
      
      // Déterminer les classes à utiliser
      const classesToUse = toutesClasses ? classes.map(c => c.id) : classesSelectionnees;
      
      // Créer un examen pour chaque classe sélectionnée
      const createPromises = classesToUse.map(classId => 
        createExam({
          class_id: classId,
          title: typeExamen === "Autre" ? titrePersonnalise : typeExamen,
          exam_date: dateExamen.toISOString().split('T')[0],
          total_marks: 20,
          is_published: false
        })
      );
      const results = await Promise.all(createPromises);
      successCount = results.filter(Boolean).length;

      if (successCount > 0) {
        toast({
          title: "Succès",
          description: `${successCount} examen(s) créé(s) avec succès`,
        });

        // Reset du formulaire
        setTypeExamen("");
        setTitrePersonnalise("");
        setSemestre("");
        setDateExamen(undefined);
        setToutesClasses(true);
        setClassesSelectionnees([]);
        setOpen(false);
        
        // Notifier le composant parent
        if (onExamenCreated) {
          onExamenCreated();
        }
      } else {
        throw new Error("Aucun examen n'a pu être créé");
      }
    } catch (error) {
      console.error("Erreur lors de la création de l'examen:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la création de l'examen",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-white hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          Créer un examen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Créer un nouvel examen</DialogTitle>
          <DialogDescription>
            Remplissez les informations ci-dessous pour créer un nouvel examen.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="typeExamen">Type d'examen *</Label>
              <Select value={typeExamen} onValueChange={setTypeExamen}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  {typesExamen.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {typeExamen === "Autre" && (
              <div className="space-y-2">
                <Label htmlFor="titrePersonnalise">Titre personnalisé *</Label>
                <Input
                  id="titrePersonnalise"
                  value={titrePersonnalise}
                  onChange={(e) => setTitrePersonnalise(e.target.value)}
                  placeholder="Ex: Contrôle de mathématiques"
                />
              </div>
            )}

            {typeExamen === "Composition" && (
              <div className="space-y-2">
                <Label htmlFor="semestre">Semestre *</Label>
                <Select value={semestre} onValueChange={setSemestre}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un semestre" />
                  </SelectTrigger>
                  <SelectContent>
                    {semestres.map((sem) => (
                      <SelectItem key={sem} value={sem}>
                        {sem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="anneeAcademique">Année académique</Label>
              <Input
                id="anneeAcademique"
                value={anneeAcademique}
                readOnly
                className="bg-gray-50"
                placeholder="Ex: 2024/2025"
              />
            </div>

            <div className="space-y-2">
              <Label>Date d'examen *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateExamen ? format(dateExamen, "PPP", { locale: fr }) : "Sélectionner une date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateExamen}
                    onSelect={setDateExamen}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="toutesClasses"
                  checked={toutesClasses}
                  onCheckedChange={(checked) => {
                    setToutesClasses(checked as boolean);
                    if (checked) {
                      setClassesSelectionnees([]);
                    } else {
                      // Si on décoche "Toutes les classes", sélectionner toutes les classes par défaut
                      setClassesSelectionnees(classes.map(c => c.id));
                    }
                  }}
                />
                <Label htmlFor="toutesClasses">Toutes les classes</Label>
              </div>

              <div className="space-y-2">
                <Label>Classes sélectionnées {toutesClasses ? "(Toutes)" : `(${classesSelectionnees.length} sélectionnée${classesSelectionnees.length > 1 ? 's' : ''})`}</Label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
                  {classes.map((classe) => (
                    <div key={classe.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={classe.id}
                        checked={toutesClasses || classesSelectionnees.includes(classe.id)}
                        disabled={toutesClasses}
                        onCheckedChange={() => handleClasseToggle(classe.id)}
                      />
                      <Label htmlFor={classe.id} className="text-sm">
                        {classe.name} {classe.level}{classe.section ? ` - ${classe.section}` : ''}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={classesLoading}>
              Créer l'examen
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
