import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { ArrowLeft, Plus } from "lucide-react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useLessonLogs } from "@/hooks/useLessonLogs";
import { useToast } from "@/hooks/use-toast";
import { useClasses } from "@/hooks/useClasses";
import { useSubjects } from "@/hooks/useSubjects";
import { useTeachers } from "@/hooks/useTeachers";

interface CahierFormData {
  topic: string;
  lesson_date: string;
  start_time: string;
  content: string;
  teacher_id: string;
  subject_id: string;
}

export default function CahierDeTexte() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { classeId } = useParams();
  const { createLessonLog, loading } = useLessonLogs();
  const { toast } = useToast();
  const { classes, loading: classesLoading } = useClasses();
  const { subjects, loading: subjectsLoading } = useSubjects(classeId);
  const { teachers, loading: teachersLoading } = useTeachers();
  
  const [isMatiereModalOpen, setIsMatiereModalOpen] = useState(false);
  const [isEnseignantModalOpen, setIsEnseignantModalOpen] = useState(false);

  const form = useForm<CahierFormData>({
    defaultValues: {
      topic: "",
      lesson_date: new Date().toISOString().split('T')[0],
      start_time: "",
      content: "",
      teacher_id: "",
      subject_id: ""
    }
  });

  const classe = classes.find(c => c.id === classeId);

  const onSubmit = async (data: CahierFormData) => {
    if (!classeId) {
      toast({
        title: "Erreur",
        description: "ID de classe manquant",
        variant: "destructive"
      });
      return;
    }

    const success = await createLessonLog({
      class_id: classeId,
      subject_id: data.subject_id,
      teacher_id: data.teacher_id,
      topic: data.topic,
      content: data.content,
      lesson_date: data.lesson_date,
      start_time: data.start_time
    });

    if (success) {
      toast({
        title: "Succès",
        description: "Cahier de texte enregistré avec succès"
      });
      form.reset();
    }
  };

  if (classesLoading || subjectsLoading || teachersLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Chargement...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!classe) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Classe non trouvée</h1>
            <Button onClick={() => navigate('/emplois-du-temps')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux emplois du temps
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/emplois-du-temps')}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Cahier de texte - {classe.name}
              </h1>
              <p className="text-gray-600">
                Enregistrement des cours et activités
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Nouvelle entrée</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="subject_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Matière</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner une matière" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {subjects.map((subject) => (
                                <SelectItem key={subject.id} value={subject.id}>
                                  {subject.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="teacher_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Enseignant</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un enseignant" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {teachers.map((teacher) => (
                                <SelectItem key={teacher.id} value={teacher.id}>
                                  {teacher.first_name} {teacher.last_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="topic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sujet du cours</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: Introduction aux fractions" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lesson_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date du cours</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="start_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Heure de début</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contenu du cours</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Décrivez le contenu du cours, les activités, les exercices..."
                            rows={6}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => form.reset()}
                    >
                      Annuler
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Enregistrement..." : "Enregistrer"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}