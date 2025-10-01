import { useState, useEffect } from "react";
import { useSchoolData } from "@/hooks/useSchoolData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function SchoolPrefixManager() {
  const { schoolData, updateSchoolData, loading } = useSchoolData();
  const { toast } = useToast();
  const [schoolSuffix, setSchoolSuffix] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (schoolData?.school_suffix) {
      setSchoolSuffix(schoolData.school_suffix);
    }
  }, [schoolData]);

  const handleUpdateSuffix = async () => {
    if (!schoolSuffix || schoolSuffix.trim() === "") {
      toast({
        title: "Erreur",
        description: "Le préfixe de l'école ne peut pas être vide",
        variant: "destructive"
      });
      return;
    }

    // Valider le format (lettres, chiffres, underscores seulement)
    const validFormat = /^[a-zA-Z0-9_]+$/.test(schoolSuffix);
    if (!validFormat) {
      toast({
        title: "Format invalide",
        description: "Le préfixe ne peut contenir que des lettres, chiffres et underscores (_)",
        variant: "destructive"
      });
      return;
    }

    setIsUpdating(true);
    
    const success = await updateSchoolData({
      school_suffix: schoolSuffix.toLowerCase()
    });

    if (success) {
      toast({
        title: "Succès",
        description: "Le préfixe de l'école a été mis à jour",
      });
    } else {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le préfixe",
        variant: "destructive"
      });
    }
    
    setIsUpdating(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Préfixe de l'école</CardTitle>
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
        <CardTitle>Préfixe de l'école</CardTitle>
        <CardDescription>
          Ce préfixe est utilisé pour construire les identifiants de connexion
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Format de connexion pour vos utilisateurs : <strong>MATRICULE@{schoolSuffix || 'ecole'}</strong>
            <br />
            Exemple : <strong>ELEVE001@{schoolSuffix || 'ecole'}</strong>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="school-suffix">Préfixe de l'école</Label>
          <div className="flex gap-2">
            <Input
              id="school-suffix"
              value={schoolSuffix}
              onChange={(e) => setSchoolSuffix(e.target.value)}
              placeholder="ecole_best"
              className="flex-1"
            />
            <Button 
              onClick={handleUpdateSuffix}
              disabled={isUpdating || schoolSuffix === schoolData?.school_suffix}
            >
              {isUpdating ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Lettres, chiffres et underscores (_) uniquement. Exemple : ecole_best, mon_ecole_2024
          </p>
        </div>

        {schoolData?.school_suffix && (
          <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-700 dark:text-green-300">
              Préfixe actuel : <strong>{schoolData.school_suffix}</strong>
              <br />
              Vos utilisateurs doivent se connecter avec : MATRICULE@{schoolData.school_suffix}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
