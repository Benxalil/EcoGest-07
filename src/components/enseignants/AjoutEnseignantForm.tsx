import { useState, useEffect, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useTeachers } from "@/hooks/useTeachers";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubjects } from "@/hooks/useSubjects";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2 } from "lucide-react";

const formSchema = z.object({
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  prenom: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  genre: z.string().min(1, "Veuillez sélectionner le genre"),
  adresse: z.string().min(5, "L'adresse doit contenir au moins 5 caractères"),
  email: z.string().email("Format d'email invalide"),
  telephone: z.string().regex(/^[0-9]{9}$/, "Le numéro doit contenir 9 chiffres"),
  matricule: z.string(),
  motDePasse: z.string(),
  matieres: z.array(z.object({
    matiere: z.string().min(1, "Veuillez sélectionner une matière")
  })).min(1, "Au moins une matière doit être sélectionnée"),
  statut: z.boolean(),
  photo: z.any().optional(),
});

interface Matiere {
  id: number;
  nom: string;
  abreviation?: string;
  moyenne: string;
  coefficient: string;
  classeId: string;
}

interface Enseignant {
  id: number;
  nom: string;
  prenom: string;
  genre: string;
  adresse: string;
  email: string;
  telephone: string;
  matricule: string;
  motDePasse: string;
  matieres: string[];
  statut: boolean;
  photo?: string;
}

interface AjoutEnseignantFormProps {
  onSuccess?: () => void;
}

