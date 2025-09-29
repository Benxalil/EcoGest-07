import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";
import { useClasses } from "@/hooks/useClasses";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useDefaultSeries } from "@/hooks/useDefaultSeries";
import { useDefaultLabels } from "@/hooks/useDefaultLabels";

const formSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  level: z.string().min(1, "Le niveau est requis"),
  series: z.string().min(1, "La série est requise"),
  label: z.string().min(1, "Le libellé est requis"),
});

type FormData = z.infer<typeof formSchema>;

interface AjoutClasseModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AjoutClasseModal({ open, onOpenChange, onSuccess }: AjoutClasseModalProps) {
  const { toast } = useToast();
  const { currentPlan, isFeatureLimited, getFeatureLimit, checkStarterLimits, markAsNotStarterCompatible } = useSubscriptionPlan();
  const { classes, createClass } = useClasses();
  const [showStarterWarning, setShowStarterWarning] = useState(false);
  const { series, loading: seriesLoading, error: seriesError } = useDefaultSeries();
  const { labels: classLabels, loading: labelsLoading, error: labelsError } = useDefaultLabels();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      level: "",
      series: "",
      label: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      // Vérifier les erreurs de chargement des données
      if (seriesError || labelsError) {
        toast({
          title: "Erreur de chargement",
          description: "Impossible de charger les données nécessaires. Veuillez réessayer.",
          variant: "destructive",
        });
        return;
      }

      // Vérifier que les données sont chargées
      if (seriesLoading || labelsLoading) {
        toast({
          title: "Chargement en cours",
          description: "Veuillez patienter pendant le chargement des données.",
          variant: "destructive",
        });
        return;
      }

      // Vérifier que les données ne sont pas vides
      if (series.length === 0 || classLabels.length === 0) {
        toast({
          title: "Données manquantes",
          description: "Les données de référence ne sont pas disponibles. Veuillez contacter l'administrateur.",
          variant: "destructive",
        });
        return;
      }

      // Vérifier les limites d'abonnement
      const currentClassCount = classes.length;
      
      // Pour les plans payants, utiliser la logique existante
      if (currentPlan !== 'trial' && isFeatureLimited('classes', currentClassCount)) {
        const limit = getFeatureLimit('classes');
        const planName = currentPlan.includes('starter') ? 'Starter' : 
                        currentPlan.includes('pro') ? 'Pro' : 'Premium';
        
        toast({
          title: "Limite d'abonnement atteinte",
          description: `Vous avez atteint la limite de votre forfait ${planName} (${limit} classes). Pour continuer, veuillez souscrire à un plan supérieur.`,
          variant: "destructive",
        });
        return;
      }

      // Pour la période d'essai, vérifier les limites Starter et afficher un avertissement
      if (currentPlan === 'trial') {
        const starterLimits = checkStarterLimits('classes', currentClassCount);
        
        if (starterLimits.exceedsStarter) {
          setShowStarterWarning(true);
          return;
        }
      }

      const success = await createClass({
        name: data.name,
        level: data.level,
        section: `${data.series}${data.label}`, // Combine series and label for section
      });

