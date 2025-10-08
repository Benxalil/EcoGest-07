import { memo, useMemo, useCallback, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ParentChildSelector } from "@/components/parent/ParentChildSelector";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { useParentData } from "@/hooks/useParentData";

const ParentDashboard = memo(() => {
  const navigate = useNavigate();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  
  // ✅ Hook unifié qui récupère tout en parallèle
  const {
    children,
    selectedChild,
    parentInfo,
    todaySchedules,
    announcements,
    loading
  } = useParentData(selectedChildId);

  const greeting = useMemo(() => {
    const currentHour = new Date().getHours();
    return currentHour < 12 ? "Bonjour" : "Bonsoir";
  }, []);

  const navigateToSchedules = useCallback(() => navigate("/emplois-du-temps"), [navigate]);
  const navigateToAnnouncements = useCallback(() => navigate("/annonces"), [navigate]);

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <LoadingSkeleton type="card" count={2} />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-blue-600 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">{greeting} !</h1>
          <p className="text-blue-100">
            Aucun enfant n'est associé à votre compte. Veuillez contacter l'administration de l'école.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header de bienvenue */}
      <div className="bg-blue-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          {greeting}, {parentInfo?.firstName} {parentInfo?.lastName} !
        </h1>
        <p className="text-blue-100">
          Bienvenue sur votre espace parent.
          {selectedChild && (
            <span className="block mt-1">
              Élève sélectionné : <span className="font-semibold">{selectedChild.first_name} {selectedChild.last_name}</span>
              {selectedChild.classes && (
                <span> - {selectedChild.classes.name} {selectedChild.classes.level}</span>
              )}
            </span>
          )}
        </p>
      </div>

      {/* Sélecteur d'enfant */}
      <ParentChildSelector 
        children={children}
        selectedChildId={selectedChildId || selectedChild?.id || null}
        onChildSelect={setSelectedChildId}
      />

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Emploi du temps de l'élève */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Emploi du Temps Aujourd'hui</h3>
          </div>
          {(todaySchedules || []).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {new Date().getDay() === 0 
                ? "Aucun cours prévu le dimanche" 
                : "Aucun cours prévu aujourd'hui"}
            </p>
          ) : (
            <div className="space-y-3">
              {(todaySchedules || []).map((schedule: any) => (
                <div key={schedule.id} className="border rounded-lg p-3 bg-primary/5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-primary">
                      {schedule.subjects?.name || schedule.subject}
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
              Voir l'emploi du temps complet
            </Button>
          </div>
        </Card>

        {/* Annonces récentes */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Megaphone className="h-5 w-5 text-orange-600" />
            <h3 className="font-semibold">Annonces Récentes</h3>
          </div>
          {(announcements || []).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune annonce récente
            </p>
          ) : (
            <div className="space-y-3">
              {(announcements || []).map((announcement: any) => (
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

ParentDashboard.displayName = 'ParentDashboard';

export { ParentDashboard };
