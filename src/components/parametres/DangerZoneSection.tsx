import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface DangerZoneSectionProps {
  schoolId: string;
  schoolName: string;
}

export function DangerZoneSection({ schoolId, schoolName }: DangerZoneSectionProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteSchool = async () => {
    if (!adminPassword) {
      toast({
        title: "Mot de passe requis",
        description: "Veuillez entrer votre mot de passe pour confirmer la suppression",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Session invalide");
      }

      const { data, error } = await supabase.functions.invoke('delete-school', {
        body: {
          schoolId,
          adminPassword,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error);
      }

      // Déconnecter l'utilisateur
      await supabase.auth.signOut();

      toast({
        title: "✅ École supprimée",
        description: data.message,
        className: "bg-green-50 border-green-200 text-green-800",
      });

      // Rediriger vers la page d'accueil
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error) {
      console.error("Erreur suppression école:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer l'école",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setAdminPassword("");
    }
  };

  return (
    <Card className="border-red-200 bg-red-50/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <CardTitle className="text-red-700">Zone de Danger ⚠️</CardTitle>
        </div>
        <CardDescription className="text-red-600">
          Actions irréversibles - Manipulation avec précaution
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-white rounded-lg border border-red-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-red-700 mb-2">
                Supprimer définitivement l'école
              </h3>
              <p className="text-sm text-red-600 mb-4">
                Cette action supprimera toutes les données de l'école (élèves, enseignants,
                parents, matières, classes, notes, examens, bulletins, etc.). Cette action est
                irréversible.
              </p>
            </div>
            <Button
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Quitter le système
            </Button>
          </div>
        </div>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                Attention : Action irréversible !
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-4 pt-4">
                <p className="text-base font-medium text-gray-900">
                  Si vous confirmez, l'école <span className="font-bold">"{schoolName}"</span> et
                  toutes ses données seront supprimées définitivement du système :
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-2">
                  <li>Tous les élèves</li>
                  <li>Tous les enseignants</li>
                  <li>Tous les parents</li>
                  <li>Toutes les matières</li>
                  <li>Toutes les classes</li>
                  <li>Toutes les notes et examens</li>
                  <li>Tous les bulletins</li>
                  <li>Tous les utilisateurs</li>
                  <li>Le compte de l'école</li>
                </ul>
                <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-4">
                  <Label htmlFor="password" className="text-sm font-medium text-red-900">
                    Confirmez votre mot de passe administrateur :
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Entrez votre mot de passe"
                    className="mt-2"
                    disabled={isDeleting}
                  />
                </div>
                <p className="text-sm font-semibold text-red-700 pt-2">
                  Souhaitez-vous vraiment continuer ?
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                ❌ Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteSchool}
                disabled={isDeleting || !adminPassword}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? "Suppression en cours..." : "✅ Confirmer la suppression"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