      if (success) {
        form.reset();
        if (onOpenChange) {
          onOpenChange(false);
        }
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      toast({
        title: "Erreur lors de la création",
        description: "Une erreur est survenue lors de la création de la classe.",
        variant: "destructive",
      });
    }
  };

  const handleStarterWarningConfirm = async () => {
    await markAsNotStarterCompatible();
    setShowStarterWarning(false);
    
    // Continuer avec la création de la classe
    const data = form.getValues();
    try {
      const success = await createClass({
        name: data.name,
        level: data.level,
        section: `${data.series}${data.label}`,
      });

      if (success) {
        form.reset();
        if (onOpenChange) {
          onOpenChange(false);
        }
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      toast({
        title: "Erreur lors de la création",
        description: "Une erreur est survenue lors de la création de la classe.",
        variant: "destructive",
      });
    }
  };

  // If used as a standalone form (not in a dialog)
  if (!open && !onOpenChange) {
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom de la classe</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une classe" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="CI">CI (Cours d'Initiation)</SelectItem>
                    <SelectItem value="CP">CP (Cours Préparatoire)</SelectItem>
                    <SelectItem value="CE1">CE1 (Cours Élémentaire 1)</SelectItem>
                    <SelectItem value="CE2">CE2 (Cours Élémentaire 2)</SelectItem>
                    <SelectItem value="CM1">CM1 (Cours Moyen 1)</SelectItem>
                    <SelectItem value="CM2">CM2 (Cours Moyen 2)</SelectItem>
                    <SelectItem value="6ème">6ème</SelectItem>
                    <SelectItem value="5ème">5ème</SelectItem>
                    <SelectItem value="4ème">4ème</SelectItem>
                    <SelectItem value="3ème">3ème</SelectItem>
                    <SelectItem value="Seconde">Seconde</SelectItem>
                    <SelectItem value="Première">Première</SelectItem>
                    <SelectItem value="Terminale">Terminale</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Niveau</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un niveau" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Primaire">Primaire</SelectItem>
                    <SelectItem value="Collège">Collège</SelectItem>
                    <SelectItem value="Lycée">Lycée</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="series"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Série</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une série" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {seriesLoading ? (
                      <SelectItem value="loading" disabled>Chargement des séries...</SelectItem>
                    ) : (
                      series.map((s) => (
                        <SelectItem key={s.id} value={s.code}>
                          {s.code} - {s.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="label"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Libellé</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un libellé" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {labelsLoading ? (
                      <SelectItem value="loading" disabled>Chargement des libellés...</SelectItem>
                    ) : (
                      classLabels.map((label) => (
                        <SelectItem key={label.id} value={label.code}>
                          {label.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={seriesLoading || labelsLoading || Boolean(seriesError) || Boolean(labelsError)}>
            {seriesLoading || labelsLoading ? 'Chargement...' : seriesError || labelsError ? 'Erreur de chargement' : 'Créer la classe'}
          </Button>
        </form>
      </Form>
    );
  }

  // Dialog mode
  return (
    <>
      <AlertDialog open={showStarterWarning} onOpenChange={setShowStarterWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limite du plan Starter dépassée</AlertDialogTitle>
            <AlertDialogDescription>
              En ajoutant plus de 6 classes, vous ne pourrez plus choisir le plan Starter à la fin de l'essai gratuit. 
              Vous devrez opter pour un plan Pro ou Premium. Voulez-vous continuer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleStarterWarningConfirm}>
              Continuer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom de la classe</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une classe" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="CI">CI (Cours d'Initiation)</SelectItem>
                  <SelectItem value="CP">CP (Cours Préparatoire)</SelectItem>
                  <SelectItem value="CE1">CE1 (Cours Élémentaire 1)</SelectItem>
                  <SelectItem value="CE2">CE2 (Cours Élémentaire 2)</SelectItem>
                  <SelectItem value="CM1">CM1 (Cours Moyen 1)</SelectItem>
                  <SelectItem value="CM2">CM2 (Cours Moyen 2)</SelectItem>
                  <SelectItem value="6ème">6ème</SelectItem>
                  <SelectItem value="5ème">5ème</SelectItem>
                  <SelectItem value="4ème">4ème</SelectItem>
                  <SelectItem value="3ème">3ème</SelectItem>
                  <SelectItem value="Seconde">Seconde</SelectItem>
                  <SelectItem value="Première">Première</SelectItem>
                  <SelectItem value="Terminale">Terminale</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="level"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Niveau</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un niveau" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Primaire">Primaire</SelectItem>
                  <SelectItem value="Collège">Collège</SelectItem>
                  <SelectItem value="Lycée">Lycée</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="series"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Série</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une série" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {seriesLoading ? (
                    <SelectItem value="loading" disabled>Chargement des séries...</SelectItem>
                  ) : (
                    series.map((s) => (
                      <SelectItem key={s.id} value={s.code}>
                        {s.code} - {s.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Libellé</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un libellé" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {labelsLoading ? (
                    <SelectItem value="loading" disabled>Chargement des libellés...</SelectItem>
                  ) : (
                    classLabels.map((label) => (
                      <SelectItem key={label.id} value={label.code}>
                        {label.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={seriesLoading || labelsLoading || Boolean(seriesError) || Boolean(labelsError)}>
          {seriesLoading || labelsLoading ? 'Chargement...' : seriesError || labelsError ? 'Erreur de chargement' : 'Créer la classe'}
        </Button>
        </form>
      </Form>
    </>
  );
}