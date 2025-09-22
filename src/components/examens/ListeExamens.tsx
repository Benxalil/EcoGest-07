import { useAcademicYear } from "@/hooks/useAcademicYear";
import { useClasses } from "@/hooks/useClasses";
import { useSchoolData } from "@/hooks/useSchoolData";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Calendar, Search, Users, FileText, Clock, CheckCircle, AlertCircle, XCircle, Edit, Trash2 } from "lucide-react";
import { format, isAfter, isBefore } from "date-fns";
import { fr } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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

const getExamensFromStorage = (): Examen[] => {
  try {
    // Remplacé par hook Supabase - plus de localStorage
    // Les examens sont maintenant gérés par useExams hook
    return [];
  } catch (error) {
    console.error("Erreur lors de la récupération des examens:", error);
    return [];
  }
};

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
  return (
    <Badge variant="outline" className={colors[semestre as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
      {semestre}
    </Badge>
  );
};

export const ListeExamens: React.FC = () => {
  const { academicYear } = useAcademicYear();
  const { classes, loading: classesLoading } = useClasses();
  const [examens, setExamens] = useState<Examen[]>([]);
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
  const { schoolData: schoolSettings } = useSchoolData();
  const isTrimestreSystem = schoolSettings?.system === 'trimestre';

  // Helpers dates sûrs
  const isValidDateValue = (value?: string) => {
    if (!value) return false;
    const d = new Date(value);
    return !isNaN(d.getTime());
  };
  const safeFormatDate = (value?: string, fmt = "PPP") => {
    if (!isValidDateValue(value)) return "Date non définie";
    return format(new Date(value as string), fmt, { locale: fr });
  };
  const timeOr = (value?: string, fallback: number = 0) => {
    if (!isValidDateValue(value)) return fallback;
    return new Date(value as string).getTime();
  };

  useEffect(() => {
    const loadData = () => {
      const savedExamens = getExamensFromStorage();
      
      // Mise à jour automatique des statuts basée sur la date
      const examensAvecStatutMisAJour = savedExamens.map(examen => {
        const dateExamen = new Date(examen.dateExamen);
        const maintenant = new Date();
        if (!isNaN(dateExamen.getTime())) {
          if (isAfter(dateExamen, maintenant)) {
            return { ...examen, statut: "À venir" };
          } else if (isBefore(dateExamen, maintenant)) {
            // Si pas encore de statut spécifique, marquer comme "Passé"
            if (examen.statut === "À venir") {
              return { ...examen, statut: "Passé" };
            }
          }
        }
        return examen;
      });

      setExamens(examensAvecStatutMisAJour);
    };

    loadData();
    
    const handleStorageChange = () => {
      loadData();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('examensUpdated', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('examensUpdated', handleStorageChange);
    };
  }, []);

  const getClasseNom = (classeId: string) => {
    const classe = classes.find(c => c.id === classeId);
    return classe ? `${classe.name} ${classe.level}${classe.section ? ` - ${classe.section}` : ''}` : classeId;
  };

  const getClassesNoms = (classesIds: string[]) => {
    if (classesIds.length === classes.length) {
      return "Toutes les classes";
    }
    return classesIds.map(id => getClasseNom(id)).join(", ");
  };

  const filteredExamens = examens.filter(examen =>
    examen.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    examen.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getClassesNoms(examen.classes).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const examensAVenir = filteredExamens.filter(examen => 
    examen.statut === "À venir"
  ).sort((a, b) => timeOr(a.dateExamen, Infinity) - timeOr(b.dateExamen, Infinity));

  const examensPasses = filteredExamens.filter(examen => 
    examen.statut !== "À venir"
  ).sort((a, b) => timeOr(b.dateExamen, -Infinity) - timeOr(a.dateExamen, -Infinity));

  const handleGererExamen = (examen: Examen) => {
    };

  const openEditDialog = (examen: Examen) => {
    setEditingExamen(examen);
    setEditTypeExamen(examen.type);
    setEditTitre(examen.titre);
    setEditSemestre(examen.semestre);
    setEditAnnee(examen.anneeAcademique);
    setEditDate(examen.dateExamen && !isNaN(new Date(examen.dateExamen).getTime()) ? new Date(examen.dateExamen).toISOString().slice(0, 10) : "");
    setEditToutesClasses(examen.classes.length === classes.length);
    setEditClassesSelectionnees(examen.classes);
    setEditOpen(true);
  };

  const handleModifierExamen = (examen: Examen) => {
    openEditDialog(examen);
  };

  const handleSupprimerExamen = (examenId: string) => {
    try {
      const savedExamens = getExamensFromStorage();
      const examensUpdated = savedExamens.filter(examen => examen.id !== examenId);
      // localStorage.setItem("examens", JSON.stringify(examensUpdated); // Remplacé par hook Supabase);
      setExamens(examensUpdated);
      window.dispatchEvent(new Event('examensUpdated'));
      } catch (error) {
      console.error("Erreur lors de la suppression de l'examen:", error);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExamen) return;

    const updated: Examen = {
      ...editingExamen,
      titre: editTypeExamen === 'Autre' && editTitre.trim() ? editTitre : (editTypeExamen === 'Autre' ? editingExamen.titre : editTypeExamen),
      type: editTypeExamen,
      semestre: editSemestre,
      anneeAcademique: editAnnee,
      dateExamen: editDate ? new Date(editDate).toISOString() : editingExamen.dateExamen,
      classes: editToutesClasses ? classes.map(c => c.id) : editClassesSelectionnees
    };

    try {
      const savedExamens = getExamensFromStorage();
      const idx = savedExamens.findIndex(e => e.id === updated.id);
      if (idx !== -1) {
        savedExamens[idx] = updated;
        // localStorage.setItem("examens", JSON.stringify(savedExamens); // Remplacé par hook Supabase);
        setExamens(savedExamens);
        window.dispatchEvent(new Event('examensUpdated'));
      }
      setEditOpen(false);
      setEditingExamen(null);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'examen:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Rechercher des examens..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
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

        {examensAVenir.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Aucun examen à venir</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {examensAVenir.map((examen) => (
              <Card key={examen.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg text-gray-900">{examen.titre}</h3>
                        {getSemestreBadge(examen.semestre)}
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
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleModifierExamen(examen)}
                        className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        title="Modifier l'examen"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-50"
                            title="Supprimer l'examen"
                          >
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
                            <AlertDialogAction 
                              onClick={() => handleSupprimerExamen(examen.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
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

        {examensPasses.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Aucun examen passé</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {examensPasses.map((examen) => (
              <Card key={examen.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg text-gray-900">{examen.titre}</h3>
                        {getSemestreBadge(examen.semestre)}
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
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleModifierExamen(examen)}
                        className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        title="Modifier l'examen"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-50"
                            title="Supprimer l'examen"
                          >
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
                            <AlertDialogAction 
                              onClick={() => handleSupprimerExamen(examen.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog d'édition d'examen */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Modifier l'examen</DialogTitle>
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
            {editTypeExamen === 'Autre' && (
              <div className="space-y-2">
                <Label>Titre personnalisé</Label>
                <Input value={editTitre} onChange={(e) => setEditTitre(e.target.value)} placeholder="Titre" />
              </div>
            )}

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
              <Input value={editAnnee} onChange={(e) => setEditAnnee(e.target.value)} placeholder="2024-2025" />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>Date de l'examen</Label>
              <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </div>

            {/* Classes */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="edit-toutes-classes" checked={editToutesClasses} onCheckedChange={(c) => setEditToutesClasses(Boolean(c))} />
                <Label htmlFor="edit-toutes-classes">Toutes les classes</Label>
              </div>
              {!editToutesClasses && (
                <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                  <Label className="text-sm font-medium mb-2 block">Sélectionner les classes :</Label>
                  <div className="space-y-2">
                    {classes.map((classe) => (
                      <div key={classe.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-classe-${classe.id}`}
                          checked={editClassesSelectionnees.includes(classe.id)}
                          onCheckedChange={() => {
                            setEditClassesSelectionnees((prev) =>
                              prev.includes(classe.id)
                                ? prev.filter((id) => id !== classe.id)
                                : [...prev, classe.id]
                            );
                          }}
                        />
                        <Label htmlFor={`edit-classe-${classe.id}`} className="text-sm">
                          {classe.name} {classe.level}{classe.section ? ` - ${classe.section}` : ''}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
              <Button type="submit">Enregistrer</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};