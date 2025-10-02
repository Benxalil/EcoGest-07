import React, { memo, useMemo, useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useOptimizedUserData } from "@/hooks/useOptimizedUserData";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { supabase } from "@/integrations/supabase/client";

const StudentDashboard = memo(() => {
  const navigate = useNavigate();
  const { profile } = useOptimizedUserData();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todaySchedules, setTodaySchedules] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [studentData, setStudentData] = useState<any>(null);

  // Memoized greeting function
  const greeting = useMemo(() => {
    const currentHour = new Date().getHours();
    return currentHour < 12 ? "Bonjour" : "Bonsoir";
  }, []);

  // Optimized navigation handlers
  const navigateToSchedules = useCallback(() => navigate("/emplois-du-temps"), [navigate]);
  const navigateToAnnouncements = useCallback(() => navigate("/annonces"), [navigate]);

  // Charger les données de l'élève
  useEffect(() => {
    const loadStudentData = async () => {
      if (!profile?.id) return;

      try {
        setLoading(true);

        // Récupérer les informations de l'élève
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('*, classes(id, name, level, section)')
          .eq('user_id', profile.id)
          .single();

        if (studentError) throw studentError;
        
        setStudentData(student);

        // Récupérer l'emploi du temps du jour pour la classe de l'élève
        if (student?.class_id) {
          const today = new Date().getDay(); // 0 = dimanche, 1 = lundi, etc.
          const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const dayName = daysMap[today];

          const { data: schedules, error: schedulesError } = await supabase
            .from('schedules')
            .select('*, subjects(name)')
            .eq('class_id', student.class_id)
            .eq('day_of_week', today)
            .order('start_time');

          if (!schedulesError && schedules) {
            setTodaySchedules(schedules);
          }
        }

        // Récupérer les 3 dernières annonces
        const { data: announcementsData, error: announcementsError } = await supabase
          .from('announcements')
          .select('*')
          .eq('school_id', profile.schoolId)
          .order('created_at', { ascending: false })
          .limit(3);

        if (!announcementsError && announcementsData) {
          setAnnouncements(announcementsData);
        }

      } catch (err: any) {
        console.error("Erreur lors du chargement des données:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadStudentData();
  }, [profile]);

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <LoadingSkeleton type="card" count={2} />
      </div>
    );
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
      {/* Header de bienvenue personnalisé pour l'élève */}
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-lg p-6 text-primary-foreground">
        <h1 className="text-2xl font-bold mb-2">
          {greeting}, {profile?.firstName} {profile?.lastName} !
        </h1>
        <p className="text-primary-foreground/90">
          Bienvenue sur votre tableau de bord étudiant.
          {studentData?.classes && (
            <span className="block mt-1">
              Classe : <span className="font-semibold">{studentData.classes.name} {studentData.classes.level}</span>
            </span>
          )}
        </p>
      </div>

      {/* Sections principales */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Mon emploi du temps aujourd'hui */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Mon Emploi du Temps Aujourd'hui</h3>
          </div>
          {todaySchedules.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {new Date().getDay() === 0 
                ? "Aucun cours prévu le dimanche" 
                : "Aucun cours prévu aujourd'hui"}
            </p>
          ) : (
            <div className="space-y-3">
              {todaySchedules.map((schedule: any) => (
                <div key={schedule.id} className="border rounded-lg p-3 bg-primary/5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-primary">
                      {schedule.subjects?.name || schedule.subject_id}
                    </h4>
                    <span className="text-xs text-primary font-medium">
                      {schedule.start_time} - {schedule.end_time}
                    </span>
                  </div>
                  {schedule.room && (
                    <p className="text-sm text-muted-foreground">
                      Salle {schedule.room}
                    </p>
                  )}
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
                <div key={announcement.id} className="border rounded-lg p-3 hover:bg-orange-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm mb-1">{announcement.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {announcement.content}
                      </p>
                      {announcement.created_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(announcement.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                    {(announcement.priority === 'urgent' || announcement.is_urgent) && (
                      <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-800 whitespace-nowrap flex-shrink-0">
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
              onClick={navigateToAnnouncements}
              className="w-full"
            >
              Voir toutes les annonces
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
});

StudentDashboard.displayName = 'StudentDashboard';

export { StudentDashboard };
