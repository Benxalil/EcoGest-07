import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Clock, BookOpen, Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useTeacherData } from "@/hooks/useTeacherData";

export function TeacherDashboard() {
  const navigate = useNavigate();
  const { userProfile } = useUserRole();
  const { schoolData } = useSchoolData();
  
  // ✅ CORRECTION: Utiliser useTeacherData au lieu de localStorage pour la synchronisation en temps réel
  const { 
    classes, 
    totalStudents, 
    todaySchedules, 
    announcements, 
    loading, 
    error 
  } = useTeacherData();

  const getGreeting = () => {
    const currentHour = new Date().getHours();
    return currentHour < 12 ? "Bonjour" : "Bonsoir";
  };

  if (loading) {
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
          Voici votre tableau de bord enseignant pour {schoolData?.name || "votre école"}.
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
                {classes.length}
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
                {totalStudents}
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
                {todaySchedules.length}
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
                {announcements.length}
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
          {todaySchedules.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {new Date().getDay() === 0 ? "Aucun cours prévu le dimanche" : "Aucun cours prévu aujourd'hui"}
            </p>
          ) : (
            <div className="space-y-3">
              {todaySchedules.map((schedule, index) => (
                <div key={index} className="border rounded-lg p-3 bg-blue-50 dark:bg-blue-950">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                    {schedule.classes?.name || 'Classe'}
                  </h4>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{schedule.subject || 'Matière'}</span>
                    <span className="text-blue-600 dark:text-blue-400">
                      {schedule.start_time} - {schedule.end_time}
                    </span>
                  </div>
                  {schedule.room && (
                    <p className="text-xs text-muted-foreground mt-1">Salle: {schedule.room}</p>
                  )}
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
          {announcements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune annonce récente
            </p>
          ) : (
            <div className="space-y-3">
              {announcements.map((announcement: any, index: number) => (
                <div key={index} className="border rounded-lg p-3 hover:bg-orange-50 dark:hover:bg-orange-950">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{announcement.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {announcement.content}
                      </p>
                    </div>
                    {announcement.priority === 'urgent' && (
                      <span className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs px-2 py-1 rounded">
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

    </div>
  );
}