import React, { memo, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Clock, BookOpen, Megaphone, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useOptimizedUserData } from "@/hooks/useOptimizedUserData";
import { useOptimizedTeacherData } from "@/hooks/useOptimizedTeacherData";

const TeacherDashboard = memo(() => {
  const navigate = useNavigate();
  const { profile } = useOptimizedUserData();
  const { 
    classes,
    students,
    todaySchedules,
    announcements,
    stats,
    loading,
    error
  } = useOptimizedTeacherData();

  // Memoized greeting function
  const greeting = useMemo(() => {
    const currentHour = new Date().getHours();
    return currentHour < 12 ? "Bonjour" : "Bonsoir";
  }, []);

  // Optimized navigation handlers
  const navigateToSchedules = useCallback(() => navigate("/emplois-du-temps"), [navigate]);
  const navigateToNotes = useCallback(() => navigate("/notes"), [navigate]);
  const navigateToStudents = useCallback(() => navigate("/eleves"), [navigate]);
  const navigateToAnnouncements = useCallback(() => navigate("/annonces"), [navigate]);

  if (loading) {
    return null; // Pas d'affichage pendant le chargement pour éviter le flash
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-red-500 text-lg">Erreur: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header de bienvenue personnalisé pour l'enseignant */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          {greeting}, {profile?.firstName} {profile?.lastName} !
        </h1>
        <p className="text-blue-100">
          Bienvenue sur votre tableau de bord enseignant.
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
                {stats.todayCourses}
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
                {stats.totalAnnouncements}
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
              {new Date().getDay() === 0 
                ? "Aucun cours prévu le dimanche" 
                : stats.totalClasses === 0
                  ? "Vous n'êtes affecté à aucune classe"
                  : "Aucun cours prévu aujourd'hui"}
            </p>
          ) : (
            <div className="space-y-3">
              {todaySchedules.map((schedule: any) => (
                <div key={schedule.id} className="border rounded-lg p-3 bg-blue-50 dark:bg-blue-950">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200">
                      {schedule.classes?.name || 'Classe'}
                    </h4>
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      {schedule.start_time?.substring(0, 5)} - {schedule.end_time?.substring(0, 5)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">{schedule.subject}</span>
                    {schedule.room && <span className="text-gray-500 dark:text-gray-400 ml-2">• Salle {schedule.room}</span>}
                  </p>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={navigateToSchedules}
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
              {announcements.slice(0, 3).map((announcement: any) => (
                <div key={announcement.id} className="border rounded-lg p-3 hover:bg-orange-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{announcement.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {announcement.content}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      announcement.priority === 'urgent' || announcement.is_urgent 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {announcement.priority === 'urgent' || announcement.is_urgent ? 'Urgent' : 'Normal'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={navigateToAnnouncements}
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
            onClick={navigateToSchedules}
            className="justify-start"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Cahier de Texte
          </Button>
          <Button 
            variant="outline" 
            onClick={navigateToNotes}
            className="justify-start"
          >
            <Award className="h-4 w-4 mr-2" />
            Saisir des Notes
          </Button>
          <Button 
            variant="outline" 
            onClick={navigateToSchedules}
            className="justify-start"
          >
            <Users className="h-4 w-4 mr-2" />
            Prendre les Présences
          </Button>
          <Button 
            variant="outline" 
            onClick={navigateToStudents}
            className="justify-start"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Voir mes Élèves
          </Button>
        </div>
      </Card>
    </div>
  );
});

TeacherDashboard.displayName = 'TeacherDashboard';

export { TeacherDashboard };