export function AjoutEnseignantForm({ onSuccess }: AjoutEnseignantFormProps) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const { toast } = useToast();
  const { createTeacher } = useTeachers();
  const { userProfile } = useUserRole();
  const { subjects: allMatieres } = useSubjects();
  const { settings: schoolSettings, loading: settingsLoading } = useSchoolSettings();
  
  // Dédupliquer les matières par nom pour éviter les doublons entre classes
  const matieres = useMemo(() => {
    const uniqueMatieres = new Map();
    allMatieres.forEach(matiere => {
      if (!uniqueMatieres.has(matiere.name)) {
        uniqueMatieres.set(matiere.name, matiere);
      }
    });
    return Array.from(uniqueMatieres.values());
  }, [allMatieres]);

  // Fonction pour obtenir les paramètres enseignants (localStorage avec fallback vers DB)
  const getTeacherSettingsFromStorage = () => {
    const storageSettings = localStorage.getItem('teacherSettings');
    if (storageSettings) {
      try {
        const parsed = JSON.parse(storageSettings);
        return {
          teacherPrefix: parsed.teacherPrefix || schoolSettings.teacherMatriculeFormat,
          defaultTeacherPassword: parsed.defaultTeacherPassword || schoolSettings.defaultTeacherPassword,
          autoGenerateUsername: parsed.autoGenerateUsername ?? schoolSettings.autoGenerateTeacherMatricule
        };
      } catch (error) {
        console.error('Erreur parsing teacherSettings:', error);
      }
    }
    // Fallback vers les paramètres de la base de données
    return {
      teacherPrefix: schoolSettings.teacherMatriculeFormat,
      defaultTeacherPassword: schoolSettings.defaultTeacherPassword,
      autoGenerateUsername: schoolSettings.autoGenerateTeacherMatricule
    };
  };

  // Générer le prochain numéro de matricule basé sur le nombre total d'enseignants
  const getNextTeacherNumber = async (schoolId: string): Promise<string> => {
    try {
      // Obtenir le prefix dynamiquement depuis les paramètres
      const teacherSettings = getTeacherSettingsFromStorage();
      const prefix = teacherSettings.teacherPrefix || 'PROF';
      
      // Compter le nombre total d'enseignants actifs dans l'école
      const { count, error } = await supabase
        .from('teachers')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('is_active', true);

      if (error) {
        console.error("Erreur lors du comptage des enseignants:", error);
        return `${prefix}001`;
      }

      // Le prochain numéro est simplement le nombre total + 1
      const nextNumber = (count || 0) + 1;
      const formattedNumber = nextNumber.toString().padStart(3, '0');
      
      return `${prefix}${formattedNumber}`;
    } catch (error) {
      console.error("Erreur lors de la génération du numéro:", error);
      return `PROF001`;
    }
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nom: "",
      prenom: "",
      genre: "",
      adresse: "",
      email: "",
      telephone: "",
      matricule: "",
      motDePasse: "",
      matieres: [{ matiere: "" }],
      statut: true,
      photo: null,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "matieres"
  });

  // Générer automatiquement matricule et mot de passe au chargement
  useEffect(() => {
    if (!userProfile?.schoolId || settingsLoading || !schoolSettings) return;
    
    const initializeForm = async () => {
      // Obtenir les paramètres enseignants avec fallback localStorage -> DB
      const teacherSettings = getTeacherSettingsFromStorage();
      
      console.log('🔧 Initialisation enseignant avec paramètres:', {
        source: 'localStorage + DB fallback',
        teacherPrefix: teacherSettings.teacherPrefix,
        autoGenerate: teacherSettings.autoGenerateUsername,
        defaultPassword: teacherSettings.defaultTeacherPassword
      });
      
      // Générer automatiquement le matricule si activé dans les paramètres
      if (teacherSettings.autoGenerateUsername) {
        const nextNumber = await getNextTeacherNumber(userProfile.schoolId);
        form.setValue("matricule", nextNumber);
      }
      
      // Définir le mot de passe par défaut depuis les paramètres
      const defaultPassword = teacherSettings.defaultTeacherPassword || 'teacher123';
      form.setValue("motDePasse", defaultPassword);
    };
    
    initializeForm();

    // Écouter les changements de paramètres en temps réel
    const handleSettingsUpdate = async () => {
      console.log('🔄 Mise à jour des paramètres enseignants détectée');
      
      // Recharger les paramètres
      const teacherSettings = getTeacherSettingsFromStorage();
      
      // Régénérer le matricule si la génération auto est activée
      if (teacherSettings.autoGenerateUsername) {
        const nextNumber = await getNextTeacherNumber(userProfile.schoolId);
        form.setValue("matricule", nextNumber);
      }
      
      // Mettre à jour le mot de passe par défaut
      const defaultPassword = teacherSettings.defaultTeacherPassword || 'teacher123';
      form.setValue("motDePasse", defaultPassword);
    };

    window.addEventListener('schoolSettingsUpdated', handleSettingsUpdate);
    
    return () => {
      window.removeEventListener('schoolSettingsUpdated', handleSettingsUpdate);
    };
  }, [userProfile?.schoolId, settingsLoading, schoolSettings]); // Se déclenche quand les settings sont chargés

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Erreur",
          description: "La taille de l'image ne doit pas dépasser 2Mo",
          variant: "destructive",
        });
        return;
      }
      if (!["image/jpeg", "image/png"].includes(file.type)) {
        toast({
          title: "Erreur",
          description: "Format d'image invalide. Utilisez .jpg ou .png",
          variant: "destructive",
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      // Créer l'enseignant via Supabase avec le mot de passe personnalisé
      const success = await createTeacher({
        first_name: data.prenom,
        last_name: data.nom,
        phone: data.telephone,
        address: data.adresse,
        specialization: data.matieres.map(m => m.matiere).join(', '),
        is_active: data.statut,
        employee_number: data.matricule,
        password: data.motDePasse // Passer le mot de passe personnalisé
      });
      
      if (success) {
        form.reset();
        setPhotoPreview(null);
        
        // Rediriger vers la liste des enseignants après 1.5 secondes
        setTimeout(() => {
          onSuccess?.();
        }, 1500);
      }
    } catch (error) {
      console.error("Erreur lors de la création de l'enseignant:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="nom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="prenom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prénom</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="genre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Genre</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner le genre" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Homme">Homme</SelectItem>
                    <SelectItem value="Femme">Femme</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="adresse"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Adresse</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="telephone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Téléphone</FormLabel>
                <FormControl>
                  <Input type="tel" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="matricule"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Matricule / Nom d'utilisateur</FormLabel>
                <FormControl>
                  <Input {...field} disabled className="bg-muted" />
                </FormControl>
                <div className="text-sm text-muted-foreground">
                  Généré automatiquement selon les paramètres
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="motDePasse"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mot de passe</FormLabel>
                <FormControl>
                  <Input type="password" {...field} disabled className="bg-muted" />
                </FormControl>
                <div className="text-sm text-muted-foreground">
                  Géré depuis les Paramètres uniquement
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <FormLabel>Matières enseignées</FormLabel>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ matiere: "" })}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Ajouter une matière
              </Button>
            </div>
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-3">
                  <FormField
                    control={form.control}
                    name={`matieres.${index}.matiere`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        {index === 0 && <FormLabel>Matière {index + 1}</FormLabel>}
                        {index > 0 && <FormLabel>Matière {index + 1}</FormLabel>}
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner une matière" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {matieres.map((matiere) => (
                              <SelectItem key={matiere.id} value={matiere.name}>
                                {matiere.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => remove(index)}
                      className="mt-8 p-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <FormField
            control={form.control}
            name="statut"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Statut</FormLabel>
                  <div className="text-sm text-muted-foreground">
                    Activer ou désactiver l'enseignant
                  </div>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <FormLabel>Photo de profil</FormLabel>
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept=".jpg,.jpeg,.png"
              onChange={handlePhotoChange}
              className="max-w-xs"
            />
            {photoPreview && (
              <img
                src={photoPreview}
                alt="Aperçu"
                className="h-20 w-20 object-cover rounded-full"
              />
            )}
          </div>
        </div>

        <Button type="submit" className="w-full md:w-auto">
          Enregistrer
        </Button>
      </form>
    </Form>
  );
}
