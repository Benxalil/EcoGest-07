import { useAcademicYear } from "@/hooks/useAcademicYear";
import { useClasses } from "@/hooks/useClasses";
import { useSchoolData } from "@/hooks/useSchoolData";
import { Exam, useExams } from "@/hooks/useExams";
import { useGrades } from "@/hooks/useGrades";
import { useToast } from "@/hooks/use-toast";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Calendar, Search, Users, FileText, Clock, CheckCircle, AlertCircle, XCircle, Edit, Trash2 } from "lucide-react";
import { format, isAfter, isBefore } from "date-fns";
import { fr } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatClassName } from "@/utils/classNameFormatter";
interface Examen {
  id: string;
  titre: string;
  type: string;
  semestre: string;
  anneeAcademique: string;
  dateExamen: string;
  classes: string[];
  dateCreation: string;
  statut: string;
}
const getStatutBadge = (statut: string) => {
  switch (statut) {
    case "À venir":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Clock className="w-3 h-3 mr-1" />À venir</Badge>;
    case "Passé":
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200"><AlertCircle className="w-3 h-3 mr-1" />Passé</Badge>;
    case "En cours de correction":
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><FileText className="w-3 h-3 mr-1" />En correction</Badge>;
    case "Corrigé":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Corrigé</Badge>;
    case "Résultats publiés":
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200"><CheckCircle className="w-3 h-3 mr-1" />Publié</Badge>;
    default:
      return <Badge variant="outline">{statut}</Badge>;
  }
};
const getSemestreBadge = (semestre: string) => {
  const colors = {
    "1er semestre": "bg-blue-100 text-blue-800",
    "2e semestre": "bg-green-100 text-green-800",
    "3e semestre": "bg-purple-100 text-purple-800"
  };
  return <Badge variant="outline" className={colors[semestre as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
      {semestre}
    </Badge>;
};
interface ListeExamensProps {
  exams: Exam[];
  loading: boolean;
  updateExam: (id: string, examData: any) => Promise<boolean>;
  deleteExam: (id: string) => Promise<boolean>;
  refreshExams: () => void;
}
export const ListeExamens: React.FC<ListeExamensProps> = ({
  exams,
  loading: examsLoading,
  updateExam,
  deleteExam,
  refreshExams
}) => {
  const {
    academicYear
  } = useAcademicYear();
  const {
    classes,
    loading: classesLoading
  } = useClasses();
  const {
    grades
  } = useGrades(); // Pour compter les notes par examen
  const {
    toast
  } = useToast();
  const {
    createExam
  } = useExams();
  const [searchTerm, setSearchTerm] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editingExamen, setEditingExamen] = useState<Examen | null>(null);
  const [editTypeExamen, setEditTypeExamen] = useState("");
  const [editTitre, setEditTitre] = useState("");
  const [editSemestre, setEditSemestre] = useState("");
  const [editAnnee, setEditAnnee] = useState(academicYear);
  const [editDate, setEditDate] = useState("");
  const [editToutesClasses, setEditToutesClasses] = useState(true);
  const [editClassesSelectionnees, setEditClassesSelectionnees] = useState<string[]>([]);

  // Remplacé par hook Supabase
  const {
    schoolData: schoolSettings
  } = useSchoolData();
  const isTrimestreSystem = schoolSettings?.semester_type === 'trimester';

  // Helpers dates sûrs
  const isValidDateValue = (value?: string) => {
    if (!value) return false;
    const d = new Date(value);
    return !isNaN(d.getTime());
  };
  const safeFormatDate = (value?: string, fmt = "PPP") => {
    if (!isValidDateValue(value)) return "Date non définie";
    return format(new Date(value as string), fmt, {
      locale: fr
    });
  };
  const timeOr = (value?: string, fallback: number = 0) => {
    if (!isValidDateValue(value)) return fallback;
    return new Date(value as string).getTime();
  };

  // Convertir les données du hook useExams vers le format attendu par le composant
  const examens = React.useMemo(() => {
    if (!exams) return [];

    // Grouper les examens par titre et date pour afficher une seule bande par examen
    const groupedExams = exams.reduce((acc, exam) => {
      const key = `${exam.title}-${exam.exam_date}`;
      if (!acc[key]) {
        acc[key] = {
          id: exam.id,
          // Garder l'ID du premier examen pour les actions
          titre: exam.title,
          type: exam.title,
          semestre: exam.title === "Composition" ? "1er semestre" : "",
          anneeAcademique: academicYear,
          dateExamen: exam.exam_date,
          classes: [],
          dateCreation: exam.created_at,
          statut: (() => {
            const dateExamen = new Date(exam.exam_date);
            const maintenant = new Date();
            if (!isNaN(dateExamen.getTime())) {
              if (isAfter(dateExamen, maintenant)) {
                return "À venir";
              } else {
                return "Passé";
              }
            }
            return "À venir";
          })()
        };
      }

      // Ajouter la classe à la liste des classes pour cet examen
      if (exam.class_id) {
        const classe = classes.find(c => c.id === exam.class_id);
        if (classe) {
          const classeName = formatClassName(classe);
          if (!acc[key].classes.includes(classeName)) {
            acc[key].classes.push(classeName);
          }
        }
      }
      return acc;
    }, {} as Record<string, Examen>);
    return Object.values(groupedExams);
  }, [exams, classes, academicYear]);
  const getClasseNom = (classeId: string) => {
    const classe = classes.find(c => c.id === classeId);
    return classe ? formatClassName(classe) : classeId;
  };
  const getClassesNoms = (classesNames: string[]) => {
    if (classesNames.length === classes.length) {
      return "Toutes les classes";
    }
    return classesNames.join(", ");
  };

  // Compter le nombre de notes pour un examen
  const getGradesCount = (examId: string) => {
    return grades?.filter(grade => grade.exam_id === examId).length || 0;
  };
  const filteredExamens = examens.filter(examen => examen.titre.toLowerCase().includes(searchTerm.toLowerCase()) || examen.type.toLowerCase().includes(searchTerm.toLowerCase()) || getClassesNoms(examen.classes).toLowerCase().includes(searchTerm.toLowerCase()));
  const examensAVenir = filteredExamens.filter(examen => examen.statut === "À venir").sort((a, b) => timeOr(a.dateExamen, Infinity) - timeOr(b.dateExamen, Infinity));
  const examensPasses = filteredExamens.filter(examen => examen.statut !== "À venir").sort((a, b) => timeOr(b.dateExamen, -Infinity) - timeOr(a.dateExamen, -Infinity));
  const handleGererExamen = (examen: Examen) => {};
  const openEditDialog = (examen: Examen) => {
    setEditingExamen(examen);
    setEditTypeExamen(examen.type);
    setEditTitre(examen.titre);
    setEditSemestre(examen.semestre);
    setEditAnnee(examen.anneeAcademique);
    setEditDate(examen.dateExamen && !isNaN(new Date(examen.dateExamen).getTime()) ? new Date(examen.dateExamen).toISOString().slice(0, 10) : "");

    // Récupérer les IDs des classes associées à cet examen
    const examsForThisExam = exams?.filter(exam => exam.title === examen.titre && exam.exam_date === examen.dateExamen) || [];
    const classIds = examsForThisExam.map(exam => exam.class_id);
    setEditToutesClasses(classIds.length === classes.length);
    setEditClassesSelectionnees(classIds);
    setEditOpen(true);
  };
  const handleModifierExamen = (examen: Examen) => {
    openEditDialog(examen);
  };
  const handleSupprimerExamen = async (examenId: string) => {
    try {
      // Trouver tous les examens du groupe (même titre et date)
      const examenGroup = examens.find(e => e.id === examenId);
      if (!examenGroup) {
        console.error('Examen non trouvé');
        return;
      }

      // Trouver tous les examens de la base avec le même titre et la même date
      const examsToDelete = exams?.filter(exam => exam.title === examenGroup.titre && exam.exam_date === examenGroup.dateExamen) || [];

      // Supprimer tous les examens du groupe
      for (const exam of examsToDelete) {
        await deleteExam(exam.id);
      }

      // Rafraîchir la liste après suppression
      refreshExams();
    } catch (error) {
      console.error("Erreur lors de la suppression de l'examen:", error);
    }
  };
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExamen) return;
    try {
      // Trouver tous les examens du groupe (même titre et date)
      const examsInGroup = exams?.filter(exam => exam.title === editingExamen.titre && exam.exam_date === editingExamen.dateExamen) || [];
      const currentClassIds = examsInGroup.map(exam => exam.class_id);
      const selectedClassIds = editToutesClasses ? classes.map(c => c.id) : editClassesSelectionnees;

      // Classes à supprimer (dans current mais pas dans selected)
      const classesToRemove = currentClassIds.filter(id => !selectedClassIds.includes(id));

      // Classes à ajouter (dans selected mais pas dans current)
      const classesToAdd = selectedClassIds.filter(id => !currentClassIds.includes(id));

      // Classes à mettre à jour (dans les deux)
      const classesToUpdate = currentClassIds.filter(id => selectedClassIds.includes(id));
      const newTitle = editTypeExamen === 'Autre' && editTitre.trim() ? editTitre : editTypeExamen === 'Autre' ? editingExamen.titre : editTypeExamen;
      const newDate = editDate ? new Date(editDate).toISOString().split('T')[0] : editingExamen.dateExamen;

      // Supprimer les examens des classes non sélectionnées
      for (const classId of classesToRemove) {
        const examToDelete = examsInGroup.find(exam => exam.class_id === classId);
        if (examToDelete) {
          await deleteExam(examToDelete.id);
        }
      }

      // Mettre à jour les examens des classes qui restent
      for (const classId of classesToUpdate) {
        const examToUpdate = examsInGroup.find(exam => exam.class_id === classId);
        if (examToUpdate) {
          await updateExam(examToUpdate.id, {
            title: newTitle,
            exam_date: newDate
          });
        }
      }

      // Créer de nouveaux examens pour les classes ajoutées
      for (const classId of classesToAdd) {
        // Trouver le subject_id du premier examen du groupe pour cohérence
        const firstExam = examsInGroup[0];
        await createExam({
          class_id: classId,
          subject_id: firstExam?.subject_id,
          title: newTitle,
          exam_date: newDate,
          start_time: firstExam?.start_time,
          total_marks: firstExam?.total_marks,
          is_published: firstExam?.is_published ?? false
        });
      }
      setEditOpen(false);
      setEditingExamen(null);

      // Rafraîchir la liste après modification
      refreshExams();
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'examen:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour de l'examen.",
        variant: "destructive"
      });
    }
  };
  return <div className="space-y-6">
      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input placeholder="Rechercher des examens..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      {/* Section Examens à venir */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Examens à venir</h2>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {examensAVenir.length}
          </Badge>
        </div>

        {examensAVenir.length === 0 ? <Card>
            <CardContent className="p-6 text-center text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Aucun examen à venir</p>
            </CardContent>
          </Card> : <div className="grid gap-4">
            {examensAVenir.map(examen => <Card key={examen.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg text-gray-900">{examen.titre}</h3>
                        {examen.semestre && getSemestreBadge(examen.semestre)}
                        {getStatutBadge(examen.statut)}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {safeFormatDate(examen.dateExamen)}
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {examen.type}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {getClassesNoms(examen.classes)}
                        </div>
                        <div className="flex items-center gap-1">
                          
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="ghost" size="icon" onClick={() => handleModifierExamen(examen)} className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50" title="Modifier l'examen">
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-50" title="Supprimer l'examen">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer l'examen</AlertDialogTitle>
                            <AlertDialogDescription>
                              Êtes-vous sûr de vouloir supprimer l'examen "{examen.titre}" ? 
                              Cette action est irréversible et supprimera toutes les données associées.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleSupprimerExamen(examen.id)} className="bg-red-600 hover:bg-red-700">
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>)}
          </div>}
      </div>

      {/* Section Examens passés */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <h2 className="text-xl font-semibold text-gray-900">Examens passés</h2>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            {examensPasses.length}
          </Badge>
        </div>

        {examensPasses.length === 0 ? <Card>
            <CardContent className="p-6 text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Aucun examen passé</p>
            </CardContent>
          </Card> : <div className="grid gap-4">
            {examensPasses.map(examen => <Card key={examen.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg text-gray-900">{examen.titre}</h3>
                        {examen.semestre && getSemestreBadge(examen.semestre)}
                        {getStatutBadge(examen.statut)}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {safeFormatDate(examen.dateExamen)}
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {examen.type}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {getClassesNoms(examen.classes)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            {getGradesCount(examen.id)} notes
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="ghost" size="icon" onClick={() => handleModifierExamen(examen)} className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50" title="Modifier l'examen">
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-50" title="Supprimer l'examen">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer l'examen</AlertDialogTitle>
                            <AlertDialogDescription>
                              Êtes-vous sûr de vouloir supprimer l'examen "{examen.titre}" ? 
                              Cette action est irréversible et supprimera toutes les données associées.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleSupprimerExamen(examen.id)} className="bg-red-600 hover:bg-red-700">
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>)}
          </div>}
      </div>

      {/* Dialog d'édition d'examen */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Modifier l'examen</DialogTitle>
            <DialogDescription>
              Modifiez les informations de l'examen ci-dessous.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {/* Type */}
            <div className="space-y-2">
              <Label>Type d'examen</Label>
              <Select value={editTypeExamen} onValueChange={setEditTypeExamen}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Devoir">Devoir</SelectItem>
                  <SelectItem value="Composition">Composition</SelectItem>
                  <SelectItem value="Examen blanc">Examen blanc</SelectItem>
                  <SelectItem value="Essai">Essai</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Titre personnalisé */}
            {editTypeExamen === 'Autre' && <div className="space-y-2">
                <Label>Titre personnalisé</Label>
                <Input value={editTitre} onChange={e => setEditTitre(e.target.value)} placeholder="Titre" />
              </div>}

            {/* Semestre */}
            <div className="space-y-2">
              <Label>{isTrimestreSystem ? "Trimestre" : "Semestre"}</Label>
              <Select value={editSemestre} onValueChange={setEditSemestre}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1er semestre">{isTrimestreSystem ? "1er trimestre" : "1er semestre"}</SelectItem>
                  <SelectItem value="2e semestre">{isTrimestreSystem ? "2e trimestre" : "2e semestre"}</SelectItem>
                  {isTrimestreSystem && <SelectItem value="3e semestre">3e trimestre</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            {/* Année académique */}
            <div className="space-y-2">
              <Label>Année académique</Label>
              <Input value={editAnnee} onChange={e => setEditAnnee(e.target.value)} placeholder="2024-2025" />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>Date de l'examen</Label>
              <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
            </div>

            {/* Classes */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="edit-toutes-classes" checked={editToutesClasses} onCheckedChange={checked => {
                setEditToutesClasses(checked as boolean);
                if (checked) {
                  setEditClassesSelectionnees(classes.map(c => c.id));
                } else {
                  setEditClassesSelectionnees([]);
                }
              }} />
                <Label htmlFor="edit-toutes-classes">Toutes les classes</Label>
              </div>
              {!editToutesClasses && <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                  <Label className="text-sm font-medium mb-2 block">Sélectionner les classes :</Label>
                  <div className="space-y-2">
                    {classes.map(classe => <div key={classe.id} className="flex items-center space-x-2">
                        <Checkbox id={`edit-classe-${classe.id}`} checked={editClassesSelectionnees.includes(classe.id)} onCheckedChange={() => {
                    setEditClassesSelectionnees(prev => prev.includes(classe.id) ? prev.filter(id => id !== classe.id) : [...prev, classe.id]);
                  }} />
                        <Label htmlFor={`edit-classe-${classe.id}`} className="text-sm">
                          {formatClassName(classe)}
                        </Label>
                      </div>)}
                  </div>
                </div>}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
              <Button type="submit">Enregistrer</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>;
};