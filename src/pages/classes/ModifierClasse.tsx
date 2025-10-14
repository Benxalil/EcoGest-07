
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useClasses, ClassData } from "@/hooks/useClasses";
import { useDefaultSeries } from "@/hooks/useDefaultSeries";
import { useDefaultLabels } from "@/hooks/useDefaultLabels";

interface ClasseFormData {
  name: string;
  level: string;
  section?: string;
  series_id?: string;
  label_id?: string;
}


export default function ModifierClasse() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const classeId = searchParams.get('id');
  const [classe, setClasse] = useState<ClassData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { classes, updateClass } = useClasses();
  const { series, loading: seriesLoading } = useDefaultSeries();
  const { labels, loading: labelsLoading } = useDefaultLabels();

  const form = useForm<ClasseFormData>({
    defaultValues: {
      name: "",
      level: "",
      section: "",
      series_id: "",
      label_id: "",
    },
  });

  useEffect(() => {
    if (classeId && classes.length > 0) {
      const classeData = classes.find(c => c.id === classeId);
      if (classeData) {
        setClasse(classeData);
        form.reset({
          name: classeData.name,
          level: classeData.level,
          section: classeData.section || "",
          series_id: classeData.series_id || "",
          label_id: classeData.label_id || ""
        }); } else {
        toast.error("Classe non trouvée");
        navigate("/classes");
      }
      setLoading(false);
    } else if (classeId && classes.length === 0) {
      // Attendre que les classes se chargent
      setLoading(true);
    } else if (!classeId) {
      toast.error("ID de classe manquant");
      navigate("/classes");
    }
  }, [classeId, classes, form, navigate]);

  const handleBack = () => {
    navigate("/classes");
  };

  const onSubmit = async (data: ClasseFormData) => {
    if (!classeId) return;

    const success = await updateClass(classeId, data);
    
    if (success) {
      toast.success(`Classe ${data.name} ${data.level} modifiée avec succès`);
      navigate("/classes"); } else {
      toast.error("Erreur lors de la modification de la classe");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </Layout>
    );
  }

  if (!classe) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <p className="text-destructive">Classe non trouvée</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Modifier la classe</h1>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-md">
            <FormField
              control={form.control}
              name="name"
              rules={{ required: "Le nom de la classe est requis" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de la classe</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Ex: CI, CP, CE1, CE2, CM1, CM2, 6ème..." 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="level"
              rules={{ required: "Le niveau est requis" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Niveau</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Ex: Primaire, Secondaire..." 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="section"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Section (optionnel)</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Ex: A, B, C, D..." 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="series_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Série de la classe</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value} disabled={seriesLoading}>
                      <SelectTrigger>
                        <SelectValue placeholder={seriesLoading ? "Chargement..." : "Sélectionner une série"} />
                      </SelectTrigger>
                      <SelectContent>
                        {seriesLoading ? (
                          <SelectItem value="loading" disabled>
                            Chargement...
                          </SelectItem>
                        ) : series.map(serie => (
                          <SelectItem key={serie.id} value={serie.id}>
                            {serie.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="label_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Libellé de la classe</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value} disabled={labelsLoading}>
                      <SelectTrigger>
                        <SelectValue placeholder={labelsLoading ? "Chargement..." : "Sélectionner un libellé"} />
                      </SelectTrigger>
                      <SelectContent>
                        {labelsLoading ? (
                          <SelectItem value="loading" disabled>
                            Chargement...
                          </SelectItem>
                        ) : labels.map(label => (
                          <SelectItem key={label.id} value={label.id}>
                            {label.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <Button type="submit" className="flex-1">
                Modifier la classe
              </Button>
              <Button type="button" variant="outline" onClick={handleBack} className="flex-1">
                Annuler
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Layout>
  );
}
