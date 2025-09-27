import { Layout } from "@/components/layout/Layout";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Clock, Users, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";
import { useStudents } from "@/hooks/useStudents";
import { supabase } from "@/integrations/supabase/client";
import { useClasses } from "@/hooks/useClasses";

interface Eleve {
  id: string;
  nom: string;
  prenom: string;
  dateNaissance?: string;
  classe?: string;
}

interface AbsenceRetardData {
  id: string;
  classeId: string;
  date: string;
  enseignant: string;
  matiere: string;
  heureDebut: string;
  heureFin: string;
  eleves: {
    eleveId: string;
    statut: "present" | "absent" | "retard";
    motifRetard?: string;
    dureeRetard?: string;
  }[];
}

const saveAbsenceRetardData = async (data: AbsenceRetardData, schoolId: string) => {
  try {
    // Préparer les données pour l'insertion dans la table attendances
    const attendanceRecords = data.eleves
      .filter(eleve => eleve.statut !== "present") // On n'enregistre que les absences et retards
      .map(eleve => ({
        student_id: eleve.eleveId,
        class_id: data.classeId,
        school_id: schoolId,
        date: data.date,
        type: eleve.statut === "absent" ? "absence" as const : "retard" as const,
        reason: eleve.statut === "retard" ? eleve.motifRetard : null,
        period: `${data.heureDebut} - ${data.heureFin}`,
        teacher_id: null, // Pourrait être ajouté plus tard
        subject_id: null // Pourrait être ajouté plus tard
      }));

    if (attendanceRecords.length > 0) {
      const { error } = await supabase
        .from('attendances')
        .insert(attendanceRecords);

      if (error) {
        console.error('Erreur lors de l\'enregistrement des absences:', error);
        throw error;
      }
    }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
    throw error;
  }
};

