import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { BookOpen, UserCheck, Pencil, ArrowLeft, Trash2, AlertTriangle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useClasses } from "@/hooks/useClasses";
import { formatClassName } from "@/utils/classNameFormatter";
import { useTeacherClasses } from "@/hooks/useTeacherClasses";
import { useSchedules, Course, DaySchedule } from "@/hooks/useSchedules";
import { useTeachers } from "@/hooks/useTeachers";
import { useSubjects } from "@/hooks/useSubjects";
import { useLessonLogs } from "@/hooks/useLessonLogs";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";

// Les interfaces Course et DaySchedule sont maintenant importées du hook useSchedules

interface CourseFormData {
  subject: string;
  enseignant: string;
  day: string;
  startTime: string;
  endTime: string;
}

interface CahierFormData {
  topic: string;
  lesson_date: string;
  start_time: string;
  content: string;
  teacher_id: string;
  subject_id: string;
}

// Les interfaces et données initiales sont maintenant gérées par le hook useSchedules

export default function EmploiDuTemps() {
  const navigate = useNavigate();
  const { isAdmin, isTeacher, isParent, isStudent } = useUserRole();
  
  // Utiliser le hook approprié selon le rôle
  const adminData = useClasses();
  const teacherData = useTeacherClasses();
  
  const { classes, loading: classesLoading } = isTeacher() ? teacherData : adminData;
  const { classeId } = useParams();
  const { schedules, loading: schedulesLoading, createCourse, updateCourse, deleteCourse } = useSchedules(classeId);
  const { teachers } = useTeachers();
  const { subjects } = useSubjects(classeId);
  const { createLessonLog, loading: lessonLoading } = useLessonLogs();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCahierDialogOpen, setIsCahierDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<{
    dayIndex: number;
    courseIndex: number;
    course: Course;
  } | null>(null);
  const [className, setClassName] = useState<string>("");
  const [hasAccess, setHasAccess] = useState<boolean>(true);

  const handleBack = () => {
    navigate('/emplois-du-temps');
  };

  const form = useForm<CourseFormData>({
    defaultValues: {
      subject: "",
      enseignant: "",
      day: "",
      startTime: "",
      endTime: "",
    },
  });

  const cahierForm = useForm<CahierFormData>({
    defaultValues: {
      topic: "",
      lesson_date: new Date().toISOString().split('T')[0],
      start_time: "",
      content: "",
      teacher_id: "",
      subject_id: ""
    }
  });

  // Les données sont maintenant chargées automatiquement via le hook useSchedules

  // Charger le nom de la classe depuis Supabase et vérifier l'accès
  useEffect(() => {
    if (classeId && classes.length > 0) {
      const classe = classes.find(c => c.id === classeId);
      if (classe) {
        setClassName(formatClassName(classe));
        setHasAccess(true);
      } else if (isTeacher()) {
        // Si l'enseignant essaie d'accéder à une classe qui n'est pas dans sa liste
        setHasAccess(false);
      }
    }
  }, [classeId, classes, isTeacher]);

  // Les matières et enseignants sont maintenant chargés via les hooks useClasses et useTeachers

  // Fonction pour déterminer la période (matin ou soir)
  const getPeriod = (startTime: string): 'matin' | 'soir' => {
    const [hour] = startTime.split(':').map(Number);
    return hour >= 8 && hour < 15 ? 'matin' : 'soir';
  };

  // Fonction pour séparer les cours par période
  const separateCoursesByPeriod = (courses: Course[]) => {
    const matin = courses.filter((course: Course) => getPeriod(course.start_time) === 'matin');
    const soir = courses.filter((course: Course) => getPeriod(course.start_time) === 'soir');
    return { matin, soir };
  };

  const handleEditCourse = (dayIndex: number, courseIndex: number, course: Course) => {
    // Préremplir le formulaire avec les données du cours
    form.setValue("subject", course.subject);
    form.setValue("enseignant", course.teacher || "");
    form.setValue("day", schedules[dayIndex].day.toLowerCase());
    form.setValue("startTime", course.start_time);
    form.setValue("endTime", course.end_time);
    
    // Définir le cours en cours de modification
    setEditingCourse({
      dayIndex,
      courseIndex,
      course
    });
    
    // Ouvrir le modal
    setIsDialogOpen(true);
  };

  const handleDeleteCourse = async (dayIndex: number, courseIndex: number) => {
    const course = schedules[dayIndex].courses[courseIndex];
    if (course.id) {
      await deleteCourse(course.id);
    }
  };

  const handleOpenCahierModal = (dayIndex: number, courseIndex: number, course: Course) => {
    // Trouver la matière correspondante
    const subject = subjects.find(s => s.name === course.subject);
    // Trouver l'enseignant correspondant
    const teacher = teachers.find(t => `${t.first_name} ${t.last_name}` === course.teacher);
    
    // Vérifier que nous avons les IDs nécessaires
    if (!subject?.id) {
      toast({
        title: "Erreur",
        description: "Impossible de trouver la matière correspondante",
        variant: "destructive"
      });
      return;
    }

    if (!teacher?.id) {
      toast({
        title: "Erreur", 
        description: "Impossible de trouver l'enseignant correspondant",
        variant: "destructive"
      });
      return;
    }
    
    // Préremplir le formulaire avec les données du cours
    cahierForm.setValue("topic", course.subject);
    cahierForm.setValue("lesson_date", new Date().toISOString().split('T')[0]);
    cahierForm.setValue("start_time", course.start_time);
    cahierForm.setValue("subject_id", subject.id);
    cahierForm.setValue("teacher_id", teacher.id);
    cahierForm.setValue("content", ""); // À remplir manuellement
    
    // Ouvrir le modal
    setIsCahierDialogOpen(true);
  };

  const handleAbsenceRetardForCourse = (dayIndex: number, course: Course) => {
    // Construire les paramètres URL avec les données du cours
    const dayName = schedules[dayIndex].day;
    const startTime = course.start_time;
    const endTime = course.end_time;
    
    const params = new URLSearchParams({
      day: dayName,
      subject: course.subject,
      startTime: startTime,
      endTime: endTime,
      teacher: course.teacher || ''
    });

    navigate(`/enregistrer-absence-retard/${classeId}?${params.toString()}`);
  };

  const onSubmit = async (data: CourseFormData) => {
    if (!classeId) return;
    
    const courseData = {
      subject: data.subject,
      teacher: data.enseignant,
      start_time: data.startTime,
      end_time: data.endTime,
      day: data.day.toUpperCase(),
      class_id: classeId
    };

    if (editingCourse && editingCourse.course.id) {
      // Mode édition - mettre à jour le cours existant
      await updateCourse(editingCourse.course.id, courseData); } else {
      // Mode ajout - créer un nouveau cours
      await createCourse(courseData);
    }

    // Réinitialiser le formulaire et fermer la dialog
    form.reset();
    setEditingCourse(null);
    setIsDialogOpen(false);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setEditingCourse(null);
      form.reset();
    }
    setIsDialogOpen(open);
  };

  const handleCahierDialogClose = (open: boolean) => {
    if (!open) {
      cahierForm.reset();
    }
    setIsCahierDialogOpen(open);
  };

  const onCahierSubmit = async (data: CahierFormData) => {
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
      cahierForm.reset();
      setIsCahierDialogOpen(false);
    }
  };

  const handleRetardAbsence = () => {
    navigate(`/absences-retards/${classeId}`);
  };

  // Fonction remplacée par hook Supabase

  // Le nom de la classe est maintenant chargé via le hook useClasses

  if (classesLoading || schedulesLoading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">Chargement des données...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Si l'enseignant n'a pas accès à cette classe
  if (isTeacher() && !hasAccess) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="mr-4 p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Accès refusé</h1>
          </div>
          <div className="text-center py-12">
            <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg mb-4">Vous n'avez pas accès à cet emploi du temps</p>
            <p className="text-muted-foreground/70 mb-6">Cette classe ne vous est pas attribuée</p>
            <Button onClick={handleBack}>Retour à mes classes</Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="mr-4 p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">
              Emploi du temps classe de : {className}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin() && (
              <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
                <DialogTrigger asChild>
                  <Button variant="default" className="bg-blue-500 hover:bg-blue-600 text-white">
                    Ajouter un cours
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingCourse ? "Modifier le cours" : "Saisir les informations"}
                  </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Matières</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionnez une matière" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {/* Récupération des matières depuis la base de données et suppression des doublons */}
                              {Array.from(new Set(subjects.map(subject => subject.name))).map((subjectName) => (
                                <SelectItem key={subjectName} value={subjectName}>
                                  {subjectName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="enseignant"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Enseignants</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionnez un enseignant" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {teachers.length > 0 ? (
                                teachers.map((teacher) => (
                                  <SelectItem key={teacher.id} value={`${teacher.first_name} ${teacher.last_name}`}>
                                    {teacher.first_name} {teacher.last_name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-teachers" disabled>
                                  Aucun enseignant enregistré
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="day"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jour</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionnez une journée" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="lundi">Lundi</SelectItem>
                              <SelectItem value="mardi">Mardi</SelectItem>
                              <SelectItem value="mercredi">Mercredi</SelectItem>
                              <SelectItem value="jeudi">Jeudi</SelectItem>
                              <SelectItem value="vendredi">Vendredi</SelectItem>
                              <SelectItem value="samedi">Samedi</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Début du cours</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="endTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fin du cours</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <div>
                        {editingCourse && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button type="button" variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Supprimer
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Êtes-vous sûr de vouloir supprimer cet emploi du temps ? Cette action est irréversible.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    if (editingCourse) {
                                      handleDeleteCourse(editingCourse.dayIndex, editingCourse.courseIndex);
                                      handleDialogClose(false);
                                    }
                                  }}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Confirmer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                      <div className="flex space-x-4">
                        <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
                          Annuler
                        </Button>
                        <Button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white">
                          {editingCourse ? "Modifier" : "Enregistrer"}
                        </Button>
                      </div>
                    </div>
                  </form>
                </Form>
              </DialogContent>
              </Dialog>
            )}

            {/* Modal Cahier de Texte */}
            <Dialog open={isCahierDialogOpen} onOpenChange={handleCahierDialogClose}>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Cahier de textes</DialogTitle>
                </DialogHeader>
                <Form {...cahierForm}>
                  <form onSubmit={cahierForm.handleSubmit(onCahierSubmit)} className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <FormField
                         control={cahierForm.control}
                         name="subject_id"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>Matière</FormLabel>
                             <FormControl>
                                <Input 
                                  value={subjects.find(s => s.id === field.value)?.name || ''} 
                                  readOnly 
                                  className="bg-muted/30"
                                />
                             </FormControl>
                           </FormItem>
                         )}
                       />

                       <FormField
                         control={cahierForm.control}
                         name="teacher_id"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>Enseignant</FormLabel>
                             <FormControl>
                                <Input 
                                  value={(() => {
                                    const teacher = teachers.find(t => t.id === field.value);
                                    return teacher ? `${teacher.first_name} ${teacher.last_name}` : '';
                                  })()} 
                                  readOnly 
                                  className="bg-muted/30"
                                />
                             </FormControl>
                           </FormItem>
                         )}
                       />
                     </div>

                    <FormField
                      control={cahierForm.control}
                      name="topic"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sujet de la séance</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: Introduction aux fractions" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={cahierForm.control}
                        name="lesson_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date de la séance</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={cahierForm.control}
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
                      control={cahierForm.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contenu de la séance</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Décrivez le contenu de la séance..."
                              rows={4}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-4">
                      <Button type="button" variant="outline" onClick={() => handleCahierDialogClose(false)}>
                        Annuler
                      </Button>
                      <Button type="submit" disabled={lessonLoading} className="bg-blue-500 hover:bg-blue-600 text-white">
                        {lessonLoading ? "Enregistrement..." : "Enregistrer"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {!isParent() && !isStudent() && (
              <Button 
                variant="default" 
                className="bg-yellow-500 hover:bg-yellow-600 text-white"
                onClick={handleRetardAbsence}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Retard & Absence
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-6 gap-2">
          {schedules.map((day, dayIndex) => {
            const { matin, soir } = separateCoursesByPeriod(day.courses);
            
            return (
              <div key={day.day} className={`rounded-lg overflow-hidden ${
                day.day === 'LUNDI' ? 'bg-blue-500' :
                day.day === 'MARDI' ? 'bg-yellow-100' :
                day.day === 'MERCREDI' ? 'bg-pink-100' :
                day.day === 'JEUDI' ? 'bg-blue-100' :
                day.day === 'VENDREDI' ? 'bg-green-100' :
                'bg-gray-100'
              }`}>
                 <div className={`p-2 text-center font-bold ${day.day === 'LUNDI' ? 'text-white' : 'text-foreground'}`}>
                  {day.day}
                </div>
                <div className="bg-card min-h-[400px] flex">
                  {/* Trait vertical avec labels MATIN et SOIR */}
                  <div className="w-12 bg-muted/30 border-r-2 border-border flex flex-col">
                    <div className="flex-1 flex items-center justify-center">
                      <div className="transform -rotate-90 text-xs font-bold text-muted-foreground whitespace-nowrap">
                        MATIN
                      </div>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <div className="transform -rotate-90 text-xs font-bold text-muted-foreground whitespace-nowrap">
                        SOIR
                      </div>
                    </div>
                  </div>
                  
                  {/* Contenu des cours */}
                  <div className="flex-1 flex flex-col">
                    {/* Section Matin */}
                    <div className="flex-1 p-2 border-b border-border">
                      {matin.map((course, courseIndex) => {
                        const originalCourseIndex = day.courses.findIndex(c => 
                          c.subject === course.subject && 
                          c.start_time === course.start_time && 
                          c.end_time === course.end_time
                        );
                        
                        return (
                          <div 
                            key={`matin-${courseIndex}`} 
                            className={`p-2 mb-2 rounded ${
                              day.day === 'LUNDI' ? 'bg-blue-500 text-white' :
                              'bg-accent/50'
                            }`}
                          >
                            <div className="font-medium text-xs mb-1">{course.subject}</div>
                            {/* Afficher le nom de l'enseignant s'il existe */}
                            {course.teacher && (
                              <div className="text-xs mb-1 italic text-muted-foreground">
                                Enseignant&nbsp;: {course.teacher}
                              </div>
                            )}
                            <div className="text-xs mb-2">
                              {course.start_time} à {course.end_time}
                            </div>
                            <div className="flex justify-center gap-2">
                              {(isAdmin() || isTeacher()) && (
                                <>
                                  <BookOpen 
                                    className="h-3 w-3 cursor-pointer text-blue-600 hover:text-blue-800" 
                                    onClick={() => handleOpenCahierModal(dayIndex, originalCourseIndex, course)}
                                  />
                                  <UserCheck 
                                    className="h-3 w-3 cursor-pointer text-green-500 hover:text-green-700" 
                                    onClick={() => handleAbsenceRetardForCourse(dayIndex, course)}
                                  />
                                </>
                              )}
                              {isAdmin() && (
                                <Pencil 
                                  className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground" 
                                  onClick={() => handleEditCourse(dayIndex, originalCourseIndex, course)}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Section Soir */}
                    <div className="flex-1 p-2">
                      {soir.map((course, courseIndex) => {
                        const originalCourseIndex = day.courses.findIndex(c => 
                          c.subject === course.subject && 
                          c.start_time === course.start_time && 
                          c.end_time === course.end_time
                        );
                        
                        return (
                          <div 
                            key={`soir-${courseIndex}`} 
                            className={`p-2 mb-2 rounded ${
                              day.day === 'LUNDI' ? 'bg-blue-500 text-white' :
                              'bg-accent/50'
                            }`}
                          >
                            <div className="font-medium text-xs mb-1">{course.subject}</div>
                            {/* Afficher le nom de l'enseignant s'il existe */}
                            {course.teacher && (
                              <div className="text-xs mb-1 italic text-muted-foreground">
                                Enseignant&nbsp;: {course.teacher}
                              </div>
                            )}
                            <div className="text-xs mb-2">
                              {course.start_time} à {course.end_time}
                            </div>
                            <div className="flex justify-center gap-2">
                              {(isAdmin() || isTeacher()) && (
                                <>
                                  <BookOpen 
                                    className="h-3 w-3 cursor-pointer text-blue-600 hover:text-blue-800" 
                                    onClick={() => handleOpenCahierModal(dayIndex, originalCourseIndex, course)}
                                  />
                                  <UserCheck 
                                    className="h-3 w-3 cursor-pointer text-green-500 hover:text-green-700" 
                                    onClick={() => handleAbsenceRetardForCourse(dayIndex, course)}
                                  />
                                </>
                              )}
                              {isAdmin() && (
                                <Pencil 
                                  className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground" 
                                  onClick={() => handleEditCourse(dayIndex, originalCourseIndex, course)}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}

