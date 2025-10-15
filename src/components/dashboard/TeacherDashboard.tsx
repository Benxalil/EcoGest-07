import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Clock, BookOpen, Megaphone, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { formatClassName } from "@/utils/classNameFormatter";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { useClasses } from "@/hooks/useClasses";
import { useSchoolData } from "@/hooks/useSchoolData";
import { filterAnnouncementsByRole } from "@/utils/announcementFilters";

interface TeacherStats {
  totalClasses: number;
  totalStudents: number;
  todaySchedules: any[];
  announcements: any[];
}

export function TeacherDashboard() {
  const navigate = useNavigate();
  const { userProfile } = useUserRole();
  const { announcements } = useAnnouncements();
  const { classes, loading: classesLoading } = useClasses();
  const { schoolData } = useSchoolData();
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [stats, setStats] = useState<TeacherStats>({
    totalClasses: 0,
    totalStudents: 0,
    todaySchedules: [],
    announcements: []
  });

  useEffect(() => {
    loadTeacherData();
  }, [userProfile, classes, announcements]); // ✅ Ajout de 'announcements' pour recharger quand les annonces changent

  const loadTeacherData = () => {
    if (!userProfile) return;

    try {
      setIsLoadingData(true);
      // Récupérer les classes assignées à l'enseignant depuis l'emploi du temps
      const teacherClasses = getTeacherClasses(userProfile.id);
      const todaySchedules = getTodayTeacherSchedule(userProfile.id);
      const totalStudents = getTeacherStudentCount(teacherClasses);
      const announcements = getTeacherAnnouncements();

      setStats({
        totalClasses: teacherClasses.length,
        totalStudents,
        todaySchedules,
        announcements: announcements // Déjà limité à 3 dans getTeacherAnnouncements()
      });
    } catch (error) {
      console.error("Erreur lors du chargement des données enseignant:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const getTeacherClasses = (teacherId: string): string[] => {
    try {
      const schedules = [];
      
      // Parcourir toutes les classes pour trouver celles où l'enseignant enseigne
      for (const classe of classes) {
        const scheduleKey = `schedule-${classe.id}`;
        const savedSchedule = localStorage.getItem(scheduleKey);
        if (savedSchedule) {
          const classSchedule = JSON.parse(savedSchedule);
          const hasTeacher = classSchedule.some((day: any) => 
            day.courses.some((course: any) => course.teacherId === teacherId)
          );
          if (hasTeacher) {
            schedules.push(formatClassName(classe));
          }
        }
      }
      
      return [...new Set(schedules)]; // Supprimer les doublons
    } catch (error) {
      console.error("Erreur lors de la récupération des classes:", error);
      return [];
    }
  };

  const getTodayTeacherSchedule = (teacherId: string) => {
    const today = new Date();
    const dayName = today.toLocaleDateString('fr-FR', { weekday: 'long' }).toUpperCase();
    
    if (dayName === 'DIMANCHE') return [];

    try {
      const classes = JSON.parse(localStorage.getItem('classes') || '[]');
      const todaySchedules = [];

      for (const classe of classes) {
        const scheduleKey = `schedule-${classe.id}`;
        const savedSchedule = localStorage.getItem(scheduleKey);
        if (savedSchedule) {
          const classSchedule = JSON.parse(savedSchedule);
          const todaySchedule = classSchedule.find((day: any) => day.day === dayName);
          
          if (todaySchedule) {
            const teacherCourses = todaySchedule.courses.filter((course: any) => 
              course.teacherId === teacherId
            );
            
            if (teacherCourses.length > 0) {
              todaySchedules.push({
                className: `${classe.session} ${classe.libelle}`,
                courses: teacherCourses
              });
            }
          }
        }
      }

      return todaySchedules;
    } catch (error) {
      console.error("Erreur lors de la récupération de l'emploi du temps:", error);
      return [];
    }
  };

  const getTeacherStudentCount = (teacherClasses: string[]): number => {
    try {
      const students = JSON.parse(localStorage.getItem('eleves') || '[]');
      return students.filter((student: any) => 
        teacherClasses.includes(student.classe)
      ).length;
    } catch (error) {
      console.error("Erreur lors du calcul des élèves:", error);
      return 0;
    }
  };

  const getTeacherAnnouncements = () => {
    try {
      // ✅ Utiliser le filtre centralisé qui respecte la logique globale
      const filtered = filterAnnouncementsByRole(
        announcements || [],
        'teacher', // Rôle de l'utilisateur
        false // Les enseignants ne sont pas admins
      );
      
      // ✅ Limiter à 3 annonces les plus récentes
      return filtered
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3);
    } catch (error) {
      console.error("Erreur lors de la récupération des annonces:", error);
      return [];
    }
  };

  const getGreeting = () => {
    const currentHour = new Date().getHours();
    return currentHour < 12 ? "Bonjour" : "Bonsoir";
  };

  if (classesLoading || isLoadingData) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="bg-gray-100 rounded-lg p-6 animate-pulse">
          <div className="h-8 w-64 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 w-96 bg-gray-200 rounded"></div>
        </div>
        
        {/* Stats skeleton */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4 sm:p-6">
              <div className="animate-pulse">
                <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 w-12 bg-gray-200 rounded"></div>
              </div>
            </Card>
          ))}
        </div>
        
        {/* Content skeleton */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-5 w-40 bg-gray-200 rounded"></div>
                <div className="h-4 w-full bg-gray-200 rounded"></div>
                <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header de bienvenue personnalisé pour l'enseignant */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          {getGreeting()}, {userProfile?.firstName} {userProfile?.lastName} !
        </h1>
        <p className="text-blue-100">
          Voici votre tableau de bord enseignant pour {schoolData.name || "votre école"}.
        </p>
      </div>

      {/* Statistiques personnalisées pour l'enseignant */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 sm:mb-2 truncate">
                Mes Classes
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600">
                {stats.totalClasses}
              </p>
            </div>
            <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0 ml-2" />
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 sm:mb-2 truncate">
                Mes Élèves
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-green-600">
                {stats.totalStudents}
              </p>
            </div>
            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 flex-shrink-0 ml-2" />
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 sm:mb-2 truncate">
                Cours Aujourd'hui
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-purple-600">
                {stats.todaySchedules.reduce((acc, schedule) => acc + schedule.courses.length, 0)}
              </p>
            </div>
            <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 flex-shrink-0 ml-2" />
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 sm:mb-2 truncate">
                Annonces
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-orange-600">
                {stats.announcements.length}
              </p>
            </div>
            <Megaphone className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 flex-shrink-0 ml-2" />
          </div>
        </Card>
      </div>

      {/* Sections principales */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Mon emploi du temps aujourd'hui */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold">Mon Emploi du Temps Aujourd'hui</h3>
          </div>
          {stats.todaySchedules.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {new Date().getDay() === 0 ? "Aucun cours prévu le dimanche" : "Aucun cours prévu aujourd'hui"}
            </p>
          ) : (
            <div className="space-y-3">
              {stats.todaySchedules.map((schedule, index) => (
                <div key={index} className="border rounded-lg p-3 bg-blue-50">
                  <h4 className="font-medium text-blue-800 mb-2">{schedule.className}</h4>
                  <div className="space-y-1">
                    {schedule.courses.map((course: any, courseIndex: number) => (
                      <div key={courseIndex} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{course.subject}</span>
                        <span className="text-blue-600">{course.startTime} - {course.endTime}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate("/emplois-du-temps")}
              className="w-full"
            >
              Voir mon emploi du temps complet
            </Button>
          </div>
        </Card>

        {/* Annonces récentes */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Megaphone className="h-5 w-5 text-orange-600" />
            <h3 className="font-semibold">Annonces Récentes</h3>
          </div>
          {stats.announcements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune annonce récente
            </p>
          ) : (
            <div className="space-y-3">
              {stats.announcements.map((announcement: any, index: number) => (
                <div key={index} className="border rounded-lg p-3 hover:bg-orange-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{announcement.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {announcement.content}
                      </p>
                    </div>
                    {announcement.isUrgent && (
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                        Urgent
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate("/annonces")}
              className="w-full"
            >
              Voir toutes les annonces
            </Button>
          </div>
        </Card>
      </div>

      {/* Actions rapides pour l'enseignant */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Award className="h-5 w-5" />
          Actions Rapides
        </h3>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Button 
            variant="outline" 
            onClick={() => navigate("/emplois-du-temps")}
            className="justify-start"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Cahier de Texte
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate("/notes")}
            className="justify-start"
          >
            <Award className="h-4 w-4 mr-2" />
            Saisir des Notes
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate("/emplois-du-temps")}
            className="justify-start"
          >
            <Users className="h-4 w-4 mr-2" />
            Prendre les Présences
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate("/eleves")}
            className="justify-start"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Voir mes Élèves
          </Button>
        </div>
      </Card>
    </div>
  );
}