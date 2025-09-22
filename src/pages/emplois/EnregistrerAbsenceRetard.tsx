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

// Fonctions utilitaires
const getElevesByClasse = (classeId: string): Eleve[] => {
  try {
    // Remplacé par hook Supabase
    if (!savedEleves) return [];

    const allEleves = JSON.parse(savedEleves);

    // Récupérer le libellé de la classe (ex: "CI A") à partir de son id
    let classDisplay: string | null = null;
    try {
      // Remplacé par hook Supabase
      if (savedClasses) {
        const classes = JSON.parse(savedClasses);
        const classe = classes.find((c: any) => String(c.id) === String(classeId));
        if (classe) classDisplay = `${classe.session} ${classe.libelle}`;
      }
    } catch (e) {
      }

    // Supporter plusieurs schémas possibles (compatibilité)
    const filtered = allEleves.filter((eleve: any) =>
      (classDisplay && eleve.classe === classDisplay) || // schéma courant (nom de classe)
      eleve.classe === classeId || // si jamais la classe a été stockée par id
      String(eleve.classeId || eleve.classe_id) === String(classeId) // autres variantes
    );

    console.info('[getElevesByClasse] classeId:', classeId, 'classDisplay:', classDisplay, 'count:', filtered.length);
    return filtered as Eleve[];
  } catch (error) {
    console.error("Erreur lors de la récupération des élèves:", error);
    return [];
  }
};

const saveAbsenceRetardData = (data: AbsenceRetardData) => {
  // Bloc remplacé par hook Supabase
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

  // États locaux
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [presences, setPresences] = useState<{[key: string]: "present" | "absent" | "retard"}>({});
  const [retardDialog, setRetardDialog] = useState<{open: boolean, eleveId: string}>({open: false, eleveId: ''});
  const [retardData, setRetardData] = useState<{motif: string, duree: string}>({motif: '', duree: ''});
  const [enseignant, setEnseignant] = useState(teacher);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (classeId) {
      const elevesClasse = getElevesByClasse(classeId);
      setEleves(elevesClasse);
      
      // Initialiser tous les élèves comme présents
      const initialPresences: {[key: string]: "present" | "absent" | "retard"} = {};
      elevesClasse.forEach(eleve => {
        initialPresences[eleve.id] = "present";
      });
      setPresences(initialPresences);
    }
  }, [classeId]);

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

  const handleSaveAll = () => {
    if (!enseignant.trim()) {
      toast({
        title: "Enseignant requis",
        description: "Veuillez saisir le nom de l'enseignant.",
        variant: "destructive",
      });
      return;
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
        motifRetard: statut === "retard" ? retardData.motif : undefined,
        dureeRetard: statut === "retard" ? retardData.duree : undefined,
      }))
    };

    saveAbsenceRetardData(absenceRetardData);
    
    toast({
      title: "✅ Enregistrement réussi",
      description: `Les présences, absences et retards ont été enregistrés avec succès pour le cours de ${subject} du ${day}.`,
      duration: 4000,
    });

    // Retourner à l'emploi du temps après un délai pour laisser le temps de voir le message
    setTimeout(() => {
      navigate(`/emplois-du-temps/${classeId}`);
    }, 1500);
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
            {eleves.length === 0 ? (
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