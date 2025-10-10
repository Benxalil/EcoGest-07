import { useState, useEffect } from "react";
import { useSchoolData } from "@/hooks/useSchoolData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

export function SchoolPrefixManager() {
  const { schoolData, updateSchoolData, loading } = useSchoolData();
  const { toast } = useToast();
  const [schoolSuffix, setSchoolSuffix] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (schoolData?.school_suffix) {
      setSchoolSuffix(schoolData.school_suffix);
    }
  }, [schoolData]);

  const handleUpdateSuffix = async () => {
    if (!schoolSuffix || schoolSuffix.trim() === "") {
      toast({
        title: "Erreur",
        description: "Le matricule d'école ne peut pas être vide",
        variant: "destructive"
      });
      return;
    }

    // Valider le format (lettres, chiffres, underscores seulement)
    const validFormat = /^[a-zA-Z0-9_]+$/.test(schoolSuffix);
    if (!validFormat) {
      toast({
        title: "Format invalide",
        description: "Le matricule ne peut contenir que des lettres, chiffres et underscores (_)",
        variant: "destructive"
      });
      return;
    }

    const oldSuffix = schoolData?.school_suffix;
    const newSuffix = schoolSuffix.toLowerCase();

    // Si pas de changement, ne rien faire
    if (oldSuffix === newSuffix) {
      toast({
        title: "Information",
        description: "Le matricule d'école n'a pas changé",
      });
      return;
    }

    setIsUpdating(true);
    setIsSyncing(true);

    try {
      // Étape 1: Mettre à jour le matricule dans la table schools
      const success = await updateSchoolData({
        school_suffix: newSuffix
      });

      if (!success) {
        throw new Error("Impossible de mettre à jour le matricule. Veuillez vérifier qu'il est unique.");
      }

      // Étape 2: Synchroniser tous les identifiants utilisateurs
      if (oldSuffix) {
        const { data, error } = await supabase.functions.invoke('sync-school-identifiers', {
          body: {
            oldSuffix,
            newSuffix,
            schoolId: schoolData.id
          }
        });

        if (error) {
          console.error('Erreur synchronisation:', error);
          throw new Error("Matricule mis à jour mais erreur de synchronisation des utilisateurs");
        }

        console.log('Résultat synchronisation:', data);

        toast({
          title: "✅ Synchronisation réussie",
          description: `Matricule mis à jour et ${data.stats?.success || 0} identifiants synchronisés`,
        });
      } else {
        toast({
          title: "Succès",
          description: "Le matricule d'école a été configuré",
        });
      }

    } catch (error) {
      console.error('Erreur:', error);
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de la mise à jour";
      const isUniqueError = errorMessage.includes('unique') || errorMessage.includes('duplicate') || errorMessage.includes('already exists');
      
      toast({
        title: "Erreur",
        description: isUniqueError 
          ? "⚠️ Ce matricule d'école est déjà utilisé par une autre école. Veuillez en choisir un autre."
          : errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
      setIsSyncing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Matricule d'école</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-10 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Matricule de l'école</CardTitle>
        <CardDescription>
          Ce matricule identifie votre école de manière unique au niveau système et est utilisé pour construire les identifiants de connexion de tous vos utilisateurs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isSyncing && (
          <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              Synchronisation en cours des identifiants de tous les utilisateurs...
            </AlertDescription>
          </Alert>
        )}

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Format de connexion :</strong> MATRICULE@{schoolSuffix || 'ecole'}
            <br />
            <strong>Exemples :</strong>
            <br />
            • Élève : <code className="bg-muted px-1 rounded">Eleve001@{schoolSuffix || 'ecole'}</code>
            <br />
            • Enseignant : <code className="bg-muted px-1 rounded">Prof001@{schoolSuffix || 'ecole'}</code>
            <br />
            • Parent : <code className="bg-muted px-1 rounded">Parent001@{schoolSuffix || 'ecole'}</code>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="school-suffix">Matricule de l'école</Label>
          <div className="flex gap-2">
            <Input
              id="school-suffix"
              value={schoolSuffix}
              onChange={(e) => setSchoolSuffix(e.target.value)}
              placeholder={schoolData?.name?.toLowerCase().replace(/\s+/g, '_') || 'mon_ecole'}
              className="flex-1"
              disabled={isUpdating}
            />
            <Button 
              onClick={handleUpdateSuffix}
              disabled={isUpdating || schoolSuffix === schoolData?.school_suffix}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            ⚠️ Lettres, chiffres et underscores (_) uniquement. Exemple : ecole_best, mon_ecole_2024
            <br />
            🔒 <strong>Le matricule doit être unique au niveau système</strong> - aucune autre école ne peut utiliser le même.
          </p>
          {schoolData?.school_suffix && schoolData.school_suffix !== schoolSuffix && (
            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
              ⚡ Attention : La modification du matricule mettra à jour tous les identifiants existants, mais les numéros continueront de manière séquentielle (pas de redémarrage du compteur).
            </p>
          )}
        </div>

        {schoolData?.school_suffix && (
          <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-700 dark:text-green-300">
              <strong>Matricule de l'école configuré :</strong> {schoolData.school_suffix}
              <br />
              Tous vos utilisateurs se connectent avec : <code className="bg-green-100 dark:bg-green-900 px-1 rounded">MATRICULE@{schoolData.school_suffix}</code>
              <br />
              🔒 Ce matricule est unique au niveau système et garantit l'isolation totale de vos données.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
