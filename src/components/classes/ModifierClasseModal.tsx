import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useClasses, ClassData } from "@/hooks/useClasses";
import { DEFAULT_SERIES, DEFAULT_LABELS } from "@/constants/classOptions";

const formSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  level: z.string().min(1, "Le niveau est requis"),
  series: z.string().optional(),
  label: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ModifierClasseModalProps {
  classe: ClassData;
  onSuccess?: () => void;
  onClose?: () => void;
}

export function ModifierClasseModal({ classe, onSuccess, onClose }: ModifierClasseModalProps) {
  const { toast } = useToast();
  const { updateClass } = useClasses();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      level: "",
      series: "",
      label: "",
    },
  });

  useEffect(() => {
    if (classe) {
      // Extraire series et label de la section
      const section = classe.section || "";
      let series = "";
      let label = "";
      
      // Essayer de séparer la série et le libellé
      // Format attendu: "SerieLibellé" (ex: "SA", "L1A", etc.)
      if (section) {
        const labelMatch = section.match(/[A-Z]$/);
        if (labelMatch) {
          label = labelMatch[0];
          series = section.substring(0, section.length - 1);
        } else {
          series = section;
        }
      }
      
      form.reset({
        name: classe.name,
        level: classe.level,
        series: series || "",
        label: label || "",
      });
    }
  }, [classe, form]);

  const onSubmit = async (data: FormData) => {
    const series = data.series && data.series !== "none" ? data.series : "";
    const label = data.label && data.label !== "none" ? data.label : "";
    
    const success = await updateClass(classe.id, {
      name: data.name,
      level: data.level,
      section: series && label 
        ? `${series}${label}` 
        : (series || label || ""),
    });

    if (success) {
      toast({
        title: "Classe modifiée",
        description: "La classe a été modifiée avec succès.",
      });
      if (onSuccess) {
        onSuccess();
      }
      if (onClose) {
        onClose();
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom de la classe</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
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
              <Select onValueChange={field.onChange} value={field.value}>
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
              <FormLabel>Série (optionnel)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une série (optionnel)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  {DEFAULT_SERIES.map((s) => (
                    <SelectItem key={s.code} value={s.code}>
                      {s.code} - {s.name}
                    </SelectItem>
                  ))}
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
              <FormLabel>Libellé (optionnel)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un libellé (optionnel)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {DEFAULT_LABELS.map((label) => (
                    <SelectItem key={label.code} value={label.code}>
                      {label.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Modifier la classe
        </Button>
      </form>
    </Form>
  );
}
