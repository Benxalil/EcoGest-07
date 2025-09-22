import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { BookOpen, UserCheck, Pencil, ArrowLeft, Trash2, AlertTriangle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useClasses } from "@/hooks/useClasses";
import { useSchedules, Course, DaySchedule } from "@/hooks/useSchedules";
import { useTeachers } from "@/hooks/useTeachers";

// Les interfaces Course et DaySchedule sont maintenant importées du hook useSchedules

interface CourseFormData {
  subject: string;
  enseignant: string;
  day: string;
  startTime: string;
  endTime: string;
}

// Les interfaces et données initiales sont maintenant gérées par le hook useSchedules

export default function EmploiDuTemps() {
  const navigate = useNavigate();
  const { classes, loading: classesLoading } = useClasses();
  const { classeId } = useParams();
  const { schedules, loading: schedulesLoading, createCourse, updateCourse, deleteCourse } = useSchedules(classeId);
  const { teachers } = useTeachers();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<{
    dayIndex: number;
    courseIndex: number;
    course: Course;
  } | null>(null);
  const [className, setClassName] = useState<string>("");

  const handleBack = () => {
    navigate('/emplois');
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

  // Les données sont maintenant chargées automatiquement via le hook useSchedules

  // Charger le nom de la classe depuis Supabase
  useEffect(() => {
    if (classeId && classes.length > 0) {
      const classe = classes.find(c => c.id === classeId);
      if (classe) {
        setClassName(`${classe.name} ${classe.level}${classe.section ? ` - ${classe.section}` : ''}`);
      }
    }
  }, [classeId, classes]);

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

  const handleBanCourse = (dayIndex: number, courseIndex: number, course: Course) => {
    // Construire les paramètres URL avec les données du cours
    const dayName = schedules[dayIndex].day;
    const startTime = course.start_time;
    
    // Obtenir la date du jour sélectionné (pour l'exemple, on utilise la date d'aujourd'hui)
    const today = new Date();
    const currentDate = today.toISOString().split('T')[0];
    
    const params = new URLSearchParams({
      activite: course.subject,
      matiereId: course.subject, // Utiliser le nom de la matière directement
      dateSeance: currentDate,
      heureSeance: startTime,
      day: dayName,
      classeId: classeId || '',
      enseignant: course.teacher || ''
    });

    navigate(`/cahier-de-texte?${params.toString()}`);
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
            <p className="text-gray-500 text-lg">Chargement des données...</p>
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
              className="mr-4 p-2 hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">
              Emploi du temps classe de : {className}
            </h1>
          </div>
          <div className="flex items-center gap-4">
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
                              <SelectItem value="Mathématiques">Mathématiques</SelectItem>
                              <SelectItem value="Français">Français</SelectItem>
                              <SelectItem value="Anglais">Anglais</SelectItem>
                              <SelectItem value="Histoire-Géographie">Histoire-Géographie</SelectItem>
                              <SelectItem value="Sciences">Sciences</SelectItem>
                              <SelectItem value="Éducation Physique">Éducation Physique</SelectItem>
                              <SelectItem value="Arts Plastiques">Arts Plastiques</SelectItem>
                              <SelectItem value="Musique">Musique</SelectItem>
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
            <Button 
              variant="default" 
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
              onClick={handleRetardAbsence}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Retard & Absence
            </Button>
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
                <div className={`p-2 text-center font-bold ${day.day === 'LUNDI' ? 'text-white' : 'text-gray-800'}`}>
                  {day.day}
                </div>
                <div className="bg-white min-h-[400px] flex">
                  {/* Trait vertical avec labels MATIN et SOIR */}
                  <div className="w-12 bg-gray-50 border-r-2 border-gray-300 flex flex-col">
                    <div className="flex-1 flex items-center justify-center">
                      <div className="transform -rotate-90 text-xs font-bold text-gray-600 whitespace-nowrap">
                        MATIN
                      </div>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <div className="transform -rotate-90 text-xs font-bold text-gray-600 whitespace-nowrap">
                        SOIR
                      </div>
                    </div>
                  </div>
                  
                  {/* Contenu des cours */}
                  <div className="flex-1 flex flex-col">
                    {/* Section Matin */}
                    <div className="flex-1 p-2 border-b border-gray-200">
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
                              'bg-gray-100'
                            }`}
                          >
                            <div className="font-medium text-xs mb-1">{course.subject}</div>
                            {/* Afficher le nom de l'enseignant s'il existe */}
                            {course.teacher && (
                              <div className="text-xs mb-1 italic text-gray-700">
                                Enseignant&nbsp;: {course.teacher}
                              </div>
                            )}
                            <div className="text-xs mb-2">
                              {course.start_time} à {course.end_time}
                            </div>
                            <div className="flex justify-center gap-2">
                              <BookOpen 
                                className="h-3 w-3 cursor-pointer text-blue-600 hover:text-blue-800" 
                                onClick={() => handleBanCourse(dayIndex, originalCourseIndex, course)}
                              />
                              <UserCheck 
                                className="h-3 w-3 cursor-pointer text-green-600 hover:text-green-800" 
                                onClick={() => handleAbsenceRetardForCourse(dayIndex, course)}
                              />
                              <Pencil 
                                className="h-3 w-3 cursor-pointer text-gray-600 hover:text-gray-800" 
                                onClick={() => handleEditCourse(dayIndex, originalCourseIndex, course)}
                              />
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
                              'bg-gray-100'
                            }`}
                          >
                            <div className="font-medium text-xs mb-1">{course.subject}</div>
                            {/* Afficher le nom de l'enseignant s'il existe */}
                            {course.teacher && (
                              <div className="text-xs mb-1 italic text-gray-700">
                                Enseignant&nbsp;: {course.teacher}
                              </div>
                            )}
                            <div className="text-xs mb-2">
                              {course.start_time} à {course.end_time}
                            </div>
                            <div className="flex justify-center gap-2">
                              <BookOpen 
                                className="h-3 w-3 cursor-pointer text-blue-600 hover:text-blue-800" 
                                onClick={() => handleBanCourse(dayIndex, originalCourseIndex, course)}
                              />
                              <UserCheck 
                                className="h-3 w-3 cursor-pointer text-green-600 hover:text-green-800" 
                                onClick={() => handleAbsenceRetardForCourse(dayIndex, course)}
                              />
                              <Pencil 
                                className="h-3 w-3 cursor-pointer text-gray-600 hover:text-gray-800" 
                                onClick={() => handleEditCourse(dayIndex, originalCourseIndex, course)}
                              />
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