export default function EnregistrerAbsenceRetard() {
  const { classeId } = useParams<{ classeId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Récupération des paramètres depuis l'URL
  const day = searchParams.get('day') || '';
  const subject = searchParams.get('subject') || '';
  const startTime = searchParams.get('startTime') || '';
  const endTime = searchParams.get('endTime') || '';
  const teacher = searchParams.get('teacher') || '';

  // Hook pour récupérer les élèves
  const { students, loading: studentsLoading } = useStudents(classeId);
  const { classes } = useClasses();

  // États locaux
  const [presences, setPresences] = useState<{[key: string]: "present" | "absent" | "retard"}>({});
  const [retardDialog, setRetardDialog] = useState<{open: boolean, eleveId: string}>({open: false, eleveId: ''});
  const [retardData, setRetardData] = useState<{motif: string, duree: string}>({motif: '', duree: ''});
  const [enseignant, setEnseignant] = useState(teacher);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Convertir les étudiants au format attendu
  const eleves: Eleve[] = students.map(student => ({
    id: student.id,
    nom: student.last_name,
    prenom: student.first_name,
    dateNaissance: student.date_of_birth || undefined,
    classe: student.classes?.name || undefined
  }));

  useEffect(() => {
    if (eleves.length > 0) {
      // Initialiser tous les élèves comme présents
      const initialPresences: {[key: string]: "present" | "absent" | "retard"} = {};
      eleves.forEach(eleve => {
        initialPresences[eleve.id] = "present";
      });
      setPresences(initialPresences);
    }
  }, [eleves.length]);

  const handlePresenceChange = (eleveId: string, statut: "present" | "absent" | "retard") => {
    if (statut === "retard") {
      setRetardDialog({open: true, eleveId}); } else {
      setPresences(prev => ({
        ...prev,
        [eleveId]: statut
      }));
    }
  };

  const handleRetardSubmit = () => {
    if (retardData.motif.trim() && retardData.duree.trim()) {
      setPresences(prev => ({
        ...prev,
        [retardDialog.eleveId]: "retard"
      }));
      setRetardDialog({open: false, eleveId: ''});
      setRetardData({motif: '', duree: ''});
      toast({
        title: "Retard enregistré",
        description: "Le retard a été enregistré avec succès.",
      }); } else {
      toast({
        title: "Informations manquantes",
        description: "Veuillez remplir le motif et la durée du retard.",
        variant: "destructive",
      });
    }
  };

  const handleSaveAll = async () => {
    if (!enseignant.trim()) {
      toast({
        title: "Enseignant requis",
        description: "Veuillez saisir le nom de l'enseignant.",
        variant: "destructive",
      });
      return;
    }

    // Trouver l'école de la classe
    const currentClass = classes.find(c => c.id === classeId);
    if (!currentClass) {
      toast({
        title: "Erreur",
        description: "Impossible de trouver les informations de la classe.",
        variant: "destructive",
      });
      return;
    }

    // Stocker les données de retard de l'élève en cours
    const retardInfo: {[key: string]: {motif: string, duree: string}} = {};
    if (retardDialog.eleveId && retardData.motif && retardData.duree) {
      retardInfo[retardDialog.eleveId] = retardData;
    }

    const absenceRetardData: AbsenceRetardData = {
      id: `ar-${Date.now()}`,
      classeId: classeId!,
      date,
      enseignant,
      matiere: subject,
      heureDebut: startTime,
      heureFin: endTime,
      eleves: Object.entries(presences).map(([eleveId, statut]) => ({
        eleveId,
        statut,
        motifRetard: statut === "retard" ? (retardInfo[eleveId]?.motif || "Non précisé") : undefined,
        dureeRetard: statut === "retard" ? (retardInfo[eleveId]?.duree || "Non précisé") : undefined,
      }))
    };

    try {
      await saveAbsenceRetardData(absenceRetardData, currentClass.school_id);
      
      toast({
        title: "✅ Enregistrement réussi",
        description: `Les présences, absences et retards ont été enregistrés avec succès pour le cours de ${subject} du ${day}.`,
        duration: 4000,
      });

      // Retourner à l'emploi du temps après un délai
      setTimeout(() => {
        navigate(`/emplois-du-temps/${classeId}`);
      }, 1500);
    } catch (error) {
      toast({
        title: "❌ Erreur d'enregistrement",
        description: "Une erreur est survenue lors de l'enregistrement. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  const getStatutColor = (statut: "present" | "absent" | "retard") => {
    switch (statut) {
      case "present": return "bg-green-500 hover:bg-green-600";
      case "absent": return "bg-red-500 hover:bg-red-600";
      case "retard": return "bg-orange-500 hover:bg-orange-600";
    }
  };

  const getStatutLabel = (statut: "present" | "absent" | "retard") => {
    switch (statut) {
      case "present": return "Présent";
      case "absent": return "Absent";
      case "retard": return "Retard";
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à l'emploi du temps
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Enregistrer Absences & Retards</h1>
        </div>

        {/* Informations du cours */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Informations du cours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">Jour</Label>
                <Badge variant="outline" className="mt-1">{day}</Badge>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Matière</Label>
                <Badge variant="outline" className="mt-1">{subject}</Badge>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Heure de début</Label>
                <Badge variant="outline" className="mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {startTime}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Heure de fin</Label>
                <Badge variant="outline" className="mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {endTime}
                </Badge>
              </div>
            </div>
            
            {/* Date et Enseignant */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="enseignant">Enseignant *</Label>
                <Input
                  id="enseignant"
                  placeholder="Nom de l'enseignant"
                  value={enseignant}
                  onChange={(e) => setEnseignant(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des élèves */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Liste des élèves ({eleves.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {studentsLoading ? (
              <p className="text-gray-500 text-center py-8">Chargement des élèves...</p>
            ) : eleves.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucun élève trouvé pour cette classe.</p>
            ) : (
              <div className="space-y-3">
                {eleves.map((eleve) => (
                  <div key={eleve.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{eleve.prenom} {eleve.nom}</p>
                      <p className="text-sm text-gray-500">ID: {eleve.id}</p>
                    </div>
                    <div className="flex gap-2">
                      {(["present", "absent", "retard"] as const).map((statut) => (
                        <Button
                          key={statut}
                          size="sm"
                          variant={presences[eleve.id] === statut ? "default" : "outline"}
                          className={presences[eleve.id] === statut ? getStatutColor(statut) : ""}
                          onClick={() => handlePresenceChange(eleve.id, statut)}
                        >
                          {getStatutLabel(statut)}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bouton de sauvegarde */}
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSaveAll} className="bg-blue-600 hover:bg-blue-700">
            Enregistrer toutes les présences
          </Button>
        </div>

        {/* Dialog pour les retards */}
        <Dialog open={retardDialog.open} onOpenChange={(open) => setRetardDialog({...retardDialog, open})}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Détails du retard</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="motif">Motif du retard</Label>
                <Textarea
                  id="motif"
                  placeholder="Raison du retard..."
                  value={retardData.motif}
                  onChange={(e) => setRetardData(prev => ({...prev, motif: e.target.value}))}
                />
              </div>
              <div>
                <Label htmlFor="duree">Durée du retard</Label>
                <Input
                  id="duree"
                  placeholder="Ex: 10 minutes"
                  value={retardData.duree}
                  onChange={(e) => setRetardData(prev => ({...prev, duree: e.target.value}))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRetardDialog({open: false, eleveId: ''})}>
                Annuler
              </Button>
              <Button onClick={handleRetardSubmit}>
                Enregistrer le retard
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}