import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { useAcademicYear } from "@/hooks/useAcademicYear";
import { useClasses } from "@/hooks/useClasses";
import { useSchoolData } from "@/hooks/useSchoolData";
import { CreateExamData, useExams } from "@/hooks/useExams";
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
import { formatClassName } from "@/utils/classNameFormatter";

// Fonction pour trier les classes par ordre académique
const getClassOrder = (name: string, section: string = ''): number => {
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
    'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6
  };

  const levelValue = levelOrder[name] || 999;
  const sectionValue = section ? sectionOrder[section.charAt(section.length - 1)] || 0 : 0;

  return levelValue * 10 + sectionValue;
};

interface CreerExamenModalProps {
  createExam: (examData: CreateExamData) => Promise<boolean>;
  onExamenCreated?: () => void;
}

export const CreerExamenModal: React.FC<CreerExamenModalProps> = ({ createExam, onExamenCreated }) => {
  const { academicYear } = useAcademicYear();
  const { classes, loading: classesLoading } = useClasses();
  const { schoolData: schoolSettings } = useSchoolData();
  const { exams } = useExams(); // Pour vérifier les examens existants
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

  // Trier les classes par ordre académique
  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => {
      const orderA = getClassOrder(a.name, a.section || '');
      const orderB = getClassOrder(b.name, b.section || '');
      return orderA - orderB;
    });
  }, [classes]);

  const handleClasseToggle = (classeId: string) => {
    setClassesSelectionnees(prev => 
      prev.includes(classeId)
        ? prev.filter(id => id !== classeId)
        : [...prev, classeId]
    );
  };

  // S'assurer que toutes les classes sont sélectionnées quand "Toutes les classes" est coché
  useEffect(() => {
    if (toutesClasses && sortedClasses.length > 0) {
      setClassesSelectionnees(sortedClasses.map(c => c.id));
    }
  }, [toutesClasses, sortedClasses]);

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
      const classesToUse = toutesClasses ? sortedClasses.map(c => c.id) : classesSelectionnees;
      
      // Vérifier s'il existe déjà un examen avec ce titre dans ces classes
      const examTitle = typeExamen === "Autre" ? titrePersonnalise : typeExamen;
      const duplicates = classesToUse.filter(classId => {
        return exams?.some(exam => 
          exam.class_id === classId && 
          exam.title.toLowerCase() === examTitle.toLowerCase()
        );
      });

      if (duplicates.length > 0) {
        const duplicateClasses = duplicates.map(classId => {
          const classe = sortedClasses.find(c => c.id === classId);
          return classe ? formatClassName(classe) : '';
        }).join(', ');

        toast({
          title: "Examens dupliqués détectés",
          description: `Un examen avec le titre "${examTitle}" existe déjà pour: ${duplicateClasses}. Veuillez utiliser un titre différent ou modifier l'examen existant.`,
          variant: "destructive"
        });
        return;
      }
      
      // Créer un examen pour chaque classe sélectionnée
      const createPromises = classesToUse.map(classId => 
        createExam({
          class_id: classId,
          title: examTitle,
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
                       setClassesSelectionnees(sortedClasses.map(c => c.id));
                     }
                   }}
                 />
                 <Label htmlFor="toutesClasses">Toutes les classes</Label>
               </div>

               <div className="space-y-2">
                 <Label>Classes sélectionnées {toutesClasses ? "(Toutes)" : `(${classesSelectionnees.length} sélectionnée${classesSelectionnees.length > 1 ? 's' : ''})`}</Label>
                 <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
                   {sortedClasses.map((classe) => (
                    <div key={classe.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={classe.id}
                        checked={toutesClasses || classesSelectionnees.includes(classe.id)}
                        disabled={toutesClasses}
                        onCheckedChange={() => handleClasseToggle(classe.id)}
                      />
                      <Label htmlFor={classe.id} className="text-sm">
                        {formatClassName(classe)}
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
